import { ProjectStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { listProjects } from "@/lib/data";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const statusParam = request.nextUrl.searchParams.get("status");
  const status = Object.values(ProjectStatus).includes(
    statusParam as ProjectStatus
  )
    ? (statusParam as ProjectStatus)
    : undefined;

  const projects = await listProjects({
    query,
    status
  });

  return NextResponse.json({ projects });
}
