import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { accessibleWorkspaces } from "@/lib/workspace";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

// GET /api/workspaces -> workspaces the user can access
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaces = await accessibleWorkspaces(userId);
  const teamIds = workspaces.filter((w) => w.type === "team").map((w) => w.id);
  const counts = await prisma.workspaceMember.groupBy({
    by: ["workspaceId"],
    where: { workspaceId: { in: teamIds } },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.workspaceId, c._count._all]));
  return NextResponse.json(
    workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      ownerId: w.ownerId,
      isMine: w.ownerId === userId,
      memberCount: w.type === "team" ? countMap.get(w.id) || 1 : undefined,
    }))
  );
}

// POST /api/workspaces -> create a team workspace
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ws = await prisma.workspace.create({
    data: {
      name: String(body.name || "New Team").trim() || "New Team",
      type: "team",
      ownerId: userId,
    },
  });
  await prisma.workspaceMember
    .create({ data: { workspaceId: ws.id, userId, role: "owner" } })
    .catch(() => {});
  return NextResponse.json(
    { id: ws.id, name: ws.name, type: ws.type, ownerId: ws.ownerId, isMine: true },
    { status: 201 }
  );
}
