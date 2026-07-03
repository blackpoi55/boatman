"use client";

import { useMemo, useState } from "react";
import { ProxyResponse, TestResult } from "@/lib/types";
import { Copy, Check, Search, Save } from "lucide-react";
import JsonTree from "./JsonTree";
import { useContextMenu } from "./ContextMenu";

type RespTab = "body" | "cookies" | "headers" | "tests" | "console";
type BodyMode = "pretty" | "raw" | "preview";

export default function ResponsePanel({
  response,
  loading,
  testResults,
  logs,
}: {
  response: ProxyResponse | null | undefined;
  loading: boolean;
  testResults?: TestResult[];
  logs?: string[];
}) {
  const [tab, setTab] = useState<RespTab>("body");
  const [bodyMode, setBodyMode] = useState<BodyMode>("pretty");
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-pm-muted">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-pm-orange border-t-transparent" />
          Sending request…
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-pm-muted">
        <div className="text-[13px]">
          Enter a URL and hit{" "}
          <span className="rounded bg-pm-orange px-2 py-0.5 text-white">Send</span>{" "}
          to get a response.
        </div>
      </div>
    );
  }

  if (response.error) {
    return (
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center gap-2 text-pm-red">
          <span className="h-2 w-2 rounded-full bg-pm-red" />
          <span className="font-semibold">Could not send request</span>
        </div>
        <div className="mono rounded border border-pm-red/40 bg-pm-red/10 p-3 text-[12.5px] text-pm-red">
          {response.error}
        </div>
      </div>
    );
  }

  const tests = testResults || [];
  const passed = tests.filter((t) => t.passed).length;
  const failed = tests.length - passed;
  const cookies = response.cookies || [];

  return (
    <div className="flex h-full flex-col">
      {/* Status bar */}
      <div className="flex items-center gap-4 border-b border-pm-border px-3 py-2 text-[12px]">
        <StatusBadge status={response.status} statusText={response.statusText} />
        <span className="text-pm-muted">
          Time: <span className="text-pm-green">{response.durationMs} ms</span>
        </span>
        <span className="text-pm-muted">
          Size:{" "}
          <span className="text-pm-green">{formatBytes(response.sizeBytes)}</span>
        </span>
        {tests.length > 0 && (
          <span className="text-pm-muted">
            Tests:{" "}
            <span className={failed ? "text-pm-red" : "text-pm-green"}>
              {passed}/{tests.length} passed
            </span>
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-pm-border px-3">
        <RTab active={tab === "body"} onClick={() => setTab("body")} label="Body" />
        <RTab
          active={tab === "cookies"}
          onClick={() => setTab("cookies")}
          label="Cookies"
          count={cookies.length}
        />
        <RTab
          active={tab === "headers"}
          onClick={() => setTab("headers")}
          label="Headers"
          count={response.headers.length}
        />
        <RTab
          active={tab === "tests"}
          onClick={() => setTab("tests")}
          label="Test Results"
          badge={
            tests.length ? (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                  failed
                    ? "bg-pm-red/20 text-pm-red"
                    : "bg-pm-green/20 text-pm-green"
                }`}
              >
                {passed}/{tests.length}
              </span>
            ) : null
          }
        />
        <RTab
          active={tab === "console"}
          onClick={() => setTab("console")}
          label="Console"
          count={logs?.length || 0}
        />

        {tab === "body" && (
          <div className="ml-auto flex items-center gap-1.5 py-1.5">
            <div className="flex overflow-hidden rounded border border-pm-border2">
              {(["pretty", "raw", "preview"] as BodyMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setBodyMode(m)}
                  className={`px-2 py-1 text-[11px] capitalize ${
                    bodyMode === m
                      ? "bg-pm-bg3 text-pm-orange"
                      : "text-pm-muted hover:text-pm-text"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(response.body);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="flex items-center gap-1 rounded border border-pm-border2 px-2 py-1 text-[11px] text-pm-muted hover:text-pm-text"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        )}
      </div>

      {/* search bar for body */}
      {tab === "body" && bodyMode !== "preview" && (
        <div className="flex items-center gap-2 border-b border-pm-border px-3 py-1.5">
          <Search size={13} className="text-pm-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in response…"
            className="mono flex-1 bg-transparent text-[12px] text-pm-text placeholder:text-pm-muted/50"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === "body" && (
          <BodyView
            body={response.body}
            contentType={response.contentType}
            mode={bodyMode}
            search={search}
          />
        )}
        {tab === "cookies" && <CookiesView cookies={cookies} />}
        {tab === "headers" && <HeadersView headers={response.headers} />}
        {tab === "tests" && <TestsView tests={tests} />}
        {tab === "console" && <ConsoleView logs={logs || []} />}
      </div>
    </div>
  );
}

function BodyView({
  body,
  contentType,
  mode,
  search,
}: {
  body: string;
  contentType: string;
  mode: BodyMode;
  search: string;
}) {
  const isJson = /json/i.test(contentType) || /^\s*[[{]/.test(body);
  const isHtml = /html/i.test(contentType);

  const parsed = useMemo(() => {
    if (isJson) {
      try {
        return JSON.parse(body);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, [body, isJson]);

  if (!body) {
    return (
      <div className="p-4 text-[12.5px] text-pm-muted">(empty response body)</div>
    );
  }

  if (mode === "preview") {
    if (isHtml) {
      return (
        <iframe
          sandbox=""
          srcDoc={body}
          className="h-full w-full bg-white"
          title="preview"
        />
      );
    }
    if (isJson && parsed !== undefined) {
      return <JsonTree data={parsed} />;
    }
    return <RawView body={body} search={search} />;
  }

  if (mode === "pretty") {
    if (isJson && parsed !== undefined) {
      return <JsonTree data={parsed} />;
    }
    const pretty = isJson ? tryPretty(body) : body;
    return <RawView body={pretty} search={search} />;
  }

  return <RawView body={body} search={search} />;
}

function RawView({ body, search }: { body: string; search: string }) {
  const lines = body.split("\n");
  const q = search.trim().toLowerCase();
  const { open: openMenu } = useContextMenu();
  const menu = (e: React.MouseEvent) =>
    openMenu(e, [
      {
        label: "Copy",
        icon: <Copy size={13} />,
        onClick: () => navigator.clipboard.writeText(body),
      },
      {
        label: "Save to file",
        icon: <Save size={13} />,
        onClick: () => {
          const blob = new Blob([body], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "response.txt";
          a.click();
          URL.revokeObjectURL(url);
        },
      },
    ]);
  return (
    <div className="mono flex text-[12.5px] leading-[1.5]" onContextMenu={menu}>
      <div className="select-none border-r border-pm-border bg-pm-bg2 px-2 py-3 text-right text-pm-muted/60">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre className="flex-1 overflow-x-auto whitespace-pre-wrap break-words px-3 py-3 text-pm-text">
        {q
          ? lines.map((ln, i) => (
              <div
                key={i}
                className={ln.toLowerCase().includes(q) ? "bg-pm-yellow/20" : ""}
              >
                {ln || " "}
              </div>
            ))
          : body}
      </pre>
    </div>
  );
}

function CookiesView({
  cookies,
}: {
  cookies: { name: string; value: string; domain?: string; path?: string }[];
}) {
  if (!cookies.length) {
    return (
      <div className="p-4 text-[12.5px] text-pm-muted">
        No cookies were set by this response.
      </div>
    );
  }
  return (
    <table className="w-full border-collapse text-[12.5px]">
      <thead>
        <tr className="text-left text-pm-muted">
          <th className="border-b border-pm-border px-3 py-1.5 font-normal">Name</th>
          <th className="border-b border-pm-border px-3 py-1.5 font-normal">Value</th>
          <th className="border-b border-pm-border px-3 py-1.5 font-normal">Domain</th>
        </tr>
      </thead>
      <tbody>
        {cookies.map((c, i) => (
          <tr key={i} className="border-b border-pm-border">
            <td className="mono px-3 py-1.5 text-pm-blue">{c.name}</td>
            <td className="mono break-all px-3 py-1.5 text-pm-text">{c.value}</td>
            <td className="mono px-3 py-1.5 text-pm-muted">{c.domain}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HeadersView({ headers }: { headers: { key: string; value: string }[] }) {
  return (
    <table className="w-full border-collapse text-[12.5px]">
      <tbody>
        {headers.map((h, i) => (
          <tr key={i} className="border-b border-pm-border">
            <td className="mono w-1/3 border-r border-pm-border px-3 py-1.5 text-pm-blue">
              {h.key}
            </td>
            <td className="mono break-all px-3 py-1.5 text-pm-text">{h.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TestsView({ tests }: { tests: TestResult[] }) {
  if (!tests.length) {
    return (
      <div className="p-4 text-[12.5px] text-pm-muted">
        No tests. Add assertions in the <b>Tests</b> tab using{" "}
        <code className="mono text-pm-orange">pm.test()</code>.
      </div>
    );
  }
  return (
    <div className="p-2">
      {tests.map((t, i) => (
        <div
          key={i}
          className={`mb-1 flex items-start gap-2 rounded border px-3 py-2 text-[12.5px] ${
            t.passed
              ? "border-pm-green/30 bg-pm-green/5"
              : "border-pm-red/30 bg-pm-red/5"
          }`}
        >
          <span
            className={`mt-0.5 shrink-0 rounded px-1.5 text-[10px] font-bold ${
              t.passed ? "bg-pm-green/20 text-pm-green" : "bg-pm-red/20 text-pm-red"
            }`}
          >
            {t.passed ? "PASS" : "FAIL"}
          </span>
          <div className="min-w-0">
            <div className="text-pm-text">{t.name}</div>
            {t.error && (
              <div className="mono mt-0.5 text-[11.5px] text-pm-red">{t.error}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsoleView({ logs }: { logs: string[] }) {
  if (!logs.length) {
    return (
      <div className="p-4 text-[12.5px] text-pm-muted">
        Console output from <code className="mono text-pm-orange">console.log()</code>{" "}
        in your scripts appears here.
      </div>
    );
  }
  return (
    <div className="mono p-2 text-[12px] leading-relaxed">
      {logs.map((l, i) => (
        <div
          key={i}
          className={`border-b border-pm-border/50 px-2 py-1 ${
            l.includes("✖") ? "text-pm-red" : "text-pm-text"
          }`}
        >
          {l}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({
  status,
  statusText,
}: {
  status: number;
  statusText: string;
}) {
  let color = "text-pm-green";
  if (status >= 400) color = "text-pm-red";
  else if (status >= 300) color = "text-pm-yellow";
  else if (status >= 200) color = "text-pm-green";
  else color = "text-pm-muted";
  return (
    <span className="text-pm-muted">
      Status:{" "}
      <span className={`font-semibold ${color}`}>
        {status} {statusText}
      </span>
    </span>
  );
}

function RTab({
  active,
  onClick,
  label,
  count,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-[12.5px] transition ${
        active
          ? "border-pm-orange text-pm-text"
          : "border-transparent text-pm-muted hover:text-pm-text"
      }`}
    >
      {label}
      {count != null && count > 0 && (
        <span className="ml-1.5 rounded-full bg-pm-bg3 px-1.5 py-0.5 text-[10px] text-pm-green">
          {count}
        </span>
      )}
      {badge}
    </button>
  );
}

function tryPretty(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
