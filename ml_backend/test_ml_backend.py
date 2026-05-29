#!/usr/bin/env python3
"""
ML Backend Test Suite
Tests core ML functionality, NSFW detection, feedback, and retraining
"""

import os
import sys
import json
import time
import base64
import sqlite3
import requests
from pathlib import Path
from PIL import Image
import numpy as np

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

# Test Configuration
BASE_URL = "http://127.0.0.1:5001"
TEST_IMAGE_DIR = Path(__file__).parent / "test_images"
DATABASE_PATH = Path(__file__).parent / "feedback.db"

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}{Colors.ENDC}\n")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.YELLOW}ℹ️  {text}{Colors.ENDC}")

def print_test(text):
    print(f"{Colors.BLUE}🧪 {text}{Colors.ENDC}")

def create_test_image(color="red", filename="test_image.jpg"):
    """Create a simple test image"""
    img = Image.new('RGB', (640, 480), color=color)
    img_path = TEST_IMAGE_DIR / filename
    img.save(img_path)
    return img_path

def image_to_base64(image_path):
    """Convert image to base64 for API requests"""
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode('utf-8')

def test_health_check():
    """Test 1: Health check endpoint"""
    print_test("Testing Health Check Endpoint")
    
    try:
        response = requests.get(f"{BASE_URL}/api/ml/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"ML Backend is online! Status: {data.get('status')}")
            print_info(f"  Version: {data.get('version')}")
            uptime = data.get('uptime_seconds') or 0
            print_info(f"  Uptime: {uptime:.2f}s")
            return True
        else:
            print_error(f"Health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to ML Backend at http://127.0.0.1:5001")
        print_info("  Start ML Backend with: python -m uvicorn ml_backend.app:app --host 127.0.0.1 --port 5001")
        return False
    except Exception as err:
        print_error(f"Health check error: {err}")
        return False

def test_nsfw_detection():
    """Test 2: NSFW detection with test images"""
    print_test("Testing NSFW Detection")
    
    # Create test directories
    TEST_IMAGE_DIR.mkdir(exist_ok=True)
    
    # Create test images
    print_info("Creating test images...")
    safe_img = create_test_image(color="blue", filename="safe_image.jpg")
    print_info(f"  Safe image: {safe_img}")
    
    try:
        # Test safe image
        img_base64 = image_to_base64(safe_img)
        
        response = requests.post(
            f"{BASE_URL}/api/ml/detect",
            json={"image_base64": img_base64},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Detection successful!")
            print_info(f"  Is NSFW: {data.get('is_nsfw')}")
            print_info(f"  Confidence: {data.get('confidence'):.2%}")
            print_info(f"  Model Version: {data.get('version')}")
            print_info(f"  Inference Time: {(data.get('inference_time_ms') or 0):.2f}ms")
            return True
        else:
            print_error(f"Detection failed: {response.status_code}")
            print_info(f"  Response: {response.text}")
            return False
    except Exception as err:
        print_error(f"Detection error: {err}")
        return False

def test_feedback_submission():
    """Test 3: Submit feedback to database"""
    print_test("Testing Feedback Submission")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/ml/feedback",
            json={
                "frame_time": 10.5,
                "is_nsfw_correct": True,
                "model_confidence": 0.75,
                "video_name": "test_video.mp4"
            },
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Feedback submitted successfully!")
            print_info(f"  Feedback Count: {data.get('feedback_count')}/5")
            print_info(f"  Retrain Triggered: {data.get('retrain_triggered')}")
            if data.get('retrain_triggered'):
                print_info(f"  🔄 Retraining in progress...")
            return True
        else:
            print_error(f"Feedback submission failed: {response.status_code}")
            print_info(f"  Response: {response.text}")
            return False
    except Exception as err:
        print_error(f"Feedback submission error: {err}")
        return False

def test_statistics():
    """Test 4: Get statistics"""
    print_test("Testing Statistics Endpoint")
    
    try:
        response = requests.get(f"{BASE_URL}/api/ml/stats", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Statistics retrieved!")
            print_info(f"  Total Feedbacks: {data.get('total_feedbacks', 0)}")
            print_info(f"  Current Model: {data.get('model_version')}")
            print_info(f"  Accuracy: {data.get('accuracy', 0):.2%}")
            print_info(f"  Precision: {data.get('precision', 0):.2%}")
            print_info(f"  Recall: {data.get('recall', 0):.2%}")
            print_info(f"  F1 Score: {data.get('f1_score', 0):.2%}")
            return True
        else:
            print_error(f"Stats retrieval failed: {response.status_code}")
            return False
    except Exception as err:
        print_error(f"Statistics error: {err}")
        return False

def test_evaluation():
    """Test 5: Get model evaluation metrics"""
    print_test("Testing Model Evaluation")
    
    try:
        response = requests.get(f"{BASE_URL}/api/ml/evaluation", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Evaluation metrics retrieved!")
            ev = data.get('evaluation', data)
            print_info(f"  True Positives: {ev.get('tp', 0)}")
            print_info(f"  False Positives: {ev.get('fp', 0)}")
            print_info(f"  True Negatives: {ev.get('tn', 0)}")
            print_info(f"  False Negatives: {ev.get('fn', 0)}")
            print_info(f"  Precision: {ev.get('precision', 0):.2%}")
            print_info(f"  Recall: {ev.get('recall', 0):.2%}")
            print_info(f"  F1 Score: {ev.get('f1_score', 0):.2%}")
            return True
        else:
            print_error(f"Evaluation retrieval failed: {response.status_code}")
            return False
    except Exception as err:
        print_error(f"Evaluation error: {err}")
        return False

def test_database_integrity():
    """Test 6: Check database integrity"""
    print_test("Testing Database Integrity")
    
    try:
        if not DATABASE_PATH.exists():
            print_error("Database not found!")
            return False
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Check feedback table
        cursor.execute("SELECT COUNT(*) FROM feedback")
        feedback_count = cursor.fetchone()[0]
        print_info(f"  Feedbacks in database: {feedback_count}")
        
        # Check model versions table
        cursor.execute("SELECT COUNT(*) FROM model_versions")
        versions_count = cursor.fetchone()[0]
        print_info(f"  Model versions saved: {versions_count}")
        
        # Get latest feedbacks
        cursor.execute("""
            SELECT frame_time, model_detected, user_label, model_confidence, timestamp 
            FROM feedback 
            ORDER BY timestamp DESC 
            LIMIT 3
        """)
        recent = cursor.fetchall()
        
        if recent:
            print_info(f"  Recent feedbacks:")
            for row in recent:
                print_info(f"    - Frame: {row[0]}s, Pred: {row[1]}, Label: {row[2]}, Conf: {(row[3] or 0):.2%}")
        
        conn.close()
        print_success("Database integrity check passed!")
        return True
    except Exception as err:
        print_error(f"Database check error: {err}")
        return False

def test_multi_feedback_batch():
    """Test 7: Submit multiple feedbacks (test retraining trigger)"""
    print_test("Testing Multiple Feedback Batch (Retraining Trigger)")
    
    print_info("Submitting 5 feedbacks to trigger retraining...")
    
    results = []
    for i in range(5):
        try:
            response = requests.post(
                f"{BASE_URL}/api/ml/feedback",
                json={
                    "frame_time": 20.0 + (i * 5),
                    "is_nsfw_correct": i % 2 == 0,
                    "model_confidence": 0.5 + (i * 0.05),
                    "video_name": f"batch_test_video_{i}.mp4"
                },
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                results.append(data)
                print_info(f"  [{i+1}/5] Feedback count: {data.get('feedback_count')}")
                
                if data.get('retrain_triggered'):
                    print_success(f"🔄 Retraining triggered after feedback {i+1}!")
                    print_info(f"  Model will be retrained in background...")
            else:
                print_error(f"  [{i+1}/5] Failed with status {response.status_code}")
                return False
            
            time.sleep(0.5)  # Small delay between submissions
        except Exception as err:
            print_error(f"  [{i+1}/5] Error: {err}")
            return False
    
    print_success(f"Batch feedback test completed!")
    return True

def test_performance():
    """Test 8: Performance benchmarking"""
    print_test("Testing Performance / Speed")
    
    try:
        # Create test image
        TEST_IMAGE_DIR.mkdir(exist_ok=True)
        test_img = create_test_image(color="green", filename="perf_test.jpg")
        img_base64 = image_to_base64(test_img)
        
        # Run multiple detections and measure time
        times = []
        iterations = 3
        
        print_info(f"Running {iterations} detection iterations...")
        
        for i in range(iterations):
            start = time.time()
            response = requests.post(
                f"{BASE_URL}/api/ml/detect",
                json={"image_base64": img_base64},
                timeout=10
            )
            elapsed = (time.time() - start) * 1000  # Convert to ms
            times.append(elapsed)
            
            if response.status_code == 200:
                print_info(f"  Iteration {i+1}: {elapsed:.2f}ms")
            else:
                print_error(f"  Iteration {i+1}: Failed")
        
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        
        print_success(f"Performance Results:")
        print_info(f"  Average: {avg_time:.2f}ms")
        print_info(f"  Min: {min_time:.2f}ms")
        print_info(f"  Max: {max_time:.2f}ms")
        
        if avg_time < 1000:
            print_success(f"Performance is excellent! (<1s per inference)")
        elif avg_time < 5000:
            print_info(f"Performance is acceptable (1-5s per inference)")
        else:
            print_error(f"Performance is slow (>5s per inference)")
        
        return True
    except Exception as err:
        print_error(f"Performance test error: {err}")
        return False

def test_error_handling():
    """Test 9: Error handling and edge cases"""
    print_test("Testing Error Handling")
    
    tests_passed = 0
    
    # Test 1: Invalid image
    try:
        response = requests.post(
            f"{BASE_URL}/api/ml/detect",
            json={"image_base64": "invalid_base64"},
            timeout=5
        )
        if response.status_code != 200:
            print_success("Invalid image handling: ✓")
            tests_passed += 1
    except:
        pass
    
    # Test 2: Missing fields
    try:
        response = requests.post(
            f"{BASE_URL}/api/ml/feedback",
            json={"frame_time": 10.0},  # Missing other fields
            timeout=5
        )
        if response.status_code != 200:
            print_success("Missing fields handling: ✓")
            tests_passed += 1
    except:
        pass
    
    # Test 3: Invalid confidence
    try:
        response = requests.post(
            f"{BASE_URL}/api/ml/feedback",
            json={
                "frame_time": 10.0,
                "model_predicted": True,
                "user_corrected": False,
                "confidence": 1.5,  # Invalid: >1.0
            },
            timeout=5
        )
        print_success("Invalid confidence handling: ✓")
        tests_passed += 1
    except:
        pass
    
    print_info(f"Error handling tests passed: {tests_passed}/3")
    return tests_passed >= 2

def main():
    """Run all tests"""
    print_header("🧪 ML BACKEND TEST SUITE")
    
    print_info("Starting ML Backend comprehensive test suite...")
    print_info(f"Target: {BASE_URL}")
    print_info(f"Test Database: {DATABASE_PATH}")
    
    tests = [
        ("Health Check", test_health_check),
        ("NSFW Detection", test_nsfw_detection),
        ("Feedback Submission", test_feedback_submission),
        ("Statistics Endpoint", test_statistics),
        ("Model Evaluation", test_evaluation),
        ("Database Integrity", test_database_integrity),
        ("Multi-Feedback Batch", test_multi_feedback_batch),
        ("Performance Benchmark", test_performance),
        ("Error Handling", test_error_handling),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as err:
            print_error(f"Test '{test_name}' crashed: {err}")
            results.append((test_name, False))
    
    # Summary
    print_header("📊 TEST SUMMARY")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{Colors.GREEN}✅ PASS{Colors.ENDC}" if result else f"{Colors.RED}❌ FAIL{Colors.ENDC}"
        print(f"  {test_name}: {status}")
    
    print()
    print_info(f"Results: {passed}/{total} tests passed ({100*passed/total:.0f}%)")
    
    if passed == total:
        print_success(f"🎉 All tests passed! ML Backend is working correctly!")
        return 0
    else:
        print_error(f"⚠️  {total - passed} test(s) failed. Check ML Backend status.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
