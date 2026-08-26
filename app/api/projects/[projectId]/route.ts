import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { checkProjectPermission } from "@/lib/permissions";

// GET — get project details
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
    const project = await Project.findOne({ projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const response: Record<string, unknown> = {
      projectId: project.projectId,
      projectName: project.projectName,
      data: project.data,
      ownerUsername: project.ownerUsername,
      role: perm.role,
      updatedAt: project.updatedAt,
    };

    // Only owner can see token/settings
    if (perm.role === "owner") {
      response.token = project.token;
    }

    return NextResponse.json({ project: response });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// PATCH — rename project (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const perm = await checkProjectPermission(projectId, "owner");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { projectName } = await request.json();
    if (!projectName || typeof projectName !== "string" || projectName.trim().length === 0) {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }

    await dbConnect();
    const project = await Project.findOneAndUpdate(
      { projectId },
      { projectName: projectName.trim() },
      { new: true }
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({
      project: {
        projectId: project.projectId,
        projectName: project.projectName,
      },
    });
  } catch (error) {
    console.error("Rename project error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// DELETE — delete project (owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const perm = await checkProjectPermission(projectId, "owner");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await dbConnect();
    const project = await Project.findOneAndDelete({ projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
