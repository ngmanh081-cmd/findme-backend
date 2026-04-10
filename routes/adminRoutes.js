const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middlewares/auth');

// Gộp chung vào 1 lệnh require duy nhất để tránh lỗi trùng lặp
const { 
    getPendingTransactions, 
    processTransaction, 
    getTransactionHistory, // <--- Đã bổ sung hàm lấy lịch sử
    getReports, 
    processReport,
    getAdminCategories, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    deleteProfile 
} = require('../controllers/adminController');

// Tất cả route admin đều phải qua 2 lớp bảo vệ: Đăng nhập & Quyền Admin
router.use(authenticateToken);
router.use(isAdmin);

// --- QUẢN LÝ GIAO DỊCH ---
router.get('/transactions/pending', getPendingTransactions);
router.post('/transactions/:id/process', processTransaction);
router.get('/transactions/history', getTransactionHistory); // <--- Đã bổ sung route lấy lịch sử

// --- QUẢN LÝ BÁO CÁO VI PHẠM ---
router.get('/reports', getReports);
router.post('/reports/:id/process', processReport);

// --- QUẢN LÝ DANH MỤC DỊCH VỤ ---
router.get('/categories', getAdminCategories);
router.post('/categories', addCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// --- QUẢN LÝ HỒ SƠ ---
router.delete('/profiles/:id', deleteProfile);

module.exports = router;