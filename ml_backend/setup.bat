@echo off
REM ============================================================
REM Video Cutter ML Backend Setup
REM Automatic installation of Python + dependencies
REM ============================================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║  Video Cutter ML Backend Setup                            ║
echo ║  Adaptive NSFW Detection with Online Learning             ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Check if Python is already installed
python --version >nul 2>&1
if %errorlevel% == 0 (
  for /f "tokens=2" %%i in ('python --version') do set PYTHON_VERSION=%%i
  echo ✅ Python %PYTHON_VERSION% found!
  goto :venv_setup
)

echo ⚠️  Python not found. Please install Python 3.11+
echo.
echo Options:
echo 1. Download from: https://www.python.org/downloads/
echo 2. Or use Microsoft Store: https://aka.ms/python
echo 3. After installation, run this script again
echo.
pause
exit /b 1

:venv_setup
echo.
echo 🔧 Setting up Python virtual environment...
cd /d "%~dp0"

if exist venv (
  echo ✅ Virtual environment already exists
  goto :install_deps
)

python -m venv venv
if %errorlevel% neq 0 (
  echo ❌ Failed to create virtual environment
  pause
  exit /b 1
)
echo ✅ Virtual environment created!

:install_deps
echo.
echo 📦 Installing Python dependencies...
echo This may take 10-15 minutes on first run (downloading PyTorch ~400MB)...
echo.

call venv\Scripts\activate.bat

pip install --upgrade pip
if %errorlevel% neq 0 (
  echo ❌ Failed to upgrade pip
  pause
  exit /b 1
)

pip install -r requirements.txt
if %errorlevel% neq 0 (
  echo ❌ Failed to install requirements
  pause
  exit /b 1
)

echo.
echo ✅ Installation complete!
echo.
echo 📋 Next steps:
echo.
echo 1. Start ML Backend:
echo    cd ml_backend
echo    run_ml_backend.bat
echo.
echo 2. In another terminal, start Express server:
echo    npm start
echo.
echo 3. Open app in browser:
echo    http://localhost:5000
echo.
pause
