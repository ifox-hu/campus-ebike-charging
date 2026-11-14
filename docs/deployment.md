# 部署说明

管理端、业务后端、独立账号服务、H5 与微信小程序是独立部署目标。目录整理不会将 Java 服务打包进静态管理页面。

## 本轮最终联机组合

以本仓库父目录为工作区：

1. 业务后端：`ev-charging-platform/backend/`，Java 17；生产启动前先备份指定MySQL数据库，按已有版本顺序核对 `ev-charging-platform/docs/db/`，本轮增加 `V11__graduation_scene_and_repair_progress.sql`。V11只加字段和告警确认表，不清空历史数据；未执行时不要先启动新版应用。
2. 管理端：`campus-ebike-charging/frontend/`，运行 `npm run dev:connected`，默认5201，代理8081；`npm run build:connected`输出 `dist-connected/`。
3. 用户端：`campus-ebike-charging/mobile-client/`，运行 `npm run dev:connected`，当前本地配置5198，代理8081；H5运行 `npm run build:h5:connected`，微信构建 `npm run build:mp-weixin`。AppID、合法域名及开发者工具、真机验证另行完成。
4. 两端必须指向同一业务后端与数据库。静态Pages不接入该验收链路。本轮测试使用独立H2，未对现有MySQL执行V11，未执行实际部署。源码推送不等于服务已部署。

只需回退应用时可保留V11新增字段；不要通过删列回滚，否则会丢失场景与进度记录。数据库变更前的备份应由部署者验证可恢复。

## 本仓库参考实现与静态演示

以下是本仓库内另一实现的原有部署方法，不属于上述最终联机组合。

## 管理端

从 `frontend/` 安装依赖和构建。静态演示输出 `dist-pages/`，业务接口模式输出 `dist-connected/`。子路径静态站点通过 `PAGES_BASE_PATH` 指定资源前缀。工作流已更新为使用 `frontend/package-lock.json` 和 `frontend/dist-pages/`。

公开构建仅使用显式的地图构建变量。线上工作流要求 GitHub Secrets `AMAP_WEB_KEY` 与 `AMAP_SECURITY_CODE`，缺少任意一项会中止发布，不会把未配置地图的页面当作正常在线版本。凭证不会写入仓库源码，也不会从其他本机工程隐式读取。

本地未设置 `PAGES_REQUIRE_AMAP=true` 时仍可构建坐标示意模式，用于离线预览。公开静态演示使用浏览器端安全码配置；Web Key 与浏览器安全码随 SDK 在访问者浏览器中使用，不是服务端私密存储。正式服务推荐使用高德 `serviceHost` 代理，并在高德控制台限制允许的部署域名。

## 后端与用户端

业务 API 从 `backend/charging-service/` 构建，独立账号服务从 `backend/account-service/` 构建；聚合 `backend/pom.xml` 提供统一测试。生产服务需要自己的 HTTPS、数据库、反向代理与进程管理。

H5 输出 `uni-app/dist/build/h5/`。若使用高德安全码代理，静态服务器需实现 `/_AMapService` 对应转发；开发 Vite 代理不包含在产物中。微信小程序使用 `uni-app/dist/build/mp-weixin/`，填写真实 AppID 后在开发者工具编译、体验与发布。

详见 [配置说明](configuration.md)。开发数据库卷与运行文件保持本地，不随源码或镜像模板发布。
