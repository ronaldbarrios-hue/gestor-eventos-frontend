import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      /* injectManifest: usamos nuestro propio archivo de service worker
         (src/sw.js) para poder manejar eventos "push" y "notificationclick"
         manualmente — generateSW (lo que usábamos antes) no soporta push
         nativo sin este cambio. El plugin igual se encarga de inyectar el
         precache de los archivos del build dentro de nuestro sw.js. */
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      manifest: false,
      includeAssets: ['icon-192.svg', 'icon-512.svg', 'icon-maskable.svg'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
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
          /* Los pesados de PDF NO se agrupan: los coloca Rollup.
             Caían en el `vendor` de abajo junto a axios —que lo usa todo—, así
             que el paquete entero se descargaba al abrir CUALQUIER página,
             también la pública y también el formulario metido en la web de un
             cliente. Y `jspdf` sólo hace falta después de comprar y sólo si
             alguien pulsa «descargar».
             Se devuelve `undefined` en vez de darles un nombre propio: con un
             nombre propio, Rollup les metía dentro su ayudante de precarga y el
             trozo volvía a cargarse desde el principio — separado en el papel y
             descargado igual. Sin nombre, cada uno cae en el trozo perezoso de
             quien lo pide. */
          if (id.includes('jspdf') || id.includes('pdfjs-dist') || id.includes('html2canvas'))
            return undefined;
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
