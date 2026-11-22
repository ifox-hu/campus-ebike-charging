# 架构说明

系统面向校园、住宅小区、医院、产业园区及企事业单位办公区等集中充电场所，以校园作为重点案例，开展系统设计、实现与验证。各类场所共用站点、设备排、双插座、订单、计费及报修模型，通过场景分类与基础配置适配；“办公区”为企事业单位办公区的界面简称，旧“园区”分类保留兼容。

一个运营商可管理多个站点，站点所属运营商与应用场景分别配置。平台管理员跨运营商管理站点及运营账号；运营商管理员可维护名下设备、插座和分时费率。订单、报修保存产生时的运营商归档，站点转让后历史记录保留原管理范围；设备和插座按当前站点归属确定权限，告警结合关联资源校验访问权限，普通用户按本人账号查询充电及报修记录。

## 模块职责

| 目录 | 职责 | 数据来源 |
| --- | --- | --- |
| `frontend/` | Vue 管理页面、统计、设备排布、高德地图及接口适配 | 离线演示或充电业务 API |
| `backend/charging-service/` | 用户与管理员鉴权、站点、设备插座、费率、订单、模拟计量支付与报修 | MySQL |
| `backend/account-service/` | 可选的独立本机管理账号及偏好服务 | H2 文件库 |
| `uni-app/` | H5／微信小程序共用的找站、选插座、充电、订单与报修页面 | 本地演示或业务 API |

各模块分别构建和部署。管理端支持浏览器本地演示与联网模式，联网模式通过服务端适配层读写业务 API。

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

管理端使用高德 2.0 JS SDK，H5 使用官方 Loader 和安全码代理，微信端使用原生地图组件。站点位置按声明的坐标系显示。缺少凭证时，管理端显示坐标示意，H5 显示配置提示。

## 业务与历史

站点—设备排—设备—A/B 插座保持稳定标识。活动任务占用插座，订单保存启动费率与信息快照，正常结束或异常核验后释放。报修结案与故障恢复分别处理。用户端提供 1h、2h、3h、充满自停和自定义方案；联网订单由服务端计时、计量并自动结算。功率判断与计量规则见 [充电方案与运营增强](charging-operations.md)。
