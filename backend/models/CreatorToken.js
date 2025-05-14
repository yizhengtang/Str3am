const mongoose = require('mongoose');
const { PublicKey } = require('@solana/web3.js');

// Validator to ensure valid Solana addresses
const validateSolanaAddress = {
  validator: function(v) {
    if (!v) return false;
    try {
      new PublicKey(v);
      return true;
    } catch (error) {
      return false;
    }
  },
  message: props => `${props.value} is not a valid Solana address!`
};

// Normalize to canonical PublicKey string
function normalizeAddress(address) {
  try {
    return new PublicKey(address).toString();
  } catch (error) {
    return address;
  }
}

const CreatorTokenSchema = new mongoose.Schema(
  {
    creator: {
      type: String,
      required: true,
      unique: true,
      validate: validateSolanaAddress,
      set: normalizeAddress
    },
    mint: {
      type: String,
      required: true,
      validate: validateSolanaAddress,
      set: normalizeAddress
    },
    creatorToken: {
      type: String,
      required: true,
      validate: validateSolanaAddress,
      set: normalizeAddress
    },
    mintBump: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CreatorToken', CreatorTokenSchema); 