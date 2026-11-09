# 部署说明

管理端、业务后端、独立账号服务、H5 与微信小程序是独立部署目标。目录整理不会将 Java 服务打包进静态管理页面。

## 管理端

从 `frontend/` 安装依赖和构建。静态演示输出 `dist-pages/`，业务接口模式输出 `dist-connected/`。子路径静态站点通过 `PAGES_BASE_PATH` 指定资源前缀。工作流已更新为使用 `frontend/package-lock.json` 和 `frontend/dist-pages/`。

公开构建仅使用显式的地图构建变量。线上工作流要求 GitHub Secrets `AMAP_WEB_KEY` 与 `AMAP_SECURITY_CODE`，缺少任意一项会中止发布，不会把未配置地图的页面当作正常在线版本。凭证不会写入仓库源码，也不会从其他本机工程隐式读取。

本地未设置 `PAGES_REQUIRE_AMAP=true` 时仍可构建坐标示意模式，用于离线预览。公开静态演示使用浏览器端安全码配置；Web Key 与浏览器安全码随 SDK 在访问者浏览器中使用，不是服务端私密存储。正式服务推荐使用高德 `serviceHost` 代理，并在高德控制台限制允许的部署域名。

## 后端与用户端

业务 API 从 `backend/charging-service/` 构建，独立账号服务从 `backend/account-service/` 构建；聚合 `backend/pom.xml` 提供统一测试。生产服务需要自己的 HTTPS、数据库、反向代理与进程管理。

H5 输出 `uni-app/dist/build/h5/`。若使用高德安全码代理，静态服务器需实现 `/_AMapService` 对应转发；开发 Vite 代理不包含在产物中。微信小程序使用 `uni-app/dist/build/mp-weixin/`，填写真实 AppID 后在开发者工具编译、体验与发布。

详见 [配置说明](configuration.md)。开发数据库卷与运行文件保持本地，不随源码或镜像模板发布。
