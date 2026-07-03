import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const AUTH_COOKIE = "boatman_token";
const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

export interface TokenPayload {
  uid: string;
  username: string;
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(
  pw: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: MAX_AGE_SEC });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/** Returns the authenticated user id from the request cookie, or null. */
export function getUserId(req: NextRequest): string | null {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.uid ?? null;
}

export function getPayload(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Build the Set-Cookie options for the auth cookie. */
export function authCookieOptions(remove = false) {
  return {
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: remove ? 0 : MAX_AGE_SEC,
  };
}
