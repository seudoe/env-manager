import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectTemp from "@/models/ProjectTemp";
import { verifyToken, decryptData, decryptBlob } from "@/lib/crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  logger.info("get-env", "Env fetch request", { ip });

  try {
    const rl = rateLimit(`get-env:${ip}`, "get-env");
    if (!rl.success) {
      logger.warn("get-env", "Rate limited", { ip });
      return new NextResponse("Too many requests.", { status: 429 });
    }

    const projectId = request.headers.get("x-env-manager-project-id");
    const token = request.headers.get("x-env-manager-token");

    if (!projectId || !token) {
      logger.warn("get-env", "Missing required headers", { hasProjectId: !!projectId, hasToken: !!token });
      return new NextResponse("Missing required headers.", { status: 400 });
    }

    if (!(projectId.startsWith("envp_") || projectId.startsWith("envpt_")) || !token.startsWith("envt_")) {
      logger.warn("get-env", "Invalid credential format", { projectIdPrefix: projectId.substring(0, 6) });
      return new NextResponse("Invalid credentials.", { status: 401 });
    }

    // The IP-based limit above can be sidestepped by an attacker who
    // spoofs X-Forwarded-For per request (see lib/rate-limit.ts). Keying
    // a second bucket on the target projectId means repeated token
    // guesses against one specific project are throttled regardless of
    // what IP they claim to come from.
    const rlProject = rateLimit(`get-env:project:${projectId}`, "get-env");
    if (!rlProject.success) {
      logger.warn("get-env", "Rate limited (per-project)", { projectId });
      return new NextResponse("Too many requests.", { status: 429 });
    }

    logger.info("get-env", "Connecting to database...");
    await dbConnect();

    logger.info("get-env", "Looking up project", { projectId });
    let project = null;
    
    if (projectId.startsWith("envpt_")) {
      project = await ProjectTemp.findOne({ projectId }).select(
        "dataBlob tokenHash"
      );
    } else {
      project = await Project.findOne({ projectId }).select(
        "dataBlob tokenHash"
      );
    }

    if (!project) {
      logger.warn("get-env", "Project not found", { projectId });
      return new NextResponse("Invalid credentials.", { status: 401 });
    }

    logger.info("get-env", "Verifying token...", { projectId });
    const tokenValid = verifyToken(token, project.tokenHash);
    if (!tokenValid) {
      logger.warn("get-env", "Invalid token for project", { projectId });
      return new NextResponse("Invalid credentials.", { status: 401 });
    }

    if (!project.dataBlob) {
      return new NextResponse("Project data is empty.", { status: 404 });
    }

    logger.info("get-env", "Token verified, decrypting env data", { projectId });

    let decryptedData = "";
    try {
      const blobObj = decryptBlob(project.dataBlob, projectId);
      // get-env only returns the currently committed state (latest commit).
      // blobObj.commits[0] is the latest commit (snapshot).
      if (blobObj.commits && blobObj.commits.length > 0) {
        decryptedData = blobObj.commits[0].data || "";
      } else {
        decryptedData = blobObj.workingCopy || "";
      }
    } catch (e) {
      logger.error("get-env", "Failed to decrypt data", { projectId, error: (e as Error).message });
      return new NextResponse("Failed to decrypt data.", { status: 500 });
    }

    return new NextResponse(decryptedData, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error("get-env", "Failed to fetch env", { error: (error as Error).message });
    return new NextResponse("Internal server error.", { status: 500 });
  }
}
