# 电动自行车智慧充电管理系统 · 管理端

Vue 3 + Vite + ECharts 管理后台。管理端截图及功能总览见 [项目 README](../README.md#管理端)。

面向校园、住宅小区、医院、产业园区及企事业单位办公区，以校园为重点演示场景。新增或编辑站点时选择应用场景，运营统计使用相同分类；“办公区”为界面简称，保留旧“园区”分类，商业配套作为扩展场景。各场景共用设备排、双插座、费率、订单及报修流程。

## 本地静态演示

在本目录执行，无需启动 Java 或 MySQL：

```bash
npm ci
npm run dev:pages
```

默认地址 `http://127.0.0.1:5207/`，演示账号 `demo` / `demo123`，演示数据保存在当前浏览器。

- 登录页、侧栏和浏览器图标统一使用毕设原版紫蓝色闪电 logo。
- 三维登录场景支持旋转、缩放、脉冲与键盘控制，登录成功后播放聚能动画。
- 打开的页面在顶部保留标签，支持切换和关闭；切换保留筛选条件，关闭当前页后转到相邻页。
- 站点地图支持高德底图和坐标示意。

## 运行模式

| 命令 | 默认端口 | 数据与用途 |
| --- | --- | --- |
| `npm run dev:pages` | 5207 | 浏览器本地静态演示，README 管理端截图采用此模式 |
| `npm run dev:connected` | 5201 | 连接统一业务 API，用于双端联调，界面与静态演示有所不同 |
| `npm run dev` | 5195 | 连接独立账号服务；充电业务仍为浏览器模拟 |

高德地图配置见 [配置说明](../docs/configuration.md)，双端联调步骤见 [部署说明](../docs/deployment.md)。

## 验证与构建

```bash
npm test
npm run build:pages
npm run preview:pages
```

构建产物位于 `dist-pages/`，推送到 `main` 后由 GitHub Actions 发布。

## 更新管理端截图

先构建并运行预览，在另一个终端的本目录执行：

```bash
node e2e/capture-admin-showcase.cjs
```

截图环境需安装 Playwright 并提供 Microsoft Edge；脚本使用独立浏览器上下文，生成登录、概览、排布、插座、订单和运营告警 6 张实拍截图，以及 `docs/screenshots/admin-showcase.json` 环境记录。可通过 `ADMIN_SHOWCASE_URL` 指定地址；高德底图为硬性要求时，设置 `ADMIN_SHOWCASE_REQUIRE_AMAP=true`。详细来源和数据范围见 [展示说明](../docs/showcase.md)。
