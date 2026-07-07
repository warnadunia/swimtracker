import { getDB } from '../db.js';

export default async function handler(req, res) {
  // Hanya menerima method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { id, username, full_name, birth_year, password, role } = req.body;

  // Validasi input standar
  if (!id || !username || !full_name) {
    return res.status(400).json({ success: false, message: 'Data input tidak lengkap!' });
  }

  let connection;

  try {
    const db = await getDB();
    connection = await db.getConnection();
    
    // Mulai ACID Transaction karena kita mau insert ke 2 tabel sekaligus
    await connection.beginTransaction();
    
    // Buat fake email demi kompatibilitas format sistem lama lu bray
    const fakeEmail = username.replace(/\s+/g, '') + '@swimapp.local';
    
    // 1. Insert ke tabel users (Pengganti auth.users Supabase)
    await connection.query(
      'INSERT INTO users (id, email) VALUES (?, ?)',
      [id, fakeEmail]
    );

    // 2. Insert ke tabel profiles dengan default role 'atlet'
    await connection.query(
      `INSERT INTO profiles (id, full_name, birth_year, role, username, email) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, full_name, birth_year ? parseInt(birth_year) : null, role || 'atlet', username, fakeEmail]
    );

    // Commit transaksi jika dua query di atas sukses tanpa error
    await connection.commit();
    
    return res.status(201).json({ success: true, message: 'User & Profil berhasil didaftarkan ke TiDB!' });

  } catch (error) {
    // Batalkan semua perubahan jika salah satu query gagal
    if (connection) await connection.rollback();
    
    console.error("Register API Error:", error);
    
    // Handle error jika username atau email ternyata sudah kembar di DB
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Username sudah terpakai bray, cari yang lain!' });
    }
    
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
}