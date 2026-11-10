import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Pathway tool package root: tools/pathway-server */
export const TOOL_ROOT = path.resolve(__dirname, "..");
/** Monorepo root: worlds-of-book */
export const REPO_ROOT = path.resolve(TOOL_ROOT, "../..");
export const DATA_DIR = path.join(TOOL_ROOT, ".data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const CREDENTIALS_PATH = path.join(DATA_DIR, "credentials.json");
export const RESULTS_PATH = path.join(DATA_DIR, "last-results.json");

dotenv.config({ path: path.join(TOOL_ROOT, ".env") });
dotenv.config({ path: path.join(TOOL_ROOT, ".env.local"), override: true });

export function ensureDataDirs(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function getEnv(): Record<string, string | undefined> {
  return { ...process.env };
}

export const serverConfig = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || "127.0.0.1",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "http://127.0.0.1:8787",
  webOrigin: process.env.WEB_ORIGIN || "http://127.0.0.1:5173",
  testPostPrefix: process.env.TEST_POST_PREFIX || "[WOB-PATHWAY-TEST]",
};
