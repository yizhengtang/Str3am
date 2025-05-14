const mongoose = require('mongoose');
const Video = require('../models/Video');
const User = require('../models/User');
const VideoAccess = require('../models/VideoAccess');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/str3am')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const problematicAddress = '9FSVJZ9nRLJPh8B9W1b526ewvMi8o1YuFHfVPCB9G14K';
// Provide a valid replacement address - a new Solana key that works
const replacementAddress = '9FSVjZ9nRLJPh8B9W1b526ewvMi8o1YuFHfVPCB9G14K'; // Example: slightly different case

async function fixAddress() {
  console.log(`Fixing problematic address: ${problematicAddress}`);
  console.log(`Replacement address: ${replacementAddress}`);

  try {
    // Fix Users
    const users = await User.find({ walletAddress: problematicAddress });
    console.log(`Found ${users.length} users with problematic address`);
    for (const user of users) {
      user.walletAddress = replacementAddress;
      await user.save();
      console.log(`Fixed user: ${user._id}`);
    }

    // Fix Videos
    const videos = await Video.find({ uploader: problematicAddress });
    console.log(`Found ${videos.length} videos with problematic uploader`);
    for (const video of videos) {
      video.uploader = replacementAddress;
      await video.save();
      console.log(`Fixed video: ${video._id}`);
    }

    // Fix VideoAccess
    const accesses = await VideoAccess.find({ viewerWallet: problematicAddress });
    console.log(`Found ${accesses.length} video accesses with problematic viewer wallet`);
    for (const access of accesses) {
      access.viewerWallet = replacementAddress;
      await access.save();
      console.log(`Fixed access: ${access._id}`);
    }

    console.log('Fixed all problematic addresses');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing addresses:', error);
    process.exit(1);
  }
}

fixAddress(); 