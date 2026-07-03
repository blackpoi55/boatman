import { RequestData } from "./types";
import { resolveWithMap } from "./variables";

export interface ResolvedRequest {
  method: string;
  url: string;
  headers: { key: string; value: string }[];
  bodyMode: "none" | "raw" | "urlencoded" | "form-data";
  rawBody?: string;
  formEntries?: { key: string; value: string }[];
  contentType?: string;
}

/**
 * Turn an editable RequestData into a concrete, variable-resolved request:
 * merges query params into the URL, applies auth, and normalizes the body.
 * Used both by the send path (-> proxy payload) and the code generators.
 */
export function buildResolvedRequest(
  req: RequestData,
  map: Map<string, string>
): ResolvedRequest {
  const r = (s: string) => resolveWithMap(s, map);
  const url = r(req.url);

  const headers: { key: string; value: string }[] = req.headers
    .filter((h) => h.enabled && h.key)
    .map((h) => ({ key: r(h.key), value: r(h.value) }));

  // Auth
  const auth = req.auth;
  if (auth.type === "bearer" && auth.token) {
    headers.push({ key: "Authorization", value: `Bearer ${r(auth.token)}` });
  } else if (auth.type === "basic") {
    const u = r(auth.username || "");
    const p = r(auth.password || "");
    const encoded =
      typeof btoa !== "undefined"
        ? btoa(`${u}:${p}`)
        : Buffer.from(`${u}:${p}`).toString("base64");
    headers.push({ key: "Authorization", value: `Basic ${encoded}` });
  } else if (auth.type === "apikey" && auth.key && auth.addTo !== "query") {
    headers.push({ key: r(auth.key), value: r(auth.apiValue || "") });
  }

  let finalUrl = url;
  if (auth.type === "apikey" && auth.addTo === "query" && auth.key) {
    const sep = finalUrl.includes("?") ? "&" : "?";
    finalUrl += `${sep}${encodeURIComponent(r(auth.key))}=${encodeURIComponent(
      r(auth.apiValue || "")
    )}`;
  }

  // Body
  const body = req.body;
  let bodyMode: ResolvedRequest["bodyMode"] = "none";
  let rawBody: string | undefined;
  let formEntries: { key: string; value: string }[] | undefined;
  let contentType: string | undefined;

  if (body.type === "json") {
    bodyMode = "raw";
    rawBody = r(body.raw);
    contentType = "application/json";
  } else if (body.type === "xml") {
    bodyMode = "raw";
    rawBody = r(body.raw);
    contentType = "application/xml";
  } else if (body.type === "text") {
    bodyMode = "raw";
    rawBody = r(body.raw);
    contentType = "text/plain";
  } else if (body.type === "urlencoded") {
    bodyMode = "urlencoded";
    formEntries = body.formData
      .filter((e) => e.enabled && e.key)
      .map((e) => ({ key: r(e.key), value: r(e.value) }));
  } else if (body.type === "form-data") {
    bodyMode = "form-data";
    formEntries = body.formData
      .filter((e) => e.enabled && e.key)
      .map((e) => ({ key: r(e.key), value: r(e.value) }));
  }

  return {
    method: req.method,
    url: finalUrl,
    headers,
    bodyMode,
    rawBody,
    formEntries,
    contentType,
  };
}
