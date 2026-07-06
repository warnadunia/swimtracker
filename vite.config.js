import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    hmr: {
      overlay: false,
    }
  },
  build: {
    rollupOptions: {
      input: {
        // HANYA MASUKKAN HALAMAN UTAMA (FULL HTML) DI SINI
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        profile: resolve(__dirname, 'profile.html'),
        admin: resolve(__dirname, 'admin.html'),
        coach_app: resolve(__dirname, 'coach_app.html'),
        coach_tt_setup: resolve(__dirname, 'coach_tt_setup.html'),
        coach_tt_stopwatch: resolve(__dirname, 'coach_tt_stopwatch.html')
      }
    }
  }
});