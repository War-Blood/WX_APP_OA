#!/bin/bash
# ==========================================
# OA 系统部署验证脚本
# 使用: bash verify-deploy.sh [base_url]
# ==========================================
set -e

BASE_URL="${1:-http://localhost}"
API_URL="${BASE_URL}/api"
PASS=0
FAIL=0

green() { echo -e "\033[32m$1\033[0m"; }
red()   { echo -e "\033[31m$1\033[0m"; }

check() {
  local label="$1"
  local method="$2"
  local url="$3"
  local expected_code="$4"
  local data="$5"

  if [ "$method" = "POST" ]; then
    resp=$(curl -s -w "\n%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d "$data" 2>/dev/null)
  else
    resp=$(curl -s -w "\n%{http_code}" -X GET "$url" 2>/dev/null)
  fi

  http_code=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | head -n -1)

  if [ "$http_code" = "$expected_code" ]; then
    green "  ✅ $label (HTTP $http_code)"
    PASS=$((PASS + 1))
  else
    red "  ❌ $label (期望 $expected_code, 实际 $http_code)"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo "  OA 系统部署验证"
echo "  目标: $BASE_URL"
echo "========================================"
echo ""

# ---- 基础检查 ----
echo "[基础检查]"
check "健康检查"                    GET  "$API_URL/health"     200

# ---- 认证检查 ----
echo ""
echo "[认证模块]"
ADMIN_RESP=$(curl -s -X POST "$API_URL/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"account":"admin","password":"admin123"}')
ADMIN_CODE=$(echo "$ADMIN_RESP" | grep -o '"code":[0-9]*' | head -1 | cut -d: -f2)
TOKEN=$(echo "$ADMIN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$TOKEN" ] && [ "$ADMIN_CODE" = "0" ]; then
  green "  ✅ 管理员登录成功"
  PASS=$((PASS + 1))
else
  red "  ❌ 管理员登录失败（可能尚无管理员账号）"
  red "     响应: $(echo "$ADMIN_RESP" | head -c 200)"
  FAIL=$((FAIL + 1))
fi

# ---- 用户管理 API ----
if [ -n "$TOKEN" ]; then
  AUTH="Authorization: Bearer $TOKEN"
  
  echo ""
  echo "[用户管理]"
  check "用户列表"  POST  "$API_URL/admin/users"  200  "$AUTH"  '{"page":1,"pageSize":5}'

  echo ""
  echo "[部门管理]"
  check "部门列表"  GET   "$API_URL/admin/departments"  200  "$AUTH"

  echo ""
  echo "[角色管理]"
  check "角色列表"  GET   "$API_URL/admin/roles"  200  "$AUTH"
else
  echo ""
  echo "[用户/部门/角色管理]"
  red "  ⚠️ 跳过（需先创建管理员账号）"
fi

# ---- Swagger ----
echo ""
echo "[Swagger 文档]"
check "Swagger UI"  GET  "$BASE_URL/api-docs/"  200

# ---- Web 管理后台 ----
echo ""
echo "[Web 管理后台]"
check "登录页"   GET  "$BASE_URL/"              200
check "静态资源" GET  "$BASE_URL/index.html"     200

echo ""
echo "========================================"
echo "  验证结果: $PASS 通过, $FAIL 失败"
echo "========================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
