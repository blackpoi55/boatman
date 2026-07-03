import { KV, emptyKV, uid } from "./types";

/** Parse the query portion of a URL into KV pairs (for the Params table). */
export function urlToParams(url: string): KV[] {
  const qIndex = url.indexOf("?");
  if (qIndex === -1) return [];
  const query = url.slice(qIndex + 1);
  if (!query) return [];
  const out: KV[] = [];
  for (const part of query.split("&")) {
    if (part === "") continue;
    const eq = part.indexOf("=");
    const rawKey = eq === -1 ? part : part.slice(0, eq);
    const rawVal = eq === -1 ? "" : part.slice(eq + 1);
    out.push({
      id: uid(),
      key: safeDecode(rawKey),
      value: safeDecode(rawVal),
      enabled: true,
    });
  }
  return out;
}

/** Rebuild a URL string from a base URL and a list of query params. */
export function paramsToUrl(url: string, params: KV[]): string {
  const qIndex = url.indexOf("?");
  const base = qIndex === -1 ? url : url.slice(0, qIndex);
  const active = params.filter((p) => p.enabled && (p.key || p.value));
  if (active.length === 0) return base;
  const query = active
    .map((p) => `${encodePart(p.key)}=${encodePart(p.value)}`)
    .join("&");
  return `${base}?${query}`;
}

/** Merge freshly parsed params with the existing list to preserve `enabled`/ids where possible. */
export function mergeParams(existing: KV[], parsed: KV[]): KV[] {
  // Keep disabled entries from existing that are not represented in the URL.
  const disabled = existing.filter((p) => !p.enabled && (p.key || p.value));
  return [...parsed, ...disabled];
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
}

function encodePart(s: string): string {
  // Encode but keep {{vars}} readable.
  return encodeURIComponent(s).replace(/%7B%7B/g, "{{").replace(/%7D%7D/g, "}}");
}

export { emptyKV };
