# 🧪 Phase 2 Testing Guide - ML Backend + Frontend Integration

## Quick Start Testing

### Prerequisites
1. **Python ML Backend running** on port 5001
2. **Express server running** on port 5000
3. **All dependencies installed**

---

## 📋 Test 1: ML Backend Unit Tests

**What it tests:** Core ML detection, feedback storage, retraining logic

### Run Tests
```bash
cd video-cutter/ml_backend
python test_ml_backend.py
```

### Expected Output
```
✅ Health Check
✅ NSFW Detection
✅ Feedback Submission
✅ Statistics Endpoint
✅ Model Evaluation
✅ Database Integrity
✅ Multi-Feedback Batch (Retraining Trigger)
✅ Performance Benchmark
✅ Error Handling

📊 Results: 9/9 tests passed (100%)
```

### What Each Test Does

| Test | Purpose | Checks |
|------|---------|--------|
| **Health Check** | Server connectivity | ML Backend online & responsive |
| **NSFW Detection** | Detection accuracy | Image processing, confidence scores |
| **Feedback Submission** | Database storage | Feedback saved correctly |
| **Statistics** | Metrics aggregation | Accuracy, precision, recall calculated |
| **Evaluation** | TP/FP/TN/FN metrics | Model performance tracking |
| **Database Integrity** | Data consistency | All tables present, data valid |
| **Multi-Feedback Batch** | Retraining trigger | 5 feedbacks → auto-retrain |
| **Performance** | Speed benchmarking | Inference time < 1 second |
| **Error Handling** | Edge cases | Invalid input handling |

---

## 📋 Test 2: Express + ML Integration Tests

**What it tests:** Express server communicating with ML backend

### Run Tests
```bash
cd video-cutter
npm test -- test_integration.js
```

Or directly:
```bash
node test_integration.js
```

### Expected Output
```
🧪 Testing Express Server
✅ Express server is running on port 5000

🧪 Testing ML Backend Connection
✅ ML Backend is running on port 5001

🧪 Testing Express ML Feedback Route
✅ Express → ML feedback route working!

🧪 Testing Express ML Stats Route
✅ Express → ML stats route working!

🧪 Testing Express ML Evaluation Route
✅ Express → ML evaluation route working!

🧪 Testing Express ML Retrain Route
✅ Express → ML retrain route working!

🧪 Testing End-to-End Feedback Flow
✅ End-to-end feedback flow completed!

🧪 Testing Error Handling
✅ Error handling tests passed

🧪 Testing Integration Performance
✅ Performance Results: Average 145ms

📊 Results: 9/9 tests passed (100%)
```

### What Each Test Does

| Test | Purpose | Route |
|------|---------|-------|
| **Express Server** | Server connectivity | `/api/test` |
| **ML Connection** | Backend availability | Port 5001 health check |
| **Feedback Route** | Data forwarding | `/api/ml/feedback` → ML Backend |
| **Stats Route** | Metrics retrieval | `/api/ml/stats` → ML Backend |
| **Evaluation Route** | Model metrics | `/api/ml/evaluation` → ML Backend |
| **Retrain Route** | Trigger retraining | `/api/ml/retrain` → ML Backend |
| **End-to-End** | Complete flow | Multi-step feedback cycle |
| **Error Handling** | Edge cases | Invalid requests, timeouts |
| **Performance** | Response time | Latency monitoring |

---

## 📋 Test 3: Frontend UI Testing (Manual)

### Step 1: Upload Test Video
1. Open http://localhost:5000 in browser
2. Click "Wgraj video" (Upload video)
3. Select any MP4 file
4. Wait for thumbnails to generate

### Step 2: Verify NSFW Detection UI
1. Look for **"Xxx"** badge on suspicious thumbnails
2. Badge should appear on top-right of thumbnail
3. **✓ Expected:** Red/orange badge on some frames

### Step 3: Test Feedback Buttons
1. **Hover over a thumbnail with badge** → Feedback buttons appear (✓ and ✗)
2. Click **✓ (Green)** button → "Feedback wysłany!" message
3. Click **✗ (Red)** button on another → Same success message
4. Button should show **"✅"** briefly, then reset

### Step 4: Monitor Feedback Count
Submit 5 feedbacks and watch for:
```
✅ Feedback wysłany! (1/5 - 4 do retrain'u)
✅ Feedback wysłany! (2/5 - 3 do retrain'u)
✅ Feedback wysłany! (3/5 - 2 do retrain'u)
✅ Feedback wysłany! (4/5 - 1 do retrain'u)
✅ Feedback wysłany! 🔄 Retrain triggered (5/5)
```

### Step 5: Check ML Stats
Open browser console and run:
```javascript
fetch('/api/ml/stats').then(r => r.json()).then(d => console.log(d))
```

Expected output:
```json
{
  "status": "ok",
  "feedback_count": 5,
  "current_version": "v2_finetuned",
  "accuracy": 0.85,
  "precision": 0.82,
  "recall": 0.88,
  "f1_score": 0.85
}
```

---

## 🐛 Troubleshooting

### ❌ "ML Backend not available"
```bash
# Check if ML Backend is running
curl http://127.0.0.1:5001/api/ml/health

# If not, start it
cd ml_backend
python -m uvicorn app:app --host 127.0.0.1 --port 5001
```

### ❌ "Port 5000 already in use"
```bash
# Kill existing server
lsof -i :5000  # macOS/Linux
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process  # Windows
```

### ❌ "Feedback button doesn't appear"
1. Check that NSFW badge is showing
2. Hover directly over thumbnail (not on time label)
3. Open DevTools console for errors

### ❌ "Test says Database error"
```bash
# Delete old database and regenerate
cd ml_backend
rm feedback.db
python app.py  # Creates fresh database
```

---

## 📊 Performance Benchmarks

### Expected Performance (Phase 2)

| Operation | Time | Target |
|-----------|------|--------|
| NSFW Detection (per frame) | 200-500ms | < 1s ✓ |
| Feedback submission | 50-100ms | < 200ms ✓ |
| Stats retrieval | 30-50ms | < 100ms ✓ |
| Batch feedback (5 submissions) | 300-500ms | < 1s ✓ |
| Full feedback cycle (detect→submit→retrain trigger) | 5-10min | Normal ✓ |

### Performance Testing
```bash
# Run performance benchmark
python ml_backend/test_ml_backend.py

# Look for:
# Performance Results:
# Average: 245.32ms  ← Should be < 500ms
# Min: 198.45ms
# Max: 387.21ms
```

---

## ✅ Checklist - Phase 2 Complete When:

- [ ] **ML Backend Test Suite passes** (9/9 tests)
- [ ] **Integration Test Suite passes** (9/9 tests)
- [ ] **Frontend UI shows NSFW badges** correctly
- [ ] **Feedback buttons appear** on hover
- [ ] **Feedback submission works** (success message appears)
- [ ] **Feedback count increments** (1/5 → 2/5 → etc)
- [ ] **Retraining triggers** after 5 feedbacks
- [ ] **Stats API returns correct data**
- [ ] **No errors in browser console**
- [ ] **No errors in terminal logs**

---

## 🚀 Phase 2 Success Criteria

### ✅ All Tests Pass
```
ML Backend Tests: 9/9 ✓
Integration Tests: 9/9 ✓
Frontend Manual: All features ✓
```

### ✅ Performance Acceptable
- Feedback submission: < 200ms
- Detection: < 500ms
- No UI freezing

### ✅ All Features Working
- ✓ NSFW detection displays badges
- ✓ Feedback buttons visible on hover
- ✓ Feedback counter shows 0-5
- ✓ Retraining auto-triggers at 5
- ✓ Stats/evaluation endpoints working
- ✓ Database storing all data correctly

---

## 📝 Test Results Template

When all tests pass, document results:

```
PHASE 2 - ML BACKEND + FRONTEND INTEGRATION
Date: [DATE]
Time: [TIME]

ML Backend Tests: 9/9 PASSED ✓
Integration Tests: 9/9 PASSED ✓
Frontend UI Tests: ALL PASSED ✓
Performance: ACCEPTABLE ✓
Database: CLEAN ✓
Feedback Cycle: 1→5 WORKING ✓
Retraining: AUTO-TRIGGERED ✓

Status: READY FOR PHASE 3 ✅
```

---

## 🔄 Next Steps (Phase 3)

After Phase 2 passes:
1. Add manual correction drawing UI
2. Implement A/B testing for models
3. Add cloud backup option
4. Performance optimization
5. Production deployment

**Questions?** Check INTEGRATION_GUIDE.md or README.md in ml_backend/ folder.
