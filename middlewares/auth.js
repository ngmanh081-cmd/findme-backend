const jwt = require('jsonwebtoken');

// Middleware 1: Kiểm tra xem user đã đăng nhập chưa
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
        next(); // Token chuẩn -> Cho phép đi tiếp vào Controller
    });
};

// Middleware 2: Kiểm tra xem user có phải là Admin không
const isAdmin = (req, res, next) => {
    if (req.user.Role !== 'Admin') {
        return res.status(403).json({ detail: "Bạn không đủ thẩm quyền! Yêu cầu quyền Admin." });
    }
    next(); // Là Admin -> Cho phép đi tiếp
};

module.exports = { authenticateToken, isAdmin };