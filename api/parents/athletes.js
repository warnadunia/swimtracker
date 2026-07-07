import { getDB } from '../db.js';

export default async function handler(req, res) {
  const db = await getDB();

  // =======================================================
  // [GET] AMBIL DAFTAR ANAK + BIOMETRIK + REKAM WAKTU
  // =======================================================
  if (req.method === 'GET') {
    const { parentId } = req.query;

    if (!parentId) {
      return res.status(400).json({ success: false, message: 'Missing parentId bray!' });
    }

    try {
      // 1. Ambil list profil atlet (anak) yang terhubung di junction table parent_athletes
      const [athletes] = await db.query(
        `SELECT p.id, p.full_name, p.birth_year, p.group_level, p.avatar_url, p.no_wa
         FROM parent_athletes pa
         JOIN profiles p ON pa.athlete_id = p.id
         WHERE pa.parent_id = ?`,
        [parentId]
      );

      // 2. Tarik data biometrik fisik terbaru & 3 rekam kompetisi terakhir untuk setiap anak
      const extendedAthletes = await Promise.all(athletes.map(async (athlete) => {
        // Ambil data fisik/biometrik paling update
        const [biometrics] = await db.query(
          `SELECT height_cm, weight_kg, arm_span_cm, recorded_at 
           FROM athlete_biometrics 
           WHERE athlete_id = ? 
           ORDER BY recorded_at DESC LIMIT 1`,
          [athlete.id]
        );

        // Ambil 3 rekam kompetisi renang terakhir si anak
        const [recentResults] = await db.query(
          `SELECT er.time_record, er.distance_meters, er.pool_size, er.total_sets, s.name as style_name, e.title as event_title, er.rank
           FROM event_results er
           JOIN swimming_styles s ON er.style_id = s.id
           JOIN events e ON er.event_id = e.id
           WHERE er.athlete_id = ?
           ORDER BY e.event_date DESC LIMIT 3`,
          [athlete.id]
        );

        return {
          ...athlete,
          latest_biometric: biometrics[0] || null,
          recent_results: recentResults
        };
      }));

      return res.status(200).json({ success: true, data: extendedAthletes });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // =======================================================
  // [POST] HUBUNGKAN ORANG TUA KE ATLET (LINK ANAK)
  // =======================================================
  if (req.method === 'POST') {
    const { parent_id, athlete_id } = req.body;

    if (!parent_id || !athlete_id) {
      return res.status(400).json({ success: false, message: 'Data input kurang bray!' });
    }

    try {
      await db.query(
        'INSERT INTO parent_athletes (parent_id, athlete_id) VALUES (?, ?)',
        [parent_id, athlete_id]
      );
      return res.status(201).json({ success: true, message: 'Berhasil menghubungkan akun atlet ke dashboard Parents!' });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Atlet ini sudah terhubung dengan akun lu bray!' });
      }
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}