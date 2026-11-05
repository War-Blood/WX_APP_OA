# OA 后端内网化迁移（Plan B · frp 隧道）

> 建立时间：2026-11-05
> 目标：后端与数据库迁入内网 Linux，云服务器只保留 Nginx（TLS + 静态站）与 frps 中继。
> 约束：小程序已发布版本 **零改动**——发布包内 `BASE_URL` 硬编码 `https://warblood.online`，
> 只要该域名继续由云服务器 Nginx 应答即可。

---

## 1. 结论

**可行，且本项目已有同类成功先例。** 云端 `scm.warblood.online` 就是「内网 Docker + frpc 隧道 + 云 Nginx」的现成案例，
本次迁移复用同一套 frps（端口 7000 / token / TLS / `proxyBindAddr = 127.0.0.1`），只是多开一个 `remotePort`。

真正的成本节省来自**云服务器降配**（后端进程约 125MB + MySQL 约 400MB 迁走），而不是流量——流量仍然经过云服务器。

---

## 2. 实测现状（2026-11-05）

| 项 | 云服务器 | 内网 Linux |
|----|---------|-----------|
| 地址 | 111.229.107.123（腾讯云 KVM） | 172.15.20.20（Ubuntu desktop） |
| 规格 | 4C / 3.6G / 40G | 8C / 7.0G / 218G（可用 187G） |
| 运行时 | PM2 fork，`wx-app-oa-api` 监听 3000 | Docker 29.1.3 + Compose 2.40.3 |
| 已有服务 | nginx(80/443)、frps(7000)、PM2 后端、MySQL 8.0.45 | scm-web / scm-api / scm-db、frpc(0.71.0) 进程 |
| 出口 IP | 111.229.107.123 | 183.245.97.46（动态，需关注） |

关键事实：

- 云 Nginx：`/etc/nginx/sites-enabled/daily-report-api`，`/api/` 与 `/api-docs` 反代 `127.0.0.1:3000`；
  静态后台在 `/var/www/wx-app-oa/admin`；证书 Let's Encrypt（有效期至 2026-12-25，certbot.timer 自动续期）。
- frps：`/etc/frp/frps.toml`，`proxyBindAddr = 127.0.0.1`、`transport.tls.force = true`、
  `allowPorts` 当前仅放行 **2200**（NAS SSH）与 **18601**（SCM API）。
- 数据库体量：`wx_app_oa` 9.3MB、`oa_share` 0.5MB、`daily_report` 0.3MB —— 全量迁移成本极低。
- `backend/uploads` 仅 4KB；`backend/logs` 却有 **1.3G**（`LOG_LEVEL=debug` 导致），迁移时需轮转。
- 生产 `.env`：`PORT=3000`、`NODE_ENV=development`、`LOG_LEVEL=debug`（迁移期间保持原样，避免行为漂移）。

---

## 3. 目标拓扑

```
 小程序 / Web 后台（发布包不改）
        │  HTTPS 443（Let's Encrypt，证书仍在云上）
        ▼
 ┌──────────────────────────────────────────────┐
 │ 云服务器 111.229.107.123                      │
 │  nginx  /api/  → 127.0.0.1:13000  （原 3000） │
 │  nginx  /      → /var/www/wx-app-oa/admin     │
 │  frps   :7000  （token + TLS + allowPorts）   │
 │  MySQL / Redis / PM2  → 切换后停用（保留回滚）│
 └──────────────────────────────────────────────┘
        ▲  frpc 主动出站连接（无需公网 IP）
        │
 ┌──────────────────────────────────────────────┐
 │ 内网 Linux 172.15.20.20                       │
 │  oa-tunnel  frpc → remotePort 13000           │
 │  oa-backend :3000                             │
 │  oa-mysql   :13306（容器内 3306）             │
 │  oa-redis   :6380（容器内 6379）              │
 └──────────────────────────────────────────────┘
```

---

## 4. 变更清单（切换窗口内仅 **2 处**）

| # | 位置 | 变更 | 影响 |
|---|------|------|------|
| 1 | 云 `frps.toml` | `allowPorts` 增加 `{ start = 13000, end = 13000 }`，`systemctl restart frps` | SCM 隧道断开约 2 秒后自动重连 |
| 2 | 云 nginx `daily-report-api` | `/api/`、`/api-docs` 的 `127.0.0.1:3000` → `127.0.0.1:13000`，`nginx -s reload` | 主干切换点；回滚即改回 |

内网侧无需再改：栈、隧道配置、镜像均已在 2026-11-05 完成演练验证。

---

## 5. 已完成的演练（本次）

内网 `/home/admin123/oa`：

```
backend/     ← 云上运行中代码的完整快照（src + package*.json + ecosystem + .env）
init/        ← 01-oa-db.sql（10MB 全量）+ 02-grants.sql
uploads/ logs/
frp/         ← frpc 0.71.0 二进制 + Dockerfile
frpc-oa.toml docker-compose.oa.yml docker-compose.tunnel.yml .env
```

验证结果：

- `wx_app_oa` 43 张表逐表行数 **与云上完全一致**（`users` 43、`daily_reports` 2114 …）。
- `/api/health` 返回 `database: ok / redis: ok`。
- `share-sync` 启动同步正常（59 天、10 省）。
- `frpc verify` 配置语法通过；`oa-tunnel` 镜像已构建，**未启动**（等云侧放行 13000）。

> 注意：演练快照时间点之后的写入不会同步。切换窗口内必须重新 dump 一次。

---

## 6. 切换步骤（中断约 2 分钟）

### 6.0 前置
```bash
ssh wx-app-server    # 云
ssh srv              # 内网 172.15.20.20
```

### 6.1 云侧放行端口（先做，验证隧道再动业务）
```bash
cp /etc/frp/frps.toml /etc/frp/frps.toml.bak-20261105
# 在 allowPorts 数组里加一行
#   { start = 13000, end = 13000 },
systemctl restart frps
```
内网启动隧道，验证端口已通：
```bash
cd /home/admin123/oa && docker compose -f docker-compose.tunnel.yml up -d
# 云上执行：
curl -s http://127.0.0.1:13000/api/health
```
**此时业务仍在云上跑，随时可停。**

### 6.2 冻结写入并同步增量数据
```bash
# 云：停后端（中断开始）
pm2 stop wx-app-oa-api
mysqldump -uroot --single-transaction --routines --triggers --add-drop-database \
  --databases wx_app_oa oa_share daily_report | gzip -9 > /tmp/oa-cutover.sql.gz
scp 到内网（经本地中转），内网执行：
docker exec -i oa-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' < /tmp/oa-cutover.sql
```

### 6.3 切流
```bash
# 云：nginx 两处端口改 13000
sed -i 's/127\.0\.0\.1:3000/127.0.0.1:13000/g' /etc/nginx/sites-enabled/daily-report-api
nginx -t && nginx -s reload
```
（`/var/www/wx-app-oa/admin` 静态站不受影响，用户开页面不会瞬断。）

### 6.4 验证
```bash
curl -s https://warblood.online/api/health
# 小程序真机：登录 → 日报提交 → 审批 → 消息 → 图片上传
```

---

## 7. 回滚（1 分钟）

```bash
sed -i 's/127\.0\.0\.1:13000/127.0.0.1:3000/g' /etc/nginx/sites-enabled/daily-report-api
nginx -t && nginx -s reload
pm2 start wx-app-oa-api
```
内网写过的数据需人工比对回灌（窗口越短风险越低）。

---

## 8. 风险与待确认

| 级别 | 风险 | 处置 |
|------|------|------|
| 🔴 高 | **内网主机在线率**：断电/断网/重启 → OA 全站不可用 | Docker `restart: unless-stopped` + BIOS 断电自启 + UPS；建议加云端探测告警 |
| 🟠 中 | **企业微信出口 IP 白名单**：迁移后 `qyapi` 调用源 IP 变为 183.245.97.46（动态） | 需在企微后台确认「可信 IP / 群机器人安全设置」；若已绑定云 IP 必须补充内网出口 IP 或改用其它安全方式 |
| 🟠 中 | 备份链路：`backup-db.sh` 由云端 cron 02:30 执行，迁库后需落到内网 | 迁移后把 cron 与 `pull-backups.sh` 指向新位置，并保留云端 MySQL 至少 7 天 |
| 🟡 低 | 双跳延迟（用户 → 云 → 内网）约 +20~60ms | OA 场景可接受；图片为 base64 走 JSON，两端均需保证带宽 |
| 🟡 低 | frpc 当前以普通进程运行（SCM），重启主机不会自动拉起 | 本次 OA 用 Docker 托管，天然自启；建议顺手把 SCM 也容器化 |
| 🟡 低 | `LOG_LEVEL=debug` 持续写满磁盘（云上已 1.3G） | 迁移后评估改 `info` + logrotate；容器已配 `json-file 20m×5` |
| ⚪ 备注 | `NODE_ENV=development` 在生产 | 迁移期间保持原值，单独变更，不要和迁移混在一起 |

---

## 9. 成本说明（如实）

- 迁走后云端常驻内存约减少 **0.5~0.6G**、CPU 常驻负载基本清零，云盘日志可清理。
- 出/入带宽、公网 IP、证书、域名费用 **不变**（流量仍经云服务器转发）。
- 真正降本要配合**云服务器降配**（4C4G → 2C2G），前提是 `ars` / `quant` 两个站点的负载允许。
