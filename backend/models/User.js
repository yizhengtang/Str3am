const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    username: {
      type: String,
      trim: true
    },
    profilePicture: {
      type: String, // Transaction ID for Arweave
      trim: true
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500
    },
    videosUploaded: {
      type: Number,
      default: 0
    },
    videosWatched: {
      type: Number,
      default: 0
    },
    tokensSpent: {
      type: Number,
      default: 0
    },
    tokensEarned: {
      type: Number,
      default: 0
    },
    tokensRefunded: {
      type: Number,
      default: 0
    },
    socialLinks: {
      twitter: String,
      instagram: String,
      website: String
    },
    isCreator: {
      type: Boolean,
      default: false
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index for faster user lookups
UserSchema.index({ walletAddress: 1 });
UserSchema.index({ username: 1 });

module.exports = mongoose.model('User', UserSchema); 