// api/athletes.js
// PORTAL REST ATLET MENYESUAIKAN SKEMA FIX TiDB CLOUD bray
import { getDB } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const db = await getDB();
  const { action, user_id } = req.query;

  try {
    if (req.method === 'GET' && action === 'categories') {
      const [rows] = await db.query(`SELECT id, name FROM swimming_styles ORDER BY name ASC`);
      return res.status(200).json({ success: true, data: rows });
    }

    if (req.method === 'GET' && action === 'dashboard_data') {
      if (!user_id) return res.status(400).json({ success: false, message: 'User ID required!' });

      // Ambil Rekor Resmi Berdasarkan athlete_id & Join ke master swimming_styles
      const [results] = await db.query(
        `SELECT er.time_record, er.rank, er.split_times_json, s.name as category, e.title, e.event_date,
         e.id as event_id, e.level, er.id as result_id, er.style_id, er.distance_meters, er.pool_size
         FROM event_results er
         JOIN events e ON er.event_id = e.id
         JOIN swimming_styles s ON er.style_id = s.id
         WHERE er.athlete_id = ?`, [user_id]
      );

      // Ambil 10 rekam evaluasi Time Trial Latihan dari Pelatih bray
      const [timeTrials] = await db.query(
        `SELECT t.title_event, t.distance_meters as distance, t.pool_size, t.time_record, t.created_at, s.name as style_name
         FROM time_trials_results t
         JOIN swimming_styles s ON t.style_id = s.id
         WHERE t.athlete_id = ? 
         ORDER BY t.created_at DESC LIMIT 10`, [user_id]
      );

      const drylandTasks = [];
      const [profileRows] = await db.query(`SELECT full_name, group_level, birth_year FROM profiles WHERE id = ?`, [user_id]);
      const currentGroup = profileRows[0]?.group_level || 'Basic 1';
      const fullName = profileRows[0]?.full_name || '';
      const birthYear = profileRows[0]?.birth_year || null;

      const [bioRows] = await db.query(`SELECT height_cm, weight_kg, arm_span_cm, recorded_at FROM athlete_biometrics WHERE athlete_id = ? ORDER BY recorded_at DESC LIMIT 1`, [user_id]);
      const biometric = bioRows[0] || null;

      return res.status(200).json({ 
        success: true, 
        results, 
        time_trials: timeTrials,
        dryland_tasks: drylandTasks,
        group_level: currentGroup,
        full_name: fullName,
        birth_year: birthYear,
        biometric
      });
    }
    return res.status(400).json({ success: false });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}