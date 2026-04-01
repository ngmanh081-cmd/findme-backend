const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

// Use .env config to make DB target easy to change
const dbServer = process.env.DB_SERVER || 'localhost';
const dbInstance = process.env.DB_INSTANCE || '';
const dbName = process.env.DB_NAME || 'FindMeDB';

const serverWithInstance = dbInstance ? `${dbServer}\\${dbInstance}` : dbServer;
const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=${serverWithInstance};Database=${dbName};Trusted_Connection=yes;`;

const poolPromise = new sql.ConnectionPool({
    connectionString: connectionString
})
    .connect()
    .then(pool => {
        console.log('✅ Connected to SQL Server via ODBC Driver 17');
        return pool;
    })
    .catch(err => {
        console.error('❌ Database connection error:', err);
    });

module.exports = { sql, poolPromise };