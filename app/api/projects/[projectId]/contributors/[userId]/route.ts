import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { checkProjectPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";

// PATCH — change contributor role (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  const { projectId, userId } = await params;
  logger.info("contributors/[uid]", "Change role request", { projectId, targetUserId: userId });

  try {
    const perm = await checkProjectPermission(projectId, "owner");
    if (!perm.allowed) {
      logger.warn("contributors/[uid]", "Role change denied — not owner", { projectId, userId: perm.userId });
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { role } = await request.json();
    if (!role || !["editor", "viewer"].includes(role)) {
      logger.warn("contributors/[uid]", "Invalid role", { projectId, role });
      return NextResponse.json(
        { error: "Role must be 'editor' or 'viewer'." },
        { status: 400 }
      );
    }

    await dbConnect();
    const project = await Project.findOne({ projectId });
    if (!project) {
      logger.warn("contributors/[uid]", "Project not found", { projectId });
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const contributor = project.contributors.find(
      (c: { userId: string }) => c.userId === userId
    );
    if (!contributor) {
      logger.warn("contributors/[uid]", "Contributor not found", { projectId, targetUserId: userId });
      return NextResponse.json(
        { error: "Contributor not found." },
        { status: 404 }
      );
    }

    const oldRole = contributor.role;
    contributor.role = role;
    await project.save();

    logger.info("contributors/[uid]", "Role changed successfully", { projectId, targetUserId: userId, oldRole, newRole: role });
    return NextResponse.json({ success: true, role });
  } catch (error) {
    logger.error("contributors/[uid]", "Failed to change role", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// DELETE — remove contributor (owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  const { projectId, userId } = await params;
  logger.info("contributors/[uid]", "Remove contributor request", { projectId, targetUserId: userId });

  try {
    const perm = await checkProjectPermission(projectId, "owner");
    if (!perm.allowed) {
      logger.warn("contributors/[uid]", "Remove denied — not owner", { projectId, userId: perm.userId });
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await dbConnect();
    const project = await Project.findOne({ projectId });
    if (!project) {
      logger.warn("contributors/[uid]", "Project not found", { projectId });
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const idx = project.contributors.findIndex(
      (c: { userId: string }) => c.userId === userId
    );
    if (idx === -1) {
      logger.warn("contributors/[uid]", "Contributor not found for removal", { projectId, targetUserId: userId });
      return NextResponse.json(
        { error: "Contributor not found." },
        { status: 404 }
      );
    }

    const removed = project.contributors[idx];
    project.contributors.splice(idx, 1);
    await project.save();

    logger.info("contributors/[uid]", "Contributor removed successfully", { projectId, removedUsername: removed.username, removedRole: removed.role });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("contributors/[uid]", "Failed to remove contributor", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
