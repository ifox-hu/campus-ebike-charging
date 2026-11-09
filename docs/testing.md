# 测试说明

## 自动测试

```bash
npm ci
npm test
npm run build
npm run build:pages
npm run build:connected
mvn -B -f server/pom.xml test
```

Node 测试使用独立内存对象，覆盖双插座约束、占用、费率快照、启动反馈、故障与异常、历史保护、校园迁移、差异化排布、通知、接口适配和静态演示账户适配。Java 测试使用独立 H2 内存数据库，不修改本机账号库。

## 可选浏览器验收

脚本使用 Microsoft Edge 和 Playwright。Playwright 不是项目运行依赖，可在独立 QA 环境安装，或本机临时执行：

```bash
npm install --no-save --package-lock=false playwright
```

先启动待测模式，再执行对应脚本。默认地址：

| 脚本 | 默认目标 | 前提 |
| --- | --- | --- |
| `node qa/verify-pages.cjs` | 5207/campus-ebike-charging-admin/ | Pages 子路径构建与 preview |
| `node qa/verify-station-layouts.cjs` | 5195 | 本机账号服务 |
| `node qa/verify-dashboard-map.cjs` | 5195 | 本机账号服务，可回退地图示意 |
| `node qa/verify-map-interactions.cjs` | 5195 | 本机账号服务和有效高德 Web 配置 |

公网复验可设置 `PAGES_QA_URL=https://ifox-hu.github.io/campus-ebike-charging-admin/` 后运行 Pages 脚本。测试使用独立浏览器上下文，不操作用户日常浏览器的演示数据。

截图与 JSON 结果位于 `qa/`，默认不提交。README 的 `docs/screenshots/` 是经选择的文档配图；本机地图截图和公开 Pages 截图分别标注，避免把有 Key 的本机运行效果当成默认线上能力。
