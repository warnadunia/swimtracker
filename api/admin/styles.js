import { getDB } from '../db.js';

export default async function handler(req, res) {
  const db = await getDB();

  // =======================================================
  // [GET] AMBIL SEMUA GAYA RENANG (Untuk Dropdown & Tabel)
  // =======================================================
  if (req.method === 'GET') {
    try {
      const [rows] = await db.query(
        'SELECT id, name, created_at FROM swimming_styles ORDER BY name ASC'
      );
      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // =======================================================
  // [POST] TAMBAH GAYA RENANG BARU (Oleh Admin)
  // =======================================================
  if (req.method === 'POST') {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Nama gaya renang wajib diisi bray!' });
    }

    try {
      // Kita pakai UUID() bawaan TiDB yang sudah kita set di skema DDL
      await db.query(
        'INSERT INTO swimming_styles (name) VALUES (?)',
        [name.trim()]
      );
      return res.status(201).json({ success: true, message: 'Gaya renang baru berhasil ditambahkan!' });
    } catch (error) {
      // Handle jika admin input nama gaya yang sudah ada (Unique Constraint)
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Gaya renang ini sudah ada di sistem bray!' });
      }
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}