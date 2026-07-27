# 心镜岛静态资源（H5 / 小程序远程）

## 必需文件

| 文件 | 用途 |
|------|------|
| `island-mist.jpg` | 静图封面 / 视频 poster / 失败兜底 |
| `island-mist.mp4` | **循环短视频底图**（心镜岛主视觉） |
| `entry.jpg` / `hero-*.jpg` | 入口与各页 Hero |

## 视频要求（建议）

- 分辨率与静图一致或同比例（如 768×1376 竖版）
- 时长 8–20 秒可无缝循环，**H.264 + AAC（可无音轨）**
- 体积尽量 &lt; 3MB（远程加载，不进小程序主包）
- 主体景物不要大幅位移，以免热区对不齐

## 部署

小程序与 H5 均通过 `SERVER/static/island/island-mist.mp4` 加载。

1. 把 `island-mist.mp4` 放到本目录  
2. 重启后端 / 确认 Nginx 将 `/static` 反代到 `backend/static`  
3. 微信公众平台配置 **downloadFile / 媒体** 合法域名（你的 `VITE_SERVER` 域名）

前端静图仍可放在 `frontend/src/static/island/`（小程序包内封面）；**视频只放后端**，不要打进主包。
