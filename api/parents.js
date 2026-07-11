// api/parents.js
// CORE ROUTER MONITORING & INPUT PARENTS - FIX SINKRONISASI TABEL TiDB CLOUD 100% bray!

import { getDB } from './db.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const db = await getDB();
  const { action } = req.query;

  try {
    // =======================================================
    // [GET] MONITOR DATA ANAK-ANAK (MULTI-ATHLETE)
    // =======================================================
    if (req.method === 'GET' && action === 'monitoring') {
      const { parent_id } = req.query;
      if (!parent_id) return res.status(400).json({ success: false, message: 'Parent ID dibutuhkan bray!' });

      const [children] = await db.query(
        `SELECT p.id, p.full_name, p.group_level, p.birth_year 
         FROM parent_athletes pa 
         JOIN profiles p ON pa.athlete_id = p.id 
         WHERE pa.parent_id = ?`, 
        [parent_id]
      );

      const childrenData = [];

      for (const child of children) {
        const [attendance] = await db.query(
          `SELECT attendance_date, is_present FROM daily_attendance 
           WHERE profile_id = ? 
           ORDER BY attendance_date DESC LIMIT 1`, 
          [child.id]
        );

        const [trials] = await db.query(
          `SELECT t.title_event, t.distance_meters, t.pool_size, t.time_record, t.created_at, s.name as style_name
           FROM time_trials_results t
           JOIN swimming_styles s ON t.style_id = s.id
           WHERE t.athlete_id = ? 
           ORDER BY t.created_at DESC LIMIT 3`, 
          [child.id]
        );

        const [events] = await db.query(
          `SELECT er.time_record, er.rank, s.name as style_name, e.title as event_title, e.event_date
           FROM event_results er
           JOIN events e ON er.event_id = e.id
           JOIN swimming_styles s ON er.style_id = s.id
           WHERE er.athlete_id = ? 
           ORDER BY e.event_date DESC LIMIT 3`, 
          [child.id]
        );

        childrenData.push({
          profile: child,
          last_attendance: attendance[0] || { attendance_date: '-', is_present: 0 },
          recent_time_trials: trials || [],
          recent_official_events: events || []
        });
      }

      return res.status(200).json({ success: true, data: childrenData });
    }

    // [POST] INPUT KEJUARAAN PARENTS
    if (req.method === 'POST' && action === 'input_kejuaraan') {
      const { parent_id, athlete_id, title, level, event_date, pool_size, results } = req.body;
      if (!athlete_id || !title || !results || results.length === 0) return res.status(400).json({ success: false, message: 'Data kurang lengkap!' });

      const cryptoLib = globalThis.crypto || await import('node:crypto');
      const eventId = cryptoLib.randomUUID();
      const safePoolSize = parseInt(pool_size) || 50; 

      await db.query(`INSERT INTO events (id, created_by, title, level, event_date) VALUES (?, ?, ?, ?, ?)`, [eventId, parent_id, title, level || 'Lokal', event_date]);

      for (const resItem of results) {
        const distance = parseInt(resItem.distance) || 50;
        const totalSets = Math.ceil(distance / safePoolSize);
        const resultId = cryptoLib.randomUUID();
        const splitJson = JSON.stringify(resItem.splits || []); // 🚨 INI KUNCI BIAR GAK ERROR 500 bray!

        await db.query(
          `INSERT INTO event_results (id, event_id, athlete_id, style_id, distance_meters, pool_size, total_sets, time_record, split_times_json, \`rank\`, created_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [resultId, eventId, athlete_id, resItem.style_id, distance, safePoolSize, totalSets, resItem.time_record, splitJson, resItem.rank ? parseInt(resItem.rank) : null, parent_id]
        );
      }
      return res.status(200).json({ success: true, message: 'Data event kejuaraan berhasil disimpan!' });
    }

    // [POST] UPDATE KEJUARAAN PARENTS
    if (req.method === 'POST' && action === 'update_kejuaraan') {
      const { parent_id, athlete_id, event_id, title, level, event_date, pool_size, results } = req.body;
      if (!event_id || !athlete_id || !title || !results || results.length === 0) return res.status(400).json({ success: false, message: 'Data kurang lengkap!' });

      const cryptoLib = globalThis.crypto || await import('node:crypto');
      const safePoolSize = parseInt(pool_size) || 50; 

      await db.query(`UPDATE events SET title=?, level=?, event_date=? WHERE id=?`, [title, level || 'Lokal', event_date, event_id]);

      // Handle Update/Insert for each result
      const activeResultIds = [];

      for (const resItem of results) {
        const distance = parseInt(resItem.distance) || 50;
        const totalSets = Math.ceil(distance / safePoolSize);
        
        if (resItem.result_id) {
          // Update existing
          activeResultIds.push(resItem.result_id);
          await db.query(
            `UPDATE event_results SET style_id=?, distance_meters=?, pool_size=?, total_sets=?, time_record=?, \`rank\`=? WHERE id=?`,
            [resItem.style_id, distance, safePoolSize, totalSets, resItem.time_record, resItem.rank ? parseInt(resItem.rank) : null, resItem.result_id]
          );
        } else {
          // Insert new
          const newResultId = cryptoLib.randomUUID();
          activeResultIds.push(newResultId);
          const splitJson = JSON.stringify(resItem.splits || []);
          await db.query(
            `INSERT INTO event_results (id, event_id, athlete_id, style_id, distance_meters, pool_size, total_sets, time_record, split_times_json, \`rank\`, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [newResultId, event_id, athlete_id, resItem.style_id, distance, safePoolSize, totalSets, resItem.time_record, splitJson, resItem.rank ? parseInt(resItem.rank) : null, parent_id]
          );
        }
      }

      // Optional: If they delete a row in UI, we delete from DB where id not in activeResultIds.
      // But we must NOT delete rows that have split_times_json if we want to be super safe. 
      // For now, let's just delete rows that are missing.
      if (activeResultIds.length > 0) {
        const placeholders = activeResultIds.map(() => '?').join(',');
        await db.query(`DELETE FROM event_results WHERE event_id=? AND id NOT IN (${placeholders})`, [event_id, ...activeResultIds]);
      }

      return res.status(200).json({ success: true, message: 'Data event kejuaraan berhasil diupdate!' });
    }

    // =======================================================
    // [POST] INPUT DATA FISIK / BIOMETRIK ANAK OLEH ORANG TUA
    // =======================================================
    if (req.method === 'POST' && action === 'input_biometrik') {
      const { athlete_id, height_cm, weight_kg, arm_span_cm, recorded_at } = req.body;

      if (!athlete_id || !recorded_at) {
        return res.status(400).json({ success: false, message: 'Data Atlet dan Tanggal wajib diisi bray!' });
      }

      await db.query(
        `INSERT INTO athlete_biometrics (athlete_id, height_cm, weight_kg, arm_span_cm, recorded_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [athlete_id, height_cm || null, weight_kg || null, arm_span_cm || null, recorded_at]
      );

      return res.status(201).json({ success: true, message: 'Data biometrik anak berhasil disimpan!' });
    }

    return res.status(400).json({ success: false, message: 'Aksi tidak dikenali bray!' });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Crash API Parents: " + error.message });
  }
}