import { getDB } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const { action } = req.query;

  // [POST] LOGIN
  if (req.method === 'POST' && action === 'login') {
    const { username } = req.body;
    const fakeEmail = username.replace(/\s+/g, '') + '@swimapp.local';
    try {
      const db = await getDB();
      const [rows] = await db.query(
        'SELECT p.* FROM profiles p JOIN users u ON p.id = u.id WHERE p.username = ? OR u.email = ?',
        [username, fakeEmail]
      );
      if (rows.length === 0) return res.status(401).json({ success: false, message: 'User tidak ditemukan!' });
      return res.status(200).json({ success: true, user: rows[0] });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // [POST] REGISTER
  if (req.method === 'POST' && action === 'register') {
    const { id, username, full_name, birth_year, password, role } = req.body;
    if (!id || !username || !full_name) return res.status(400).json({ success: false, message: 'Data input tidak lengkap!' });

    let connection;
    try {
      const db = await getDB();
      connection = await db.getConnection();
      await connection.beginTransaction();
      
      const fakeEmail = username.replace(/\s+/g, '') + '@swimapp.local';
      
      await connection.query('INSERT INTO users (id, email) VALUES (?, ?)', [id, fakeEmail]);
      await connection.query(
        `INSERT INTO profiles (id, full_name, birth_year, role, username, email) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, full_name, birth_year ? parseInt(birth_year) : null, role || 'atlet', username, fakeEmail]
      );
      await connection.commit();
      return res.status(201).json({ success: true, message: 'User & Profil berhasil didaftarkan ke TiDB!' });
    } catch (error) {
      if (connection) await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Username sudah terpakai bray, cari yang lain!' });
      return res.status(500).json({ success: false, error: error.message });
    } finally {
      if (connection) connection.release();
    }
  }

  return res.status(404).json({ success: false, message: 'Endpoint Not Found' });
}
