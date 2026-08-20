# handoff1 — 学生端（student-web）任务交接文档

> 本文档面向**学生端（student-web）**的任务交接。
> 接收方：负责学生端后续工作（视觉升级/页面优化/维护迭代）的智能体或开发者。
> 前置阶段已完成学生端全部 21 个业务页面功能实现并通过验收。

---

## 一、项目概览与技术栈

### 1.1 项目定位

本项目是一套高校学生管理系统，前后端分离，共三端：

| 端 | 工程目录 | 默认端口 | 定位 |
| --- | --- | --- | --- |
| **学生端前台** | `student-web/` | `http://localhost:5173` | 面向在校学生，前台门户风格 |
| 后台管理端 | `admin-web/` | `http://localhost:5174` | 面向教务/辅导员/超管，工作台风格 |
| 后端 API | `server/` | `http://localhost:3000` | Express + Prisma + MySQL，前后端共用 |
| 共享前端库 | `shared-web/` | — | 类型、组件、composables、工具，两端复用 |

> 本文档仅交接**学生端 student-web**，但学生端依赖 `server/`（API）与 `shared-web/`（公共能力），需对三者关系有基本认知。

### 1.2 学生端技术栈

| 类别 | 技术 | 版本 | 说明 |
| --- | --- | --- | --- |
| 框架 | Vue 3 | ^3.4 | Composition API + `<script setup>` |
| 语言 | TypeScript | ^5.4 | 全量类型注解 |
| 构建 | Vite | ^5.2 | |
| 状态管理 | Pinia | ^2.1 | + `pinia-plugin-persistedstate` 持久化 |
| 路由 | Vue Router | ^4.3 | |
| UI 组件库 | Element Plus | ^2.7 | **设计不可更换** |
| 图表 | ECharts | ^5.5 | 成绩趋势展示 |
| HTTP | Axios | ^1.6 | 含 401 静默刷新拦截器 |
| 样式 | SCSS / SASS | — | |
| 自动导入 | unplugin-auto-import / unplugin-vue-components | | Element Plus 按需引入 |

### 1.3 学生端目录结构

```
student-web/
├── src/
│   ├── api/               # 学生端 API 封装（调用后端接口）
│   ├── assets/            # 静态资源（图片/字体）
│   ├── components/        # 学生端本地组件
│   ├── layouts/
│   │   └── StudentLayout.vue   # 学生端主布局
│   ├── router/
│   │   └── index.ts       # 学生端路由表
│   ├── stores/
│   │   └── user.ts        # 学生用户状态（含 fetchStudentInfo）
│   ├── styles/            # 学生端样式（变量/全局）
│   ├── views/             # 业务页面（21 个，见第三节）
│   ├── App.vue
│   └── main.ts            # 学生端入口
├── .env.development       # 本地开发环境变量
├── vite.config.ts
└── package.json
```

### 1.4 与共享库的关系

学生端通过 `shared-web/` 复用以下能力，**不可重复造轮子**：

- `shared-web/components/`：`PageHeader`、`StatusTag`、`EmptyState`、`FileUploader`
- `shared-web/composables/`：`useAuth`、`usePagination`、`useDict`、`useMessage`
- `shared-web/utils/`：`request`（Axios 实例）、`download`、`format`、`validate`
- `shared-web/types/index.ts`：全部业务实体类型与枚举

---

## 二、启动与访问方式

### 2.1 一键启动

```bash
# Windows 下双击项目根目录 启动.bat（或 start.bat）即可一键启动三端服务
# 启动完成后浏览器会自动打开学生端：http://localhost:5173
```

启动脚本会依次拉起：后端 API（3000）→ 学生端（5173）→ 后台端（5174）。

### 2.2 单独启动学生端（开发模式）

```bash
cd "d:\trae work\大学学生管理系统\student-web"
npm install      # 首次运行
npm run dev      # 启动开发服务器，默认 5173
```

### 2.3 测试账号

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 学生 | `20240001` | `123456` |

### 2.4 后端依赖

学生端所有数据来自后端 API，需确保 `server/` 已启动：

| 项 | 值 |
| --- | --- |
| 后端 API 地址 | `http://localhost:3000` |
| 健康检查 | `http://localhost:3000/api/health` |
| 学生端环境变量 | `VITE_API_BASE_URL=http://localhost:3000/api`（见 `.env.development`） |

### 2.5 数据库

- 类型：MySQL 8.0（本地服务名 `MySQL80`）
- 库名：`student_mgmt`
- 连接串：`mysql://root:root123456@localhost:3306/student_mgmt`

---

## 三、功能清单与验收状态

### 3.1 学生端页面清单（21 个业务页 + 1 个 Layout）

#### 模块 1：登录与个人信息中心

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/login` | `login/index.vue` | 学号+密码 `el-form`、登录按钮 | ✅ |
| `/register` | `register/index.vue` | 学生自助注册表单（学号/姓名/性别/手机/邮箱/密码） | ✅ |
| `/profile` | `profile/index.vue` | 个人档案卡片 + `el-descriptions` + 头像 | ✅ |
| `/profile/edit` | `profile/edit.vue` | 信息修改申请表单 + 历史申请列表 | ✅ |

#### 模块 2：学籍管理

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/status` | `status/index.vue` | 状态卡片 + 异动申请 `el-timeline` | ✅ |
| `/status/apply/:type` | `status/apply.vue` | 异动申请表单（按 type 动态字段）+ 附件上传 | ✅ |
| `/status/certificate` | `status/certificate.vue` | 证明申请表单 + 历史申请 + PDF 下载 | ✅ |

#### 模块 3：课程与成绩

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/course/timetable` | `course/timetable.vue` | 周课表网格（7 列 × N 节次） | ✅ |
| `/course/score` | `course/score.vue` | 成绩表格（按学期分组）+ ECharts 折线图 | ✅ |
| `/course/select` | `course/select.vue` | 可选课程列表 + 选课/退选 + 倒计时 | ✅ |
| `/course/retake` | `course/retake.vue` | 重修报名列表 | ✅ |

#### 模块 4：奖惩资助

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/award/scholarship` | `award/scholarship.vue` | 奖学金申请表单 + 进度条 | ✅ |
| `/award/aid` | `award/aid.vue` | 助学金/贷款申请表单 + 进度条 | ✅ |
| `/award/honor` | `award/honor.vue` | 评优申请表单 + 进度条 | ✅ |
| `/award/discipline` | `award/discipline.vue` | 违纪记录只读列表 | ✅ |

#### 模块 5：考勤 & 请假

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/attendance/leave` | `attendance/leave.vue` | 请假表单 + 记录列表 + 审批状态跟踪 | ✅ |
| `/attendance/record` | `attendance/record.vue` | 考勤记录表格 + 统计卡片（出勤率/缺勤次数） | ✅ |

#### 模块 6：宿舍管理

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/dorm` | `dorm/index.vue` | 宿舍信息卡片 + 床位信息 + 卫生检查历史 + 违纪通报 + 调宿/退宿弹窗 | ✅ |

#### 模块 7：通知公告

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/notice` | `notice/index.vue` | 列表 + 未读角标 + 范围筛选 Tab（全部/全校/院系/班级） | ✅ |
| `/notice/:id` | `notice/detail.vue` | 富文本展示 + 附件下载 + 自动标记已读 | ✅ |

#### 模块 8：反馈报修

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/feedback/repair` | `feedback/repair.vue` | 报修表单（类型/位置/描述/多图上传）+ 记录列表 + 处理状态 | ✅ |
| `/feedback/complaint` | `feedback/complaint.vue` | 意见反馈表单 + 回复查看 | ✅ |

### 3.2 学生端 Layout

文件：`student-web/src/layouts/StudentLayout.vue`

- 左侧深色侧边栏 `#001529`，宽 220px
- 9 大菜单分组（个人信息中心 / 学籍管理 / 课程与成绩 / 奖惩资助 / 考勤请假 / 宿舍管理 / 通知公告 / 反馈报修）
- 顶栏含：页面标题、铃铛角标（未读数）、用户下拉（头像+姓名+退出）
- 顶部 pending 状态黄色提示条（账号未分配时显示）
- 主体区 `<router-view>` 含 `fade` 过渡动画
- **没有 keep-alive**，每次进入页面都会触发 `onMounted`（已利用此机制做档案强制刷新）

### 3.3 已验收的关键交互

1. **学生注册流程**：学号（8-12 位，唯一）+ 姓名 + 性别 + 可选手机/邮箱 + 强密码；注册后落入"待分配"虚拟部门，顶部黄色提示条，等待管理员分配。
2. **未激活/待分配账号登录限制**：正确拦截并提示。
3. **个人档案同步**：管理员修改学生信息后，学生端 `/profile` 通过 `onMounted` 调用 `fetchStudentInfo()` 强制拉取最新档案，UI 立即更新。
4. **通知未读角标**：铃铛角标显示未读数，进入通知详情自动标记已读。

---

## 四、任务边界与硬约束

### 4.1 可改文件（学生端视觉/布局层）

```
student-web/src/
├── views/            # 业务页面样式与布局调整
├── layouts/          # StudentLayout.vue 视觉升级
├── components/        # 学生端本地组件
├── styles/           # 变量、全局样式
└── assets/           # 图片、图标、字体
```

### 4.2 不可改文件（业务逻辑冻结）

```
student-web/src/
├── api/              # API 调用封装，不得修改
├── stores/           # Pinia 状态逻辑，不得修改（可在内部增强样式相关 getter）
├── router/           # 路由表，路径与组件映射不得修改
└── main.ts           # 入口（如需注入主题 SCSS 可微调，不得改业务挂载逻辑）

shared-web/
├── components/       # 必须保持 Props API 兼容，可在内部增强样式
├── composables/      # 不得修改
├── utils/            # 不得修改
└── types/            # 不得修改

server/               # 后端完全冻结
```

### 4.3 必须保留的设计约定

1. **Element Plus 不更换**：可定制主题、覆盖样式、二次封装，但不能换成 Naive UI / Ant Design Vue / Arco 等其他组件库。
2. **路由表保持不变**：`student-web/src/router/index.ts` 的路由路径与组件映射不可修改，否则破坏导航/面包屑功能。
3. **共享组件 API 兼容**：`shared-web/components/` 中 `PageHeader`、`StatusTag`、`EmptyState`、`FileUploader` 的 Props 名与类型不可改变，可在内部增强样式。
4. **状态色映射不可变**（来自 `StatusTag.vue`）：
   ```typescript
   PENDING        → warning (黄)
   APPROVED       → success (绿)
   REJECTED       → danger  (红)
   PENDING_REPAIR → warning (黄)
   PROCESSING     → primary (蓝)
   DONE           → success (绿)
   NORMAL         → success (绿)  // 在校
   SUSPENDED      → warning (黄)  // 休学
   RESUMED        → primary (蓝)  // 复学
   DROPPED        → danger  (红)  // 退学
   HELD_BACK      → warning (黄)  // 留级
   GRADUATED      → info    (灰)  // 毕业
   ACTIVE         → success (绿)  // 账号启用
   DISABLED       → danger  (红)  // 账号禁用
   ```
5. **深色侧边栏保留**：侧边栏 `#001529`（Ant Design 经典深色）是产品识别元素，可微调但不可整体改浅。
6. **三端配色统一**：学生端与后台端是同一品牌下的两个产品，需共享同一套设计 Token，仅以导航/密度风格区分两端角色。
7. **响应式适配**：主要面向 PC（≥1280px），建议做 1280/1440/1920 三档桌面响应式优化，**移动端不强求**。

### 4.4 学生端特有注意事项

1. **`/profile` 强制刷新机制**：`profile/index.vue` 通过 `onMounted` 调用 `refreshProfile()` → `userStore.fetchStudentInfo()` 强制拉取最新档案。若设计阶段为该页加 `keep-alive`，需同步改用 `onActivated` 钩子，否则档案不会刷新。
2. **顶部 pending 提示条**：账号未分配部门时显示黄色提示条，是注册流程的视觉反馈，不可移除。
3. **铃铛角标**：依赖 `useMessage` composable 的 WebSocket 消息监听，视觉升级时保留角标与未读数显示。

---

## 五、交付物与验收标准

### 5.1 交付物清单（学生端）

#### 代码层

```
student-web/src/styles/
├── variables.scss       # 升级后的全局变量（与后台端共享 Token）
├── global.scss          # 全局基础样式
└── tokens.scss          # 学生端设计 Token（引用 shared-web/styles/tokens.scss）

student-web/src/
├── layouts/StudentLayout.vue   # 视觉升级（侧边栏品牌区/顶栏用户卡片/主体卡片化）
├── views/login/index.vue       # 登录页品牌化（左插画+右表单）
├── views/profile/index.vue     # 个人档案页门户化（三栏：信息卡+学业进度+最新通知）
├── views/course/timetable.vue  # 课表彩色课程块
└── views/...                    # 其余页面应用新 Token

shared-web/styles/              # 与后台端共享
├── tokens.scss
└── theme.scss
```

#### 文档层

```
docs/
└── 学生端设计走查清单.md   # 学生端各页关键状态截图与视觉核对
```

### 5.2 验收标准

1. **启动验证**：双击 `启动.bat`，三端服务起来后浏览器自动打开 `http://localhost:5173`，学生端正常加载。
2. **登录验证**：用 `20240001` / `123456` 登录成功，进入主布局。
3. **逐页走查**：按第三节 21 个页面清单逐页访问，对照设计规范核对视觉。
4. **状态走查**：每张列表页至少触发一次空数据/加载/错误态。
5. **响应式走查**：浏览器 DevTools 拖动到 1280 / 1440 / 1920 三档，确保不溢出。
6. **可访问性走查**：键盘 Tab 导航、`:focus-visible` 可见、对比度达 WCAG AA。
7. **档案同步验证**：管理员在后台修改学生信息后，学生端 `/profile` 刷新页面应显示最新数据。
8. **注册流程验证**：注册新账号 → 登录受限 → 顶部 pending 提示条显示 → 管理员分配后正常登录。

### 5.3 关键运行信息速查

| 项 | 值 |
| --- | --- |
| 学生端访问 | `http://localhost:5173` |
| 学生端入口 | `student-web/src/main.ts` |
| 学生端 Layout | `student-web/src/layouts/StudentLayout.vue` |
| 学生端路由 | `student-web/src/router/index.ts` |
| 学生端状态 | `student-web/src/stores/user.ts` |
| 学生端环境变量 | `student-web/.env.development` |
| 学生测试账号 | `20240001` / `123456` |
| 后端 API | `http://localhost:3000` |
| 数据库 | MySQL 8.0，`student_mgmt` |

---

## 六、交接确认

| 项 | 状态 |
| --- | --- |
| 学生端 21 个业务页面 | ✅ 已全部实现并验收通过 |
| 学生端注册/登录/档案同步 | ✅ 已验证 |
| 学生端 Layout | ✅ 功能完整，待视觉升级 |
| 设计 Token | ⚠️ 仅有最简变量，待补全 |
| 视觉风格 | ⚠️ Element Plus 默认风格，待升级 |

**交接边界**：本文档之后，学生端功能代码（`api/`、`stores/`、`router/`、`main.ts` 业务挂载逻辑）冻结，不再修改。后续工作仅在视觉层（`views/`、`layouts/`、`components/`、`styles/`、`assets/`、`shared-web/components/` 内部样式、`shared-web/styles/`）改动。

---

**交接人**：功能实现阶段（GLM-5.2）
**接收方**：学生端后续工作智能体
**交接日期**：2026-08-18
**项目根目录**：`d:\trae work\大学学生管理系统`
**交接范围**：仅 student-web（依赖 server 与 shared-web，但不修改其业务逻辑）
