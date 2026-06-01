/**
 * ML Backend Manager
 * - Starts/stops Python ML FastAPI server
 * - Manages communication between Express and ML service
 * - Handles model versioning and retraining
 */

const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

class MLBackendManager {
  constructor() {
    this.mlProcess = null;
    this.mlPort = process.env.ML_BACKEND_PORT || '5003';
    this.mlApiUrl = process.env.ML_BACKEND_URL || `http://127.0.0.1:${this.mlPort}`;
    this.maxRetries = 10;
    this.retryDelay = 2000;
    this.isReady = false;
  }

  /**
   * Start ML Backend Server
   */
  async start() {
    console.log('🚀 Starting ML Backend...');

    return new Promise((resolve, reject) => {
      try {
        const mlBackendPath = path.join(__dirname, 'ml_backend');
        const pythonExe = path.join(mlBackendPath, 'venv', 'Scripts', 'python.exe');
        
        // Check if Python executable exists
        if (!fs.existsSync(pythonExe)) {
          console.error(`⚠️ Python not found at ${pythonExe}`);
          reject(new Error(`Python executable not found at ${pythonExe}`));
          return;
        }
        
        console.log(`[ML-Backend] Using Python: ${pythonExe}`);
        
        // Use python from venv to run FastAPI app
        this.mlProcess = spawn(pythonExe, [
          '-m', 'uvicorn',
          'app:app',
          '--host', '127.0.0.1',
          '--port', this.mlPort
        ], {
          cwd: mlBackendPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // Log output
        this.mlProcess.stdout.on('data', (data) => {
          console.log(`[ML-Backend] ${data.toString().trim()}`);
        });

        this.mlProcess.stderr.on('data', (data) => {
          console.warn(`[ML-Backend ERROR] ${data.toString().trim()}`);
        });

        this.mlProcess.on('error', (err) => {
          console.error('❌ ML Backend process error:', err);
          reject(err);
        });

        // Wait for server to be ready
        this.waitForServer().then(() => {
          this.isReady = true;
          console.log('✅ ML Backend ready!');
          resolve();
        }).catch(reject);

      } catch (err) {
        console.error('❌ Error starting ML Backend:', err);
        reject(err);
      }
    });
  }

  /**
   * Wait for ML Backend server to be ready
   */
  async waitForServer() {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        const response = await axios.get(`${this.mlApiUrl}/api/ml/health`, {
          timeout: 5000
        });
        if (response.data.status === 'ok') {
          return response.data;
        }
      } catch (err) {
        console.log(`⏳ Waiting for ML Backend... (attempt ${i + 1}/${this.maxRetries})`);
        await new Promise(r => setTimeout(r, this.retryDelay));
      }
    }
    throw new Error('ML Backend failed to start');
  }

  /**
   * Stop ML Backend Server
   */
  async stop() {
    if (this.mlProcess) {
      console.log('🛑 Stopping ML Backend...');
      this.mlProcess.kill();
      this.isReady = false;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  /**
   * Detect NSFW in image (with base64)
   */
  async detectNSFW(imageBase64, frameTime, videoName) {
    if (!this.isReady) {
      throw new Error('ML Backend not ready');
    }

    try {
      const response = await axios.post(`${this.mlApiUrl}/api/ml/detect`, {
        image_base64: imageBase64,
        frame_time: frameTime,
        video_name: videoName
      });

      return response.data;
    } catch (err) {
      console.error('❌ NSFW detection error:', err.message);
      throw err;
    }
  }

  /**
   * Submit user feedback for model improvement
   */
  async submitFeedback(frameTime, videoName, isNsfwCorrect, modelConfidence, thumbnailBase64) {
    if (!this.isReady) {
      throw new Error('ML Backend not ready');
    }

    try {
      const response = await axios.post(`${this.mlApiUrl}/api/ml/feedback`, {
        frame_time: frameTime,
        video_name: videoName,
        is_nsfw_correct: isNsfwCorrect,
        model_confidence: modelConfidence,
        thumbnail_base64: thumbnailBase64
      });

      return response.data;
    } catch (err) {
      console.error('❌ Feedback submission error:', err.message);
      throw err;
    }
  }

  /**
   * Get ML Backend statistics
   */
  async getStats() {
    if (!this.isReady) {
      return { status: 'not_ready' };
    }

    try {
      const response = await axios.get(`${this.mlApiUrl}/api/ml/stats`);
      return response.data;
    } catch (err) {
      console.error('❌ Error fetching stats:', err.message);
      return { error: err.message };
    }
  }

  /**
   * Get model evaluation metrics
   */
  async getEvaluation() {
    if (!this.isReady) {
      throw new Error('ML Backend not ready');
    }

    try {
      const response = await axios.get(`${this.mlApiUrl}/api/ml/evaluation`);
      return response.data;
    } catch (err) {
      console.error('❌ Error fetching evaluation:', err.message);
      throw err;
    }
  }

  /**
   * Manually trigger retraining
   */
  async triggerRetrain() {
    if (!this.isReady) {
      throw new Error('ML Backend not ready');
    }

    try {
      const response = await axios.post(`${this.mlApiUrl}/api/ml/retrain`);
      return response.data;
    } catch (err) {
      console.error('❌ Error triggering retrain:', err.message);
      throw err;
    }
  }

  /**
   * Check if ML Backend is ready
   */
  getStatus() {
    return {
      isReady: this.isReady,
      apiUrl: this.mlApiUrl,
      processRunning: this.mlProcess !== null
    };
  }
}

// Export singleton
module.exports = MLBackendManager;
