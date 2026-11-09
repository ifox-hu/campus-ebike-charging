# 架构与图表说明

本项目 README 的组织方式参考[慧知充电平台](https://github.com/roinli/HUIZHI-ChargeOS-cloud)的项目介绍、界面展示、技术表与业务交互图。以下图表按本项目现有代码独立绘制，不沿用参考项目的微服务、Redis、Netty、多租户或真实支付等实现声明。

## 图表与源码对应

| 图表 | 可编辑 Mermaid 源文件 | 代码依据 |
| --- | --- | --- |
| 系统架构 | [architecture.mmd](diagrams/architecture.mmd) | [main.js](../src/main.js)、[runtime.js](../src/runtime.js)、[accountApi.js](../src/services/accountApi.js)、[store.js](../src/domain/store.js)、[ConnectedApp.vue](../src/connected/ConnectedApp.vue) |
| 功能结构 | [modules.mmd](diagrams/modules.mmd) | [data.js](../src/data.js)、[App.vue](../src/App.vue)、[components](../src/components/) |
| 业务流程 | [workflow.mmd](diagrams/workflow.mmd) | [service.js](../src/domain/service.js)、[SocketPanel.vue](../src/components/SocketPanel.vue)、[OrderDetails.vue](../src/components/OrderDetails.vue) |
| 业务数据关系 | [model.mmd](diagrams/model.mmd) | [seed.js](../src/domain/seed.js)、[service.js](../src/domain/service.js) |
| 自动发布 | [deployment.mmd](diagrams/deployment.mmd) | [pages.yml](../.github/workflows/pages.yml)、[vite.config.js](../vite.config.js) |

README 默认展示已生成的 SVG 矢量图，便于直接查看和放大；每张图下方附可展开的 Mermaid 图源，`docs/diagrams/` 同时保留 `.mmd` 与 `.svg` 文件。图形使用 Mermaid 12.3.0 逐项解析并渲染验证，不依赖外部收费图片地址。修改图源后应重新生成同名 SVG，并同步 README 折叠图块。

## 运行边界

1. **公开 pages**：纯静态管理端。演示账号在浏览器校验，登录标记在 sessionStorage；业务、资料与设置在 localStorage。没有 Java 账号 API 或真实设备通信。
2. **本机 default**：Vue 管理前端与 Spring Boot 独立账号服务前后端分离。账号服务维护真实本机会话及两张 H2 表，充电业务仍由前端演示领域层维护。
3. **接口 connected**：独立加载外部业务适配客户端，读取服务端站点、设备、插座、费率、订单等数据。外部后端和用户端不包含在本仓库；接口失败不回退为本地假数据。

## 业务规则

- 站点包含设备排，排内设备保持稳定编号，每台设备固定 A、B 两个独立插座。
- 启动中的订单即占用插座；启动成功才进入充电，失败不产生费用。
- 订单保留启动费率、站点名称和设备编号快照，历史费用不随当前费率改变。
- 正常结束或异常核验完成后释放插座，费用分电费与服务费，只有已结束订单可模拟支付。
- 故障报修与插座故障状态分别维护，结案不自动恢复设备。

## 账号服务存储

[server/schema.sql](../server/src/main/resources/schema.sql)定义两张表：

- `eb_admin_accounts`：管理员账号、密码哈希、资料与显示偏好。
- `eb_admin_notice_reads`：账号与通知事件键的已读关联。

README 业务 ER 图描述浏览器演示对象间的逻辑关系，不等同于账号数据库，也不表明本仓库已将充电业务迁移至 MySQL。

## 更新图表

可使用 Mermaid CLI 在已安装可用浏览器的开发环境重新导出，例如：

```bash
npx --yes --package=@mermaid-js/mermaid-cli -- mmdc -i docs/diagrams/architecture.mmd -o docs/diagrams/architecture.svg -c docs/diagrams/config.json -b white
```

其余四张图使用相同方法替换输入、输出文件名。特殊浏览器路径可按 Mermaid CLI 的 `--puppeteerConfigFile` 文档配置。导出后检查中文、箭头、分组及标签是否完整，再提交 SVG 与图源；主题及中文字体配置见 [config.json](diagrams/config.json)。图表工具不是管理端运行依赖。
