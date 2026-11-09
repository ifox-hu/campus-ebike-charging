# 部署说明

管理端、业务后端、独立账号服务、H5 与微信小程序是独立部署目标。目录整理不会将 Java 服务打包进静态管理页面。

## 管理端

从 `frontend/` 安装依赖和构建。静态演示输出 `dist-pages/`，业务接口模式输出 `dist-connected/`。子路径静态站点通过 `PAGES_BASE_PATH` 指定资源前缀。工作流已更新为使用 `frontend/package-lock.json` 和 `frontend/dist-pages/`。

公开构建仅使用显式的地图构建变量。缺少地图凭证时保留示意模式；不会从其他本机工程读取 Key。

## 后端与用户端

业务 API 从 `backend/charging-service/` 构建，独立账号服务从 `backend/account-service/` 构建；聚合 `backend/pom.xml` 提供统一测试。生产服务需要自己的 HTTPS、数据库、反向代理与进程管理。

H5 输出 `uni-app/dist/build/h5/`。若使用高德安全码代理，静态服务器需实现 `/_AMapService` 对应转发；开发 Vite 代理不包含在产物中。微信小程序使用 `uni-app/dist/build/mp-weixin/`，填写真实 AppID 后在开发者工具编译、体验与发布。

详见 [配置说明](configuration.md)。开发数据库卷与运行文件保持本地，不随源码或镜像模板发布。
