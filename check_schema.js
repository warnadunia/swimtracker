import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const res = await fetch(`${supabaseUrl}/rest/v1/time_trials_results`, {
    method: 'OPTIONS',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  console.log("time_trials_results OPTIONS status:", res.status);
  const headers = {};
  res.headers.forEach((val, key) => headers[key] = val);
  console.log("Headers:", headers);
  console.log("Body:", await res.text());
}

checkSchema();
