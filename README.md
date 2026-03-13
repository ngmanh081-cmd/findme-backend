# FindMe Backend - Node.js API

Day la he thong Backend API cho ung dung FindMe, duoc xay dung bang Node.js va Express.js. He thong cung cap cac chuc nang xac thuc nguoi dung, quan ly ho so va xu ly logic cho cac yeu cau thue ban be.

## Cong nghe su dung
* Môi trường chạy: Node.js
* Framework: Express.js
* Cơ sở dữ liệu: SQL Server (mssql)
* Bảo mật: bcrypt (mã hóa mật khẩu)

## Yeu cau he thong
* Node.js (phiên bản 16.x trở lên)
* SQL Server (hoặc SQL Server Express)
* Git

## Huong dan cai dat va khoi chay

### 1. Thiet lap co so du lieu
1. Mở SQL Server Management Studio (SSMS).
2. Tạo một cơ sở dữ liệu mới (ví dụ: FindMeDB).
3. Mở file `database.sql` (được đính kèm trong mã nguồn) và chạy toàn bộ lệnh để tạo các bảng cần thiết (Users, Requests,...).

### 2. Cai dat ma nguon
Mở terminal và chạy các lệnh sau để tải dự án và cài đặt thư viện:

```bash
git clone [https://github.com/ngmanh081-cmd/findme-backend.git](https://github.com/ngmanh081-cmd/findme-backend.git)
cd findme-backend
npm install
3. Cau hinh moi truong
Sao chép file .env.example và đổi tên bản sao thành .env.

Mở file .env và cập nhật thông tin kết nối cơ sở dữ liệu của bạn:

Đoạn mã
PORT=8000
DB_USER=ten_dang_nhap_sql
DB_PASSWORD=mat_khau_sql
DB_SERVER=localhost
DB_NAME=FindMeDB
4. Khoi chay Server
Chạy lệnh sau để khởi động máy chủ:

Bash
npm start
Server sẽ chạy tại địa chỉ: http://localhost:8000 hoặc http://127.0.0.1:8000.
