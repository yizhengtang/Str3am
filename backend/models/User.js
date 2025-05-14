const mongoose = require('mongoose');
const { PublicKey } = require('@solana/web3.js');

// Validate Solana address format
const validateSolanaAddress = {
  validator: function(v) {
    if (!v) return false;
    try {
      // This will throw if the address is invalid
      new PublicKey(v);
      return true;
    } catch (error) {
      return false;
    }
  },
  message: props => `${props.value} is not a valid Solana address!`
};

// Normalize address to canonical format before saving
function normalizeAddress(address) {
  if (!address) return address;
  try {
    return new PublicKey(address).toString();
  } catch (error) {
    return address; // Return original if invalid (will fail validation)
  }
}

const UserSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: validateSolanaAddress,
      set: normalizeAddress
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