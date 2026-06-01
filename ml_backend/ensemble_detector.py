"""
Advanced Ensemble NSFW Detector
Combines multiple deep learning models for robust content classification
- ResNet50 (Pretrained on ImageNet)
- EfficientNet-B3 (Lightweight but accurate)
- Vision Transformer (ViT-Base)

Voting strategy: Soft voting (confidence averaging)
Threshold: 0.35 (ultra sensitivity for subtle nudity)
"""

import os
import json
import numpy as np
from pathlib import Path
from datetime import datetime
import logging

try:
    import torch
    import torch.nn as nn
    from torchvision import transforms
    from torchvision.models import resnet50, efficientnet_b3
    from PIL import Image
    import timm  # For Vision Transformer
except ImportError as e:
    print("[WARNING] Required packages not installed: " + str(e))
    print("Install with: pip install torch torchvision timm pillow")

logger = logging.getLogger(__name__)

class EnsembleNSFWDetector:
    """
    Ensemble of 3 deep learning models for NSFW detection
    - Uses soft voting (average confidence)
    - Ultra sensitivity threshold (0.35) to detect subtle nudity
    - Supports fine-tuning on user feedback
    """

    def __init__(self, model_dir='./models', device='cpu'):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)

        self.device = 'cpu'
        self.confidence_threshold = 0.35  # Ultra sensitivity

        # Initialize models
        self.models = {}
        self.transforms_dict = {}

        logger.info(f"[START] Initializing Ensemble NSFW Detector on {self.device.upper()}")
        self._init_models()

        logger.info("[OK] Ensemble detector ready (ResNet50 + EfficientNet + ViT)")

    def _init_models(self):
        """Initialize all 3 models with appropriate preprocessing"""
        try:
            # 1. ResNet50 - Fast and reliable
            logger.info("[LOAD] Loading ResNet50...")
            self.models['resnet50'] = resnet50(pretrained=True)
            self.models['resnet50'].fc = nn.Linear(2048, 2)  # Binary: NSFW/SFW
            self.models['resnet50'].to(self.device)
            self.models['resnet50'].eval()

            # 2. EfficientNet-B3 - Lightweight, accurate
            logger.info("[LOAD] Loading EfficientNet-B3...")
            self.models['efficientnet'] = efficientnet_b3(pretrained=True)
            self.models['efficientnet'].classifier[1] = nn.Linear(1536, 2)
            self.models['efficientnet'].to(self.device)
            self.models['efficientnet'].eval()

            # 3. Vision Transformer - State-of-the-art
            logger.info("[LOAD] Loading Vision Transformer (ViT-Base)...")
            self.models['vit'] = timm.create_model('vit_base_patch16_224', pretrained=True, num_classes=2)
            self.models['vit'].to(self.device)
            self.models['vit'].eval()

            # Define transforms for each model
            self.transforms_dict['resnet50'] = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                   std=[0.229, 0.224, 0.225])
            ])

            self.transforms_dict['efficientnet'] = transforms.Compose([
                transforms.Resize((384, 384)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                   std=[0.229, 0.224, 0.225])
            ])

            self.transforms_dict['vit'] = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                   std=[0.229, 0.224, 0.225])
            ])

            logger.info("✅ All 3 models loaded successfully")

        except Exception as e:
            logger.error(f"❌ Error initializing models: {e}")
            raise

    def detect_nsfw(self, image_path: str) -> dict:
        """
        Detect NSFW content in image using ensemble voting

        Args:
            image_path: Path to image file

        Returns:
            dict with keys:
            - is_nsfw: bool (True if NSFW)
            - confidence: float (0-1, avg of all models)
            - scores: dict of individual model scores
            - method: str (ensemble)
        """
        try:
            if not os.path.exists(image_path):
                logger.warning(f"Image not found: {image_path}")
                return {
                    'is_nsfw': False,
                    'confidence': 0.0,
                    'scores': {},
                    'method': 'file_not_found',
                    'error': 'Image file not found'
                }

            # Load image
            image = Image.open(image_path).convert('RGB')

            scores = {}
            predictions = []

            # Get predictions from each model
            with torch.no_grad():
                for model_name, model in self.models.items():
                    try:
                        # Preprocess
                        transform = self.transforms_dict[model_name]
                        img_tensor = transform(image).unsqueeze(0).to(self.device)

                        # Predict
                        output = model(img_tensor)
                        probs = torch.nn.functional.softmax(output, dim=1)
                        nsfw_score = probs[0, 1].item()  # Class 1 = NSFW

                        scores[model_name] = nsfw_score
                        predictions.append(nsfw_score)

                        logger.debug(f"  {model_name}: {nsfw_score:.3f}")

                    except Exception as e:
                        logger.error(f"Error in {model_name}: {e}")
                        scores[model_name] = 0.0

            # Soft voting: average confidence
            avg_confidence = np.mean(predictions) if predictions else 0.0
            is_nsfw = avg_confidence >= self.confidence_threshold

            result = {
                'is_nsfw': is_nsfw,
                'confidence': float(avg_confidence),
                'scores': scores,
                'method': 'ensemble_voting',
                'threshold': self.confidence_threshold,
                'models_used': list(self.models.keys())
            }

            logger.info(f"🔍 Ensemble prediction: {avg_confidence:.2%} ({'NSFW' if is_nsfw else 'SFW'})")
            return result

        except Exception as e:
            logger.error(f"❌ Detection error: {e}")
            return {
                'is_nsfw': False,
                'confidence': 0.0,
                'scores': {},
                'method': 'error',
                'error': str(e)
            }

    def batch_detect(self, image_paths: list) -> list:
        """Detect NSFW in multiple images"""
        results = []
        for image_path in image_paths:
            result = self.detect_nsfw(image_path)
            result['image_path'] = image_path
            results.append(result)
        return results

    def fine_tune_on_feedback(self, feedback_data: list, learning_rate=1e-4, epochs=3):
        """
        Fine-tune models on user feedback

        Args:
            feedback_data: List of dicts with 'image_path' and 'is_nsfw' label
            learning_rate: Learning rate for fine-tuning
            epochs: Number of training epochs
        """
        logger.info(f"🎓 Fine-tuning on {len(feedback_data)} feedback samples")

        try:
            criterion = nn.CrossEntropyLoss()

            for model_name, model in self.models.items():
                logger.info(f"  Fine-tuning {model_name}...")
                optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

                for epoch in range(epochs):
                    total_loss = 0

                    for sample in feedback_data:
                        try:
                            image = Image.open(sample['image_path']).convert('RGB')
                            label = 1 if sample['is_nsfw'] else 0

                            transform = self.transforms_dict[model_name]
                            img_tensor = transform(image).unsqueeze(0).to(self.device)
                            label_tensor = torch.tensor([label], dtype=torch.long).to(self.device)

                            # Forward pass
                            output = model(img_tensor)
                            loss = criterion(output, label_tensor)

                            # Backward pass
                            optimizer.zero_grad()
                            loss.backward()
                            optimizer.step()

                            total_loss += loss.item()

                        except Exception as e:
                            logger.warning(f"    Error processing {sample.get('image_path')}: {e}")
                            continue

                    avg_loss = total_loss / len(feedback_data) if feedback_data else 0
                    logger.info(f"    Epoch {epoch+1}/{epochs} - Loss: {avg_loss:.4f}")

            logger.info("✅ Fine-tuning complete")
            return True

        except Exception as e:
            logger.error(f"❌ Fine-tuning error: {e}")
            return False

    def save_models(self, save_dir: str = None):
        """Save all models to disk"""
        save_dir = Path(save_dir or self.model_dir)
        save_dir.mkdir(parents=True, exist_ok=True)

        for model_name, model in self.models.items():
            try:
                model_path = save_dir / f"{model_name}_finetuned.pth"
                torch.save(model.state_dict(), model_path)
                logger.info(f"✅ Saved {model_name} to {model_path}")
            except Exception as e:
                logger.error(f"❌ Error saving {model_name}: {e}")

    def load_models(self, load_dir: str = None):
        """Load fine-tuned models from disk"""
        load_dir = Path(load_dir or self.model_dir)

        for model_name in self.models.keys():
            try:
                model_path = load_dir / f"{model_name}_finetuned.pth"
                if model_path.exists():
                    self.models[model_name].load_state_dict(torch.load(model_path, map_location=self.device))
                    logger.info(f"✅ Loaded fine-tuned {model_name}")
                else:
                    logger.info(f"⚠️ No fine-tuned {model_name} found, using pre-trained")
            except Exception as e:
                logger.error(f"❌ Error loading {model_name}: {e}")


# Singleton instance
_detector_instance = None

def get_detector(model_dir='./models', device='cpu'):
    """Get or create ensemble detector instance"""
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = EnsembleNSFWDetector(model_dir, device)
    return _detector_instance
