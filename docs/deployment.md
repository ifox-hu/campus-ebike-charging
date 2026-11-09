# 部署说明

## GitHub Pages

`pages` 模式只生成静态前端，不连接 Java 账号服务。访问者直接进入公开演示；资料、通知、字号及业务数据保存在浏览器。

仓库 Settings → Pages 的发布源设为 GitHub Actions。推送 main 或手动运行 `Test and deploy GitHub Pages` 工作流，测试通过后自动发布。工作流使用仓库名称计算资源前缀，适用于 `https://<账号>.github.io/<仓库>/`。

本地复现（PowerShell）：

```powershell
npm ci
$env:PAGES_BASE_PATH='/campus-ebike-charging-admin/'
npm run build:pages
npm run preview:pages
```

预览 `http://127.0.0.1:5207/campus-ebike-charging-admin/`。Linux/macOS 可使用 `PAGES_BASE_PATH=/campus-ebike-charging-admin/ npm run build:pages`。部署到网站根目录时设为 `/`；默认相对路径 `./` 也可用于独立静态托管。使用文件服务器访问产物，不直接双击 index.html。

## 可选高德地图

公开 Pages 默认不携带本机地图凭证，未配置时显示校园坐标示意。

| 场景 | Key | 安全码 |
| --- | --- | --- |
| 本机账号模式 | `.env.local` 中 `VITE_AMAP_KEY` | `VITE_AMAP_SECURITY_CODE` |
| 本地 Pages 构建 | 进程环境 `PAGES_AMAP_KEY` | `PAGES_AMAP_SECURITY_CODE` |
| GitHub Actions | Secret `AMAP_WEB_KEY` | Secret `AMAP_SECURITY_CODE` |

使用高德 Web JS API 2.0 类型的凭证，按地图提供商要求设置网站域名。前端地图凭证会进入静态产物，按 Web 凭证管理；不要填写服务端私钥、支付密钥或小程序密钥。修改 Secrets 后重新运行部署。

## 本机账号服务

安装 Java 17、Maven、Node.js 22。分别运行 `mvn spring-boot:run`（server 目录）与 `npm run dev`（仓库根目录）。服务仅监听 127.0.0.1:8092，前端通过开发代理转发 `/api`。

账号库为空时，`EBIKE_ADMIN_USERNAME`、`EBIKE_ADMIN_PASSWORD` 控制首次初始化。H2 文件在 `server/runtime`，不要上传。账号服务与浏览器模拟业务是不同的存储边界。

`vite preview` 只用于检查构建，不是生产服务器。部署账号服务版到服务器时，需要自行提供 HTTPS、同源 `/api` 反向代理、服务进程管理、Cookie 和网络访问配置；生产鉴权与数据库安全不由 Pages 提供。

## 外部业务接口模式

运行 `npm run dev:connected`，通过 `.env.connected.local` 中的 `ADMIN_API_PROXY_TARGET` 指向单独部署的业务后端。`server/` 是独立账号服务，不等于统一充电业务后端。生产构建 `dist-connected` 也需要同源 API 网关，开发代理不会包含在打包结果中。

## 发布与回退

每次推送先执行测试，再生成新的 Pages 部署。构建失败不会更新站点。需要回退时，对已发布提交使用可审查的 revert 提交并重新部署，保留现有业务历史，不使用强制推送重写历史。
