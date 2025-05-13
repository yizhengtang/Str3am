const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

// Routes that require paid access
// Add a new comment
router.post(
  '/:videoId',
  commentController.hasPaidAccess,
  commentController.addComment
);

// Upvote or downvote a comment
router.post(
  '/vote/:commentId',
  commentController.hasPaidAccess,
  commentController.voteComment
);

// Routes that check permissions internally
// Update a comment (edit)
router.put('/:commentId', commentController.updateComment);

// Delete a comment (soft delete)
router.delete('/:commentId', commentController.deleteComment);

// Routes accessible to anyone
// Get comments for a video
router.get('/video/:videoId', commentController.getVideoComments);

module.exports = router; 