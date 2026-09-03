import { QRCodeSVG } from 'qrcode.react';
import { ETIQUETA, ALTURAS_MM, medidas } from '../../lib/etiquetaTermica.js';

/* Una escarapela para la etiquetadora térmica, a tamaño real.
 *
 * Se dibuja en milímetros y no en píxeles: lo que importa es cuánto mide en la
 * mano, no cómo se ve en pantalla. El navegador la manda a la impresora con
 * `@page { size: 90mm 55mm }`, así que lo que se ve aquí es lo que sale.
 *
 * ── Por qué es blanco y negro ────────────────────────────────────────────
 *
 * La transferencia térmica es de un bit: cada punto se imprime o no. No hay
 * grises ni colores —sólo el de la cinta cargada—, así que el color por tipo de
 * asistente, que es lo único configurable de la escarapela normal, aquí no
 * existe. Se sustituye por el recuadro: con borde para todos, relleno para el
 * tipo que se quiera destacar. Ver `lib/etiquetaTermica.js`.
 *
 * ── Lo que NO se imprime, y por qué ──────────────────────────────────────
 *
 * · **La marca de agua.** Un fondo tenue es una trama a 203 dpi, se ve sucia y
 *   además come contraste justo alrededor del QR.
 * · **El logo, si es a color.** Sale como una mancha. Se deja opcional y se
 *   avisa: en térmica un logo sólo funciona si es una silueta de un solo tono.
 * · **Los campos extra del formulario.** Caben dos líneas de texto, y el nombre
 *   y el tipo son las dos que se miran en la puerta. */

export default function EtiquetaTermica({
  ticket = {},
  evento = {},
  qrValue,
  /* Tipos que van con el recuadro relleno (VIP, Staff…). Es lo más parecido a
     «este es distinto» que se puede imprimir en un bit. */
  destacados = [],
  logoUrl = '',
  mostrarCodigo = true,
}) {
  const valor = qrValue || ticket.qr_token || ticket.codigo || '';
  const m = medidas(valor);

  const nombre = (ticket.asistente?.nombre || ticket.guest_nombre || '').trim();
  const tipo = (ticket.tipo?.nombre || '').trim();
  const destacado = destacados.some(d => d.toLowerCase() === tipo.toLowerCase());

  if (!m.cabe) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-text-2">
        No se puede imprimir esta escarapela: {m.motivo}
      </div>
    );
  }

  const anchoTexto = m.texto_mm;

  return (
    <div
      className="etiqueta-termica"
      style={{
        width: `${ETIQUETA.ancho}mm`,
        height: `${ETIQUETA.alto}mm`,
        padding: `${ETIQUETA.margen}mm`,
        boxSizing: 'border-box',
        display: 'flex',
        gap: `${ETIQUETA.separacion}mm`,
        background: '#fff',
        color: '#000',
        /* Sin sombras, sin bordes redondeados y sin opacidades: nada de eso
           existe en un bit, y en pantalla haría creer que sí. */
        fontFamily: 'Helvetica, Arial, sans-serif',
      }}
    >
      {/* El QR, centrado dentro del cuadrado que se le reserva.

          Se pidió «4×4 cm centrado», y el código mide 36,5: el resto es blanco
          a su alrededor. No es un ajuste a la baja por pereza —ver `medidas()`—:
          40 mm exactos darían 4,38 puntos por módulo, y un módulo que no cae en
          punto entero lo redondea el cabezal a su manera, dejando el borde con
          diente. Reservar los 40 y centrar dentro deja el hueco pedido con el
          código impreso limpio. */}
      <div style={{
        flex: `0 0 ${m.caja_mm}mm`, width: `${m.caja_mm}mm`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <QRCodeSVG
          value={valor}
          level="M"
          includeMargin
          style={{ width: `${m.lado_mm}mm`, height: `${m.lado_mm}mm`, display: 'block' }}
        />
        {mostrarCodigo && ticket.codigo && (
          <span style={{
            fontFamily: 'Courier, monospace',
            fontSize: `${ALTURAS_MM.codigo}mm`,
            letterSpacing: '0.4mm',
            fontWeight: 700,
            marginTop: '0.5mm',
            lineHeight: 1,
          }}>
            {ticket.codigo}
          </span>
        )}
      </div>

      <div style={{
        flex: '1 1 auto', minWidth: 0, width: `${anchoTexto}mm`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5mm',
      }}>
        {logoUrl && (
          <img src={logoUrl} alt="" style={{ height: '5mm', objectFit: 'contain', objectPosition: 'left', filter: 'grayscale(1) contrast(3)' }} />
        )}

        <p style={{
          fontSize: `${ALTURAS_MM.nombre}mm`,
          fontWeight: 800,
          lineHeight: 1.05,
          margin: 0,
          /* Dos líneas y corta. Un nombre largo partido en cuatro líneas deja
             la escarapela ilegible desde lejos, que es justo para lo que sirve. */
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}>
          {nombre || 'Sin nombre'}
        </p>

        {tipo && (
          <span style={{
            alignSelf: 'flex-start',
            fontSize: `${ALTURAS_MM.tipo}mm`,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.3mm',
            lineHeight: 1,
            padding: '1mm 1.5mm',
            border: '0.375mm solid #000',   // 3 puntos: por debajo se pierde
            ...(destacado ? { background: '#000', color: '#fff' } : {}),
          }}>
            {tipo}
          </span>
        )}

        <p style={{
          fontSize: `${ALTURAS_MM.evento}mm`,
          margin: 0, lineHeight: 1.15,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {evento.titulo || ''}
        </p>
      </div>
    </div>
  );
}
