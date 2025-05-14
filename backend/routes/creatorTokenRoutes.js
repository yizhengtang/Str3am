const express = require('express');
const router = express.Router();
const creatorTokenController = require('../controllers/creatorTokenController');

router.post('/create', creatorTokenController.createCreatorToken);

module.exports = router;
