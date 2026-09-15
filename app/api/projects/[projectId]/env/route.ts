import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectTemp from "@/models/ProjectTemp";
import { checkProjectPermission } from "@/lib/permissions";
import { encryptBlob, decryptBlob, verifyToken } from "@/lib/crypto";
import { buildHistory, commitChanges, updateWorkingCopy, BlobState } from "@/lib/history";
import { logger } from "@/lib/logger";

const MAX_DATA_LENGTH = 256 * 1024; // 256KB

// PUT — update environment data (Save working copy)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  logger.info("projects/[id]/env", "Update env data request", { projectId });

  try {
    const { data, commitId } = await request.json();
    if (typeof data !== "string") {
      return NextResponse.json({ error: "Environment data must be a string." }, { status: 400 });
    }
    if (data.length > MAX_DATA_LENGTH) {
      return NextResponse.json({ error: `Environment data exceeds the limit.` }, { status: 400 });
    }

    await dbConnect();
    
    let isTemp = projectId.startsWith("envpt_");
    let project = isTemp ? await ProjectTemp.findOne({ projectId }) : await Project.findOne({ projectId });
    
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
    
    // Check conflict against the working copy ID
    if (commitId && blobObj.workingCopyId !== commitId) {
       return NextResponse.json(
        { error: "Conflict: A newer commit exists.", latestCommitId: blobObj.workingCopyId },
        { status: 409 }
      );
    }
    
    updateWorkingCopy(blobObj, data);
    
    console.log("\n\n=== DEBUG UNCOMPRESSED BLOB (PUT) ===");
    // console.log(JSON.stringify(blobObj, null, 2));
    console.log("=======================================\n\n");

    const newSize = JSON.stringify(blobObj).length;
    
    if (newSize > 50 * 1024) {
      return NextResponse.json({ 
        error: "Storage limit reached (50KB). Please delete an older commit to save new changes.",
        sizeLimitExceeded: true 
      }, { status: 403 });
    }

    project.dataBlob = encryptBlob(blobObj, project.projectId);
    project.size = newSize;
    await project.save();
    
    return NextResponse.json({ success: true, updatedAt: project.updatedAt, size: newSize });
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
    const deviceName = request.headers.get("user-agent") || "Unknown Device";
    const { commitId } = await request.json();

    await dbConnect();
    
    let isTemp = projectId.startsWith("envpt_");
    let project = isTemp ? await ProjectTemp.findOne({ projectId }) : await Project.findOne({ projectId });
    
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    let username = null;
    if (isTemp) {
      const token = request.headers.get("x-env-manager-token");
      if (!token || !verifyToken(token, project.tokenHash)) return NextResponse.json({ error: "Access denied." }, { status: 403 });
    } else {
      const perm = await checkProjectPermission(projectId, "editor");
      if (!perm.allowed) return NextResponse.json({ error: "Access denied." }, { status: 403 });
      username = perm.username;
    }

    if (!project.dataBlob) return NextResponse.json({ error: "Project has no data." }, { status: 404 });

    const blobObj: BlobState = decryptBlob(project.dataBlob, project.projectId);
    
    if (commitId && blobObj.workingCopyId !== commitId) {
      return NextResponse.json(
        { error: "Conflict: A newer commit exists.", latestCommitId: blobObj.workingCopyId },
        { status: 409 }
      );
    }
    
    // Convert working copy to a commit
    const newText = blobObj.workingCopy === "" && blobObj.commits?.length > 0 
      ? (blobObj.commits[0].data || "") 
      : blobObj.workingCopy;
    commitChanges(blobObj, newText, { device: deviceName, user: username });
    
    console.log("\n\n=== DEBUG UNCOMPRESSED BLOB (POST) ===");
    // console.log(JSON.stringify(blobObj, null, 2));
    console.log("========================================\n\n");

    const newSize = JSON.stringify(blobObj).length;
    
    if (newSize > 50 * 1024) {
      return NextResponse.json({ 
        error: "Storage limit reached (50KB). Please delete an older commit to save new changes.",
        sizeLimitExceeded: true 
      }, { status: 403 });
    }

    project.dataBlob = encryptBlob(blobObj, project.projectId);
    project.size = newSize;
    await project.save();

    return NextResponse.json({ success: true, newCommitId: blobObj.workingCopyId, size: newSize });
  } catch (error) {
    logger.error("projects/[id]/env", "Failed to commit env", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
