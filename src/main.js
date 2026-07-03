import './style.css';
import Chart from 'chart.js/auto';

// ==========================================
// 1. SEMUA EVENT LISTENER SAAT HALAMAN DIBUKA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  
  // --- A. Dark Mode Toggle ---
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
    });
  }

  // --- B. Logic Modal Input Data ---
  const modal = document.getElementById('modal-input');
  const modalInner = document.getElementById('modal-inner');
  const btnOpen = document.getElementById('btn-open-modal');
  const btnClose = document.getElementById('btn-close-modal');

  function toggleModal() {
    if (modal.classList.contains('hidden')) {
      // Buka Modal
      modal.classList.remove('hidden');
      setTimeout(() => {
        modalInner.classList.remove('opacity-0', 'translate-y-10');
      }, 10);
    } else {
      // Tutup Modal
      modalInner.classList.add('opacity-0', 'translate-y-10');
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 300);
    }
  }

  if (modal && btnOpen && btnClose) {
    btnOpen.addEventListener('click', toggleModal);
    btnClose.addEventListener('click', toggleModal);
  }

  // ==========================================
  // LOGIC FILTER GAYA RENANG (TABS)
  // ==========================================
  const gayaPills = document.querySelectorAll('.filter-gaya');
  gayaPills.forEach(pill => {
    pill.addEventListener('click', () => {
      // Reset semua pill ke style default (tidak aktif)
      gayaPills.forEach(p => {
        p.classList.remove('active-gaya', 'bg-brand-red', 'text-white', 'shadow-md', 'shadow-brand-red/40');
        p.classList.add('bg-gray-100', 'dark:bg-brand-card', 'text-gray-500', 'dark:text-gray-400', 'border', 'border-gray-200', 'dark:border-gray-700');
      });
      // Aktifkan pill yang diklik
      pill.classList.remove('bg-gray-100', 'dark:bg-brand-card', 'text-gray-500', 'dark:text-gray-400', 'border', 'border-gray-200', 'dark:border-gray-700');
      pill.classList.add('active-gaya', 'bg-brand-red', 'text-white', 'shadow-md', 'shadow-brand-red/40');
      
      // TODO ke depan: Panggil fungsi update data Chart & Tabel berdasarkan gaya renang
    });
  });

  // ==========================================
  // INISIALISASI CHART.JS (GRAFIK TREN WAKTU)
  // ==========================================
  const ctxChart = document.getElementById('prestasiChart');
  if (ctxChart) {
    new Chart(ctxChart, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'],
        datasets: [
          {
            label: 'Tahun Berjalan (2026)',
            data: [32.4, 32.0, 31.5, 30.8, 30.2, 29.8, null, null, null, null, null, null],
            borderColor: '#ff4d4d',
            backgroundColor: '#ff4d4d',
            borderWidth: 3,
            tension: 0.3, // Membuat garis sedikit melengkung (smooth)
            pointRadius: 4,
            pointBackgroundColor: '#ff4d4d',
          },
          {
            label: 'Tahun Lalu (2025)',
            data: [35.1, 34.8, 34.5, 34.2, 34.0, 33.5, 33.2, 33.0, 32.9, 32.6, 32.5, 32.2],
            borderColor: '#4b5563', // gray-600
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0, // Sembunyikan titik agar tidak ramai
          },
          {
            label: 'Limit KU',
            // Data statis garis kuning Limit KU
            data: [28.5, 28.5, 28.5, 28.5, 28.5, 28.5, 28.5, 28.5, 28.5, 28.5, 28.5, 28.5],
            borderColor: '#eab308', // yellow-500
            borderWidth: 2,
            borderDash: [5, 5], // Garis putus-putus
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: false // Sembunyikan legend bawaan, pakai custom HTML di atas
          },
          tooltip: {
            backgroundColor: 'rgba(26, 26, 46, 0.9)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#374151',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y} s`;
              }
            }
          }
        },
        scales: {
          y: {
            reverse: true, // MAGIC! Angka kecil di atas, angka besar di bawah
            min: 27,
            max: 36,
            grid: {
              color: 'rgba(75, 85, 99, 0.2)', // Garis grid transparan
              drawBorder: false,
            },
            ticks: {
              color: '#9ca3af',
              stepSize: 2
            }
          },
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: '#9ca3af',
              font: { size: 10 }
            }
          }
        }
      }
    });
  }
  
  // --- C. Logic Auto Calculate KU (Kelompok Umur) ---
  const tglEvent = document.getElementById('input-tanggal-event');
  const thnLahir = document.getElementById('input-tahun-lahir');
  const displayKu = document.getElementById('display-ku');

  function calculateKU() {
    if (tglEvent.value && thnLahir.value) {
      const eventYear = new Date(tglEvent.value).getFullYear();
      const age = eventYear - parseInt(thnLahir.value);
      
      let ku = "";
      if (age <= 9) ku = "KU 5 (<= 9 Thn)";
      else if (age <= 11) ku = "KU 4 (10-11 Thn)";
      else if (age <= 13) ku = "KU 3 (12-13 Thn)";
      else if (age <= 15) ku = "KU 2 (14-15 Thn)";
      else if (age <= 18) ku = "KU 1 (16-18 Thn)";
      else ku = "Senior (> 18 Thn)";
      
      displayKu.value = ku;
    } else {
      displayKu.value = "";
    }
  }

  if (tglEvent && thnLahir) {
    tglEvent.addEventListener('change', calculateKU);
    thnLahir.addEventListener('input', calculateKU);
  }

  // --- D. Logic Tambah Baris Nomor Kejuaraan ---
  const btnAddNomor = document.getElementById('btn-add-nomor');
  const containerNomor = document.getElementById('container-nomor-lomba');

  if (btnAddNomor && containerNomor) {
    btnAddNomor.addEventListener('click', () => {
      const newRow = document.createElement('div');
      newRow.className = 'row-lomba grid grid-cols-12 gap-1 items-center opacity-0 transition-opacity duration-300';
      newRow.innerHTML = `
        <div class="col-span-5">
          <select class="w-full px-1 py-1.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs appearance-none focus:border-brand-red outline-none">
            <option selected disabled>Pilih Nomor</option>
            <option>50 M Gaya Bebas</option>
            <option>100 M Gaya Bebas</option>
            <option>50 M Punggung</option>
          </select>
        </div>
        <div class="col-span-4 relative flex items-center justify-center">
          <input type="text" placeholder="00:00:00:00" class="time-input w-full px-1 py-1.5 text-center bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs font-mono focus:border-brand-red outline-none pr-5">
          <button type="button" onclick="openStopwatch(this)" class="absolute right-1 text-brand-red hover:text-red-700">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </button>
        </div>
        <div class="col-span-2">
          <input type="number" placeholder="-" class="w-full px-1 py-1.5 text-center bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none">
        </div>
        <div class="col-span-1 flex justify-center">
          <button type="button" class="text-gray-400 hover:text-brand-red" onclick="this.closest('.row-lomba').remove()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      `;
      containerNomor.appendChild(newRow);
      setTimeout(() => newRow.classList.remove('opacity-0'), 10);
    });
  }

}); // <-- End of DOMContentLoaded

// ==========================================
// 2. AUTO-MASKING INPUT WAKTU (00:00:00:00)
// ==========================================
// Event delegation digunakan agar row yang baru ditambah tetap terdeteksi
document.addEventListener('input', (e) => {
  if (e.target.classList.contains('time-input')) {
    // Hilangkan semua karakter selain angka
    let val = e.target.value.replace(/\D/g, ''); 
    // Pisahkan tiap 2 digit dengan titik dua (:)
    let formatted = val.match(/.{1,2}/g)?.join(':') || '';
    // Batasi maksimal 11 karakter (contoh: 00:00:00:00)
    e.target.value = formatted.substring(0, 11);
  }
});


// ==========================================
// 3. LOGIC PINDAH TAB (Didaftarkan ke Window)
// ==========================================
window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('block');
  });
  const activeTab = document.getElementById(tabId);
  if (activeTab) {
    activeTab.classList.remove('hidden');
    activeTab.classList.add('block');
  }
};


// ==========================================
// 4. LOGIC POP-UP STOPWATCH LIVE (00:00:00:00)
// ==========================================
let swInterval = null;
let swStartTime = 0;
let swElapsedTime = 0;
let swIsRunning = false;
let activeInputField = null; 
let wakeLock = null;

async function toggleWakeLock(shouldLock) {
  try {
    if ('wakeLock' in navigator) {
      if (shouldLock && wakeLock === null) {
        wakeLock = await navigator.wakeLock.request('screen');
      } else if (!shouldLock && wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
      }
    }
  } catch (err) {
    console.error(`Wake Lock Error: ${err.message}`);
  }
}

window.openStopwatch = function(btnElement) {
  activeInputField = btnElement.previousElementSibling; 
  const modalSw = document.getElementById('modal-stopwatch');
  modalSw.classList.remove('hidden');
  setTimeout(() => modalSw.classList.remove('opacity-0'), 10);
};

window.closeStopwatch = function() {
  if (swIsRunning) window.toggleStopwatch(); 
  const modalSw = document.getElementById('modal-stopwatch');
  modalSw.classList.add('opacity-0');
  setTimeout(() => modalSw.classList.add('hidden'), 300);
};

// Format Output (HH:MM:SS:ms) disesuaikan jadi 4 segmen
function formatTime(timeInMs) {
  const date = new Date(timeInMs);
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  const ms = String(Math.floor(date.getUTCMilliseconds() / 10)).padStart(2, '0');
  return `${h}:${m}:${s}:${ms}`;
}

function updateDisplay() {
  const currentTime = Date.now();
  const timeToDisplay = swElapsedTime + (currentTime - swStartTime);
  document.getElementById('sw-display').innerText = formatTime(timeToDisplay);
}

window.toggleStopwatch = function() {
  const btnStart = document.getElementById('sw-btn-start');
  const btnSave = document.getElementById('sw-btn-save');

  if (!swIsRunning) {
    swIsRunning = true;
    swStartTime = Date.now();
    swInterval = setInterval(updateDisplay, 10); 
    toggleWakeLock(true); 

    btnStart.innerText = "STOP";
    btnStart.className = "w-24 h-24 rounded-full bg-gray-800 text-white font-bold text-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:scale-105 transition-transform flex items-center justify-center animate-pulse";
    btnSave.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
  } else {
    swIsRunning = false;
    clearInterval(swInterval);
    swElapsedTime += Date.now() - swStartTime;
    toggleWakeLock(false);

    btnStart.innerText = "RESUME";
    btnStart.className = "w-24 h-24 rounded-full bg-brand-red text-white font-bold text-xl shadow-[0_0_30px_rgba(255,77,77,0.5)] hover:scale-105 transition-transform flex items-center justify-center";
    btnSave.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
  }
};

window.resetStopwatch = function() {
  clearInterval(swInterval);
  swIsRunning = false;
  swElapsedTime = 0;
  document.getElementById('sw-display').innerText = "00:00:00:00";
  
  const btnStart = document.getElementById('sw-btn-start');
  btnStart.innerText = "START";
  btnStart.className = "w-24 h-24 rounded-full bg-brand-red text-white font-bold text-xl shadow-[0_0_30px_rgba(255,77,77,0.5)] hover:scale-105 transition-transform flex items-center justify-center";
  
  document.getElementById('sw-btn-save').classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
  toggleWakeLock(false);
};

window.saveStopwatch = function() {
  if (activeInputField) {
    activeInputField.value = document.getElementById('sw-display').innerText;
  }
  window.closeStopwatch();
  window.resetStopwatch(); 
};