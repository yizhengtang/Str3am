const User = require('../models/User');
const { uploadToArweave } = require('../config/arweave');

// Get user profile
exports.getUser = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const user = await User.findOne({ walletAddress });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Create or update user profile
exports.updateUser = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { username, bio, socialLinks } = req.body;
    
    // Find user or create if not exists
    let user = await User.findOne({ walletAddress });
    
    if (!user) {
      user = await User.create({
        walletAddress,
        username: username || '',
        bio: bio || '',
        socialLinks: socialLinks || {},
      });
    } else {
      // Update existing user
      if (username) user.username = username;
      if (bio) user.bio = bio;
      if (socialLinks) user.socialLinks = socialLinks;
      
      await user.save();
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Update profile picture
exports.updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload an image file'
      });
    }
    
    const walletAddress = req.params.walletAddress;
    
    // Check if user exists
    let user = await User.findOne({ walletAddress });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Upload image to Arweave
    const result = await uploadToArweave(req.file.buffer, req.file.mimetype, [
      { name: 'Content-Type', value: req.file.mimetype },
      { name: 'App-Name', value: 'STR3AM' },
      { name: 'Type', value: 'profile-picture' }
    ]);
    
    if (!result || !result.id) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upload image to Arweave'
      });
    }
    
    // Update user profile picture
    user.profilePicture = result.id;
    await user.save();
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get user stats
exports.getUserStats = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const user = await User.findOne({ walletAddress });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const stats = {
      videosUploaded: user.videosUploaded,
      videosWatched: user.videosWatched,
      tokensEarned: user.tokensEarned,
      tokensSpent: user.tokensSpent
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get top creators
exports.getTopCreators = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const creators = await User.find({ isCreator: true })
      .sort({ tokensEarned: -1 })
      .limit(limit)
      .select('walletAddress username profilePicture tokensEarned videosUploaded');
    
    res.status(200).json({
      success: true,
      count: creators.length,
      data: creators
    });
  } catch (error) {
    console.error('Error fetching top creators:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 