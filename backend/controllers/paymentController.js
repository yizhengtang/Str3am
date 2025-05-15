const { PublicKey } = require('@solana/web3.js');
const { program, provider, BN } = require('../config/anchor');
const CreatorToken = require('../models/CreatorToken');
const { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
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

    // Reward channel tokens if threshold reached
    (async () => {
      try {
        // Fetch video to identify creator
        const video = await Video.findById(access.videoId);
        if (!video) return;

        // Get creator token entry for this channel
        const ct = await CreatorToken.findOne({ creator: video.uploader });
        if (!ct) return;

        const creatorPubkey = new PublicKey(video.uploader);
        const mintPubkey = new PublicKey(ct.mint);
        const creatorTokenPda = new PublicKey(ct.creatorToken);

        // Compute mint authority PDA
        const [mintAuthorityPda] = await PublicKey.findProgramAddress(
          [Buffer.from('mint_authority'), creatorPubkey.toBuffer()],
          program.programId
        );

        // Compute total watch time across all videos by this creator
        const videos = await Video.find({ uploader: video.uploader }).select('_id').lean();
        const videoIds = videos.map(v => v._id);
        const agg = await VideoAccess.aggregate([
          { $match: { viewerWallet: access.viewerWallet, videoId: { $in: videoIds } } },
          { $group: { _id: null, totalWatch: { $sum: '$watchTime' } } }
        ]);
        const totalWatch = agg[0]?.totalWatch || 0;

        const THRESHOLD = 30; // seconds per token

        // Determine current on-chain token balance
        const viewerPubkey = new PublicKey(access.viewerWallet);
        const ataAddress = await getAssociatedTokenAddress(mintPubkey, viewerPubkey);
        let currentBalance = 0;
        try {
          const accountInfo = await getAccount(provider.connection, ataAddress);
          currentBalance = Number(accountInfo.amount);
        } catch {
          currentBalance = 0;
        }

        // Calculate how many tokens to mint
        const totalTokensShouldBe = Math.floor(totalWatch / THRESHOLD);
        const tokensToMint = totalTokensShouldBe - currentBalance;
        if (tokensToMint > 0) {
          await program.methods
            .rewardDuringWatch(new BN(tokensToMint))
            .accounts({
              creator: creatorPubkey,
              creatorMint: mintPubkey,
              viewerTokenAccount: ataAddress,
              mintAuthority: mintAuthorityPda,
              creatorToken: creatorTokenPda,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();
        }
      } catch (mintErr) {
        console.error('Error minting channel tokens:', mintErr);
      }
    })();

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

// List all videos purchased by a given viewer
exports.listPurchasedVideos = async (req, res, next) => {
  try {
    const { walletAddress } = req.params;
    // Find all access records for this viewer
    const accesses = await VideoAccess.find({ viewerWallet: walletAddress }).lean();
    const videoIds = accesses.map(a => a.videoId);
    // Fetch video details for purchased videos
    const videos = await Video.find({ _id: { $in: videoIds }, isActive: true });
    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    console.error('Error listing purchased videos:', error);
    next(error);
  }
}; 