/* GESTEK — Lector de hojas de cálculo, sin dependencias.

   Lo usan tres cosas: cargar la batería de preguntas de un formulario, cargar
   las opciones de un campo de selección, y cargar inscritos en masa.

   ¿Por qué escrito a mano y no con SheetJS? Porque un .xlsx es un ZIP con XML
   dentro, y el navegador ya sabe descomprimir (`DecompressionStream`) y ya sabe
   parsear XML (`DOMParser`). La versión de SheetJS que hay en npm arrastra dos
   CVE conocidas y la corregida sólo se publica fuera de npm; meter eso en el
   camino por donde entran datos de asistentes, justo antes de un evento de
   7.000 personas, no vale la pena para ahorrar 150 líneas.

   Formatos: .xlsx, .csv y .tsv. El .xls viejo (binario, anterior a 2007) NO
   se lee: hay que guardarlo como .xlsx o CSV. Se dice claro en el error,
   porque «no se pudo leer el archivo» manda a la gente a adivinar.

   Requiere `DecompressionStream('deflate-raw')`: Chrome 80+, Firefox 113+,
   Safari 16.4+. Si no está, se avisa y el CSV sigue funcionando. */

/* ── ZIP ────────────────────────────────────────────────────────────── */

/* Busca el End Of Central Directory hacia atrás: puede llevar comentario
   detrás, así que no está siempre en los últimos 22 bytes exactos. */
function buscarEOCD(vista) {
  const minimo = Math.max(0, vista.byteLength - 66_000);
  for (let i = vista.byteLength - 22; i >= minimo; i--) {
    if (vista.getUint32(i, true) === 0x06054b50) return i;
  }
  return -1;
}

/* Devuelve un Map nombre → {offset, metodo, tamComprimido}. Se lee del
   directorio central, no de las cabeceras locales: las locales pueden traer
   los tamaños en cero cuando el archivo se escribió en streaming. */
function leerDirectorio(buffer) {
  const v = new DataView(buffer);
  const eocd = buscarEOCD(v);
  if (eocd < 0) throw new Error('El archivo no parece un .xlsx válido (falta el índice del ZIP).');

  const total = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const entradas = new Map();

  for (let i = 0; i < total; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const metodo        = v.getUint16(p + 10, true);
    const tamComprimido = v.getUint32(p + 20, true);
    const lenNombre     = v.getUint16(p + 28, true);
    const lenExtra      = v.getUint16(p + 30, true);
    const lenComentario = v.getUint16(p + 32, true);
    const offsetLocal   = v.getUint32(p + 42, true);
    const nombre = new TextDecoder().decode(new Uint8Array(buffer, p + 46, lenNombre));
    entradas.set(nombre, { offsetLocal, metodo, tamComprimido });
    p += 46 + lenNombre + lenExtra + lenComentario;
  }
  return entradas;
}

async function inflar(buffer, entrada) {
  const v = new DataView(buffer);
  const p = entrada.offsetLocal;
  if (v.getUint32(p, true) !== 0x04034b50) throw new Error('Entrada del ZIP corrupta.');
  const lenNombre = v.getUint16(p + 26, true);
  const lenExtra  = v.getUint16(p + 28, true);
  const inicio = p + 30 + lenNombre + lenExtra;
  const crudo = new Uint8Array(buffer, inicio, entrada.tamComprimido);

  if (entrada.metodo === 0) return crudo;            // guardado sin comprimir
  if (entrada.metodo !== 8) throw new Error(`Compresión del ZIP no soportada (método ${entrada.metodo}).`);

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Este navegador no puede descomprimir .xlsx. Guarda la hoja como CSV, o usa Chrome, Firefox o Safari actualizados.');
  }
  const flujo = new Blob([crudo]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

const comoTexto = (bytes) => new TextDecoder('utf-8').decode(bytes);

/* ── XML de la hoja ─────────────────────────────────────────────────── */

function parsearXML(texto) {
  const doc = new DOMParser().parseFromString(texto, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('El XML interno del .xlsx no se pudo leer.');
  return doc;
}

/* Las cadenas de un .xlsx no van en la celda: van en una tabla aparte y la
   celda guarda su índice. Con texto enriquecido se parten en varios <t>, así
   que se concatenan todos. */
function leerCadenasCompartidas(doc) {
  return [...doc.getElementsByTagName('si')].map(si =>
    [...si.getElementsByTagName('t')].map(t => t.textContent).join('')
  );
}

/* Formatos de número que son fechas: los built-in de Excel más cualquier
   formato propio que mencione año, mes o día. Sin esto una fecha de
   nacimiento llega como 32874 y nadie entiende qué pasó. */
const FMT_FECHA_BUILTIN = new Set([14,15,16,17,18,19,20,21,22,27,28,29,30,31,32,33,34,35,36,45,46,47,50,51,52,53,54,55,56,57,58]);

function leerEstilosFecha(docEstilos) {
  if (!docEstilos) return new Set();
  const propios = new Set();
  for (const nf of docEstilos.getElementsByTagName('numFmt')) {
    const codigo = (nf.getAttribute('formatCode') || '').toLowerCase();
    /* Se quitan los literales entre comillas antes de buscar y/m/d, para no
       tomar por fecha un formato como "0.00 \"dias\"". */
    const limpio = codigo.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '');
    if (/[ymd]/.test(limpio) && !/^[#0.,%\s]*$/.test(limpio)) propios.add(Number(nf.getAttribute('numFmtId')));
  }
  const esFecha = new Set();
  const cellXfs = docEstilos.getElementsByTagName('cellXfs')[0];
  if (!cellXfs) return esFecha;
  [...cellXfs.getElementsByTagName('xf')].forEach((xf, i) => {
    const id = Number(xf.getAttribute('numFmtId') || 0);
    if (FMT_FECHA_BUILTIN.has(id) || propios.has(id)) esFecha.add(i);
  });
  return esFecha;
}

/* Excel cuenta días desde 1899-12-30 (el desfase de dos días es su bug de
   1900 heredado de Lotus, que hay que reproducir para leer bien). */
function serialAFecha(n) {
  const ms = Math.round((n - 25569) * 86_400_000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(n);
  return d.toISOString().slice(0, 10);
}

/* "BC12" → 54. Sólo las letras; el número de fila se ignora. */
function columnaDesdeRef(ref) {
  let n = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

function celdasDeFila(fila, cadenas, estilosFecha) {
  const salida = [];
  for (const c of fila.getElementsByTagName('c')) {
    const idx = columnaDesdeRef(c.getAttribute('r') || '');
    if (idx < 0) continue;
    const tipo = c.getAttribute('t');
    let valor = '';

    if (tipo === 'inlineStr') {
      valor = [...c.getElementsByTagName('t')].map(t => t.textContent).join('');
    } else {
      const v = c.getElementsByTagName('v')[0];
      const bruto = v ? v.textContent : '';
      if (bruto === '') valor = '';
      else if (tipo === 's') valor = cadenas[Number(bruto)] ?? '';
      else if (tipo === 'b') valor = bruto === '1' ? 'true' : 'false';
      else if (tipo === 'e') valor = '';                       // celda en error (#N/A)
      else if (tipo === 'str') valor = bruto;
      else {
        const estilo = Number(c.getAttribute('s') || -1);
        valor = estilosFecha.has(estilo) ? serialAFecha(Number(bruto)) : bruto;
      }
    }
    salida[idx] = String(valor).trim();
  }
  return salida;
}

/* ── CSV / TSV ──────────────────────────────────────────────────────── */

/* Comillas dobles al estilo RFC 4180, saltos de línea dentro de una celda
   entrecomillada incluidos. */
function parsearDelimitado(texto, delim) {
  const filas = [];
  let fila = [], celda = '', entreComillas = false;
  const limpio = texto.replace(/^﻿/, '');

  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];
    if (entreComillas) {
      if (ch === '"') {
        if (limpio[i + 1] === '"') { celda += '"'; i++; }
        else entreComillas = false;
      } else celda += ch;
      continue;
    }
    if (ch === '"') { entreComillas = true; continue; }
    if (ch === delim) { fila.push(celda); celda = ''; continue; }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && limpio[i + 1] === '\n') i++;
      fila.push(celda); celda = '';
      filas.push(fila); fila = [];
      continue;
    }
    celda += ch;
  }
  if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }
  return filas.map(f => f.map(c => c.trim()));
}

/* Se decide entre coma, punto y coma y tabulador contando en la primera
   línea. El punto y coma importa: es lo que produce Excel en español. */
function adivinarDelimitador(texto) {
  const linea = texto.split(/\r?\n/, 1)[0] || '';
  const cuenta = d => (linea.match(new RegExp(`\\${d}`, 'g')) || []).length;
  const candidatos = [['\t', cuenta('\t')], [';', cuenta(';')], [',', cuenta(',')]];
  candidatos.sort((a, b) => b[1] - a[1]);
  return candidatos[0][1] > 0 ? candidatos[0][0] : ',';
}

/* ── Entrada pública ────────────────────────────────────────────────── */

/* Nombres de columna repetidos o vacíos rompen el mapeo silenciosamente:
   dos columnas «Correo» y la segunda pisa la primera. Se desambiguan. */
function normalizarEncabezados(fila, anchoMinimo) {
  const vistos = new Map();
  const salida = [];
  for (let i = 0; i < Math.max(fila.length, anchoMinimo); i++) {
    let nombre = (fila[i] || '').trim() || `Columna ${i + 1}`;
    if (vistos.has(nombre)) {
      const n = vistos.get(nombre) + 1;
      vistos.set(nombre, n);
      nombre = `${nombre} (${n})`;
    } else vistos.set(nombre, 1);
    salida.push(nombre);
  }
  return salida;
}

const MAX_FILAS = 20_000;

/* Convierte una matriz en {columnas, filas}. La primera fila no vacía manda
   los nombres. */
function armar(matriz) {
  const utiles = matriz.filter(f => f.some(c => c !== '' && c != null));
  if (utiles.length === 0) throw new Error('La hoja está vacía.');

  const ancho = Math.max(...utiles.map(f => f.length));
  const columnas = normalizarEncabezados(utiles[0], ancho);
  const cuerpo = utiles.slice(1, MAX_FILAS + 1);

  const filas = cuerpo.map((f, i) => {
    const obj = { __fila: i + 2 };   // +2: fila 1 son los encabezados
    columnas.forEach((nombre, j) => { obj[nombre] = (f[j] ?? '').toString().trim(); });
    return obj;
  });

  return {
    columnas,
    filas,
    recortado: cuerpo.length >= MAX_FILAS ? MAX_FILAS : 0,
  };
}

/* Lee un File del input y devuelve {columnas, filas, hoja, recortado}.
   `recortado` avisa si se dejaron filas fuera: un tope silencioso en una
   importación se lee como «se cargó todo» cuando no. */
export async function leerHoja(file, { hojaPreferida = null } = {}) {
  const nombre = (file?.name || '').toLowerCase();

  if (nombre.endsWith('.xls')) {
    throw new Error('Ese es un Excel antiguo (.xls). Ábrelo y usa «Guardar como» → .xlsx, o guárdalo como CSV.');
  }

  if (nombre.endsWith('.csv') || nombre.endsWith('.tsv') || nombre.endsWith('.txt')) {
    const texto = await file.text();
    const delim = nombre.endsWith('.tsv') ? '\t' : adivinarDelimitador(texto);
    return { ...armar(parsearDelimitado(texto, delim)), hoja: file.name };
  }

  if (!nombre.endsWith('.xlsx') && !nombre.endsWith('.xlsm')) {
    throw new Error('Formato no reconocido. Usa .xlsx, .csv o .tsv.');
  }

  const buffer = await file.arrayBuffer();
  const entradas = leerDirectorio(buffer);

  /* El orden de las hojas está en workbook.xml; el primer sheet que aparece
     ahí es el que ve el usuario al abrir el archivo, y no siempre es
     sheet1.xml.

     `hojaPreferida` existe porque nuestra propia plantilla de importación trae
     TRES pestañas —Formulario, Instrucciones, Valores—. Leer siempre la
     primera funciona hasta que alguien las reordena o duplica el archivo
     dejando otra delante: entonces se importarían las instrucciones como si
     fueran preguntas, y con un formato que casualmente encaja. Si se pide una
     hoja por nombre y existe, se usa esa; si no, se cae a la primera. */
  let rutaHoja = null, nombreHoja = '';
  const wb = entradas.get('xl/workbook.xml');
  if (wb) {
    const docWb = parsearXML(comoTexto(await inflar(buffer, wb)));
    const todas = [...docWb.getElementsByTagName('sheet')];
    const buscada = hojaPreferida
      ? todas.find(h => (h.getAttribute('name') || '').trim().toLowerCase() === String(hojaPreferida).trim().toLowerCase())
      : null;
    const primera = buscada || todas[0];
    nombreHoja = primera?.getAttribute('name') || '';
    const rid = primera?.getAttribute('r:id') || primera?.getAttributeNS?.('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const rels = entradas.get('xl/_rels/workbook.xml.rels');
    if (rid && rels) {
      const docRels = parsearXML(comoTexto(await inflar(buffer, rels)));
      for (const rel of docRels.getElementsByTagName('Relationship')) {
        if (rel.getAttribute('Id') === rid) {
          const t = rel.getAttribute('Target') || '';
          rutaHoja = t.startsWith('/') ? t.slice(1) : `xl/${t.replace(/^\.\//, '')}`;
          break;
        }
      }
    }
  }
  if (!rutaHoja || !entradas.has(rutaHoja)) {
    rutaHoja = [...entradas.keys()].find(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k));
  }
  if (!rutaHoja) throw new Error('El .xlsx no contiene ninguna hoja legible.');

  const entradaCadenas = entradas.get('xl/sharedStrings.xml');
  const cadenas = entradaCadenas
    ? leerCadenasCompartidas(parsearXML(comoTexto(await inflar(buffer, entradaCadenas))))
    : [];

  const entradaEstilos = entradas.get('xl/styles.xml');
  const estilosFecha = leerEstilosFecha(
    entradaEstilos ? parsearXML(comoTexto(await inflar(buffer, entradaEstilos))) : null
  );

  const docHoja = parsearXML(comoTexto(await inflar(buffer, entradas.get(rutaHoja))));
  const matriz = [...docHoja.getElementsByTagName('row')].map(f => celdasDeFila(f, cadenas, estilosFecha));

  return { ...armar(matriz), hoja: nombreHoja || file.name };
}

/* Lee una sola columna como lista de valores. Lo usan las opciones de un
   campo de selección: se pega una columna de Excel y salen las opciones.
   Quita repetidos conservando el orden, porque una lista de opciones con
   duplicados es un error de captura, no una intención. */
export function columnaAOpciones(texto) {
  const partes = String(texto || '')
    .split(/[\r\n\t]+|,(?=\s*\S)/)
    .map(s => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
  return [...new Set(partes)];
}

export const FORMATOS_ACEPTADOS = '.xlsx,.xlsm,.csv,.tsv,.txt';

/* ── Emparejar encabezados con campos ───────────────────────────────── */

/* «Nº de Documento» y «numero de documento» son la misma columna para quien
   arma el Excel. Se comparan sin acentos, sin mayúsculas y sin puntuación. */
export const clave = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

/* Busca entre las columnas de la hoja la que corresponde a un campo, dados
   sus sinónimos. Primero exacto, luego por contenido — en ese orden, porque
   «correo» debe ganarle a «correo del acudiente» cuando las dos están. */
export function emparejarColumna(columnas, sinonimos) {
  const claves = sinonimos.map(clave).filter(Boolean);
  const cols = columnas.map(c => ({ original: c, k: clave(c) }));
  for (const s of claves) {
    const exacta = cols.find(c => c.k === s);
    if (exacta) return exacta.original;
  }
  for (const s of claves) {
    const parcial = cols.find(c => c.k.includes(s) || s.includes(c.k));
    if (parcial) return parcial.original;
  }
  return '';
}

/* Lo que la gente escribe en una columna «obligatorio» o «acepta». */
const AFIRMATIVOS = new Set(['si', 'si ', 'sí', 'x', 'true', 'verdadero', '1', 'yes', 'y', 'obligatorio']);
export const esAfirmativo = (v) => AFIRMATIVOS.has(clave(v)) || clave(v) === 'si';
