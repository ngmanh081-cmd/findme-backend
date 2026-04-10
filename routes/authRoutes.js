// File: routes/authRoutes.js
const express = require('express');
const router = express.Router();

// Nhập khẩu các hàm logic từ Controller
const { registerUser, loginUser } = require('../controllers/authController');

// Điều hướng: Khách gọi POST vào '/register' thì đưa cho hàm registerUser xử lý
router.post('/register', registerUser);

// Điều hướng: Khách gọi POST vào '/login' thì đưa cho hàm loginUser xử lý
router.post('/login', loginUser);

module.exports = router;