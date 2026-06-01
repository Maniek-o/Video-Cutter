@echo off
setlocal

set "APP_DIR=%~dp0\..\.."
set "DEFAULT_URL=http://127.0.0.1:5001"

if "%VIDEO_CUTTER_UNRAID_URL%"=="" (
  set "VIDEO_CUTTER_UNRAID_URL=%DEFAULT_URL%"
)

set "ELECTRON_START_URL=%VIDEO_CUTTER_UNRAID_URL%"
set "ELECTRON_REMOTE_ONLY=1"

cd /d "%APP_DIR%"
if not exist "node_modules\electron\dist\electron.exe" (
  echo Electron dependency not found. Run: npm install
  pause
  exit /b 1
)

"node_modules\electron\dist\electron.exe" .
