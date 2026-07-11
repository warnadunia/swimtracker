import { getDB } from './api/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = await getDB();
  await db.query(`
    CREATE TABLE IF NOT EXISTS athlete_biodata (
      athlete_id VARCHAR(255) PRIMARY KEY,
      nisn VARCHAR(50),
      nik VARCHAR(50),
      gender ENUM('L', 'P'),
      birth_place VARCHAR(100),
      birth_date DATE,
      school_name VARCHAR(255),
      address TEXT,
      parent_name_father VARCHAR(100),
      parent_name_mother VARCHAR(100),
      parent_phone VARCHAR(50),
      club_name VARCHAR(100),
      avatar_url VARCHAR(255),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log('Table athlete_biodata created.');
  process.exit(0);
}

run().catch(console.error);
