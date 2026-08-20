#!/usr/bin/env bash
# ============================================================
# 数据库初始化与迁移脚本
# ============================================================
# 用途：
#   1. 首次部署：创建表结构 + 写入种子数据
#   2. 后续升级：仅应用 schema 变更
#
# 使用方式（在 server/ 目录下）：
#   chmod +x scripts/db-migrate.sh
#   ./scripts/db-migrate.sh            # 首次部署（含 seed）
#   ./scripts/db-migrate.sh --no-seed  # 仅同步 schema，不执行 seed
#
# 前置条件：
#   - MySQL 已启动且可连接（DATABASE_URL 配置正确）
#   - 已执行 npm install
#   - 已复制 .env.production.example → .env.production 并修改
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

# 加载生产环境变量
if [ -f .env.production ]; then
  set -a
  source .env.production
  set +a
elif [ -f .env ]; then
  set -a
  source .env
  set +a
else
  echo "❌ 未找到 .env.production 或 .env，请先配置环境变量"
  exit 1
fi

WITH_SEED=true
if [ "${1:-}" = "--no-seed" ]; then
  WITH_SEED=false
fi

echo "=========================================="
echo " 数据库初始化脚本"
echo "=========================================="
echo "DATABASE_URL: ${DATABASE_URL:-未设置}"
echo "执行 Seed:    ${WITH_SEED}"
echo "=========================================="

# 1. 生成 Prisma Client
echo "▶ [1/4] 生成 Prisma Client..."
npx prisma generate

# 2. 同步 Schema 到数据库
#    首次部署使用 db push；后续如已切换到 migrate 体系，可改用 migrate deploy
echo "▶ [2/4] 同步数据库 Schema..."
if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "  检测到 migrations 目录，使用 prisma migrate deploy..."
  npx prisma migrate deploy
else
  echo "  未检测到 migrations 目录，使用 prisma db push（首次部署）..."
  npx prisma db push --accept-data-loss
fi

# 3. 种子数据
if [ "$WITH_SEED" = true ]; then
  echo "▶ [3/4] 执行种子数据初始化..."
  npm run seed
else
  echo "▶ [3/4] 跳过种子数据（--no-seed）"
fi

# 4. 验证
echo "▶ [4/4] 验证数据库连接..."
npx prisma db execute --stdin <<< "SELECT 1 AS ok;"

echo "=========================================="
echo " ✅ 数据库初始化完成"
echo "=========================================="
if [ "$WITH_SEED" = true ]; then
  echo "默认账号："
  echo "  超管：admin / admin123"
  echo "  学生：20240001 / 123456"
  echo "⚠  生产环境请立即修改默认密码！"
fi
