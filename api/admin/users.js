import { getDB } from '../db.js';

export default async function handler(req, res) {
  // Set header respons wajib JSON biar front-end gak pusing parsing token 'A' bray
  res.setHeader('Content-Type', 'application/json');

  let db;
  try {
    db = await getDB();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database pool gagal diinisialisasi bray!" });
    }
  } catch (dbError) {
    return res.status(500).json({ success: false, error: "Koneksi TiDB Gagal: " + dbError.message });
  }

  // -------------------------------------------------------
  // [GET] AMBIL SEMUA DATA USER DARI TABEL PROFILES
  // -------------------------------------------------------
  if (req.method === 'GET') {
    try {
      // Gua sederhanain query-nya dulu bray, mastiin gak ada kolom ghaib yang bikin crash 500
      const [rows] = await db.query(
        `SELECT id, full_name, username, email, role, no_wa, group_level 
         FROM profiles 
         ORDER BY full_name ASC`
      );
      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      // Tangkap error asli MySQL (misal: table not found atau unknown column)
      return res.status(500).json({ success: false, error: "Query MySQL Crash: " + error.message });
    }
  }

  // -------------------------------------------------------
  // [PUT] UPDATE DATA UTAMA & ROLE USER
  // -------------------------------------------------------
  if (req.method === 'PUT') {
    const { id, full_name, username, email, no_wa, role, group_level } = req.body;
    if (!id || !full_name) return res.status(400).json({ success: false, message: 'ID & Nama wajib diisi bray!' });

    try {
      if (group_level) {
        await db.query(
          `UPDATE profiles SET full_name = ?, username = ?, email = ?, no_wa = ?, group_level = ? WHERE id = ?`,
          [full_name, username, email, no_wa, group_level, id]
        );
      } else {
        await db.query(
          `UPDATE profiles SET full_name = ?, username = ?, email = ?, no_wa = ?, role = ? WHERE id = ?`,
          [full_name, username, email, no_wa, role, id]
        );
      }
      return res.status(200).json({ success: true, message: 'Data berhasil diperbarui!' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // -------------------------------------------------------
  // [DELETE] HAPUS PERMANEN USER
  // -------------------------------------------------------
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'ID mana bray?' });

    try {
      await db.query('DELETE FROM profiles WHERE id = ?', [id]);
      return res.status(200).json({ success: true, message: 'User berhasil dihapus!' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}