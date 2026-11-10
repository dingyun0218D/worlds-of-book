import type { PathwayAdapter } from "@wob/pathway-core";
import { PLATFORM_META } from "@wob/pathway-core";
import { baseState, runUnavailableVerify } from "./helpers.js";

const meta = PLATFORM_META.tieba;

export const tiebaAdapter: PathwayAdapter = {
  meta,
  getMissingFields() {
    return [];
  },
  async getStatus(ctx) {
    return baseState(meta, ctx, [], [
      "百度贴吧无通用个人发帖开放 API。",
      "一期结论：官方发帖通路不可用。",
    ]);
  },
  async verifyPublish() {
    return runUnavailableVerify(meta, "百度贴吧暂无可用官方发帖 API", [
      "选择目标贴吧，人工发一条带固定前缀的测试帖",
      "记录登录风控、验证码、吧主审核要求",
      "二期评估是否值得做半自动素材准备（不做逆向协议）",
    ]);
  },
};
