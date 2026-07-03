import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

async function guard(userId: string, envId: string) {
  const env = await prisma.environment.findUnique({ where: { id: envId } });
  if (!env) return { ok: false as const, status: 404 };
  if (env.visibility === "private" && env.ownerId !== userId)
    return { ok: false as const, status: 403 };
  if (!env.workspaceId || !(await canAccessWorkspace(userId, env.workspaceId)))
    return { ok: false as const, status: 403 };
  return { ok: true as const, env };
}

// PUT /api/environments/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const g = await guard(userId, id);
    if (!g.ok) return NextResponse.json({ error: "Forbidden" }, { status: g.status });
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name?.trim() || "Untitled";
    if (body.variables !== undefined) data.variables = body.variables;
    if (body.visibility !== undefined)
      data.visibility = body.visibility === "private" ? "private" : "shared";
    if (body.workspaceId !== undefined) {
      if (await canAccessWorkspace(userId, body.workspaceId))
        data.workspaceId = body.workspaceId;
    }
    const updated = await prisma.environment.update({ where: { id }, data });
    return NextResponse.json({ ...updated, isMine: updated.ownerId === userId });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// DELETE /api/environments/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const g = await guard(userId, id);
    if (!g.ok) return NextResponse.json({ error: "Forbidden" }, { status: g.status });
    await prisma.environment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
