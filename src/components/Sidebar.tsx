"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { CollectionData, RequestData } from "@/lib/types";
import {
  FolderPlus,
  Folder,
  ChevronRight,
  ChevronDown,
  Trash2,
  Plus,
  History as HistoryIcon,
  Layers,
  Globe,
  Download,
  Copy,
  Pencil,
  FolderOpen,
  CircleDot,
  Lock,
  Users,
  CornerUpRight,
} from "lucide-react";
import { useContextMenu, MenuItem } from "./ContextMenu";
import { Visibility } from "@/lib/types";

export default function Sidebar() {
  const view = useStore((s) => s.sidebarView);
  const setView = useStore((s) => s.setSidebarView);

  return (
    <div className="flex h-full">
      {/* Rail */}
      <div className="flex w-12 flex-col items-center gap-1 border-r border-pm-border bg-pm-bg2 py-3">
        <RailButton
          active={view === "collections"}
          onClick={() => setView("collections")}
          icon={<Layers size={18} />}
          title="Collections"
        />
        <RailButton
          active={view === "environments"}
          onClick={() => setView("environments")}
          icon={<Globe size={18} />}
          title="Environments"
        />
        <RailButton
          active={view === "history"}
          onClick={() => setView("history")}
          icon={<HistoryIcon size={18} />}
          title="History"
        />
      </div>

      {/* Panel */}
      <div className="flex w-64 flex-col bg-pm-bg2">
        {view === "collections" && <CollectionsView />}
        {view === "environments" && <EnvironmentsView />}
        {view === "history" && <HistoryView />}
      </div>
    </div>
  );
}

function RailButton({
  active,
  onClick,
  icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-9 w-9 items-center justify-center rounded transition ${
        active
          ? "bg-pm-bg3 text-pm-orange"
          : "text-pm-muted hover:bg-pm-bg3 hover:text-pm-text"
      }`}
    >
      {icon}
    </button>
  );
}

// ---------- Collections ----------

function CollectionsView() {
  const collections = useStore((s) => s.collections);
  const createCollection = useStore((s) => s.createCollection);

  return (
    <>
      <PanelHeader
        title="Collections"
        action={
          <button
            onClick={() => createCollection()}
            title="New Collection"
            className="text-pm-muted hover:text-pm-orange"
          >
            <FolderPlus size={16} />
          </button>
        }
      />
      <div className="flex-1 overflow-auto">
        {collections.length === 0 ? (
          <EmptyHint text="No collections yet. Click the + to create one, then Save a request into it." />
        ) : (
          collections.map((c) => <CollectionNode key={c.id} collection={c} />)
        )}
      </div>
    </>
  );
}

function CollectionNode({ collection }: { collection: CollectionData }) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(collection.name);
  const renameCollection = useStore((s) => s.renameCollection);
  const deleteCollection = useStore((s) => s.deleteCollection);
  const duplicateCollection = useStore((s) => s.duplicateCollection);
  const exportCollection = useStore((s) => s.exportCollection);
  const setCollectionVisibility = useStore((s) => s.setCollectionVisibility);
  const moveCollection = useStore((s) => s.moveCollection);
  const workspaces = useStore((s) => s.workspaces);
  const currentWorkspaceId = useStore((s) => s.currentWorkspaceId);
  const addTab = useStore((s) => s.addTab);
  const activeTabId = useStore((s) => s.activeTabId);
  const openSavedRequest = useStore((s) => s.openSavedRequest);
  const deleteSavedRequest = useStore((s) => s.deleteSavedRequest);
  const renameSavedRequest = useStore((s) => s.renameSavedRequest);
  const duplicateSavedRequest = useStore((s) => s.duplicateSavedRequest);
  const { open: openMenu } = useContextMenu();

  const moveItems = (onMove: (wsId: string) => void): MenuItem[] =>
    workspaces
      .filter((w) => w.id !== currentWorkspaceId)
      .map((w) => ({
        label: `Move to: ${w.name}`,
        icon: <CornerUpRight size={13} />,
        onClick: () => onMove(w.id),
      }));

  const addRequestToCollection = () =>
    addTab({
      ...emptyReq(),
      name: "New Request",
      collectionId: collection.id,
    });

  const collectionMenu = (e: React.MouseEvent) =>
    openMenu(e, [
      {
        label: "Add Request",
        icon: <Plus size={13} />,
        onClick: addRequestToCollection,
      },
      {
        label: "Rename",
        icon: <Pencil size={13} />,
        onClick: () => setEditing(true),
      },
      {
        label: "Duplicate",
        icon: <Copy size={13} />,
        onClick: () => duplicateCollection(collection.id),
      },
      {
        label: "Export (Postman JSON)",
        icon: <Download size={13} />,
        onClick: () => exportCollection(collection.id),
      },
      { separator: true },
      collection.visibility === "private"
        ? {
            label: "Make Shared (ทีมเห็น)",
            icon: <Users size={13} />,
            onClick: () => setCollectionVisibility(collection.id, "shared"),
          }
        : {
            label: "Make Private (เห็นคนเดียว)",
            icon: <Lock size={13} />,
            onClick: () => setCollectionVisibility(collection.id, "private"),
          },
      ...moveItems((wsId) => moveCollection(collection.id, wsId)),
      { separator: true },
      {
        label: "Delete",
        icon: <Trash2 size={13} />,
        danger: true,
        onClick: () => {
          if (confirm(`Delete collection "${collection.name}"?`))
            deleteCollection(collection.id);
        },
      },
    ]);

  const requestMenu = (e: React.MouseEvent, r: RequestData) =>
    openMenu(e, [
      {
        label: "Open",
        icon: <FolderOpen size={13} />,
        onClick: () => openSavedRequest(r),
      },
      {
        label: "Rename",
        icon: <Pencil size={13} />,
        onClick: () => {
          const name = prompt("Rename request", r.name);
          if (name) renameSavedRequest(r.id, name);
        },
      },
      {
        label: "Duplicate",
        icon: <Copy size={13} />,
        onClick: () => duplicateSavedRequest(r),
      },
      { separator: true },
      {
        label: "Delete",
        icon: <Trash2 size={13} />,
        danger: true,
        onClick: () => {
          if (confirm(`Delete request "${r.name}"?`)) deleteSavedRequest(r.id);
        },
      },
    ]);

  return (
    <div>
      <div
        className="group flex items-center gap-1 px-2 py-1.5 hover:bg-pm-bg3"
        onContextMenu={collectionMenu}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-pm-muted"
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <Folder size={14} className="text-pm-yellow" />
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (name.trim()) renameCollection(collection.id, name.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="flex-1 rounded bg-pm-bg px-1 text-[12.5px] text-pm-text"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className="flex-1 cursor-pointer truncate text-[12.5px] text-pm-text"
            title={collection.name}
          >
            {collection.name}
          </span>
        )}
        {collection.visibility === "private" && (
          <Lock size={11} className="shrink-0 text-pm-muted" />
        )}
        <span className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100">
          <button
            title="Add request"
            onClick={() =>
              addTab({
                ...emptyReq(),
                name: "New Request",
                collectionId: collection.id,
              })
            }
            className="text-pm-muted hover:text-pm-orange"
          >
            <Plus size={13} />
          </button>
          <button
            title="Export to Postman JSON"
            onClick={() => exportCollection(collection.id)}
            className="text-pm-muted hover:text-pm-blue"
          >
            <Download size={13} />
          </button>
          <button
            title="Delete collection"
            onClick={() => {
              if (confirm(`Delete collection "${collection.name}"?`))
                deleteCollection(collection.id);
            }}
            className="text-pm-muted hover:text-pm-red"
          >
            <Trash2 size={13} />
          </button>
        </span>
      </div>

      {open && (
        <div>
          {collection.requests.length === 0 ? (
            <div className="py-1 pl-9 text-[11.5px] text-pm-muted/70">
              Empty
            </div>
          ) : (
            collection.requests.map((r) => (
              <div
                key={r.id}
                onClick={() => openSavedRequest(r)}
                onContextMenu={(e) => requestMenu(e, r)}
                className={`group flex cursor-pointer items-center gap-2 py-1.5 pl-9 pr-2 hover:bg-pm-bg3 ${
                  activeTabId === r.id ? "bg-pm-bg3" : ""
                }`}
              >
                <span
                  className={`m-${r.method} mono w-9 shrink-0 text-[10px] font-bold`}
                >
                  {r.method.slice(0, 4)}
                </span>
                <span className="flex-1 truncate text-[12.5px]" title={r.name}>
                  {r.name}
                </span>
                <button
                  title="Delete request"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete request "${r.name}"?`))
                      deleteSavedRequest(r.id);
                  }}
                  className="text-pm-muted opacity-0 hover:text-pm-red group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Environments ----------

function EnvironmentsView() {
  const environments = useStore((s) => s.environments);
  const createEnvironment = useStore((s) => s.createEnvironment);
  const deleteEnvironment = useStore((s) => s.deleteEnvironment);
  const activateEnvironment = useStore((s) => s.activateEnvironment);
  const activeEnvId = useStore((s) => s.activeEnvId);
  const updateEnvironment = useStore((s) => s.updateEnvironment);
  const duplicateEnvironment = useStore((s) => s.duplicateEnvironment);
  const setEnvironmentVisibility = useStore((s) => s.setEnvironmentVisibility);
  const moveEnvironment = useStore((s) => s.moveEnvironment);
  const workspaces = useStore((s) => s.workspaces);
  const currentWorkspaceId = useStore((s) => s.currentWorkspaceId);
  const globals = useStore((s) => s.globals);
  const saveGlobals = useStore((s) => s.saveGlobals);
  const { open: openMenu } = useContextMenu();
  const [selected, setSelected] = useState<string | null>(null);

  const envMoveItems = (envId: string): MenuItem[] =>
    workspaces
      .filter((w) => w.id !== currentWorkspaceId)
      .map((w) => ({
        label: `Move to: ${w.name}`,
        icon: <CornerUpRight size={13} />,
        onClick: () => moveEnvironment(envId, w.id),
      }));

  const env = environments.find((e) => e.id === selected) || null;
  const showGlobals = selected === "__globals__";

  return (
    <>
      <PanelHeader
        title="Environments"
        action={
          <button
            onClick={() => createEnvironment()}
            title="New Environment"
            className="text-pm-muted hover:text-pm-orange"
          >
            <Plus size={16} />
          </button>
        }
      />
      <div className="flex-1 overflow-auto">
        <div
          onClick={() => setSelected("__globals__")}
          className={`flex cursor-pointer items-center gap-2 border-b border-pm-border px-3 py-2 hover:bg-pm-bg3 ${
            showGlobals ? "bg-pm-bg3" : ""
          }`}
        >
          <Globe size={13} className="text-pm-purple" />
          <span className="flex-1 text-[12.5px]">Globals</span>
          <span className="text-[10px] text-pm-muted">{globals.length}</span>
        </div>
        {environments.length === 0 ? (
          <EmptyHint text="No environments. Create one and add {{variables}} to reuse across requests." />
        ) : (
          environments.map((e) => (
            <div
              key={e.id}
              onContextMenu={(ev) =>
                openMenu(ev, [
                  {
                    label: activeEnvId === e.id ? "Deactivate" : "Set Active",
                    icon: <CircleDot size={13} />,
                    onClick: () =>
                      activateEnvironment(activeEnvId === e.id ? null : e.id),
                  },
                  {
                    label: "Edit Variables",
                    icon: <Pencil size={13} />,
                    onClick: () => setSelected(e.id),
                  },
                  {
                    label: "Rename",
                    icon: <Pencil size={13} />,
                    onClick: () => {
                      const name = prompt("Rename environment", e.name);
                      if (name) updateEnvironment({ ...e, name: name.trim() });
                    },
                  },
                  {
                    label: "Duplicate",
                    icon: <Copy size={13} />,
                    onClick: () => duplicateEnvironment(e),
                  },
                  { separator: true },
                  e.visibility === "private"
                    ? {
                        label: "Make Shared (ทีมเห็น)",
                        icon: <Users size={13} />,
                        onClick: () => setEnvironmentVisibility(e.id, "shared"),
                      }
                    : {
                        label: "Make Private (เห็นคนเดียว)",
                        icon: <Lock size={13} />,
                        onClick: () => setEnvironmentVisibility(e.id, "private"),
                      },
                  ...envMoveItems(e.id),
                  { separator: true },
                  {
                    label: "Delete",
                    icon: <Trash2 size={13} />,
                    danger: true,
                    onClick: () => {
                      if (confirm(`Delete environment "${e.name}"?`)) {
                        deleteEnvironment(e.id);
                        if (selected === e.id) setSelected(null);
                      }
                    },
                  },
                ])
              }
              className={`group flex items-center gap-2 px-3 py-2 hover:bg-pm-bg3 ${
                selected === e.id ? "bg-pm-bg3" : ""
              }`}
            >
              <button
                onClick={() =>
                  activateEnvironment(activeEnvId === e.id ? null : e.id)
                }
                title={activeEnvId === e.id ? "Active" : "Set active"}
                className={`h-3 w-3 rounded-full border ${
                  activeEnvId === e.id
                    ? "border-pm-green bg-pm-green"
                    : "border-pm-border2"
                }`}
              />
              <span
                onClick={() => setSelected(e.id)}
                className="flex-1 cursor-pointer truncate text-[12.5px]"
              >
                {e.name}
              </span>
              {e.visibility === "private" && (
                <Lock size={11} className="shrink-0 text-pm-muted" />
              )}
              <button
                onClick={() => {
                  if (confirm(`Delete environment "${e.name}"?`)) {
                    deleteEnvironment(e.id);
                    if (selected === e.id) setSelected(null);
                  }
                }}
                className="text-pm-muted opacity-0 hover:text-pm-red group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {env && (
        <EnvEditor
          key={env.id}
          env={env}
          onSave={updateEnvironment}
          onClose={() => setSelected(null)}
        />
      )}

      {showGlobals && (
        <GlobalsEditor
          vars={globals}
          onSave={saveGlobals}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function GlobalsEditor({
  vars,
  onSave,
  onClose,
}: {
  vars: import("@/lib/types").GlobalVarData[];
  onSave: (v: import("@/lib/types").GlobalVarData[]) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState(vars);

  const commit = (next: typeof local) => {
    setLocal(next);
    onSave(next);
  };

  return (
    <div className="max-h-[45%] overflow-auto border-t border-pm-border bg-pm-bg2 p-2">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex-1 text-[12px] font-semibold text-pm-purple">
          Global Variables
        </span>
        <button onClick={onClose} className="text-xs text-pm-muted hover:text-pm-text">
          close
        </button>
      </div>
      <div className="space-y-1">
        {[...local, blankVar()].map((v, idx) => (
          <div key={v.id} className="flex items-center gap-1">
            <input
              placeholder="variable"
              value={v.key}
              onChange={(e) => {
                const val = e.target.value;
                if (idx === local.length)
                  setLocal([...local, { ...blankVar(), key: val }]);
                else
                  setLocal(
                    local.map((x, i) => (i === idx ? { ...x, key: val } : x))
                  );
              }}
              onBlur={() => onSave(local)}
              className="mono w-1/2 rounded border border-pm-border bg-pm-bg3 px-1.5 py-1 text-[12px]"
            />
            <input
              placeholder="value"
              value={v.value}
              onChange={(e) => {
                const val = e.target.value;
                if (idx === local.length)
                  setLocal([...local, { ...blankVar(), value: val }]);
                else
                  setLocal(
                    local.map((x, i) => (i === idx ? { ...x, value: val } : x))
                  );
              }}
              onBlur={() => onSave(local)}
              className="mono w-1/2 rounded border border-pm-border bg-pm-bg3 px-1.5 py-1 text-[12px]"
            />
            {idx !== local.length && (
              <button
                onClick={() => commit(local.filter((_, i) => i !== idx))}
                className="text-pm-muted hover:text-pm-red"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EnvEditor({
  env,
  onSave,
  onClose,
}: {
  env: import("@/lib/types").EnvironmentData;
  onSave: (env: import("@/lib/types").EnvironmentData) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(env.name);
  const [vars, setVars] = useState(env.variables);

  const commit = () => {
    onSave({ ...env, name, variables: vars });
  };

  return (
    <div className="max-h-[45%] overflow-auto border-t border-pm-border bg-pm-bg2 p-2">
      <div className="mb-2 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          className="flex-1 rounded border border-pm-border2 bg-pm-bg3 px-2 py-1 text-[12.5px]"
        />
        <button onClick={onClose} className="text-pm-muted text-xs hover:text-pm-text">
          close
        </button>
      </div>
      <div className="space-y-1">
        {[...vars, blankVar()].map((v, idx) => (
          <div key={v.id} className="flex items-center gap-1">
            <input
              placeholder="variable"
              value={v.key}
              onChange={(e) => {
                const val = e.target.value;
                if (idx === vars.length) {
                  setVars([...vars, { ...blankVar(), key: val }]);
                } else {
                  setVars(
                    vars.map((x, i) =>
                      i === idx ? { ...x, key: val } : x
                    )
                  );
                }
              }}
              onBlur={commit}
              className="mono w-1/2 rounded border border-pm-border bg-pm-bg3 px-1.5 py-1 text-[12px]"
            />
            <input
              placeholder="value"
              value={v.value}
              onChange={(e) => {
                const val = e.target.value;
                if (idx === vars.length) {
                  setVars([...vars, { ...blankVar(), value: val }]);
                } else {
                  setVars(
                    vars.map((x, i) =>
                      i === idx ? { ...x, value: val } : x
                    )
                  );
                }
              }}
              onBlur={commit}
              className="mono w-1/2 rounded border border-pm-border bg-pm-bg3 px-1.5 py-1 text-[12px]"
            />
            {idx !== vars.length && (
              <button
                onClick={() => {
                  const next = vars.filter((_, i) => i !== idx);
                  setVars(next);
                  onSave({ ...env, name, variables: next });
                }}
                className="text-pm-muted hover:text-pm-red"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- History ----------

function HistoryView() {
  const history = useStore((s) => s.history);
  const clearHistory = useStore((s) => s.clearHistory);
  const addTab = useStore((s) => s.addTab);
  const { open: openMenu } = useContextMenu();

  return (
    <>
      <PanelHeader
        title="History"
        action={
          history.length > 0 ? (
            <button
              onClick={() => {
                if (confirm("Clear all history?")) clearHistory();
              }}
              title="Clear history"
              className="text-pm-muted hover:text-pm-red"
            >
              <Trash2 size={15} />
            </button>
          ) : null
        }
      />
      <div className="flex-1 overflow-auto">
        {history.length === 0 ? (
          <EmptyHint text="No requests yet. Sent requests appear here." />
        ) : (
          history.map((h) => (
            <div
              key={h.id}
              onClick={() => addTab({ ...h.request, id: h.request.id })}
              onContextMenu={(e) =>
                openMenu(e, [
                  {
                    label: "Open in new tab",
                    icon: <FolderOpen size={13} />,
                    onClick: () => addTab({ ...h.request, id: h.request.id }),
                  },
                  {
                    label: "Copy URL",
                    icon: <Copy size={13} />,
                    onClick: () => navigator.clipboard.writeText(h.url),
                  },
                ])
              }
              className="group flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-pm-bg3"
              title={h.url}
            >
              <span
                className={`m-${h.method} mono w-9 shrink-0 text-[10px] font-bold`}
              >
                {h.method.slice(0, 4)}
              </span>
              <span className="flex-1 truncate text-[12px] text-pm-muted">
                {stripProtocol(h.url)}
              </span>
              {h.status != null && (
                <span
                  className={`text-[10px] ${
                    h.status >= 400 ? "text-pm-red" : "text-pm-green"
                  }`}
                >
                  {h.status}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ---------- Shared ----------

function PanelHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-pm-border px-3 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-pm-muted">
        {title}
      </span>
      {action}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="px-4 py-6 text-[12px] leading-relaxed text-pm-muted/70">
      {text}
    </div>
  );
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

function emptyReq(): RequestData {
  return {
    id: Math.random().toString(36).slice(2),
    name: "New Request",
    method: "GET",
    url: "",
    params: [],
    headers: [],
    auth: { type: "none" },
    body: { type: "none", raw: "", formData: [] },
  };
}

function blankVar() {
  return {
    id: Math.random().toString(36).slice(2),
    key: "",
    value: "",
    enabled: true,
  };
}
