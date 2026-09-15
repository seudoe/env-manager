import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectTemp from "@/models/ProjectTemp";
import { checkProjectPermission } from "@/lib/permissions";
import { decryptBlob, encryptBlob, verifyToken } from "@/lib/crypto";
import { BlobState, deleteCommit } from "@/lib/history";
import { logger } from "@/lib/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; commitId: string }> }
) {
  const { projectId, commitId } = await params;
  logger.info("projects/[id]/commits/[commitId]", "Delete commit request", { projectId, commitId });

  try {
    await dbConnect();
    
    const isTemp = projectId.startsWith("envpt_");
    const project = isTemp ? await ProjectTemp.findOne({ projectId }) : await Project.findOne({ projectId });
    
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    if (isTemp) {
      const token = request.headers.get("x-env-manager-token");
      if (!token || !verifyToken(token, project.tokenHash)) return NextResponse.json({ error: "Access denied." }, { status: 403 });
    } else {
      const perm = await checkProjectPermission(projectId, "editor");
      if (!perm.allowed) return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    if (!project.dataBlob) return NextResponse.json({ error: "Project has no data." }, { status: 404 });

    const blobObj: BlobState = decryptBlob(project.dataBlob, project.projectId);
    
    try {
      deleteCommit(blobObj, commitId);
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Failed to delete commit" }, { status: 400 });
    }
    
    project.dataBlob = encryptBlob(blobObj, project.projectId);
    const newSize = JSON.stringify(blobObj).length;
    project.size = newSize;
    await project.save();

    return NextResponse.json({ success: true, size: newSize });
  } catch (error) {
    logger.error("projects/[id]/commits/[commitId]", "Failed to delete commit", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
