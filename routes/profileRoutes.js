// File: routes/profileRoutes.js
const express = require('express');
const router = express.Router();

// Import các "phụ kiện"
const { authenticateToken } = require('../middlewares/auth');
const upload = require('../config/multer'); 

// Import các hàm xử lý
const { 
    getAllProfiles, getMyProfile, createOrUpdateProfile, uploadAvatar,
    getMyServices, addService, deleteService, getPublicServices
} = require('../controllers/profileController');

// --- CÁC ĐƯỜNG DẪN HỒ SƠ ---
router.get('/', getAllProfiles); 
router.get('/me', authenticateToken, getMyProfile);
router.post('/', authenticateToken, createOrUpdateProfile);

// 🚀 Nối Middleware upload ảnh trước khi chạy vào hàm uploadAvatar
router.post('/upload-avatar', authenticateToken, upload.single('avatarImage'), uploadAvatar);

// --- CÁC ĐƯỜNG DẪN DỊCH VỤ CỦA HỒ SƠ ---
router.get('/services', authenticateToken, getMyServices); // Của mình
router.post('/services', authenticateToken, addService);
router.delete('/services/:serviceId', authenticateToken, deleteService);
router.get('/:userId/services', getPublicServices); // Của người khác (Public)

module.exports = router;