// src/profile_modal.js
// CORE PROFILE POPUP MODAL & KU ENGINE SYNCHRONIZED WITH TiDB CLOUD bray

export function initProfileModal() {
  if (document.getElementById('modal-profile-setting')) return;

  // 1. INJEKSI STRUKTUR POPUP PROFILE (Diadopsi dari komponen UI murni bawaan lu)
  const modalDiv = document.createElement('div');
  modalDiv.id = 'modal-profile-setting';
  modalDiv.className = 'hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300';
  
  modalDiv.innerHTML = `
    <div id="modal-profile-inner" class="bg-white dark:bg-[#1f1927] rounded-t-3xl sm:rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-800 transition-transform duration-300 translate-y-full sm:translate-y-0 sm:scale-95">
      
      <div class="sticky top-0 bg-white/90 dark:bg-[#1f1927]/90 backdrop-blur-md p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10">
        <div>
          <h3 class="font-bold text-gray-800 dark:text-white text-sm">Pengaturan Akun</h3>
          <p class="text-[10px] text-gray-400">Update biodata & kontak personal TiDB</p>
        </div>
        <button id="btn-close-profile" class="text-gray-400 hover:text-brand-red font-bold p-1.5 rounded-full bg-gray-50 dark:bg-[#140e16] transition-colors">✖</button>
      </div>

      <div class="p-4 space-y-5">
        <div class="flex flex-col items-center justify-center pt-1">
          <div class="relative group">
            <div class="w-20 h-20 rounded-full overflow-hidden border-4 border-gray-100 dark:border-[#251f2e] shadow-md bg-gray-200 dark:bg-gray-800">
              <img id="prof-popup-img" src="" class="w-full h-full object-cover">
            </div>
          </div>
        </div>

        <div class="space-y-4 bg-gray-50 dark:bg-[#140e16]/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm">
          <div>
            <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Lengkap</label>
            <input type="text" id="prof-popup-fullname" class="w-full px-3 py-2 bg-white dark:bg-[#140e16] border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors">
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Tahun Lahir</label>
              <input type="number" id="prof-popup-birth" class="w-full px-3 py-2 bg-white dark:bg-[#140e16] border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors">
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Role Akun</label>
              <input type="text" id="prof-popup-role" disabled class="w-full px-3 py-2 bg-gray-100 dark:bg-[#251f2e] border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs font-bold text-gray-500 cursor-not-allowed uppercase">
            </div>
          </div>

          <div>
            <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Username</label>
            <input type="text" id="prof-popup-username" class="w-full px-3 py-2 bg-white dark:bg-[#140e16] border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors">
          </div>
          <div>
            <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">Email Aktif</label>
            <input type="email" id="prof-popup-email" class="w-full px-3 py-2 bg-white dark:bg-[#140e16] border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors">
          </div>
          <div>
            <label class="text-[10px] font-bold text-gray-400 uppercase ml-1">No. WhatsApp</label>
            <input type="text" id="prof-popup-wa" class="w-full px-3 py-2 bg-white dark:bg-[#140e16] border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors">
          </div>
        </div>

        <button id="btn-popup-save-profile" class="w-full bg-brand-red hover:bg-red-600 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98]">
          💾 Simpan Perubahan
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modalDiv);

  // --- LOGIKA KONTROL INTERAKSI MODAL POPUP ---
  window.openProfileSetting = () => {
    const sessionUser = localStorage.getItem('swim_user');
    if (!sessionUser) return;
    const user = JSON.parse(sessionUser);

    document.getElementById('prof-popup-fullname').value = user.full_name || '';
    document.getElementById('prof-popup-birth').value = user.birth_year || '';
    document.getElementById('prof-popup-role').value = user.role || '';
    document.getElementById('prof-popup-username').value = user.username || '';
    document.getElementById('prof-popup-email').value = user.email || '';
    document.getElementById('prof-popup-wa').value = user.no_wa || '';
    document.getElementById('prof-popup-img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=random&bold=true`;

    modalDiv.classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('modal-profile-inner').classList.remove('translate-y-full', 'sm:scale-95');
    }, 10);
  };

  window.closeProfileSetting = () => {
    document.getElementById('modal-profile-inner').classList.add('translate-y-full');
    setTimeout(() => modalDiv.classList.add('hidden'), 250);
  };

  document.getElementById('btn-close-profile').addEventListener('click', window.closeProfileSetting);

  // --- LOGIKA SIMPAN PERUBAHAN PROFILE KE TiDB SERVERLESS VIA PUT API ---
  document.getElementById('btn-popup-save-profile').addEventListener('click', async () => {
    const sessionUser = localStorage.getItem('swim_user');
    if (!sessionUser) return;
    const user = JSON.parse(sessionUser);

    const payload = {
      id: user.id,
      full_name: document.getElementById('prof-popup-fullname').value.trim(),
      username: document.getElementById('prof-popup-username').value.trim(),
      email: document.getElementById('prof-popup-email').value.trim(),
      no_wa: document.getElementById('prof-popup-wa').value.trim(),
      birth_year: parseInt(document.getElementById('prof-popup-birth').value) || null
    };

    if (!payload.full_name) {
      alert("Nama lengkap tidak boleh kosong bray!");
      return;
    }

    try {
      const btn = document.getElementById('btn-popup-save-profile');
      btn.innerText = 'Menyimpan...';
      btn.disabled = true;

      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.success) {
        // Update LocalStorage Session State bray biar langsung singkron
        const updatedUserState = { ...user, ...payload };
        localStorage.setItem('swim_user', JSON.stringify(updatedUserState));
        
        if (window.showToast) window.showToast('Profil berhasil disimpan bray!', 'success');
        window.closeProfileSetting();
        setTimeout(() => window.location.reload(), 800);
      } else {
        alert("Gagal memperbarui profil: " + result.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      document.getElementById('btn-popup-save-profile').innerText = '💾 Simpan Perubahan';
      document.getElementById('btn-popup-save-profile').disabled = false;
    }
  });
}

// =========================================================
// 2. MODUL GLOBAL: INJEKSI DATA UI DASHBOARD & HITUNG KU (BALIKIN LOGIKA LAMA)
// =========================================================
export function initDashboardProfile() {
  const sessionUser = localStorage.getItem('swim_user');
  if (!sessionUser) return;
  const profile = JSON.parse(sessionUser);

  // 1. Injeksi Data Utama Ke Dashboard Atas Elemen Lu bray
  const dashName = document.getElementById('dash-fullname');
  const dashAvatar = document.getElementById('dash-avatar');
  const dashRole = document.getElementById('dash-role'); 
  const dashKuEl = document.getElementById('dashboard-ku-text');
  const dashGreeting = document.getElementById('dash-greeting');
  
  if (dashName) dashName.innerText = profile.full_name || 'Atlet';
  if (dashAvatar) dashAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=ff4d4d&color=fff&bold=true`;
  
  if (dashRole) dashRole.classList.add('hidden');

  // Logika Greeting Dinamis Pintu Putar Role
  if (dashGreeting) {
    let roleText = 'Atlet';
    if (profile.role === 'admin') roleText = 'Admin';
    else if (profile.role === 'coach' || profile.role === 'head_coach') roleText = 'Coach';
    else if (profile.role === 'parents') roleText = 'Parents';
    
    dashGreeting.innerText = `Halo ${roleText} Terbaik,`;
  }

  const adminGear = document.getElementById('admin-gear');
  if (adminGear && profile.role === 'admin') adminGear.classList.remove('hidden');

  // 2. Hitung KU (Kategori Umur) Atlet Sesuai Logic Murni V2 Lu bray!
  if (dashKuEl) {
    if (profile.role === 'admin') {
      dashKuEl.innerText = 'ADMIN';
      dashKuEl.className = 'text-[10px] font-bold text-gray-700 mt-1 bg-gray-200 border border-gray-300 px-2 py-0.5 rounded-md inline-block dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 tracking-wider';
    
    } else if (profile.role === 'coach' || profile.role === 'head_coach') {
      dashKuEl.innerText = 'HEAD COACH';
      dashKuEl.className = 'text-[10px] font-bold text-blue-600 mt-1 bg-blue-600/10 border border-blue-600/20 px-2 py-0.5 rounded-md inline-block dark:text-blue-400 tracking-wider';
    
    } else if (profile.role === 'parents') {
      dashKuEl.innerText = 'PARENTS DASHBOARD';
      dashKuEl.className = 'text-[10px] font-bold text-emerald-600 mt-1 bg-emerald-600/10 border border-emerald-600/20 px-2 py-0.5 rounded-md inline-block tracking-wider';
      
    } else {
      dashKuEl.className = 'text-[10px] font-bold text-brand-red mt-1 bg-brand-red/10 border border-brand-red/20 px-2 py-0.5 rounded-md inline-block';
      
      if (profile.birth_year) {
        window.atletBirthYear = profile.birth_year;
        const currentYear = new Date().getFullYear();
        const ageDash = currentYear - profile.birth_year;
        
        let kuDash = "Senior (> 18 Thn)";
        if (ageDash <= 9) kuDash = "KU 5 (<= 9 Thn)";
        else if (ageDash <= 11) kuDash = "KU 4 (10-11 Thn)";
        else if (ageDash <= 13) kuDash = "KU 3 (12-13 Thn)";
        else if (ageDash <= 15) kuDash = "KU 2 (14-15 Thn)";
        else if (ageDash <= 18) kuDash = "KU 1 (16-18 Thn)";
    
        dashKuEl.innerText = kuDash;
      } else {
        dashKuEl.innerText = "KU Belum Diatur";
      }
    }
  }

  // 3. Logika Pembantu Hitung Otomatis di Modal Event (Tetap Utuh)
  window.calculateKU = function() {
    const tglEvent = document.getElementById('input-tanggal-event');
    const thnLahirInput = document.getElementById('input-tahun-lahir');
    const displayKu = document.getElementById('display-ku');

    if (!window.atletBirthYear) return;
    if (thnLahirInput) thnLahirInput.value = window.atletBirthYear;
    
    if (!tglEvent || !tglEvent.value) {
        if (displayKu) displayKu.value = "Pilih Tgl Event";
        return;
    }
    
    const ageModal = new Date(tglEvent.value).getFullYear() - window.atletBirthYear;
    let kuModal = "Senior";
    if (ageModal <= 9) kuModal = "KU 5";
    else if (ageModal <= 11) kuModal = "KU 4";
    else if (ageModal <= 13) kuModal = "KU 3";
    else if (ageModal <= 15) kuModal = "KU 2";
    else if (ageModal <= 18) kuModal = "KU 1";
    
    if (displayKu) displayKu.value = kuModal;
  };

  const inputTglEvent = document.getElementById('input-tanggal-event');
  if (inputTglEvent) {
      inputTglEvent.addEventListener('change', window.calculateKU);
  }
  
  if (typeof window.calculateKU === 'function') window.calculateKU();
}