import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT /api/environments/:id -> update variables/name/active state
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Only one environment can be active at a time.
    if (body.isActive === true) {
      await prisma.environment.updateMany({
        where: { NOT: { id } },
        data: { isActive: false },
      });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name?.trim() || "Untitled";
    if (body.variables !== undefined) data.variables = body.variables;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await prisma.environment.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// DELETE /api/environments/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.environment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
