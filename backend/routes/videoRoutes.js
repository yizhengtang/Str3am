const express = require('express');
const router = express.Router();
const multer = require('multer');
const videoController = require('../controllers/videoController');

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

// Get a single video by ID
router.get('/:id', videoController.getVideo);

// Get videos by uploader
router.get('/uploader/:walletAddress', videoController.getVideosByUploader);

// Upload a new video
// Use fields to handle multiple files (video and thumbnail)
router.post('/', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), videoController.uploadVideo);

// Update video details
router.put('/:id', videoController.updateVideo);

// Delete video
router.delete('/:id', videoController.deleteVideo);

module.exports = router; 