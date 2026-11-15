# 发帖通路验证（pathway）

本机验证抖音 / TikTok / X / Facebook / Instagram 等官方发帖 API 是否通路可用。

- 前端：http://127.0.0.1:5173
- API：http://127.0.0.1:8787/api/health

## 首次启动

```bash
cp tools/pathway-server/.env.example tools/pathway-server/.env
npm install
npm run dev:pathway
```

## 更新后启动

```bash
git pull
# 先 Ctrl+C 停掉当前正在跑的那次
npm run dev:pathway
```

## 各命令何时需要

| 操作 | 什么时候需要 |
|------|----------------|
| `cp tools/pathway-server/.env.example tools/pathway-server/.env` | 仅首次，或 `.env` 不存在时。已有 `.env` 且里面有你的凭证，**不要覆盖**；若 example 新增了变量（如 TikTok），把缺的键手动补进现有 `.env` 即可。 |
| `npm install` | 依赖有变时（`package.json` / `package-lock.json` 变了）。只改业务代码通常不用。拿不准就跑一次，成本低。 |
| `npm run dev:pathway` | 日常开发启动；脚本里会先 build `pathway-core`，并自动释放 5173/8787。 |

## 凭证

1. `tools/pathway-server/.env` / `.env.local`
2. 页面「配置凭证」→ `tools/pathway-server/.data/credentials.json`（优先，已 gitignore）

不要把 `.env`、`.data/credentials.json` 提交到 git。仅向你拥有或已获授权的账号发测试帖；先用 Dry-run。
