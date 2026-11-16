# 测试说明

## 模块验证

```bash
npm --prefix frontend ci
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend run build:pages
npm --prefix frontend run build:connected
npm --prefix uni-app ci
npm --prefix uni-app test
npm --prefix uni-app run build:h5:connected
npm --prefix uni-app run build:h5
npm --prefix uni-app run build:mp-weixin
mvn -B -f backend/pom.xml test
```

前端测试使用独立内存对象，后端集成测试使用隔离 H2 内存数据库，不修改本机账号文件或业务库。测试覆盖双插座、占用与费率快照、启动反馈、结算支付、报修、权限、地图坐标以及用户端五种充电方式。

## 浏览器验证

浏览器检查使用 Playwright 与 Microsoft Edge。先启动测试前端，再运行对应脚本：

| 脚本 | 默认目标 |
| --- | --- |
| `frontend/e2e/verify-pages.cjs` | 管理端静态子路径预览 5207 |
| `frontend/e2e/verify-energy-login.cjs` | Pages 5207 与 connected 5201；验证共享三维登录、拖拽、缩放、脉冲、登录退出和窄屏布局 |
| `frontend/e2e/verify-avatar.cjs` | 静态演示5231；`AVATAR_QA_URL`可改地址，`AVATAR_ACCOUNT_MODE=true`使用隔离账号服务 |
| `frontend/e2e/verify-dashboard-map.cjs` | 独立账号模式 5195 |
| `frontend/e2e/verify-map-interactions.cjs` | 已配置高德的独立账号模式 |
| `frontend/e2e/verify-station-picker.cjs` | 已配置高德的静态演示模式 5231；`STATION_PICKER_URL` 可改地址 |
| `frontend/e2e/verify-station-layouts.cjs` | 独立账号模式设备排布 |
| `frontend/e2e/verify-operations.cjs` | 隔离 H2 后端 18081、联网管理端 5221、联网用户端 5227 |
| `uni-app/e2e/verify-charging-plans.cjs` | 用户端本地 H5 |
| `uni-app/e2e/verify-power-completion.cjs` | 隔离用户端 H5 开发预览 5297；验证低功率显示、刷新恢复和自停结算 |
| `uni-app/e2e/verify-map.cjs` | 已配置高德的用户端本地 H5 |

`PAGES_QA_URL`、`ADMIN_MAP_BASE`、`MOBILE_QA_URL` 可指向单独测试端口。生成的截图与 JSON 留在各自 e2e 目录并忽略提交；README 只引用 `docs/screenshots/` 中挑选的展示图片。

检查线上地图时，设置 `PAGES_EXPECT_AMAP=true` 后运行 `frontend/e2e/verify-pages.cjs`，检查高德 SDK、站点标记和地图加载状态。`verify-map-interactions.cjs` 通过 `ADMIN_MAP_BASE` 指定地址，`ADMIN_MAP_USER` / `ADMIN_MAP_PASSWORD` 指定演示账号，检查滚轮、拖动及搜索定位。

浏览器测试使用独立上下文。

`verify-energy-login.cjs` 的 connected 部分通过接口桩检查账号、密码和错误响应，Pages 部分检查静态登录、聚能过渡和 WebGL 降级。用 `ENERGY_PAGES_URL`、`ENERGY_CONNECTED_URL` 指定预览地址；设置 `ENERGY_ACCOUNT_URL` 后，还会检查账号服务的重试连接按钮。

头像验收覆盖图片上传与压缩、取消不生效、右上角同步、刷新保留、无效/超大文件拒绝、恢复默认及窄屏布局。独立账号测试使用临时数据库中的`avatar_test_admin`测试账号，不应指向日常账号库。

站点选址脚本通过真实高德地图验证点击、标记拖动、地点搜索、取消、确认、保存后重读和窄屏布局，并用网络中断验证手工填写仍可用。设置 `STATION_PICKER_CONNECTED=true` 并指定 `STATION_PICKER_URL` 可对隔离测试后端验证联网保存；此模式会修改测试站点坐标，不能指向日常业务库。

`verify-operations.cjs` 必须使用临时隔离数据库及 graduation 测试账号运行，会创建示例站点、设备、费率、订单和报修；不得指向生产或日常演示数据库。它从管理端下载二维码，在用户端识别图片并启动自定义75分钟方案，核对两端订单、消息已读、报修时间线，以及故障恢复后再次告警。

功率自停测试覆盖先高后低、持续低功率窗口、短暂波动、零功率、样本重复/过期/间断、曲线积分及延迟结算。软件300 W FULL曲线在215分钟结束，约0.977 kWh。
