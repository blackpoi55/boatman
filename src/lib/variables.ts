import type { EnvironmentData, GlobalVarData } from "./types";

/** Build a merged variable map. Environment overrides globals. */
export function buildVarMap(
  env: EnvironmentData | null | undefined,
  globals?: GlobalVarData[] | null
): Map<string, string> {
  const map = new Map<string, string>();
  if (globals) {
    for (const g of globals) {
      if (g.enabled && g.key) map.set(g.key, g.value);
    }
  }
  if (env) {
    for (const v of env.variables) {
      if (v.enabled && v.key) map.set(v.key, v.value);
    }
  }
  return map;
}

export function resolveWithMap(input: string, map: Map<string, string>): string {
  if (!input) return input;
  return input.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, name) => {
    return map.has(name) ? map.get(name)! : match;
  });
}

/**
 * Replace {{variable}} tokens using the active environment + globals.
 * Unknown variables are left as-is so the user can see the mistake.
 */
export function resolveVars(
  input: string,
  env: EnvironmentData | null | undefined,
  globals?: GlobalVarData[] | null
): string {
  if (!input) return input;
  return resolveWithMap(input, buildVarMap(env, globals));
}

/** Return the list of variable names referenced in a string. */
export function extractVars(input: string): string[] {
  const out: string[] = [];
  const re = /\{\{\s*([\w.-]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) out.push(m[1]);
  return out;
}
