// File: controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../config/db'); // Đường dẫn tới DB của bạn

// Hàm xử lý Đăng ký
const registerUser = async (req, res) => {
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
};

// Hàm xử lý Đăng nhập
const loginUser = async (req, res) => {
    try {
        const { Email, Password } = req.body;
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('Email', sql.NVarChar, Email)
            .query('SELECT * FROM Users WHERE Email = @Email');

        if (result.recordset.length === 0) {
            return res.status(404).json({ detail: "Không tìm thấy tài khoản" });
        }

        const user = result.recordset[0];
        
        if (user.Role === 'Banned') {
            return res.status(403).json({ detail: "Tài khoản của bạn đã bị khóa vĩnh viễn!" });
        }

        const match = await bcrypt.compare(Password, user.PasswordHash);
        if (!match) {
            return res.status(401).json({ detail: "Mật khẩu không đúng" });
        }

        const accessToken = jwt.sign(
            { UserID: user.UserID, Email: user.Email, Role: user.Role }, 
            process.env.JWT_SECRET || 'BiMatCuaBan', 
            { expiresIn: '10h' }
        );
        
        res.json({ access_token: accessToken, role: user.Role });
    } catch (err) {
        console.error("Lỗi đăng nhập:", err);
        res.status(500).json({ detail: "Lỗi Server" });
    }
};

// Xuất các hàm ra để Router dùng
module.exports = { registerUser, loginUser };