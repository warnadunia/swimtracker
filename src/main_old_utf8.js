import './style.css';
import Chart from 'chart.js/auto';
import { supabase } from './supabase';

document.addEventListener('DOMContentLoaded', async () => {
  
  // ==========================================
  // 1. CEK SESI & RENDER BIODATA
  // ==========================================
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/auth.html';
    return;
  }

  const user = session.user;
  const fullName = user.user_metadata.full_name || 'Atlet';
  const birthYear = user.user_metadata.birth_year || new Date().getFullYear();

  const elName = document.querySelector('#tab-history h2');
  if (elName) elName.innerText = fullName;

  const elAvatar = document.querySelector('#tab-history img');
  if (elAvatar) elAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=ff4d4d&color=fff&bold=true`;

  const inputThnLahirModal = document.getElementById('input-tahun-lahir');
  if (inputThnLahirModal) {
    inputThnLahirModal.value = birthYear;
    inputThnLahirModal.readOnly = true; 
    inputThnLahirModal.classList.add('cursor-not-allowed', 'bg-gray-200', 'dark:bg-gray-800');
  }

  window.calculateKU = function() {
    const tglEvent = document.getElementById('input-tanggal-event');
    const displayKu = document.getElementById('display-ku');
    if (tglEvent && tglEvent.value) {
      const eventYear = new Date(tglEvent.value).getFullYear();
      const age = eventYear - birthYear;
      let ku = "";
      if (age <= 9) ku = "KU 5 (<= 9 Thn)";
      else if (age <= 11) ku = "KU 4 (10-11 Thn)";
      else if (age <= 13) ku = "KU 3 (12-13 Thn)";
      else if (age <= 15) ku = "KU 2 (14-15 Thn)";
      else if (age <= 18) ku = "KU 1 (16-18 Thn)";
      else ku = "Senior (> 18 Thn)";
      if (displayKu) displayKu.value = ku;
    }
  }
  const tglEventElem = document.getElementById('input-tanggal-event');
  if (tglEventElem) tglEventElem.addEventListener('change', window.calculateKU);

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (confirm("Apakah Anda yakin ingin keluar?")) {
        await supabase.auth.signOut();
        window.location.href = '/auth.html';
      }
    });
  }

  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', () => document.documentElement.classList.toggle('dark'));


  // ==========================================
  // 2. LOGIC FETCHING HISTORY & MEDALI
  // ==========================================
  const containerHistory = document.getElementById('container-history-list');
  const historyYearFilter = document.getElementById('history-year-filter');
  const currentYearStr = new Date().getFullYear().toString();
  if (historyYearFilter) historyYearFilter.value = currentYearStr;

  window.globalResultsData = []; 
  window.globalEventsData = []; // Simpan data event untuk fitur Edit

  async function loadDataUtama(selectedYear) {
    if (containerHistory) containerHistory.innerHTML = `<div class="text-center py-8"><p class="text-xs text-gray-400">≡ƒöä Loading...</p></div>`;

    try {
      // AMBIL SELURUH DATA RESULT
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

      // AMBIL DATA EVENT
      const { data: events, error: eventError } = await supabase.from('events').select('*, event_results (*)').eq('user_id', user.id).order('event_date', { ascending: false });
      if (eventError) throw eventError;

      window.globalEventsData = events; // Simpan untuk Edit Modal

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
          let medalIcon = '≡ƒÄû∩╕Å', bgClass = 'bg-gray-100 dark:bg-gray-800 text-gray-600';
          if (res.rank === 1) { medalIcon = '≡ƒÑç'; bgClass = 'bg-yellow-500/20 text-yellow-600'; } 
          else if (res.rank === 2) { medalIcon = '≡ƒÑê'; bgClass = 'bg-gray-400/20 text-gray-400'; } 
          else if (res.rank === 3) { medalIcon = '≡ƒÑë'; bgClass = 'bg-amber-600/20 text-amber-500'; }
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

        // HTML CARD HISTORY DENGAN TOMBOL EDIT PENSIL
        htmlString += `
          <div class="bg-white dark:bg-brand-card rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-3">
            <div class="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onclick="toggleExpand(this)">
              <div class="flex justify-between items-start mb-3">
                <div>
                  <h4 class="font-bold text-sm text-gray-800 dark:text-white">${ev.title}</h4>
                  <p class="text-[10px] text-gray-500">${ev.level} ΓÇó ${dateStr}</p>
                </div>
                <div class="flex items-center gap-3">
                  <!-- TOMBOL EDIT -->
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
  // 3. LOGIC TAB GRAFIK 
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
    const tbody = document.getElementById('table-grafik-body');
    if (!tbody) return;
    
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

    tbody.innerHTML = '';
    const sortedStyleRecords = styleRecords.sort((a, b) => new Date(b.events.event_date) - new Date(a.events.event_date));
    
    if (sortedStyleRecords.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-xs text-gray-500">Belum ada data untuk Gaya ${styleName}</td></tr>`;
      return;
    }

    sortedStyleRecords.forEach(item => {
      const secs = timeToSeconds(item.time_record);
      let statusHtml = '';
      if (secs > 0 && secs < 28.5) statusHtml = `<span class="text-[9px] font-bold text-green-600 border border-green-500/30 bg-green-500/10 px-2 py-1 rounded-full uppercase">Lolos Limit</span>`;
      else if (secs > 0) {
        const diff = (secs - 28.5).toFixed(2);
        statusHtml = `<span class="text-[9px] font-bold text-gray-500 border border-gray-600 bg-gray-800 px-2 py-1 rounded-full">+${diff}s</span>`;
      } else statusHtml = `-`;

      const jarakSingkat = item.category.replace(' Gaya ', ' ');

      tbody.innerHTML += `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/40">
          <td class="px-4 py-3 font-bold text-gray-800 dark:text-gray-200 text-[11px]">${jarakSingkat}</td>
          <td class="px-4 py-3 text-center"><span class="font-mono font-bold text-brand-red border border-brand-red/30 bg-brand-red/10 px-2 py-1 rounded text-[10px]">${item.time_record}</span></td>
          <td class="px-4 py-3 text-center">${statusHtml}</td>
          <td class="px-4 py-3 text-gray-500 dark:text-gray-400 leading-tight text-[10px] max-w-[100px] truncate">${item.events.title}</td>
        </tr>`;
    });
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
    if (!ctx || !window.Chart) return;
    if (!specificCategory) { if (window.myProgressChart) window.myProgressChart.destroy(); return; }

    const targetYear = parseInt(targetYearStr);
    const lastYear = targetYear - 1;
    const catRecords = window.globalResultsData.filter(r => r.category === specificCategory && r.events);

    const getMonthlyBest = (year) => {
      const monthly = new Array(12).fill(null);
      catRecords.forEach(r => {
        const d = new Date(r.events.event_date);
        if (d.getFullYear() === year) {
          const monthIdx = d.getMonth();
          const secs = timeToSeconds(r.time_record);
          if (monthly[monthIdx] === null || secs < monthly[monthIdx]) monthly[monthIdx] = secs;
        }
      });
      return monthly;
    };

    if (window.myProgressChart) window.myProgressChart.destroy();

    window.myProgressChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'],
        datasets: [
          { label: `Tahun ${targetYear}`, data: getMonthlyBest(targetYear), borderColor: '#ff4d4d', borderWidth: 3, pointBackgroundColor: '#ff4d4d', pointRadius: 4, tension: 0.3 },
          { label: `Tahun ${lastYear}`, data: getMonthlyBest(lastYear), borderColor: '#6b7280', borderWidth: 2, pointRadius: 0, tension: 0.3 },
          { label: 'Limit KU', data: new Array(12).fill(28.5), borderColor: '#eab308', borderWidth: 2, borderDash: [4, 4], pointRadius: 0, fill: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false } },
        scales: { 
          y: { reverse: true, grid: { color: 'rgba(75, 85, 99, 0.2)', drawBorder: false }, ticks: { color: '#9ca3af', stepSize: 2 } },
          x: { grid: { display: false, drawBorder: false }, ticks: { color: '#9ca3af', font: { size: 10 } } }
        }
      }
    });
  }

  // ==========================================
  // 4. LOGIC MODAL (ADD / EDIT & UPSERT DATA)
  // ==========================================
  const modal = document.getElementById('modal-input');
  const modalInner = document.getElementById('modal-inner');
  
  function toggleModal() {
    if (modal.classList.contains('hidden')) {
      modal.classList.remove('hidden');
      setTimeout(() => modalInner.classList.remove('opacity-0', 'translate-y-10'), 10);
    } else {
      modalInner.classList.add('opacity-0', 'translate-y-10');
      setTimeout(() => modal.classList.add('hidden'), 300);
    }
  }

  document.getElementById('btn-close-modal').addEventListener('click', toggleModal);

  // LOGIC TOMBOL FAB (BUAT EVENT BARU)
  document.getElementById('btn-open-modal').addEventListener('click', () => {
    document.getElementById('modal-input-mode').value = ''; 
    document.getElementById('modal-title').innerText = 'INPUT DATA KEJUARAAN';
    
    // Kosongkan form
    document.getElementById('input-event-name').value = '';
    document.getElementById('input-event-level').value = 'Pilih Tingkat';
    document.getElementById('input-tanggal-event').value = '';
    if(document.getElementById('display-ku')) document.getElementById('display-ku').value = '';
    
    // Reset baris nomor jadi 1 baris kosong
    document.getElementById('container-nomor-lomba').innerHTML = '';
    document.getElementById('btn-add-nomor').click(); 
    
    toggleModal();
  });

  // LOGIC TOMBOL PENSIL (EDIT EVENT)
  window.openEditModal = function(eventId) {
    const ev = window.globalEventsData.find(e => e.id === eventId);
    if (!ev) return;

    // Set Mode Edit
    document.getElementById('modal-input-mode').value = eventId;
    document.getElementById('modal-title').innerText = "EDIT DATA KEJUARAAN";

    // Isi Form Umum
    document.getElementById('input-event-name').value = ev.title;
    document.getElementById('input-event-level').value = ev.level;
    document.getElementById('input-tanggal-event').value = ev.event_date;
    window.calculateKU(); 

    // Isi Baris Nomor dari Database
    const container = document.getElementById('container-nomor-lomba');
    container.innerHTML = ''; // Bersihkan dulu

    if (ev.event_results && ev.event_results.length > 0) {
      ev.event_results.forEach(res => {
        const newRow = document.createElement('div');
        newRow.className = 'row-lomba grid grid-cols-12 gap-1 items-center transition-opacity duration-300';
        newRow.innerHTML = `
          <div class="col-span-5">
            <input type="text" list="list-nomor-renang" value="${res.category}" placeholder="Ketik/Pilih Nomor" class="input-kategori w-full px-2 py-1.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none">
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
      document.getElementById('btn-add-nomor').click(); // Jika event kosong, beri 1 baris
    }
    
    toggleModal();
  };

  document.getElementById('btn-add-nomor').addEventListener('click', () => {
    const newRow = document.createElement('div');
    newRow.className = 'row-lomba grid grid-cols-12 gap-1 items-center opacity-0 transition-opacity duration-300';
    newRow.innerHTML = `
      <div class="col-span-5"><input type="text" list="list-nomor-renang" placeholder="Ketik/Pilih Nomor" class="input-kategori w-full px-2 py-1.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none"></div>
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

  // LOGIC SIMPAN (INSERT BARU / UPDATE)
  const btnSaveEvent = document.getElementById('btn-save-event');
  if (btnSaveEvent) {
    btnSaveEvent.addEventListener('click', async () => {
      const title = document.getElementById('input-event-name').value.trim();
      const level = document.getElementById('input-event-level').value;
      const eventDate = document.getElementById('input-tanggal-event').value;

      if (!title || level === 'Pilih Tingkat' || !eventDate) return alert('Lengkapi Nama Event, Tingkat, & Tanggal!');

      btnSaveEvent.innerText = "ΓÅ│ Menyimpan...";
      btnSaveEvent.disabled = true;

      try {
        const editId = document.getElementById('modal-input-mode').value;
        let activeEventId = editId;

        // 1. UPDATE / INSERT DATA EVENT
        if (editId) {
          // Mode Update
          const { error: eventError } = await supabase.from('events').update({ title, level, event_date: eventDate }).eq('id', editId);
          if (eventError) throw eventError;
          // Sapu bersih nomor lama agar tidak duplicate atau pusing deteksi mana yg dihapus/diubah
          await supabase.from('event_results').delete().eq('event_id', editId); 
        } else {
          // Mode Insert
          const { data: eventData, error: eventError } = await supabase.from('events').insert([{ user_id: user.id, title, level, event_date: eventDate }]).select().single();
          if (eventError) throw eventError;
          activeEventId = eventData.id;
        }

        // 2. INSERT NOMOR LOMBA (Dari Form yang aktif)
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
        
        alert(editId ? '≡ƒÄë Data Kejuaraan Berhasil Diperbarui!' : '≡ƒÄë Data Kejuaraan Berhasil Disimpan!');
        window.location.reload();
      } catch (err) {
        alert('Gagal menyimpan: ' + err.message);
        btnSaveEvent.innerText = "≡ƒÆ╛ Simpan Semua Data";
        btnSaveEvent.disabled = false;
      }
    });
  }
}); // END DOMContentLoaded

// ==========================================
// FUNGSI UMUM WINDOW (Auto Mask, Tabs, Stopwatch, Expand)
// ==========================================
document.addEventListener('input', (e) => {
  if (e.target.classList.contains('time-input')) {
    let val = e.target.value.replace(/\D/g, ''); 
    e.target.value = (val.match(/.{1,2}/g)?.join(':') || '').substring(0, 11);
  }
});

window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.replace('block', 'hidden'));
  document.getElementById(tabId).classList.replace('hidden', 'block');
  const navButtons = document.querySelectorAll('nav button');
  navButtons.forEach(btn => { btn.classList.remove('text-brand-red'); btn.classList.add('text-gray-400'); });
  const activeBtn = document.querySelector(`nav button[onclick="switchTab('${tabId}')"]`);
  if (activeBtn) { activeBtn.classList.remove('text-gray-400'); activeBtn.classList.add('text-brand-red'); }
};

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
