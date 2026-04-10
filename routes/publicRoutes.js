const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { getActiveCategories, createReport } = require('../controllers/publicController');

router.get('/categories', getActiveCategories);
router.post('/reports', authenticateToken, createReport);

module.exports = router;