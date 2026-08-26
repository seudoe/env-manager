import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import User from "@/models/User";
import { checkProjectPermission } from "@/lib/permissions";

// GET — list contributors
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const perm = await checkProjectPermission(projectId, "viewer");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await dbConnect();
    const project = await Project.findOne({ projectId }).select(
      "contributors ownerId ownerUsername"
    );
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

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
    console.error("List contributors error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// POST — add contributor (owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const perm = await checkProjectPermission(projectId, "owner");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { username, role } = await request.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }

    if (!role || !["editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'editor' or 'viewer'." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    await dbConnect();

    // Find the user
    const user = await User.findOne({ username: cleanUsername });
    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const project = await Project.findOne({ projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    // Can't add owner as contributor
    if (user._id.toString() === project.ownerId) {
      return NextResponse.json(
        { error: "Cannot add the project owner as a contributor." },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = project.contributors.find(
      (c: { userId: string }) => c.userId === user._id.toString()
    );
    if (existing) {
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
    console.error("Add contributor error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
