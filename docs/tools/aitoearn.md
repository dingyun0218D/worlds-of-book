# AiToEarn（本地依赖）

[AiToEarn](https://github.com/yikart/AiToEarn) 是外部开源项目，以**本地 clone** 放在 `tools/AiToEarn`，**不入本仓**（已 gitignore），也不接入 npm workspaces / `@wob` 脚本。

## 首次获取

```bash
git clone https://github.com/yikart/AiToEarn.git tools/AiToEarn
```

## 一键启动

本机需已安装 Docker / Docker Compose。在仓根执行：

```bash
./scripts/aitoearn-up.sh
# 打开 http://localhost:8080
```

脚本会：

1. 幂等生成或复用 `JWT_SECRET` / `INTERNAL_TOKEN`
2. 写入两份 `config.yaml`（ai + server；server 的 `aiClient.token` 同步为 `INTERNAL_TOKEN`）
3. 把 `JWT_SECRET` 写入 `tools/AiToEarn/.env`（供 `docker compose` 读取）
4. 执行 `docker compose up -d` 与 `docker compose ps`

密钥只落在本地 yaml / `.env`，不要提交；重复运行会复用已有密钥，不会每次重算。Relay / API Key 仍需在 UI 里手动配置。

## 更新

```bash
cd tools/AiToEarn
git pull
```

拉取后若需重启，再跑一次 `./scripts/aitoearn-up.sh` 即可。

## 注意

- 根目录 `npm install` **不会**把该目录当成 workspace；其依赖与启动按其上游 README / Docker 文档单独处理。
- 换机器或新 Cloud Agent 环境时，目录不会自动出现，需再执行一次 clone。
- 不要把 `tools/AiToEarn` 提交进本仓。
