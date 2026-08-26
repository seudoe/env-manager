import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { checkProjectPermission } from "@/lib/permissions";

// PUT — update environment data
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const perm = await checkProjectPermission(projectId, "editor");
    if (!perm.allowed) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { data } = await request.json();
    if (typeof data !== "string") {
      return NextResponse.json(
        { error: "Environment data must be a string." },
        { status: 400 }
      );
    }

    await dbConnect();
    const project = await Project.findOneAndUpdate(
      { projectId },
      { data },
      { new: true }
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, updatedAt: project.updatedAt });
  } catch (error) {
    console.error("Update env error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
