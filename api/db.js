import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Gunakan global variable agar koneksi di-reuse saat serverless function hangat (warm start)
let pool;

export async function getDB() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.TIDB_HOST,
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      database: process.env.TIDB_DATABASE,
      port: process.env.TIDB_PORT || 4000,
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      },
      waitForConnections: true,
      connectionLimit: 5, // Kecilkan limit karena ini serverless
      queueLimit: 0
    });
  }
  return pool;
}