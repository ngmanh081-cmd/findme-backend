const sql = require('mssql/msnodesqlv8');

// Sử dụng nguyên xi cấu hình đã hoạt động trơn tru bên Python!
const connectionString = 'Driver={ODBC Driver 17 for SQL Server};Server=(localdb)\\MSSQLLocalDB;Database=RentApp;Trusted_Connection=yes;';

// Khởi tạo Pool kết nối bằng chuỗi cấu hình trực tiếp
const poolPromise = new sql.ConnectionPool({
    connectionString: connectionString
})
    .connect()
    .then(pool => {
        console.log('✅ Đã kết nối thành công với SQL Server LocalDB qua ODBC Driver 17!');
        return pool;
    })
    .catch(err => {
        console.error('❌ Lỗi kết nối Database:', err);
    });

module.exports = { sql, poolPromise };