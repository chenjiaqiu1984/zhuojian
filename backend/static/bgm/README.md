# BGM 静态资源（给前端播放）

由 `scripts/prepare-bgm.mjs` 从仓库根目录 `mp3/` 压缩生成。

- 访问路径：`/static/bgm/<文件名>.mp3`
- 勿把大体积原文件放这里；原文件留在 `mp3/`（已 gitignore）

## 线上部署注意

生产 Nginx / 反代必须把 `/static/` 指到后端 `backend/static/`，**不要**被前端 SPA 的 `try_files` 吞掉。

若线上访问 `https://域名/static/bgm/xxx.mp3` 返回 HTML 而不是 `audio/mpeg`，小程序会下载失败；客户端会降级为合成音，但仍应尽快修好静态资源托管。
