import { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { clientesApi } from '../../../../api/clientes.js';

/* Asistentes · Credenciales — carnets/escarapelas imprimibles con QR real. */
export default function CredencialesSection({ evento }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [sel, setSel] = useState(new Set());

  useEffect(() => {
    clientesApi.list(evento.id, { limit: 1000 })
      .then(d => setClientes(d.clientes || d.tickets || []))
      .finally(() => setLoading(false));
  }, [evento.id]);

  const filas = useMemo(() => clientes
    .map(c => ({
      id: c.id, nombre: c.nombre || c.cliente_nombre || 'Asistente',
      tipo: c.tipo || c.ticket_nombre || 'General',
      codigo: c.codigo || c.qr || String(c.id),
    }))
    .filter(f => !filtro || f.nombre.toLowerCase().includes(filtro.toLowerCase()) || f.tipo.toLowerCase().includes(filtro.toLowerCase())),
  [clientes, filtro]);

  const toggle = (id) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const todos = () => setSel(s => s.size === filas.length ? new Set() : new Set(filas.map(f => f.id)));
  const aImprimir = filas.filter(f => sel.size === 0 || sel.has(f.id));

  if (loading) return <p className="text-sm text-text-3 py-8">Cargando asistentes…</p>;
  if (clientes.length === 0) return <div className="card p-10 text-center"><p className="text-sm text-text-2">Cuando tengas asistentes inscritos podrás generar sus credenciales aquí.</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-2">
          <input className="input !h-9 w-64" placeholder="Filtrar por nombre o tipo…" value={filtro} onChange={e => setFiltro(e.target.value)} />
          <button onClick={todos} className="btn-ghost btn-sm">{sel.size === filas.length ? 'Quitar selección' : 'Seleccionar todos'}</button>
        </div>
        <button onClick={() => window.print()} className="btn-primary btn-sm">
          Imprimir {aImprimir.length} credencial{aImprimir.length !== 1 ? 'es' : ''}
        </button>
      </div>

      {/* Selección */}
      <div className="no-print rounded-2xl border border-border overflow-hidden max-h-56 overflow-y-auto">
        <ul className="divide-y divide-border">
          {filas.map(f => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-2/40 cursor-pointer" onClick={() => toggle(f.id)}>
              <input type="checkbox" readOnly checked={sel.size === 0 || sel.has(f.id)} className="accent-[#8B5CF6]" />
              <span className="text-sm text-text-1 flex-1 truncate">{f.nombre}</span>
              <span className="text-xs text-text-3">{f.tipo}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Hoja de credenciales (visible también en impresión) */}
      <div className="credenciales-print grid grid-cols-2 md:grid-cols-3 gap-4">
        {aImprimir.map(f => (
          <div key={f.id} className="credencial rounded-2xl border border-border overflow-hidden bg-white text-slate-900">
            <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #0A0F1A, #1E1B4B)' }}>
              <p className="text-[10px] uppercase tracking-widest text-white/60">{evento.titulo}</p>
            </div>
            <div className="p-4 flex flex-col items-center text-center gap-2">
              <QRCodeSVG value={`${window.location.origin}/mi-ticket/${f.codigo}`} size={92} />
              <p className="text-sm font-bold leading-tight mt-1">{f.nombre}</p>
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-900 text-white">{f.tipo}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .credenciales-print, .credenciales-print * { visibility: visible; }
          .credenciales-print { position: absolute; inset: 0; padding: 12mm; grid-template-columns: repeat(3, 1fr) !important; gap: 8mm; }
          .credencial { break-inside: avoid; border: 1px solid #ddd !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
