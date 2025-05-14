const mongoose = require('mongoose');
const { PublicKey } = require('@solana/web3.js');
const Video = require('../models/Video');
const User = require('../models/User');
const VideoAccess = require('../models/VideoAccess');
require('dotenv').config();

// Function to validate and normalize a Solana address
const normalizeAddress = (address) => {
  try {
    const pubkey = new PublicKey(address);
    return pubkey.toString(); // Returns the canonical base58 encoding
  } catch (error) {
    console.error(`Invalid address: ${address}`, error.message);
    return null; // Return null for invalid addresses
  }
};

const fixWalletAddresses = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Fix User wallet addresses
    const users = await User.find({});
    console.log(`Found ${users.length} users to check`);
    
    for (const user of users) {
      const normalized = normalizeAddress(user.walletAddress);
      if (normalized && normalized !== user.walletAddress) {
        console.log(`Fixing user wallet address: ${user.walletAddress} -> ${normalized}`);
        user.walletAddress = normalized;
        await user.save();
      }
    }

    // Fix Video uploader addresses
    const videos = await Video.find({});
    console.log(`Found ${videos.length} videos to check`);
    
    for (const video of videos) {
      const normalized = normalizeAddress(video.uploader);
      if (normalized && normalized !== video.uploader) {
        console.log(`Fixing video uploader address: ${video.uploader} -> ${normalized}`);
        video.uploader = normalized;
        await video.save();
      }
      
      // Also fix videoPubkey
      const normalizedVideoPubkey = normalizeAddress(video.videoPubkey);
      if (normalizedVideoPubkey && normalizedVideoPubkey !== video.videoPubkey) {
        console.log(`Fixing videoPubkey: ${video.videoPubkey} -> ${normalizedVideoPubkey}`);
        video.videoPubkey = normalizedVideoPubkey;
        await video.save();
      }
    }

    // Fix VideoAccess viewer wallet addresses
    const accesses = await VideoAccess.find({});
    console.log(`Found ${accesses.length} video accesses to check`);
    
    for (const access of accesses) {
      const normalized = normalizeAddress(access.viewerWallet);
      if (normalized && normalized !== access.viewerWallet) {
        console.log(`Fixing access viewer wallet: ${access.viewerWallet} -> ${normalized}`);
        access.viewerWallet = normalized;
        await access.save();
      }
    }

    console.log('Done fixing wallet addresses');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing wallet addresses:', error);
    process.exit(1);
  }
};

fixWalletAddresses(); 