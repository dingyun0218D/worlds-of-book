# 开发者站点（官网 + 法律页）

同一 GitHub Pages 站点内提供三个**分 URL**页面，供 TikTok / Meta 等开放平台填写：

| 用途 | 本地路径 | 部署后路径 | 填进后台 |
|------|----------|------------|----------|
| Official Website | `/` | `https://<user>.github.io/worlds-of-book/` | Platforms → Web / Desktop Website URL |
| Terms of Service | `/terms/` | `https://<user>.github.io/worlds-of-book/terms/` | Terms of Service URL |
| Privacy Policy | `/privacy/` | `https://<user>.github.io/worlds-of-book/privacy/` | Privacy Policy URL |

页面源码：`tools/dev-legal/site/`

对本仓库而言，`<user>` 一般为 `dingyun0218D`（URL 不区分大小写，常写作小写）。

官网首页会**直接露出** Terms of Service / Privacy Policy 文字链接（不藏在菜单里），以符合 TikTok App Review 对 Website URL 的要求。

## 本机预览

```bash
npm install
npm run dev:legal
```

打开 http://127.0.0.1:4173 ，确认：

- `/` 是 Worlds of Book 官网
- `/terms/`、`/privacy/` 可打开
- 官网上法律链接无需菜单即可点击

## 用 GitHub Pages 部署（推荐）

仓库已带工作流：`.github/workflows/deploy-dev-legal.yml`，会把 `tools/dev-legal/site` 发布到 GitHub Pages。

### 第一次启用（只需做一次）

1. 打开 GitHub 仓库：**Settings → Pages**
2. **Build and deployment → Source** 选 **GitHub Actions**（不要选 “Deploy from a branch”）
3. 合并相关 PR，或在含有该工作流的分支上手动跑一次（见下）

### 触发部署

任选其一：

- **推送到 `main`**，且改动了 `tools/dev-legal/**` 或该 workflow（合并 PR 后自动部署）
- 仓库 **Actions** 页打开 **Deploy dev-legal (GitHub Pages)** → **Run workflow**（可选手动分支）

部署成功后，在 **Settings → Pages** 会看到站点地址，一般为：

```text
https://dingyun0218d.github.io/worlds-of-book/
```

### 填回 TikTok 开发者后台

| 字段 | 填入 |
|------|------|
| Website URL（Official Website） | `https://dingyun0218d.github.io/worlds-of-book/` |
| Terms of Service URL | `https://dingyun0218d.github.io/worlds-of-book/terms/` |
| Privacy Policy URL | `https://dingyun0218d.github.io/worlds-of-book/privacy/` |

浏览器无痕窗口打开上述三个 URL，确认返回 200 且内容可见后，再点 TikTok 后台保存。

## 法律页写了什么

中英双语摘要，核心四点：

1. 这是**内部开发 / 测试工具**
2. **只请求发帖相关权限**
3. **不出售用户数据**
4. **可随时撤销授权**

若以后要换成正式法务文案，直接改 `tools/dev-legal/site/` 下 HTML，再部署即可。

## 可选：不用 Actions 的临时方案

若暂时无法开 Pages Actions，也可：

1. 把 `tools/dev-legal/site/` 里的文件拷到任意可公网访问的静态托管（Cloudflare Pages、Vercel 静态、自有域名）
2. 或用 Notion 公开页，把同等内容写清楚后，把公开链接填进后台

通路验证本身不依赖本工具是否已上线；只有填写开放平台 App 资料时才需要这些公网 URL。
