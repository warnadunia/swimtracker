import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    // Biar error overlay di layar mati pas dev
    hmr: {
      overlay: false,
    }
  },
  build: {
    rollupOptions: {
      input: {
        // Daftarkan semua halaman utama lu di sini biar ikut di-build
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        profile: resolve(__dirname, 'profile.html'),
        admin: resolve(__dirname, 'admin.html')
        // Kalau ada halaman lain, tambahkan formatnya di bawah sini
      }
    }
  }
});