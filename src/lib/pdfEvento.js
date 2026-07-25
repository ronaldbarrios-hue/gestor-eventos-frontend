/* Importar un evento desde un PDF — SIN IA.

   Extrae el texto del PDF (pdf.js, en el navegador) y lo interpreta con
   heurísticas/regex: título, fechas, lugar, aforo, precios, categoría. La
   idea es "extraer + recomendar": prellenar el formulario y que el organizador
   revise, NO adivinar con un modelo. Todo client-side: el PDF nunca sale del
   navegador.

   `extraerTextoPDF` se separa del parseo para poder testear `parsearEvento`
   con texto plano sin depender de pdf.js. */

/* ── Extracción de texto (pdf.js, carga perezosa) ── */
export async function extraerTextoPDF(file, { maxPaginas = 8 } = {}) {
  const pdfjs = await import('pdfjs-dist');
  /* Worker como asset del mismo origen (CSP worker-src 'self'). */
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const paginas = Math.min(doc.numPages, maxPaginas);
  const partes = [];
  for (let i = 1; i <= paginas; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    /* Reconstruye líneas: pdf.js da items sueltos; un salto de Y = nueva línea. */
    let lineaY = null, linea = [];
    const lineas = [];
    for (const it of content.items) {
      const y = Math.round(it.transform[5]);
      if (lineaY === null) lineaY = y;
      if (Math.abs(y - lineaY) > 3) { lineas.push(linea.join(' ').trim()); linea = []; lineaY = y; }
      if (it.str) linea.push(it.str);
    }
    if (linea.length) lineas.push(linea.join(' ').trim());
    partes.push(lineas.filter(Boolean).join('\n'));
  }
  try { await doc.destroy(); } catch { /* noop */ }
  return partes.join('\n\n');
}

/* ── Parseo heurístico ── */

const MESES = {
  enero: 0, ene: 0, febrero: 1, feb: 1, marzo: 2, mar: 2, abril: 3, abr: 3,
  mayo: 4, junio: 5, jun: 5, julio: 6, jul: 6, agosto: 7, ago: 7,
  septiembre: 8, setiembre: 8, sep: 8, sept: 8, octubre: 9, oct: 9,
  noviembre: 10, nov: 10, diciembre: 11, dic: 11,
};

const CATEGORIA_CLAVES = [
  { slug: 'tecnologia', palabras: ['tecnolog', 'tech', 'software', 'digital', 'startup', 'innovación', 'innovacion', 'gaming', 'videojuego', 'hackathon'] },
  { slug: 'musica',     palabras: ['concierto', 'música', 'musica', 'festival', 'dj', 'banda', 'live', 'tour'] },
  { slug: 'deportes',   palabras: ['torneo', 'copa', 'campeonato', 'fútbol', 'futbol', 'maratón', 'maraton', 'deportivo', 'partido', 'boxeo'] },
  { slug: 'educacion',  palabras: ['curso', 'taller', 'workshop', 'capacitación', 'capacitacion', 'seminario', 'diplomado', 'conferencia', 'charla'] },
  { slug: 'cultura',    palabras: ['arte', 'exposición', 'exposicion', 'teatro', 'cine', 'cultural', 'museo', 'anime', 'cómic', 'comic', 'convención', 'convencion'] },
  { slug: 'corporativo',palabras: ['corporativo', 'empresarial', 'networking', 'negocios', 'summit', 'cumbre', 'expo', 'feria'] },
];

const RE = {
  /* 17 de septiembre de 2026 / 5 de mayo 2026 */
  fechaLarga: /(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de)?\s+(\d{4})/gi,
  /* 17/09/2026 · 17-09-2026 · 2026-09-17 */
  fechaNum:  /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b|\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g,
  hora:      /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?|h(?:oras)?|hrs?)\b/gi,
  precio:    /(?:\$|COP|USD|ARS|MXN|precio[:\s]*)\s?([\d][\d.,]{1,12})/gi,
  email:     /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/i,
  url:       /\bhttps?:\/\/[^\s]+|\bwww\.[^\s]+/i,
  aforo:     /(?:aforo|cupo|capacidad|hasta)\s*(?:de|:)?\s*([\d.,]{2,7})\s*(?:personas|asistentes|cupos|pers)?/i,
  /* Etiqueta al inicio de línea + dos puntos/guion — evita cazar la palabra
     "lugar" cuando aparece a mitad de una frase de la descripción. */
  lugarEtiqueta: /^\s*(?:lugar|sede|ubicaci[oó]n|d[oó]nde|venue|direcci[oó]n)\s*[:\-]\s*(.{3,90})$/i,
  /* Sustantivos de recinto: valen aunque no lleven etiqueta, si la línea es corta. */
  lugarRecinto:  /^\s*((?:auditorio|teatro|coliseo|centro de convenciones|hotel|estadio|arena|sal[oó]n)\b.{0,70})$/i,
};

function normaliza(s) {
  /* Minúsculas y sin acentos, sin meter caracteres combinantes en el fuente
     (frágiles al guardar): se descartan los code points U+0300–U+036F. */
  return (s || '').toLowerCase().normalize('NFD')
    .split('').filter(ch => { const c = ch.charCodeAt(0); return c < 0x300 || c > 0x36f; }).join('');
}

function detectarCategoria(texto) {
  const t = normaliza(texto);
  let mejor = null, mejorN = 0;
  for (const c of CATEGORIA_CLAVES) {
    const n = c.palabras.reduce((acc, p) => acc + (t.includes(normaliza(p)) ? 1 : 0), 0);
    if (n > mejorN) { mejorN = n; mejor = c.slug; }
  }
  return mejorN > 0 ? mejor : null;
}

function parseFechas(texto) {
  const fechas = [];
  let m;
  RE.fechaLarga.lastIndex = 0;
  while ((m = RE.fechaLarga.exec(texto))) {
    const dia = Number(m[1]);
    const mes = MESES[normaliza(m[2])];
    const anio = Number(m[3]);
    if (mes != null && dia >= 1 && dia <= 31) fechas.push(new Date(anio, mes, dia, 9, 0));
  }
  if (!fechas.length) {
    RE.fechaNum.lastIndex = 0;
    while ((m = RE.fechaNum.exec(texto))) {
      let d, mo, y;
      if (m[4]) { y = Number(m[4]); mo = Number(m[5]) - 1; d = Number(m[6]); }
      else { d = Number(m[1]); mo = Number(m[2]) - 1; y = Number(m[3]); if (y < 100) y += 2000; }
      if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) fechas.push(new Date(y, mo, d, 9, 0));
    }
  }
  /* Ordenadas y sin duplicados por día. */
  const vistas = new Set();
  const orden = fechas
    .filter(f => !isNaN(f))
    .sort((a, b) => a - b)
    .filter(f => { const k = f.toDateString(); if (vistas.has(k)) return false; vistas.add(k); return true; });
  return orden;
}

function primeraLinea(texto) {
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  /* El título suele ser una de las primeras líneas "sustanciales" (no fecha,
     no email, no URL, con letras y longitud razonable). */
  for (const l of lineas.slice(0, 8)) {
    if (l.length < 4 || l.length > 90) continue;
    if (RE.email.test(l) || RE.url.test(l)) continue;
    if (/^\d/.test(l) && /\d{4}/.test(l)) continue;      // fechas
    if (!/[a-záéíóúñ]/i.test(l)) continue;                // sin letras
    return l.replace(/\s{2,}/g, ' ');
  }
  return lineas[0] || '';
}

/**
 * parsearEvento(texto) → { campos, detectados, aviso }
 * `campos` prellenan el formulario; `detectados` lista qué se encontró para
 * mostrárselo al organizador (transparencia del "extraer + recomendar").
 */
export function parsearEvento(texto) {
  const limpio = (texto || '').replace(/\r/g, '').replace(/[ \t]{2,}/g, ' ');
  const detectados = [];
  const campos = {};

  const titulo = primeraLinea(limpio);
  if (titulo) { campos.titulo = titulo; detectados.push({ campo: 'Título', valor: titulo }); }

  const fechas = parseFechas(limpio);
  if (fechas.length) {
    campos.fecha_inicio = fechas[0];
    detectados.push({ campo: 'Fecha de inicio', valor: fechas[0].toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) });
    if (fechas.length > 1) {
      campos.fecha_fin = fechas[fechas.length - 1];
      detectados.push({ campo: 'Fecha de fin', valor: fechas[fechas.length - 1].toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) });
    }
  }

  const cat = detectarCategoria(limpio);
  if (cat) { campos.categoria_slug = cat; detectados.push({ campo: 'Categoría sugerida', valor: cat }); }

  /* Lugar: primero por etiqueta (Lugar: …), luego por sustantivo de recinto. */
  let lugar = null;
  for (const l of limpio.split('\n')) {
    const me = l.match(RE.lugarEtiqueta);
    if (me) { lugar = me[1].trim(); break; }
  }
  if (!lugar) {
    for (const l of limpio.split('\n')) {
      const mr = l.match(RE.lugarRecinto);
      if (mr) { lugar = mr[1].trim(); break; }
    }
  }
  if (lugar) {
    lugar = lugar.split(/\s{2,}/)[0].trim().replace(/[.,;]+$/, '');
    if (lugar) { campos.location_nombre = lugar; detectados.push({ campo: 'Lugar', valor: lugar }); }
  }

  const mAforo = limpio.match(RE.aforo);
  if (mAforo) {
    const n = Number(mAforo[1].replace(/[.,]/g, ''));
    if (n >= 2 && n <= 1000000) { campos.aforo_total = n; detectados.push({ campo: 'Aforo', valor: String(n) }); }
  }

  /* Precios: solo se listan como sugerencia (las boletas se crean aparte). */
  const precios = [];
  let m; RE.precio.lastIndex = 0;
  while ((m = RE.precio.exec(limpio))) {
    const n = Number(m[1].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
    if (Number.isFinite(n) && n > 0 && n < 100000000) precios.push(n);
  }
  const preciosUnicos = [...new Set(precios)].sort((a, b) => a - b).slice(0, 6);
  if (preciosUnicos.length) {
    campos.precios_sugeridos = preciosUnicos;
    detectados.push({ campo: 'Precios detectados', valor: preciosUnicos.map(p => `$${p.toLocaleString('es-CO')}`).join(', ') });
  }

  /* Descripción: el párrafo más largo que no sea el título. */
  const parrafos = limpio.split('\n').map(l => l.trim())
    .filter(l => l.length > 60 && l !== titulo && !RE.url.test(l));
  if (parrafos.length) {
    const desc = parrafos.sort((a, b) => b.length - a.length)[0].slice(0, 600);
    campos.descripcion = desc;
    detectados.push({ campo: 'Descripción', valor: desc.slice(0, 80) + (desc.length > 80 ? '…' : '') });
  }

  const aviso = detectados.length === 0
    ? 'No se reconoció información estructurada. ¿El PDF es una imagen escaneada? En ese caso el texto no se puede leer automáticamente.'
    : null;

  return { campos, detectados, aviso };
}
