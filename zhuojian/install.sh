#!/bin/bash
set -e
echo "=== 安装所有依赖 ==="
cd backend && npm install
cd ../admin && npm install
cd ../frontend && npm install
echo "=== 安装完成 ==="
echo ""
echo "启动方式："
echo "  后端:  cd backend && npm run dev"
echo "  管理后台: cd admin && npm run dev"
echo "  前端H5:  cd frontend && npm run dev:h5"
echo "  微信小程序: cd frontend && npm run dev:mp-weixin (需HBuilderX或微信开发者工具)"
