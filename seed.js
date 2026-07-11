import 'dotenv/config';
import { getDB } from './api/db.js';

async function seed() {
  const db = await getDB();
  const athleteId = 'd7af39cf-0f59-4a06-ba08-fc41bd6bfccb';
  
  const styleBebas = '35c9b13f-0144-4a70-b776-5c5d1122f579';
  const styleDada = '48b2e337-d929-4fd4-919b-eb48042bbe13';

  const [eventResult] = await db.query(
    'INSERT INTO events (title, level, event_date, created_by) VALUES (?, ?, ?, ?)',
    ['Kejuaraan Simulasi Debugging', 'Provinsi', '2026-07-20', athleteId]
  );
  
  const [rows] = await db.query('SELECT id FROM events ORDER BY created_at DESC LIMIT 1');
  const eventId = rows[0].id;

  await db.query(
    'INSERT INTO event_results (event_id, athlete_id, style_id, distance_meters, pool_size, time_record, `rank`, split_times_json, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [eventId, athleteId, styleBebas, 100, 50, '01:10.50', null, JSON.stringify(['00:34.20', '00:36.30']), athleteId]
  );

  await db.query(
    'INSERT INTO event_results (event_id, athlete_id, style_id, distance_meters, pool_size, time_record, `rank`, split_times_json, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [eventId, athleteId, styleDada, 50, 50, '', null, null, athleteId]
  );

  console.log('Simulasi inserted successfully. Event ID:', eventId);
  process.exit(0);
}

seed().catch(console.error);
