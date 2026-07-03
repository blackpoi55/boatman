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

interface State {
  collections: CollectionData[];
  environments: EnvironmentData[];
  globals: GlobalVarData[];
  cookies: CookieData[];
  history: HistoryEntry[];

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

  loadAll: () => Promise<void>;

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

  createCollection: (name?: string) => Promise<string | undefined>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;

  saveActiveRequest: (collectionId?: string) => Promise<void>;
  openSavedRequest: (req: RequestData) => void;
  deleteSavedRequest: (id: string) => Promise<void>;
  renameSavedRequest: (id: string, name: string) => Promise<void>;
  duplicateSavedRequest: (req: RequestData) => Promise<void>;
  duplicateCollection: (id: string) => Promise<void>;

  createEnvironment: (name?: string) => Promise<void>;
  updateEnvironment: (env: EnvironmentData) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  activateEnvironment: (id: string | null) => Promise<void>;
  duplicateEnvironment: (env: EnvironmentData) => Promise<void>;

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

function withIds(vars: { key: string; value: string; enabled: boolean }[]): EnvVariable[] {
  return vars.map((v) => ({ id: uid(), key: v.key, value: v.value, enabled: v.enabled }));
}

function withGlobalIds(
  vars: { key: string; value: string; enabled: boolean }[]
): GlobalVarData[] {
  return vars.map((v) => ({
    id: uid(),
    key: v.key,
    value: v.value,
    enabled: v.enabled,
  }));
}

export const useStore = create<State>((set, get) => ({
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
  loading: {},
  sidebarView: "collections",
  ready: false,
  useCookieJar: true,

  activeEnv: () => get().environments.find((e) => e.isActive) ?? null,
  activeTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) ?? null;
  },

  loadAll: async () => {
    try {
      const [colRes, envRes, histRes, globRes, cookieRes] = await Promise.all([
        fetch("/api/collections").then((r) => r.json()),
        fetch("/api/environments").then((r) => r.json()),
        fetch("/api/history?limit=100").then((r) => r.json()),
        fetch("/api/globals").then((r) => r.json()),
        fetch("/api/cookies").then((r) => r.json()),
      ]);
      const collections: CollectionData[] = (Array.isArray(colRes) ? colRes : []).map(
        (c: any) => ({
          id: c.id,
          name: c.name,
          order: c.order,
          requests: (c.requests || []).map(normalizeRequest),
        })
      );
      const environments: EnvironmentData[] = (Array.isArray(envRes) ? envRes : []).map(
        (e: any) => ({
          id: e.id,
          name: e.name,
          isActive: e.isActive,
          variables: Array.isArray(e.variables) ? e.variables : [],
        })
      );
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
      const globals: GlobalVarData[] = (Array.isArray(globRes) ? globRes : []).map(
        (g: any) => ({ id: g.id, key: g.key, value: g.value, enabled: g.enabled })
      );
      const cookies: CookieData[] = Array.isArray(cookieRes) ? cookieRes : [];

      set({ collections, environments, history, globals, cookies, ready: true });
      if (get().tabs.length === 0) get().addTab();
    } catch (err) {
      console.error("loadAll failed", err);
      set({ ready: true });
      if (get().tabs.length === 0) get().addTab();
    }
  },

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
      return {
        tabs: keep ? [keep] : s.tabs,
        activeTabId: id,
        responses,
      };
    }),

  closeAllTabs: () => {
    set({ tabs: [], activeTabId: null, responses: {} });
    get().addTab();
  },

  duplicateTab: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;
    const copy = { ...JSON.parse(JSON.stringify(tab)), id: uid(), dirty: true };
    // A duplicated tab is a fresh unsaved request (drop the saved binding).
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

    // 1) Pre-request script
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

    // 2) Build resolved payload with merged variables
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

      // 3) Test script
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

      // 4) Persist variable mutations from scripts
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
      // Persist globals if changed via script
      const before = JSON.stringify(get().globals.map((g) => [g.key, g.value]));
      const after = JSON.stringify(globalsList.map((g) => [g.key, g.value]));
      if (before !== after) {
        get().saveGlobals(globalsList);
      }

      // 5) Refresh cookies if the response set any
      if (data.cookies && data.cookies.length) {
        get().loadCookies();
      }

      // 6) Record history
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

  createCollection: async (name) => {
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name || "New Collection" }),
    });
    const c = await res.json();
    set((s) => ({
      collections: [
        ...s.collections,
        { id: c.id, name: c.name, order: c.order, requests: [] },
      ],
    }));
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
        c.id === collection.id
          ? { ...c, requests: [...c.requests, saved] }
          : c
      ),
    }));
  },

  duplicateCollection: async (id) => {
    const col = get().collections.find((c) => c.id === id);
    if (!col) return;
    const newId = await get().createCollection(`${col.name} copy`);
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

  createEnvironment: async (name) => {
    const res = await fetch("/api/environments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name || "New Environment" }),
    });
    const e = await res.json();
    set((s) => ({
      environments: [
        ...s.environments,
        { id: e.id, name: e.name, variables: [], isActive: false },
      ],
    }));
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
    await fetch(`/api/environments/${id}`, { method: "DELETE" });
  },

  activateEnvironment: async (id) => {
    set((s) => ({
      environments: s.environments.map((e) => ({ ...e, isActive: e.id === id })),
    }));
    if (id) {
      await fetch(`/api/environments/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
    } else {
      const envs = get().environments;
      await Promise.all(
        envs.map((e) =>
          fetch(`/api/environments/${e.id}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ isActive: false }),
          })
        )
      );
    }
  },

  duplicateEnvironment: async (env) => {
    const res = await fetch("/api/environments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `${env.name} copy`, variables: env.variables }),
    });
    const e = await res.json();
    set((s) => ({
      environments: [
        ...s.environments,
        {
          id: e.id,
          name: e.name,
          variables: Array.isArray(e.variables) ? e.variables : env.variables,
          isActive: false,
        },
      ],
    }));
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
    if (saved && saved.id) {
      await get().loadCookies();
    }
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
      const saved = await res.json();
      const savedReq = normalizeRequest(saved);
      set((s) => ({
        collections: s.collections.map((c) =>
          c.id === collectionId
            ? { ...c, requests: [...c.requests, savedReq] }
            : c
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
