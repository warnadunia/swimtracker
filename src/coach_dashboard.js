document.addEventListener('DOMContentLoaded', async () => {
  // 1. PROTEKSI AKSES LOGOUT/THEME
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm("Keluar dari akun Coach?")) {
      localStorage.removeItem('swim_user');
      window.location.replace('/index.html');
    }
  });

  const sessionUser = localStorage.getItem('swim_user');
  if (!sessionUser) return window.location.replace('/index.html');

  const profile = JSON.parse(sessionUser);
  if (!profile || (profile.role !== 'head_coach' && profile.role !== 'coach' && profile.role !== 'admin')) {
    return window.location.replace('/app.html');
  }

  document.getElementById('coach-name').innerText = profile.full_name;
  document.getElementById('coach-name').nextElementSibling.innerText = profile.role === 'head_coach' ? 'Head Coach PSSC' : 'Coach PSSC';

  let allMedalsData = [];
  let masterAthletes = {};
  let currentClassFilter = 'All';

  async function loadMedals(year) {
    try {
      // Ambil atlet via TiDB API bray
      const athResponse = await fetch('/api/coach/athletes');
      const athResult = await athResponse.json();
      masterAthletes = {};
      (athResult.data || []).forEach(a => masterAthletes[a.id] = a);

      // Ambil data prestasi juara 1, 2, 3 via endpoint admin yang sudah map-join
      const response = await fetch('/api/admin/prestasi');
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      // Filter berdasarkan tahun kompetisi
      allMedalsData = (result.data || []).filter(r => r.event_date && r.event_date.startsWith(year));
      
      renderMedalStats();
      renderMedalistTable();
    } catch (err) {
      console.error("Gagal memuat medali:", err);
    }
  }

  function renderMedalStats() {
    let emas = 0, perak = 0, perunggu = 0;
    allMedalsData.forEach(r => {
      if (r.rank === 1) emas++;
      else if (r.rank === 2) perak++;
      else if (r.rank === 3) perunggu++;
    });
    document.getElementById('count-emas').innerText = emas;
    document.getElementById('count-perak').innerText = perak;
    document.getElementById('count-perunggu').innerText = perunggu;
  }

  function renderMedalistTable() {
    const container = document.getElementById('medalist-container');
    container.innerHTML = '';

    const filteredResults = allMedalsData.filter(r => {
      const atlet = masterAthletes[r.user_id];
      if (!atlet) return false;
      if (currentClassFilter === 'All') return true;
      return atlet.group_level === currentClassFilter;
    });

    if (filteredResults.length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-xs text-gray-500">Belum ada medali di kelas ini bray.</div>`;
      return;
    }

    filteredResults.forEach(r => {
      const atlet = masterAthletes[r.user_id];
      const medalIcon = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉';
      const medalColor = r.rank === 1 ? 'text-yellow-600 dark:text-yellow-500' : r.rank === 2 ? 'text-gray-500' : 'text-amber-700 dark:text-amber-600';
      
      container.innerHTML += `
        <div class="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
          <div>
            <div class="text-xs font-bold text-gray-800 dark:text-white">${atlet ? atlet.full_name : 'Anonim'}</div>
            <div class="text-[9px] text-gray-400 mt-0.5 truncate max-w-[180px]">${r.distance_meters}M ${r.style_name} • ${r.event_title}</div>
          </div>
          <div class="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded border border-gray-200 dark:border-zinc-700">
            <span>${medalIcon}</span>
            <span class="text-[10px] font-bold ${medalColor}">Rank ${r.rank}</span>
          </div>
        </div>
      `;
    });
  }

  document.getElementById('medal-year-filter').addEventListener('change', (e) => loadMedals(e.target.value));

  const pills = document.querySelectorAll('.pill-kelas');
  pills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      pills.forEach(p => {
        p.classList.remove('bg-brand-red', 'text-white', 'shadow-md', 'shadow-brand-red/30');
        p.classList.add('bg-white', 'dark:bg-[#221c29]', 'text-gray-500', 'dark:text-gray-400', 'border', 'border-gray-200', 'dark:border-gray-800');
      });
      e.currentTarget.classList.remove('bg-white', 'dark:bg-[#221c29]', 'text-gray-500', 'dark:text-gray-400', 'border', 'border-gray-200', 'dark:border-gray-800');
      e.currentTarget.classList.add('bg-brand-red', 'text-white', 'shadow-md', 'shadow-brand-red/30');
      
      currentClassFilter = e.currentTarget.getAttribute('data-class');
      renderMedalistTable();
    });
  });

  loadMedals('2026');
});