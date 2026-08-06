#!/bin/bash
# =============================================
# 异地拉取：从生产服务器拉取加密 DB 备份到本地 D:\SQL\db
# 用法: bash pull-backups.sh   （可配 Windows 计划任务每日运行）
# 依赖: 本机 Git Bash（scp）+ SSH 配置 wx-app-server
# 说明: 拉取的是 gpg 加密文件，私钥在本机，可随时离线解密恢复
# =============================================
set -euo pipefail

LOCAL_DIR="/d/SQL/db"
SERVER_HOST="wx-app-server"
SERVER_DIR="/var/www/wx-app-oa/backups/db"

mkdir -p "$LOCAL_DIR"

echo "[pull-backups] $(date '+%F %T') 开始拉取 → $LOCAL_DIR"
scp -r "${SERVER_HOST}:${SERVER_DIR}/"* "${LOCAL_DIR}/"

COUNT=$(ls "$LOCAL_DIR" | wc -l)
echo "[pull-backups] $(date '+%F %T') 拉取完成，本地备份文件数: $COUNT"
