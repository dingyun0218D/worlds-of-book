import type { PathwayAdapter } from "@wob/pathway-core";
import { PLATFORM_META } from "@wob/pathway-core";
import { baseState, runUnavailableVerify } from "./helpers.js";

const meta = PLATFORM_META.zhihu;

export const zhihuAdapter: PathwayAdapter = {
  meta,
  getMissingFields() {
    return [];
  },
  async getStatus(ctx) {
    return baseState(meta, ctx, [], [
      "知乎开放平台当前开放的是搜索/热点等数据能力，不是个人发帖。",
      "一期结论：官方发帖通路不可用。",
    ]);
  },
  async verifyPublish() {
    return runUnavailableVerify(meta, "知乎暂无稳定官方个人发帖 API", [
      "在知乎创作中心人工发一篇测试文章/想法",
      "记录是否需要手机验证码/二次验证",
      "二期再评估半自动预填或人工工作流，不接入私有协议",
    ]);
  },
};
