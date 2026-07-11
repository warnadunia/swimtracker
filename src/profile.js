document.addEventListener('DOMContentLoaded', async () => {
  const userStr = localStorage.getItem('swimUser');
  if (!userStr) {
    window.location.href = '/index.html';
    return;
  }
  const user = JSON.parse(userStr);

  const btnSave = document.getElementById('btn-save');
  const avatarUpload = document.getElementById('avatar-upload');
  const profileImg = document.getElementById('profile-img');
  let currentAvatarBase64 = null;

  // Form Fields
  const fields = {
    fullname: document.getElementById('prof-fullname'),
    birth: document.getElementById('prof-birth'),
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

  // Load Profile Data
  async function loadProfile() {
    try {
      const response = await fetch(`/api/profile?action=get_profile&user_id=${user.id}`);
      const result = await response.json();
      if (result.success) {
        const data = result.data;
        fields.fullname.value = data.full_name || '';
        fields.birth.value = data.birth_year || '';
        fields.birthplace.value = data.birth_place || '';
        if (data.birth_date) {
           const d = new Date(data.birth_date);
           fields.birthdate.value = d.toISOString().split('T')[0];
        }
        fields.gender.value = data.gender || 'L';
        fields.nik.value = data.nik || '';
        fields.address.value = data.address || '';
        fields.school.value = data.school_name || '';
        fields.nisn.value = data.nisn || '';
        fields.club.value = data.club_name || '';
        fields.father.value = data.parent_name_father || '';
        fields.mother.value = data.parent_name_mother || '';
        fields.parentphone.value = data.parent_phone || '';
        fields.role.value = data.role || '';
        fields.username.value = data.username || '';
        fields.email.value = data.email || '';
        // Note: we don't have WA saved in the DB schema in our query, but we can assume it's parent_phone or add it to profiles. We'll use parent_phone for now.
        fields.wa.value = data.parent_phone || '';
        
        if (data.avatar_url) {
          profileImg.src = data.avatar_url;
        } else {
          profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name || 'User')}&background=random`;
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  }

  // Handle Avatar Upload Preview
  avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        profileImg.src = e.target.result;
        currentAvatarBase64 = e.target.result;
        document.getElementById('upload-status').innerText = 'Foto dipilih.';
      };
      reader.readAsDataURL(file);
    }
  });

  // Save Profile
  btnSave.addEventListener('click', async () => {
    btnSave.innerText = 'Menyimpan...';
    btnSave.disabled = true;

    const payload = {
      user_id: user.id,
      profile_data: {
        full_name: fields.fullname.value,
        username: fields.username.value,
        email: fields.email.value,
        birth_year: fields.birth.value
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
        avatar_url: profileImg.src.startsWith('data:') ? null : profileImg.src
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
        alert('Profil berhasil diperbarui!');
        if (result.avatar_url) {
           profileImg.src = result.avatar_url;
           currentAvatarBase64 = null;
           document.getElementById('upload-status').innerText = '';
        }
        
        // Update user localStorage name
        user.full_name = fields.fullname.value;
        localStorage.setItem('swimUser', JSON.stringify(user));
      } else {
        alert('Gagal: ' + result.message);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan.');
    } finally {
      btnSave.innerText = 'Simpan Perubahan';
      btnSave.disabled = false;
    }
  });

  loadProfile();
});
