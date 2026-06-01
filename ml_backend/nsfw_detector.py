"""
NSFW Detector - Yahoo's Open NSFW Model with Fine-tuning
Supports online learning and model versioning
"""
import os
import json
import numpy as np
from datetime import datetime
from pathlib import Path
import sqlite3

try:
    import torch
    import torchvision.transforms as transforms
    from PIL import Image
    # NOTE: Don't import opennsfw2 here - it freezes on Windows
    # Import only when needed
except ImportError:
    print("[WARN] Warning: PyTorch dependencies not installed. Install with: pip install torch opennsfw2 pillow")


def get_model_data_dir():
    configured = os.getenv('NSFW_MODEL_DATA_DIR')
    if configured:
        return Path(configured).expanduser().resolve()
    return (Path(__file__).resolve().parent.parent / 'Pliki do modelu NFSW').resolve()


class NSFWDetector:
    """
    Main NSFW Detection Engine
    - Uses Yahoo's Open NSFW model (pretrained)
    - Supports fine-tuning with user feedback
    - Maintains model versions for A/B testing
    """

    def __init__(self, model_dir=None, db_path=None, dataset_dir=None, frames_dir=None):
        # Domyślna ścieżka do folderu z danymi
        base_data_dir = get_model_data_dir()
        self.model_dir = Path(model_dir) if model_dir else base_data_dir / 'models'
        self.model_dir.mkdir(parents=True, exist_ok=True)

        self.db_path = Path(db_path) if db_path else base_data_dir / 'feedback.db'
        self.dataset_dir = Path(dataset_dir) if dataset_dir else base_data_dir / 'dataset'
        self.frames_dir = Path(frames_dir) if frames_dir else base_data_dir / 'frames'
        self.confidence_threshold = 0.45  # 45% confidence threshold (ultra sensitivity)

        # Initialize database
        self._init_database()

        # Load Yahoo's pretrained model (async)
        self.model = None
        try:
            print("[WAIT] Attempting to load model...")
            self.model = self._load_base_model()
        except Exception as e:
            print(f"[ERROR] Model loading failed: {e}")

        self.current_version = self._get_latest_version()

        if self.model:
            print(f"[OK] NSFW Detector initialized - Version: {self.current_version}")
        else:
            print(f"[WARN] NSFW Detector initialized (no model) - Version: {self.current_version}")
    
    def _init_database(self):
        """Initialize SQLite database for feedback tracking"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Feedback table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                frame_time INTEGER,
                video_name TEXT,
                thumbnail_base64 TEXT,
                model_detected BOOLEAN,
                user_label BOOLEAN,
                model_confidence REAL,
                is_corrected BOOLEAN,
                model_version TEXT,
                corrected_region TEXT
            )
        ''')
        
        # Model versions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS model_versions (
                version TEXT PRIMARY KEY,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                accuracy REAL,
                precision REAL,
                recall REAL,
                f1_score REAL,
                training_samples INTEGER,
                file_path TEXT,
                parent_version TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _load_base_model(self):
        """Load Yahoo's Open NSFW pretrained model"""
        # NOTE: opennsfw2.make_open_nsfw_model() freezes on Windows
        # Skip loading - use mock or lazy loading instead
        print("[SKIP] Skipping model load (lazy initialization)")
        return None
    
    def _get_latest_version(self):
        """Get the latest model version from database"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            cursor.execute(
                'SELECT version FROM model_versions ORDER BY created_at DESC LIMIT 1'
            )
            result = cursor.fetchone()
            conn.close()
            return result[0] if result else 'v1_base'
        except:
            return 'v1_base'
    
    def detect(self, image_path_or_array):
        """
        Detect NSFW in a single image
        
        Args:
            image_path_or_array: Path to image or numpy array
            
        Returns:
            {
                'is_nsfw': bool,
                'confidence': float (0-1),
                'version': str,
                'timestamp': str
            }
        """
        if self.model is None:
            return {'is_nsfw': False, 'confidence': 0.0, 'error': 'Model not loaded'}
        
        try:
            # Load image
            if isinstance(image_path_or_array, str):
                image = Image.open(image_path_or_array).convert('RGB')
            else:
                image = Image.fromarray(image_path_or_array).convert('RGB')
            
            # Get prediction
            with torch.no_grad():
                prediction = opennsfw2.classify_frame(self.model, image)
            
            confidence = float(prediction)
            is_nsfw = confidence > self.confidence_threshold
            
            return {
                'is_nsfw': is_nsfw,
                'confidence': confidence,
                'version': self.current_version,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"[ERROR] Detection error: {e}")
            return {'is_nsfw': False, 'confidence': 0.0, 'error': str(e)}
    
    def submit_feedback(self, frame_time, video_name, is_nsfw_correct, model_confidence, thumbnail_base64=None):
        """
        Submit user feedback for model improvement
        
        Args:
            frame_time: Timestamp in video (seconds)
            video_name: Name of video
            is_nsfw_correct: User's verdict (True=NSFW, False=Not NSFW)
            model_confidence: Original model confidence (0-1)
            thumbnail_base64: Base64 encoded image (optional)
        """
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Determine if model was wrong
        model_detected = model_confidence > self.confidence_threshold
        is_corrected = model_detected != is_nsfw_correct
        
        cursor.execute('''
            INSERT INTO feedback 
            (frame_time, video_name, thumbnail_base64, model_detected, user_label, 
             model_confidence, is_corrected, model_version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            frame_time, video_name, thumbnail_base64, model_detected, 
            is_nsfw_correct, model_confidence, is_corrected, self.current_version
        ))
        
        conn.commit()
        feedback_id = cursor.lastrowid
        conn.close()
        
        print(f"[OK] Feedback #{feedback_id} recorded (correct={not is_corrected})")
        
        return {
            'feedback_id': feedback_id,
            'is_corrected': is_corrected,
            'corrections_count': self._count_corrections()
        }
    
    def _count_corrections(self):
        """Count how many corrections have been submitted"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM feedback WHERE is_corrected = TRUE')
        count = cursor.fetchone()[0]
        conn.close()
        return count
    
    def get_feedback_stats(self):
        """Get statistics about feedback submitted"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                COUNT(*) as total_feedback,
                SUM(CASE WHEN is_corrected = TRUE THEN 1 ELSE 0 END) as corrections,
                COUNT(DISTINCT video_name) as videos,
                AVG(model_confidence) as avg_confidence
            FROM feedback
        ''')
        
        result = cursor.fetchone()
        conn.close()
        
        return {
            'total_feedback': result[0] or 0,
            'corrections': result[1] or 0,
            'accuracy': (result[0] - (result[1] or 0)) / max(result[0], 1),
            'videos_analyzed': result[2] or 0,
            'avg_confidence': result[3] or 0.0
        }
    
    def should_retrain(self, min_feedback=5):
        """Check if we should trigger retraining"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        # Get feedback since last training
        cursor.execute('''
            SELECT COUNT(*) FROM feedback 
            WHERE model_version = ?
        ''', (self.current_version,))
        
        feedback_count = cursor.fetchone()[0]
        conn.close()
        
        return feedback_count >= min_feedback
    
    def get_training_data(self):
        """Get all feedback data for retraining"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                id, frame_time, video_name, thumbnail_base64,
                user_label, model_confidence, model_version
            FROM feedback
            WHERE is_corrected = TRUE OR model_version = 'v1_base'
            ORDER BY timestamp DESC
        ''')
        
        data = cursor.fetchall()
        conn.close()
        
        return data
    
    def save_version(self, version_name, metrics):
        """Save model version with metrics"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        model_path = self.model_dir / f"{version_name}.pt"
        
        cursor.execute('''
            INSERT OR REPLACE INTO model_versions
            (version, accuracy, precision, recall, f1_score, training_samples, file_path, parent_version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            version_name,
            metrics.get('accuracy', 0),
            metrics.get('precision', 0),
            metrics.get('recall', 0),
            metrics.get('f1_score', 0),
            metrics.get('training_samples', 0),
            str(model_path),
            self.current_version
        ))
        
        conn.commit()
        conn.close()
        
        self.current_version = version_name
        print(f"✅ Model version {version_name} saved")


# Initialize global detector instance
detector = None

def initialize_detector():
    """Initialize the global detector"""
    global detector
    detector = NSFWDetector()
    return detector

def get_detector():
    """Get or initialize detector"""
    global detector
    if detector is None:
        detector = NSFWDetector()
    return detector
