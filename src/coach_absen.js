import { supabase } from './supabase';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. PROTEKSI AKSES & CEK ROLE PELATIH
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return window.location.replace('/index.html'); 

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || (profile.role !== 'head_coach' && profile.role !== 'coach')) {
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

      // Ambil data atlet dari tabel profiles
      const { data: athletes, error: errAthletes } = await supabase
        .from('profiles')
        .select('id, full_name, group_level, birth_year') 
        .eq('role', 'atlet')
        .order('full_name', { ascending: true });

      if (errAthletes) throw errAthletes;
      masterAthletes = athletes || [];

      // Update stat card total atlet
      const statTotal = document.getElementById('stat-total-atlet');
      if (statTotal) statTotal.innerText = masterAthletes.length;

      // Ambil absensi hari ini
      const { data: attendance, error: errAttendance } = await supabase
        .from('daily_attendance')
        .select('profile_id, is_present')
        .eq('attendance_date', todayStr);

      if (errAttendance) throw errAttendance;

      masterAttendanceToday = {};
      (attendance || []).forEach(row => {
        masterAttendanceToday[row.profile_id] = row.is_present;
      });

      renderFilteredClasses();

    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Gagal memuat data absensi', 'error');
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
        const isPresent = masterAttendanceToday[atlet.id] !== false; 
        const currentYear = new Date().getFullYear();
        const age = atlet.birth_year ? currentYear - atlet.birth_year : '?';

        htmlContent += `
          <div class="p-4 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 transition-colors">
            <div>
              <div class="text-xs font-bold text-gray-800 dark:text-white">${atlet.full_name}</div>
              <div class="text-[9px] text-gray-400 mt-0.5">Lahir: ${atlet.birth_year || '-'} (Usia: ${age})</div>
            </div>
            
            <label class="relative inline-flex items-center cursor-pointer select-none">
              <input type="checkbox" class="sr-only peer attendance-toggle" data-id="${atlet.id}" ${isPresent ? 'checked' : ''}>
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
        const profileId = e.target.getAttribute('data-id');
        const isPresent = e.target.checked;
        await saveAttendance(profileId, isPresent, e.target);
      });
    });
  }

  async function saveAttendance(profileId, isPresent, element) {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const labelSpan = element.parentElement.querySelector('.label-status');

      if (labelSpan) {
        labelSpan.innerText = isPresent ? 'Hadir' : 'Absen';
        labelSpan.className = `ml-2 text-[10px] font-bold tracking-wider uppercase min-w-[36px] text-right label-status ${isPresent ? 'text-emerald-500' : 'text-gray-400'}`;
      }

      const { error } = await supabase
        .from('daily_attendance')
        .upsert({
          profile_id: profileId,
          attendance_date: todayStr,
          is_present: isPresent
        }, { onConflict: 'profile_id, attendance_date' });

      if (error) throw error;
      masterAttendanceToday[profileId] = isPresent;

    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Gagal update absensi', 'error');
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

  // Eksekusi tarikan data awal
  fetchAbsensiData();
});