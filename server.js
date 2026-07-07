import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Konfigurasi Koneksi TiDB (Gunakan string koneksi dari konsol TiDB lu)
const pool = mysql.createPool({
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
  connectionLimit: 10,
  queueLimit: 0
});

// ==========================================
// ENDPOINT 1: REGISTER USER & PROFILE
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  const { id, username, full_name, birth_year, password, role } = req.body;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Hitung fake email untuk kompatibilitas skema lu bray
    const fakeEmail = username.replace(/\s+/g, '') + '@swimapp.local';
    
    // Insert ke tabel users pengganti auth.users
    await connection.query(
      'INSERT INTO users (id, email) VALUES (?, ?)',
      [id, fakeEmail]
    );

    // Insert ke tabel profiles dengan default role atau role pilihan
    await connection.query(
      'INSERT INTO profiles (id, full_name, birth_year, role, username, email) VALUES (?, ?, ?, ?, ?, ?)',
      [id, full_name, birth_year, role || 'atlet', username, fakeEmail]
    );

    await connection.commit();
    res.status(201).json({ success: true, message: 'User berhasil didaftarkan!' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

// ==========================================
// ENDPOINT 2: LOGIN & CEK ROLE
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  const { username } = req.body; // Catatan: Implementasikan verifikasi password asli di sini nantinya bray
  const fakeEmail = username.replace(/\s+/g, '') + '@swimapp.local';

  try {
    const [rows] = await pool.query(
      'SELECT p.* FROM profiles p JOIN users u ON p.id = u.id WHERE p.username = ? OR u.email = ?', 
      [username, fakeEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User tidak ditemukan!' });
    }

    res.json({ success: true, user: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// ENDPOINT 3: INPUT HASIL KOMPETISI (Mendukung JSON Split Times)
// ==========================================
app.post('/api/results/event', async (req, res) => {
  const { event_id, athlete_id, style_id, distance_meters, pool_size, total_sets, time_record, split_times, rank, notes, created_by } = req.body;
  
  try {
    const [result] = await pool.query(
      `INSERT INTO event_results 
      (event_id, athlete_id, style_id, distance_meters, pool_size, total_sets, time_record, split_times_json, \`rank\`, notes, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [event_id, athlete_id, style_id, distance_meters, pool_size, total_sets, time_record, JSON.stringify(split_times), rank, notes, created_by]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`TiDB Bridge API jalan di port ${PORT}`));