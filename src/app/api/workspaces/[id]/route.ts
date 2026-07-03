import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/workspaces/:id -> rename (owner only, team only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ws = await prisma.workspace.findUnique({ where: { id } });
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ws.type === "personal" || ws.ownerId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const updated = await prisma.workspace.update({
    where: { id },
    data: { name: String(body.name || ws.name).trim() || ws.name },
  });
  return NextResponse.json({ id: updated.id, name: updated.name });
}

// DELETE /api/workspaces/:id -> delete a team workspace you own
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ws = await prisma.workspace.findUnique({ where: { id } });
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ws.type === "personal" || ws.ownerId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.workspace.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
