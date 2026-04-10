# Hướng Dẫn Chạy Dự Án Backend Node.js

## Tổng Quan
Dự án backend này được xây dựng bằng Node.js với Express.js, sử dụng SQL Server LocalDB làm cơ sở dữ liệu. Ứng dụng cung cấp API cho ứng dụng thuê người yêu với các tính năng xác thực JWT và phân quyền admin.

## Yêu Cầu Hệ Thống

### 1. Node.js và npm
- **Phiên bản yêu cầu**: Node.js >= 14.0.0
- **Cách cài đặt**:
  1. Truy cập [nodejs.org](https://nodejs.org/)
  2. Tải xuống và cài đặt phiên bản LTS (Long Term Support)
  3. Kiểm tra cài đặt:
     ```bash
     node --version
     npm --version
     ```

### 2. SQL Server LocalDB
- **Phiên bản yêu cầu**: SQL Server LocalDB (bao gồm trong SQL Server Express)
- **Cách cài đặt**:
  1. Tải SQL Server Express từ [Microsoft Download Center](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
  2. Chọn "Download now" cho SQL Server Express
  3. Chạy file cài đặt và chọn LocalDB
  4. Sau khi cài đặt, kiểm tra:
     ```bash
     sqllocaldb info
     ```

### 3. ODBC Driver 17 for SQL Server
- **Cách cài đặt**:
  1. Tải từ [Microsoft Download Center](https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
  2. Cài đặt ODBC Driver 17 for SQL Server
  3. Khởi động lại máy nếu cần

### 4. Cơ Sở Dữ Liệu
- **Tên database**: RentApp
- **Cách tạo database**:
  1. Mở SQL Server Management Studio (SSMS)
  2. Kết nối đến `(localdb)\MSSQLLocalDB`
  3. Tạo database mới tên `RentApp`
  4. Chạy script tạo bảng (nếu có) từ file SQL trong dự án

## Cài Đặt Dự Án

### Bước 1: Clone hoặc tải dự án
```bash
# Nếu sử dụng Git
git clone <repository-url>
cd back-end-nodejs
```

### Bước 2: Cài đặt dependencies
```bash
npm install
```

Lệnh này sẽ cài đặt tất cả các package cần thiết từ `package.json`:
- `express`: Framework web
- `mssql` & `msnodesqlv8`: Kết nối SQL Server
- `bcryptjs`: Mã hóa mật khẩu
- `jsonwebtoken`: Xác thực JWT
- `cors`: Cross-Origin Resource Sharing
- `dotenv`: Quản lý biến môi trường
- `nodemon`: Công cụ phát triển (dev dependency)

### Bước 3: Cấu hình môi trường
1. Đảm bảo file `.env` tồn tại trong thư mục gốc với nội dung:
   ```env
   # Cấu hình SQL Server
   DB_SERVER=localhost
   DB_INSTANCE=MSSQLLocalDB
   DB_NAME=RentApp

   # Khóa bảo mật JWT
   SECRET_KEY=mot_chuoi_bi_mat_cuc_ky_kho_doan_cho_du_an_thue_nguoi_yeu
   PORT=8000
   ```

2. **Lưu ý quan trọng**: 
   - Khóa `SECRET_KEY` nên được thay đổi trong môi trường production
   - Đảm bảo database `RentApp` đã được tạo và có thể truy cập

## Chạy Dự Án

### Chế độ Production
```bash
npm start
```
Server sẽ chạy trên cổng 8000 (hoặc cổng được cấu hình trong `.env`)

### Chế độ Phát Triển
```bash
npm run dev
```
Sử dụng nodemon để tự động restart server khi có thay đổi file.

### Kiểm tra server
Sau khi chạy, truy cập:
- **URL**: `http://localhost:8000`
- **API Documentation**: Kiểm tra các endpoint trong `server.js`

## Cấu Trúc Dự Án

```
back-end-nodejs/
├── server.js          # File chính của server Express
├── db.js             # Cấu hình kết nối database
├── package.json      # Thông tin dự án và dependencies
├── .env              # Biến môi trường (không commit vào Git)
└── README.md         # Tài liệu này
```

## API Endpoints Chính

Dự án cung cấp các API sau (kiểm tra `server.js` để biết chi tiết):

### Xác thực
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký

### Người dùng (yêu cầu JWT token)
- `GET /api/users` - Lấy danh sách người dùng (Admin)
- `PUT /api/users/:id` - Cập nhật thông tin người dùng

### Các endpoint khác...
*(Thêm chi tiết từ server.js)*

## Xử Lý Lỗi Thường Gặp

### 1. Lỗi kết nối database
```
❌ Lỗi kết nối Database: ...
```
**Giải pháp**:
- Kiểm tra SQL Server LocalDB có chạy: `sqllocaldb start MSSQLLocalDB`
- Đảm bảo database `RentApp` tồn tại
- Kiểm tra ODBC Driver đã cài đặt

### 2. Lỗi port đã được sử dụng
```
Error: listen EADDRINUSE: address already in use :::8000
```
**Giải pháp**:
- Thay đổi PORT trong `.env`
- Hoặc dừng process đang sử dụng port 8000

### 3. Lỗi thiếu dependencies
```
Error: Cannot find module 'express'
```
**Giải pháp**:
```bash
npm install
```

## Bảo Mật

- **JWT Secret**: Thay đổi `SECRET_KEY` trong production
- **CORS**: Hiện tại cho phép tất cả origins (`*`), nên giới hạn trong production
- **Password Hashing**: Sử dụng bcryptjs
- **SQL Injection**: Sử dụng parameterized queries

## Phát Triển Thêm

### Thêm endpoint mới
1. Thêm route trong `server.js`
2. Sử dụng middleware `authenticateToken` cho protected routes
3. Sử dụng `isAdmin` cho admin-only routes

### Thêm dependencies
```bash
npm install <package-name>
```

### Debug
- Sử dụng `console.log()` để debug
- Kiểm tra logs trong terminal
- Sử dụng Postman để test API

## Hỗ Trợ

Nếu gặp vấn đề:
1. Kiểm tra logs lỗi trong terminal
2. Đảm bảo tất cả yêu cầu hệ thống đã được cài đặt
3. Kiểm tra cấu hình trong `.env`
4. Tham khảo tài liệu Node.js và Express.js

---

**Lưu ý**: Tài liệu này được tạo tự động. Vui lòng cập nhật nếu có thay đổi trong dự án.