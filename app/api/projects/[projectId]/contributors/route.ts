import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import User from "@/models/User";
import { checkProjectPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";

// GET — list contributors
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  logger.info("contributors", "List contributors request", { projectId });

  try {
    const perm = await checkProjectPermission(projectId, "viewer");
    if (!perm.allowed) {
      logger.warn("contributors", "Access denied", { projectId, userId: perm.userId });
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await dbConnect();
    logger.info("contributors", "Fetching project contributors", { projectId });
    const project = await Project.findOne({ projectId }).select(
      "contributors ownerId ownerUsername"
    );
    if (!project) {
      logger.warn("contributors", "Project not found", { projectId });
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    logger.info("contributors", "Contributors listed", { projectId, count: project.contributors.length });
    return NextResponse.json({
      owner: {
        userId: project.ownerId,
        username: project.ownerUsername,
        role: "owner",
      },
      contributors: project.contributors,
      currentUserRole: perm.role,
    });
  } catch (error) {
    logger.error("contributors", "Failed to list contributors", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// POST — add contributor (owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  logger.info("contributors", "Add contributor request", { projectId });

  try {
    const perm = await checkProjectPermission(projectId, "owner");
    if (!perm.allowed) {
      logger.warn("contributors", "Add denied — not owner", { projectId, userId: perm.userId, role: perm.role });
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { username, role } = await request.json();

    if (!username || typeof username !== "string") {
      logger.warn("contributors", "Invalid username", { projectId });
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }

    if (!role || !["editor", "viewer"].includes(role)) {
      logger.warn("contributors", "Invalid role", { projectId, role });
      return NextResponse.json(
        { error: "Role must be 'editor' or 'viewer'." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    await dbConnect();

    logger.info("contributors", "Looking up user to add", { projectId, targetUsername: cleanUsername });
    const user = await User.findOne({ username: cleanUsername });
    if (!user) {
      logger.warn("contributors", "Target user not found", { projectId, targetUsername: cleanUsername });
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const project = await Project.findOne({ projectId });
    if (!project) {
      logger.warn("contributors", "Project not found", { projectId });
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (user._id.toString() === project.ownerId) {
      logger.warn("contributors", "Cannot add owner as contributor", { projectId, targetUserId: user._id.toString() });
      return NextResponse.json(
        { error: "Cannot add the project owner as a contributor." },
        { status: 400 }
      );
    }

    const existing = project.contributors.find(
      (c: { userId: string }) => c.userId === user._id.toString()
    );
    if (existing) {
      logger.warn("contributors", "User already a contributor", { projectId, targetUsername: cleanUsername });
      return NextResponse.json(
        { error: "User is already a contributor." },
        { status: 409 }
      );
    }

    project.contributors.push({
      userId: user._id.toString(),
      username: user.username,
      role,
    });
    await project.save();

    logger.info("contributors", "Contributor added successfully", { projectId, targetUsername: user.username, role });

    return NextResponse.json(
      {
        contributor: {
          userId: user._id.toString(),
          username: user.username,
          role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("contributors", "Failed to add contributor", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
