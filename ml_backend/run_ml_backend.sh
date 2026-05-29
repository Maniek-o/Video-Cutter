#!/bin/bash
# Start ML Backend FastAPI Server
cd "$(dirname "$0")"
python -m uvicorn app:app --host 127.0.0.1 --port 5001 --reload
