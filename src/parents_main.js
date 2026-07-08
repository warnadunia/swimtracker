document.addEventListener('DOMContentLoaded', async () => {
  const sessionUser = localStorage.getItem('swim_user');
  if (!sessionUser) return window.location.replace('/index.html');

  const profile = JSON.parse(sessionUser);
  // Admin dapet hak bypass All Access, Parents juga lolos bray!
  if (profile.role !== 'parents' && profile.role !== 'admin') {
    return window.location.replace('/app.html');
  }

  const nameEl = document.getElementById('parent-display-name');
  if (nameEl) nameEl.innerText = profile.full_name;

  // Handler Logout Orang Tua
  document.getElementById('btn-parents-logout').addEventListener('click', () => {
    if (confirm("Keluar dari Portal Orang Tua bray?")) {
      localStorage.removeItem('swim_user');
      window.location.replace('/index.html');
    }
  });

  async function loadChildrenMonitoring() {
    const container = document.getElementById('container-parent-children');
    if (!container) return;

    try {
      // Tembak Serverless API TiDB dengan parameter ID orang tua aktif
      const response = await fetch(`/api/parents/athletes?parent_id=${profile.id}`);
      const result = await response.json();

      if (!result.success || result.data.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-xs text-gray-400 bg-gray-50 dark:bg-zinc-900 rounded-xl">Akun Anda belum terhubung dengan atlet manapun. Silakan hubungi admin bray!</div>`;
        return;
      }

      container.innerHTML = '';
      result.data.forEach(item => {
        const child = item.profile;
        const att = item.last_attendance;
        const trials = item.recent_time_trials;

        const attBadge = att.status === 'hadir' 
          ? '<span class="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Hadir</span>' 
          : '<span class="bg-gray-100 dark:bg-zinc-800 text-gray-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Absen</span>';

        let trialsHTML = '';
        if (trials.length === 0) {
          trialsHTML = `<div class="text-[10px] text-gray-400 text-center py-2">Belum ada rekaman evaluasi latihan Time Trial bray.</div>`;
        } else {
          trials.forEach(t => {
            const dateStr = new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            trialsHTML += `
              <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <div class="text-xs font-bold text-gray-700 dark:text-zinc-300 truncate max-w-[180px]">${t.title_event}</div>
                  <div class="text-[9px] text-gray-400">${t.distance}M • Kolam ${t.pool_size}M • ${dateStr}</div>
                </div>
                <span class="text-xs font-mono font-bold text-brand-red bg-brand-red/10 px-2 py-0.5 rounded">${t.time_record}</span>
              </div>
            `;
          });
        }

        container.innerHTML += `
          <div class="bg-white dark:bg-[#221c29] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div class="p-4 bg-gray-50 dark:bg-[#2b2532] border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h4 class="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wide">${child.full_name}</h4>
                <p class="text-[9px] text-gray-400 mt-0.5">Kelas: ${child.group_level || 'Basic'} | Lahir: ${child.birth_year || '-'}</p>
              </div>
            </div>
            
            <div class="p-4 space-y-3">
              <div class="flex justify-between items-center text-xs border-b border-gray-100 dark:border-gray-800/50 pb-2">
                <span class="text-gray-400 font-medium">Presensi Kolam Terakhir:</span>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-mono text-gray-500">${att.date ? att.date.split('T')[0] : ''}</span>
                  ${attBadge}
                </div>
              </div>
              
              <div>
                <span class="text-[10px] font-bold text-emerald-500 tracking-wider uppercase block mb-1">⏱️ 3 Record Waktu Latihan Terbaru</span>
                <div class="divide-y divide-gray-100 dark:divide-gray-800">
                  ${trialsHTML}
                </div>
              </div>
            </div>
          </div>
        `;
      });

    } catch (err) {
      console.error(err);
      container.innerHTML = `<div class="text-center py-6 text-xs text-brand-red font-bold">Gagal jabat tangan ke TiDB Cloud.</div>`;
    }
  }

  loadChildrenMonitoring();
});