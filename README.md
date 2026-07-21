# 卓见心理 小程序

uni-app 跨平台应用（微信小程序 / H5）+ Node.js 后端 + Vue3 管理后台

功能模块：关于我们、咨询师预约、OH卡心理工具、心理评估（PHQ-9 / GAD-7 / SDS / SAS / ISI / 大五人格 / MBTI / SCL-90 等156个量表）、自助工具（CBT / 梦境 / 冰山模型 / 情绪追踪）、危机干预、合规体系

---

## 功能现状

### ✅ 已实现功能（截至 2026-07-04）

| 模块 | 说明 |
|------|------|
| 用户认证 | 手机/邮箱/用户名注册登录、短信验证码、JWT Token |
| 咨询师管理 | 列表、详情、周模板排班、时间槽管理、执业资质展示（金色徽章）|
| 预约系统 | 完整预约流程、48小时提前规则、最多3个活跃预约、人工/自动确认 |
| OH卡牌 | 60+ 套卡牌系列、单图/文字卡、使用记录 |
| 心理评估量表 | 156 个量表、多种计分方式、付费量表、代金券系统 |
| 自助工具 | CBT记录、梦境分析、冰山模型、情绪追踪、规则修改练习 |
| 内容系统 | 文章发布、点赞、收藏、评论 |
| 活动注册 | 活动列表、报名功能 |
| 管理后台 | 咨询师/量表/卡牌/新闻/预约/危机事件 完整后台 |
| 实时通讯 | Socket.IO 房间系统 |
| 数据分析 | 用户行为事件日志追踪 |
| **危机干预** | 高/中风险词检测、前端热线弹窗（4条危机热线）、管理后台危机事件跟进 |
| **合规基础设施** | 用户服务协议、隐私政策页面、注册强制勾选、设置页法律入口 |

---

## 下一步开发计划

### 🔴 第一批：服务闭环（当前优先级）

| 功能 | 预估工作量 | 状态 |
|------|-----------|------|
| 💳 支付系统（微信支付） | 2-3周 | 🔜 进行中 |
| 🎥 视频/语音咨询（TRTC） | 2-3周 | 待开始 |
| 🔔 消息推送/预约提醒 | 3-4天 | 待开始 |

### 🟠 第二批：供给侧与留存

| 功能 | 预估工作量 |
|------|-----------|
| 👨‍⚕️ 咨询师专属工作台 | 4-5天 |
| ⭐ 咨询评价系统 | 2天 |
| 📊 心理健康仪表盘 | 3-4天 |

> 详细路线图见 [ROADMAP.md](./ROADMAP.md)

---

## 本地启动

```powershell
# 1. 后端
cd backend; npm run dev        # http://localhost:3000

# 2. 管理后台（新开终端）
cd admin; npm run dev          # http://localhost:5174

# 3. 前端 H5 预览（新开终端）
cd frontend; npm run dev:h5    # http://localhost:5173
```

> Windows 用户也可直接双击运行 `start.bat` 一键启动全部服务。

默认管理员：`admin` / `admin123`（上线前务必修改）

---

## 环境配置

通过 `.env` 文件控制，无需手动修改代码：

| 命令 | 环境 | 后端地址 |
|------|------|----------|
| `npm run dev` | development | http://localhost:3000 |
| `npm run build` | production | 服务器地址 |

配置文件位置：

```
frontend/.env.development   # dev 环境前端地址
frontend/.env.production    # prod 环境前端地址
admin/.env.development      # dev 环境 admin 代理目标
admin/.env.production       # prod 环境 admin 代理目标
```

---

## 上线配置

将 `backend/.env` 逐项填入：

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=          # 随机32位字符串，用于加密token
```

---

### 1. 手机短信验证码（腾讯云）

#### 第一步：获取 SecretId / SecretKey

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com)，完成实名认证
2. 右上角头像 → **访问管理** → **API密钥管理** → **新建密钥**
3. 记录生成的 `SecretId`（以 `AKID` 开头）和 `SecretKey`

> ⚠️ SecretKey 只显示一次，请立即复制保存

#### 第二步：创建短信应用，获取 SDK AppID

1. 进入 [短信 SMS 控制台](https://console.cloud.tencent.com/smsv2)
2. **应用管理 → 应用列表 → 创建应用**，填写应用名称（如"卓见心理"）
3. 创建成功后记录 **SDK AppID**（格式：`1400xxxxxxx`，14 位数字）

#### 第三步：申请签名

1. **国内短信 → 签名管理 → 创建签名**
2. 签名内容：`卓见心理`，上传资质证明
3. 等待审核（通常数小时至 1 个工作日）

#### 第四步：申请正文模板

1. **国内短信 → 正文模板管理 → 创建正文模板**
2. 模板内容：
   ```
   您的验证码为{1}，{2}分钟内有效，请勿泄露给他人。
   ```
3. 审核通过后记录 **模板ID**

#### 第五步：填写配置文件

```env
TENCENT_SECRET_ID=AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TENCENT_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TENCENT_SMS_APP_ID=1400xxxxxxx
TENCENT_SMS_SIGN=卓见心理
TENCENT_SMS_TEMPLATE_ID=12345
```

> 本地开发时（`NODE_ENV=development`），短信不会真实发送，验证码直接打印到终端：
> `[SMS DEV] 13812345678 -> code: 234567`

---

### 2. 邮箱验证码（QQ邮箱）

1. 登录 [mail.qq.com](https://mail.qq.com)
2. 设置 → 账户 → POP3/IMAP/SMTP服务 → 开启 SMTP → 获取**授权码**

```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的邮箱@qq.com
SMTP_PASS=16位授权码
```

---

### 3. 微信小程序

1. 登录 [微信公众平台](https://mp.weixin.qq.com) → 注册小程序（企业主体）
2. 完成企业认证（300元/年，需营业执照）
3. 开发管理 → 开发设置 → 获取 AppID 和 AppSecret

```env
WX_APPID=wx1234567890abcdef
WX_SECRET=xxxxxxxxxxxxxxxx
```

同时修改 `frontend/src/manifest.json`：

```json
"mp-weixin": {
  "appid": "wx1234567890abcdef"
}
```

---

### 4. 微信支付

> 需要已有微信支付商户号（需营业执照，审核1-3个工作日）

1. 登录 [pay.weixin.qq.com](https://pay.weixin.qq.com)
2. 账户中心 → API安全 → 设置 APIv3密钥（自定义32位字符串）
3. API安全 → 申请API证书 → 下载证书文件

将证书文件放入 `backend/certs/`（此目录已加入 `.gitignore`）：
- `apiclient_cert.pem`
- `apiclient_key.pem`

```env
WECHAT_PAY_MCH_ID=1234567890
WECHAT_PAY_API_V3_KEY=your_32_char_key
WECHAT_PAY_CERT_SERIAL=证书序列号
```

---

## 上线部署

### 使用宝塔面板部署（推荐）

#### 1. 安装宝塔面板

```bash
# CentOS
yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec

# Ubuntu
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && bash install.sh ed8484bec
```

#### 2. 安装必要软件

登录宝塔面板 → 软件商店，安装：
- **Nginx**
- **PM2 管理器**

#### 3. 上传项目文件

```bash
cd /www/wwwroot
git clone 你的仓库地址 zhuojian
```

#### 4. 初始化数据库 & 启动后端

```bash
cd /www/wwwroot/zhuojian/backend
npm install
npx prisma db push
node db/seed.js
node db/mdb_seed.js   # 导入156个心理测评量表（必须执行）
```

PM2 管理器 → 添加项目：
- 启动文件：`/www/wwwroot/zhuojian/backend/server.js`
- 项目名称：`zhuojian-backend`

#### 5. 配置 Nginx 反向代理

```nginx
location /api {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
location /uploads {
    proxy_pass http://127.0.0.1:3000;
}
location /socket.io {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
location ^~ /admin {
    root /www/wwwroot/zhuojian;
    index index.html;
    try_files $uri $uri/ /admin/index.html;
}
location /h5 {
    alias /www/wwwroot/zhuojian/h5;
    try_files $uri $uri/ /h5/index.html;
}
```

#### 6. 申请 SSL 证书

宝塔面板 → 网站 → 站点设置 → SSL → Let's Encrypt → 申请，开启强制 HTTPS。

---

### 发布流程

**后端：**
```bash
cd /www/wwwroot/zhuojian/backend
git pull
npm install
npx prisma db push   # schema 有变更时执行
pm2 restart zhuojian-backend
```

**管理后台：**
```bash
# 本地打包后上传
cd admin && npm run build
# 上传 admin/dist/ 到服务器 /www/wwwroot/zhuojian/admin
```

**前端 H5：**
```bash
cd frontend && npm run build:h5
# 上传 frontend/dist/build/h5/ 到服务器 /www/wwwroot/zhuojian/h5
```

**微信小程序：**
```bash
cd frontend && npm run build:mp-weixin
# 用微信开发者工具打开 dist/build/mp-weixin → 上传 → 提交审核
```

---

## 安全清单（上线前必须完成）

- [ ] 修改 `JWT_SECRET` 为随机复杂字符串
- [ ] 修改管理员密码（登录后台 → 个人设置）
- [ ] 配置 HTTPS（Let's Encrypt 免费证书）
- [ ] 将 `.env` 和 `backend/certs/` 加入 `.gitignore`，不要提交到代码库
- [ ] 定期备份 `backend/prisma/zhuojian.db`

---

## 目录结构

```
ohcard/
├── backend/              # Node.js API + Socket.io
│   ├── routes/           # auth / about / consultants / booking / news / ohcard / crisis / terms
│   ├── prisma/           # 数据库 schema (SQLite)
│   ├── services/         # SMS / Email / 危机检测
│   └── scripts/          # seed 脚本
├── frontend/             # uni-app Vue3 小程序/H5
│   └── src/pages/        # index / about / consultants / booking / ohcard / homework / legal / login
├── admin/                # Vue3 + Element Plus 管理后台
│   └── src/views/        # Dashboard / Consultants / Booking / News / CrisisEvents / TermsManager
├── ROADMAP.md            # 产品路线图
└── start.bat             # 一键启动（Windows）
```

---

## Q & A

**Q: 部署后心理测评页面只显示7个量表？**

未执行 `mdb_seed.js`，完整量表需额外执行：
```bash
node db/mdb_seed.js
```

**Q: 启动时提示端口被占用？**

各服务默认端口：后端 3000、管理后台 5174、前端 H5 5173。

Windows PowerShell 释放端口（以 3000 为例）：
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

**Q: PowerShell 提示 `&&` 不是有效语句分隔符？**

```powershell
cd frontend; npm run dev:h5
```

或直接双击 `start.bat`。

**Q: `npm install` 报 `ERESOLVE` 版本冲突？**

确认 `frontend/package.json` 中所有 `@dcloudio` 包版本一致，然后重新 `npm install`。

**Q: 前端启动报 `Preprocessor dependency "sass-embedded" not found`？**

```powershell
cd frontend
npm install -D sass-embedded
```

**Q: 测评结果得分显示为0？**

```bash
cd /www/wwwroot/zhuojian/backend
npm run db:deploy
pm2 restart zhuojian-backend
```

**Q: 宝塔面板 Nginx 无法用 `systemctl reload` 重载？**

```bash
/www/server/nginx/sbin/nginx -s reload
```

---

## 量表数据维护

**唯一维护源：** `mdb_scalesfixed.xlsx`（三个 sheet：量表信息 / 题目明细 / 评价规则）

**本地同步（有 Python）：**
```bash
pip install openpyxl   # 首次安装
python import_scales_fixed.py
```

**服务器更新（无 Python）：**
```bash
# 1. 本地生成 JSON
python import_scales_fixed.py

# 2. 上传 backend/db/mdb_scales.json 到服务器

# 3. 服务器执行
node db/mdb_seed.js
pm2 restart zhuojian-backend
```

---

## 微信小程序上线

1. [mp.weixin.qq.com](https://mp.weixin.qq.com) → 立即注册 → 小程序（企业主体）
2. 在微信后台「开发 → 服务器域名」填写：
   - request / uploadFile / downloadFile 合法域名：`https://你的域名`
   - socket 合法域名：`wss://你的域名`
3. 构建：`npm run build:mp-weixin`
4. 微信开发者工具上传 → 提交审核
5. 服务类目建议添加：**医疗健康** 或 **教育 → 在线教育**（需上传资质）

| 审核常见拒绝原因 | 解决 |
|----------------|------|
| request 请求失败 | 补充服务器域名配置 |
| 登录报 40029 | 检查后端 `.env` 中 AppID/AppSecret |
| 审核被拒（涉及医疗） | 上传营业执照和资质证明 |
| Socket 连接失败 | 在 socket 合法域名中添加 wss 地址 |

# 终端 1 - 后端
cd E:\work_fold\ohcard\backend
npm run dev
# 终端 2 - 管理后台
cd E:\work_fold\ohcard\admin
npm run dev
# 终端 3 - 前端 H5
$env:Path = "$env:LOCALAPPDATA\nodejs;$env:Path"
cd E:\work_fold\ohcard\frontend
npm run dev:h5

