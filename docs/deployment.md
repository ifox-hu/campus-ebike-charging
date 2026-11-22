# 部署说明

管理端、业务后端、独立账号服务、H5 与微信小程序分别构建和部署。

## 联机运行

以本仓库父目录为工作区：

1. 业务后端：`ev-charging-platform/backend/`，Java 17。启动前备份 MySQL 数据库，按版本顺序执行 `ev-charging-platform/docs/db/` 中的升级脚本，补齐至 `V16__historical_operator_ownership.sql`。V13 增加运营商及站点归属，V14 增加合作资料和站点营业信息，V15 增加业务日志字段，V16 回填历史订单、报修的运营商归档。按版本执行一次，现有站点及运营员默认归入平台自营。
2. 管理端：`campus-ebike-charging/frontend/`，运行 `npm run dev:connected`，默认5201，代理8081；`npm run build:connected`输出 `dist-connected/`。
3. 用户端：`campus-ebike-charging/mobile-client/`，运行 `npm run dev:connected`，默认5198，代理8081；H5构建使用 `npm run build:h5:connected`，微信构建使用 `npm run build:mp-weixin`。微信端配置 AppID 和合法域名后，用开发者工具导入构建目录。
4. 管理端与用户端配置相同的 API 地址，连接同一业务后端和数据库。

从主仓库根目录，在三个终端分别运行：

```powershell
./scripts/dev-charging.ps1
./scripts/dev-connected.ps1
./scripts/dev-user.ps1 -Connected
```

后端脚本读取 `backend/.env.connected.local`，配置模板为 `backend/.env.connected.example`；也可通过 `-EnvFile` 指定文件。脚本启动配套后端的 `graduation-demo` 配置。使用 `-CheckOnly` 可查看后端路径和配置文件，用户端脚本也支持 `-CheckOnly`。详情见[配置说明](configuration.md#业务后端)。

充满自停在软件计量模式下使用功率曲线；启用TCP模拟器后，按连续功率采样判断，满足持续低功率条件后确认停止并结算。采样中断会清除连续判断记录，停止失败后保留占用并重试，最长充电时限为12小时。

只需回退应用时可保留 V11 至 V16 新增字段。执行数据库变更前，验证备份可恢复。

联网后用平台管理员进入「运营商管理」，创建运营商并配置运营账号。到「站点管理」新增站点，再返回分配站点归属。运营商管理员登录后可维护名下的双插座设备和分时费率，并查看本运营商的订单、服务用户、报修和经营统计，在「团队账号」中维护值班运营员。平台管理员通过「统计分析」和「操作日志」查看各运营商的业务及配置变更。

## 本仓库参考实现与静态演示

联机演示统一使用上面的三项工程。本仓库的 `backend/charging-service/` 与 `uni-app/` 保留为参考工程，单独构建，不与当前用户端交叉使用。

## 管理端

从 `frontend/` 安装依赖和构建。静态演示输出 `dist-pages/`，业务接口模式输出 `dist-connected/`。子路径静态站点通过 `PAGES_BASE_PATH` 指定资源前缀。工作流已更新为使用 `frontend/package-lock.json` 和 `frontend/dist-pages/`。

在 GitHub Secrets 中配置 `AMAP_WEB_KEY` 与 `AMAP_SECURITY_CODE`。工作流读取这两个变量构建高德地图，并检查配置是否完整。

本地未设置 `PAGES_REQUIRE_AMAP=true` 时仍可构建坐标示意模式，用于离线预览。公开静态演示使用浏览器端安全码配置；Web Key 与浏览器安全码随 SDK 在访问者浏览器中使用，不是服务端私密存储。正式服务推荐使用高德 `serviceHost` 代理，并在高德控制台限制允许的部署域名。

## 参考工程构建

业务 API 从 `backend/charging-service/` 构建，独立账号服务从 `backend/account-service/` 构建；聚合 `backend/pom.xml` 提供统一测试。生产服务需要自己的 HTTPS、数据库、反向代理与进程管理。

H5 输出 `uni-app/dist/build/h5/`。若使用高德安全码代理，静态服务器需实现 `/_AMapService` 对应转发；开发 Vite 代理不包含在产物中。微信小程序使用 `uni-app/dist/build/mp-weixin/`，填写真实 AppID 后在开发者工具编译、体验与发布。

详见 [配置说明](configuration.md)。开发数据库卷与运行文件保持本地，不随源码或镜像模板发布。
