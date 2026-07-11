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
        parents_dashboard: resolve(__dirname, 'parents_dashboard.html'),
        biodata: resolve(__dirname, 'biodata.html'),
        admin: resolve(__dirname, 'admin.html'),
        coach_app: resolve(__dirname, 'coach_app.html'),
        coach_setup_tt: resolve(__dirname, 'coach_setup_tt.html'),
        coach_stopwatch_tt: resolve(__dirname, 'coach_stopwatch_tt.html'),
        profile: resolve(__dirname, 'profile.html'),
        progress: resolve(__dirname, 'progress.html'),
        training: resolve(__dirname, 'training.html')
      }
    }
  }
});