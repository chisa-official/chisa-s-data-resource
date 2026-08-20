#!/usr/bin/env bash
# ============================================================
# 高校学生管理系统 - Linux 一键部署脚本
# ============================================================
# 功能：
#   1. 检查运行环境（Node.js、npm、PM2、Docker、Nginx）
#   2. 启动 MySQL（Docker）
#   3. 构建后端 + 两个前端
#   4. 初始化数据库（schema + seed）
#   5. 用 PM2 启动后端
#   6. 提示 Nginx 配置
#
# 使用方式（在项目根目录）：
#   chmod +x deploy/scripts/deploy.sh
#   ./deploy/scripts/deploy.sh              # 完整部署
#   ./deploy/scripts/deploy.sh --build-only # 仅构建，不启动服务
#   ./deploy/scripts/deploy.sh --restart    # 仅重启 PM2 服务
#
# 前置条件：
#   - 已安装 Node.js 20 LTS、npm
#   - 已安装 Docker（用于 MySQL）
#   - 已安装 Nginx（可选，构建阶段不需要）
# ============================================================
set -euo pipefail

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }

# 项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

info "项目根目录: $PROJECT_ROOT"

# 解析参数
MODE="full"
case "${1:-}" in
  --build-only) MODE="build";;
  --restart)    MODE="restart";;
  --help|-h)
    echo "用法: $0 [--build-only|--restart|--help]"
    echo "  无参数      完整部署"
    echo "  --build-only  仅构建，不启动服务"
    echo "  --restart     仅重启 PM2 服务"
    exit 0
    ;;
esac

# ============================================================
# 环境检查
# ============================================================
check_command() {
  if ! command -v "$1" &>/dev/null; then
    return 1
  fi
  return 0
}

info "▶ [1/6] 检查运行环境..."

check_command node || fail "未找到 Node.js，请安装 Node.js 20 LTS"
NODE_VERSION=$(node -v)
ok "Node.js: $NODE_VERSION"

check_command npm || fail "未找到 npm"
ok "npm: $(npm -v)"

if [ "$MODE" = "restart" ]; then
  check_command pm2 || fail "未找到 PM2，请执行 npm i -g pm2"
  info "重启模式，跳过构建与数据库初始化"
  cd server
  pm2 restart ecosystem.config.cjs --env production
  pm2 save
  ok "PM2 服务已重启"
  pm2 status
  exit 0
fi

# Docker（用于 MySQL）
DOCKER_OK=false
if check_command docker; then
  ok "Docker: $(docker --version)"
  DOCKER_OK=true
else
  warn "未找到 Docker，将使用本地 MySQL（请确保已启动）"
fi

# PM2
if ! check_command pm2; then
  warn "未找到 PM2，正在全局安装..."
  npm i -g pm2 || fail "PM2 安装失败"
fi
ok "PM2: $(pm2 --version)"

# ============================================================
# 启动 MySQL
# ============================================================
info "▶ [2/6] 启动 MySQL..."
if [ "$DOCKER_OK" = true ]; then
  docker compose up -d
  info "等待 MySQL 就绪..."
  for i in $(seq 1 30); do
    if docker exec student-mgmt-mysql mysqladmin ping -h localhost -uroot -proot123456 &>/dev/null; then
      ok "MySQL 已就绪"
      break
    fi
    sleep 2
    [ $i -eq 30 ] && fail "MySQL 启动超时"
  done
else
  warn "跳过 Docker MySQL，请确保本地 MySQL 已运行于 3306"
fi

# ============================================================
# 构建后端
# ============================================================
info "▶ [3/6] 构建后端..."
cd "$PROJECT_ROOT/server"

# 准备生产环境配置
if [ ! -f .env.production ]; then
  warn "未找到 .env.production，从模板创建..."
  cp .env.production.example .env.production
  warn "⚠ 请编辑 server/.env.production 修改 JWT_SECRET 和数据库密码后重新运行！"
  # 生成随机 JWT_SECRET
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")
  sed -i "s|REPLACE_ME_WITH_A_LONG_RANDOM_STRING_AT_LEAST_64_CHARS|$JWT_SECRET|g" .env.production
  ok "已自动生成随机 JWT_SECRET"
fi

# 同时同步到 .env（PM2 通过 dotenv 加载）
cp .env.production .env

npm install --omit=dev || npm install || fail "后端依赖安装失败"
npm run build || fail "后端构建失败"
ok "后端构建完成"

# 数据库初始化
info "▶ [4/6] 初始化数据库..."
chmod +x scripts/db-migrate.sh
./scripts/db-migrate.sh || fail "数据库初始化失败"
ok "数据库初始化完成"

# ============================================================
# 构建前端
# ============================================================
info "▶ [5/6] 构建前端..."

# 学生端
cd "$PROJECT_ROOT/student-web"
npm install || fail "学生端依赖安装失败"
npm run build || fail "学生端构建失败"
ok "学生端构建完成"

# 后台端
cd "$PROJECT_ROOT/admin-web"
npm install || fail "后台端依赖安装失败"
npm run build || fail "后台端构建失败"
ok "后台端构建完成"

# ============================================================
# 启动 PM2
# ============================================================
info "▶ [6/6] 启动后端服务..."
cd "$PROJECT_ROOT/server"

# 停止旧进程（如有）
pm2 delete student-mgmt-server 2>/dev/null || true

pm2 start ecosystem.config.cjs --env production
pm2 save
ok "PM2 服务已启动"

# 等待服务就绪
info "等待后端服务就绪..."
for i in $(seq 1 15); do
  if curl -s http://127.0.0.1:3000/api/health | grep -q '"code":0' 2>/dev/null; then
    ok "后端服务已就绪"
    break
  fi
  sleep 2
  [ $i -eq 15 ] && warn "后端健康检查未通过，请检查日志: pm2 logs student-mgmt-server"
done

# ============================================================
# 完成
# ============================================================
echo ""
echo "=========================================="
ok "部署完成！"
echo "=========================================="
echo ""
echo "服务状态："
pm2 status
echo ""
echo "下一步："
echo "  1. 配置 Nginx（参考 deploy/nginx/student-mgmt.conf）"
echo "     sudo cp deploy/nginx/student-mgmt.conf /etc/nginx/conf.d/"
echo "     sudo nginx -t && sudo systemctl reload nginx"
echo "  2. 设置 PM2 开机自启："
echo "     pm2 startup（按提示执行返回的命令）"
echo "  3. 访问："
echo "     学生端: http://<服务器IP>/"
echo "     后台端: http://<服务器IP>/admin"
echo "  4. 默认账号（请立即修改）："
echo "     超管: admin / admin123"
echo "     学生: 20240001 / 123456"
echo ""
echo "常用运维命令："
echo "  pm2 logs student-mgmt-server --lines 100   # 查看日志"
echo "  pm2 restart student-mgmt-server            # 重启"
echo "  pm2 monit                                  # 监控面板"
