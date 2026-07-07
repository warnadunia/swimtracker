import { getDB } from '../db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

  const db = await getDB();
  try {
    // Ambil list semua atlet beserta baris biometrik fisik terbaru mereka
    const [rows] = await db.query(
      `SELECT p.id, p.full_name, p.group_level, p.birth_year,
              (SELECT ab.height_cm FROM athlete_biometrics ab WHERE ab.athlete_id = p.id ORDER BY ab.recorded_at DESC LIMIT 1) as latest_height,
              (SELECT ab.weight_kg FROM athlete_biometrics ab WHERE ab.athlete_id = p.id ORDER BY ab.recorded_at DESC LIMIT 1) as latest_weight
       FROM profiles p
       WHERE p.role = 'atlet'
       ORDER BY p.group_level ASC, p.full_name ASC`
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}