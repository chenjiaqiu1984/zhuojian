# 心镜岛静态图（H5 / 共用）

前端小程序从 `frontend/src/static/island/` 打进包内；
H5 请求 `/static/island/*` 由后端 Express 提供，故此处需同步一份。

更新源图后请同时更新两边，或从 frontend 目录复制：

```bash
cp -r frontend/src/static/island/* backend/static/island/
```
