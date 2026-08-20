# handoff2 — 后台端（admin-web）任务交接文档

> 本文档面向**后台端（admin-web）**的任务交接。
> 接收方：负责后台端后续工作（视觉升级/页面优化/维护迭代）的智能体或开发者。
> 前置阶段已完成后台端全部 45 个业务页面功能实现并通过验收。

---

## 一、项目概览与技术栈

### 1.1 项目定位

本项目是一套高校学生管理系统，前后端分离，共三端：

| 端 | 工程目录 | 默认端口 | 定位 |
| --- | --- | --- | --- |
| 学生端前台 | `student-web/` | `http://localhost:5173` | 面向在校学生，前台门户风格 |
| **后台管理端** | `admin-web/` | `http://localhost:5174` | 面向教务/辅导员/超管，工作台风格 |
| 后端 API | `server/` | `http://localhost:3000` | Express + Prisma + MySQL，前后端共用 |
| 共享前端库 | `shared-web/` | — | 类型、组件、composables、工具，两端复用 |

> 本文档仅交接**后台端 admin-web**，但后台端依赖 `server/`（API）与 `shared-web/`（公共能力），需对三者关系有基本认知。

### 1.2 后台端技术栈

| 类别 | 技术 | 版本 | 说明 |
| --- | --- | --- | --- |
| 框架 | Vue 3 | ^3.4 | Composition API + `<script setup>` |
| 语言 | TypeScript | ^5.4 | 全量类型注解 |
| 构建 | Vite | ^5.2 | |
| 状态管理 | Pinia | ^2.1 | + `pinia-plugin-persistedstate` 持久化 |
| 路由 | Vue Router | ^4.3 | 含动态路由 + 标签页缓存 |
| UI 组件库 | Element Plus | ^2.7 | **设计不可更换** |
| 图表 | ECharts | ^5.5 | 报表统计可视化 |
| 富文本 | WangEditor 5 | ^5.1 | 仅通知公告模块使用 |
| HTTP | Axios | ^1.6 | 含 401 静默刷新拦截器 |
| 样式 | SCSS / SASS | ^1.102 | 用 `sass-embedded` |
| 自动导入 | unplugin-auto-import / unplugin-vue-components | | Element Plus 按需引入 |

### 1.3 后台端目录结构

```
admin-web/
├── src/
│   ├── api/               # 后台端 API 封装
│   ├── assets/            # 静态资源
│   ├── components/         # 后台端本地组件
│   ├── layouts/
│   │   ├── AdminLayout.vue          # 后台端主布局
│   │   └── components/
│   │       ├── Sidebar.vue          # 侧边栏容器
│   │       ├── SidebarItem.vue      # 递归菜单项（二/三级）
│   │       ├── Breadcrumb.vue       # 面包屑
│   │       └── TagsView.vue         # 多标签页栏
│   ├── router/
│   │   ├── index.ts                 # 路由入口
│   │   └── staticRoutes.ts          # 静态路由 + 404 重定向
│   ├── stores/
│   │   ├── permission.ts            # 动态路由扁平化（MENU/DIRECTORY）
│   │   ├── tagsView.ts              # 标签页缓存
│   │   ├── user.ts                  # 管理员状态
│   │   └── dict.ts                  # 字典缓存
│   ├── styles/
│   │   ├── variables.scss           # 全局 SCSS 变量
│   │   └── global.scss              # 全局基础样式
│   ├── views/             # 业务页面（45 个，见第三节）
│   ├── App.vue
│   └── main.ts            # 后台端入口
├── .env.development       # 本地开发环境变量
├── vite.config.ts
└── package.json
```

### 1.4 与共享库的关系

后台端通过 `shared-web/` 复用以下能力，**不可重复造轮子**：

- `shared-web/components/`：`PageHeader`、`StatusTag`、`EmptyState`、`FileUploader`
- `shared-web/composables/`：`useAuth`、`usePagination`、`useDict`、`useMessage`
- `shared-web/utils/`：`request`（Axios 实例）、`download`、`format`、`validate`
- `shared-web/types/index.ts`：全部业务实体类型与枚举

---

## 二、启动与访问方式

### 2.1 一键启动

```bash
# Windows 下双击项目根目录 启动.bat（或 start.bat）即可一键启动三端服务
# 启动完成后浏览器会自动打开后台端：http://localhost:5174
```

启动脚本会依次拉起：后端 API（3000）→ 学生端（5173）→ 后台端（5174）。

### 2.2 单独启动后台端（开发模式）

```bash
cd "d:\trae work\大学学生管理系统\admin-web"
npm install      # 首次运行
npm run dev      # 启动开发服务器，默认 5174
```

### 2.3 测试账号

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 超级管理员 | `admin` | `admin123` |

### 2.4 后端依赖

后台端所有数据来自后端 API，需确保 `server/` 已启动：

| 项 | 值 |
| --- | --- |
| 后端 API 地址 | `http://localhost:3000` |
| 健康检查 | `http://localhost:3000/api/health` |
| 后台端环境变量 | `VITE_API_BASE_URL=http://localhost:3000/api`（见 `.env.development`） |
| WebSocket 地址 | `VITE_WS_URL=http://localhost:3000`（消息推送） |

### 2.5 数据库

- 类型：MySQL 8.0（本地服务名 `MySQL80`）
- 库名：`student_mgmt`
- 连接串：`mysql://root:root123456@localhost:3306/student_mgmt`
- 客户端命令：`& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -uroot -proot123456 -D student_mgmt --default-character-set=utf8mb4`

---

## 三、功能清单与验收状态

### 3.1 后台端页面清单（45 个业务页 + 1 个 Layout）

#### 模块 1：系统管理

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/system/user` | `system/user/index.vue` | 管理员列表 + 新增/编辑弹窗 + 启用禁用切换 | ✅ |
| `/system/role` | `system/role/index.vue` | 角色列表 + `el-tree` 菜单权限分配 | ✅ |
| `/system/menu` | `system/menu/index.vue` | 菜单树形表格（`el-table` tree）+ 新增/编辑 | ✅ |
| `/system/log/login` | `system/log/login.vue` | 登录日志查询表格 + 时间范围筛选 | ✅ |
| `/system/log/operation` | `system/log/operation.vue` | 操作日志查询表格 + 时间范围筛选 | ✅ |

#### 模块 2：基础数据管理

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/base/department` | `base/department/index.vue` | 院系树形表格 | ✅ |
| `/base/major` | `base/major/index.vue` | 专业列表，按院系筛选 | ✅ |
| `/base/class` | `base/class/index.vue` | 班级列表，按院系+专业级联筛选 | ✅ |
| `/base/teacher` | `base/teacher/index.vue` | 教师 CRUD 表格 | ✅ |
| `/base/course` | `base/course/index.vue` | 课程信息维护 | ✅ |
| `/base/dict` | `base/dict/index.vue` | 字典管理（类型分组） | ✅ |

#### 模块 3：学籍管理

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/status/student` | `status/student/index.vue` | 学生档案管理（高级搜索 + Excel 导入/导出） | ✅ |
| `/status/change` | `status/change/index.vue` | 学籍异动审批 + `el-timeline` 审批流转 | ✅ |
| `/status/info-edit` | `status/info-edit/index.vue` | 信息修改申请审批 + 新旧值对比 | ✅ |
| `/status/certificate` | `status/certificate/index.vue` | 证明申请处理 + 生成 PDF | ✅ |
| `/status/graduation` | `status/graduation/index.vue` | 毕业资格审核 + 批量登记毕业状态 | ✅ |

#### 模块 4：教务管理

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/academic/course` | `academic/course/index.vue` | 课程维护 | ✅ |
| `/academic/schedule` | `academic/schedule/index.vue` | 排课表单 + 冲突检测 + 课表发布 | ✅ |
| `/academic/score/input` | `academic/score/input.vue` | 成绩录入 + Excel 批量导入 + 平时/考试/总评 | ✅ |
| `/academic/score/audit` | `academic/score/audit.vue` | 成绩审核列表（通过/打回） | ✅ |
| `/academic/selection` | `academic/selection/index.vue` | 选课时间段设置 + 选课情况统计 | ✅ |
| `/academic/retake` | `academic/retake/index.vue` | 重修/补考管理 | ✅ |

#### 模块 5：学工管理

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/affairs/leave` | `affairs/leave/index.vue` | 请假审批 + 多级审批流转可视化 | ✅ |
| `/affairs/award/project` | `affairs/award/project.vue` | 奖助贷项目设置 | ✅ |
| `/affairs/award/audit` | `affairs/award/audit.vue` | 申请材料审核 + 附件预览 | ✅ |
| `/affairs/award/publish` | `affairs/award/publish.vue` | 名单公示发布 | ✅ |
| `/affairs/discipline` | `affairs/discipline/index.vue` | 违纪处分录入与管理 | ✅ |
| `/affairs/honor` | `affairs/honor/index.vue` | 评优评先流程管理 | ✅ |

#### 模块 6：宿舍管理

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/dorm/room` | `dorm/room/index.vue` | 宿舍/床位管理 + **可视化床位占用状态** | ✅ |
| `/dorm/assign` | `dorm/assign/index.vue` | 入住分配 + 调宿 + 退宿办理 | ✅ |
| `/dorm/inspection` | `dorm/inspection/index.vue` | 卫生检查登记 | ✅ |
| `/dorm/violation` | `dorm/violation/index.vue` | 违纪登记 | ✅ |
| `/dorm/repair` | `dorm/repair/index.vue` | 报修工单处理（待处理→处理中→已完成） | ✅ |

#### 模块 7：考勤管理

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/attendance/input` | `attendance/input.vue` | 考勤录入 + Excel 导入 | ✅ |
| `/attendance/list` | `attendance/list.vue` | 考勤记录查询表格 | ✅ |
| `/attendance/statistics` | `attendance/statistics.vue` | ECharts 柱状图/饼图（出勤率、缺勤分布） | ✅ |
| `/attendance/warning` | `attendance/warning.vue` | 预警名单 + 一键通知辅导员 | ✅ |
| `/attendance/rule` | `attendance/rule.vue` | 预警规则配置 | ✅ |

#### 模块 8：通知公告

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/notice/list` | `notice/list.vue` | 通知列表 + 新增/编辑（`RichEditor` + 附件 + 范围 + 定时发布） | ✅ |
| `/notice/read-stats` | `notice/read-stats.vue` | 阅读情况统计（已读/未读比例 + 学生列表） | ✅ |

#### 模块 9：报表统计

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/report/student` | `report/student.vue` | ECharts 饼图（性别）+ 柱状图（院系）+ 表格 + 导出 | ✅ |
| `/report/status` | `report/status.vue` | ECharts 折线图（按月趋势）+ 导出 | ✅ |
| `/report/attendance` | `report/attendance.vue` | ECharts 柱状图（各班出勤率）+ 导出 | ✅ |
| `/report/award` | `report/award.vue` | ECharts 堆叠柱状图（奖助金额/人数）+ 导出 | ✅ |
| `/report/discipline` | `report/discipline.vue` | ECharts 饼图（违纪类型分布）+ 导出 | ✅ |

#### 模块 10：工作台与错误页

| 路由 | 文件 | 核心元素 | 验收 |
| --- | --- | --- | --- |
| `/dashboard` | `dashboard/index.vue` | 待办事项卡片组 + 系统概览 + 快捷入口 | ✅ |
| `/403` | `error/403.vue` | 无权限 | ✅ |
| `/404` | `error/404.vue` | 未找到 | ✅ |
| `/login` | `login/index.vue` | 管理员登录 | ✅ |
| `/register` | `register/index.vue` | 管理员注册 | ✅ |

### 3.2 后台端 Layout

文件：`admin-web/src/layouts/AdminLayout.vue`

- 左侧深色侧边栏 `#001529`，可折叠（折叠后 64px）
- 顶栏：折叠按钮 + `Breadcrumb` 面包屑 + 铃铛消息中心（Popover）+ 用户下拉
- `TagsView` 多标签页缓存（36px 高，可关闭/关闭其他/关闭全部）
- 主体区 `<router-view>` + `keep-alive`（按 tagsViewStore.cachedViews 缓存）
- 已修复：铃铛 popover 弹出消息面板 + "全部已读" 按钮消除红点

### 3.3 后台 Layout 组件树

```
admin-web/src/layouts/components/
├── Sidebar.vue         # 侧边栏容器
├── SidebarItem.vue     # 递归菜单项（支持二级、三级菜单）
├── Breadcrumb.vue      # 面包屑
└── TagsView.vue        # 多标签页栏
```

### 3.4 已验收的关键交互

1. **管理员注册流程**：用户名（唯一）+ 真实姓名 + 可选手机 + 强密码；注册后账号默认禁用，需超管激活才能登录。
2. **未激活账号登录限制**：正确拦截并提示"账号未激活"。
3. **路由扁平化**：DIRECTORY 类型路由仅作侧边栏分组，MENU 类型路由作为 AdminLayout 直接子路由渲染，避免 404。
4. **路由名唯一性**：使用 `fullPath` 作为路由 name，避免重名覆盖。
5. **404 重定向修复**：`/redirect/:path(.*)*` 路由解决 TagsView 刷新 404 问题。
6. **铃铛消息中心**：Popover 弹出消息面板 + "全部已读" 按钮调用 `markAllRead()`，红点立即消除。
7. **通知公告全流程**：列表 + 新增/编辑（富文本+附件+范围+定时）+ 阅读统计（已读/未读比例）。

---

## 四、任务边界与硬约束

### 4.1 可改文件（后台端视觉/布局层）

```
admin-web/src/
├── views/            # 业务页面样式与布局调整
├── layouts/          # AdminLayout.vue 及其 components 视觉升级
├── components/        # 后台端本地组件
├── styles/           # 变量、全局样式
├── utils/            # 仅可新增 echarts-theme.ts，不改既有工具
└── assets/           # 图片、图标、字体
```

### 4.2 不可改文件（业务逻辑冻结）

```
admin-web/src/
├── api/              # API 调用封装，不得修改
├── stores/           # Pinia 状态逻辑（permission/tagsView/user/dict），不得修改
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
2. **路由表保持不变**：`admin-web/src/router/index.ts` 与 `router/staticRoutes.ts` 的路由路径与组件映射不可修改，否则破坏导航/标签页/面包屑功能。
3. **路由扁平化逻辑保持不变**：`stores/permission.ts` 中 MENU 作为 AdminLayout 直接子路由、DIRECTORY 仅作分组的逻辑不可修改。
4. **路由名唯一性约定**：使用 `fullPath` 作为路由 name，不可改回 path。
5. **共享组件 API 兼容**：`shared-web/components/` 中 `PageHeader`、`StatusTag`、`EmptyState`、`FileUploader` 的 Props 名与类型不可改变，可在内部增强样式。
6. **状态色映射不可变**（来自 `StatusTag.vue`）：
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
7. **深色侧边栏保留**：侧边栏 `#001529`（Ant Design 经典深色）是产品识别元素，可微调但不可整体改浅。
8. **三端配色统一**：后台端与学生端是同一品牌下的两个产品，需共享同一套设计 Token，仅以导航/密度风格区分两端角色。
9. **响应式适配**：主要面向 PC（≥1280px），建议做 1280/1440/1920 三档桌面响应式优化，**移动端不强求**。

### 4.4 后台端特有注意事项

1. **铃铛 Popover 样式作用域**：Popover 内容通过 teleport 渲染到 body，相关样式必须放在**非 scoped 样式块**中，已用 `popper-class="msg-popover"` 解决。视觉升级时保留此约定。
2. **TagsView keep-alive 缓存**：主体区按 `tagsViewStore.cachedViews` 缓存，修改页面样式时注意缓存态下的样式重置。
3. **Console 偶发 parentNode 错误**：浏览器 Console 偶发 `TypeError: Cannot read properties of null (reading 'parentNode')`，来自 TagsView/Breadcrumb 在某次刷新时路由匹配的副作用，**与业务无关，不要修复业务代码**，仅在视觉层避免触发即可（例如不在 Layout 渲染期间切换路由）。
4. **ECharts 主题未统一**：各报表页色板散乱，是设计阶段的明确优化点，建议输出 `admin-web/src/utils/echarts-theme.ts` 注册自定义主题并在各报表页统一引用。
5. **WangEditor 5 样式**：通知公告编辑页使用 WangEditor 5，工具栏与内容区样式需与整体设计统一。
6. **404 重定向路由不可删**：`/redirect/:path(.*)*` 路由用于 TagsView 刷新，删除会导致刷新 404。

---

## 五、交付物与验收标准

### 5.1 交付物清单（后台端）

#### 代码层

```
admin-web/src/styles/
├── variables.scss       # 升级后的全局变量（与学生端共享 Token）
├── global.scss          # 全局基础样式
└── tokens.scss          # 后台端设计 Token（引用 shared-web/styles/tokens.scss）

admin-web/src/utils/
└── echarts-theme.ts     # ECharts 自定义主题注册（色板/字号/网格/tooltip 圆角）

admin-web/src/
├── layouts/AdminLayout.vue          # 视觉升级（折叠态优化/顶栏消息中心强化/TagsView 精修）
├── layouts/components/
│   ├── Sidebar.vue                  # 品牌区强化
│   ├── SidebarItem.vue              # 激活态/折叠态样式
│   ├── Breadcrumb.vue               # 图标 + 分隔符样式
│   └── TagsView.vue                 # 激活态/关闭按钮 hover 态
├── views/dashboard/index.vue        # 重设计（欢迎横幅 + 4 StatCard + 趋势图 + 快捷入口）
├── views/login/index.vue            # 登录页品牌化（左插画+右表单）
├── views/dorm/room/index.vue        # 床位可视化格子图（空/占/退颜色编码）
├── views/notice/list.vue            # 编辑弹窗改全屏抽屉 + 富文本主区
└── views/report/...                 # 5 个报表页应用统一 ECharts 主题

shared-web/styles/                   # 与学生端共享
├── tokens.scss
└── theme.scss

shared-web/components/               # 视觉升级（保持 API）
├── PageHeader.vue                   # 加图标槽、强化层级
├── StatusTag.vue                    # 尺寸/边框/字号统一
├── EmptyState.vue                   # 加 SVG 插画（4 种）
└── FileUploader.vue                 # 拖拽区视觉、缩略图样式
```

#### 文档层

```
docs/
└── 后台端设计走查清单.md   # 后台端各页关键状态截图与视觉核对
```

### 5.2 验收标准

1. **启动验证**：双击 `启动.bat`，三端服务起来后浏览器自动打开 `http://localhost:5174/login`，后台端登录页正常加载。
2. **登录验证**：用 `admin` / `admin123` 登录成功，进入 Dashboard 工作台。
3. **逐页走查**：按第三节 45 个页面清单逐页访问，对照设计规范核对视觉，**重点检查**：
   - 二级菜单（如 `/base/department`）不 404
   - 三级菜单（如 `/system/log/login`、`/academic/score/input`）不 404
   - TagsView 刷新不 404
   - 面包屑正确显示层级
4. **状态走查**：每张列表页至少触发一次空数据/加载/错误态。
5. **响应式走查**：浏览器 DevTools 拖动到 1280 / 1440 / 1920 三档，确保不溢出；侧边栏折叠态（64px）下菜单项不截断。
6. **可访问性走查**：键盘 Tab 导航、`:focus-visible` 可见、对比度达 WCAG AA。
7. **铃铛消息中心**：构造未读消息 → 角标显示数字 → 点击铃铛弹 Popover → 点"全部已读" → 角标消失（验证 `markAllRead()` 链路）。
8. **通知公告全流程**：新增通知（富文本+附件+范围+定时）→ 学生端可见 → 阅读统计页显示已读/未读比例。
9. **报表 ECharts 主题统一**：5 个报表页图表色板一致、tooltip 圆角一致、坐标轴字号一致。
10. **管理员注册激活流程**：注册新管理员 → 登录受限（未激活）→ 超管在 `/system/user` 激活 → 新管理员可登录。

### 5.3 关键运行信息速查

| 项 | 值 |
| --- | --- |
| 后台端访问 | `http://localhost:5174` |
| 后台端入口 | `admin-web/src/main.ts` |
| 后台端 Layout | `admin-web/src/layouts/AdminLayout.vue` |
| 后台端路由 | `admin-web/src/router/index.ts` + `router/staticRoutes.ts` |
| 路由扁平化 | `admin-web/src/stores/permission.ts` |
| 标签页缓存 | `admin-web/src/stores/tagsView.ts` |
| 管理员状态 | `admin-web/src/stores/user.ts` |
| 字典缓存 | `admin-web/src/stores/dict.ts` |
| 全局 SCSS 变量 | `admin-web/src/styles/variables.scss` |
| 全局 SCSS 入口 | `admin-web/src/styles/global.scss` |
| 后台端环境变量 | `admin-web/.env.development` |
| 管理员账号 | `admin` / `admin123` |
| 后端 API | `http://localhost:3000` |
| 数据库 | MySQL 8.0，`student_mgmt` |

---

## 六、交接确认

| 项 | 状态 |
| --- | --- |
| 后台端 45 个业务页面 | ✅ 已全部实现并验收通过 |
| 后台端 404 路由问题 | ✅ 已修复（路由扁平化 + 404 重定向） |
| 后台端铃铛消息中心 | ✅ 已修复（Popover + 全部已读） |
| 后台端通知公告模块 | ✅ 全流程已验收（列表/编辑/阅读统计） |
| 后台端 Layout | ✅ 功能完整，待视觉升级 |
| 设计 Token | ⚠️ 仅有最简变量（10 行），待补全 |
| ECharts 主题 | ⚠️ 各报表页色板散乱，待统一 |
| 视觉风格 | ⚠️ Element Plus 默认风格，待升级 |

**交接边界**：本文档之后，后台端功能代码（`api/`、`stores/`、`router/`、`main.ts` 业务挂载逻辑）冻结，不再修改。后续工作仅在视觉层（`views/`、`layouts/`、`components/`、`styles/`、`assets/`、`utils/echarts-theme.ts` 新增、`shared-web/components/` 内部样式、`shared-web/styles/`）改动。

---

**交接人**：功能实现阶段（GLM-5.2）
**接收方**：后台端后续工作智能体
**交接日期**：2026-08-18
**项目根目录**：`d:\trae work\大学学生管理系统`
**交接范围**：仅 admin-web（依赖 server 与 shared-web，但不修改其业务逻辑）
