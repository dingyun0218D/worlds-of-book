# AiToEarn（本地依赖）

[AiToEarn](https://github.com/yikart/AiToEarn) 是外部开源项目，以**本地 clone** 放在 `tools/AiToEarn`，**不入本仓**（已 gitignore），也不接入 npm workspaces / `@wob` 脚本。

## 首次获取

```bash
git clone https://github.com/yikart/AiToEarn.git tools/AiToEarn
```

## 更新

```bash
cd tools/AiToEarn
git pull
```

## 注意

- 根目录 `npm install` **不会**把该目录当成 workspace；其依赖与启动按其上游 README / Docker 文档单独处理。
- 换机器或新 Cloud Agent 环境时，目录不会自动出现，需再执行一次 clone。
- 不要把 `tools/AiToEarn` 提交进本仓。
