"use client";

import { KV, uid } from "@/lib/types";
import { Trash2 } from "lucide-react";

interface Props {
  items: KV[];
  onChange: (items: KV[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: Props) {
  // Always keep a blank trailing row for quick entry.
  const rows = [...items];
  const last = rows[rows.length - 1];
  const showBlank = !last || last.key !== "" || last.value !== "";

  const update = (id: string, patch: Partial<KV>) => {
    let next = items.map((it) => (it.id === id ? { ...it, ...patch } : it));
    onChange(next);
  };

  const addRow = (patch: Partial<KV>) => {
    onChange([...items, { ...emptyRow(), ...patch }]);
  };

  const remove = (id: string) => {
    onChange(items.filter((it) => it.id !== id));
  };

  return (
    <div className="w-full">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="text-pm-muted text-left">
            <th className="w-8 border border-pm-border px-2 py-1.5 font-normal"></th>
            <th className="border border-pm-border px-2 py-1.5 font-normal">
              Key
            </th>
            <th className="border border-pm-border px-2 py-1.5 font-normal">
              Value
            </th>
            <th className="w-9 border border-pm-border px-2 py-1.5 font-normal"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="group">
              <td className="border border-pm-border px-2 py-1 text-center">
                <input
                  type="checkbox"
                  checked={it.enabled}
                  onChange={(e) => update(it.id, { enabled: e.target.checked })}
                  className="accent-pm-orange cursor-pointer"
                />
              </td>
              <td className="border border-pm-border p-0">
                <input
                  value={it.key}
                  placeholder={keyPlaceholder}
                  onChange={(e) => update(it.id, { key: e.target.value })}
                  className="mono w-full bg-transparent px-2 py-1.5 text-pm-text placeholder:text-pm-muted/60"
                />
              </td>
              <td className="border border-pm-border p-0">
                <input
                  value={it.value}
                  placeholder={valuePlaceholder}
                  onChange={(e) => update(it.id, { value: e.target.value })}
                  className="mono w-full bg-transparent px-2 py-1.5 text-pm-text placeholder:text-pm-muted/60"
                />
              </td>
              <td className="border border-pm-border px-2 py-1 text-center">
                <button
                  onClick={() => remove(it.id)}
                  className="text-pm-muted opacity-0 transition hover:text-pm-red group-hover:opacity-100"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
          {showBlank && (
            <tr>
              <td className="border border-pm-border px-2 py-1 text-center">
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="accent-pm-orange opacity-30"
                />
              </td>
              <td className="border border-pm-border p-0">
                <input
                  value=""
                  placeholder={keyPlaceholder}
                  onChange={(e) => addRow({ key: e.target.value })}
                  className="mono w-full bg-transparent px-2 py-1.5 text-pm-text placeholder:text-pm-muted/60"
                />
              </td>
              <td className="border border-pm-border p-0">
                <input
                  value=""
                  placeholder={valuePlaceholder}
                  onChange={(e) => addRow({ value: e.target.value })}
                  className="mono w-full bg-transparent px-2 py-1.5 text-pm-text placeholder:text-pm-muted/60"
                />
              </td>
              <td className="border border-pm-border"></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function emptyRow(): KV {
  return { id: uid(), key: "", value: "", enabled: true };
}
