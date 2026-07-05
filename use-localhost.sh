#!/bin/bash
sed -i "s|http://42.192.107.26:3000|http://localhost:3000|g" frontend/src/config.js
sed -i "s|http://42.192.107.26:3000|http://localhost:3000|g" admin/vite.config.js
echo "已切换到 localhost"
