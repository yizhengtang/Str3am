const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Verify access to video
router.get('/verify/:videoId/:walletAddress', paymentController.verifyAccess);

// Record payment and grant access
router.post('/record', paymentController.recordPayment);

// Get payment info for video
router.get('/info/:videoId', paymentController.getPaymentInfo);

// Update watch time
router.put('/watch-time/:accessId', paymentController.updateWatchTime);

module.exports = router; 