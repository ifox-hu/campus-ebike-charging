# 电动自行车智慧充电管理系统 · 管理端

Vue 3 + Vite + ECharts 管理后台。

面向校园、住宅小区、医院、产业园区及企事业单位办公区，以校园为重点演示场景。新增或编辑站点时选择应用场景，运营统计使用相同分类；“办公区”为界面简称，保留旧“园区”分类，商业配套作为扩展场景。各场景共用设备排、双插座、费率、订单及报修流程。

```bash
npm ci
npm run dev:pages
npm test
npm run build:pages
```

`dev` 连接独立账号服务，`dev:connected` 连接充电业务 API。高德地图使用本目录 `.env.local` 的 Web Key，详见 [配置说明](../docs/configuration.md)。
