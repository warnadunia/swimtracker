import './style.css';

// IMPOR KOMPONEN HTML SPA
import navCoachHTML from '../coach_nav.html?raw';
import dashCoachHTML from '../coach_dashboard.html?raw';
import atletCoachHTML from '../coach_atlet.html?raw';
import absenCoachHTML from '../coach_absen.html?raw';
import manageCoachHTML from '../coach_manage.html?raw';
import trainingCoachHTML from '../coach_training.html?raw';
import leaderboardCoachHTML from '../coach_leaderboard.html?raw';

import { initProfileModal, initDashboardProfile } from './profile_modal.js';

// STATE UTAMA APP COACH
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

  initProfileModal();
  initDashboardProfile();

  // Bypass arsitektur SPA jika berada di halaman utilitas
  const isStopwatchPage = document.getElementById('sw-display');
  const isSetupPage = document.getElementById('atlet-list-checkbox');

  if (isStopwatchPage) { initStopwatchEngine(); return; }
  if (isSetupPage) { initSetupTTEngine(); return; }

  // CORE SPA INJECTION
  const navContainer = document.getElementById('coach-nav-container');
  const mainContainer = document.getElementById('coach-main-container');

  if (navContainer && mainContainer) {
    navContainer.innerHTML = navCoachHTML;
    mainContainer.innerHTML = `
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
  }

  // GLOBAL EVENT DELEGATION (Fix transisi close modal)
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
    
    // Taktik transisi tutup modal atlet
    if (e.target.closest('#btn-close-modal-class')) {
      const inner = document.getElementById('modal-edit-inner');
      const modal = document.getElementById('modal-edit-class');
      if (inner) inner.classList.add('translate-y-full');
      if (modal) setTimeout(() => modal.classList.add('hidden'), 300);
    }
    // Taktik transisi tutup modal coach
    if (e.target.closest('#btn-close-modal-coach')) {
      const inner = document.getElementById('modal-edit-coach-inner');
      const modal = document.getElementById('modal-edit-coach');
      if (inner) inner.classList.add('translate-y-full');
      if (modal) setTimeout(() => modal.classList.add('hidden'), 300);
    }
  });

  function handlePillClick(btn, selector) {
    document.querySelectorAll(selector).forEach(p => { p.classList.remove('bg-brand-red', 'text-white', 'shadow-md'); p.classList.add('bg-white', 'dark:bg-[#221c29]', 'text-gray-500'); });
    btn.classList.add('bg-brand-red', 'text-white', 'shadow-md');
  }

  // LOGIKA CORE DATA DASHBOARD AMBIL VIA ROUTER MERGER bray
  async function fetchMasterData() {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const response = await fetch('/api/coach?action=athletes');
      const result = await response.json();
      masterAthletesList = result.data || [];
      masterAthletesList.forEach(a => masterAthletes[a.id] = a);
      document.querySelectorAll('#stat-total-atlet').forEach(el => el.innerText = masterAthletesList.length);

      const adminResponse = await fetch('/api/admin?action=users');
      const adminResult = await adminResponse.json();
      masterCoachesList = (adminResult.data || []).filter(u => u.role === 'coach' || u.role === 'head_coach');
      const statCoach = document.getElementById('stat-total-coach');
      if (statCoach) statCoach.innerText = masterCoachesList.length;

      const attResponse = await fetch(`/api/coach?action=attendance&date=${todayStr}`);
      const attResult = await attResponse.json();
      masterAttendanceToday = {};
      (attResult.data || []).forEach(row => masterAttendanceToday[row.athlete_id] = row.status === 'hadir');

      renderManageClasses();
      renderAbsenClasses();
      renderManageCoaches();
      await loadMedals(document.getElementById('medal-year-filter')?.value || '2026');
      await fetchTrainingData();
    } catch (err) { console.error(err); }
  }

  async function loadMedals(year) {
    try {
      const response = await fetch('/api/admin?action=prestasi');
      const result = await response.json();
      rawMedalsData = result.data || [];
      allMedalsData = rawMedalsData.filter(r => r.event_date && r.event_date.startsWith(year));

      let emas = 0, perak = 0, perunggu = 0;
      allMedalsData.forEach(r => { if (r.rank === 1) emas++; else if (r.rank === 2) perak++; else if (r.rank === 3) perunggu++; });
      if (document.getElementById('count-emas')) {
        document.getElementById('count-emas').innerText = emas;
        document.getElementById('count-perak').innerText = perak;
        document.getElementById('count-perunggu').innerText = perunggu;
      }
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

    userMedals.forEach(r => {
      container.innerHTML += `
        <div class="bg-white dark:bg-[#221c29] p-3 rounded-xl border flex justify-between items-center shadow-sm">
          <div class="flex-1 pr-2">
            <div class="text-xs font-bold mb-0.5 truncate">${r.event_title}</div>
            <div class="text-[10px] text-gray-500">${r.distance_meters}M ${r.style_name}</div>
          </div>
          <div class="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded border"><span>${r.rank === 1 ? '🥇' : '🥈'}</span><span class="text-[10px] font-bold">Rank ${r.rank}</span></div>
        </div>`;
    });
  };

  window.closeLeaderboardDetail = function () { document.getElementById('lb-detail-view').classList.add('hidden'); document.getElementById('lb-main-view').classList.remove('hidden'); };

  function renderMedalistTable() {
    const container = document.getElementById('medalist-container');
    if (!container) return; container.innerHTML = '';
    const filtered = allMedalsData.filter(r => { const atlet = masterAthletes[r.user_id]; return currentMedalFilter === 'All' || (atlet && atlet.group_level === currentMedalFilter); });
    filtered.forEach(r => {
      const atlet = masterAthletes[r.user_id];
      container.innerHTML += `
        <div class="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-900/50">
          <div><div class="text-xs font-bold">${atlet ? atlet.full_name : 'Anonim'}</div><div class="text-[9px] text-gray-400 mt-0.5 truncate max-w-[200px]">${r.distance_meters}M ${r.style_name} • ${r.event_title}</div></div>
          <div class="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded border"><span>${r.rank === 1 ? '🥇' : '🥈'}</span><span class="text-[10px] font-bold">Rank ${r.rank}</span></div>
        </div>`;
    });
  }

  function renderManageClasses() {
    const container = document.getElementById('container-manage-classes');
    if (!container) return; container.innerHTML = '';
    const grouped = groupByClass(masterAthletesList);
    let toRender = Object.keys(grouped);
    if (currentManageFilter !== 'All') toRender = toRender.filter(c => c.toLowerCase() === currentManageFilter.toLowerCase());
    toRender.forEach(lvl => {
      let html = `<div class="bg-white dark:bg-[#221c29] rounded-2xl border mb-4 overflow-hidden"><div class="px-4 py-3 bg-gray-50 dark:bg-[#2b2532] border-b flex justify-between"><h5 class="text-xs font-bold uppercase tracking-wide">Kelas ${lvl}</h5></div><div class="divide-y">`;
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

  // 🚨 FIX TRANISI MODAL KELAS ATLET BRAY!
  window.openEditClass = function (id, name, currentClass) {
    const modal = document.getElementById('modal-edit-class');
    const inner = document.getElementById('modal-edit-inner');
    if (!modal || !inner) return;

    document.getElementById('edit-atlet-id').value = id; 
    document.getElementById('edit-atlet-name').innerText = name;
    if (currentClass && currentClass !== 'Belum Set') {
      document.getElementById('select-new-class').value = currentClass;
    }

    modal.classList.remove('hidden');
    setTimeout(() => inner.classList.remove('translate-y-full'), 10);
  };

  document.getElementById('btn-save-class')?.addEventListener('click', async () => {
    const id = document.getElementById('edit-atlet-id').value; 
    const newClass = document.getElementById('select-new-class').value;
    
    try {
      const response = await fetch('/api/admin', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id, full_name: document.getElementById('edit-atlet-name').innerText, group_level: newClass }) 
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      if (masterAthletesList.length > 0) {
        const target = masterAthletesList.find(a => a.id === id);
        if (target) target.group_level = newClass;
      }
      if (masterAthletes[id]) masterAthletes[id].group_level = newClass;

      renderManageClasses(); 
      renderAbsenClasses(); 
      
      // Tutup pakai transisi aman
      const inner = document.getElementById('modal-edit-inner');
      const modal = document.getElementById('modal-edit-class');
      if (inner) inner.classList.add('translate-y-full');
      if (modal) setTimeout(() => modal.classList.add('hidden'), 300);
      
    } catch (err) { alert("Gagal memindahkan kelas atlet bray!"); }
  });

  function renderAbsenClasses() {
    const container = document.getElementById('container-absen-classes');
    if (!container) return; container.innerHTML = '';
    const grouped = groupByClass(masterAthletesList);
    let toRender = Object.keys(grouped);
    if (currentAbsenFilter !== 'All') toRender = toRender.filter(c => c.toLowerCase() === currentAbsenFilter.toLowerCase());
    toRender.forEach(lvl => {
      let html = `<div class="bg-white dark:bg-[#221c29] rounded-2xl border mb-4 overflow-hidden"><div class="px-4 py-3 bg-gray-50 dark:bg-[#2b2532] border-b"><h5 class="text-xs font-bold uppercase tracking-wide">Kelas ${lvl}</h5></div><div class="divide-y">`;
      grouped[lvl].forEach(a => {
        const isPresent = masterAttendanceToday[a.id] === true; 
        
        html += `<div class="p-4 flex justify-between items-center">
            <div><div class="text-xs font-bold">${a.full_name}</div></div>
            <label class="relative inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" class="sr-only peer" onchange="window.saveAbsen('${a.id}', this)" ${isPresent ? 'checked' : ''}>
              <div class="w-11 h-6 bg-gray-200 dark:bg-zinc-800 rounded-full peer peer-checked:bg-emerald-500"></div>
              <span class="ml-2 text-[10px] font-bold uppercase min-w-[36px] text-right ${isPresent ? 'text-emerald-500' : 'text-gray-400'}">${isPresent ? 'Hadir' : 'Absen'}</span>
            </label>
          </div>`;
      });
      container.innerHTML += html + `</div></div>`;
    });
  }

  window.saveAbsen = async function (profileId, checkboxElem) {
    const isPresent = checkboxElem.checked;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await fetch('/api/coach?action=attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: todayStr, attendance_list: [{ athlete_id: profileId, status: isPresent ? 'hadir' : 'absen' }] }) });
      masterAttendanceToday[profileId] = isPresent;
    } catch (err) { checkboxElem.checked = !isPresent; }
  };

  function groupByClass(arr) { return arr.reduce((acc, a) => { const lvl = a.group_level || 'Belum Set'; if (!acc[lvl]) acc[lvl] = []; acc[lvl].push(a); return acc; }, {}); }

  function renderManageCoaches() {
    const container = document.getElementById('container-manage-coaches');
    if (!container) return; container.innerHTML = '';
    masterCoachesList.forEach(c => {
      container.innerHTML += `
        <div class="p-3 flex justify-between items-center hover:bg-gray-50">
          <div><div class="text-xs font-bold">${c.full_name}</div><div class="text-[10px] text-gray-500 mt-0.5">${c.role === 'head_coach' ? '👑 Head Coach' : '🏊‍♂️ Coach'}</div></div>
          <div class="flex items-center gap-2"><span class="text-[9px] font-bold text-emerald-500 bg-emerald-900/10 px-2 py-1 rounded">${c.group_level || 'Belum Di-assign'}</span>
          <button onclick="window.openEditCoach('${c.id}', '${c.full_name}', '${c.group_level || ''}')" class="p-1.5 bg-gray-100 dark:bg-zinc-800 rounded">⚙️</button></div>
        </div>`;
    });
  }

  window.openEditCoach = function (id, name, currentClass) {
    document.getElementById('edit-coach-id').value = id; 
    document.getElementById('edit-coach-name').innerText = name;
    
    // 🚨 GANTI ELEMEN SELECT JADI INPUT BIAR BISA NGETIK BANYAK KELAS
    const containerClass = document.getElementById('select-coach-class').parentElement;
    containerClass.innerHTML = `<input type="text" id="select-coach-class" class="w-full px-3 py-2 bg-gray-50 border rounded-lg text-xs" placeholder="Cth: Basic 1, Prestasi" value="${currentClass || ''}">`;
    
    const modal = document.getElementById('modal-edit-coach');
    const inner = document.getElementById('modal-edit-coach-inner');
    modal.classList.remove('hidden');
    setTimeout(() => inner.classList.remove('translate-y-full'), 10);
  };

  document.getElementById('btn-save-coach-class')?.addEventListener('click', async () => {
    const id = document.getElementById('edit-coach-id').value; 
    const newClass = document.getElementById('select-coach-class').value;
    try {
      await fetch('/api/admin', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, full_name: document.getElementById('edit-coach-name').innerText, group_level: newClass }) });
      masterCoachesList.find(c => c.id === id).group_level = newClass; 
      renderManageCoaches(); 
      
      const inner = document.getElementById('modal-edit-coach-inner');
      const modal = document.getElementById('modal-edit-coach');
      if (inner) inner.classList.add('translate-y-full');
      if (modal) setTimeout(() => modal.classList.add('hidden'), 300);
    } catch (err) { alert("Gagal update"); }
  });

  async function fetchTrainingData() {
    try {
      const response = await fetch('/api/coach?action=time_trials');
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

    filtered.forEach(session => {
      const athleteGroups = {};
      session.records.forEach(r => { if (!athleteGroups[r.profile_id]) athleteGroups[r.profile_id] = []; athleteGroups[r.profile_id].push(r); });
      let maxSets = Math.max(...Object.values(athleteGroups).map(l => l.length));

      let athletesHTML = '';
      Object.keys(athleteGroups).forEach(profileId => {
        const laps = athleteGroups[profileId];
        let lapsDetailsHTML = laps.map((lap, idx) => `
          <div class="flex justify-between items-center py-2 border-b last:border-0 pl-2">
            <span class="text-[10px] text-gray-400 font-bold uppercase">${idx === laps.length - 1 ? 'Finish' : `Set ${idx + 1}`}</span>
            <span class="text-[11px] font-mono font-bold">${lap.time_record}</span>
          </div>`).join('');

        athletesHTML += `
          <div class="border-b last:border-0">
            <div class="p-3.5 flex justify-between items-center cursor-pointer hover:bg-gray-50" onclick="this.nextElementSibling.classList.toggle('hidden')">
              <span class="text-xs font-bold">${masterAthletes[profileId]?.full_name || 'Anonim'}</span>
              <span class="text-xs font-mono font-bold text-brand-red bg-brand-red/10 px-2 py-1 rounded">${laps[laps.length - 1].time_record}</span>
            </div>
            <div class="hidden bg-gray-50/30 px-4 py-2">${lapsDetailsHTML}</div>
          </div>`;
      });

      container.innerHTML += `
        <div class="bg-white dark:bg-[#221c29] rounded-2xl border mb-4 overflow-hidden">
           <div class="p-4 border-b bg-gray-50 flex justify-between">
             <div><div class="text-sm font-bold uppercase">${session.title_event}</div><div class="text-[10px] text-gray-400 mt-1">Jarak: ${session.distance}M | Kolam: ${session.pool_size}M | Set Max: ${maxSets}</div></div>
           </div><div class="divide-y">${athletesHTML}</div>
        </div>`;
    });
  }

  document.getElementById('search-training')?.addEventListener('input', (e) => renderTrainingData(e.target.value));
  await fetchMasterData();
});

// =========================================================
// 4. ENGINE SETUP CONFIG TIME TRIAL (coach_setup_tt.html)
// =========================================================
async function initSetupTTEngine() {
  const checkboxContainer = document.getElementById('atlet-list-checkbox');
  const btnStart = document.getElementById('btn-start-tt');

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const attResponse = await fetch(`/api/coach?action=attendance&date=${todayStr}`);
    const attResult = await attResponse.json();

    const presentIds = (attResult.data || []).filter(a => a.status === 'hadir').map(a => a.athlete_id);
    if (presentIds.length === 0) {
      checkboxContainer.innerHTML = `<div class="text-center p-4 bg-red-900/10 text-brand-red text-xs font-bold">Belum ada atlet hadir bray.</div>`;
      return; 
    }

    const athResponse = await fetch('/api/coach?action=athletes');
    const athResult = await athResponse.json();
    const presentAthletes = (athResult.data || []).filter(a => presentIds.includes(a.id));

    checkboxContainer.innerHTML = presentAthletes.map(atlet => `
      <label class="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-[#1a1620] rounded-xl border cursor-pointer select-none">
        <input type="checkbox" value="${atlet.id}" data-name="${atlet.full_name}" class="atlet-cb w-4 h-4 rounded border-gray-300 text-brand-red">
        <span class="text-sm font-medium">${atlet.full_name}</span>
      </label>
    `).join('');
  } catch (err) { console.error(err); }

  btnSave?.addEventListener('click', async () => {
    // 🚨 UBAH STRUKTUR INSERT TT COACH BIAR BISA SIMPEN ARRAY LAPS BRAY!
    
    // Kita kumpulkan lap berdasarkan user_id
    const athleteResults = {};
    recordedSplits.forEach(s => {
       if (!athleteResults[s.user_id]) {
         athleteResults[s.user_id] = { laps: [], finalTime: "00:00.00" };
       }
       athleteResults[s.user_id].laps.push(s.time_string);
       athleteResults[s.user_id].finalTime = s.time_string; // Lap terakhir jadi waktu final
    });

    const inserts = Object.keys(athleteResults).map(uid => ({ 
      profile_id: uid, 
      title_event: ttConfig.title, 
      distance: ttConfig.distance, 
      pool_size: ttConfig.pool, 
      sets: ttConfig.sets,
      time_record: athleteResults[uid].finalTime,
      splits: athleteResults[uid].laps  // <-- INI DIA ARRAY LAPS NYA BRAY!
    }));

    try {
      await fetch('/api/coach?action=time_trials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inserts }) });
      localStorage.removeItem('active_tt_config'); 
      window.location.replace('/coach_app.html');
    } catch(e) { alert("Gagal nyimpen TT!"); }
  });
}

// =========================================================
// 5. ENGINE LIVE STOPWATCH ONE BUTTON (coach_stopwatch_tt.html)
// =========================================================
function initStopwatchEngine() {
  const configData = localStorage.getItem('active_tt_config');
  if (!configData) return window.location.replace('/coach_app.html');
  const ttConfig = JSON.parse(configData);

  const display = document.getElementById('sw-display');
  const btnMain = document.getElementById('sw-btn-main'); 
  const btnReset = document.getElementById('sw-btn-reset');
  const btnSave = document.getElementById('btn-save-tt');
  const logContainer = document.getElementById('split-records-log');
  const bottomSheet = document.getElementById('bottom-sheet-atlet');

  let startTime = 0, elapsedTime = 0, timerInterval = null, isRunning = false, recordedSplits = [], currentActiveSplitIndex = null;
  const totalAthletes = ttConfig.athletes.length, totalSets = ttConfig.sets;
  let currentSet = 1, lapPressCount = 0;

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    return `${Math.floor(totalSeconds / 60).toString().padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}.${Math.floor((ms % 1000) / 10).toString().padStart(2, '0')}`;
  }

  btnMain?.addEventListener('click', () => {
    if (!isRunning && currentSet === 1 && lapPressCount === 0) {
      isRunning = true; startTime = performance.now();
      timerInterval = requestAnimationFrame(function run() { if (!isRunning) return; elapsedTime = performance.now() - startTime; display.innerText = formatTime(elapsedTime); timerInterval = requestAnimationFrame(run); });
    } else if (isRunning) {
      const currentStamp = elapsedTime; const formattedStamp = formatTime(currentStamp);
      recordedSplits.push({ time_ms: currentStamp, time_string: formattedStamp, user_id: null, athlete_name: 'Menunggu...', set_number: currentSet });
      const newIndex = recordedSplits.length - 1;

      const logRow = document.createElement('div');
      logRow.className = 'flex justify-between items-center bg-zinc-900 p-3 rounded-xl border mb-2';
      logRow.innerHTML = `<span class="font-mono text-white">${formattedStamp}</span><button onclick="window.openAthletePicker(${newIndex})" class="text-xs text-brand-red" id="btn-assign-${newIndex}">⚡ Pilih Atlet</button>`;
      logContainer.appendChild(logRow);

      lapPressCount++;
      if (lapPressCount >= totalAthletes) { currentSet++; lapPressCount = 0; }
      if (currentSet > totalSets) {
        isRunning = false; cancelAnimationFrame(timerInterval);
        btnMain.innerText = 'LATIHAN SELESAI'; btnMain.classList.add('pointer-events-none');
        btnSave.classList.remove('opacity-50', 'pointer-events-none');
      }
    }
  });

  // 🚨 FIX TRANSISI BOTTOM SHEET STOPWATCH BRAY!
  window.openAthletePicker = function(index) {
    currentActiveSplitIndex = index;
    const targetSplit = recordedSplits[index];
    const assignedIds = recordedSplits.filter((s, i) => s.set_number === targetSplit.set_number && i !== index && s.user_id !== null).map(s => s.user_id);

    document.getElementById('sheet-atlet-list').innerHTML = ttConfig.athletes.map(atlet => {
      return assignedIds.includes(atlet.id) 
        ? `<button class="w-full py-2 text-zinc-600 text-left line-through" disabled>${atlet.name}</button>` 
        : `<button class="w-full py-2 text-white text-left font-bold" onclick="window.selectAthleteForSplit('${atlet.id}', '${atlet.name}')">${atlet.name}</button>`;
    }).join('');
    
    if (bottomSheet) {
      bottomSheet.classList.remove('pointer-events-none', 'opacity-0');
      const inner = bottomSheet.querySelector('div');
      if (inner) inner.classList.remove('translate-y-full');
    }
  };

  window.selectAthleteForSplit = function(id, name) {
    recordedSplits[currentActiveSplitIndex].user_id = id;
    document.getElementById(`btn-assign-${currentActiveSplitIndex}`).innerText = name;
    
    if (bottomSheet) {
      bottomSheet.classList.add('pointer-events-none', 'opacity-0');
      const inner = bottomSheet.querySelector('div');
      if (inner) inner.classList.add('translate-y-full');
    }
  };

  btnSave?.addEventListener('click', async () => {
    const inserts = recordedSplits.map(s => ({ profile_id: s.user_id, title_event: ttConfig.title, distance: ttConfig.distance, pool_size: ttConfig.pool, time_record: s.time_string }));
    await fetch('/api/coach?action=time_trials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inserts }) });
    localStorage.removeItem('active_tt_config'); window.location.replace('/coach_app.html');
  });
}