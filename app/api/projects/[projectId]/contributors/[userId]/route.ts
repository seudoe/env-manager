import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { checkProjectPermission } from "@/lib/permissions";

// PATCH — change contributor role (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  try {
    const { projectId, userId } = await params;
    const perm = await checkProjectPermission(projectId, "owner");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { role } = await request.json();
    if (!role || !["editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'editor' or 'viewer'." },
        { status: 400 }
      );
    }

    await dbConnect();
    const project = await Project.findOne({ projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const contributor = project.contributors.find(
      (c: { userId: string }) => c.userId === userId
    );
    if (!contributor) {
      return NextResponse.json(
        { error: "Contributor not found." },
        { status: 404 }
      );
    }

    contributor.role = role;
    await project.save();

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Update contributor error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// DELETE — remove contributor (owner only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  try {
    const { projectId, userId } = await params;
    const perm = await checkProjectPermission(projectId, "owner");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await dbConnect();
    const project = await Project.findOne({ projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const idx = project.contributors.findIndex(
      (c: { userId: string }) => c.userId === userId
    );
    if (idx === -1) {
      return NextResponse.json(
        { error: "Contributor not found." },
        { status: 404 }
      );
    }

    project.contributors.splice(idx, 1);
    await project.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove contributor error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
