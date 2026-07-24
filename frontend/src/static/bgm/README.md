# 背景音乐

由根目录 `node scripts/prepare-bgm.mjs` 从 `mp3/` 生成到 **`backend/static/bgm/`**（远程播放）。

**不要**再把 mp3 放进 `frontend/src/static/bgm/`——会撑爆微信小程序主包 2MB 限制。

曲目列表：`frontend/src/utils/bgmTracks.generated.js`（路径形如 `/static/bgm/xxx.mp3`，运行时拼接 `SERVER`）。
