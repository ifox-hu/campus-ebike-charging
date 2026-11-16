# 部署说明

管理端、业务后端、独立账号服务、H5 与微信小程序分别构建和部署。

## 联机运行

以本仓库父目录为工作区：

1. 业务后端：`ev-charging-platform/backend/`，Java 17。启动前备份 MySQL 数据库，按版本顺序执行 `ev-charging-platform/docs/db/` 中的升级脚本，补齐 `V11__graduation_scene_and_repair_progress.sql`。V11 增加场景、报修进度字段和告警确认表。
2. 管理端：`campus-ebike-charging/frontend/`，运行 `npm run dev:connected`，默认5201，代理8081；`npm run build:connected`输出 `dist-connected/`。
3. 用户端：`campus-ebike-charging/mobile-client/`，运行 `npm run dev:connected`，默认5198，代理8081；H5构建使用 `npm run build:h5:connected`，微信构建使用 `npm run build:mp-weixin`。微信端配置 AppID 和合法域名后，用开发者工具导入构建目录。
4. 管理端与用户端配置相同的 API 地址，连接同一业务后端和数据库。

只需回退应用时可保留V11新增字段；不要通过删列回滚，否则会丢失场景与进度记录。数据库变更前的备份应由部署者验证可恢复。

## 本仓库参考实现与静态演示

本仓库同时保留 `backend/charging-service/` 与 `uni-app/` 参考实现，构建方式如下。

## 管理端

从 `frontend/` 安装依赖和构建。静态演示输出 `dist-pages/`，业务接口模式输出 `dist-connected/`。子路径静态站点通过 `PAGES_BASE_PATH` 指定资源前缀。工作流已更新为使用 `frontend/package-lock.json` 和 `frontend/dist-pages/`。

在 GitHub Secrets 中配置 `AMAP_WEB_KEY` 与 `AMAP_SECURITY_CODE`。工作流读取这两个变量构建高德地图，并检查配置是否完整。

本地未设置 `PAGES_REQUIRE_AMAP=true` 时仍可构建坐标示意模式，用于离线预览。公开静态演示使用浏览器端安全码配置；Web Key 与浏览器安全码随 SDK 在访问者浏览器中使用，不是服务端私密存储。正式服务推荐使用高德 `serviceHost` 代理，并在高德控制台限制允许的部署域名。

## 后端与用户端

业务 API 从 `backend/charging-service/` 构建，独立账号服务从 `backend/account-service/` 构建；聚合 `backend/pom.xml` 提供统一测试。生产服务需要自己的 HTTPS、数据库、反向代理与进程管理。

H5 输出 `uni-app/dist/build/h5/`。若使用高德安全码代理，静态服务器需实现 `/_AMapService` 对应转发；开发 Vite 代理不包含在产物中。微信小程序使用 `uni-app/dist/build/mp-weixin/`，填写真实 AppID 后在开发者工具编译、体验与发布。

详见 [配置说明](configuration.md)。开发数据库卷与运行文件保持本地，不随源码或镜像模板发布。
