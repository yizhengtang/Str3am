const mongoose = require('mongoose');

const VideoAccessSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true
    },
    viewerWallet: {
      type: String,
      required: true,
      trim: true
    },
    videoPubkey: {
      type: String, // Solana video account pubkey
      required: true,
      trim: true
    },
    accessPubkey: {
      type: String, // Solana access account pubkey
      required: true,
      trim: true
    },
    tokensPaid: {
      type: Number,
      required: true,
      min: 0
    },
    transactionSignature: {
      type: String,
      required: true,
      trim: true
    },
    watchTime: {
      type: Number, // In seconds
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Create a compound unique index to prevent duplicate access records
VideoAccessSchema.index({ videoId: 1, viewerWallet: 1 }, { unique: true });
VideoAccessSchema.index({ videoId: 1 });
VideoAccessSchema.index({ viewerWallet: 1 });

module.exports = mongoose.model('VideoAccess', VideoAccessSchema); 