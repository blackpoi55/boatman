import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, AUTH_COOKIE } from "@/lib/auth";
import { ensureUserWorkspaces } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim().toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (!username || username.length < 3)
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing)
      return NextResponse.json(
        { error: "Username or email already in use" },
        { status: 409 }
      );

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: await hashPassword(password),
        name: name || username,
      },
    });

    await ensureUserWorkspaces(user.id);

    const token = signToken({ uid: user.id, username: user.username });
    const res = NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    });
    res.cookies.set({
      name: AUTH_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
