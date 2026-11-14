import type {
  AdapterContext,
  PathwayStatus,
  PlatformMeta,
  PlatformState,
  PublishPayload,
} from "@wob/pathway-core";

export function missingFrom(
  ctx: AdapterContext,
  keys: string[],
): string[] {
  return keys.filter((key) => !ctx.credentials[key]);
}

export function baseState(
  meta: PlatformMeta,
  ctx: AdapterContext,
  requiredKeys: string[],
  notes: string[] = [],
  lastResult?: PlatformState["lastResult"],
): PlatformState {
  const missingFields = missingFrom(ctx, requiredKeys);
  const configured = missingFields.length === 0;

  let status: PathwayStatus = "unconfigured";
  if (meta.mode === "unavailable") {
    status = "unavailable";
  } else if (meta.mode === "semi_auto") {
    status = lastResult?.status === "semi_auto_ok" ? "semi_auto_ok" : "configured_unverified";
  } else if (configured) {
    status =
      lastResult?.status === "pathway_ok"
        ? "pathway_ok"
        : "configured_unverified";
  }

  return {
    platformId: meta.id,
    meta,
    status,
    configured: meta.mode === "semi_auto" || meta.mode === "unavailable" ? true : configured,
    missingFields,
    notes,
    lastResult,
  };
}

export function withPrefix(ctx: AdapterContext, text: string): string {
  const prefix = ctx.testPostPrefix.trim();
  if (!prefix) return text;
  if (text.startsWith(prefix)) return text;
  return `${prefix} ${text}`.trim();
}

export function assertImages(payload: PublishPayload, min = 0): string | null {
  if (payload.imagePaths.length < min) {
    return `至少需要 ${min} 张本地测试图片`;
  }
  return null;
}
