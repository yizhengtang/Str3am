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