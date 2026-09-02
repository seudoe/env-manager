import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { verifyToken, decryptData } from "@/lib/crypto";
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

    if (!projectId.startsWith("envp_") || !token.startsWith("envt_")) {
      logger.warn("get-env", "Invalid credential format", { projectIdPrefix: projectId.substring(0, 5) });
      return new NextResponse("Invalid credentials.", { status: 401 });
    }

    logger.info("get-env", "Connecting to database...");
    await dbConnect();

    logger.info("get-env", "Looking up project", { projectId });
    const project = await Project.findOne({ projectId }).select(
      "data tokenHash"
    );

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

    logger.info("get-env", "Token verified, decrypting env data", { projectId, dataLength: project.data.length });

    let decryptedData = project.data;
    try {
      decryptedData = decryptData(project.data, token);
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
