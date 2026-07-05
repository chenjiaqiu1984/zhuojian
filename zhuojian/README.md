# 卓见心理 小程序

uni-app 跨平台应用（微信小程序 / H5 / Android）+ Node.js 后端 + Vue3 管理后台

功能模块：关于我们、咨询师预约、OH卡心理工具、新闻活动、**心理测评**（PHQ-9 / GAD-7 / SDS / SAS / ISI / 大五人格 / MBTI / SCL-90）

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

## 上线配置

将 `backend/.env.example` 复制为 `backend/.env`，逐项填入：

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=          # 随机32位字符串，用于加密token
```

---

### 1. 手机短信验证码（阿里云）

**获取步骤：**

1. 注册 [阿里云](https://www.aliyun.com) 账号并完成实名认证
2. 进入 **云通信 → 短信服务 → 国内消息**
3. 申请签名（如"卓见心理"），等待审核（1个工作日）
4. 申请模板，内容填写：`您的验证码为：${code}，5分钟内有效`
5. 进入 **AccessKey 管理** → 创建 AccessKey

```env
ALI_KEY=LTAI5t...           # AccessKey ID
ALI_SECRET=xxx              # AccessKey Secret
ALI_SMS_SIGN=卓见心理        # 你申请的短信签名
ALI_SMS_TEMPLATE=SMS_xxx    # 审核通过的模板CODE
```

> 费用：约 0.045元/条，新用户有免费额度

---

### 2. 邮箱验证码（QQ邮箱）

**获取步骤：**

1. 登录 [mail.qq.com](https://mail.qq.com)
2. 设置 → 账户 → POP3/IMAP/SMTP服务 → 开启 SMTP
3. 按提示发短信，获得**授权码**（不是QQ密码）

```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的邮箱@qq.com
SMTP_PASS=16位授权码       # 形如：abcdefghijklmnop
```

> 也可使用企业邮箱（腾讯企业邮/阿里企业邮），SMTP配置略有不同

---

### 3. 微信小程序

**获取步骤：**

1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 注册小程序账号（需企业资质上线，个人可测试）
3. 首页 → 开发管理 → 开发设置 → AppID 和 AppSecret

```env
WX_APPID=wx1234567890abcdef    # 18位小程序AppID
WX_SECRET=xxxxxxxxxxxxxxxx     # 32位AppSecret（保密，不要提交到代码库）
```

同时修改前端配置 `frontend/src/manifest.json`：

```json
"mp-weixin": {
  "appid": "wx1234567890abcdef"
}
```

---

### 4. QQ 登录（可选）

**获取步骤：**

1. 登录 [QQ互联](https://connect.qq.com)
2. 创建应用 → 移动应用 → 填写应用信息
3. 审核通过后获得 AppID

```env
QQ_APPID=你的QQ互联AppID
QQ_SECRET=你的AppSecret
```

---

## 上线部署

### 使用宝塔面板部署（推荐）

#### 1. 安装宝塔面板

SSH 登录服务器后执行（CentOS/Ubuntu 二选一）：

```bash
# CentOS
yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec

# Ubuntu
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && bash install.sh ed8484bec
```

安装完成后，终端会输出面板地址、账号和密码，保存好。

---

#### 2. 安装必要软件

登录宝塔面板 → 首页弹出的 LNMP 推荐套件，选择安装：

- **Nginx**（任意版本）
- **PM2 管理器**（在软件商店搜索 "PM2"，用于运行 Node.js）

如未弹出，进入 **软件商店** 手动搜索安装。

---

#### 3. 上传项目文件

在宝塔 **文件管理** 中将 `backend/` 目录上传至 `/www/wwwroot/zhuojian/backend`，
或在服务器上直接 clone：

```bash
cd /www/wwwroot
git clone 你的仓库地址 zhuojian
```

---

#### 4. 配置后端环境变量

```bash
cd /www/wwwroot/zhuojian/backend
cp .env.example .env
# 用宝塔文件管理器打开 .env，填入各项配置
```

---

#### 5. 初始化数据库 & 启动后端

宝塔面板 → **PM2 管理器** → **Node 版本管理** 安装 Node 18+，然后：

```bash
cd /www/wwwroot/zhuojian/backend
npm install
npx prisma db push
node db/seed.js
```

PM2 管理器 → 添加项目：
- 启动文件：`/www/wwwroot/zhuojian/backend/server.js`
- 项目名称：`zhuojian-backend`
- 点击 **添加** 并启动

---

#### 6. 配置 Nginx 反向代理

宝塔面板 → **网站** → 添加站点（填写你的域名）→ 进入站点设置 → **反向代理** → 添加：

| 字段 | 填写 |
|------|------|
| 代理名称 | api |
| 目标 URL | `http://127.0.0.1:3000` |
| 发送域名 | `$host` |

然后进入 **配置文件**，在 `server {}` 块中加入（或替换反向代理部分）：

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
```

---

#### 7. 部署管理后台和前端 H5

```bash
# 本地打包
cd admin && npm run build
cd frontend && npm run build:h5
```

宝塔 **文件管理** 将 `admin/dist/` 上传至 `/www/wwwroot/zhuojian/admin`，
将 `frontend/dist/build/h5/` 上传至 `/www/wwwroot/zhuojian/h5`。

在 Nginx 配置中添加：

```nginx
location /admin {
    alias /www/wwwroot/zhuojian/admin;
    try_files $uri $uri/ /admin/index.html;
}
location /h5 {
    alias /www/wwwroot/zhuojian/h5;
    try_files $uri $uri/ /h5/index.html;
}
```

---

#### 8. 申请 SSL 证书（HTTPS）

宝塔面板 → 网站 → 站点设置 → **SSL** → Let's Encrypt → 勾选域名 → 申请。
申请成功后开启**强制 HTTPS**。

---

### 手动部署（不使用宝塔）

```bash
# 在服务器上
git clone 你的仓库
cd backend
npm install
npx prisma db push
node db/seed.js
npm install -g pm2
pm2 start server.js --name zhuojian-backend
pm2 save
```

配置 Nginx 反向代理：

```nginx
server {
    listen 80;
    server_name 你的域名;

    location /api { proxy_pass http://localhost:3000; }
    location /uploads { proxy_pass http://localhost:3000; }
    location /socket.io { proxy_pass http://localhost:3000; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
}
```

### 前端修改后端地址

上线前修改 `frontend/src/api/index.js` 第一行：

```js
const BASE_URL = 'https://你的域名/api';  // 改为实际域名
```

### 微信小程序打包上传

```bash
cd frontend && npm run build:mp-weixin
```

用**微信开发者工具**打开 `frontend/dist/build/mp-weixin` → 上传 → 在公众平台提交审核

### 管理后台部署

```bash
cd admin && npm run build
# 将 dist/ 目录部署到 Nginx 静态目录
```

---

## 安全清单（上线前必须完成）

- [ ] 修改 `JWT_SECRET` 为随机复杂字符串
- [ ] 修改管理员密码（登录后台 → 个人设置）
- [ ] 配置 HTTPS（Let's Encrypt 免费证书）
- [ ] 将 `.env` 加入 `.gitignore`，不要提交到代码库
- [ ] 定期备份 `backend/prisma/zhuojian.db` 数据库文件

---

## Q & A

**Q: 启动时提示端口被占用怎么办？**

各服务默认端口：后端 3000、管理后台 5174、前端 H5 5173。

Windows PowerShell 释放指定端口（以 3000 为例）：

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

其他端口替换数字即可。也可以直接关闭占用该端口的进程窗口，然后重新启动。

---

**Q: PowerShell 提示 `&&` 不是有效语句分隔符？**

PowerShell 不支持 `&&`，改用 `;` 分隔或分两步执行：

```powershell
cd frontend; npm run dev:h5
```

也可以直接双击 `start.bat` 一键启动全部服务。

---

**Q: `npm install` 报 `ERESOLVE` 版本冲突或前端启动报 `Cannot find module '@dcloudio/uni-cli-i18n'`？**

原因：`package.json` 中 `@dcloudio/*` 使用 `*` 通配符，npm 可能解析到 2021 年的旧 alpha 版本（与 Vite 4 不兼容）。

解决：确认 `frontend/package.json` 中所有 `@dcloudio` 包已固定为同一版本（如 `3.0.0-alpha-1000920260615733`），vite 使用 `^7.3.3`，然后重新安装：

```powershell
cd frontend
npm install
```

---

**Q: 前端启动报 `Preprocessor dependency "sass-embedded" not found`？**

缺少 SCSS 预处理器，安装即可：

```powershell
cd frontend
npm install -D sass-embedded
```

---

## 目录结构

```
ohcard/
├── backend/          # Node.js API + Socket.io
│   ├── routes/       # auth / about / consultants / booking / news / ohcard
│   ├── prisma/       # 数据库 schema
│   ├── services/     # SMS / Email 服务
│   └── socket/       # OH卡实时房间
├── frontend/         # uni-app Vue3 小程序/H5/App
│   └── src/pages/    # index / about / consultants / booking / news / ohcard / login / profile
├── admin/            # Vue3 + Element Plus 管理后台
│   └── src/views/    # Dashboard / About / Consultants / Booking / News / OhCard
├── test.md           # 测试指南
└── start.bat         # 一键启动（Windows）
```
