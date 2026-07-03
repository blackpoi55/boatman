import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/cookies
export async function GET() {
  try {
    const cookies = await prisma.cookie.findMany({
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
  try {
    const b = await req.json();
    if (!b.domain || !b.name) {
      return NextResponse.json(
        { error: "domain and name are required" },
        { status: 400 }
      );
    }
    const cookie = await prisma.cookie.upsert({
      where: {
        domain_path_name: {
          domain: b.domain,
          path: b.path || "/",
          name: b.name,
        },
      },
      create: {
        domain: b.domain,
        path: b.path || "/",
        name: b.name,
        value: b.value || "",
        secure: !!b.secure,
        httpOnly: !!b.httpOnly,
        expires: b.expires ? new Date(b.expires) : null,
      },
      update: {
        value: b.value || "",
        secure: !!b.secure,
        httpOnly: !!b.httpOnly,
        expires: b.expires ? new Date(b.expires) : null,
      },
    });
    return NextResponse.json(cookie, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}

// DELETE /api/cookies       -> clear all
// DELETE /api/cookies?id=x  -> delete one
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      await prisma.cookie.delete({ where: { id } });
    } else {
      await prisma.cookie.deleteMany({});
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
