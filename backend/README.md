# 后端服务

| 模块 | 职责 | 端口 |
| --- | --- | --- |
| `charging-service` | 登录、站点、设备、插座、订单、费率与报修 API | 8081 |
| `account-service` | 可选的管理员账号、会话、资料与偏好 | 8092 |

两个模块独立运行；聚合 `pom.xml` 提供统一测试：

```bash
mvn test
```

业务使用 MySQL，账号演示服务使用 H2。`charging-service/db/` 的 V1–V8 SQL 仅用于空库初始化或按顺序升级，不能直接重跑到现有业务库。

复制 `.env.example` 为 `.env.local` 后，初始化独立开发数据库：

```bash
docker compose --env-file .env.local up -d mysql
```

默认绑定 `127.0.0.1:13307`，使用独立 `campus-charging` 数据卷。随后在仓库根运行 `scripts/dev-charging.ps1`。详见 [配置说明](../docs/configuration.md)。
