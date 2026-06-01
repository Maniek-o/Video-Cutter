# 🚀 Quick Start - ML Backend + Video Cutter

## ⏱️ Installation Time: ~15 minutes

### Phase 1️⃣: Python Setup (5 min)

**Option A: Windows Store (EASIEST)**
```
1. Open Microsoft Store
2. Search "Python 3.11"
3. Click Install
4. Wait for completion
```

**Option B: Python.org**
```
1. Go to https://www.python.org/downloads/
2. Download Python 3.11.x
3. Run installer
4. ✅ Check "Add Python to PATH"
5. Click Install Now
```

**Verify:** Open PowerShell and run:
```powershell
python --version
# Should show: Python 3.11.x
```

---

### Phase 2️⃣: ML Backend Setup (8 min)

```powershell
# Navigate to project
cd C:\Users\Administrator\Desktop\video-cutter

# Go to ML backend folder
cd ml_backend

# Run setup script
setup.bat
```

**What it does:**
1. ✅ Creates Python virtual environment
2. ✅ Installs PyTorch, OpenNSFW2, FastAPI, etc.
3. ✅ Downloads pretrained NSFW model (~300MB first time)

**Output you'll see:**
```
✅ Python 3.11.9 found!
🔧 Setting up Python virtual environment...
✅ Virtual environment created!
📦 Installing Python dependencies...
[████████████████████] 100% ✅
✅ Installation complete!
```

---

### Phase 3️⃣: Start ML Backend (2 min)

**In PowerShell/Terminal:**
```powershell
cd ml_backend
run_ml_backend.bat
```

**Wait for this output:**
```
[ML-Backend] ✅ ML Backend initialized
[ML-Backend] INFO:     Application startup complete
[ML-Backend] INFO:     Uvicorn running on http://127.0.0.1:5001
```

✅ **ML Backend is ready!** Leave this terminal open.

---

### Phase 4️⃣: Start Express Server (1 min)

**In NEW PowerShell/Terminal:**
```powershell
cd C:\Users\Administrator\Desktop\video-cutter
npm start
```

**Wait for:**
```
✅ Server running on port 5000
✅ ML Backend ready!
```

---

### Phase 5️⃣: Test Everything

**Browser:** Open http://localhost:5000

**Upload a test video** and you should see:
- ✅ Thumbnails generated
- ✅ NSFW badges on flagged frames
- ✅ Auto-selected NSFW fragments

---

## 📊 Verify ML Backend Works

### Test 1: Health Check
```powershell
curl http://127.0.0.1:5001/api/ml/health
```

Expected: `{"status": "ok", ...}`

### Test 2: Get Stats
```powershell
curl http://127.0.0.1:5001/api/ml/stats
```

Expected: Shows model version, accuracy, etc.

---

## 🎯 What's Working Now

| Feature | Status |
|---------|--------|
| NSFW detection | ✅ Ready |
| Model versioning | ✅ Ready |
| Feedback storage | ✅ Ready |
| Auto-retraining (5 feedback) | ✅ Ready |
| Performance metrics | ✅ Ready |
| **Feedback UI buttons** | ⏳ Phase 2 |
| **Manual corrections** | ⏳ Phase 2 |
| **Model comparison** | ⏳ Phase 3 |

---

## 📁 Project Structure After Setup

```
video-cutter/
├── ml_backend/
│   ├── venv/                    # Python virtual environment
│   ├── app.py                   # FastAPI server
│   ├── nsfw_detector.py         # Detection engine
│   ├── fine_tuner.py            # Retraining logic
│   ├── feedback.db              # SQLite database
│   ├── models/                  # Saved model versions
│   ├── requirements.txt
│   ├── setup.bat                # Installation script
│   └── run_ml_backend.bat       # Start script
│
├── ml_backend_manager.js        # Express ↔ ML integration
├── ml_routes.js                 # ML API endpoints
├── INTEGRATION_GUIDE.md         # Detailed integration docs
├── server.js                    # Express server
├── package.json
└── public/
    └── js/main.js              # Frontend (already has NSFW UI)
```

---

## 🛠️ Common Issues & Solutions

### ❌ "Python not found"
```powershell
# Check if Python in PATH
python --version

# If fails, reinstall Python with "Add Python to PATH" checked
```

### ❌ "Module not found: torch"
```powershell
cd ml_backend
venv\Scripts\activate
pip install -r requirements.txt
```

### ❌ "Port 5001 already in use"
```python
# Edit ml_backend/app.py, line ~142:
# uvicorn.run(app, host="127.0.0.1", port=5002)  # Change 5001 to 5002
```

### ❌ ML Backend won't start
1. Check Python installed: `python --version`
2. Check PyTorch installed: `python -c "import torch; print(torch.__version__)"`
3. Check FastAPI: `python -m pip list | findstr fastapi`
4. Check port: `netstat -ano | findstr 5001`

### ⚠️ Very slow first start
- First run downloads PyTorch (~400MB) - **normal, takes 2-10 min**
- Model download (~300MB) - **happens once**
- Subsequent starts are fast (~3-5 sec)

---

## 📈 Next: Phase 2 - Frontend Integration

After confirming ML Backend works, we'll add:
1. ✅ Feedback buttons (✓ Good / ✗ Bad)
2. ✅ Manual correction UI
3. ✅ Retraining progress indicator
4. ✅ Model version display

---

## 💡 Pro Tips

### Optimize for Speed
- Don't process every frame - sample every N seconds
- Use Intel Quick Sync for ffmpeg transcoding when available
- Run ML Backend on separate machine

### Monitor Learning
```powershell
# Check model accuracy
curl http://127.0.0.1:5001/api/ml/evaluation

# Check feedback count
curl http://127.0.0.1:5001/api/ml/stats
```

### Database Backup
```powershell
# Backup feedback database
copy ml_backend\feedback.db feedback.db.backup

# Or monitor in real-time
sqlite3 ml_backend\feedback.db "SELECT * FROM feedback;"
```

---

## 📞 Support

### Check Logs
```powershell
# ML Backend logs (in ML terminal)
# Look for errors starting with ❌

# Express logs (in Express terminal)
# Look for ML integration messages
```

### Validate Data
```powershell
# Query feedback database
python
>>> import sqlite3
>>> conn = sqlite3.connect('ml_backend/feedback.db')
>>> cursor = conn.cursor()
>>> cursor.execute("SELECT COUNT(*) FROM feedback")
>>> print(cursor.fetchone())
```

---

## 🎉 Congratulations!

You now have a fully functional **adaptive ML system** that:
- 🧠 Learns from your corrections
- 🚀 Auto-improves every 5 corrections
- 📊 Tracks accuracy and performance
- 💾 Versions every model iteration
- ⚡ Runs 100% locally

**Next task: Phase 2 - Add feedback UI to frontend**

Would you like me to start Phase 2 now? 🚀
