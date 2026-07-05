#!/bin/bash
set -e

PROJECT_DIR="/www/wwwroot/zhuojian"

echo "=== 拉取最新代码 ==="
cd "$PROJECT_DIR"
git pull

echo "=== 安装后端依赖 ==="
cd "$PROJECT_DIR/backend"
npm install

echo "=== 数据库迁移 ==="
npx prisma db push

echo "=== 初始化基础数据 ==="
node db/seed.js

echo "=== 导入测评量表 ==="
node db/mdb_seed.js

echo "=== 重启服务 ==="
pm2 restart ohcard-backend

echo "=== 部署完成 ==="
