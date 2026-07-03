import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/globals -> all global variables
export async function GET() {
  try {
    const vars = await prisma.globalVar.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(vars);
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// PUT /api/globals -> replace the whole set of global variables
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const vars: { key: string; value: string; enabled: boolean }[] = Array.isArray(
      body.variables
    )
      ? body.variables
      : [];

    // Simplest reliable strategy: wipe and re-create.
    await prisma.globalVar.deleteMany({});
    const created = await Promise.all(
      vars
        .filter((v) => v.key)
        .map((v) =>
          prisma.globalVar.create({
            data: {
              key: v.key,
              value: v.value || "",
              enabled: v.enabled !== false,
            },
          })
        )
    );
    return NextResponse.json(created);
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
