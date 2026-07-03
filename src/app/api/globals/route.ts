import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/globals -> current user's global variables
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const vars = await prisma.globalVar.findMany({
      where: { ownerId: userId },
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

// PUT /api/globals -> replace the user's global variables
export async function PUT(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const vars: { key: string; value: string; enabled: boolean }[] = Array.isArray(
      body.variables
    )
      ? body.variables
      : [];

    await prisma.globalVar.deleteMany({ where: { ownerId: userId } });
    const created = await Promise.all(
      vars
        .filter((v) => v.key)
        .map((v) =>
          prisma.globalVar.create({
            data: {
              ownerId: userId,
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
