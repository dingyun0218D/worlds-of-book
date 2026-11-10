# Worlds of Book

Worlds of Book 是一个大型 monorepo：主产品应用放在 `apps/`，内部/运营子工具放在 `tools/`，可复用库放在 `packages/`。

当前已落地的子工具：**发帖通路验证**（`tools/pathway-*`）。

## 仓库地图

```text
apps/                     # 主产品应用（占位）
tools/
  pathway-web/            # @wob/pathway-web  通路验证 UI
  pathway-server/         # @wob/pathway-server 本机 API / 适配器
packages/
  pathway-core/           # @wob/pathway-core  通路类型与平台元数据
docs/
  architecture.md         # 目录与命名约定
  tools/pathway-verifier.md
```

## 要求

- Node.js >= 20
- npm workspaces（根目录一次 `npm install`）

## 启动子工具：发帖通路验证

```bash
cp tools/pathway-server/.env.example tools/pathway-server/.env
npm install          # postinstall 会构建 @wob/pathway-core
npm run dev:pathway  # 启动前也会先确保 core 已构建
```

- UI: http://127.0.0.1:5173
- API: http://127.0.0.1:8787/api/health

详细用法见 [docs/tools/pathway-verifier.md](docs/tools/pathway-verifier.md)。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` / `dev:pathway` | 启动通路验证前后端 |
| `npm run build:pathway` | 构建 pathway-core / server / web |
| `npm run typecheck:pathway` | 类型检查 |
| `npm run start:pathway` | 启动已构建的 pathway-server |

## 扩展约定

新增主产品 → `apps/<name>`，包名 `@wob/<name>`  
新增子工具 → `tools/<domain>-web|server`，共享逻辑 → `packages/<domain>-*`  

完整约定见 [docs/architecture.md](docs/architecture.md)。
