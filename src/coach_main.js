import './style.css';
import { supabase } from './supabase';

import navCoachHTML from '../coach_nav.html?raw';
import dashCoachHTML from '../coach_dashboard.html?raw';
import atletCoachHTML from '../coach_atlet.html?raw';
import absenCoachHTML from '../coach_absen.html?raw'; 
import manageCoachHTML from '../coach_manage.html?raw'; // Komponen Manajemen Pelatih

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
    <div id="tab-coach-training" class="coach-tab-content hidden"><div class="p-6 text-center text-gray-400 font-bold">Halaman Training (Under Construction)</div></div>
    <div id="tab-coach-leaderboard" class="coach-tab-content hidden"><div class="p-6 text-center text-gray-400 font-bold">Halaman Leaderboard (Under Construction)</div></div>
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
  window.switchCoachTab = function(tabId) {
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

  // STATE MANAGEMENT GLOBAL
  let masterAthletesList = [];
  let masterCoachesList = [];
  let masterAthletes = {};
  let masterAttendanceToday = {};
  let allMedalsData = [];
  let currentMedalFilter = 'All';
  let currentManageFilter = 'All';
  let currentAbsenFilter = 'All';

  // GLOBAL EVENT DELEGATION
  document.addEventListener('click', async (e) => {
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
    } catch (err) { console.error(err); }
  }

  // --- 2. LOGIC DASHBOARD MEDALS ---
  async function loadMedals(year) {
    try {
      const { data: results } = await supabase.from('event_results').select('rank, user_id, category, events(title, event_date)').lte('rank', 3);
      allMedalsData = (results || []).filter(r => r.events && r.events.event_date.startsWith(year));
      
      let emas = 0, perak = 0, perunggu = 0;
      allMedalsData.forEach(r => { if(r.rank===1)emas++; else if(r.rank===2)perak++; else if(r.rank===3)perunggu++; });
      document.getElementById('count-emas').innerText = emas;
      document.getElementById('count-perak').innerText = perak;
      document.getElementById('count-perunggu').innerText = perunggu;

      renderMedalistTable();
    } catch (err) {}
  }

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

  window.openEditClass = function(id, name, currentClass) {
    document.getElementById('edit-atlet-id').value = id;
    document.getElementById('edit-atlet-name').innerText = name;
    if(currentClass && currentClass !== 'Belum Set') document.getElementById('select-new-class').value = currentClass;
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
      if(index !== -1) masterAthletesList[index].group_level = newClass;
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

  window.saveAbsen = async function(profileId, checkboxElem) {
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
      if(window.showToast) window.showToast('Gagal update absen', 'error');
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

  window.openEditCoach = function(id, name, currentClass) {
    document.getElementById('edit-coach-id').value = id;
    document.getElementById('edit-coach-name').innerText = name;
    if(currentClass && currentClass !== 'Belum Di-assign') document.getElementById('select-coach-class').value = currentClass;
    
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
        if(index !== -1) masterCoachesList[index].group_level = newClass;
        
        renderManageCoaches();
        document.getElementById('btn-close-modal-coach').click();
        if(window.showToast) window.showToast('Tugas kelas pelatih diperbarui!', 'success');
      } catch (err) { 
        alert("Gagal update data pelatih"); 
      } finally { 
        btnSaveCoach.innerText = '💾 SIMPAN TUGAS KELAS'; btnSaveCoach.disabled = false; 
      }
    });
  }

  await fetchMasterData();
});