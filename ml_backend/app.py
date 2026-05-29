"""
FastAPI ML Service
- Provides REST API for NSFW detection
- Handles async retraining
- Manages model versioning
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import asyncio
import base64
import io
from PIL import Image
import numpy as np
from pydantic import BaseModel, ConfigDict
from typing import Optional
import threading
import logging

from nsfw_detector import NSFWDetector, get_detector
from fine_tuner import get_fine_tuner

# Try to import ensemble detector, but fail gracefully
try:
    from ensemble_detector import get_detector as get_ensemble_detector
    ENSEMBLE_AVAILABLE = True
except Exception as e:
    logger_temp = logging.getLogger(__name__)
    logger_temp.warning(f"Ensemble detector unavailable: {e}. Using traditional detection only.")
    ENSEMBLE_AVAILABLE = False
    get_ensemble_detector = None

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Video Cutter ML Backend", version="1.0.0")

# Global state
detector = None
fine_tuner = None
ensemble_detector = None
retraining_in_progress = False


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize ML backend on startup"""
    global detector, fine_tuner, ensemble_detector
    try:
        logger.info("[START] Initializing ML Backend...")
        logger.info("[WAIT] This may take 1-2 minutes on first run (loading model)...")
        detector = NSFWDetector()
        logger.info("[OK] Traditional ML Backend initialized!")

        # Initialize ensemble detector in background only if available
        if ENSEMBLE_AVAILABLE:
            def init_ensemble():
                global ensemble_detector
                try:
                    logger.info("[START] Initializing Ensemble Detector (ResNet50 + EfficientNet + ViT)...")
                    device = 'cuda' if __import__('torch').cuda.is_available() else 'cpu'
                    ensemble_detector = get_ensemble_detector(device=device)
                    logger.info(f"[OK] Ensemble Detector ready on {device.upper()}")
                except Exception as e:
                    logger.error(f"[ERROR] Ensemble Detector failed: {e}")

            # Start ensemble init in background thread
            threading.Thread(target=init_ensemble, daemon=True).start()
        else:
            logger.info("[WARN] Ensemble Detector disabled - using traditional detection only")

        if detector and detector.current_version:
            logger.info(f"[OK] Model version: {detector.current_version}")
    except Exception as e:
        logger.error(f"[ERROR] ML Backend initialization error: {e}", exc_info=True)
        logger.info("[WARN] Server will still start - ML features may be degraded")


class APIModel(BaseModel):
    # Allow model_* fields without emitting protected namespace warnings.
    model_config = ConfigDict(protected_namespaces=())


class DetectionRequest(APIModel):
    """Request for NSFW detection"""
    image_base64: str
    frame_time: Optional[float] = None
    video_name: Optional[str] = None



class DetectionResponse(APIModel):
    """Response from NSFW detection"""
    is_nsfw: bool
    confidence: float
    version: str = "v1_base"
    timestamp: str = None
    error: Optional[str] = None


# Request model for saving profile preview
class ProfilePreviewRequest(APIModel):
    """Request to save profile preview frames/thumbnails"""
    slot_index: int
    thumbnail_base64: str


# Endpoint do zapisu podglądu profilu
@app.post("/api/ml/person-profile/{person_id}/preview-frame")
async def save_profile_preview(person_id: str, request: ProfilePreviewRequest):
    """Save selected profile preview thumbnail for a person profile"""
    try:
        # Example: Save thumbnail to a file or database (here: file per person_id)
        import os
        from datetime import datetime
        # Directory for profile previews
        previews_dir = os.path.join(os.path.dirname(__file__), "..", "Pliki do modelu NFSW", "profile_previews")
        os.makedirs(previews_dir, exist_ok=True)
        # Save thumbnail as PNG file
        filename = f"{person_id}_slot{request.slot_index}_{datetime.now().strftime('%Y%m%d%H%M%S')}.png"
        file_path = os.path.join(previews_dir, filename)
        # Decode and save image
        with open(file_path, "wb") as f:
            f.write(base64.b64decode(request.thumbnail_base64))
        # Optionally: update a JSON/db with the latest slot for this person
        meta_path = os.path.join(previews_dir, f"{person_id}_meta.json")
        import json
        meta = {"slot_index": request.slot_index, "thumbnail_file": filename, "updated": datetime.now().isoformat()}
        with open(meta_path, "w", encoding="utf-8") as mf:
            json.dump(meta, mf, ensure_ascii=False, indent=2)
        return {"status": "ok", "message": "Profile preview saved", "thumbnail_file": filename}
    except Exception as e:
        logger.error(f"Profile preview save error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# Request model for saving profile preview
class ProfilePreviewRequest(APIModel):
    """Request to save profile preview frames/thumbnails"""
    slot_index: int
    thumbnail_base64: str


class FeedbackRequest(APIModel):
    """Feedback from user on model prediction"""
    frame_time: float
    model_predicted: bool  # Co model przewidział
    user_corrected: bool   # Co użytkownik potwierdził/zmienił
    model_confidence: float
    video_name: Optional[str] = None


class StatsResponse(APIModel):
    """Model statistics response"""
    total_feedbacks: int
    model_version: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float


class HealthResponse(APIModel):
    """Health check response"""
    status: str
    version: str
    model_loaded: bool
    timestamp: str



class FeedbackRequest(APIModel):
    """User feedback on detection result"""
    frame_time: float
    video_name: Optional[str] = None
    # Preferred fields
    is_nsfw_correct: Optional[bool] = None
    model_confidence: Optional[float] = None
    # Backward-compatible aliases
    user_corrected: Optional[bool] = None
    confidence: Optional[float] = None
    thumbnail_base64: Optional[str] = None


class DetectionResponse(APIModel):
    """Detection result"""
    is_nsfw: bool
    confidence: float
    version: str
    timestamp: str


@app.on_event("startup")
async def startup_event():
    """Initialize ML models on startup"""
    global detector, fine_tuner
    logger.info("[START] Initializing ML Backend...")
    try:
        detector = get_detector()
        fine_tuner = get_fine_tuner(detector)
        logger.info("[OK] ML Backend initialized successfully")
    except Exception as e:
        logger.error(f"[ERROR] Failed to initialize ML Backend: {e}")


@app.get("/api/ml/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    from datetime import datetime
    return {
        "status": "ok" if detector else "error",
        "version": detector.current_version if detector else "unknown",
        "model_loaded": bool(detector),
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/ml/detect", response_model=DetectionResponse)
async def detect_nsfw(request: DetectionRequest):
    """Detect NSFW content in image"""
    from datetime import datetime
    if not detector:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        # Run detection (mock if needed)
        if hasattr(detector, 'detect'):
            result = detector.detect(image)
            is_nsfw = result.get('is_nsfw', False)
            confidence = result.get('confidence', 0.0)
        else:
            is_nsfw, confidence = False, 0.01
        return {
            "is_nsfw": is_nsfw,
            "confidence": float(confidence),
            "version": getattr(detector, 'current_version', 'v1_base'),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Detection error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


class EnsembleDetectionResponse(APIModel):
    """Response from ensemble NSFW detection"""
    is_nsfw: bool
    confidence: float
    scores: dict
    method: str = "ensemble_voting"
    threshold: float
    models_used: list
    timestamp: str = None
    error: Optional[str] = None


@app.post("/api/ml/detect-ensemble", response_model=EnsembleDetectionResponse)
async def detect_nsfw_ensemble(request: DetectionRequest):
    """
    Detect NSFW content using ensemble of 3 models
    - ResNet50 + EfficientNet + Vision Transformer
    - Low sensitivity (0.3 threshold) to reduce false positives
    """
    from datetime import datetime
    global ensemble_detector

    if not ensemble_detector:
        raise HTTPException(status_code=503, detail="Ensemble model not loaded yet - try again in a moment")

    try:
        # Decode base64 image
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data)).convert('RGB')

        # Save temporary image file (needed for ensemble detector)
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            image.save(tmp.name, 'JPEG')
            tmp_path = tmp.name

        try:
            # Run ensemble detection
            result = ensemble_detector.detect_nsfw(tmp_path)
            result['timestamp'] = datetime.now().isoformat()
            return result
        finally:
            # Clean up temp file
            import os
            try:
                os.unlink(tmp_path)
            except:
                pass

    except Exception as e:
        logger.error(f"Ensemble detection error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/ml/feedback")
async def submit_feedback(request: FeedbackRequest):
    """Submit feedback on prediction"""
    if not detector:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        is_nsfw_correct = request.is_nsfw_correct
        if is_nsfw_correct is None:
            is_nsfw_correct = request.user_corrected

        model_confidence = request.model_confidence
        if model_confidence is None:
            model_confidence = request.confidence

        if is_nsfw_correct is None or model_confidence is None:
            raise HTTPException(
                status_code=422,
                detail="Missing feedback fields: use is_nsfw_correct/model_confidence or user_corrected/confidence"
            )

        feedback_result = detector.submit_feedback(
            frame_time=request.frame_time,
            video_name=getattr(request, 'video_name', None),
            is_nsfw_correct=is_nsfw_correct,
            model_confidence=model_confidence,
            thumbnail_base64=request.thumbnail_base64,
        )

        retrain_triggered = False
        if not retraining_in_progress:
            threading.Thread(target=_retrain_background, daemon=True).start()
            retrain_triggered = True

        stats = detector.get_feedback_stats() if hasattr(detector, 'get_feedback_stats') else {}

        return {
            "status": "ok",
            "message": "Feedback recorded",
            "feedback_id": feedback_result.get("feedback_id"),
            "feedback_count": stats.get("total_feedback", 0),
            "retrain_triggered": retrain_triggered,
            "retrain_progress": "in_progress" if (retraining_in_progress or retrain_triggered) else "idle"
        }
    except Exception as e:
        logger.error(f"Feedback error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


def _retrain_background():
    """Run retraining in background thread"""
    global retraining_in_progress
    
    if retraining_in_progress:
        logger.warning("[WARN] Retraining already in progress, skipping...")
        return
    
    try:
        retraining_in_progress = True
        logger.info("[START] Starting background retraining...")

        if not fine_tuner:
            logger.warning("[WARN] Fine tuner is not available, skipping retraining")
            return
        
        metrics = fine_tuner.retrain(
            learning_rate=0.0001,
            epochs=3,
            batch_size=16
        )
        
        if metrics:
            logger.info(f"[OK] Retraining complete: {metrics}")
    
    except Exception as e:
        logger.error(f"[ERROR] Retraining failed: {e}")
    
    finally:
        retraining_in_progress = False


@app.get("/api/ml/stats", response_model=StatsResponse)
async def get_stats():
    """Get model statistics"""
    if not detector:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        stats = detector.get_feedback_stats() if hasattr(detector, 'get_feedback_stats') else {}
        return {
            "total_feedbacks": stats.get("total", 0),
            "model_version": getattr(detector, 'current_version', 'v1_base'),
            "accuracy": stats.get("accuracy", 0.0),
            "precision": stats.get("precision", 0.0),
            "recall": stats.get("recall", 0.0),
            "f1_score": stats.get("f1_score", 0.0)
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/ml/evaluation")
async def get_evaluation():
    """Get model evaluation"""
    if not detector:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        evaluation = detector.get_feedback_stats() if hasattr(detector, 'get_feedback_stats') else {}
        return {
            "status": "ok",
            "evaluation": evaluation,
            "version": getattr(detector, 'current_version', 'v1_base')
        }
    except Exception as e:
        logger.error(f"Evaluation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/ml/retrain")
async def retrain_model():
    """Trigger model retraining"""
    if not detector:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        if retraining_in_progress:
            return {"status": "ok", "message": "Retraining already in progress", "in_progress": True}

        threading.Thread(target=_retrain_background, daemon=True).start()
        return {"status": "ok", "message": "Retraining started", "in_progress": True}
    except Exception as e:
        logger.error(f"Retrain error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("ML_BACKEND_PORT", "5003"))
    print(f"[START] Starting ML FastAPI server on port {port}...")
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="info"
    )
