import './style.css';
import 'preline';
import Chart from 'chart.js/auto';
import { supabase } from './supabase';

document.addEventListener('DOMContentLoaded', async () => {
  // ==========================================
  // 1. CEK SESI
  // ==========================================
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { 
    window.location.replace('/index.html'); 
    return; 
  }

  const user = session.user;

  // ==========================================
  // 2. INJEKSI KOMPONEN HTML
  // ==========================================
  try {
    const [header, dashboard, progress, nav, modal] = await Promise.all([
      fetch('/header.html').then(res => res.text()),
      fetch('/dashboard.html').then(res => res.text()),
      fetch('/progress.html').then(res => res.text()),
      fetch('/bottomnav.html').then(res => res.text()),
      fetch('/input.html').then(res => res.text())
    ]);

document.getElementById('header-container').innerHTML = header;
  
  // Pisahkan container-nya biar gak numpuk
  document.getElementById('main-container').innerHTML = `
    <div id="wrapper-dashboard">${dashboard}</div>
    <div id="wrapper-progress">${progress}</div>
  `;
  document.getElementById('nav-container').innerHTML = nav;
  document.getElementById('modal-container').innerHTML = modal;
  } catch (error) {
    console.error("Gagal memuat komponen HTML:", error);
  }

  if (window.HSStaticMethods) window.HSStaticMethods.autoInit();

  // ==========================================
  // 3. FUNGSI SWITCH TAB 
  // ==========================================
  window.switchTab = function(tabId) {
    const tabHistory = document.getElementById('tab-history');
    const tabGrafik = document.getElementById('tab-grafik');
    
    // Pastikan referensi dom ditemukan
    if (!tabHistory || !tabGrafik) return;
    
    // Sembunyikan semua tab
    tabHistory.classList.add('hidden');
    tabGrafik.classList.add('hidden');
    
    // Tampilkan target tab
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
      targetTab.classList.remove('hidden');
    }

    // Perbarui gaya tombol navigasi
    const btns = document.querySelectorAll('.nav-tab-btn');
    btns.forEach(btn => {
      btn.classList.remove('text-brand-red');
      btn.classList.add('text-gray-400');
    });
    
    const activeBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if (activeBtn) {
      activeBtn.classList.remove('text-gray-400');
      activeBtn.classList.add('text-brand-red');
    }
  };

  // PENTING: Inisialisasi tampilan awal, paksa hanya tab history yang terlihat
  window.switchTab('tab-history');

  // ==========================================
  // 4. SETUP PROFIL, ADMIN & KALKULASI KU
  // ==========================================
  const fullName = user.user_metadata.full_name || 'Atlet';
  const tabHistoryH2 = document.querySelector('#tab-history h2');
  const tabHistoryImg = document.querySelector('#tab-history img');
  if (tabHistoryH2) tabHistoryH2.innerText = fullName;
  if (tabHistoryImg) tabHistoryImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=ff4d4d&color=fff&bold=true`;

  window.masterCategories = [];
  const { data: categories } = await supabase.from('master_categories').select('*').order('name');
  if (categories) window.masterCategories = categories;

  const { data: profile } = await supabase.from('profiles').select('role, birth_year').eq('id', user.id).single();
  
  if (profile && profile.role === 'admin') {
    const adminGear = document.getElementById('admin-gear');
    if (adminGear) adminGear.classList.remove('hidden');
  }

  // --- LOGIKA KU DASHBOARD & MODAL ---
  if (profile && profile.birth_year) {
    window.atletBirthYear = profile.birth_year;
    
    // 1. Nembak KU ke Dashboard (Tahun Ini - Tahun Lahir)
    const currentYear = new Date().getFullYear();
    const ageDash = currentYear - window.atletBirthYear;
    let kuDash = ageDash <= 9 ? "KU 5 (<= 9 Thn)" : ageDash <= 11 ? "KU 4 (10-11 Thn)" : ageDash <= 13 ? "KU 3 (12-13 Thn)" : ageDash <= 15 ? "KU 2 (14-15 Thn)" : ageDash <= 18 ? "KU 1 (16-18 Thn)" : "Senior (> 18 Thn)";
    
    const dashKuEl = document.getElementById('dashboard-ku-text');
    if (dashKuEl) dashKuEl.innerText = kuDash;
  }

  // 2. Fungsi Hitung KU buat Modal
  window.calculateKU = function() {
    const tglEvent = document.getElementById('input-tanggal-event');
    const thnLahirInput = document.getElementById('input-tahun-lahir');
    const displayKu = document.getElementById('display-ku');

    if (!window.atletBirthYear) return;
    
    // Langsung tembak tahun lahir ke form modal!
    if (thnLahirInput) thnLahirInput.value = window.atletBirthYear;

    // Kalau Tgl Event belum dipilih, kasih tau user
    if (!tglEvent || !tglEvent.value) {
        if (displayKu) displayKu.value = "Pilih Tgl Event";
        return;
    }
    
    // Hitung kalau Tgl Event udah dipilih
    const ageModal = new Date(tglEvent.value).getFullYear() - window.atletBirthYear;
    let kuModal = ageModal <= 9 ? "KU 5" : ageModal <= 11 ? "KU 4" : ageModal <= 13 ? "KU 3" : ageModal <= 15 ? "KU 2" : ageModal <= 18 ? "KU 1" : "Senior";
    
    if (displayKu) displayKu.value = kuModal;
  };

  // 3. Pasang Trigger & Panggil sekali di awal biar modal siap
  const inputTglEvent = document.getElementById('input-tanggal-event');
  if (inputTglEvent) {
      inputTglEvent.addEventListener('change', window.calculateKU);
  }
  
  // Eksekusi fungsi biar form tahun lahir langsung keisi walau belum buka modal
  window.calculateKU();

  // ==========================================
  // 5. EVENT DELEGATION
  // ==========================================
  document.addEventListener('click', async (e) => {
    if (e.target.closest('#theme-toggle')) {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
    if (e.target.closest('#btn-logout')) {
      if (confirm("Keluar dari aplikasi?")) {
        await supabase.auth.signOut();
        window.location.href = '/index.html';
      }
    }
    if (e.target.closest('#btn-open-modal')) {
      const modalInput = document.getElementById('modal-input');
      if (modalInput) modalInput.classList.remove('hidden');
    }
    if (e.target.closest('#btn-close-modal')) {
      const modalInput = document.getElementById('modal-input');
      if (modalInput) modalInput.classList.add('hidden');
    }
  });

  // ==========================================
  // 6. FETCH HISTORY DATA
  // ==========================================
  const containerHistory = document.getElementById('container-history-list');
  const historyYearFilter = document.getElementById('history-year-filter');
  const currentYearStr = new Date().getFullYear().toString();
  if (historyYearFilter) historyYearFilter.value = currentYearStr;

  window.globalResultsData = []; 
  window.globalEventsData = []; 

  async function loadDataUtama(selectedYear) {
    if (containerHistory) containerHistory.innerHTML = `<div class="text-center py-8"><p class="text-xs text-gray-400">Loading...</p></div>`;

    try {
      const { data: allResults, error: resultsError } = await supabase.from('event_results').select('time_record, rank, category, events (title, event_date)').eq('user_id', user.id);
      if (!resultsError && allResults) {
        window.globalResultsData = allResults; 
        
        let emas = 0, perak = 0, perunggu = 0;
        allResults.forEach(res => {
          if (res.rank === 1) emas++;
          else if (res.rank === 2) perak++;
          else if (res.rank === 3) perunggu++;
        });
        document.getElementById('count-emas').innerText = emas;
        document.getElementById('count-perak').innerText = perak;
        document.getElementById('count-perunggu').innerText = perunggu;

        initTabGrafik('Bebas');
      }

      const { data: events, error: eventError } = await supabase.from('events').select('*, event_results (*)').eq('user_id', user.id).order('event_date', { ascending: false });
      if (eventError) throw eventError;

      window.globalEventsData = events; 

      const filteredEvents = events.filter(ev => ev.event_date.startsWith(selectedYear));
      if (filteredEvents.length === 0) {
        if (containerHistory) containerHistory.innerHTML = `<div class="text-center py-8 text-xs text-gray-500">Belum ada rekor tahun ${selectedYear}.</div>`;
        return;
      }

      let htmlString = '';
      filteredEvents.forEach(ev => {
        const dateStr = new Date(ev.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const results = ev.event_results || [];
        const sortedResults = [...results].sort((a, b) => (a.rank || 99) - (b.rank || 99));

        const top2 = sortedResults.slice(0, 2);
        let top2Html = '';
        top2.forEach(res => {
          let medalIcon = '🏅', bgClass = 'bg-gray-100 dark:bg-gray-800 text-gray-600';
          if (res.rank === 1) { medalIcon = '🥇'; bgClass = 'bg-yellow-500/20 text-yellow-600'; } 
          else if (res.rank === 2) { medalIcon = '🥈'; bgClass = 'bg-gray-400/20 text-gray-400'; } 
          else if (res.rank === 3) { medalIcon = '🥉'; bgClass = 'bg-amber-600/20 text-amber-500'; }
          top2Html += `<span class="${bgClass} border border-current/20 text-[9px] font-bold px-2 py-1 rounded whitespace-nowrap">${medalIcon} Rank ${res.rank || '-'} - ${res.category}</span>`;
        });

        let fullListHtml = '';
        sortedResults.forEach(res => {
          const rankColor = (res.rank <= 3) ? 'text-yellow-600' : 'text-gray-400';
          fullListHtml += `
            <div class="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
              <span class="text-gray-600 dark:text-gray-300 font-medium text-[10px]">${res.category}</span>
              <div class="text-right"><span class="text-brand-red font-mono font-bold text-xs">${res.time_record}</span><span class="${rankColor} ml-2 font-bold text-[10px]">Rank ${res.rank || '-'}</span></div>
            </div>`;
        });

        htmlString += `
          <div class="bg-white dark:bg-brand-card rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-3">
            <div class="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onclick="toggleExpand(this)">
              <div class="flex justify-between items-start mb-3">
                <div>
                  <h4 class="font-bold text-sm text-gray-800 dark:text-white">${ev.title}</h4>
                  <p class="text-[10px] text-gray-500">${ev.level} • ${dateStr}</p>
                </div>
                <div class="flex items-center gap-3">
                  <button type="button" class="text-brand-red hover:text-red-400 transition-colors p-1" onclick="event.stopPropagation(); openEditModal('${ev.id}')" title="Edit Data">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                  <svg class="w-5 h-5 text-gray-400 transform transition-transform icon-expand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">${top2Html || '<span class="text-[9px] text-gray-400">Belum ada data nomor</span>'}</div>
            </div>
            <div class="px-4 pb-4 hidden content-expand">
              <hr class="border-gray-100 dark:border-gray-700 mb-3 mt-1">
              <div class="space-y-2">${fullListHtml}</div>
            </div>
          </div>`;
      });
      if (containerHistory) containerHistory.innerHTML = htmlString;
    } catch (err) {
      console.error(err);
    }
  }

  loadDataUtama(currentYearStr);
  if (historyYearFilter) historyYearFilter.addEventListener('change', (e) => loadDataUtama(e.target.value));

  // ==========================================
  // 7. TAB GRAFIK (TANPA TABEL)
  // ==========================================
  const pillsGaya = document.querySelectorAll('.pill-gaya');
  pillsGaya.forEach(pill => {
    pill.addEventListener('click', (e) => {
      pillsGaya.forEach(p => {
        p.classList.remove('bg-brand-red', 'text-white', 'shadow-md', 'shadow-brand-red/40');
        p.classList.add('bg-gray-100', 'dark:bg-[#1f1a24]', 'text-gray-500', 'dark:text-gray-400', 'border', 'border-gray-200', 'dark:border-gray-700');
      });
      const targetPill = e.target;
      targetPill.classList.remove('bg-gray-100', 'dark:bg-[#1f1a24]', 'text-gray-500', 'dark:text-gray-400', 'border', 'border-gray-200', 'dark:border-gray-700');
      targetPill.classList.add('bg-brand-red', 'text-white', 'shadow-md', 'shadow-brand-red/40');
      initTabGrafik(targetPill.getAttribute('data-style'));
    });
  });

  const selectJarak = document.getElementById('grafik-jarak-filter');
  const selectTahun = document.getElementById('grafik-year-filter');

  function initTabGrafik(styleName) {
    const styleRecords = window.globalResultsData.filter(r => r.category.toLowerCase().includes(styleName.toLowerCase()));
    const uniqueDistances = [...new Set(styleRecords.map(item => item.category))];
    
    if (selectJarak) {
      selectJarak.innerHTML = '';
      if (uniqueDistances.length > 0) {
        uniqueDistances.forEach(dist => selectJarak.innerHTML += `<option value="${dist}">${dist.split(' ')[0]} M</option>`);
        renderChartProgress(uniqueDistances[0], selectTahun.value);
      } else {
        selectJarak.innerHTML = '<option value="">- Kosong -</option>';
        renderChartProgress('', selectTahun.value); 
      }
    }
  }

  if (selectJarak) selectJarak.addEventListener('change', () => renderChartProgress(selectJarak.value, selectTahun.value));
  if (selectTahun) selectTahun.addEventListener('change', () => renderChartProgress(selectJarak.value, selectTahun.value));

  function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length === 4) return (parseInt(parts[0]||0) * 3600) + (parseInt(parts[1]||0) * 60) + parseInt(parts[2]||0) + (parseInt(parts[3]||0) / 100);
    return 0;
  }

  function renderChartProgress(specificCategory, targetYearStr) {
    const ctx = document.getElementById('prestasiChart');
    
    // BUG FIXED: Hapus pengecekan !window.Chart karena module vite gak nyimpen Chart di window global
    if (!ctx) return; 
    
    if (!specificCategory) { 
      if (window.myProgressChart) window.myProgressChart.destroy(); 
      return; 
    }

    // 1. Set Tahun Berjalan & Tahun Lalu
    const targetYear = parseInt(targetYearStr) || new Date().getFullYear();
    const lastYear = targetYear - 1;
    
    const catRecords = window.globalResultsData.filter(r => r.category === specificCategory && r.events);

    // Fungsi narik waktu tercepat tiap bulan
    const getMonthlyBest = (year) => {
      const monthly = new Array(12).fill(null);
      catRecords.forEach(r => {
        const d = new Date(r.events.event_date);
        if (d.getFullYear() === year) {
          const monthIdx = d.getMonth();
          const secs = timeToSeconds(r.time_record);
          // Ambil waktu paling kecil (tercepat) di bulan tersebut
          if (monthly[monthIdx] === null || secs < monthly[monthIdx]) {
            monthly[monthIdx] = secs;
          }
        }
      });
      return monthly;
    };

    // Bersihkan chart lama sebelum render baru
    if (window.myProgressChart) window.myProgressChart.destroy();

    // 2. Render Chart Baru
    window.myProgressChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'],
        datasets: [
          { 
            label: `Tahun ${targetYear} (Berjalan)`, 
            data: getMonthlyBest(targetYear), 
            borderColor: '#ff4d4d', 
            borderWidth: 3, 
            pointBackgroundColor: '#ff4d4d', 
            pointRadius: 5, 
            tension: 0.3,
            spanGaps: true // Biar garis grafiknya nyambung meski ada bulan yg kosong
          },
          { 
            label: `Tahun ${lastYear} (Lalu)`, 
            data: getMonthlyBest(lastYear), 
            borderColor: '#6b7280', 
            borderWidth: 2, 
            pointBackgroundColor: '#6b7280', 
            pointRadius: 3,
            borderDash: [5, 5], // Garis putus-putus biar beda sama tahun berjalan
            tension: 0.3,
            spanGaps: true
          },
          { 
            label: 'Limit KU', 
            data: new Array(12).fill(28.5), // Boleh di-dinamiskan nanti kalau udah ada DB limit KU
            borderColor: '#eab308', 
            borderWidth: 2, 
            borderDash: [2, 2], 
            pointRadius: 0, 
            fill: false 
          }
        ]
      },
      options: {
        responsive: true, 
        maintainAspectRatio: false, 
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false } },
        scales: { 
          y: { 
            reverse: true, // WAJIB! Biar waktu paling kecil (tercepat) posisinya di atas
            grid: { color: 'rgba(75, 85, 99, 0.2)', drawBorder: false }, 
            ticks: { color: '#9ca3af', stepSize: 2 } 
          },
          x: { 
            grid: { display: false, drawBorder: false }, 
            ticks: { color: '#9ca3af', font: { size: 10 } } 
          }
        }
      }
    });
  }

  // ==========================================
  // 8. LOGIC MODAL (ADD / EDIT & UPSERT DATA)
  // ==========================================
  const modalElem = document.getElementById('modal-input');
  const modalInner = document.getElementById('modal-inner');
  
  function toggleModal() {
    if (modalElem.classList.contains('hidden')) {
      modalElem.classList.remove('hidden');
      setTimeout(() => modalInner.classList.remove('opacity-0', 'translate-y-10'), 10);
    } else {
      modalInner.classList.add('opacity-0', 'translate-y-10');
      setTimeout(() => modalElem.classList.add('hidden'), 300);
    }
  }

  document.getElementById('btn-close-modal').addEventListener('click', toggleModal);

  document.getElementById('btn-open-modal').addEventListener('click', () => {
    document.getElementById('modal-input-mode').value = ''; 
    document.getElementById('modal-title').innerText = 'INPUT DATA KEJUARAAN';
    
    document.getElementById('input-event-name').value = '';
    document.getElementById('input-event-level').value = 'Pilih Tingkat';
    document.getElementById('input-tanggal-event').value = '';
    if(document.getElementById('display-ku')) document.getElementById('display-ku').value = '';
    
    document.getElementById('container-nomor-lomba').innerHTML = '';
    document.getElementById('btn-add-nomor').click(); 
    
    toggleModal();
  });

  window.openEditModal = function(eventId) {
    const ev = window.globalEventsData.find(e => e.id === eventId);
    if (!ev) return;

    document.getElementById('modal-input-mode').value = eventId;
    document.getElementById('modal-title').innerText = "EDIT DATA KEJUARAAN";

    document.getElementById('input-event-name').value = ev.title;
    document.getElementById('input-event-level').value = ev.level;
    document.getElementById('input-tanggal-event').value = ev.event_date;
    if(window.calculateKU) window.calculateKU(); 

    const container = document.getElementById('container-nomor-lomba');
    container.innerHTML = ''; 

    if (ev.event_results && ev.event_results.length > 0) {
      ev.event_results.forEach(res => {
        const newRow = document.createElement('div');
        newRow.className = 'row-lomba grid grid-cols-12 gap-1 items-center transition-opacity duration-300';
        newRow.innerHTML = `
          <div class="col-span-5">
              ${(function(){
                let opts = '<option value="" disabled>Pilih Nomor</option>';
                if (window.masterCategories && window.masterCategories.length > 0) {
                  window.masterCategories.forEach(cat => opts += `<option value="${cat.name}" ${res.category === cat.name ? 'selected' : ''}>${cat.name}</option>`);
                }
                return `<select class="input-kategori w-full px-2 py-1.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none appearance-none cursor-pointer">${opts}</select>`;
              })()}
          </div>
          <div class="col-span-4 relative flex items-center justify-center">
            <input type="text" value="${res.time_record}" placeholder="00:00:00:00" class="time-input w-full px-1 py-1.5 text-center bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs font-mono focus:border-brand-red outline-none pr-5">
            <button type="button" onclick="openStopwatch(this)" class="absolute right-1 text-brand-red hover:text-red-700">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
          </div>
          <div class="col-span-2">
            <input type="number" value="${res.rank || ''}" placeholder="-" class="w-full px-1 py-1.5 text-center bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none">
          </div>
          <div class="col-span-1 flex justify-center">
            <button type="button" class="text-gray-400 hover:text-brand-red" onclick="this.closest('.row-lomba').remove()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        `;
        container.appendChild(newRow);
      });
    } else {
      document.getElementById('btn-add-nomor').click(); 
    }
    
    toggleModal();
  };

  document.getElementById('btn-add-nomor').addEventListener('click', () => {
    const newRow = document.createElement('div');
    newRow.className = 'row-lomba grid grid-cols-12 gap-1 items-center opacity-0 transition-opacity duration-300';
    newRow.innerHTML = `
      ${(function(){
        let opts = '<option value="" disabled selected>Pilih Nomor</option>';
        if (window.masterCategories && window.masterCategories.length > 0) {
          window.masterCategories.forEach(cat => opts += `<option value="${cat.name}">${cat.name}</option>`);
        }
        return `<div class="col-span-5"><select class="input-kategori w-full px-2 py-1.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none appearance-none cursor-pointer">${opts}</select></div>`;
      })()} 
      <div class="col-span-4 relative flex items-center justify-center">
        <input type="text" placeholder="00:00:00:00" class="time-input w-full px-1 py-1.5 text-center bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs font-mono focus:border-brand-red outline-none pr-5">
        <button type="button" onclick="openStopwatch(this)" class="absolute right-1 text-brand-red hover:text-red-700"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></button>
      </div>
      <div class="col-span-2"><input type="number" placeholder="-" class="w-full px-1 py-1.5 text-center bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none"></div>
      <div class="col-span-1 flex justify-center"><button type="button" class="text-gray-400 hover:text-brand-red" onclick="this.closest('.row-lomba').remove()"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div>
    `;
    document.getElementById('container-nomor-lomba').appendChild(newRow);
    setTimeout(() => newRow.classList.remove('opacity-0'), 10);
  });

  const btnSaveEvent = document.getElementById('btn-save-event');
  if (btnSaveEvent) {
    btnSaveEvent.addEventListener('click', async () => {
      const title = document.getElementById('input-event-name').value.trim();
      const level = document.getElementById('input-event-level').value;
      const eventDate = document.getElementById('input-tanggal-event').value;

      if (!title || level === 'Pilih Tingkat' || !eventDate) return alert('Lengkapi Nama Event, Tingkat, & Tanggal!');

      btnSaveEvent.innerText = "Menyimpan...";
      btnSaveEvent.disabled = true;

      try {
        const editId = document.getElementById('modal-input-mode').value;
        let activeEventId = editId;

        if (editId) {
          const { error: eventError } = await supabase.from('events').update({ title, level, event_date: eventDate }).eq('id', editId);
          if (eventError) throw eventError;
          await supabase.from('event_results').delete().eq('event_id', editId); 
        } else {
          const { data: eventData, error: eventError } = await supabase.from('events').insert([{ user_id: user.id, title, level, event_date: eventDate }]).select().single();
          if (eventError) throw eventError;
          activeEventId = eventData.id;
        }

        const resultsToInsert = [];
        document.querySelectorAll('.row-lomba').forEach(row => {
          const category = row.querySelector('.input-kategori').value.trim();
          const timeRecord = row.querySelector('.time-input').value.trim();
          const rank = row.querySelector('input[type="number"]').value;
          if (category !== '' && timeRecord && timeRecord !== '00:00:00:00') {
            resultsToInsert.push({ event_id: activeEventId, user_id: user.id, category, time_record: timeRecord, rank: rank ? parseInt(rank) : null });
          }
        });

        if (resultsToInsert.length > 0) await supabase.from('event_results').insert(resultsToInsert);
        
        alert(editId ? 'Data Kejuaraan Berhasil Diperbarui!' : 'Data Kejuaraan Berhasil Disimpan!');
        window.location.reload();
      } catch (err) {
        alert('Gagal menyimpan: ' + err.message);
        btnSaveEvent.innerText = "Simpan Semua Data";
        btnSaveEvent.disabled = false;
      }
    });
  }
}); 

// ==========================================
// 9. FUNGSI UMUM WINDOW 
// ==========================================
document.addEventListener('input', (e) => {
  if (e.target.classList.contains('time-input')) {
    let val = e.target.value.replace(/\D/g, ''); 
    e.target.value = (val.match(/.{1,2}/g)?.join(':') || '').substring(0, 11);
  }
});

window.toggleExpand = function(element) {
  const content = element.parentElement.querySelector('.content-expand');
  const icon = element.querySelector('.icon-expand');
  if (content.classList.contains('hidden')) { content.classList.remove('hidden'); icon.classList.add('rotate-180'); }
  else { content.classList.add('hidden'); icon.classList.remove('rotate-180'); }
};

let swInterval=null, swStartTime=0, swElapsedTime=0, swIsRunning=false, activeInputField=null;
window.openStopwatch = function(btnElement) {
  activeInputField = btnElement.previousElementSibling; 
  document.getElementById('modal-stopwatch').classList.remove('hidden');
  setTimeout(() => document.getElementById('modal-stopwatch').classList.remove('opacity-0'), 10);
};
window.closeStopwatch = function() {
  if (swIsRunning) window.toggleStopwatch(); 
  document.getElementById('modal-stopwatch').classList.add('opacity-0');
  setTimeout(() => document.getElementById('modal-stopwatch').classList.add('hidden'), 300);
};
function updateDisplay() {
  const d = new Date(swElapsedTime + (Date.now() - swStartTime));
  document.getElementById('sw-display').innerText = `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}:${String(d.getUTCSeconds()).padStart(2,'0')}:${String(Math.floor(d.getUTCMilliseconds()/10)).padStart(2,'0')}`;
}
window.toggleStopwatch = function() {
  const btnStart = document.getElementById('sw-btn-start'), btnSave = document.getElementById('sw-btn-save');
  if (!swIsRunning) {
    swIsRunning = true; swStartTime = Date.now(); swInterval = setInterval(updateDisplay, 10);
    btnStart.innerText = "STOP"; btnStart.className = "w-24 h-24 rounded-full bg-gray-800 text-white font-bold text-xl flex items-center justify-center animate-pulse";
    btnSave.classList.add('opacity-50', 'pointer-events-none');
  } else {
    swIsRunning = false; clearInterval(swInterval); swElapsedTime += Date.now() - swStartTime;
    btnStart.innerText = "RESUME"; btnStart.className = "w-24 h-24 rounded-full bg-brand-red text-white font-bold text-xl flex items-center justify-center";
    btnSave.classList.remove('opacity-50', 'pointer-events-none');
  }
};
window.resetStopwatch = function() {
  clearInterval(swInterval); swIsRunning = false; swElapsedTime = 0; document.getElementById('sw-display').innerText = "00:00:00:00";
  const btnStart = document.getElementById('sw-btn-start'); btnStart.innerText = "START"; btnStart.className = "w-24 h-24 rounded-full bg-brand-red text-white font-bold text-xl flex items-center justify-center";
  document.getElementById('sw-btn-save').classList.add('opacity-50', 'pointer-events-none');
};
window.saveStopwatch = function() {
  if (activeInputField) activeInputField.value = document.getElementById('sw-display').innerText;
  window.closeStopwatch(); window.resetStopwatch(); 
};