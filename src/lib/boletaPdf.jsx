import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';

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

/* El QR se dibuja fuera de la pantalla y se saca como PNG.
   La página ya tiene uno en SVG, pero serializarlo depende de que el navegador
   sepa rasterizar un SVG en un canvas, y Safari lo hace mal cuando hay CSS de
   por medio. Un canvas propio, a la resolución que quiere el PDF, no tiene esa
   duda: lo que se imprime es exactamente lo que se generó. */
function qrPng(valor, px = 480) {
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

const limpio = (s) => String(s ?? '').trim();

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
}) {
  /* Comprimido: sin esto el PNG del QR deja un archivo de ~2 MB, que es
     absurdo para una hoja y pesa de verdad cuando se reenvía por correo o se
     abre con datos móviles en la fila de la entrada. */
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const A = 210, M = 16, ancho = A - M * 2;

  const codigo = limpio(ticket.codigo);
  const valorQr = qrValue || ticket.qr_token || codigo;
  const base = origen || (typeof window !== 'undefined' ? window.location.origin : '');

  /* ── Cabecera: de qué evento es esta boleta ── */
  doc.setFillColor(...NEGRO);
  doc.rect(0, 0, A, 34, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(limpio(evento.titulo) || 'Evento', M, 15, { maxWidth: ancho });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const sub = [fechaLarga(evento.fecha_inicio), limpio(evento.location_nombre)].filter(Boolean).join('  ·  ');
  if (sub) doc.text(sub, M, 23, { maxWidth: ancho });
  const org = limpio(evento.organizador?.empresa || evento.organizador?.nombre);
  if (org) {
    doc.setFontSize(8);
    doc.setTextColor(190);
    doc.text(`Organiza: ${org}`, M, 29.5, { maxWidth: ancho });
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
