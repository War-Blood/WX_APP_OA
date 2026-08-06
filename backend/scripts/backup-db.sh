#!/bin/bash
# =============================================
# OA 数据库每日备份脚本（加密）
# 用法: bash backup-db.sh          （服务器 cron 每日 02:30 调用）
# 产出: /var/www/wx-app-oa/backups/db/YYYYMMDD_HHMMSS.sql.gz.gpg
# 加密: gpg 公钥备份 —— 私钥仅在异地主机，攻破服务器也无法解密
# 保留: 30 天（find -mtime +30 -delete）
# =============================================
set -euo pipefail

BACKUP_DIR="/var/www/wx-app-oa/backups/db"
BACKEND_DIR="/var/www/wx-app-oa/backend"
GPG_RECIPIENT="backup@oa.local"
RETENTION_DAYS=30

# 读取 DB 连接配置（OA_DB_*）
if [ -f "$BACKEND_DIR/.env" ]; then
  set -a; source "$BACKEND_DIR/.env"; set +a
fi

mkdir -p "$BACKUP_DIR"

TS=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/${TS}.sql.gz.gpg"

echo "[backup-db] $(date '+%F %T') 开始备份 → $OUT"

# 用 MYSQL_PWD 避免密码出现在进程参数
export MYSQL_PWD="${OA_DB_PASSWORD}"
mysqldump \
  --single-transaction --routines --triggers \
  -h "${OA_DB_HOST}" -P "${OA_DB_PORT:-3306}" \
  -u "${OA_DB_USER}" "${OA_DB_NAME}" \
  2>/tmp/oa-mysqldump.err \
  | gzip -9 \
  | gpg --batch --yes --trust-model always \
        --recipient "$GPG_RECIPIENT" --output "$OUT" -e
unset MYSQL_PWD

if [ -s "$OUT" ]; then
  echo "[backup-db] 完成 $(du -h "$OUT" | cut -f1) → $OUT"
else
  echo "[backup-db] 失败：备份文件为空" ; cat /tmp/oa-mysqldump.err >&2; exit 1
fi

# 保留策略：删除 N 天前的备份
find "$BACKUP_DIR" -name '*.gpg' -mtime +${RETENTION_DAYS} -delete

rm -f /tmp/oa-mysqldump.err
echo "[backup-db] $(date '+%F %T') 备份完成"
