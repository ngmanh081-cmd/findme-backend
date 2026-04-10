// File: controllers/adminController.js
const { sql, poolPromise } = require('../config/db');

// ==========================================
// --- QUẢN LÝ GIAO DỊCH (Giao dịch chờ duyệt & Xử lý)
// ==========================================
const getPendingTransactions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query("SELECT t.*, u.Email, u.Username FROM Transactions t JOIN Users u ON t.UserID = u.UserID WHERE t.Status = 'PENDING' ORDER BY t.CreatedAt ASC");
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ detail: "Lỗi hệ thống" }); }
};
// --- BỔ SUNG HÀM BỊ THIẾU: LỊCH SỬ GIAO DỊCH ADMIN ---
const getTransactionHistory = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT t.*, u.Email, u.Username 
                FROM Transactions t
                JOIN Users u ON t.UserID = u.UserID
                WHERE t.Status != 'PENDING'
                ORDER BY t.CreatedAt DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Lỗi lấy lịch sử GD Admin:', err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
};
const processTransaction = async (req, res) => {
    try {
        const txId = req.params.id;
        const { Action } = req.body; 
        const pool = await poolPromise;

        const txRes = await pool.request().input('TxID', sql.Int, txId).query("SELECT * FROM Transactions WHERE TransactionID = @TxID AND Status = 'PENDING'");
        if (txRes.recordset.length === 0) return res.status(404).json({ detail: "Giao dịch không tồn tại!" });

        const tx = txRes.recordset[0];
        const newStatus = Action === 'APPROVE' ? 'SUCCESS' : 'FAILED';
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await transaction.request().input('TxID', sql.Int, txId).input('Status', sql.NVarChar, newStatus).query("UPDATE Transactions SET Status = @Status WHERE TransactionID = @TxID");

            if (Action === 'APPROVE') {
                if (tx.Type === 'NAP_TIEN') {
                    await transaction.request().input('ID', sql.Int, tx.UserID).input('Amt', sql.Decimal(18,2), tx.Amount).query("UPDATE Wallets SET Balance = Balance + @Amt WHERE UserID = @ID");
                } else if (tx.Type === 'RUT_TIEN') {
                    await transaction.request().input('ID', sql.Int, tx.UserID).input('Amt', sql.Decimal(18,2), tx.Amount).query("UPDATE Wallets SET Balance = Balance - @Amt WHERE UserID = @ID");
                }
            }
            await transaction.commit();
            res.json({ message: "Xử lý giao dịch thành công!" });
        } catch (err) { await transaction.rollback(); throw err; }
    } catch (err) { res.status(500).json({ detail: "Lỗi hệ thống" }); }
};

// ==========================================
// --- QUẢN LÝ BÁO CÁO VI PHẠM
// ==========================================
const getReports = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT r.*, u1.Username AS ReporterName, u2.Username AS ReportedName FROM Reports r JOIN Users u1 ON r.ReporterID = u1.UserID JOIN Users u2 ON r.ReportedUserID = u2.UserID WHERE r.Status = 'PENDING'");
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ detail: "Lỗi lấy báo cáo" }); }
};

const processReport = async (req, res) => {
    try {
        const { Action, ReportedUserID } = req.body;
        const pool = await poolPromise;
        await pool.request().input('ID', sql.Int, req.params.id).input('ST', sql.NVarChar, Action === 'BAN' ? 'RESOLVED' : 'DISMISSED').query("UPDATE Reports SET Status = @ST WHERE ReportID = @ID");
        if (Action === 'BAN') {
            await pool.request().input('ID', sql.Int, ReportedUserID).query("UPDATE Users SET Role = 'Banned' WHERE UserID = @ID; UPDATE Profiles SET IsActive = 0 WHERE UserID = @ID;");
        }
        res.json({ message: "Đã xử lý báo cáo!" });
    } catch (err) { res.status(500).json({ detail: "Lỗi hệ thống" }); }
};

// ==========================================
// --- QUẢN LÝ DANH MỤC DỊCH VỤ
// ==========================================
const getAdminCategories = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Categories ORDER BY CategoryID DESC");
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ detail: "Lỗi hệ thống" }); }
};

const addCategory = async (req, res) => {
    try {
        const { CategoryName, IconUrl } = req.body;
        if (!CategoryName || CategoryName.trim() === '') return res.status(400).json({ detail: "Tên danh mục không được để trống!" });

        const pool = await poolPromise;
        await pool.request()
            .input('CategoryName', sql.NVarChar, CategoryName.trim()).input('IconUrl', sql.NVarChar, IconUrl || '')
            .query("INSERT INTO Categories (CategoryName, IconUrl, IsActive) VALUES (@CategoryName, @IconUrl, 1)");
        res.status(201).json({ message: "Thêm danh mục thành công!" });
    } catch (err) { res.status(500).json({ detail: "Lỗi thêm danh mục" }); }
};

const updateCategory = async (req, res) => {
    try {
        const { CategoryName, IconUrl, IsActive } = req.body;
        if (!CategoryName || CategoryName.trim() === '') return res.status(400).json({ detail: "Tên danh mục không được để trống!" });

        const pool = await poolPromise;
        await pool.request()
            .input('CategoryID', sql.Int, req.params.id).input('CategoryName', sql.NVarChar, CategoryName.trim())
            .input('IconUrl', sql.NVarChar, IconUrl || '').input('IsActive', sql.Bit, IsActive === false ? 0 : 1)
            .query("UPDATE Categories SET CategoryName = @CategoryName, IconUrl = @IconUrl, IsActive = @IsActive WHERE CategoryID = @CategoryID");
        res.json({ message: "Cập nhật danh mục thành công!" });
    } catch (err) { res.status(500).json({ detail: "Lỗi cập nhật danh mục" }); }
};

const deleteCategory = async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('CategoryID', sql.Int, req.params.id).query("DELETE FROM Categories WHERE CategoryID = @CategoryID");
        res.json({ message: "Đã xóa danh mục!" });
    } catch (err) {
        if (err.number === 547) return res.status(400).json({ detail: "Không thể xóa vì đã có người dùng đăng ký! Hãy Ẩn nó đi." });
        res.status(500).json({ detail: "Lỗi xóa danh mục" });
    }
};

// ==========================================
// --- QUẢN LÝ HỒ SƠ
// ==========================================
const deleteProfile = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().input('Id', sql.Int, req.params.id).query('DELETE FROM Profiles WHERE ProfileID = @Id');
        if (!result.rowsAffected || result.rowsAffected[0] === 0) return res.status(404).json({ detail: "Không tìm thấy hồ sơ" });
        res.json({ message: "Đã xóa hồ sơ thành công" });
    } catch (err) { res.status(500).json({ detail: "Lỗi xóa hồ sơ" }); }
};

// ==========================================
// 🚀 ĐÂY LÀ ĐOẠN QUAN TRỌNG NHẤT BỊ THIẾU/LỖI Ở BẢN TRƯỚC
// Gói toàn bộ hàm lại và xuất khẩu ra ngoài cho Router dùng
// ==========================================
module.exports = { 
    getPendingTransactions, 
    processTransaction, 
    getTransactionHistory, 
    getReports, 
    processReport,
    getAdminCategories, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    deleteProfile 
};