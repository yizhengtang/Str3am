const Interaction = require('../models/Interaction');
const Video = require('../models/Video');
const VideoAccess = require('../models/VideoAccess');
const User = require('../models/User');

// Helper function to process refunds for a video
const processRefunds = async (videoId) => {
  try {
    // Find all users who paid for the video
    const accessRecords = await VideoAccess.find({ videoId });
    
    if (accessRecords.length === 0) {
      return { refunded: 0, total: 0 };
    }
    
    // Process refunds for all users
    let refundCount = 0;
    for (const access of accessRecords) {
      // Update user stats - refund the tokens spent
      await User.findOneAndUpdate(
        { walletAddress: access.viewerWallet },
        { $inc: { tokensRefunded: access.tokensPaid } }
      );
      
      // In a production environment, you would also process the actual blockchain refund here
      // This would involve calling a smart contract to return the tokens/SOL to the user
      // For this implementation, we're just tracking the refund in the database
      
      refundCount++;
    }
    
    return { refunded: refundCount, total: accessRecords.length };
  } catch (error) {
    console.error('Error processing refunds:', error);
    return { refunded: 0, total: 0, error };
  }
};

// Middleware to check if user has paid for the video
const hasPaidAccess = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { userWallet } = req.body;
    
    if (!videoId || !userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Video ID and user wallet address are required'
      });
    }
    
    // First check if user is the video uploader
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    // If user is the uploader, grant access automatically
    if (video.uploader === userWallet) {
      return next();
    }
    
    // Check if the user has paid for the video
    const access = await VideoAccess.findOne({
      videoId,
      viewerWallet: userWallet
    });
    
    if (!access) {
      return res.status(403).json({
        success: false,
        error: 'You must pay to access this video before interacting with it'
      });
    }
    
    // Continue to the next middleware or controller
    next();
  } catch (error) {
    console.error('Error checking video access:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Add or update a like/dislike
const addInteraction = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { userWallet, type, sharedTo } = req.body;
    
    if (!['like', 'dislike', 'share'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid interaction type. Must be like, dislike, or share.'
      });
    }
    
    if (type === 'share' && !sharedTo) {
      return res.status(400).json({
        success: false,
        error: 'sharedTo field is required for share interactions'
      });
    }
    
    // Find the video
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    if (!video.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot interact with an inactive video'
      });
    }
    
    // Find any existing interactions of this type by the user
    let interaction = await Interaction.findOne({
      videoId,
      userWallet,
      type
    });
    
    // For likes/dislikes, check if the user has the opposite reaction active
    if ((type === 'like' || type === 'dislike') && !interaction) {
      const oppositeType = type === 'like' ? 'dislike' : 'like';
      
      // Check for and deactivate opposite reaction if it exists
      const oppositeInteraction = await Interaction.findOne({
        videoId,
        userWallet,
        type: oppositeType
      });
      
      if (oppositeInteraction && oppositeInteraction.active) {
        oppositeInteraction.active = false;
        await oppositeInteraction.save();
        
        // Update counts on the video
        if (oppositeType === 'like') {
          video.likeCount = Math.max(0, video.likeCount - 1);
        } else {
          video.dislikeCount = Math.max(0, video.dislikeCount - 1);
        }
      }
    }
    
    // Create or update the interaction
    if (!interaction) {
      // Create new interaction
      interaction = await Interaction.create({
        videoId,
        userWallet,
        type,
        sharedTo: type === 'share' ? sharedTo : undefined,
        active: true
      });
      
      // Update counts on the video
      if (type === 'like') {
        video.likeCount += 1;
      } else if (type === 'dislike') {
        video.dislikeCount += 1;
      } else if (type === 'share') {
        video.shareCount += 1;
      }
    } else {
      // Toggle the active state for like/dislike
      if (type === 'like' || type === 'dislike') {
        interaction.active = !interaction.active;
        
        // Update counts based on new state
        if (type === 'like') {
          video.likeCount += interaction.active ? 1 : -1;
        } else {
          video.dislikeCount += interaction.active ? 1 : -1;
        }
      } else if (type === 'share') {
        // For shares, just update the sharedTo field and increment count
        interaction.sharedTo = sharedTo;
        video.shareCount += 1;
      }
      
      await interaction.save();
    }
    
    // Calculate dislike ratio
    const totalInteractions = video.likeCount + video.dislikeCount;
    let refundResult = null;
    
    if (totalInteractions >= video.minimumInteractions) {
      video.dislikeRatio = video.dislikeCount / totalInteractions;
      
      // Check if the video should be taken down based on dislike ratio
      if (video.dislikeRatio >= video.dislikeThreshold) {
        // If the video is still active, take it down and process refunds
        if (video.isActive) {
          video.isActive = false;
          video.takedownReason = 'dislike_ratio';
          
          // Process refunds for all users who paid for this video
          refundResult = await processRefunds(videoId);
        }
      }
    }
    
    await video.save();
    
    const response = {
      success: true,
      data: interaction,
      video: {
        likeCount: video.likeCount,
        dislikeCount: video.dislikeCount,
        shareCount: video.shareCount,
        isActive: video.isActive
      }
    };
    
    // Include refund information if a takedown was triggered
    if (refundResult) {
      response.refunds = refundResult;
    }
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error adding interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get all interactions for a video
const getVideoInteractions = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { type } = req.query;
    
    // Build query
    const query = { videoId };
    if (type) {
      query.type = type;
    }
    
    if (type === 'like' || type === 'dislike') {
      query.active = true;
    }
    
    const interactions = await Interaction.find(query).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: interactions.length,
      data: interactions
    });
  } catch (error) {
    console.error('Error getting interactions:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get interaction stats for a video
const getInteractionStats = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        likeCount: video.likeCount,
        dislikeCount: video.dislikeCount,
        shareCount: video.shareCount,
        commentCount: video.commentCount,
        dislikeRatio: video.dislikeRatio
      }
    });
  } catch (error) {
    console.error('Error getting interaction stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Update dislike threshold for a video (only for video owner)
const updateDislikeThreshold = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { dislikeThreshold, minimumInteractions } = req.body;
    const { userWallet } = req.body;
    
    // Find the video
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    // Verify that the user is the video owner
    if (video.uploader !== userWallet) {
      return res.status(403).json({
        success: false,
        error: 'Only the video owner can update threshold settings'
      });
    }
    
    // Update threshold settings
    if (dislikeThreshold !== undefined) {
      // Validate threshold is between 0 and 1
      if (dislikeThreshold < 0 || dislikeThreshold > 1) {
        return res.status(400).json({
          success: false,
          error: 'Dislike threshold must be between 0 and 1'
        });
      }
      
      video.dislikeThreshold = dislikeThreshold;
    }
    
    if (minimumInteractions !== undefined) {
      // Validate minimum interactions is positive
      if (minimumInteractions < 0) {
        return res.status(400).json({
          success: false,
          error: 'Minimum interactions must be a positive number'
        });
      }
      
      video.minimumInteractions = minimumInteractions;
    }
    
    await video.save();
    
    res.status(200).json({
      success: true,
      data: {
        dislikeThreshold: video.dislikeThreshold,
        minimumInteractions: video.minimumInteractions
      }
    });
  } catch (error) {
    console.error('Error updating dislike threshold:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get user interaction for a video
const getUserInteraction = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { userWallet } = req.query;
    
    if (!userWallet) {
      return res.status(400).json({
        success: false,
        error: 'User wallet address is required'
      });
    }
    
    // Find active interactions by the user for this video
    const interactions = await Interaction.find({
      videoId,
      userWallet,
      active: true
    });
    
    const userInteractions = {
      liked: false,
      disliked: false,
      shared: false
    };
    
    interactions.forEach(interaction => {
      if (interaction.type === 'like') userInteractions.liked = true;
      if (interaction.type === 'dislike') userInteractions.disliked = true;
      if (interaction.type === 'share') userInteractions.shared = true;
    });
    
    res.status(200).json({
      success: true,
      data: userInteractions
    });
  } catch (error) {
    console.error('Error getting user interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

module.exports = {
  hasPaidAccess,
  addInteraction,
  getVideoInteractions,
  getInteractionStats,
  updateDislikeThreshold,
  getUserInteraction
}; 