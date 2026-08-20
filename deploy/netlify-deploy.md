# 高校学生管理系统 - Render + Netlify 分离部署指南

## 架构总览

```
用户浏览器
   │
   ├────► 学生端 https://你的学生端.netlify.app      ← Netlify（纯静态）
   │
   ├────► 后台端 https://你的后台端.netlify.app      ← Netlify（纯静态）
   │
   └────► API/WS https://你的后端.onrender.com/api  ← Render（Node.js + MySQL）
            │
            └──► MySQL（Render 托管数据库）
```

---

## 第一步：部署 Render 后端（先做这步！）

### 方式 A：Blueprint 一键部署（推荐，3 分钟搞定）

1. 将项目代码推送到你的 GitHub 仓库（如果还没有的话）
2. 打开 <https://dashboard.render.com/blueprints>，点击 **"New Blueprint Instance"**
3. 选择你的 GitHub 仓库并授权
4. **Branch** 选 `main` 或 `master`，**YAML Path** 填 `render.yaml`
5. 点击 **"Generate"** → **"Apply"**
6. 喝杯咖啡等 3-5 分钟，Render 会自动完成：
   - 创建 MySQL 8.0 数据库
   - 构建 Node.js 服务
   - 执行 `prisma generate` + `tsc build` + `prisma db push` + `seed`（初始化种子数据）
7. 进入服务 `student-mgmt-api` 详情页，复制顶部显示的 **Service URL**（例如 `https://student-mgmt-api.onrender.com`）
8. 验证：浏览器访问 `https://你的ServiceURL/api/health`，如果返回 `{"code":0,"data":{"status":"ok",...}}` 就成功了

### 方式 B：手动创建服务（如果 Blueprint 出问题）

1. 打开 <https://dashboard.render.com/>，点击 **"New +"** → **"PostgreSQL"**
   - Name: `student-mgmt-mysql`（其实 Render 只有 PostgreSQL，想用 MySQL 请用下方的补充说明）
   - Database: `student_mgmt`
   - User: `student_app`
   - Region: Oregon
   - Plan: Free 或 Starter
   - 点击 **"Create Database"**，等数据库就绪后复制 `Connection String`

> ⚠️ **Render 原生不支持 MySQL！** Blueprint 中写的 MySQL 会自动变成 PostgreSQL，如果你**必须用 MySQL**，请使用云端 MySQL 服务：
> - 推荐：<https://planetscale.com/>（免费额度够演示）、<https://aiven.io/mysql>、阿里云 RDS
> - 创建好外部 MySQL 后，复制 connection string 填到 Render 服务的 `DATABASE_URL` 环境变量即可

2. 回到 Render Dashboard，**"New +"** → **"Web Service"**
   - 选择你的 GitHub 仓库
   - Name: `student-mgmt-api`
   - Runtime: Node
   - Root Directory: `server`
   - Build Command:
     ```bash
     npm run prisma:generate
     npm run build
     npx prisma db push --accept-data-loss
     npm run seed || true
     ```
   - Start Command: `node -r tsconfig-paths/register dist/server.js`
   - Plan: Free 或 Starter
   - Region: Oregon（和数据库一致）
   - 点击 **"Advanced"** → **"Add Environment Variables"**，添加：
     | Key | Value |
     |-----|-------|
     | `NODE_ENV` | `production` |
     | `PORT` | `10000` |
     | `ENABLE_SWAGGER` | `false` |
     | `JWT_SECRET` | 点击 "Generate" 让 Render 生成随机密钥 |
     | `JWT_ACCESS_EXPIRES` | `2h` |
     | `JWT_REFRESH_EXPIRES` | `7d` |
     | `STORAGE_TYPE` | `local` |
     | `UPLOAD_DIR` | `uploads` |
     | `CORS_ORIGIN` | 先留空，等 Netlify 部署完再回来填 |
     | `DATABASE_URL` | 粘贴刚才的数据库 Connection String |
   - 点击 **"Create Web Service"**，等待部署完成

3. 复制 **Service URL**（例如 `https://student-mgmt-api.onrender.com`）

---

## 第二步：部署学生端到 Netlify Drop

### 2.1 配置 API 地址并构建

打开项目根目录，编辑 `student-web/.env.production`：

```env
VITE_API_BASE_URL=https://你的Render后端.onrender.com/api
VITE_WS_URL=https://你的Render后端.onrender.com
```

例如：
```env
VITE_API_BASE_URL=https://student-mgmt-api.onrender.com/api
VITE_WS_URL=https://student-mgmt-api.onrender.com
```

然后构建：

```bash
cd student-web
npm install   # 如果还没装依赖
npm run build
```

构建完成后会生成 `student-web/dist` 文件夹。

### 2.2 拖拽上传到 Netlify

1. 打开 <https://app.netlify.com/drop>（无需登录也能用，但登录后可以保留域名、后续可重新部署）
2. 把 **整个 `student-web/dist` 文件夹** 拖到网页中间的虚线框里
3. 等 5-10 秒，部署完成！Netlify 会自动分配一个域名，例如 `https://jolly-panda-123456.netlify.app`
4. **复制这个域名**，一会儿要填到 Render 的 CORS 配置里
5. （可选）登录 Netlify 账号后，可以在站点设置里改域名、绑定自定义域名等

---

## 第三步：部署后台端到 Netlify Drop

和学生端完全一样，只是目录不同：

1. 编辑 `admin-web/.env.production`，填入同样的 Render 地址
2. 构建：`cd admin-web && npm run build`
3. 把 `admin-web/dist` 文件夹拖到 <https://app.netlify.com/drop>
4. 复制分配的域名，例如 `https://soft-llama-789012.netlify.app`

---

## 第四步：更新 Render 后端的 CORS 配置（关键！否则跨域拦截）

1. 回到 Render 管理面板 → 进入 `student-mgmt-api` 服务
2. 点击 **Environment** 选项卡
3. 找到 **Environment Variables**，编辑 `CORS_ORIGIN` 的值，把刚才两个 Netlify 域名用英文逗号拼进去：

   ```
   https://jolly-panda-123456.netlify.app,https://soft-llama-789012.netlify.app
   ```

   > 💡 你也可以用通配符，一次性放行所有 Netlify 子域名：
   > ```
   > https://*.netlify.app
   > ```
   > 不过出于安全考虑，建议正式环境用具体域名。

4. 点击 **"Save Changes"**，Render 会自动重启服务（约 1 分钟）

---

## 第五步：验证系统

### 健康检查
- 后端健康：<https://你的Render后端.onrender.com/api/health> → 返回 ok
- 学生端页面：<https://你的学生端.netlify.app> → 能打开登录页
- 后台端页面：<https://你的后台端.netlify.app> → 能打开登录页

### 登录测试
使用种子数据的测试账号：

| 平台 | 账号 | 密码 |
|------|------|------|
| 学生端 | `20240001` | `123456` |
| 后台端 | `admin` | `admin123` |

登录成功、能看到页面数据 → 部署完成 🎉

---

## 常见问题 & 排错

### Q1: 登录时提示 "网络错误" 或 CORS 报错

**浏览器 F12 打开 Console，如果看到：**
- `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy`

**解决方案：**
1. 确认 Render 服务中 `CORS_ORIGIN` 环境变量已经填了 Netlify 域名（多个逗号分隔，不要有空格）
2. 修改完环境变量要等 Render 自动重启（看状态变成 "Live"）
3. 确认域名没有写错，有没有带末尾的 `/`（例如 `https://xxx.netlify.app/` 是错的，应该是 `https://xxx.netlify.app`）

### Q2: 刷新页面出现 "Page Not Found"

**原因：** 没有配置 SPA 路由回退。

**解决方案：**
- 确认 `student-web/dist` 和 `admin-web/dist` 目录下有 `_redirects` 文件（内容是 `/* /index.html 200`）
- 如果没有，检查项目根目录的 `public/_redirects` 是否存在，重新 `npm run build`

### Q3: 前端打开后一直转圈加载不出数据

**原因：** `VITE_API_BASE_URL` 没填或填错了。

**排查：**
1. 打开 F12 → Network，看请求的 URL 是不是正确的 Render 地址
2. 确认 `.env.production` 中填的地址没有拼写错误
3. 确认 Render 后端服务状态是 "Live"

### Q4: WebSocket 连不上（消息未读数不变）

**原因：** `VITE_WS_URL` 没填或 CORS 没放行 WS。

**排查：**
1. F12 → Console 看有没有 `[WS] 已连接` 的日志
2. `.env.production` 的 `VITE_WS_URL` 不能带末尾 `/api`，要是后端根地址
3. WS 的 CORS 配置和 HTTP 共用同一个 `CORS_ORIGIN` 环境变量，确保已经填对

### Q5: Render 免费环境 API 第一次请求很慢

**原因：** Render 免费层如果 15 分钟没人访问会自动休眠，第一次请求需要冷启动（约 10-30 秒）。

**解决方案：**
- 升级到 Render Starter 方案（$7/月），不会休眠
- 或使用免费监控服务（如 <https://uptimerobot.com/>）每 5 分钟 ping 一次后端，保持服务唤醒

### Q6: 上传头像/文件功能用不了

**原因：** Render 的本地文件系统是**临时的**，服务重启或重新部署后上传的文件会丢失。

**解决方案（三选一）：**
1. **演示用即可**：接受文件会丢失的事实，仅用于功能展示
2. **接入对象存储**：将 `STORAGE_TYPE` 改为 `oss`，接入阿里云 OSS / AWS S3 / Cloudflare R2（需要修改 `server/src/shared/file/storage.ts` 的 OSS 实现）
3. **挂载 Render Disk**：Render 付费方案可以挂载持久化磁盘，把 `UPLOAD_DIR` 指向磁盘挂载路径

### Q7: PDF 导出的中文是方框或乱码

**原因：** Render 的 Node.js 运行环境（基于 Debian）默认没有中文字体。

**解决方案：**
1. 在 Render 服务根目录（不是 server 子目录）创建 `render-build.sh`：
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   apt-get update && apt-get install -y fonts-noto-cjk
   cd server
   npm run prisma:generate
   npm run build
   npx prisma db push --accept-data-loss
   npm run seed || true
   ```
2. Render 服务设置的 Build Command 改为：`chmod +x ../render-build.sh && ../render-build.sh`
3. 环境变量 `CHINESE_FONT_PATH` 填 `/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`
4. 重新部署

### Q8: 数据库连接失败

**如果使用 Render Blueprint 创建的 MySQL：**
- Render 实际上没有 MySQL，创建出来的是 PostgreSQL，Prisma 的 schema 是 mysql provider，会报错。

**解决方案：**
- 改用 PlanetScale / Aiven / 阿里云 RDS 等外部 MySQL，把连接串填到 `DATABASE_URL`
- 或者把 Prisma schema 改成 postgresql provider（改动大，不推荐）

---

## 后续运维

### 重新部署后端
- 向 GitHub 仓库 main 分支 push 代码，Render 会自动拉取并重新构建部署
- 或在 Render 服务详情页点击 **"Manual Deploy"** → **"Clear build cache & deploy"**

### 重新部署前端
- 本地修改代码后重新 `npm run build`
- 打开 Netlify 对应站点 → **Deploys** → 把新的 dist 文件夹拖到页面底部的拖拽区域即可覆盖部署

### 查看后端日志
- Render 服务详情页 → **Logs** 选项卡，实时查看请求日志和错误
- 健康检查：访问 `/api/health`

### 修改环境变量
- Render：服务详情页 → **Environment** → 修改 → 保存（会自动重启）
- Netlify：站点设置 → **Environment variables** → 修改 → **重新触发部署** 才生效

---

## 生产环境升级建议

演示跑通后，如果要正式长期使用，建议：

| 项目 | 免费方案 | 升级方案 |
|------|---------|---------|
| Render 后端 | Free（512MB，会休眠） | Starter $7/月（1GB RAM，不休眠） |
| Render 数据库 | Free（1GB 存储） | Starter $7/月（10GB） |
| Netlify 前端 | Drop 免费子域名 | 绑定自定义域名 + 开启 HTTPS（Netlify 免费提供） |
| 文件存储 | Render 临时磁盘 | 阿里云 OSS / Cloudflare R2 |
| 备份 | Render 自动快照 | 开启 server 的 `scheduleBackup` 定时任务，并下载备份文件到本地 |
