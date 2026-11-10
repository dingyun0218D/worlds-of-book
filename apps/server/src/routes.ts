import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import type { PlatformId, PlatformState } from "@wob/publish-core";
import { PLATFORM_ORDER } from "@wob/publish-core";
import { getAdapter, listAdapters } from "./adapters/index.js";
import { buildContext } from "./context.js";
import { UPLOAD_DIR, ensureDataDirs, serverConfig } from "./config.js";
import {
  loadCredentials,
  loadResults,
  saveResult,
  updateCredentials,
} from "./store.js";

ensureDataDirs();

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 25 * 1024 * 1024, files: 9 },
});

export const apiRouter = Router();

function isPlatformId(value: string): value is PlatformId {
  return (PLATFORM_ORDER as readonly string[]).includes(value);
}

async function buildPlatformState(platformId: PlatformId): Promise<PlatformState> {
  const adapter = getAdapter(platformId);
  const ctx = buildContext();
  const state = await adapter.getStatus(ctx);
  const missing = adapter.getMissingFields(ctx);
  const lastResult = loadResults()[platformId];

  let status = state.status;
  if (adapter.meta.mode === "unavailable") {
    status = "unavailable";
  } else if (adapter.meta.mode === "semi_auto") {
    status = lastResult?.status === "semi_auto_ok" ? "semi_auto_ok" : "configured_unverified";
  } else if (missing.length > 0) {
    status = "unconfigured";
  } else if (lastResult?.status === "pathway_ok") {
    status = "pathway_ok";
  } else {
    status = "configured_unverified";
  }

  return {
    ...state,
    status,
    configured: adapter.meta.mode !== "official_api" ? true : missing.length === 0,
    missingFields: missing,
    lastResult,
  };
}

apiRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "wob-pathway-server",
    publicBaseUrl: serverConfig.publicBaseUrl,
  });
});

apiRouter.get("/platforms", async (_req, res) => {
  const platforms = await Promise.all(
    listAdapters().map((adapter) => buildPlatformState(adapter.meta.id)),
  );
  res.json({ platforms, testPostPrefix: serverConfig.testPostPrefix });
});

apiRouter.get("/platforms/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!isPlatformId(id)) {
    res.status(404).json({ error: "unknown platform" });
    return;
  }
  res.json({ platform: await buildPlatformState(id) });
});

apiRouter.get("/credentials", (_req, res) => {
  const stored = loadCredentials();
  const ctx = buildContext();
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(ctx.credentials)) {
    if (!value) continue;
    const fromLocal = Boolean(stored[key]);
    masked[key] = fromLocal
      ? value.length <= 8
        ? "*".repeat(value.length)
        : `${value.slice(0, 2)}${"*".repeat(Math.min(12, value.length - 4))}${value.slice(-2)} (local)`
      : "(from env)";
  }
  res.json({ credentials: masked, localKeys: Object.keys(stored) });
});

apiRouter.put("/credentials", (req, res) => {
  const body = req.body as Record<string, unknown>;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "expected object body" });
    return;
  }
  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") patch[key] = value;
  }
  const saved = updateCredentials(patch);
  res.json({ ok: true, localKeys: Object.keys(saved) });
});

apiRouter.post(
  "/platforms/:id/verify",
  upload.array("images", 9),
  async (req, res) => {
    const id = String(req.params.id);
    if (!isPlatformId(id)) {
      res.status(404).json({ error: "unknown platform" });
      return;
    }

    const adapter = getAdapter(id);
    const ctx = buildContext();
    const text =
      typeof req.body?.text === "string" && req.body.text.trim()
        ? req.body.text.trim()
        : "通路验证测试帖";
    const dryRun =
      req.body?.dryRun === "true" ||
      req.body?.dryRun === true ||
      req.body?.dryRun === "1";

    const files = (req.files as Express.Multer.File[] | undefined) || [];
    const imagePaths = files.map((file) => {
      const ext = path.extname(file.originalname || "") || ".bin";
      const finalPath = `${file.path}${ext}`;
      fs.renameSync(file.path, finalPath);
      return finalPath;
    });

    try {
      const result = await adapter.verifyPublish(ctx, {
        text,
        imagePaths,
        dryRun,
      });
      saveResult(adapter.meta.id, result);
      res.json({ result, platform: await buildPlatformState(adapter.meta.id) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  },
);

apiRouter.get("/results", (_req, res) => {
  res.json({ results: loadResults() });
});
