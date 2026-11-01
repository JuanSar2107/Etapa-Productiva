import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // El frontend llama a /api/... y Vite lo reenvía al backend: así la cookie de sesión es del mismo origen.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
