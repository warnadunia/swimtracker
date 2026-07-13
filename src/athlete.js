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
import modalHTML from '../input.html?raw';

import { initProfileModal, initDashboardProfile } from './profile_modal.js';

window.rowCounter = 0;
window.masterCategories = [];

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
    document.getElementById('modal-container').innerHTML = modalHTML;
    
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

      const catResponse = await fetch('/api/athletes?action=categories');
      const catResult = await catResponse.json();
      window.masterCategories = catResult.success ? catResult.data : [];

      if (result.success) {
        window.athleteBirthYear = result.birth_year || null;
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
          if (dashAvatar) dashAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(athleteName)}&background=ff4d4d&color=fff&bold=true`;
          
          if (dashKuEl) {
            let kuText = "ATLET";
            if (window.athleteBirthYear) {
              const currentYear = new Date().getFullYear();
              const age = currentYear - window.athleteBirthYear;
              if (age >= 19) kuText = `KU Senior (${window.athleteBirthYear})`;
              else if (age >= 16) kuText = `KU 1 (${window.athleteBirthYear})`;
              else if (age >= 14) kuText = `KU 2 (${window.athleteBirthYear})`;
              else if (age >= 12) kuText = `KU 3 (${window.athleteBirthYear})`;
              else if (age >= 10) kuText = `KU 4 (${window.athleteBirthYear})`;
              else kuText = `KU 5 (${window.athleteBirthYear})`;
            }
            dashKuEl.innerText = kuText;
          }

          if (btnEdit) {
            btnEdit.onclick = (e) => {
              e.preventDefault();
              window.location.href = `biodata.html?id=${athleteId}&name=${encodeURIComponent(athleteName)}`;
            };
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

        // Init Radar Chart
        const ctxRadar = document.getElementById('profileRadarChart');
        if (ctxRadar) {
          if (window.myRadarChart) window.myRadarChart.destroy();
          window.myRadarChart = new Chart(ctxRadar, {
            type: 'radar',
            data: {
              labels: ['Speed', 'Stamina', 'Strength', 'Tech', 'Mental'],
              datasets: [{
                label: 'Statistik Atlet',
                data: [85, 75, 80, 90, 70], // dummy data for now
                backgroundColor: 'rgba(255, 77, 77, 0.2)',
                borderColor: '#ff4d4d',
                pointBackgroundColor: '#ff4d4d',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#ff4d4d'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                r: {
                  angleLines: { display: true, color: 'rgba(0,0,0,0.1)' },
                  grid: { color: 'rgba(0,0,0,0.1)' },
                  pointLabels: { font: { size: 8 } },
                  ticks: { display: false, min: 0, max: 100 }
                }
              },
              plugins: { legend: { display: false } }
            }
          });
        }
      }
    } catch (err) { console.error(err); }
  }

  function renderHistoryList() {
    const container = document.getElementById('container-history-list');
    if (!container) return;
    if (window.globalEventsData.length === 0) return container.innerHTML = `<div class="text-center py-8 text-xs text-gray-500">Belum ada rekor kejuaraan resmi bray.</div>`;

    let htmlString = '';
    window.globalEventsData.forEach((ev, evIdx) => {
      const dateStr = new Date(ev.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      
      let badgesHtml = '';
      let resultsHtml = '';
      
      if (ev.event_results && ev.event_results.length > 0) {
        // Generate Badges for Header
        badgesHtml = `<div class="flex flex-wrap gap-2 mt-3">` + 
          ev.event_results.map(res => {
            let icon = '🏅';
            let rankNum = parseInt(res.rank);
            if (rankNum === 1) icon = '🥇';
            else if (rankNum === 2) icon = '🥈';
            else if (rankNum === 3) icon = '🥉';
            let rankText = res.rank ? `Rank ${res.rank}` : 'Rank --';
            let colorClass = (rankNum >= 1 && rankNum <= 3) ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'text-gray-500 bg-gray-50 dark:bg-gray-800';
            return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold ${colorClass}">${icon} ${rankText} - ${res.category}</span>`;
          }).join('') + `</div>`;

        // Generate Race Cards for Body
        resultsHtml = `<div class="space-y-3 mt-4 hidden" id="ev-body-${evIdx}">` + 
          ev.event_results.map(res => {
            const laps = res.laps || [];
            const hasLaps = laps.length > 0;
            const arrowClass = hasLaps ? 'text-gray-400 cursor-pointer hover:text-brand-red' : 'hidden';
            const arrowIcon = `<svg class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>`;
            
            let lapsHtml = '';
            if (hasLaps) {
              lapsHtml = `<div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">` + 
                laps.map((lap, idx) => `<div class="flex justify-between items-center text-[10px] font-bold px-1"><span class="text-gray-600 dark:text-gray-400 tracking-widest">SET ${idx + 1}</span><span class="font-mono text-gray-500">${lap}</span></div>`).join('') + 
              `</div>`;
            }

            return `
            <div class="bg-white dark:bg-brand-card border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm relative overflow-hidden transition-all">
              <div class="flex justify-between items-start">
                <div class="flex items-center gap-2">
                  <span class="${arrowClass} transform rotate-180" onclick="const p = this.closest('.bg-white'); const l = p.querySelector('.border-t'); if(l) { l.classList.toggle('hidden'); this.classList.toggle('rotate-180'); }">${arrowIcon}</span>
                  <span class="text-gray-800 dark:text-gray-200 font-bold text-xs uppercase tracking-wider">${res.category}</span>
                </div>
                <div class="text-right flex flex-col items-end gap-1">
                  <span class="text-brand-red font-mono font-black text-xs">${res.time_record}</span>
                  <span class="text-orange-500 font-bold text-[9px] bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded uppercase">Rank ${res.rank || '-'}</span>
                </div>
              </div>
              ${lapsHtml}
            </div>
            `;
          }).join('') + `</div>`;
      } else {
        resultsHtml = `<div class="hidden mt-4 text-[10px] text-gray-400 italic text-center py-2" id="ev-body-${evIdx}">Belum ada hasil perlombaan.</div>`;
      }

      htmlString += `
        <div class="bg-white dark:bg-brand-card p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
          <div class="flex justify-between items-start cursor-pointer" onclick="document.getElementById('ev-body-${evIdx}').classList.toggle('hidden'); const sv = this.querySelector('.chevron-icon'); if(sv) sv.classList.toggle('rotate-180');">
            <div class="flex-1">
              <h4 class="font-black text-xs tracking-wide text-gray-800 dark:text-white uppercase">${ev.title}</h4>
              <p class="text-[10px] font-medium text-gray-400 mt-1">${ev.level} &bull; ${dateStr}</p>
            </div>
            <div class="flex items-center gap-2 ml-4">
              ${window.isParent ? `<button onclick="event.stopPropagation(); window.editEventData('${ev.event_id}')" class="text-brand-red p-1.5 hover:bg-brand-red/10 rounded-lg transition-colors" title="Edit Lomba"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>` : ''}
              <svg class="chevron-icon w-4 h-4 text-gray-400 transition-transform duration-200 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
            </div>
          </div>
          ${badgesHtml}
          ${resultsHtml}
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
          <div class="bg-gray-50 dark:bg-[#1a1423] p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center mb-3">
            <div>
              <h4 class="font-bold text-gray-800 dark:text-white text-sm">${d.task_name}</h4>
              <div class="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Tanggal Tugas: ${d.date.split('T')[0]}</div>
            </div>
            <button onclick="window.openDrylandDetail('${encodeURIComponent(d.task_name)}')" class="bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-500 text-[10px] font-bold px-3 py-1.5 rounded-md uppercase hover:bg-blue-600/20 dark:hover:bg-blue-600/30 transition-colors">DETAIL</button>
          </div>`).join('');
      }
    }
  }

  window.closeDrylandModal = function() {
    const modal = document.getElementById('modal-dryland-detail');
    const inner = document.getElementById('modal-dryland-inner');
    if (modal && inner) {
      inner.classList.add('translate-y-full');
      modal.classList.add('opacity-0');
      setTimeout(() => { modal.classList.add('hidden'); }, 300);
    }
  };

  // Dryland Detail Modal Injector & Opener
  window.openDrylandDetail = function(encodedName) {
    const taskName = decodeURIComponent(encodedName).toUpperCase();
    let modal = document.getElementById('modal-dryland-detail');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-dryland-detail';
      modal.className = 'fixed inset-0 z-[1000] hidden flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity opacity-0 duration-300';
      modal.innerHTML = `
        <div id="modal-dryland-inner" class="bg-[#1a1423] w-full sm:max-w-md mx-auto rounded-t-[30px] sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-transform duration-300 translate-y-full flex flex-col max-h-[90vh]">
          
          <!-- Header -->
          <div class="flex items-center gap-3 p-5 border-b border-gray-800 shrink-0">
            <button onclick="window.closeDrylandModal()" class="w-8 h-8 flex items-center justify-center bg-[#251f2e] text-gray-400 rounded-full hover:text-brand-red transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h3 class="font-bold text-sm text-white tracking-widest" id="dryland-detail-title">HAND DRILL : PUSH UP</h3>
          </div>

          <div class="p-5 overflow-y-auto grow custom-scrollbar">
            <!-- Desc -->
            <p id="dryland-desc" class="text-[11px] text-gray-300 leading-relaxed mb-4">
              Lakukan gerakan dengan posisi tubuh lurus, mulai dari kepala hingga tumit. Turunkan tubuh hingga dada hampir menyentuh lantai, lalu dorong kembali ke posisi awal.
            </p>

            <h4 class="font-black text-white text-[10px] tracking-widest mb-2 uppercase">Fungsi Latihan</h4>
            <p id="dryland-fungsi" class="text-[11px] text-gray-400 leading-relaxed mb-6">
              Meningkatkan kekuatan otot dada, bahu, dan trisep, serta memperkuat otot inti (core). Sangat penting untuk stabilitas gerakan tangan di dalam air.
            </p>

            <!-- Video -->
            <h4 class="font-black text-gray-400 text-[10px] text-center tracking-widest mb-3 uppercase">Video / Photo Tutorial</h4>
            <div class="w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden mb-8 relative border border-gray-800 shadow-lg">
              <img id="dryland-image" src="https://images.unsplash.com/photo-1598971639058-fab3541658ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Latihan" class="w-full h-full object-cover opacity-70">
              <div class="absolute inset-0 flex items-center justify-center">
                <button class="w-12 h-12 bg-white/20 backdrop-blur border border-white/30 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  <svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
              </div>
            </div>

            <!-- Target & Time -->
            <div class="flex items-center justify-center gap-6 bg-[#1f1927] border border-gray-800 py-3 px-6 rounded-2xl mb-8 w-max mx-auto">
              <div class="text-center">
                <div class="text-[8px] font-bold text-gray-500 tracking-widest uppercase mb-1">Target</div>
                <div class="font-black text-white text-sm" id="dryland-target">3 x 30</div>
              </div>
              <div class="w-[1px] h-8 bg-gray-700"></div>
              <div class="text-center">
                <div class="text-[8px] font-bold text-gray-500 tracking-widest uppercase mb-1">Time</div>
                <div class="font-black text-white text-sm" id="dryland-time">@ 02:00</div>
              </div>
            </div>

            <!-- Stopwatch -->
            <div class="text-center mb-8">
              <div class="font-black text-[50px] text-white tracking-tighter leading-none" style="font-family: 'Inter', sans-serif;">00:00.00</div>
            </div>

            <!-- Actions -->
            <div class="space-y-3">
              <button class="w-full bg-[#ff4d4d] text-white py-4 rounded-xl text-sm font-black shadow-[0_0_20px_rgba(255,77,77,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                LAKUKAN SEKARANG
              </button>
              <button class="w-full bg-[#1f1927] border border-gray-800 text-gray-400 hover:text-white py-4 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                SIMPAN Waktu
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    document.getElementById('dryland-detail-title').innerText = taskName;
    
    // Custom logic based on task name
    const imgEl = document.getElementById('dryland-image');
    const descEl = document.getElementById('dryland-desc');
    const funcEl = document.getElementById('dryland-fungsi');
    const targetEl = document.getElementById('dryland-target');

    if (taskName.toLowerCase().includes('push up')) {
      imgEl.src = "https://images.unsplash.com/photo-1598971639058-fab3541658ce?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
      descEl.innerText = "Lakukan gerakan dengan posisi tubuh lurus, mulai dari kepala hingga tumit. Turunkan tubuh hingga dada hampir menyentuh lantai, lalu dorong kembali ke posisi awal.";
      funcEl.innerText = "Meningkatkan kekuatan otot dada, bahu, dan trisep, serta memperkuat otot inti (core). Sangat penting untuk stabilitas gerakan tangan di dalam air.";
      targetEl.innerText = "3 x 30";
    } else if (taskName.toLowerCase().includes('sit up') || taskName.toLowerCase().includes('core')) {
      imgEl.src = "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
      descEl.innerText = "Berbaring terlentang dengan lutut ditekuk. Angkat tubuh bagian atas menuju lutut menggunakan otot perut, lalu turunkan kembali secara perlahan.";
      funcEl.innerText = "Memperkuat otot perut dan core secara keseluruhan. Membantu menjaga posisi tubuh (streamline) yang baik saat berenang.";
      targetEl.innerText = "3 x 50";
    } else if (taskName.toLowerCase().includes('plank')) {
      imgEl.src = "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
      descEl.innerText = "Tahan posisi tubuh menyerupai push-up dengan tumpuan pada lengan bawah. Jaga tubuh tetap lurus dan kencangkan otot perut.";
      funcEl.innerText = "Latihan isometrik yang sangat baik untuk seluruh otot inti. Membantu perenang mempertahankan postur tubuh yang kaku dan efisien di air.";
      targetEl.innerText = "3 x 2 Menit";
    } else {
      imgEl.src = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
      descEl.innerText = "Lakukan gerakan fisik dengan intensitas yang disesuaikan. Fokus pada pernapasan dan postur tubuh yang benar.";
      funcEl.innerText = "Meningkatkan stamina, kelenturan, dan kebugaran kardiovaskular secara keseluruhan. Baik untuk daya tahan berenang jarak jauh.";
      targetEl.innerText = "1 x 30 Menit";
    }

    const modalEl = document.getElementById('modal-dryland-detail');
    const innerEl = document.getElementById('modal-dryland-inner');
    modalEl.classList.remove('hidden');
    
    // Animate in
    setTimeout(() => {
      modalEl.classList.remove('opacity-0');
      innerEl.classList.remove('translate-y-full');
    }, 10);
  };

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
  
  const toggleTheme = () => document.documentElement.classList.toggle('dark');
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('btn-theme')?.addEventListener('click', toggleTheme);
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
    
    const locInput = document.getElementById('input-event-location');
    if (locInput) locInput.value = ev.location || '';
    
    // Pool size could be inferred from the first result or set default
    const poolSize = ev.event_results && ev.event_results.length > 0 ? ev.event_results[0].pool_size : '50';
    const poolInput = document.getElementById('input-event-pool');
    if (poolInput) poolInput.value = poolSize;
    
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

  window.tambahBarisLomba = () => document.getElementById('btn-add-nomor')?.click();

  // Event listener untuk tombol input baru
  document.getElementById('btn-input-kejuaraan')?.addEventListener('click', () => {
    isEditMode = false;
    window.currentEditEventId = null;
    document.getElementById('input-event-name').value = '';
    document.getElementById('input-event-level').value = 'Lokal';
    document.getElementById('input-tanggal-event').value = '';
    document.getElementById('input-tahun-lahir').value = window.athleteBirthYear || '';
    document.getElementById('display-ku').value = '';
    document.getElementById('container-nomor-lomba').innerHTML = '';
    if (window.tambahBarisLomba) window.tambahBarisLomba();
    document.getElementById('btn-save-event').innerText = "Simpan Semua Data";
    window.openModal('modal-input', 'modal-inner');
  });

  document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    window.closeModal('modal-input', 'modal-inner');
  });

  // Auto format 00:00:00:00 di event input
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

  // Calculate KU automatically
  const calculateKU = () => {
    const eventDateStr = document.getElementById('input-tanggal-event').value;
    const displayKu = document.getElementById('display-ku');
    if (!eventDateStr || !window.athleteBirthYear) {
      displayKu.value = '';
      return;
    }
    const eventYear = new Date(eventDateStr).getFullYear();
    const age = eventYear - window.athleteBirthYear;
    if (age >= 19) displayKu.value = "Senior";
    else if (age >= 16) displayKu.value = "Grup 1";
    else if (age >= 14) displayKu.value = "Grup 2";
    else if (age >= 12) displayKu.value = "Grup 3";
    else if (age >= 10) displayKu.value = "Grup 4";
    else displayKu.value = "Grup 5";
  };
  document.getElementById('input-tanggal-event')?.addEventListener('change', calculateKU);

  // ==========================================
  // STOPWATCH LOGIC
  // ==========================================
  let swTimer = null;
  let swTime = 0;
  let swIsRunning = false;
  let swTargetInput = null;

  const formatSwTime = (ms) => {
    const msPart = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    const totalSec = Math.floor(ms / 1000);
    const s = (totalSec % 60).toString().padStart(2, '0');
    const m = Math.floor((totalSec / 60) % 60).toString().padStart(2, '0');
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    return `${h === '00' ? '' : h + ':'}${m}:${s}.${msPart}`;
  };

  let swLaps = [];

  window.openStopwatch = (btn) => {
    swTargetInput = btn.closest('.row-lomba').querySelector('.input-time');
    const modal = document.getElementById('modal-stopwatch');
    if (!modal) return;
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
    document.getElementById('sw-display').innerText = '00:00.00';
    document.getElementById('sw-laps-container').innerHTML = '';
    swTime = 0;
    swIsRunning = false;
    swLaps = [];
    document.getElementById('sw-btn-start').innerText = 'START';
    document.getElementById('sw-btn-start').classList.replace('bg-orange-500', 'bg-brand-red');
    document.getElementById('sw-btn-save').classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
    document.getElementById('sw-btn-lap-text').innerText = 'RESET';
  };

  window.closeStopwatch = () => {
    const modal = document.getElementById('modal-stopwatch');
    if (!modal) return;
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
    clearInterval(swTimer);
  };

  window.toggleStopwatch = () => {
    if (swIsRunning) {
      clearInterval(swTimer);
      swIsRunning = false;
      document.getElementById('sw-btn-start').innerText = 'RESUME';
      document.getElementById('sw-btn-start').classList.replace('bg-orange-500', 'bg-brand-red');
      document.getElementById('sw-btn-save').classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      document.getElementById('sw-btn-lap-text').innerText = 'RESET';
    } else {
      swIsRunning = true;
      document.getElementById('sw-btn-start').innerText = 'STOP';
      document.getElementById('sw-btn-start').classList.replace('bg-brand-red', 'bg-orange-500');
      document.getElementById('sw-btn-save').classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      document.getElementById('sw-btn-lap-text').innerText = 'LAP';
      const startTime = Date.now() - swTime;
      swTimer = setInterval(() => {
        swTime = Date.now() - startTime;
        document.getElementById('sw-display').innerText = formatSwTime(swTime);
      }, 10);
    }
  };

  window.lapStopwatch = () => {
    if (swIsRunning) {
      // Record Lap
      swLaps.push(formatSwTime(swTime));
      const container = document.getElementById('sw-laps-container');
      const lapEl = document.createElement('div');
      lapEl.className = 'text-gray-300 font-mono text-sm flex justify-between border-b border-gray-700 pb-1';
      lapEl.innerHTML = `<span class="text-gray-500">SET ${swLaps.length}</span> <span>${swLaps[swLaps.length - 1]}</span>`;
      container.prepend(lapEl);
    } else {
      // Reset
      clearInterval(swTimer);
      swTime = 0;
      swLaps = [];
      swIsRunning = false;
      document.getElementById('sw-display').innerText = '00:00.00';
      document.getElementById('sw-laps-container').innerHTML = '';
      document.getElementById('sw-btn-start').innerText = 'START';
      document.getElementById('sw-btn-start').classList.replace('bg-orange-500', 'bg-brand-red');
      document.getElementById('sw-btn-save').classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      document.getElementById('sw-btn-lap-text').innerText = 'RESET';
    }
  };

  window.saveStopwatch = () => {
    if (swTargetInput) {
      swTargetInput.value = formatSwTime(swTime);
      swTargetInput.dataset.laps = JSON.stringify(swLaps);
      window.closeStopwatch();
    }
  };

  // ==========================================
  // EKSEKUSI API SUBMISSIONS
  // ==========================================
  document.getElementById('btn-save-event')?.addEventListener('click', async () => {
    const title = document.getElementById('input-event-name').value.trim();
    const level = document.getElementById('input-event-level').value.trim();
    const eventDate = document.getElementById('input-tanggal-event').value;
    const poolSizeEl = document.getElementById('input-event-pool');
    const poolSize = poolSizeEl ? poolSizeEl.value : 50;

    if (!title || !eventDate) return alert('Nama Event dan Tanggal wajib diisi bray!');

    const results = [];
    document.querySelectorAll('.row-lomba').forEach(row => {
      // If style is disabled, we still need its value. 
      const styleSelect = row.querySelector('.input-style');
      const style_id = styleSelect.value || styleSelect.getAttribute('data-value'); // In case disabled prevents value, but usually .value works on disabled selects.
      const distStr = row.querySelector('.input-distance').value;
      const distance = distStr ? parseInt(distStr, 10) : 0;
      const timeInput = row.querySelector('.input-time');
      const time_record = timeInput.value.trim();
      const rank = row.querySelector('.input-rank').value;
      const result_id = row.dataset.resultId;
      
      let laps = [];
      if (timeInput.dataset.laps) {
        try { laps = JSON.parse(timeInput.dataset.laps); } catch(e){}
      }

      // Allow empty time_record if they just prefill it, but don't add to array if BOTH time and style are empty.
      if (style_id) {
        results.push({ result_id, style_id, distance, time_record, rank, laps });
      }
    });

    if (results.length === 0) return alert('Minimal isi 1 nomor lomba bray!');

    const btn = document.getElementById('btn-save-event');
    btn.innerText = "Mengirim..."; btn.disabled = true;

    try {
      const endpoint = isEditMode ? '/api/parents?action=update_kejuaraan' : '/api/parents?action=input_kejuaraan';
      const locationEl = document.getElementById('input-event-location');
      const location = locationEl ? locationEl.value.trim() : '';

      const payload = {
        parent_id: user.id,
        athlete_id: athleteId,
        title, level, event_date: eventDate, pool_size: poolSize, location,
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
