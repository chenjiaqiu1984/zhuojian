# 卓见心理 — 测试指南

## 前置：释放端口

如果提示 `EADDRINUSE: address already in use :::3000`，先执行：

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

---

## 第一步：启动后端

```bash
cd K:/Code_folder/ohcard/backend
npm run dev
```

看到 `Server running on http://localhost:3000` 即成功。

### 接口验证（新终端）

```bash
# 公司介绍
curl http://localhost:3000/api/about

# 咨询师列表
curl http://localhost:3000/api/consultants

# 管理员登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

---

## 第二步：管理后台测试

```bash
cd K:/Code_folder/ohcard/admin
npm run dev
# 打开 http://localhost:5174
# 账号: admin  密码: admin123
```

测试清单：

- [ ] 登录成功，跳转到概览页
- [ ] 关于我们 → 修改内容 → 保存
- [ ] 咨询师 → 新增咨询师 → 进入排班 → 添加时间段
- [ ] 新闻活动 → 新增新闻 → 发布
- [ ] OH卡管理 → 新增牌组 → 批量添加字卡（每行一个词）
- [ ] 预约管理 → 查看列表（需先在前端完成预约）

---

## 第三步：前端 H5 测试

```bash
cd K:/Code_folder/ohcard/frontend
npm run dev:h5
# 打开 http://localhost:5173
```

测试清单：

- [ ] 首页加载，咨询师和新闻显示正常
- [ ] 点击咨询师卡片，进入详情页
- [ ] 登录页 → 手机号输入 → 点"获取验证码"

  > 开发模式验证码不真实发送，查看**后端终端**输出：
  > `[SMS DEV] 138xxxx -> code: 123456`

- [ ] 填入验证码登录成功
- [ ] 咨询师详情 → 选择时间段 → 预约
- [ ] 预约管理 → 确认预约记录存在
- [ ] 新闻活动 → 点击进入详情
- [ ] OH卡 → 经典抽卡 → 选牌组 → 抽卡 → 翻牌 → 填感想 → 保存
- [ ] OH卡 → 图卡排序 → 抽6张 → 拖动排序 → 保存
- [ ] OH卡 → 图字匹配 → 抽图卡+字卡 → 配对 → 保存
- [ ] 抽卡记录 → 查看历史
- [ ] OH卡 → 房间抽卡 → 创建房间，另开标签页输入同一房间号 → 测试实时同步

---

## 第四步：邮箱验证码测试

在登录页切换到"邮箱登录"，输入任意邮箱，查看**后端终端**：

```
[EMAIL DEV] test@qq.com -> code: 654321
```

填入该验证码完成登录。

---

## 第五步：微信小程序（需微信开发者工具）

```bash
cd K:/Code_folder/ohcard/frontend
npm run dev:mp-weixin
```

用[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
打开 `frontend/dist/dev/mp-weixin` 目录预览。

---

## 常见问题

| 现象 | 解决 |
|------|------|
| 端口 3000 被占用 | 执行上方"释放端口"命令 |
| 前端接口报 404 | 确认后端已启动 |
| 验证码收不到 | 开发模式看后端控制台输出 |
| 抽卡页没有图片 | 正常，需在管理后台上传图卡图片 |
| 房间功能不同步 | 确认两个标签页的房间号完全一致 |
