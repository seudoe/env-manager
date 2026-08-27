import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { getSession } from "@/lib/auth";
import { generateProjectId, generateToken, hashToken } from "@/lib/crypto";
import { logger } from "@/lib/logger";

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
      .select("projectId projectName ownerId ownerUsername updatedAt")
      .sort({ updatedAt: -1 });

    logger.info("projects", "Fetching contributed projects", { userId: session.userId });
    const contributedProjects = await Project.find({
      "contributors.userId": session.userId,
    })
      .select("projectId projectName ownerId ownerUsername contributors updatedAt")
      .sort({ updatedAt: -1 });

    const owned = ownedProjects.map((p) => ({
      projectId: p.projectId,
      projectName: p.projectName,
      role: "owner" as const,
      ownerUsername: p.ownerUsername,
      updatedAt: p.updatedAt,
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
      };
    });

    const total = [...owned, ...contributed];
    logger.info("projects", "Projects listed successfully", { ownedCount: owned.length, contributedCount: contributed.length, totalCount: total.length });

    return NextResponse.json({ projects: total });
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

    logger.info("projects", "Creating project in database", { projectId, projectName: projectName.trim(), ownerId: session.userId });
    const project = await Project.create({
      projectId,
      projectName: projectName.trim(),
      data: defaultEnv,
      tokenHash: tokenHashed,
      token,
      ownerId: session.userId,
      ownerUsername: session.username,
      contributors: [],
    });

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
