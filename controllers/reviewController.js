const { sql, poolPromise } = require('../config/db');

// Khách xem danh sách đánh giá của một Profile
const getProfileReviews = async (req, res) => {
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
            .query(`SELECT AVG(CAST(Rating AS FLOAT)) as AverageRating, COUNT(*) as TotalReviews FROM Reviews WHERE RevieweeID = @RevieweeID`);
                    
        res.json({ summary: avgRes.recordset[0], reviews: result.recordset });
    } catch (err) {
        res.status(500).json({ detail: "Lỗi hệ thống khi tải đánh giá" });
    }
};

// Khách hàng gửi đánh giá sau khi thuê xong
const createReview = async (req, res) => {
    try {
        const ReviewerID = req.user.UserID;
        const { RequestID, RevieweeID, Rating, Comment } = req.body;
        
        if (Rating < 1 || Rating > 5) return res.status(400).json({ detail: "Điểm đánh giá phải từ 1 đến 5 sao!" });

        const pool = await poolPromise;

        // Check xem đã từng hoàn thành lịch hẹn chưa
        const checkRent = await pool.request()
            .input('User1', sql.Int, ReviewerID)
            .input('User2', sql.Int, RevieweeID)
            .query(`
                SELECT TOP 1 * FROM RentRequests 
                WHERE ((RenterID = @User1 AND ReceiverID = @User2) OR (RenterID = @User2 AND ReceiverID = @User1))
                AND Status = 'COMPLETED'
            `);

        if (checkRent.recordset.length === 0) return res.status(403).json({ detail: "Bạn chỉ có thể đánh giá sau khi hoàn thành lịch thuê!" });

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

        res.status(201).json({ message: "Cảm ơn bạn đã gửi đánh giá!" });
    } catch (err) {
        res.status(500).json({ detail: "Lỗi hệ thống khi gửi đánh giá" });
    }
};

module.exports = { getProfileReviews, createReview };