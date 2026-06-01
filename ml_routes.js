/**
 * Express Routes for ML Backend Integration
 * Add these routes to server.js for NSFW feedback handling
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/ml/feedback
 * Submit NSFW detection feedback for model improvement
 */
router.post('/api/ml/feedback', async (req, res) => {
  try {
    const { frameTime, videoName, isNsfwCorrect, modelConfidence, thumbnailBase64 } = req.body;

    // Validate required fields
    if (typeof frameTime !== 'number' || !videoName || typeof isNsfwCorrect !== 'boolean') {
      return res.status(400).json({
        error: 'Missing required fields: frameTime, videoName, isNsfwCorrect'
      });
    }

    if (!global.mlBackendManager || !global.mlBackendManager.isReady) {
      return res.status(503).json({
        error: 'ML Backend not available',
        status: 'not_ready'
      });
    }

    // Submit feedback to ML Backend
    const result = await global.mlBackendManager.submitFeedback(
      frameTime,
      videoName,
      isNsfwCorrect,
      modelConfidence,
      thumbnailBase64
    );

    res.json({
      success: true,
      ...result
    });

  } catch (err) {
    console.error('❌ ML Feedback error:', err);
    res.status(500).json({
      error: 'Feedback submission failed',
      details: err.message
    });
  }
});

/**
 * GET /api/ml/stats
 * Get ML backend statistics and model info
 */
router.get('/api/ml/stats', async (req, res) => {
  try {
    if (!global.mlBackendManager || !global.mlBackendManager.isReady) {
      return res.json({
        error: 'ML Backend not available',
        status: global.mlBackendManager?.getStatus()
      });
    }

    const stats = await global.mlBackendManager.getStats();
    res.json(stats);

  } catch (err) {
    console.error('❌ ML Stats error:', err);
    res.status(500).json({
      error: 'Failed to get ML stats',
      details: err.message
    });
  }
});

/**
 * GET /api/ml/evaluation
 * Get model performance metrics
 */
router.get('/api/ml/evaluation', async (req, res) => {
  try {
    if (!global.mlBackendManager || !global.mlBackendManager.isReady) {
      return res.status(503).json({
        error: 'ML Backend not available'
      });
    }

    const evaluation = await global.mlBackendManager.getEvaluation();
    res.json(evaluation);

  } catch (err) {
    console.error('❌ ML Evaluation error:', err);
    res.status(500).json({
      error: 'Failed to get ML evaluation',
      details: err.message
    });
  }
});

/**
 * POST /api/ml/retrain
 * Manually trigger model retraining
 */
router.post('/api/ml/retrain', async (req, res) => {
  try {
    if (!global.mlBackendManager || !global.mlBackendManager.isReady) {
      return res.status(503).json({
        error: 'ML Backend not available'
      });
    }

    const result = await global.mlBackendManager.triggerRetrain();
    res.json(result);

  } catch (err) {
    console.error('❌ ML Retrain error:', err);
    res.status(500).json({
      error: 'Failed to trigger retraining',
      details: err.message
    });
  }
});

module.exports = router;
