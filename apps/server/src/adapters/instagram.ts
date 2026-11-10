import type {
  AdapterContext,
  PathwayAdapter,
  PublishPayload,
} from "@wob/publish-core";
import { PLATFORM_META, createStep, finishResult, markStep, nowIso } from "@wob/publish-core";
import { baseState, missingFrom, withPrefix } from "./helpers.js";

const meta = PLATFORM_META.instagram;
const REQUIRED = ["META_IG_USER_ID", "META_PAGE_ACCESS_TOKEN"];

export const instagramAdapter: PathwayAdapter = {
  meta,
  getMissingFields(ctx) {
    return missingFrom(ctx, REQUIRED);
  },
  async getStatus(ctx) {
    return baseState(meta, ctx, REQUIRED, [
      "仅支持 Instagram 专业账号（Business / Creator）。",
      "Content Publishing 需要可公网访问的 image_url；本机文件无法直接被 Meta 拉取。",
      "可在凭证中填写 INSTAGRAM_IMAGE_PUBLIC_URL，或依赖本次请求传入的公网图。",
    ]);
  },
  async verifyPublish(ctx: AdapterContext, payload: PublishPayload) {
    const startedAt = nowIso();
    let steps = [
      createStep("config", "检查 IG 凭证", "running"),
      createStep("image_url", "确认公网图片 URL", "pending"),
      createStep("container", "创建 media container", "pending"),
      createStep("publish", "media_publish", "pending"),
    ];

    const missing = missingFrom(ctx, REQUIRED);
    if (missing.length) {
      steps = markStep(steps, "config", "failed", `缺少: ${missing.join(", ")}`);
      return finishResult({
        platformId: "instagram",
        ok: false,
        status: "unconfigured",
        mode: "official_api",
        message: "Instagram 凭证不完整",
        steps,
        startedAt,
        errorCode: "MISSING_CREDENTIALS",
      });
    }
    steps = markStep(steps, "config", "ok");

    const imageUrl = ctx.credentials.INSTAGRAM_IMAGE_PUBLIC_URL;
    if (!imageUrl) {
      steps = markStep(
        steps,
        "image_url",
        "failed",
        "缺少 INSTAGRAM_IMAGE_PUBLIC_URL。IG API 不能直接吃本机文件路径。",
      );
      steps = markStep(steps, "container", "skipped");
      steps = markStep(steps, "publish", "skipped");
      return finishResult({
        platformId: "instagram",
        ok: false,
        status: "configured_unverified",
        mode: "official_api",
        message:
          "凭证已配置，但缺少公网图片 URL，通路验证停在媒体可达性步骤（这是 Instagram API 约束，不是本工具缺陷）。",
        steps,
        startedAt,
        errorCode: "NEED_PUBLIC_IMAGE_URL",
      });
    }
    steps = markStep(steps, "image_url", "ok", imageUrl);

    if (payload.dryRun) {
      steps = markStep(steps, "container", "skipped", "dry-run");
      steps = markStep(steps, "publish", "skipped", "dry-run");
      return finishResult({
        platformId: "instagram",
        ok: true,
        status: "configured_unverified",
        mode: "official_api",
        message: "Dry-run：IG 凭证与公网图 URL 检查通过",
        steps,
        startedAt,
      });
    }

    const igUserId = ctx.credentials.META_IG_USER_ID;
    const token = ctx.credentials.META_PAGE_ACCESS_TOKEN;
    const caption = withPrefix(ctx, payload.text);

    try {
      steps = markStep(steps, "container", "running");
      const createParams = new URLSearchParams({
        image_url: imageUrl,
        caption,
        access_token: token,
      });
      const createRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media?${createParams.toString()}`,
        { method: "POST" },
      );
      const createText = await createRes.text();
      let createJson: any = null;
      try {
        createJson = JSON.parse(createText);
      } catch {
        createJson = null;
      }
      const creationId = createJson?.id;
      if (!createRes.ok || !creationId) {
        steps = markStep(steps, "container", "failed", createText.slice(0, 800));
        steps = markStep(steps, "publish", "skipped");
        return finishResult({
          platformId: "instagram",
          ok: false,
          status: "configured_unverified",
          mode: "official_api",
          message: "创建 Instagram media container 失败",
          steps,
          startedAt,
          errorCode: "CONTAINER_FAILED",
        });
      }
      steps = markStep(steps, "container", "ok", `creation_id=${creationId}`);

      steps = markStep(steps, "publish", "running");
      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: token,
      });
      const publishRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media_publish?${publishParams.toString()}`,
        { method: "POST" },
      );
      const publishText = await publishRes.text();
      let publishJson: any = null;
      try {
        publishJson = JSON.parse(publishText);
      } catch {
        publishJson = null;
      }
      const mediaId = publishJson?.id;
      if (!publishRes.ok || !mediaId) {
        steps = markStep(steps, "publish", "failed", publishText.slice(0, 800));
        return finishResult({
          platformId: "instagram",
          ok: false,
          status: "configured_unverified",
          mode: "official_api",
          message: "Instagram media_publish 失败",
          steps,
          startedAt,
          errorCode: "PUBLISH_FAILED",
        });
      }

      steps = markStep(steps, "publish", "ok", `media_id=${mediaId}`);
      return finishResult({
        platformId: "instagram",
        ok: true,
        status: "pathway_ok",
        mode: "official_api",
        message: "Instagram 发帖通路验证成功",
        steps,
        startedAt,
        externalId: String(mediaId),
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      steps = markStep(steps, "publish", "failed", detail);
      return finishResult({
        platformId: "instagram",
        ok: false,
        status: "configured_unverified",
        mode: "official_api",
        message: `Instagram 验证异常: ${detail}`,
        steps,
        startedAt,
        errorCode: "EXCEPTION",
      });
    }
  },
};
