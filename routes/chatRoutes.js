const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { sendMessage, getChatHistory, getInbox } = require('../controllers/chatController');

router.post('/', authenticateToken, sendMessage);
router.get('/inbox', authenticateToken, getInbox);
router.get('/:partnerId', authenticateToken, getChatHistory);

module.exports = router;