const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { getProfileReviews, createReview } = require('../controllers/reviewController');

// Lấy đánh giá của 1 user (Public không cần token)
router.get('/profiles/:userId/reviews', getProfileReviews);

// Gửi đánh giá mới (Cần token)
router.post('/reviews', authenticateToken, createReview);

module.exports = router;