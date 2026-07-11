// src/admin.js
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Proteksi Halaman Sesi Lokal
  const sessionUser = localStorage.getItem('swim_user');
  if (!sessionUser) return window.location.replace('/index.html');
  
  const loggedInUser = JSON.parse(sessionUser);
  if (!loggedInUser || loggedInUser.role !== 'admin') { 
    return window.location.replace('/app.html'); 
  }

  // State Management Internal (Bebas Duplikat bray!)
  let currentRoleFilter = 'all';
  let currentGayaFilter = 'Bebas';
  let currentTahunPrestasi = 'ALL';
  let allUsersCache = [];
  let allCategoriesCache = [];
  let allPrestasiCache = [];

  // ==========================================
  // 2. MODUL 1: USERS (Client-Side Filter Engine)
  // ==========================================
  async function loadUsers() {
    try {
      const response = await fetch('/api/admin?action=users'); // Mengarah ke router merger bray
      const result = await response.json();
      if (result.success && result.data) {
        allUsersCache = result.data;
        window.renderUsers();
      }
    } catch (err) {
      console.error("Gagal memuat list user TiDB:", err);
    }
  }

  window.renderUsers = function() {
    const filtered = allUsersCache.filter(u => {
      if (currentRoleFilter === 'all') return true;
      // Tambahan aman: kalau filter coach, munculkan juga head_coach
      if (currentRoleFilter === 'coach' && u.role === 'head_coach') return true;
      
      // Filter default: otomatis bakal nangkep 'parents' dengan sempurna
      return u.role === currentRoleFilter;
    });

    const container = document.getElementById('admin-user-list');
    if (!container) return;
    
    if (filtered.length === 0) {
      container.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-400 text-xs">Tidak ada data user (${currentRoleFilter})</td></tr>`;
      return;
    }

    let html = '';
    filtered.forEach(u => {
      const usernameDisplay = u.username ? u.username : (u.email ? u.email.split('@')[0] : 'user');
      const parentSetupLink = u.role === 'parents' 
        ? `<button onclick="window.openMappingModal('${u.id}', '${u.full_name}')" class="text-[9px] text-emerald-500 font-bold hover:underline block mt-0.5">[children setup]</button>` 
        : '';

      let roleBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-500">atlet</span>';
      if (u.role === 'admin') roleBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-brand-red uppercase">admin</span>';
      if (u.role === 'head_coach') roleBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-500 uppercase">head_coach</span>';
      if (u.role === 'coach') roleBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/10 text-sky-500 uppercase">coach</span>';
      if (u.role === 'parents') roleBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500 uppercase">parents</span>';

      html += `
        <tr class="hover:bg-gray-100/30 dark:hover:bg-[#282033] transition-colors" id="user-row-${u.id}">
          <td class="px-3 py-3 font-medium text-gray-800 dark:text-gray-200">
            <span class="font-semibold">${usernameDisplay}</span>
            <div class="text-[9px] text-gray-400 font-normal truncate max-w-[120px]">${u.full_name}</div>
            ${parentSetupLink}
          </td>
          <td class="px-3 py-3 text-left vertical-middle" id="role-cell-${u.id}">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-semibold dark:text-zinc-300">${u.role}</span>
              <button onclick="window.startInlineEditRole('${u.id}', '${u.role}', '${u.full_name}', '${u.username || ''}', '${u.email || ''}', '${u.no_wa || ''}')" class="text-[10px] text-blue-500 hover:underline font-bold">[edit]</button>
            </div>
          </td>
          <td class="px-3 py-3 text-center"><button onclick="window.resetPass('${usernameDisplay}')" class="bg-gray-100 dark:bg-[#2a2235] p-2 rounded-xl text-xs hover:text-yellow-500 transition-all">🔑</button></td>
          <td class="px-3 py-3 text-center"><button onclick="window.hapusUser('${u.id}')" class="bg-gray-100 dark:bg-[#2a2235] p-2 rounded-xl text-xs hover:text-brand-red transition-all">❌</button></td>
        </tr>
      `;
    });
    container.innerHTML = html;
  };

  window.startInlineEditRole = (id, currentRole, fullName, username, email, wa) => {
    const cell = document.getElementById(`role-cell-${id}`);
    if (!cell) return;
    cell.innerHTML = `
      <div class="flex items-center gap-1">
        <select id="inline-select-${id}" class="text-xs bg-gray-50 dark:bg-[#140e16] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 font-semibold text-gray-800 dark:text-white focus:outline-none">
          <option value="atlet" ${currentRole === 'atlet' ? 'selected' : ''}>atlet</option>
          <option value="coach" ${currentRole === 'coach' ? 'selected' : ''}>coach</option>
          <option value="head_coach" ${currentRole === 'head_coach' ? 'selected' : ''}>head_coach</option>
          <option value="parents" ${currentRole === 'parents' ? 'selected' : ''}>parents</option>
          <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>admin</option>
        </select>
        <button onclick="window.saveInlineRole('${id}', '${fullName}', '${username}', '${email}', '${wa}')" class="p-1 text-xs bg-emerald-600 text-white rounded-lg font-bold">✓</button>
        <button onclick="window.renderUsers()" class="p-1 text-xs bg-gray-200 dark:bg-zinc-800 text-gray-400 rounded-lg font-bold">✕</button>
      </div>
    `;
  };

  window.saveInlineRole = async (id, fullName, username, email, wa) => {
    const newRole = document.getElementById(`inline-select-${id}`).value;
    try {
      const response = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, full_name: fullName, username, email, no_wa: wa, role: newRole })
      });
      const result = await response.json();
      if (result.success) {
        const targetUser = allUsersCache.find(u => u.id === id);
        if (targetUser) targetUser.role = newRole;
        window.renderUsers();
      }
    } catch (err) { console.error(err); }
  };

  window.filterUserRole = (role) => {
    currentRoleFilter = role;
    document.querySelectorAll('.role-filter-btn').forEach(btn => {
      btn.classList.remove('bg-white', 'dark:bg-[#18131f]', 'text-gray-800', 'dark:text-white', 'shadow-sm', 'font-bold');
      btn.classList.add('text-gray-400');
    });
    const activeBtn = document.getElementById('role-' + role);
    if (activeBtn) activeBtn.classList.add('bg-white', 'dark:bg-[#18131f]', 'text-gray-800', 'dark:text-white', 'shadow-sm', 'font-bold');
    window.renderUsers();
  };

  window.hapusUser = async (id) => {
    if (confirm("Hapus pengguna ini secara permanen dari TiDB?")) {
      try {
        const response = await fetch(`/api/admin?id=${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) loadUsers();
      } catch (err) { console.error(err); }
    }
  };

  window.openAddUserModal = () => {
    document.getElementById('add-user-name').value = '';
    document.getElementById('add-user-username').value = '';
    document.getElementById('add-user-pass').value = '';
    document.getElementById('add-user-email').value = '';
    document.getElementById('modal-add-user').classList.remove('hidden');
  };
  window.closeAddUserModal = () => document.getElementById('modal-add-user').classList.add('hidden');

  window.saveNewUser = async () => {
    const fullName = document.getElementById('add-user-name').value.trim();
    const username = document.getElementById('add-user-username').value.trim();
    const password = document.getElementById('add-user-pass').value.trim();
    const email = document.getElementById('add-user-email').value.trim();
    const role = document.getElementById('add-user-role').value;

    try {
      const response = await fetch('/api/admin?action=add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, username, email, password, role })
      });
      const result = await response.json();
      if (result.success) {
        window.closeAddUserModal();
        loadUsers();
      } else { alert(result.message); }
    } catch (err) { console.error(err); }
  };

  // --- MODUL PARENT RELATION MAPPING ---
  window.openMappingModal = async (parentId, parentName) => {
    document.getElementById('mapping-parent-id').value = parentId;
    document.getElementById('mapping-parent-name').innerText = `Parent: ${parentName}`;
    const listContainer = document.getElementById('mapping-children-list');
    listContainer.innerHTML = '<div class="text-gray-400 text-center py-2">Memuat relasi anak...</div>';

    try {
      const response = await fetch(`/api/admin?action=parent-mapping&parent_id=${parentId}`);
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        listContainer.innerHTML = result.data.map(child => `
          <div class="flex justify-between items-center p-1.5 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg mb-1">
            <span class="font-bold text-gray-700 dark:text-gray-300">${child.full_name}</span>
            <span class="text-[9px] bg-red-500/10 text-brand-red font-bold px-1.5 py-0.5 rounded">${child.group_level || 'Basic'}</span>
          </div>`).join('');
      } else { listContainer.innerHTML = '<div class="text-gray-400 text-center py-2">Belum ada relasi anak.</div>'; }

      const selectAthlete = document.getElementById('mapping-select-athlete');
      selectAthlete.innerHTML = allUsersCache.filter(u => u.role === 'atlet').map(a => `<option value="${a.id}">${a.full_name}</option>`).join('');
      document.getElementById('modal-parent-mapping').classList.remove('hidden');
    } catch (err) { console.error(err); }
  };
  window.closeMappingModal = () => document.getElementById('modal-parent-mapping').classList.add('hidden');

  window.submitChildRelation = async () => {
    const parentId = document.getElementById('mapping-parent-id').value;
    const athleteId = document.getElementById('mapping-select-athlete').value;
    try {
      const response = await fetch('/api/admin?action=connect-athlete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: parentId, athlete_id: athleteId })
      });
      const result = await response.json();
      if (result.success) window.openMappingModal(parentId, document.getElementById('mapping-parent-name').innerText.replace('Parent: ', ''));
      else alert(result.message);
    } catch (err) { console.error(err); }
  };

  // ==========================================
  // 3. MODUL 2 & 3: MASTER DATA PRESTASI
  // ==========================================
  async function loadPrestasiTerbaru() {
    try {
      const response = await fetch('/api/admin?action=prestasi');
      const result = await response.json();
      if (result.success && result.data) {
        allPrestasiCache = result.data;
        window.renderPrestasiData();
      }
    } catch (err) { console.error(err); }
  }

  window.renderPrestasiData = () => {
    const container = document.getElementById('admin-prestasi-container');
    if (!container) return;
    const grouped = {};

    allPrestasiCache.forEach(item => {
      const rankAngka = parseInt(item.rank, 10);
      const eventYear = new Date(item.event_date || item.created_at).getFullYear().toString();
      if (currentTahunPrestasi !== 'ALL' && eventYear !== currentTahunPrestasi) return;

      const key = `${item.user_id}-${item.event_id}`;
      if (!grouped[key]) {
        grouped[key] = { atletName: item.full_name, eventTitle: item.event_title, eventDate: new Date(item.event_date || item.created_at), gold: 0, silver: 0, bronze: 0, details: [] };
      }
      if (rankAngka === 1) grouped[key].gold++;
      else if (rankAngka === 2) grouped[key].silver++;
      else if (rankAngka === 3) grouped[key].bronze++;

      grouped[key].details.push({ nomorLomba: `${item.distance_meters} M ${item.style_name}`, waktu: item.time_record || '00:00.00', rank: rankAngka });
    });

    const sortedPrestasi = Object.values(grouped).sort((a, b) => b.eventDate - a.eventDate);
    let finalHTML = '';
    sortedPrestasi.forEach((group, index) => {
      const rowId = `row-atlet-${index}`;
      let detailsHTML = '';
      const tglEvent = group.eventDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

      group.details.forEach(d => {
        let rankBadge = d.rank === 1 ? '🥇 Rank 1' : d.rank === 2 ? '🥈 Rank 2' : '🥉 Rank 3';
        detailsHTML += `<div class="flex justify-between py-2 border-b dark:border-gray-800"><div>${d.nomorLomba}</div><div class="font-mono font-bold">${d.waktu}</div><div>${rankBadge}</div></div>`;
      });

      finalHTML += `
        <div class="bg-gray-50 dark:bg-[#1f1927] rounded-2xl border dark:border-gray-800 p-3 mb-2 shadow-sm">
          <div onclick="window.toggleNestedRow('${rowId}')" class="flex justify-between items-center cursor-pointer">
            <div><h4 class="font-bold text-xs">${group.atletName}</h4><p class="text-[10px] text-gray-400">${tglEvent} - ${group.eventTitle}</p></div>
            <div class="flex gap-1 text-[10px] font-bold"><span class="bg-yellow-500/10 text-yellow-600 px-1.5 rounded">${group.gold}</span><span class="bg-gray-300/20 text-gray-500 px-1.5 rounded">${group.silver}</span><span class="bg-amber-600/10 text-amber-600 px-1.5 rounded">${group.bronze}</span></div>
          </div>
          <div id="nested-${rowId}" class="hidden mt-2 pt-2 border-t text-[11px]">${detailsHTML}</div>
        </div>`;
    });
    container.innerHTML = finalHTML;
  };

// =======================================================
  // ENGINE NOMOR LOMBA (STYLES) - FIX SINKRONISASI HTML BRAY!
  // =======================================================
  window.masterStyles = [];
  window.currentStyleFilter = 'All';

  // 1. Fungsi Tarik Data API
  window.loadNomorLomba = async function() {
    const container = document.getElementById('admin-category-list');
    if (container) container.innerHTML = `<tr><td colspan="2" class="text-center py-4 text-xs text-gray-500">Loading data...</td></tr>`;
    
    try {
      const res = await fetch('/api/admin?action=styles');
      const data = await res.json();
      if (data.success) {
        window.masterStyles = data.data;
        // Panggil render pake filter yang lagi aktif
        window.renderCategoriesByStyle(window.currentStyleFilter); 
      }
    } catch (err) { console.error(err); }
  };

  // 2. Fungsi Render & Filter (Akan dipanggil oleh onclick HTML)
  window.renderCategoriesByStyle = function(gaya) {
    window.currentStyleFilter = gaya;
    const container = document.getElementById('admin-category-list');
    if (!container) return;

    // Filter array jika yang dipencet bukan 'All'
    const filtered = window.currentStyleFilter === 'All'
      ? window.masterStyles
      : window.masterStyles.filter(s => s.name.toLowerCase().includes(window.currentStyleFilter.toLowerCase()));

    if (!filtered || filtered.length === 0) {
      container.innerHTML = `<tr><td colspan="2" class="text-center py-4 text-xs text-gray-400">Tidak ada data untuk kategori ini.</td></tr>`;
      return;
    }

    // Render ke struktur <tr><td> sesuai format table HTML lu bray
    container.innerHTML = filtered.map(s => `
      <tr class="hover:bg-gray-50 dark:hover:bg-[#282033] border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors">
        <td class="px-3 py-3 font-medium text-xs text-gray-800 dark:text-gray-200">${s.name}</td>
        <td class="px-3 py-3 text-center">
          <div class="flex gap-2 justify-center">
            <button onclick="window.editNomorLomba('${s.id}', '${s.name}')" class="bg-gray-200 dark:bg-[#2a2235] p-1.5 rounded text-[10px] hover:text-blue-500 font-bold transition-all" title="Edit">✏️</button>
            <button onclick="window.hapusNomorLomba('${s.id}')" class="bg-gray-200 dark:bg-[#2a2235] p-1.5 rounded text-[10px] hover:text-brand-red font-bold transition-all" title="Hapus">❌</button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  // 3. Eksekusi Tombol Tambah Nomor Lomba
  document.getElementById('btn-add-category')?.addEventListener('click', async () => {
    const input = document.getElementById('admin-new-category');
    const name = input.value.trim();
    if (!name) return alert("Isi dulu nama nomor lombanya bray!");

    const btn = document.getElementById('btn-add-category');
    btn.innerText = "⏳ Menyimpan..."; btn.disabled = true;

    try {
      const res = await fetch('/api/admin?action=styles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success) {
        input.value = ''; 
        window.loadNomorLomba(); // Reload List Otomatis
      } else { alert(data.message || "Gagal menambah nomor lomba"); }
    } catch (err) { console.error(err); } finally {
      btn.innerText = "➕ Tambah Nomor Lomba"; btn.disabled = false;
    }
  });

  // 4. Fungsi Edit Pakai Prompt Cepat
  window.editNomorLomba = async function(id, oldName) {
    const newName = prompt("Edit Nama Nomor Lomba:", oldName);
    if (newName && newName.trim() !== "" && newName !== oldName) {
      try {
        const res = await fetch('/api/admin?action=styles', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name: newName.trim() })
        });
        const data = await res.json();
        if (data.success) window.loadNomorLomba();
        else alert(data.message || "Gagal Edit");
      } catch (err) { alert("Gagal edit bray!"); }
    }
  };

  // 5. Fungsi Hapus Nomor Lomba
  window.hapusNomorLomba = async function(id) {
    if (confirm("Yakin mau hapus nomor lomba ini bray? (Nomor yang sudah direkam atlet akan memicu error jika dihapus)")) {
      try {
        const res = await fetch('/api/admin?action=styles', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
        });
        const data = await res.json();
        if (data.success) window.loadNomorLomba();
        else alert(data.message || "Gagal! Nomor ini sedang dipakai atlet.");
      } catch (err) { alert("Gagal hapus bray!"); }
    }
  };


  window.toggleNestedRow = (id) => {
    const target = document.getElementById('nested-' + id);
    if (target) target.classList.toggle('hidden');
  };

  // Header System Trigger Control
  document.getElementById('admin-theme-toggle')?.addEventListener('click', () => document.documentElement.classList.toggle('dark'));
  document.getElementById('admin-btn-logout')?.addEventListener('click', () => { localStorage.removeItem('swim_user'); window.location.replace('/index.html'); });

  loadUsers();
  loadPrestasiTerbaru();
  window.loadNomorLomba();
});