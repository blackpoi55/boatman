import { NextRequest, NextResponse } from "next/server";
import type { ProxyResponse } from "@/lib/types";
import { cookieHeaderForUrl, storeSetCookies } from "@/lib/cookieJar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProxyRequestPayload {
  method: string;
  url: string;
  headers: { key: string; value: string }[];
  // body is already serialized by the client for raw types;
  // for form-data / urlencoded the client sends structured entries.
  bodyMode: "none" | "raw" | "urlencoded" | "form-data";
  rawBody?: string;
  formEntries?: { key: string; value: string }[];
  contentType?: string;
  timeoutMs?: number;
  useCookieJar?: boolean;
}

function isForbiddenHeader(name: string): boolean {
  // Headers that fetch/undici will set itself or refuses to let us override.
  const n = name.toLowerCase();
  return (
    n === "content-length" ||
    n === "host" ||
    n === "connection" ||
    n === "transfer-encoding" ||
    n === "keep-alive" ||
    n.startsWith("proxy-") ||
    n.startsWith("sec-")
  );
}

export async function POST(req: NextRequest) {
  let payload: ProxyRequestPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const { method, url, headers = [], bodyMode } = payload;

  if (!url || !/^https?:\/\//i.test(url)) {
    const errRes: ProxyResponse = {
      ok: false,
      status: 0,
      statusText: "",
      headers: [],
      body: "",
      contentType: "",
      durationMs: 0,
      sizeBytes: 0,
      error:
        "URL must be an absolute http(s) URL, e.g. https://api.example.com/users",
    };
    return NextResponse.json(errRes, { status: 200 });
  }

  // Build headers
  const outHeaders = new Headers();
  for (const h of headers) {
    if (!h.key || !h.key.trim()) continue;
    if (isForbiddenHeader(h.key)) continue;
    try {
      outHeaders.append(h.key, h.value ?? "");
    } catch {
      /* ignore invalid header */
    }
  }

  const useJar = payload.useCookieJar !== false;
  const userSetCookie = outHeaders.has("cookie");

  // Build body
  let body: BodyInit | undefined;
  const upperMethod = (method || "GET").toUpperCase();
  const methodAllowsBody = !["GET", "HEAD"].includes(upperMethod);

  if (methodAllowsBody) {
    if (bodyMode === "raw" && payload.rawBody != null) {
      body = payload.rawBody;
      if (payload.contentType && !outHeaders.has("content-type")) {
        outHeaders.set("content-type", payload.contentType);
      }
    } else if (bodyMode === "urlencoded" && payload.formEntries) {
      const usp = new URLSearchParams();
      for (const e of payload.formEntries) {
        if (e.key) usp.append(e.key, e.value ?? "");
      }
      body = usp.toString();
      if (!outHeaders.has("content-type")) {
        outHeaders.set(
          "content-type",
          "application/x-www-form-urlencoded"
        );
      }
    } else if (bodyMode === "form-data" && payload.formEntries) {
      const fd = new FormData();
      for (const e of payload.formEntries) {
        if (e.key) fd.append(e.key, e.value ?? "");
      }
      body = fd;
      // let fetch set the multipart boundary content-type
      outHeaders.delete("content-type");
    }
  }

  const timeoutMs = Math.min(payload.timeoutMs ?? 60000, 120000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const start = Date.now();
  try {
    // Manual redirect handling so we capture Set-Cookie on every hop
    // (fetch's redirect:"follow" swallows intermediate Set-Cookie headers).
    const MAX_REDIRECTS = 10;
    let currentUrl = url;
    let currentMethod = upperMethod;
    let currentBody = body;
    let redirected = false;
    const allCookies: {
      name: string;
      value: string;
      domain?: string;
      path?: string;
    }[] = [];

    let res: Response;
    let hop = 0;
    while (true) {
      const hopHeaders = new Headers(outHeaders);
      if (useJar && !userSetCookie) {
        try {
          const jarCookies = await cookieHeaderForUrl(currentUrl);
          if (jarCookies) hopHeaders.set("cookie", jarCookies);
          else hopHeaders.delete("cookie");
        } catch {
          /* non-fatal */
        }
      }

      res = await fetch(currentUrl, {
        method: currentMethod,
        headers: hopHeaders,
        body: currentBody,
        redirect: "manual",
        signal: controller.signal,
      });

      // Capture cookies from this hop.
      if (useJar) {
        try {
          const setCookies =
            typeof (res.headers as any).getSetCookie === "function"
              ? (res.headers as any).getSetCookie()
              : res.headers.get("set-cookie")
              ? [res.headers.get("set-cookie") as string]
              : [];
          if (setCookies.length) {
            const stored = await storeSetCookies(setCookies, currentUrl);
            allCookies.push(...stored);
          }
        } catch {
          /* non-fatal */
        }
      }

      const status = res.status;
      const location = res.headers.get("location");
      const isRedirect =
        [301, 302, 303, 307, 308].includes(status) && !!location;

      if (!isRedirect || hop >= MAX_REDIRECTS) break;

      // Consume/close the redirect body before the next hop.
      await res.arrayBuffer().catch(() => {});
      redirected = true;
      hop++;
      currentUrl = new URL(location!, currentUrl).toString();
      // Method/body semantics per spec.
      if (status === 303 || ((status === 301 || status === 302) && currentMethod === "POST")) {
        currentMethod = "GET";
        currentBody = undefined;
      }
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const durationMs = Date.now() - start;

    const respHeaders: { key: string; value: string }[] = [];
    res.headers.forEach((value, key) => {
      respHeaders.push({ key, value });
    });

    const contentType = res.headers.get("content-type") || "";
    const bodyText = buf.toString("utf8");

    const out: ProxyResponse = {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      headers: respHeaders,
      body: bodyText,
      contentType,
      durationMs,
      sizeBytes: buf.byteLength,
      redirected,
      finalUrl: currentUrl,
      cookies: allCookies,
    };
    return NextResponse.json(out, { status: 200 });
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Request timed out after ${timeoutMs}ms`
          : err.message
        : "Unknown error";
    const out: ProxyResponse = {
      ok: false,
      status: 0,
      statusText: "",
      headers: [],
      body: "",
      contentType: "",
      durationMs,
      sizeBytes: 0,
      error: message,
    };
    return NextResponse.json(out, { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}
