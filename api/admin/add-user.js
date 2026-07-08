import { getDB } from '../db.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  const { full_name, username, email, password, role } = req.body;

  if (!full_name || !username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Nama, Username, Password, dan Role wajib diisi bray!' });
  }

  const db = await getDB();
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Cek duplikat username murni
    const [existing] = await connection.query('SELECT id FROM profiles WHERE username = ?', [username.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Username ini sudah terpakai bray, cari yang lain!' });
    }

    // 🚨 KUNCINYA DI SINI BRAY: Gunakan cara destructuring module murni Node.js agar anti-crash 500
    const userId = crypto.randomBytes(16).toString("hex"); // Alternatif UUID paling aman di semua versi Node.js Vercel

    // Insert data master login akun bray
    await connection.query(
      'INSERT INTO users (id, password_hash) VALUES (?, ?)',
      [userId, password]
    );

    // Insert data biodata profiles
    await connection.query(
      `INSERT INTO profiles (id, full_name, username, email, role, group_level) 
       VALUES (?, ?, ?, ?, ?, 'Basic 1')`,
      [userId, full_name.trim(), username.trim(), email ? email.trim() : null, role]
    );

    await connection.commit();
    return res.status(201).json({ success: true, message: `User dengan role ${role} berhasil dibuat bray!` });

  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(500).json({ success: false, error: "MySQL Add User Error: " + error.message });
  } finally {
    if (connection) connection.release();
  }
}