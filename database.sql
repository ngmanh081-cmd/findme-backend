CREATE DATABASE FindMeDB;
GO

USE FindMeDB;
GO

-- 1. Bảng Users (Người dùng)
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    Role NVARCHAR(50) DEFAULT 'User',
    ResetOTP VARCHAR(6) NULL,
    OTPExpiry DATETIME NULL
);
GO

-- 2. Bảng Wallets (Ví tiền)
CREATE TABLE Wallets (
    WalletID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Balance DECIMAL(18, 2) DEFAULT 0.00,
    CONSTRAINT FK_Wallets_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
GO

-- 3. Bảng Profiles (Hồ sơ người cho thuê)
CREATE TABLE Profiles (
    ProfileID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Bio NVARCHAR(MAX),
    PricePerHour DECIMAL(18, 2) DEFAULT 0.00,
    IsActive BIT DEFAULT 1,
    Gender NVARCHAR(20),
    ImageGallery NVARCHAR(MAX),
    Avatar NVARCHAR(MAX),
    Hobbies NVARCHAR(255),
    CONSTRAINT FK_Profiles_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
GO

-- 4. Bảng RentRequests (Yêu cầu thuê)
CREATE TABLE RentRequests (
    RequestID INT IDENTITY(1,1) PRIMARY KEY,
    SenderID INT NOT NULL,
    ReceiverID INT NOT NULL,
    Hours INT,
    TotalAmount DECIMAL(18, 2),
    Status NVARCHAR(50) DEFAULT 'PENDING',
    SenderMet BIT DEFAULT 0,
    ReceiverMet BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_RentRequests_Sender FOREIGN KEY (SenderID) REFERENCES Users(UserID),
    CONSTRAINT FK_RentRequests_Receiver FOREIGN KEY (ReceiverID) REFERENCES Users(UserID)
);
GO

-- 5. Bảng Transactions (Giao dịch)
CREATE TABLE Transactions (
    TransactionID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Type NVARCHAR(50), 
    Amount DECIMAL(18, 2),
    Status NVARCHAR(50),
    Description NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE(),
    PaymentMethod NVARCHAR(50),
    PaymentDetails NVARCHAR(MAX),
    CONSTRAINT FK_Transactions_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
GO

-- 6. Bảng Bookings (Lịch hẹn/Đặt chỗ)
CREATE TABLE Bookings (
    BookingID INT IDENTITY(1,1) PRIMARY KEY,
    RenterID INT NOT NULL,
    RenteeID INT NOT NULL,
    StartTime DATETIME,
    EndTime DATETIME,
    TotalAmount DECIMAL(18, 2),
    Status NVARCHAR(50),
    CreatedAt DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Bookings_Renter FOREIGN KEY (RenterID) REFERENCES Users(UserID),
    CONSTRAINT FK_Bookings_Rentee FOREIGN KEY (RenteeID) REFERENCES Users(UserID)
);
GO

-- 7. Bảng Messages (Tin nhắn)
CREATE TABLE Messages (
    MessageID INT IDENTITY(1,1) PRIMARY KEY,
    SenderID INT NOT NULL,
    ReceiverID INT NOT NULL,
    Content NVARCHAR(MAX),
    SentAt DATETIME DEFAULT GETDATE(),
    IsRead BIT DEFAULT 0,
    CONSTRAINT FK_Messages_Sender FOREIGN KEY (SenderID) REFERENCES Users(UserID),
    CONSTRAINT FK_Messages_Receiver FOREIGN KEY (ReceiverID) REFERENCES Users(UserID)
);
GO
