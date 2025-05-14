const express = require('express');
const router = express.Router();
const creatorTokenController = require('../controllers/creatorTokenController');

router.post('/create', creatorTokenController.createCreatorToken);
// List viewer's channel token balances
router.get('/viewer/:walletAddress', creatorTokenController.listViewerTokens);

module.exports = router;
