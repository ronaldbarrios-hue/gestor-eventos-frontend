import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import client from '../../api/client.js';
import GLoader from '../../components/ui/GLoader.jsx';

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

  useEffect(() => {
    client.get('/me/boletas')
      .then(r => setBoletas(r.data.boletas || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-20"><GLoader message="Cargando tus boletas..." /></div>;

  if (error) return (
    <div className="py-20 text-center">
      <p className="text-sm text-danger">{error}</p>
    </div>
  );

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
    </div>
  );
}
