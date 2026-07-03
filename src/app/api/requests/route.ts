import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// POST /api/requests -> save (create) a request into a collection
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.collectionId)
      return NextResponse.json(
        { error: "collectionId is required" },
        { status: 400 }
      );
    const col = await prisma.collection.findUnique({
      where: { id: body.collectionId },
    });
    if (!col) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    if (col.visibility === "private" && col.ownerId !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!col.workspaceId || !(await canAccessWorkspace(userId, col.workspaceId)))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const count = await prisma.request.count({
      where: { collectionId: body.collectionId },
    });
    const created = await prisma.request.create({
      data: {
        collectionId: body.collectionId,
        name: body.name?.trim() || "Untitled Request",
        method: body.method || "GET",
        url: body.url || "",
        description: body.description ?? "",
        params: body.params ?? [],
        headers: body.headers ?? [],
        auth: body.auth ?? {},
        body: body.body ?? {},
        preRequestScript: body.preRequestScript ?? "",
        testScript: body.testScript ?? "",
        order: count,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
