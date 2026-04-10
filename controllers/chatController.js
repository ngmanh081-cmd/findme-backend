const { sql, poolPromise } = require('../config/db');
const { getIo, getOnlineUsers } = require('../sockets/socketManager');

const sendMessage = async (req, res) => {
    try {
        const { ReceiverID, Content } = req.body;
        const SenderID = req.user.UserID; 
        const pool = await poolPromise; 

        // Lưu vào DB
        const insertRes = await pool.request()
            .input('SenderID', sql.Int, SenderID)
            .input('ReceiverID', sql.Int, ReceiverID)
            .input('Content', sql.NVarChar, Content)
            .query("INSERT INTO Messages (SenderID, ReceiverID, Content) OUTPUT INSERTED.* VALUES (@SenderID, @ReceiverID, @Content)");
            
        const savedMessage = insertRes.recordset[0];

        // Bắn Socket sang máy người nhận
        const receiverSocketId = getOnlineUsers().get(parseInt(ReceiverID));
        if (receiverSocketId) {
            getIo().to(receiverSocketId).emit('receive_message', savedMessage);
        }

        res.status(201).json({ message: "Đã gửi", data: savedMessage });
    } catch (err) {
        res.status(500).json({ detail: "Lỗi hệ thống khi nhắn tin" });
    }
};

const getChatHistory = async (req, res) => {
    try {
        const MyID = req.user.UserID;
        const PartnerID = req.params.partnerId;
        const pool = await poolPromise;

        await pool.request().input('MyID', sql.Int, MyID).input('PartnerID', sql.Int, PartnerID)
            .query("UPDATE Messages SET IsRead = 1 WHERE SenderID = @PartnerID AND ReceiverID = @MyID AND IsRead = 0");

        const result = await pool.request().input('MyID', sql.Int, MyID).input('PartnerID', sql.Int, PartnerID)
            .query("SELECT * FROM Messages WHERE (SenderID = @MyID AND ReceiverID = @PartnerID) OR (SenderID = @PartnerID AND ReceiverID = @MyID) ORDER BY SentAt ASC");

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ detail: "Lỗi lấy lịch sử chat" });
    }
};

const getInbox = async (req, res) => {
    try {
        const MyID = req.user.UserID;
        const pool = await poolPromise;
        const result = await pool.request().input('MyID', sql.Int, MyID)
            .query(`
                WITH RankedMessages AS (
                    SELECT m.*, CASE WHEN SenderID = @MyID THEN ReceiverID ELSE SenderID END AS PartnerID,
                    ROW_NUMBER() OVER(PARTITION BY CASE WHEN SenderID = @MyID THEN ReceiverID ELSE SenderID END ORDER BY SentAt DESC) as rn
                    FROM Messages m WHERE SenderID = @MyID OR ReceiverID = @MyID
                )
                SELECT r.*, u.Username AS PartnerName, p.Avatar AS PartnerAvatar
                FROM RankedMessages r JOIN Users u ON r.PartnerID = u.UserID
                LEFT JOIN Profiles p ON u.UserID = p.UserID WHERE rn = 1 ORDER BY r.SentAt DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ detail: "Lỗi tải hộp thư" });
    }
};

module.exports = { sendMessage, getChatHistory, getInbox };