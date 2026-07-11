import { getDB } from './db.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const db = await getDB();
  const { action, parent_id, id } = req.query;

  // =======================================================
  // RUTE PATH ROUTER AKSES ADMIN BRAY
  // =======================================================
  try {
    // 1. GET LIST ALL USERS
    if (req.method === 'GET' && action === 'users') {
      const [rows] = await db.query(`SELECT id, full_name, username, email, role, no_wa, group_level FROM profiles ORDER BY full_name ASC`);
      return res.status(200).json({ success: true, data: rows });
    }

    // 2. GET DAFTAR PRESTASI PODIUM
    if (req.method === 'GET' && action === 'prestasi') {
      const [rows] = await db.query(
        `SELECT er.id, er.rank, er.time_record, er.athlete_id as user_id, er.event_id, er.created_at,
                p.full_name, e.title as event_title, e.event_date, s.name as style_name, er.distance_meters
         FROM event_results er
         JOIN profiles p ON er.athlete_id = p.id
         JOIN events e ON er.event_id = e.id
         JOIN swimming_styles s ON er.style_id = s.id
         WHERE er.rank IN (1, 2, 3) ORDER BY e.event_date DESC`
      );
      return res.status(200).json({ success: true, data: rows });
    }

    // 3. GET RELASI ANAK BERDASARKAN PARENT ID
    if (req.method === 'GET' && action === 'parent-mapping') {
      if (!parent_id) return res.status(400).json({ success: false, message: 'Parent ID dibutuhkan bray!' });
      
      // Sinkronkan JOIN murni ke profiles sesuai FK asli lu bray!
      const [rows] = await db.query(
        `SELECT pa.athlete_id, p.full_name, p.group_level 
         FROM parent_athletes pa 
         JOIN profiles p ON pa.athlete_id = p.id 
         WHERE pa.parent_id = ?`,
        [parent_id]
      );
      return res.status(200).json({ success: true, data: rows });
    }

    // 4. POST ADD NEW USER OLEH ADMIN (FIX VALIDASI STRUKTUR TABEL TiDB)
    if (req.method === 'POST' && action === 'add-user') {
      const { full_name, username, email, password, role } = req.body;
      if (!full_name || !username || !password || !role) {
        return res.status(400).json({ success: false, message: 'Nama, Username, Password, dan Role wajib diisi bray!' });
      }

      // Cek duplikat username di tabel profiles bray
      const [existing] = await db.query('SELECT id FROM profiles WHERE username = ?', [username.trim()]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Username sudah terpakai bray, cari nama lain!' });
      }

      // Generate UUID 36 karakter yang sah sesuai standard PRIMARY KEY lu
      const userId = crypto.randomUUID ? crypto.randomUUID() : crypto.webcrypto.randomUUID();
      
      // Gunakan email input atau bikin email bayangan (.local) jika opsional kosong, 
      // karena kolom email di tabel 'users' statusnya NOT NULL bray!
      const secureEmail = email ? email.trim() : `${username.trim()}@swimapp.local`;

      // [FIX AMAN 100%] Masukkan data murni ke tabel users sesuai kolom aslinya (id, email)
      await db.query(
        'INSERT INTO users (id, email) VALUES (?, ?)', 
        [userId, secureEmail]
      );

      // Masukkan biodata lengkap ke tabel profiles (password ditaruh di sini sementara jika lu mau kembangkan loginnya bray)
      await db.query(
        `INSERT INTO profiles (id, full_name, username, email, role, group_level) 
         VALUES (?, ?, ?, ?, ?, 'Basic 1')`, 
        [userId, full_name.trim(), username.trim(), secureEmail, role]
      );

      return res.status(201).json({ success: true, message: `User baru dengan role [${role}] sukses dibuat!` });
    }

    // 5. POST KONEKSIKAN ATLET BARU KE PARENT (VERIFIKASI ADMIN)
    if (req.method === 'POST' && action === 'connect-athlete') {
      const { parent_id, athlete_id } = req.body;
      if (!parent_id || !athlete_id) return res.status(400).json({ success: false, message: 'Data kurang lengkap bray!' });

      const [check] = await db.query(
        'SELECT id FROM parent_athletes WHERE parent_id = ? AND athlete_id = ?', 
        [parent_id, athlete_id]
      );
      if (check.length > 0) return res.status(400).json({ success: false, message: 'Atlet ini sudah terhubung bray!' });

      // Sesuai dengan skema tabel parent_athletes lu yang AUTO_INCREMENT bray!
      await db.query(
        'INSERT INTO parent_athletes (parent_id, athlete_id) VALUES (?, ?)', 
        [parent_id, athlete_id]
      );
      return res.status(201).json({ success: true, message: 'Atlet berhasil dikoneksikan ke Orang Tua!' });
    }

    // 6. PUT UPDATE USER / MUTASI ROLE INLINE
    if (req.method === 'PUT') {
      const { id, full_name, username, email, no_wa, role, group_level } = req.body;
      if (group_level) {
        await db.query(`UPDATE profiles SET full_name = ?, username = ?, email = ?, no_wa = ?, group_level = ? WHERE id = ?`, [full_name, username, email, no_wa, group_level, id]);
      } else {
        await db.query(`UPDATE profiles SET full_name = ?, username = ?, email = ?, no_wa = ?, role = ? WHERE id = ?`, [full_name, username, email, no_wa, role, id]);
      }
      return res.status(200).json({ success: true, message: 'Berhasil diupdate!' });
    }

    // 7. DELETE HAPUS PERMANEN USER
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ success: false, message: 'ID mana bray?' });
      await db.query('DELETE FROM profiles WHERE id = ?', [id]);
      return res.status(200).json({ success: true, message: 'User berhasil dihapus!' });
    }

    // =======================================================
    // [GET, POST, PUT, DELETE] MANAJEMEN NOMOR LOMBA (STYLES)
    // =======================================================
    if (action === 'styles') {
      if (req.method === 'GET') {
        const [rows] = await db.query(`SELECT * FROM swimming_styles ORDER BY name ASC`);
        return res.status(200).json({ success: true, data: rows });
      }
      if (req.method === 'POST') {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Nama nomor lomba kosong!' });
        const cryptoLib = globalThis.crypto || await import('node:crypto');
        const id = cryptoLib.randomUUID();
        await db.query(`INSERT INTO swimming_styles (id, name) VALUES (?, ?)`, [id, name]);
        return res.status(201).json({ success: true });
      }
      if (req.method === 'PUT') {
        const { id, name } = req.body;
        if (!id || !name) return res.status(400).json({ success: false });
        await db.query(`UPDATE swimming_styles SET name = ? WHERE id = ?`, [name, id]);
        return res.status(200).json({ success: true });
      }
      if (req.method === 'DELETE') {
        const { id } = req.body;
        try {
          await db.query(`DELETE FROM swimming_styles WHERE id = ?`, [id]);
          return res.status(200).json({ success: true });
        } catch (err) {
          // Tangani error kalau gaya renang udah telanjur dipakai di tabel event_results
          return res.status(400).json({ success: false, message: 'Gagal! Nomor ini sedang dipakai di rekor atlet.' });
        }
      }
    }

    return res.status(400).json({ success: false, message: 'Action tidak valid bray!' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}