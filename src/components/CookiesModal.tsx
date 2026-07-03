"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { useStore } from "@/store/useStore";
import { Trash2, Plus } from "lucide-react";

export default function CookiesModal({ onClose }: { onClose: () => void }) {
  const cookies = useStore((s) => s.cookies);
  const loadCookies = useStore((s) => s.loadCookies);
  const deleteCookie = useStore((s) => s.deleteCookie);
  const clearCookies = useStore((s) => s.clearCookies);
  const addCookie = useStore((s) => s.addCookie);
  const useCookieJar = useStore((s) => s.useCookieJar);
  const toggleCookieJar = useStore((s) => s.toggleCookieJar);

  const [showAdd, setShowAdd] = useState(false);
  const [nc, setNc] = useState({ domain: "", name: "", value: "", path: "/" });

  useEffect(() => {
    loadCookies();
  }, [loadCookies]);

  const domains = Array.from(new Set(cookies.map((c) => c.domain))).sort();

  return (
    <Modal title="Cookie Jar" onClose={onClose} width="max-w-3xl">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-[12.5px] text-pm-muted">
            <input
              type="checkbox"
              checked={useCookieJar}
              onChange={toggleCookieJar}
              className="accent-pm-orange"
            />
            Automatically send &amp; capture cookies
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="flex items-center gap-1 rounded border border-pm-border2 px-2.5 py-1 text-[12px] text-pm-muted hover:text-pm-text"
            >
              <Plus size={13} /> Add
            </button>
            {cookies.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Delete all cookies?")) clearCookies();
                }}
                className="rounded border border-pm-border2 px-2.5 py-1 text-[12px] text-pm-red hover:bg-pm-red/10"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {showAdd && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-pm-border bg-pm-bg3 p-2">
            <input
              placeholder="domain (api.example.com)"
              value={nc.domain}
              onChange={(e) => setNc({ ...nc, domain: e.target.value })}
              className="mono flex-1 rounded border border-pm-border2 bg-pm-bg px-2 py-1 text-[12px]"
            />
            <input
              placeholder="name"
              value={nc.name}
              onChange={(e) => setNc({ ...nc, name: e.target.value })}
              className="mono w-32 rounded border border-pm-border2 bg-pm-bg px-2 py-1 text-[12px]"
            />
            <input
              placeholder="value"
              value={nc.value}
              onChange={(e) => setNc({ ...nc, value: e.target.value })}
              className="mono w-40 rounded border border-pm-border2 bg-pm-bg px-2 py-1 text-[12px]"
            />
            <button
              onClick={() => {
                if (nc.domain && nc.name) {
                  addCookie(nc);
                  setNc({ domain: "", name: "", value: "", path: "/" });
                  setShowAdd(false);
                }
              }}
              className="rounded bg-pm-orange px-3 py-1 text-[12px] font-semibold text-white"
            >
              Save
            </button>
          </div>
        )}

        {cookies.length === 0 ? (
          <div className="py-8 text-center text-[12.5px] text-pm-muted">
            No cookies stored. Send a request that returns Set-Cookie and it will
            appear here.
          </div>
        ) : (
          domains.map((domain) => (
            <div key={domain} className="mb-3">
              <div className="mono mb-1 text-[12px] font-semibold text-pm-orange">
                {domain}
              </div>
              <table className="w-full border-collapse text-[12px]">
                <tbody>
                  {cookies
                    .filter((c) => c.domain === domain)
                    .map((c) => (
                      <tr key={c.id} className="group border-b border-pm-border">
                        <td className="mono px-2 py-1.5 text-pm-blue">{c.name}</td>
                        <td className="mono break-all px-2 py-1.5 text-pm-text">
                          {c.value}
                        </td>
                        <td className="px-2 py-1.5 text-pm-muted">{c.path}</td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            onClick={() => deleteCookie(c.id)}
                            className="text-pm-muted opacity-0 hover:text-pm-red group-hover:opacity-100"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
