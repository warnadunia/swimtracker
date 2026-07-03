const fs = require('fs');
let code = fs.readFileSync('src/main.js', 'utf8');

const targetRegex1 = /const { data: profile } = await supabase.from\('profiles'\).select\('role, birth_year'\).eq\('id', user.id\).single\(\);/;

const replacement1 = `window.masterCategories = [];
  const { data: categories } = await supabase.from('master_categories').select('*').order('name');
  if (categories) window.masterCategories = categories;

  const { data: profile } = await supabase.from('profiles').select('role, birth_year').eq('id', user.id).single();`;

code = code.replace(targetRegex1, replacement1);
fs.writeFileSync('src/main.js', code);
