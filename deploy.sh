#!/bin/bash
# ==========================================
# OA 系统一键部署脚本
# 使用: bash deploy.sh
# ==========================================
set -e

echo "========================================"
echo "  智慧办公助手 OA 系统部署"
echo "========================================"

# 1. 构建 Web 管理后台
echo ""
echo "[1/4] 构建 Web 管理后台..."
cd webapp
npm install --production=false
npm run build
cd ..
echo "  Web 构建完成 → webapp/dist/"

# 2. 构建后端 Docker 镜像
echo ""
echo "[2/4] 构建后端镜像..."
docker build -f Dockerfile.backend -t oa-backend:latest .
echo "  后端镜像构建完成"

# 3. 启动服务
echo ""
echo "[3/4] 启动服务..."
docker compose up -d
echo "  服务已启动"

# 4. 等待服务就绪
echo ""
echo "[4/4] 等待服务就绪..."
sleep 5

# 健康检查
echo ""
echo "健康检查..."
if curl -sf http://localhost/api/health > /dev/null 2>&1; then
  echo "  ✅ 后端 API 正常"
else
  echo "  ⚠️ 后端 API 未就绪，请检查日志: docker compose logs backend"
fi

if curl -sf http://localhost/ > /dev/null 2>&1; then
  echo "  ✅ Web 管理后台正常"
else
  echo "  ⚠️ Web 管理后台未就绪"
fi

echo ""
echo "========================================"
echo "  部署完成！"
echo ""
echo "  Web 管理后台: http://localhost"
echo "  API 接口:     http://localhost/api"
echo "  Swagger 文档: http://localhost/api-docs (需开启 SWAGGER_ENABLED)"
echo ""
echo "  查看日志: docker compose logs -f"
echo "  重启服务: docker compose restart"
echo "  停止服务: docker compose down"
echo "========================================"
