"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store/useStore";
import Sidebar from "@/components/Sidebar";
import RequestPanel from "@/components/RequestPanel";
import ResponsePanel from "@/components/ResponsePanel";
import ImportModal from "@/components/ImportModal";
import CookiesModal from "@/components/CookiesModal";
import MembersModal from "@/components/MembersModal";
import AuthGate from "@/components/AuthGate";
import { ContextMenuProvider, useContextMenu } from "@/components/ContextMenu";
import {
  X,
  Plus,
  Globe,
  ChevronDown,
  Upload,
  Cookie,
  Copy,
  XCircle,
  Users,
  User as UserIcon,
  LogOut,
  Check,
} from "lucide-react";

export default function Home() {
  const checkAuth = useStore((s) => s.checkAuth);
  const authReady = useStore((s) => s.authReady);
  const user = useStore((s) => s.user);
  const ready = useStore((s) => s.ready);
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId) || null;
  const responses = useStore((s) => s.responses);
  const loading = useStore((s) => s.loading);
  const testResults = useStore((s) => s.testResults);
  const scriptLogs = useStore((s) => s.scriptLogs);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-pm-bg text-pm-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-pm-orange border-t-transparent" />
      </div>
    );
  }

  if (!user) return <AuthGate />;

  return (
    <ContextMenuProvider>
    <div className="flex h-screen flex-col bg-pm-bg text-pm-text">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TabBar />
          {activeTab ? (
            <SplitPane
              key={activeTab.id}
              top={<RequestPanel tab={activeTab} />}
              bottom={
                <ResponsePanel
                  response={responses[activeTab.id]}
                  loading={!!loading[activeTab.id]}
                  testResults={testResults[activeTab.id]}
                  logs={scriptLogs[activeTab.id]}
                />
              }
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-pm-muted">
              {ready ? "Open a request to begin." : "Loading…"}
            </div>
          )}
        </div>
      </div>
    </div>
    </ContextMenuProvider>
  );
}

function Header() {
  const environments = useStore((s) => s.environments);
  const activate = useStore((s) => s.activateEnvironment);
  const activeEnvId = useStore((s) => s.activeEnvId);
  const active = environments.find((e) => e.id === activeEnvId) || null;
  const cookieCount = useStore((s) => s.cookies.length);
  const [open, setOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCookies, setShowCookies] = useState(false);

  return (
    <header className="flex h-11 items-center justify-between border-b border-pm-border bg-pm-bg2 px-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-pm-orange text-[13px] font-black text-white">
            B
          </div>
          <span className="text-[14px] font-semibold">Boatman</span>
        </div>
        <WorkspaceSwitcher />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 rounded border border-pm-border2 bg-pm-bg3 px-3 py-1.5 text-[12.5px] text-pm-text hover:bg-pm-bg"
        >
          <Upload size={14} /> Import
        </button>
        <button
          onClick={() => setShowCookies(true)}
          className="flex items-center gap-1.5 rounded border border-pm-border2 bg-pm-bg3 px-3 py-1.5 text-[12.5px] text-pm-text hover:bg-pm-bg"
        >
          <Cookie size={14} /> Cookies
          {cookieCount > 0 && (
            <span className="rounded-full bg-pm-orange/20 px-1.5 text-[10px] text-pm-orange">
              {cookieCount}
            </span>
          )}
        </button>

      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded border border-pm-border2 bg-pm-bg3 px-3 py-1.5 text-[12.5px] hover:bg-pm-bg"
        >
          <Globe size={14} className={active ? "text-pm-green" : "text-pm-muted"} />
          <span className={active ? "text-pm-text" : "text-pm-muted"}>
            {active ? active.name : "No Environment"}
          </span>
          <ChevronDown size={13} className="text-pm-muted" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-1 w-56 rounded border border-pm-border2 bg-pm-bg2 py-1 shadow-lg">
              <button
                onClick={() => {
                  activate(null);
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-pm-bg3"
              >
                No Environment
              </button>
              {environments.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    activate(e.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-pm-bg3"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      activeEnvId === e.id ? "bg-pm-green" : "bg-pm-border2"
                    }`}
                  />
                  {e.name}
                </button>
              ))}
              {environments.length === 0 && (
                <div className="px-3 py-1.5 text-[11.5px] text-pm-muted">
                  No environments yet
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <UserMenu />
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showCookies && <CookiesModal onClose={() => setShowCookies(false)} />}
    </header>
  );
}

function WorkspaceSwitcher() {
  const workspaces = useStore((s) => s.workspaces);
  const currentId = useStore((s) => s.currentWorkspaceId);
  const setCurrent = useStore((s) => s.setCurrentWorkspace);
  const createWorkspace = useStore((s) => s.createWorkspace);
  const renameWorkspace = useStore((s) => s.renameWorkspace);
  const deleteWorkspace = useStore((s) => s.deleteWorkspace);
  const current = workspaces.find((w) => w.id === currentId) || null;
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string } | null>(null);
  const { open: openMenu } = useContextMenu();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded border border-pm-border2 bg-pm-bg3 px-2.5 py-1 text-[12.5px] hover:bg-pm-bg"
      >
        {current?.type === "personal" ? (
          <UserIcon size={13} className="text-pm-blue" />
        ) : (
          <Users size={13} className="text-pm-purple" />
        )}
        <span className="max-w-[140px] truncate">{current?.name || "Workspace"}</span>
        <ChevronDown size={12} className="text-pm-muted" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-64 rounded border border-pm-border2 bg-pm-bg2 py-1 shadow-lg">
            <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-pm-muted">
              Workspaces
            </div>
            {workspaces.map((w) => (
              <div
                key={w.id}
                onClick={() => {
                  setCurrent(w.id);
                  setOpen(false);
                }}
                onContextMenu={(e) => {
                  if (w.type !== "team") return;
                  openMenu(e, [
                    {
                      label: "Manage members",
                      icon: <Users size={13} />,
                      onClick: () => setMembers({ id: w.id, name: w.name }),
                    },
                    ...(w.isMine
                      ? [
                          {
                            label: "Rename",
                            onClick: () => {
                              const n = prompt("Rename workspace", w.name);
                              if (n?.trim()) renameWorkspace(w.id, n.trim());
                            },
                          },
                          { separator: true },
                          {
                            label: "Delete workspace",
                            danger: true,
                            onClick: () => {
                              if (confirm(`Delete "${w.name}" and all its collections?`))
                                deleteWorkspace(w.id);
                            },
                          },
                        ]
                      : []),
                  ]);
                }}
                className="group flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-pm-bg3"
              >
                {w.type === "personal" ? (
                  <UserIcon size={13} className="text-pm-blue" />
                ) : (
                  <Users size={13} className="text-pm-purple" />
                )}
                <span className="flex-1 truncate">{w.name}</span>
                {w.type === "team" && (
                  <span className="text-[10px] text-pm-muted">{w.memberCount}</span>
                )}
                {w.type === "team" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMembers({ id: w.id, name: w.name });
                      setOpen(false);
                    }}
                    title="Manage members"
                    className="opacity-0 hover:text-pm-orange group-hover:opacity-100"
                  >
                    <Users size={13} />
                  </button>
                )}
                {w.id === currentId && <Check size={13} className="text-pm-orange" />}
              </div>
            ))}
            <div className="my-1 h-px bg-pm-border" />
            <button
              onClick={() => {
                const name = prompt("Team workspace name");
                if (name?.trim()) createWorkspace(name.trim());
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-pm-muted hover:bg-pm-bg3 hover:text-pm-text"
            >
              <Plus size={13} /> New Team Workspace
            </button>
          </div>
        </>
      )}

      {members && (
        <MembersModal
          workspaceId={members.id}
          workspaceName={members.name}
          onClose={() => setMembers(null)}
        />
      )}
    </div>
  );
}

function UserMenu() {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const initial = (user.name || user.username || "?").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={user.name || user.username}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-pm-bg3 text-[12px] font-semibold text-pm-text ring-1 ring-pm-border2 hover:ring-pm-orange"
      >
        {initial}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-52 rounded border border-pm-border2 bg-pm-bg2 py-1 shadow-lg">
            <div className="border-b border-pm-border px-3 py-2">
              <div className="truncate text-[12.5px] text-pm-text">{user.name || user.username}</div>
              <div className="truncate text-[11px] text-pm-muted">{user.email}</div>
            </div>
            <button
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-pm-red hover:bg-pm-red/10"
            >
              <LogOut size={13} /> ออกจากระบบ
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TabBar() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const closeTab = useStore((s) => s.closeTab);
  const closeOtherTabs = useStore((s) => s.closeOtherTabs);
  const closeAllTabs = useStore((s) => s.closeAllTabs);
  const duplicateTab = useStore((s) => s.duplicateTab);
  const addTab = useStore((s) => s.addTab);
  const { open } = useContextMenu();

  return (
    <div className="flex items-center border-b border-pm-border bg-pm-bg2">
      <div className="flex flex-1 overflow-x-auto">
        {tabs.map((t) => (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            onContextMenu={(e) =>
              open(e, [
                {
                  label: "Duplicate Tab",
                  icon: <Copy size={13} />,
                  onClick: () => duplicateTab(t.id),
                },
                { separator: true },
                {
                  label: "Close",
                  icon: <X size={13} />,
                  onClick: () => closeTab(t.id),
                },
                {
                  label: "Close Others",
                  icon: <XCircle size={13} />,
                  disabled: tabs.length <= 1,
                  onClick: () => closeOtherTabs(t.id),
                },
                {
                  label: "Close All",
                  onClick: () => closeAllTabs(),
                },
              ])
            }
            className={`group flex min-w-[140px] max-w-[200px] cursor-pointer items-center gap-2 border-r border-pm-border px-3 py-2 ${
              activeTabId === t.id
                ? "bg-pm-bg text-pm-text"
                : "text-pm-muted hover:bg-pm-bg3"
            }`}
          >
            <span className={`m-${t.method} mono text-[10px] font-bold`}>
              {t.method.slice(0, 4)}
            </span>
            <span className="flex-1 truncate text-[12px]">
              {t.name}
              {t.dirty && (
                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-pm-orange align-middle" />
              )}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.id);
              }}
              className="text-pm-muted opacity-0 hover:text-pm-text group-hover:opacity-100"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => addTab()}
        title="New tab"
        className="px-3 py-2 text-pm-muted hover:text-pm-orange"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

// Vertical split with a draggable divider between request and response.
function SplitPane({
  top,
  bottom,
}: {
  top: React.ReactNode;
  bottom: React.ReactNode;
}) {
  const [topPct, setTopPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      setTopPct(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      <div style={{ height: `${topPct}%` }} className="min-h-0 overflow-hidden">
        {top}
      </div>
      <div
        onMouseDown={() => {
          dragging.current = true;
          document.body.style.cursor = "row-resize";
        }}
        className="h-1 shrink-0 cursor-row-resize bg-pm-border transition hover:bg-pm-orange"
      />
      <div className="min-h-0 flex-1 overflow-hidden">{bottom}</div>
    </div>
  );
}
