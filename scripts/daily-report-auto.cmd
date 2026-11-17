@echo off
chcp 65001 >nul
cd /d D:\Projects\OA
D:\Tools\node-v22.22.2\node.exe scripts\daily-report-auto.js --ssh srv --apply >> scripts\.daily-report-cache\run.log 2>&1
