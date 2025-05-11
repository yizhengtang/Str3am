const express = require('express');
const router = express.Router();
const multer = require('multer');
const userController = require('../controllers/userController');

// Configure multer for profile pictures
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get user profile
router.get('/:walletAddress', userController.getUser);

// Create or update user profile
router.put('/:walletAddress', userController.updateUser);

// Upload profile picture
router.post(
  '/:walletAddress/profile-picture',
  upload.single('image'),
  userController.uploadProfilePicture
);

// Get user stats
router.get('/:walletAddress/stats', userController.getUserStats);

// Get top creators
router.get('/creators/top', userController.getTopCreators);

module.exports = router; 