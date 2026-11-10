import fs from "node:fs";
import path from "node:path";
import type {
  AdapterContext,
  PathwayAdapter,
  PublishPayload,
} from "@wob/publish-core";
import { PLATFORM_META, createStep, finishResult, markStep, nowIso } from "@wob/publish-core";
import { assertImages, baseState, missingFrom, withPrefix } from "./helpers.js";

const meta = PLATFORM_META.facebook;
const REQUIRED = ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN"];

export const facebookAdapter: PathwayAdapter = {
  meta,
  getMissingFields(ctx) {
    return missingFrom(ctx, REQUIRED);
  },
  async getStatus(ctx) {
    return baseState(meta, ctx, REQUIRED, [
      "使用 Facebook Page（个人时间线无法通过 API 发帖）。",
      "Token 需具备 pages_manage_posts / pages_read_engagement。",
    ]);
  },
  async verifyPublish(ctx: AdapterContext, payload: PublishPayload) {
    const startedAt = nowIso();
    let steps = [
      createStep("config", "检查 Page 凭证", "running"),
      createStep("publish", "POST /{page-id}/photos 或 /feed", "pending"),
    ];

    const missing = missingFrom(ctx, REQUIRED);
    if (missing.length) {
      steps = markStep(steps, "config", "failed", `缺少: ${missing.join(", ")}`);
      return finishResult({
        platformId: "facebook",
        ok: false,
        status: "unconfigured",
        mode: "official_api",
        message: "Facebook 凭证不完整",
        steps,
        startedAt,
        errorCode: "MISSING_CREDENTIALS",
      });
    }
    steps = markStep(steps, "config", "ok");

    if (payload.dryRun) {
      steps = markStep(steps, "publish", "skipped", "dry-run");
      return finishResult({
        platformId: "facebook",
        ok: true,
        status: "configured_unverified",
        mode: "official_api",
        message: "Dry-run：Facebook 凭证检查通过",
        steps,
        startedAt,
      });
    }

    const pageId = ctx.credentials.META_PAGE_ID;
    const token = ctx.credentials.META_PAGE_ACCESS_TOKEN;
    const message = withPrefix(ctx, payload.text);

    try {
      steps = markStep(steps, "publish", "running");
      let res: Response;
      if (payload.imagePaths.length > 0) {
        const imageError = assertImages(payload, 1);
        if (imageError) {
          steps = markStep(steps, "publish", "failed", imageError);
          return finishResult({
            platformId: "facebook",
            ok: false,
            status: "configured_unverified",
            mode: "official_api",
            message: imageError,
            steps,
            startedAt,
            errorCode: "MISSING_IMAGE",
          });
        }
        const imagePath = payload.imagePaths[0];
        const form = new FormData();
        form.append("caption", message);
        form.append("access_token", token);
        form.append(
          "source",
          new Blob([fs.readFileSync(imagePath)]),
          path.basename(imagePath),
        );
        res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
          method: "POST",
          body: form,
        });
      } else {
        const body = new URLSearchParams({
          message,
          access_token: token,
        });
        res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
      }

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }

      const id = json?.id || json?.post_id;
      if (!res.ok || !id) {
        steps = markStep(steps, "publish", "failed", text.slice(0, 800));
        return finishResult({
          platformId: "facebook",
          ok: false,
          status: "configured_unverified",
          mode: "official_api",
          message: "Facebook 发帖失败",
          steps,
          startedAt,
          errorCode: "PUBLISH_FAILED",
        });
      }

      steps = markStep(steps, "publish", "ok", `id=${id}`);
      return finishResult({
        platformId: "facebook",
        ok: true,
        status: "pathway_ok",
        mode: "official_api",
        message: "Facebook Page 发帖通路验证成功",
        steps,
        startedAt,
        externalId: String(id),
        postUrl: `https://www.facebook.com/${id}`,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      steps = markStep(steps, "publish", "failed", detail);
      return finishResult({
        platformId: "facebook",
        ok: false,
        status: "configured_unverified",
        mode: "official_api",
        message: `Facebook 验证异常: ${detail}`,
        steps,
        startedAt,
        errorCode: "EXCEPTION",
      });
    }
  },
};
