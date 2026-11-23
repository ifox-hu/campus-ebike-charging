# 配置说明

## 地图配置

各端地图实现如下：

| 客户端 | 实现 | 说明 |
| --- | --- | --- |
| 管理端 | `frontend/src/services/amap.js` | 加载 `webapi.amap.com/maps?v=2.0`，建立地图、标记、缩放与定位 |
| 参考用户端 H5 | `uni-app/src/domain/amap.mjs` | 通过官方 `@amap/amap-jsapi-loader` 加载 2.0 SDK |
| 参考用户端微信小程序 | `uni-app/src/components/StationMap.vue` | 使用小程序原生 map 与 openLocation；不加载浏览器 JS SDK |

### 管理端

复制 `frontend/.env.example` 为 `frontend/.env.local`，填写自己的 Web JS API 类型凭证：

```dotenv
VITE_AMAP_KEY=
VITE_AMAP_SECURITY_CODE=
ADMIN_API_PROXY_TARGET=http://127.0.0.1:8081
```

从 `frontend/` 启动 Vite。无 Key 时使用坐标示意；在线静态构建通过 `PAGES_AMAP_KEY` 与 `PAGES_AMAP_SECURITY_CODE` 配置地图。

### 参考用户端地图（uni-app）

复制 `uni-app/.env.example` 为 `uni-app/.env.local`：

```dotenv
VITE_AMAP_WEB_KEY=
AMAP_SECURITY_JSCODE=
```

Web Key 用于加载浏览器 SDK；安全码由 Vite 的 `/_AMapService` 代理附加到上游请求。生产 H5 必须提供对应代理；开发代理不会随静态文件一起部署。微信小程序填写自己的 AppID 并按小程序地图配置运行。

## 业务后端

当前联机组合为本仓库的 frontend、mobile-client，以及同级 ev-charging-platform/backend。需要 Java 17、Maven 3.9+ 与 MySQL 8。先备份已有数据库，核对同级仓库 docs/db 中已执行版本，按顺序补齐至 V16；空库依次执行 V1—V16。V13—V16包含运营商、站点归属、业务日志及历史归属字段。不要将参考工程的建表脚本用于此库。

复制 backend/.env.connected.example 为 backend/.env.connected.local，填写当前联机数据库、JWT 及中间件配置。然后在本仓库根目录运行：

```powershell
./scripts/dev-charging.ps1 -CheckOnly
./scripts/dev-charging.ps1
./scripts/dev-connected.ps1
./scripts/dev-user.ps1 -Connected
```

后端使用 graduation-demo 配置，默认 API 端口8081，管理端5201，用户端5198。启动脚本遇到端口占用会退出，不会停止已有服务。后端不在默认目录时通过 -BackendPath 指定；配置文件可用 -EnvFile 指定。

- 管理端：frontend/.env.connected.local 设置 ADMIN_API_PROXY_TARGET。
- 用户端：mobile-client/.env.connected.local 设置 MOBILE_API_PROXY_TARGET；MOBILE_DEV_PORT 可调整 H5 端口，无需复制不存在的 .env.example。
- 调整后端 -Port 后，同步修改两端代理地址。

### 参考工程

backend/charging-service 与 uni-app 保留为参考工程。backend/docker-compose.yml 使用该工程自己的 V1—V10 脚本和 .env.example/.env.local，数据库结构与当前联机后端不同，不能混用。上方 uni-app 地图配置仅适用于该参考客户端；当前 mobile-client 的运行配置见其 README。

## 独立账号模式

`backend/account-service` 只负责本机管理员账号、会话、资料、偏好与通知已读，H2 文件位于该模块 `runtime/`。默认端口 8092，管理端默认模式为 5195。

个人中心支持上传JPG、PNG、WebP头像（源文件不超过5MB），在浏览器中居中裁剪并压缩为256×256图片，点击保存后同步到右上角。可预览、取消或恢复默认首字头像。静态演示保存在当前浏览器；独立账号模式将头像随账号资料存入H2，新版启动时会以幂等语句补充头像列，保留旧账号及资料。服务端只接受有尺寸和长度限制的PNG/JPEG图片数据，不保存外部图片链接。

独立账号服务首次初始化账号为 `admin` / `Admin@123456`，可通过 `EBIKE_ADMIN_USERNAME` 与 `EBIKE_ADMIN_PASSWORD` 设置。已有账号保留原密码。

## 本地配置文件

`.env.local`、数据库、日志、依赖、构建目录与个人小程序配置均由 Git 忽略。数据库升级步骤见 [部署说明](deployment.md)。
