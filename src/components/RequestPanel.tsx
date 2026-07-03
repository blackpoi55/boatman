"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { HTTP_METHODS, RequestData, BodyType, AuthType } from "@/lib/types";
import KeyValueEditor from "./KeyValueEditor";
import CodeArea from "./CodeArea";
import CodeSnippetModal from "./CodeSnippetModal";
import { Send, Save, ChevronDown, Code2 } from "lucide-react";

type SubTab =
  | "params"
  | "auth"
  | "headers"
  | "body"
  | "prescript"
  | "tests"
  | "docs";

export default function RequestPanel({ tab }: { tab: RequestData }) {
  const patchTab = useStore((s) => s.patchTab);
  const setUrl = useStore((s) => s.setUrl);
  const setParams = useStore((s) => s.setParams);
  const sendRequest = useStore((s) => s.sendRequest);
  const saveActiveRequest = useStore((s) => s.saveActiveRequest);
  const loading = useStore((s) => s.loading[tab.id]);
  const collections = useStore((s) => s.collections);

  const [subTab, setSubTab] = useState<SubTab>("params");
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const paramCount = tab.params.filter((p) => p.enabled && p.key).length;
  const headerCount = tab.headers.filter((h) => h.enabled && h.key).length;
  const hasBody = tab.body.type !== "none";
  const hasPre = !!tab.preRequestScript?.trim();
  const hasTests = !!tab.testScript?.trim();

  const onSend = () => {
    if (!loading) sendRequest(tab.id);
  };

  return (
    <div className="flex h-full flex-col">
      {/* URL bar */}
      <div className="flex items-center gap-2 border-b border-pm-border px-3 py-2.5">
        <div className="flex flex-1 items-stretch rounded border border-pm-border2 bg-pm-bg3">
          <div className="relative">
            <select
              value={tab.method}
              onChange={(e) => patchTab(tab.id, { method: e.target.value as any })}
              className={`m-${tab.method} mono h-full cursor-pointer appearance-none bg-transparent py-2 pl-3 pr-7 text-[12.5px] font-bold`}
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m} className="bg-pm-bg3 text-pm-text">
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-pm-muted"
            />
          </div>
          <div className="w-px bg-pm-border2" />
          <input
            value={tab.url}
            onChange={(e) => setUrl(tab.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
            placeholder="Enter request URL — e.g. https://api.example.com/users"
            className="mono flex-1 bg-transparent px-3 py-2 text-[12.5px] text-pm-text placeholder:text-pm-muted/60"
          />
        </div>

        <button
          onClick={onSend}
          disabled={loading}
          className="flex items-center gap-1.5 rounded bg-pm-orange px-5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-pm-orange-dim disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send"}
          {!loading && <Send size={13} />}
        </button>

        <button
          onClick={() => setShowCode(true)}
          title="Generate code snippet"
          className="flex items-center gap-1.5 rounded border border-pm-border2 bg-pm-bg3 px-3 py-2 text-[12.5px] text-pm-text transition hover:bg-pm-bg2"
        >
          <Code2 size={14} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowSaveMenu((v) => !v)}
            className="flex items-center gap-1.5 rounded border border-pm-border2 bg-pm-bg3 px-3 py-2 text-[12.5px] text-pm-text transition hover:bg-pm-bg2"
          >
            <Save size={13} />
            Save
            {tab.dirty && <span className="h-1.5 w-1.5 rounded-full bg-pm-orange" />}
          </button>
          {showSaveMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSaveMenu(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-56 rounded border border-pm-border2 bg-pm-bg2 py-1 shadow-lg">
                <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-pm-muted">
                  Save to collection
                </div>
                <button
                  onClick={() => {
                    saveActiveRequest();
                    setShowSaveMenu(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-pm-bg3"
                >
                  Save (update / default)
                </button>
                {collections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      saveActiveRequest(c.id);
                      setShowSaveMenu(false);
                    }}
                    className="block w-full truncate px-3 py-1.5 text-left text-[12.5px] hover:bg-pm-bg3"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex items-center gap-1 border-b border-pm-border px-3">
        <SubTabButton
          active={subTab === "params"}
          onClick={() => setSubTab("params")}
          label="Params"
          count={paramCount}
        />
        <SubTabButton
          active={subTab === "auth"}
          onClick={() => setSubTab("auth")}
          label="Authorization"
          dot={tab.auth.type !== "none"}
        />
        <SubTabButton
          active={subTab === "headers"}
          onClick={() => setSubTab("headers")}
          label="Headers"
          count={headerCount}
        />
        <SubTabButton
          active={subTab === "body"}
          onClick={() => setSubTab("body")}
          label="Body"
          dot={hasBody}
        />
        <SubTabButton
          active={subTab === "prescript"}
          onClick={() => setSubTab("prescript")}
          label="Pre-request"
          dot={hasPre}
        />
        <SubTabButton
          active={subTab === "tests"}
          onClick={() => setSubTab("tests")}
          label="Tests"
          dot={hasTests}
        />
        <SubTabButton
          active={subTab === "docs"}
          onClick={() => setSubTab("docs")}
          label="Docs"
        />
      </div>

      {/* Sub tab content */}
      <div className="flex-1 overflow-auto p-3">
        {subTab === "params" && (
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-wide text-pm-muted">
              Query Params
            </div>
            <KeyValueEditor
              items={tab.params}
              onChange={(items) => setParams(tab.id, items)}
            />
          </div>
        )}

        {subTab === "headers" && (
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-wide text-pm-muted">
              Headers
            </div>
            <KeyValueEditor
              items={tab.headers}
              onChange={(items) => patchTab(tab.id, { headers: items })}
              keyPlaceholder="Header"
            />
          </div>
        )}

        {subTab === "auth" && <AuthEditor tab={tab} />}

        {subTab === "body" && <BodyEditor tab={tab} />}

        {subTab === "prescript" && (
          <div className="flex h-full flex-col">
            <div className="mb-2 text-[12px] text-pm-muted">
              Runs <b>before</b> the request. Use{" "}
              <code className="mono text-pm-orange">pm.environment.set()</code>,{" "}
              <code className="mono text-pm-orange">pm.variables.get()</code>,{" "}
              <code className="mono text-pm-orange">pm.request.headers.add()</code>.
            </div>
            <CodeArea
              value={tab.preRequestScript || ""}
              onChange={(v) => patchTab(tab.id, { preRequestScript: v })}
              placeholder={`// e.g.\npm.environment.set("ts", Date.now());\nconsole.log("running as", pm.variables.get("user"));`}
            />
          </div>
        )}

        {subTab === "tests" && (
          <div className="flex h-full flex-col">
            <div className="mb-2 text-[12px] text-pm-muted">
              Runs <b>after</b> the response. Use{" "}
              <code className="mono text-pm-orange">pm.test()</code> and{" "}
              <code className="mono text-pm-orange">pm.expect()</code>. Results
              show in the response panel.
            </div>
            <CodeArea
              value={tab.testScript || ""}
              onChange={(v) => patchTab(tab.id, { testScript: v })}
              placeholder={`pm.test("status is 200", () => {\n  pm.response.to.have.status(200);\n});\n\npm.test("has id", () => {\n  const body = pm.response.json();\n  pm.expect(body).to.have.property("id");\n});`}
            />
          </div>
        )}

        {subTab === "docs" && (
          <div className="flex h-full flex-col">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-pm-muted">
              Description
            </div>
            <textarea
              value={tab.description || ""}
              onChange={(e) => patchTab(tab.id, { description: e.target.value })}
              placeholder="Describe what this request does…"
              className="min-h-[200px] flex-1 rounded border border-pm-border bg-pm-bg3 p-3 text-[12.5px] leading-relaxed text-pm-text placeholder:text-pm-muted/50"
            />
          </div>
        )}
      </div>

      {showCode && (
        <CodeSnippetModal tab={tab} onClose={() => setShowCode(false)} />
      )}
    </div>
  );
}

function SubTabButton({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  dot?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative border-b-2 px-3 py-2.5 text-[12.5px] transition ${
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
      {dot && (
        <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-pm-green align-middle" />
      )}
    </button>
  );
}

function AuthEditor({ tab }: { tab: RequestData }) {
  const patchTab = useStore((s) => s.patchTab);
  const auth = tab.auth;
  const setAuth = (patch: Partial<typeof auth>) =>
    patchTab(tab.id, { auth: { ...auth, ...patch } });

  const fieldClass =
    "mono w-full max-w-md rounded border border-pm-border2 bg-pm-bg3 px-2.5 py-1.5 text-[12.5px] text-pm-text";
  const labelClass = "mb-1 block text-[12px] text-pm-muted";

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <label className={labelClass}>Auth Type</label>
        <select
          value={auth.type}
          onChange={(e) => setAuth({ type: e.target.value as AuthType })}
          className="rounded border border-pm-border2 bg-pm-bg3 px-2.5 py-1.5 text-[12.5px] text-pm-text"
        >
          <option value="none">No Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apikey">API Key</option>
        </select>
      </div>

      {auth.type === "bearer" && (
        <div>
          <label className={labelClass}>Token</label>
          <input
            value={auth.token || ""}
            onChange={(e) => setAuth({ token: e.target.value })}
            placeholder="Token"
            className={fieldClass}
          />
        </div>
      )}

      {auth.type === "basic" && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Username</label>
            <input
              value={auth.username || ""}
              onChange={(e) => setAuth({ username: e.target.value })}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input
              value={auth.password || ""}
              onChange={(e) => setAuth({ password: e.target.value })}
              className={fieldClass}
            />
          </div>
        </div>
      )}

      {auth.type === "apikey" && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Key</label>
            <input
              value={auth.key || ""}
              onChange={(e) => setAuth({ key: e.target.value })}
              placeholder="e.g. X-API-Key"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Value</label>
            <input
              value={auth.apiValue || ""}
              onChange={(e) => setAuth({ apiValue: e.target.value })}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Add to</label>
            <select
              value={auth.addTo || "header"}
              onChange={(e) =>
                setAuth({ addTo: e.target.value as "header" | "query" })
              }
              className="rounded border border-pm-border2 bg-pm-bg3 px-2.5 py-1.5 text-[12.5px] text-pm-text"
            >
              <option value="header">Header</option>
              <option value="query">Query Params</option>
            </select>
          </div>
        </div>
      )}

      {auth.type === "none" && (
        <div className="text-[12.5px] text-pm-muted">
          This request does not use any authorization.
        </div>
      )}
    </div>
  );
}

function BodyEditor({ tab }: { tab: RequestData }) {
  const patchTab = useStore((s) => s.patchTab);
  const body = tab.body;

  const setType = (type: BodyType) =>
    patchTab(tab.id, { body: { ...body, type } });
  const setRaw = (raw: string) =>
    patchTab(tab.id, { body: { ...body, raw } });

  const beautify = () => {
    try {
      const parsed = JSON.parse(body.raw);
      setRaw(JSON.stringify(parsed, null, 2));
    } catch {
      /* ignore */
    }
  };

  const types: { value: BodyType; label: string }[] = [
    { value: "none", label: "none" },
    { value: "json", label: "JSON" },
    { value: "text", label: "Text" },
    { value: "xml", label: "XML" },
    { value: "form-data", label: "form-data" },
    { value: "urlencoded", label: "x-www-form-urlencoded" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {types.map((t) => (
          <label
            key={t.value}
            className="flex cursor-pointer items-center gap-1.5 text-[12.5px]"
          >
            <input
              type="radio"
              name={`body-${tab.id}`}
              checked={body.type === t.value}
              onChange={() => setType(t.value)}
              className="accent-pm-orange"
            />
            <span
              className={
                body.type === t.value ? "text-pm-text" : "text-pm-muted"
              }
            >
              {t.label}
            </span>
          </label>
        ))}
        {body.type === "json" && (
          <button
            onClick={beautify}
            className="ml-auto rounded border border-pm-border2 px-2 py-1 text-[11px] text-pm-blue hover:bg-pm-bg3"
          >
            Beautify
          </button>
        )}
      </div>

      {body.type === "none" && (
        <div className="text-[12.5px] text-pm-muted">
          This request does not have a body.
        </div>
      )}

      {(body.type === "json" || body.type === "text" || body.type === "xml") && (
        <textarea
          value={body.raw}
          onChange={(e) => setRaw(e.target.value)}
          spellCheck={false}
          placeholder={
            body.type === "json"
              ? '{\n  "key": "value"\n}'
              : "Enter raw body…"
          }
          className="mono min-h-[240px] flex-1 rounded border border-pm-border bg-pm-bg3 p-3 text-[12.5px] leading-relaxed text-pm-text placeholder:text-pm-muted/50"
        />
      )}

      {(body.type === "form-data" || body.type === "urlencoded") && (
        <KeyValueEditor
          items={body.formData}
          onChange={(items) =>
            patchTab(tab.id, { body: { ...body, formData: items } })
          }
        />
      )}
    </div>
  );
}
