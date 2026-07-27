# Android APK 发布指南

本项目 frontend 为 uni-app，App 资源编译命令：

```powershell
cd frontend
npm run build:app
```

产物目录：`frontend/dist/build/app`（供 HBuilderX 云打包使用）。

> **依赖说明**：App 打包需要 `@dcloudio/uni-app-plus`，已写入 `package.json`。若 `build:app` 报 vue 相关错误，执行 `npm install` 后重试。

---

## 一、发布前检查

1. **API 地址**：生产环境使用 `frontend/.env.production` / `.env.app` 中的 `VITE_SERVER=https://www.joyineyes.xyz`
2. **版本号**：修改 `frontend/src/manifest.json` 中的 `versionName`、`versionCode`（每次发版 versionCode +1）
3. **应用图标**：当前使用 `static/logo.jpg`，建议后续替换为 1024×1024 PNG 并在 manifest → App 图标 中配置
4. **后端**：确保线上 API 与 `/static` 静态资源可访问

---

## 二、云打包（推荐，Windows 可用）

CLI 只能编译 JS 资源，**生成 APK 需 DCloud 云打包或 Android Studio**。

### 步骤

1. 下载安装 [HBuilderX](https://www.dcloud.io/hbuilderx.html) 标准版
2. 注册/登录 [DCloud 开发者中心](https://dev.dcloud.net.cn/)
3. HBuilderX → **文件 → 导入 → 从本地目录导入** → 选择 **`frontend`** 目录
4. 打开 `src/manifest.json` → **App 模块配置 / App 图标 / App 启动图** 按需调整
5. 菜单 **发行 → 原生 App-云打包**
   - 勾选 **Android**
   - **测试包**：使用 DCloud 公共证书，快速出包安装测试
   - **正式包**：使用自有 Android 签名证书（见下文）
6. 打包完成后下载 `.apk` 安装测试

### Android 签名证书（正式发版）

首次发版需生成 keystore：

```powershell
keytool -genkey -alias zhuojian -keyalg RSA -keysize 2048 -validity 36500 -keystore zhuojian-release.keystore
```

在 HBuilderX 云打包时上传该 keystore，**妥善保管密码与 keystore 文件**（后续更新必须同一证书）。

---

## 三、本地真机调试

```powershell
cd frontend
npm run dev:app
```

- 安装 Android Studio + SDK，手机开启 USB 调试
- HBuilderX：**运行 → 运行到手机或模拟器 → Android**
- 真机调试时 `VITE_SERVER` 不能写 `localhost`，改为电脑局域网 IP，例如 `http://192.168.1.100:3000`

---

## 四、CLI + Android Studio（进阶）

1. `npm run build:app`
2. HBuilderX 导入项目后 **发行 → 原生 App-本地打包 → 生成本地打包 App 资源**
3. 用 Android Studio 打开生成的 native 工程，Build → Generate Signed Bundle / APK

---

## 五、与小程序 / H5 的区别

| 项目 | 微信小程序 | H5 | Android App |
|------|-----------|-----|-------------|
| 构建命令 | `npm run build:mp-weixin` | `npm run build:h5` | `npm run build:app` |
| 产物 | `dist/build/mp-weixin` | `dist/build/h5` | `dist/build/app` + 云打包 APK |
| 静态资源 | 打进包内 | 走后端 `/static` | 打进包内 |
| API | `VITE_SERVER` 线上域名 | 同左 | 同左 |

---

## 六、常见问题

**Q: `build:app` 报 `isInSSRComponentSetup` 错误？**  
A: 缺少或版本不一致的 `@dcloudio/uni-app-plus`，执行 `npm install` 后重试。

**Q: App 里图片/接口加载失败？**  
A: 检查 `VITE_SERVER` 是否为手机可访问的 HTTPS 域名；Android 9+ 默认禁止明文 HTTP。

**Q: 能否在 Windows 打 iOS 包？**  
A: 不能，iOS 需 macOS + Xcode 或 DCloud 云打包（仍需 Apple 开发者证书）。
