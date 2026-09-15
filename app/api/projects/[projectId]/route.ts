import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectTemp from "@/models/ProjectTemp";
import { checkProjectPermission } from "@/lib/permissions";
import { decryptBlob, verifyToken } from "@/lib/crypto";
import { buildHistory } from "@/lib/history";
import { redactProjectTokenForViewer } from "@/lib/redact";
import { logger } from "@/lib/logger";
import crypto from "crypto";

// GET — get project details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  logger.info("projects/[id]", "Get project details", { projectId });

  try {
    if (projectId.startsWith("envpt_")) {
      const token = request.headers.get("x-env-manager-token");
      if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

      await dbConnect();
      const project = await ProjectTemp.findOne({ projectId });
      if (!project || !verifyToken(token, project.tokenHash)) {
         return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      if (!project.dataBlob) {
        return NextResponse.json({ error: "Project has no data." }, { status: 404 });
      }

      const blobObj = decryptBlob(project.dataBlob, project.projectId);
      const commits = buildHistory(blobObj);
      const size = project.size || JSON.stringify(blobObj).length;

      return NextResponse.json({ 
        project: {
          projectId: project.projectId,
          projectName: project.projectName,
          data: commits[0].data,
          commitId: commits[0].id,
          commits: commits,
          size,
          role: "editor",
          updatedAt: project.updatedAt,
        }
      });
    }

    const perm = await checkProjectPermission(projectId, "viewer");
    if (!perm.allowed) {
      logger.warn("projects/[id]", "Access denied", { projectId, userId: perm.userId, role: perm.role });
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await dbConnect();
    logger.info("projects/[id]", "Fetching project from database", { projectId });
    const project = await Project.findOne({ projectId });
    if (!project) {
      logger.warn("projects/[id]", "Project not found", { projectId });
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (!project.dataBlob) {
      return NextResponse.json({ error: "Project has no data." }, { status: 404 });
    }

    const blobObj = decryptBlob(project.dataBlob, project.projectId);
    const commits = buildHistory(blobObj);
    const size = project.size || JSON.stringify(blobObj).length;

    // Viewers have read-only access by design, but the env content often
    // contains this project's own ENV_MANAGER_TOKEN line — which, unlike
    // the UI's role badge, is itself a fully working credential against
    // /api/get-env. Without redaction a "viewer" could lift that token
    // and get de-facto editor/CLI access. Editors are left unredacted
    // since they already have write access to this same content and
    // redacting would risk them saving the placeholder text back over
    // the real token.
    const visibleCommits =
      perm.role === "viewer"
        ? commits.map((c) => ({
            ...c,
            data: redactProjectTokenForViewer(c.data),
          }))
        : commits;

    const response: Record<string, unknown> = {
      projectId: project.projectId,
      projectName: project.projectName,
      data: visibleCommits[0].data,
      commitId: visibleCommits[0].id,
      commits: visibleCommits,
      ownerUsername: project.ownerUsername,
      role: perm.role,
      size,
      updatedAt: project.updatedAt,
    };

    logger.info("projects/[id]", "Project details returned", { projectId, role: perm.role });
    return NextResponse.json({ project: response });
  } catch (error) {
    logger.error("projects/[id]", "Failed to get project", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// PATCH — rename project (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  logger.info("projects/[id]", "Rename project request", { projectId });

  try {
    const perm = await checkProjectPermission(projectId, "owner");
    if (!perm.allowed) {
      logger.warn("projects/[id]", "Rename denied — not owner", { projectId, userId: perm.userId, role: perm.role });
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { projectName } = await request.json();
    if (!projectName || typeof projectName !== "string" || projectName.trim().length === 0) {
      logger.warn("projects/[id]", "Invalid project name for rename", { projectId });
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }

    await dbConnect();
    logger.info("projects/[id]", "Renaming project", { projectId, newName: projectName.trim() });
    const project = await Project.findOneAndUpdate(
      { projectId },
      { projectName: projectName.trim() },
      { new: true }
    );

    if (!project) {
      logger.warn("projects/[id]", "Project not found for rename", { projectId });
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    logger.info("projects/[id]", "Project renamed successfully", { projectId, newName: project.projectName });
    return NextResponse.json({
      project: {
        projectId: project.projectId,
        projectName: project.projectName,
      },
    });
  } catch (error) {
    logger.error("projects/[id]", "Failed to rename project", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// DELETE — delete project (owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  logger.info("projects/[id]", "Delete project request", { projectId });

  try {
    const perm = await checkProjectPermission(projectId, "owner");
    if (!perm.allowed) {
      logger.warn("projects/[id]", "Delete denied — not owner", { projectId, userId: perm.userId, role: perm.role });
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await dbConnect();
    logger.info("projects/[id]", "Deleting project from database", { projectId });
    const project = await Project.findOneAndDelete({ projectId });
    if (!project) {
      logger.warn("projects/[id]", "Project not found for deletion", { projectId });
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    logger.info("projects/[id]", "Project deleted successfully", { projectId, projectName: project.projectName });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("projects/[id]", "Failed to delete project", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
