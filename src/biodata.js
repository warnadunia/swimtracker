document.addEventListener('DOMContentLoaded', async () => {
  const parentStr = localStorage.getItem('swim_user');
  if (!parentStr) {
    window.location.href = '/index.html';
    return;
  }
  const parentProfile = JSON.parse(parentStr);

  const urlParams = new URLSearchParams(window.location.search);
  const athleteId = urlParams.get('id');
  const athleteName = urlParams.get('name') || 'Atlet';

  if (!athleteId) {
    alert("ID Atlet tidak ditemukan!");
    window.location.href = '/parents_dashboard.html';
    return;
  }

  // Setup header & back button
  const headerName = document.getElementById('header-name');
  if (headerName) headerName.innerText = athleteName;

  const btnBack = document.getElementById('btn-back');
  if (btnBack) btnBack.href = 'javascript:history.back()'; // Perbaikan Back Button

  const btnSave = document.getElementById('btn-save');
  const avatarUpload = document.getElementById('avatar-upload');
  const profileImg = document.getElementById('profile-img');
  let currentAvatarBase64 = null;

  // Form Fields (Hapus prof-birth karena tidak ada di HTML)
  const fields = {
    fullname: document.getElementById('prof-fullname'),
    birthplace: document.getElementById('prof-birthplace'),
    birthdate: document.getElementById('prof-birthdate'),
    gender: document.getElementById('prof-gender'),
    nik: document.getElementById('prof-nik'),
    address: document.getElementById('prof-address'),
    school: document.getElementById('prof-school'),
    nisn: document.getElementById('prof-nisn'),
    club: document.getElementById('prof-club'),
    father: document.getElementById('prof-father'),
    mother: document.getElementById('prof-mother'),
    parentphone: document.getElementById('prof-parentphone'),
    role: document.getElementById('prof-role'),
    username: document.getElementById('prof-username'),
    email: document.getElementById('prof-email'),
    wa: document.getElementById('prof-wa')
  };

  // Helper untuk assign value dengan aman
  const setVal = (fieldEl, value) => {
    if (fieldEl) fieldEl.value = value || '';
  };

  // Load Profile Data
  async function loadProfile() {
    try {
      const response = await fetch(`/api/profile?action=get_profile&user_id=${athleteId}`);
      const result = await response.json();
      if (result.success) {
        const data = result.data;

        setVal(fields.fullname, data.full_name);
        setVal(fields.birthplace, data.birth_place);
        setVal(fields.gender, data.gender || 'L');
        setVal(fields.nik, data.nik);
        setVal(fields.address, data.address);
        setVal(fields.school, data.school_name);
        setVal(fields.nisn, data.nisn);
        setVal(fields.club, data.club_name);
        setVal(fields.father, data.parent_name_father);
        setVal(fields.mother, data.parent_name_mother);
        setVal(fields.parentphone, data.parent_phone);
        setVal(fields.role, data.role);
        setVal(fields.username, data.username);
        setVal(fields.email, data.email);
        setVal(fields.wa, data.no_wa || data.parent_phone); // Sinkronisasi dgn kolom TiDB

        if (data.birth_date && fields.birthdate) {
          const d = new Date(data.birth_date);
          fields.birthdate.value = d.toISOString().split('T')[0];
        }

        if (profileImg) {
          if (data.avatar_url) {
            profileImg.src = data.avatar_url;
          } else {
            profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name || 'User')}&background=random`;
          }
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  }

  // Handle Avatar Upload Preview
  if (avatarUpload) {
    avatarUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (profileImg) profileImg.src = ev.target.result;
          currentAvatarBase64 = ev.target.result;
          const status = document.getElementById('upload-status');
          if (status) status.innerText = 'Foto dipilih.';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Save Profile
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      btnSave.innerText = 'Menyimpan...';
      btnSave.disabled = true;

      // Ekstrak Tahun dari Tanggal Lahir otomatis
      const birthYearVal = fields.birthdate.value ? parseInt(fields.birthdate.value.split('-')[0]) : null;

      const payload = {
        user_id: athleteId,
        profile_data: {
          full_name: fields.fullname.value,
          username: fields.username.value,
          email: fields.email.value,
          birth_year: birthYearVal,
          no_wa: fields.wa.value // Update kolom no_wa
        },
        biodata: {
          nisn: fields.nisn.value,
          nik: fields.nik.value,
          gender: fields.gender.value,
          birth_place: fields.birthplace.value,
          birth_date: fields.birthdate.value,
          school_name: fields.school.value,
          address: fields.address.value,
          parent_name_father: fields.father.value,
          parent_name_mother: fields.mother.value,
          parent_phone: fields.parentphone.value,
          club_name: fields.club.value,
          avatar_url: (profileImg && profileImg.src.startsWith('data:')) ? null : (profileImg ? profileImg.src : null)
        },
        avatar_base64: currentAvatarBase64
      };

      try {
        const response = await fetch('/api/profile?action=update_profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
          alert('Biodata berhasil diperbarui!');
          if (result.avatar_url && profileImg) {
            profileImg.src = result.avatar_url;
            currentAvatarBase64 = null;
            const status = document.getElementById('upload-status');
            if (status) status.innerText = '';
          }
        } else {
          alert('Gagal: ' + result.message);
        }
      } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan saat menyimpan data.');
      } finally {
        btnSave.innerText = 'Simpan Perubahan';
        btnSave.disabled = false;
      }
    });
  }

  loadProfile();
});