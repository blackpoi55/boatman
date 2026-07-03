"use client";

import { useRef } from "react";

/** Lightweight code editor: textarea with a gutter, tab-to-indent. */
export default function CodeArea({
  value,
  onChange,
  placeholder,
  minHeight = 220,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lines = (value || "").split("\n");

  return (
    <div
      className="flex overflow-hidden rounded border border-pm-border bg-pm-bg3"
      style={{ minHeight }}
    >
      <div className="mono select-none border-r border-pm-border bg-pm-bg2 px-2 py-2 text-right text-[12px] leading-[1.5] text-pm-muted/50">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        spellCheck={false}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const el = e.currentTarget;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const next = value.slice(0, start) + "  " + value.slice(end);
            onChange(next);
            requestAnimationFrame(() => {
              el.selectionStart = el.selectionEnd = start + 2;
            });
          }
        }}
        className="mono flex-1 bg-transparent px-3 py-2 text-[12.5px] leading-[1.5] text-pm-text placeholder:text-pm-muted/50"
        style={{ minHeight }}
      />
    </div>
  );
}
