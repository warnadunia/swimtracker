import { getDB } from '../db.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const db = await getDB();

  // =======================================================
  // [GET] AMBIL LIST ANAK BERDASARKAN PARENT ID bray
  // =======================================================
  if (req.method === 'GET') {
    const { parent_id } = req.query;
    if (!parent_id) return res.status(400).json({ success: false, message: 'Parent ID mana bray?' });

    try {
      const [rows] = await db.query(
        `SELECT pa.athlete_id, p.full_name, p.group_level 
         FROM parent_athletes pa
         JOIN profiles p ON pa.athlete_id = p.id
         WHERE pa.parent_id = ?`,
        [parent_id]
      );
      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // =======================================================
  // [POST] KONEKSIKAN ATLET BARU KE PARENT (BISA MULTI-CHILDREN)
  // =======================================================
  if (req.method === 'POST') {
    const { parent_id, athlete_id } = req.body;
    if (!parent_id || !athlete_id) {
      return res.status(400).json({ success: false, message: 'Data kurang lengkap bray!' });
    }

    try {
      // Pastikan data relasi tidak duplikat di database bray
      const [check] = await db.query(
        'SELECT * FROM parent_athletes WHERE parent_id = ? AND athlete_id = ?',
        [parent_id, athlete_id]
      );
      
      if (check.length > 0) {
        return res.status(400).json({ success: false, message: 'Atlet ini sudah terhubung dengan orang tua ini bray!' });
      }

      await db.query(
        'INSERT INTO parent_athletes (parent_id, athlete_id) VALUES (?, ?)',
        [parent_id, athlete_id]
      );
      return res.status(201).json({ success: true, message: 'Atlet berhasil dikoneksikan ke Orang Tua!' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}