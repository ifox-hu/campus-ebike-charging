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
npm --prefix uni-app run build:h5
npm --prefix uni-app run build:mp-weixin
mvn -B -f backend/pom.xml test
```

前端测试使用独立内存对象，后端集成测试使用隔离 H2 内存数据库，不修改本机账号文件或业务库。测试覆盖双插座、占用与费率快照、启动反馈、结算支付、报修、权限、地图坐标以及用户端六种充电方式。

## 浏览器验证

需额外的 Playwright 与 Microsoft Edge，它们不是运行依赖。先启动待测前端，再运行对应脚本：

| 脚本 | 默认目标 |
| --- | --- |
| `frontend/e2e/verify-pages.cjs` | 管理端静态子路径预览 5207 |
| `frontend/e2e/verify-dashboard-map.cjs` | 独立账号模式 5195 |
| `frontend/e2e/verify-map-interactions.cjs` | 已配置高德的独立账号模式 |
| `frontend/e2e/verify-station-layouts.cjs` | 独立账号模式设备排布 |
| `uni-app/e2e/verify-charging-plans.cjs` | 用户端本地 H5 |
| `uni-app/e2e/verify-map.cjs` | 已配置高德的用户端本地 H5 |

`PAGES_QA_URL`、`ADMIN_MAP_BASE`、`MOBILE_QA_URL` 可指向单独测试端口。生成的截图与 JSON 留在各自 e2e 目录并忽略提交；README 只引用 `docs/screenshots/` 中挑选的展示图片。

验证已发布的真实地图时，设置 `PAGES_EXPECT_AMAP=true` 后运行 `frontend/e2e/verify-pages.cjs`，必须加载高德 SDK、显示五个站点标记且没有回退示意图。`verify-map-interactions.cjs` 通过 `ADMIN_MAP_BASE` 指向线上地址、`ADMIN_MAP_USER` / `ADMIN_MAP_PASSWORD` 使用演示账号，可进一步验证滚轮、拖动及搜索定位。

浏览器测试使用隔离上下文，不操作用户日常浏览器状态。服务端接口失败不会被测试工具替换成成功的假响应。
