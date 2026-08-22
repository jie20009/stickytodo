@echo off
:: StickyTodo - Portable Startup Script
:: Run this script to start StickyTodo without installation.
:: Requires Electron binary in node_modules (run "npm install" first).

cd /d "%~dp0"

:: Check if Electron binary exists
if not exist "node_modules\electron\dist\electron.exe" (
    echo [ERROR] Electron binary not found!
    echo.
    echo Please do ONE of the following:
    echo   1. Run "npm install" (requires internet access)
    echo   2. Manually download electron and place in node_modules\electron\dist\
    echo.
    echo For OA computers with firewall issues:
    echo   Download electron-v43.4.1-win32-x64.zip from another network,
    echo   then extract to: %LOCALAPPDATA%\electron\Cache\
    echo   Then run: node node_modules\electron\install.js
    pause
    exit /b 1
)

:: Start the app
echo Starting StickyTodo...
npx electron . %*
