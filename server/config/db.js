const mysql = require("mysql2");

const timestamp = () => new Date().toISOString();
const logInfo = (message) => {
  process.stdout.write(`[INFO] ${timestamp()} ${message}\n`);
};
const logError = (message) => {
  process.stderr.write(`[ERROR] ${timestamp()} ${message}\n`);
};

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false }
});

pool.getConnection((error, connection) => {
  if (error) {
    logError(`MySQL connection failed: ${error.message}`);
    process.exit(1);
  }
  logInfo("MySQL connected successfully");
  connection.release();
});

module.exports = pool.promise();
