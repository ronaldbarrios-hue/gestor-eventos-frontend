/* GESTEK — Escribir un .xlsx sin dependencias.

   El espejo de `hojaCalculo.js`, que lee. Aquí se escribe, con el mismo motivo
   para no usar una librería: SheetJS en npm arrastra dos CVE y esto pasa por
   los datos personales de los asistentes.

   Un .xlsx es un ZIP con unos XML dentro. El navegador ya sabe comprimir
   (`CompressionStream('deflate-raw')`), así que sólo hay que armar el ZIP a
   mano — que es lo que hace la mitad de abajo.

   ── Por qué no basta un CSV ──────────────────────────────────────────
   Porque en Excel en español el separador de columnas es el PUNTO Y COMA, no
   la coma. Un CSV con comas se abre con todo apelotonado en la columna A, y
   quien lo recibe piensa que la exportación está rota. Se puede escribir con
   punto y coma, pero entonces se rompe en el Excel en inglés y en Google
   Sheets. No hay una coma correcta: por eso .xlsx, que no tiene el problema.

   Se deja `aCSV` de todos modos, como salida de emergencia para navegadores
   sin CompressionStream. */

/* ── XML ──────────────────────────────────────────────────────────────── */

const escXml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
  /* Excel rechaza el archivo entero si aparece un carácter de control. Vienen
     pegados desde formularios sin darse cuenta, y perder la exportación por un
     tabulador invisible no compensa. */
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/* A1, B1… Z1, AA1. Con más de 26 columnas —una ficha de 22 preguntas más las
   fijas ya pasa— hay que seguir con dos letras o el archivo sale corrupto. */
export function celda(col, fila) {
  let n = col + 1;
  let ref = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    ref = String.fromCharCode(65 + resto) + ref;
    n = Math.floor((n - 1) / 26);
  }
  return `${ref}${fila + 1}`;
}

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);

function filaXml(valores, indice) {
  const celdas = valores.map((v, c) => {
    const ref = celda(c, indice);
    if (esNumero(v)) return `<c r="${ref}"><v>${v}</v></c>`;
    const s = String(v ?? '');
    if (!s) return '';
    /* `inlineStr` en vez de la tabla de cadenas compartidas: ocupa algo más,
       pero evita mantener un diccionario y sus índices, que es donde estos
       generadores suelen fallar en silencio. */
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escXml(s)}</t></is></c>`;
  }).join('');
  return `<row r="${indice + 1}">${celdas}</row>`;
}

function hojaXml(filas) {
  const cuerpo = filas.map((f, i) => filaXml(f, i)).join('');
  /* La primera fila queda congelada: con 3.000 inscritos, saber qué columna se
     está mirando importa más que cualquier otro adorno. */
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetData>${cuerpo}</sheetData></worksheet>`;
}

/* Excel no acepta estos caracteres en el nombre de una pestaña, y el límite
   son 31 caracteres. Un título de evento largo rompería el archivo. */
export function nombreHoja(titulo) {
  const limpio = String(titulo || 'Datos').replace(/[\\/?*[\]:]/g, ' ').trim();
  return (limpio || 'Datos').slice(0, 31);
}

/* ── ZIP ──────────────────────────────────────────────────────────────── */

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

async function desinflar(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  const cs = new CompressionStream('deflate-raw');
  const w = cs.writable.getWriter();
  w.write(bytes); w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

const u8 = (str) => new TextEncoder().encode(str);

function escribirNum(vista, pos, valor, bytes) {
  for (let i = 0; i < bytes; i++) vista[pos + i] = (valor >>> (i * 8)) & 0xFF;
}

/* Un ZIP mínimo: por cada archivo una cabecera local, y al final el directorio
   central. Sin fechas reales —van a cero— porque `Date` aquí no aporta nada y
   sí haría que dos exportaciones iguales dieran archivos distintos. */
async function zip(archivos) {
  const trozos = [];
  const central = [];
  let offset = 0;

  for (const { nombre, datos } of archivos) {
    const crudo = u8(datos);
    const comprimido = await desinflar(crudo);
    const usar = comprimido && comprimido.length < crudo.length ? comprimido : crudo;
    const metodo = usar === crudo ? 0 : 8;
    const nom = u8(nombre);
    const suma = crc32(crudo);

    const local = new Uint8Array(30 + nom.length);
    escribirNum(local, 0, 0x04034b50, 4);
    escribirNum(local, 4, 20, 2);
    escribirNum(local, 8, metodo, 2);
    escribirNum(local, 14, suma, 4);
    escribirNum(local, 18, usar.length, 4);
    escribirNum(local, 22, crudo.length, 4);
    escribirNum(local, 26, nom.length, 2);
    local.set(nom, 30);

    trozos.push(local, usar);

    const dir = new Uint8Array(46 + nom.length);
    escribirNum(dir, 0, 0x02014b50, 4);
    escribirNum(dir, 4, 20, 2);
    escribirNum(dir, 6, 20, 2);
    escribirNum(dir, 10, metodo, 2);
    escribirNum(dir, 16, suma, 4);
    escribirNum(dir, 20, usar.length, 4);
    escribirNum(dir, 24, crudo.length, 4);
    escribirNum(dir, 28, nom.length, 2);
    escribirNum(dir, 42, offset, 4);
    dir.set(nom, 46);
    central.push(dir);

    offset += local.length + usar.length;
  }

  const centralBytes = central.reduce((n, d) => n + d.length, 0);
  const fin = new Uint8Array(22);
  escribirNum(fin, 0, 0x06054b50, 4);
  escribirNum(fin, 8, central.length, 2);
  escribirNum(fin, 10, central.length, 2);
  escribirNum(fin, 12, centralBytes, 4);
  escribirNum(fin, 16, offset, 4);

  return new Blob([...trozos, ...central, fin], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/* ── La parte que se usa ──────────────────────────────────────────────── */

/* `filas` incluye la cabecera como primera fila. */
export async function construirXlsx(filas, titulo = 'Datos') {
  const hoja = nombreHoja(titulo);
  return zip([
    { nombre: '[Content_Types].xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>` },
    { nombre: '_rels/.rels', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>` },
    { nombre: 'xl/workbook.xml', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escXml(hoja)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { nombre: 'xl/_rels/workbook.xml.rels', datos: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>` },
    { nombre: 'xl/worksheets/sheet1.xml', datos: hojaXml(filas) },
  ]);
}

/* Salida de emergencia. Lleva BOM para que Excel no destroce las tildes, y
   punto y coma como separador, que es lo que espera el Excel en español —el
   idioma de quien va a abrir esto—. */
export function aCSV(filas) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + filas.map(f => f.map(esc).join(';')).join('\r\n');
}

/* Nombre de archivo seguro y reconocible. La fecha la pone quien llama: aquí
   no se inventa, para que el nombre sea reproducible. */
export function nombreArchivo(base, ext, sufijo = '') {
  const limpio = String(base || 'export')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'export';
  return `${limpio}${sufijo ? `-${sufijo}` : ''}.${ext}`;
}

/* Dispara la descarga. */
export function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* Se libera tarde a propósito: revocar de inmediato cancela la descarga en
     algunos navegadores antes de que empiece. */
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* Lo normal: intenta Excel y cae a CSV si el navegador no sabe comprimir. */
export async function exportar(filas, { titulo = 'Datos', base = 'export', sufijo = '' } = {}) {
  if (typeof CompressionStream !== 'undefined') {
    const blob = await construirXlsx(filas, titulo);
    descargar(blob, nombreArchivo(base, 'xlsx', sufijo));
    return { formato: 'xlsx' };
  }
  const blob = new Blob([aCSV(filas)], { type: 'text/csv;charset=utf-8' });
  descargar(blob, nombreArchivo(base, 'csv', sufijo));
  return { formato: 'csv' };
}
