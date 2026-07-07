import { getDB } from '../db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });
  
  const db = await getDB();
  try {
    const [rows] = await db.query(
      `SELECT er.id, er.rank, er.time_record, er.athlete_id as user_id, er.event_id, er.created_at,
              p.full_name, e.title as event_title, e.event_date, s.name as style_name, er.distance_meters
       FROM event_results er
       JOIN profiles p ON er.athlete_id = p.id
       JOIN events e ON er.event_id = e.id
       JOIN swimming_styles s ON er.style_id = s.id
       WHERE er.rank IN (1, 2, 3)
       ORDER BY e.event_date DESC`
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}