import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/collections -> all collections with their requests
export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: { order: "asc" },
      include: { requests: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json(collections);
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// POST /api/collections -> create a collection
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const count = await prisma.collection.count();
    const created = await prisma.collection.create({
      data: {
        name: body.name?.trim() || "New Collection",
        order: count,
      },
      include: { requests: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
