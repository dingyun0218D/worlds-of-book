import type { PathwayStatus } from "@wob/pathway-core";

export function statusLabel(status: PathwayStatus): string {
  switch (status) {
    case "unconfigured":
      return "未配置";
    case "configured_unverified":
      return "已配置未验证";
    case "pathway_ok":
      return "通路可用";
    case "semi_auto_ok":
      return "半自动可用";
    case "unavailable":
      return "不可用";
    default:
      return status;
  }
}

export function statusClass(status: PathwayStatus): string {
  switch (status) {
    case "pathway_ok":
    case "semi_auto_ok":
      return "ok";
    case "configured_unverified":
      return "warn";
    case "unavailable":
      return "bad";
    default:
      return "muted";
  }
}
