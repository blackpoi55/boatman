import { RequestData, TestResult, EnvVariable, GlobalVarData } from "./types";
import { ProxyResponse } from "./types";

interface VarEntry {
  key: string;
  value: string;
  enabled: boolean;
}

function makeVarStore(list: VarEntry[]) {
  const arr = list.map((v) => ({ ...v }));
  return {
    arr,
    get(key: string): string | undefined {
      const found = arr.find((v) => v.key === key && v.enabled);
      return found?.value;
    },
    set(key: string, value: string) {
      const found = arr.find((v) => v.key === key);
      if (found) {
        found.value = String(value);
        found.enabled = true;
      } else {
        arr.push({ key, value: String(value), enabled: true });
      }
    },
    unset(key: string) {
      const idx = arr.findIndex((v) => v.key === key);
      if (idx !== -1) arr.splice(idx, 1);
    },
    has(key: string): boolean {
      return arr.some((v) => v.key === key && v.enabled);
    },
  };
}

// ---- Chai-lite assertion ----

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

function typeOf(v: any): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

class Assertion {
  private negate = false;
  constructor(private actual: any, private responseCode?: number) {}

  private fail(msg: string) {
    throw new Error(msg);
  }
  private check(pass: boolean, msg: string, negMsg: string) {
    if (this.negate ? pass : !pass) {
      this.fail(this.negate ? negMsg : msg);
    }
  }

  // chainable no-op language getters
  get to() {
    return this;
  }
  get be() {
    return this;
  }
  get been() {
    return this;
  }
  get is() {
    return this;
  }
  get that() {
    return this;
  }
  get which() {
    return this;
  }
  get and() {
    return this;
  }
  get has() {
    return this;
  }
  get have() {
    return this;
  }
  get with() {
    return this;
  }
  get at() {
    return this;
  }
  get of() {
    return this;
  }
  get same() {
    return this;
  }
  get not() {
    this.negate = !this.negate;
    return this;
  }

  equal(v: any) {
    this.check(this.actual === v, `expected ${j(this.actual)} to equal ${j(v)}`, `expected ${j(this.actual)} to not equal ${j(v)}`);
    return this;
  }
  eql(v: any) {
    this.check(deepEqual(this.actual, v), `expected ${j(this.actual)} to deeply equal ${j(v)}`, `expected values to not deeply equal`);
    return this;
  }
  eq(v: any) {
    return this.equal(v);
  }
  above(n: number) {
    this.check(this.actual > n, `expected ${j(this.actual)} to be above ${n}`, `expected ${j(this.actual)} to not be above ${n}`);
    return this;
  }
  least(n: number) {
    this.check(this.actual >= n, `expected ${j(this.actual)} to be >= ${n}`, ``);
    return this;
  }
  below(n: number) {
    this.check(this.actual < n, `expected ${j(this.actual)} to be below ${n}`, ``);
    return this;
  }
  most(n: number) {
    this.check(this.actual <= n, `expected ${j(this.actual)} to be <= ${n}`, ``);
    return this;
  }
  get ok() {
    this.check(!!this.actual, `expected ${j(this.actual)} to be truthy`, `expected ${j(this.actual)} to be falsy`);
    return this;
  }
  get true() {
    this.check(this.actual === true, `expected ${j(this.actual)} to be true`, ``);
    return this;
  }
  get false() {
    this.check(this.actual === false, `expected ${j(this.actual)} to be false`, ``);
    return this;
  }
  get null() {
    this.check(this.actual === null, `expected ${j(this.actual)} to be null`, ``);
    return this;
  }
  get undefined() {
    this.check(this.actual === undefined, `expected value to be undefined`, ``);
    return this;
  }
  get empty() {
    const len =
      this.actual == null
        ? 0
        : typeof this.actual === "object"
        ? Object.keys(this.actual).length
        : String(this.actual).length;
    this.check(len === 0, `expected ${j(this.actual)} to be empty`, `expected not empty`);
    return this;
  }
  a(type: string) {
    this.check(typeOf(this.actual) === type, `expected ${j(this.actual)} to be a ${type}`, `expected not to be a ${type}`);
    return this;
  }
  an(type: string) {
    return this.a(type);
  }
  include(v: any) {
    let pass = false;
    if (typeof this.actual === "string") pass = this.actual.includes(v);
    else if (Array.isArray(this.actual)) pass = this.actual.some((x) => deepEqual(x, v));
    else if (this.actual && typeof this.actual === "object")
      pass = Object.values(this.actual).some((x) => deepEqual(x, v));
    this.check(pass, `expected ${j(this.actual)} to include ${j(v)}`, `expected ${j(this.actual)} to not include ${j(v)}`);
    return this;
  }
  contain(v: any) {
    return this.include(v);
  }
  property(name: string, value?: any) {
    const has = this.actual != null && Object.prototype.hasOwnProperty.call(this.actual, name);
    this.check(has, `expected object to have property "${name}"`, `expected object to not have property "${name}"`);
    if (has && value !== undefined) {
      this.check(deepEqual(this.actual[name], value), `expected property "${name}" to equal ${j(value)}`, ``);
    }
    return this;
  }
  lengthOf(n: number) {
    const len = this.actual?.length ?? Object.keys(this.actual || {}).length;
    this.check(len === n, `expected length ${len} to equal ${n}`, ``);
    return this;
  }
  length(n: number) {
    return this.lengthOf(n);
  }
  match(re: RegExp) {
    this.check(re.test(String(this.actual)), `expected ${j(this.actual)} to match ${re}`, ``);
    return this;
  }
  // response-specific
  status(code: number) {
    const actual = this.responseCode;
    this.check(actual === code, `expected response status ${actual} to be ${code}`, `expected status to not be ${code}`);
    return this;
  }
}

function j(v: any): string {
  try {
    return typeof v === "string" ? `"${v}"` : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// ---- Runners ----

export interface PreRequestInput {
  request: RequestData;
  env: EnvVariable[];
  globals: GlobalVarData[];
}
export interface PreRequestOutput {
  request: RequestData;
  env: EnvVariable[];
  globals: GlobalVarData[];
  logs: string[];
  error?: string;
}

export function runPreRequestScript(
  code: string,
  input: PreRequestInput
): PreRequestOutput {
  const logs: string[] = [];
  const request = JSON.parse(JSON.stringify(input.request)) as RequestData;
  const envStore = makeVarStore(input.env);
  const globalStore = makeVarStore(input.globals.map((g) => ({ ...g })));

  if (!code || !code.trim()) {
    return { request, env: envStore.arr as any, globals: globalStore.arr as any, logs };
  }

  const pm = buildPm({ envStore, globalStore, request, logs });
  const consoleObj = makeConsole(logs);

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("pm", "console", "postman", code);
    fn(pm, consoleObj, pm);
    return {
      request,
      env: envStore.arr as EnvVariable[],
      globals: globalStore.arr as GlobalVarData[],
      logs,
    };
  } catch (err) {
    return {
      request,
      env: envStore.arr as EnvVariable[],
      globals: globalStore.arr as GlobalVarData[],
      logs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface TestInput {
  request: RequestData;
  response: ProxyResponse;
  env: EnvVariable[];
  globals: GlobalVarData[];
}
export interface TestOutput {
  tests: TestResult[];
  env: EnvVariable[];
  globals: GlobalVarData[];
  logs: string[];
  error?: string;
}

export function runTestScript(code: string, input: TestInput): TestOutput {
  const logs: string[] = [];
  const tests: TestResult[] = [];
  const envStore = makeVarStore(input.env);
  const globalStore = makeVarStore(input.globals.map((g) => ({ ...g })));

  if (!code || !code.trim()) {
    return { tests, env: envStore.arr as any, globals: globalStore.arr as any, logs };
  }

  const responseObj = buildResponse(input.response);
  const pm = buildPm({
    envStore,
    globalStore,
    request: input.request,
    logs,
    response: responseObj,
    tests,
  });
  const consoleObj = makeConsole(logs);

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("pm", "console", "postman", code);
    fn(pm, consoleObj, pm);
    return {
      tests,
      env: envStore.arr as EnvVariable[],
      globals: globalStore.arr as GlobalVarData[],
      logs,
    };
  } catch (err) {
    return {
      tests,
      env: envStore.arr as EnvVariable[],
      globals: globalStore.arr as GlobalVarData[],
      logs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---- pm builder ----

function buildPm(opts: {
  envStore: ReturnType<typeof makeVarStore>;
  globalStore: ReturnType<typeof makeVarStore>;
  request: RequestData;
  logs: string[];
  response?: any;
  tests?: TestResult[];
}) {
  const { envStore, globalStore, request, response, tests } = opts;

  const expect = (actual: any) => new Assertion(actual);

  const pm: any = {
    environment: {
      get: (k: string) => envStore.get(k),
      set: (k: string, v: any) => envStore.set(k, v),
      unset: (k: string) => envStore.unset(k),
      has: (k: string) => envStore.has(k),
    },
    globals: {
      get: (k: string) => globalStore.get(k),
      set: (k: string, v: any) => globalStore.set(k, v),
      unset: (k: string) => globalStore.unset(k),
      has: (k: string) => globalStore.has(k),
    },
    variables: {
      get: (k: string) => envStore.get(k) ?? globalStore.get(k),
      set: (k: string, v: any) => envStore.set(k, v),
      has: (k: string) => envStore.has(k) || globalStore.has(k),
    },
    request: {
      url: request.url,
      method: request.method,
      addHeader: (h: { key: string; value: string }) => {
        request.headers.push({
          id: Math.random().toString(36).slice(2),
          key: h.key,
          value: h.value,
          enabled: true,
        });
      },
      headers: {
        add: (h: { key: string; value: string }) =>
          pm.request.addHeader(h),
        upsert: (h: { key: string; value: string }) => {
          const found = request.headers.find((x) => x.key === h.key);
          if (found) found.value = h.value;
          else pm.request.addHeader(h);
        },
      },
    },
    info: {
      requestName: request.name,
      eventName: response ? "test" : "prerequest",
    },
    expect,
  };

  if (response) {
    pm.response = response;
  }

  pm.test = (name: string, fn: () => void) => {
    if (!tests) return;
    try {
      fn();
      tests.push({ name, passed: true });
    } catch (err) {
      tests.push({
        name,
        passed: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return pm;
}

function buildResponse(resp: ProxyResponse) {
  let jsonCache: any;
  let jsonParsed = false;
  const headerMap = new Map<string, string>();
  for (const h of resp.headers) headerMap.set(h.key.toLowerCase(), h.value);

  const responseObj: any = {
    code: resp.status,
    status: resp.statusText,
    responseTime: resp.durationMs,
    responseSize: resp.sizeBytes,
    text: () => resp.body,
    json: () => {
      if (!jsonParsed) {
        jsonCache = JSON.parse(resp.body);
        jsonParsed = true;
      }
      return jsonCache;
    },
    headers: {
      get: (k: string) => headerMap.get(k.toLowerCase()),
      has: (k: string) => headerMap.has(k.toLowerCase()),
    },
  };

  // pm.response.to.have.status(...)
  Object.defineProperty(responseObj, "to", {
    get() {
      return new Assertion(undefined, resp.status);
    },
  });

  return responseObj;
}

function makeConsole(logs: string[]) {
  const fmt = (args: any[]) =>
    args
      .map((a) => (typeof a === "string" ? a : safeStringify(a)))
      .join(" ");
  return {
    log: (...a: any[]) => logs.push(fmt(a)),
    info: (...a: any[]) => logs.push(fmt(a)),
    warn: (...a: any[]) => logs.push("⚠ " + fmt(a)),
    error: (...a: any[]) => logs.push("✖ " + fmt(a)),
  };
}

function safeStringify(v: any): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
