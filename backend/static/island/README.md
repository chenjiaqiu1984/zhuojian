# 心镜岛静态资源（H5 / 小程序远程）

## 必需文件

| 文件 | 用途 |
|------|------|
| `island-mist.jpg` | 静图封面 / 视频 poster / 失败兜底 |
| `island-mist.mp4` | **循环短视频底图**（心镜岛主视觉，H5） |
| `entry.jpg` | 首页 Hero 静图 / 视频 poster / 失败兜底 |
| `entry.mp4` | **仅首页 Hero** 循环短视频（H5，约 2.3MB） |
| `hero-*.jpg` | 各功能页 Hero |

## 视频要求（建议）

- 分辨率与静图一致或同比例（如 768×1376 竖版）
- 时长 8–20 秒可无缝循环，**H.264 + AAC（可无音轨）**
- 体积尽量 &lt; 3MB（远程加载，不进小程序主包）
- 主体景物不要大幅位移，以免热区对不齐

## 部署

小程序与 H5 均通过 `SERVER/static/island/...` 加载（`remoteUrl`）。
**静图与视频都只放本目录，不要放进 `frontend/src/static/island/`**，否则会撑爆小程序主包 2MB 限制。

1. 把文件放到本目录（线上一般是 `/www/wwwroot/zhuojian/backend/static/island/`）  
2. 重启后端 / 确认 Nginx 将 `/static` 指到 `backend/static`  
3. 微信公众平台配置 **downloadFile** 合法域名（`VITE_SERVER` 对应域名）  
4. **MIME 必须是图片类型**：`image/jpeg`，不能是 `application/octet-stream`（否则微信提示格式不对）

若 Nginx 直接托管本目录，在站点配置里保证：

```nginx
location /static/ {
  alias /www/wwwroot/zhuojian/backend/static/;
  # 或确保 http 块已 include mime.types，且含：
  # image/jpeg jpg jpeg;
}
```

检查：`curl -I https://www.joyineyes.xyz/static/island/hero-ohcard.jpg`  
应看到 `Content-Type: image/jpeg`。
