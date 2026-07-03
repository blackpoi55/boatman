// ---- Shared domain types (client + server) ----

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export interface KV {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export type BodyType =
  | "none"
  | "json"
  | "text"
  | "xml"
  | "form-data"
  | "urlencoded";

export interface RequestBody {
  type: BodyType;
  raw: string; // used for json/text/xml
  formData: KV[]; // used for form-data / urlencoded
}

export type AuthType = "none" | "bearer" | "basic" | "apikey";

export interface Auth {
  type: AuthType;
  token?: string; // bearer
  username?: string; // basic
  password?: string; // basic
  key?: string; // apikey
  apiValue?: string; // apikey value
  addTo?: "header" | "query"; // apikey placement
}

export interface RequestData {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  description?: string;
  params: KV[];
  headers: KV[];
  auth: Auth;
  body: RequestBody;
  preRequestScript?: string;
  testScript?: string;
  collectionId?: string;
  order?: number;
  // client-only: whether saved to a collection
  dirty?: boolean;
}

export interface CollectionData {
  id: string;
  name: string;
  order: number;
  requests: RequestData[];
}

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface EnvironmentData {
  id: string;
  name: string;
  variables: EnvVariable[];
  isActive: boolean;
}

export interface ResponseHeader {
  key: string;
  value: string;
}

export interface ResponseCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
}

export interface ProxyResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: ResponseHeader[];
  body: string;
  contentType: string;
  durationMs: number;
  sizeBytes: number;
  error?: string;
  redirected?: boolean;
  finalUrl?: string;
  cookies?: ResponseCookie[];
}

export interface CookieData {
  id: string;
  domain: string;
  path: string;
  name: string;
  value: string;
  secure: boolean;
  httpOnly: boolean;
  expires?: string | null;
}

export interface GlobalVarData {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface ScriptRunResult {
  logs: string[];
  error?: string;
  tests: TestResult[];
}

export interface HistoryEntry {
  id: string;
  method: string;
  url: string;
  status: number | null;
  statusText: string | null;
  durationMs: number | null;
  sizeBytes: number | null;
  request: RequestData;
  response: ProxyResponse | null;
  createdAt: string;
}

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

export function emptyKV(): KV {
  return { id: uid(), key: "", value: "", enabled: true };
}

export function newRequest(partial: Partial<RequestData> = {}): RequestData {
  return {
    id: uid(),
    name: "Untitled Request",
    method: "GET",
    url: "",
    description: "",
    params: [],
    headers: [],
    auth: { type: "none" },
    body: { type: "none", raw: "", formData: [] },
    preRequestScript: "",
    testScript: "",
    dirty: false,
    ...partial,
  };
}
