@echo off
rem 启动本地阅读服务并打开浏览器
cd /d "%~dp0"
where node >nul 2>nul || (echo 需要安装 Node.js 18+ & pause & exit /b 1)
node scripts\serve.mjs --port 8788 --open
