import type { PathwayAdapter, PlatformId } from "@wob/pathway-core";
import { PLATFORM_ORDER } from "@wob/pathway-core";
import { douyinAdapter } from "./douyin.js";
import { xAdapter } from "./x.js";
import { facebookAdapter } from "./facebook.js";
import { instagramAdapter } from "./instagram.js";
import { tiktokAdapter } from "./tiktok.js";

const adapters: Record<PlatformId, PathwayAdapter> = {
  douyin: douyinAdapter,
  tiktok: tiktokAdapter,
  x: xAdapter,
  facebook: facebookAdapter,
  instagram: instagramAdapter,
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
