import { getDB } from '../db.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  const { full_name, username, email, password, role } = req.body;

  // Validasi input minimal bray
  if (!full_name || !username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Nama, Username, Password, dan Role wajib diisi bray!' });
  }

  const db = await getDB();
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Cek apakah username sudah terpakai
    const [existing] = await connection.query('SELECT id FROM profiles WHERE username = ?', [username.trim()]);
    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: 'Username ini sudah terpakai bray, cari yang lain!' });
    }

    // 2. Generate UUID murni untuk ID User baru bray
    const userId = crypto.randomUUID();

    // 3. Insert ke tabel users (Master Akun)
    await connection.query(
      'INSERT INTO users (id, password_hash) VALUES (?, ?)',
      [userId, password] // Gunakan enkripsi/hashing pilihan lu di sini jika perlu bray
    );

    // 4. Insert ke tabel profiles dengan Role Pilihan Admin
    await connection.query(
      `INSERT INTO profiles (id, full_name, username, email, role, group_level) 
       VALUES (?, ?, ?, ?, ?, 'Basic 1')`,
      [userId, full_name.trim(), username.trim(), email ? email.trim() : null, role]
    );

    await connection.commit();
    return res.status(201).json({ success: true, message: `User dengan role ${role} berhasil dibuat bray!` });

  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
}