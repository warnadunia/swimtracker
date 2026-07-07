import { getDB } from '../db.js';

export default async function handler(req, res) {
  const db = await getDB();

  // =======================================================
  // [GET] AMBIL DATA PRESENSI ATLET (Berdasarkan Tanggal)
  // =======================================================
  if (req.method === 'GET') {
    const { date } = req.query; // Format: YYYY-MM-DD
    const safeDate = date || new Date().toISOString().split('T')[0];

    try {
      // Tarik semua profile dengan role 'atlet' beserta status hadirnya jika sudah di-input
      const [rows] = await db.query(
        `SELECT p.id as athlete_id, p.full_name, p.group_level, da.status, da.notes
         FROM profiles p
         LEFT JOIN daily_attendance da ON p.id = da.athlete_id AND da.date = ?
         WHERE p.role = 'atlet'
         ORDER BY p.full_name ASC`,
        [safeDate]
      );
      return res.status(200).json({ success: true, date: safeDate, data: rows });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // =======================================================
  // [POST] SIMPAN / UPDATE PRESENSI HARIAN OLEH COACH
  // =======================================================
  if (req.method === 'POST') {
    const { date, attendance_list } = req.body; // attendance_list: [{athlete_id, status, notes}]
    
    if (!date || !attendance_list || !Array.isArray(attendance_list)) {
      return res.status(400).json({ success: false, message: 'Data input presensi tidak lengkap bray!' });
    }

    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      for (const item of attendance_list) {
        // Menggunakan ON DUPLICATE KEY UPDATE agar query otomatis meng-update jika tanggal & id_atlet sudah ada
        await connection.query(
          `INSERT INTO daily_attendance (date, athlete_id, status, notes)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes)`,
          [date, item.athlete_id, item.status || 'hadir', item.notes || null]
        );
      }

      await connection.commit();
      return res.status(200).json({ success: true, message: 'Presensi atlet berhasil disimpan ke TiDB!' });
    } catch (error) {
      if (connection) await connection.rollback();
      return res.status(500).json({ success: false, error: error.message });
    } finally {
      if (connection) connection.release();
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}