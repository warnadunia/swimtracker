import { supabase } from './supabase';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Proteksi Halaman: Pastikan Admin
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = '/index.html'; return; }
  
  const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (!p || p.role !== 'admin') { window.location.href = '/app.html'; return; }

  // 2. Load Data Atlet
  async function loadAtlet() {
    const { data } = await supabase.from('profiles').select('id, full_name, username');
    document.getElementById('admin-atlet-list').innerHTML = data.map(u => `
      <tr class="border-b border-gray-800">
        <td class="py-3">${u.full_name}</td>
        <td class="py-3 text-gray-400">${u.username || '-'}</td>
        <td class="py-3">
          <button onclick="window.resetPass('${u.username}')" class="text-yellow-500 mr-3">Reset</button>
          <button onclick="window.hapusUser('${u.id}')" class="text-red-500">Hapus</button>
        </td>
      </tr>`).join('');
  }

  // 3. Load Data Kategori
  async function loadCategories() {
    const { data } = await supabase.from('master_categories').select('*').order('name');
    document.getElementById('admin-category-list').innerHTML = data.map(i => `
      <tr class="border-b border-gray-800">
        <td class="py-2">${i.name}</td>
        <td class="py-2 text-right"><button onclick="window.deleteCategory('${i.id}')" class="text-red-500">Hapus</button></td>
      </tr>`).join('');
  }

  // 4. Ekspos fungsi ke window agar bisa dipanggil tombol HTML
  window.resetPass = async (user) => {
    const pass = prompt("Masukkan password baru untuk " + user);
    if (pass) {
      const { data, error } = await supabase.rpc('admin_reset_password', { target_username: user, new_password: pass });
      alert(error ? error.message : "Reset sukses: " + data);
    }
  };

  window.hapusUser = async (id) => {
    if (confirm("Hapus atlet ini?")) {
      await supabase.from('profiles').delete().eq('id', id);
      loadAtlet();
    }
  };

  window.deleteCategory = async (id) => {
    await supabase.from('master_categories').delete().eq('id', id);
    loadCategories();
  };

  document.getElementById('btn-add-category').addEventListener('click', async () => {
    const name = document.getElementById('admin-new-category').value;
    if(name) { await supabase.from('master_categories').insert([{ name }]); loadCategories(); }
  });

  loadAtlet();
  loadCategories();
});