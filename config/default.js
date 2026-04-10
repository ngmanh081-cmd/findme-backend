// Cấu hình kết nối database, ví dụ dùng dotenv để load biến môi trường
require('dotenv').config();

const config = {
  db: {
    uri: process.env.DB_URI || 'mongodb://localhost:27017/yourdb',
  },
  port: process.env.PORT || 3000,
};

module.exports = config;
