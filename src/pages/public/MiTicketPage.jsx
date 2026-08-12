import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { eventosApi } from '../../api/eventos.js';
import WalletCard, { walletConfig } from '../../components/public/WalletCard.jsx';
import GLoader from '../../components/ui/GLoader.jsx';
import { googleCalendarUrl } from '../../lib/calendario.js';
import Icono from '../../components/ui/Icono.jsx';

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
  const [formularioListo, setFormularioListo] = useState(false);

  const cargar = () => {
    eventosApi.ticketByCode(codigo)
      .then(d => setTicket(d.ticket))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setLoading(true); cargar(); /* eslint-disable-next-line */ }, [codigo]);

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

  const camposForm = ticket.evento?.campos_formulario || [];
  /* Si el evento tiene preguntas personalizadas y esta boleta todavía no
     tiene respuestas guardadas (por ejemplo, justo después de transferirla
     a otra persona), pedimos completar el formulario antes de mostrar el QR. */
  const faltaFormulario = camposForm.length > 0 && !ticket.respuestas && !formularioListo;

  if (faltaFormulario) {
    return (
      <FormularioPendiente
        ticket={ticket}
        campos={camposForm}
        onListo={() => { setFormularioListo(true); cargar(); }}
      />
    );
  }

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

      {/* Si es una boleta de stand, la empresa edita su ficha de expositor */}
      {ticket.tipo?.es_expositor && (
        <Link to={`/expositor/${ticket.codigo}`}
          className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 hover:bg-accent/10 transition-colors">
          <span className="text-sm text-text-1 inline-flex items-center gap-1.5"><Icono name="stand" className="w-4 h-4 flex-shrink-0" /><span><strong>Tienes un stand.</strong> Edita tu ficha de expositor.</span></span>
          <span className="text-accent-light text-sm font-medium whitespace-nowrap">Editar →</span>
        </Link>
      )}

      {/* Tarjeta wallet (diseño del organizador · gamificación) = escarapela digital */}
      <div className="mt-6">
        <WalletCard
          design={walletConfig(ticket.evento?.page_json, { publico: 'asistentes', tipo: ticket.tipo?.nombre })}
          evento={ticket.evento || {}} ticket={ticket} puntos={ticket.puntos ?? null} />
        <div className="mt-3 flex items-center justify-center gap-3">
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 text-sm text-text-2 hover:text-text-1 transition-colors">
            <Icono name="impresora" className="w-4 h-4" />Imprimir mi escarapela
          </button>
        </div>
        <p className="text-[11px] text-text-3 text-center mt-1">Guárdala en el móvil o imprímela: tu QR sirve para entrar y para los stands.</p>
      </div>

      {/* QR principal */}
      <div className="mt-8 flex flex-col items-center">
        <div className="bg-white rounded-3xl p-5 inline-block">
          <QRCodeSVG value={qrValue} size={220} level="M" includeMargin={false} />
        </div>
        <p className="font-mono text-2xl font-bold text-text-1 tabular-nums tracking-widest mt-4">{ticket.codigo}</p>
      </div>

      {/* Pasaporte gamificado */}
      {ticket.pasaporte?.activo && <PasaporteCard p={ticket.pasaporte} />}

      {/* Movimientos de puntos — lo que le fueron marcando en los stands */}
      {Array.isArray(ticket.interacciones) && ticket.interacciones.length > 0 && (
        <div className="mt-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-1">Tus puntos</h2>
            <span className="text-lg font-bold font-display tabular-nums text-text-1">{ticket.puntos ?? 0} pts</span>
          </div>
          <ul className="rounded-2xl border border-border bg-surface/40 divide-y divide-border overflow-hidden">
            {ticket.interacciones.map(it => {
              const neg = it.tipo === 'negativo';
              return (
                <li key={it.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${neg ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'}`}>
                    <Icono name={neg ? 'aviso' : 'estrella'} className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-1 truncate">
                      {it.motivo_texto || 'Registro'}
                      {it.lugar && <span className="text-text-3"> · {it.lugar}</span>}
                    </p>
                    <p className="text-[11px] text-text-3">{new Date(it.created_at).toLocaleString('es-CO')}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${neg ? 'text-danger' : 'text-success'}`}>
                    {it.puntos > 0 ? `+${it.puntos}` : it.puntos}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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

      {ticket.evento?.fecha_inicio && (
        <div className="mt-6 no-print">
          <a href={googleCalendarUrl({ titulo: ticket.evento?.titulo, inicio: ticket.evento?.fecha_inicio, fin: ticket.evento?.fecha_fin, lugar: ticket.evento?.location_nombre })}
            target="_blank" rel="noreferrer noopener"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-border bg-surface/60 text-sm font-medium text-text-1 hover:bg-surface-2 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Añadir a Google Calendar
          </a>
        </div>
      )}

      <div className="mt-8 text-center no-print">
        <Link to={`/explorar/${ticket.evento?.slug}`} className="text-sm text-text-2 hover:text-text-1 transition-colors">
          Ver evento →
        </Link>
      </div>

      {/* Escarapela imprimible: oculta en pantalla, aparece SOLO al imprimir.
         Así el asistente imprime su propia credencial aunque el evento no las
         imprima centralizadamente. */}
      <EscarapelaImprimible ticket={ticket} qrValue={qrValue} />
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .escarapela-yo, .escarapela-yo * { visibility: visible; }
          .escarapela-yo { position: absolute; inset: 0; margin: 0 auto; }
          .no-print { display: none !important; }
        }
      `}</style>
    </section>
  );
}

function PasaporteCard({ p }) {
  const visitados = p.expositores_visitados || [];
  const meta = p.meta || Math.max(visitados.length, 1);
  const pct = Math.min(100, Math.round((p.visitados / meta) * 100));
  const vacios = Math.max(0, meta - visitados.length);

  return (
    <div className={`mt-8 rounded-3xl border p-5 ${p.completo ? 'border-success/40 bg-success/5' : 'border-border bg-surface/40'}`}>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-sm font-semibold text-text-1">{p.titulo}</h2>
        <span className="text-sm font-bold font-display tabular-nums text-text-1">{p.visitados}/{meta}</span>
      </div>
      {p.descripcion && <p className="text-xs text-text-3 mb-3">{p.descripcion}</p>}

      <div className="h-2 rounded-full bg-surface-2 overflow-hidden mb-4">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.completo ? 'var(--success, #10B981)' : 'var(--brand-primary, #3B82F6)' }} />
      </div>

      <div className="flex flex-wrap gap-2">
        {visitados.map(e => (
          <div key={e.id} title={e.nombre} className="w-11 h-11 rounded-xl overflow-hidden border-2 border-success/50 flex-shrink-0">
            {e.logo_url
              ? <img src={e.logo_url} alt={e.nombre} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-success/15 text-success flex items-center justify-center text-sm font-bold">{(e.nombre || '?').charAt(0).toUpperCase()}</div>}
          </div>
        ))}
        {Array.from({ length: vacios }).map((_, i) => (
          <div key={`v${i}`} className="w-11 h-11 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-text-3 flex-shrink-0">?</div>
        ))}
      </div>

      {p.completo && (
        <div className="mt-4 rounded-2xl border border-success/30 bg-success/10 px-4 py-3">
          <p className="text-sm font-semibold text-text-1 flex items-center justify-center gap-1.5"><Icono name="ceremonia" className="w-4 h-4 text-accent" />¡Pasaporte completo!</p>
          {p.premio_texto && <p className="text-xs text-text-2 mt-0.5">{p.premio_texto}</p>}
        </div>
      )}
    </div>
  );
}

function EscarapelaImprimible({ ticket, qrValue }) {
  const marca = ticket.evento?.page_json?.branding?.plataforma || ticket.evento?.titulo || 'Evento';
  const logo = ticket.evento?.page_json?.branding?.logo_url || ticket.evento?.page_json?.credenciales?.logo_url;
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

/* ─────────── Formulario pendiente (boleta transferida sin datos aún) ─────────── */
function FormularioPendiente({ ticket, campos, onListo }) {
  const [respuestas, setRespuestas] = useState({});
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState('');

  const setRespuesta = (id, value) => setRespuestas(r => ({ ...r, [id]: value }));

  const submit = async (e) => {
    e.preventDefault();
    for (const c of campos) {
      if (c.requerido) {
        const v = respuestas[c.id];
        if (v === undefined || v === null || v === '' || v === false) {
          setErr(`El campo "${c.etiqueta}" es obligatorio.`);
          return;
        }
      }
    }
    setWorking(true); setErr('');
    try {
      await eventosApi.completarFormularioTicket(ticket.codigo, respuestas);
      onListo();
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="px-5 py-12 max-w-md mx-auto animate-[fadeUp_0.4s_ease_both]">
      {ticket.evento?.cover_url && (
        <div className="aspect-video rounded-3xl overflow-hidden border border-border mb-6">
          <img src={ticket.evento.cover_url} alt={ticket.evento.titulo} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-widest text-primary-light font-semibold mb-2">¡Esta boleta es tuya ahora!</p>
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-text-1 mb-2">{ticket.evento?.titulo}</h1>
        <p className="text-sm text-text-2 leading-relaxed">
          Antes de mostrarte tu QR, completa estos datos que pide el organizador.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {err && <div className="px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger-light text-sm">{err}</div>}

        {campos.map(c => (
          <CampoDinamico key={c.id} campo={c} value={respuestas[c.id]} onChange={v => setRespuesta(c.id, v)} eventoId={ticket.evento?.id} />
        ))}

        <button type="submit" disabled={working}
          className="w-full py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 transition-all">
          {working ? 'Guardando...' : 'Ver mi entrada'}
        </button>
      </form>
    </section>
  );
}

function CampoDinamico({ campo, value, onChange, eventoId }) {
  const req = campo.requerido;
  if (campo.tipo === 'checkbox') {
    return (
      <label className="flex items-start gap-2.5 text-sm text-text-2 cursor-pointer py-1">
        <input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded accent-primary" />
        <span>{campo.etiqueta}{req && <span className="text-danger-light"> *</span>}</span>
      </label>
    );
  }
  if (campo.tipo === 'seleccion') {
    return (
      <div className="field">
        <label className="label">{campo.etiqueta}{req && ' *'}</label>
        <select required={req} value={value || ''} onChange={e => onChange(e.target.value)}
          className="input bg-surface-2 rounded-2xl py-3 text-base">
          <option value="" disabled>Selecciona una opción</option>
          {(campo.opciones || []).map(op => <option key={op} value={op}>{op}</option>)}
        </select>
      </div>
    );
  }
  if (campo.tipo === 'foto') {
    return (
      <div className="field">
        <label className="label">{campo.etiqueta}{req && ' *'}</label>
        <FormPhotoUploaderLazy value={value} onChange={onChange} eventoId={eventoId} campoId={campo.id} />
      </div>
    );
  }
  const tipoInput = campo.tipo === 'numero' ? 'number' : campo.tipo === 'fecha' ? 'date' : 'text';
  return (
    <div className="field">
      <label className="label">{campo.etiqueta}{req && ' *'}</label>
      <input required={req} type={tipoInput} value={value || ''} onChange={e => onChange(e.target.value)}
        className="input rounded-2xl py-3 text-base" />
    </div>
  );
}

/* Carga diferida: el uploader de fotos usa Supabase Storage directo desde
   el navegador, así que solo lo importamos si realmente hay un campo tipo
   "foto" en el formulario. */
function FormPhotoUploaderLazy(props) {
  const [Comp, setComp] = useState(null);
  useEffect(() => {
    import('../../components/ui/FormPhotoUploader.jsx').then(m => setComp(() => m.default));
  }, []);
  if (!Comp) return <div className="h-40 rounded-2xl bg-surface-2/40 animate-pulse" />;
  return <Comp {...props} />;
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
