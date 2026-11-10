# apps/

主产品应用目录（面向最终用户）。

本期尚无主产品代码。新增应用时：

1. 创建 `apps/<product-name>/`，包名建议 `@wob/<product-name>`
2. 在根 `package.json` 增加对应 `dev:<product>` / `build:<product>` 脚本
3. 需要共享能力时抽到 `packages/`，不要反向依赖 `tools/`

子工具（运营/内部）请放在 [`../tools`](../tools)，不要放进本目录。
