# 发帖通路验证（pathway）

给个人和同事**各自本机运行**的子工具：用统一前端验证小红书、抖音、知乎、百度贴吧、X、Instagram、Facebook 等平台的发帖通路是否存在。

一期目标是证明「能不能通」，不是生产级运营后台。

## 包位置

| 包 | 路径 |
|----|------|
| `@wob/pathway-web` | `tools/pathway-web` |
| `@wob/pathway-server` | `tools/pathway-server` |
| `@wob/pathway-core` | `packages/pathway-core` |

## 快速开始

```bash
# 在仓根执行
cp tools/pathway-server/.env.example tools/pathway-server/.env
npm install
npm run dev:pathway
```

- 前端：http://127.0.0.1:5173
- API：http://127.0.0.1:8787/api/health

凭证可写在：

1. `tools/pathway-server/.env` / `.env.local`
2. 页面「配置凭证」→ `tools/pathway-server/.data/credentials.json`（优先，已 gitignore）

## 页面怎么用

1. 填写测试文案，可选上传测试图片
2. 在对应平台卡片配置凭证
3. 先点 **Dry-run** 检查配置，再点 **验证发帖通路**
4. 查看步骤时间线：成功会标记「通路可用 / 半自动可用」，失败会留下错误原文

测试文案会自动加前缀（默认 `[WOB-PATHWAY-TEST]`），方便事后搜索删除。

## 各平台通路结论（一期）

| 平台 | 模式 | 你需要准备什么 |
|------|------|----------------|
| 抖音 | 官方 API | 开放平台应用 Client Key/Secret，用户授权后的 Access Token + Open ID；开通「视频发布及管理」 |
| X | 官方 API | OAuth 1.0a（API Key/Secret + Access Token/Secret）或带 `tweet.write` 的 OAuth 2.0 user token；媒体上传建议用 OAuth 1.0a |
| Facebook | 官方 API | Meta App + **Page** ID + Page Access Token（`pages_manage_posts`） |
| Instagram | 官方 API | 专业号 IG User ID + Access Token；另需 **公网可访问** 的 `INSTAGRAM_IMAGE_PUBLIC_URL`（IG 不能直接吃本机文件） |
| 小红书 | 半自动 | 无需官方发帖密钥；验证会导出本地素材包与发布页预填清单（`write_notes` 尚未普适开放） |
| 知乎 | 不可用 | 开放平台当前无稳定个人发帖 API；页面给出人工检查清单 |
| 百度贴吧 | 不可用 | 无通用个人发帖开放 API；页面给出人工检查清单 |

### 凭证申请入口（摘要）

- 抖音：https://developer.open-douyin.com/
- X：https://developer.x.com/
- Meta（Facebook / Instagram）：https://developers.facebook.com/
- 小红书开放能力说明：`write_notes` 仍为规划/定向；小程序 `postNote` 仅预填唤起
- 知乎数据开放平台：https://developer.zhihu.com/（检索向，非发帖）

## 安全与合规

- 不要把 `.env`、`.data/credentials.json` 提交到 git
- 仅向**你拥有或已获授权**的账号发测试帖
- 不实现知乎/贴吧等平台的私有协议逆向
- X / Meta / 抖音均可能有审核、额度或计费，请先用 Dry-run

## 明确延后

- Cursor / Codex Agent Skill 封装
- 纯 CLI 主形态产品化
- 浏览器 RPA / 手机群控全自动
- 云端多租户与团队共享账号
