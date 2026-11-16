# 移动端后端联调

用户端通过统一业务 API 完成注册登录、找站、选择插座、启动充电、订单查询、结束结算、模拟支付和报修反馈。管理端连接同一后端。

## 接口

路径以 `/api` 开头，成功响应包含 `code`、`message`、`data` 和 `timestamp`。登录、注册匿名调用，其他请求携带 `Authorization: Bearer <token>`。

| 接口 | 用途 |
| --- | --- |
| `POST /auth/login`、`POST /auth/register`、`GET /auth/me` | 登录、注册和读取当前用户 |
| `GET /stations`、`GET /chargers`、`GET /connectors` | 读取站点、设备和插座 |
| `GET /price-periods?stationId=` | 查询站点分时电价 |
| `GET /customer/orders`、`GET /customer/orders/{id}` | 查询本人订单和订单详情 |
| `POST /customer/orders/start` | 提交插座、时长和充电模式 |
| `POST /customer/orders/{id}/stop` | 结束订单 |
| `POST /customer/orders/{id}/mock-payment` | 提交模拟支付渠道 |
| `GET /customer/repairs`、`POST /customer/repairs` | 查询和提交本人报修 |
| `POST /customer/orders/{id}/alipay-sandbox/checkout` | 获取支付宝沙箱结算入口 |
| `POST /customer/orders/{id}/alipay-sandbox/mini-checkout` | 小程序沙箱结算 |
| `POST /customer/orders/{id}/alipay-sandbox/query` | 查询沙箱支付状态 |

接口实现位于 `src/api/client.mjs`，数据映射位于 `src/api/mapping.mjs`，请求与页面状态协调位于 `src/api/customer-store.mjs`。

## 状态与单位

- 站点使用 `OPERATING` 等运营状态，设备区分在线、离线和停用，插座区分空闲、充电和故障。
- 充电状态与支付状态分别保存。页面根据服务端响应更新订单、插座和账单。
- 服务端金额单位为元、电量单位为kWh，适配层转换为界面使用的分和Wh。
- 历史订单使用启动时的功率和费率快照，缺失字段显示“—”。
- 页面展示服务端时间，当前任务按刷新和轮询更新。

## 会话与异常

登录凭证按 API 地址保存。401、退出及换号时清空账号数据，请求版本号用于丢弃旧会话的迟到响应。

刷新失败时保留上次完整快照，并显示同步时间和重试入口。启动、停止、支付和报修提交期间禁用重复操作；修改请求超时后提示刷新核对结果。

## 本地运行

在 `mobile-client/` 执行：

```bash
npm ci
npm run dev:connected
```

默认 H5 地址为 `http://127.0.0.1:5198/`，`/api` 代理到 `http://127.0.0.1:8081`。调整后端地址时，在 `.env.connected.local` 设置 `MOBILE_API_PROXY_TARGET`。

## 构建部署

H5 使用 `npm run build:h5:connected`，部署时由同源网关转发 `/api`。

微信端在 `.env.connected.local` 设置 `VITE_API_BASE_URL=https://你的服务域名/api`，配置 AppID 和 HTTPS request 合法域名，再构建并用微信开发者工具导入。完整步骤见 [部署说明](../../docs/deployment.md)。

## 联调步骤

1. 在测试数据库中准备普通用户、管理员、运营员及站点设备。
2. 用户登录后读取站点与费率，选择空闲插座启动订单。
3. 管理端按订单编号核对方案、占用和费率快照。
4. 用户结束订单并模拟支付，两端核对账单与插座状态。
5. 用户提交报修，管理员分派，运营员记录结果，用户查询进度。
6. 检查重复提交、401、断网重试、换号及退出后的数据清理。

自动化命令见 [测试说明](../../docs/testing.md)，已有联机记录见 [联机测试记录](../../docs/graduation-acceptance.md)。
