"use client";

import { create } from "zustand";
import {
  CollectionData,
  EnvironmentData,
  EnvVariable,
  GlobalVarData,
  CookieData,
  HistoryEntry,
  ProxyResponse,
  RequestData,
  TestResult,
  User,
  Workspace,
  Visibility,
  newRequest,
  uid,
} from "@/lib/types";
import { buildVarMap } from "@/lib/variables";
import { buildResolvedRequest } from "@/lib/resolve";
import { runPreRequestScript, runTestScript } from "@/lib/scripts";
import {
  importPostmanCollection,
  exportPostmanCollection,
  importCurl,
} from "@/lib/postman";
import { paramsToUrl, urlToParams, mergeParams } from "@/lib/url";

type SidebarView = "collections" | "history" | "environments";

const ACTIVE_ENV_KEY = "boatman_active_env";
const CURRENT_WS_KEY = "boatman_current_ws";

interface State {
  // auth
  user: User | null;
  authReady: boolean;
  authError: string | null;

  // workspaces
  workspaces: Workspace[];
  currentWorkspaceId: string | null;

  // data (for current workspace / user)
  collections: CollectionData[];
  environments: EnvironmentData[];
  globals: GlobalVarData[];
  cookies: CookieData[];
  history: HistoryEntry[];
  activeEnvId: string | null;

  // ui
  tabs: RequestData[];
  activeTabId: string | null;
  responses: Record<string, ProxyResponse | null>;
  testResults: Record<string, TestResult[]>;
  scriptLogs: Record<string, string[]>;
  loading: Record<string, boolean>;
  sidebarView: SidebarView;
  ready: boolean;
  useCookieJar: boolean;

  activeEnv: () => EnvironmentData | null;
  activeTab: () => RequestData | null;
  currentWorkspace: () => Workspace | null;

  // lifecycle / auth
  checkAuth: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    name: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;

  // workspaces
  loadWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  loadMembers: (id: string) => Promise<import("@/lib/types").MembersData | null>;
  inviteMember: (id: string, identifier: string) => Promise<{ ok: boolean; message: string }>;
  removeMember: (id: string, userId: string) => Promise<void>;
  cancelInvite: (id: string, email: string) => Promise<void>;
  leaveWorkspace: (id: string) => Promise<void>;

  loadWorkspaceData: () => Promise<void>;

  // tabs
  addTab: (req?: RequestData) => void;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  duplicateTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  patchTab: (id: string, patch: Partial<RequestData>) => void;
  setUrl: (id: string, url: string) => void;
  setParams: (id: string, params: RequestData["params"]) => void;

  sendRequest: (id: string) => Promise<void>;

  setSidebarView: (v: SidebarView) => void;
  toggleCookieJar: () => void;

  // collections
  createCollection: (name?: string, visibility?: Visibility) => Promise<string | undefined>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  duplicateCollection: (id: string) => Promise<void>;
  setCollectionVisibility: (id: string, v: Visibility) => Promise<void>;
  moveCollection: (id: string, workspaceId: string) => Promise<void>;

  // requests
  saveActiveRequest: (collectionId?: string) => Promise<void>;
  openSavedRequest: (req: RequestData) => void;
  deleteSavedRequest: (id: string) => Promise<void>;
  renameSavedRequest: (id: string, name: string) => Promise<void>;
  duplicateSavedRequest: (req: RequestData) => Promise<void>;

  // environments
  createEnvironment: (name?: string, visibility?: Visibility) => Promise<void>;
  updateEnvironment: (env: EnvironmentData) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  activateEnvironment: (id: string | null) => void;
  duplicateEnvironment: (env: EnvironmentData) => Promise<void>;
  setEnvironmentVisibility: (id: string, v: Visibility) => Promise<void>;
  moveEnvironment: (id: string, workspaceId: string) => Promise<void>;

  saveGlobals: (vars: GlobalVarData[]) => Promise<void>;

  loadCookies: () => Promise<void>;
  deleteCookie: (id: string) => Promise<void>;
  clearCookies: () => Promise<void>;
  addCookie: (c: Partial<CookieData>) => Promise<void>;

  clearHistory: () => Promise<void>;

  importPostmanJson: (json: any) => Promise<void>;
  importCurlText: (text: string) => void;
  exportCollection: (id: string) => void;
}

function normalizeRequest(r: any): RequestData {
  return {
    id: r.id,
    name: r.name ?? "Untitled Request",
    method: r.method ?? "GET",
    url: r.url ?? "",
    description: r.description ?? "",
    params: Array.isArray(r.params) ? r.params : [],
    headers: Array.isArray(r.headers) ? r.headers : [],
    auth: r.auth && typeof r.auth === "object" ? r.auth : { type: "none" },
    body:
      r.body && typeof r.body === "object" && r.body.type
        ? r.body
        : { type: "none", raw: "", formData: [] },
    preRequestScript: r.preRequestScript ?? "",
    testScript: r.testScript ?? "",
    collectionId: r.collectionId,
    order: r.order,
    dirty: false,
  };
}

function normalizeCollection(c: any): CollectionData {
  return {
    id: c.id,
    name: c.name,
    order: c.order,
    workspaceId: c.workspaceId,
    ownerId: c.ownerId,
    visibility: c.visibility === "private" ? "private" : "shared",
    isMine: !!c.isMine,
    requests: (c.requests || []).map(normalizeRequest),
  };
}

function normalizeEnv(e: any): EnvironmentData {
  return {
    id: e.id,
    name: e.name,
    isActive: false,
    variables: Array.isArray(e.variables) ? e.variables : [],
    workspaceId: e.workspaceId,
    ownerId: e.ownerId,
    visibility: e.visibility === "private" ? "private" : "shared",
    isMine: !!e.isMine,
  };
}

function withIds(vars: { key: string; value: string; enabled: boolean }[]): EnvVariable[] {
  return vars.map((v) => ({ id: uid(), key: v.key, value: v.value, enabled: v.enabled }));
}

function withGlobalIds(
  vars: { key: string; value: string; enabled: boolean }[]
): GlobalVarData[] {
  return vars.map((v) => ({ id: uid(), key: v.key, value: v.value, enabled: v.enabled }));
}

const ls = {
  get: (k: string) => (typeof window !== "undefined" ? localStorage.getItem(k) : null),
  set: (k: string, v: string) => {
    if (typeof window !== "undefined") localStorage.setItem(k, v);
  },
};

export const useStore = create<State>((set, get) => ({
  user: null,
  authReady: false,
  authError: null,

  workspaces: [],
  currentWorkspaceId: null,

  collections: [],
  environments: [],
  globals: [],
  cookies: [],
  history: [],
  activeEnvId: null,

  tabs: [],
  activeTabId: null,
  responses: {},
  testResults: {},
  scriptLogs: {},
  loading: {},
  sidebarView: "collections",
  ready: false,
  useCookieJar: true,

  activeEnv: () => {
    const { environments, activeEnvId } = get();
    return environments.find((e) => e.id === activeEnvId) ?? null;
  },
  activeTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) ?? null;
  },
  currentWorkspace: () => {
    const { workspaces, currentWorkspaceId } = get();
    return workspaces.find((w) => w.id === currentWorkspaceId) ?? null;
  },

  // ---- auth ----
  checkAuth: async () => {
    try {
      const { user } = await fetch("/api/auth/me").then((r) => r.json());
      set({ user: user ?? null, authReady: true });
      if (user) await bootstrap(set, get);
    } catch {
      set({ authReady: true });
    }
  },

  login: async (identifier, password) => {
    set({ authError: null });
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: identifier, password }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      set({ authError: e.error || "Login failed" });
      return false;
    }
    const user = await res.json();
    set({ user });
    await bootstrap(set, get);
    return true;
  },

  register: async (data) => {
    set({ authError: null });
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      set({ authError: e.error || "Registration failed" });
      return false;
    }
    const user = await res.json();
    set({ user });
    await bootstrap(set, get);
    return true;
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    set({
      user: null,
      workspaces: [],
      currentWorkspaceId: null,
      collections: [],
      environments: [],
      globals: [],
      cookies: [],
      history: [],
      tabs: [],
      activeTabId: null,
      responses: {},
      testResults: {},
      scriptLogs: {},
      ready: false,
    });
  },

  // ---- workspaces ----
  loadWorkspaces: async () => {
    const list = await fetch("/api/workspaces").then((r) => r.json());
    const workspaces: Workspace[] = Array.isArray(list) ? list : [];
    let currentWorkspaceId = get().currentWorkspaceId || ls.get(CURRENT_WS_KEY);
    if (!currentWorkspaceId || !workspaces.some((w) => w.id === currentWorkspaceId)) {
      const team = workspaces.find((w) => w.type === "team");
      currentWorkspaceId = team?.id || workspaces[0]?.id || null;
    }
    set({ workspaces, currentWorkspaceId });
    if (currentWorkspaceId) ls.set(CURRENT_WS_KEY, currentWorkspaceId);
  },

  setCurrentWorkspace: async (id) => {
    set({ currentWorkspaceId: id });
    ls.set(CURRENT_WS_KEY, id);
    await get().loadWorkspaceData();
  },

  createWorkspace: async (name) => {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const ws = await res.json();
    if (ws && ws.id) {
      set((s) => ({ workspaces: [...s.workspaces, ws] }));
      await get().setCurrentWorkspace(ws.id);
    }
  },

  renameWorkspace: async (id, name) => {
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name } : w)),
    }));
    await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
  },

  deleteWorkspace: async (id) => {
    await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
    set((s) => ({ workspaces: s.workspaces.filter((w) => w.id !== id) }));
    if (get().currentWorkspaceId === id) {
      const next = get().workspaces.find((w) => w.type === "personal") || get().workspaces[0];
      if (next) await get().setCurrentWorkspace(next.id);
    }
  },

  loadMembers: async (id) => {
    const res = await fetch(`/api/workspaces/${id}/members`);
    if (!res.ok) return null;
    return res.json();
  },

  inviteMember: async (id, identifier) => {
    const res = await fetch(`/api/workspaces/${id}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: data.error || "เชิญไม่สำเร็จ" };
    // refresh member counts
    get().loadWorkspaces();
    if (data.added) return { ok: true, message: `เพิ่ม @${data.username} เข้าทีมแล้ว` };
    return { ok: true, message: `ส่งคำเชิญไปที่ ${data.email} แล้ว (จะเข้าทีมอัตโนมัติเมื่อสมัคร)` };
  },

  removeMember: async (id, memberUserId) => {
    await fetch(`/api/workspaces/${id}/members?userId=${memberUserId}`, {
      method: "DELETE",
    });
    get().loadWorkspaces();
  },

  cancelInvite: async (id, email) => {
    await fetch(`/api/workspaces/${id}/members?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
  },

  leaveWorkspace: async (id) => {
    const me = get().user;
    if (!me) return;
    await fetch(`/api/workspaces/${id}/members?userId=${me.id}`, {
      method: "DELETE",
    });
    set((s) => ({ workspaces: s.workspaces.filter((w) => w.id !== id) }));
    if (get().currentWorkspaceId === id) {
      const next = get().workspaces.find((w) => w.type === "personal") || get().workspaces[0];
      if (next) await get().setCurrentWorkspace(next.id);
    }
  },

  loadWorkspaceData: async () => {
    const wsId = get().currentWorkspaceId;
    if (!wsId) return;
    const [cols, envs] = await Promise.all([
      fetch(`/api/collections?workspaceId=${wsId}`).then((r) => r.json()),
      fetch(`/api/environments?workspaceId=${wsId}`).then((r) => r.json()),
    ]);
    set({
      collections: (Array.isArray(cols) ? cols : []).map(normalizeCollection),
      environments: (Array.isArray(envs) ? envs : []).map(normalizeEnv),
    });
  },

  // ---- tabs ----
  addTab: (req) => {
    const tab = req ? { ...newRequest(), ...req, id: req.id || uid() } : newRequest();
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
  },

  closeTab: (id) => {
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      const tabs = s.tabs.filter((t) => t.id !== id);
      const responses = { ...s.responses };
      delete responses[id];
      let activeTabId = s.activeTabId;
      if (s.activeTabId === id) {
        const next = tabs[idx] || tabs[idx - 1] || tabs[0];
        activeTabId = next ? next.id : null;
      }
      return { tabs, responses, activeTabId };
    });
    if (get().tabs.length === 0) get().addTab();
  },

  closeOtherTabs: (id) =>
    set((s) => {
      const keep = s.tabs.find((t) => t.id === id);
      const responses: Record<string, ProxyResponse | null> = {};
      if (keep && s.responses[id] !== undefined) responses[id] = s.responses[id];
      return { tabs: keep ? [keep] : s.tabs, activeTabId: id, responses };
    }),

  closeAllTabs: () => {
    set({ tabs: [], activeTabId: null, responses: {} });
    get().addTab();
  },

  duplicateTab: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;
    const copy = { ...JSON.parse(JSON.stringify(tab)), id: uid(), dirty: true };
    delete copy.collectionId;
    set((s) => ({ tabs: [...s.tabs, copy], activeTabId: copy.id }));
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  patchTab: (id, patch) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch, dirty: true } : t)),
    })),

  setUrl: (id, url) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t;
        const parsed = urlToParams(url);
        return { ...t, url, params: mergeParams(t.params, parsed), dirty: true };
      }),
    })),

  setParams: (id, params) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t;
        return { ...t, params, url: paramsToUrl(t.url, params), dirty: true };
      }),
    })),

  sendRequest: async (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;

    const activeEnv = get().activeEnv();
    let envList: EnvVariable[] = activeEnv ? [...activeEnv.variables] : [];
    let globalsList = get().globals.map((g) => ({ ...g }));
    const logs: string[] = [];

    let workReq = tab;
    if (tab.preRequestScript && tab.preRequestScript.trim()) {
      const pre = runPreRequestScript(tab.preRequestScript, {
        request: tab,
        env: envList,
        globals: globalsList,
      });
      workReq = { ...pre.request, id: tab.id };
      envList = withIds(pre.env);
      globalsList = withGlobalIds(pre.globals);
      logs.push(...pre.logs.map((l) => `[pre] ${l}`));
      if (pre.error) logs.push(`[pre] ✖ ${pre.error}`);
    }

    const map = buildVarMap(
      activeEnv ? { ...activeEnv, variables: envList } : null,
      globalsList
    );
    const resolved = buildResolvedRequest(workReq, map);

    set((s) => ({ loading: { ...s.loading, [id]: true } }));
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...resolved, useCookieJar: get().useCookieJar }),
      });
      const data: ProxyResponse = await res.json();

      let tests: TestResult[] = [];
      if (tab.testScript && tab.testScript.trim() && !data.error) {
        const t = runTestScript(tab.testScript, {
          request: workReq,
          response: data,
          env: envList,
          globals: globalsList,
        });
        tests = t.tests;
        envList = withIds(t.env);
        globalsList = withGlobalIds(t.globals);
        logs.push(...t.logs.map((l) => `[test] ${l}`));
        if (t.error) logs.push(`[test] ✖ ${t.error}`);
      }

      set((s) => ({
        responses: { ...s.responses, [id]: data },
        testResults: { ...s.testResults, [id]: tests },
        scriptLogs: { ...s.scriptLogs, [id]: logs },
        loading: { ...s.loading, [id]: false },
      }));

      if (activeEnv) {
        const updated = { ...activeEnv, variables: envList };
        set((s) => ({
          environments: s.environments.map((e) =>
            e.id === activeEnv.id ? updated : e
          ),
        }));
        fetch(`/api/environments/${activeEnv.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ variables: envList }),
        }).catch(() => {});
      }
      const before = JSON.stringify(get().globals.map((g) => [g.key, g.value]));
      const after = JSON.stringify(globalsList.map((g) => [g.key, g.value]));
      if (before !== after) get().saveGlobals(globalsList);

      if (data.cookies && data.cookies.length) get().loadCookies();

      fetch("/api/history", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method: tab.method,
          url: resolved.url,
          status: data.status || null,
          statusText: data.statusText || null,
          durationMs: data.durationMs || null,
          sizeBytes: data.sizeBytes || null,
          request: tab,
          response: data,
        }),
      })
        .then((r) => r.json())
        .then((saved) => {
          if (saved && saved.id) {
            set((s) => ({
              history: [
                {
                  id: saved.id,
                  method: tab.method,
                  url: resolved.url,
                  status: data.status || null,
                  statusText: data.statusText || null,
                  durationMs: data.durationMs || null,
                  sizeBytes: data.sizeBytes || null,
                  request: tab,
                  response: data,
                  createdAt: saved.createdAt || "",
                },
                ...s.history,
              ].slice(0, 100),
            }));
          }
        })
        .catch(() => {});
    } catch (err) {
      set((s) => ({
        responses: {
          ...s.responses,
          [id]: {
            ok: false,
            status: 0,
            statusText: "",
            headers: [],
            body: "",
            contentType: "",
            durationMs: 0,
            sizeBytes: 0,
            error: String(err instanceof Error ? err.message : err),
          },
        },
        loading: { ...s.loading, [id]: false },
      }));
    }
  },

  setSidebarView: (v) => set({ sidebarView: v }),
  toggleCookieJar: () => set((s) => ({ useCookieJar: !s.useCookieJar })),

  // ---- collections ----
  createCollection: async (name, visibility) => {
    const workspaceId = get().currentWorkspaceId;
    if (!workspaceId) return undefined;
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name || "New Collection",
        workspaceId,
        visibility: visibility || "shared",
      }),
    });
    const c = await res.json();
    if (!c || !c.id) return undefined;
    set((s) => ({ collections: [...s.collections, normalizeCollection(c)] }));
    return c.id;
  },

  renameCollection: async (id, name) => {
    set((s) => ({
      collections: s.collections.map((c) => (c.id === id ? { ...c, name } : c)),
    }));
    await fetch(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
  },

  deleteCollection: async (id) => {
    set((s) => ({ collections: s.collections.filter((c) => c.id !== id) }));
    await fetch(`/api/collections/${id}`, { method: "DELETE" });
  },

  duplicateCollection: async (id) => {
    const col = get().collections.find((c) => c.id === id);
    if (!col) return;
    const newId = await get().createCollection(`${col.name} copy`, col.visibility);
    if (!newId) return;
    for (const req of col.requests) {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...req, collectionId: newId }),
      });
      const saved = normalizeRequest(await res.json());
      set((s) => ({
        collections: s.collections.map((c) =>
          c.id === newId ? { ...c, requests: [...c.requests, saved] } : c
        ),
      }));
    }
  },

  setCollectionVisibility: async (id, v) => {
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, visibility: v } : c
      ),
    }));
    await fetch(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibility: v }),
    });
  },

  moveCollection: async (id, workspaceId) => {
    await fetch(`/api/collections/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    // It leaves the current workspace view.
    set((s) => ({ collections: s.collections.filter((c) => c.id !== id) }));
  },

  // ---- requests ----
  saveActiveRequest: async (collectionId) => {
    const tab = get().activeTab();
    if (!tab) return;

    const existingCollection = get().collections.find((c) =>
      c.requests.some((r) => r.id === tab.id)
    );

    if (existingCollection && !collectionId) {
      await fetch(`/api/requests/${tab.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(tab),
      });
      set((s) => ({
        collections: s.collections.map((c) =>
          c.id === existingCollection.id
            ? {
                ...c,
                requests: c.requests.map((r) =>
                  r.id === tab.id ? { ...tab, dirty: false } : r
                ),
              }
            : c
        ),
        tabs: s.tabs.map((t) => (t.id === tab.id ? { ...t, dirty: false } : t)),
      }));
      return;
    }

    let targetId = collectionId;
    if (!targetId) {
      const first = get().collections[0];
      targetId = first ? first.id : await get().createCollection("My Collection");
    }
    if (!targetId) return;

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...tab, collectionId: targetId }),
    });
    const saved = await res.json();
    const savedReq = normalizeRequest(saved);
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === targetId ? { ...c, requests: [...c.requests, savedReq] } : c
      ),
      tabs: s.tabs.map((t) =>
        t.id === tab.id
          ? { ...t, id: savedReq.id, collectionId: targetId, dirty: false }
          : t
      ),
      activeTabId: s.activeTabId === tab.id ? savedReq.id : s.activeTabId,
    }));
  },

  openSavedRequest: (req) => {
    const existing = get().tabs.find((t) => t.id === req.id);
    if (existing) {
      set({ activeTabId: req.id });
      return;
    }
    set((s) => ({
      tabs: [...s.tabs, { ...req, dirty: false }],
      activeTabId: req.id,
    }));
  },

  deleteSavedRequest: async (id) => {
    set((s) => ({
      collections: s.collections.map((c) => ({
        ...c,
        requests: c.requests.filter((r) => r.id !== id),
      })),
    }));
    await fetch(`/api/requests/${id}`, { method: "DELETE" });
  },

  renameSavedRequest: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((s) => ({
      collections: s.collections.map((c) => ({
        ...c,
        requests: c.requests.map((r) => (r.id === id ? { ...r, name: trimmed } : r)),
      })),
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, name: trimmed } : t)),
    }));
    await fetch(`/api/requests/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
  },

  duplicateSavedRequest: async (req) => {
    const collection = get().collections.find((c) =>
      c.requests.some((r) => r.id === req.id)
    );
    if (!collection) return;
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...req,
        name: `${req.name} copy`,
        collectionId: collection.id,
      }),
    });
    const saved = normalizeRequest(await res.json());
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === collection.id ? { ...c, requests: [...c.requests, saved] } : c
      ),
    }));
  },

  // ---- environments ----
  createEnvironment: async (name, visibility) => {
    const workspaceId = get().currentWorkspaceId;
    if (!workspaceId) return;
    const res = await fetch("/api/environments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name || "New Environment",
        workspaceId,
        visibility: visibility || "shared",
      }),
    });
    const e = await res.json();
    if (e && e.id) set((s) => ({ environments: [...s.environments, normalizeEnv(e)] }));
  },

  updateEnvironment: async (env) => {
    set((s) => ({
      environments: s.environments.map((e) => (e.id === env.id ? env : e)),
    }));
    await fetch(`/api/environments/${env.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: env.name, variables: env.variables }),
    });
  },

  deleteEnvironment: async (id) => {
    set((s) => ({ environments: s.environments.filter((e) => e.id !== id) }));
    if (get().activeEnvId === id) get().activateEnvironment(null);
    await fetch(`/api/environments/${id}`, { method: "DELETE" });
  },

  activateEnvironment: (id) => {
    set({ activeEnvId: id });
    ls.set(ACTIVE_ENV_KEY, id || "");
  },

  duplicateEnvironment: async (env) => {
    const workspaceId = get().currentWorkspaceId;
    if (!workspaceId) return;
    const res = await fetch("/api/environments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: `${env.name} copy`,
        workspaceId,
        visibility: env.visibility || "shared",
        variables: env.variables,
      }),
    });
    const e = await res.json();
    if (e && e.id) set((s) => ({ environments: [...s.environments, normalizeEnv(e)] }));
  },

  setEnvironmentVisibility: async (id, v) => {
    set((s) => ({
      environments: s.environments.map((e) =>
        e.id === id ? { ...e, visibility: v } : e
      ),
    }));
    await fetch(`/api/environments/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibility: v }),
    });
  },

  moveEnvironment: async (id, workspaceId) => {
    await fetch(`/api/environments/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    set((s) => ({ environments: s.environments.filter((e) => e.id !== id) }));
  },

  saveGlobals: async (vars) => {
    set({ globals: vars });
    const res = await fetch("/api/globals", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ variables: vars }),
    });
    const saved = await res.json();
    if (Array.isArray(saved)) {
      set({
        globals: saved.map((g: any) => ({
          id: g.id,
          key: g.key,
          value: g.value,
          enabled: g.enabled,
        })),
      });
    }
  },

  loadCookies: async () => {
    const res = await fetch("/api/cookies").then((r) => r.json());
    set({ cookies: Array.isArray(res) ? res : [] });
  },

  deleteCookie: async (id) => {
    set((s) => ({ cookies: s.cookies.filter((c) => c.id !== id) }));
    await fetch(`/api/cookies?id=${id}`, { method: "DELETE" });
  },

  clearCookies: async () => {
    set({ cookies: [] });
    await fetch("/api/cookies", { method: "DELETE" });
  },

  addCookie: async (c) => {
    const res = await fetch("/api/cookies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(c),
    });
    const saved = await res.json();
    if (saved && saved.id) await get().loadCookies();
  },

  clearHistory: async () => {
    set({ history: [] });
    await fetch("/api/history", { method: "DELETE" });
  },

  importPostmanJson: async (json) => {
    const imported = importPostmanCollection(json);
    const collectionId = await get().createCollection(imported.name);
    if (!collectionId) return;
    for (const req of imported.requests) {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...req, collectionId }),
      });
      const saved = normalizeRequest(await res.json());
      set((s) => ({
        collections: s.collections.map((c) =>
          c.id === collectionId ? { ...c, requests: [...c.requests, saved] } : c
        ),
      }));
    }
    set({ sidebarView: "collections" });
  },

  importCurlText: (text) => {
    const req = importCurl(text);
    if (req) get().addTab(req);
  },

  exportCollection: (id) => {
    const col = get().collections.find((c) => c.id === id);
    if (!col) return;
    const json = exportPostmanCollection(col.name, col.requests);
    const blob = new Blob([JSON.stringify(json, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${col.name.replace(/[^\w.-]+/g, "_")}.postman_collection.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
}));

// Load everything after a successful auth.
async function bootstrap(
  set: (partial: Partial<State>) => void,
  get: () => State
) {
  await get().loadWorkspaces();
  await get().loadWorkspaceData();
  const [globRes, cookieRes, histRes] = await Promise.all([
    fetch("/api/globals").then((r) => r.json()),
    fetch("/api/cookies").then((r) => r.json()),
    fetch("/api/history?limit=100").then((r) => r.json()),
  ]);
  const history: HistoryEntry[] = (Array.isArray(histRes) ? histRes : []).map(
    (h: any) => ({
      id: h.id,
      method: h.method,
      url: h.url,
      status: h.status,
      statusText: h.statusText,
      durationMs: h.durationMs,
      sizeBytes: h.sizeBytes,
      request: normalizeRequest(h.request || {}),
      response: h.response || null,
      createdAt: h.createdAt,
    })
  );
  set({
    globals: (Array.isArray(globRes) ? globRes : []).map((g: any) => ({
      id: g.id,
      key: g.key,
      value: g.value,
      enabled: g.enabled,
    })),
    cookies: Array.isArray(cookieRes) ? cookieRes : [],
    history,
    activeEnvId: ls.get(ACTIVE_ENV_KEY) || null,
    ready: true,
  });
  if (get().tabs.length === 0) get().addTab();
}
