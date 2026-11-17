# Architecture

## 分层

| 目录 | 用途 |
|------|------|
| `apps/` | 主产品应用 |
| `tools/` | 内部或运营向子工具 |
| `packages/` | 可复用库 |
| `docs/` | 仓级文档 |

## 包命名

统一使用 npm scope `@wob/`：

- 主产品：`@wob/<product>`
- 子工具：`@wob/<domain>-web` / `@wob/<domain>-server`
- 共享库：`@wob/<domain>-core`（或更具体的能力名）

同一业务域共用前缀，例如 pathway：`pathway-web` / `pathway-server` / `pathway-core`。

## Workspaces

根 `package.json` 显式列出本仓工具包（不用 `tools/*`），避免本地 clone 的外部目录（如 `tools/AiToEarn`）被 npm 扫进 workspace：

```json
"workspaces": [
  "apps/*",
  "tools/dev-legal",
  "tools/pathway-server",
  "tools/pathway-web",
  "packages/*"
]
```

根脚本按域显式命名（`dev:pathway`、`dev:legal`、`build:pathway`），避免无歧义的全局 `dev` 被多个产品抢占。当前默认 `dev` 指向 `dev:pathway`。纯静态子工具（如 `dev-legal`）可只有 `site/` + 预览脚本，不必强行拆 web/server。本地依赖的外部仓见 [docs/tools/aitoearn.md](tools/aitoearn.md)。

## 配置与本地数据

- 密钥与工具 env 放在对应 tool 包内（如 `tools/pathway-server/.env`）
- 运行时数据放在工具本地 `.data/`（gitignore），不要污染仓根
- 仓根 `.env.example` 只做索引说明

## 新增子工具检查清单

1. 在 `tools/` 创建 `<domain>-web` / `<domain>-server`（按需）
2. 共享类型放入 `packages/<domain>-*`
3. 根脚本增加 `dev:<domain>` / `build:<domain>` / `typecheck:<domain>`
4. 在 `docs/tools/` 写使用说明，并在根 README 地图中挂链接
5. `npm install` 后确认 workspace 能解析 `@wob/...` 依赖
