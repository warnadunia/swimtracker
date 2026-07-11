// src/parent_detail.js
// ENGINE DETAIL ANAK UNTUK PARENTS (V2 + MODAL MULTI-ROW + BIOMETRIK + MULTI-LAP STOPWATCH bray!)

import './style.css';
import Chart from 'chart.js/auto';
import dashboardHTML from '../dashboard.html?raw';
import progressHTML from '../progress.html?raw';

document.addEventListener('DOMContentLoaded', async () => {
  const sessionUser = localStorage.getItem('swim_user');
  if (!sessionUser) return window.location.replace('/index.html');
  const parentProfile = JSON.parse(sessionUser);

  const urlParams = new URLSearchParams(window.location.search);
  const athleteId = urlParams.get('id');
  const athleteName = urlParams.get('name') || 'Atlet';

// 🚨 HEADER: ICON GEAR KE APP.HTML & THEME TOGGLE
  document.getElementById('detail-atlet-name').innerHTML = `
    <div class="flex items-center gap-2">
      ${athleteName} 
      <a href="/app.html" class="p-1 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200" title="Edit Profile">⚙️</a>
      <button id="btn-theme-parent" class="p-1 text-xs bg-gray-100 dark:bg-zinc-800 rounded-full">🌓</button>
    </div>
  `;

  document.getElementById('btn-theme-parent').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });

  // 1. INJEKSI KONTEN TAB UTAMA
  document.getElementById('main-container').innerHTML = `
    <div id="wrapper-dashboard">${dashboardHTML}</div>
    <div id="wrapper-progress" class="hidden relative">
      ${progressHTML}
    </div>
  `;

  // Attach dynamic biodata href
  const btnEditProfile = document.getElementById('btn-edit-profile');
  if (btnEditProfile) {
    btnEditProfile.href = `/biodata.html?id=${athleteId}&name=${encodeURIComponent(athleteName)}`;
  }

  // 2. INJEKSI MODAL (KEJUARAAN MULTI-ROW, BIOMETRIK, & MULTI-LAP STOPWATCH)
  document.getElementById('modal-container').innerHTML = `
    <!-- MODAL KEJUARAAN MULTI-ROW -->
    <div id="modal-input" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div id="modal-inner" class="bg-white dark:bg-[#18131f] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border dark:border-gray-800 flex flex-col max-h-[90vh] transition-all transform scale-95 opacity-0 duration-300">
        <div class="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#1f1927]">
          <h3 class="font-bold text-sm tracking-wide text-gray-800 dark:text-white uppercase">INPUT PRESTASI LOMBA</h3>
          <button onclick="window.closeModal('modal-input', 'modal-inner')" class="text-gray-400 hover:text-brand-red font-bold p-1">✖</button>
        </div>
        
        <div class="p-4 overflow-y-auto space-y-4 flex-1">
          <div class="bg-gray-50 dark:bg-[#221c29] p-3 rounded-xl border dark:border-gray-800 space-y-3">
            <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b dark:border-gray-700 pb-1">Informasi Umum</h4>
            <div>
              <label class="text-[10px] font-bold text-gray-400 block mb-1">Nama Event</label>
              <input type="text" id="input-event-name" class="w-full px-3 py-2 bg-white dark:bg-[#140e16] border dark:border-gray-700 rounded-lg text-xs" placeholder="Contoh: KRAPSI 2026">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] font-bold text-gray-400 block mb-1">Tingkat Kejuaraan</label>
                <input type="text" id="input-event-level" class="w-full px-3 py-2 bg-white dark:bg-[#140e16] border dark:border-gray-700 rounded-lg text-xs" placeholder="Cth: Nasional">
              </div>
              <div>
                <label class="text-[10px] font-bold text-gray-400 block mb-1">Tgl Event</label>
                <input type="date" id="input-tanggal-event" class="w-full px-3 py-2 bg-white dark:bg-[#140e16] border dark:border-gray-700 rounded-lg text-xs">
              </div>
            </div>
            <div>
              <label class="text-[10px] font-bold text-brand-red block mb-1">Ukuran Kolam (Meter)</label>
              <select id="input-event-pool" class="w-full px-3 py-2 bg-white dark:bg-[#140e16] border border-red-900/30 text-brand-red rounded-lg text-xs font-bold">
                <option value="50">Kolam 50 M (Long Course)</option>
                <option value="25">Kolam 25 M (Short Course)</option>
              </select>
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-[#221c29] p-3 rounded-xl border dark:border-gray-800">
            <div class="flex justify-between items-center border-b dark:border-gray-700 pb-2 mb-2">
              <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tabel Nomor Kejuaraan</h4>
              <button id="btn-add-nomor" class="bg-brand-red text-white text-[9px] font-bold px-2 py-1 rounded-md active:scale-95 transition-all">+ Tambah Nomor</button>
            </div>
            <div id="container-nomor-lomba" class="space-y-3"></div>
          </div>
        </div>

        <div class="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-[#1f1927]">
          <button id="btn-save-event" class="w-full bg-brand-red text-white py-3 rounded-xl text-xs font-bold shadow-md shadow-brand-red/30 active:scale-95 transition-all">
            💾 Simpan Semua Data
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL INPUT BIOMETRIK -->
    <div id="modal-biometrik" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div id="modal-bio-inner" class="bg-white dark:bg-[#18131f] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border dark:border-gray-800 transition-all transform scale-95 opacity-0 duration-300">
        <div class="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-blue-50/50 dark:bg-blue-900/10">
          <h3 class="font-bold text-sm tracking-wide text-blue-600 dark:text-blue-400 uppercase">Input Biometrik Fisik</h3>
          <button onclick="window.closeModal('modal-biometrik', 'modal-bio-inner')" class="text-gray-400 hover:text-brand-red font-bold p-1">✖</button>
        </div>
        <div class="p-4 space-y-3">
          <div>
            <label class="text-[10px] font-bold text-gray-400 block mb-1">Tanggal Rekam Data</label>
            <input type="date" id="bio-date" class="w-full px-3 py-2 bg-gray-50 dark:bg-[#140e16] border dark:border-gray-700 rounded-lg text-xs" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-bold text-gray-400 block mb-1">Tinggi Badan (cm)</label>
              <input type="number" step="0.1" id="bio-height" class="w-full px-3 py-2 bg-gray-50 dark:bg-[#140e16] border dark:border-gray-700 rounded-lg text-xs" placeholder="Cth: 145.5">
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-400 block mb-1">Berat Badan (kg)</label>
              <input type="number" step="0.1" id="bio-weight" class="w-full px-3 py-2 bg-gray-50 dark:bg-[#140e16] border dark:border-gray-700 rounded-lg text-xs" placeholder="Cth: 35.2">
            </div>
          </div>
          <div>
            <label class="text-[10px] font-bold text-gray-400 block mb-1">Rentang Lengan (cm)</label>
            <input type="number" step="0.1" id="bio-arm" class="w-full px-3 py-2 bg-gray-50 dark:bg-[#140e16] border dark:border-gray-700 rounded-lg text-xs" placeholder="Cth: 146.0">
          </div>
        </div>
        <div class="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-[#1f1927]">
          <button onclick="window.submitBiometrik()" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 active:scale-95 transition-all">
            💾 Simpan Data Fisik
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL MULTI-LAP STOPWATCH KHUSUS LOMBA BRAY! -->
    <div id="modal-stopwatch" class="hidden fixed inset-0 bg-black/95 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div id="modal-stopwatch-inner" class="bg-[#140e16] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-800 flex flex-col transition-all transform scale-95 opacity-0 duration-300 h-[80vh]">
        <div class="p-4 flex justify-between items-center border-b border-gray-800">
          <div>
            <h3 class="text-xs font-bold text-brand-red tracking-wider uppercase">Live Lomba</h3>
            <p id="sw-meta-info" class="text-[10px] text-gray-400 mt-0.5">50M Kolam 50M (1 Lap)</p>
          </div>
          <button onclick="window.closeStopwatch()" class="text-xs font-bold text-gray-500 border border-gray-800 px-3 py-1.5 rounded-lg bg-[#1f1927] active:scale-95">BATAL</button>
        </div>

        <div class="p-6 flex flex-col items-center justify-center bg-black">
          <div id="sw-display" class="text-5xl font-mono font-bold tracking-wider mb-6 text-white tabular-nums">00:00.00</div>
          <div class="flex items-center gap-4 justify-center w-full">
            <button onclick="window.resetStopwatch()" class="w-14 h-14 shrink-0 rounded-full border-2 border-gray-800 text-gray-400 font-bold bg-[#1f1927] flex items-center justify-center active:scale-95 text-[10px]">RESET</button>
            <button id="sw-btn-main" onclick="window.mainStopwatchAction()" class="flex-1 h-14 rounded-2xl bg-brand-red text-white font-bold text-lg shadow-[0_0_20px_rgba(255,77,77,0.3)] active:scale-95 transition-all select-none uppercase">START</button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-4 bg-[#140e16] border-t border-gray-800 pt-3 relative">
          <h4 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 sticky top-0 bg-[#140e16]/90 backdrop-blur py-1 z-10">Record Laps</h4>
          <div id="sw-lap-list" class="space-y-1.5 pb-4"></div>
        </div>

        <div class="p-4 bg-[#1a1620] border-t border-gray-800 shrink-0">
          <button id="sw-btn-save" onclick="window.saveStopwatch()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors text-xs uppercase tracking-wider opacity-50 pointer-events-none active:scale-95">
            💾 Simpan Hasil Ke Tabel
          </button>
        </div>
      </div>
    </div>
  `;

  // ==========================================
  // LOGIKA TAB SWITCHER & MODAL UMUM
  // ==========================================
  window.switchTab = function(tabId) {
    document.getElementById('wrapper-dashboard').classList.add('hidden');
    document.getElementById('wrapper-progress').classList.add('hidden');
    if (tabId === 'tab-history') document.getElementById('wrapper-dashboard').classList.remove('hidden');
    if (tabId === 'tab-grafik') document.getElementById('wrapper-progress').classList.remove('hidden');
    const btns = document.querySelectorAll('.nav-tab-btn');
    btns.forEach(btn => { btn.classList.remove('text-brand-red'); btn.classList.add('text-gray-400'); });
    const activeBtn = document.querySelector(`[onclick="window.switchTab('${tabId}')"]`);
    if (activeBtn) { activeBtn.classList.remove('text-gray-400'); activeBtn.classList.add('text-brand-red'); }
  };

  window.openModal = (bgId, innerId) => {
    document.getElementById(bgId).classList.remove('hidden');
    setTimeout(() => { document.getElementById(innerId).classList.remove('scale-95', 'opacity-0'); }, 10);
  };
  window.closeModal = (bgId, innerId) => {
    document.getElementById(innerId).classList.add('scale-95', 'opacity-0');
    setTimeout(() => { document.getElementById(bgId).classList.add('hidden'); }, 300);
  };

  // ==========================================
  // FETCH DATA DASHBOARD & GRAFIK
  // ==========================================
  window.masterCategories = [];
  window.globalResultsData = [];
  window.globalEventsData = [];

  async function loadData() {
    try {
      const catRes = await fetch('/api/athletes?action=categories');
      const catData = await catRes.json();
      if (catData.success) window.masterCategories = catData.data;

      const response = await fetch(`/api/athletes?action=dashboard_data&user_id=${athleteId}`);
      const result = await response.json();

      if (result.success) {
        window.globalResultsData = result.results || [];
        
        const groupedEvents = {};
        window.globalResultsData.forEach(res => {
          const eventKey = res.title + '_' + res.event_date;
          if (!groupedEvents[eventKey]) {
            groupedEvents[eventKey] = {
              event_id: res.event_id,
              title: res.title,
              level: res.level,
              event_date: res.event_date,
              event_results: []
            };
          }
          let laps = [];
          if (res.split_times_json) {
            try { laps = JSON.parse(res.split_times_json); } catch(e) {}
          }
          groupedEvents[eventKey].event_results.push({
            result_id: res.result_id,
            style_id: res.style_id,
            distance_meters: res.distance_meters,
            pool_size: res.pool_size,
            category: res.category,
            time_record: res.time_record,
            rank: res.rank,
            laps: laps
          });
        });
        window.globalEventsData = Object.values(groupedEvents).sort((a,b) => new Date(b.event_date) - new Date(a.event_date));
        
        let emas = 0, perak = 0, perunggu = 0;
        window.globalResultsData.forEach(res => {
          if (res.rank === 1) emas++; else if (res.rank === 2) perak++; else if (res.rank === 3) perunggu++;
        });
        if (document.getElementById('count-emas')) {
          document.getElementById('count-emas').innerText = emas; document.getElementById('count-perak').innerText = perak; document.getElementById('count-perunggu').innerText = perunggu;
        }

        if (document.getElementById('dash-fullname')) {
          document.getElementById('dash-fullname').innerText = result.full_name || athleteName;
        }
        if (document.getElementById('dashboard-ku-text')) {
          let ku = '-';
          if (result.birth_year) {
            const age = new Date().getFullYear() - result.birth_year;
            if (age >= 19) ku = 'Senior';
            else if (age >= 16) ku = 'KU 1';
            else if (age >= 14) ku = 'KU 2';
            else if (age >= 12) ku = 'KU 3';
            else if (age >= 10) ku = 'KU 4';
            else ku = 'KU 5';
          }
          document.getElementById('dashboard-ku-text').innerText = ku;
        }
        
        // Setup Biometric Data
        if (result.biometric) {
          if (document.getElementById('bio-display-height')) document.getElementById('bio-display-height').innerText = result.biometric.height_cm || '--';
          if (document.getElementById('bio-display-weight')) document.getElementById('bio-display-weight').innerText = result.biometric.weight_kg || '--';
          if (document.getElementById('bio-display-arm')) document.getElementById('bio-display-arm').innerText = result.biometric.arm_span_cm || '--';
        }

        initRadarChart(window.globalResultsData);
        renderHistoryList();
        initTabGrafik('Bebas');
      }
    } catch (err) { console.error(err); }
  }

  function initRadarChart(results) {
    const ctx = document.getElementById('profileRadarChart');
    if (!ctx) return;
    
    const gayaScores = { 'Bebas': 0, 'Kupu': 0, 'Punggung': 0, 'Dada': 0, 'Ganti': 0 };
    const gayaCounts = { 'Bebas': 0, 'Kupu': 0, 'Punggung': 0, 'Dada': 0, 'Ganti': 0 };
    
    results.forEach(res => {
       const cat = res.category.toLowerCase();
       for (const key of Object.keys(gayaScores)) {
          if (cat.includes(key.toLowerCase())) {
             const rankScore = res.rank && res.rank <= 10 ? (11 - res.rank) * 10 : 20; 
             gayaScores[key] += rankScore;
             gayaCounts[key]++;
          }
       }
    });
    
    const dataPoints = Object.keys(gayaScores).map(key => gayaCounts[key] > 0 ? Math.min(100, Math.round(gayaScores[key] / gayaCounts[key]) + 30) : 30);
    
    if (window.myRadarChart) window.myRadarChart.destroy();
    window.myRadarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Bebas', 'Kupu', 'Punggung', 'Dada', 'Ganti'],
        datasets: [{
          label: 'Skill Level',
          data: dataPoints,
          backgroundColor: 'rgba(255, 77, 77, 0.2)',
          borderColor: 'rgba(255, 77, 77, 1)',
          pointBackgroundColor: 'rgba(255, 77, 77, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(255, 77, 77, 1)',
          borderWidth: 1.5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(156, 163, 175, 0.2)' },
            grid: { color: 'rgba(156, 163, 175, 0.2)' },
            pointLabels: { color: 'rgba(156, 163, 175, 0.8)', font: { size: 8, weight: 'bold' } },
            ticks: { display: false, min: 0, max: 100 }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function renderHistoryList() {
    const container = document.getElementById('container-history-list');
    if (!container) return;
    if (window.globalEventsData.length === 0) return container.innerHTML = `<div class="text-center py-8 text-xs text-gray-500">Belum ada rekor kejuaraan.</div>`;

    let htmlString = '';
    window.globalEventsData.forEach(ev => {
      const dateStr = new Date(ev.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      let resultsHtml = (ev.event_results || []).map(res => {
        const laps = res.laps || [];
        const hasLaps = laps.length > 0;
        const arrowClass = hasLaps ? 'text-gray-400 cursor-pointer hover:text-brand-red' : 'text-gray-200 pointer-events-none opacity-30';
        const arrowIcon = `<svg class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
        
        let lapsHtml = '';
        if (hasLaps) {
          lapsHtml = `<div class="hidden mt-2 pt-2 border-t dark:border-gray-700 space-y-1">` + 
            laps.map((lap, idx) => `<div class="flex justify-between items-center text-[10px] text-gray-500 px-1"><span class="uppercase tracking-widest font-bold">Set ${idx + 1}</span><span class="font-mono">${lap}</span></div>`).join('') + 
          `</div>`;
        }

        return `
        <div class="bg-gray-50 dark:bg-[#251f2e] border dark:border-gray-700 rounded-lg p-2 mb-2 transition-all">
          <div class="flex justify-between items-center ${hasLaps ? 'cursor-pointer' : ''}" onclick="if(${hasLaps}) { const el = this.nextElementSibling; el.classList.toggle('hidden'); const svg = this.querySelector('svg'); svg.classList.toggle('rotate-180'); }">
            <div class="flex items-center gap-2">
              <span class="${arrowClass}">${arrowIcon}</span>
              <span class="text-gray-600 dark:text-gray-300 font-bold text-[10px] uppercase tracking-wider">${res.category}</span>
            </div>
            <div class="text-right flex flex-col items-end">
              <span class="text-brand-red font-mono font-bold text-xs">${res.time_record}</span>
              <span class="text-yellow-600 font-bold text-[9px] bg-yellow-500/10 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap">Rank ${res.rank || '-'}</span>
            </div>
          </div>
          ${lapsHtml}
        </div>
      `;
      }).join('');

      htmlString += `
      <div class="bg-white dark:bg-[#1f1927] rounded-xl border dark:border-gray-800 shadow-sm mb-3 overflow-hidden">
        <div class="p-4 flex justify-between items-center bg-gray-50/50 dark:bg-[#221c29]/50 hover:bg-gray-50 dark:hover:bg-[#251f2e] transition-colors border-b dark:border-gray-800">
          <div class="cursor-pointer flex-1" onclick="const body = this.parentElement.nextElementSibling; body.classList.toggle('hidden'); const svg = this.parentElement.querySelector('.chevron-icon'); svg.classList.toggle('rotate-180');">
            <h4 class="font-bold text-sm text-gray-800 dark:text-white uppercase tracking-wide">${ev.title}</h4>
            <p class="text-[10px] text-gray-500 mt-0.5">${ev.level} • ${dateStr}</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="window.editEvent('${ev.event_id}')" class="text-blue-500 hover:text-blue-600 bg-blue-500/10 p-1.5 rounded-lg transition-colors" title="Edit Data Lomba">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
            <svg class="chevron-icon w-5 h-5 text-gray-400 transition-transform duration-200 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
        <div class="p-3 hidden bg-white dark:bg-[#1f1927]">
          ${resultsHtml || '<div class="text-center py-4 text-[10px] text-gray-400">Belum ada data nomor lomba</div>'}
        </div>
      </div>`;
    });
    container.innerHTML = htmlString;
  }

  // --- ENGINE GRAFIK ---
  const pillsGaya = document.querySelectorAll('.pill-gaya');
  pillsGaya.forEach(pill => {
    pill.addEventListener('click', (e) => {
      pillsGaya.forEach(p => { p.classList.remove('bg-brand-red', 'text-white', 'shadow-md'); p.classList.add('bg-gray-100', 'dark:bg-[#1f1a24]', 'text-gray-500'); });
      e.currentTarget.classList.remove('bg-gray-100', 'text-gray-500'); e.currentTarget.classList.add('bg-brand-red', 'text-white', 'shadow-md');
      initTabGrafik(e.currentTarget.getAttribute('data-style'));
    });
  });

  // 🚨 FIX PROGRESS BLANK JADI ADA KETERANGAN KOSONG
  function initTabGrafik(styleName) {
    const ctx = document.getElementById('prestasiChart');
    const tbody = document.getElementById('table-grafik-body');
    if (window.myProgressChart) window.myProgressChart.destroy();

    const styleRecords = window.globalResultsData.filter(r => r.category.toLowerCase().includes(styleName.toLowerCase()));

    // JIKA DATA KOSONG, TAMPILKAN KETERANGAN!
    if (styleRecords.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-10 text-center text-xs text-gray-500 font-bold bg-gray-50 dark:bg-[#140e16]">Belum ada rekam jejak ${styleName}. Ayo mulai bertanding bray!</td></tr>`;
      return;
    }

    const getMonthlyBest = (dist) => {
      const monthly = new Array(12).fill(null);
      styleRecords.forEach(r => {
        if (r.category.startsWith(dist) && new Date(r.event_date).getFullYear() === new Date().getFullYear()) {
          const m = new Date(r.event_date).getMonth();
          const p = r.time_record.split(/[:.]/);
          const secs = p.length===4 ? (parseInt(p[0])*3600)+(parseInt(p[1])*60)+parseInt(p[2])+(parseInt(p[3])/100) : 0;
          if (monthly[m] === null || secs < monthly[m]) monthly[m] = secs;
        }
      });
      return monthly;
    };

    const colors = { '25 M': '#d946ef', '50 M': '#22c55e', '100 M': '#eab308', '200 M': '#06b6d4' };
    const datasets = ['25 M', '50 M', '100 M', '200 M'].map(dist => ({ label: dist, data: getMonthlyBest(dist), borderColor: colors[dist], borderWidth: 2, tension: 0.3, spanGaps: true }));

    if(ctx) window.myProgressChart = new Chart(ctx, { type: 'line', data: { labels: ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'], datasets }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });

    if (tbody) {
      tbody.innerHTML = styleRecords.sort((a, b) => new Date(b.event_date) - new Date(a.event_date)).map(item => `
        <tr class="hover:bg-gray-50 dark:hover:bg-[#221c29] text-xs border-b dark:border-gray-800">
          <td class="px-4 py-3 font-bold">${item.category.replace(' Gaya ', ' ')}</td>
          <td class="px-4 py-3 text-center"><span class="font-mono font-bold text-brand-red bg-brand-red/10 px-2 py-1 rounded">${item.time_record}</span></td>
          <td class="px-4 py-3 text-center"><span class="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded">Verified</span></td>
          <td class="px-4 py-3 text-gray-400 text-[10px] truncate max-w-[100px]">${item.title}</td>
        </tr>`).join('');
    }
  }


  // ==========================================
  // ENGINE LOGIC MULTI-LAP STOPWATCH LIVE PARENTS
  // ==========================================
  let swInterval=null, swStartTime=0, swElapsedTime=0, swIsRunning=false;
  let swActiveRowId = null; // ID container row di form utama
  let swTotalLaps = 1;
  let swCurrentLap = 1;
  let swRecordedLaps = [];

  function formatTime(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSecs / 60)).padStart(2,'0');
    const s = String(totalSecs % 60).padStart(2,'0');
    const c = String(Math.floor((ms % 1000) / 10)).padStart(2,'0');
    return `${m}:${s}.${c}`;
  }

  function updateSwDisplay() {
    swElapsedTime = performance.now() - swStartTime;
    document.getElementById('sw-display').innerText = formatTime(swElapsedTime);
  }
  
  window.openStopwatch = function(btnElement) {
    const rowDiv = btnElement.closest('.row-lomba');
    swActiveRowId = rowDiv.id;

    // Kalkulasi target lap/set berdasarkan jarak & ukuran kolam
    const distance = parseInt(rowDiv.querySelector('.input-distance').value) || 50;
    const poolSize = parseInt(document.getElementById('input-event-pool').value) || 50;
    swTotalLaps = Math.ceil(distance / poolSize);
    swCurrentLap = 1;
    swRecordedLaps = [];

    document.getElementById('sw-meta-info').innerText = `${distance}M di Kolam ${poolSize}M (${swTotalLaps} Lap)`;
    document.getElementById('sw-display').innerText = "00:00.00";
    document.getElementById('sw-lap-list').innerHTML = "";
    document.getElementById('sw-btn-main').innerText = swTotalLaps > 1 ? `LAP (${swCurrentLap}/${swTotalLaps})` : "START";
    document.getElementById('sw-btn-main').classList.remove('pointer-events-none', 'opacity-50');
    document.getElementById('sw-btn-save').classList.add('opacity-50', 'pointer-events-none');

    window.openModal('modal-stopwatch', 'modal-stopwatch-inner');
  };
  
  window.closeStopwatch = function() {
    if (swIsRunning) window.resetStopwatch(); 
    window.closeModal('modal-stopwatch', 'modal-stopwatch-inner');
  };

  // GANTI TOTAL FUNGSI INI DI src/parent_detail.js LU BRAY!
  
  window.mainStopwatchAction = function() {
    if (!swIsRunning && swCurrentLap === 1 && swRecordedLaps.length === 0) {
      // START PERTAMA KALI
      swIsRunning = true; 
      swStartTime = performance.now(); 
      swInterval = requestAnimationFrame(function run() { 
        if (!swIsRunning) return; 
        updateSwDisplay(); 
        swInterval = requestAnimationFrame(run); // <-- FIX DI SINI BRAY (Ganti timerInterval jadi swInterval)
      });
      
      const btnMain = document.getElementById('sw-btn-main');
      btnMain.innerText = swTotalLaps > 1 ? `LAP (${swCurrentLap}/${swTotalLaps})` : "FINISH";
    } else if (swIsRunning) {
      // CATAT LAP / FINISH
      const currentStampStr = formatTime(swElapsedTime);
      swRecordedLaps.push(currentStampStr);

      const logRow = document.createElement('div');
      logRow.className = 'flex justify-between items-center bg-[#1f1927] p-3 rounded-xl border border-gray-800 text-xs';
      logRow.innerHTML = `<span class="font-bold text-gray-500">Lap ${swCurrentLap}</span><span class="font-mono font-bold text-white">${currentStampStr}</span>`;
      document.getElementById('sw-lap-list').prepend(logRow);

      swCurrentLap++;
      const btnMain = document.getElementById('sw-btn-main');

      if (swCurrentLap > swTotalLaps) {
        // SEMUA LAP SELESAI
        swIsRunning = false; 
        cancelAnimationFrame(swInterval);
        btnMain.innerText = "LOMBA SELESAI"; 
        btnMain.classList.add('opacity-50', 'pointer-events-none');
        document.getElementById('sw-btn-save').classList.remove('opacity-50', 'pointer-events-none');
      } else {
        btnMain.innerText = swCurrentLap === swTotalLaps ? "FINISH" : `LAP (${swCurrentLap}/${swTotalLaps})`;
      }
    }
  };
  
  window.resetStopwatch = function() {
    swIsRunning = false; 
    cancelAnimationFrame(swInterval); 
    swElapsedTime = 0; 
    swCurrentLap = 1;
    swRecordedLaps = [];
    document.getElementById('sw-display').innerText = "00:00.00"; 
    document.getElementById('sw-lap-list').innerHTML = "";
    
    const btnMain = document.getElementById('sw-btn-main');
    btnMain.innerText = swTotalLaps > 1 ? `LAP (1/${swTotalLaps})` : "START"; 
    btnMain.classList.remove('pointer-events-none', 'opacity-50');
    document.getElementById('sw-btn-save').classList.add('opacity-50', 'pointer-events-none');
  };
  
  window.saveStopwatch = function() {
    if (swActiveRowId) {
      const activeRow = document.getElementById(swActiveRowId);
      const inputTime = activeRow.querySelector('.input-time');
      const containerLaps = activeRow.querySelector('.laps-container');

      // Masukkan waktu akhir ke input utama (bisa diedit ortu ntar bray)
      inputTime.value = swRecordedLaps[swRecordedLaps.length - 1];

      // Tampilkan rekap laps di bawah baris input
      if (swRecordedLaps.length > 1) {
        containerLaps.innerHTML = swRecordedLaps.map((lap, idx) => `
          <div class="flex justify-between items-center text-[9px] py-1 border-b border-gray-100 dark:border-gray-800 last:border-0 pl-2 pr-1">
            <span class="text-gray-400 font-bold uppercase">Lap ${idx + 1} ${idx === swRecordedLaps.length - 1 ? '(Finish)' : ''}</span>
            <span class="font-mono text-gray-500">${lap}</span>
          </div>
        `).join('');
        containerLaps.classList.remove('hidden');
      }
    }
    window.closeStopwatch(); 
  };


  // ==========================================
  // EVENT LISTENER KHUSUS FAB & ADD ROW
  // ==========================================
  let rowCounter = 0;
  let isEditMode = false;
  let currentEditEventId = null;

  document.getElementById('btn-open-modal')?.addEventListener('click', () => {
    isEditMode = false;
    currentEditEventId = null;
    document.getElementById('input-event-name').value = '';
    document.getElementById('input-event-level').value = 'Lokal';
    document.getElementById('input-tanggal-event').value = '';
    document.getElementById('container-nomor-lomba').innerHTML = '';
    document.getElementById('btn-add-nomor').click(); 
    document.getElementById('btn-save-event').innerText = "Simpan Semua Data";
    window.openModal('modal-input', 'modal-inner');
  });

  window.editEvent = (eventId) => {
    const ev = window.globalEventsData.find(e => e.event_id === eventId);
    if (!ev) return;
    
    isEditMode = true;
    currentEditEventId = eventId;
    
    document.getElementById('input-event-name').value = ev.title;
    document.getElementById('input-event-level').value = ev.level || 'Lokal';
    document.getElementById('input-tanggal-event').value = ev.event_date ? ev.event_date.split('T')[0] : '';
    // Pool size could be inferred from the first result or set default
    const poolSize = ev.event_results && ev.event_results.length > 0 ? ev.event_results[0].pool_size : '50';
    document.getElementById('input-event-pool').value = poolSize;
    
    document.getElementById('container-nomor-lomba').innerHTML = '';
    
    if (ev.event_results && ev.event_results.length > 0) {
      ev.event_results.forEach(res => {
        rowCounter++;
        const hasLaps = res.laps && res.laps.length > 0;
        const newRow = document.createElement('div');
        newRow.id = `row-lomba-${rowCounter}`;
        newRow.className = 'row-lomba bg-white dark:bg-[#140e16] rounded-xl border dark:border-gray-700 overflow-hidden';
        newRow.dataset.resultId = res.result_id;
        if (hasLaps) newRow.dataset.hasLaps = "true";

        newRow.innerHTML = `
          <div class="grid grid-cols-12 gap-1 items-center p-1 relative">
            ${hasLaps ? '<div class="absolute inset-0 bg-gray-100/50 dark:bg-black/40 z-10 pointer-events-none" title="Data Laps/Sets Terkunci"></div>' : ''}
            <div class="col-span-4 ${hasLaps ? 'opacity-50' : ''}">
              <select class="input-style w-full px-1 py-2 bg-transparent text-[10px] font-semibold outline-none border-r dark:border-gray-700" ${hasLaps ? 'disabled' : ''} onchange="const m = this.options[this.selectedIndex].text.match(/^(\\d+)/); if(m){this.closest('.row-lomba').querySelector('.input-distance').value = m[1];}">
                <option value="" disabled>Kategori Lomba</option>
                ${window.masterCategories.map(cat => `<option value="${cat.id}" ${cat.id === res.style_id ? 'selected' : ''}>${cat.name}</option>`).join('')}
              </select>
            </div>
            <div class="col-span-2 ${hasLaps ? 'opacity-50' : ''}">
              <input type="number" class="input-distance w-full px-1 py-2 bg-transparent text-center text-[10px] font-bold text-brand-red outline-none border-r dark:border-gray-700 bg-gray-50/50 dark:bg-black/20" value="${res.distance_meters || ''}" placeholder="Jarak" readonly title="Otomatis sesuai kategori">
            </div>
            <div class="col-span-3 relative flex items-center z-20">
              <input type="text" class="input-time w-full pl-1 pr-6 py-2 bg-white dark:bg-[#1f1927] text-center text-[10px] font-mono outline-none border border-brand-red rounded shadow-sm" value="${res.time_record || ''}" placeholder="00:00.00">
              ${!hasLaps ? `<button type="button" onclick="window.openStopwatch(this)" class="absolute right-1 text-gray-500 hover:text-brand-red p-0.5" title="Buka Stopwatch">⏱️</button>` : ''}
            </div>
            <div class="col-span-2 z-20">
              <input type="number" class="input-rank w-full px-1 py-2 bg-white dark:bg-[#1f1927] text-center text-[10px] font-bold outline-none border border-gray-300 dark:border-gray-600 rounded" value="${res.rank || ''}" placeholder="Rank">
            </div>
            <div class="col-span-1 text-center z-20">
              ${!hasLaps ? `<button type="button" onclick="this.closest('.row-lomba').remove()" class="text-gray-300 hover:text-brand-red p-1">🗑️</button>` : `<span class="text-gray-400 p-1" title="Terkunci">🔒</span>`}
            </div>
          </div>
          <!-- Tempat menampung log Split Laps jika pakai stopwatch -->
          <div class="laps-container ${hasLaps ? '' : 'hidden'} bg-gray-50/50 dark:bg-[#1f1927]/50 px-2 py-1 border-t dark:border-gray-700/50">
            ${hasLaps ? res.laps.map((lap, idx) => `
              <div class="flex justify-between items-center text-[9px] py-1 border-b border-gray-100 dark:border-gray-800 last:border-0 pl-2 pr-1">
                <span class="text-gray-400 font-bold uppercase">Lap ${idx + 1} ${idx === res.laps.length - 1 ? '(Finish)' : ''}</span>
                <span class="font-mono text-gray-500">${lap}</span>
              </div>
            `).join('') : ''}
          </div>
        `;
        document.getElementById('container-nomor-lomba').appendChild(newRow);
      });
    } else {
      document.getElementById('btn-add-nomor').click();
    }
    
    document.getElementById('btn-save-event').innerText = "Update Data Kejuaraan";
    window.openModal('modal-input', 'modal-inner');
  };

  window.openBiometrikModal = () => window.openModal('modal-biometrik', 'modal-bio-inner');

  // Logic nambah row nomor lomba di modal Event (Dengan Tombol Stopwatch)
  document.getElementById('btn-add-nomor')?.addEventListener('click', () => {
    rowCounter++;
    const newRow = document.createElement('div');
    newRow.id = `row-lomba-${rowCounter}`;
    newRow.className = 'row-lomba bg-white dark:bg-[#140e16] rounded-xl border dark:border-gray-700 overflow-hidden';
    newRow.innerHTML = `
      <div class="grid grid-cols-12 gap-1 items-center p-1">
        <div class="col-span-4">
          <select class="input-style w-full px-1 py-2 bg-transparent text-[10px] font-semibold outline-none border-r dark:border-gray-700" onchange="const m = this.options[this.selectedIndex].text.match(/^(\\d+)/); if(m){this.closest('.row-lomba').querySelector('.input-distance').value = m[1];}">
            <option value="" disabled selected>Kategori Lomba</option>
            ${window.masterCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
          </select>
        </div>
        <div class="col-span-2">
          <input type="number" class="input-distance w-full px-1 py-2 bg-transparent text-center text-[10px] font-bold text-brand-red outline-none border-r dark:border-gray-700 bg-gray-50/50 dark:bg-black/20" placeholder="Jarak" readonly title="Otomatis sesuai kategori">
        </div>
        <div class="col-span-3 relative flex items-center">
          <input type="text" class="input-time w-full pl-1 pr-6 py-2 bg-transparent text-center text-[10px] font-mono outline-none border-r dark:border-gray-700" placeholder="00:00.00">
          <button type="button" onclick="window.openStopwatch(this)" class="absolute right-1 text-gray-500 hover:text-brand-red p-0.5" title="Buka Stopwatch">⏱️</button>
        </div>
        <div class="col-span-2">
          <input type="number" class="input-rank w-full px-1 py-2 bg-transparent text-center text-[10px] font-bold outline-none border-r dark:border-gray-700" placeholder="Rank">
        </div>
        <div class="col-span-1 text-center">
          <button type="button" onclick="this.closest('.row-lomba').remove()" class="text-gray-300 hover:text-brand-red p-1">🗑️</button>
        </div>
      </div>
      <!-- Tempat menampung log Split Laps jika pakai stopwatch -->
      <div class="laps-container hidden bg-gray-50/50 dark:bg-[#1f1927]/50 px-2 py-1 border-t dark:border-gray-700/50"></div>
    `;
    document.getElementById('container-nomor-lomba').appendChild(newRow);
  });

  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('input-time')) {
      let val = e.target.value.replace(/\D/g, ''); 
      if (val.length > 8) val = val.substring(0, 8); 
      let formatted = '';
      if (val.length > 0) formatted += val.substring(0, 2);
      if (val.length > 2) formatted += ':' + val.substring(2, 4);
      if (val.length > 4) formatted += ':' + val.substring(4, 6);
      if (val.length > 6) formatted += '.' + val.substring(6, 8);
      e.target.value = formatted;
    }
  });

  // ==========================================
  // EKSEKUSI API SUBMISSIONS
  // ==========================================
  document.getElementById('btn-save-event')?.addEventListener('click', async () => {
    const title = document.getElementById('input-event-name').value.trim();
    const level = document.getElementById('input-event-level').value.trim();
    const eventDate = document.getElementById('input-tanggal-event').value;
    const poolSize = document.getElementById('input-event-pool').value;

    if (!title || !eventDate) return alert('Nama Event dan Tanggal wajib diisi bray!');

    const results = [];
    document.querySelectorAll('.row-lomba').forEach(row => {
      // If style is disabled, we still need its value. 
      const styleSelect = row.querySelector('.input-style');
      const style_id = styleSelect.value || styleSelect.getAttribute('data-value'); // In case disabled prevents value, but usually .value works on disabled selects.
      const distStr = row.querySelector('.input-distance').value;
      const distance = distStr ? parseInt(distStr, 10) : 0;
      const time_record = row.querySelector('.input-time').value.trim();
      const rank = row.querySelector('.input-rank').value;
      const result_id = row.dataset.resultId;
      const hasLaps = row.dataset.hasLaps === "true";

      // Allow empty time_record if they just prefill it, but don't add to array if BOTH time and style are empty.
      if (style_id) {
        // We do not send splits back from this UI. The backend only uses splits on INSERT new row (where splits is empty array).
        results.push({ result_id, style_id, distance, time_record, rank });
      }
    });

    if (results.length === 0) return alert('Minimal isi 1 nomor lomba bray!');

    const btn = document.getElementById('btn-save-event');
    btn.innerText = "Mengirim..."; btn.disabled = true;

    try {
      const endpoint = isEditMode ? '/api/parents?action=update_kejuaraan' : '/api/parents?action=input_kejuaraan';
      const payload = {
        parent_id: parentProfile.id,
        athlete_id: athleteId,
        title, level, event_date: eventDate, pool_size: poolSize,
        results
      };
      
      if (isEditMode) payload.event_id = currentEditEventId;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const resResult = await response.json();
      if (resResult.success) {
        window.closeModal('modal-input', 'modal-inner');
        await loadData(); 
      } else { alert("Gagal: " + resResult.message); }
    } catch (err) { console.error(err); } finally {
      btn.innerText = isEditMode ? "Update Data Kejuaraan" : "Simpan Semua Data"; 
      btn.disabled = false;
    }
  });

  window.submitBiometrik = async () => {
    const recorded_at = document.getElementById('bio-date').value;
    const height_cm = document.getElementById('bio-height').value;
    const weight_kg = document.getElementById('bio-weight').value;
    const arm_span_cm = document.getElementById('bio-arm').value;

    if (!recorded_at) return alert('Tanggal rekam wajib diisi bray!');

    try {
      const response = await fetch('/api/parents?action=input_biometrik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: athleteId, height_cm, weight_kg, arm_span_cm, recorded_at })
      });
      
      const result = await response.json();
      if (result.success) {
        window.closeModal('modal-biometrik', 'modal-bio-inner');
        alert('Data fisik sukses disimpan!');
      } else { alert(result.message); }
    } catch (err) { console.error(err); }
  };

  await loadData();
});