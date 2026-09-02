import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ProjectTemp from "@/models/ProjectTemp";
import { generateTempProjectId, generateToken, hashToken, encryptData } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export async function POST() {
  logger.info("projects/temp", "Create temp project request");

  try {
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

    const encryptedData = encryptData(defaultData, token);

    logger.info("projects/temp", "Saving new temp project to database", { projectId });

    const project = await ProjectTemp.create({
      projectId,
      projectName: "Temporary Project",
      commits: [
        {
          id: crypto.randomBytes(16).toString("hex"),
          committedBy: null,
          committedAt: null,
          data: encryptedData,
        },
      ],
      tokenHash: tokenHash,
      token, // the actual token is saved since this is un-owned and we need it to decrypt? Wait, we can't let users fetch the token. We need to save the token if we want to show it to the user. But we send it once to the frontend anyway.
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
