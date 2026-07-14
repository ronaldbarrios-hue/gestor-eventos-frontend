import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { ThemeProvider } from './context/ThemeContext.jsx';

/* Registra el service worker generado por vite-plugin-pwa. Se actualiza
   automáticamente en segundo plano (registerType: 'autoUpdate' en vite.config.js). */
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
