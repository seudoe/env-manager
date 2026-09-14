import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectTemp from "@/models/ProjectTemp";
import { checkProjectPermission } from "@/lib/permissions";
import { encryptData, verifyToken } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import crypto from "crypto";

// Commits are embedded sub-documents on the Project/ProjectTemp document
// itself (see models/Project.ts), and every commit stores a full copy of
// the env text. Without limits, an unbounded data size or an unbounded
// number of commits eventually pushes the document past MongoDB's 16MB
// BSON limit — after which point *every* save fails, including the
// owner's, permanently bricking the project. These caps keep both
// bounded well under that ceiling.
const MAX_DATA_LENGTH = 256 * 1024; // 256KB — generous for a .env file
const MAX_COMMITS = 50;

// PUT — update environment data
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  logger.info("projects/[id]/env", "Update env data request", { projectId });

  try {
    if (projectId.startsWith("envpt_")) {
      const token = request.headers.get("x-env-manager-token");
      if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

      const { data, commitId } = await request.json();
      if (typeof data !== "string") {
        return NextResponse.json({ error: "Environment data must be a string." }, { status: 400 });
      }

      if (data.length > MAX_DATA_LENGTH) {
        return NextResponse.json(
          { error: `Environment data exceeds the ${MAX_DATA_LENGTH / 1024}KB limit.` },
          { status: 400 }
        );
      }

      await dbConnect();
      const project = await ProjectTemp.findOne({ projectId });
      if (!project || !verifyToken(token, project.tokenHash)) {
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }

      if (!Array.isArray(project.commits) || project.commits.length === 0) {
        return NextResponse.json({ error: "Project has no commits." }, { status: 404 });
      }

      if (commitId && project.commits[0].id !== commitId) {
        return NextResponse.json(
          { error: "Conflict: A newer commit exists.", latestCommitId: project.commits[0].id },
          { status: 409 }
        );
      }

      const encryptedData = encryptData(data, project.projectId);
      project.commits[0].data = encryptedData;
      await project.save();
      return NextResponse.json({ success: true, updatedAt: project.updatedAt });
    }

    const perm = await checkProjectPermission(projectId, "editor");
    if (!perm.allowed) {
      logger.warn("projects/[id]/env", "Access denied — insufficient role", { projectId, userId: perm.userId, role: perm.role });
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { data, commitId } = await request.json();
    if (typeof data !== "string") {
      logger.warn("projects/[id]/env", "Invalid data type", { projectId, type: typeof data });
      return NextResponse.json(
        { error: "Environment data must be a string." },
        { status: 400 }
      );
    }

    if (data.length > MAX_DATA_LENGTH) {
      logger.warn("projects/[id]/env", "Data exceeds max length", { projectId, length: data.length });
      return NextResponse.json(
        { error: `Environment data exceeds the ${MAX_DATA_LENGTH / 1024}KB limit.` },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the project first (needed to key the encryption to its projectId)
    const project = await Project.findOne({ projectId });
    if (!project) {
      logger.warn("projects/[id]/env", "Project not found", { projectId });
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // Legacy migration
    const hasCommits = Array.isArray(project.commits) && project.commits.length > 0;
    if (!hasCommits && project.data) {
      if (!Array.isArray(project.commits)) project.commits = [];
      project.commits.push({
        id: crypto.randomBytes(16).toString("hex"),
        committedBy: null,
        committedAt: null,
        data: project.data,
      });
      project.data = undefined;
    }

    if (!Array.isArray(project.commits) || project.commits.length === 0) {
      return NextResponse.json({ error: "Project has no commits." }, { status: 404 });
    }

    // Collision detection
    if (commitId && project.commits[0].id !== commitId) {
      logger.warn("projects/[id]/env", "Commit ID collision detected", { projectId, expected: project.commits[0].id, received: commitId });
      return NextResponse.json(
        { error: "Conflict: A newer commit exists.", latestCommitId: project.commits[0].id },
        { status: 409 }
      );
    }

    logger.info("projects/[id]/env", "Encrypting and saving env data", { projectId, dataLength: data.length, userId: perm.userId });

    const encryptedData = encryptData(data, project.projectId);
    project.commits[0].data = encryptedData;
    await project.save();

    logger.info("projects/[id]/env", "Env data saved successfully", { projectId, updatedAt: project.updatedAt });
    return NextResponse.json({ success: true, updatedAt: project.updatedAt });
  } catch (error) {
    logger.error("projects/[id]/env", "Failed to update env", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// POST — commit current working copy
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  logger.info("projects/[id]/env", "Commit env data request", { projectId });

  try {
    if (projectId.startsWith("envpt_")) {
      const token = request.headers.get("x-env-manager-token");
      if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

      const { commitId } = await request.json();

      await dbConnect();
      const project = await ProjectTemp.findOne({ projectId });
      if (!project || !verifyToken(token, project.tokenHash)) {
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }

      if (!Array.isArray(project.commits) || project.commits.length === 0) {
        return NextResponse.json({ error: "Project has no commits." }, { status: 404 });
      }

      if (project.commits[0].id !== commitId) {
        return NextResponse.json(
          { error: "Conflict: A newer commit exists.", latestCommitId: project.commits[0].id },
          { status: 409 }
        );
      }

      project.commits[0].committedBy = "Anonymous";
      project.commits[0].committedAt = new Date();

      project.commits.unshift({
        id: crypto.randomBytes(16).toString("hex"),
        committedBy: null,
        committedAt: null,
        data: project.commits[0].data,
      });

      // Cap retained history so the document can't grow without bound
      // toward MongoDB's 16MB per-document limit (see MAX_COMMITS above).
      if (project.commits.length > MAX_COMMITS) {
        project.commits.splice(MAX_COMMITS);
      }

      await project.save();
      return NextResponse.json({ success: true, newCommitId: project.commits[0].id });
    }

    const perm = await checkProjectPermission(projectId, "editor");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { commitId } = await request.json();

    await dbConnect();
    const project = await Project.findOne({ projectId });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    // Legacy migration
    const hasCommitsPost = Array.isArray(project.commits) && project.commits.length > 0;
    if (!hasCommitsPost && project.data) {
      if (!Array.isArray(project.commits)) project.commits = [];
      project.commits.push({
        id: crypto.randomBytes(16).toString("hex"),
        committedBy: null,
        committedAt: null,
        data: project.data,
      });
      project.data = undefined;
    }

    if (!Array.isArray(project.commits) || project.commits.length === 0) {
      return NextResponse.json({ error: "Project has no commits." }, { status: 404 });
    }

    if (project.commits[0].id !== commitId) {
      return NextResponse.json(
        { error: "Conflict: A newer commit exists.", latestCommitId: project.commits[0].id },
        { status: 409 }
      );
    }

    // Turn the current working copy into history
    project.commits[0].committedBy = perm.username || "Unknown";
    project.commits[0].committedAt = new Date();

    // Push a new working copy to the front
    project.commits.unshift({
      id: crypto.randomBytes(16).toString("hex"),
      committedBy: null,
      committedAt: null,
      data: project.commits[0].data,
    });

    // Cap retained history so the document can't grow without bound
    // toward MongoDB's 16MB per-document limit (see MAX_COMMITS above).
    if (project.commits.length > MAX_COMMITS) {
      project.commits.splice(MAX_COMMITS);
    }

    await project.save();

    logger.info("projects/[id]/env", "Env data committed successfully", { projectId, newCommitId: project.commits[0].id });
    return NextResponse.json({ success: true, newCommitId: project.commits[0].id });
  } catch (error) {
    logger.error("projects/[id]/env", "Failed to commit env", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
