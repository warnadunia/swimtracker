import './style.css';

//src/auth.js - UPDATE PINTU PUTAR RBAC V3
function redirectBasedOnRole(role) {
  if (role === 'admin') {
    window.location.replace('/admin.html');
  } else if (role === 'head_coach' || role === 'coach') {
    window.location.replace('/coach_app.html');
  } else if (role === 'parents') {
    window.location.replace('/parents_dashboard.html'); // Jalur khusus untuk Orang Tua bray!
  } else {
    window.location.replace('/app.html'); // Default Atlet
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. CEK SESI VIA LOCALSTORAGE (Pengganti Supabase Session)
  const sessionUser = localStorage.getItem('swim_user');
  if (sessionUser) {
    const user = JSON.parse(sessionUser);
    redirectBasedOnRole(user.role);
    return;
  }

  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  // ==========================================
  // LOGIC REGISTER (TI-DB SERVERLESS API)
  // ==========================================
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const btnSubmit = document.getElementById('btn-submit-register');
      const originalText = btnSubmit.innerText;
      btnSubmit.innerText = "Memproses...";
      btnSubmit.disabled = true;

      const name = document.getElementById('reg-name').value.trim();
      const rawUsername = document.getElementById('reg-username').value.trim().toLowerCase();
      const password = document.getElementById('reg-password').value; // Untuk kembangan auth real nanti bray
      const birthYear = document.getElementById('reg-year').value.trim();

      // Generate UUID v4 murni di client-side untuk ID user baru
      const generatedId = crypto.randomUUID(); 

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: generatedId,
            username: rawUsername,
            full_name: name,
            birth_year: parseInt(birthYear),
            password: password,
            role: 'atlet' // Default signup awal
          })
        });

        const result = await response.json();

        if (result.success) {
          alert('Pendaftaran berhasil ke TiDB! Silakan Login.');
          e.target.reset(); 
          window.switchAuth('login');
        } else {
          alert('Gagal mendaftar: ' + (result.error || result.message));
        }
      } catch (err) {
        console.error("Register Error:", err);
        alert('Terjadi kesalahan jaringan/server.');
      } finally {
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
      }
    });
  }

  // ==========================================
  // LOGIC LOGIN (TI-DB SERVERLESS API)
  // ==========================================
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const btnSubmit = document.getElementById('btn-submit-login');
      const originalText = btnSubmit.innerText;
      btnSubmit.innerText = "Mengecek...";
      btnSubmit.disabled = true;

      const rawUsername = document.getElementById('login-username').value.trim().toLowerCase();
      const password = document.getElementById('login-password').value;

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: rawUsername,
            password: password
          })
        });

        const result = await response.json();

        if (result.success) {
          // Simpan session user (termasuk id, full_name, role) ke localStorage
          localStorage.setItem('swim_user', JSON.stringify(result.user));
          
          // Langsung lempar berdasarkan role yang dikembalikan dari API TiDB
          redirectBasedOnRole(result.user.role);
        } else {
          alert('Login gagal: ' + (result.message || 'Username atau Password salah!'));
        }
      } catch (err) {
        console.error("Login Error:", err);
        alert('Terjadi kesalahan jaringan/server.');
      } finally {
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
      }
    });
  }
});