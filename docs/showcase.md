# 功能截图

## 管理端

管理端截图尺寸为 **1600 × 1100**，包含登录、运营概览、设备排布、插座详情、订单管理和运营告警。登录页采用紫蓝色闪电 logo 和三维能量核心，顶部页面标签支持切换和关闭。

截图使用 16 个示例站点，涵盖校园、医院、住宅小区、产业园区、办公区和商业配套。概览页采用坐标示意。生成时间和环境参数见 [截图记录](screenshots/admin-showcase.json)。

| 页面 | 展示内容 | 图片 |
| --- | --- | --- |
| 登录 | 能量核心、账号输入、密码显隐 | [登录截图](screenshots/showcase-admin-login.png) |
| 运营概览 | 业务指标、高德地图站点分布、多页面标签 | [概览截图](screenshots/showcase-admin-dashboard.png) |
| 设备排布 | 按站点筛选、多排设备、A/B 插座状态 | [排布截图](screenshots/showcase-admin-layout.png) |
| 插座详情 | 设备信息、A/B 插座、充电操作 | [插座截图](screenshots/showcase-admin-socket.png) |
| 订单管理 | 日期筛选、充电状态、支付状态、账单查询 | [订单截图](screenshots/showcase-admin-orders.png) |
| 运营与告警 | 运营图表、异常设备、报修待办 | [运营截图](screenshots/showcase-admin-operations.png) |

## 用户端

用户端截图由 `uni-app/` 的 H5 页面生成，包含找站、设备排布、开始充电、充电中、结算、订单、报修和个人中心，图片位于 `screenshots/mobile-*.png`。当前联机用户端位于 `mobile-client/`。

## 生成管理端截图

准备 Node.js、Playwright 和 Microsoft Edge，在 `frontend/` 目录执行：

```bash
npm ci
npm run build:pages
npm run preview:pages
```

保持预览服务运行，在另一个终端进入 `frontend/` 目录：

```bash
node e2e/capture-admin-showcase.cjs
```

默认预览地址为 `http://127.0.0.1:5207/`。脚本在独立浏览器上下文加载示例数据，生成 6 张 PNG 和 `admin-showcase.json`。

使用其他地址时，可在 PowerShell 中指定：

```powershell
$env:ADMIN_SHOWCASE_URL = 'http://127.0.0.1:5207/'
node e2e/capture-admin-showcase.cjs
```

生成高德底图版本时，先按 [配置说明](configuration.md) 配置地图参数，再设置 `ADMIN_SHOWCASE_REQUIRE_AMAP=true`。

## 生成用户端截图

运行 `uni-app/` 的 H5 预览后，执行 `frontend/e2e/capture-user-showcase.cjs`。通过 `MOBILE_SHOWCASE_URL` 指定 H5 地址。
