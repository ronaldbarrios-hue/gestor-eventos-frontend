import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { eventosApi } from '../../api/eventos.js';
import GLoader from '../../components/ui/GLoader.jsx';

/* Página pública /mi-ticket/:codigo
   Cualquiera con el código puede ver su QR. */

const ESTADO_INFO = {
  emitido    : { label: 'Apartada',     cls: 'bg-warning/10 text-warning border-warning/30' },
  pagado     : { label: 'Confirmada',   cls: 'bg-success/10 text-success border-success/30' },
  usado      : { label: 'Ya usada',     cls: 'bg-text-1/10 text-text-1 border-border-2' },
  reembolsado: { label: 'Reembolsada',  cls: 'bg-text-3/10 text-text-2 border-border' },
  invalido   : { label: 'Inválida',     cls: 'bg-danger/10 text-danger border-danger/30' },
};

export default function MiTicketPage() {
  const { codigo } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    eventosApi.ticketByCode(codigo)
      .then(d => setTicket(d.ticket))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [codigo]);

  if (loading) return (
    <section className="px-5 py-20 max-w-md mx-auto"><GLoader message="Buscando tu boleta..." /></section>
  );

  if (error || !ticket) return (
    <section className="px-5 py-20 max-w-md mx-auto text-center animate-[fadeUp_0.4s_ease_both]">
      <p className="text-xs uppercase tracking-widest text-danger mb-3">Boleta no encontrada</p>
      <h1 className="text-2xl font-bold font-display text-text-1 mb-3">
        El código <span className="font-mono">{codigo}</span> no existe.
      </h1>
      <p className="text-sm text-text-2 mb-6">Revisa el código o pídele al organizador que te lo reenvíe.</p>
      <Link to="/explorar" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border-2 text-sm hover:bg-surface">
        ← Explorar eventos
      </Link>
    </section>
  );

  const fecha = ticket.evento?.fecha_inicio
    ? new Date(ticket.evento.fecha_inicio).toLocaleString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
  const estado = ESTADO_INFO[ticket.estado] || ESTADO_INFO.emitido;
  const qrValue = ticket.qr_token || ticket.codigo;

  return (
    <section className="px-5 py-12 max-w-md mx-auto animate-[fadeUp_0.4s_ease_both]">
      {/* Header con cover del evento */}
      {ticket.evento?.cover_url && (
        <div className="aspect-video rounded-3xl overflow-hidden border border-border mb-6">
          <img src={ticket.evento.cover_url} alt={ticket.evento.titulo} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-2">Tu boleta</p>
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-text-1 mb-2">{ticket.evento?.titulo}</h1>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${estado.cls}`}>
          {estado.label}
        </span>
      </div>

      {/* QR principal */}
      <div className="mt-8 flex flex-col items-center">
        <div className="bg-white rounded-3xl p-5 inline-block">
          <QRCodeSVG value={qrValue} size={220} level="M" includeMargin={false} />
        </div>
        <p className="font-mono text-2xl font-bold text-text-1 tabular-nums tracking-widest mt-4">{ticket.codigo}</p>
      </div>

      {/* Detalles */}
      <div className="mt-8 space-y-2.5">
        <Row label="Asistente" value={ticket.guest_nombre} />
        <Row label="Email" value={ticket.guest_email} />
        <Row label="Tipo de boleta" value={ticket.tipo?.nombre} />
        {fecha && <Row label="Fecha" value={fecha} />}
        {ticket.evento?.location_nombre && <Row label="Lugar" value={ticket.evento.location_nombre} />}
        {ticket.checked_in_at && (
          <Row label="Check-in" value={new Date(ticket.checked_in_at).toLocaleString('es-CO')} />
        )}
      </div>

      <div className="mt-8 text-center">
        <Link to={`/explorar/${ticket.evento?.slug}`} className="text-sm text-text-2 hover:text-text-1 transition-colors">
          Ver evento →
        </Link>
      </div>
    </section>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface/40 px-4 py-3 flex items-center justify-between gap-3">
      <span className="text-[10px] uppercase tracking-widest text-text-3 font-semibold">{label}</span>
      <span className="text-sm text-text-1 text-right truncate">{value}</span>
    </div>
  );
}
