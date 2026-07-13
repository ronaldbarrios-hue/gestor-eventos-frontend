import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      /* injectManifest generaría un SW manual; con "generateSW" (default)
         vite-plugin-pwa arma el service worker automáticamente basado en
         los assets del build — es la opción recomendada para empezar. */
      registerType: 'autoUpdate',
      /* No tocamos tu manifest.webmanifest existente — le decimos al plugin
         que use el que ya tienes en /public en vez de generar uno nuevo. */
      manifest: false,
      includeAssets: ['icon-192.svg', 'icon-512.svg', 'icon-maskable.svg'],
      workbox: {
        /* Cachea los archivos estáticos del build para que la app cargue
           rápido en visitas repetidas y funcione algo mejor con mala señal. */
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        /* No cachees las respuestas de la API — siempre deben ser frescas
           (tickets, check-ins, etc. no se pueden servir desde caché vieja). */
        navigateFallbackDenylist: [/^\/api/, /^\/eventos/, /^\/me/],
      },
    }),
  ],
  server: {
    port: 5173,
    /* Sin proxy. Las llamadas al backend usan axios contra VITE_API_URL
       (o http://localhost:3000 por defecto). El proxy viejo interceptaba
       rutas del SPA como /eventos/:id y rompía el refresh del navegador. */
  },
  build: {
    /* Separa los vendors pesados en chunks propios para mejor cache
       (cambian poco) y para que el chunk principal no los arrastre. */
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@supabase'))                 return 'vendor-supabase';
          if (id.includes('@dnd-kit'))                  return 'vendor-dnd';
          if (id.includes('qrcode') || id.includes('html5-qrcode')) return 'vendor-qr';
          if (id.includes('react-router'))              return 'vendor-router';
          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
          return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
