import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { qrPng } from './qrPng.jsx';

/* La boleta en PDF: QR, código y todo lo que hay que enseñar en la puerta.
 *
 * Hasta ahora, al terminar el registro sólo quedaba una pantalla con el QR y
 * un enlace para volver a verlo. Sirve mientras haya batería y señal — y la
 * puerta de un evento de 7.000 personas es justo donde no hay ninguna de las
 * dos. El asistente pedía un archivo suyo, que se guarde, se reenvíe y se
 * imprima; y el organizador, que ese archivo diga de qué evento es y a nombre
 * de quién, porque en la fila eso es lo que se revisa.
 *
 * Se genera en el navegador con lo que ya está en pantalla: no hace falta que
 * el servidor sepa nada, y funciona igual justo después de reservar (cuando el
 * ticket todavía no se ha vuelto a consultar) que desde /mi-ticket.
 */

const NEGRO = [10, 15, 26];
const GRIS  = [100, 116, 139];
const BORDE = [226, 232, 240];

const limpio = (s) => String(s ?? '').trim();

/* El color de la marca, en lo que jsPDF entiende.
 *
 * Hasta ahora esta hoja se pintaba SIEMPRE con `NEGRO`. Es decir: un evento con
 * White Label —su logo, sus colores, su nombre— entregaba un PDF gris neutro.
 * Y justo éste es el archivo que más se reenvía y más se imprime, así que era
 * el único de las tres salidas de la entrada que no llevaba la marca de quien
 * organiza.
 *
 * Devuelve `null` —y no negro— si el color no se entiende: quien llama decide
 * el reemplazo, que no es lo mismo que un color válido que resulta ser oscuro. */
function aRgb(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex ?? '').trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/* Blanco o negro sobre el color de la marca, según cuál se lea.
 *
 * Sin esto, un organizador con marca clara —amarillo, beige— se encontraba el
 * título en blanco sobre su propio color, ilegible. La fórmula es la luminancia
 * relativa de WCAG; el umbral 0.55 está medido contra el dorado de GESTEK
 * (#C9A227), que cae del lado del texto oscuro. */
function textoSobre(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.55 ? [15, 23, 42] : [255, 255, 255];
}

function fechaLarga(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

function precioTexto(tipo) {
  if (!tipo) return '';
  const p = Number(tipo.precio);
  if (!Number.isFinite(p) || p === 0) return 'Gratis';
  return `${new Intl.NumberFormat('es-CO').format(p)} ${tipo.currency || 'COP'}`;
}

/* Las respuestas del formulario, con la etiqueta que vio la persona.
   Sin las definiciones sólo hay ids opacos, así que en ese caso no se
   inventan filas: se omite el bloque entero. */
function filasRespuestas(campos, respuestas) {
  if (!respuestas || !Array.isArray(campos) || campos.length === 0) return [];
  return campos
    .map(c => {
      const v = respuestas[c.id];
      const texto = Array.isArray(v) ? v.join(', ')
        : typeof v === 'boolean' ? (v ? 'Sí' : 'No')
        : limpio(v);
      /* Las fotos se guardan como URL de archivo: en papel no sirve el enlace
         entero, basta con decir que se entregó. */
      const valor = c.tipo === 'foto' && texto ? 'Archivo adjunto' : texto;
      return valor ? [limpio(c.etiqueta) || 'Dato', valor] : null;
    })
    .filter(Boolean);
}

const ESTADOS = {
  emitido: 'Apartada (pendiente de pago)',
  pagado : 'Confirmada',
  usado  : 'Ya usada',
  reembolsado: 'Reembolsada',
  invalido: 'Anulada',
};

/* Genera y descarga el PDF. Devuelve el nombre del archivo. */
export function descargarBoletaPdf({
  evento = {}, ticket = {}, tipo = null,
  asistente = {}, respuestas = null, campos = null,
  qrValue = null, origen = null,
  /* La variante de la tarjeta del organizador, ya resuelta por público y por
     tipo de boleta (`walletConfig`). Opcional: sin ella la hoja sale como
     siempre, y así quien todavía llame sin diseño no se rompe.

     Lo que se toma de ella es la IDENTIDAD —color y logo—, no la forma. Una
     hoja no es una pantalla: el degradado a sangre y los puntos de
     gamificación no ayudan en papel, y el PDF tiene algo que las otras dos
     salidas no tienen —la tabla de respuestas del formulario, que es lo que se
     revisa en la fila—. Mismo criterio que usó `lib/wallet.js` al separar lo
     que sólo tiene sentido impreso: la variante manda qué marca, cada salida
     decide cómo se ve. */
  design = null,
}) {
  /* Comprimido: sin esto el PNG del QR deja un archivo de ~2 MB, que es
     absurdo para una hoja y pesa de verdad cuando se reenvía por correo o se
     abre con datos móviles en la fila de la entrada. */
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const A = 210, M = 16, ancho = A - M * 2;

  const codigo = limpio(ticket.codigo);
  const valorQr = qrValue || ticket.qr_token || codigo;
  const base = origen || (typeof window !== 'undefined' ? window.location.origin : '');

  /* ── Cabecera: de qué evento es esta boleta, y de quién ── */
  const marca = aRgb(design?.color1) || NEGRO;
  const sobreMarca = textoSobre(marca);
  /* El gris del subtítulo se calcula desde el color del texto y no es una
     constante: sobre una marca clara el texto es oscuro, y un gris claro
     encima sería invisible. */
  const suave = sobreMarca[0] > 128
    ? [210, 210, 210]
    : [90, 100, 115];

  doc.setFillColor(...marca);
  doc.rect(0, 0, A, 34, 'F');

  /* El logo, si la variante trae uno. Va a la derecha para no pelearse con el
     título, que es lo que se lee primero en la fila.
     Envuelto: `addImage` revienta con un formato que no reconoce, y perder la
     boleta entera por un logo mal subido no tiene sentido — sin él la hoja
     sigue sirviendo para entrar. */
  const logo = limpio(design?.logo);
  let anchoTitulo = ancho;
  if (logo) {
    try {
      doc.addImage(logo, M + ancho - 22, 7, 22, 20, undefined, 'FAST');
      anchoTitulo = ancho - 28;
    } catch { /* logo ilegible: la hoja sale sin él */ }
  }

  doc.setTextColor(...sobreMarca);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(limpio(evento.titulo) || 'Evento', M, 15, { maxWidth: anchoTitulo });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const sub = [fechaLarga(evento.fecha_inicio), limpio(evento.location_nombre)].filter(Boolean).join('  ·  ');
  if (sub) doc.text(sub, M, 23, { maxWidth: anchoTitulo });
  const org = limpio(evento.organizador?.empresa || evento.organizador?.nombre);
  if (org) {
    doc.setFontSize(8);
    doc.setTextColor(...suave);
    doc.text(`Organiza: ${org}`, M, 29.5, { maxWidth: anchoTitulo });
  }

  /* ── El QR, que es a lo que viene todo el mundo ── */
  const png = qrPng(valorQr);
  const qrLado = 58;
  const qrX = (A - qrLado) / 2;
  let y = 44;
  doc.setDrawColor(...BORDE);
  doc.setFillColor(255);
  doc.roundedRect(qrX - 5, y - 5, qrLado + 10, qrLado + 10, 3, 3, 'FD');
  if (png) doc.addImage(png, 'PNG', qrX, y, qrLado, qrLado);
  else {
    doc.setTextColor(...GRIS);
    doc.setFontSize(9);
    doc.text('QR no disponible: usa el código', A / 2, y + qrLado / 2, { align: 'center' });
  }
  y += qrLado + 12;

  doc.setTextColor(...GRIS);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('CÓDIGO DE LA BOLETA', A / 2, y, { align: 'center' });
  doc.setTextColor(...NEGRO);
  doc.setFont('courier', 'bold');
  doc.setFontSize(22);
  doc.text(codigo || '—', A / 2, y + 9, { align: 'center' });
  y += 18;

  /* ── Datos: primero la boleta, después la persona ── */
  const filasBoleta = [
    ['Tipo de boleta', limpio(tipo?.nombre || ticket.tipo?.nombre) || 'General'],
    ['Precio', precioTexto(tipo || ticket.tipo)],
    ['Estado', ESTADOS[ticket.estado] || limpio(ticket.estado) || 'Emitida'],
    ['Código', codigo],
  ].filter(f => f[1]);

  const desc = limpio(tipo?.descripcion || ticket.tipo?.descripcion);
  if (desc) filasBoleta.push(['Incluye', desc]);

  const filasPersona = [
    ['Nombre', limpio(asistente.nombre || ticket.guest_nombre)],
    ['Email', limpio(asistente.email || ticket.guest_email)],
    ['Teléfono', limpio(asistente.telefono || ticket.guest_telefono)],
  ].filter(f => f[1]);

  const bloques = [
    ['La boleta', filasBoleta],
    ['Quién asiste', filasPersona],
    ['Lo que registraste', filasRespuestas(campos || evento.campos_formulario, respuestas || ticket.respuestas)],
  ].filter(([, filas]) => filas.length > 0);

  for (const [titulo, filas] of bloques) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [[titulo, '']],
      body: filas,
      theme: 'plain',
      styles: { fontSize: 9.5, cellPadding: { top: 2.2, bottom: 2.2, left: 0, right: 0 }, textColor: NEGRO },
      headStyles: { fontSize: 8, textColor: GRIS, fontStyle: 'bold', cellPadding: { top: 1, bottom: 3, left: 0, right: 0 } },
      columnStyles: { 0: { cellWidth: 52, textColor: GRIS }, 1: { cellWidth: ancho - 52, fontStyle: 'bold' } },
      didDrawPage: () => {},
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  /* ── Pie: cómo volver a esto sin el papel ── */
  const pieY = Math.max(y + 4, 262);
  doc.setDrawColor(...BORDE);
  doc.line(M, pieY, A - M, pieY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  doc.text('Presenta este QR en la entrada. Si el lector falla, el código de arriba sirve igual.', M, pieY + 6, { maxWidth: ancho });
  if (codigo && base) doc.text(`Tu boleta en línea: ${base}/mi-ticket/${codigo}`, M, pieY + 11, { maxWidth: ancho });
  doc.text(`Descargada el ${new Date().toLocaleString('es-CO')}`, M, pieY + 16);

  const slug = (limpio(evento.slug) || limpio(evento.titulo) || 'evento')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40) || 'evento';
  const nombre = `boleta-${slug}-${codigo || 's-n'}.pdf`;
  doc.save(nombre);
  return nombre;
}
