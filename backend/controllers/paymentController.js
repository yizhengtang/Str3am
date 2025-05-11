const { PublicKey } = require('@solana/web3.js');
const { program } = require('../config/anchor');
const Video = require('../models/Video');
const User = require('../models/User');
const VideoAccess = require('../models/VideoAccess');

// Verify access to video
exports.verifyAccess = async (req, res) => {
  try {
    const { videoId, walletAddress } = req.params;
    
    // Check if video exists
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    // Check if user has access
    const access = await VideoAccess.findOne({
      videoId,
      viewerWallet: walletAddress
    });
    
    if (!access) {
      return res.status(403).json({
        success: false,
        error: 'Access not granted',
        needsPayment: true,
        price: video.price
      });
    }
    
    res.status(200).json({
      success: true,
      hasAccess: true,
      accessData: access
    });
  } catch (error) {
    console.error('Error verifying access:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Record payment and grant access
exports.recordPayment = async (req, res) => {
  try {
    const {
      videoId,
      viewerWallet,
      tokensPaid,
      transactionSignature,
      videoPubkey,
      accessPubkey
    } = req.body;
    
    // Check if video exists
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    // Check if already has access
    const existingAccess = await VideoAccess.findOne({
      videoId,
      viewerWallet
    });
    
    if (existingAccess) {
      return res.status(400).json({
        success: false,
        error: 'Already has access',
        accessData: existingAccess
      });
    }
    
    // Create access record
    const access = await VideoAccess.create({
      videoId,
      viewerWallet,
      tokensPaid,
      transactionSignature,
      videoPubkey,
      accessPubkey
    });
    
    // Update user stats
    await User.findOneAndUpdate(
      { walletAddress: viewerWallet },
      {
        $inc: {
          videosWatched: 1,
          tokensSpent: tokensPaid
        }
      },
      { upsert: true }
    );
    
    // Update creator stats
    await User.findOneAndUpdate(
      { walletAddress: video.uploader },
      { $inc: { tokensEarned: tokensPaid } }
    );
    
    res.status(201).json({
      success: true,
      data: access
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get payment info needed for pay to watch transaction
exports.getPaymentInfo = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    // In a real app, you would fetch the actual platform fee from the blockchain
    const platformFeePercent = 10;
    
    const paymentInfo = {
      videoPubkey: video.videoPubkey,
      price: video.price,
      uploader: video.uploader,
      platformFeePercent
    };
    
    res.status(200).json({
      success: true,
      data: paymentInfo
    });
  } catch (error) {
    console.error('Error getting payment info:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Update watch time
exports.updateWatchTime = async (req, res) => {
  try {
    const { accessId } = req.params;
    const { watchTime, completed } = req.body;
    
    const access = await VideoAccess.findById(accessId);
    
    if (!access) {
      return res.status(404).json({
        success: false,
        error: 'Access record not found'
      });
    }
    
    // Update watch time
    if (watchTime !== undefined) {
      access.watchTime = watchTime;
    }
    
    // Mark as completed if needed
    if (completed !== undefined) {
      access.completed = completed;
    }
    
    await access.save();
    
    res.status(200).json({
      success: true,
      data: access
    });
  } catch (error) {
    console.error('Error updating watch time:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 