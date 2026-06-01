@echo off
REM Video Cutter - Portable Launcher
REM This script starts the Video Cutter application

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Change to script directory
cd /d "%SCRIPT_DIR%"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Error installing dependencies
        pause
        exit /b 1
    )
)

REM Start Electron
echo Starting Video Cutter...
call npm run electron

if errorlevel 1 (
    echo Error starting application
    echo Please ensure Node.js is installed: https://nodejs.org/
    pause
    exit /b 1
)

endlocal
