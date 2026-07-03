"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { useStore } from "@/store/useStore";
import { MembersData } from "@/lib/types";
import { UserPlus, Trash2, Crown, LogOut, Mail } from "lucide-react";

export default function MembersModal({
  workspaceId,
  workspaceName,
  onClose,
}: {
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
}) {
  const user = useStore((s) => s.user);
  const loadMembers = useStore((s) => s.loadMembers);
  const inviteMember = useStore((s) => s.inviteMember);
  const removeMember = useStore((s) => s.removeMember);
  const cancelInvite = useStore((s) => s.cancelInvite);
  const leaveWorkspace = useStore((s) => s.leaveWorkspace);

  const [data, setData] = useState<MembersData | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = async () => setData(await loadMembers(workspaceId));

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const invite = async () => {
    if (!identifier.trim()) return;
    setBusy(true);
    const r = await inviteMember(workspaceId, identifier.trim());
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) setIdentifier("");
    setBusy(false);
    await refresh();
  };

  const isOwner = data?.isOwner;

  return (
    <Modal title={`สมาชิกทีม — ${workspaceName}`} onClose={onClose} width="max-w-xl">
      <div className="p-4">
        {isOwner && (
          <div className="mb-4">
            <div className="mb-1.5 text-[11px] uppercase tracking-wide text-pm-muted">
              เชิญสมาชิก
            </div>
            <div className="flex gap-2">
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && invite()}
                placeholder="username หรือ email"
                className="mono flex-1 rounded border border-pm-border2 bg-pm-bg3 px-3 py-2 text-[12.5px] text-pm-text placeholder:text-pm-muted/60"
              />
              <button
                onClick={invite}
                disabled={busy}
                className="flex items-center gap-1.5 rounded bg-pm-orange px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-pm-orange-dim disabled:opacity-60"
              >
                <UserPlus size={14} /> เชิญ
              </button>
            </div>
            {msg && (
              <div
                className={`mt-2 rounded border px-3 py-1.5 text-[12px] ${
                  msg.ok
                    ? "border-pm-green/40 bg-pm-green/10 text-pm-green"
                    : "border-pm-red/40 bg-pm-red/10 text-pm-red"
                }`}
              >
                {msg.text}
              </div>
            )}
            <div className="mt-1.5 text-[11px] text-pm-muted">
              เชิญด้วย email คนที่ยังไม่สมัครได้ — จะเข้าทีมอัตโนมัติเมื่อสมัคร
            </div>
          </div>
        )}

        <div className="mb-1.5 text-[11px] uppercase tracking-wide text-pm-muted">
          สมาชิก ({data?.members.length ?? 0})
        </div>
        <div className="space-y-1">
          {data?.members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center gap-2 rounded border border-pm-border bg-pm-bg3 px-3 py-2"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pm-bg2 text-[12px] font-semibold ring-1 ring-pm-border2">
                {(m.name || m.username).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[12.5px] text-pm-text">
                  {m.name || m.username}
                  {m.role === "owner" && (
                    <Crown size={12} className="text-pm-yellow" />
                  )}
                  {m.userId === user?.id && (
                    <span className="text-[10px] text-pm-muted">(คุณ)</span>
                  )}
                </div>
                <div className="truncate text-[11px] text-pm-muted">{m.email}</div>
              </div>
              {isOwner && m.role !== "owner" && (
                <button
                  onClick={() => removeMember(workspaceId, m.userId).then(refresh)}
                  title="นำออกจากทีม"
                  className="text-pm-muted hover:text-pm-red"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {data && data.invitations.length > 0 && (
          <>
            <div className="mb-1.5 mt-4 text-[11px] uppercase tracking-wide text-pm-muted">
              คำเชิญค้างอยู่ ({data.invitations.length})
            </div>
            <div className="space-y-1">
              {data.invitations.map((i) => (
                <div
                  key={i.email}
                  className="flex items-center gap-2 rounded border border-dashed border-pm-border2 px-3 py-1.5"
                >
                  <Mail size={13} className="text-pm-muted" />
                  <span className="flex-1 text-[12.5px] text-pm-muted">{i.email}</span>
                  <span className="text-[10px] text-pm-yellow">pending</span>
                  {isOwner && (
                    <button
                      onClick={() => cancelInvite(workspaceId, i.email).then(refresh)}
                      className="text-pm-muted hover:text-pm-red"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {!isOwner && (
          <button
            onClick={() => {
              if (confirm(`ออกจากทีม "${workspaceName}"?`)) {
                leaveWorkspace(workspaceId);
                onClose();
              }
            }}
            className="mt-4 flex items-center gap-1.5 rounded border border-pm-red/40 px-3 py-1.5 text-[12.5px] text-pm-red hover:bg-pm-red/10"
          >
            <LogOut size={14} /> ออกจากทีมนี้
          </button>
        )}
      </div>
    </Modal>
  );
}
