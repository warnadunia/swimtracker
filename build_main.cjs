const fs = require('fs');
const oldJs = fs.readFileSync('src/main_old_utf8.js', 'utf8').split('\n');
const logicPart = oldJs.slice(65, 511).join('\n'); // Get lines 66-512

const newMain = `import './style.css';
import 'preline';
import Chart from 'chart.js/auto';
import { supabase } from './supabase';

document.addEventListener('DOMContentLoaded', async () => {
  // ==========================================
  // 1. CEK SESI (SUPABASE) - SEBELUM RENDER HTML
  // ==========================================
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { 
    window.location.replace('/index.html'); 
    return; 
  }

  const user = session.user;

  // ==========================================
  // 2. INJEKSI SEMUA KOMPONEN HTML
  // ==========================================
  const [header, dashboard, progress, nav, modal] = await Promise.all([
    fetch('/header.html').then(res => res.text()),
    fetch('/dashboard.html').then(res => res.text()),
    fetch('/progress.html').then(res => res.text()),
    fetch('/bottomnav.html').then(res => res.text()),
    fetch('/input.html').then(res => res.text())
  ]);

  document.getElementById('header-container').innerHTML = header;
  document.getElementById('main-container').innerHTML = dashboard + progress;
  document.getElementById('nav-container').innerHTML = nav;
  document.getElementById('modal-container').innerHTML = modal;

  if (window.HSStaticMethods) window.HSStaticMethods.autoInit();

  const tabGrafik = document.getElementById('tab-grafik');
  if (tabGrafik) tabGrafik.classList.add('hidden');
  
  window.switchTab = function(tabId) {
    const tabHistory = document.getElementById('tab-history');
    const tabGrafik = document.getElementById('tab-grafik');
    
    if (tabHistory) tabHistory.classList.add('hidden');
    if (tabGrafik) tabGrafik.classList.add('hidden');
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    const btns = document.querySelectorAll('.nav-tab-btn');
    btns.forEach(btn => {
      btn.classList.remove('text-brand-red');
      btn.classList.add('text-gray-400');
    });
    
    const activeBtn = document.querySelector(\`[onclick="switchTab('\${tabId}')"]\`);
    if (activeBtn) {
      activeBtn.classList.remove('text-gray-400');
      activeBtn.classList.add('text-brand-red');
    }
  };

  const fullName = user.user_metadata.full_name || 'Atlet';
  const tabHistoryH2 = document.querySelector('#tab-history h2');
  const tabHistoryImg = document.querySelector('#tab-history img');
  if (tabHistoryH2) tabHistoryH2.innerText = fullName;
  if (tabHistoryImg) tabHistoryImg.src = \`https://ui-avatars.com/api/?name=\${encodeURIComponent(fullName)}&background=ff4d4d&color=fff&bold=true\`;

  const { data: profile } = await supabase.from('profiles').select('role, birth_year').eq('id', user.id).single();
  const birthYear = (profile && profile.birth_year) ? profile.birth_year : (user.user_metadata.birth_year || new Date().getFullYear());
  
  if (profile && profile.role === 'admin') {
    const adminGear = document.getElementById('admin-gear');
    if (adminGear) adminGear.classList.remove('hidden');
  }

  document.addEventListener('click', async (e) => {
    if (e.target.closest('#theme-toggle')) {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
    if (e.target.closest('#btn-logout')) {
      if (confirm("Keluar dari aplikasi?")) {
        await supabase.auth.signOut();
        window.location.href = '/index.html';
      }
    }
    if (e.target.closest('#btn-open-modal')) {
      const modalInput = document.getElementById('modal-input');
      if (modalInput) modalInput.classList.remove('hidden');
    }
    if (e.target.closest('#btn-close-modal')) {
      const modalInput = document.getElementById('modal-input');
      if (modalInput) modalInput.classList.add('hidden');
    }
  });

  // Inject old logic
  ${logicPart}
};
});
`;

fs.writeFileSync('src/main.js', newMain.replace(/const modal = document.getElementById\('modal-input'\);/g, 'const modalElem = document.getElementById(\'modal-input\');').replace(/modal\.classList/g, 'modalElem.classList'));
