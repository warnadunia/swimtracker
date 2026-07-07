import './style.css';

import navCoachHTML from '../coach_nav.html?raw';
import dashCoachHTML from '../coach_dashboard.html?raw';
import atletCoachHTML from '../coach_atlet.html?raw';
import absenCoachHTML from '../coach_absen.html?raw';
import manageCoachHTML from '../coach_manage.html?raw';
import trainingCoachHTML from '../coach_training.html?raw';
import leaderboardCoachHTML from '../coach_leaderboard.html?raw';

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
  const sessionUser = localStorage.getItem('swim_user');
  if (!sessionUser) return window.location.replace('/index.html');

  const profile = JSON.parse(sessionUser);
  if (!profile || (profile.role !== 'head_coach' && profile.role !== 'coach' && profile.role !== 'admin')) {
    return window.location.replace('/app.html');
  }

  // INJEKSI SPA TEMPLATE
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

  if (profile.role === 'head_coach' || profile.role === 'admin') {
    const headMenu = document.getElementById('nav-headcoach-only');
    if (headMenu) { headMenu.classList.remove('hidden'); headMenu.classList.add('flex'); }
  }

  window.switchCoachTab = function (tabId) {
    document.querySelectorAll('.coach-tab-content').forEach(tab => tab.classList.add('hidden'));
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    document.querySelectorAll('.nav-coach-btn').forEach(btn => {
      btn.classList.remove('text-brand-red'); btn.classList.add('text-gray-400');
    });

    const activeBtn = document.querySelector(`[onclick="window.switchCoachTab('${tabId}')"]`);
    if (activeBtn) activeBtn.classList.add('text-brand-red');
  };
  window.switchCoachTab('tab-coach-dashboard');

  // GLOBAL EVENT DELEGATION
  document.addEventListener('click', async (e) => {
    if (e.target.closest('#fullscreen-toggle')) {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else if (document.exitFullscreen) document.exitFullscreen();
    }
    if (e.target.closest('#theme-toggle')) {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
    if (e.target.closest('#btn-logout')) {
      if (confirm("Keluar dari akun?")) { localStorage.removeItem('swim_user'); window.location.replace('/index.html'); }
    }

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

    if (e.target.closest('#btn-close-modal-class')) {
      document.getElementById('modal-edit-inner').classList.add('translate-y-full');
      setTimeout(() => document.getElementById('modal-edit-class').classList.add('hidden'), 300);
    }
    if (e.target.closest('#btn-close-modal-coach')) {
      document.getElementById('modal-edit-coach-inner').classList.add('translate-y-full');
      setTimeout(() => document.getElementById('modal-edit-coach').classList.add('hidden'), 300);
    }
  });

  function handlePillClick(btn, selector) {
    document.querySelectorAll(selector).forEach(p => { p.classList.remove('bg-brand-red', 'text-white', 'shadow-md'); p.classList.add('bg-white', 'dark:bg-[#221c29]', 'text-gray-500'); });
    btn.classList.add('bg-brand-red', 'text-white', 'shadow-md');
  }

  async function fetchMasterData() {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const response = await fetch('/api/coach/athletes');
      const result = await response.json();
      masterAthletesList = result.data || [];
      masterAthletesList.forEach(a => masterAthletes[a.id] = a);
      document.querySelectorAll('#stat-total-atlet').forEach(el => el.innerText = masterAthletesList.length);

      // Tarik Coach List dari API Admin bray
      const adminResponse = await fetch('/api/admin/users');
      const adminResult = await adminResponse.json();
      masterCoachesList = (adminResult.data || []).filter(u => u.role === 'coach' || u.role === 'head_coach');
      const statCoach = document.getElementById('stat-total-coach');
      if (statCoach) statCoach.innerText = masterCoachesList.length;

      const attResponse = await fetch(`/api/coach/attendance?date=${todayStr}`);
      const attResult = await attResponse.json();
      masterAttendanceToday = {};
      (attResult.data || []).forEach(row => masterAttendanceToday[row.athlete_id] = row.status === 'hadir');

      renderManageClasses();
      renderAbsenClasses();
      renderManageCoaches();
      await loadMedals(document.getElementById('medal-year-filter').value);
      await fetchTrainingData();
    } catch (err) { console.error(err); }
  }

  async function loadMedals(year) {
    try {
      const response = await fetch('/api/admin/prestasi');
      const result = await response.json();
      rawMedalsData = result.data || [];
      allMedalsData = rawMedalsData.filter(r => r.event_date && r.event_date.startsWith(year));

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

    const pointsMap = {};
    rawMedalsData.forEach(r => {
      if (!pointsMap[r.user_id]) pointsMap[r.user_id] = { emas: 0, perak: 0, perunggu: 0, total: 0 };
      if (r.rank === 1) { pointsMap[r.user_id].emas++; pointsMap[r.user_id].total += 3; }
      if (r.rank === 2) { pointsMap[r.user_id].perak++; pointsMap[r.user_id].total += 2; }
      if (r.rank === 3) { pointsMap[r.user_id].perunggu++; pointsMap[r.user_id].total += 1; }
    });

    const lbArray = Object.keys(pointsMap).map(userId => {
      const atlet = masterAthletes[userId];
      return { userId, name: atlet ? atlet.full_name : 'Anonim', group: atlet ? (atlet.group_level || 'Belum Set') : '-', ...pointsMap[userId] };
    }).sort((a, b) => b.total - a.total);

    container.innerHTML = '';
    if (lbArray.length === 0) { container.innerHTML = '<div class="text-center py-6 text-xs text-gray-400">Belum ada data prestasi.</div>'; return; }

    lbArray.forEach((atlet, index) => {
      const rankBadge = index === 0 ? 'bg-yellow-500 text-white' : index === 1 ? 'bg-gray-300 text-gray-700' : index === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500';
      container.innerHTML += `
        <div class="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors" onclick="window.openLeaderboardDetail('${atlet.userId}', '${atlet.name}')">
          <div class="flex items-center gap-3">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rankBadge}">${index + 1}</div>
            <div><div class="text-xs font-bold text-gray-800 dark:text-zinc-200">${atlet.name}</div><div class="text-[9px] text-gray-400 mt-0.5">Kelas: ${atlet.group}</div></div>
          </div>
          <div class="flex flex-col items-end">
            <div class="text-xs font-bold text-brand-red">${atlet.total} Pts</div>
            <div class="text-[9px] text-gray-500 mt-0.5">🥇${atlet.emas} 🥈${atlet.perak} 🥉${atlet.perunggu}</div>
          </div>
        </div>`;
    });
  }

  window.openLeaderboardDetail = function (userId, name) {
    document.getElementById('lb-main-view').classList.add('hidden');
    document.getElementById('lb-detail-view').classList.remove('hidden');
    document.getElementById('lb-detail-name').innerText = name;

    const container = document.getElementById('container-lb-detail-list');
    container.innerHTML = '';

    const userMedals = rawMedalsData.filter(r => r.user_id === userId);
    if (userMedals.length === 0) { container.innerHTML = '<div class="text-center py-6 text-xs text-gray-400">Tidak ada data medali.</div>'; return; }

    userMedals.forEach(r => {
      const icon = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉';
      container.innerHTML += `
        <div class="bg-white dark:bg-[#221c29] p-3 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center shadow-sm">
          <div class="flex-1 pr-2">
            <div class="text-xs font-bold mb-0.5 truncate">${r.event_title}</div>
            <div class="text-[10px] text-gray-500">${r.distance_meters}M ${r.style_name}</div>
          </div>
          <div class="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded border dark:border-zinc-700"><span>${icon}</span><span class="text-[10px] font-bold">Rank ${r.rank}</span></div>
        </div>`;
    });
  };

  window.closeLeaderboardDetail = function () { document.getElementById('lb-detail-view').classList.add('hidden'); document.getElementById('lb-main-view').classList.remove('hidden'); };

  function renderMedalistTable() {
    const container = document.getElementById('medalist-container');
    if (!container) return; container.innerHTML = '';
    const filtered = allMedalsData.filter(r => { const atlet = masterAthletes[r.user_id]; return currentMedalFilter === 'All' || (atlet && atlet.group_level === currentMedalFilter); });
    if (filtered.length === 0) return container.innerHTML = `<div class="p-4 text-center text-xs text-gray-500">Belum ada medali.</div>`;
    filtered.forEach(r => {
      const atlet = masterAthletes[r.user_id];
      container.innerHTML += `
        <div class="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-900/50">
          <div><div class="text-xs font-bold">${atlet ? atlet.full_name : 'Anonim'}</div><div class="text-[9px] text-gray-400 mt-0.5 truncate max-w-[200px]">${r.distance_meters}M ${r.style_name} • ${r.event_title}</div></div>
          <div class="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded border dark:border-zinc-700"><span>${r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}</span><span class="text-[10px] font-bold">Rank ${r.rank}</span></div>
        </div>`;
    });
  }
  document.getElementById('medal-year-filter').addEventListener('change', (e) => loadMedals(e.target.value));

  function renderManageClasses() {
    const container = document.getElementById('container-manage-classes');
    if (!container) return; container.innerHTML = '';
    const grouped = groupByClass(masterAthletesList);
    let toRender = Object.keys(grouped);
    if (currentManageFilter !== 'All') toRender = toRender.filter(c => c.toLowerCase() === currentManageFilter.toLowerCase());
    toRender.forEach(lvl => {
      let html = `<div class="bg-white dark:bg-[#221c29] rounded-2xl border border-gray-200 dark:border-gray-800 mb-4 overflow-hidden"><div class="px-4 py-3 bg-gray-50 dark:bg-[#2b2532] border-b border-gray-100 dark:border-gray-800 flex justify-between"><h5 class="text-xs font-bold uppercase tracking-wide">Kelas ${lvl}</h5></div><div class="divide-y divide-gray-100 dark:divide-gray-800/60">`;
      grouped[lvl].forEach(a => {
        html += `<div class="p-4 flex justify-between items-center">
            <div><div class="text-xs font-bold">${a.full_name}</div><div class="text-[9px] text-gray-400">Lahir: ${a.birth_year || '-'}</div></div>
            <div class="flex items-center gap-3"><span class="text-[10px] font-bold text-brand-red bg-red-900/10 px-2 py-1 rounded">${a.group_level || 'Belum Set'}</span>
            ${profile.role === 'head_coach' || profile.role === 'admin' ? `<button onclick="window.openEditClass('${a.id}','${a.full_name}','${a.group_level}')" class="p-1.5 bg-gray-100 dark:bg-zinc-800 rounded">⚙️</button>` : ''}</div>
          </div>`;
      });
      container.innerHTML += html + `</div></div>`;
    });
  }

  window.openEditClass = function (id, name, currentClass) {
    document.getElementById('edit-atlet-id').value = id; document.getElementById('edit-atlet-name').innerText = name;
    if (currentClass && currentClass !== 'Belum Set') document.getElementById('select-new-class').value = currentClass;
    document.getElementById('modal-edit-class').classList.remove('hidden');
    setTimeout(() => document.getElementById('modal-edit-inner').classList.remove('translate-y-full'), 10);
  };

  document.getElementById('btn-save-class').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-class');
    const id = document.getElementById('edit-atlet-id').value; const newClass = document.getElementById('select-new-class').value;
    btn.innerText = 'Menyimpan...'; btn.disabled = true;
    try {
      await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, full_name: document.getElementById('edit-atlet-name').innerText, group_level: newClass }) });
      masterAthletesList.find(a => a.id === id).group_level = newClass; masterAthletes[id].group_level = newClass;
      renderManageClasses(); renderAbsenClasses(); document.getElementById('btn-close-modal-class').click();
    } catch (err) { alert("Gagal ubah kelas"); } finally { btn.innerText = '💾 SIMPAN KELAS'; btn.disabled = false; }
  });

  function renderAbsenClasses() {
    const container = document.getElementById('container-absen-classes');
    if (!container) return; container.innerHTML = '';
    const grouped = groupByClass(masterAthletesList);
    let toRender = Object.keys(grouped);
    if (currentAbsenFilter !== 'All') toRender = toRender.filter(c => c.toLowerCase() === currentAbsenFilter.toLowerCase());
    toRender.forEach(lvl => {
      let html = `<div class="bg-white dark:bg-[#221c29] rounded-2xl border border-gray-200 dark:border-gray-800 mb-4 overflow-hidden"><div class="px-4 py-3 bg-gray-50 dark:bg-[#2b2532] border-b border-gray-100 dark:border-gray-800"><h5 class="text-xs font-bold uppercase tracking-wide">Kelas ${lvl}</h5></div><div class="divide-y divide-gray-100 dark:divide-gray-800/60">`;
      grouped[lvl].forEach(a => {
        const isPresent = masterAttendanceToday[a.id] !== false;
        html += `<div class="p-4 flex justify-between items-center">
            <div><div class="text-xs font-bold">${a.full_name}</div><div class="text-[9px] text-gray-400">Lahir: ${a.birth_year || '-'}</div></div>
            <label class="relative inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" class="sr-only peer" onchange="window.saveAbsen('${a.id}', this)" ${isPresent ? 'checked' : ''}>
              <div class="w-11 h-6 bg-gray-200 dark:bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span class="ml-2 text-[10px] font-bold uppercase min-w-[36px] text-right ${isPresent ? 'text-emerald-500' : 'text-gray-400'}">${isPresent ? 'Hadir' : 'Absen'}</span>
            </label>
          </div>`;
      });
      container.innerHTML += html + `</div></div>`;
    });
  }

  window.saveAbsen = async function (profileId, checkboxElem) {
    const isPresent = checkboxElem.checked; const labelSpan = checkboxElem.nextElementSibling.nextElementSibling;
    labelSpan.innerText = isPresent ? 'Hadir' : 'Absen'; labelSpan.className = `ml-2 text-[10px] font-bold uppercase min-w-[36px] text-right ${isPresent ? 'text-emerald-500' : 'text-gray-400'}`;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await fetch('/api/coach/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: todayStr, attendance_list: [{ athlete_id: profileId, status: isPresent ? 'hadir' : 'absen' }] }) });
      masterAttendanceToday[profileId] = isPresent;
    } catch (err) { checkboxElem.checked = !isPresent; }
  };

  function groupByClass(arr) { return arr.reduce((acc, a) => { const lvl = a.group_level || 'Belum Set'; if (!acc[lvl]) acc[lvl] = []; acc[lvl].push(a); return acc; }, {}); }

  function renderManageCoaches() {
    const container = document.getElementById('container-manage-coaches');
    if (!container) return; container.innerHTML = '';
    masterCoachesList.forEach(c => {
      container.innerHTML += `
        <div class="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-900/50">
          <div><div class="text-xs font-bold">${c.full_name}</div><div class="text-[10px] text-gray-500 mt-0.5">${c.role === 'head_coach' ? '👑 Head Coach' : '🏊‍♂️ Coach'}</div></div>
          <div class="flex items-center gap-2"><span class="text-[9px] font-bold text-emerald-500 bg-emerald-900/10 px-2 py-1 rounded">${c.group_level || 'Belum Di-assign'}</span>
          <button onclick="window.openEditCoach('${c.id}', '${c.full_name}', '${c.group_level || ''}')" class="p-1.5 bg-gray-100 dark:bg-zinc-800 rounded">⚙️</button></div>
        </div>`;
    });
  }

  window.openEditCoach = function (id, name, currentClass) {
    document.getElementById('edit-coach-id').value = id; document.getElementById('edit-coach-name').innerText = name;
    if (currentClass) document.getElementById('select-coach-class').value = currentClass;
    document.getElementById('modal-edit-coach').classList.remove('hidden');
    setTimeout(() => document.getElementById('modal-edit-coach-inner').classList.remove('translate-y-full'), 10);
  };

  const btnSaveCoach = document.getElementById('btn-save-coach-class');
  if (btnSaveCoach) {
    btnSaveCoach.addEventListener('click', async () => {
      const id = document.getElementById('edit-coach-id').value; const newClass = document.getElementById('select-coach-class').value;
      try {
        await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, full_name: document.getElementById('edit-coach-name').innerText, group_level: newClass }) });
        masterCoachesList.find(c => c.id === id).group_level = newClass; renderManageCoaches(); document.getElementById('btn-close-modal-coach').click();
      } catch (err) { alert("Gagal update"); }
    });
  }

  async function fetchTrainingData() {
    try {
      const response = await fetch('/api/coach/time_trials');
      const result = await response.json();
      const groups = {};
      (result.data || []).forEach(r => {
        const key = r.created_at;
        if (!groups[key]) groups[key] = { id: key, created_at: r.created_at, title_event: r.title_event, distance: r.distance, pool_size: r.pool_size, records: [] };
        groups[key].records.push(r);
      });
      allTrainingData = Object.values(groups);
      renderTrainingData();
    } catch (err) { console.error(err); }
  }

  function renderTrainingData(searchQuery = '') {
    const container = document.getElementById('container-training-records');
    if (!container) return; container.innerHTML = '';
    const query = searchQuery.toLowerCase();
    const filtered = allTrainingData.filter(session => session.title_event?.toLowerCase().includes(query) || session.records.some(r => masterAthletes[r.profile_id]?.full_name.toLowerCase().includes(query)));

    if (filtered.length === 0) { container.innerHTML = `<div class="text-center py-6 text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900 rounded-xl">Tidak ada riwayat latihan.</div>`; return; }

    filtered.forEach(session => {
      const athleteGroups = {};
      session.records.forEach(r => { if (!athleteGroups[r.profile_id]) athleteGroups[r.profile_id] = []; athleteGroups[r.profile_id].push(r); });
      let maxSets = Math.max(...Object.values(athleteGroups).map(l => l.length));

      let athletesHTML = '';
      Object.keys(athleteGroups).forEach(profileId => {
        const laps = athleteGroups[profileId];
        let lapsDetailsHTML = laps.map((lap, idx) => `
          <div class="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800 last:border-0 pl-2">
            <span class="text-[10px] text-gray-400 font-bold uppercase">${idx === laps.length - 1 ? 'Finish' : `Set ${idx + 1}`}</span>
            <span class="text-[11px] font-mono font-bold">${lap.time_record}</span>
          </div>`).join('');

        athletesHTML += `
          <div class="border-b last:border-0">
            <div class="p-3.5 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50" onclick="this.nextElementSibling.classList.toggle('hidden')">
              <span class="text-xs font-bold">${masterAthletes[profileId]?.full_name || 'Anonim'}</span>
              <span class="text-xs font-mono font-bold text-brand-red bg-brand-red/10 px-2 py-1 rounded">${laps[laps.length - 1].time_record}</span>
            </div>
            <div class="hidden bg-gray-50/30 dark:bg-zinc-900/50 px-4 py-2">${lapsDetailsHTML}</div>
          </div>`;
      });

      container.innerHTML += `
        <div class="bg-white dark:bg-[#221c29] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm mb-4 overflow-hidden">
           <div class="p-4 border-b bg-gray-50 dark:bg-[#2b2532] flex justify-between">
             <div><div class="text-sm font-bold uppercase">${session.title_event}</div><div class="text-[10px] text-gray-400 mt-1">Jarak: ${session.distance}M | Kolam: ${session.pool_size}M | Set Max: ${maxSets}</div></div>
           </div><div class="divide-y">${athletesHTML}</div>
        </div>`;
    });
  }

  document.addEventListener('input', (e) => { if (e.target.id === 'search-training') renderTrainingData(e.target.value); });
  await fetchMasterData();
});