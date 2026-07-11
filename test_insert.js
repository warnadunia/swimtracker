import dotenv from 'dotenv';
dotenv.config();
import { getDB } from './api/db.js';

async function run() {
  const db = await getDB();
  try {
    const athlete_id = 'd7af39cf-0f59-4a06-ba08-fc41bd6bfccb'; // from user prompt
    
    // Check if athlete exists
    const [athl] = await db.query('SELECT id FROM profiles WHERE id=?', [athlete_id]);
    console.log('Athlete exists?', athl.length > 0);

    // Get an event that was inserted
    const [events] = await db.query('SELECT * FROM events ORDER BY created_at DESC LIMIT 1');
    const ev = events[0];
    console.log('Event:', ev.id, ev.created_by);
    
    // Get a style
    const [styles] = await db.query('SELECT id FROM swimming_styles LIMIT 1');
    const style_id = styles[0].id;
    console.log('Style:', style_id);
    
    await db.query(
      `INSERT INTO event_results (id, event_id, athlete_id, style_id, distance_meters, pool_size, total_sets, time_record, split_times_json, \`rank\`, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['test-uuid-1234', ev.id, athlete_id, style_id, 50, 50, 1, '00:30.00', '[]', 1, ev.created_by]
    );
    console.log('Insert succeeded!');
  } catch (err) {
    console.error('Insert failed:', err.message);
  }
  process.exit(0);
}

run();
