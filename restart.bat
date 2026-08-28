@echo off
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul
cd /d D:\PEGAAi_Opencode\projects\stickytodo_20260820
start /min cmd /c "npx electron ."
echo App started.
