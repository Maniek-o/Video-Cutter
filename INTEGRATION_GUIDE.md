# Integration Guide - ML Backend with Express Server

## How to Integrate ML Backend into Video Cutter

### Step 1: Install Dependencies

Add to Express server's `package.json`:

```json
{
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

Then run:
```bash
npm install axios
```

### Step 2: Update server.js

Add at the **TOP** of your `server.js`:

```javascript
// Import ML Backend Manager
const MLBackendManager = require('./ml_backend_manager.js');
global.mlBackendManager = new MLBackendManager();
```

Add to **startup** section (after creating Express app):

```javascript
const app = express();

// ... other middleware ...

// Start ML Backend when server starts
async function startServer() {
  try {
    console.log('🚀 Starting Video Cutter Server...');
    
    // Start ML Backend
    try {
      await global.mlBackendManager.start();
    } catch (err) {
      console.warn('⚠️ ML Backend failed to start (disabled features):', err.message);
    }
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down...');
  await global.mlBackendManager.stop();
  process.exit(0);
});
```

### Step 3: Add ML Routes

Add to your `server.js` (after other route definitions):

```javascript
// Import ML routes
const mlRoutes = require('./ml_routes.js');
app.use(mlRoutes);
```

### Step 4: Integrate into Thumbnail Generation

Modify the `/api/thumbnails` endpoint in `server.js` to include NSFW detection:

```javascript
app.post('/api/thumbnails', async (req, res) => {
  try {
    const { videoPath, duration, interval } = req.body;
    
    // ... existing code to generate thumbnails ...
    
    const thumbnails = [];
    const nsfwAnalysis = {};
    
    // For each thumbnail, detect NSFW
    for (let time = 0; time <= duration; time += interval) {
      // Generate thumbnail (existing code)
      const thumbPath = `thumbnails/${filename}_${time}s.jpg`;
      // ... ffmpeg command ...
      
      // Detect NSFW if ML Backend available
      if (global.mlBackendManager?.isReady) {
        try {
          const thumbnailBase64 = await fs.promises.readFile(thumbPath, 'base64');
          
          const detection = await global.mlBackendManager.detectNSFW(
            thumbnailBase64,
            time,
            filename
          );
          
          nsfwAnalysis[time] = {
            is_nsfw: detection.is_nsfw,
            confidence: detection.confidence,
            model_version: detection.version
          };
        } catch (err) {
          console.warn(`⚠️ NSFW detection failed for ${time}s:`, err.message);
          nsfwAnalysis[time] = {
            is_nsfw: false,
            confidence: 0,
            error: 'Detection failed'
          };
        }
      }
      
      thumbnails.push({
        time,
        thumbnail: thumbPath
      });
    }
    
    res.json({
      thumbnails,
      nsfw_analysis: nsfwAnalysis
    });
    
  } catch (err) {
    console.error('Thumbnails error:', err);
    res.status(500).json({ error: err.message });
  }
});
```

## Frontend Integration (main.js)

Already done! The frontend has:
- ✅ NSFW badge display on thumbnails
- ✅ Auto-selection of NSFW fragments
- ✅ Feedback submission ready (will be implemented in Phase 2)

## Testing ML Backend

### Test 1: Check Connection
```bash
curl http://localhost:5001/api/ml/health
```

Expected response:
```json
{
  "status": "ok",
  "model_version": "v1_base",
  "stats": {
    "total_feedback": 0,
    "corrections": 0,
    "accuracy": 1.0
  }
}
```

### Test 2: Submit Feedback
```bash
curl -X POST http://localhost:5001/api/ml/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "frame_time": 10,
    "video_name": "test.mp4",
    "is_nsfw_correct": false,
    "model_confidence": 0.75,
    "thumbnail_base64": "base64encodedimage"
  }'
```

### Test 3: Get Statistics
```bash
curl http://localhost:5001/api/ml/stats
```

## Architecture Flow

```
User uploads video
        ↓
Express generates thumbnails
        ↓
For each thumbnail:
  ├─ Create thumbnail image
  └─ Send to ML Backend for NSFW detection
        ↓
Frontend displays:
  ├─ Thumbnail
  ├─ NSFW badge (if detected)
  └─ Confidence %
        ↓
User clicks ✓/✗ feedback button
        ↓
Submit feedback via:
  POST /api/ml/feedback
        ↓
ML Backend:
  ├─ Records feedback in SQLite
  ├─ Checks if 5+ corrections collected
  └─ If yes: Trigger async retraining
        ↓
Next video uses improved model v2
```

## Performance Considerations

### Thumbnail Detection Latency
- First frame: ~2-3 seconds (model loading)
- Subsequent frames: ~200-500ms each
- Total time for 100-frame video: ~1-2 minutes

**Optimization:** Generate thumbnails WITHOUT detection first, then detect async:

```javascript
// Generate all thumbnails first (fast)
const thumbnails = await generateAllThumbnails();
res.json({ thumbnails, nsfw_analysis: {} });

// Detect NSFW in background (async)
detectNSFWAsync(videoId, thumbnails);
```

### Memory Management
- ML model uses ~150-200MB RAM
- Each frame detection ~50MB temporary
- Cleanup after each batch

## Troubleshooting

### "ML Backend not available"
- Check if Python is installed
- Check if FastAPI server started correctly
- Check port 5001 is not blocked
- Check logs in ml_backend/ terminal

### Slow detection
- First run downloads model (~2min)
- CPU-only mode is enabled (Intel Quick Sync can accelerate ffmpeg video pipeline)
- Too many concurrent processes

### Model accuracy poor
- Not enough feedback data yet (need 5+ corrections)
- Model version still v1_base (needs retraining)
- Check `/api/ml/evaluation` for metrics

## Next Steps

1. ✅ Phase 1: ML Backend Infrastructure (DONE)
2. 🔄 Phase 2: Frontend Feedback UI
   - Add feedback buttons on results
   - Implement manual correction UI
   - Show model version to user
3. 🔄 Phase 3: Advanced Features
   - Model comparison UI
   - Download model versions
   - Cloud sync (optional)
