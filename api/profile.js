import { getDB } from './db.js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const db = await getDB();
  const { action, user_id } = req.query;

  try {
    if (req.method === 'GET' && action === 'get_profile') {
      if (!user_id) return res.status(400).json({ success: false, message: 'User ID required!' });
      
      const [profiles] = await db.query(`
        SELECT p.*, a.nisn, a.nik, a.gender, a.birth_place, a.birth_date, 
               a.school_name, a.address, a.parent_name_father, a.parent_name_mother, 
               a.parent_phone, a.club_name, a.avatar_url
        FROM profiles p
        LEFT JOIN athlete_biodata a ON p.id = a.athlete_id
        WHERE p.id = ?
      `, [user_id]);

      if (profiles.length === 0) return res.status(404).json({ success: false, message: 'Profile not found' });
      return res.status(200).json({ success: true, data: profiles[0] });
    }

    if (req.method === 'POST' && action === 'update_profile') {
      const { user_id, profile_data, biodata, avatar_base64 } = req.body;
      if (!user_id) return res.status(400).json({ success: false, message: 'User ID required!' });

      let avatarUrl = biodata.avatar_url;

      // Handle base64 image upload
      if (avatar_base64) {
        const matches = avatar_base64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const type = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const fileName = `avatar_${user_id}_${Date.now()}.${type}`;
          const filePath = path.join(process.cwd(), 'public', 'avatars', fileName);
          fs.writeFileSync(filePath, buffer);
          avatarUrl = `/avatars/${fileName}`;
        }
      }

      await db.query(`
        UPDATE profiles SET
          full_name = ?, username = ?, email = ?, birth_year = ?
        WHERE id = ?
      `, [profile_data.full_name, profile_data.username, profile_data.email, profile_data.birth_year, user_id]);

      await db.query(`
        INSERT INTO athlete_biodata 
        (athlete_id, nisn, nik, gender, birth_place, birth_date, school_name, address, parent_name_father, parent_name_mother, parent_phone, club_name, avatar_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        nisn=VALUES(nisn), nik=VALUES(nik), gender=VALUES(gender), birth_place=VALUES(birth_place), birth_date=VALUES(birth_date),
        school_name=VALUES(school_name), address=VALUES(address), parent_name_father=VALUES(parent_name_father),
        parent_name_mother=VALUES(parent_name_mother), parent_phone=VALUES(parent_phone), club_name=VALUES(club_name), avatar_url=VALUES(avatar_url)
      `, [
        user_id, biodata.nisn, biodata.nik, biodata.gender, biodata.birth_place, biodata.birth_date,
        biodata.school_name, biodata.address, biodata.parent_name_father, biodata.parent_name_mother,
        biodata.parent_phone, biodata.club_name, avatarUrl
      ]);

      return res.status(200).json({ success: true, message: 'Profile updated successfully!', avatar_url: avatarUrl });
    }

    return res.status(400).json({ success: false, message: 'Unknown action' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
