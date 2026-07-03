"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ChevronRight, ChevronDown, Copy, Save, Maximize2, Minimize2 } from "lucide-react";
import { useContextMenu } from "./ContextMenu";

interface TreeCmd {
  v: number; // bump to trigger
  open: boolean;
}
const TreeCtx = createContext<TreeCmd>({ v: 0, open: false });

export default function JsonTree({ data }: { data: any }) {
  const [cmd, setCmd] = useState<TreeCmd>({ v: 0, open: false });
  const { open: openMenu } = useContextMenu();

  const menu = (e: React.MouseEvent) =>
    openMenu(e, [
      {
        label: "Expand All",
        icon: <Maximize2 size={13} />,
        onClick: () => setCmd((c) => ({ v: c.v + 1, open: true })),
      },
      {
        label: "Collapse All",
        icon: <Minimize2 size={13} />,
        onClick: () => setCmd((c) => ({ v: c.v + 1, open: false })),
      },
      { separator: true },
      {
        label: "Copy JSON",
        icon: <Copy size={13} />,
        onClick: () =>
          navigator.clipboard.writeText(JSON.stringify(data, null, 2)),
      },
      {
        label: "Save to file",
        icon: <Save size={13} />,
        onClick: () => {
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "response.json";
          a.click();
          URL.revokeObjectURL(url);
        },
      },
    ]);

  return (
    <TreeCtx.Provider value={cmd}>
      <div
        className="mono min-h-full px-3 py-2 text-[12.5px] leading-[1.6]"
        onContextMenu={menu}
      >
        <Node value={data} name={null} depth={0} defaultOpen />
      </div>
    </TreeCtx.Provider>
  );
}

function Node({
  value,
  name,
  depth,
  defaultOpen = false,
}: {
  value: any;
  name: string | null;
  depth: number;
  defaultOpen?: boolean;
}) {
  const cmd = useContext(TreeCtx);
  const [open, setOpen] = useState(defaultOpen || depth < 2);

  useEffect(() => {
    if (cmd.v > 0) setOpen(cmd.open);
  }, [cmd.v, cmd.open]);

  const isArray = Array.isArray(value);
  const isObject = value && typeof value === "object";

  const keyLabel =
    name !== null ? (
      <span className="text-pm-purple">
        {isArray || isObject ? name : `"${name}"`}
      </span>
    ) : null;

  if (!isObject) {
    return (
      <div style={{ paddingLeft: depth * 14 }}>
        {keyLabel}
        {name !== null && <span className="text-pm-muted">: </span>}
        <Primitive value={value} />
      </div>
    );
  }

  const entries: [string, any][] = isArray
    ? value.map((v: any, i: number) => [String(i), v] as [string, any])
    : Object.entries(value);
  const bracket = isArray ? ["[", "]"] : ["{", "}"];

  return (
    <div>
      <div
        style={{ paddingLeft: depth * 14 }}
        className="flex cursor-pointer items-center hover:bg-pm-bg3/40"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-pm-muted">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        {keyLabel}
        {name !== null && <span className="text-pm-muted">: </span>}
        <span className="text-pm-muted">
          {bracket[0]}
          {!open && (
            <span className="text-pm-muted/60">
              {" "}
              {entries.length} {entries.length === 1 ? "item" : "items"}{" "}
            </span>
          )}
          {!open && bracket[1]}
        </span>
      </div>
      {open && (
        <div>
          {entries.map(([k, v]: [string, any]) => (
            <Node key={k} name={k} value={v} depth={depth + 1} />
          ))}
          <div style={{ paddingLeft: depth * 14 }} className="text-pm-muted">
            {bracket[1]}
          </div>
        </div>
      )}
    </div>
  );
}

function Primitive({ value }: { value: any }) {
  if (value === null) return <span className="text-pm-red">null</span>;
  if (typeof value === "number")
    return <span className="text-pm-yellow">{value}</span>;
  if (typeof value === "boolean")
    return <span className="text-pm-blue">{String(value)}</span>;
  return <span className="text-pm-green">&quot;{String(value)}&quot;</span>;
}
