import fs from "node:fs";
import path from "node:path";
import type {
  AdapterContext,
  PathwayAdapter,
  PublishPayload,
} from "@wob/pathway-core";
import { PLATFORM_META, createStep, finishResult, markStep, nowIso } from "@wob/pathway-core";
import { assertImages, baseState, missingFrom, withPrefix } from "./helpers.js";

const meta = PLATFORM_META.douyin;
const REQUIRED = [
  "DOUYIN_CLIENT_KEY",
  "DOUYIN_CLIENT_SECRET",
  "DOUYIN_ACCESS_TOKEN",
  "DOUYIN_OPEN_ID",
];

async function douyinFetch(
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

export const douyinAdapter: PathwayAdapter = {
  meta,
  getMissingFields(ctx) {
    return missingFrom(ctx, REQUIRED);
  },
  async getStatus(ctx) {
    return baseState(meta, ctx, REQUIRED, [
      "需要在抖音开放平台创建网站应用并开通「视频发布及管理」。",
      "用户授权后把 access_token 与 open_id 填入本地凭证。",
    ]);
  },
  async verifyPublish(ctx: AdapterContext, payload: PublishPayload) {
    const startedAt = nowIso();
    let steps = [
      createStep("config", "检查凭证", "running"),
      createStep("upload", "上传图片到抖音", "pending"),
      createStep("create", "创建图文内容", "pending"),
      createStep("publish", "提交发布", "pending"),
    ];

    const missing = missingFrom(ctx, REQUIRED);
    if (missing.length) {
      steps = markStep(steps, "config", "failed", `缺少: ${missing.join(", ")}`);
      return finishResult({
        platformId: "douyin",
        ok: false,
        status: "unconfigured",
        mode: "official_api",
        message: "抖音凭证不完整",
        steps,
        startedAt,
        errorCode: "MISSING_CREDENTIALS",
      });
    }

    const imageError = assertImages(payload, 1);
    if (imageError) {
      steps = markStep(steps, "config", "failed", imageError);
      return finishResult({
        platformId: "douyin",
        ok: false,
        status: "configured_unverified",
        mode: "official_api",
        message: imageError,
        steps,
        startedAt,
        errorCode: "MISSING_IMAGE",
      });
    }

    steps = markStep(steps, "config", "ok", "凭证齐全");
    const accessToken = ctx.credentials.DOUYIN_ACCESS_TOKEN;
    const openId = ctx.credentials.DOUYIN_OPEN_ID;
    const text = withPrefix(ctx, payload.text);

    if (payload.dryRun) {
      steps = markStep(steps, "upload", "skipped", "dry-run");
      steps = markStep(steps, "create", "skipped", "dry-run");
      steps = markStep(steps, "publish", "skipped", "dry-run");
      return finishResult({
        platformId: "douyin",
        ok: true,
        status: "configured_unverified",
        mode: "official_api",
        message: "Dry-run：凭证与素材检查通过，未真实调用抖音发布接口",
        steps,
        startedAt,
      });
    }

    try {
      steps = markStep(steps, "upload", "running");
      const imagePath = payload.imagePaths[0];
      const form = new FormData();
      const blob = new Blob([fs.readFileSync(imagePath)]);
      form.append("image", blob, path.basename(imagePath));

      const upload = await douyinFetch(
        `https://open.douyin.com/api/douyin/v1/video/upload_image/?open_id=${encodeURIComponent(openId)}&access_token=${encodeURIComponent(accessToken)}`,
        { method: "POST", body: form },
      );

      const imageId =
        upload.json?.data?.image_id ||
        upload.json?.data?.image?.image_id ||
        upload.json?.extra?.image_id;

      if (!upload.ok || !imageId) {
        steps = markStep(
          steps,
          "upload",
          "failed",
          upload.text.slice(0, 800),
        );
        return finishResult({
          platformId: "douyin",
          ok: false,
          status: "configured_unverified",
          mode: "official_api",
          message: "抖音图片上传失败（检查 token 权限与接口权限）",
          steps,
          startedAt,
          errorCode: "UPLOAD_FAILED",
        });
      }
      steps = markStep(steps, "upload", "ok", `image_id=${imageId}`);

      steps = markStep(steps, "create", "running");
      // Douyin image publish endpoint variants differ by app type;
      // try the common create_image API then fall back with clear error.
      const createBody = {
        open_id: openId,
        access_token: accessToken,
        image_list: [{ image_id: imageId }],
        text,
      };

      const create = await douyinFetch(
        "https://open.douyin.com/api/douyin/v1/video/create_image/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...createBody,
          }),
        },
      );

      // Some apps require query access_token/open_id
      const create2 =
        create.ok && (create.json?.data?.item_id || create.json?.data?.publish_id)
          ? create
          : await douyinFetch(
              `https://open.douyin.com/api/douyin/v1/video/create_image/?open_id=${encodeURIComponent(openId)}&access_token=${encodeURIComponent(accessToken)}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image_list: [{ image_id: imageId }], text }),
              },
            );

      const itemId =
        create2.json?.data?.item_id ||
        create2.json?.data?.publish_id ||
        create2.json?.data?.video?.item_id;

      if (!create2.ok || !itemId) {
        steps = markStep(steps, "create", "failed", create2.text.slice(0, 800));
        steps = markStep(steps, "publish", "skipped", "创建失败，未进入发布确认");
        return finishResult({
          platformId: "douyin",
          ok: false,
          status: "configured_unverified",
          mode: "official_api",
          message:
            "抖音创建图文失败。请确认应用已开通「视频发布及管理」，且 token 未过期。",
          steps,
          startedAt,
          errorCode: "CREATE_FAILED",
        });
      }

      steps = markStep(steps, "create", "ok", `item_id=${itemId}`);
      steps = markStep(steps, "publish", "ok", "接口已接受发布请求（平台侧仍可能审核）");

      return finishResult({
        platformId: "douyin",
        ok: true,
        status: "pathway_ok",
        mode: "official_api",
        message: "抖音发帖通路验证成功（内容可能仍在审核中）",
        steps,
        startedAt,
        externalId: String(itemId),
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      steps = markStep(steps, "publish", "failed", detail);
      return finishResult({
        platformId: "douyin",
        ok: false,
        status: "configured_unverified",
        mode: "official_api",
        message: `抖音验证异常: ${detail}`,
        steps,
        startedAt,
        errorCode: "EXCEPTION",
      });
    }
  },
};
