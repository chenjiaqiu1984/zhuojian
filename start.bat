@echo off
echo === 卓见心理 - 启动所有服务 ===
echo.
start "后端 :3000" cmd /k "cd backend && npm run dev"
timeout /t 2 > nul
start "管理后台 :5174" cmd /k "cd admin && npm run dev"
start "前端H5 :5173" cmd /k "cd frontend && npm run dev:h5"
echo.
echo 所有服务已启动：
echo   后端 API:    http://localhost:3000
echo   管理后台:    http://localhost:5174
echo   前端 H5:     http://localhost:5173
echo   管理员账号: admin / admin123
echo.
pause
