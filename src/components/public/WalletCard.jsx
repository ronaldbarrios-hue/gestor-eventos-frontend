import { QRCodeSVG } from 'qrcode.react';
import { WALLET_DEFECTO, walletConfig } from '../../lib/wallet.js';

/* Tarjeta wallet del asistente — carné digital tipo membresía con QR y
   puntos de asistencia (gamificación). El diseño lo configura el organizador
   (page_json.wallet, ahora con VARIANTES por público) y esta tarjeta se
   muestra en /mi-ticket y se configura/previsualiza en Asistentes → Tarjeta.
   El contrato (variantes, migración, reglas de puntos) vive en lib/wallet.js. */

export { WALLET_DEFECTO, walletConfig };

function fondo(d) {
  if (d.estilo === 'oscuro') return { background: '#0A0F1A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' };
  if (d.estilo === 'claro')  return { background: '#F4F6FB', color: '#0A0F1A', border: '1px solid #e2e8f0' };
  if (d.estilo === 'neon')   return { background: `radial-gradient(120% 120% at 0% 0%, ${d.color1}, #05070d 70%)`, color: '#fff', border: `1px solid ${d.color2}55` };
  return { background: `linear-gradient(135deg, ${d.color1}, ${d.color2})`, color: '#fff', border: 'none' };
}

export default function WalletCard({ design = WALLET_DEFECTO, evento = {}, ticket = {}, puntos = null }) {
  const d = { ...WALLET_DEFECTO, ...design };
  const claro = d.estilo === 'claro';
  const sub = claro ? 'rgba(10,15,26,0.6)' : 'rgba(255,255,255,0.75)';
  const chip = claro ? 'rgba(10,15,26,0.08)' : 'rgba(255,255,255,0.15)';
  const nombre = ticket.guest_nombre || ticket.nombre || 'Asistente';
  const tipo = ticket.tipo?.nombre || ticket.ticket_nombre || (typeof ticket.tipo === 'string' ? ticket.tipo : '') || 'General';
  const qrValue = ticket.qr_token || ticket.codigo || ticket.qr || '';
  const marca = evento.page_json?.branding?.plataforma || evento.organizador?.empresa || evento.titulo || 'GESTEK';

  return (
    <div className="rounded-3xl overflow-hidden shadow-2xl p-5 sm:p-6 flex flex-col justify-between"
      style={{ ...fondo(d), aspectRatio: '16 / 10', minHeight: 220 }}>
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: sub }}>{marca}</p>
          <p className="text-lg font-bold font-display leading-tight truncate">{evento.titulo || 'Evento'}</p>
        </div>
        {d.logo
          ? <img src={d.logo} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          : <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0" style={{ background: chip }}>{marca.charAt(0).toUpperCase()}</div>}
      </div>

      {/* Cuerpo: datos + QR */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: sub }}>Titular</p>
          <p className="text-base font-semibold truncate">{nombre}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {d.mostrar_tipo && <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md" style={{ background: chip }}>{tipo}</span>}
            {d.mostrar_puntos && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md" style={{ background: chip }}>
                {puntos != null ? `${puntos} pts` : d.titulo_puntos}
              </span>
            )}
          </div>
        </div>
        {d.mostrar_qr && qrValue && (
          <div className="bg-white rounded-xl p-2 flex-shrink-0">
            <QRCodeSVG value={qrValue} size={72} level="M" includeMargin={false} />
          </div>
        )}
      </div>
    </div>
  );
}
