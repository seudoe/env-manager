import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ProjectTemp from "@/models/ProjectTemp";
import { generateTempProjectId, generateToken, hashToken, encryptData } from "@/lib/crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  logger.info("projects/temp", "Create temp project request", { ip });

  try {
    // This endpoint is intentionally unauthenticated (temp projects exist
    // so people can try the tool without an account), which previously
    // meant it was also the only unauthenticated write endpoint in the
    // app with no rate limit at all — an unbounded number of permanent
    // documents could be created for free. Combined with the TTL index
    // on ProjectTemp (see models/ProjectTemp.ts) this keeps both the
    // creation rate and the storage lifetime bounded.
    const rl = rateLimit(`projects:temp:${ip}`, "default");
    if (!rl.success) {
      logger.warn("projects/temp", "Rate limited", { ip });
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    await dbConnect();

    // Generate credentials
    const projectId = generateTempProjectId();
    const token = generateToken();
    const tokenHash = hashToken(token);

    // Default template data
    const defaultData = 
`# This is an un-owned, temporary environment project
# ---------------------------------------------
# Don't remove these — the Env Manager CLI relies on these credentials
ENV_MANAGER_PROJECTID=${projectId}
ENV_MANAGER_TOKEN=${token}
# ---------------------------------------------
`;

    // Encryption key is derived from projectId + AUTH_SECRET (see
    // lib/crypto.ts), not from the token, so we no longer need to store
    // the plaintext token to be able to decrypt later.
    const encryptedData = encryptData(defaultData, projectId);

    logger.info("projects/temp", "Saving new temp project to database", { projectId });

    const project = await ProjectTemp.create({
      projectId,
      projectName: "Temporary Project",
      commits: [
        {
          id: crypto.randomBytes(16).toString("hex"),
          device: null,
          committedAt: null,
          data: encryptedData,
        },
      ],
      tokenHash: tokenHash,
    });

    logger.info("projects/temp", "Temp project created successfully", { projectId });

    return NextResponse.json(
      {
        message: "Temporary project created successfully",
        projectId: project.projectId,
        token: token,
        projectName: project.projectName,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("projects/temp", "Failed to create temp project", { error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
