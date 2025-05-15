const express = require('express');
const router = express.Router();
const multer = require('multer');
const videoController = require('../controllers/videoController');
const fs = require('fs');
const path = require('path');
const { uploadToArweave, DEV_UPLOADS_DIR } = require('../config/arweave');

// Configure multer for memory storage (files stored in memory as buffers)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Get all videos with pagination
router.get('/', videoController.getVideos);

// Get videos by uploader
router.get('/uploader/:walletAddress', videoController.getVideosByUploader);

// Get the single most viewed video
router.get('/top', videoController.getTopVideo);

// Get a single video by ID
router.get('/:id', videoController.getVideo);

// Upload a new video
// Use fields to handle multiple files (video and thumbnail)
router.post('/', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), videoController.uploadVideo);

// Test endpoint to diagnose thumbnail uploads
router.post('/test-thumbnail', upload.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No thumbnail file uploaded'
      });
    }
    
    const thumbnailFile = req.file;
    console.log('Test thumbnail upload received:', {
      filename: thumbnailFile.originalname,
      mimetype: thumbnailFile.mimetype,
      size: thumbnailFile.size
    });
    
    // Create a test image if none is provided (for debugging only)
    let thumbnailBuffer = thumbnailFile.buffer;
    if (!thumbnailBuffer || thumbnailBuffer.length === 0) {
      // Create a simple PNG buffer (1x1 red pixel)
      thumbnailBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );
      console.log('Created test image buffer');
    }
    
    // Upload to Arweave (or save locally in development)
    const thumbnailResult = await uploadToArweave(thumbnailBuffer, thumbnailFile.mimetype, [
      { name: 'Content-Type', value: thumbnailFile.mimetype },
      { name: 'App-Name', value: 'STR3AM' },
      { name: 'Type', value: 'test-thumbnail' }
    ]);
    
    if (!thumbnailResult || !thumbnailResult.id) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upload test thumbnail'
      });
    }
    
    // List files in uploads directory
    let uploadedFiles = [];
    try {
      if (fs.existsSync(DEV_UPLOADS_DIR)) {
        uploadedFiles = fs.readdirSync(DEV_UPLOADS_DIR);
      }
    } catch (err) {
      console.error('Error listing upload directory:', err);
    }
    
    res.status(201).json({
      success: true,
      message: 'Test thumbnail uploaded successfully',
      data: {
        id: thumbnailResult.id,
        localPath: thumbnailResult.localPath,
        url: `/api/uploads/${thumbnailResult.id}`,
        uploadedFiles
      }
    });
  } catch (error) {
    console.error('Error in test thumbnail endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
});

// Update video details
router.put('/:id', videoController.updateVideo);

// Delete video
router.delete('/:id', videoController.deleteVideo);

// Record a video view
router.post('/:id/view', videoController.recordView);

module.exports = router; 