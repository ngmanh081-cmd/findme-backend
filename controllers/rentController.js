const { sql, poolPromise } = require('../config/db');
const { getIo, getOnlineUsers } = require('../sockets/socketManager');

// 1. Gửi yêu cầu thuê
const requestRent = async (req, res) => {
    const MyID = req.user.UserID;
    const { TargetUserID, Hours } = req.body;

    if (MyID === TargetUserID) return res.status(400).json({ detail: "Không thể tự thuê mình!" });
    if (Hours <= 0) return res.status(400).json({ detail: "Số giờ không hợp lệ!" });

    try {
        const pool = await poolPromise;
        const profileRes = await pool.request()
            .input('TargetUserID', sql.Int, TargetUserID)
            .query('SELECT PricePerHour FROM Profiles WHERE UserID = @TargetUserID AND IsActive = 1');
        
        if (profileRes.recordset.length === 0) return res.status(404).json({ detail: "Hồ sơ không tồn tại hoặc đã ẩn!" });
        const totalAmount = profileRes.recordset[0].PricePerHour * Hours;

        const myWallet = await pool.request()
            .input('MyID', sql.Int, MyID)
            .query('SELECT Balance FROM Wallets WHERE UserID = @MyID');
            
        if (myWallet.recordset.length === 0 || myWallet.recordset[0].Balance < totalAmount) {
            return res.status(400).json({ detail: `Ví không đủ! Cần ${totalAmount.toLocaleString('vi-VN')}đ.` });
        }

        const rentRes = await pool.request()
            .input('RenterID', sql.Int, MyID)
            .input('ReceiverID', sql.Int, TargetUserID)
            .input('Hours', sql.Int, Hours)
            .input('TotalAmount', sql.Decimal(18,2), totalAmount)
            .query(`
                INSERT INTO RentRequests (RenterID, ReceiverID, Hours, TotalAmount, Status)
                OUTPUT INSERTED.*
                VALUES (@RenterID, @ReceiverID, @Hours, @TotalAmount, 'PENDING')
            `);

        // Bắn Socket thông báo cho người nhận
        const onlineUsers = getOnlineUsers();
        const receiverSocketId = onlineUsers.get(TargetUserID);
        if (receiverSocketId) {
            getIo().to(receiverSocketId).emit('new_rent_request', {
                message: "Bạn có một yêu cầu thuê mới!",
                requestData: rentRes.recordset[0]
            });
        }
        res.json({ message: "Đã gửi yêu cầu thành công! Vui lòng chờ đối phương xác nhận." });
    } catch (err) {
        res.status(500).json({ detail: "Lỗi hệ thống khi gửi yêu cầu thuê" });
    }
};

// 2. Chấp nhận yêu cầu (Trừ tiền, lưu lịch sử và tạo tin nhắn tự động)
const acceptRent = async (req, res) => {
    const MyID = req.user.UserID; 
    const RequestID = req.params.id;

    try {
        const pool = await poolPromise;
        const reqRes = await pool.request()
            .input('RequestID', sql.Int, RequestID)
            .input('MyID', sql.Int, MyID)
            .query("SELECT * FROM RentRequests WHERE RequestID = @RequestID AND ReceiverID = @MyID AND Status = 'PENDING'");

        if (reqRes.recordset.length === 0) return res.status(404).json({ detail: "Yêu cầu không tồn tại!" });
        const rentData = reqRes.recordset[0];

        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            const renterWallet = await transaction.request()
                .input('RenterID', sql.Int, rentData.RenterID)
                .query("SELECT Balance FROM Wallets WHERE UserID = @RenterID");
                
            if (renterWallet.recordset.length === 0 || renterWallet.recordset[0].Balance < rentData.TotalAmount) {
                await transaction.rollback();
                return res.status(400).json({ detail: "Người thuê không còn đủ số dư!" });
            }

            // Trừ tiền trong ví người thuê
            await transaction.request()
                .input('RenterID', sql.Int, rentData.RenterID)
                .input('Amount', sql.Decimal(18,2), rentData.TotalAmount)
                .query("UPDATE Wallets SET Balance = Balance - @Amount WHERE UserID = @RenterID");

            // 🚀 BỔ SUNG: Ghi lịch sử trừ tiền cho Người Thuê
            await transaction.request()
                .input('RenterID', sql.Int, rentData.RenterID)
                .input('Amount', sql.Decimal(18,2), rentData.TotalAmount)
                .input('Desc', sql.NVarChar, `Thanh toán trước cho yêu cầu thuê #${RequestID}`)
                .query("INSERT INTO Transactions (UserID, Type, Amount, Status, Description) VALUES (@RenterID, 'THANH_TOAN', @Amount, 'SUCCESS', @Desc)");

            // Đổi trạng thái lịch hẹn
            await transaction.request()
                .input('RequestID', sql.Int, RequestID)
                .query("UPDATE RentRequests SET Status = 'ACCEPTED' WHERE RequestID = @RequestID");

            // Tạo lời chào tự động
            const greetingText = "🎉 Xin chào! Mình đã chấp nhận yêu cầu của bạn. Chúng ta bắt đầu trò chuyện nhé!";
            const msgRes = await transaction.request()
                .input('SenderID', sql.Int, MyID)
                .input('ReceiverID', sql.Int, rentData.RenterID)
                .input('Content', sql.NVarChar, greetingText)
                .query(`
                    INSERT INTO Messages (SenderID, ReceiverID, Content, IsRead) 
                    OUTPUT INSERTED.* VALUES (@SenderID, @ReceiverID, @Content, 0)
                `);

            await transaction.commit();

            // Bắn Socket thông báo tin nhắn mới
            const savedMessage = msgRes.recordset[0];
            const onlineUsers = getOnlineUsers();
            const receiverSocketId = onlineUsers.get(rentData.RenterID);
            
            if (receiverSocketId) {
                getIo().to(receiverSocketId).emit('receive_message', savedMessage);
            }

            res.json({ message: "Đã chấp nhận! Hãy kiểm tra tab Nhắn tin." });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error("Lỗi accept:", err);
        res.status(500).json({ detail: "Lỗi hệ thống khi chấp nhận" });
    }
};

// 3. Từ chối yêu cầu
const rejectRent = async (req, res) => {
    const MyID = req.user.UserID; 
    const RequestID = req.params.id;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('RequestID', sql.Int, RequestID)
            .input('MyID', sql.Int, MyID)
            .query("UPDATE RentRequests SET Status = 'REJECTED' WHERE RequestID = @RequestID AND ReceiverID = @MyID AND Status = 'PENDING'");

        if (result.rowsAffected[0] === 0) return res.status(404).json({ detail: "Không thể thực hiện!" });
        res.json({ message: "Đã từ chối yêu cầu thuê." });
    } catch (err) {
        res.status(500).json({ detail: "Lỗi hệ thống khi từ chối" });
    }
};

// 4. Xác nhận đã gặp mặt (Chia tiền và lưu lịch sử)
const confirmMeet = async (req, res) => {
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
        if (rentData.RenterID === MyID) {
            updateQuery = "UPDATE RentRequests SET RenterMet = 1 WHERE RequestID = @RequestID";
            rentData.RenterMet = true; 
        } else if (rentData.ReceiverID === MyID) {
            updateQuery = "UPDATE RentRequests SET ReceiverMet = 1 WHERE RequestID = @RequestID";
            rentData.ReceiverMet = true;
        } else {
            return res.status(403).json({ detail: "Không có quyền!" });
        }

        await pool.request().input('RequestID', sql.Int, RequestID).query(updateQuery);

        // Nếu cả hai bên đã xác nhận
        if (rentData.RenterMet && rentData.ReceiverMet) {
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                const platformFee = rentData.TotalAmount * 0.28;
                const receiverAmount = rentData.TotalAmount - platformFee;
                
                // Lấy ID của Admin để chia hoa hồng
                const adminRes = await transaction.request().query("SELECT TOP 1 UserID FROM Users WHERE Role = 'Admin'");
                const adminId = adminRes.recordset[0]?.UserID;

                await transaction.request().input('ID', sql.Int, RequestID).query("UPDATE RentRequests SET Status = 'COMPLETED' WHERE RequestID = @ID");

                // 1. Cộng tiền cho đối tác (72%)
                await transaction.request()
                    .input('ID', sql.Int, rentData.ReceiverID)
                    .input('Amt', sql.Decimal(18,2), receiverAmount)
                    .query("IF EXISTS (SELECT 1 FROM Wallets WHERE UserID = @ID) UPDATE Wallets SET Balance = Balance + @Amt WHERE UserID = @ID ELSE INSERT INTO Wallets (UserID, Balance) VALUES (@ID, @Amt)");

                // 🚀 BỔ SUNG: Ghi lịch sử nhận tiền cho Đối Tác
                await transaction.request()
                    .input('ID', sql.Int, rentData.ReceiverID)
                    .input('Amt', sql.Decimal(18,2), receiverAmount)
                    .input('Desc', sql.NVarChar, `Hoàn thành lịch hẹn #${RequestID} (Đã trừ phí)`)
                    .query("INSERT INTO Transactions (UserID, Type, Amount, Status, Description) VALUES (@ID, 'NHAN_TIEN', @Amt, 'SUCCESS', @Desc)");

                // 2. Cộng hoa hồng cho Admin (28%)
                if (adminId) {
                    await transaction.request()
                        .input('ID', sql.Int, adminId)
                        .input('Fee', sql.Decimal(18,2), platformFee)
                        .query("IF EXISTS (SELECT 1 FROM Wallets WHERE UserID = @ID) UPDATE Wallets SET Balance = Balance + @Fee WHERE UserID = @ID ELSE INSERT INTO Wallets (UserID, Balance) VALUES (@ID, @Fee)");

                    // 🚀 BỔ SUNG: Ghi lịch sử thu phí cho Admin
                    await transaction.request()
                        .input('ID', sql.Int, adminId)
                        .input('Fee', sql.Decimal(18,2), platformFee)
                        .input('Desc', sql.NVarChar, `Thu 28% phí nền tảng từ lịch hẹn #${RequestID}`)
                        .query("INSERT INTO Transactions (UserID, Type, Amount, Status, Description) VALUES (@ID, 'THU_PHI', @Fee, 'SUCCESS', @Desc)");
                }

                await transaction.commit();
                return res.json({ message: "Hoàn tất! Tiền đã được chia và lịch sử đã được lưu." });
            } catch (err) {
                await transaction.rollback();
                throw err;
            }
        }
        res.json({ message: "Đã ghi nhận! Chờ đối phương xác nhận." });
    } catch (err) {
        res.status(500).json({ detail: "Lỗi hệ thống chia tiền" });
    }
};

const getMyRequests = async (req, res) => {
    const MyID = req.user.UserID;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('MyID', sql.Int, MyID)
            .query(`
                SELECT r.*, s.Username AS RenterName, rc.Username AS ReceiverName,
                CAST(CASE WHEN r.RenterID = @MyID THEN 1 ELSE 0 END AS BIT) AS AmIRenter
                FROM RentRequests r
                JOIN Users s ON r.RenterID = s.UserID
                JOIN Users rc ON r.ReceiverID = rc.UserID
                WHERE r.RenterID = @MyID OR r.ReceiverID = @MyID
                ORDER BY r.CreatedAt DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ detail: "Lỗi tải lịch hẹn" });
    }
};

module.exports = { requestRent, acceptRent, rejectRent, confirmMeet, getMyRequests };