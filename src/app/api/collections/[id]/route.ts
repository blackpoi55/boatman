import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

async function canEdit(userId: string, collectionId: string) {
  const col = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!col) return { ok: false as const, status: 404 };
  // private items: owner only. shared items: any member of the workspace.
  if (col.visibility === "private" && col.ownerId !== userId)
    return { ok: false as const, status: 403 };
  if (!col.workspaceId || !(await canAccessWorkspace(userId, col.workspaceId)))
    return { ok: false as const, status: 403 };
  return { ok: true as const, col };
}

// PATCH /api/collections/:id -> rename and/or change visibility
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const guard = await canEdit(userId, id);
    if (!guard.ok)
      return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name?.trim() || "Untitled";
    if (body.visibility !== undefined)
      data.visibility = body.visibility === "private" ? "private" : "shared";
    if (body.workspaceId !== undefined) {
      if (await canAccessWorkspace(userId, body.workspaceId))
        data.workspaceId = body.workspaceId;
    }
    const updated = await prisma.collection.update({
      where: { id },
      data,
      include: { requests: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ ...updated, isMine: updated.ownerId === userId });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const guard = await canEdit(userId, id);
    if (!guard.ok)
      return NextResponse.json({ error: "Forbidden" }, { status: guard.status });
    await prisma.collection.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
