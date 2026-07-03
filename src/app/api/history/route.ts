import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/history?limit=100
export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(
      Number(req.nextUrl.searchParams.get("limit")) || 100,
      500
    );
    const items = await prisma.history.findMany({
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

// POST /api/history -> record a sent request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await prisma.history.create({
      data: {
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

// DELETE /api/history -> clear all history
export async function DELETE() {
  try {
    await prisma.history.deleteMany({});
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
