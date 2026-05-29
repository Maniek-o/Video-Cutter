@echo off
REM Start ML Backend FastAPI Server on Windows
cd /d "%~dp0"
python -m uvicorn app:app --host 127.0.0.1 --port 5001 --reload
pause
