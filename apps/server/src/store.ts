import fs from "node:fs";
import type { PathwayResult, PlatformId } from "@wob/publish-core";
import { CREDENTIALS_PATH, RESULTS_PATH, ensureDataDirs } from "./config.js";

export type CredentialStore = Record<string, string>;
export type ResultsStore = Partial<Record<PlatformId, PathwayResult>>;

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, value: unknown): void {
  ensureDataDirs();
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

export function loadCredentials(): CredentialStore {
  return readJson<CredentialStore>(CREDENTIALS_PATH, {});
}

export function saveCredentials(next: CredentialStore): void {
  writeJson(CREDENTIALS_PATH, next);
}

export function updateCredentials(patch: CredentialStore): CredentialStore {
  const merged = { ...loadCredentials(), ...patch };
  for (const [key, value] of Object.entries(merged)) {
    if (value == null || String(value).trim() === "") {
      delete merged[key];
    } else {
      merged[key] = String(value).trim();
    }
  }
  saveCredentials(merged);
  return merged;
}

export function loadResults(): ResultsStore {
  return readJson<ResultsStore>(RESULTS_PATH, {});
}

export function saveResult(platformId: PlatformId, result: PathwayResult): void {
  const all = loadResults();
  all[platformId] = result;
  writeJson(RESULTS_PATH, all);
}

export function resolveCredentialMap(
  env: Record<string, string | undefined>,
  local: CredentialStore,
): CredentialStore {
  const keys = new Set([...Object.keys(env), ...Object.keys(local)]);
  const out: CredentialStore = {};
  for (const key of keys) {
    const localValue = local[key];
    const envValue = env[key];
    const value = (localValue && localValue.trim()) || (envValue && envValue.trim()) || "";
    if (value) out[key] = value;
  }
  return out;
}
