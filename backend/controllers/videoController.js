const { PublicKey } = require('@solana/web3.js');
const { program } = require('../config/anchor');
const { uploadToIPFS } = require('../config/ipfs');
const Video = require('../models/Video');
const User = require('../models/User');

// Get all videos with pagination
exports.getVideos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const searchTerm = req.query.search;
    
    let query = { isActive: true };
    
    // Add category filter if provided
    if (category) {
      query.category = category;
    }
    
    // Add search filter if provided
    if (searchTerm) {
      query.$text = { $search: searchTerm };
    }
    
    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await Video.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: videos.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: videos
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get a single video
exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Upload a new video
exports.uploadVideo = async (req, res) => {
  try {
    const { title, description, category, price, uploader } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a video file'
      });
    }
    
    // Check if user exists
    let user = await User.findOne({ walletAddress: uploader });
    
    if (!user) {
      // Create new user if not exists
      user = await User.create({
        walletAddress: uploader,
        isCreator: true
      });
    }
    
    // Upload video to IPFS
    const fileBuffer = req.file.buffer;
    const result = await uploadToIPFS(fileBuffer);
    
    if (!result || !result.cid) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upload video to IPFS'
      });
    }
    
    // Generate a new keypair for the video account
    // Note: In a production app, this would be done on the client side
    // Here we're simplifying the flow for demo purposes
    
    // For demo purposes, we're mocking the blockchain interaction
    // In a real app, this would be handled by the client's wallet
    
    // Mock Solana account creation
    const randomPubkey = new PublicKey(
      Buffer.from(Array(32).fill(0).map(() => Math.floor(Math.random() * 256)))
    );
    
    // Create video in database
    const video = await Video.create({
      title,
      description,
      category,
      price: parseFloat(price),
      cid: result.cid,
      uploader,
      videoPubkey: randomPubkey.toString()
    });
    
    // Update user's uploads count
    await User.findOneAndUpdate(
      { walletAddress: uploader },
      { $inc: { videosUploaded: 1 } }
    );
    
    res.status(201).json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Update video details
exports.updateVideo = async (req, res) => {
  try {
    let video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    // Check if user is the uploader
    if (video.uploader !== req.body.walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this video'
      });
    }
    
    // Update fields
    const { title, description, category, price } = req.body;
    
    if (title) video.title = title;
    if (description) video.description = description;
    if (category) video.category = category;
    if (price) video.price = parseFloat(price);
    
    await video.save();
    
    res.status(200).json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Delete video (set as inactive)
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    // Check if user is the uploader
    if (video.uploader !== req.body.walletAddress) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this video'
      });
    }
    
    // Mark as inactive instead of deleting
    video.isActive = false;
    await video.save();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get videos by uploader
exports.getVideosByUploader = async (req, res) => {
  try {
    const walletAddress = req.params.walletAddress;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const videos = await Video.find({ uploader: walletAddress, isActive: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await Video.countDocuments({ uploader: walletAddress, isActive: true });
    
    res.status(200).json({
      success: true,
      count: videos.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: videos
    });
  } catch (error) {
    console.error('Error fetching videos by uploader:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 