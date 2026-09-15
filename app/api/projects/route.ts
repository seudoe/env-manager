import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { generateProjectId, generateToken, hashToken, encryptData, decryptData, encryptBlob, decryptBlob } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { createInitialBlob } from "@/lib/history";

// Lines the app itself writes into every project's .env for CLI
// bootstrapping (see the defaultEnv template below) — not variables the
// user added, so they're excluded from the "Variables" count.
const BOOKKEEPING_KEYS = new Set(["ENV_MANAGER_PROJECTID", "ENV_MANAGER_TOKEN"]);

function countEnvVariables(text: string): number {
  let count = 0;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match && !BOOKKEEPING_KEYS.has(match[1])) count++;
  }
  return count;
}

// GET — list all user's projects (owned + contributed)
export async function GET() {
  logger.info("projects", "Listing projects");

  try {
    const session = await getSession();
    if (!session) {
      logger.warn("projects", "Unauthorized — no session");
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    logger.info("projects", "Connecting to database...");
    await dbConnect();

    logger.info("projects", "Fetching owned projects", { userId: session.userId });
    const ownedProjects = await Project.find({ ownerId: session.userId })
      .select("projectId projectName ownerId ownerUsername updatedAt dataBlob data size contributors")
      .sort({ updatedAt: -1 });

    logger.info("projects", "Fetching contributed projects", { userId: session.userId });
    const contributedProjects = await Project.find({
      "contributors.userId": session.userId,
    })
      .select("projectId projectName ownerId ownerUsername contributors updatedAt dataBlob data size")
      .sort({ updatedAt: -1 });

    // Dashboard stat cards previously showed projects.length * 12 and
    // projects.length * 2 — placeholder numbers with no relationship to
    // actual data, labeled "// illustrative" and left wired up as if
    // real. Compute the real counts instead: how many variables are
    // actually in each project's current working copy (decrypted here,
    // not returned — only the count is), and how many distinct people
    // the current user has added as contributors on projects they own.
    const variableCountFor = (p: any): number => {
      try {
        if (p.dataBlob) {
          const blob = decryptBlob(p.dataBlob, p.projectId);
          return countEnvVariables(blob.workingCopy || "");
        } else if (p.data) {
          return countEnvVariables(decryptData(p.data, p.projectId));
        }
      } catch {
        return 0;
      }
      return 0;
    };

    const getSize = (p: any): number => {
      if (p.size) return p.size;
      try {
        if (p.dataBlob) {
          const blob = decryptBlob(p.dataBlob, p.projectId);
          return JSON.stringify(blob).length;
        } else if (p.data) {
          return p.data.length; // legacy
        }
      } catch {
        return 0;
      }
      return 0;
    };

    const owned = ownedProjects.map((p) => ({
      projectId: p.projectId,
      projectName: p.projectName,
      role: "owner" as const,
      ownerUsername: p.ownerUsername,
      updatedAt: p.updatedAt,
      variableCount: variableCountFor(p),
      size: getSize(p),
    }));

    const contributed = contributedProjects.map((p) => {
      const contrib = p.contributors.find(
        (c: { userId: string }) => c.userId === session.userId
      );
      return {
        projectId: p.projectId,
        projectName: p.projectName,
        role: contrib?.role || "viewer",
        ownerUsername: p.ownerUsername,
        updatedAt: p.updatedAt,
        variableCount: variableCountFor(p),
        size: getSize(p),
      };
    });

    const total = [...owned, ...contributed];

    // "Team members" — count each distinct person once even if they're a
    // contributor on more than one of the projects this user owns.
    const uniqueContributorIds = new Set<string>();
    for (const p of ownedProjects) {
      for (const c of p.contributors || []) {
        uniqueContributorIds.add(c.userId);
      }
    }
    const totalVariables = total.reduce((sum, p) => sum + p.variableCount, 0);

    logger.info("projects", "Projects listed successfully", {
      ownedCount: owned.length,
      contributedCount: contributed.length,
      totalCount: total.length,
      totalVariables,
      uniqueContributors: uniqueContributorIds.size,
    });

    return NextResponse.json({
      projects: total,
      stats: {
        totalVariables,
        uniqueContributors: uniqueContributorIds.size,
      },
    });
  } catch (error) {
    logger.error("projects", "Failed to list projects", { error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// POST — create a new project
export async function POST(request: Request) {
  logger.info("projects", "Create project request");

  try {
    const session = await getSession();
    if (!session) {
      logger.warn("projects", "Unauthorized — no session");
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { projectName } = await request.json();

    if (!projectName || typeof projectName !== "string" || projectName.trim().length === 0) {
      logger.warn("projects", "Invalid project name");
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }

    if (projectName.trim().length > 100) {
      logger.warn("projects", "Project name too long", { length: projectName.trim().length });
      return NextResponse.json({ error: "Project name is too long." }, { status: 400 });
    }

    logger.info("projects", "Connecting to database...");
    await dbConnect();

    logger.info("projects", "Generating project credentials...");
    const projectId = generateProjectId();
    const token = generateToken();
    const tokenHashed = hashToken(token);

    const defaultEnv = `# ----------------------------------
# Dont remove these - whole env manager works on these
ENV_MANAGER_PROJECTID=${projectId}
ENV_MANAGER_TOKEN=${token}
# ---------------------------------------------
`;

    // Encryption key is derived from projectId + the server's AUTH_SECRET
    // (see lib/crypto.ts), not from the token — so the token never needs
    // to be persisted in plaintext to decrypt this project's data later.
    const initialBlob = createInitialBlob(defaultEnv);
    const encryptedDataBlob = encryptBlob(initialBlob, projectId);
    const uncompressedSize = JSON.stringify(initialBlob).length;

    logger.info("projects", "Creating project in database", { projectId, projectName: projectName.trim(), ownerId: session.userId });
    const project = await Project.create({
      projectId,
      projectName: projectName.trim(),
      dataBlob: encryptedDataBlob,
      size: uncompressedSize,
      tokenHash: tokenHashed,
      ownerId: session.userId,
      ownerUsername: session.username,
      contributors: [],
    });

    logger.info("projects", "Updating user document to include new project", { userId: session.userId, projectId });
    await User.findByIdAndUpdate(
      session.userId,
      { $push: { projects: projectId } }
    );

    logger.info("projects", "Project created successfully", { projectId: project.projectId, projectName: project.projectName });

    return NextResponse.json(
      {
        project: {
          projectId: project.projectId,
          projectName: project.projectName,
          token,
          role: "owner",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("projects", "Failed to create project", { error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
