import { getDB } from '../db.js';

export default async function handler(req, res) {
  const db = await getDB();

  // =======================================================
  // [GET] AMBIL SEMUA USER & PROFILE (Untuk Kelola Akun)
  // =======================================================
  if (req.method === 'GET') {
    try {
      const [rows] = await db.query(
        `SELECT p.id, p.full_name, p.username, p.email, p.role, p.group_level, p.created_at 
         FROM profiles p 
         JOIN users u ON p.id = u.id 
         ORDER BY p.created_at DESC`
      );
      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
// -------------------------------------------------------
// [PUT] SAVE EDITAN DATA PROFILE & ROLE DARI MODAL ADMIN
// -------------------------------------------------------
if (req.method === 'PUT') {
  // Tambahkan role dan group_level (opsional fallback) ke destructuring body
  const { id, full_name, username, email, no_wa, role, group_level } = req.body;
  if (!id || !full_name) return res.status(400).json({ success: false, message: 'ID & Nama tidak boleh kosong!' });

  try {
    // Jika request membawa group_level (seperti saat pelatih mutasi kelas), update kolom tersebut.
    // Jika tidak membawa group_level, biarkan group_level yang sudah ada tetap utuh bray.
    if (group_level) {
      await db.query(
        `UPDATE profiles 
         SET full_name = ?, username = ?, email = ?, no_wa = ?, group_level = ?
         WHERE id = ?`,
        [full_name, username, email, no_wa, group_level, id]
      );
    } else {
      // Update data personal + perubahan ROLE murni dari dashboard admin
      await db.query(
        `UPDATE profiles 
         SET full_name = ?, username = ?, email = ?, no_wa = ?, role = ? 
         WHERE id = ?`,
        [full_name, username, email, no_wa, role, id]
      );
    }
    return res.status(200).json({ success: true, message: 'Data profil & Role berhasil di-update!' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}