// src/athlete.js
// CORE LOGIC ATLET V3 - 3 UTAMA TAB: DASHBOARD, TRAINING, PROGRESS bray

import './style.css';
import 'preline';
import Chart from 'chart.js/auto';

import headerHTML from '../header.html?raw';
import dashboardHTML from '../dashboard.html?raw';
import progressHTML from '../progress.html?raw';
import navHTML from '../bottomnav.html?raw'; 

import { initProfileModal, initDashboardProfile } from './profile_modal.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. SATPAM PROTEKSI LOGIN ATLET
  const sessionUser = localStorage.getItem('swim_user');
  if (!sessionUser) return window.location.replace('/index.html');

  const user = JSON.parse(sessionUser);
  if (user.role !== 'atlet' && user.role !== 'admin') {
    return window.location.replace('/index.html');
  }

  // 2. SUNTIK LAYOUT STRUKTUR TAB ATLET BARU BRAY
  try {
    document.getElementById('header-container').innerHTML = headerHTML;
    
    // Injeksi 3 Modul Utama Wadah Konten
    document.getElementById('main-container').innerHTML = `
      <div id="wrapper-dashboard" class="tab-content-atlet hidden">${dashboardHTML}</div>
      <div id="wrapper-training" class="tab-content-atlet hidden space-y-4">
        <!-- RENDER DINAMIS MENU TRAINING DI SINI BRAY -->
        <div class="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 text-xs text-blue-600 dark:text-blue-400 font-bold mb-2">🏊‍♂️ MENU TRAINING & DRYLAND</div>
        <div class="bg-white dark:bg-[#1f1927] border dark:border-gray-800 p-4 rounded-2xl shadow-sm">
          <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">⏱️ Catatan Waktu Time Trial</h4>
          <div id="training-tt-list" class="space-y-2 divide-y divide-gray-100 dark:divide-gray-800"></div>
        </div>
        <div class="bg-white dark:bg-[#1f1927] border dark:border-gray-800 p-4 rounded-2xl shadow-sm">
          <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🏋️ Tugas Latihan & Dryland</h4>
          <div id="training-dryland-list" class="space-y-2 text-xs"></div>
        </div>
      </div>
      <div id="wrapper-progress" class="tab-content-atlet hidden">${progressHTML}</div>
    `;
    
    document.getElementById('nav-container').innerHTML = navHTML;
    
    // Cabut tombol input kejuaraan murni dari UI Atlet bray
    const addBtn = document.getElementById('btn-open-modal');
    if (addBtn) addBtn.remove();

  } catch (error) {
    console.error("Gagal memuat komponen HTML:", error);
  }

  if (window.HSStaticMethods) window.HSStaticMethods.autoInit();

  // 3. SWITCH TAB ENGINE KHUSUS 3 UTAMA MENU ATLET BRAY
  window.switchTab = function(tabId) {
    // Sembunyikan semua kontainer pembungkus
    document.querySelectorAll('.tab-content-atlet').forEach(el => el.classList.add('hidden'));
    
    // Tampilkan target tab yang dipilih
    let targetId = 'wrapper-dashboard';
    if (tabId === 'tab-history') targetId = 'wrapper-dashboard';
    if (tabId === 'tab-training') targetId = 'wrapper-training'; // Target Menu Baru!
    if (tabId === 'tab-grafik') targetId = 'wrapper-progress';

    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.classList.remove('hidden');

    // Reset warna dan status aktif tombol bottom nav bray
    const btns = document.querySelectorAll('.nav-tab-btn');
    btns.forEach(btn => {
      btn.classList.remove('text-brand-red');
      btn.classList.add('text-gray-400');
    });
    
    // Warnai merah tombol aktif saat ini
    const activeBtn = document.querySelector(`[onclick="window.switchTab('${tabId}')"]`) || document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if (activeBtn) {
      activeBtn.classList.remove('text-gray-400');
      activeBtn.classList.add('text-brand-red');
    }
  };
  window.switchTab('tab-history'); // Default awal masuk ke Dashboard bray

  // 4. LOAD & TAMPILKAN ALL DATA MURNI DARI TiDB
  window.globalResultsData = [];
  window.globalEventsData = [];

  async function loadAthleteData() {
    try {
      const response = await fetch(`/api/athletes?action=dashboard_data&user_id=${user.id}`);
      const result = await response.json();

      if (result.success) {
        window.globalResultsData = result.results || [];
        window.globalEventsData = result.events || [];

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
    container.innerHTML = '';

    if (window.globalEventsData.length === 0) {
      container.innerHTML = `<div class="text-center py-8 text-xs text-gray-500">Belum ada rekor kejuaraan resmi bray.</div>`;
      return;
    }

    let htmlString = '';
    window.globalEventsData.forEach(ev => {
      const dateStr = new Date(ev.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      let resultsHtml = (ev.event_results || []).map(res => `
        <div class="flex justify-between items-center py-1 text-xs">
          <span class="text-gray-500 dark:text-gray-400">${res.category}</span>
          <span class="font-mono font-bold text-brand-red">${res.time_record} (Rank ${res.rank || '-'})</span>
        </div>
      `).join('');

      htmlString += `
        <div class="bg-white dark:bg-[#1f1927] p-4 rounded-2xl border dark:border-gray-800 shadow-sm mb-3">
          <div class="flex justify-between items-center mb-2">
            <div>
              <h4 class="font-bold text-xs text-gray-800 dark:text-white uppercase">${ev.title}</h4>
              <p class="text-[9px] text-gray-400 mt-0.5">${ev.level} • ${dateStr}</p>
            </div>
          </div>
          <div class="space-y-1 pt-1 border-t dark:border-gray-800/60">${resultsHtml || '<span class="text-[9px] text-gray-400">Belum ada nomor lomba bray</span>'}</div>
        </div>`;
    });
    container.innerHTML = htmlString;
  }

  function renderTrainingModule(trials, drylands) {
    const ttContainer = document.getElementById('training-tt-list');
    const dryContainer = document.getElementById('training-dryland-list');

    // [A] Render Catatan Waktu Time Trial dari Pelatih bray
    if (ttContainer) {
      if (!trials || trials.length === 0) {
        ttContainer.innerHTML = `<div class="text-center py-4 text-gray-400 text-[11px]">Belum ada evaluasi latihan dari Coach bray.</div>`;
      } else {
        ttContainer.innerHTML = trials.map(t => {
          const tglStr = new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          return `
            <div class="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
              <div>
                <div class="text-xs font-bold text-gray-800 dark:text-zinc-200 uppercase">${t.title_event}</div>
                <div class="text-[9px] text-gray-400 mt-0.5">${t.distance}M • Kolam ${t.pool_size}M • ${tglStr}</div>
              </div>
              <span class="text-xs font-mono font-bold text-brand-red bg-brand-red/10 px-2 py-0.5 rounded-lg">${t.time_record}</span>
            </div>`;
        }).join('');
      }
    }

    // [B] Render Tugas Mandiri Dryland bray
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

  // ==========================================
  // 5. PROGRESS GRAFIK ENGINE
  // ==========================================
  function initTabGrafik(styleName) {
    const tbody = document.getElementById('table-grafik-body');
    if (!tbody) return;
    
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
});