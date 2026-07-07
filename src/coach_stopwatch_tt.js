document.addEventListener('DOMContentLoaded', () => {
  const configData = localStorage.getItem('active_tt_config');
  if (!configData) { alert('Konfigurasi tidak ditemukan! Kembali ke dashboard.'); window.location.replace('/coach_app.html'); return; }
  
  const ttConfig = JSON.parse(configData);

  const display = document.getElementById('sw-display');
  const btnMain = document.getElementById('sw-btn-main'); 
  const btnReset = document.getElementById('sw-btn-reset');
  const btnSave = document.getElementById('btn-save-tt');
  const btnAbort = document.getElementById('btn-abort-tt');
  const logContainer = document.getElementById('split-records-log');
  
  const bottomSheet = document.getElementById('bottom-sheet-atlet');
  const sheetTimeLabel = document.getElementById('target-split-time-label');
  const sheetAtletList = document.getElementById('sheet-atlet-list');

  let startTime = 0;
  let elapsedTime = 0;
  let timerInterval = null;
  let isRunning = false;
  let recordedSplits = []; 
  let currentActiveSplitIndex = null; 

  const totalAthletes = ttConfig.athletes.length;
  const totalSets = ttConfig.sets;
  let currentSet = 1;
  let lapPressCount = 0; 

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const min = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const sec = (totalSeconds % 60).toString().padStart(2, '0');
    const centi = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${min}:${sec}.${centi}`;
  }

  function updateDisplay() { elapsedTime = performance.now() - startTime; display.innerText = formatTime(elapsedTime); }

  function updateMainButtonUI() {
    const nextAthlete = lapPressCount + 1;
    if (currentSet === totalSets) {
      btnMain.innerText = `FINISH (${nextAthlete}/${totalAthletes})`;
    } else {
      btnMain.innerText = `LAP (${nextAthlete}/${totalAthletes})`;
    }
  }

  if (btnMain) {
    btnMain.addEventListener('click', () => {
      if (!isRunning && currentSet === 1 && lapPressCount === 0) {
        isRunning = true;
        startTime = performance.now();
        timerInterval = requestAnimationFrame(function run() { if (!isRunning) return; updateDisplay(); timerInterval = requestAnimationFrame(run); });
        btnReset.classList.add('opacity-50', 'pointer-events-none');
        updateMainButtonUI();
      } else if (isRunning) {
        const currentStamp = elapsedTime;
        const formattedStamp = formatTime(currentStamp);
        
        recordedSplits.push({ time_ms: currentStamp, time_string: formattedStamp, user_id: null, athlete_name: 'Menunggu...', set_number: currentSet });
        const newIndex = recordedSplits.length - 1;

        if (lapPressCount === 0) {
          const headerLap = document.createElement('div');
          headerLap.className = 'text-[10px] font-bold text-emerald-500 tracking-widest uppercase mt-4 mb-2 pl-2 border-l-2';
          headerLap.innerText = currentSet === totalSets ? `LAP TERAKHIR (FINISH)` : `LAP ${currentSet} DARI ${totalSets}`;
          logContainer.appendChild(headerLap);
        }

        const logRow = document.createElement('div');
        logRow.id = `split-row-${newIndex}`;
        logRow.className = 'flex justify-between items-center bg-zinc-900 p-3 rounded-xl border border-zinc-800 mb-2';
        logRow.innerHTML = `
          <div class="flex items-center gap-3">
            <span class="text-xs font-bold text-zinc-600 font-mono">#${lapPressCount + 1}</span>
            <span class="font-mono text-sm font-bold text-white tracking-wider">${formattedStamp}</span>
          </div>
          <button onclick="window.openAthletePicker(${newIndex})" class="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 border text-brand-red font-bold" id="btn-assign-${newIndex}">⚡ Pilih Atlet</button>
        `;
        logContainer.appendChild(logRow);
        logContainer.scrollTop = logContainer.scrollHeight;

        lapPressCount++;
        if (lapPressCount >= totalAthletes) { currentSet++; lapPressCount = 0; }

        if (currentSet > totalSets) {
          isRunning = false;
          cancelAnimationFrame(timerInterval);
          btnMain.innerText = 'LATIHAN SELESAI';
          btnMain.classList.add('pointer-events-none', 'opacity-50');
          btnReset.classList.remove('opacity-50', 'pointer-events-none');
          btnSave.classList.remove('opacity-50', 'pointer-events-none');
        } else {
          updateMainButtonUI();
        }
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (!confirm('Reset seluruh hitungan waktu bray?')) return;
      elapsedTime = 0; display.innerText = '00:00.00'; recordedSplits = []; logContainer.innerHTML = '';
      currentSet = 1; lapPressCount = 0; btnMain.innerText = 'START'; btnMain.classList.remove('pointer-events-none', 'opacity-50');
    });
  }

  if (btnAbort) { btnAbort.addEventListener('click', () => { if (confirm('Batalkan latihan ini?')) { localStorage.removeItem('active_tt_config'); window.location.replace('/coach_app.html'); } }); }

  window.openAthletePicker = function(index) {
    currentActiveSplitIndex = index;
    const targetSplit = recordedSplits[index];
    sheetTimeLabel.innerText = targetSplit.time_string;

    const assignedIdsInThisSet = recordedSplits
      .filter((s, i) => s.set_number === targetSplit.set_number && i !== index && s.user_id !== null)
      .map(s => s.user_id);

    sheetAtletList.innerHTML = ttConfig.athletes.map(atlet => {
      const isAlreadyPicked = assignedIdsInThisSet.includes(atlet.id);
      return isAlreadyPicked ? `
        <button class="w-full py-3 px-4 mb-2 bg-zinc-900 rounded-xl text-left text-sm font-bold text-zinc-600 cursor-not-allowed flex justify-between items-center" disabled>
          <span class="line-through">${atlet.name}</span><span class="text-[10px] text-brand-red">SUDAH DIPILIH</span>
        </button>` : `
        <button class="w-full py-3 px-4 mb-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-left text-sm font-bold text-white flex justify-between items-center" onclick="window.selectAthleteForSplit('${atlet.id}', '${atlet.name}')">
          <span>${atlet.name}</span>
        </button>`;
    }).join('');

    bottomSheet.classList.remove('pointer-events-none', 'opacity-0');
    bottomSheet.querySelector('div').classList.remove('translate-y-full');
  };

  window.closeAthletePicker = function() { bottomSheet.classList.add('pointer-events-none', 'opacity-0'); bottomSheet.querySelector('div').classList.add('translate-y-full'); };

  window.selectAthleteForSplit = function(id, name) {
    if (currentActiveSplitIndex === null) return;
    recordedSplits[currentActiveSplitIndex].user_id = id;
    recordedSplits[currentActiveSplitIndex].athlete_name = name;

    const btnAssign = document.getElementById(`btn-assign-${currentActiveSplitIndex}`);
    if (btnAssign) { btnAssign.innerText = name; btnAssign.className = "text-xs px-3 py-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 font-bold border border-emerald-900/50 truncate max-w-[150px]"; }
    window.closeAthletePicker();
  };

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      if (recordedSplits.some(s => s.user_id === null)) { if (window.showToast) window.showToast('Masih ada record yang kosong bray!', 'error'); return; }
      try {
        btnSave.innerText = 'Mengirim...'; btnSave.classList.add('pointer-events-none', 'opacity-50');

        const inserts = recordedSplits.map(split => ({
          profile_id: split.user_id, title_event: ttConfig.title, distance: ttConfig.distance, pool_size: ttConfig.pool, time_record: split.time_string
        }));

        const response = await fetch('/api/coach/time_trials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inserts })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        localStorage.removeItem('active_tt_config');
        if (window.showToast) window.showToast('Hasil latihan tersimpan bray!', 'success');
        setTimeout(() => { window.location.replace('/coach_app.html'); }, 1500);
      } catch (err) {
        console.error(err);
        btnSave.innerText = '💾 Simpan Hasil Time Trial'; btnSave.classList.remove('pointer-events-none', 'opacity-50');
      }
    });
  }
});