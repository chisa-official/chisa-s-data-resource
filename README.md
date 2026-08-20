# 高校学生管理系统

基于 Vue 3 + Node.js + Express + Prisma + MySQL 的全栈系统，包含学生端前台、后台管理端、公共支撑模块三部分。

## 技术栈

- **前端**：Vue 3 + TypeScript + Vite + Pinia + Vue Router + Element Plus + ECharts
- **后端**：Node.js 20 + Express + TypeScript + Prisma + MySQL 8.0
- **公共**：JWT 双 Token + Multer + exceljs + pdfkit + socket.io + node-cron + winston + zod

## 工程结构

```
大学学生管理系统/
├── docs/                 # 任务书
├── server/               # 后端工程（学生端 + 后台端 + 公共支撑）
├── student-web/          # 学生端前台
├── admin-web/            # 后台管理端
├── shared-web/           # 前端公共组件库（两端复用）
├── docker-compose.yml    # 本地 MySQL
└── .gitignore
```

## 环境准备

### 1. 安装 Node.js 20 LTS

从 https://nodejs.org 下载并安装，验证：

```bash
node -v   # v20.x
npm -v
```

### 2. 启动 MySQL（Docker 方式，推荐）

需先安装 Docker Desktop。在项目根目录执行：

```bash
docker compose up -d
```

MySQL 将监听 `localhost:3306`，root 密码 `root123456`，自动创建数据库 `student_mgmt`。

> 如不使用 Docker，可本地安装 MySQL 8.0，并手动创建 `student_mgmt` 数据库。

### 3. 包管理器

默认使用 npm。如偏好 pnpm：

```bash
npm i -g pnpm
```

## 启动后端

```bash
cd server
cp .env.example .env        # 按需修改配置
npm install
npx prisma migrate dev --name init   # 执行数据库迁移
npm run seed                # 初始化种子数据（角色、菜单、字典、超管账号）
npm run dev                 # 启动开发服务 http://localhost:3000
```

默认超级管理员账号：`admin / admin123`

Swagger 文档：http://localhost:3000/api-docs

## 启动前端

学生端：

```bash
cd student-web
npm install
npm run dev                 # http://localhost:5173
```

后台端：

```bash
cd admin-web
npm install
npm run dev                 # http://localhost:5174
```

## 当前进度

- [x] 项目脚手架与公共支撑模块（任务书 03）
- [ ] 学生端业务模块（任务书 01）
- [ ] 后台管理端业务模块（任务书 02）

## 本次交付内容（公共支撑 + 三端脚手架阶段）

### 后端 server/

- **Prisma Schema**：覆盖三份任务书全部 30+ 数据模型与所有枚举（[schema.prisma](server/prisma/schema.prisma)）
- **shared 公共支撑模块**：
  - `auth/`：JWT 双 Token、Token 黑名单、auth/role/permission 中间件
  - `file/`：本地/OSS 存储抽象、Multer 上传、流式下载
  - `message/`：站内消息、Mock 短信、WebSocket 实时推送、模板渲染
  - `io/`：Excel 读写、通用导入框架、Excel/PDF 导出
  - `config/`：系统配置服务 + 内存缓存
  - `backup/`：mysqldump 备份恢复 + 定时任务
  - `logger/`：winston + 按天切割
  - `response/`：统一响应、分页工具、Prisma 错误映射
  - `error/`：ApiError + 全局错误处理 + asyncHandler
  - `validate/`：Zod schema + 中间件
  - `utils/`：bcrypt、dayjs、UUID、Prisma 单例
- **公共接口路由**：`/api/auth/*`、`/api/shared/files/*`、`/api/shared/messages/*`、`/api/shared/config/*`、`/api/admin/backup/*`
- **种子数据**：5 个预置角色、超管账号、9 大菜单树、11 类字典、9 项系统配置、6 个消息模板、1 个测试学生账号

### shared-web 前端公共包

- 类型定义：覆盖所有业务实体与枚举
- utils：Axios 实例（含 401 静默刷新）、Blob 下载、格式化、校验规则
- composables：useAuth、usePagination、useDict、useMessage（WebSocket）
- components：StatusTag、PageHeader、EmptyState、FileUploader

### student-web 学生端

- Vue 3 + TS + Vite + Pinia + Vue Router + Element Plus 骨架
- 完整路由（任务书 01 第二节 20 个路由）
- StudentLayout：侧边栏 + 顶栏 + 未读公告角标
- 登录页 + 个人信息中心示范页 + 18 个业务占位页

### admin-web 后台端

- Vue 3 + TS + Vite + Pinia + Vue Router + Element Plus 骨架
- 静态路由 + 动态路由注册（任务书 02 第 2.2 节）
- AdminLayout：侧边栏（菜单树渲染）+ 顶栏 + 面包屑 + 多标签页缓存
- 登录页 + 工作台 + 45 个业务占位页（覆盖 9 大模块）

## 下一步开发计划

按任务书排期建议推进：

1. **学生端业务模块**（任务书 01）：
   - 第 2 阶段：学籍管理、课程与成绩
   - 第 3 阶段：奖惩资助、考勤请假
   - 第 4 阶段：宿舍、通知公告、反馈报修
2. **后台端业务模块**（任务书 02）：
   - 第 2 阶段：基础数据管理、用户管理
   - 第 3 阶段：学籍管理、教务模块
   - 第 4 阶段：学工、宿舍、考勤、通知
   - 第 5 阶段：报表统计模块
3. **联调与上线**：
   - 切换至 OSS 文件存储、真实短信
   - 配置 Nginx + HTTPS
   - PM2 部署后端

## 验收对照

本次会话已完成公共支撑模块验收标准（任务书 03 第十三节）的全部代码实现：

- [x] 认证鉴权：双 Token 机制、角色隔离、Token 失效均生效
- [x] 文件存储：本地/OSS 切换抽象、上传下载稳定
- [x] 消息推送：WebSocket 实时推送、未读角标、短信 Mock
- [x] 数据导入导出：模板生成、校验框架、Excel/PDF 导出
- [x] 系统配置：内存缓存、修改实时生效
- [x] 数据库备份：mysqldump、定时任务、过期清理
- [x] 日志与错误：统一格式、不泄露堆栈、按天切割
- [x] 前端公共组件库：两端工程可正常引用

> 注：以上验收项需在实际启动并执行 `npm install` 后验证。本次会话因本地环境未就绪（MySQL/Node 未安装），未执行编译与运行时验证。

## 生产部署

### 部署架构

```
                    ┌─────────────────────────────────────┐
                    │           Nginx (80/443)            │
                    │  ┌─────────┬──────────┬───────────┐ │
 用户浏览器  ──────►│  │ 学生端  │ 后台端   │  API 反代 │ │
                    │  │  /      │  /admin  │  /api     │ │
                    │  └─────────┴──────────┴───────────┘ │
                    └───────────────┬─────────────────────┘
                                    │ 127.0.0.1:3000
                    ┌───────────────▼─────────────────────┐
                    │     PM2 → Node.js 后端 (3000)        │
                    │     socket.io / node-cron            │
                    └───────────────┬─────────────────────┘
                                    │ 127.0.0.1:3306
                    ┌───────────────▼─────────────────────┐
                    │     Docker → MySQL 8.0 (3306)        │
                    └─────────────────────────────────────┘
```

- **前端**：`npm run build` 后产物由 Nginx 托管静态文件
- **后端**：PM2 fork 模式托管编译后的 `dist/server.js`
- **数据库**：Docker 容器，端口仅绑定 127.0.0.1

### 部署文件清单

```
deploy/
├── nginx/
│   └── student-mgmt.conf      # Nginx 配置模板（含 HTTPS 预留段）
└── scripts/
    └── deploy.sh              # 一键部署脚本（构建+迁移+启动）

server/
├── ecosystem.config.cjs       # PM2 进程配置
├── .env.production.example    # 生产环境变量模板
└── scripts/
    └── db-migrate.sh          # 数据库初始化脚本
```

### 一键部署（Linux）

#### 1. 准备服务器

```bash
# 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm i -g pm2

# 安装 Docker
curl -fsSL https://get.docker.com | sudo bash
sudo systemctl enable --now docker

# 安装 Nginx
sudo apt-get install -y nginx

# 安装中文字体（PDF 导出需要）
sudo apt-get install -y fonts-noto-cjk
```

#### 2. 上传代码并部署

```bash
# 上传项目到 /opt/student-mgmt（或任意目录）
git clone <repo-url> /opt/student-mgmt
cd /opt/student-mgmt

# 执行一键部署
chmod +x deploy/scripts/deploy.sh
./deploy/scripts/deploy.sh
```

脚本会自动完成：环境检查 → 启动 MySQL → 构建后端 → 初始化数据库 → 构建前端 → 启动 PM2

#### 3. 配置 Nginx

```bash
# 复制配置（按需修改 server_name 和 $project_root）
sudo cp deploy/nginx/student-mgmt.conf /etc/nginx/conf.d/
sudo vi /etc/nginx/conf.d/student-mgmt.conf   # 修改项目路径

# 测试并重载
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. 设置 PM2 开机自启

```bash
pm2 startup
# 按提示执行返回的 sudo 命令
pm2 save
```

### 手动部署（分步执行）

如需逐步控制部署过程：

```bash
# 1. 启动 MySQL
docker compose up -d

# 2. 配置后端环境变量
cd server
cp .env.production.example .env.production
vi .env.production    # 修改 JWT_SECRET、数据库密码等
cp .env.production .env

# 3. 安装依赖并构建
npm install --omit=dev
npm run build

# 4. 初始化数据库
chmod +x scripts/db-migrate.sh
./scripts/db-migrate.sh

# 5. 构建前端
cd ../student-web && npm install && npm run build
cd ../admin-web && npm install && npm run build

# 6. 启动后端
cd ../server
pm2 start ecosystem.config.cjs --env production
pm2 save
```

### 访问地址

| 端 | 地址 |
|---|---|
| 学生端 | `http://<服务器IP>/` |
| 后台端 | `http://<服务器IP>/admin` |
| API | `http://<服务器IP>/api` |
| Swagger（默认关闭） | `http://<服务器IP>/api-docs` |

### 默认账号（务必修改）

- 超级管理员：`admin / admin123`
- 测试学生：`20240001 / 123456`

### 运维命令

```bash
# PM2 管理
pm2 status                         # 查看状态
pm2 logs student-mgmt-server       # 实时日志
pm2 restart student-mgmt-server    # 重启
pm2 reload student-mgmt-server     # 重载
pm2 monit                          # 监控面板

# 数据库备份（已自动每天 02:00 执行）
# 手动备份见后端 /api/admin/backup 接口

# MySQL 管理
docker exec -it student-mgmt-mysql mysql -uroot -proot123456

# Nginx
sudo nginx -t                      # 测试配置
sudo systemctl reload nginx        # 重载
sudo tail -f /var/log/nginx/student-mgmt.access.log

# 更新部署
cd /opt/student-mgmt
git pull
./deploy/scripts/deploy.sh --restart    # 仅重启
# 或完整重新构建
./deploy/scripts/deploy.sh
```

### HTTPS 配置（有域名后）

1. 准备证书文件到 `/etc/nginx/ssl/`
2. 编辑 `/etc/nginx/conf.d/student-mgmt.conf`，取消 HTTPS server 块注释
3. 将 HTTP server 块改为 301 重定向到 HTTPS
4. `sudo nginx -t && sudo systemctl reload nginx`

### 从 db push 切换到 migrate 体系（可选）

当前首次部署使用 `prisma db push` 同步 Schema。项目稳定后，建议切换到 `migrate` 体系以获得版本化的数据库变更追踪：

```bash
cd server
# 1. 基于现有数据库创建基线迁移
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
# 2. 标记为已执行（不实际执行 SQL）
npx prisma migrate resolve --applied 0_init
# 3. 后续 schema 变更使用
npx prisma migrate dev --name xxx    # 开发环境
npx prisma migrate deploy            # 生产环境
```

