const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

// Khởi tạo Express và HTTP Server
const app = express();
const server = http.createServer(app);

// ==========================================
// 1. CẤU HÌNH MIDDLEWARE CƠ BẢN
// ==========================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Bật CORS để Flutter App gọi API không bị chặn
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Mở cửa thư mục 'uploads' để public ảnh ra bên ngoài internet
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 2. KHỞI TẠO SOCKET.IO (Real-time)
// ==========================================
const { initSocket } = require('./sockets/socketManager');
initSocket(server);

// ==========================================
// 3. IMPORT CÁC ROUTER TỪ THƯ MỤC /routes
// ==========================================
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const rentRoutes = require('./routes/rentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const walletRoutes = require('./routes/walletRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const publicRoutes = require('./routes/publicRoutes');

// ==========================================
// 4. GẮN ROUTER VÀO HỆ THỐNG
// ==========================================
// Các chức năng cốt lõi
app.use('/api', authRoutes);               // Đăng nhập, Đăng ký, Quên MK
app.use('/api/profiles', profileRoutes); 
app.use('/api/profile', profileRoutes);  // Quản lý Hồ sơ, Up ảnh, Dịch vụ cá nhân
app.use('/api/rent', rentRoutes);          // Thuê, Nhận/Từ chối, Gặp mặt
app.use('/api/messages', chatRoutes);      // Gửi tin nhắn, Lịch sử chat, Inbox
app.use('/api/wallet', walletRoutes);      // Xem số dư, Nạp/Rút tiền

// Chức năng nâng cao & Quản trị
app.use('/api/admin', adminRoutes);        // Các quyền tối cao của Admin
app.use('/api', reviewRoutes);             // Viết đánh giá, Xem đánh giá
app.use('/api', publicRoutes);             // Xem danh mục dịch vụ public, Gửi báo cáo

// Route Test Server (Kiểm tra xem server sống không)
app.get('/', (req, res) => {
    res.json({ message: "Backend FindMe (RESTful API) đang hoạt động siêu tốc! 🚀" });
});

// ==========================================
// 5. LẮNG NGHE KẾT NỐI
// ==========================================
const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`🚀 API SERVER ĐANG CHẠY TẠI: http://127.0.0.1:${PORT}`);
    console.log(`🔌 Cổng Socket.io cũng đã sẵn sàng lắng nghe!`);
    console.log(`=================================================`);
});