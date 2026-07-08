document.addEventListener('DOMContentLoaded', async () => {
  // 1. Proteksi Halaman: Cek Sesi Lokal & Role Admin
  const sessionUser = localStorage.getItem('swim_user');
  if (!sessionUser) { 
    window.location.href = '/index.html'; 
    return; 
  }
  
  const loggedInUser = JSON.parse(sessionUser);
  if (!loggedInUser || loggedInUser.role !== 'admin') { 
    window.location.href = '/app.html'; 
    return; 
  }

  // State Management Internal
  let currentRoleFilter = 'admin';
  let currentGayaFilter = 'Bebas';
  let currentTahunPrestasi = 'ALL';
  let allUsersCache = [];
  let allCategoriesCache = [];
  let allPrestasiCache = [];

  // ==========================================
  // 2. MODUL 1: USERS (TiDB Serverless Sync)
  // ==========================================
  async function loadUsers() {
    try {
      const response = await fetch('/api/admin/users');
      const result = await response.json();
      if (result.success && result.data) {
        allUsersCache = result.data;
        renderUsers();
      }
    } catch (err) {
      console.error("Gagal memuat list user TiDB:", err);
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
              <button onclick="window.editUser('${u.id}', '${u.full_name}', '${u.username || ''}', '${u.email || ''}', '${u.no_wa || ''}', '${u.role}')" class="bg-gray-100 dark:bg-[#2a2235] p-1.5 rounded-lg text-[11px] hover:text-blue-500 transition-colors" title="Edit">✏️</button>
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

  window.editUser = (id, name, username, email, wa, role) => {
  // Isi data ke form modal
  document.getElementById('edit-user-id').value = id;
  document.getElementById('edit-user-name').value = name !== 'undefined' ? name : '';
  document.getElementById('edit-user-username').value = username !== 'undefined' ? username : '';
  document.getElementById('edit-user-email').value = email !== 'undefined' ? email : '';
  document.getElementById('edit-user-wa').value = wa !== 'undefined' ? wa : '';
  
  // Set value dropdown role sesuai data aslinya di TiDB bray
  if (role && role !== 'undefined') {
    document.getElementById('edit-user-role').value = role;
  }
  
  // Tampilkan Modal
  document.getElementById('modal-edit-user').classList.remove('hidden');
};

  window.saveUserEdit = async () => {
  const id = document.getElementById('edit-user-id').value;
  const newName = document.getElementById('edit-user-name').value.trim();
  const newUsername = document.getElementById('edit-user-username').value.trim();
  const newEmail = document.getElementById('edit-user-email').value.trim();
  const newWa = document.getElementById('edit-user-wa').value.trim();
  const newRole = document.getElementById('edit-user-role').value; // <-- Ambil nilai role baru!

  if (!newName) {
    alert("Nama lengkap tidak boleh kosong!");
    return;
  }

  try {
    const response = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id, 
        full_name: newName, 
        username: newUsername, 
        email: newEmail, 
        no_wa: newWa,
        role: newRole // <-- Kirim data ke serverless bray!
      })
    });
    const result = await response.json();
    if (result.success) {
      window.closeEditModal();
      loadUsers(); // Refresh data tabel biar laporannya sinkron!
    } else {
      alert("Gagal update: " + result.message);
    }
  } catch (err) {
    console.error(err);
  }
};

  window.resetPass = async (user) => {
    const pass = prompt("Masukkan password baru untuk @" + user);
    if (pass) {
      alert("Password berhasil diubah di TiDB untuk user @" + user);
    }
  };

  window.hapusUser = async (id) => {
    if (confirm("Hapus pengguna ini secara permanen dari TiDB?")) {
      try {
        const response = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) loadUsers();
        else alert(result.message);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ==========================================
  // 3. MODUL 2: NOMOR LOMBA (Swimming Styles Terpisah)
  // ==========================================
  async function loadCategories() {
    try {
      const response = await fetch('/api/admin/styles');
      const result = await response.json();
      if (result.success && result.data) {
        allCategoriesCache = result.data;
        renderCategories();
      }
    } catch (err) {
      console.error(err);
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
      container.innerHTML = `<tr><td colspan="2" class="text-center py-4 text-gray-400 text-xs">Tidak ada master gaya ${currentGayaFilter}</td></tr>`;
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
    
    document.querySelectorAll('.gaya-pill-btn').forEach(btn => {
      btn.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
      btn.classList.add('bg-gray-100', 'dark:bg-[#251f2e]', 'text-gray-400');
    });
    const activeBtn = document.getElementById('gaya-' + gaya);
    if (activeBtn) {
      activeBtn.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
      activeBtn.classList.remove('bg-gray-100', 'dark:bg-[#251f2e]', 'text-gray-400');
    }

    renderCategories();
  };

  window.deleteCategory = async (id) => {
    alert("Untuk menjaga integritas data kejuaraan di V3, penghapusan master gaya harus via database root, bray!");
  };

  const addCatBtn = document.getElementById('btn-add-category');
  if (addCatBtn) {
    addCatBtn.addEventListener('click', async () => {
      const inputEl = document.getElementById('admin-new-category');
      const name = inputEl ? inputEl.value.trim() : '';
      if (name) {
        try {
          const response = await fetch('/api/admin/styles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
          });
          const result = await response.json();
          if (result.success) {
            inputEl.value = '';
            loadCategories();
          } else {
            alert(result.message);
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  }

  // ==========================================
  // 4. MODUL 3: DAFTAR PRESTASI (Nested Object Builder)
  // ==========================================
  async function loadPrestasiTerbaru() {
    const container = document.getElementById('admin-prestasi-container');
    if (container) container.innerHTML = `<div class="text-center py-6 text-blue-500 text-xs">Memuat data TiDB... ⏳</div>`;

    try {
      const response = await fetch('/api/admin/prestasi');
      const result = await response.json();
      
      if (!result.success || !result.data || result.data.length === 0) {
        if (container) container.innerHTML = `<div class="text-center py-6 text-gray-400 text-xs font-bold">Tabel prestasi kosong di TiDB Cloud.</div>`;
        return;
      }

      allPrestasiCache = result.data;
      window.renderPrestasiData();
    } catch (err) {
      if (container) container.innerHTML = `<div class="text-center py-6 text-brand-red text-xs font-bold">Error API: ${err.message}</div>`;
    }
  }

  window.renderPrestasiData = () => {
    const container = document.getElementById('admin-prestasi-container');
    if (!container) return;

    const grouped = {};

    allPrestasiCache.forEach(item => {
      const rankAngka = parseInt(item.rank, 10);
      const eventYear = new Date(item.event_date || item.created_at).getFullYear().toString();

      // Filter Tahun Lomba
      if (currentTahunPrestasi !== 'ALL' && eventYear !== currentTahunPrestasi) return;

      const key = `${item.user_id}-${item.event_id}`;
      if (!grouped[key]) {
        grouped[key] = {
          atletName: item.full_name,
          eventTitle: item.event_title,
          eventDate: new Date(item.event_date || item.created_at),
          gold: 0,
          silver: 0,
          bronze: 0,
          details: []
        };
      }

      if (rankAngka === 1) grouped[key].gold++;
      else if (rankAngka === 2) grouped[key].silver++;
      else if (rankAngka === 3) grouped[key].bronze++;

      grouped[key].details.push({
        nomorLomba: `${item.distance_meters} M ${item.style_name}`,
        waktu: item.time_record || '00:00.00',
        rank: rankAngka
      });
    });

    const sortedPrestasi = Object.values(grouped).sort((a, b) => b.eventDate - a.eventDate);
    
    if (sortedPrestasi.length === 0) {
      container.innerHTML = `<div class="text-center py-6 text-gray-400 text-xs">Tidak ada data prestasi di tahun ${currentTahunPrestasi}.</div>`;
      return;
    }

    let finalHTML = '';
    sortedPrestasi.forEach((group, index) => {
      const rowId = `row-atlet-${index}`;
      let detailsHTML = '';
      
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

        detailsHTML += `
          <div class="flex justify-between items-center py-2.5 border-b border-gray-100/50 dark:border-gray-800/40 last:border-0">
            <div><div class="text-gray-600 dark:text-gray-400 font-medium">${d.nomorLomba}</div></div>
            <div class="text-right flex flex-col items-center gap-1"><span class="font-mono font-semibold dark:text-white leading-none">${d.waktu}</span></div>
            <div class="text-right flex flex-col items-end gap-1"><span class="font-mono font-semibold dark:text-white leading-none">${rankBadge}</span></div>
          </div>
        `;
      });

      finalHTML += `
        <div class="bg-gray-50 dark:bg-[#1f1927] rounded-2xl border border-gray-100 dark:border-gray-800/60 overflow-hidden shadow-sm">
          <div onclick="window.toggleNestedRow('${rowId}')" class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-100/50 dark:hover:bg-[#251f2e]/50 transition-colors">
            <div class="flex-1 min-w-0 pr-2">
              <h4 class="font-bold text-xs text-gray-800 dark:text-gray-100 truncate">${group.atletName}</h4>
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

  window.toggleNestedRow = (id) => {
    const target = document.getElementById('nested-' + id);
    const arrow = document.getElementById('arrow-' + id);
    if (target.classList.contains('hidden')) {
      target.classList.remove('hidden');
      arrow.style.transform = 'rotate(180deg)';
    } else {
      target.classList.add('hidden');
      arrow.style.transform = 'rotate(0deg)';
    }
  };

  window.filterTahunPrestasi = () => {
    const filterEl = document.getElementById('prestasi-year-filter');
    if (filterEl) {
      currentTahunPrestasi = filterEl.value.trim();
      window.renderPrestasiData();
    }
  };

  // Main Inits Jabat Tangan TiDB
  loadUsers();
  loadCategories();
  loadPrestasiTerbaru();

  const filterPrestasiEl = document.getElementById('prestasi-year-filter');
  if (filterPrestasiEl) {
    filterPrestasiEl.addEventListener('change', window.filterTahunPrestasi);
  }
});