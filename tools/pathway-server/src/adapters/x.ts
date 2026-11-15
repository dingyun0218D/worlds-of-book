import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import OAuth from "oauth-1.0a";
import type {
  AdapterContext,
  PathwayAdapter,
  PublishPayload,
} from "@wob/pathway-core";
import { PLATFORM_META, createStep, finishResult, markStep, nowIso } from "@wob/pathway-core";
import { assertImages, baseState, withPrefix } from "./helpers.js";

const meta = PLATFORM_META.x;

function hasOAuth1(ctx: AdapterContext): boolean {
  return Boolean(
    ctx.credentials.X_API_KEY &&
      ctx.credentials.X_API_SECRET &&
      ctx.credentials.X_ACCESS_TOKEN &&
      ctx.credentials.X_ACCESS_TOKEN_SECRET,
  );
}

function hasOAuth2(ctx: AdapterContext): boolean {
  return Boolean(ctx.credentials.X_BEARER_USER_TOKEN);
}

function missingX(ctx: AdapterContext): string[] {
  if (hasOAuth2(ctx) || hasOAuth1(ctx)) return [];
  return [
    "X_API_KEY+X_API_SECRET+X_ACCESS_TOKEN+X_ACCESS_TOKEN_SECRET",
    "或 X_BEARER_USER_TOKEN",
  ];
}

function oauth1Header(
  ctx: AdapterContext,
  url: string,
  method: string,
): string {
  const oauth = new OAuth({
    consumer: {
      key: ctx.credentials.X_API_KEY,
      secret: ctx.credentials.X_API_SECRET,
    },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });
  const token = {
    key: ctx.credentials.X_ACCESS_TOKEN,
    secret: ctx.credentials.X_ACCESS_TOKEN_SECRET,
  };
  const auth = oauth.authorize({ url, method }, token);
  return oauth.toHeader(auth).Authorization;
}

async function xRequest(
  ctx: AdapterContext,
  url: string,
  init: RequestInit & { oauthUrl?: string } = {},
): Promise<{ ok: boolean; status: number; json: any; text: string }> {
  const headers = new Headers(init.headers || {});
  if (hasOAuth2(ctx) && !hasOAuth1(ctx)) {
    headers.set("Authorization", `Bearer ${ctx.credentials.X_BEARER_USER_TOKEN}`);
  } else if (hasOAuth1(ctx)) {
    const method = (init.method || "GET").toUpperCase();
    headers.set(
      "Authorization",
      oauth1Header(ctx, init.oauthUrl || url, method),
    );
  }
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

export const xAdapter: PathwayAdapter = {
  meta,
  getMissingFields(ctx) {
    return missingX(ctx);
  },
  async getStatus(ctx) {
    return baseState(meta, ctx, [], [
      "OAuth 1.0a（API Key/Secret + Access Token/Secret）或 OAuth 2.0 user token 二选一。",
      "发帖可能按次计费，请使用带固定前缀的测试文案。",
    ], undefined);
  },
  async verifyPublish(ctx: AdapterContext, payload: PublishPayload) {
    const startedAt = nowIso();
    let steps = [
      createStep("config", "检查 X 凭证", "running"),
      createStep("media", "上传媒体（如有）", "pending"),
      createStep("tweet", "调用 POST /2/tweets", "pending"),
    ];

    const missing = missingX(ctx);
    if (missing.length) {
      steps = markStep(steps, "config", "failed", missing.join(" "));
      return finishResult({
        platformId: "x",
        ok: false,
        status: "unconfigured",
        mode: "official_api",
        message: "X 凭证不完整",
        steps,
        startedAt,
        errorCode: "MISSING_CREDENTIALS",
      });
    }
    steps = markStep(
      steps,
      "config",
      "ok",
      hasOAuth2(ctx) && !hasOAuth1(ctx) ? "使用 OAuth2 user token" : "使用 OAuth1.0a",
    );

    if (payload.dryRun) {
      steps = markStep(steps, "media", "skipped", "dry-run");
      steps = markStep(steps, "tweet", "skipped", "dry-run");
      return finishResult({
        platformId: "x",
        ok: true,
        status: "configured_unverified",
        mode: "official_api",
        message: "Dry-run：X 凭证检查通过",
        steps,
        startedAt,
      });
    }

    const text = withPrefix(ctx, payload.text).slice(0, 280);
    const mediaIds: string[] = [];

    try {
      if (payload.imagePaths.length > 0) {
        if (!hasOAuth1(ctx)) {
          steps = markStep(
            steps,
            "media",
            "failed",
            "媒体上传需要 OAuth 1.0a；当前仅有 OAuth2 token，将尝试纯文本发帖",
          );
        } else {
          steps = markStep(steps, "media", "running");
          const imagePath = payload.imagePaths[0];
          const imageError = assertImages(payload, 1);
          if (imageError) {
            steps = markStep(steps, "media", "failed", imageError);
          } else {
            const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
            const form = new FormData();
            form.append(
              "media",
              new Blob([fs.readFileSync(imagePath)]),
              path.basename(imagePath),
            );
            const upload = await xRequest(ctx, uploadUrl, {
              method: "POST",
              body: form,
              oauthUrl: uploadUrl,
            });
            const mediaId = upload.json?.media_id_string;
            if (!upload.ok || !mediaId) {
              steps = markStep(steps, "media", "failed", upload.text.slice(0, 800));
            } else {
              mediaIds.push(String(mediaId));
              steps = markStep(steps, "media", "ok", `media_id=${mediaId}`);
            }
          }
        }
      } else {
        steps = markStep(steps, "media", "skipped", "未提供图片，发纯文本");
      }

      steps = markStep(steps, "tweet", "running");
      const body: Record<string, unknown> = { text };
      if (mediaIds.length) {
        body.media = { media_ids: mediaIds };
      }

      const tweetUrl = "https://api.x.com/2/tweets";
      const tweet = await xRequest(ctx, tweetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        oauthUrl: tweetUrl,
      });

      const id = tweet.json?.data?.id;
      if (!tweet.ok || !id) {
        steps = markStep(steps, "tweet", "failed", tweet.text.slice(0, 800));
        return finishResult({
          platformId: "x",
          ok: false,
          status: "configured_unverified",
          mode: "official_api",
          message: "X 发帖失败（检查权限、计费额度或 token）",
          steps,
          startedAt,
          errorCode: "TWEET_FAILED",
        });
      }

      steps = markStep(steps, "tweet", "ok", `id=${id}`);
      return finishResult({
        platformId: "x",
        ok: true,
        status: "pathway_ok",
        mode: "official_api",
        message: "X 发帖通路验证成功",
        steps,
        startedAt,
        externalId: String(id),
        postUrl: `https://x.com/i/web/status/${id}`,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      steps = markStep(steps, "tweet", "failed", detail);
      return finishResult({
        platformId: "x",
        ok: false,
        status: "configured_unverified",
        mode: "official_api",
        message: `X 验证异常: ${detail}`,
        steps,
        startedAt,
        errorCode: "EXCEPTION",
      });
    }
  },
};
