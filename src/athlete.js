// src/athlete.js
// CORE LOGIC ATLET V3 - 3 UTAMA TAB: DASHBOARD, TRAINING, PROGRESS bray

import './style.css';
import 'preline';
import Chart from 'chart.js/auto';

import headerHTML from '../header.html?raw';
import dashboardHTML from '../dashboard.html?raw';
import progressHTML from '../progress.html?raw';
import trainingHTML from '../training.html?raw';
import navHTML from '../bottomnav.html?raw'; 

import { initProfileModal, initDashboardProfile } from './profile_modal.js';

window.rowCounter = 0;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. SATPAM PROTEKSI LOGIN ATLET & PARENTS
  const sessionUser = localStorage.getItem('swim_user');
  if (!sessionUser) return window.location.replace('/index.html');

  const user = JSON.parse(sessionUser);
  if (user.role !== 'atlet' && user.role !== 'admin' && user.role !== 'parents') {
    return window.location.replace('/index.html');
  }
  
  const isParent = user.role === 'parents';
  const urlParams = new URLSearchParams(window.location.search);
  const athleteId = isParent ? urlParams.get('id') : user.id;
  const athleteName = urlParams.get('name') || 'Atlet';
  
  if (isParent && !athleteId) {
    return window.location.replace('/parents_dashboard.html');
  }

  // 2. SUNTIK LAYOUT STRUKTUR TAB ATLET BARU BRAY
  try {
    document.getElementById('header-container').innerHTML = headerHTML;
    
    if (isParent) {
      const headerEl = document.getElementById('header-container').querySelector('header');
      if (headerEl) {
        headerEl.innerHTML = `
          <div class="flex items-center gap-3">
            <button onclick="window.location.href='/parents_dashboard.html'" class="p-2 bg-gray-100 dark:bg-[#251f2e] rounded-xl text-gray-500 hover:text-brand-red transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <div>
              <h1 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Parent View</h1>
              <p class="text-sm font-bold text-gray-800 dark:text-white leading-none">${user.full_name || 'Parent'}</p>
            </div>
          </div>
          <button id="btn-theme-parent" class="p-2 text-xl bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200">🌓</button>
        `;
        const themeBtn = document.getElementById('btn-theme-parent');
        if (themeBtn) themeBtn.addEventListener('click', () => {
          const isDark = document.documentElement.classList.toggle('dark');
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
      }
    }
    
    // Injeksi 3 Modul Utama Wadah Konten
    document.getElementById('main-container').innerHTML = `
      <div id="wrapper-dashboard" class="tab-content-atlet hidden">${dashboardHTML}</div>
      <div id="wrapper-training" class="tab-content-atlet hidden">${trainingHTML}</div>
      <div id="wrapper-progress" class="tab-content-atlet hidden">${progressHTML}</div>
    `;
    
    document.getElementById('nav-container').innerHTML = navHTML;
    
    // Sembunyikan atau Tampilkan tombol input kejuaraan sesuai role
    const addBtn = document.getElementById('container-btn-input-kejuaraan');
    if (addBtn) {
      if (!isParent) {
        addBtn.remove();
      } else {
        addBtn.classList.remove('hidden');
        document.getElementById('btn-input-kejuaraan').addEventListener('click', () => {
          window.isEditMode = false;
          window.currentEditEventId = null;
          document.getElementById('input-event-name').value = '';
          document.getElementById('input-event-level').value = 'Lokal';
          document.getElementById('input-tanggal-event').value = '';
          document.getElementById('container-nomor-lomba').innerHTML = '';
          if (window.tambahBarisLomba) window.tambahBarisLomba();
          document.getElementById('btn-save-event').innerText = "Simpan Semua Data";
          window.openModal('modal-input', 'modal-inner');
        });
      }
    }

  } catch (error) {
    console.error("Gagal memuat komponen HTML:", error);
  }

  if (window.HSStaticMethods) window.HSStaticMethods.autoInit();

  // 3. SWITCH TAB ENGINE KHUSUS 3 UTAMA MENU ATLET BRAY
  window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content-atlet').forEach(el => el.classList.add('hidden'));
    
    // Map internal id in HTML structure
    if (tabId === 'dashboard' || tabId === 'tab-history') {
      document.getElementById('wrapper-dashboard').classList.remove('hidden');
    } else if (tabId === 'training' || tabId === 'tab-training') {
      document.getElementById('wrapper-training').classList.remove('hidden');
    } else if (tabId === 'progress' || tabId === 'tab-grafik') {
      document.getElementById('wrapper-progress').classList.remove('hidden');
    }

    const btns = document.querySelectorAll('.nav-tab-btn');
    btns.forEach(btn => {
      btn.classList.remove('text-brand-red');
      btn.classList.add('text-gray-400');
    });

    const activeBtn = document.querySelector(`[onclick="window.switchTab('${tabId}')"]`) || document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if (activeBtn) {
      activeBtn.classList.remove('text-gray-400');
      activeBtn.classList.add('text-brand-red');
    }
  };

  window.switchTrainingTab = function(subId) {
    document.getElementById('training-tt-view').classList.add('hidden');
    document.getElementById('training-hw-view').classList.add('hidden');
    
    document.getElementById('btn-tt').classList.remove('bg-white', 'dark:bg-gray-700', 'shadow', 'text-brand-red');
    document.getElementById('btn-tt').classList.add('text-gray-500', 'dark:text-gray-400');
    
    document.getElementById('btn-hw').classList.remove('bg-white', 'dark:bg-gray-700', 'shadow', 'text-brand-red');
    document.getElementById('btn-hw').classList.add('text-gray-500', 'dark:text-gray-400');

    if (subId === 'tt') {
      document.getElementById('training-tt-view').classList.remove('hidden');
      document.getElementById('btn-tt').classList.add('bg-white', 'dark:bg-gray-700', 'shadow', 'text-brand-red');
      document.getElementById('btn-tt').classList.remove('text-gray-500', 'dark:text-gray-400');
    } else {
      document.getElementById('training-hw-view').classList.remove('hidden');
      document.getElementById('btn-hw').classList.add('bg-white', 'dark:bg-gray-700', 'shadow', 'text-brand-red');
      document.getElementById('btn-hw').classList.remove('text-gray-500', 'dark:text-gray-400');
    }
  };

  // Set default Tab (Dashboard)
  window.switchTab('tab-history'); 

  // 4. LOAD & TAMPILKAN ALL DATA MURNI DARI TiDB
  window.globalResultsData = [];
  window.globalEventsData = [];

  async function loadAthleteData() {
    try {
      const response = await fetch(`/api/athletes?action=dashboard_data&user_id=${athleteId}`);
      const result = await response.json();

      if (result.success) {
        window.globalResultsData = result.results || [];
        
        // Map results ke globalEventsData (mengelompokkan berdasarkan event_id)
        const eventsMap = {};
        (result.results || []).forEach(res => {
          if (!eventsMap[res.event_id]) {
            eventsMap[res.event_id] = {
              event_id: res.event_id,
              title: res.title,
              level: res.level,
              event_date: res.event_date,
              event_results: []
            };
          }
          // Parse split_times_json string back to array if necessary
          if (typeof res.split_times_json === 'string') {
            try { res.laps = JSON.parse(res.split_times_json); } catch(e) { res.laps = []; }
          } else {
            res.laps = res.split_times_json || [];
          }
          eventsMap[res.event_id].event_results.push(res);
        });
        window.globalEventsData = Object.values(eventsMap).sort((a,b) => new Date(b.event_date) - new Date(a.event_date));

        // Jika Parent, override profile card dashboard
        if (isParent) {
          const dashName = document.getElementById('dash-fullname');
          const dashGreeting = document.getElementById('dash-greeting');
          const dashAvatar = document.getElementById('dash-avatar');
          const btnEdit = document.getElementById('btn-edit-profile');
          const dashKuEl = document.getElementById('dashboard-ku-text');
          
          if (dashName) dashName.innerText = athleteName;
          if (dashGreeting) dashGreeting.innerText = "Halo Atlet Terbaik,";
          if (dashAvatar) dashAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(athleteName)}&background=ff4d4d&color=fff&bold=true`;
          if (btnEdit) btnEdit.style.display = 'none';
          if (dashKuEl) {
            dashKuEl.innerText = "ATLET";
            dashKuEl.className = 'text-[10px] font-bold text-brand-red mt-1 bg-brand-red/10 border border-brand-red/20 px-2 py-0.5 rounded-md inline-block';
          }
        }

        // Hitung total medali podium kejuaraan resmi bray
        let emas = 0, perak = 0, perunggu = 0;
        window.globalResultsData.forEach(res => {
          if (res.rank === 1) emas++;
          else if (res.rank === 2) perak++;
          else if (res.rank === 3) perunggu++;
        });
        if (document.getElementById('count-emas')) {
          document.getElementById('count-emas').innerText = emas;
          document.getElementById('count-perak').innerText = perak;
          document.getElementById('count-perunggu').innerText = perunggu;
        }

        // Render Data Biometrik jika ada bray
        if (result.biometric) {
          const h = document.getElementById('bio-display-height');
          const w = document.getElementById('bio-display-weight');
          const a = document.getElementById('bio-display-arm');
          if (h) h.innerText = result.biometric.height_cm || '--';
          if (w) w.innerText = result.biometric.weight_kg || '--';
          if (a) a.innerText = result.biometric.arm_span_cm || '--';
        }

        // Setup filter gaya buttons
        document.querySelectorAll('.pill-gaya').forEach(btn => {
          btn.addEventListener('click', (e) => {
            document.querySelectorAll('.pill-gaya').forEach(b => {
              b.classList.remove('bg-brand-red', 'text-white', 'shadow-md', 'shadow-brand-red/40');
              b.classList.add('bg-gray-100', 'dark:bg-[#1f1a24]', 'text-gray-500', 'dark:text-gray-400', 'border', 'border-gray-200', 'dark:border-gray-700');
            });
            e.target.classList.remove('bg-gray-100', 'dark:bg-[#1f1a24]', 'text-gray-500', 'dark:text-gray-400', 'border', 'border-gray-200', 'dark:border-gray-700');
            e.target.classList.add('bg-brand-red', 'text-white', 'shadow-md', 'shadow-brand-red/40');
            initTabGrafik(e.target.dataset.style);
          });
        });
        
        // Setup filter dropdown
        const selectTahun = document.getElementById('grafik-year-filter');
        const selectCompare = document.getElementById('grafik-compare-filter');
        if (selectTahun) selectTahun.addEventListener('change', () => {
          const activeStyle = document.querySelector('.pill-gaya.bg-brand-red')?.dataset?.style || 'Bebas';
          initTabGrafik(activeStyle);
        });
        if (selectCompare) selectCompare.addEventListener('change', () => {
          const activeStyle = document.querySelector('.pill-gaya.bg-brand-red')?.dataset?.style || 'Bebas';
          initTabGrafik(activeStyle);
        });

        // Render data sejarah kejuaraan resmi di Tab Dashboard bray
        renderHistoryList();
        
        // Render Data Baru: Tab Menu Latihan (Training & Dryland) bray!
        renderTrainingModule(result.time_trials, result.dryland_tasks);

        // Siapkan grafik default
        initTabGrafik('Bebas');
      }
    } catch (err) { console.error(err); }
  }

  function renderHistoryList() {
    const container = document.getElementById('container-history-list');
    if (!container) return;
    if (window.globalEventsData.length === 0) return container.innerHTML = `<div class="text-center py-8 text-xs text-gray-500">Belum ada rekor kejuaraan resmi bray.</div>`;

    let htmlString = '';
    window.globalEventsData.forEach(ev => {
      const dateStr = new Date(ev.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      
      let resultsHtml = '';
      if (ev.event_results && ev.event_results.length > 0) {
        resultsHtml = ev.event_results.map(res => {
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
      } else {
        resultsHtml = `<div class="text-[10px] text-gray-400 italic text-center py-2">Belum ada hasil perlombaan / nomor lomba kosong.</div>`;
      }

      htmlString += `
        <div class="bg-white dark:bg-brand-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-3">
          <div class="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h4 class="font-bold text-xs tracking-wide text-gray-800 dark:text-white uppercase">${ev.title}</h4>
              <p class="text-[9px] font-semibold text-brand-red mt-0.5">${ev.level} â€¢ ${dateStr}</p>
            </div>
            ${window.isParent ? `<button onclick="window.editEventData('${ev.event_id}')" class="text-brand-red p-1 hover:bg-brand-red/10 rounded" title="Edit Lomba"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>` : ''}
          </div>
          <div class="space-y-1">${resultsHtml}</div>
        </div>`;
    });
    container.innerHTML = htmlString;
  }

  function renderTrainingModule(trials, drylands) {
    const ttContainer = document.getElementById('tt-list-container');
    window.globalTimeTrials = trials || [];

    if (ttContainer) {
      if (!trials || trials.length === 0) {
        ttContainer.innerHTML = `<div class="text-center py-4 text-gray-400 text-[11px]">Belum ada data Time Trial.</div>`;
      } else {
        ttContainer.innerHTML = trials.map(t => {
          const tglStr = new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          let laps = [];
          if (t.split_times_json) {
            try { laps = typeof t.split_times_json === 'string' ? JSON.parse(t.split_times_json) : t.split_times_json; } catch(e){}
          }
          const hasLaps = laps.length > 0;
          
          let lapsHtml = '';
          if (hasLaps) {
            lapsHtml = `<div class="hidden mt-2 pt-2 border-t dark:border-gray-800 space-y-1">` + 
              laps.map((lap, idx) => `<div class="flex justify-between items-center text-[10px] text-gray-500 px-1"><span class="uppercase tracking-widest font-bold">Set ${idx + 1}</span><span class="font-mono">${lap}</span></div>`).join('') + 
            `</div>`;
          }

          const arrowIcon = `<svg class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
          const arrowClass = hasLaps ? 'text-gray-400 cursor-pointer hover:text-brand-red' : 'hidden';

          return `
            <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-[#221c29] transition-all">
              <div class="flex justify-between items-center ${hasLaps ? 'cursor-pointer' : ''}" onclick="if(${hasLaps}) { const el = this.nextElementSibling; el.classList.toggle('hidden'); const svg = this.querySelector('svg'); svg.classList.toggle('rotate-180'); }">
                <div class="flex items-center gap-2">
                  <span class="${arrowClass}">${arrowIcon}</span>
                  <div>
                    <div class="text-xs font-bold text-gray-800 dark:text-zinc-200 uppercase">${t.style_name} ${t.distance}M</div>
                    <div class="text-[9px] text-gray-400 mt-0.5">${t.title_event} â€¢ ${tglStr}</div>
                  </div>
                </div>
                <span class="text-xs font-mono font-bold text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-lg">${t.time_record}</span>
              </div>
              ${lapsHtml}
            </div>`;
        }).join('');
      }
    }

    initTTChart('all');

    const dryContainer = document.getElementById('training-dryland-list');
    if (dryContainer) {
      if (!drylands || drylands.length === 0) {
        dryContainer.innerHTML = `<div class="text-center py-4 text-gray-400 text-[11px]">Belum ada target tugas dryland fisik minggu ini.</div>`;
      } else {
        dryContainer.innerHTML = drylands.map(d => `
          <div class="p-3 bg-gray-50 dark:bg-[#140e16]/40 rounded-xl border dark:border-gray-800 flex justify-between items-center mb-1.5">
            <div>
              <div class="font-bold text-gray-700 dark:text-zinc-300">${d.task_name}</div>
              <div class="text-[9px] text-gray-400 mt-0.5">Tanggal Tugas: ${d.date.split('T')[0]}</div>
            </div>
            <span class="text-[9px] bg-blue-500/10 text-blue-500 font-extrabold px-1.5 py-0.5 rounded-md uppercase">Dryland</span>
          </div>`).join('');
      }
    }
  }

  function initTTChart(styleFilter) {
    const ctx = document.getElementById('ttChart');
    if (!ctx) return;
    
    if (window.myTTChart) window.myTTChart.destroy();

    let filtered = window.globalTimeTrials || [];
    if (styleFilter !== 'all') filtered = filtered.filter(t => t.style_name.toLowerCase().includes(styleFilter.toLowerCase()));
    if (filtered.length === 0) return;

    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const labels = filtered.map(t => new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
    const dataPoints = filtered.map(t => {
      const p = t.time_record.split(/[:.]/);
      return p.length === 4 ? (parseInt(p[0])*3600)+(parseInt(p[1])*60)+parseInt(p[2])+(parseInt(p[3])/100) : 0;
    });

    window.myTTChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Waktu (Detik)', data: dataPoints, borderColor: '#ff4d4d', backgroundColor: 'rgba(255, 77, 77, 0.1)', borderWidth: 2, tension: 0.3, fill: true
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  const ttFilter = document.getElementById('tt-style-filter');
  if (ttFilter) {
    ttFilter.addEventListener('change', (e) => {
      initTTChart(e.target.value);
    });
  }

  // ==========================================
  // 5. PROGRESS GRAFIK ENGINE
  // ==========================================
  function initTabGrafik(styleName) {
    const tbody = document.getElementById('table-grafik-body');
    if (!tbody) return;
    
    const selectTahun = document.getElementById('grafik-year-filter');
    const selectCompare = document.getElementById('grafik-compare-filter');
    const styleRecords = window.globalResultsData.filter(r => r.category.toLowerCase().includes(styleName.toLowerCase()));
    if (selectTahun) renderChartProgress(styleName, selectTahun.value, selectCompare ? selectCompare.value : 'none');

    tbody.innerHTML = '';
    const sorted = styleRecords.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-xs text-gray-500">Belum ada rekor Gaya ${styleName}</td></tr>`;
      return;
    }

    sorted.forEach(item => {
      tbody.innerHTML += `
        <tr class="hover:bg-gray-50 dark:hover:bg-[#221c29] text-xs">
          <td class="px-4 py-3 font-bold">${item.category.replace(' Gaya ', ' ')}</td>
          <td class="px-4 py-3 text-center"><span class="font-mono font-bold text-brand-red bg-brand-red/10 px-2 py-1 rounded">${item.time_record}</span></td>
          <td class="px-4 py-3 text-center"><span class="text-[9px] bg-emerald-500/10 text-emerald-500 font-bold px-1.5 py-0.5 rounded">Official</span></td>
          <td class="px-4 py-3 text-gray-400 text-[10px] truncate max-w-[100px]">${item.title}</td>
        </tr>`;
    });
  }

  function renderChartProgress(styleName, targetYearStr, compareYearStr) {
    const ctx = document.getElementById('prestasiChart');
    if (!ctx) return;
    if (window.myProgressChart) window.myProgressChart.destroy();

    const targetYear = parseInt(targetYearStr) || new Date().getFullYear();
    const compareYear = compareYearStr !== 'none' ? parseInt(compareYearStr) : null;
    const styleRecords = window.globalResultsData.filter(r => r.category.toLowerCase().includes(styleName.toLowerCase()));

    const getMonthlyBest = (dist, yr) => {
      const monthly = new Array(12).fill(null);
      styleRecords.forEach(r => {
        if (r.category.startsWith(dist)) {
          const d = new Date(r.event_date);
          if (d.getFullYear() === yr) {
            const parts = r.time_record.split(/[:.]/);
            const secs = parts.length === 4 ? (parseInt(parts[0])*3600)+(parseInt(parts[1])*60)+parseInt(parts[2])+(parseInt(parts[3])/100) : 0;
            if (monthly[d.getMonth()] === null || secs < monthly[d.getMonth()]) monthly[d.getMonth()] = secs;
          }
        }
      });
      return monthly;
    };

    const colors = { '25 M': '#d946ef', '50 M': '#22c55e', '100 M': '#eab308', '200 M': '#06b6d4' };
    const datasets = [];
    ['25 M', '50 M', '100 M', '200 M'].forEach(dist => {
      datasets.push({ label: `${dist} (${targetYear})`, data: getMonthlyBest(dist, targetYear), borderColor: colors[dist], borderWidth: 2, tension: 0.3, spanGaps: true });
    });

    window.myProgressChart = new Chart(ctx, {
      type: 'line',
      data: { labels: ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'], datasets },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  // INTERAKSI TEMA & LOGOUT GLOBAL
  initProfileModal();
  initDashboardProfile();
  
  document.getElementById('theme-toggle')?.addEventListener('click', () => document.documentElement.classList.toggle('dark'));
  document.getElementById('btn-logout')?.addEventListener('click', () => { localStorage.removeItem('swim_user'); window.location.replace('/index.html'); });

  // RUN AMBIL DATA UTAMA ATLET
  await loadAthleteData();

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
        window.rowCounter++;
        const hasLaps = res.laps && res.laps.length > 0;
        const newRow = document.createElement('div');
        newRow.id = `row-lomba-${window.rowCounter}`;
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
    window.rowCounter++;
    const newRow = document.createElement('div');
    newRow.id = `row-lomba-${window.rowCounter}`;
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
        parent_id: user.id,
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
        await loadAthleteData(); 
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

  await loadAthleteData();
});

  window.openModal = (bgId, innerId) => {
    document.getElementById(bgId).classList.remove('hidden');
    setTimeout(() => { document.getElementById(innerId).classList.remove('scale-95', 'opacity-0'); }, 10);
  };
  window.closeModal = (bgId, innerId) => {
    document.getElementById(innerId).classList.add('scale-95', 'opacity-0');
    setTimeout(() => { document.getElementById(bgId).classList.add('hidden'); }, 300);
  };
