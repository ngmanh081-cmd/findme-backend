// File: controllers/profileController.js
const { sql, poolPromise } = require('../config/db');

// 1. LẤY TẤT CẢ HỒ SƠ ĐANG MỞ CHO THUÊ
const getAllProfiles = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT p.*, u.Username 
                FROM Profiles p
                JOIN Users u ON p.UserID = u.UserID
                WHERE p.IsActive = 1
                ORDER BY p.CreatedAt DESC
            `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('❌ Lỗi lấy danh sách hồ sơ:', err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
};

// 2. LẤY HỒ SƠ CỦA CHÍNH MÌNH
const getMyProfile = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserID', sql.Int, req.user.UserID)
            .query(`
                SELECT p.*, u.Username, u.Email 
                FROM Profiles p
                JOIN Users u ON p.UserID = u.UserID
                WHERE p.UserID = @UserID
            `);
        
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]); 
        } else {
            res.status(404).json({ detail: "Chưa có hồ sơ" });
        }
    } catch (err) {
        console.error('❌ Lỗi khi lấy hồ sơ cá nhân:', err);
        res.status(500).json({ detail: "Lỗi hệ thống" });
    }
};

// 3. TẠO HOẶC CẬP NHẬT HỒ SƠ
const createOrUpdateProfile = async (req, res) => {
    try {
        const { Username, Bio, PricePerHour, Gender, ImageGallery, Avatar, Hobbies, IsActive } = req.body;
        const userId = req.user.UserID; 
        const pool = await poolPromise;

        const checkBan = await pool.request()
            .input('UserID', sql.Int, userId)
            .query("SELECT Role FROM Users WHERE UserID = @UserID");
            
        if (checkBan.recordset.length > 0 && checkBan.recordset[0].Role === 'Banned') {
            return res.status(403).json({ detail: "Tài khoản đã bị khóa vĩnh viễn!" });
        }

        if (Username && Username.trim() !== '') {
            await pool.request()
                .input('UserID', sql.Int, userId)
                .input('Username', sql.NVarChar, Username.trim())
                .query('UPDATE Users SET Username = @Username WHERE UserID = @UserID');
        }

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
};

// 4. UPLOAD ẢNH ĐẠI DIỆN
const uploadAvatar = async (req, res) => {
    try {
        console.log("📸 Bắt được file từ Flutter:", req.file);
        if (!req.file) return res.status(400).json({ detail: "Vui lòng chọn một bức ảnh!" });

        const userId = req.user.UserID; 
        const fileUrl = '/uploads/' + req.file.filename;
        const pool = await poolPromise;

        const updateResult = await pool.request()
            .input('Avatar', sql.NVarChar, fileUrl)
            .input('UserID', sql.Int, userId)
            .query('UPDATE Profiles SET Avatar = @Avatar WHERE UserID = @UserID');

        if (updateResult.rowsAffected[0] === 0) {
            await pool.request()
                .input('UserID', sql.Int, userId)
                .input('Avatar', sql.NVarChar, fileUrl)
                .input('Bio', sql.NVarChar, '')
                .input('PricePerHour', sql.Decimal(18, 2), 0)
                .input('Gender', sql.NVarChar, 'Khác')
                .input('ImageGallery', sql.NVarChar, '[]')
                .input('Hobbies', sql.NVarChar, '[]')
                .query(`
                    INSERT INTO Profiles (UserID, Avatar, Bio, PricePerHour, Gender, ImageGallery, Hobbies, IsActive) 
                    VALUES (@UserID, @Avatar, @Bio, @PricePerHour, @Gender, @ImageGallery, @Hobbies, 1)
                `);
        }

        res.status(200).json({ message: "Tải ảnh đại diện thành công!", avatarUrl: fileUrl });
    } catch (err) {
        console.error('❌ Lỗi upload file:', err);
        res.status(500).json({ detail: "Lỗi hệ thống khi tải file" });
    }
};

// 5. QUẢN LÝ DỊCH VỤ CỦA HỒ SƠ
const getMyServices = async (req, res) => {
    try {
        const pool = await poolPromise;
        const profileRes = await pool.request().input('UserID', sql.Int, req.user.UserID).query('SELECT ProfileID FROM Profiles WHERE UserID = @UserID');
        if (profileRes.recordset.length === 0) return res.json([]);
        
        const result = await pool.request()
            .input('ProfileID', sql.Int, profileRes.recordset[0].ProfileID)
            .query(`
                SELECT ps.ProfileServiceID, ps.CustomPricePerHour, ps.Description, c.CategoryName, c.IconUrl
                FROM ProfileServices ps
                JOIN Categories c ON ps.CategoryID = c.CategoryID
                WHERE ps.ProfileID = @ProfileID
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ detail: "Lỗi hệ thống" }); }
};

const addService = async (req, res) => {
    try {
        const { CategoryID, CustomPricePerHour, Description } = req.body;
        const pool = await poolPromise;
        const profileRes = await pool.request().input('UserID', sql.Int, req.user.UserID).query('SELECT ProfileID FROM Profiles WHERE UserID = @UserID');
        
        if (profileRes.recordset.length === 0) return res.status(404).json({ detail: "Vui lòng tạo hồ sơ cơ bản trước!" });
        const profileId = profileRes.recordset[0].ProfileID;

        const checkExist = await pool.request()
            .input('ProfileID', sql.Int, profileId).input('CategoryID', sql.Int, CategoryID)
            .query('SELECT * FROM ProfileServices WHERE ProfileID = @ProfileID AND CategoryID = @CategoryID');
            
        if (checkExist.recordset.length > 0) return res.status(400).json({ detail: "Bạn đã thêm dịch vụ này rồi!" });

        await pool.request()
            .input('ProfileID', sql.Int, profileId).input('CategoryID', sql.Int, CategoryID)
            .input('CustomPricePerHour', sql.Decimal(18,2), CustomPricePerHour)
            .input('Description', sql.NVarChar, Description || '')
            .query(`INSERT INTO ProfileServices (ProfileID, CategoryID, CustomPricePerHour, Description) VALUES (@ProfileID, @CategoryID, @CustomPricePerHour, @Description)`);
            
        res.status(201).json({ message: "Thêm dịch vụ thành công!" });
    } catch (err) { res.status(500).json({ detail: "Lỗi hệ thống" }); }
};

const deleteService = async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('ProfileServiceID', sql.Int, req.params.serviceId).query('DELETE FROM ProfileServices WHERE ProfileServiceID = @ProfileServiceID');
        res.json({ message: "Đã xóa dịch vụ!" });
    } catch (err) { res.status(500).json({ detail: "Lỗi hệ thống" }); }
};

const getPublicServices = async (req, res) => {
    try {
        const pool = await poolPromise;
        const profileRes = await pool.request().input('UserID', sql.Int, req.params.userId).query('SELECT ProfileID FROM Profiles WHERE UserID = @UserID');
        if (profileRes.recordset.length === 0) return res.json([]);

        const result = await pool.request()
            .input('ProfileID', sql.Int, profileRes.recordset[0].ProfileID)
            .query(`
                SELECT ps.CustomPricePerHour, ps.Description, c.CategoryName 
                FROM ProfileServices ps
                JOIN Categories c ON ps.CategoryID = c.CategoryID
                WHERE ps.ProfileID = @ProfileID AND c.IsActive = 1
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ detail: "Lỗi hệ thống" }); }
};

module.exports = {
    getAllProfiles, getMyProfile, createOrUpdateProfile, uploadAvatar,
    getMyServices, addService, deleteService, getPublicServices
};