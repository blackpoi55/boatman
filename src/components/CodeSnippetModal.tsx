"use client";

import { useMemo, useState } from "react";
import Modal from "./Modal";
import { useStore } from "@/store/useStore";
import { RequestData } from "@/lib/types";
import { buildVarMap } from "@/lib/variables";
import { buildResolvedRequest } from "@/lib/resolve";
import { CODE_LANGS, CodeLang, generateCode } from "@/lib/codegen";
import { Copy, Check } from "lucide-react";

export default function CodeSnippetModal({
  tab,
  onClose,
}: {
  tab: RequestData;
  onClose: () => void;
}) {
  const activeEnv = useStore((s) => s.activeEnv());
  const globals = useStore((s) => s.globals);
  const [lang, setLang] = useState<CodeLang>("curl");
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    const map = buildVarMap(activeEnv, globals);
    const resolved = buildResolvedRequest(tab, map);
    return generateCode(resolved, lang);
  }, [tab, lang, activeEnv, globals]);

  return (
    <Modal title="Generate Code Snippet" onClose={onClose} width="max-w-3xl">
      <div className="flex">
        <div className="w-52 shrink-0 border-r border-pm-border py-2">
          {CODE_LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              className={`block w-full px-4 py-2 text-left text-[12.5px] transition ${
                lang === l.id
                  ? "bg-pm-bg3 text-pm-orange"
                  : "text-pm-muted hover:bg-pm-bg3 hover:text-pm-text"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-3">
          <div className="mb-2 flex justify-end">
            <button
              onClick={() => {
                navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="flex items-center gap-1.5 rounded border border-pm-border2 px-2.5 py-1 text-[11.5px] text-pm-muted hover:text-pm-text"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mono max-h-[52vh] overflow-auto rounded border border-pm-border bg-pm-bg3 p-3 text-[12.5px] leading-relaxed text-pm-text">
            {code}
          </pre>
        </div>
      </div>
    </Modal>
  );
}
