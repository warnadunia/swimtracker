// api/coach.js
// CORE ROUTER COACH - FIX ABSENSI, TIME TRIAL & KELAS SESUAI HEIDISQL bray!

import { getDB } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const db = await getDB();
  const { action, date } = req.query;

  try {
    // =======================================================
    // [GET] AMBIL SEMUA ATLET UNTUK LIST COACH
    // =======================================================
    if (req.method === 'GET' && action === 'athletes') {
      const [rows] = await db.query(
        `SELECT id, full_name, group_level, birth_year FROM profiles WHERE role = 'atlet' ORDER BY group_level ASC, full_name ASC`
      );
      return res.status(200).json({ success: true, data: rows });
    }

    // =======================================================
    // [GET] INTEGRASI DATA ABSENSI HARI INI (FIX KOLOM TiDB)
    // =======================================================
    if (req.method === 'GET' && action === 'attendance') {
      const safeDate = date || new Date().toISOString().split('T')[0];
      
      // Menggunakan attendance_date dan is_present sesuai skema murni lu bray!
      const [rows] = await db.query(
        `SELECT p.id as athlete_id, p.full_name, p.group_level, IFNULL(da.is_present, 1) as is_present 
         FROM profiles p 
         LEFT JOIN daily_attendance da ON p.id = da.profile_id AND da.attendance_date = ? 
         WHERE p.role = 'atlet'`, 
        [safeDate]
      );
      
      // Normalisasi output data agar front-end membacanya sebagai string 'hadir' / 'absen' bray
      const normalizedData = rows.map(r => ({
        athlete_id: r.athlete_id,
        full_name: r.full_name,
        group_level: r.group_level,
        status: parseInt(r.is_present) === 1 ? 'hadir' : 'absen'
      }));

      return res.status(200).json({ success: true, data: normalizedData });
    }

    // =======================================================
    // [GET] DATA RIWAYAT LATIHAN TIME TRIALS (FIX JOIN STYLES)
    // =======================================================
    if (req.method === 'POST' && action === 'time_trials') {
      const { inserts } = req.body;
      if (!inserts || inserts.length === 0) return res.status(400).json({ success: false });

      for (const t of inserts) {
        // Coach menyimpan array splits (laps) ke dalam JSON
        const splitJson = JSON.stringify(t.splits || []); 
        await db.query(
          `INSERT INTO time_trials_results (athlete_id, coach_id, title_event, style_id, distance_meters, pool_size, total_sets, time_record, split_times_json) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.profile_id, 'coach-system', t.title_event, '1c57ea14-7a70-11f1-bd10-668952a524c8', t.distance, t.pool_size, t.sets || 1, t.time_record, splitJson]
        );
      }
      return res.status(201).json({ success: true });
    }

    // =======================================================
    // [POST] SIMPAN / UPDATE ABSENSI ATLET
    // =======================================================
    if (req.method === 'POST' && action === 'attendance') {
      const { date: bodyDate, attendance_list } = req.body;
      const safeDate = bodyDate || new Date().toISOString().split('T')[0];

      for (const item of attendance_list) {
        const isPresentNumeric = item.status === 'hadir' ? 1 : 0;
        
        // Gunakan ON DUPLICATE KEY UPDATE berdasarkan profile_id dan tanggal bray
        await db.query(
          `INSERT INTO daily_attendance (profile_id, attendance_date, is_present) 
           VALUES (?, ?, ?) 
           ON DUPLICATE KEY UPDATE is_present = VALUES(is_present)`, 
          [item.athlete_id, safeDate, isPresentNumeric]
        );
      }
      return res.status(200).json({ success: true, message: 'Absensi disinkronkan ke TiDB!' });
    }

    return res.status(400).json({ success: false, message: 'Aksi Coach Tidak Valid!' });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Dosa Coach API: " + error.message });
  }
}