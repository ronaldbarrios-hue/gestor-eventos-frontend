/* Paleta de colores a partir de una imagen — SIN IA.

   Dibuja la imagen reducida en un <canvas>, cuantiza los píxeles en cubos de
   color, los agrupa por cercanía y devuelve los tonos dominantes. Con eso se
   proponen color principal / acento / fondo para el White Label.

   Todo ocurre en el navegador: la imagen no se sube a ningún sitio para esto.

   OJO CORS: leer píxeles de una imagen de otro origen "mancha" el canvas y
   getImageData lanza. Por eso se admite un File (siempre funciona) y, para
   URLs, se intenta con crossOrigin='anonymous'. */

/* ── Utilidades de color ── */
export function rgbAHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function hexARgb(hex) {
  const h = String(hex || '').replace('#', '');
  const s = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return { r: parseInt(s.slice(0, 2), 16) || 0, g: parseInt(s.slice(2, 4), 16) || 0, b: parseInt(s.slice(4, 6), 16) || 0 };
}

/* Luminancia relativa (WCAG) — sirve para decidir texto claro/oscuro y fondo. */
export function luminancia({ r, g, b }) {
  const f = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function saturacion({ r, g, b }) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function distancia(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/* ── Carga de la imagen a un canvas reducido ── */
async function pixelsDe(origen, lado = 96) {
  let bitmap;
  if (typeof origen === 'string') {
    bitmap = await new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('No se pudo cargar la imagen (¿otro dominio sin permisos CORS?). Sube el archivo en su lugar.'));
      img.src = origen;
    });
  } else {
    bitmap = await createImageBitmap(origen);
  }
  const w = bitmap.width || 1, h = bitmap.height || 1;
  const escala = Math.min(lado / w, lado / h, 1);
  const cw = Math.max(1, Math.round(w * escala)), ch = Math.max(1, Math.round(h * escala));
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, cw, ch);
  try { bitmap.close?.(); } catch { /* noop */ }
  return ctx.getImageData(0, 0, cw, ch).data;
}

/**
 * extraerPaleta(origen, opts) → [{ hex, rgb, peso }]
 * `origen` es un File/Blob o una URL. Devuelve los tonos dominantes ya
 * agrupados, del más representativo al menos.
 */
export async function extraerPaleta(origen, { max = 6, lado = 96 } = {}) {
  const data = await pixelsDe(origen, lado);

  /* 1) Cuantizar en cubos de 32 niveles por canal y contar. */
  const cubos = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 125) continue;                          // transparente
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const c = cubos.get(key);
    if (c) { c.r += r; c.g += g; c.b += b; c.n++; }
    else cubos.set(key, { r, g, b, n: 1 });
  }
  if (!cubos.size) return [];

  /* 2) Promedio de cada cubo + puntuación: frecuencia realzada por saturación
        (un gris muy repetido no es un buen color de marca). */
  let lista = [...cubos.values()].map(c => {
    const rgb = { r: c.r / c.n, g: c.g / c.n, b: c.b / c.n };
    const sat = saturacion(rgb);
    const lum = luminancia(rgb);
    /* Penaliza casi-blanco y casi-negro: suelen ser fondo, no identidad. */
    const extremo = lum > 0.93 || lum < 0.02 ? 0.15 : 1;
    return { rgb, n: c.n, sat, lum, score: c.n * (0.35 + sat) * extremo };
  }).sort((a, b) => b.score - a.score);

  /* 3) Agrupar tonos cercanos para no devolver seis azules iguales. */
  const elegidos = [];
  for (const cand of lista) {
    if (elegidos.length >= max) break;
    if (elegidos.some(e => distancia(e.rgb, cand.rgb) < 48)) continue;
    elegidos.push(cand);
  }
  /* Si el filtro dejó muy pocos, rellena con los siguientes más frecuentes. */
  for (const cand of lista) {
    if (elegidos.length >= max) break;
    if (!elegidos.includes(cand)) elegidos.push(cand);
  }

  const total = elegidos.reduce((s, c) => s + c.n, 0) || 1;
  return elegidos.map(c => ({
    hex: rgbAHex(c.rgb.r, c.rgb.g, c.rgb.b),
    rgb: { r: Math.round(c.rgb.r), g: Math.round(c.rgb.g), b: Math.round(c.rgb.b) },
    peso: Math.round((c.n / total) * 100),
  }));
}

/* Gira el matiz ~150° para obtener un acento que combine cuando la imagen
   solo aporta un color (logo monocromo sobre blanco). */
function complementario({ r, g, b }) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + 150) % 360;
  const s = max === 0 ? 0 : d / max, v = max / 255;
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), mm = v - c;
  const seg = Math.floor(h / 60);
  const [rr, gg, bb] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg] || [c, x, 0];
  return rgbAHex((rr + mm) * 255, (gg + mm) * 255, (bb + mm) * 255);
}

/**
 * sugerirMarca(paleta) → { primary, accent, bg }
 * Principal = el tono con más presencia y color; acento = el más distinto a
 * él; fondo = un tono muy oscuro (o muy claro) derivado de la imagen.
 */
export function sugerirMarca(paleta) {
  if (!paleta?.length) return null;
  const conSat = paleta.map(p => ({ ...p, sat: saturacion(p.rgb), lum: luminancia(p.rgb) }));

  const primary = conSat.find(p => p.sat > 0.22 && p.lum > 0.04 && p.lum < 0.85) || conSat[0];

  /* Acento: el tono CON COLOR más distinto al principal. Se descartan blancos
     y negros — son los más "distintos" numéricamente pero como acento de marca
     no sirven. Si la imagen no tiene un segundo tono, se deriva girando el
     matiz del principal en vez de caer en blanco. */
  const candidatos = conSat.filter(p => p !== primary && p.sat > 0.18 && p.lum > 0.05 && p.lum < 0.88);
  const accent = candidatos.length
    ? candidatos.sort((a, b) => distancia(b.rgb, primary.rgb) - distancia(a.rgb, primary.rgb))[0]
    : { hex: complementario(primary.rgb) };

  /* Fondo: se oscurece el principal manteniendo su matiz — así el sitio se
     siente de la misma familia que el logo, no un negro genérico. */
  const bgRgb = { r: primary.rgb.r * 0.10, g: primary.rgb.g * 0.10, b: primary.rgb.b * 0.13 };

  return {
    primary: primary.hex,
    accent : accent.hex,
    bg     : rgbAHex(bgRgb.r, bgRgb.g, bgRgb.b),
  };
}
