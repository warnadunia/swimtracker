import { supabase } from './supabase';

document.addEventListener('DOMContentLoaded', () => {
  const configData = localStorage.getItem('active_tt_config');
  if (!configData) {
    alert('Konfigurasi tidak ditemukan! Kembali ke dashboard.');
    window.location.replace('/coach_app.html');
    return; 
  }
  
  const ttConfig = JSON.parse(configData);

  const titleEl = document.getElementById('view-tt-title');
  const metaEl = document.getElementById('view-tt-meta');
  if (titleEl) titleEl.innerText = ttConfig.title;
  if (metaEl) metaEl.innerText = `${ttConfig.distance}M (Kolam ${ttConfig.pool}M) • ${ttConfig.sets} Set • ${ttConfig.athletes.length} Atlet`;

  const display = document.getElementById('sw-display');
  const btnMain = document.getElementById('sw-btn-main'); // <-- Tombol Tunggal Baru
  const btnReset = document.getElementById('sw-btn-reset');
  const btnSave = document.getElementById('btn-save-tt');
  const btnAbort = document.getElementById('btn-abort-tt');
  const logContainer = document.getElementById('split-records-log');
  
  const bottomSheet = document.getElementById('bottom-sheet-atlet');
  const sheetTimeLabel = document.getElementById('target-split-time-label');
  const sheetAtletList = document.getElementById('sheet-atlet-list');

  // STATE STOPWATCH 
  let startTime = 0;
  let elapsedTime = 0;
  let timerInterval = null;
  let isRunning = false;
  let recordedSplits = []; 
  let currentActiveSplitIndex = null; 

  // VARIABEL LOGIKA TOMBOL & SET
  const totalAthletes = ttConfig.athletes.length;
  const totalSets = ttConfig.sets;
  let currentSet = 1;
  let lapPressCount = 0; 

  function formatTime(ms) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const min = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const sec = (totalSeconds % 60).toString().padStart(2, '0');
    const centi = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${min}:${sec}.${centi}`;
  }

  function updateDisplay() {
    elapsedTime = performance.now() - startTime;
    display.innerText = formatTime(elapsedTime);
  }

  function updateMainButtonUI() {
    const nextAthlete = lapPressCount + 1;
    if (currentSet === totalSets) {
      btnMain.innerText = `FINISH (${nextAthlete}/${totalAthletes})`;
      btnMain.className = 'flex-1 h-16 rounded-2xl bg-brand-red text-white font-bold text-lg sm:text-xl shadow-[0_0_30px_rgba(255,77,77,0.4)] flex items-center justify-center active:scale-95 transition-all select-none border border-red-400';
    } else {
      btnMain.innerText = `LAP (${nextAthlete}/${totalAthletes})`;
      btnMain.className = 'flex-1 h-16 rounded-2xl bg-emerald-600 text-white font-bold text-lg sm:text-xl shadow-[0_0_30px_rgba(5,150,105,0.4)] flex items-center justify-center active:scale-95 transition-all select-none';
    }
  }

  // --- ENGINE TOMBOL UTAMA (ONE-BUTTON TO RULE THEM ALL) ---
  if (btnMain) {
    btnMain.addEventListener('click', () => {
      // 1. KONDISI AWAL: START STOPWATCH
      if (!isRunning && currentSet === 1 && lapPressCount === 0) {
        isRunning = true;
        startTime = performance.now();
        timerInterval = requestAnimationFrame(function run() {
          if (!isRunning) return;
          updateDisplay();
          timerInterval = requestAnimationFrame(run);
        });
        
        btnReset.classList.add('opacity-50', 'pointer-events-none');
        updateMainButtonUI();
        
      // 2. KONDISI BERJALAN: RECORD WAKTU LAP/FINISH
      } else if (isRunning) {
        const currentStamp = elapsedTime;
        const formattedStamp = formatTime(currentStamp);
        
        // Simpan Record ke Array (Sertakan Info Set)
        recordedSplits.push({
          time_ms: currentStamp,
          time_string: formattedStamp,
          user_id: null, 
          athlete_name: 'Menunggu pilihan...',
          set_number: currentSet // Penting untuk validasi duplikat nanti
        });

        const newIndex = recordedSplits.length - 1;

        // Render Judul Set/Lap jika ini pencetan pertama di set tersebut
        if (lapPressCount === 0) {
          const headerLap = document.createElement('div');
          if (currentSet === totalSets) {
            headerLap.className = 'text-[10px] font-bold text-brand-red tracking-widest uppercase mt-4 mb-2 pl-2 border-l-2 border-brand-red';
            headerLap.innerText = `LAP TERAKHIR (FINISH)`;
          } else {
            headerLap.className = 'text-[10px] font-bold text-emerald-500 tracking-widest uppercase mt-4 mb-2 pl-2 border-l-2 border-emerald-500';
            headerLap.innerText = `LAP ${currentSet} DARI ${totalSets}`;
          }
          logContainer.appendChild(headerLap);
        }

        // Render Baris Waktu
        const logRow = document.createElement('div');
        logRow.id = `split-row-${newIndex}`;
        logRow.className = 'flex justify-between items-center bg-zinc-900 p-3 rounded-xl border border-zinc-800 transition-all mb-2';
        logRow.innerHTML = `
          <div class="flex items-center gap-3">
            <span class="text-xs font-bold text-zinc-600 font-mono">#${lapPressCount + 1}</span>
            <span class="font-mono text-sm font-bold text-white tracking-wider">${formattedStamp}</span>
          </div>
          <button onclick="window.openAthletePicker(${newIndex})" class="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-brand-red font-bold truncate max-w-[150px]" id="btn-assign-${newIndex}">
            ⚡ Pilih Atlet
          </button>
        `;
        logContainer.appendChild(logRow);
        logContainer.scrollTop = logContainer.scrollHeight;

        // Update Hitungan
        lapPressCount++;

        // Jika semua atlet di set ini sudah nyentuh finish
        if (lapPressCount >= totalAthletes) {
          currentSet++;
          lapPressCount = 0; // Reset counter buat putaran selanjutnya
        }

        // 3. KONDISI AKHIR: SEMUA SET SELESAI -> AUTO STOP
        if (currentSet > totalSets) {
          isRunning = false;
          cancelAnimationFrame(timerInterval);
          
          btnMain.innerText = 'LATIHAN SELESAI';
          btnMain.className = 'flex-1 h-16 rounded-2xl bg-zinc-800 text-zinc-500 font-bold text-lg sm:text-xl flex items-center justify-center transition-all select-none pointer-events-none';
          
          btnReset.classList.remove('opacity-50', 'pointer-events-none');
          btnSave.classList.remove('opacity-50', 'pointer-events-none');
          
          if (window.showToast) window.showToast('Time Trial Selesai! Hentikan pergerakan.', 'success');
        } else {
          // Update tombol untuk next lap/finish
          updateMainButtonUI();
        }
      }
    });
  }

  // --- ENGINE TOMBOL RESET ---
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (isRunning) return;
      if (!confirm('Reset seluruh hitungan waktu ke 0?')) return;
      
      elapsedTime = 0;
      display.innerText = '00:00.00';
      recordedSplits = [];
      logContainer.innerHTML = '';
      
      // Reset State Full
      currentSet = 1;
      lapPressCount = 0;
      
      btnMain.innerText = 'START';
      btnMain.className = 'flex-1 h-16 rounded-2xl bg-brand-red text-white font-bold text-lg sm:text-xl shadow-[0_0_40px_rgba(255,77,77,0.4)] flex items-center justify-center active:scale-95 transition-all select-none';
      btnMain.classList.remove('pointer-events-none');
      
      btnSave.classList.add('opacity-50', 'pointer-events-none');
    });
  }

  if (btnAbort) {
    btnAbort.addEventListener('click', () => {
      if (confirm('Batalkan latihan ini? Data waktu akan hilang.')) {
        localStorage.removeItem('active_tt_config');
        window.location.replace('/coach_app.html');
      }
    });
  }

  // --- LOGIKA BOTTOM SHEET (CEGAH ATLET GANDA) ---
  window.openAthletePicker = function(index) {
    currentActiveSplitIndex = index;
    const targetSplit = recordedSplits[index];
    sheetTimeLabel.innerText = targetSplit.time_string;

    // Cari ID atlet yang SUDAH dipilih di set yang SAMA
    const assignedIdsInThisSet = recordedSplits
      .filter((s, i) => s.set_number === targetSplit.set_number && i !== index && s.user_id !== null)
      .map(s => s.user_id);

    sheetAtletList.innerHTML = ttConfig.athletes.map(atlet => {
      const isAlreadyPicked = assignedIdsInThisSet.includes(atlet.id);
      
      if (isAlreadyPicked) {
        return `
          <button class="w-full py-3 px-4 mb-2 bg-zinc-900 rounded-xl text-left text-sm font-bold text-zinc-600 cursor-not-allowed flex justify-between items-center" disabled>
            <span class="line-through">${atlet.name}</span>
            <span class="text-[10px] text-brand-red">SUDAH DIPILIH</span>
          </button>
        `;
      } else {
        return `
          <button class="w-full py-3 px-4 mb-2 bg-zinc-800 hover:bg-zinc-700 active:bg-brand-red rounded-xl text-left text-sm font-bold text-white transition-colors flex justify-between items-center" 
                  onclick="window.selectAthleteForSplit('${atlet.id}', '${atlet.name}')">
            <span>${atlet.name}</span>
            <svg class="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        `;
      }
    }).join('');

    bottomSheet.classList.remove('pointer-events-none', 'opacity-0');
    bottomSheet.querySelector('div').classList.remove('translate-y-full');
  };

  window.closeAthletePicker = function() {
    bottomSheet.classList.add('pointer-events-none', 'opacity-0');
    bottomSheet.querySelector('div').classList.add('translate-y-full');
  };

  window.selectAthleteForSplit = function(id, name) {
    if (currentActiveSplitIndex === null) return;
    recordedSplits[currentActiveSplitIndex].user_id = id;
    recordedSplits[currentActiveSplitIndex].athlete_name = name;

    const btnAssign = document.getElementById(`btn-assign-${currentActiveSplitIndex}`);
    if (btnAssign) {
      btnAssign.innerText = name;
      btnAssign.classList.replace('text-brand-red', 'text-emerald-400');
      btnAssign.classList.replace('bg-zinc-800', 'bg-emerald-950/40');
      btnAssign.classList.remove('border-zinc-700');
      btnAssign.classList.add('border-emerald-900/50');
    }
    window.closeAthletePicker();
  };

  // --- PROSES SIMPAN HASIL KE SUPABASE ---
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const unassignedExist = recordedSplits.some(s => s.user_id === null);
      if (unassignedExist) {
        if (window.showToast) window.showToast('Masih ada record yang belum dipilih nama atletnya!', 'error');
        return;
      }
      if (recordedSplits.length === 0) return;

      try {
        btnSave.innerText = 'Mengirim...';
        btnSave.classList.add('pointer-events-none', 'opacity-50');

        const inserts = recordedSplits.map(split => ({
          profile_id: split.user_id, 
          title_event: ttConfig.title,
          distance: ttConfig.distance,
          pool_size: ttConfig.pool,
          time_record: split.time_string,
          created_at: new Date()
        }));

        const { error } = await supabase.from('time_trials_results').insert(inserts);
        if (error) throw error;

        if (window.showToast) window.showToast('Hasil latihan tersimpan!', 'success');
        
        localStorage.removeItem('active_tt_config');
        setTimeout(() => { window.location.replace('/coach_app.html'); }, 1500);

      } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast(`Gagal: ${err.message}`, 'error');
        btnSave.innerText = '💾 Simpan Hasil Time Trial';
        btnSave.classList.remove('pointer-events-none', 'opacity-50');
      }
    });
  }
});