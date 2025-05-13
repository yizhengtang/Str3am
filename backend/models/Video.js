const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    cid: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    thumbnailCid: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    viewCount: {
      type: Number,
      default: 0
    },
    // Social engagement metrics
    likeCount: {
      type: Number,
      default: 0
    },
    dislikeCount: {
      type: Number,
      default: 0
    },
    commentCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    // For automatic takedown feature
    dislikeRatio: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    // Configurable threshold for auto-takedown (0.8 means 80% dislike ratio triggers takedown)
    dislikeThreshold: {
      type: Number,
      default: 0.8,
      min: 0,
      max: 1
    },
    // Minimum number of interactions (likes+dislikes) before ratio is considered
    minimumInteractions: {
      type: Number,
      default: 100
    },
    uploader: {
      type: String, // Solana wallet address
      required: true,
      trim: true
    },
    videoPubkey: {
      type: String, // Solana video account pubkey
      required: true,
      trim: true
    },
    duration: {
      type: Number,
      default: 0
    },
    tags: [String],
    isActive: {
      type: Boolean,
      default: true
    },
    // Track reason for takedown, if any
    takedownReason: {
      type: String,
      enum: ['dislike_ratio', 'admin_action', 'uploader_removed', null],
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for faster searches
VideoSchema.index({ title: 'text', description: 'text' });
VideoSchema.index({ uploader: 1 });
VideoSchema.index({ category: 1 });
VideoSchema.index({ isActive: 1 });

module.exports = mongoose.model('Video', VideoSchema); 