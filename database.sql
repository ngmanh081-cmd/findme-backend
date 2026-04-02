-- ========================================================
-- DATABASE SCRIPT: FINDME (SƠ ĐỒ CHUẨN TỪ ERD)
-- ========================================================
CREATE DATABASE RentApp;
GO
USE RentApp;
GO

-- 1. BẢNG USERS (Trung tâm)
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    CreatedAt DATETIME DEFAULT GETDATE(),
    Role NVARCHAR(20) DEFAULT 'User', 
    ResetOTP NVARCHAR(10) NULL
);
GO

-- 2. BẢNG WALLETS (Ví điện tử)
CREATE TABLE Wallets (
    WalletID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL UNIQUE FOREIGN KEY REFERENCES Users(UserID),
    Balance DECIMAL(18,2) NOT NULL DEFAULT 0
);
GO

-- 3. BẢNG TRANSACTIONS (Lịch sử giao dịch)
CREATE TABLE Transactions (
    TransactionID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    Type NVARCHAR(50) NOT NULL, -- VD: 'DEPOSIT', 'WITHDRAW', 'PAYMENT', 'REFUND'
    Amount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(50) DEFAULT 'COMPLETED',
    Description NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 4. BẢNG PROFILES (Hồ sơ người cho thuê)
CREATE TABLE Profiles (
    ProfileID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL UNIQUE FOREIGN KEY REFERENCES Users(UserID),
    Bio NVARCHAR(MAX) DEFAULT '',
    PricePerHour DECIMAL(18,2) NOT NULL DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    ImageGallery NVARCHAR(MAX) DEFAULT '[]',
    Avatar NVARCHAR(255) DEFAULT '',
    Gender NVARCHAR(20) DEFAULT N'Khác',
    Hobbies NVARCHAR(MAX) DEFAULT '[]'
);
GO

-- 5. BẢNG CATEGORIES (Danh mục dịch vụ)
CREATE TABLE Categories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) DEFAULT '',
    IconUrl NVARCHAR(255) DEFAULT '',
    IsActive BIT DEFAULT 1
);
GO

-- 6. BẢNG PROFILE SERVICES (Menu dịch vụ của từng hồ sơ)
CREATE TABLE ProfileServices (
    ProfileServiceID INT IDENTITY(1,1) PRIMARY KEY,
    ProfileID INT NOT NULL FOREIGN KEY REFERENCES Profiles(ProfileID) ON DELETE CASCADE,
    CategoryID INT NOT NULL FOREIGN KEY REFERENCES Categories(CategoryID),
    CustomPricePerHour DECIMAL(18,2) NOT NULL DEFAULT 0,
    Description NVARCHAR(MAX) DEFAULT ''
);
GO

-- 7. BẢNG RENT REQUESTS (Yêu cầu thuê ban đầu)
CREATE TABLE RentRequests (
    RequestID INT IDENTITY(1,1) PRIMARY KEY,
    RenterID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    ReceiverID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    Hours INT NOT NULL DEFAULT 1,
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    Status NVARCHAR(50) DEFAULT 'PENDING',
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 8. BẢNG BOOKINGS (Đơn thuê chính thức sau khi được duyệt)
CREATE TABLE Bookings (
    BookingID INT IDENTITY(1,1) PRIMARY KEY,
    RenterID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    RenteeID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    StartTime DATETIME,
    EndTime DATETIME,
    TotalAmount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(50) DEFAULT 'ACTIVE' -- 'ACTIVE', 'COMPLETED', 'CANCELLED'
);
GO

-- 9. BẢNG REVIEWS (Đánh giá)
CREATE TABLE Reviews (
    ReviewID INT IDENTITY(1,1) PRIMARY KEY,
    BookingID INT NULL FOREIGN KEY REFERENCES Bookings(BookingID),
    ReviewerID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    RevieweeID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID), -- Sửa lại logic Khóa Ngoại để tránh lỗi SQL Server (ko dùng cascade)
    Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    Comment NVARCHAR(MAX) DEFAULT '',
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 10. BẢNG MESSAGES (Tin nhắn Chat)
CREATE TABLE Messages (
    MessageID INT IDENTITY(1,1) PRIMARY KEY,
    SenderID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    ReceiverID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    Content NVARCHAR(MAX) NOT NULL,
    SentAt DATETIME DEFAULT GETDATE()
);
GO

-- 11. BẢNG REPORTS (Báo cáo vi phạm)
CREATE TABLE Reports (
    ReportID INT IDENTITY(1,1) PRIMARY KEY,
    ReporterID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    ReportedUserID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    Reason NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) DEFAULT '',
    Status NVARCHAR(50) DEFAULT 'PENDING',
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- ========================================================
-- TẠO TÀI KHOẢN ADMIN MẶC ĐỊNH
-- ========================================================
INSERT INTO Users (Username, Email, PasswordHash, Role) 
VALUES (
    N'Admin Tối Cao', 
    'admin@findme.com', 
    '$2b$10$wT8hJ612R4G3X2E6U3aXm.lA/N/.t6I7hK/g5l8zP7o0Y/b9F/eWe', -- Mật khẩu: 123456
    'Admin'
);
GO
