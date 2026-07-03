import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import {
  accessibleWorkspaceIds,
  canAccessWorkspace,
  visibilityWhere,
} from "@/lib/workspace";

export const dynamic = "force-dynamic";

// GET /api/environments?workspaceId=xxx
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const wsId = req.nextUrl.searchParams.get("workspaceId");
    let ids: string[];
    if (wsId) {
      if (!(await canAccessWorkspace(userId, wsId)))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      ids = [wsId];
    } else {
      ids = await accessibleWorkspaceIds(userId);
    }
    const envs = await prisma.environment.findMany({
      where: visibilityWhere(userId, ids),
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(
      envs.map((e) => ({ ...e, isMine: e.ownerId === userId }))
    );
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// POST /api/environments { name, workspaceId, visibility, variables }
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.workspaceId || !(await canAccessWorkspace(userId, body.workspaceId)))
      return NextResponse.json(
        { error: "Valid workspaceId required" },
        { status: 400 }
      );
    const created = await prisma.environment.create({
      data: {
        name: body.name?.trim() || "New Environment",
        variables: body.variables ?? [],
        ownerId: userId,
        workspaceId: body.workspaceId,
        visibility: body.visibility === "private" ? "private" : "shared",
      },
    });
    return NextResponse.json({ ...created, isMine: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
