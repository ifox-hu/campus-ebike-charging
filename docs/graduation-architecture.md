# 联机架构与业务状态

管理端与用户端共用业务 API。设备排保存在管理目录中，订单和工单通过业务数据库 ID 关联资源。

## 系统架构

```mermaid
flowchart LR
 U[uni-app 用户端 mobile-client] -->|认证与业务 API| B[Spring Boot ev业务后端]
 A[Vue 3 connected管理端] -->|同一 API| B
 B --> D[(MySQL 业务数据库)]
 B --> S[后端计量与到期调度]
 B -.可选测试.-> P[支付宝沙箱]
 U --> L[按账号隔离的本机收藏与浏览历史]
 X[Pages 静态演示] --> Y[独立浏览器模拟数据]
```

自动测试使用 H2 数据库，部署使用 MySQL。Pages 演示数据保存在浏览器。

## 数据关系

```mermaid
erDiagram
 SYS_USER ||--o{ CHARGE_ORDER : owns
 SYS_USER ||--o{ REPAIR_TICKET : reports
 SYS_USER ||--o{ REPAIR_TICKET : assigned
 STATION ||--o{ CHARGER : contains
 CHARGER ||--o{ CONNECTOR : contains
 STATION ||--o{ PRICE_PERIOD : prices
 STATION ||--o{ CHARGE_ORDER : locates
 CONNECTOR ||--o{ CHARGE_ORDER : charges
 CHARGER ||--o{ REPAIR_TICKET : reports
 CONNECTOR o|--o{ REPAIR_TICKET : optional
 STATION { bigint id PK string scene string status }
 CHARGER { bigint id PK bigint station_id FK bigint status_revision }
 CONNECTOR { bigint id PK bigint charger_id FK int power_watts string status bigint status_revision }
 CHARGE_ORDER { bigint id PK bigint connector_id FK string owner_username string charge_mode string price_snapshot string metering_source string status string payment_status }
 REPAIR_TICKET { bigint id PK string owner_username string assignee_username string status string progress_history string request_key }
 ALERT_ACKNOWLEDGEMENT { string alert_key PK string note string username datetime updated_at }
```

布局目录与业务资源通过 `management_catalog_link` 映射，历史订单保存名称、功率及价格快照。

## 订单与支付

```mermaid
stateDiagram-v2
 [*] --> STARTING: 校验权限 方案 电价及空闲资源
 STARTING --> CHARGING: 启动确认
 STARTING --> START_FAILED: 确认失败且可释放
 CHARGING --> COMPLETED: 停止确认并结算
 CHARGING --> CHARGING: 停止失败 保留占用与原因
 COMPLETED --> COMPLETED: 重复结束返回原账单
 COMPLETED --> PAID: 模拟或沙箱由后端确认
 PAID --> PAID: 重复支付返回原回执
```

充电状态和支付状态分别保存。图中 PAID 表示支付完成，此时订单的充电状态为 COMPLETED。定时与软件 FULL 订单由后端按截止时间结算，两端显示结束原因和计量来源。

## 报修与告警

```mermaid
flowchart TD
 U[用户选择真实设备或插座] --> O[OPEN 本人报修]
 O --> A[管理员分派有效管理员或运营员]
 A --> P[PROCESSING 记录处理进度]
 P --> R[RESOLVED 填写结果]
 R --> F[用户刷新查看本人结果与时间线]
 E[设备离线 插座故障 订单异常] --> K[按资源与状态版本生成告警键]
 K --> C[管理人员确认 说明 账号 时间]
 C --> N[仅存确认记录]
 M[独立维修核验] --> H[通过设备状态接口恢复]
 H --> V[状态版本变化 新故障重新提示]
```

报修结案、告警确认和故障恢复是三个独立动作。运营员只处理分派给本人的报修，不能修改基础设备配置；管理员负责配置恢复。
