import { getDB } from '../db.js';

export default async function handler(req, res) {
  const db = await getDB();

  // =======================================================
  // [GET] AMBIL DATA TIME TRIAL SECARA KRONOLOGIS
  // =======================================================
  if (req.method === 'GET') {
    try {
      const [rows] = await db.query(
        `SELECT id, athlete_id as profile_id, title_event, distance, pool_size, time_record, created_at 
         FROM time_trials_results 
         ORDER BY created_at DESC, id ASC`
      );
      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // =======================================================
  // [POST] SIMPAN BULK REPETISI HASIL TIME TRIAL STOPWATCH
  // =======================================================
  if (req.method === 'POST') {
    const { inserts } = req.body; // Array berisi: [{profile_id, title_event, distance, pool_size, time_record}]
    if (!inserts || !Array.isArray(inserts) || inserts.length === 0) {
      return res.status(400).json({ success: false, message: 'Data inserts kosong bray!' });
    }

    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const queryStr = `INSERT INTO time_trials_results (athlete_id, title_event, distance, pool_size, time_record, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
      
      const currentTime = new Date();
      for (const item of inserts) {
        await connection.query(queryStr, [
          item.profile_id, 
          item.title_event, 
          parseInt(item.distance), 
          parseInt(item.pool_size), 
          item.time_record,
          currentTime
        ]);
      }

      await connection.commit();
      return res.status(201).json({ success: true, message: 'Hasil Time Trial sukses direkam ke TiDB Cloud!' });
    } catch (error) {
      if (connection) await connection.rollback();
      return res.status(500).json({ success: false, error: error.message });
    } finally {
      if (connection) connection.release();
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}