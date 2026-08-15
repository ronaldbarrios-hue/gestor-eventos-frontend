/* Importar un evento desde un PDF — SIN IA.

   Extrae el texto del PDF (pdf.js, en el navegador) y lo interpreta con
   heurísticas/regex: título, fechas, lugar, aforo, precios, categoría. La
   idea es "extraer + recomendar": prellenar el formulario y que el organizador
   revise, NO adivinar con un modelo. Todo client-side: el PDF nunca sale del
   navegador.

   `extraerTextoPDF` se separa del parseo para poder testear `parsearEvento`
   con texto plano sin depender de pdf.js. */

/* ── Extracción de texto (pdf.js, carga perezosa) ── */
/* Cuantas paginas se leen. Estaba escondido como valor por defecto y quien
   llamaba no lo pasaba nunca, asi que un PDF de 40 paginas se leia hasta la 8
   y NADIE lo sabia: ni el codigo lo decia, ni la pantalla lo avisaba. Se
   exporta para poder decirlo en la interfaz. */
export const PAGINAS_LEIDAS = 8;

export async function extraerTextoPDF(file, { maxPaginas = PAGINAS_LEIDAS } = {}) {
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
  const total = doc.numPages;
  try { await doc.destroy(); } catch { /* noop */ }
  /* Se devuelve cuántas páginas se leyeron de cuántas hay. Sin esto, un PDF de
     42 páginas se leía hasta la 8 y la pantalla no tenía forma de decirlo: el
     organizador veía datos incompletos sin saber que faltaban 34 páginas. */
  return { texto: partes.join('\n\n'), paginas, total };
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
  /* El aforo pide contexto de verdad, y la razón es un caso real: antes esta
     expresión incluía `hasta` y el sufijo era opcional, así que «hasta 50 % en
     boletas» daba aforo 50 y «llega hasta 30 minutos antes» daba 30. Peor
     todavía, salían marcados como afirmados por el documento.

     Ahora hacen falta dos cosas a la vez: una palabra que signifique aforo Y
     el sustantivo detrás (personas, asistentes…). Un número suelto no es un
     aforo, y el aforo decide cuántas boletas se pueden vender. */
  aforo:        /(?:aforo|cupo|capacidad)\s*(?:m[aá]ximo|total)?\s*(?:de|:|para)?\s*([\d.,]{2,7})\s*(?:personas|asistentes|cupos|pers|sillas|puestos)/gi,
  /* Etiqueta al inicio de línea: eso sí es una afirmación. */
  aforoEtiqueta: /^\s*(?:aforo|cupo|capacidad)\s*[:\-]\s*([\d.,]{2,7})/i,
  /* Etiqueta al inicio de línea + dos puntos/guion — evita cazar la palabra
     "lugar" cuando aparece a mitad de una frase de la descripción. */
  lugarEtiqueta: /^\s*(?:lugar|sede|ubicaci[oó]n|d[oó]nde|venue|direcci[oó]n)\s*[:\-]\s*(.{3,90})$/i,
  /* Sustantivos de recinto: valen aunque no lleven etiqueta, si la línea es corta. */
  lugarRecinto:  /^\s*((?:auditorio|teatro|coliseo|centro de convenciones|hotel|estadio|arena|sal[oó]n)\b.{0,70})$/i,
  /* Etiquetas que convierten una suposición en una afirmación del documento.
     Son la diferencia entre «esta fecha aparece en el texto» y «el documento
     dice que ESTA es la fecha del evento». */
  tituloEtiqueta: /^\s*(?:evento|nombre del evento|t[ií]tulo)\s*[:\-]\s*(.{3,90})$/i,
  fechaEtiqueta:  /^\s*(?:fecha|fecha del evento|cu[aá]ndo|d[ií]a)\s*[:\-]\s*(.{3,90})$/i,
  /* Sin la palabra «fecha» delante, «Desde:» y «Hasta:» casi siempre son el
     plazo de inscripción, no el evento. Se comprobó: «Fecha: 10 de octubre /
     Hasta: 30 de diciembre» daba un evento que terminaba dos meses y medio
     después de empezar, con la etiqueta de dato afirmado. */
  fechaInicioEt:  /^\s*(?:fecha de inicio|fecha inicio|inicia|comienza)\s*[:\-]\s*(.{3,90})$/i,
  fechaFinEt:     /^\s*(?:fecha de fin|fecha fin|fecha de finalizaci[oó]n|termina|finaliza)\s*[:\-]\s*(.{3,90})$/i,
};

/* Devuelve lo que captura la primera línea que case con la etiqueta. */
function buscarEtiqueta(texto, re) {
  for (const l of String(texto).split('\n')) {
    const m = l.match(re);
    if (m) return m[1].trim().replace(/[.,;]+$/, '');
  }
  return null;
}

const fmtFecha = (f) => f.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

/* Fechas, por orden de confianza:

     1. «Fecha de inicio: …» y «Fecha de fin: …»  → dos afirmaciones
     2. «Fecha: …»                                 → una afirmación
     3. una sola fecha suelta en todo el documento → no hay con qué confundirla
     4. varias fechas sueltas                      → NO se elige ninguna

   El caso 4 es el que rompía. Coger la más temprana y la más tardía de un
   documento largo mezcla la agenda, los plazos de inscripción, la reseña de
   la organización y el copyright del pie — y devolvía esas dos como si fueran
   las del evento, sin forma de expresar duda. */
function resolverFechas(texto) {
  const deEtiqueta = (re) => {
    const cap = buscarEtiqueta(texto, re);
    if (!cap) return null;
    const f = parseFechas(cap);
    return f.length ? f[0] : null;
  };

  const ini = deEtiqueta(RE.fechaInicioEt);
  const fin = deEtiqueta(RE.fechaFinEt);
  if (ini) return { inicio: ini, fin: fin && fin > ini ? fin : null, candidatas: [], seguro: true };

  const una = deEtiqueta(RE.fechaEtiqueta);
  if (una) return { inicio: una, fin: fin && fin > una ? fin : null, candidatas: [], seguro: true };

  const todas = parseFechas(texto);
  if (todas.length === 1) return { inicio: todas[0], fin: null, candidatas: [], seguro: false };

  /* Más de una y ninguna etiquetada: se devuelven como candidatas. Preguntar
     cuesta un clic; acertar por casualidad cuesta un evento publicado con la
     fecha equivocada. */
  return { inicio: null, fin: null, candidatas: todas, seguro: false };
}

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
  /* Lo que el documento no deja claro. Antes esto no existia: todo se
     resolvia adivinando, y una adivinanza y un dato etiquetado llegaban al
     formulario indistinguibles. */
  const dudas = [];

  /* El titulo etiquetado gana sobre "la primera linea sustancial". En un
     documento largo la primera linea suele ser el membrete de quien lo
     publica, no el nombre del evento. */
  const tEtiqueta = buscarEtiqueta(limpio, RE.tituloEtiqueta);
  const titulo = tEtiqueta || primeraLinea(limpio);
  if (titulo) {
    campos.titulo = titulo;
    detectados.push({ campo: 'Título', valor: titulo, seguro: Boolean(tEtiqueta) });
  }

  /* ── Fechas ────────────────────────────────────────────────────────
     Aqui estaba el fallo mas caro con documentos largos. Se cogia la fecha
     MAS TEMPRANA del documento como inicio y la MAS TARDIA como fin. En un
     flyer de una pagina eso acierta; en una ficha de 20 paginas con agenda,
     plazos de inscripcion, un "desde 1998" en la resena de la organizacion y
     un copyright al pie, devuelve dos fechas que no son del evento — y ademas
     con toda la seguridad del mundo, porque no habia forma de expresar duda.

     Ahora manda lo ETIQUETADO. Una linea que dice "Fecha: 15 de septiembre"
     es una afirmacion del documento; una fecha suelta en la pagina 14 es una
     coincidencia. Si no hay etiquetas y hay muchas fechas sueltas, no se
     elige ninguna: se devuelven como candidatas para que decida quien sabe. */
  const { inicio, fin, candidatas, seguro } = resolverFechas(limpio);
  if (inicio) {
    campos.fecha_inicio = inicio;
    detectados.push({ campo: 'Fecha de inicio', valor: fmtFecha(inicio), seguro });
    if (fin) { campos.fecha_fin = fin; detectados.push({ campo: 'Fecha de fin', valor: fmtFecha(fin), seguro }); }
  } else if (candidatas.length) {
    dudas.push({
      campo: 'Fecha',
      motivo: `El documento tiene ${candidatas.length} fechas y ninguna dice cual es la del evento.`,
      opciones: candidatas.slice(0, 8).map(f => ({ valor: f.toISOString(), texto: fmtFecha(f) })),
    });
  }

  const cat = detectarCategoria(limpio);
  /* La categoria se decide contando palabras clave: en un texto largo gana la
     que mas se repite, que no tiene por que ser la del evento. Nunca es
     segura. */
  if (cat) { campos.categoria_slug = cat; detectados.push({ campo: 'Categoría sugerida', valor: cat, seguro: false }); }

  /* Lugar: primero por etiqueta (Lugar: …), luego por sustantivo de recinto. */
  let lugar = null;
  let lugarEtiquetado = false;
  for (const l of limpio.split('\n')) {
    const me = l.match(RE.lugarEtiqueta);
    if (me) { lugar = me[1].trim(); lugarEtiquetado = true; break; }
  }
  if (!lugar) {
    for (const l of limpio.split('\n')) {
      const mr = l.match(RE.lugarRecinto);
      if (mr) { lugar = mr[1].trim(); break; }
    }
  }
  if (lugar) {
    lugar = lugar.split(/\s{2,}/)[0].trim().replace(/[.,;]+$/, '');
    if (lugar) { campos.location_nombre = lugar; detectados.push({ campo: 'Lugar', valor: lugar, seguro: lugarEtiquetado }); }
  }

  /* Aforo. La etiqueta a inicio de línea es una afirmación; el resto son
     candidatos, y si hay más de uno distinto no se elige: en un dossier
     aparecen el aforo de la sala, el de cada taller y el del auditorio, y
     quedarse con «el primero que salga» es como no mirar. */
  const aforoEt = buscarEtiqueta(limpio, RE.aforoEtiqueta);
  const aNum = (t) => Number(String(t).replace(/[.,]/g, ''));
  const valido = (n) => Number.isFinite(n) && n >= 2 && n <= 1000000;

  if (aforoEt && valido(aNum(aforoEt))) {
    campos.aforo_total = aNum(aforoEt);
    detectados.push({ campo: 'Aforo', valor: String(campos.aforo_total), seguro: true });
  } else {
    const vistos = new Set();
    let ma; RE.aforo.lastIndex = 0;
    while ((ma = RE.aforo.exec(limpio))) {
      const n = aNum(ma[1]);
      if (valido(n)) vistos.add(n);
    }
    const cand = [...vistos];
    if (cand.length === 1) {
      campos.aforo_total = cand[0];
      detectados.push({ campo: 'Aforo', valor: String(cand[0]), seguro: false });
    } else if (cand.length > 1) {
      dudas.push({
        campo: 'Aforo',
        motivo: `El documento menciona ${cand.length} capacidades distintas y ninguna dice ser la del evento.`,
        opciones: cand.sort((a, b) => b - a).slice(0, 8).map(n => ({ valor: String(n), texto: `${n.toLocaleString('es-CO')} personas` })),
      });
    }
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
    detectados.push({ campo: 'Precios detectados', valor: preciosUnicos.map(p => `$${p.toLocaleString('es-CO')}`).join(', '), seguro: false });
  }

  /* Descripción: el párrafo más largo que no sea el título. */
  const parrafos = limpio.split('\n').map(l => l.trim())
    .filter(l => l.length > 60 && l !== titulo && !RE.url.test(l));
  if (parrafos.length) {
    /* Se corta en el ultimo espacio antes del limite: antes partia a mitad de
       palabra y el resultado parecia texto corrupto. */
    const crudo = parrafos.sort((a, b) => b.length - a.length)[0];
    const desc = crudo.length <= 600 ? crudo : crudo.slice(0, crudo.lastIndexOf(' ', 600)) + '…';
    campos.descripcion = desc;
    detectados.push({ campo: 'Descripción', valor: desc.slice(0, 80) + (desc.length > 80 ? '…' : ''), seguro: false });
  }

  const aviso = detectados.length === 0 && dudas.length === 0
    ? 'No se reconoció información estructurada. ¿El PDF es una imagen escaneada? En ese caso el texto no se puede leer automáticamente.'
    : null;

  return { campos, detectados, dudas, aviso };
}

/* ── La ficha que sí se lee bien ──────────────────────────────────────

   Toda la mejora del parser se resume en una frase: lo ETIQUETADO se acierta,
   lo suelto se adivina. Así que en vez de pedirle al organizador que confíe en
   la heurística, se le enseña qué forma tiene que tener el documento para que
   no haga falta adivinar nada.

   No es un formato nuevo ni obligatorio: es la primera página del PDF que ya
   tiene. Basta con que estas etiquetas aparezcan al principio de una línea.
   Se ofrece para imprimir/guardar, no para subir: el organizador lo copia en
   su flyer o lo pega tal cual. */
export const ETIQUETAS_QUE_FUNCIONAN = [
  { etiqueta: 'Evento',          ejemplo: 'Feria de Innovación 2026',              campo: 'Título' },
  { etiqueta: 'Fecha de inicio', ejemplo: '15 de septiembre de 2026',              campo: 'Fecha de inicio' },
  { etiqueta: 'Fecha de fin',    ejemplo: '17 de septiembre de 2026',              campo: 'Fecha de fin' },
  { etiqueta: 'Lugar',           ejemplo: 'Centro de Convenciones, Ibagué',        campo: 'Lugar' },
  { etiqueta: 'Aforo',           ejemplo: '7000 personas',                          campo: 'Aforo' },
];

/* Alternativas aceptadas para cada etiqueta, por si el documento ya usa otra
   palabra. Salen de las mismas expresiones de arriba: se listan aquí para
   poder enseñarlas sin que nadie tenga que leer una expresión regular. */
export const SINONIMOS_ETIQUETA = {
  'Evento'         : ['Nombre del evento', 'Título'],
  'Fecha de inicio': ['Fecha', 'Cuándo', 'Día', 'Inicio', 'Desde'],
  'Fecha de fin'   : ['Fin', 'Hasta', 'Termina'],
  'Lugar'          : ['Sede', 'Ubicación', 'Dónde', 'Dirección'],
  'Aforo'          : ['Cupo', 'Capacidad'],
};
