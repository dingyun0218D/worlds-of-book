# 发帖通路验证（pathway）

给个人和同事**各自本机运行**的子工具：用统一前端验证抖音、TikTok、X、Instagram、Facebook 等**可官方 API 自动化**平台的发帖通路是否存在。

一期目标是证明「能不能通」，不是生产级运营后台。不包含小红书半自动、知乎/贴吧等无稳定官方发帖 API 的平台。

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
npm install          # postinstall 会构建 @wob/pathway-core（dist/）
npm run dev:pathway  # 若 dist 缺失会先 build core，再并行 watch core/server/web
```

- 前端：http://127.0.0.1:5173（固定端口；`dev:pathway` 启动前会自动释放 5173/8787）
- API：http://127.0.0.1:8787/api/health

凭证可写在：

1. `tools/pathway-server/.env` / `.env.local`
2. 页面「配置凭证」→ `tools/pathway-server/.data/credentials.json`（优先，已 gitignore）

## 页面怎么用

1. 填写测试文案，可选上传测试图片
2. 在对应平台卡片配置凭证
3. 先点 **Dry-run** 检查配置，再点 **验证发帖通路**
4. 查看步骤时间线：成功会标记「通路可用」，失败会留下错误原文

测试文案会自动加前缀（默认 `[WOB-PATHWAY-TEST]`），方便事后搜索删除。

## 各平台通路结论（一期）

| 平台 | 模式 | 你需要准备什么 |
|------|------|----------------|
| 抖音 | 官方 API | 开放平台应用 Client Key/Secret，用户授权后的 Access Token + Open ID；开通「视频发布及管理」 |
| TikTok | 官方 API | User Access Token（`video.publish`）；图文 Direct Post 另需 **已验证域名** 上的 `TIKTOK_IMAGE_PUBLIC_URL`；未审核应用仅 `SELF_ONLY` |
| X | 官方 API | OAuth 1.0a（API Key/Secret + Access Token/Secret）或带 `tweet.write` 的 OAuth 2.0 user token；媒体上传建议用 OAuth 1.0a |
| Facebook | 官方 API | Meta App + **Page** ID + Page Access Token（`pages_manage_posts`） |
| Instagram | 官方 API | 专业号 IG User ID + Access Token；另需 **公网可访问** 的 `INSTAGRAM_IMAGE_PUBLIC_URL`（IG 不能直接吃本机文件） |

### 凭证申请入口（摘要）

- 抖音：https://developer.open-douyin.com/
- TikTok：https://developers.tiktok.com/doc/content-posting-api-get-started
- X：https://developer.x.com/
- Meta（Facebook / Instagram）：https://developers.facebook.com/

## 安全与合规

- 不要把 `.env`、`.data/credentials.json` 提交到 git
- 仅向**你拥有或已获授权**的账号发测试帖
- 不实现无官方发帖 API 平台的私有协议逆向
- X / Meta / 抖音 / TikTok 均可能有审核、额度或计费，请先用 Dry-run

## 明确延后

- Cursor / Codex Agent Skill 封装
- 纯 CLI 主形态产品化
- 浏览器 RPA / 手机群控全自动
- 云端多租户与团队共享账号
