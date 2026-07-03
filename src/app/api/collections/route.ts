import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import {
  accessibleWorkspaceIds,
  canAccessWorkspace,
  visibilityWhere,
} from "@/lib/workspace";

export const dynamic = "force-dynamic";

// GET /api/collections?workspaceId=xxx
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
    const collections = await prisma.collection.findMany({
      where: visibilityWhere(userId, ids),
      orderBy: { order: "asc" },
      include: { requests: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json(
      collections.map((c) => ({ ...c, isMine: c.ownerId === userId }))
    );
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// POST /api/collections { name, workspaceId, visibility }
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
    const count = await prisma.collection.count({
      where: { workspaceId: body.workspaceId },
    });
    const created = await prisma.collection.create({
      data: {
        name: body.name?.trim() || "New Collection",
        order: count,
        ownerId: userId,
        workspaceId: body.workspaceId,
        visibility: body.visibility === "private" ? "private" : "shared",
      },
      include: { requests: true },
    });
    return NextResponse.json(
      { ...created, isMine: true },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
