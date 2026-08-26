import { getSession } from "./auth";
import dbConnect from "./mongodb";
import Project from "@/models/Project";

export type Role = "owner" | "editor" | "viewer";

export interface PermissionResult {
  allowed: boolean;
  role: Role | null;
  userId: string | null;
  username: string | null;
}

export async function checkProjectPermission(
  projectId: string,
  requiredRole: Role = "viewer"
): Promise<PermissionResult> {
  const session = await getSession();
  if (!session) {
    return { allowed: false, role: null, userId: null, username: null };
  }

  await dbConnect();
  const project = await Project.findOne({ projectId });

  if (!project) {
    return { allowed: false, role: null, userId: session.userId, username: session.username };
  }

  // Check if user is owner
  if (project.ownerId === session.userId) {
    return { allowed: true, role: "owner", userId: session.userId, username: session.username };
  }

  // Check if user is a contributor
  const contributor = project.contributors.find(
    (c: { userId: string; role: string }) => c.userId === session.userId
  );

  if (!contributor) {
    return { allowed: false, role: null, userId: session.userId, username: session.username };
  }

  const userRole = contributor.role as Role;

  // Role hierarchy: owner > editor > viewer
  const roleLevel: Record<Role, number> = { owner: 3, editor: 2, viewer: 1 };

  if (roleLevel[userRole] >= roleLevel[requiredRole]) {
    return { allowed: true, role: userRole, userId: session.userId, username: session.username };
  }

  return { allowed: false, role: userRole, userId: session.userId, username: session.username };
}
