import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import { verifyToken } from "@/lib/crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`get-env:${ip}`, "get-env");
    if (!rl.success) {
      return new NextResponse("Too many requests.", { status: 429 });
    }

    const projectId = request.headers.get("x-env-manager-project-id");
    const token = request.headers.get("x-env-manager-token");

    if (!projectId || !token) {
      return new NextResponse("Missing required headers.", { status: 400 });
    }

    if (!projectId.startsWith("envp_") || !token.startsWith("envt_")) {
      // Generic error to prevent enumeration
      return new NextResponse("Invalid credentials.", { status: 401 });
    }

    await dbConnect();

    const project = await Project.findOne({ projectId }).select(
      "data tokenHash"
    );

    if (!project) {
      // Same error message to prevent project ID enumeration
      return new NextResponse("Invalid credentials.", { status: 401 });
    }

    const tokenValid = verifyToken(token, project.tokenHash);
    if (!tokenValid) {
      return new NextResponse("Invalid credentials.", { status: 401 });
    }

    return new NextResponse(project.data, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("get-env error:", error);
    return new NextResponse("Internal server error.", { status: 500 });
  }
}
