import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { getSession } from "@/lib/auth";
import { generateProjectId, generateToken, hashToken } from "@/lib/crypto";

// GET — list all user's projects (owned + contributed)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    await dbConnect();

    // Projects owned by user
    const ownedProjects = await Project.find({ ownerId: session.userId })
      .select("projectId projectName ownerId ownerUsername updatedAt")
      .sort({ updatedAt: -1 });

    // Projects where user is a contributor
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

    return NextResponse.json({ projects: [...owned, ...contributed] });
  } catch (error) {
    console.error("List projects error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// POST — create a new project
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { projectName } = await request.json();

    if (!projectName || typeof projectName !== "string" || projectName.trim().length === 0) {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }

    if (projectName.trim().length > 100) {
      return NextResponse.json({ error: "Project name is too long." }, { status: 400 });
    }

    await dbConnect();

    const projectId = generateProjectId();
    const token = generateToken();
    const tokenHashed = hashToken(token);

    const defaultEnv = `# ----------------------------------
# Dont remove these - whole env manager works on these
ENV_MANAGER_PROJECTID=${projectId}
ENV_MANAGER_TOKEN=${token}
# ---------------------------------------------
`;

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
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
