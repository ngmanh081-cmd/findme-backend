const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { requestRent, acceptRent, rejectRent, confirmMeet, getMyRequests } = require('../controllers/rentController');

router.post('/request', authenticateToken, requestRent);
router.post('/accept/:id', authenticateToken, acceptRent);
router.post('/reject/:id', authenticateToken, rejectRent);
router.post('/confirm-meet/:id', authenticateToken, confirmMeet);
router.get('/my-requests', authenticateToken, getMyRequests);

module.exports = router;