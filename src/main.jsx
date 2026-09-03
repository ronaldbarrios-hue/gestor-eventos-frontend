import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { I18nProvider } from './context/I18nContext.jsx';

/* El service worker de vite-plugin-pwa, con `registerType: 'autoUpdate'`.
 *
 * ── Por qué hay un temporizador aquí ────────────────────────────────
 *
 * `autoUpdate` recoge la versión nueva **cuando el navegador vuelve a pedir el
 * service worker**, y eso pasa al abrir la página otra vez. Una pestaña que se
 * queda abierta —el panel del organizador, que se deja puesto todo el día— se
 * puede quedar semanas con el paquete viejo: se despliega un arreglo, la
 * persona recarga con F5, el service worker le sirve lo que tenía guardado y
 * jura que el arreglo no llegó.
 *
 * Pasó hoy, y costó una hora de mirar el sitio equivocado.
 *
 * Con esto, la pestaña pregunta cada media hora si hay algo nuevo. No
 * interrumpe: `autoUpdate` cambia el paquete por debajo y la siguiente
 * navegación ya es la nueva. */
const MEDIA_HORA = 30 * 60 * 1000;

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registro) {
      if (!registro) return;
      setInterval(() => {
        /* Sin conexión, `update()` rechaza; no es un fallo que merezca ruido en
           la consola de quien está trabajando. */
        registro.update().catch(() => {});
      }, MEDIA_HORA);
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);
