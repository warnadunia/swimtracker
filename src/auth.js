import './style.css';
import { supabase } from './supabase';

document.addEventListener('DOMContentLoaded', () => {
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  // ==========================================
  // LOGIC REGISTER (USERNAME HACK)
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
      const password = document.getElementById('reg-password').value;
      const birthYear = document.getElementById('reg-year').value.trim();

      // Buat fake email dari username agar diterima Supabase
      const fakeEmail = rawUsername.replace(/\s+/g, '') + '@swimapp.local';

      const { data, error } = await supabase.auth.signUp({
        email: fakeEmail,
        password: password,
        options: {
          data: {
            full_name: name,
            birth_year: parseInt(birthYear)
          }
        }
      });

      btnSubmit.innerText = originalText;
      btnSubmit.disabled = false;

      if (error) {
        alert('Gagal mendaftar: ' + error.message);
      } else {
        alert('Pendaftaran berhasil! Silakan Login.');
        e.target.reset(); 
        window.switchAuth('login');
      }
    });
  }

  // ==========================================
  // LOGIC LOGIN (USERNAME HACK)
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
      const fakeEmail = rawUsername.replace(/\s+/g, '') + '@swimapp.local';

      const { data, error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: password
      });

      btnSubmit.innerText = originalText;
      btnSubmit.disabled = false;

      if (error) {
        alert('Login gagal: Username atau Password salah!');
      } else {
        window.location.href = '/index.html';
      }
    });
  }
});