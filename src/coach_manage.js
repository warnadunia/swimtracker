document.addEventListener('DOMContentLoaded', async () => {
  // Proteksi Akses Khusus Head Coach & Admin
  const sessionUser = localStorage.getItem('swim_user');
  if (!sessionUser) return window.location.replace('/index.html');

  const profile = JSON.parse(sessionUser);
  if (!profile || (profile.role !== 'head_coach' && profile.role !== 'admin')) {
    alert('Akses ditolak! Halaman ini khusus Head Coach.');
    return window.location.replace('/coach_dashboard.html');
  }

  const containerClasses = document.getElementById('container-manage-classes');
  const pillsManage = document.querySelectorAll('.pill-manage');
  
  // Element Modal
  const modalElem = document.getElementById('modal-edit-class');
  const modalInner = document.getElementById('modal-edit-inner');
  const inputId = document.getElementById('edit-atlet-id');
  const labelName = document.getElementById('edit-atlet-name');
  const selectClass = document.getElementById('select-new-class');
  const btnSaveClass = document.getElementById('btn-save-class');
  
  let currentFilter = 'All';
  let masterAthletes = [];

  async function fetchAtletData() {
    try {
      const response = await fetch('/api/coach/athletes');
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      masterAthletes = result.data || [];
      renderFilteredClasses();

    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Gagal memuat data atlet bray', 'error');
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
          <h5 class="text-xs font-bold text-gray-700 dark:text-zinc-200 uppercase tracking-wide">Kelas ${levelName}</h5>
          <span class="text-[10px] font-extrabold bg-brand-red/10 text-brand-red px-2 py-0.5 rounded-full">${athletesInClass.length} Atlet</span>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-800/60">
      `;

      athletesInClass.forEach(atlet => {
        const currentGroup = atlet.group_level || 'Belum Set';
        htmlContent += `
          <div class="p-4 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 transition-colors">
            <div>
              <div class="text-xs font-bold text-gray-800 dark:text-white">${atlet.full_name}</div>
              <div class="text-[9px] text-gray-400 mt-0.5">Lahir: ${atlet.birth_year || '-'}</div>
            </div>
            
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-bold text-brand-red bg-red-900/10 px-2 py-1 rounded border border-red-900/20">${currentGroup}</span>
              <button onclick="window.openEditClass('${atlet.id}', '${atlet.full_name}', '${currentGroup}')" class="p-1.5 text-gray-400 hover:text-brand-red bg-gray-100 dark:bg-zinc-800 rounded-lg transition-colors border border-gray-200 dark:border-zinc-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </button>
            </div>
          </div>
        `;
      });

      htmlContent += `</div>`;
      classCard.innerHTML = htmlContent;
      containerClasses.appendChild(classCard);
    });
  }

  window.openEditClass = function(id, name, currentClass) {
    inputId.value = id;
    labelName.innerText = name;
    
    if(currentClass && currentClass !== 'Belum Set') {
      selectClass.value = currentClass;
    }

    modalElem.classList.remove('hidden');
    setTimeout(() => {
      modalInner.classList.remove('translate-y-full');
    }, 10);
  };

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modalInner.classList.add('translate-y-full');
    setTimeout(() => {
      modalElem.classList.add('hidden');
    }, 300);
  });

  btnSaveClass.addEventListener('click', async () => {
    const id = inputId.value;
    const newClass = selectClass.value;

    if (!id || !newClass) return;

    btnSaveClass.innerText = 'Menyimpan...';
    btnSaveClass.disabled = true;

    try {
      // Re-use endpoint edit master user yang sudah kita buat di modul Admin bray
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, full_name: labelName.innerText, group_level: newClass })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      if (window.showToast) window.showToast('Berhasil memindahkan kelas bray!', 'success');
      
      const index = masterAthletes.findIndex(a => a.id === id);
      if(index !== -1) masterAthletes[index].group_level = newClass;
      renderFilteredClasses();
      
      document.getElementById('btn-close-modal').click();

    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Gagal memindahkan kelas.', 'error');
    } finally {
      btnSaveClass.innerText = '💾 SIMPAN KELAS';
      btnSaveClass.disabled = false;
    }
  });

  pillsManage.forEach(pill => {
    pill.addEventListener('click', (e) => {
      pillsManage.forEach(p => {
        p.classList.remove('bg-brand-red', 'text-white', 'shadow-md', 'shadow-brand-red/30');
        p.classList.add('bg-white', 'dark:bg-[#221c29]', 'text-gray-500', 'dark:text-gray-400', 'border', 'border-gray-200', 'dark:border-gray-800');
      });
      e.currentTarget.classList.remove('bg-white', 'dark:bg-[#221c29]', 'text-gray-500', 'dark:text-gray-400', 'border', 'border-gray-200', 'dark:border-gray-800');
      e.currentTarget.classList.add('bg-brand-red', 'text-white', 'shadow-md', 'shadow-brand-red/30');
      
      currentFilter = e.currentTarget.getAttribute('data-class');
      renderFilteredClasses();
    });
  });

  fetchAtletData();
});