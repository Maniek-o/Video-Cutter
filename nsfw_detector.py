#!/usr/bin/env python3
"""
NSFW Detection script - detects nude/adult content in images
"""
import sys
import json
import cv2
import numpy as np
from pathlib import Path

# Try to import tensorflow and nsfw_model
try:
    import tensorflow as tf
    from opennsfw2 import predict_image
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    print(json.dumps({"error": "TensorFlow not available", "nsfw_score": 0}), file=sys.stderr)

def detect_nsfw_basic(image_path):
    """
    Basic NSFW detection using color histogram and skin tone detection
    Falls back when TensorFlow is not available
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return 0.0
        
        # Convert to HSV for better skin tone detection
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Define skin color range in HSV
        # Hue: 0-20 (red), Saturation: 10-40%, Value: 60-100%
        lower_skin = np.array([0, 10, 60], dtype=np.uint8)
        upper_skin = np.array([20, 40, 100], dtype=np.uint8)
        
        # Create mask for skin tones
        mask1 = cv2.inRange(hsv, lower_skin, upper_skin)
        
        # Also check another range
        lower_skin2 = np.array([170, 10, 60], dtype=np.uint8)
        upper_skin2 = np.array([180, 40, 100], dtype=np.uint8)
        mask2 = cv2.inRange(hsv, lower_skin2, upper_skin2)
        
        mask = cv2.bitwise_or(mask1, mask2)
        
        # Calculate percentage of skin-colored pixels
        skin_pixels = cv2.countNonZero(mask)
        total_pixels = img.shape[0] * img.shape[1]
        
        if total_pixels == 0:
            return 0.0
        
        skin_percentage = skin_pixels / total_pixels
        
        # If more than 40% of image is skin-colored, likely NSFW
        nsfw_score = min(1.0, skin_percentage * 2.5) if skin_percentage > 0.2 else skin_percentage
        
        return float(nsfw_score)
    
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return 0.0

def detect_nsfw_tensorflow(image_path):
    """
    NSFW detection using OpenNSFW2 TensorFlow model
    """
    try:
        predictions = predict_image(image_path)
        # predictions is usually [sfw_score, nsfw_score]
        nsfw_score = predictions[1] if len(predictions) > 1 else 0.0
        return float(nsfw_score)
    except Exception as e:
        print(json.dumps({"error": f"TensorFlow detection failed: {str(e)}"}), file=sys.stderr)
        # Fall back to basic detection
        return detect_nsfw_basic(image_path)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not Path(image_path).exists():
        print(json.dumps({"error": f"Image not found: {image_path}"}))
        sys.exit(1)
    
    # Use TensorFlow if available, otherwise fall back
    if TF_AVAILABLE:
        nsfw_score = detect_nsfw_tensorflow(image_path)
    else:
        nsfw_score = detect_nsfw_basic(image_path)
    
    result = {
        "image": image_path,
        "nsfw_score": nsfw_score,
        "is_nsfw": nsfw_score > 0.5,
        "method": "tensorflow" if TF_AVAILABLE else "basic"
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
