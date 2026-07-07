import { getDB } from '../db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { event_id, athlete_id, style_id, distance_meters, pool_size, total_sets, time_record, split_times, rank, notes, created_by } = req.body;

  try {
    const db = await getDB();
    const [result] = await db.query(
      `INSERT INTO event_results 
      (event_id, athlete_id, style_id, distance_meters, pool_size, total_sets, time_record, split_times_json, \`rank\`, notes, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [event_id, athlete_id, style_id, distance_meters, pool_size, total_sets, time_record, JSON.stringify(split_times), rank, notes, created_by]
    );
    return res.status(200).json({ success: true, id: result.insertId });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}