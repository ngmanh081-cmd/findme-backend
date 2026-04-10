const { sql, poolPromise } = require('../config/db');

// 1. Lấy thông tin ví và lịch sử giao dịch
const getWalletInfo = async (req, res) => {
    try {
        const userId = req.user.UserID;
        const pool = await poolPromise;

        let walletRes = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT Balance FROM Wallets WHERE UserID = @UserID');
        
        // Nếu chưa có ví thì tạo mới tự động
        if (walletRes.recordset.length === 0) {
            await pool.request()
                .input('UserID', sql.Int, userId)
                .query('INSERT INTO Wallets (UserID, Balance) VALUES (@UserID, 0)');
            walletRes = { recordset: [{ Balance: 0 }] };
        }

        const transRes = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT * FROM Transactions WHERE UserID = @UserID ORDER BY CreatedAt DESC');

        res.json({
            balance: walletRes.recordset[0].Balance,
            transactions: transRes.recordset
        });
    } catch (err) {
        console.error("Lỗi tải ví:", err);
        res.status(500).json({ detail: "Lỗi hệ thống khi tải ví" });
    }
};

// 2. Gửi yêu cầu nạp hoặc rút tiền
const createTransactionRequest = async (req, res) => {
    try {
        const userId = req.user.UserID;
        const { Amount, Type, PaymentMethod, PaymentDetails } = req.body; 
        const pool = await poolPromise;

        // 🚀 FIX: Ép kiểu Amount về dạng số (Number) để không bị lỗi toLocaleString
        const AmountNum = Number(Amount);

        // Bắt lỗi nếu Amount không phải là số hoặc nhỏ hơn bằng 0
        if (isNaN(AmountNum) || AmountNum <= 0) {
            return res.status(400).json({ detail: "Số tiền không hợp lệ!" });
        }

        if (Type === 'RUT_TIEN') {
            const walletRes = await pool.request()
                .input('UserID', sql.Int, userId)
                .query('SELECT Balance FROM Wallets WHERE UserID = @UserID');
                
            if (walletRes.recordset.length === 0 || walletRes.recordset[0].Balance < AmountNum) {
                return res.status(400).json({ detail: "Số dư không đủ để thực hiện lệnh rút!" });
            }
        }

        // Dùng AmountNum đã ép kiểu ở đây
        const description = `Yêu cầu ${Type === 'NAP_TIEN' ? 'Nạp' : 'Rút'} ${AmountNum.toLocaleString('vi-VN')} VNĐ qua ${PaymentMethod || 'Hệ thống'}. Chi tiết: ${PaymentDetails || 'Không có'}`;

        await pool.request()
            .input('UserID', sql.Int, userId)
            .input('Type', sql.NVarChar, Type)
            .input('Amount', sql.Decimal(18,2), AmountNum)
            .input('Desc', sql.NVarChar, description)
            .query(`
                INSERT INTO Transactions (UserID, Type, Amount, Status, Description) 
                VALUES (@UserID, @Type, @Amount, 'PENDING', @Desc)
            `);

        res.status(201).json({ message: "Đã gửi yêu cầu thành công! Vui lòng chờ Admin duyệt." });
    } catch (err) {
        console.error("Lỗi tạo giao dịch:", err);
        res.status(500).json({ detail: "Lỗi hệ thống khi tạo giao dịch" });
    }
};

module.exports = { getWalletInfo, createTransactionRequest };