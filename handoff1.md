# 任务交接文档 handoff1

> **交接时间**：2026-08-18
> **所属项目**：大学学生管理系统（本地运行模式）
> **项目根目录**：`d:\trae work\大学学生管理系统`
> **当前阶段**：本地启动脚本修复已完成，待用户验证双击启动是否正常

---

## 一、项目概述

### 1.1 项目简介

大学学生管理系统，采用前后端分离架构，包含学生端前台、管理端后台和公共支撑模块。系统已从云端部署方案（Netlify + Render.com）切换为**本地运行模式**，通过双击批处理文件一键启动。

### 1.2 技术栈

| 层 | 技术 |
|---|---|
| 学生端前端 | Vue 3 + TypeScript + Vite + Pinia + Element Plus |
| 管理端前端 | Vue 3 + TypeScript + Vite + Pinia + Element Plus |
| 后端 | Node.js 20 + Express + TypeScript + Prisma ORM |
| 数据库 | MySQL 8.0（本地服务，非 Docker） |
| 认证 | JWT 双 Token（Access + Refresh）+ 黑名单 |
| 实时通信 | Socket.io（WebSocket） |
| 文件处理 | Multer（上传）、pdfkit（PDF 生成）、exceljs（Excel 导出） |
| 富文本 | WangEditor 5 |

### 1.3 项目结构

```
d:\trae work\大学学生管理系统\
├── server/              # 后端（Express + Prisma）
├── student-web/         # 学生端前端（端口 5173）
├── admin-web/           # 管理端前端（端口 5174）
├── shared-web/          # 前端公共包
├── 启动.bat              # 中文文件名启动脚本（用户双击入口）
├── start.bat             # 英文文件名启动脚本（与启动.bat 内容一致）
├── 停止.bat              # 中文文件名停止脚本
├── stop.bat              # 英文文件名停止脚本
├── docker-compose.yml   # Docker MySQL 配置（已弃用，保留备份）
├── render.yaml           # Render.com 部署配置（已弃用）
└── README-本地快速启动.md  # 本地运行说明文档
```

### 1.4 服务端口

| 服务 | 端口 | 访问地址 |
|---|---|---|
| 后端 API | 3000 | http://localhost:3000 |
| 学生端 UI | 5173 | http://localhost:5173 |
| 管理端 UI | 5174 | http://localhost:5174 |

### 1.5 测试账号

| 角色 | 账号 | 密码 |
|---|---|---|
| 学生 | 20240001 | 123456 |
| 管理员 | admin | admin123 |

---

## 二、当前任务上下文

### 2.1 用户原始诉求

用户反馈：**双击 `启动.bat` 或 `start.bat` 后，终端窗口快速闪烁一下即关闭，没有任何效果，不会打开任何网页。** 要求修复此现象。

### 2.2 根本原因（已定位）

**错误信息**：`\nodejs was unexpected at this time.`

**根因**：旧版启动脚本在查找 Node.js 路径时使用了**嵌套 `if/else` 括号块结构**。当脚本执行到包含 `C:\Program Files (x86)\nodejs` 路径字符串的分支时，cmd.exe 解析器把路径中的 `(x86)` 里的 `(` 误判为括号块嵌套起始，导致语法解析崩溃，脚本在到达 `pause` 命令之前就异常退出，窗口随即关闭。

**触发条件**：
1. `where node` 失败（Node.js 不在 PATH 中）
2. `C:\Program Files\nodejs` 不存在
3. 解析器走到 `C:\Program Files (x86)\nodejs` 分支 → 崩溃

**用户机器实际情况**：Node.js v24.19.0 安装在 `D:\js.node\`，不在标准路径，也不在 PATH 中，因此必然走到触发崩溃的分支。

### 2.3 已完成的修复

#### 修复 1：消除嵌套 if/else 括号块

将 Node.js 查找逻辑从嵌套 `if/else (括号块)` 改为**扁平的顺序判断 + `goto :label` 跳转**：

```bat
:find_node
set "NODE_DIR=C:\Program Files\nodejs"
if exist "!NODE_DIR!\node.exe" goto :node_set_path

set "NODE_DIR=C:\Program Files (x86)\nodejs"
if exist "!NODE_DIR!\node.exe" goto :node_set_path

set "NODE_DIR=%LOCALAPPDATA%\Programs\nodejs"
if exist "!NODE_DIR!\node.exe" goto :node_set_path

set "NODE_DIR=D:\js.node"
if exist "!NODE_DIR!\node.exe" goto :node_set_path
```

**关键原理**：不在括号块 `(...)` 内时，括号字符 `()` 只是普通文本，不会触发 cmd.exe 的栈匹配解析。

#### 修复 2：增加本机 Node.js 非标准路径回退

新增 `D:\js.node\` 作为第 4 个 Node.js 查找回退路径（用户机器的实际安装位置）。

#### 修复 3：编码与换行符保障

- 文件内容全部为纯英文（规避 GBK/UTF-8 中文编码问题）
- 无 UTF-8 BOM
- CRLF 换行符

### 2.4 已修改的文件

| 文件 | 变更说明 |
|---|---|
| `start.bat` | 重写：goto 扁平化 + 新增 D:\js.node\ 回退路径 |
| `启动.bat` | 同步 start.bat 内容，完全一致 |
| `check_bat.ps1`、`check_bat.bat`、`test_syntax.bat` | 排障临时文件，已删除 |

### 2.5 验证状态

| 验证项 | 状态 | 说明 |
|---|---|---|
| 语法测试 | 已通过 | 运行 `.\start.bat` 不再出现 `was unexpected at this time.` |
| 双击启动验证 | **待用户确认** | 用户尚未反馈双击是否正常启动全部服务并打开浏览器 |

---

## 三、启动脚本工作流程（修复后）

`start.bat` / `启动.bat` 的完整执行流程如下：

```
[1/6] 查找 Node.js
  └─ where node → 成功则跳过查找
  └─ 失败则按序检查 4 个路径 → 找到则设到 PATH → 找不到则报错退出
[2/6] 检查 MySQL 服务
  └─ 按序检查 MySQL80 / MySQL84 / MySQL / MySQL57
  └─ 运行中 → 跳过；已停止 → 尝试启动；不存在 → 报错退出
  └─ 用 mysql.exe 验证连接（root/root123456）并创建 student_mgmt 数据库
[3/6] 后端依赖检查 + 数据库初始化
  └─ server/ 无 node_modules → npm install
  └─ npx prisma generate
  └─ npx prisma db push --accept-data-loss
  └─ npm run seed
[4/6] 前端依赖检查
  └─ student-web/ 无 node_modules → npm install
  └─ admin-web/ 无 node_modules → npm install
[5/6] 启动服务（各开一个新 cmd 窗口）
  └─ start cmd /k → 后端 npm run dev（端口 3000）
  └─ start cmd /k → 学生端 npm run dev（端口 5173）
  └─ start cmd /k → 管理端 npm run dev（端口 5174）
[6/6] 等待 10 秒后打开浏览器
  └─ start http://localhost:5173
  └─ start http://localhost:5174
  └─ pause（窗口保持）
```

---

## 四、环境信息

### 4.1 用户机器环境

| 项 | 值 |
|---|---|
| 操作系统 | Windows |
| Node.js 版本 | v24.19.0 |
| Node.js 安装路径 | `D:\js.node\` |
| MySQL | 本地 MySQL 8.0 服务（服务名 MySQL80） |
| MySQL root 密码 | `root123456` |
| 数据库名 | `student_mgmt` |
| Docker Desktop | 不适用（用户电脑 CPU 虚拟化未开启，Docker 无法运行） |

### 4.2 关键环境变量

- `server/.env`：`DATABASE_URL=mysql://root:root123456@localhost:3306/student_mgmt`
- `student-web/.env`：`VITE_API_BASE_URL=http://localhost:3000`、`VITE_WS_URL=ws://localhost:3000`
- `admin-web/.env`：同上

---

## 五、待办事项与后续任务

### 5.1 当前待确认（高优先级）

- [ ] 用户双击 `启动.bat` 验证是否正常启动 3 个服务窗口 + 自动打开浏览器
- [ ] 如果仍有问题，需要进一步排查：
  - MySQL 服务是否正常运行
  - `server/.env` 中的 `DATABASE_URL` 密码是否匹配
  - npm install 是否因网络问题失败

### 5.2 已知技术债务

| 编号 | 描述 | 优先级 |
|---|---|---|
| TD-01 | `停止.bat` / `stop.bat` 也应做同样的括号块安全扫描（当前未报问题但存在隐患） | 中 |
| TD-02 | 启动脚本缺少日志文件输出，双击关闭后无法回溯失败步骤 | 低 |
| TD-03 | `admin-web/src/api/status.ts` 曾有 3 个 graduation API 路径缺少 `/status/` 前缀（已修复，需回归确认） | 低 |

### 5.3 功能开发状态

系统已完成的业务模块（均已通过联调测试，75/75 接口返回 code=0）：

| 模块 | 状态 |
|---|---|
| 认证模块（登录/注册/Token 刷新） | 已完成 |
| 学籍管理 | 已完成 |
| 学籍异动申请 | 已完成 |
| 在校证明 PDF 生成 | 已完成 |
| 课表查询 | 已完成 |
| 成绩查询与 GPA | 已完成 |
| 选课/退课 | 已完成 |
| 补考报名 | 已完成 |
| 奖惩与资助模块 | 已完成 |
| 考勤与请假模块 | 已完成 |
| 宿舍管理 | 已完成 |
| 通知公告 | 已完成 |
| 反馈报修 | 已完成 |
| 多级审批流程（辅导员 → 学务老师） | 已完成 |

---

## 六、交接说明

### 6.1 接手智能体需要做的第一件事

**确认用户是否已验证双击启动成功。** 如果用户反馈仍有问题，按以下步骤排查：

1. 在终端中直接运行 `.\start.bat`（而非双击），捕获崩溃前的最后一行错误输出
2. 检查是否有新增的带括号路径字符串出现在 `(...)` 括号块内
3. 检查文件是否有 UTF-8 BOM（前 3 字节是否为 `EF BB BF`）
4. 检查换行符是否为 CRLF

### 6.2 关键注意事项

1. **bat 脚本编码**：必须保存为 ANSI（GBK）或纯 ASCII（无 BOM），换行符必须为 CRLF
2. **括号块禁令**：路径字符串中含 `(x86)`、`(x64)` 等括号时，**绝对不能写在 cmd.exe 的 `(...)` 括号块内**，必须用 `goto :label` 扁平化
3. **本地 MySQL**：系统使用本地 MySQL 服务（MySQL80），不依赖 Docker
4. **Node.js 路径**：用户机器 Node.js 装在 `D:\js.node\`，已作为回退路径写入脚本
5. **CORS 配置**：后端 CORS 必须支持 `localhost:5173` 和 `localhost:5174`
6. **一键启动**：通过双击 `启动.bat` 实现，`停止.bat` 停止服务

### 6.3 相关文件索引

| 文件 | 路径 | 用途 |
|---|---|---|
| 启动脚本（中文） | `启动.bat` | 用户双击入口 |
| 启动脚本（英文） | `start.bat` | 与启动.bat 内容一致 |
| 停止脚本（中文） | `停止.bat` | 停止所有服务 |
| 停止脚本（英文） | `stop.bat` | 与停止.bat 内容一致 |
| 后端入口 | `server/src/app.ts` | Express 应用配置 |
| Prisma Schema | `server/prisma/schema.prisma` | 数据库模型定义 |
| 种子数据 | `server/src/seed.ts` | 初始化测试数据 |
| 学生端路由 | `student-web/src/router/` | 20 条路由 |
| 管理端路由 | `admin-web/src/router/` | 45 条路由（动态路由） |
| 本地启动说明 | `README-本地快速启动.md` | 用户文档 |
| 修复交接文档 | `交接文档-启动脚本修复说明.md` | 本次修复的详细技术文档 |

---

## 七、联系信息

- 用户偏好：期望智能体以资深程序员角色行事，遇到不确定的地方先询问再行动
- 沟通语言：中文
- 用户背景：可能是开发者或学生，正在完成大学学生管理系统的网页开发任务
