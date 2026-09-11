import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import ProjectTemp from "@/models/ProjectTemp";
import { checkProjectPermission } from "@/lib/permissions";
import { generateToken, hashToken, verifyToken } from "@/lib/crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// POST — issue a new project token, invalidating the old one.
//
// The project token is no longer stored in plaintext (see models/Project.ts)
// and is therefore only ever visible once, at the moment it's created or
// rotated — it cannot be "revealed" again from Settings afterward. This
// endpoint is how an owner recovers when the token is lost, and — more
// importantly — how they revoke access after removing a contributor or
// suspecting the token has leaked: because the data-encryption key is
// derived from the projectId + server secret rather than from the token
// itself (see lib/crypto.ts), rotating the token here does NOT require
// re-encrypting any stored commits.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  logger.info("projects/[id]/rotate-token", "Rotate token request", { projectId });

  try {
    const rl = rateLimit(`rotate-token:${getClientIp(request)}`, "default");
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    await dbConnect();
    const newToken = generateToken();
    const newTokenHash = hashToken(newToken);

    if (projectId.startsWith("envpt_")) {
      // Temporary (un-owned) projects have no session/role system — the
      // current token itself is the only proof of authorization to
      // rotate it.
      const currentToken = request.headers.get("x-env-manager-token");
      if (!currentToken) {
        return NextResponse.json({ error: "Missing token." }, { status: 401 });
      }

      const project = await ProjectTemp.findOne({ projectId });
      if (!project || !verifyToken(currentToken, project.tokenHash)) {
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }

      project.tokenHash = newTokenHash;
      await project.save();

      logger.info("projects/[id]/rotate-token", "Temp project token rotated", { projectId });
      return NextResponse.json({ token: newToken });
    }

    const perm = await checkProjectPermission(projectId, "owner");
    if (!perm.allowed) {
      logger.warn("projects/[id]/rotate-token", "Rotate denied — not owner", { projectId, userId: perm.userId, role: perm.role });
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const project = await Project.findOneAndUpdate(
      { projectId },
      { tokenHash: newTokenHash },
      { new: true }
    );

    if (!project) {
      logger.warn("projects/[id]/rotate-token", "Project not found", { projectId });
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    logger.info("projects/[id]/rotate-token", "Project token rotated", { projectId, userId: perm.userId });
    return NextResponse.json({ token: newToken });
  } catch (error) {
    logger.error("projects/[id]/rotate-token", "Failed to rotate token", { projectId, error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
