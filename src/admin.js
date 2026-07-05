import { supabase } from './supabase';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Proteksi Halaman: Pastikan Admin
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { 
    window.location.href = '/index.html'; 
    return; 
  }
  
  const { data: p } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  if (!p || p.role !== 'admin') { 
    window.location.href = '/app.html'; 
    return; 
  }

  // State Management Internal
  let currentRoleFilter = 'admin';
  let currentGayaFilter = 'Bebas';
  let allUsersCache = [];
  let allCategoriesCache = [];

  // ==========================================
  // 2. MODUL 1: USERS (Admin | Coach | Atlet)
  // ==========================================
  async function loadUsers() {
    // Tarik juga email dan no_wa dari tabel profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, role, email, no_wa')
      .order('full_name');
    
    if (!error && data) {
      allUsersCache = data;
      renderUsers();
    }
  }

  function renderUsers() {
    const filtered = allUsersCache.filter(u => u.role === currentRoleFilter);
    const container = document.getElementById('admin-user-list');
    if (!container) return;
    
    if (filtered.length === 0) {
      container.innerHTML = `<tr><td colspan="2" class="text-center py-4 text-gray-400 text-xs">Tidak ada data user (${currentRoleFilter})</td></tr>`;
      return;
    }

    let html = '';
    filtered.forEach(u => {
      const usernameDisplay = u.username ? `@${u.username}` : '-';
      const emailDisplay = u.email ? u.email : 'No Email';
      
      // Inject parameter lengkap ke fungsi editUser
      html += `
        <tr class="hover:bg-gray-100/30 dark:hover:bg-[#282033] transition-colors">
          <td class="px-3 py-3 font-medium text-gray-800 dark:text-gray-200">
            <div>${u.full_name}</div>
            <div class="text-[10px] text-gray-400 font-normal flex flex-col mt-0.5">
              <span>${usernameDisplay} | ${emailDisplay}</span>
              ${u.no_wa ? `<span class="text-green-600 dark:text-green-500">WA: ${u.no_wa}</span>` : ''}
            </div>
          </td>
          <td class="px-3 py-3">
            <div class="flex gap-1.5 justify-center">
              <button onclick="window.editUser('${u.id}', '${u.full_name}', '${u.username || ''}', '${u.email || ''}', '${u.no_wa || ''}')" class="bg-gray-100 dark:bg-[#2a2235] p-1.5 rounded-lg text-[11px] hover:text-blue-500 transition-colors" title="Edit">✏️</button>
              <button onclick="window.resetPass('${u.username}')" class="bg-gray-100 dark:bg-[#2a2235] p-1.5 rounded-lg text-[11px] hover:text-yellow-600 transition-colors" title="Reset Password">🔑</button>
              <button onclick="window.hapusUser('${u.id}')" class="bg-gray-100 dark:bg-[#2a2235] p-1.5 rounded-lg text-[11px] hover:text-brand-red transition-colors" title="Hapus">❌</button>
            </div>
          </td>
        </tr>
      `;
    });
    container.innerHTML = html;
  }

window.filterUserRole = (role) => {
    currentRoleFilter = role;
    
    // Logika ganti warna UI Tab
    document.querySelectorAll('.role-filter-btn').forEach(btn => {
      btn.classList.remove('bg-white', 'dark:bg-[#18131f]', 'text-gray-800', 'dark:text-white', 'shadow-sm', 'font-bold');
      btn.classList.add('text-gray-400');
    });
    
    const activeBtn = document.getElementById('role-' + role);
    if (activeBtn) {
      activeBtn.classList.add('bg-white', 'dark:bg-[#18131f]', 'text-gray-800', 'dark:text-white', 'shadow-sm', 'font-bold');
      activeBtn.classList.remove('text-gray-400');
    }

    renderUsers();
  };

  // ---------------- KONTROL MODAL EDIT USER ----------------
  window.editUser = (id, name, username, email, wa) => {
    // Isi data ke form modal
    document.getElementById('edit-user-id').value = id;
    document.getElementById('edit-user-name').value = name !== 'undefined' ? name : '';
    document.getElementById('edit-user-username').value = username !== 'undefined' ? username : '';
    document.getElementById('edit-user-email').value = email !== 'undefined' ? email : '';
    document.getElementById('edit-user-wa').value = wa !== 'undefined' ? wa : '';
    
    // Tampilkan Modal
    document.getElementById('modal-edit-user').classList.remove('hidden');
  };

  window.closeEditModal = () => {
    document.getElementById('modal-edit-user').classList.add('hidden');
  };

  window.saveUserEdit = async () => {
    const id = document.getElementById('edit-user-id').value;
    const newName = document.getElementById('edit-user-name').value.trim();
    const newUsername = document.getElementById('edit-user-username').value.trim();
    const newEmail = document.getElementById('edit-user-email').value.trim();
    const newWa = document.getElementById('edit-user-wa').value.trim();

    if (!newName) {
      alert("Nama lengkap tidak boleh kosong!");
      return;
    }

    // Update data ke tabel profiles
    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: newName,
        username: newUsername,
        email: newEmail,
        no_wa: newWa
      })
      .eq('id', id);

    if (error) {
      alert("Gagal update user: " + error.message);
    } else {
      window.closeEditModal();
      loadUsers(); // Refresh tabel setelah save
    }
  };
  // ---------------------------------------------------------

  window.resetPass = async (user) => {
    const pass = prompt("Masukkan password baru untuk @" + user);
    if (pass) {
      const { data, error } = await supabase.rpc('admin_reset_password', { target_username: user, new_password: pass });
      alert(error ? error.message : "Reset sukses: " + data);
    }
  };

  window.hapusUser = async (id) => {
    if (confirm("Hapus pengguna ini secara permanen?")) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) alert(error.message);
      else loadUsers();
    }
  };

  // ==========================================
  // 3. MODUL 2: NOMOR LOMBA (Kategori & Pills)
  // ==========================================
  async function loadCategories() {
    const { data, error } = await supabase.from('master_categories').select('*').order('name');
    if (!error && data) {
      allCategoriesCache = data;
      renderCategories();
    }
  }

  function renderCategories() {
    const filtered = allCategoriesCache.filter(c => {
      const lowerName = c.name.toLowerCase();
      if (currentGayaFilter === 'Ganti') return lowerName.includes('ganti');
      return lowerName.includes(currentGayaFilter.toLowerCase());
    });

    const container = document.getElementById('admin-category-list');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = `<tr><td colspan="2" class="text-center py-4 text-gray-400 text-xs">Tidak ada kategori Gaya ${currentGayaFilter}</td></tr>`;
      return;
    }

    let html = '';
    filtered.forEach(i => {
      html += `
        <tr class="hover:bg-gray-100/30 dark:hover:bg-[#282033] transition-colors">
          <td class="px-3 py-2.5 font-medium text-gray-800 dark:text-gray-200">${i.name}</td>
          <td class="px-3 py-2.5 text-center">
            <button onclick="window.deleteCategory('${i.id}')" class="text-brand-red font-semibold text-xs hover:underline">Hapus</button>
          </td>
        </tr>
      `;
    });
    container.innerHTML = html;
  }

  window.filterGayaNomor = (gaya) => {
    currentGayaFilter = gaya;
    renderCategories();
  };

  window.deleteCategory = async (id) => {
    if (confirm("Hapus kategori nomor lomba ini?")) {
      const { error } = await supabase.from('master_categories').delete().eq('id', id);
      if (error) alert(error.message);
      else loadCategories();
    }
  };

  const addCatBtn = document.getElementById('btn-add-category');
  if (addCatBtn) {
    addCatBtn.addEventListener('click', async () => {
      const inputEl = document.getElementById('admin-new-category');
      const name = inputEl ? inputEl.value.trim() : '';
      if (name) {
        const { error } = await supabase.from('master_categories').insert([{ name }]);
        if (error) alert(error.message);
        else {
          inputEl.value = '';
          loadCategories();
        }
      }
    });
  }

  // State Tambahan untuk Filter Prestasi
  let currentTahunPrestasi = 'ALL';
  let allPrestasiCache = [];

  // ==========================================
  // 4. MODUL 3: DAFTAR PRESTASI (Bulletproof & Debug Mode)
  // ==========================================
  async function loadPrestasiTerbaru() {
    const container = document.getElementById('admin-prestasi-container');
    if (container) container.innerHTML = `<div class="text-center py-6 text-blue-500 text-xs">Memuat data database... ⏳</div>`;

    // 1. Tarik data event_results mentah
    const { data: eventResults, error: errResults } = await supabase
      .from('event_results')
      .select('id, rank, time_record, user_id, event_id, category, created_at');

    if (errResults) {
      if (container) container.innerHTML = `<div class="text-center py-6 text-brand-red text-xs font-bold">Error DB: ${errResults.message}</div>`;
      return;
    }

    // 🚨 RADAR RLS SUPABASE: Kalau DB balikin array kosong, langsung kasih tau di UI
    if (!eventResults || eventResults.length === 0) {
      if (container) container.innerHTML = `<div class="text-center py-6 text-brand-red text-xs font-bold">⚠️ Tabel event_results kosong ATAU terblokir RLS Supabase (Row Level Security). Cek Policy!</div>`;
      return;
    }

    // 2. Tarik data profile dan event pendukung
    const [
      { data: userProfiles }, 
      { data: eventsList }
    ] = await Promise.all([
      supabase.from('profiles').select('id, full_name'),
      supabase.from('events').select('id, title, event_date')
    ]);

    const profileMap = {};
    if (userProfiles) userProfiles.forEach(u => { profileMap[u.id] = u.full_name; });

    const eventMap = {};
    if (eventsList) eventsList.forEach(e => { eventMap[e.id] = { title: e.title, date: e.event_date }; });

    // 3. Simpan SEMUA data ke cache (filter podium-nya kita lakukan di saat render biar aman dari tipe data)
    allPrestasiCache = eventResults;
    
    window.renderPrestasiData(profileMap, eventMap);
  }

  window.renderPrestasiData = (profileMap, eventMap) => {
    const container = document.getElementById('admin-prestasi-container');
    if (!container) return;

    const grouped = {};

    // 4. Grouping dan Filter Presisi
    allPrestasiCache.forEach(item => {
      // Paksa parsing rank menjadi angka murni
      const rankAngka = parseInt(item.rank, 10);
      
      // Filter Podium: Abaikan jika bukan rank 1, 2, atau 3 (atau bernilai null)
      if (isNaN(rankAngka) || rankAngka < 1 || rankAngka > 3) return;
      if (!item.user_id) return;
      
      const eventData = eventMap[item.event_id];
      let eventYear = "";
      let eventTitle = "";
      let eventDateObj = null;

      if (eventData && eventData.date) {
        eventYear = new Date(eventData.date).getFullYear().toString();
        eventTitle = eventData.title;
        eventDateObj = new Date(eventData.date);
      } else {
        eventYear = new Date(item.created_at).getFullYear().toString();
        eventTitle = "Event Terbuka (Tidak Terkategori)";
        eventDateObj = new Date(item.created_at);
      }

      // Filter berdasarkan Dropdown Tahun
      if (currentTahunPrestasi !== 'ALL' && eventYear !== currentTahunPrestasi) return;

      const atletName = profileMap[item.user_id] || 'Atlet Tidak Diketahui';
      const categoryName = item.category || 'Nomor Tidak Diketahui';
      const safeEventId = item.event_id || 'no-event';
      const key = `${item.user_id}-${safeEventId}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          atletName: atletName,
          eventTitle: eventTitle,
          eventDate: eventDateObj,
          eventYear: eventYear,
          gold: 0,
          silver: 0,
          bronze: 0,
          details: []
        };
      }

      // Hitung Medali Menggunakan Variabel Angka Murni yang sudah di-parse
      if (rankAngka === 1) grouped[key].gold++;
      else if (rankAngka === 2) grouped[key].silver++;
      else if (rankAngka === 3) grouped[key].bronze++;

      grouped[key].details.push({
        nomorLomba: categoryName,
        waktu: item.time_record || '00:00:00',
        rank: rankAngka
      });
    });

    const sortedPrestasi = Object.values(grouped).sort((a, b) => {
      return b.eventDate - a.eventDate; // Terbaru di atas, terlama di bawah
    });
    
    if (sortedPrestasi.length === 0) {
      container.innerHTML = `<div class="text-center py-6 text-gray-400 text-xs">Tidak ada data prestasi di tahun ${currentTahunPrestasi}.</div>`;
      return;
    }

    let finalHTML = '';
    sortedPrestasi.forEach((group, index) => {
      const rowId = `row-atlet-${index}`;
      let detailsHTML = '';
      
      // 1. Format tanggal event biar cakep (Contoh: 04 Jul 2026)
      const tglEvent = group.eventDate.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short', 
        year: 'numeric'
      });
      
      group.details.forEach(d => {
        let rankBadge = '';
        if (d.rank === 1) rankBadge = '<span class="ml-2 bg-yellow-500/10 text-yellow-600 text-[9px] font-bold px-1.5 py-0.5 rounded">Rank 1</span>';
        if (d.rank === 2) rankBadge = '<span class="ml-2 bg-gray-300/20 text-gray-500 dark:text-gray-400 text-[9px] font-bold px-1.5 py-0.5 rounded">Rank 2</span>';
        if (d.rank === 3) rankBadge = '<span class="ml-2 bg-amber-600/10 text-amber-600 text-[9px] font-bold px-1.5 py-0.5 rounded">Rank 3</span>';

        // 2. Tambahkan variabel tglEvent di bawah nama nomor lomba
        detailsHTML += `
          <div class="flex justify-between items-center py-2.5 border-b border-gray-100/50 dark:border-gray-800/40 last:border-0">
            <div>
              <div class="text-gray-600 dark:text-gray-400 font-medium">${d.nomorLomba}</div>
            </div>
            <div class="text-right flex flex-col items-center gap-1">
              <span class="font-mono font-semibold dark:text-white leading-none">${d.waktu}</span>
            </div>
            <div class="text-right flex flex-col items-end gap-1">
              <span class="font-mono font-semibold dark:text-white leading-none">${rankBadge}</span>
            </div>
          </div>
        `;
      });

      finalHTML += `
        <div class="bg-gray-50 dark:bg-[#1f1927] rounded-2xl border border-gray-100 dark:border-gray-800/60 overflow-hidden shadow-sm">
          <div onclick="toggleNestedRow('${rowId}')" class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-100/50 dark:hover:bg-[#251f2e]/50 transition-colors">
            <div class="flex-1 min-w-0 pr-2">
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-xs text-gray-800 dark:text-gray-100 truncate">${group.atletName}</h4>
              </div>
              <p class="text-[10px] text-gray-400 truncate mt-0.5"><span class="text-[9px] bg-blue-500/10 text-blue-500 px-1 rounded-md font-bold">${tglEvent}</span> ${group.eventTitle}</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex gap-1.5 text-[10px] font-bold">
                <span class="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded" title="Emas">${group.gold}</span>
                <span class="bg-gray-300/20 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded" title="Perak">${group.silver}</span>
                <span class="bg-amber-600/10 text-amber-600 dark:text-amber-500 px-1.5 py-0.5 rounded" title="Perunggu">${group.bronze}</span>
              </div>
              <span id="arrow-${rowId}" class="text-xs text-gray-400 transition-transform duration-200">🔽</span>
            </div>
          </div>
          <div id="nested-${rowId}" class="hidden border-t border-gray-100 dark:border-gray-800/80 bg-white/50 dark:bg-[#16111c]/40 px-3.5 py-2 text-[11px]">
            ${detailsHTML}
          </div>
        </div>
      `;
    });
    
    container.innerHTML = finalHTML;
  };

  window.filterTahunPrestasi = async () => {
    const filterEl = document.getElementById('prestasi-year-filter');
    if (filterEl) {
      currentTahunPrestasi = filterEl.value.trim(); // Dihapus spasi ghaibnya
      
      const [{ data: userProfiles }, { data: eventsList }] = await Promise.all([
        supabase.from('profiles').select('id, full_name'),
        supabase.from('events').select('id, title, event_date')
      ]);
      
      const profileMap = {};
      if (userProfiles) userProfiles.forEach(u => { profileMap[u.id] = u.full_name; });
      const eventMap = {};
      if (eventsList) eventsList.forEach(e => { eventMap[e.id] = { title: e.title, date: e.event_date }; });
      
      if (typeof window.renderPrestasiData === 'function') {
        window.renderPrestasiData(profileMap, eventMap);
      }
    }
  };

  // Main Inits
  loadUsers();
  loadCategories();
  loadPrestasiTerbaru();

  // Pasang Listener aman untuk Filter
  const filterPrestasiEl = document.getElementById('prestasi-year-filter');
  if (filterPrestasiEl) {
    filterPrestasiEl.addEventListener('change', window.filterTahunPrestasi);
  }

});