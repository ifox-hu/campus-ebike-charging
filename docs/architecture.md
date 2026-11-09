# 架构说明

## 模块职责

| 目录 | 职责 | 数据来源 |
| --- | --- | --- |
| `frontend/` | Vue 管理页面、统计、设备排布、高德地图及接口适配 | 离线演示或充电业务 API |
| `backend/charging-service/` | 用户与管理员鉴权、站点、设备插座、费率、订单、模拟计量支付与报修 | MySQL |
| `backend/account-service/` | 可选的独立本机管理账号及偏好服务 | H2 文件库 |
| `uni-app/` | H5／微信小程序共用的找站、选插座、充电、订单与报修页面 | 本地演示或业务 API |

本仓库包含各模块源码，运行时仍各自构建与部署。管理端静态演示不连接业务数据库；联网入口独立加载服务端适配层，不把网络错误回退为本地成功状态。

## 图表与代码

| 图表 | 可编辑图源 | 主要代码 |
| --- | --- | --- |
| 系统架构 | [architecture.mmd](diagrams/architecture.mmd) | [frontend/main.js](../frontend/src/main.js)、[业务后端](../backend/charging-service/src/)、[用户端](../uni-app/src/) |
| 功能结构 | [modules.mmd](diagrams/modules.mmd) | [管理组件](../frontend/src/components/)、[用户页面](../uni-app/src/pages/) |
| 业务流程 | [workflow.mmd](diagrams/workflow.mmd) | [前端业务规则](../frontend/src/domain/service.js)、[业务服务](../backend/charging-service/src/main/java/com/chargeplatform/) |
| 演示业务关系 | [model.mmd](diagrams/model.mmd) | [前端示例模型](../frontend/src/domain/seed.js) |

ER 图描述管理端演示对象的逻辑关联；真实业务数据库的结构见 [SQL](../backend/charging-service/db/)，独立账号服务结构见 [schema.sql](../backend/account-service/src/main/resources/schema.sql)。

图源旁保留 SVG，README 可直接显示。修改 `.mmd` 后重新生成同名 SVG 并同步 README 的折叠图块；配色和字体在 [config.json](diagrams/config.json)。

## 地图与平台差异

管理端直接使用高德 2.0 JS SDK，H5 使用官方 Loader 和安全码代理；微信端使用原生地图组件。三者按已声明坐标系使用站点位置，不把缺失坐标变成零点。没有凭证时，管理端保留示意与筛选，H5 显示配置提示。

## 业务与历史

站点—设备排—设备—A/B 插座保持稳定标识；活动任务占用插座，订单保留启动费率与信息快照。正常结束或核验异常后释放，报修结案与故障恢复分别处理。用户端本地和联网模式均提供 1h、2h、3h、充满自停、自定义（15—720分钟）；联网订单由服务端计时、计量、保存费率与自动结算。充满自停采用模拟电量阈值，非真实电池检测。
