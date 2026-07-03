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
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});