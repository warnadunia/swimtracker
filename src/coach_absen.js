document.addEventListener('DOMContentLoaded', async () => {
  // 1. PROTEKSI AKSES & CEK ROLE PELATIH
  const sessionUser = localStorage.getItem('swim_user');
  if (!sessionUser) return window.location.replace('/index.html');

  const profile = JSON.parse(sessionUser);
  if (!profile || (profile.role !== 'head_coach' && profile.role !== 'coach' && profile.role !== 'admin')) {
    return window.location.replace('/app.html');
  }

  // 2. INISIALISASI DOM
  const containerClasses = document.getElementById('container-absen-classes');
  const pillsAbsen = document.querySelectorAll('.pill-absen');
  
  let currentFilter = 'All';
  let masterAthletes = [];
  let masterAttendanceToday = {};

  async function fetchAbsensiData() {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Ambil data atlet via Serverless API TiDB
      const response = await fetch('/api/coach/athletes');
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      masterAthletes = result.data || [];

      // Update stat card total atlet
      const statTotal = document.getElementById('stat-total-atlet');
      if (statTotal) statTotal.innerText = masterAthletes.length;

      // Ambil absensi hari ini dari TiDB
      const attResponse = await fetch(`/api/coach/attendance?date=${todayStr}`);
      const attResult = await attResponse.json();
      if (!attResult.success) throw new Error(attResult.error);

      masterAttendanceToday = {};
      (attResult.data || []).forEach(row => {
        // Jika di database statusnya 'hadir', maka true, selain itu false bray
        masterAttendanceToday[row.athlete_id] = row.status === 'hadir';
      });

      renderFilteredClasses();

    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Gagal memuat data absensi bray', 'error');
    }
  }

  function renderFilteredClasses() {
    if (!containerClasses) return;
    containerClasses.innerHTML = '';

    const grouped = masterAthletes.reduce((acc, athlete) => {
      const lvl = athlete.group_level || 'Belum Set Kelas';
      if (!acc[lvl]) acc[lvl] = [];
      acc[lvl].push(athlete);
      return acc;
    }, {});

    let classesToRender = Object.keys(grouped);
    if (currentFilter !== 'All') {
      classesToRender = classesToRender.filter(c => c.toLowerCase() === currentFilter.toLowerCase());
    }

    if (classesToRender.length === 0) {
      containerClasses.innerHTML = `<div class="text-center text-xs text-gray-400 py-8 bg-white dark:bg-[#221c29] rounded-2xl border border-gray-200 dark:border-gray-800">Tidak ada atlet di kelas ${currentFilter}</div>`;
      return;
    }

    classesToRender.forEach(levelName => {
      const athletesInClass = grouped[levelName];
      const classCard = document.createElement('div');
      classCard.className = 'bg-white dark:bg-[#221c29] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden';
      
      let htmlContent = `
        <div class="px-4 py-3 bg-gray-50 dark:bg-[#2b2532] border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <h5 class="text-xs font-bold text-gray-700 dark:text-zinc-200 uppercase tracking-wide">Kelas ${levelName}</h5>
          </div>
          <span class="text-[10px] font-extrabold bg-brand-red/10 text-brand-red px-2 py-0.5 rounded-full">${athletesInClass.length} Atlet</span>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-800/60">
      `;

      athletesInClass.forEach(atlet => {
        // Di TiDB default-nya dianggap hadir jika belum terekam bray
        const isPresent = masterAttendanceToday[atlet.athlete_id] !== false; 
        const currentYear = new Date().getFullYear();
        const age = atlet.birth_year ? currentYear - atlet.birth_year : '?';

        htmlContent += `
          <div class="p-4 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 transition-colors">
            <div>
              <div class="text-xs font-bold text-gray-800 dark:text-white">${atlet.full_name}</div>
              <div class="text-[9px] text-gray-400 mt-0.5">Lahir: ${atlet.birth_year || '-'} (Usia: ${age})</div>
            </div>
            
            <label class="relative inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" class="sr-only peer attendance-toggle" data-id="${atlet.athlete_id}" ${isPresent ? 'checked' : ''}>
              <div class="w-11 h-6 bg-gray-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span class="ml-2 text-[10px] font-bold tracking-wider uppercase min-w-[36px] text-right ${isPresent ? 'text-emerald-500' : 'text-gray-400'} label-status">${isPresent ? 'Hadir' : 'Absen'}</span>
            </label>
          </div>
        `;
      });

      htmlContent += `</div>`;
      classCard.innerHTML = htmlContent;
      containerClasses.appendChild(classCard);
    });

    document.querySelectorAll('.attendance-toggle').forEach(toggle => {
      toggle.addEventListener('change', async (e) => {
        const athleteId = e.target.getAttribute('data-id');
        const isPresent = e.target.checked;
        await saveAttendance(athleteId, isPresent, e.target);
      });
    });
  }

  async function saveAttendance(athleteId, isPresent, element) {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const labelSpan = element.parentElement.querySelector('.label-status');

      if (labelSpan) {
        labelSpan.innerText = isPresent ? 'Hadir' : 'Absen';
        labelSpan.className = `ml-2 text-[10px] font-bold tracking-wider uppercase min-w-[36px] text-right label-status ${isPresent ? 'text-emerald-500' : 'text-gray-400'}`;
      }

      // Kirim data array presensi ke Serverless API TiDB bray
      const response = await fetch('/api/coach/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayStr,
          attendance_list: [{
            athlete_id: athleteId,
            status: isPresent ? 'hadir' : 'absen',
            notes: ''
          }]
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      masterAttendanceToday[athleteId] = isPresent;

    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Gagal update absensi bray', 'error');
      element.checked = !isPresent;
      renderFilteredClasses();
    }
  }

  pillsAbsen.forEach(pill => {
    pill.addEventListener('click', (e) => {
      pillsAbsen.forEach(p => {
        p.classList.remove('bg-brand-red', 'text-white', 'shadow-md', 'shadow-brand-red/30');
        p.classList.add('bg-white', 'dark:bg-[#221c29]', 'text-gray-500', 'dark:text-gray-400', 'border', 'border-gray-200', 'dark:border-gray-800');
      });
      e.currentTarget.classList.remove('bg-white', 'dark:bg-[#221c29]', 'text-gray-500', 'dark:text-gray-400', 'border', 'border-gray-200', 'dark:border-gray-800');
      e.currentTarget.classList.add('bg-brand-red', 'text-white', 'shadow-md', 'shadow-brand-red/30');
      
      currentFilter = e.currentTarget.getAttribute('data-class');
      renderFilteredClasses();
    });
  });

  fetchAbsensiData();
});