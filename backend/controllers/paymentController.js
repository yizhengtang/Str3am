const { PublicKey } = require('@solana/web3.js');
const { program } = require('../config/anchor');
const Video = require('../models/Video');
const User = require('../models/User');
const VideoAccess = require('../models/VideoAccess');

// Verify access to video
exports.verifyAccess = async (req, res) => {
  const { videoId, walletAddress } = req.params;
  try {
    // Check if video exists
    const video = await Video.findById(videoId);
    
    if (!video) {
      console.error(`Error verifying access: Video not found with ID: ${videoId} for wallet: ${walletAddress}`);
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    // Check if the user is the uploader of the video
    if (video.uploader === walletAddress) {
      // If user is the uploader, grant automatic access
      console.info(`Access granted to uploader: ${walletAddress} for their own video: ${videoId}`);
      return res.status(200).json({
        success: true,
        hasAccess: true,
        accessData: {
          videoId: video._id,
          viewerWallet: walletAddress,
          isUploader: true
        }
      });
    }
    
    // Check if user has access
    const access = await VideoAccess.findOne({
      videoId,
      viewerWallet: walletAddress
    });
    
    if (!access) {
      // This is not necessarily an error, but a state indicating payment is needed.
      // Logging it might be verbose, but can be useful for tracking access attempts.
      console.info(`Access check: No access record found for videoId ${videoId}, walletAddress ${walletAddress}. Payment needed.`);
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
    console.error(`Error verifying access for videoId ${videoId}, walletAddress ${walletAddress}:`, error);
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred while verifying access.'
    });
  }
};

// Record payment and grant access
exports.recordPayment = async (req, res) => {
  const { videoId, viewerWallet, tokensPaid, transactionSignature, videoPubkey, accessPubkey } = req.body;
  try {
    // Check if video exists
    const video = await Video.findById(videoId);
    
    if (!video) {
      console.error(`Error recording payment: Video not found with ID: ${videoId}`);
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
      console.warn(`Attempt to record payment for already existing access: videoId ${videoId}, viewerWallet ${viewerWallet}`);
      return res.status(400).json({
        success: false,
        error: 'User already has access to this video',
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
    // Consider adding specific try-catch blocks for these if they are prone to errors
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
    console.error(`Error recording payment for videoId ${videoId}, viewerWallet ${viewerWallet}:`, error);
    // Check for specific Mongoose errors if applicable, e.g., validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data provided for payment record.',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred while recording payment.'
    });
  }
};

// Get payment info needed for pay to watch transaction
exports.getPaymentInfo = async (req, res) => {
  const { videoId } = req.params;
  try {
    const video = await Video.findById(videoId);
    
    if (!video) {
      console.error(`Error getting payment info: Video not found with ID: ${videoId}`);
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    // In a real app, you would fetch the actual platform fee from the blockchain
    const platformFeePercent = 10; // Placeholder
    
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
    console.error(`Error getting payment info for videoId ${videoId}:`, error);
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred while fetching payment information.'
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