import { QRCodeSVG } from 'qrcode.react';

/* La escarapela, tal como sale de la impresora.
 *
 * ── Por qué es un componente y no dos ────────────────────────────────────
 *
 * Vivía dentro de `MiTicketPage`: la persona podía imprimir la suya desde su
 * boleta, y quien organiza NO podía imprimir la de nadie desde el panel. Sólo
 * tenía «Descargar» y «Enviar» — y el día del evento, con alguien delante que
 * llegó sin teléfono, lo que hace falta es papel.
 *
 * Escribirla otra vez en el panel habría dejado dos escarapelas que se separan:
 * una con el logo del organizador y otra sin él, o con el código en otro sitio.
 * Y la que se separa es siempre la que menos se mira, que aquí es justo la que
 * acaba en la mano de alguien en la puerta.
 *
 * ── Por qué estilos en línea y no clases ─────────────────────────────────
 *
 * Porque esto se imprime. Las clases dependen de una hoja de estilos que el
 * diálogo de impresión puede no aplicar igual —fondos que el navegador quita
 * para ahorrar tinta, variables de tema que no existen en papel—, y una
 * escarapela sin fondo negro es una escarapela con el QR ilegible.
 */
export default function EscarapelaImprimible({ ticket = {}, qrValue }) {
  const marca = ticket.evento?.page_json?.branding?.plataforma || ticket.evento?.titulo || 'Evento';
  const logo = ticket.evento?.page_json?.branding?.logo_url || ticket.evento?.page_json?.credenciales?.logo_url;

  /* Sin QR no hay escarapela que valga: un papel con un nombre no abre
     ninguna puerta, y darlo por bueno es peor que no imprimir. */
  if (!qrValue) return null;

  return (
    <div className="escarapela-yo hidden print:block" style={{ width: '90mm' }}>
      <div style={{ border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden', background: '#fff', color: '#0f172a' }}>
        <div style={{ background: '#0A0F1A', color: '#fff', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {logo && <img src={logo} alt="" style={{ height: 20, objectFit: 'contain' }} />}
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.85 }}>{marca}</span>
        </div>
        <div style={{ padding: 14, textAlign: 'center' }}>
          <div style={{ background: '#fff', display: 'inline-block', padding: 6 }}>
            <QRCodeSVG value={qrValue} size={120} level="M" includeMargin={false} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>{ticket.guest_nombre || 'Asistente'}</p>
          <span style={{ display: 'inline-block', marginTop: 6, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, background: '#0A0F1A', color: '#fff', padding: '3px 10px', borderRadius: 999 }}>
            {ticket.tipo?.nombre || 'General'}
          </span>
          <p style={{ fontSize: 9, fontFamily: 'monospace', color: '#64748b', marginTop: 8 }}>{ticket.codigo}</p>
        </div>
      </div>
    </div>
  );
}

/* Las reglas de impresión, que van con la escarapela y no sueltas en cada
   pantalla: si una las tiene y otra no, el «Imprimir» de la segunda saca la
   pantalla entera con su menú lateral. */
export const ESTILOS_DE_IMPRESION = `
  @media print {
    body * { visibility: hidden; }
    .escarapela-yo, .escarapela-yo * { visibility: visible; }
    .escarapela-yo { position: absolute; inset: 0; margin: 0 auto; }
    .no-print { display: none !important; }
  }
`;
