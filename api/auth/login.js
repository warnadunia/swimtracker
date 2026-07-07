import { getDB } from '../db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { username } = req.body;
  const fakeEmail = username.replace(/\s+/g, '') + '@swimapp.local';

  try {
    const db = await getDB();
    const [rows] = await db.query(
      'SELECT p.* FROM profiles p JOIN users u ON p.id = u.id WHERE p.username = ? OR u.email = ?',
      [username, fakeEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User tidak ditemukan!' });
    }

    return res.status(200).json({ success: true, user: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}