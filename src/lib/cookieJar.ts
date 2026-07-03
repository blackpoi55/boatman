import { prisma } from "./prisma";

export interface ParsedSetCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expires: Date | null;
}

/** Parse a single Set-Cookie header value. */
export function parseSetCookie(
  header: string,
  requestHost: string
): ParsedSetCookie | null {
  const parts = header.split(";");
  const first = parts.shift();
  if (!first) return null;
  const eq = first.indexOf("=");
  if (eq === -1) return null;
  const name = first.slice(0, eq).trim();
  const value = first.slice(eq + 1).trim();
  if (!name) return null;

  const out: ParsedSetCookie = {
    name,
    value,
    domain: requestHost,
    path: "/",
    secure: false,
    httpOnly: false,
    expires: null,
  };

  let maxAge: number | null = null;

  for (const attr of parts) {
    const idx = attr.indexOf("=");
    const k = (idx === -1 ? attr : attr.slice(0, idx)).trim().toLowerCase();
    const v = idx === -1 ? "" : attr.slice(idx + 1).trim();
    if (k === "domain") out.domain = v.replace(/^\./, "");
    else if (k === "path") out.path = v || "/";
    else if (k === "secure") out.secure = true;
    else if (k === "httponly") out.httpOnly = true;
    else if (k === "expires") {
      const d = new Date(v);
      if (!isNaN(d.getTime())) out.expires = d;
    } else if (k === "max-age") {
      const n = parseInt(v, 10);
      if (!isNaN(n)) maxAge = n;
    }
  }

  if (maxAge != null) {
    out.expires = new Date(Date.now() + maxAge * 1000);
  }

  return out;
}

/** Does a stored cookie apply to the given host/path? */
function cookieMatches(
  cookieDomain: string,
  cookiePath: string,
  host: string,
  path: string
): boolean {
  const cd = cookieDomain.replace(/^\./, "").toLowerCase();
  const h = host.toLowerCase();
  const domainOk = h === cd || h.endsWith("." + cd);
  const pathOk = path.startsWith(cookiePath);
  return domainOk && pathOk;
}

/** Build the Cookie header value for a request URL from the user's jar. */
export async function cookieHeaderForUrl(
  url: string,
  ownerId: string
): Promise<string> {
  let host = "";
  let path = "/";
  try {
    const u = new URL(url);
    host = u.hostname;
    path = u.pathname || "/";
  } catch {
    return "";
  }
  const now = new Date();
  const all = await prisma.cookie.findMany({ where: { ownerId } });
  const applicable = all.filter(
    (c) =>
      cookieMatches(c.domain, c.path, host, path) &&
      (!c.expires || c.expires > now)
  );
  return applicable.map((c) => `${c.name}=${c.value}`).join("; ");
}

/** Persist an array of Set-Cookie header strings into the user's jar. */
export async function storeSetCookies(
  setCookies: string[],
  requestUrl: string,
  ownerId: string
): Promise<{ name: string; value: string; domain: string; path: string }[]> {
  let host = "";
  try {
    host = new URL(requestUrl).hostname;
  } catch {
    return [];
  }
  const stored: {
    name: string;
    value: string;
    domain: string;
    path: string;
  }[] = [];

  for (const raw of setCookies) {
    const parsed = parseSetCookie(raw, host);
    if (!parsed) continue;
    const key = {
      ownerId,
      domain: parsed.domain,
      path: parsed.path,
      name: parsed.name,
    };
    // Expired (deletion) cookie -> remove it.
    if (parsed.expires && parsed.expires.getTime() <= Date.now()) {
      await prisma.cookie.deleteMany({ where: key }).catch(() => {});
      continue;
    }
    // Manual upsert (composite uniqueness enforced here, not in DB).
    const existing = await prisma.cookie.findFirst({ where: key });
    if (existing) {
      await prisma.cookie
        .update({
          where: { id: existing.id },
          data: {
            value: parsed.value,
            secure: parsed.secure,
            httpOnly: parsed.httpOnly,
            expires: parsed.expires,
          },
        })
        .catch(() => {});
    } else {
      await prisma.cookie
        .create({
          data: {
            ownerId,
            domain: parsed.domain,
            path: parsed.path,
            name: parsed.name,
            value: parsed.value,
            secure: parsed.secure,
            httpOnly: parsed.httpOnly,
            expires: parsed.expires,
          },
        })
        .catch(() => {});
    }
    stored.push({
      name: parsed.name,
      value: parsed.value,
      domain: parsed.domain,
      path: parsed.path,
    });
  }
  return stored;
}
