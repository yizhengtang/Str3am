const mongoose = require('mongoose');
const { PublicKey } = require('@solana/web3.js');

// Validate Solana address format
const validateSolanaAddress = {
  validator: function(v) {
    if (!v) return false;
    
    // Accept any string starting with "mock_tx" for test/development environments
    if (v.startsWith && v.startsWith('mock_tx_')) {
      return true;
    }
    
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
  
  // Don't normalize mock values
  if (address.startsWith && address.startsWith('mock_tx_')) {
    return address;
  }
  
  try {
    return new PublicKey(address).toString();
  } catch (error) {
    return address; // Return original if invalid (will fail validation)
  }
}

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
      trim: true,
      validate: validateSolanaAddress,
      set: normalizeAddress
    },
    videoPubkey: {
      type: String, // Solana video account pubkey
      required: true,
      trim: true,
      validate: validateSolanaAddress,
      set: normalizeAddress
    },
    accessPubkey: {
      type: String, // Solana access account pubkey
      required: true,
      trim: true,
      validate: validateSolanaAddress,
      set: normalizeAddress
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