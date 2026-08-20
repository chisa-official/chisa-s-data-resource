# 任务交接文档 handoff3

> **交接时间**：2026-08-20
> **所属项目**：大学学生管理系统（本地运行模式）
> **项目根目录**：`d:\trae work\大学学生管理系统`
> **当前阶段**：系统功能完整、视觉升级完成，处于可交付/可继续迭代状态

---

## 一、项目概述

### 1.1 项目简介

大学学生管理系统，采用前后端分离架构，包含学生端前台、管理端后台和公共支撑模块。系统运行于**本地模式**，通过 `启动.bat` 一键启动。

### 1.2 技术栈

| 层 | 技术 |
|---|---|
| 学生端前端 | Vue 3 + TypeScript + Vite + Pinia + Element Plus |
| 管理端前端 | Vue 3 + TypeScript + Vite + Pinia + Element Plus |
| 共享样式包 | shared-web（SCSS Tokens、主题、Mixins、工具函数） |
| 后端 | Node.js 20+ + Express + TypeScript + Prisma ORM |
| 数据库 | MySQL 8.0（本地服务，非 Docker） |
| 认证 | JWT 双 Token（Access + Refresh）+ 黑名单 |
| 实时通信 | Socket.io（WebSocket） |

### 1.3 服务端口

| 服务 | 端口 | 访问地址 |
|---|---|---|
| 后端 API | 3000 | http://localhost:3000 |
| 学生端 UI | 5173 | http://localhost:5173 |
| 管理端 UI | 5174 | http://localhost:5174 |

### 1.4 测试账号

| 角色 | 账号 | 密码 | 备注 |
|---|---|---|---|
| 学生 | 20240001 | 123456 | 学生端登录 |
| 管理员 | admin | admin123 | 管理端登录 |

---

## 二、当前任务上下文

### 2.1 用户原始诉求

用户希望把系统视觉风格升级为**简洁、干净**的页面，同时保持 Element Plus 组件库不变、不改动业务逻辑。后续用户又要求将项目工作文档上传 GitHub（当前环境缺少 Git，待用户补充信息后再执行）。

### 2.2 已完成的工作

#### 阶段 A：启动脚本与路由稳定性修复（handoff1 已覆盖，已验证）

- `启动.bat` / `start.bat` 使用扁平 `goto` 结构，避免 `(x86)` 括号解析崩溃
- 增加 `D:\js.node\` 等非标准 Node.js 路径回退
- 修复管理端侧边栏 `fullPath` 拼接错误导致的 404
- 修复 Vue Router 4 中 DIRECTORY 类型路由无组件导致的子页面 404
- 路由扁平化，route name 使用 `fullPath` 保证唯一性

#### 阶段 B：功能补全（handoff2 期间完成，已验证）

- 学生注册 / 管理员注册功能
- 管理端通知公告模块（列表、发布、阅读统计）
- 顶部消息铃铛红点消除（Popover + 一键已读）
- 管理端修改学生信息后，学生端个人主页实时同步

#### 阶段 C：视觉升级（本次完成，已构建验证）

- 建立 `shared-web/styles/tokens.scss` 共享设计 Token
- 定制 Element Plus 主题变量 `shared-web/styles/theme.scss`
- 两端 `variables.scss` 统一引用共享 Token 和 Mixins
- 重制管理端 Dashboard、两端登录页
- 升级 Layout、共享组件（PageHeader / StatusTag / EmptyState / FileUploader）
- 统一 ECharts 主题为 `shared-web/utils/echarts-theme.ts`

### 2.3 关键设计决策

| 决策项 | 内容 |
|---|---|
| 品牌主色 | `#2563eb` |
| 组件库 | 保留 Element Plus，仅覆盖主题变量 |
| 业务逻辑 | 不改动 API 调用与后端逻辑 |
| 响应式 | 桌面优先（≥1280px），设 4 个断点 |
| 设计 Token | 管理端与学生端共用 `shared-web` Token |
| ECharts | 集中注册统一主题，禁止各页面自行配色 |

---

## 三、项目结构

```
d:\trae work\大学学生管理系统\
├── server/                   # 后端（Express + Prisma）
│   ├── src/                  # 源码
│   ├── dist/                 # 构建产物（JS 编译输出）
│   ├── prisma/schema.prisma  # 数据库模型
│   └── .env / .env.example   # 环境变量
├── student-web/              # 学生端前端（端口 5173）
│   ├── src/                  # 源码
│   ├── dist/                 # 构建产物
│   └── .env.development
├── admin-web/                # 管理端前端（端口 5174）
│   ├── src/                  # 源码
│   ├── dist/                 # 构建产物
│   └── .env.development
├── shared-web/               # 前端共享包
│   ├── styles/
│   │   ├── tokens.scss       # 设计 Token
│   │   ├── theme.scss        # Element Plus 主题
│   │   └── mixins.scss       # 通用 SCSS Mixins
│   └── utils/
│       └── echarts-theme.ts  # ECharts 统一主题
├── docs/                     # 任务书与交接文档
│   ├── 任务书01-学生端前台功能.md
│   ├── 任务书02-后台管理端.md
│   ├── 任务书03-公共支撑模块.md
│   └── 设计交接文档.md
├── 启动.bat                   # 中文启动脚本（用户双击入口）
├── start.bat                  # 英文启动脚本
├── 停止.bat / stop.bat        # 停止脚本
├── README.md
├── README-本地快速启动.md
├── handoff1.md
├── handoff3.md               # 本文档
└── .gitignore
```

---

## 四、关键文件索引

### 4.1 设计系统相关

| 文件 | 用途 |
|---|---|
| `shared-web/styles/tokens.scss` | 颜色、字体、间距、阴影、圆角、断点等 Token |
| `shared-web/styles/theme.scss` | Element Plus 主题变量覆盖 |
| `shared-web/styles/mixins.scss` | flex、ellipsis、scrollbar、card-surface 等 Mixins |
| `shared-web/utils/echarts-theme.ts` | ECharts 统一主题注册 |
| `admin-web/src/styles/variables.scss` | 管理端样式入口，forward 共享 Token |
| `student-web/src/styles/variables.scss` | 学生端样式入口，forward 共享 Token |
| `admin-web/src/styles/global.scss` | 管理端全局样式 |
| `student-web/src/styles/global.scss` | 学生端全局样式 |

### 4.2 视觉升级相关页面/组件

| 文件 | 用途 |
|---|---|
| `admin-web/src/views/dashboard/index.vue` | 管理端首页重制 |
| `admin-web/src/views/login/index.vue` | 管理端登录页重制 |
| `student-web/src/views/login/index.vue` | 学生端登录页重制 |
| `admin-web/src/layouts/AdminLayout.vue` | 管理端布局视觉升级 |
| `admin-web/src/layouts/components/Sidebar.vue` | 侧边栏视觉升级 |
| `admin-web/src/layouts/components/SidebarItem.vue` | 菜单项与路径计算 |
| `admin-web/src/layouts/components/Breadcrumb.vue` | 面包屑适配扁平路由 |
| `admin-web/src/layouts/components/TagsView.vue` | TagsView 视觉调整 |
| `shared-web/components/PageHeader.vue` | 页面标题栏 |
| `shared-web/components/StatusTag.vue` | 状态标签 |
| `shared-web/components/EmptyState.vue` | 空状态 |
| `shared-web/components/FileUploader.vue` | 文件上传 |

### 4.3 路由与权限

| 文件 | 用途 |
|---|---|
| `admin-web/src/stores/permission.ts` | 动态路由拉取、扁平化、生成菜单 |
| `admin-web/src/router/staticRoutes.ts` | 静态路由（含 `/redirect/:path(.*)*`） |
| `admin-web/src/router/guards.ts` | 路由守卫 |
| `student-web/src/router/` | 学生端路由 |

### 4.4 后端核心

| 文件 | 用途 |
|---|---|
| `server/src/app.ts` | Express 应用配置、CORS |
| `server/prisma/schema.prisma` | 数据模型 |
| `server/src/seed.ts` | 初始化测试数据 |
| `server/.env` | 数据库连接、JWT Secret 等 |

---

## 五、构建与验证状态

| 验证项 | 状态 | 说明 |
|---|---|---|
| 后端 TypeScript 编译 | 通过 | `npm run build` 成功，输出到 `server/dist/` |
| 管理端类型检查 | 通过 | `npm run type-check` 无错误 |
| 学生端类型检查 | 通过 | `npm run type-check` 无错误 |
| 管理端生产构建 | 通过 | `npx vite build` 成功，输出到 `admin-web/dist/` |
| 学生端生产构建 | 通过 | `npx vite build` 成功，输出到 `student-web/dist/` |
| 服务启动 | 通过 | 端口 3000 / 5173 / 5174 均 200 OK |
| 功能回归 | 通过 | 菜单无 404，注册/通知/消息/资料同步均正常 |

---

## 六、重要约束与注意事项

### 6.1 环境约束

- **本地 MySQL 8.0**：使用服务名 `MySQL80`（或 `MySQL84` / `MySQL` / `MySQL57` 回退），不使用 Docker
- **Node.js 路径**：用户机器 Node.js 位于 `D:\js.node\`，启动脚本已加入回退路径
- **数据库密码**：`root123456`，配置在 `server/.env` 的 `DATABASE_URL`
- **CORS**：后端必须允许 `http://localhost:5173` 和 `http://localhost:5174`

### 6.2 工程约定

- **bat 脚本**：
  - 必须使用 UTF-8 无 BOM、CRLF 换行
  - `echo` 命令避免圆括号 `()`，使用方括号 `[]` 替代
  - 查找带括号的路径（如 `C:\Program Files (x86)`）时，必须用 `goto :label` 扁平化，不能写在 `if (...)` 括号块内
- **Vue Router**：
  - 管理端路由已扁平化，MENU 类型直接作为 `AdminLayout` 的子路由
  - DIRECTORY 类型仅用于侧边栏分组，不注册为带 `component` 的路由
  - route name 使用 `fullPath` 保证唯一
- **设计 Token**：新增样式变量优先放到 `shared-web/styles/tokens.scss`，两端通过 `@forward` 引用
- **ECharts**：所有图表统一 `import { registerTheme } from '@shared-web/utils/echarts-theme'` 注册，禁止单独写颜色数组

### 6.3 敏感信息

- `server/.env` 包含数据库密码和 JWT Secret
- `.gitignore` 已排除 `node_modules/`、`dist/`、`.env` 文件
- 上传 GitHub 前请确认是否保留 `.env.example` 与 `.env.production.example`

---

## 七、待办事项

### 7.1 当前待处理

- [ ] **GitHub 上传**：用户要求将工作文档上传 GitHub，但当前环境未检测到 Git
  - 需要用户确认：上传范围（仅 `docs/` 还是整个项目）
  - 需要用户确认：GitHub 仓库地址（已有/新建）
  - 需要用户确认：认证方式（PAT / SSH）
  - 需要用户安装 Git 或提供 `git.exe` 路径

### 7.2 可选优化

| 编号 | 描述 | 优先级 |
|---|---|---|
| OPT-01 | 为 `停止.bat` / `stop.bat` 增加日志输出，便于排查停止失败 | 低 |
| OPT-02 | 将 `shared-web` 配置为 workspace package，减少相对路径引用 | 低 |
| OPT-03 | 补充学生端个人主页更多信息的编辑入口 | 低 |

---

## 八、接手智能体行动指南

### 8.1 如果用户继续推进 GitHub 上传

1. 先确认当前环境是否有 Git：`where git` 或检查 `C:\Program Files\Git\cmd\git.exe`
2. 根据用户回答初始化仓库或添加远程：
   ```bash
   git init
   git remote add origin <用户提供的仓库地址>
   ```
3. 编写/检查 `.gitignore`，确保不提交 `node_modules`、`.env`、`dist`
4. 执行 add、commit、push：
   ```bash
   git add .
   git commit -m "init: 大学学生管理系统"
   git branch -M main
   git push -u origin main
   ```
5. 如果使用 HTTPS + PAT，提醒用户将密码替换为 token

### 8.2 如果用户继续迭代功能

- 优先查看 `docs/任务书*.md` 确认剩余需求
- 修改管理端页面时同步检查 `permission.ts` 路由扁平化逻辑
- 修改学生端信息同步相关功能时，确认调用 `userStore.fetchStudentInfo()` 刷新数据

### 8.3 如果用户继续调整视觉

- 颜色/间距/圆角一律从 `tokens.scss` 取变量
- 登录页和 Dashboard 已作为参考实现，新页面可参照其结构
- 图表颜色必须在 `echarts-theme.ts` 中维护

---

## 九、联系信息

- 用户偏好：期望智能体以资深程序员角色行事，遇到不确定的地方先询问再行动
- 沟通语言：中文
- 用户背景：开发者/学生，正在完成大学学生管理系统的网页开发任务
