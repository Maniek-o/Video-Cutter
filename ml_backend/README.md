# 🤖 ML Backend - Adaptive NSFW Detection

## Overview

Local machine learning backend for adaptive NSFW content detection and real-time learning from user feedback.

### Features

- ✅ **Yahoo's Open NSFW Model** - Pretrained on 400k+ images
- ✅ **Online Learning** - Model improves with every user correction
- ✅ **Model Versioning** - Track and compare model versions
- ✅ **Fast Retraining** - Automatic retraining every 5 corrections
- ✅ **Local Processing** - All data stays on your machine
- ✅ **Transfer Learning** - Fine-tunes base model without overwriting
- ✅ **Performance Metrics** - Track accuracy, precision, recall, F1

## Architecture

```
Video Cutter (Express)
        ↓
ML Backend Manager (Node.js)
        ↓
FastAPI Server (Python)
        ↓
┌─────────────────────────┐
│  NSFW Detector          │
├─────────────────────────┤
│  Yahoo Open NSFW Model  │
│  + Fine-tuning Layer    │
│  + Version Control      │
└─────────────────────────┘
        ↓
SQLite Database (Feedback Storage)
```

## Installation

### 1. Install Python 3.11+

```bash
# Windows (via winget)
winget install Python.Python.3.11

# Or download from https://www.python.org/downloads/
```

### 2. Create Virtual Environment

```bash
cd ml_backend
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `torch` - Deep learning framework
- `torchvision` - Computer vision utilities
- `opennsfw2` - NSFW detection model
- `fastapi` - Web API framework
- `uvicorn` - ASGI server

**Note:** First installation may take 5-10 minutes due to PyTorch size (~1GB)

## Usage

### Starting the ML Backend

#### Automatic (via Express Server)
The ML Backend starts automatically when Express server boots:
```javascript
// In server.js
await mlBackendManager.start();
```

#### Manual (for development)
```bash
# Windows
cd ml_backend
run_ml_backend.bat

# Linux/Mac
cd ml_backend
chmod +x run_ml_backend.sh
./run_ml_backend.sh
```

Server will start on `http://127.0.0.1:5001`

### API Endpoints

#### 1. Health Check
```bash
GET /api/ml/health
```

Response:
```json
{
  "status": "ok",
  "model_version": "v1_base",
  "stats": {
    "total_feedback": 42,
    "corrections": 3,
    "accuracy": 0.929
  },
  "retraining": false
}
```

#### 2. Detect NSFW
```bash
POST /api/ml/detect
```

Body:
```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "frame_time": 10.5,
  "video_name": "my_video.mp4"
}
```

Response:
```json
{
  "is_nsfw": true,
  "confidence": 0.87,
  "version": "v1_base",
  "timestamp": "2024-01-15T10:30:00"
}
```

#### 3. Submit Feedback
```bash
POST /api/ml/feedback
```

Body:
```json
{
  "frame_time": 10.5,
  "video_name": "my_video.mp4",
  "is_nsfw_correct": false,
  "model_confidence": 0.87,
  "thumbnail_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}
```

Response:
```json
{
  "feedback_id": 42,
  "is_corrected": true,
  "corrections_count": 3,
  "retraining_triggered": false
}
```

**Retraining triggers automatically when `corrections_count >= 5`**

#### 4. Get Statistics
```bash
GET /api/ml/stats
```

Response:
```json
{
  "current_version": "v2_finetuned",
  "confidence_threshold": 0.5,
  "total_feedback": 42,
  "corrections": 3,
  "accuracy": 0.929,
  "videos_analyzed": 5,
  "avg_confidence": 0.72
}
```

#### 5. Get Model Evaluation
```bash
GET /api/ml/evaluation
```

Response:
```json
{
  "model_version": "v2_finetuned",
  "metrics": {
    "accuracy": 0.93,
    "precision": 0.91,
    "recall": 0.88,
    "f1_score": 0.89,
    "true_positives": 35,
    "false_positives": 3,
    "true_negatives": 40,
    "false_negatives": 5
  }
}
```

#### 6. Trigger Manual Retraining
```bash
POST /api/ml/manual-retrain
```

Response:
```json
{
  "status": "started",
  "message": "Retraining started in background"
}
```

## Configuration

### Confidence Threshold

Default: `0.5` (50%)

Change in `nsfw_detector.py`:
```python
self.confidence_threshold = 0.7  # Increase to be more strict
```

### Retraining Trigger

Default: Every 5 corrections

Change in FastAPI app:
```python
should_retrain = detector.should_retrain(min_feedback=10)  # Change to 10
```

### Learning Rate

Default: `0.0001`

Change in `fine_tuner.py`:
```python
metrics = fine_tuner.retrain(learning_rate=0.001)  # Higher = faster learning
```

## Performance

### Inference Time
- First frame: ~2-3 seconds (model loading)
- Subsequent frames: ~200-500ms per image

### Memory Usage
- Model: ~150MB RAM
- Typical batch: <500MB RAM

### Storage
- Base model: ~150MB
- SQLite database: Starts at 1MB, grows with feedback

## Troubleshooting

### Python not found
```bash
# Add Python to PATH or use full path
C:\Users\[USERNAME]\AppData\Local\Programs\Python\Python311\python.exe -m venv venv
```

### PyTorch installation slow
- First time installation downloads PyTorch (~400MB)
- Subsequent installs use cache
- Use `pip install -U pip` to update pip first

### GPU acceleration (optional)
```bash
# Install CUDA-enabled PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Port already in use
Change port in `app.py`:
```python
uvicorn.run(app, host="127.0.0.1", port=5002)  # Change 5001 to 5002
```

## Database

### Location
`ml_backend/feedback.db` (SQLite)

### Tables

**feedback**
- `id` - Unique feedback ID
- `timestamp` - When feedback was submitted
- `frame_time` - Timestamp in video
- `video_name` - Video filename
- `model_detected` - What model predicted
- `user_label` - What user corrected
- `model_confidence` - Model's confidence score
- `is_corrected` - Whether model was wrong
- `model_version` - Which model version made prediction

**model_versions**
- `version` - Version name (v1, v2, v3, etc)
- `created_at` - When version was trained
- `accuracy` - Overall accuracy
- `precision` - True positives / (true positives + false positives)
- `recall` - True positives / (true positives + false negatives)
- `f1_score` - Harmonic mean of precision and recall
- `training_samples` - How many samples used
- `file_path` - Where model file stored
- `parent_version` - Which version was fine-tuned from

## Development

### Project Structure
```
ml_backend/
├── app.py                 # FastAPI server
├── nsfw_detector.py       # Core detection logic
├── fine_tuner.py          # Model retraining
├── requirements.txt       # Python dependencies
├── feedback.db            # SQLite database
├── models/                # Saved model versions
├── run_ml_backend.bat     # Windows startup
└── run_ml_backend.sh      # Linux/Mac startup
```

### Adding Custom Detection Logic

Edit `nsfw_detector.py`:
```python
def detect(self, image_path_or_array):
    # Your custom logic here
    # Return {'is_nsfw': bool, 'confidence': float}
    pass
```

### Custom Fine-tuning

Edit `fine_tuner.py`:
```python
def retrain(self, ...):
    # Your custom training loop
    # Use PyTorch directly for more control
    pass
```

## Next Steps

1. ✅ Backend ML infrastructure
2. ⏳ Frontend feedback UI (Phase 2)
3. ⏳ Advanced features like A/B testing (Phase 3)

## Support

For issues or questions:
1. Check console logs in Express server
2. Check `debug` in FastAPI server output
3. Inspect `feedback.db` for data issues
4. Review model metrics in `/api/ml/evaluation`
