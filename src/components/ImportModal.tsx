"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useStore } from "@/store/useStore";
import { Upload, FileJson, TerminalSquare } from "lucide-react";

export default function ImportModal({ onClose }: { onClose: () => void }) {
  const importPostmanJson = useStore((s) => s.importPostmanJson);
  const importCurlText = useStore((s) => s.importCurlText);
  const [mode, setMode] = useState<"postman" | "curl">("postman");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    const content = await file.text();
    setText(content);
  };

  const doImport = async () => {
    setError("");
    if (mode === "postman") {
      try {
        const json = JSON.parse(text);
        setBusy(true);
        await importPostmanJson(json);
        setBusy(false);
        onClose();
      } catch (e) {
        setError("Invalid Postman collection JSON: " + (e instanceof Error ? e.message : e));
      }
    } else {
      if (!text.trim().toLowerCase().includes("curl")) {
        setError("That doesn't look like a cURL command.");
        return;
      }
      importCurlText(text);
      onClose();
    }
  };

  return (
    <Modal title="Import" onClose={onClose} width="max-w-2xl">
      <div className="p-4">
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setMode("postman")}
            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[12.5px] ${
              mode === "postman"
                ? "border-pm-orange bg-pm-bg3 text-pm-text"
                : "border-pm-border2 text-pm-muted"
            }`}
          >
            <FileJson size={14} /> Postman Collection
          </button>
          <button
            onClick={() => setMode("curl")}
            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[12.5px] ${
              mode === "curl"
                ? "border-pm-orange bg-pm-bg3 text-pm-text"
                : "border-pm-border2 text-pm-muted"
            }`}
          >
            <TerminalSquare size={14} /> cURL
          </button>
        </div>

        {mode === "postman" && (
          <label className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-pm-border2 py-4 text-[12.5px] text-pm-muted hover:border-pm-orange hover:text-pm-text">
            <Upload size={15} />
            Choose a .json file or paste below
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          placeholder={
            mode === "postman"
              ? "Paste Postman collection JSON here…"
              : "curl 'https://api.example.com/users' -H 'Authorization: Bearer xxx'"
          }
          className="mono h-56 w-full rounded border border-pm-border bg-pm-bg3 p-3 text-[12px] text-pm-text placeholder:text-pm-muted/50"
        />

        {error && (
          <div className="mt-2 rounded border border-pm-red/40 bg-pm-red/10 px-3 py-2 text-[12px] text-pm-red">
            {error}
          </div>
        )}

        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-pm-border2 px-4 py-1.5 text-[12.5px] text-pm-muted hover:text-pm-text"
          >
            Cancel
          </button>
          <button
            onClick={doImport}
            disabled={busy || !text.trim()}
            className="rounded bg-pm-orange px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-pm-orange-dim disabled:opacity-50"
          >
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
