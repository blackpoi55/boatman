import { ResolvedRequest } from "./resolve";

export type CodeLang =
  | "curl"
  | "fetch"
  | "axios"
  | "python"
  | "node"
  | "go"
  | "php";

export const CODE_LANGS: { id: CodeLang; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "fetch", label: "JavaScript — Fetch" },
  { id: "axios", label: "JavaScript — Axios" },
  { id: "python", label: "Python — requests" },
  { id: "node", label: "Node.js — Fetch" },
  { id: "go", label: "Go — net/http" },
  { id: "php", label: "PHP — cURL" },
];

function bodyString(r: ResolvedRequest): string {
  if (r.bodyMode === "raw") return r.rawBody ?? "";
  if (r.bodyMode === "urlencoded") {
    return (r.formEntries || [])
      .map(
        (e) => `${encodeURIComponent(e.key)}=${encodeURIComponent(e.value)}`
      )
      .join("&");
  }
  return "";
}

function allHeaders(r: ResolvedRequest): { key: string; value: string }[] {
  const h = [...r.headers];
  if (r.bodyMode === "raw" && r.contentType && !h.some((x) => x.key.toLowerCase() === "content-type")) {
    h.push({ key: "Content-Type", value: r.contentType });
  }
  if (r.bodyMode === "urlencoded" && !h.some((x) => x.key.toLowerCase() === "content-type")) {
    h.push({ key: "Content-Type", value: "application/x-www-form-urlencoded" });
  }
  return h;
}

export function generateCode(r: ResolvedRequest, lang: CodeLang): string {
  switch (lang) {
    case "curl":
      return genCurl(r);
    case "fetch":
      return genFetch(r);
    case "axios":
      return genAxios(r);
    case "python":
      return genPython(r);
    case "node":
      return genFetch(r); // Node 18+ has global fetch
    case "go":
      return genGo(r);
    case "php":
      return genPhp(r);
    default:
      return "";
  }
}

function genCurl(r: ResolvedRequest): string {
  const lines: string[] = [`curl --location --request ${r.method} '${r.url}'`];
  for (const h of allHeaders(r)) {
    lines.push(`  --header '${h.key}: ${escSingle(h.value)}'`);
  }
  if (r.bodyMode === "form-data") {
    for (const e of r.formEntries || []) {
      lines.push(`  --form '${e.key}=${escSingle(e.value)}'`);
    }
  } else {
    const b = bodyString(r);
    if (b) lines.push(`  --data '${escSingle(b)}'`);
  }
  return lines.join(" \\\n");
}

function genFetch(r: ResolvedRequest): string {
  const headers = allHeaders(r);
  const headerObj = headers.length
    ? `{\n${headers.map((h) => `    ${JSON.stringify(h.key)}: ${JSON.stringify(h.value)}`).join(",\n")}\n  }`
    : "{}";

  let bodyLine = "";
  if (r.bodyMode === "raw" || r.bodyMode === "urlencoded") {
    const b = bodyString(r);
    if (b) bodyLine = `,\n  body: ${JSON.stringify(b)}`;
  } else if (r.bodyMode === "form-data") {
    const fd = (r.formEntries || [])
      .map((e) => `formData.append(${JSON.stringify(e.key)}, ${JSON.stringify(e.value)});`)
      .join("\n");
    return `const formData = new FormData();\n${fd}\n\nconst res = await fetch(${JSON.stringify(
      r.url
    )}, {\n  method: ${JSON.stringify(r.method)},\n  headers: ${headerObj},\n  body: formData\n});\nconst data = await res.text();\nconsole.log(data);`;
  }

  return `const res = await fetch(${JSON.stringify(r.url)}, {\n  method: ${JSON.stringify(
    r.method
  )},\n  headers: ${headerObj}${bodyLine}\n});\nconst data = await res.text();\nconsole.log(data);`;
}

function genAxios(r: ResolvedRequest): string {
  const headers = allHeaders(r);
  const headerObj = headers.length
    ? `{\n${headers.map((h) => `    ${JSON.stringify(h.key)}: ${JSON.stringify(h.value)}`).join(",\n")}\n  }`
    : "{}";
  let dataLine = "";
  if (r.bodyMode === "raw") {
    const b = bodyString(r);
    if (b) {
      if (r.contentType?.includes("json")) {
        dataLine = `,\n  data: ${b}`;
      } else {
        dataLine = `,\n  data: ${JSON.stringify(b)}`;
      }
    }
  } else if (r.bodyMode === "urlencoded") {
    dataLine = `,\n  data: ${JSON.stringify(bodyString(r))}`;
  }
  return `import axios from "axios";\n\nconst res = await axios({\n  method: ${JSON.stringify(
    r.method
  )},\n  url: ${JSON.stringify(r.url)},\n  headers: ${headerObj}${dataLine}\n});\nconsole.log(res.data);`;
}

function genPython(r: ResolvedRequest): string {
  const headers = allHeaders(r);
  const headerDict = headers.length
    ? `{\n${headers.map((h) => `    ${JSON.stringify(h.key)}: ${JSON.stringify(h.value)}`).join(",\n")}\n}`
    : "{}";
  let payload = "";
  let dataArg = "";
  if (r.bodyMode === "raw") {
    const b = bodyString(r);
    if (b) {
      payload = `payload = ${JSON.stringify(b)}\n`;
      dataArg = ", data=payload";
    }
  } else if (r.bodyMode === "urlencoded") {
    const dict = (r.formEntries || [])
      .map((e) => `    ${JSON.stringify(e.key)}: ${JSON.stringify(e.value)}`)
      .join(",\n");
    payload = `payload = {\n${dict}\n}\n`;
    dataArg = ", data=payload";
  } else if (r.bodyMode === "form-data") {
    const dict = (r.formEntries || [])
      .map((e) => `    ${JSON.stringify(e.key)}: (None, ${JSON.stringify(e.value)})`)
      .join(",\n");
    payload = `files = {\n${dict}\n}\n`;
    dataArg = ", files=files";
  }
  return `import requests\n\nurl = ${JSON.stringify(
    r.url
  )}\nheaders = ${headerDict}\n${payload}response = requests.request(${JSON.stringify(
    r.method
  )}, url, headers=headers${dataArg})\nprint(response.text)`;
}

function genGo(r: ResolvedRequest): string {
  const b = bodyString(r);
  const bodyExpr = b
    ? `strings.NewReader(${JSON.stringify(b)})`
    : "nil";
  const headerLines = allHeaders(r)
    .map((h) => `\treq.Header.Add(${JSON.stringify(h.key)}, ${JSON.stringify(h.value)})`)
    .join("\n");
  return `package main\n\nimport (\n\t"fmt"\n\t"io"\n\t"net/http"\n\t"strings"\n)\n\nfunc main() {\n\tclient := &http.Client{}\n\treq, err := http.NewRequest(${JSON.stringify(
    r.method
  )}, ${JSON.stringify(r.url)}, ${bodyExpr})\n\tif err != nil {\n\t\tpanic(err)\n\t}\n${headerLines}\n\tres, err := client.Do(req)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer res.Body.Close()\n\tbody, _ := io.ReadAll(res.Body)\n\tfmt.Println(string(body))\n}`;
}

function genPhp(r: ResolvedRequest): string {
  const headerArr = allHeaders(r)
    .map((h) => `  ${JSON.stringify(`${h.key}: ${h.value}`)}`)
    .join(",\n");
  const b = bodyString(r);
  const postField = b
    ? `\ncurl_setopt($ch, CURLOPT_POSTFIELDS, ${JSON.stringify(b)});`
    : "";
  return `<?php\n$ch = curl_init();\ncurl_setopt($ch, CURLOPT_URL, ${JSON.stringify(
    r.url
  )});\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_CUSTOMREQUEST, ${JSON.stringify(
    r.method
  )});\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n${headerArr}\n]);${postField}\n$response = curl_exec($ch);\ncurl_close($ch);\necho $response;`;
}

function escSingle(s: string): string {
  // Escape single quotes for shell single-quoted strings.
  return s.replace(/'/g, `'\\''`);
}
