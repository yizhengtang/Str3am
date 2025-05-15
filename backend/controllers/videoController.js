const { PublicKey } = require('@solana/web3.js');
const { program } = require('../config/anchor');
const { uploadToArweave } = require('../config/arweave');
const Video = require('../models/Video');
const User = require('../models/User');
const VideoAccess = require('../models/VideoAccess');

// Helper function to process refunds for a video (reused from interactionController)
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
    
    // Debug logging for thumbnail data
    console.log('Videos being returned:', videos.map(v => ({
      id: v._id,
      title: v.title,
      thumbnailCid: v.thumbnailCid || 'none'
    })));
    
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

    // --- Enhancement: Fetch creator token data from on-chain ---
    const uploaderPubkey = new PublicKey(video.uploader);
    const [creatorTokenPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('creator_token'), uploaderPubkey.toBuffer()],
      program.programId
    );

    let creatorMint = null;

    try {
      const creatorTokenData = await program.account.creatorToken.fetch(creatorTokenPDA);
      creatorMint = creatorTokenData.mint.toBase58();
    } catch (err) {
      console.warn('Creator token not found on-chain:', err.message);
    }

    // --- Respond with video and creator token info ---
    res.status(200).json({
      success: true,
      data: {
        ...video.toObject(),
        creatorMint,
        creatorTokenPDA: creatorTokenPDA.toBase58()
      }
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get the single most viewed video
exports.getTopVideo = async (req, res) => {
  try {
    const video = await Video.findOne({ isActive: true }).sort({ viewCount: -1 });
    if (!video) {
      return res.status(404).json({ success: false, error: 'No videos found' });
    }
    // On-chain token data
    const uploaderPubkey = new PublicKey(video.uploader);
    const [creatorTokenPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('creator_token'), uploaderPubkey.toBuffer()],
      program.programId
    );
    let creatorMint = null;
    try {
      const creatorTokenData = await program.account.creatorToken.fetch(creatorTokenPDA);
      creatorMint = creatorTokenData.mint.toBase58();
    } catch {
      // ignore if missing
    }
    res.status(200).json({
      success: true,
      data: {
        ...video.toObject(),
        creatorMint,
        creatorTokenPDA: creatorTokenPDA.toBase58()
      }
    });
  } catch (error) {
    console.error('Error fetching top video:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Upload a new video
exports.uploadVideo = async (req, res) => {
  try {
    const { title, description, category, price, uploader } = req.body;
    
    console.log('Upload request received:', {
      title,
      hasThumbnail: req.files && req.files.thumbnail ? 'Yes' : 'No',
      thumbnailDetails: req.files && req.files.thumbnail ? {
        filename: req.files.thumbnail[0].originalname,
        mimetype: req.files.thumbnail[0].mimetype,
        size: req.files.thumbnail[0].size
      } : 'None'
    });
    
    // Check if we have video file
    // With upload.fields, files are in req.files object grouped by field name
    if (!req.files || !req.files.video || !req.files.video[0]) {
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
    
    // Upload video to Arweave
    const videoFile = req.files.video[0];
    const videoBuffer = videoFile.buffer;
    const videoResult = await uploadToArweave(videoBuffer, videoFile.mimetype, [
      { name: 'Content-Type', value: videoFile.mimetype },
      { name: 'App-Name', value: 'STR3AM' },
      { name: 'Title', value: title }
    ]);
    
    if (!videoResult || !videoResult.id) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upload video to Arweave'
      });
    }
    
    // Upload thumbnail to Arweave if provided
    let thumbnailCid = null;
    let thumbnailPath = null;
    if (req.files.thumbnail && req.files.thumbnail[0]) {
      console.log('Processing thumbnail upload to Arweave');
      const thumbnailFile = req.files.thumbnail[0];
      const thumbnailBuffer = thumbnailFile.buffer;
      
      if (!Buffer.isBuffer(thumbnailBuffer)) {
        console.error('Thumbnail is not a valid buffer');
      } else {
        console.log(`Thumbnail buffer size: ${thumbnailBuffer.length} bytes, type: ${thumbnailFile.mimetype}`);
      }
      
      const thumbnailResult = await uploadToArweave(thumbnailBuffer, thumbnailFile.mimetype, [
        { name: 'Content-Type', value: thumbnailFile.mimetype },
        { name: 'App-Name', value: 'STR3AM' },
        { name: 'Type', value: 'thumbnail' }
      ]);
      
      if (thumbnailResult && thumbnailResult.id) {
        thumbnailCid = thumbnailResult.id;
        thumbnailPath = thumbnailResult.localPath;
        console.log('Thumbnail uploaded successfully with CID:', thumbnailCid);
        console.log('Thumbnail local path:', thumbnailPath);
      } else {
        console.error('Failed to get valid thumbnail CID from Arweave');
      }
    } else {
      console.log('No thumbnail file provided in the request');
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
    const videoData = {
      title,
      description,
      category,
      price: parseFloat(price),
      cid: videoResult.id, // Using Arweave transaction ID instead of IPFS CID
      uploader,
      videoPubkey: randomPubkey.toString()
    };
    
    // Add thumbnail if uploaded successfully
    if (thumbnailCid) {
      videoData.thumbnailCid = thumbnailCid;
      console.log('Adding thumbnailCid to video data:', thumbnailCid);
    } else {
      console.log('No thumbnailCid available to save with video');
    }
    
    const video = await Video.create(videoData);
    console.log('Video created in database with ID:', video._id, 'thumbnailCid:', video.thumbnailCid || 'none');
    
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
    video.takedownReason = 'uploader_removed';
    await video.save();
    
    // Process refunds for all users who paid for this video
    const refundResult = await processRefunds(req.params.id);
    
    const response = {
      success: true,
      data: {}
    };
    
    // Include refund information
    if (refundResult) {
      response.refunds = refundResult;
    }
    
    res.status(200).json(response);
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

// Record a video view
exports.recordView = async (req, res) => {
  try {
    const videoId = req.params.id;
    
    // Find the video
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    // Increment the view count
    video.viewCount += 1;
    await video.save();
    
    res.status(200).json({
      success: true,
      data: {
        viewCount: video.viewCount
      }
    });
  } catch (error) {
    console.error('Error recording video view:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 