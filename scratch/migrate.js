import dotenv from 'dotenv';
dotenv.config();
import { getDB } from '../api/db.js';

async function run() {
  try {
    const db = await getDB();
    console.log('Connected to DB');
    
    const athlete_id = 'd7af39cf-0f59-4a06-ba08-fc41bd6bfccb';
    const [styles] = await db.query('SELECT id, name FROM swimming_styles');
    
    const freeStyleId = styles.find(s => s.name.toLowerCase().includes('bebas'))?.id;
    const breastStyleId = styles.find(s => s.name.toLowerCase().includes('dada'))?.id;
    console.log('Styles:', freeStyleId, breastStyleId);

    // 1. Create table
    await db.query(`
      CREATE TABLE IF NOT EXISTS dryland_tasks (
        id varchar(36) PRIMARY KEY DEFAULT (UUID()),
        athlete_id varchar(36) NOT NULL,
        coach_id varchar(36) NOT NULL,
        task_name varchar(255) NOT NULL,
        task_date date NOT NULL,
        status enum('pending', 'completed') DEFAULT 'pending',
        created_at timestamp DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table dryland_tasks created');

    const [coachRows] = await db.query(`SELECT id FROM profiles WHERE role = 'coach' LIMIT 1`);
    const coachId = coachRows[0]?.id || athlete_id;

    // 2. Insert Dryland tasks
    await db.query(`
      INSERT INTO dryland_tasks (athlete_id, coach_id, task_name, task_date)
      VALUES 
        (?, ?, 'Push Up 3x15 Repetisi, Plank 1 Menit', CURDATE()),
        (?, ?, 'Lari 30 Menit, Squat Jump 3x20 Repetisi', CURDATE() + INTERVAL 1 DAY)
    `, [athlete_id, coachId, athlete_id, coachId]);
    console.log('Inserted dryland dummy data');

    // 3. Insert Time Trial with sets
    await db.query(`
      INSERT INTO time_trials_results 
      (athlete_id, coach_id, title_event, style_id, distance_meters, pool_size, total_sets, time_record, split_times_json)
      VALUES 
        (?, ?, 'Latihan Interval Bebas', ?, 200, 50, 4, '02:10.50', '["00:30.10", "00:32.20", "00:33.50", "00:34.70"]'),
        (?, ?, 'Latihan Endurance Dada', ?, 100, 50, 2, '01:25.30', '["00:40.50", "00:44.80"]')
    `, [athlete_id, coachId, freeStyleId, athlete_id, coachId, breastStyleId]);
    console.log('Inserted time trials dummy data');

    // 4. Update Event Results with sets (dummy)
    await db.query(`
      UPDATE event_results 
      SET split_times_json = '["00:30.00", "00:35.00"]', total_sets = 2 
      WHERE athlete_id = ? AND distance_meters = 100 LIMIT 2
    `, [athlete_id]);
    console.log('Updated event_results dummy data');

  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
