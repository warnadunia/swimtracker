import { getDB } from '../db.js';

export default async function handler(req, res) {
  const db = await getDB();

  // =======================================================
  // [GET] AMBIL SEMUA USER & PROFILE (Untuk Kelola Akun)
  // =======================================================
  if (req.method === 'GET') {
    try {
      const [rows] = await db.query(
        `SELECT p.id, p.full_name, p.username, p.email, p.role, p.group_level, p.created_at 
         FROM profiles p 
         JOIN users u ON p.id = u.id 
         ORDER BY p.created_at DESC`
      );
      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}