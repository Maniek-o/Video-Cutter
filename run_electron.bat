@echo off
cd /d "C:\Users\Administrator\Desktop\video-cutter"
start "Backend" cmd /c "node server.js"
TIMEOUT /T 2 >nul
"C:\Program Files\nodejs\node.exe" "C:\Users\Administrator\Desktop\video-cutter\node_modules\.bin\electron" .
