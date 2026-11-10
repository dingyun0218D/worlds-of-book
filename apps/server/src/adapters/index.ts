import type { PathwayAdapter, PlatformId } from "@wob/publish-core";
import { PLATFORM_ORDER } from "@wob/publish-core";
import { douyinAdapter } from "./douyin.js";
import { xAdapter } from "./x.js";
import { facebookAdapter } from "./facebook.js";
import { instagramAdapter } from "./instagram.js";
import { xiaohongshuAdapter } from "./xiaohongshu.js";
import { zhihuAdapter } from "./zhihu.js";
import { tiebaAdapter } from "./tieba.js";

const adapters: Record<PlatformId, PathwayAdapter> = {
  douyin: douyinAdapter,
  x: xAdapter,
  facebook: facebookAdapter,
  instagram: instagramAdapter,
  xiaohongshu: xiaohongshuAdapter,
  zhihu: zhihuAdapter,
  tieba: tiebaAdapter,
};

export function getAdapter(platformId: PlatformId): PathwayAdapter {
  const adapter = adapters[platformId];
  if (!adapter) {
    throw new Error(`Unknown platform: ${platformId}`);
  }
  return adapter;
}

export function listAdapters(): PathwayAdapter[] {
  return PLATFORM_ORDER.map((id) => adapters[id]);
}

export { adapters };
