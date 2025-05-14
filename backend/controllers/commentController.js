const Comment = require('../models/Comment');
const Video = require('../models/Video');
const User = require('../models/User');
const VideoAccess = require('../models/VideoAccess');

// Middleware to check if user has paid for the video before commenting
const hasPaidAccess = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { userWallet } = req.body;
    
    if (!videoId || !userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Video ID and user wallet address are required'
      });
    }
    
    // First check if user is the video uploader
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    // If user is the uploader, grant access automatically
    if (video.uploader === userWallet) {
      return next();
    }
    
    // Check if the user has paid for the video
    const access = await VideoAccess.findOne({
      videoId,
      viewerWallet: userWallet
    });
    
    if (!access) {
      return res.status(403).json({
        success: false,
        error: 'You must pay to access this video before commenting'
      });
    }
    
    // Continue to the next middleware or controller
    next();
  } catch (error) {
    console.error('Error checking video access:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Create a new comment
const addComment = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { userWallet, content, parentId } = req.body;
    
    // Validate comment content
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }
    
    // Find the video
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    if (!video.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot comment on an inactive video'
      });
    }
    
    // Check if parent comment exists (for replies)
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          error: 'Parent comment not found'
        });
      }
      
      if (parentComment.videoId.toString() !== videoId) {
        return res.status(400).json({
          success: false,
          error: 'Parent comment does not belong to this video'
        });
      }
    }
    
    // Get user info for the comment
    const user = await User.findOne({ walletAddress: userWallet });
    const userName = user ? user.username : userWallet.substring(0, 6) + '...' + userWallet.substring(userWallet.length - 4);
    
    // Create the comment
    const comment = await Comment.create({
      videoId,
      userWallet,
      userName,
      content,
      parentId: parentId || null
    });
    
    // Increment comment count on video
    video.commentCount += 1;
    await video.save();
    
    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get comments for a video
const getVideoComments = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { parentId, page = 1, limit = 20 } = req.query;
    
    // Build query
    const query = { videoId, isActive: true };
    if (parentId === 'null' || parentId === undefined) {
      // Get top-level comments
      query.parentId = null;
    } else if (parentId) {
      // Get replies to a specific comment
      query.parentId = parentId;
    }
    
    // Count total comments matching the query
    const totalComments = await Comment.countDocuments(query);
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get comments with pagination
    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      count: comments.length,
      pagination: {
        total: totalComments,
        page: parseInt(page),
        pages: Math.ceil(totalComments / parseInt(limit))
      },
      data: comments
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Update a comment (edit)
const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userWallet, content } = req.body;
    
    // Find the comment
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }
    
    // Check if user is the comment owner
    if (comment.userWallet !== userWallet) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own comments'
      });
    }
    
    // Update the comment
    comment.content = content;
    await comment.save();
    
    res.status(200).json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Delete a comment (soft delete)
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userWallet } = req.body;
    
    // Find the comment
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }
    
    // Find the video
    const video = await Video.findById(comment.videoId);
    
    // Check if user is the comment owner or video uploader (both can delete comments)
    if (comment.userWallet !== userWallet && video.uploader !== userWallet) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own comments or comments on your videos'
      });
    }
    
    // Soft delete the comment
    comment.isActive = false;
    await comment.save();
    
    // Decrement comment count on video
    video.commentCount = Math.max(0, video.commentCount - 1);
    await video.save();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Upvote or downvote a comment
const voteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userWallet, voteType } = req.body;
    
    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({
        success: false,
        error: 'Vote type must be either upvote or downvote'
      });
    }
    
    // Find the comment
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }
    
    if (!comment.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot vote on an inactive comment'
      });
    }
    
    // TODO: In a more complete implementation, you would track which users
    // have voted on each comment to prevent duplicate votes. For simplicity,
    // we're just incrementing/decrementing the counts here.
    
    if (voteType === 'upvote') {
      comment.upvotes += 1;
    } else {
      comment.downvotes += 1;
    }
    
    await comment.save();
    
    res.status(200).json({
      success: true,
      data: {
        upvotes: comment.upvotes,
        downvotes: comment.downvotes
      }
    });
  } catch (error) {
    console.error('Error voting on comment:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

module.exports = {
  hasPaidAccess,
  addComment,
  getVideoComments,
  updateComment,
  deleteComment,
  voteComment
}; 