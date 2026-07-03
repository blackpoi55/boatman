import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

async function guard(userId: string, requestId: string) {
  const reqRow = await prisma.request.findUnique({
    where: { id: requestId },
    include: { collection: true },
  });
  if (!reqRow) return { ok: false as const, status: 404 };
  const col = reqRow.collection;
  if (col.visibility === "private" && col.ownerId !== userId)
    return { ok: false as const, status: 403 };
  if (!col.workspaceId || !(await canAccessWorkspace(userId, col.workspaceId)))
    return { ok: false as const, status: 403 };
  return { ok: true as const };
}

// PUT /api/requests/:id
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
    if (body.name !== undefined) data.name = body.name?.trim() || "Untitled Request";
    if (body.method !== undefined) data.method = body.method;
    if (body.url !== undefined) data.url = body.url;
    if (body.params !== undefined) data.params = body.params;
    if (body.headers !== undefined) data.headers = body.headers;
    if (body.auth !== undefined) data.auth = body.auth;
    if (body.body !== undefined) data.body = body.body;
    if (body.description !== undefined) data.description = body.description;
    if (body.preRequestScript !== undefined)
      data.preRequestScript = body.preRequestScript;
    if (body.testScript !== undefined) data.testScript = body.testScript;
    if (body.collectionId !== undefined) data.collectionId = body.collectionId;

    const updated = await prisma.request.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// DELETE /api/requests/:id
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
    await prisma.request.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
