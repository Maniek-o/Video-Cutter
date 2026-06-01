#!/usr/bin/env pwsh
# Video Cutter - Portable Launcher (PowerShell)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "🎬 Video Cutter - Starting Application" -ForegroundColor Cyan

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error installing dependencies" -ForegroundColor Red
        pause
        exit 1
    }
}

# Start Electron
Write-Host "🚀 Launching Video Cutter..." -ForegroundColor Green
& npm.cmd run electron

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error starting application" -ForegroundColor Red
    Write-Host "📝 Please ensure Node.js is installed: https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}
