import fs from "node:fs";
import path from "node:path";
import type {
  AdapterContext,
  PathwayAdapter,
  PublishPayload,
} from "@wob/publish-core";
import { PLATFORM_META, createStep, finishResult, markStep, nowIso } from "@wob/publish-core";
import { assertImages, baseState, withPrefix } from "./helpers.js";

const meta = PLATFORM_META.xiaohongshu;

export const xiaohongshuAdapter: PathwayAdapter = {
  meta,
  getMissingFields() {
    return [];
  },
  async getStatus(ctx) {
    return baseState(
      meta,
      ctx,
      [],
      [
        "官方 write_notes scope 仍为规划/定向开放，多数个人应用无法无人值守直发。",
        "一期验证：生成本地「发布素材包」+ 发布页预填字段清单（半自动）。",
        "若你后续有小程序 postNote 能力，可把本适配器升级为唤起发布页。",
      ],
    );
  },
  async verifyPublish(ctx: AdapterContext, payload: PublishPayload) {
    const startedAt = nowIso();
    let steps = [
      createStep("policy", "确认官方直发能力", "running"),
      createStep("normalize", "规范化标题/正文/话题", "pending"),
      createStep("bundle", "导出半自动素材包", "pending"),
    ];

    steps = markStep(
      steps,
      "policy",
      "ok",
      "write_notes 未普适开放 → 走半自动通路",
    );

    const imageError = assertImages(payload, 1);
    if (imageError) {
      steps = markStep(steps, "normalize", "failed", imageError);
      return finishResult({
        platformId: "xiaohongshu",
        ok: false,
        status: "configured_unverified",
        mode: "semi_auto",
        message: imageError,
        steps,
        startedAt,
        errorCode: "MISSING_IMAGE",
      });
    }

    const raw = withPrefix(ctx, payload.text).trim();
    const titleMax = Number(ctx.credentials.XHS_NOTES_TITLE_MAX || 20);
    const firstLine = raw.split(/\n/)[0] || "测试笔记";
    const title = firstLine.slice(0, titleMax);
    const content = raw.slice(0, 1000);

    steps = markStep(
      steps,
      "normalize",
      "ok",
      `title=${title.length}字, content=${content.length}字, images=${payload.imagePaths.length}`,
    );

    const outDir = path.join(ctx.dataDir, "xiaohongshu-bundles", String(Date.now()));
    fs.mkdirSync(outDir, { recursive: true });

    const copiedImages: string[] = [];
    for (const imagePath of payload.imagePaths.slice(0, 18)) {
      const dest = path.join(outDir, path.basename(imagePath));
      fs.copyFileSync(imagePath, dest);
      copiedImages.push(dest);
    }

    const checklist = {
      platform: "xiaohongshu",
      mode: "semi_auto",
      generatedAt: nowIso(),
      publishPageFields: {
        title,
        content,
        tags: [],
        mediaInfo: {
          image_resources: copiedImages.map((p) => ({
            local_path: p,
            note: "小程序 postNote 需要 https 或 xhsfile；本地路径仅供人工上传",
          })),
        },
      },
      manualSteps: [
        "打开小红书 App / 创作中心",
        "新建图文笔记",
        `标题粘贴：${title}`,
        "正文粘贴 content 字段",
        "上传素材包中的图片",
        "确认发布",
      ],
      images: copiedImages,
    };

    const manifestPath = path.join(outDir, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(checklist, null, 2), "utf8");

    steps = markStep(
      steps,
      "bundle",
      "ok",
      `素材包已生成: ${manifestPath}`,
    );

    return finishResult({
      platformId: "xiaohongshu",
      ok: true,
      status: "semi_auto_ok",
      mode: "semi_auto",
      message: "小红书半自动通路可用：已导出发布素材包与预填清单（需人工点发布）",
      steps,
      startedAt,
      externalId: path.basename(outDir),
      postUrl: `file://${manifestPath}`,
    });
  },
};
