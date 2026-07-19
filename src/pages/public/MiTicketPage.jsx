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
