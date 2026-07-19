import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import client from '../../api/client.js';
import { meApi } from '../../api/me.js';
import { useToast } from '../../context/ToastContext.jsx';
import GLoader from '../../components/ui/GLoader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

const ESTADO_INFO = {
  emitido    : { label: 'Apartada',    cls: 'bg-warning/10 text-warning border-warning/30'   },
  pagado     : { label: 'Confirmada',  cls: 'bg-success/10 text-success border-success/30'   },
  usado      : { label: 'Ya usada',    cls: 'bg-text-1/10 text-text-1 border-border-2'       },
  reembolsado: { label: 'Reembolsada', cls: 'bg-text-3/10 text-text-2 border-border'         },
  invalido   : { label: 'Inválida',    cls: 'bg-danger/10 text-danger border-danger/30'       },
};

export default function MisBoletasPage() {
  const [boletas, setBoletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [abierta, setAbierta] = useState(null);
  const [transferirId, setTransferirId] = useState(null);
  const { success } = useToast();

  const cargar = () => {
    client.get('/me/boletas')
      .then(r => setBoletas(r.data.boletas || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  if (loading) return <div className="py-20"><GLoader message="Cargando tus boletas..." /></div>;

  if (error) return (
    <div className="py-20 text-center">
      <p className="text-sm text-danger">{error}</p>
    </div>
  );

  const boletaATransferir = boletas.find(b => b.id === transferirId);

  return (
    <div className="space-y-6 animate-[fadeUp_0.4s_ease_both]">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold font-display text-text-1 tracking-tight">Mis boletas</h1>
        <p className="text-base text-text-2 mt-1">{boletas.length} boleta{boletas.length !== 1 ? 's' : ''} en total</p>
      </div>

      {boletas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-text-3/50">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          <p className="text-text-3 text-sm max-w-xs">Aún no tienes boletas. Explora los eventos disponibles y compra tu primera entrada.</p>
          <Link to="/app/explorar" className="px-5 py-2.5 rounded-full bg-gradient-primary text-white text-sm font-semibold hover:opacity-90 transition">
            Explorar eventos
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {boletas.map(b => {
            const estado = ESTADO_INFO[b.estado] || ESTADO_INFO.emitido;
            const fecha = b.evento?.fecha_inicio
              ? new Date(b.evento.fecha_inicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
              : '';
            const qrValue = b.qr_token || b.codigo;
            const isOpen = abierta === b.id;
            const puedeTransferir = b.estado === 'pagado' && !b.checked_in_at;

            return (
              <div key={b.id} className="rounded-3xl border border-border bg-surface/40 overflow-hidden flex flex-col">
                {/* Cover del evento */}
                {b.evento?.cover_url ? (
                  <div className="aspect-video overflow-hidden">
                    <img src={b.evento.cover_url} alt={b.evento.titulo} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary/20 via-accent/10 to-bg flex items-center justify-center">
                    <span className="text-4xl font-bold text-text-3/40">{b.evento?.titulo?.[0]?.toUpperCase()}</span>
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <h3 className="font-semibold text-text-1 text-base line-clamp-1">{b.evento?.titulo}</h3>
                    <p className="text-xs text-text-3 mt-0.5">{fecha}{b.evento?.location_nombre ? ` · ${b.evento.location_nombre}` : ''}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-2">{b.tipo?.nombre}</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${estado.cls}`}>
                      {estado.label}
                    </span>
                  </div>

                  {/* QR expandible */}
                  <button
                    onClick={() => setAbierta(isOpen ? null : b.id)}
                    className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-text-2 hover:text-text-1 hover:bg-surface-2 transition flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3m0 4h4m-4-4v4m-3-4h.01M17 14h.01"/>
                    </svg>
                    {isOpen ? 'Ocultar QR' : 'Ver QR'}
                  </button>

                  {isOpen && (
                    <div className="flex flex-col items-center gap-3 pt-2 animate-[fadeUp_0.3s_ease_both]">
                      <div className="bg-white rounded-2xl p-4">
                        <QRCodeSVG value={qrValue} size={180} level="M" includeMargin={false} />
                      </div>
                      <p className="font-mono text-lg font-bold text-text-1 tracking-widest">{b.codigo}</p>
                    </div>
                  )}

                  {puedeTransferir && (
                    <button
                      onClick={() => setTransferirId(b.id)}
                      className="w-full py-2.5 rounded-xl border border-primary/25 bg-primary/5 text-sm font-medium text-primary-light hover:bg-primary/10 transition flex items-center justify-center gap-2"
                    >
                      <TransferIcon className="w-4 h-4" />
                      Transferir a otra persona
                    </button>
                  )}

                  <Link
                    to={`/mi-ticket/${b.codigo}`}
                    className="text-center text-xs text-text-3 hover:text-primary-light transition-colors"
                  >
                    Ver boleta completa →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {boletaATransferir && (
        <TransferirModal
          boleta={boletaATransferir}
          onClose={() => setTransferirId(null)}
          onDone={() => {
            setTransferirId(null);
            success('Boleta transferida. Le enviamos su entrada por correo.');
            setLoading(true);
            cargar();
          }}
        />
      )}
    </div>
  );
}

/* ─────────── Modal de transferencia ─────────── */
function TransferirModal({ boleta, onClose, onDone }) {
  const { error: toastErr } = useToast();
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [working, setWorking] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) { toastErr('Ingresa un email válido.'); return; }
    if (!confirmando) { setConfirmando(true); return; }

    setWorking(true);
    try {
      await meApi.transferir(boleta.id, { email: email.trim(), nombre: nombre.trim() || undefined });
      onDone();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
      setConfirmando(false);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">Transferir boleta</p>
            <h2 className="text-lg font-bold font-display tracking-tight text-text-1 line-clamp-1">{boleta.evento?.titulo}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {!confirmando ? (
            <>
              <p className="text-sm text-text-2 leading-relaxed">
                La boleta con código <span className="font-mono text-text-1">{boleta.codigo}</span> dejará de ser tuya y pasará a la persona que indiques. El código QR se renueva por seguridad.
              </p>
              <div className="field">
                <label className="label">Email de la nueva persona</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input rounded-2xl py-3" placeholder="nombre@ejemplo.com" required autoFocus
                />
              </div>
              <div className="field">
                <label className="label">Nombre <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
                <input
                  value={nombre} onChange={e => setNombre(e.target.value)}
                  className="input rounded-2xl py-3" placeholder="Como aparecerá en la entrada"
                />
              </div>
              <button type="submit" className="w-full py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white transition-all">
                Continuar
              </button>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-warning/10 border border-warning/25 px-4 py-3.5 text-sm text-text-2 leading-relaxed">
                <p className="font-medium text-text-1 mb-1">¿Confirmas la transferencia?</p>
                <p>Esta acción no se puede deshacer. La boleta ya no aparecerá en tu cuenta, y <strong className="text-text-1">{email}</strong> recibirá un correo con su nueva entrada.</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setConfirmando(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-medium text-text-1 border border-border-2 hover:bg-surface-2 transition-all">
                  Atrás
                </button>
                <button type="submit" disabled={working}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                  {working ? <><Spinner size="sm" /> Transfiriendo...</> : 'Confirmar transferencia'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function TransferIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" /></svg>;
}
