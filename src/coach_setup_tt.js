document.addEventListener('DOMContentLoaded', async () => {
  const checkboxContainer = document.getElementById('atlet-list-checkbox');
  const btnStart = document.getElementById('btn-start-tt');
  const inputTarget = document.getElementById('tt-target');
  const inputPool = document.getElementById('tt-pool');
  const inputSets = document.getElementById('tt-sets');

  function calculateSets() {
    const target = parseInt(inputTarget.value);
    const pool = parseInt(inputPool.value);
    if (!isNaN(target) && !isNaN(pool) && pool > 0) {
      inputSets.value = Math.ceil(target / pool);
    } else {
      inputSets.value = '';
    }
  }

  if (inputTarget) inputTarget.addEventListener('input', calculateSets);
  if (inputPool) inputPool.addEventListener('change', calculateSets);

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Ambil hanya profil yang diabsen HADIR hari ini dari TiDB
    const attResponse = await fetch(`/api/coach/attendance?date=${todayStr}`);
    const attResult = await attResponse.json();
    if (!attResult.success) throw new Error(attResult.error);

    const presentIds = (attResult.data || []).filter(a => a.status === 'hadir').map(a => a.athlete_id);

    if (presentIds.length === 0) {
      checkboxContainer.innerHTML = `
        <div class="text-center p-4 bg-red-900/10 border border-red-900/20 rounded-xl">
          <p class="text-xs text-brand-red font-bold mb-2">Belum ada atlet yang diabsen hadir hari ini bray.</p>
          <button type="button" onclick="window.location.replace('/coach_app.html')" class="text-[10px] bg-brand-red text-white px-3 py-1.5 rounded-lg inline-block active:scale-95 transition-transform">Buka Absensi Sekarang</button>
        </div>
      `;
      return; 
    }

    const athResponse = await fetch('/api/coach/athletes');
    const athResult = await athResponse.json();
    const presentAthletes = (athResult.data || []).filter(a => presentIds.includes(a.id));

    checkboxContainer.innerHTML = presentAthletes.map(atlet => `
      <label class="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-[#1a1620] rounded-xl border border-gray-200 dark:border-gray-700 active:bg-gray-100 dark:active:bg-gray-800 transition-colors cursor-pointer select-none">
        <input type="checkbox" value="${atlet.id}" data-name="${atlet.full_name}" class="atlet-cb w-4 h-4 rounded border-gray-300 text-brand-red focus:ring-brand-red">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">${atlet.full_name}</span>
      </label>
    `).join('');

  } catch (err) {
    console.error(err);
    if (window.showToast) window.showToast('Gagal memuat daftar atlet', 'error');
  }

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      const title = document.getElementById('tt-title').value.trim();
      const targetDist = inputTarget.value;
      const poolSize = inputPool.value;
      let sets = inputSets.value;

      const selectedCheckboxes = document.querySelectorAll('.atlet-cb:checked');
      const selectedAthletes = Array.from(selectedCheckboxes).map(cb => ({
        id: cb.value,
        name: cb.getAttribute('data-name')
      }));

      if (!title || !targetDist || selectedAthletes.length === 0) {
        if (window.showToast) window.showToast('Judul, Jarak, dan minimal 1 Atlet wajib diisi bray!', 'error');
        return;
      }

      if (!sets || sets <= 0) sets = Math.ceil(parseInt(targetDist) / parseInt(poolSize));

      const ttConfig = { title, distance: parseInt(targetDist), pool: parseInt(poolSize), sets: parseInt(sets), athletes: selectedAthletes };
      localStorage.setItem('active_tt_config', JSON.stringify(ttConfig));
      window.location.href = '/coach_tt_stopwatch.html';
    });
  }
});