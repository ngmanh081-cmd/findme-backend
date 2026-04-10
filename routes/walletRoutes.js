// File: routes/walletRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const { getWalletInfo, createTransactionRequest } = require('../controllers/walletController');

// Khi Flutter gọi GET /api/wallet -> Nó sẽ nhảy vào file này và map với '/'
router.get('/', authenticateToken, getWalletInfo);

// Khi Flutter gọi POST /api/wallet/request -> Nó sẽ map với '/request'
router.post('/request', authenticateToken, createTransactionRequest);

module.exports = router;