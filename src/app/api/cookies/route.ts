import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/cookies (current user's jar)
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const cookies = await prisma.cookie.findMany({
      where: { ownerId: userId },
      orderBy: [{ domain: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(cookies);
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// POST /api/cookies -> add/update a cookie manually
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const b = await req.json();
    if (!b.domain || !b.name)
      return NextResponse.json(
        { error: "domain and name are required" },
        { status: 400 }
      );
    const key = {
      ownerId: userId,
      domain: b.domain,
      path: b.path || "/",
      name: b.name,
    };
    const existing = await prisma.cookie.findFirst({ where: key });
    const data = {
      value: b.value || "",
      secure: !!b.secure,
      httpOnly: !!b.httpOnly,
      expires: b.expires ? new Date(b.expires) : null,
    };
    const cookie = existing
      ? await prisma.cookie.update({ where: { id: existing.id }, data })
      : await prisma.cookie.create({ data: { ...key, ...data } });
    return NextResponse.json(cookie, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// DELETE /api/cookies?id=x  or all
export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      await prisma.cookie.deleteMany({ where: { id, ownerId: userId } });
    } else {
      await prisma.cookie.deleteMany({ where: { ownerId: userId } });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
