import type {
  AdapterContext,
  PathwayAdapter,
  PublishPayload,
} from "@wob/pathway-core";
import { PLATFORM_META, createStep, finishResult, markStep, nowIso } from "@wob/pathway-core";
import { baseState, missingFrom, withPrefix } from "./helpers.js";

const meta = PLATFORM_META.tiktok;
const REQUIRED = ["TIKTOK_ACCESS_TOKEN"];

async function tiktokFetch(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; json: any; text: string }> {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

function pickPrivacyLevel(
  requested: string | undefined,
  options: string[] | undefined,
): string {
  const fallback = "SELF_ONLY";
  const candidate = (requested || fallback).trim() || fallback;
  if (!options || options.length === 0) return candidate;
  if (options.includes(candidate)) return candidate;
  if (options.includes(fallback)) return fallback;
  return options[0];
}

export const tiktokAdapter: PathwayAdapter = {
  meta,
  getMissingFields(ctx) {
    return missingFrom(ctx, REQUIRED);
  },
  async getStatus(ctx) {
    return baseState(meta, ctx, REQUIRED, [
      "在 TikTok for Developers 为应用开通 Content Posting API，并申请 video.publish。",
      "图文 Direct Post 只接受已验证域名上的公网图片 URL（与 Instagram 类似）。",
      "未通过审核的客户端只能发 SELF_ONLY；审核通过后才能选公开等隐私级别。",
    ]);
  },
  async verifyPublish(ctx: AdapterContext, payload: PublishPayload) {
    const startedAt = nowIso();
    let steps = [
      createStep("config", "检查 TikTok 凭证", "running"),
      createStep("creator", "查询 creator_info", "pending"),
      createStep("image_url", "确认公网图片 URL", "pending"),
      createStep("publish", "content/init Direct Post", "pending"),
    ];

    const missing = missingFrom(ctx, REQUIRED);
    if (missing.length) {
      steps = markStep(steps, "config", "failed", `缺少: ${missing.join(", ")}`);
      return finishResult({
        platformId: "tiktok",
        ok: false,
        status: "unconfigured",
        mode: "official_api",
        message: "TikTok 凭证不完整",
        steps,
        startedAt,
        errorCode: "MISSING_CREDENTIALS",
      });
    }
    steps = markStep(steps, "config", "ok");

    const token = ctx.credentials.TIKTOK_ACCESS_TOKEN;
    const imageUrl = ctx.credentials.TIKTOK_IMAGE_PUBLIC_URL;
    const text = withPrefix(ctx, payload.text);
    const title = text.split(/\n/)[0]?.slice(0, 90) || "pathway test";
    const description = text.slice(0, 4000);

    if (payload.dryRun) {
      steps = markStep(steps, "creator", "skipped", "dry-run");
      if (!imageUrl) {
        steps = markStep(
          steps,
          "image_url",
          "failed",
          "缺少 TIKTOK_IMAGE_PUBLIC_URL（真实验证需要）",
        );
      } else {
        steps = markStep(steps, "image_url", "ok", imageUrl);
      }
      steps = markStep(steps, "publish", "skipped", "dry-run");
      return finishResult({
        platformId: "tiktok",
        ok: Boolean(imageUrl),
        status: "configured_unverified",
        mode: "official_api",
        message: imageUrl
          ? "Dry-run：TikTok 凭证与公网图 URL 检查通过"
          : "Dry-run：凭证齐全，但缺少公网图片 URL（图文 Direct Post 必需）",
        steps,
        startedAt,
        errorCode: imageUrl ? undefined : "NEED_PUBLIC_IMAGE_URL",
      });
    }

    try {
      steps = markStep(steps, "creator", "running");
      const creator = await tiktokFetch(
        "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
        },
      );
      const creatorError = creator.json?.error?.code;
      if (!creator.ok || (creatorError && creatorError !== "ok")) {
        steps = markStep(steps, "creator", "failed", creator.text.slice(0, 800));
        steps = markStep(steps, "image_url", "skipped");
        steps = markStep(steps, "publish", "skipped");
        return finishResult({
          platformId: "tiktok",
          ok: false,
          status: "configured_unverified",
          mode: "official_api",
          message: "TikTok creator_info/query 失败（检查 token 与 video.publish）",
          steps,
          startedAt,
          errorCode: "CREATOR_INFO_FAILED",
        });
      }

      const privacyOptions: string[] | undefined =
        creator.json?.data?.privacy_level_options;
      const privacyLevel = pickPrivacyLevel(
        ctx.credentials.TIKTOK_PRIVACY_LEVEL,
        privacyOptions,
      );
      steps = markStep(
        steps,
        "creator",
        "ok",
        `privacy=${privacyLevel}; options=${(privacyOptions || []).join("|") || "n/a"}`,
      );

      if (!imageUrl) {
        steps = markStep(
          steps,
          "image_url",
          "failed",
          "缺少 TIKTOK_IMAGE_PUBLIC_URL。图文 Direct Post 不能直接吃本机文件路径。",
        );
        steps = markStep(steps, "publish", "skipped");
        return finishResult({
          platformId: "tiktok",
          ok: false,
          status: "configured_unverified",
          mode: "official_api",
          message:
            "凭证已配置且 creator_info 可用，但缺少公网图片 URL，通路验证停在媒体可达性步骤（TikTok API 约束）。",
          steps,
          startedAt,
          errorCode: "NEED_PUBLIC_IMAGE_URL",
        });
      }
      steps = markStep(steps, "image_url", "ok", imageUrl);

      steps = markStep(steps, "publish", "running");
      const init = await tiktokFetch(
        "https://open.tiktokapis.com/v2/post/publish/content/init/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
          },
          body: JSON.stringify({
            post_info: {
              title,
              description,
              privacy_level: privacyLevel,
              disable_comment: false,
              auto_add_music: true,
            },
            source_info: {
              source: "PULL_FROM_URL",
              photo_cover_index: 0,
              photo_images: [imageUrl],
            },
            post_mode: "DIRECT_POST",
            media_type: "PHOTO",
          }),
        },
      );

      const initError = init.json?.error?.code;
      const publishId = init.json?.data?.publish_id;
      if (!init.ok || (initError && initError !== "ok") || !publishId) {
        steps = markStep(steps, "publish", "failed", init.text.slice(0, 800));
        return finishResult({
          platformId: "tiktok",
          ok: false,
          status: "configured_unverified",
          mode: "official_api",
          message:
            "TikTok content/init 失败。请确认域名已验证、token 含 video.publish，且隐私级别合法。",
          steps,
          startedAt,
          errorCode: "PUBLISH_INIT_FAILED",
        });
      }

      steps = markStep(steps, "publish", "ok", `publish_id=${publishId}`);
      return finishResult({
        platformId: "tiktok",
        ok: true,
        status: "pathway_ok",
        mode: "official_api",
        message: "TikTok 发帖通路验证成功（内容可能仍在处理中；未审核应用仅私密可见）",
        steps,
        startedAt,
        externalId: String(publishId),
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      steps = markStep(steps, "publish", "failed", detail);
      return finishResult({
        platformId: "tiktok",
        ok: false,
        status: "configured_unverified",
        mode: "official_api",
        message: `TikTok 验证异常: ${detail}`,
        steps,
        startedAt,
        errorCode: "EXCEPTION",
      });
    }
  },
};
