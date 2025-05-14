const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');

// Endpoint to reward tokens during watch-to-earn
router.post('/watch', rewardController.rewardDuringWatch);

module.exports = router;
