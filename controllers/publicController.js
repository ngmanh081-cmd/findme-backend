const { sql, poolPromise } = require('../config/db');

// --- TÍNH NĂNG DANH MỤC (PUBLIC) ---
const getActiveCategories = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM Categories WHERE IsActive = 1 ORDER BY CategoryID DESC");
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ detail: "Lỗi tải danh mục" }); }
};

// --- TÍNH NĂNG USER GỬI BÁO CÁO ---
const createReport = async (req, res) => {
    try {
        const ReporterID = req.user.UserID;
        const { ReportedUserID, Reason, Description } = req.body;

        if (ReporterID === ReportedUserID) return res.status(400).json({ detail: "Không thể tự báo cáo chính mình!" });

        const pool = await poolPromise;
        await pool.request()
            .input('ReporterID', sql.Int, ReporterID)
            .input('ReportedUserID', sql.Int, ReportedUserID)
            .input('Reason', sql.NVarChar, Reason)
            .input('Description', sql.NVarChar, Description || '')
            .query("INSERT INTO Reports (ReporterID, ReportedUserID, Reason, Description, Status) VALUES (@ReporterID, @ReportedUserID, @Reason, @Description, 'PENDING')");

        res.status(201).json({ message: "Đã gửi báo cáo thành công. Admin sẽ xem xét xử lý!" });
    } catch (err) { res.status(500).json({ detail: "Lỗi gửi báo cáo" }); }
};

module.exports = { getActiveCategories, createReport };