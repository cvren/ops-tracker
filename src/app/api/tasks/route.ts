import { TaskPriority, TaskStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { listTasks } from "@/lib/data";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const statusParam = request.nextUrl.searchParams.get("status");
  const priorityParam = request.nextUrl.searchParams.get("priority");

  const status = Object.values(TaskStatus).includes(statusParam as TaskStatus)
    ? (statusParam as TaskStatus)
    : undefined;
  const priority = Object.values(TaskPriority).includes(
    priorityParam as TaskPriority
  )
    ? (priorityParam as TaskPriority)
    : undefined;

  const tasks = await listTasks({
    query,
    status,
    priority
  });

  return NextResponse.json({ tasks });
}
