import './style.css';
import { supabase } from './supabase';

import navCoachHTML from '../coach_nav.html?raw';
import dashCoachHTML from '../coach_dashboard.html?raw';
import atletCoachHTML from '../coach_atlet.html?raw';
import absenCoachHTML from '../coach_absen.html?raw';
import manageCoachHTML from '../coach_manage.html?raw';
import trainingCoachHTML from '../coach_training.html?raw';
import leaderboardCoachHTML from '../coach_leaderboard.html?raw';

// STATE MANAGEMENT GLOBAL
let masterAthletesList = [];
let masterCoachesList = [];
let masterAthletes = {};
let masterAttendanceToday = {};
let allMedalsData = [];
let rawMedalsData = [];
let currentMedalFilter = 'All';
let currentManageFilter = 'All';
let currentAbsenFilter = 'All';
let allTrainingData = [];

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr || !session) return window.location.replace('/index.html');

  const user = session.user;
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();

  if (!profile || (profile.role !== 'head_coach' && profile.role !== 'coach')) {
    return window.location.replace('/app.html');
  }

  // INJEKSI SPA
  document.getElementById('coach-nav-container').innerHTML = navCoachHTML;
  document.getElementById('coach-main-container').innerHTML = `
    <div id="tab-coach-dashboard" class="coach-tab-content hidden">${dashCoachHTML}</div>
    <div id="tab-coach-atlet" class="coach-tab-content hidden">${atletCoachHTML}</div>
    <div id="tab-coach-training" class="coach-tab-content hidden">${trainingCoachHTML}</div>
    <div id="tab-coach-leaderboard" class="coach-tab-content hidden">${leaderboardCoachHTML}</div>
    <div id="tab-coach-absen" class="coach-tab-content hidden">${absenCoachHTML}</div>
    <div id="tab-coach-manage" class="coach-tab-content hidden">${manageCoachHTML}</div>
  `;

  document.getElementById('coach-name').innerText = profile.full_name;
  document.getElementById('coach-role').innerText = profile.role === 'head_coach' ? 'Head Coach' : 'Coach';

  // Tampilkan menu khusus Head Coach
  if (profile.role === 'head_coach') {
    const headMenu = document.getElementById('nav-headcoach-only');
    if (headMenu) { headMenu.classList.remove('hidden'); headMenu.classList.add('flex'); }
  }

  // TAB SWITCHER
  window.switchCoachTab = function (tabId) {
    document.querySelectorAll('.coach-tab-content').forEach(tab => tab.classList.add('hidden'));
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    document.querySelectorAll('.nav-coach-btn').forEach(btn => {
      btn.classList.remove('text-brand-red'); btn.classList.add('text-gray-400');
    });

    const activeBtn = document.querySelector(`[onclick="window.switchCoachTab('${tabId}')"]`);
    if (activeBtn) {
      activeBtn.classList.remove('text-gray-400'); activeBtn.classList.add('text-brand-red');
    }
  };
  window.switchCoachTab('tab-coach-dashboard');

  // STATE MANAGEMENT GLOBAL (moved to top level)

  // GLOBAL EVENT DELEGATION
  document.addEventListener('click', async (e) => {
    if (e.target.closest('#fullscreen-toggle')) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }
    if (e.target.closest('#theme-toggle')) {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
    if (e.target.closest('#btn-logout')) {
      if (confirm("Keluar dari akun?")) { await supabase.auth.signOut(); window.location.replace('/index.html'); }
    }

    // Filter Pills UI
    if (e.target.closest('.pill-medal')) {
      handlePillClick(e.target.closest('.pill-medal'), '.pill-medal');
      currentMedalFilter = e.target.closest('.pill-medal').getAttribute('data-class');
      renderMedalistTable();
    }
    if (e.target.closest('.pill-manage')) {
      handlePillClick(e.target.closest('.pill-manage'), '.pill-manage');
      currentManageFilter = e.target.closest('.pill-manage').getAttribute('data-class');
      renderManageClasses();
    }
    if (e.target.closest('.pill-absen')) {
      handlePillClick(e.target.closest('.pill-absen'), '.pill-absen');
      currentAbsenFilter = e.target.closest('.pill-absen').getAttribute('data-class');
      renderAbsenClasses();
    }

    // Close Modal Kelas Atlet
    if (e.target.closest('#btn-close-modal-class')) {
      document.getElementById('modal-edit-inner').classList.add('translate-y-full');
      setTimeout(() => document.getElementById('modal-edit-class').classList.add('hidden'), 300);
    }

    // Close Modal Kelas Pelatih
    if (e.target.closest('#btn-close-modal-coach')) {
      document.getElementById('modal-edit-coach-inner').classList.add('translate-y-full');
      setTimeout(() => document.getElementById('modal-edit-coach').classList.add('hidden'), 300);
    }
  });

  function handlePillClick(btn, selector) {
    document.querySelectorAll(selector).forEach(p => {
      p.classList.remove('bg-brand-red', 'text-white', 'shadow-md');
      p.classList.add('bg-white', 'dark:bg-[#221c29]', 'text-gray-500');
    });
    btn.classList.remove('bg-white', 'dark:bg-[#221c29]', 'text-gray-500');
    btn.classList.add('bg-brand-red', 'text-white', 'shadow-md');
  }

  // --- 1. FETCH DATA ATLET & PELATIH (Pusat) ---
  async function fetchMasterData() {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Ambil atlet (role = 'atlet')
      const { data: athletes } = await supabase.from('profiles').select('id, full_name, group_level, birth_year').eq('role', 'atlet').order('full_name', { ascending: true });
      masterAthletesList = athletes || [];
      masterAthletesList.forEach(a => masterAthletes[a.id] = a);
      document.querySelectorAll('#stat-total-atlet').forEach(el => el.innerText = masterAthletesList.length);

      // Ambil pelatih (role = 'coach' / 'head_coach')
      const { data: coaches } = await supabase.from('profiles').select('id, full_name, role, group_level').in('role', ['coach', 'head_coach']).order('role', { ascending: true });
      masterCoachesList = coaches || [];
      const statCoach = document.getElementById('stat-total-coach');
      if (statCoach) statCoach.innerText = masterCoachesList.length;

      // Ambil absensi hari ini
      const { data: attendance } = await supabase.from('daily_attendance').select('profile_id, is_present').eq('attendance_date', todayStr);
      masterAttendanceToday = {};
      (attendance || []).forEach(row => masterAttendanceToday[row.profile_id] = row.is_present);

      renderManageClasses();
      renderAbsenClasses();
      renderManageCoaches();
      await loadMedals(document.getElementById('medal-year-filter').value);
      await fetchTrainingData();
    } catch (err) { console.error(err); }
  }

  // --- 2. LOGIC DASHBOARD MEDALS ---
  async function loadMedals(year) {
    try {
      const { data: results } = await supabase.from('event_results').select('rank, user_id, category, events(title, event_date)').lte('rank', 3);
      rawMedalsData = results || [];
      allMedalsData = rawMedalsData.filter(r => r.events && r.events.event_date.startsWith(year));

      let emas = 0, perak = 0, perunggu = 0;
      allMedalsData.forEach(r => { if (r.rank === 1) emas++; else if (r.rank === 2) perak++; else if (r.rank === 3) perunggu++; });
      document.getElementById('count-emas').innerText = emas;
      document.getElementById('count-perak').innerText = perak;
      document.getElementById('count-perunggu').innerText = perunggu;

      renderMedalistTable();
      renderLeaderboard();
    } catch (err) { }
  }

  function renderLeaderboard() {
    const container = document.getElementById('container-lb-list');
    if (!container) return;

    // Hitung poin (Emas=3, Perak=2, Perunggu=1)
    const pointsMap = {};
    rawMedalsData.forEach(r => {
      if (!pointsMap[r.user_id]) pointsMap[r.user_id] = { emas: 0, perak: 0, perunggu: 0, total: 0, medals: [] };
      if (r.rank === 1) { pointsMap[r.user_id].emas++; pointsMap[r.user_id].total += 3; }
      if (r.rank === 2) { pointsMap[r.user_id].perak++; pointsMap[r.user_id].total += 2; }
      if (r.rank === 3) { pointsMap[r.user_id].perunggu++; pointsMap[r.user_id].total += 1; }
      pointsMap[r.user_id].medals.push(r);
    });

    const lbArray = Object.keys(pointsMap).map(userId => {
      const atlet = masterAthletes[userId];
      return {
        userId,
        name: atlet ? atlet.full_name : 'Anonim',
        group: atlet ? (atlet.group_level || 'Belum Set') : '-',
        ...pointsMap[userId]
      };
    }).sort((a, b) => b.total - a.total);

    container.innerHTML = '';
    if (lbArray.length === 0) {
      container.innerHTML = '<div class="text-center py-6 text-xs text-gray-400">Belum ada data prestasi.</div>';
      return;
    }

    lbArray.forEach((atlet, index) => {
      const rankBadge = index === 0 ? 'bg-yellow-500 text-white' : index === 1 ? 'bg-gray-300 text-gray-700' : index === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500';
      container.innerHTML += `
        <div class="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors" onclick="window.openLeaderboardDetail('${atlet.userId}', '${atlet.name}')">
          <div class="flex items-center gap-3">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rankBadge}">
              ${index + 1}
            </div>
            <div>
              <div class="text-xs font-bold text-gray-800 dark:text-zinc-200">${atlet.name}</div>
              <div class="text-[9px] text-gray-400 mt-0.5">Kelas: ${atlet.group}</div>
            </div>
          </div>
          <div class="flex flex-col items-end">
            <div class="text-xs font-bold text-brand-red">${atlet.total} Pts</div>
            <div class="text-[9px] text-gray-500 mt-0.5">🥇${atlet.emas} 🥈${atlet.perak} 🥉${atlet.perunggu}</div>
          </div>
        </div>
      `;
    });
  }

  window.openLeaderboardDetail = function (userId, name) {
    document.getElementById('lb-main-view').classList.add('hidden');
    document.getElementById('lb-detail-view').classList.remove('hidden');
    document.getElementById('lb-detail-name').innerText = name;

    const container = document.getElementById('container-lb-detail-list');
    container.innerHTML = '';

    const userMedals = rawMedalsData.filter(r => r.user_id === userId).sort((a, b) => new Date(b.events?.event_date) - new Date(a.events?.event_date));

    if (userMedals.length === 0) {
      container.innerHTML = '<div class="text-center py-6 text-xs text-gray-400">Tidak ada data medali.</div>';
      return;
    }

    userMedals.forEach(r => {
      const icon = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉';
      const pts = r.rank === 1 ? '+3' : r.rank === 2 ? '+2' : '+1';
      const dateStr = r.events?.event_date ? new Date(r.events.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

      container.innerHTML += `
        <div class="bg-white dark:bg-[#221c29] p-3 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center shadow-sm">
          <div class="flex-1 pr-2">
            <div class="text-xs font-bold text-gray-800 dark:text-zinc-200 mb-0.5 truncate">${r.events?.title || 'Unknown Event'}</div>
            <div class="text-[10px] text-gray-500 truncate">${r.category}</div>
            <div class="text-[9px] text-gray-400 mt-1 uppercase tracking-wider">${dateStr}</div>
          </div>
          <div class="flex flex-col items-end gap-1">
            <div class="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded border dark:border-zinc-700">
              <span>${icon}</span><span class="text-[10px] font-bold">Rank ${r.rank}</span>
            </div>
            <span class="text-[10px] font-bold text-emerald-500">${pts} Pts</span>
          </div>
        </div>
      `;
    });
  };

  window.closeLeaderboardDetail = function () {
    document.getElementById('lb-detail-view').classList.add('hidden');
    document.getElementById('lb-main-view').classList.remove('hidden');
  };

  function renderMedalistTable() {
    const container = document.getElementById('medalist-container');
    if (!container) return; container.innerHTML = '';

    const filtered = allMedalsData.filter(r => {
      const atlet = masterAthletes[r.user_id];
      if (!atlet) return false;
      return currentMedalFilter === 'All' || atlet.group_level === currentMedalFilter;
    });

    if (filtered.length === 0) return container.innerHTML = `<div class="p-4 text-center text-xs text-gray-500">Belum ada medali.</div>`;

    filtered.forEach(r => {
      const atlet = masterAthletes[r.user_id];
      const icon = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉';
      container.innerHTML += `
        <div class="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-900/50">
          <div>
            <div class="text-xs font-bold">${atlet.full_name}</div>
            <div class="text-[9px] text-gray-400 mt-0.5 truncate max-w-[200px]">${r.category} • ${r.events.title}</div>
          </div>
          <div class="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded border dark:border-zinc-700">
            <span>${icon}</span><span class="text-[10px] font-bold">Rank ${r.rank}</span>
          </div>
        </div>`;
    });
  }
  document.getElementById('medal-year-filter').addEventListener('change', (e) => loadMedals(e.target.value));

  // --- 3. LOGIC DAFTAR ATLET (MANAGE KELAS) ---
  function renderManageClasses() {
    const container = document.getElementById('container-manage-classes');
    if (!container) return; container.innerHTML = '';
    const grouped = groupByClass(masterAthletesList);
    let toRender = Object.keys(grouped);
    if (currentManageFilter !== 'All') toRender = toRender.filter(c => c.toLowerCase() === currentManageFilter.toLowerCase());

    if (toRender.length === 0) return container.innerHTML = `<div class="p-6 text-center text-xs text-gray-500">Kosong</div>`;

    toRender.forEach(lvl => {
      let html = `<div class="bg-white dark:bg-[#221c29] rounded-2xl border border-gray-200 dark:border-gray-800 mb-4 overflow-hidden">
        <div class="px-4 py-3 bg-gray-50 dark:bg-[#2b2532] border-b border-gray-100 dark:border-gray-800 flex justify-between">
          <h5 class="text-xs font-bold text-gray-700 dark:text-zinc-200 uppercase tracking-wide">Kelas ${lvl}</h5>
        </div><div class="divide-y divide-gray-100 dark:divide-gray-800/60">`;

      grouped[lvl].forEach(a => {
        const cGrp = a.group_level || 'Belum Set';
        const gearBtn = profile.role === 'head_coach' ? `<button onclick="window.openEditClass('${a.id}','${a.full_name}','${cGrp}')" class="p-1.5 bg-gray-100 dark:bg-zinc-800 rounded text-gray-400 hover:text-brand-red border dark:border-zinc-700">⚙️</button>` : '';
        html += `<div class="p-4 flex justify-between items-center">
            <div><div class="text-xs font-bold">${a.full_name}</div><div class="text-[9px] text-gray-400">Lahir: ${a.birth_year || '-'}</div></div>
            <div class="flex items-center gap-3"><span class="text-[10px] font-bold text-brand-red bg-red-900/10 px-2 py-1 rounded">${cGrp}</span>${gearBtn}</div>
          </div>`;
      });
      container.innerHTML += html + `</div></div>`;
    });
  }

  window.openEditClass = function (id, name, currentClass) {
    document.getElementById('edit-atlet-id').value = id;
    document.getElementById('edit-atlet-name').innerText = name;
    if (currentClass && currentClass !== 'Belum Set') document.getElementById('select-new-class').value = currentClass;
    document.getElementById('modal-edit-class').classList.remove('hidden');
    setTimeout(() => document.getElementById('modal-edit-inner').classList.remove('translate-y-full'), 10);
  };

  document.getElementById('btn-save-class').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-class');
    const id = document.getElementById('edit-atlet-id').value;
    const newClass = document.getElementById('select-new-class').value;
    btn.innerText = 'Menyimpan...'; btn.disabled = true;
    try {
      await supabase.from('profiles').update({ group_level: newClass }).eq('id', id);
      const index = masterAthletesList.findIndex(a => a.id === id);
      if (index !== -1) masterAthletesList[index].group_level = newClass;
      masterAthletes[id].group_level = newClass;
      renderManageClasses(); renderAbsenClasses();
      document.getElementById('btn-close-modal-class').click();
    } catch (err) { alert("Gagal ubah kelas"); }
    finally { btn.innerText = '💾 SIMPAN KELAS'; btn.disabled = false; }
  });

  // --- 4. LOGIC ABSENSI ---
  function renderAbsenClasses() {
    const container = document.getElementById('container-absen-classes');
    if (!container) return; container.innerHTML = '';
    const grouped = groupByClass(masterAthletesList);
    let toRender = Object.keys(grouped);
    if (currentAbsenFilter !== 'All') toRender = toRender.filter(c => c.toLowerCase() === currentAbsenFilter.toLowerCase());

    if (toRender.length === 0) return container.innerHTML = `<div class="p-6 text-center text-xs text-gray-500">Kosong</div>`;

    toRender.forEach(lvl => {
      let html = `<div class="bg-white dark:bg-[#221c29] rounded-2xl border border-gray-200 dark:border-gray-800 mb-4 overflow-hidden">
        <div class="px-4 py-3 bg-gray-50 dark:bg-[#2b2532] border-b border-gray-100 dark:border-gray-800"><h5 class="text-xs font-bold text-gray-700 dark:text-zinc-200 uppercase tracking-wide">Kelas ${lvl}</h5></div><div class="divide-y divide-gray-100 dark:divide-gray-800/60">`;

      grouped[lvl].forEach(a => {
        const isPresent = masterAttendanceToday[a.id] !== false;
        html += `<div class="p-4 flex justify-between items-center">
            <div><div class="text-xs font-bold">${a.full_name}</div><div class="text-[9px] text-gray-400">Lahir: ${a.birth_year || '-'}</div></div>
            <label class="relative inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" class="sr-only peer" onchange="window.saveAbsen('${a.id}', this)" ${isPresent ? 'checked' : ''}>
              <div class="w-11 h-6 bg-gray-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span class="ml-2 text-[10px] font-bold uppercase min-w-[36px] text-right ${isPresent ? 'text-emerald-500' : 'text-gray-400'}">${isPresent ? 'Hadir' : 'Absen'}</span>
            </label>
          </div>`;
      });
      container.innerHTML += html + `</div></div>`;
    });
  }

  window.saveAbsen = async function (profileId, checkboxElem) {
    const isPresent = checkboxElem.checked;
    const labelSpan = checkboxElem.nextElementSibling.nextElementSibling;
    labelSpan.innerText = isPresent ? 'Hadir' : 'Absen';
    labelSpan.className = `ml-2 text-[10px] font-bold uppercase min-w-[36px] text-right ${isPresent ? 'text-emerald-500' : 'text-gray-400'}`;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await supabase.from('daily_attendance').upsert({ profile_id: profileId, attendance_date: todayStr, is_present: isPresent }, { onConflict: 'profile_id, attendance_date' });
      masterAttendanceToday[profileId] = isPresent;
    } catch (err) {
      checkboxElem.checked = !isPresent;
      if (window.showToast) window.showToast('Gagal update absen', 'error');
    }
  };

  function groupByClass(arr) {
    return arr.reduce((acc, a) => {
      const lvl = a.group_level || 'Belum Set';
      if (!acc[lvl]) acc[lvl] = [];
      acc[lvl].push(a);
      return acc;
    }, {});
  }

  // --- 5. LOGIC MANAJEMEN PELATIH ---
  function renderManageCoaches() {
    const container = document.getElementById('container-manage-coaches');
    if (!container) return; container.innerHTML = '';

    if (masterCoachesList.length === 0) return container.innerHTML = `<div class="p-4 text-center text-xs text-gray-500">Belum ada pelatih.</div>`;

    masterCoachesList.forEach(c => {
      const cRole = c.role === 'head_coach' ? '👑 Head Coach' : '🏊‍♂️ Coach';
      const cClass = c.group_level || 'Belum Di-assign';

      container.innerHTML += `
        <div class="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-900/50">
          <div>
            <div class="text-xs font-bold">${c.full_name}</div>
            <div class="text-[10px] text-gray-500 mt-0.5">${cRole}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[9px] font-bold text-emerald-500 bg-emerald-900/10 border border-emerald-900/20 px-2 py-1 rounded">${cClass}</span>
            <button onclick="window.openEditCoach('${c.id}', '${c.full_name}', '${cClass}')" class="p-1.5 text-gray-400 hover:text-emerald-500 bg-gray-100 dark:bg-zinc-800 rounded transition-colors border border-gray-200 dark:border-zinc-700">⚙️</button>
          </div>
        </div>`;
    });
  }

  window.openEditCoach = function (id, name, currentClass) {
    document.getElementById('edit-coach-id').value = id;
    document.getElementById('edit-coach-name').innerText = name;
    if (currentClass && currentClass !== 'Belum Di-assign') document.getElementById('select-coach-class').value = currentClass;

    document.getElementById('modal-edit-coach').classList.remove('hidden');
    setTimeout(() => document.getElementById('modal-edit-coach-inner').classList.remove('translate-y-full'), 10);
  };

  const btnSaveCoach = document.getElementById('btn-save-coach-class');
  if (btnSaveCoach) {
    btnSaveCoach.addEventListener('click', async () => {
      const id = document.getElementById('edit-coach-id').value;
      const newClass = document.getElementById('select-coach-class').value;

      btnSaveCoach.innerText = 'Menyimpan...'; btnSaveCoach.disabled = true;
      try {
        await supabase.from('profiles').update({ group_level: newClass }).eq('id', id);
        const index = masterCoachesList.findIndex(c => c.id === id);
        if (index !== -1) masterCoachesList[index].group_level = newClass;

        renderManageCoaches();
        document.getElementById('btn-close-modal-coach').click();
        if (window.showToast) window.showToast('Tugas kelas pelatih diperbarui!', 'success');
      } catch (err) {
        alert("Gagal update data pelatih");
      } finally {
        btnSaveCoach.innerText = '💾 SIMPAN TUGAS KELAS'; btnSaveCoach.disabled = false;
      }
    });
  }

  await fetchMasterData();
});

// ==========================================
// 6. LOGIC HALAMAN TRAINING (TIME TRIAL)
// ==========================================
async function fetchTrainingData() {
  try {
    const { data, error } = await supabase
      .from('time_trials_results')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true }) // penting untuk urutan lap
      .limit(500); // perbesar limit agar bisa group 1 session full

    if (error) throw error;

    // Grouping by Session (created_at yang sama dianggap 1 sesi karena di-insert bebarengan)
    const groups = {};
    (data || []).forEach(r => {
      const key = r.created_at;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          created_at: r.created_at,
          title_event: r.title_event,
          distance: r.distance,
          pool_size: r.pool_size,
          records: []
        };
      }
      groups[key].records.push(r);
    });

    // Jadikan array lalu sort desc
    allTrainingData = Object.values(groups).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    renderTrainingData();
    if (typeof renderLeaderboardTT === 'function') renderLeaderboardTT();
  } catch (err) {
    console.error("Gagal load training:", err);
  }
}

function renderTrainingData(searchQuery = '') {
  const container = document.getElementById('container-training-records');
  if (!container) return;
  container.innerHTML = '';

  const query = searchQuery.toLowerCase();

  const filtered = allTrainingData.filter(session => {
    if (session.title_event?.toLowerCase().includes(query)) return true;
    return session.records.some(r => {
      const atlet = masterAthletes[r.profile_id];
      const name = atlet ? atlet.full_name.toLowerCase() : 'anonim';
      return name.includes(query);
    });
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900 rounded-xl">Tidak ada data riwayat latihan.</div>`;
    return;
  }

  filtered.forEach(session => {
    // Group lap by athlete
    const athleteGroups = {};
    session.records.forEach(r => {
      if (!athleteGroups[r.profile_id]) athleteGroups[r.profile_id] = [];
      athleteGroups[r.profile_id].push(r);
    });

    let maxSets = 0;
    Object.values(athleteGroups).forEach(laps => {
      if (laps.length > maxSets) maxSets = laps.length;
    });

    const dateObj = new Date(session.created_at);
    const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    let athletesHTML = '';
    Object.keys(athleteGroups).forEach(profileId => {
      const atlet = masterAthletes[profileId];
      const atletName = atlet ? atlet.full_name : 'Anonim';
      const laps = athleteGroups[profileId];
      // Pastikan urut id ASC (waktu catat)
      laps.sort((a, b) => a.id - b.id);
      const finishRecord = laps[laps.length - 1];

      let lapsDetailsHTML = '';
      laps.forEach((lap, lapIdx) => {
        const label = (lapIdx === laps.length - 1) ? `Set ${lapIdx + 1} / Finish` : `Set ${lapIdx + 1}`;
        lapsDetailsHTML += `
           <div class="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800 last:border-0 pl-2">
             <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">${label}</span>
             <span class="text-[11px] font-mono text-gray-700 dark:text-gray-300 font-bold">${lap.time_record}</span>
           </div>
         `;
      });

      athletesHTML += `
        <div class="border-b border-gray-100 dark:border-gray-800 last:border-0">
          <div class="p-3.5 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors" onclick="this.nextElementSibling.classList.toggle('hidden')">
            <span class="text-xs font-bold text-gray-800 dark:text-gray-200">${atletName}</span>
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono font-bold text-brand-red bg-brand-red/10 px-2 py-1 rounded">${finishRecord.time_record}</span>
              <span class="text-[9px] text-gray-400">▼</span>
            </div>
          </div>
          <div class="hidden bg-gray-50/50 dark:bg-zinc-900/50 px-4 py-2 border-t border-gray-100 dark:border-gray-800">
            ${lapsDetailsHTML}
          </div>
        </div>
      `;
    });

    container.innerHTML += `
      <div class="bg-white dark:bg-[#221c29] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm mb-4 overflow-hidden">
         <div class="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#2b2532]">
           <div class="flex justify-between items-start mb-2">
             <div class="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide">${session.title_event}</div>
             <div class="text-[9px] font-bold text-brand-red bg-red-900/10 px-2 py-1 rounded whitespace-nowrap">${dateStr}</div>
           </div>
           <div class="flex flex-wrap gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
             <span class="bg-gray-200 dark:bg-zinc-800 px-2 py-1 rounded">Jarak: ${session.distance}M</span>
             <span class="bg-gray-200 dark:bg-zinc-800 px-2 py-1 rounded">Kolam: ${session.pool_size}M</span>
             <span class="bg-gray-200 dark:bg-zinc-800 px-2 py-1 rounded">Set: ${maxSets}</span>
           </div>
         </div>
         <div class="divide-y divide-gray-100 dark:divide-gray-800">
           ${athletesHTML}
         </div>
      </div>
    `;
  });
}

// Event Listener untuk Search Box Training
document.addEventListener('input', (e) => {
  if (e.target.id === 'search-training') {
    renderTrainingData(e.target.value);
  }
});

// ==========================================
// 7. LOGIC LEADERBOARD TIME TRIAL (KELAS)
// ==========================================
window.switchLbTab = function (tab) {
  const btnMedal = document.getElementById('btn-tab-medal');
  const btnTt = document.getElementById('btn-tab-tt');
  const contentMedal = document.getElementById('lb-medal-content');
  const contentTt = document.getElementById('lb-tt-content');

  if (!btnMedal || !btnTt) return;

  if (tab === 'medal') {
    btnMedal.className = 'flex-1 py-1.5 text-xs font-bold rounded-md bg-white dark:bg-zinc-800 shadow-sm text-brand-red transition-all';
    btnTt.className = 'flex-1 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all';
    contentMedal.classList.remove('hidden');
    contentTt.classList.add('hidden');
  } else {
    btnTt.className = 'flex-1 py-1.5 text-xs font-bold rounded-md bg-white dark:bg-zinc-800 shadow-sm text-brand-red transition-all';
    btnMedal.className = 'flex-1 py-1.5 text-xs font-bold rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all';
    contentTt.classList.remove('hidden');
    contentMedal.classList.add('hidden');
    renderLeaderboardTT();
  }
};

function renderLeaderboardTT() {
  const container = document.getElementById('container-lb-tt-classes');
  if (!container) return;
  container.innerHTML = '';

  const groups = {};
  masterAthletesList.forEach(a => {
    const lvl = a.group_level || 'Belum Set';
    if (!groups[lvl]) groups[lvl] = [];
    groups[lvl].push(a);
  });

  const sortedClasses = Object.keys(groups).sort();
  if (sortedClasses.length === 0) {
    container.innerHTML = '<div class="text-center py-6 text-xs text-gray-400">Tidak ada kelas.</div>';
    return;
  }

  sortedClasses.forEach(lvl => {
    container.innerHTML += `
      <div class="bg-white dark:bg-[#221c29] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex justify-between items-center cursor-pointer hover:border-brand-red/50 transition-colors mb-4" onclick="window.openLeaderboardClassDetail('${lvl}')">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red text-lg">🏊‍♂️</div>
          <div>
            <div class="text-sm font-bold text-gray-800 dark:text-zinc-200">Kelas ${lvl}</div>
            <div class="text-[10px] text-gray-500 mt-0.5">${groups[lvl].length} Atlet</div>
          </div>
        </div>
        <div class="text-gray-400 text-xs">Lihat ➔</div>
      </div>
    `;
  });
}

function timeStringToMs(timeStr) {
  // format 00:12.33 or 01:02:12.33
  const parts = timeStr.split(':');
  let ms = 0;
  if (parts.length === 3) {
    ms += parseInt(parts[0]) * 3600000; // hours
    ms += parseInt(parts[1]) * 60000;   // min
    const secParts = parts[2].split('.');
    ms += parseInt(secParts[0]) * 1000;
    if (secParts[1]) ms += parseInt(secParts[1]) * 10;
  } else if (parts.length === 2) {
    ms += parseInt(parts[0]) * 60000;   // min
    const secParts = parts[1].split('.');
    ms += parseInt(secParts[0]) * 1000;
    if (secParts[1]) ms += parseInt(secParts[1]) * 10; // centiseconds (2 digits) usually
  }
  return ms;
}

window.openLeaderboardClassDetail = function (className) {
  const mainView = document.getElementById('lb-main-view');
  const detailView = document.getElementById('lb-detail-view');
  if (!mainView || !detailView) return;

  mainView.classList.add('hidden');
  detailView.classList.remove('hidden');
  document.getElementById('lb-detail-name').innerText = `Kelas ${className}`;
  document.getElementById('lb-detail-desc').innerText = `Ranking Time Trial Terbaru`;
  
  const container = document.getElementById('container-lb-detail-list');
  container.innerHTML = '';

  // 1. Dapatkan daftar atlet di kelas ini
  const athletesInClass = masterAthletesList.filter(a => (a.group_level || 'Belum Set') === className);
  const athleteIds = athletesInClass.map(a => a.id);

  if (athleteIds.length === 0) return container.innerHTML = '<div class="text-center py-6 text-xs text-gray-400">Tidak ada atlet.</div>';

  // 2. Cari event (sesi) terbaru yang diikuti oleh minimal 1 atlet dari kelas ini
  let latestSession = null;
  for (const session of allTrainingData) {
    const hasAthlete = session.records.some(r => athleteIds.includes(r.profile_id));
    if (hasAthlete) {
      latestSession = session;
      break;
    }
  }

  if (!latestSession) {
    return container.innerHTML = '<div class="text-center py-6 text-xs text-gray-400">Belum ada data Time Trial untuk kelas ini.</div>';
  }

  // 3. Render event header
  const dateObj = new Date(latestSession.created_at);
  const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
  
  // Hitung max sets dari session ini HANYA untuk atlet kelas ini
  const classRecords = latestSession.records.filter(r => athleteIds.includes(r.profile_id));
  const athleteGroups = {};
  classRecords.forEach(r => {
    if (!athleteGroups[r.profile_id]) athleteGroups[r.profile_id] = [];
    athleteGroups[r.profile_id].push(r);
  });
  
  let maxSets = 0;
  Object.values(athleteGroups).forEach(laps => {
    if (laps.length > maxSets) maxSets = laps.length;
  });

  let html = `
    <div class="bg-gray-100 dark:bg-[#2b2532] rounded-xl p-4 border border-gray-200 dark:border-gray-800 mb-4 shadow-sm">
       <div class="text-[10px] text-brand-red font-bold uppercase tracking-wider mb-1">EVENT TERBARU</div>
       <div class="text-sm font-bold text-gray-800 dark:text-white uppercase mb-2">${latestSession.title_event}</div>
       <div class="flex flex-wrap gap-2 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
         <span class="bg-white dark:bg-zinc-800 px-2 py-1 rounded">Jarak: ${latestSession.distance}M</span>
         <span class="bg-white dark:bg-zinc-800 px-2 py-1 rounded">Kolam: ${latestSession.pool_size}M</span>
         <span class="bg-white dark:bg-zinc-800 px-2 py-1 rounded">Set: ${maxSets}</span>
       </div>
       <div class="text-[9px] font-bold text-gray-400 mt-3">${dateStr}</div>
    </div>
    <div class="bg-white dark:bg-[#221c29] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
  `;

  // 4. Urutkan atlet berdasarkan waktu finish (fastest to slowest)
  const rankedAthletes = Object.keys(athleteGroups).map(profileId => {
    const laps = athleteGroups[profileId];
    laps.sort((a,b) => a.id - b.id);
    const finishRecord = laps[laps.length - 1];
    return {
      profileId,
      finishTimeStr: finishRecord.time_record,
      finishTimeMs: timeStringToMs(finishRecord.time_record),
      laps
    };
  }).sort((a, b) => a.finishTimeMs - b.finishTimeMs);

  rankedAthletes.forEach((ra, idx) => {
    const atlet = masterAthletes[ra.profileId];
    const atletName = atlet ? atlet.full_name : 'Anonim';
    const rankBadge = idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500';
    
    let lapsDetailsHTML = '';
    ra.laps.forEach((lap, lapIdx) => {
       const label = (lapIdx === ra.laps.length - 1) ? `Set ${lapIdx + 1} / Finish` : `Set ${lapIdx + 1}`;
       lapsDetailsHTML += `
         <div class="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800 last:border-0 pl-2">
           <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">${label}</span>
           <span class="text-[11px] font-mono text-gray-700 dark:text-gray-300 font-bold">${lap.time_record}</span>
         </div>
       `;
    });

    html += `
      <div>
        <div class="p-3.5 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors" onclick="this.nextElementSibling.classList.toggle('hidden')">
          <div class="flex items-center gap-3">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rankBadge}">
              ${idx + 1}
            </div>
            <span class="text-xs font-bold text-gray-800 dark:text-gray-200">${atletName}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs font-mono font-bold text-brand-red bg-brand-red/10 px-2 py-1 rounded">${ra.finishTimeStr}</span>
            <span class="text-[9px] text-gray-400">▼</span>
          </div>
        </div>
        <div class="hidden bg-gray-50/50 dark:bg-zinc-900/50 px-4 py-2 border-t border-gray-100 dark:border-gray-800">
          ${lapsDetailsHTML}
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
};