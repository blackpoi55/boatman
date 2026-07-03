import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, AUTH_COOKIE } from "@/lib/auth";
import { ensureUserWorkspaces } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = String(body.username || body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!identifier || !password)
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );

    const user = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );

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
