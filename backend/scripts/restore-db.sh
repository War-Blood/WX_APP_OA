#!/bin/bash
# =============================================
# OA 数据库恢复脚本（异地解密 → 生产导入）
# 用法: bash restore-db.sh <备份文件.sql.gz.gpg> [目标库=wx_app_oa]
# 说明:
#   - 在持有 gpg 私钥的异地主机运行（本地 D:\SQL\db 下有加密备份）
#   - 解密后经 ssh 管道导入生产 MySQL（明文不落生产盘）
#   - 恢复前先对生产库做一次加密快照备份
#   - mysqldump 默认含 DROP TABLE，恢复为覆盖式，务必确认目标库
# =============================================
set -euo pipefail

BACKUP_FILE="${1:?用法: restore-db.sh <备份文件> [目标库]}"
TARGET_DB="${2:-wx_app_oa}"
SERVER_HOST="wx-app-server"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "错误: 备份文件不存在 $BACKUP_FILE"; exit 1
fi

echo "[restore-db] 解密 $BACKUP_FILE ..."
gpg --batch -d "$BACKUP_FILE" 2>/dev/null | gunzip > /tmp/oa-restore.sql
echo "[restore-db] 明文 dump 大小: $(du -h /tmp/oa-restore.sql | cut -f1)"

# 预检：恢复前对生产当前库做加密快照（服务器端 backup-db.sh）
echo "[restore-db] 生产库恢复前快照 ..."
ssh "$SERVER_HOST" "bash /var/www/wx-app-oa/scripts/backup-db.sh" || echo "[restore-db] 警告: 恢复前快照失败，请确认生产库可回滚"

echo "[restore-db] 导入 $TARGET_DB（经 ssh 加密通道，明文不落生产盘）..."
cat /tmp/oa-restore.sql | ssh "$SERVER_HOST" "cd /var/www/wx-app-oa/backend && set -a && source .env && set +a && mysql -h \"\$OA_DB_HOST\" -u \"\$OA_DB_USER\" \"-p\$OA_DB_PASSWORD\" $TARGET_DB"

rm -f /tmp/oa-restore.sql
echo "[restore-db] 完成: 已恢复到 $TARGET_DB"
