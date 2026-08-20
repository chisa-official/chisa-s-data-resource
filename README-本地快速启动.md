# 高校学生管理系统 - 本地快速启动指南（2 分钟搞定）

> 纯本地运行，不需要网络、不需要云服务器，自己电脑上就能跑完整系统。

---

## ⚙️ 前置准备（只做一次，约 3 分钟）

### 必装软件 1：Node.js 20 LTS（必须）
1. 打开 <https://nodejs.org/>
2. 点击左边绿色大按钮 **LTS** 下载（v20.x.x）
3. 安装时一路下一步，**务必勾选 "Add to PATH"**（默认就是勾选的，不要取消）
4. 安装完可以关掉了，不用打开 Node.js 自带的任何东西

验证：按 `Win + R`，输入 `cmd` 回车，在黑窗口里输入：
```
node --version
```
显示类似 `v20.12.0` 就成功了。

### 必装软件 2：MySQL 8.0（二选一，本地原生 MySQL 或 Docker）

#### 方式 A：原生 MySQL 安装（推荐，对电脑要求最低）

1. 打开 <https://dev.mysql.com/downloads/installer/>
2. 下载 **mysql-installer-community-8.0.x.msi**（较大的完整版，约 400MB）
3. 安装时选择 "Server only"（只装服务器即可）
4. 配置时：
   - 端口保持默认 `3306`
   - root 密码设为 **`root123456`**（和项目代码一致，省得改配置）
   - 服务名保持默认 `MySQL80`
   - 启动类型选 **"Windows Service"** + **"Start at System Startup"**（开机自启）
5. 安装完成即可，无需手动启动，每次开机 MySQL 都会自动运行

验证：按 `Win + R` 输入 `services.msc` 回车，找到 `MySQL80`，状态显示"正在运行"就 OK。

#### 方式 B：Docker Desktop（如果你电脑支持虚拟化）

> ⚠️ Docker Desktop 需要 CPU 支持虚拟化且 BIOS 已开启。如果安装报错或启动失败，请改用方式 A 原生安装。

1. 打开 <https://www.docker.com/products/docker-desktop/>
2. 下载 Windows 版安装包
3. 安装时一路下一步，安装过程可能需要重启电脑
4. 重启后，**桌面右下角任务栏有个 Docker 小鲸鱼图标，且不再转圈**，才算完全启动

> 💡 不确定电脑支不支持？任务管理器 → 性能 → CPU，看右下角"虚拟化: 已启用"才行。

#### 二者对比

| 项 | 原生 MySQL | Docker |
|----|-----------|--------|
| 电脑要求 | 几乎所有电脑都能装 | 需要 CPU 虚拟化 + Win10/11 专业版或家庭版+WSL2 |
| 占用资源 | 较小（约 200-400MB 内存） | 较大（WSL2 + Docker，1GB+） |
| 启动速度 | 开机自启，立即可用 | 需手动启动 Docker Desktop，约 30 秒 |
| 卸载难度 | 控制面板正常卸载 | 需清理 WSL2 镜像 |
| **推荐度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🚀 一键启动系统（以后每次都走这步）

在项目根目录 `d:\trae work\大学学生管理系统` 下：

### 第一步：启动

1. 确保 MySQL 服务正在运行（原生安装默认开机自启，无需手动操作；Docker 用户请先启动 Docker Desktop）
2. **双击 `启动.bat`**
3. 第一次启动会：
   - 自动安装后端依赖、前端依赖
   - 自动创建数据库表、填充测试数据
   - （如果用 Docker）自动拉取 MySQL 镜像，约 1-5 分钟，取决于网速
4. 之后会弹出 **3 个黑窗口**（后端 API、学生端、后台端），不要关闭它们！
5. 浏览器会自动打开两个页面：
   - **学生端**：<http://localhost:5173>
   - **后台端**：<http://localhost:5174>

### 第二步：登录

| 平台 | 地址 | 账号 | 密码 |
|------|------|------|------|
| 学生端 | <http://localhost:5173> | `20240001` | `123456` |
| 后台端 | <http://localhost:5174> | `admin` | `admin123` |

登录成功、能看到页面数据，就说明系统完全跑起来了 🎉

> 💡 提示：非首次启动会快很多，依赖安装和数据库初始化都不会再跑。

### 第三步：停止使用

**双击 `停止.bat`** → 按提示输入 N（除非你没有其他 Node 项目才输 Y）。

或者直接关闭 3 个黑窗口 + 在 Docker Desktop 里停掉 student-mgmt-mysql 容器。

---

## 📂 本地数据存储位置

| 内容 | 路径 | 说明 |
|------|------|------|
| MySQL 数据库数据 | Docker 内部 Volume | 停止容器不丢数据，`docker compose down -v` 才会清空 |
| 上传的文件/头像 | `server/uploads/` | 本地磁盘，可直接备份 |
| 数据库备份 | `server/backups/` | 每天凌晨 2 点自动备份，保留 30 天 |
| 后端日志 | `server/logs/` | 排查问题时看这里 |

---

## 🆘 常见问题（必看！）

### Q1：双击 `启动.bat` 一闪而过，没反应？
**原因：** Windows Defender 或某些安全软件拦截了批处理。

**解决：** 右键 `启动.bat` → **以管理员身份运行**。

### Q2：报错 "找不到 Node.js" 或 "'node' 不是内部命令"
**原因：** Node.js 没有加入系统 PATH。

**解决：**
1. 重启电脑（安装时勾了 PATH 后，重启才生效）
2. 或者手动把 `C:\Program Files\nodejs` 加到系统环境变量 PATH 里
3. 重启后重新执行 `启动.bat`

### Q3：MySQL 容器一直启动不起来 / 超时
**原因：** 端口 3306 被占用（本机装了 MySQL 还在跑）。

**解决：**
- 方案 A：先在任务管理器里关掉本机的 MySQL 服务（服务名通常是 MySQL80）
- 方案 B：修改 `docker-compose.yml` 中的端口映射，把 `127.0.0.1:3306:3306` 改成 `127.0.0.1:3307:3306`，同时修改 `server/.env` 中 `DATABASE_URL` 的 `localhost:3306` 为 `localhost:3307`

### Q4：第一次启动，某个前端页面白屏 / 一直转圈圈
**原因：** Vite 首次构建在编译依赖，后台端比学生端大得多，要编译更久（老电脑可能 1-2 分钟）。

**解决：** 耐心等几十秒，刷新页面。如果还是白屏，看那个前端的黑窗口里是不是有红色报错。

### Q5：登录提示 "网络错误" 或 "请求失败"
**排查顺序：**
1. 看 **后端 API 那个黑窗口** 有没有启动成功（显示 `服务已启动: http://localhost:3000`）
2. 浏览器直接访问 <http://localhost:3000/api/health>，应该返回 JSON `{"code":0,...,"status":"ok"}`
3. 如果以上都 OK，看浏览器 F12 Console 里的具体错误，截图发我

### Q6：登录提示 "账号或密码错误"
**原因：** 种子数据没初始化成功。

**手动执行初始化：**
```bash
cd server
npx prisma db push --accept-data-loss
npm run seed
```
没有红色报错就 OK，再重新登录试试。

### Q7：3 个黑窗口关了一个，怎么办？
**方案 A（简单）：** 运行 `停止.bat` 全部关掉，再重新双击 `启动.bat`

**方案 B（单独起）：**
- 后端：开个新 cmd，`cd server` → `npm run dev`
- 学生端：开个新 cmd，`cd student-web` → `npm run dev`
- 后台端：开个新 cmd，`cd admin-web` → `npm run dev`

### Q8：电脑重启后数据还在吗？
在。MySQL 数据存在 Docker Volume 里，上传的文件在 `server/uploads/`，只要你不手动 `docker compose down -v` 或者删文件夹，数据都在。

### Q9：PDF 导出中文是方框 / 乱码
**原因：** 服务器（当前是本地 Windows）没有中文字体或者程序没找到。

**解决（临时）：** 找到你电脑里的中文字体，例如：
- `C:\Windows\Fonts\simhei.ttf`（黑体）
- `C:\Windows\Fonts\msyh.ttc`（微软雅黑）

把任意一个字体文件的**完整路径**填到 `server/.env`：
```env
CHINESE_FONT_PATH=C:\\Windows\\Fonts\\msyh.ttc
```
然后重启后端（关闭后端黑窗口，重新 `启动.bat` 或 `cd server && npm run dev`）。

### Q10：浏览器 F12 Console 里有红色的 CORS 错误
**原因：** 前端 Origin 没加入白名单。

**解决：** 打开 `server/.env`，看 `CORS_ORIGIN` 这一行，应该是：
```env
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```
如果改了前端端口，把新的 Origin 加到这里，然后重启后端。

---

## 🛠 手动命令速查（如果不想用 bat 脚本）

```bash
# ====== 在项目根目录打开 3 个独立的终端窗口 ======

# 终端 1：MySQL
docker compose up -d mysql

# 终端 2：后端 API（先确保 MySQL 起来了）
cd server
npm install              # 首次运行
npx prisma db push       # 同步表结构
npm run seed             # 填充测试数据（首次运行）
npm run dev              # 启动开发服务器

# 终端 3：学生端前端
cd student-web
npm install              # 首次运行
npm run dev              # 启动 http://localhost:5173

# 终端 4：后台端前端
cd admin-web
npm install              # 首次运行
npm run dev              # 启动 http://localhost:5174
```

---

## ✅ 系统自检清单

第一次跑通后，建议把以下功能挨个点一下确认没问题：

**学生端（账号 20240001 / 123456）：**
- [ ] 登录成功，右上角显示学生姓名
- [ ] 首页/学籍信息 能看到完整个人资料
- [ ] 我的课表 能看到课程格子
- [ ] 成绩查询 能看到数据
- [ ] 奖惩资助 能看到记录
- [ ] 我的宿舍 能看到分配信息
- [ ] 通知公告 能看到列表，能点详情
- [ ] 在线请假 提交一张请假单（会在后台看到）
- [ ] 申请证明：在读证明 → 生成 PDF 能正确下载

**后台端（账号 admin / admin123）：**
- [ ] 登录成功，左侧菜单正常展开
- [ ] 工作台 Dashboard：卡片数字显示正确，图表能渲染
- [ ] 学生管理 → 学生信息：能看到学生列表
- [ ] 学籍管理 → 变更审核：看到刚才学生提交的请假单
- [ ] 基础数据 → 院系/专业/班级：列表有数据
- [ ] 报表统计 → 学生人数统计：能看到图表，点 Excel/PDF 导出成功
- [ ] 宿舍管理 → 宿舍房间：有房间列表和床位图
- [ ] 反馈/报修管理：有记录列表
- [ ] 系统管理 → 用户管理：能看到 admin 账号
