# 配置说明

## 地图配置

项目确实包含高德 JavaScript API 2.0 接入。目录整理后仍保留以下调用：

| 客户端 | 实现 | 说明 |
| --- | --- | --- |
| 管理端 | `frontend/src/services/amap.js` | 加载 `webapi.amap.com/maps?v=2.0`，建立地图、标记、缩放与定位 |
| H5 | `uni-app/src/domain/amap.mjs` | 通过官方 `@amap/amap-jsapi-loader` 加载 2.0 SDK |
| 微信小程序 | `uni-app/src/components/StationMap.vue` | 使用小程序原生 map 与 openLocation；不加载浏览器 JS SDK |

### 管理端

复制 `frontend/.env.example` 为 `frontend/.env.local`，填写自己的 Web JS API 类型凭证：

```dotenv
VITE_AMAP_KEY=
VITE_AMAP_SECURITY_CODE=
ADMIN_API_PROXY_TARGET=http://127.0.0.1:8081
```

本地 Vite 必须从 `frontend/` 启动。无 Key 时保留坐标示意与站点操作；不会显示一个假的高德底图。在线静态构建仅使用显式构建环境 `PAGES_AMAP_KEY` 与 `PAGES_AMAP_SECURITY_CODE`，不会读取其他项目的私有配置。

### H5

复制 `uni-app/.env.example` 为 `uni-app/.env.local`：

```dotenv
VITE_AMAP_WEB_KEY=
AMAP_SECURITY_JSCODE=
```

Web Key 用于加载浏览器 SDK；安全码由 Vite 的 `/_AMapService` 代理附加到上游请求。生产 H5 必须提供对应代理；开发代理不会随静态文件一起部署。微信小程序填写自己的 AppID 并按小程序地图配置运行。

## 业务后端

需要 Java 17、Maven 3.9+ 与 MySQL 8。复制 `backend/.env.example` 为 `backend/.env.local`，填写自己的本地密码；`MYSQL_PASSWORD` 与 `DB_PASSWORD` 对应同一个应用数据库账户，须保持一致。

在 `backend/` 运行：

```bash
docker compose --env-file .env.local up -d mysql
```

Compose 使用独立项目名与数据卷，端口为 `127.0.0.1:13307`。`charging-service/db/` 初始化空库的 V1–V9 SQL，不会导入本机已有订单、用户或设备数据。已有库必须先备份，按已执行版本升级，不能重新执行空库初始化。

在仓库根目录运行：

```powershell
./scripts/dev-charging.ps1
```

此脚本只向当前子进程加载允许的数据库与 JWT 配置，显式使用 graduation 演示配置；不停止已有端口占用服务。端口冲突时可使用 `-Port 18085`，并同步修改两个前端的 API 代理目标。

- 管理端：`frontend/.env.connected.local` 中设置 `ADMIN_API_PROXY_TARGET`。
- 用户端：`uni-app/.env.connected.local` 中设置 `MOBILE_API_PROXY_TARGET`；`MOBILE_DEV_PORT` 可调整 H5 端口。
- 默认业务 API：8081；管理端 connected：5201；用户端 connected：5198。

## 独立账号模式

`backend/account-service` 只负责本机管理员账号、会话、资料、偏好与通知已读，H2 文件位于该模块 `runtime/`。默认端口 8092，管理端默认模式为 5195。

首次初始化账号 `admin` / `Admin@123456`，可通过 `EBIKE_ADMIN_USERNAME` 与 `EBIKE_ADMIN_PASSWORD` 设置；不会覆盖已改过的账号。它不等同于统一业务后端的 ADMIN 账号。

## 本地文件与发布边界

`.env.local`、数据库、日志、依赖、构建目录与个人小程序配置均忽略提交。源码目录整理不迁移或重置现有业务库，也不自动上传任何地图凭证。
