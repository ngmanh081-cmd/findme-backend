# Hướng dẫn test toàn bộ API bằng Postman

Tài liệu này dùng cho source trong thư mục `findme-backend`.

## 1. Chuẩn bị trước khi test

### 1.1. Database

1. Tạo database `FindMeDB`.
2. Chạy file `database.sql`.
3. Do `server.js` có thêm API cho `Categories` và `ProfileServices` nhưng `database.sql` hiện chưa tạo 2 bảng này, nếu muốn test toàn bộ API thì chạy thêm SQL sau:

```sql
CREATE TABLE Categories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL,
    IconUrl NVARCHAR(500) NULL,
    IsActive BIT DEFAULT 1
);
GO

CREATE TABLE ProfileServices (
    ProfileServiceID INT IDENTITY(1,1) PRIMARY KEY,
    ProfileID INT NOT NULL,
    CategoryID INT NOT NULL,
    CustomPricePerHour DECIMAL(18,2) NOT NULL,
    Description NVARCHAR(500) NULL,
    CONSTRAINT FK_ProfileServices_Profiles FOREIGN KEY (ProfileID) REFERENCES Profiles(ProfileID),
    CONSTRAINT FK_ProfileServices_Categories FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID),
    CONSTRAINT UQ_ProfileServices UNIQUE (ProfileID, CategoryID)
);
GO
```

### 1.2. File `.env`

File `.env` hiện tại đang có:

```env
DB_SERVER=localhost
DB_INSTANCE=SQLEXPRESS
DB_NAME=FindMeDB
SECRET_KEY=...
PORT=8000
```

Lưu ý:

- Code đang đọc `JWT_SECRET`, không phải `SECRET_KEY`.
- Nếu không sửa, server vẫn chạy nhưng sẽ dùng secret mặc định là `BiMatCuaBan`.

Nên sửa thành:

```env
DB_SERVER=localhost
DB_INSTANCE=SQLEXPRESS
DB_NAME=FindMeDB
JWT_SECRET=mot_chuoi_bi_mat_cuc_ky_kho_doan_cho_du_an_findme
PORT=8000
```

### 1.3. Chạy server

```bash
npm install
npm start
```

Base URL để test:

```text
http://127.0.0.1:8000
```

## 2. Tạo Environment trong Postman

Tạo environment tên ví dụ `FindMe Local` với các biến:

| Variable | Value gợi ý |
| --- | --- |
| `base_url` | `http://127.0.0.1:8000` |
| `admin_email` | `admin_findme@test.com` |
| `admin_password` | `123456` |
| `user_a_email` | `usera_findme@test.com` |
| `user_a_password` | `123456` |
| `user_b_email` | `userb_findme@test.com` |
| `user_b_password` | `123456` |
| `admin_token` | để trống |
| `user_a_token` | để trống |
| `user_b_token` | để trống |
| `user_a_id` | để trống |
| `user_b_id` | để trống |
| `user_a_profile_id` | để trống |
| `user_b_profile_id` | để trống |
| `pending_tx_id` | để trống |
| `rent_request_id` | để trống |
| `report_id` | để trống |
| `category_id` | để trống |
| `profile_service_id` | để trống |
| `reset_otp` | để trống |

## 3. Header dùng chung

API có body JSON:

```http
Content-Type: application/json
```

API cần đăng nhập:

```http
Authorization: Bearer {{user_a_token}}
```

Đổi `user_a_token` thành `user_b_token` hoặc `admin_token` tùy request.

## 4. Lưu ý rất quan trọng khi test

- Hãy gọi `GET /api/wallet` ít nhất 1 lần cho từng tài khoản `admin`, `user_a`, `user_b` ngay sau khi login để tạo dòng ví trong bảng `Wallets`.
- Nếu bỏ qua bước trên, một số API như duyệt thuê hoặc chia tiền sau khi gặp có thể lỗi hoặc không cộng tiền đúng.
- `POST /api/register` cho phép truyền `Role`, nên bạn có thể tạo luôn tài khoản admin để test local.
- `GET /api/profiles` chỉ trả về profile có `IsActive = 1`.
- Chat chỉ hoạt động khi 2 người đã có `RentRequests.Status` là `ACCEPTED` hoặc `COMPLETED`, trừ admin.
- Review chỉ tạo được sau khi lịch thuê đã `COMPLETED`.
- API báo cáo `BAN` sẽ khóa user bị báo cáo bằng cách đổi `Users.Role = 'Banned'` và `Profiles.IsActive = 0`, nên nên test ở cuối.

## 5. Thứ tự test end-to-end khuyến nghị

## 5.1. Kiểm tra server

### `GET {{base_url}}/`

Kỳ vọng:

- `200 OK`
- Có message backend đang hoạt động.

## 5.2. Đăng ký tài khoản

### 1. Register admin

`POST {{base_url}}/api/register`

```json
{
  "Username": "admin_findme",
  "Email": "{{admin_email}}",
  "Password": "{{admin_password}}",
  "Role": "Admin"
}
```

### 2. Register user A

`POST {{base_url}}/api/register`

```json
{
  "Username": "user_a",
  "Email": "{{user_a_email}}",
  "Password": "{{user_a_password}}",
  "Role": "User"
}
```

### 3. Register user B

`POST {{base_url}}/api/register`

```json
{
  "Username": "user_b",
  "Email": "{{user_b_email}}",
  "Password": "{{user_b_password}}",
  "Role": "User"
}
```

Kỳ vọng:

- `201 Created`
- Response có `message`.

Test lỗi nhanh:

- Dùng lại email cũ sẽ trả `400`.

## 5.3. Đăng nhập và lưu token

### 1. Login admin

`POST {{base_url}}/api/login`

```json
{
  "Email": "{{admin_email}}",
  "Password": "{{admin_password}}"
}
```

Trong tab `Tests` của Postman:

```javascript
const data = pm.response.json();
pm.environment.set("admin_token", data.access_token);
```

### 2. Login user A

```javascript
const data = pm.response.json();
pm.environment.set("user_a_token", data.access_token);
```

### 3. Login user B

```javascript
const data = pm.response.json();
pm.environment.set("user_b_token", data.access_token);
```

Kỳ vọng:

- `200 OK`
- Có `access_token`
- Có `role`

Test lỗi nhanh:

- Sai mật khẩu: `401`
- Email không tồn tại: `404`

## 5.4. Khởi tạo ví cho cả 3 tài khoản

Gọi 3 lần:

- `GET {{base_url}}/api/wallet` với `admin_token`
- `GET {{base_url}}/api/wallet` với `user_a_token`
- `GET {{base_url}}/api/wallet` với `user_b_token`

Kỳ vọng:

- `200 OK`
- Có `balance`
- Có `transactions`

## 5.5. Nạp tiền cho user A để đủ tiền thuê

### 1. User A tạo yêu cầu nạp tiền

`POST {{base_url}}/api/wallet/request`

Header:

```http
Authorization: Bearer {{user_a_token}}
Content-Type: application/json
```

Body:

```json
{
  "Type": "NAP_TIEN",
  "Amount": 500000,
  "PaymentMethod": "Ngân hàng",
  "PaymentDetails": "VCB - 123456789"
}
```

Kỳ vọng:

- `201 Created`

### 2. Admin lấy danh sách giao dịch chờ duyệt

`GET {{base_url}}/api/admin/transactions/pending`

Header:

```http
Authorization: Bearer {{admin_token}}
```

Copy `TransactionID` của giao dịch vừa tạo và lưu vào `pending_tx_id`.

### 3. Admin duyệt giao dịch

`POST {{base_url}}/api/admin/transactions/{{pending_tx_id}}/process`

```json
{
  "Action": "APPROVE"
}
```

Kỳ vọng:

- `200 OK`
- User A được cộng tiền vào ví

### 4. User A kiểm tra lại ví

`GET {{base_url}}/api/wallet`

Kỳ vọng:

- `balance` tăng lên
- Có transaction `NAP_TIEN`

Test lỗi nhanh:

- Tạo rút tiền lớn hơn số dư bằng `Type = RUT_TIEN` sẽ trả `400`.
- Admin gửi `Action = REJECT` để test nhánh từ chối.

## 5.6. Tạo profile cho user A và user B

### 1. User A tạo profile

`POST {{base_url}}/api/profiles`

```json
{
  "Bio": "Mình thích đi cà phê và xem phim.",
  "PricePerHour": 100000,
  "Gender": "Nam",
  "ImageGallery": [],
  "Avatar": "",
  "Hobbies": ["Cafe", "Movie"],
  "IsActive": true
}
```

### 2. User B tạo profile

`POST {{base_url}}/api/profiles`

```json
{
  "Bio": "Có thể đi ăn, đi chơi, trò chuyện.",
  "PricePerHour": 120000,
  "Gender": "Nữ",
  "ImageGallery": [],
  "Avatar": "",
  "Hobbies": ["Travel", "Music"],
  "IsActive": true
}
```

Kỳ vọng:

- Lần đầu: `201 Created`
- Gọi lại với body mới: `200 OK` và là update

### 3. Lấy profile của chính mình để lưu ID

`GET {{base_url}}/api/profiles/me`

Với `user_a_token`, tab `Tests`:

```javascript
const data = pm.response.json();
pm.environment.set("user_a_id", data.UserID);
pm.environment.set("user_a_profile_id", data.ProfileID);
```

Với `user_b_token`, tab `Tests`:

```javascript
const data = pm.response.json();
pm.environment.set("user_b_id", data.UserID);
pm.environment.set("user_b_profile_id", data.ProfileID);
```

### 4. Lấy danh sách profile public

`GET {{base_url}}/api/profiles`

Kỳ vọng:

- Trả về danh sách profile đang active
- Có thể nhìn thấy `UserID`, `ProfileID`, `PricePerHour`, `Bio`

## 5.7. Luồng thuê người yêu

### 1. User A gửi yêu cầu thuê user B

`POST {{base_url}}/api/rent/request`

```json
{
  "TargetUserID": {{user_b_id}},
  "Hours": 2
}
```

Kỳ vọng:

- `200 OK`
- Tổng tiền bị kiểm tra theo `PricePerHour * Hours`

Test lỗi nhanh:

- `TargetUserID` là chính mình: `400`
- `Hours <= 0`: `400`
- Ví không đủ tiền: `400`
- User B chưa có profile active: `404`

### 2. User B xem danh sách yêu cầu thuê

`GET {{base_url}}/api/rent/my-requests`

Copy `RequestID` mới nhất vào `rent_request_id`.

### 3. Test chặn chat trước khi accept

`POST {{base_url}}/api/messages`

```json
{
  "ReceiverID": {{user_b_id}},
  "Content": "Chào bạn, mình vừa gửi yêu cầu thuê."
}
```

Kỳ vọng:

- Trước khi accept: `403`

### 4. User B accept yêu cầu

`POST {{base_url}}/api/rent/accept/{{rent_request_id}}`

Không cần body.

Kỳ vọng:

- `200 OK`
- Ví user A bị trừ tiền ngay khi accept
- Request chuyển sang `ACCEPTED`

### 5. Cả hai bên xem lại lịch hẹn

`GET {{base_url}}/api/rent/my-requests`

Kỳ vọng:

- `Status = ACCEPTED`
- Có `SenderMet`, `ReceiverMet`, `AmISender`

## 5.8. Test chat

### 1. User A gửi tin nhắn cho user B

`POST {{base_url}}/api/messages`

```json
{
  "ReceiverID": {{user_b_id}},
  "Content": "Chào bạn, tối nay mình gặp nhé."
}
```

### 2. User B gửi lại tin nhắn

`POST {{base_url}}/api/messages`

```json
{
  "ReceiverID": {{user_a_id}},
  "Content": "Ok bạn nhé."
}
```

### 3. Lấy lịch sử chat

`GET {{base_url}}/api/messages/{{user_b_id}}`

Kỳ vọng:

- Danh sách message tăng dần theo `SentAt`
- Tin nhắn bên kia gửi sẽ được đánh dấu `IsRead = 1`

### 4. Lấy inbox

`GET {{base_url}}/api/inbox`

Kỳ vọng:

- Có `PartnerID`, `PartnerName`, `PartnerAvatar`
- Chỉ lấy tin nhắn mới nhất của mỗi cuộc hội thoại

## 5.9. Xác nhận đã gặp và chia tiền 72/28

### 1. User A xác nhận đã gặp

`POST {{base_url}}/api/rent/confirm-meet/{{rent_request_id}}`

Kỳ vọng:

- `200 OK`
- Chưa hoàn tất ngay nếu user B chưa xác nhận

### 2. User B xác nhận đã gặp

`POST {{base_url}}/api/rent/confirm-meet/{{rent_request_id}}`

Kỳ vọng:

- `200 OK`
- Request chuyển sang `COMPLETED`
- User B nhận 72%
- Admin nhận 28%

### 3. Kiểm tra ví sau chia tiền

Gọi:

- `GET {{base_url}}/api/wallet` với `user_b_token`
- `GET {{base_url}}/api/wallet` với `admin_token`
- `GET {{base_url}}/api/admin/transactions/history` với `admin_token`

Kỳ vọng:

- User B có transaction `NHAN_TIEN`
- Admin có transaction `THU_PHI`
- Lịch sử admin có giao dịch không còn `PENDING`

## 5.10. Đánh giá

### 1. User A đánh giá user B

`POST {{base_url}}/api/reviews`

```json
{
  "RequestID": {{rent_request_id}},
  "RevieweeID": {{user_b_id}},
  "Rating": 5,
  "Comment": "Rất vui vẻ và đúng giờ."
}
```

Kỳ vọng:

- `201 Created`

Test lỗi nhanh:

- `Rating < 1` hoặc `Rating > 5`: `400`
- Chưa có lịch thuê `COMPLETED`: `403`

### 2. Xem danh sách review của user B

`GET {{base_url}}/api/profiles/{{user_b_id}}/reviews`

Kỳ vọng:

- Có `summary.AverageRating`
- Có `summary.TotalReviews`
- Có danh sách `reviews`

## 5.11. Báo cáo người dùng

### 1. User A tạo report cho user B

`POST {{base_url}}/api/reports`

```json
{
  "ReportedUserID": {{user_b_id}},
  "Reason": "Spam",
  "Description": "Test report từ Postman"
}
```

Kỳ vọng:

- `201 Created`

Test lỗi nhanh:

- Báo cáo chính mình: `400`

### 2. Admin xem report đang chờ xử lý

`GET {{base_url}}/api/admin/reports`

Copy `ReportID` vào `report_id`.

### 3. Admin xử lý report theo nhánh an toàn

`POST {{base_url}}/api/admin/reports/{{report_id}}/process`

```json
{
  "Action": "DISMISS",
  "ReportedUserID": {{user_b_id}}
}
```

Kỳ vọng:

- `200 OK`

### 4. Test nhánh BAN

Chỉ nên test ở cuối:

```json
{
  "Action": "BAN",
  "ReportedUserID": {{user_b_id}}
}
```

Kỳ vọng:

- User B bị đổi role thành `Banned`
- Profile của user B bị `IsActive = 0`

## 5.12. Quên mật khẩu và đặt lại mật khẩu

### 1. Tạo OTP

`POST {{base_url}}/api/forgot-password`

```json
{
  "Email": "{{user_a_email}}"
}
```

Kỳ vọng:

- `200 OK`
- Response có `test_otp`

Trong tab `Tests`:

```javascript
const data = pm.response.json();
pm.environment.set("reset_otp", data.test_otp);
```

### 2. Reset mật khẩu

`POST {{base_url}}/api/reset-password`

```json
{
  "Email": "{{user_a_email}}",
  "OTP": "{{reset_otp}}",
  "NewPassword": "654321"
}
```

Kỳ vọng:

- `200 OK`

Test lỗi nhanh:

- OTP sai hoặc hết hạn: `400`

### 3. Login lại bằng mật khẩu mới

`POST {{base_url}}/api/login`

```json
{
  "Email": "{{user_a_email}}",
  "Password": "654321"
}
```

## 5.13. Admin xóa profile

Chỉ test ở cuối vì sẽ ảnh hưởng các luồng khác.

`DELETE {{base_url}}/api/admin/profiles/{{user_b_profile_id}}`

Header:

```http
Authorization: Bearer {{admin_token}}
```

Kỳ vọng:

- `200 OK`

## 5.14. Test Categories và Profile Services

Chỉ chạy phần này sau khi đã tạo thêm 2 bảng ở mục `1.1`.

### 1. Public categories

`GET {{base_url}}/api/categories`

### 2. Admin list all categories

`GET {{base_url}}/api/admin/categories`

### 3. Admin tạo category

`POST {{base_url}}/api/admin/categories`

```json
{
  "CategoryName": "Đi cà phê",
  "IconUrl": "https://example.com/coffee.png"
}
```

Copy `CategoryID` mới tạo vào `category_id`.

### 4. Admin update category

`PUT {{base_url}}/api/admin/categories/{{category_id}}`

```json
{
  "CategoryName": "Đi cà phê cuối tuần",
  "IconUrl": "https://example.com/coffee-new.png",
  "IsActive": true
}
```

### 5. User B thêm service vào profile

`POST {{base_url}}/api/profile/services`

```json
{
  "CategoryID": {{category_id}},
  "CustomPricePerHour": 150000,
  "Description": "Có thể đi cà phê và trò chuyện."
}
```

Kỳ vọng:

- `201 Created`

### 6. User B xem service của chính mình

`GET {{base_url}}/api/profile/services`

Copy `ProfileServiceID` vào `profile_service_id`.

### 7. Public xem service của user B

`GET {{base_url}}/api/profiles/{{user_b_id}}/services`

### 8. User B xóa service

`DELETE {{base_url}}/api/profile/services/{{profile_service_id}}`

### 9. Admin xóa category

`DELETE {{base_url}}/api/admin/categories/{{category_id}}`

Lưu ý:

- Nếu category còn được dùng, API có thể trả `400` với nội dung không cho xóa.

## 6. Danh sách đầy đủ endpoint

### Public

- `GET /`
- `POST /api/register`
- `POST /api/login`
- `GET /api/profiles`
- `POST /api/forgot-password`
- `POST /api/reset-password`
- `GET /api/profiles/:userId/reviews`
- `GET /api/categories`
- `GET /api/profiles/:userId/services`

### User cần login

- `POST /api/profiles`
- `GET /api/profiles/me`
- `POST /api/messages`
- `GET /api/messages/:partnerId`
- `GET /api/inbox`
- `GET /api/wallet`
- `POST /api/wallet/request`
- `POST /api/rent/request`
- `POST /api/rent/accept/:id`
- `POST /api/rent/confirm-meet/:id`
- `GET /api/rent/my-requests`
- `POST /api/reviews`
- `POST /api/reports`
- `GET /api/profile/services`
- `POST /api/profile/services`
- `DELETE /api/profile/services/:serviceId`

### Admin

- `DELETE /api/admin/profiles/:id`
- `GET /api/admin/transactions/pending`
- `GET /api/admin/transactions/history`
- `POST /api/admin/transactions/:id/process`
- `GET /api/admin/reports`
- `POST /api/admin/reports/:id/process`
- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PUT /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`

## 7. Các lỗi dễ gặp

- `401`: thiếu token hoặc token sai format `Bearer <token>`.
- `403`: không đúng quyền admin, chat khi chưa accept thuê, review khi chưa completed.
- `404`: không tìm thấy profile, request, transaction hoặc email.
- `500` ở API category/service: thường do chưa tạo bảng `Categories` hoặc `ProfileServices`.
- `500` ở login/register/wallet: thường do chưa kết nối được SQL Server hoặc sai cấu hình `.env`.

## 8. Gợi ý cấu trúc collection trong Postman

- `00 Health`
- `01 Auth`
- `02 Wallet`
- `03 Profiles`
- `04 Rent Flow`
- `05 Messages`
- `06 Reviews`
- `07 Reports`
- `08 Admin Transactions`
- `09 Categories`
- `10 Profile Services`
- `11 Password Reset`

Nếu bạn muốn, bước tiếp theo mình có thể tạo luôn cho bạn:

1. file Postman collection JSON mẫu
2. file environment JSON mẫu
3. script SQL seed dữ liệu test
