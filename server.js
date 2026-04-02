const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
require('dotenv').config();

const { sql, poolPromise } = require('./db');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========================================
// MIDDLEWARE: KIỂM TRA THẺ THÔNG HÀNH (JWT)
// ==========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ detail: "Vui lòng đăng nhập để thực hiện hành động này!" });
    }

    const secretKey = process.env.JWT_SECRET || 'BiMatCuaBan';

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.status(403).json({ detail: "Token không hợp lệ hoặc đã hết hạn, vui lòng đăng nhập lại!" });
        }
        req.user = user; 
        next(); 
    });
};

// ==========================================
// MIDDLEWARE: KIỂM TRA QUYỀN ADMIN
// ==========================================
const isAdmin = (req, res, next) => {
    if (req.user.Role !== 'Admin') {
        return res.status(403).json({ detail: "Bạn không đủ thẩm quyền! Yêu cầu quyền Admin." });
    }
    next();
};

// ==========================================
// API: ĐĂNG KÝ TÀI KHOẢN (REGISTER)
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        const { Username, Email, Password, Role } = req.body;
        const pool = await poolPromise;

        const checkUser = await pool.request()
            .input('Email', sql.NVarChar, Email)
            .query('SELECT * FROM Users WHERE Email = @Email');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ detail: "Email này đã được sử dụng!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Password, salt);
        const userRole = Role || 'User'; 

        await pool.request()
            .input('Username', sql.NVarChar, Username)
            .input('Email', sql.NVarChar, Email)
            .input('PasswordHash', sql.NVarChar, hashedPassword)
            .input('Role', sql.NVarChar, userRole)
            .query(`
                INSERT INTO Users (Username, Email, PasswordHash, Role)
                VALUES (@Username, @Email, @PasswordHash, @Role)
            `);

        res.status(201).json({ message: "Đăng ký tài khoản thành công!" });
    } catch (err) {
        console.error('❌ Lỗi đăng ký:', err);
        res.status(500).json({ detail: "Lỗi hệ thống khi đăng ký" });
    }
});

// ==========================================
// API: ĐĂNG NHẬP (LOGIN)
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { Email, Password } = req.body;
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('Email', sql.NVarChar, Email)
            .query('SELECT * FROM Users WHERE Email = @Email');

        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            const match = await bcrypt.compare(Password, user.PasswordHash);
            
            if (match) {
                const accessToken = jwt.sign(
                    { UserID: user.UserID, Email: user.Email, Role: user.Role }, 
                    process.env.JWT_SECRET || 'BiMatCuaBan', 
                    { expiresIn: '10h' }
                );
                
                res.json({ 
                    access_token: accessToken,
                    role: user.Role 
                });
            } else {
                res.status(401).json({ detail: "Mật khẩu không đúng" });
            }
        } else {
            res.status(404).json({ detail: "Không tìm thấy tài khoản" });
        }
    } catch (err) {
        console.error("Lỗi đăng nhập:", err);
        res.status(500).json({ detail: "Lỗi Server" });
    }
});

app.get('/', (req, res) => {
    res.json({ message: "Backend Node.js cho thuê người yêu đang hoạt động siêu tốc!" });
});

// ==========================================
// API: LẤY TẤT CẢ HỒ SƠ ĐANG MỞ CHO THUÊ
// ==========================================
app.get('/api/profiles', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT * FROM Profiles WHERE IsActive = 1');
            
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('❌ Lỗi lấy danh sách:', err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
});

// ==========================================
// API: ADMIN XÓA HỒ SƠ
// ==========================================
app.delete('/api/admin/profiles/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const profileId = req.params.id;
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('Id', sql.Int, profileId)
            .query('DELETE FROM Profiles WHERE ProfileID = @Id');
        
        if (!result.rowsAffected || result.rowsAffected[0] === 0) {
            return res.status(404).json({ detail: "Không tìm thấy hồ sơ này trong Database" });
        }
        
        res.json({ message: `Đã xóa thành công hồ sơ ID ${profileId}` });
    } catch (err) {
        console.error('[DEBUG] ❌ Lỗi Catch (Hệ thống/Ràng buộc SQL):', err);
        res.status(500).json({ detail: "Lỗi hệ thống khi xóa hồ sơ" });
    }
});

// ==========================================
// API: USER TẠO HOẶC CẬP NHẬT HỒ SƠ
// ==========================================
app.post('/api/profiles', authenticateToken, async (req, res) => {
    try {
        const { Bio, PricePerHour, Gender, ImageGallery, Avatar, Hobbies, IsActive } = req.body;
        const userId = req.user.UserID; 
        const pool = await poolPromise;

        const checkProfile = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT * FROM Profiles WHERE UserID = @UserID');

        const galleryString = Array.isArray(ImageGallery) ? JSON.stringify(ImageGallery) : '[]';
        const hobbiesString = Array.isArray(Hobbies) ? JSON.stringify(Hobbies) : '[]'; 
        const activeStatus = IsActive !== undefined ? IsActive : 1;
        const avatarStr = Avatar || '';

        if (checkProfile.recordset.length > 0) {
            await pool.request()
                .input('UserID', sql.Int, userId)
                .input('Bio', sql.NVarChar, Bio || '')
                .input('PricePerHour', sql.Decimal(18, 2), PricePerHour || 0)
                .input('Gender', sql.NVarChar, Gender || 'Khác')
                .input('ImageGallery', sql.NVarChar, galleryString)
                .input('Avatar', sql.NVarChar, avatarStr)
                .input('Hobbies', sql.NVarChar, hobbiesString)
                .input('IsActive', sql.Bit, activeStatus) 
                .query(`
                    UPDATE Profiles 
                    SET Bio = @Bio, PricePerHour = @PricePerHour, Gender = @Gender, 
                        ImageGallery = @ImageGallery, Avatar = @Avatar, Hobbies = @Hobbies, IsActive = @IsActive
                    WHERE UserID = @UserID
                `);
            return res.status(200).json({ message: "Cập nhật hồ sơ thành công!" });
        } else {
            await pool.request()
                .input('UserID', sql.Int, userId)
                .input('Bio', sql.NVarChar, Bio || '')
                .input('PricePerHour', sql.Decimal(18, 2), PricePerHour || 0)
                .input('Gender', sql.NVarChar, Gender || 'Khác')
                .input('ImageGallery', sql.NVarChar, galleryString)
                .input('Avatar', sql.NVarChar, avatarStr)
                .input('Hobbies', sql.NVarChar, hobbiesString)
                .input('IsActive', sql.Bit, activeStatus) 
                .query(`
                    INSERT INTO Profiles (UserID, Bio, PricePerHour, Gender, ImageGallery, Avatar, Hobbies, IsActive)
                    VALUES (@UserID, @Bio, @PricePerHour, @Gender, @ImageGallery, @Avatar, @Hobbies, @IsActive)
                `);
            return res.status(201).json({ message: "Tạo hồ sơ thành công!" });
        }
    } catch (err) {
        console.error('❌ Lỗi khi lưu hồ sơ:', err);
        res.status(500).json({ detail: "Lỗi hệ thống khi lưu hồ sơ" });
    }
});

// ==========================================
// API: LẤY HỒ SƠ CỦA CHÍNH MÌNH (GET ME)
// ==========================================
app.get('/api/profiles/me', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserID', sql.Int, req.user.UserID)
            .query('SELECT * FROM Profiles WHERE UserID = @UserID');
        
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]); 
        } else {
            res.status(404).json({ detail: "Chưa có hồ sơ" });
        }
    } catch (err) {
        console.error('❌ Lỗi khi lấy hồ sơ cá nhân:', err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
});

// ==========================================
// TÍNH NĂNG CHAT 1: GỬI TIN NHẮN 
// ==========================================
app.post('/api/messages', authenticateToken, async (req, res) => {
    try {
        const { ReceiverID, Content } = req.body;
        const SenderID = req.user.UserID; 
        const UserRole = req.user.Role; 

        const pool = await poolPromise; 
        
        if (UserRole !== 'Admin') {
            const checkRent = await pool.request()
                .input('User1', sql.Int, SenderID)
                .input('User2', sql.Int, ReceiverID)
                .query(`
                    SELECT TOP 1 * FROM RentRequests 
                    WHERE ((SenderID = @User1 AND ReceiverID = @User2) OR (SenderID = @User2 AND ReceiverID = @User1))
                      AND Status IN ('ACCEPTED', 'COMPLETED')
                `);
                
            if (checkRent.recordset.length === 0) {
                return res.status(403).json({ detail: "Không thể nhắn tin! Yêu cầu thuê chưa được chấp nhận." });
            }
        }

        await pool.request()
            .input('SenderID', sql.Int, SenderID)
            .input('ReceiverID', sql.Int, ReceiverID)
            .input('Content', sql.NVarChar, Content)
            .query(`
                INSERT INTO Messages (SenderID, ReceiverID, Content) 
                VALUES (@SenderID, @ReceiverID, @Content)
            `);

        res.status(201).json({ message: "Đã gửi tin nhắn" });
    } catch (err) {
        console.error("Lỗi gửi tin nhắn:", err);
        res.status(500).json({ detail: "Lỗi hệ thống khi gửi tin" });
    }
});

// ==========================================
// TÍNH NĂNG CHAT 2: LẤY LỊCH SỬ CHAT CỦA 2 NGƯỜI
// ==========================================
app.get('/api/messages/:partnerId', authenticateToken, async (req, res) => {
    try {
        const MyID = req.user.UserID;
        const PartnerID = req.params.partnerId;
        const pool = await poolPromise;

        await pool.request()
            .input('MyID', sql.Int, MyID)
            .input('PartnerID', sql.Int, PartnerID)
            .query(`
                UPDATE Messages SET IsRead = 1 
                WHERE SenderID = @PartnerID AND ReceiverID = @MyID AND IsRead = 0
            `);

        const result = await pool.request()
            .input('MyID', sql.Int, MyID)
            .input('PartnerID', sql.Int, PartnerID)
            .query(`
                SELECT * FROM Messages 
                WHERE (SenderID = @MyID AND ReceiverID = @PartnerID) 
                   OR (SenderID = @PartnerID AND ReceiverID = @MyID)
                ORDER BY SentAt ASC
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error("Lỗi lấy lịch sử chat:", err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
});

// ==========================================
// TÍNH NĂNG CHAT 3: LẤY DANH SÁCH INBOX (HỘP THƯ ĐẾN)
// ==========================================
app.get('/api/inbox', authenticateToken, async (req, res) => {
    try {
        const MyID = req.user.UserID;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('MyID', sql.Int, MyID)
            .query(`
                WITH RankedMessages AS (
                    SELECT 
                        m.*,
                        CASE WHEN SenderID = @MyID THEN ReceiverID ELSE SenderID END AS PartnerID,
                        ROW_NUMBER() OVER(
                            PARTITION BY CASE WHEN SenderID = @MyID THEN ReceiverID ELSE SenderID END 
                            ORDER BY SentAt DESC
                        ) as rn
                    FROM Messages m
                    WHERE SenderID = @MyID OR ReceiverID = @MyID
                )
                SELECT 
                    r.MessageID, r.SenderID, r.ReceiverID, r.Content, r.SentAt, r.IsRead, r.PartnerID,
                    u.Username AS PartnerName, 
                    p.Avatar AS PartnerAvatar
                FROM RankedMessages r
                JOIN Users u ON r.PartnerID = u.UserID
                LEFT JOIN Profiles p ON u.UserID = p.UserID
                WHERE rn = 1
                ORDER BY r.SentAt DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error("Lỗi tải hộp thư:", err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
});

// ==========================================
// API VÍ 1: LẤY THÔNG TIN VÍ & LỊCH SỬ GIAO DỊCH
// ==========================================
app.get('/api/wallet', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.UserID;
        const pool = await poolPromise;

        let walletRes = await pool.request()
            .input('UserID', sql.Int, userId)
            .query('SELECT Balance FROM Wallets WHERE UserID = @UserID');
        
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
        console.error('❌ Lỗi lấy thông tin ví:', err);
        res.status(500).json({ detail: "Lỗi hệ thống khi tải ví" });
    }
});

// ==========================================
// API VÍ 2: TẠO YÊU CẦU NẠP / RÚT
// ==========================================
app.post('/api/wallet/request', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.UserID;
        const { Amount, Type, PaymentMethod, PaymentDetails } = req.body; 
        const pool = await poolPromise;

        if (Amount <= 0) {
            return res.status(400).json({ detail: "Số tiền không hợp lệ!" });
        }

        if (Type === 'RUT_TIEN') {
            const walletRes = await pool.request()
                .input('UserID', sql.Int, userId)
                .query('SELECT Balance FROM Wallets WHERE UserID = @UserID');
                
            if (walletRes.recordset.length === 0 || walletRes.recordset[0].Balance < Amount) {
                return res.status(400).json({ detail: "Số dư không đủ để thực hiện lệnh rút!" });
            }
        }

        const description = `Yêu cầu ${Type === 'NAP_TIEN' ? 'Nạp' : 'Rút'} ${Amount.toLocaleString('vi-VN')} VNĐ qua ${PaymentMethod}`;

        await pool.request()
            .input('UserID', sql.Int, userId)
            .input('Type', sql.NVarChar, Type)
            .input('Amount', sql.Decimal(18,2), Amount)
            .input('PaymentMethod', sql.NVarChar, PaymentMethod || '')
            .input('PaymentDetails', sql.NVarChar, PaymentDetails || '')
            .input('Desc', sql.NVarChar, description)
            .query(`
                INSERT INTO Transactions (UserID, Type, Amount, Status, Description, PaymentMethod, PaymentDetails) 
                VALUES (@UserID, @Type, @Amount, 'PENDING', @Desc, @PaymentMethod, @PaymentDetails)
            `);

        res.status(201).json({ message: "Đã gửi yêu cầu thành công! Vui lòng chờ Admin duyệt." });
    } catch (err) {
        console.error('❌ Lỗi tạo giao dịch:', err);
        res.status(500).json({ detail: "Lỗi hệ thống khi tạo giao dịch" });
    }
});

// ==========================================
// API ADMIN 1: LẤY DANH SÁCH GIAO DỊCH CHỜ DUYỆT
// ==========================================
app.get('/api/admin/transactions/pending', authenticateToken, isAdmin, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT t.*, u.Email, u.Username 
                FROM Transactions t
                JOIN Users u ON t.UserID = u.UserID
                WHERE t.Status = 'PENDING'
                ORDER BY t.CreatedAt ASC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Lỗi lấy GD pending:', err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
});

// ==========================================
// API ADMIN 2: LẤY LỊCH SỬ GIAO DỊCH
// ==========================================
app.get('/api/admin/transactions/history', authenticateToken, isAdmin, async (req, res) => {
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
        console.error('❌ Lỗi lấy lịch sử GD:', err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
});

// ==========================================
// API ADMIN 3: XỬ LÝ GIAO DỊCH (DUYỆT / TỪ CHỐI)
// ==========================================
app.post('/api/admin/transactions/:id/process', authenticateToken, isAdmin, async (req, res) => {
    try {
        const txId = req.params.id;
        const { Action } = req.body; 
        const pool = await poolPromise;

        const txRes = await pool.request()
            .input('TxID', sql.Int, txId)
            .query("SELECT * FROM Transactions WHERE TransactionID = @TxID AND Status = 'PENDING'");
        
        if (txRes.recordset.length === 0) {
            return res.status(404).json({ detail: "Giao dịch không tồn tại hoặc đã được xử lý!" });
        }

        const tx = txRes.recordset[0];
        const newStatus = Action === 'APPROVE' ? 'SUCCESS' : 'FAILED';

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await transaction.request()
                .input('TxID', sql.Int, txId)
                .input('Status', sql.NVarChar, newStatus)
                .query("UPDATE Transactions SET Status = @Status WHERE TransactionID = @TxID");

            if (Action === 'APPROVE') {
                if (tx.Type === 'NAP_TIEN') {
                    await transaction.request()
                        .input('UserID', sql.Int, tx.UserID)
                        .input('Amount', sql.Decimal(18,2), tx.Amount)
                        .query("UPDATE Wallets SET Balance = Balance + @Amount WHERE UserID = @UserID");
                } else if (tx.Type === 'RUT_TIEN') {
                    const checkWallet = await transaction.request()
                        .input('UserID', sql.Int, tx.UserID)
                        .query("SELECT Balance FROM Wallets WHERE UserID = @UserID");
                        
                    if (checkWallet.recordset[0].Balance < tx.Amount) {
                        await transaction.rollback(); 
                        return res.status(400).json({ detail: "Số dư của User không đủ để rút!" });
                    }
                    await transaction.request()
                        .input('UserID', sql.Int, tx.UserID)
                        .input('Amount', sql.Decimal(18,2), tx.Amount)
                        .query("UPDATE Wallets SET Balance = Balance - @Amount WHERE UserID = @UserID");
                }
            }
            
            await transaction.commit(); 
            res.json({ message: `Đã ${Action === 'APPROVE' ? 'DUYỆT' : 'TỪ CHỐI'} giao dịch thành công!` });
        } catch (err) {
            await transaction.rollback(); 
            throw err;
        }
    } catch (err) {
        console.error('❌ Lỗi xử lý giao dịch:', err);
        res.status(500).json({ detail: "Lỗi hệ thống khi xử lý giao dịch" });
    }
});

// ==========================================
// TÍNH NĂNG THUÊ 1: GỬI YÊU CẦU THUÊ 
// ==========================================
app.post('/api/rent/request', authenticateToken, async (req, res) => {
    const MyID = req.user.UserID;
    const { TargetUserID, Hours } = req.body;

    if (MyID === TargetUserID) return res.status(400).json({ detail: "Không thể tự thuê mình!" });
    if (Hours <= 0) return res.status(400).json({ detail: "Số giờ không hợp lệ!" });

    try {
        const pool = await poolPromise;
        
        const profileRes = await pool.request()
            .input('TargetUserID', sql.Int, TargetUserID)
            .query('SELECT PricePerHour FROM Profiles WHERE UserID = @TargetUserID AND IsActive = 1');
        
        if (profileRes.recordset.length === 0) return res.status(404).json({ detail: "Hồ sơ không tồn tại!" });
        const totalAmount = profileRes.recordset[0].PricePerHour * Hours;

        const myWallet = await pool.request()
            .input('MyID', sql.Int, MyID)
            .query('SELECT Balance FROM Wallets WHERE UserID = @MyID');
            
        if (myWallet.recordset.length === 0 || myWallet.recordset[0].Balance < totalAmount) {
            return res.status(400).json({ detail: `Ví không đủ! Cần ${totalAmount.toLocaleString('vi-VN')}đ để gửi yêu cầu.` });
        }

        await pool.request()
            .input('SenderID', sql.Int, MyID)
            .input('ReceiverID', sql.Int, TargetUserID)
            .input('Hours', sql.Int, Hours)
            .input('TotalAmount', sql.Decimal(18,2), totalAmount)
            .query(`
                INSERT INTO RentRequests (SenderID, ReceiverID, Hours, TotalAmount, Status)
                VALUES (@SenderID, @ReceiverID, @Hours, @TotalAmount, 'PENDING')
            `);

        res.json({ message: "Đã gửi yêu cầu thành công! Vui lòng chờ đối phương xác nhận." });
    } catch (err) {
        console.error('Lỗi gửi yêu cầu:', err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
});

// ==========================================
// TÍNH NĂNG THUÊ 2: CHẤP NHẬN YÊU CẦU 
// ==========================================
app.post('/api/rent/accept/:id', authenticateToken, async (req, res) => {
    const MyID = req.user.UserID; 
    const RequestID = req.params.id;

    try {
        const pool = await poolPromise;
        const reqRes = await pool.request()
            .input('RequestID', sql.Int, RequestID)
            .input('MyID', sql.Int, MyID)
            .query("SELECT * FROM RentRequests WHERE RequestID = @RequestID AND ReceiverID = @MyID AND Status = 'PENDING'");

        if (reqRes.recordset.length === 0) return res.status(404).json({ detail: "Yêu cầu không tồn tại hoặc đã bị hủy!" });
        const rentData = reqRes.recordset[0];

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const senderWallet = await transaction.request()
                .input('SenderID', sql.Int, rentData.SenderID)
                .query("SELECT Balance FROM Wallets WHERE UserID = @SenderID");
                
            if (senderWallet.recordset[0].Balance < rentData.TotalAmount) {
                await transaction.rollback();
                return res.status(400).json({ detail: "Người thuê không còn đủ số dư để thực hiện, yêu cầu đã bị hủy!" });
            }

            await transaction.request()
                .input('SenderID', sql.Int, rentData.SenderID)
                .input('Amount', sql.Decimal(18,2), rentData.TotalAmount)
                .query("UPDATE Wallets SET Balance = Balance - @Amount WHERE UserID = @SenderID");

            await transaction.request()
                .input('RequestID', sql.Int, RequestID)
                .query("UPDATE RentRequests SET Status = 'ACCEPTED' WHERE RequestID = @RequestID");

            await transaction.commit();
            res.json({ message: "Đã chấp nhận lịch hẹn! Tính năng nhắn tin đã được mở khóa." });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Lỗi chấp nhận:', err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
});

// ==========================================
// ==========================================
// TÍNH NĂNG THUÊ 3: XÁC NHẬN ĐÃ GẶP MẶT (CHIA TIỀN 72 - 28)
// ==========================================
app.post('/api/rent/confirm-meet/:id', authenticateToken, async (req, res) => {
    const MyID = req.user.UserID;
    const RequestID = req.params.id;

    try {
        const pool = await poolPromise;
        const reqRes = await pool.request()
            .input('RequestID', sql.Int, RequestID)
            .query("SELECT * FROM RentRequests WHERE RequestID = @RequestID AND Status = 'ACCEPTED'");

        if (reqRes.recordset.length === 0) return res.status(404).json({ detail: "Lịch hẹn không hợp lệ!" });
        const rentData = reqRes.recordset[0];

        let updateQuery = "";
        if (rentData.SenderID === MyID) {
            updateQuery = "UPDATE RentRequests SET SenderMet = 1 WHERE RequestID = @RequestID";
            rentData.SenderMet = true; 
        } else if (rentData.ReceiverID === MyID) {
            updateQuery = "UPDATE RentRequests SET ReceiverMet = 1 WHERE RequestID = @RequestID";
            rentData.ReceiverMet = true;
        } else {
            return res.status(403).json({ detail: "Bạn không có quyền trong lịch hẹn này!" });
        }

        // Đánh dấu người này đã gặp
        await pool.request()
            .input('RequestID', sql.Int, RequestID)
            .query(updateQuery);

        // NẾU CẢ 2 ĐỀU ĐÃ BẤM XÁC NHẬN -> CHIA TIỀN!
        if (rentData.SenderMet && rentData.ReceiverMet) {
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                // 1. Tính toán chia chác (28% cho Admin, 72% cho người được thuê)
                const totalAmount = rentData.TotalAmount;
                const platformFee = totalAmount * 0.28; // 28%
                const receiverAmount = totalAmount - platformFee; // 72%

                // 2. Tìm ID của Admin (Lấy Admin đầu tiên trong hệ thống)
                const adminRes = await transaction.request()
                    .query("SELECT TOP 1 UserID FROM Users WHERE Role = 'Admin'");
                let adminId = 0;
                if (adminRes.recordset.length > 0) adminId = adminRes.recordset[0].UserID;

                // 3. Đổi trạng thái lịch hẹn thành HOÀN THÀNH
                await transaction.request()
                    .input('RequestID', sql.Int, RequestID)
                    .query("UPDATE RentRequests SET Status = 'COMPLETED' WHERE RequestID = @RequestID");

                // 4. Cộng 72% tiền cho người được thuê
                await transaction.request()
                    .input('ReceiverID', sql.Int, rentData.ReceiverID)
                    .input('Amount', sql.Decimal(18,2), receiverAmount)
                    .query("UPDATE Wallets SET Balance = Balance + @Amount WHERE UserID = @ReceiverID");

                await transaction.request()
                    .input('ReceiverID', sql.Int, rentData.ReceiverID)
                    .input('Amount', sql.Decimal(18,2), receiverAmount)
                    .input('Desc', sql.NVarChar, `Hoàn thành hẹn với User #${rentData.SenderID} (Đã trừ 28% phí)`)
                    .query(`
                        INSERT INTO Transactions (UserID, Type, Amount, Status, Description) 
                        VALUES (@ReceiverID, 'NHAN_TIEN', @Amount, 'SUCCESS', @Desc)
                    `);

                // 5. Cộng 28% tiền phế cho Admin
                if (adminId > 0) {
                    await transaction.request()
                        .input('AdminID', sql.Int, adminId)
                        .input('Fee', sql.Decimal(18,2), platformFee)
                        .query("UPDATE Wallets SET Balance = Balance + @Fee WHERE UserID = @AdminID");

                    await transaction.request()
                        .input('AdminID', sql.Int, adminId)
                        .input('Fee', sql.Decimal(18,2), platformFee)
                        .input('Desc', sql.NVarChar, `Thu 28% phí nền tảng từ lịch hẹn #${RequestID}`)
                        .query(`
                            INSERT INTO Transactions (UserID, Type, Amount, Status, Description) 
                            VALUES (@AdminID, 'THU_PHI', @Fee, 'SUCCESS', @Desc)
                        `);
                }

                await transaction.commit();
                return res.json({ message: "Hoàn tất hẹn hò! Tiền đã được chia và chuyển khoản." });
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        }

        res.json({ message: "Đã ghi nhận! Chờ đối phương bấm xác nhận để hoàn tất." });
    } catch (err) {
        console.error('Lỗi xác nhận gặp:', err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
});

// ==========================================
// TÍNH NĂNG THUÊ 4: LẤY DANH SÁCH LỊCH HẸN (VỚI AMISENDER) 🚀 ĐÃ THÊM
// ==========================================
app.get('/api/rent/my-requests', authenticateToken, async (req, res) => {
    const MyID = req.user.UserID;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('MyID', sql.Int, MyID)
            .query(`
                SELECT r.*,
                    s.Username AS SenderName, s.Email AS SenderEmail,
                    rc.Username AS ReceiverName, rc.Email AS ReceiverEmail,
                    CAST(CASE WHEN r.SenderID = @MyID THEN 1 ELSE 0 END AS BIT) AS AmISender
                FROM RentRequests r
                JOIN Users s ON r.SenderID = s.UserID
                JOIN Users rc ON r.ReceiverID = rc.UserID
                WHERE r.SenderID = @MyID OR r.ReceiverID = @MyID
                ORDER BY r.CreatedAt DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Lỗi tải lịch hẹn:', err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
});
// API: YÊU CẦU QUÊN MẬT KHẨU (TẠO OTP)
// ==========================================
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { Email } = req.body;
        const pool = await poolPromise;

        // 1. Kiểm tra email có tồn tại không
        const checkUser = await pool.request()
            .input('Email', sql.NVarChar, Email)
            .query('SELECT UserID FROM Users WHERE Email = @Email');

        if (checkUser.recordset.length === 0) {
            return res.status(404).json({ detail: "Email không tồn tại trong hệ thống!" });
        }

        // 2. Tạo mã OTP ngẫu nhiên 6 số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Tạo thời gian hết hạn (VD: 15 phút từ hiện tại)
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 15);

        // 3. Cập nhật mã OTP vào Database (Cần thêm cột ResetOTP và OTPExpiry vào bảng Users)
        // Nếu bạn chưa có cột này, hãy chạy lệnh ALTER TABLE Users ADD ResetOTP VARCHAR(6), OTPExpiry DATETIME;
        await pool.request()
            .input('Email', sql.NVarChar, Email)
            .input('OTP', sql.VarChar, otp)
            .input('Expiry', sql.DateTime, expiry)
            .query('UPDATE Users SET ResetOTP = @OTP, OTPExpiry = @Expiry WHERE Email = @Email');

        // 4. Trả về OTP (Trong thực tế bạn sẽ dùng Nodemailer để gửi email ở bước này)
        // Hiện tại trả về JSON để bạn dễ test trên App
        res.status(200).json({ 
            message: "Mã OTP đã được tạo (Giả lập gửi email)", 
            test_otp: otp // XÓA dòng này khi đưa lên production
        });
    } catch (err) {
        console.error('❌ Lỗi forgot-password:', err);
        res.status(500).json({ detail: "Lỗi hệ thống khi yêu cầu cấp lại mật khẩu" });
    }
});

// API: ĐẶT LẠI MẬT KHẨU MỚI (XÁC NHẬN OTP)
// ==========================================
app.post('/api/reset-password', async (req, res) => {
    try {
        const { Email, OTP, NewPassword } = req.body;
        const pool = await poolPromise;

        // 1. Kiểm tra OTP có đúng và còn hạn không
        const checkOTP = await pool.request()
            .input('Email', sql.NVarChar, Email)
            .input('OTP', sql.VarChar, OTP)
            .query('SELECT UserID FROM Users WHERE Email = @Email AND ResetOTP = @OTP AND OTPExpiry > GETDATE()');

        if (checkOTP.recordset.length === 0) {
            return res.status(400).json({ detail: "Mã OTP không hợp lệ hoặc đã hết hạn!" });
        }

        // 2. Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(NewPassword, salt);

        // 3. Cập nhật mật khẩu và xóa OTP
        await pool.request()
            .input('Email', sql.NVarChar, Email)
            .input('PasswordHash', sql.NVarChar, hashedPassword)
            .query('UPDATE Users SET PasswordHash = @PasswordHash, ResetOTP = NULL, OTPExpiry = NULL WHERE Email = @Email');

        res.status(200).json({ message: "Đặt lại mật khẩu thành công!" });
    } catch (err) {
        console.error('❌ Lỗi reset-password:', err);
        res.status(500).json({ detail: "Lỗi hệ thống khi đặt lại mật khẩu" });
    }
});

// ==========================================
// FEATURE: RATING USER (REVIEWS)
// ==========================================
// Get reviews for a profile
app.get('/api/profiles/:userId/reviews', async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('RevieweeID', sql.Int, targetUserId)
            .query(`
                SELECT r.*, u.Username AS ReviewerName, p.Avatar AS ReviewerAvatar
                FROM Reviews r
                JOIN Users u ON r.ReviewerID = u.UserID
                LEFT JOIN Profiles p ON u.UserID = p.UserID
                WHERE r.RevieweeID = @RevieweeID
                ORDER BY r.CreatedAt DESC
            `);

        const avgRes = await pool.request()
            .input('RevieweeID', sql.Int, targetUserId)
            .query(`
                SELECT AVG(CAST(Rating AS FLOAT)) as AverageRating, COUNT(*) as TotalReviews
                FROM Reviews WHERE RevieweeID = @RevieweeID
            `);

        res.json({
            summary: avgRes.recordset[0],
            reviews: result.recordset
        });
    } catch (err) {
        console.error('Review list error:', err);
        res.status(500).json({ detail: "System error when loading reviews" });
    }
});

// Create a review (only after COMPLETED rent)
app.post('/api/reviews', authenticateToken, async (req, res) => {
    try {
        const ReviewerID = req.user.UserID;
        const { RequestID, RevieweeID, Rating, Comment } = req.body;

        if (Rating < 1 || Rating > 5) {
            return res.status(400).json({ detail: "Rating must be between 1 and 5" });
        }

        const pool = await poolPromise;

        const checkRent = await pool.request()
            .input('User1', sql.Int, ReviewerID)
            .input('User2', sql.Int, RevieweeID)
            .query(`
                SELECT TOP 1 * FROM RentRequests
                WHERE ((SenderID = @User1 AND ReceiverID = @User2) OR (SenderID = @User2 AND ReceiverID = @User1))
                  AND Status = 'COMPLETED'
            `);

        if (checkRent.recordset.length === 0) {
            return res.status(403).json({ detail: "You can review only after a completed rent" });
        }

        await pool.request()
            .input('BookingID', sql.Int, RequestID || checkRent.recordset[0].RequestID)
            .input('ReviewerID', sql.Int, ReviewerID)
            .input('RevieweeID', sql.Int, RevieweeID)
            .input('Rating', sql.Int, Rating)
            .input('Comment', sql.NVarChar, Comment || '')
            .query(`
                INSERT INTO Reviews (BookingID, ReviewerID, RevieweeID, Rating, Comment)
                VALUES (@BookingID, @ReviewerID, @RevieweeID, @Rating, @Comment)
            `);

        res.status(201).json({ message: "Review submitted" });
    } catch (err) {
        console.error('Review create error:', err);
        res.status(500).json({ detail: "System error when creating review" });
    }
});

// ==========================================
// FEATURE: REPORT USER
// ==========================================
// User creates report
app.post('/api/reports', authenticateToken, async (req, res) => {
    try {
        const ReporterID = req.user.UserID;
        const { ReportedUserID, Reason, Description } = req.body;

        if (ReporterID === ReportedUserID) {
            return res.status(400).json({ detail: "Cannot report yourself" });
        }

        const pool = await poolPromise;
        await pool.request()
            .input('ReporterID', sql.Int, ReporterID)
            .input('ReportedUserID', sql.Int, ReportedUserID)
            .input('Reason', sql.NVarChar, Reason)
            .input('Description', sql.NVarChar, Description || '')
            .query(`
                INSERT INTO Reports (ReporterID, ReportedUserID, Reason, Description, Status)
                VALUES (@ReporterID, @ReportedUserID, @Reason, @Description, 'PENDING')
            `);

        res.status(201).json({ message: "Report submitted" });
    } catch (err) {
        console.error('Report create error:', err);
        res.status(500).json({ detail: "System error when creating report" });
    }
});

// Admin lists pending reports
app.get('/api/admin/reports', authenticateToken, isAdmin, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT r.*, 
                       u1.Username AS ReporterName, 
                       u2.Username AS ReportedName,
                       p2.Avatar AS ReportedAvatar
                FROM Reports r
                JOIN Users u1 ON r.ReporterID = u1.UserID
                JOIN Users u2 ON r.ReportedUserID = u2.UserID
                LEFT JOIN Profiles p2 ON u2.UserID = p2.UserID
                WHERE r.Status = 'PENDING'
                ORDER BY r.CreatedAt DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Report list error:', err);
        res.status(500).json({ detail: "System error when loading reports" });
    }
});

// Admin processes report (BAN or DISMISS)
app.post('/api/admin/reports/:id/process', authenticateToken, isAdmin, async (req, res) => {
    try {
        const reportId = req.params.id;
        const { Action, ReportedUserID } = req.body;
        const pool = await poolPromise;

        const newStatus = Action === 'BAN' ? 'RESOLVED' : 'DISMISSED';

        await pool.request()
            .input('ReportID', sql.Int, reportId)
            .input('Status', sql.NVarChar, newStatus)
            .query("UPDATE Reports SET Status = @Status WHERE ReportID = @ReportID");

        if (Action === 'BAN' && ReportedUserID) {
            await pool.request()
                .input('UserID', sql.Int, ReportedUserID)
                .query(`
                    UPDATE Profiles SET IsActive = 0 WHERE UserID = @UserID;
                    UPDATE Users SET Role = 'Banned' WHERE UserID = @UserID;
                `);
        }

        res.json({ message: Action === 'BAN' ? "User banned" : "Report dismissed" });
    } catch (err) {
        console.error('Report process error:', err);
        res.status(500).json({ detail: "System error when processing report" });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server Node.js đang chạy tại: http://127.0.0.1:${PORT}`);
});
