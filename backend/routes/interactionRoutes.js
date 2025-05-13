const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');

// Routes that require paid access
// Add or update an interaction (like, dislike, share)
router.post(
  '/:videoId',
  interactionController.hasPaidAccess,
  interactionController.addInteraction
);

// Routes accessible to anyone
// Get all interactions for a video
router.get('/video/:videoId', interactionController.getVideoInteractions);

// Get interaction stats for a video
router.get('/stats/:videoId', interactionController.getInteractionStats);

// Get current user's interactions for a video
router.get('/user/:videoId', interactionController.getUserInteraction);

// Creators can no longer control the threshold

module.exports = router; 