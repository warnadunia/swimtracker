// src/parents.js
// ENGINE DASHBOARD MONITORING ORANG TUA bray
// Hanya untuk render kartu anak yang bisa diklik menuju parent_detail.html

import './style.css';
import { initProfileModal, initDashboardProfile } from './profile_modal.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. SATPAM PROTEKSI LOGIN
  const sessionUser = localStorage.getItem('swim_user');
  if (!sessionUser) return window.location.replace('/index.html');

  const profile = JSON.parse(sessionUser);
  if (profile.role !== 'parents' && profile.role !== 'admin') {
    return window.location.replace('/index.html');
  }

  // 2. SET NAMA PARENT & INIT MODULES
  document.getElementById('parent-display-name').innerText = profile.full_name;
  initProfileModal();
  initDashboardProfile();

  // 3. HANDLER LOGOUT GLOBAL
  document.getElementById('btn-parents-logout')?.addEventListener('click', () => {
    if (confirm("Keluar dari Portal Orang Tua?")) {
      localStorage.removeItem('swim_user');
      window.location.replace('/index.html');
    }
  });

  // 4. LOAD & RENDER DATA ANAK (MULTI-ATHLETE)
  async function loadChildrenData() {
    const container = document.getElementById('container-parent-children');
    if (!container) return;

    try {
      const response = await fetch(`/api/parents?action=monitoring&parent_id=${profile.id}`);
      const result = await response.json();

      if (!result.success || result.data.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-xs text-gray-400 bg-gray-50 dark:bg-zinc-900 rounded-xl">Akun Anda belum di-mapping dengan atlet oleh Admin bray!</div>`;
        return;
      }

      container.innerHTML = ''; // Bersihkan container sebelum render

      result.data.forEach(item => {
        const child = item.profile;
        const att = item.last_attendance;
        const trials = item.recent_time_trials || [];

        // Parse status absensi terbaru bray
        const attStatus = att.is_present === 1 
          ? `<span class="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Hadir (${att.attendance_date.split('T')[0]})</span>` 
          : `<span class="bg-gray-100 dark:bg-zinc-800 text-gray-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Absen / Belum Latihan</span>`;
        
        // Parse list latihan Time Trial bray
        let ttHTML = trials.length === 0 
          ? `<div class="text-[10px] text-gray-400 py-1">Belum ada evaluasi latihan.</div>`
          : trials.map(t => `
              <div class="flex justify-between items-center py-1.5 border-b last:border-0 dark:border-gray-800">
                <div>
                  <div class="text-xs font-bold text-gray-700 dark:text-zinc-300 truncate max-w-[160px]">${t.title_event}</div>
                  <div class="text-[9px] text-gray-400">${t.distance_meters}M • ${t.style_name}</div>
                </div>
                <span class="text-xs font-mono font-bold text-brand-red">${t.time_record}</span>
              </div>`).join('');

        // Render Kartu Anak sebagai LINK (Clickable) bray!
        container.innerHTML += `
          <div onclick="window.location.href='/parent_detail.html?id=${child.id}&name=${encodeURIComponent(child.full_name)}'" 
               class="bg-white dark:bg-[#221c29] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden mb-4 cursor-pointer hover:ring-2 hover:ring-brand-red/50 transition-all active:scale-[0.98]">
            <div class="p-4 bg-gray-50 dark:bg-[#2b2532] border-b flex justify-between items-center">
              <div>
                <h4 class="text-xs font-bold text-gray-800 dark:text-white uppercase">${child.full_name}</h4>
                <p class="text-[9px] text-gray-400">Kelas: ${child.group_level || 'Basic'} | Usia: ${new Date().getFullYear() - child.birth_year}</p>
              </div>
              <div class="bg-brand-red/10 text-brand-red w-8 h-8 rounded-full flex items-center justify-center font-bold">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
            </div>
            
            <div class="p-4 space-y-4">
              <div class="flex justify-between items-center text-xs border-b dark:border-gray-800 pb-2">
                <span class="text-gray-400 font-medium">Presensi Terakhir:</span>
                ${attStatus}
              </div>
              <div>
                <span class="text-[10px] font-bold text-emerald-500 tracking-wider uppercase block mb-1">⏱️ Latihan Terkini</span>
                <div class="divide-y dark:divide-gray-800">${ttHTML}</div>
              </div>
            </div>
          </div>
        `;
      });
    } catch (err) { 
      console.error(err); 
    }
  }

  // 5. EKSEKUSI PEMUATAN DATA
  await loadChildrenData();
});