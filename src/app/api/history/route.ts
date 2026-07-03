import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/history?limit=100  (current user's history only)
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit")) || 100,
      500
    );
    const items = await prisma.history.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(items);
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// POST /api/history
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const created = await prisma.history.create({
      data: {
        ownerId: userId,
        method: body.method || "GET",
        url: body.url || "",
        status: body.status ?? null,
        statusText: body.statusText ?? null,
        durationMs: body.durationMs ?? null,
        sizeBytes: body.sizeBytes ?? null,
        request: body.request ?? {},
        response: body.response ?? {},
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

// DELETE /api/history -> clear current user's history
export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.history.deleteMany({ where: { ownerId: userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
