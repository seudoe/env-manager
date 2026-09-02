import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { checkProjectPermission } from "@/lib/permissions";
import { encryptData } from "@/lib/crypto";
import { logger } from "@/lib/logger";

// PUT — update environment data
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  logger.info("projects/[id]/env", "Update env data request", { projectId });

  try {
    const perm = await checkProjectPermission(projectId, "editor");
    if (!perm.allowed) {
      logger.warn("projects/[id]/env", "Access denied — insufficient role", { projectId, userId: perm.userId, role: perm.role });
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { data } = await request.json();
    if (typeof data !== "string") {
      logger.warn("projects/[id]/env", "Invalid data type", { projectId, type: typeof data });
      return NextResponse.json(
        { error: "Environment data must be a string." },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // We need the token to encrypt, so find the project first
    const project = await Project.findOne({ projectId });
    if (!project) {
      logger.warn("projects/[id]/env", "Project not found", { projectId });
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    logger.info("projects/[id]/env", "Encrypting and saving env data", { projectId, dataLength: data.length, userId: perm.userId });
    
    const encryptedData = encryptData(data, project.token);
    
    project.data = encryptedData;
    await project.save();

    logger.info("projects/[id]/env", "Env data saved successfully", { projectId, updatedAt: project.updatedAt });
    return NextResponse.json({ success: true, updatedAt: project.updatedAt });
  } catch (error) {
    logger.error("projects/[id]/env", "Failed to update env", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
