const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true
    },
    userWallet: {
      type: String,
      required: true,
      trim: true
    },
    userName: {
      type: String,
      trim: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    // For nested comments/replies
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    // For moderation purposes
    isActive: {
      type: Boolean,
      default: true
    },
    // Allow upvoting/downvoting comments
    upvotes: {
      type: Number,
      default: 0
    },
    downvotes: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for faster queries
CommentSchema.index({ videoId: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1 });
CommentSchema.index({ userWallet: 1 });

module.exports = mongoose.model('Comment', CommentSchema); 