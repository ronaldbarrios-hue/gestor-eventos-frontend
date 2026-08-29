import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';

/* El QR como PNG, para descargarlo o para meterlo en el PDF.
 *
 * ── Por qué no se serializa el SVG que ya está en pantalla ────────────────
 *
 * La página pinta el QR con `QRCodeSVG`, y lo obvio sería copiar ese nodo.
 * Pero pasar un SVG por un canvas depende de que el navegador lo rasterice
 * bien, y Safari lo hace mal en cuanto hay CSS de por medio: sale movido, o
 * en blanco, o con el tamaño de la pantalla en vez del que se pidió. Un canvas
 * propio, dibujado a la resolución que se quiere, no tiene esa duda: lo que se
 * descarga es exactamente lo que se generó.
 *
 * Esto vivía dentro de `boletaPdf.jsx`. Salió aquí cuando el botón de
 * descargar el QR apareció también en la confirmación del registro y en la
 * boleta del asistente: tres copias del mismo truco se habrían separado a la
 * primera corrección.
 */
export function qrPng(valor, px = 480) {
  const caja = document.createElement('div');
  caja.style.cssText = 'position:fixed;left:-9999px;top:0;pointer-events:none';
  document.body.appendChild(caja);
  const root = createRoot(caja);
  let dataUrl = null;
  try {
    flushSync(() => {
      root.render(<QRCodeCanvas value={valor} size={px} level="M" marginSize={2} />);
    });
    dataUrl = caja.querySelector('canvas')?.toDataURL('image/png') || null;
  } catch { dataUrl = null; }
  /* Desmontar en el mismo tick provoca el aviso de React por desmontar
     mientras renderiza; se hace justo después y da igual: ya tenemos el PNG. */
  setTimeout(() => { try { root.unmount(); } catch { /* noop */ } caja.remove(); }, 0);
  return dataUrl;
}

/* Baja el QR como archivo. Devuelve false si el navegador no pudo dibujarlo,
   para que quien llama enseñe un aviso en vez de no hacer nada — un botón que
   no responde se pulsa cinco veces. */
export function descargarQrPng(valor, nombre = 'qr', px = 720) {
  const dataUrl = qrPng(valor, px);
  if (!dataUrl) return false;

  const a = document.createElement('a');
  a.href = dataUrl;
  /* 720 px es tamaño de sobra para enseñarlo en la puerta desde el móvil y
     para imprimirlo en una hoja sin que se pixele. */
  a.download = `${String(nombre).replace(/[^\w.-]+/g, '-').slice(0, 60) || 'qr'}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}
