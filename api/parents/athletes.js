import { getDB } from '../db.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  const { parent_id } = req.query;
  if (!parent_id) return res.status(400).json({ success: false, message: 'Parent ID dibutuhkan bray!' });

  const db = await getDB();
  try {
    // 1. Ambil semua atlet (anak) yang terhubung dengan ID orang tua ini
    const [children] = await db.query(
      `SELECT p.id, p.full_name, p.group_level, p.birth_year
       FROM parent_athletes pa
       JOIN profiles p ON pa.athlete_id = p.id
       WHERE pa.parent_id = ?`,
      [parent_id]
    );

    const childrenData = [];

    // 2. Tarik ringkasan presensi harian & time trial untuk setiap anak bray
    for (const child of children) {
      // Ambil kehadiran terakhir si anak
      const [attendance] = await db.query(
        `SELECT date, status FROM daily_attendance 
         WHERE athlete_id = ? 
         ORDER BY date DESC LIMIT 1`,
        [child.id]
      );

      // Ambil 3 rekam latihan Time Trial terbaru si anak
      const [trials] = await db.query(
        `SELECT title_event, distance, pool_size, time_record, created_at 
         FROM time_trials_results 
         WHERE athlete_id = ? 
         ORDER BY created_at DESC LIMIT 3`,
        [child.id]
      );

      childrenData.push({
        profile: child,
        last_attendance: attendance[0] || { date: '-', status: 'Belum ada data' },
        recent_time_trials: trials || []
      });
    }

    return res.status(200).json({ success: true, data: childrenData });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}