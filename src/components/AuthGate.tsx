"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";

export default function AuthGate() {
  const login = useStore((s) => s.login);
  const register = useStore((s) => s.register);
  const authError = useStore((s) => s.authError);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      await login(identifier, password);
    } else {
      await register({ username, email, password, name });
    }
    setBusy(false);
  };

  const field =
    "w-full rounded border border-pm-border2 bg-pm-bg3 px-3 py-2 text-[13px] text-pm-text placeholder:text-pm-muted/60 focus:border-pm-orange";

  return (
    <div className="flex h-screen items-center justify-center bg-pm-bg">
      <div className="w-full max-w-sm rounded-lg border border-pm-border2 bg-pm-bg2 p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-pm-orange text-[16px] font-black text-white">
            B
          </div>
          <div>
            <div className="text-[15px] font-semibold text-pm-text">Boatman</div>
            <div className="text-[11px] text-pm-muted">API Client</div>
          </div>
        </div>

        <div className="mb-4 flex rounded border border-pm-border2 p-0.5 text-[12.5px]">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 rounded py-1.5 ${
              mode === "login" ? "bg-pm-orange text-white" : "text-pm-muted"
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 rounded py-1.5 ${
              mode === "register" ? "bg-pm-orange text-white" : "text-pm-muted"
            }`}
          >
            สมัครสมาชิก
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "register" ? (
            <>
              <input
                className={field}
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
              <input
                className={field}
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className={field}
                placeholder="ชื่อที่แสดง (Display name)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className={field}
                placeholder="Password (อย่างน้อย 6 ตัว)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          ) : (
            <>
              <input
                className={field}
                placeholder="Username หรือ Email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
              />
              <input
                className={field}
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}

          {authError && (
            <div className="rounded border border-pm-red/40 bg-pm-red/10 px-3 py-2 text-[12px] text-pm-red">
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-pm-orange py-2 text-[13px] font-semibold text-white transition hover:bg-pm-orange-dim disabled:opacity-60"
          >
            {busy ? "กำลังดำเนินการ…" : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </form>
      </div>
    </div>
  );
}
