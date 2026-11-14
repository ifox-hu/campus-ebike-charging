# 移动端接口对齐与联调记录

更新：2026-11-09。开发位置：`D:/codex/.codex/worktrees/bike-mobile/yun-mobile`，分支 `codex/bike-mobile`。

最新状态（覆盖下文早期审计中的待办）：无车牌启动、服务端自动模拟计量、停止结算、启动费率快照、模拟支付、用户报修及管理员反馈已接通。已移除“加15／90分钟”按钮及加时接口；软件计量按实际经过时间和启动时保存的功率计算，刷新不会额外增加时长。旧 8081 常驻实例未替换；联调使用 18081 隔离实例。

最新联调脚本为 `node qa/verify-graduation.cjs`，连接 H5 5198、管理端 5201、后端 18081，使用独立 H2 数据库。脚本等待约两分钟自然累计电量后完成结算支付，并验证报修反馈及本人权限；结果见 `qa/graduation-verification.json`。下文旧脚本和审计是历史记录，当前上线仍需先执行后端 V6/V7 数据库迁移。微信开发者工具、真机、真实设备和真实支付不属于本轮验收。

## 本轮依据与范围

按“文档”聊天的项目参考完善版要求，使用站点—设备—插座模型，分离订单与支付状态，逐步从本地演示接入唯一后端。接口审计基准是 `bike-integration/ev-charging-platform` 的 `1f881ef`。后端尚未实现的内容作为依赖明确列出；本轮没有修改后端业务源码、管理端或共享数据库。

本轮接入账号注册登录、站点设备和插座读取、分时费率、本人订单、订单详情、服务端模拟支付以及停止请求。停止失败时保持服务端订单状态，不在前端补电量或自行结算。启动与在线报修保留明确的未开放提示。

## 已核验的接口

所有路径以 `/api` 开头，成功响应使用 `{code:200或201,message,data,timestamp}`。登录与注册匿名调用；其余调用传 `Authorization: Bearer <token>`。

| 接口 | 当前接入 | 实现依据 |
| --- | --- | --- |
| `POST /auth/login`、`POST /auth/register`、`GET /auth/me` | 注册、登录、用户校验和退出；仅接受 USER 角色 | AuthController / AuthDtos / AuthService |
| `GET /stations`、`GET /chargers`、`GET /connectors` | 组装站点、设备、插座关系；保留服务端 ID 与编码 | StationController / DeviceController 及实体 |
| `GET /price-periods?stationId=` | 展示完整分时费率，不假设全天固定价格 | PriceController / PricePeriod |
| `GET /customer/orders`、`GET /customer/orders/{id}` | 本人订单与详情，活动订单页面可见时每 5 秒读取详情 | CustomerOrderController / ChargeOrder |
| `POST /customer/orders/{id}/mock-payment` | 使用 `{method:"WECHAT"}`，结果以服务端响应为准 | CustomerOrderController.Payment |
| `POST /customer/orders/{id}/stop` | 发起停止；保留失败原因，成功后使用响应替换订单 | CustomerOrderController.stop |
| `POST /customer/orders/start` | 后端已改为仅接收 stationId、connectorId；界面暂缓开放，等待配套结算 | 新增 OrderRequests.CustomerStart；旧管理端 DTO 保留历史兼容 |
| 在线报修 | 暂不请求未知路径，不混用本地报修记录 | 当前未发现报修 controller/domain/table |

接口表中的路径相对 `/api`。适配模块在 `src/api`，共享交互状态在 `src/store.js`；模拟规则仍在 `src/domain/charging.mjs`。

## 状态、单位与数据隔离

- 服务端站点 `OPERATING` 才可用，设备 `ONLINE`/`OFFLINE` 与停用分开，插座 `IDLE`/`CHARGING`/`FAULT` 分别映射为空闲、充电、故障。未知状态保持不可用。
- 后端当前订单主要返回 `CHARGING`、`COMPLETED`，支付单独返回 `UNPAID`、`PAID`、`NOT_REQUIRED`。前端还具备启动中、启动失败和未知状态的展示与过滤；不声称当前后端已经产生这些启动状态。
- 服务端费用字段单位为元，电量为 kWh；仅在适配边界转换为现有界面使用的分与 Wh。缺失数值显示“—”，不补零。不用当前费率重算历史订单，不由浏览器时间推进服务端电量或账单。
- Java LocalDateTime 没有偏移信息，页面原样展示服务端本地时间；结束时长按起止时间读取，不伪造实时运行时长。
- 本地演示与接口模式分别初始化；接口模式没有演示站点、订单或本地报修，接口失败不回退到模拟数据。仅保存按接口地址隔离的登录凭证及到期时间，不保存密码，也不把服务端订单写入演示恢复缓存。
- 401 清空会话及账号数据；退出和换号也清空数据。请求版本校验丢弃退出前的迟到响应。刷新、轮询与支付/停止之间防止旧响应覆盖新结果，重复提交期间禁用按钮。修改请求不自动重试；网络超时提示结果未确认，用户刷新核对。
- 在线报修未开放；接口模式暂不使用示意地图定位后端真实站点，以免把演示坐标当作服务端位置。

## 启动方式

默认仍可运行原本地演示：`npm run dev:h5`，地址 `http://127.0.0.1:5197/`。

H5 接口模式使用 `npm run dev:connected`，地址 `http://127.0.0.1:5198/`。`.env.connected` 将 `/api` 代理到本机 8081；需要更换后端时在不提交的 `.env.connected.local` 设置 `MOBILE_API_PROXY_TARGET`。没有内置正式账号或密码，可使用普通用户账号登录或注册。

生产 H5 可执行 `npm run build:h5:connected`，部署时由同源网关转发 `/api`。开发代理不会自动进入生产构建。

微信接口构建需在本机 `.env.connected.local` 设置 `VITE_API_BASE_URL=https://你的开发服务域名/api`，再执行 `npm run build:mp-weixin -- --mode connected`。微信不能使用 H5 的相对代理地址，手机上的 localhost 也不是电脑。正式运行需配置自有 AppID、HTTPS request 合法域名并使用开发者工具及真机验收。构建不会证明微信联网、扫码或胶囊布局实际可用。

## 可重复的隔离联调

`qa/BackendSmokeServer.java` 使用现有后端的真实 Controller、Service、Security 和 MyBatis Mapper，在独立 JVM 的 H2 内存库中准备两组虚构账号、一个站点和订单。它不接触正在运行的 8081 数据库，18081 测试实例退出后数据消失。它是测试工具，不是新增业务后端；不用于生产部署或证明 MySQL 迁移已完成。

先在后端 `backend` 目录生成测试类路径（该文件已被移动端 Git 忽略）：

```powershell
mvn -B -DskipTests test-compile dependency:build-classpath '-Dmdep.includeScope=test' '-Dmdep.outputFile=D:/codex/.codex/worktrees/bike-mobile/yun-mobile/qa/backend-classpath.txt'
```

在移动端目录另开终端启动一次性测试实例：

```powershell
$qaBackendRoot='D:/codex/.codex/worktrees/bike-integration/ev-charging-platform/backend'
$qaDependencies=(Get-Content -Raw qa/backend-classpath.txt).Trim()
$qaClasspath="$qaBackendRoot/target/test-classes;$qaBackendRoot/target/classes;$qaDependencies"
java '-Dfile.encoding=UTF-8' --class-path $qaClasspath qa/BackendSmokeServer.java
```

再在另一终端执行：

```powershell
$env:MOBILE_API_PROXY_TARGET='http://127.0.0.1:18081'
npm run dev:connected
```

另开终端，安装仅用于验收的可选 Playwright 后运行 `node qa/verify-connected.cjs`。需已安装 Microsoft Edge。输出在 `qa/connected-verification.json`，截图被 Git 忽略。每次重跑应先重启一次性测试实例，恢复初始未支付订单。`qa/verify-mobile.cjs` 继续验证 5197 的原本地演示。

## 后端接续依赖

1. 用户端车牌必填及空指针已在后端分支修复，专用启动请求仅含 stationId、connectorId。后续部署对应版本，并在停止、费率等配套完成后开放移动端启动入口。
2. 明确启动中、启动确认、启动失败与原因的真实状态及字段；当前后端仍主要是同步启动后返回 CHARGING，前端不能代造这些结果。
3. 让停止结算使用可信服务端计量。当前关闭模拟器时，用户停止接口传空 Stop，实测返回 400；前端没有提交任意电量或直接改成已结束。
4. 订单增加真实费率快照及历史关联信息。当前实体不返回费率快照，停止服务读取当前 price_period；前端只展示服务端账单，无法补救服务端历史计费规则。
5. 提供本人报修与管理员处理结果的确定契约。届时再开放提交、记录与结果查询。
6. 确认真实站点位置与地图集成后，再替换演示地图；随后完成微信开发者工具及真机验收。

以上为后端接续事项，不属于本轮已完成能力；最新命令结果与隔离联调证据见 QA 文件。

## 本轮验证结果

30 项 Node 测试通过；本地与接口模式的 H5、mp-weixin 构建通过。原本地 H5 充电/支付/报修闭环回归通过。真实后端与独立 H2 联调覆盖注册登录、实际编码与费率、本人订单权限、支付持久化、停止失败、401、断网重试、换号及退出，另验证有效会话离线启动后可重新连接。两种 H5 模式均检查了 320/390px 页面，无横向溢出，页面运行错误为 0。微信开发者工具与真机尚未验收，MySQL 迁移未在本轮执行。
