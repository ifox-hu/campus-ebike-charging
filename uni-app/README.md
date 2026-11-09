# 电动自行车智能充电管理系统 · H5 / 微信小程序用户端

一份 uni-app + Vue 3 源码，构建 H5 与微信小程序。包含真实地图、双插座选择、五种充电方式、时长金额、自动结束、模拟支付、订单与报修。

```bash
npm ci
npm run dev:h5
npm test
npm run build:h5
npm run build:mp-weixin
```

- H5 产物：`dist/build/h5/`。
- 微信产物：`dist/build/mp-weixin/`，用微信开发者工具导入。
- `dev:connected` 使用真实业务 API，五种方案接入服务端校验和预估接口，状态及结算费用以服务端为准。
- Web Key 与安全码在 `.env.local` 配置，AppID 在 `src/manifest.json` 配置。

详见 [配置说明](../docs/configuration.md)。
