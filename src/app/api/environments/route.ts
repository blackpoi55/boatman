import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/environments
export async function GET() {
  try {
    const envs = await prisma.environment.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(envs);
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// POST /api/environments
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const created = await prisma.environment.create({
      data: {
        name: body.name?.trim() || "New Environment",
        variables: body.variables ?? [],
        isActive: false,
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
