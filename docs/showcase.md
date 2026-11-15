# 功能截图展示说明

## 管理端：2026-11-15 更新

本轮管理端图片由当前本地源码的 Pages 构建实际运行生成，分辨率统一为 **1600 × 1100**。截图包含毕设原版紫蓝色闪电 logo、同步 `xiangmu` 渲染效果的能量核心登录页和可切换、可关闭的多页面标签。登录验证成功后，粒子与轨道汇聚，再进入管理端。没有替换页面文字或拼接界面。

- **来源**：本地 `frontend/dist-pages/` 静态演示，预览地址和生成时间记录在 [截图环境记录](screenshots/admin-showcase.json) 中。不是已发布线上版本或 connected 联网管理端的验收截图。
- **数据**：独立浏览器上下文中的通用模拟夹具，共 16 个站点，涵盖校园、医院、住宅小区、产业园区、办公区及商业配套 6 类场景；站点、设备、插座及订单关系保留。
- **位置**：站名、地址和坐标为文档展示专用数据，不代表真实充电设施，不展示具体学校楼栋。应用默认数据文件、用户已有浏览器数据和业务数据库均未修改。
- **地图**：本轮构建未配置高德凭证，概览截图如实显示坐标示意及其提示，不能当作真实地图瓦片加载的证明。配置凭证后可重新生成高德底图版本。
- **业务**：充电、电量、金额、支付及告警均为软件模拟；截图中的记录不对应实际设备或收款。
- **标签**：本轮多页面标签属于静态演示 / 独立账号入口；connected 管理端采用独立界面。标签保留在当前页面会话内，刷新后从当前地址重新打开，不能把它描述为刷新持久化或跨设备同步。

### 页面清单

| 页面 | 展示内容 | 图片 |
| --- | --- | --- |
| 登录 | 原版 logo、能量核心、演示账号入口 | [登录截图](screenshots/showcase-admin-login.png) |
| 运营概览 | 全部数据指标、站点坐标分布、多页面标签 | [概览截图](screenshots/showcase-admin-dashboard.png) |
| 设备排布 | 按站点筛选、多排设备、A/B 插座状态 | [排布截图](screenshots/showcase-admin-layout.png) |
| 插座详情 | 单台设备、A/B 独立插座、模拟操作入口 | [插座截图](screenshots/showcase-admin-socket.png) |
| 订单管理 | 日期、充电状态、支付状态与账单查询 | [订单截图](screenshots/showcase-admin-orders.png) |
| 运营与告警 | 运营指标、图表和异常处理工作台 | [运营截图](screenshots/showcase-admin-operations.png) |

旧的 `showcase-admin-dashboard-amap.png` 已由本轮来源明确的 `showcase-admin-dashboard.png` 替换。README 的管理端预览与本表使用同一组文件。

## 用户端：保留的参考截图

用户端图片来自 `uni-app/` 参考实现的 H5 预览，不是微信真机截图，也不表示已通过小程序审核。当前联机用户端源码位于 `mobile-client/`；本轮只更新管理端截图，没有重新拍摄用户端。

| 展示页面 | 图片文件 |
| --- | --- |
| 找站、设备排布、开始充电、充电中、结束结算、订单、报修、个人中心 | `screenshots/mobile-*.png` |

用户端旧截图采用校园、住宅小区、园区三类通用示例。充电中、定时结束及账单由模拟时钟构造，不对应真实计量或付款。完整的当前场景目录见 [多场景演示站点](demo-scenarios.md)。

## 重新生成管理端截图

环境：项目所需 Node.js、可供脚本解析的 `playwright` 包，以及 Microsoft Edge。Playwright 是截图环境工具，不是应用生产依赖。

在 `frontend/` 目录构建并启动预览：

```bash
npm ci
npm run build:pages
npm run preview:pages
```

保持预览服务运行，在另一个终端的 `frontend/` 目录执行：

```bash
node e2e/capture-admin-showcase.cjs
```

默认目标为 `http://127.0.0.1:5207/`。指定其他已运行的静态演示地址时设置 `ADMIN_SHOWCASE_URL`。例如在 PowerShell 中：

```powershell
$env:ADMIN_SHOWCASE_URL = 'http://127.0.0.1:5207/'
node e2e/capture-admin-showcase.cjs
```

- 脚本自动填入公开演示账号，使用隔离上下文注入通用夹具，不修改用户已有会话或业务库。
- 生成 6 张 PNG 和 `admin-showcase.json`；记录当前地图模式、场景、站点数及页面脚本错误。
- 需要真实高德底图时，先按 [配置说明](configuration.md) 配置构建凭证，再设置 `ADMIN_SHOWCASE_REQUIRE_AMAP=true`。页面落入示意模式时脚本失败，不会将示意图冒充高德底图。
- 本地生成截图和更新文档不会自动发布 GitHub Pages。

用户端旧版参考截图脚本为 `frontend/e2e/capture-user-showcase.cjs`，可使用 `MOBILE_SHOWCASE_URL` 指定配套 H5 演示地址。该脚本对应 `uni-app/`，不能用来代替 `mobile-client/` 联机验收。
