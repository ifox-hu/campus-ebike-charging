# 管理端统一业务后端接入

日期：2026-11-09。基于项目参考完善版与现有后端 1f881ef 接口，不修改并行移动端或后端源码。

本轮采用 lean-build 工作流推进一条可验收的真实数据路径：独立 Vite connected 模式，接入原 Spring Boot 的管理员登录、站点、设备/插座、订单、普通用户、费率和审计读取，并使用真实接口启停普通用户。保留 5195 本地模拟版，接口模式为 5199，分别加载入口；接口失败不得回退模拟站点或订单，也不把服务端数据写回模拟缓存。

## 接口与限制

- 登录 POST /api/auth/login，随后 GET /api/auth/me 验证 ADMIN；令牌仅保存在页面内存，刷新后重新登录，不保存密码。
- GET /api/stations、/chargers、/connectors、/orders；设备在线、插座、订单、支付状态分别展示，服务端费用保持元与 kWh，不根据当前费率重算历史账单。
- GET /api/auth/users?role=USER&page=&size=20；PATCH /api/auth/users/{id}/status?enabled= 修改普通用户启停。
- GET /api/price-periods?stationId= 展示完整分时费率，不假设统一全天单价。
- GET /api/audit-logs?page=&size=20 读取真实后端审计记录，不混用本地订单事件。
- 后端缺少排号、双插座约束、独立启停与故障字段、二轮启动状态及报修接口。接口版照实显示，暂不提供不受后端支持的修改、充电控制或报修提交。
- 不加入车型、车牌、预约、充值钱包、退款或商业运营角色管理。

## 实施计划

- [x] 请求层与状态映射先写失败测试，覆盖角色、未登录、401、超时、换号迟到响应与用户启停。
- [x] 实现与模拟数据隔离的 connected 入口、七模块导航及服务端列表/详情/加载错误状态。
- [x] 使用隔离内存数据库上的真实后端验证登录、站点设备、订单金额、普通用户启停、日志和会话边界。
- [x] 回归本地模拟版，双模式构建并记录可复现启动方法。

## 启动与部署

在本项目目录运行 `npm run dev:connected` 或 `启动后端联调.ps1`，打开 http://127.0.0.1:5199/ 。默认连接 8081 业务后端，使用其已有 ADMIN 账号；5195 的 `admin` 账号只属于独立账号服务，不能当作业务后端账号。

更换本机开发目标可在不提交的 `.env.connected.local` 设置 `ADMIN_API_PROXY_TARGET=http://127.0.0.1:端口` 后重启服务。它是 Vite 服务端代理配置，不把凭证写入构建包。`npm run build:connected` 输出 dist-connected，原本地版输出 dist。生产构建须由同源网关转发 `/api`；Vite 开发代理不包含在静态文件里。

`npm test` 验证全部领域与请求层测试。本轮 27 项通过，两个构建通过。原本地版仍存在图表包体积提示，接口版不加载模拟业务和图表代码。

## 隔离验收复现

`qa/AdminBackendSmokeServer.java` 基于并行移动端已存在的验收工具，复用原后端真实 Controller/Service/Security/MyBatis，在独立 18082 端口和 H2 内存数据库运行。添加的 admin_qa 只是固定、虚构的测试账号，不是生产管理员。没有修改后端业务文件或已有数据库。

先在原后端 backend 目录生成测试类路径，将最后参数替换为本项目 qa/backend-classpath.txt 的绝对位置：

```powershell
mvn -q -DskipTests test-compile dependency:build-classpath '-Dmdep.includeScope=test' '-Dmdep.outputFile=C:/Users/Lenovo/Documents/ChatGPT/毕设充电桩/慧知界面复刻/qa/backend-classpath.txt'
```

在本项目目录启动一次性服务：

```powershell
$backendRoot='D:/codex/.codex/worktrees/bike-integration/ev-charging-platform/backend'
$dependencies=(Get-Content -Raw qa/backend-classpath.txt).Trim()
$classpath="$backendRoot/target/test-classes;$backendRoot/target/classes;$dependencies"
java '-Dfile.encoding=UTF-8' --class-path $classpath qa/AdminBackendSmokeServer.java
```

另一终端可运行 `node qa/verify-platform.mjs`。该脚本固定访问本机 18082，验证账号权限、站点/设备/插座、金额、用户停用后拒绝登录、恢复状态、审计记录与退出，不访问 8081。服务退出后该库数据消失。

用于查看本轮验收界面：设置 `ADMIN_API_PROXY_TARGET=http://127.0.0.1:18082`，运行 `node node_modules/vite/bin/vite.js --mode connected --host 127.0.0.1 --port 5200 --strictPort`。验收账号 admin_qa / admin-qa-password，仅属于内存测试库。刷新页面后需重新登录。

## 实测结果与剩余阻塞

隔离库含 1 个站点、1 台双插座设备、3 条订单。浏览器验证管理员登录、设备插座详情、订单金额、分时费率、普通用户停用/恢复及真实 PATCH 审计；普通用户进入管理端被拒绝。后端验证脚本重复运行通过并恢复测试用户为启用。界面无控制台错误。截图：后端联调-服务端概览.jpg、后端联调-订单费用.jpg。

同时实测原 8081 登录接口返回 500，日志存在数据库连接被拒绝，Docker 命令报告引擎管道不可用。未擅自将其切换到另一套本机数据库或重置原库。本轮只证明接入层在隔离服务上真实工作，不代表原 MySQL 环境已恢复。

后续须恢复原基础依赖，再适配二轮启动/停止结算、设备排与双插座、历史费率快照、报修接口，最后扩展站点设备费率的正式写入与跨端完整充电验收。接口模式暂不提供这些未适配操作。

## 本机启动恢复记录

用户随后要求前端与后端全部启动。本次启动 Docker Desktop 后，原 ev-charging-local 的 MySQL、Redis、RabbitMQ 自动恢复且健康，未重建或清空数据卷。8081 的管理员登录已返回 200，ADMIN 身份及站点/订单读取通过（原库读取到 2 个站点、0 条订单），前述数据库连接故障已恢复。5195 管理端与 5197 H5 已在 Edge 打开，5198/5199 的接口模式也返回页面 200。业务适配限制仍按前文说明。
