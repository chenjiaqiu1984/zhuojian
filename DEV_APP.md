# Android / iOS App 开发环境（后续配置）

本项目 frontend 基于 uni-app，已预留 App 开发脚本：

```powershell
cd frontend
npm run dev:app      # App 开发模式
npm run build:app    # App 生产构建
```

## Android（Windows 可本地开发）

### 方案 A：HBuilderX（推荐，上手快）

1. 下载 [HBuilderX](https://www.dcloud.io/hbuilderx.html) 标准版
2. 文件 → 导入 → 选择 `frontend` 目录
3. 运行 → 运行到手机或模拟器 → Android

### 方案 B：CLI + Android Studio

1. 安装 [Android Studio](https://developer.android.com/studio)
2. 安装 Android SDK（API 33+）和 JDK 17
3. 配置环境变量：
   - `ANDROID_HOME` = SDK 路径（如 `C:\Users\<用户>\AppData\Local\Android\Sdk`）
   - 将 `%ANDROID_HOME%\platform-tools` 加入 PATH
4. 在项目根目录执行：

```powershell
cd frontend
npm run dev:app
```

5. 用 Android Studio 打开生成的 native 工程目录进行真机/模拟器调试

## iOS（需 macOS）

iOS 打包与真机调试**必须在 Mac** 上完成：

1. 安装 Xcode（App Store）
2. 注册 Apple 开发者账号
3. 使用 HBuilderX 云打包，或在 Mac 上用 Xcode 打开 uni-app 生成的 iOS 工程

Windows 上只能完成 JS 资源编译（`npm run build:app`），无法完成 iOS 签名与上架。

## 本地联调

App 端 API 地址与 H5 相同，开发时确保：

- 后端运行在 `http://localhost:3000`（真机调试需改为局域网 IP，如 `http://192.168.x.x:3000`）
- 修改 `frontend/.env.development` 中的 `VITE_SERVER` 为可访问地址

## 微信小程序（已配置）

```powershell
cd frontend
npm run dev:mp-weixin
```

编译产物：`frontend/dist/dev/mp-weixin`

用微信开发者工具导入该目录，AppID：`wxd7c62acc12b303dc`（需有开发权限）。
