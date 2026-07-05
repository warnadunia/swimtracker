import { supabase } from './supabase';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cek Sesi Login
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { 
    window.location.href = '/index.html'; 
    return; 
  }
  
  const userId = session.user.id;

  // 🚨 TAMBAHKAN SATPAM INI BRAY 🚨
  // Cek apakah ada elemen khusus halaman profil. Kalau tidak ada, batalkan eksekusi di bawahnya.
  const isProfilePage = document.getElementById('prof-fullname');
  if (!isProfilePage) return;

  // 2. Load Data Profil
  async function loadMyProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, username, role, birth_year, email, no_wa, avatar_url')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      document.getElementById('prof-fullname').value = data.full_name || '';
      document.getElementById('prof-username').value = data.username || '';
      document.getElementById('prof-role').value = (data.role || '').toUpperCase();
      document.getElementById('prof-birth').value = data.birth_year || '';
      document.getElementById('prof-email').value = data.email || '';
      document.getElementById('prof-wa').value = data.no_wa || '';
      
      if (data.avatar_url) {
        document.getElementById('profile-img').src = data.avatar_url;
      } else {
        document.getElementById('profile-img').src = `https://ui-avatars.com/api/?name=${data.full_name || 'User'}&background=random`;
      }
    }
  }

  // 3. Handle Upload Foto Profil
  const uploadInput = document.getElementById('avatar-upload');
  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('upload-status');
    statusEl.innerText = '⏳ Mengunggah foto...';
    statusEl.classList.add('text-blue-500');

    // Buat nama file unik
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;

    // Upload ke bucket 'avatars' di Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      statusEl.innerText = '❌ Gagal upload: ' + uploadError.message;
      statusEl.classList.replace('text-blue-500', 'text-brand-red');
      return;
    }

    // Ambil URL Publik
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = data.publicUrl;

    // Update foto di layar & database
    document.getElementById('profile-img').src = publicUrl;
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
    
    statusEl.innerText = '✅ Foto berhasil diperbarui!';
    statusEl.classList.replace('text-blue-500', 'text-green-500');
    setTimeout(() => { statusEl.innerText = ''; }, 3000);
  });

  // 4. Handle Simpan Perubahan Biodata
  document.getElementById('btn-save').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save');
    btn.innerText = 'Menyimpan...';
    btn.classList.add('opacity-70');

    const payload = {
      full_name: document.getElementById('prof-fullname').value,
      username: document.getElementById('prof-username').value,
      birth_year: parseInt(document.getElementById('prof-birth').value) || null,
      email: document.getElementById('prof-email').value,
      no_wa: document.getElementById('prof-wa').value
    };

    const { error } = await supabase.from('profiles').update(payload).eq('id', userId);

    if (error) {
      alert("Gagal menyimpan data: " + error.message);
    } else {
      alert("✅ Profil berhasil diperbarui!");
    }
    
    btn.innerText = 'Simpan Perubahan';
    btn.classList.remove('opacity-70');
  });

  loadMyProfile();
});

// =========================================================
// FUNGSI EKSPORT UNTUK DASHBOARD (Dipanggil dari main.js)
// =========================================================
export async function initDashboardProfile(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, birth_year, avatar_url')
    .eq('id', userId)
    .single();
  
  if (!profile) return;

  // 1. Injeksi Data ke UI Dashboard
  const dashName = document.getElementById('dash-fullname');
  const dashAvatar = document.getElementById('dash-avatar');
  const dashRole = document.getElementById('dash-role'); 
  const dashKuEl = document.getElementById('dashboard-ku-text');
  const dashGreeting = document.getElementById('dash-greeting');
  
  if (dashName) dashName.innerText = profile.full_name || 'Atlet';
  if (dashAvatar) dashAvatar.src = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=ff4d4d&color=fff&bold=true`;
  
  // Sembunyikan badge role di sebelah nama biar gak dobel
  if (dashRole) dashRole.classList.add('hidden');

  // Logika Greeting Dinamis
  if (dashGreeting) {
    let roleText = 'Atlet';
    if (profile.role === 'admin') roleText = 'Admin';
    else if (profile.role === 'coach') roleText = 'Coach';
    
    dashGreeting.innerText = `Halo ${roleText} Terbaik,`;
  }

  // Tampilkan gear menu tambahan khusus Admin (kalau lu pake)
  const adminGear = document.getElementById('admin-gear');
  if (adminGear && profile.role === 'admin') {
    adminGear.classList.remove('hidden');
  }

  // 2. Logika Teks di Bawah Nama (KU / ADMIN / COACH)
  if (dashKuEl) {
    if (profile.role === 'admin') {
      dashKuEl.innerText = 'ADMIN';
      // Ganti style jadi warna Admin (Dark/Gray)
      dashKuEl.className = 'text-[10px] font-bold text-gray-700 mt-1 bg-gray-200 border border-gray-300 px-2 py-0.5 rounded-md inline-block dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 tracking-wider';
    
    } else if (profile.role === 'coach') {
      dashKuEl.innerText = 'HEAD COACH';
      // Ganti style jadi warna Coach (Blue)
      dashKuEl.className = 'text-[10px] font-bold text-blue-600 mt-1 bg-blue-600/10 border border-blue-600/20 px-2 py-0.5 rounded-md inline-block dark:text-blue-400 tracking-wider';
    
    } else {
      // Role ATLET (Balikin ke style warna Merah bawaan)
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

  // 3. Logika Helper untuk Modal Event
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
  
  // Panggil sekali agar form modal siap
  if (typeof window.calculateKU === 'function') window.calculateKU();
}