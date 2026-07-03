import { RequestData, KV, Auth, BodyType, uid, HttpMethod } from "./types";

export interface ImportedCollection {
  name: string;
  requests: RequestData[];
}

// ---------------- Postman v2.1 IMPORT ----------------

export function importPostmanCollection(json: any): ImportedCollection {
  const name = json?.info?.name || "Imported Collection";
  const requests: RequestData[] = [];
  walkItems(json?.item || [], "", requests);
  return { name, requests };
}

function walkItems(items: any[], prefix: string, out: RequestData[]) {
  for (const it of items) {
    if (Array.isArray(it.item)) {
      // folder
      const p = prefix ? `${prefix} / ${it.name}` : it.name;
      walkItems(it.item, p, out);
    } else if (it.request) {
      out.push(parsePostmanRequest(it, prefix));
    }
  }
}

function parsePostmanRequest(item: any, prefix: string): RequestData {
  const req = item.request;
  const method = (typeof req.method === "string" ? req.method : "GET").toUpperCase();

  // URL
  let url = "";
  const params: KV[] = [];
  if (typeof req.url === "string") {
    url = req.url;
  } else if (req.url) {
    url = req.url.raw || "";
    for (const q of req.url.query || []) {
      params.push({
        id: uid(),
        key: q.key || "",
        value: q.value || "",
        enabled: !q.disabled,
      });
    }
  }

  // Headers
  const headers: KV[] = (req.header || []).map((h: any) => ({
    id: uid(),
    key: h.key || "",
    value: h.value || "",
    enabled: !h.disabled,
  }));

  // Auth
  const auth = parseAuth(req.auth);

  // Body
  const body = parseBody(req.body);

  // Scripts
  let preRequestScript = "";
  let testScript = "";
  for (const ev of item.event || []) {
    const code = Array.isArray(ev.script?.exec)
      ? ev.script.exec.join("\n")
      : ev.script?.exec || "";
    if (ev.listen === "prerequest") preRequestScript = code;
    else if (ev.listen === "test") testScript = code;
  }

  const baseName = item.name || "Request";
  return {
    id: uid(),
    name: prefix ? `${prefix} / ${baseName}` : baseName,
    method: method as HttpMethod,
    url,
    description: typeof req.description === "string" ? req.description : "",
    params,
    headers,
    auth,
    body,
    preRequestScript,
    testScript,
  };
}

function parseAuth(auth: any): Auth {
  if (!auth || !auth.type) return { type: "none" };
  const pick = (arr: any[], k: string) =>
    (arr || []).find((x) => x.key === k)?.value || "";
  switch (auth.type) {
    case "bearer":
      return { type: "bearer", token: pick(auth.bearer, "token") };
    case "basic":
      return {
        type: "basic",
        username: pick(auth.basic, "username"),
        password: pick(auth.basic, "password"),
      };
    case "apikey":
      return {
        type: "apikey",
        key: pick(auth.apikey, "key"),
        apiValue: pick(auth.apikey, "value"),
        addTo: pick(auth.apikey, "in") === "query" ? "query" : "header",
      };
    default:
      return { type: "none" };
  }
}

function parseBody(body: any): RequestData["body"] {
  const empty = { type: "none" as BodyType, raw: "", formData: [] as KV[] };
  if (!body || !body.mode) return empty;
  if (body.mode === "raw") {
    const lang = body.options?.raw?.language;
    let type: BodyType = "text";
    if (lang === "json") type = "json";
    else if (lang === "xml") type = "xml";
    else {
      // sniff json
      const raw = body.raw || "";
      if (/^\s*[[{]/.test(raw)) type = "json";
    }
    return { type, raw: body.raw || "", formData: [] };
  }
  if (body.mode === "urlencoded") {
    return {
      type: "urlencoded",
      raw: "",
      formData: (body.urlencoded || []).map((e: any) => ({
        id: uid(),
        key: e.key || "",
        value: e.value || "",
        enabled: !e.disabled,
      })),
    };
  }
  if (body.mode === "formdata") {
    return {
      type: "form-data",
      raw: "",
      formData: (body.formdata || []).map((e: any) => ({
        id: uid(),
        key: e.key || "",
        value: e.value || "",
        enabled: !e.disabled,
      })),
    };
  }
  return empty;
}

// ---------------- Postman v2.1 EXPORT ----------------

export function exportPostmanCollection(
  name: string,
  requests: RequestData[]
): any {
  return {
    info: {
      name,
      _postman_id: uid(),
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: requests.map((r) => requestToPostmanItem(r)),
  };
}

function requestToPostmanItem(r: RequestData): any {
  const event: any[] = [];
  if (r.preRequestScript) {
    event.push({
      listen: "prerequest",
      script: { type: "text/javascript", exec: r.preRequestScript.split("\n") },
    });
  }
  if (r.testScript) {
    event.push({
      listen: "test",
      script: { type: "text/javascript", exec: r.testScript.split("\n") },
    });
  }

  const qIndex = r.url.indexOf("?");
  const rawBase = qIndex === -1 ? r.url : r.url.slice(0, qIndex);

  const item: any = {
    name: r.name,
    request: {
      method: r.method,
      header: r.headers.map((h) => ({
        key: h.key,
        value: h.value,
        disabled: !h.enabled,
      })),
      url: {
        raw: r.url,
        query: r.params.map((p) => ({
          key: p.key,
          value: p.value,
          disabled: !p.enabled,
        })),
      },
      description: r.description || "",
    },
  };
  if (rawBase) {
    // best-effort host/path split for nicer Postman rendering
  }

  // auth
  const a = r.auth;
  if (a.type === "bearer") {
    item.request.auth = { type: "bearer", bearer: [{ key: "token", value: a.token || "" }] };
  } else if (a.type === "basic") {
    item.request.auth = {
      type: "basic",
      basic: [
        { key: "username", value: a.username || "" },
        { key: "password", value: a.password || "" },
      ],
    };
  } else if (a.type === "apikey") {
    item.request.auth = {
      type: "apikey",
      apikey: [
        { key: "key", value: a.key || "" },
        { key: "value", value: a.apiValue || "" },
        { key: "in", value: a.addTo || "header" },
      ],
    };
  }

  // body
  const b = r.body;
  if (b.type === "json" || b.type === "text" || b.type === "xml") {
    item.request.body = {
      mode: "raw",
      raw: b.raw,
      options: { raw: { language: b.type === "json" ? "json" : b.type } },
    };
  } else if (b.type === "urlencoded") {
    item.request.body = {
      mode: "urlencoded",
      urlencoded: b.formData.map((e) => ({
        key: e.key,
        value: e.value,
        disabled: !e.enabled,
      })),
    };
  } else if (b.type === "form-data") {
    item.request.body = {
      mode: "formdata",
      formdata: b.formData.map((e) => ({
        key: e.key,
        value: e.value,
        type: "text",
        disabled: !e.enabled,
      })),
    };
  }

  if (event.length) item.event = event;
  return item;
}

// ---------------- cURL IMPORT ----------------

export function importCurl(curl: string): RequestData | null {
  const tokens = tokenizeCurl(curl.trim());
  if (!tokens.length) return null;

  let method = "";
  let url = "";
  const headers: KV[] = [];
  const dataParts: string[] = [];
  const formParts: KV[] = [];
  let user = "";
  let isForm = false;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "curl") continue;
    if (t === "-X" || t === "--request") {
      method = tokens[++i]?.toUpperCase() || "";
    } else if (t === "-H" || t === "--header") {
      const h = tokens[++i] || "";
      const idx = h.indexOf(":");
      if (idx !== -1) {
        headers.push({
          id: uid(),
          key: h.slice(0, idx).trim(),
          value: h.slice(idx + 1).trim(),
          enabled: true,
        });
      }
    } else if (
      t === "-d" ||
      t === "--data" ||
      t === "--data-raw" ||
      t === "--data-binary" ||
      t === "--data-ascii"
    ) {
      dataParts.push(tokens[++i] || "");
    } else if (t === "-F" || t === "--form") {
      isForm = true;
      const f = tokens[++i] || "";
      const idx = f.indexOf("=");
      if (idx !== -1) {
        formParts.push({
          id: uid(),
          key: f.slice(0, idx),
          value: f.slice(idx + 1).replace(/^@/, ""),
          enabled: true,
        });
      }
    } else if (t === "-u" || t === "--user") {
      user = tokens[++i] || "";
    } else if (t === "--url") {
      url = tokens[++i] || "";
    } else if (t === "--location" || t === "-L" || t === "--compressed" || t === "-s" || t === "--silent") {
      // flags with no argument
    } else if (t === "-G" || t === "--get") {
      method = method || "GET";
    } else if (!t.startsWith("-") && !url) {
      url = t;
    }
  }

  if (!url) return null;

  // Auth from -u
  let auth: Auth = { type: "none" };
  if (user) {
    const ci = user.indexOf(":");
    auth = {
      type: "basic",
      username: ci === -1 ? user : user.slice(0, ci),
      password: ci === -1 ? "" : user.slice(ci + 1),
    };
  }

  // Body
  let body: RequestData["body"] = { type: "none", raw: "", formData: [] };
  const rawData = dataParts.join("&");
  if (isForm) {
    body = { type: "form-data", raw: "", formData: formParts };
    method = method || "POST";
  } else if (rawData) {
    const ct = headers.find((h) => h.key.toLowerCase() === "content-type")?.value || "";
    if (/json/i.test(ct) || /^\s*[[{]/.test(rawData)) {
      body = { type: "json", raw: rawData, formData: [] };
    } else if (/urlencoded/i.test(ct) || /^[\w%.\-]+=[^&]*(&[\w%.\-]+=[^&]*)*$/.test(rawData)) {
      const fd: KV[] = rawData.split("&").map((p) => {
        const idx = p.indexOf("=");
        return {
          id: uid(),
          key: idx === -1 ? p : decodeURIComponent(p.slice(0, idx)),
          value: idx === -1 ? "" : decodeURIComponent(p.slice(idx + 1)),
          enabled: true,
        };
      });
      body = { type: "urlencoded", raw: "", formData: fd };
    } else {
      body = { type: "text", raw: rawData, formData: [] };
    }
    method = method || "POST";
  }

  method = method || "GET";

  // Params from url
  const params: KV[] = [];
  const qi = url.indexOf("?");
  if (qi !== -1) {
    for (const part of url.slice(qi + 1).split("&")) {
      if (!part) continue;
      const idx = part.indexOf("=");
      params.push({
        id: uid(),
        key: idx === -1 ? part : decodeURIComponent(part.slice(0, idx)),
        value: idx === -1 ? "" : decodeURIComponent(part.slice(idx + 1)),
        enabled: true,
      });
    }
  }

  return {
    id: uid(),
    name: shortName(url),
    method: method as HttpMethod,
    url,
    description: "",
    params,
    headers,
    auth,
    body,
    preRequestScript: "",
    testScript: "",
  };
}

function tokenizeCurl(input: string): string[] {
  // Remove line continuations, then split respecting single/double quotes.
  const s = input.replace(/\\\r?\n/g, " ").replace(/\r?\n/g, " ");
  const tokens: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      let buf = "";
      while (i < s.length && s[i] !== quote) {
        if (s[i] === "\\" && quote === '"' && i + 1 < s.length) {
          buf += s[i + 1];
          i += 2;
        } else {
          buf += s[i];
          i++;
        }
      }
      i++; // closing quote
      tokens.push(buf);
    } else {
      let buf = "";
      while (i < s.length && s[i] !== " " && s[i] !== "\t") {
        if (s[i] === "'" || s[i] === '"') {
          const quote = s[i];
          i++;
          while (i < s.length && s[i] !== quote) {
            buf += s[i];
            i++;
          }
          i++;
        } else {
          buf += s[i];
          i++;
        }
      }
      tokens.push(buf);
    }
  }
  return tokens;
}

function shortName(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" || !u.pathname ? u.hostname : u.pathname;
  } catch {
    return url.slice(0, 40);
  }
}
