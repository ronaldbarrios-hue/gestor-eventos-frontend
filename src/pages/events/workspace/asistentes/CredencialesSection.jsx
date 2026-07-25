import { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { clientesApi } from '../../../../api/clientes.js';
import { eventosApi } from '../../../../api/eventos.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import ImagePicker from '../../../../components/ui/ImagePicker.jsx';

/* Asistentes · Credenciales — diseñador de escarapelas imprimibles.
   El organizador elige tamaño, logo, qué datos se imprimen y el color por
   tipo de asistente (VIP, Staff…), ve la vista previa y manda a imprimir.

   El QR es el MISMO código del ticket: sirve para control de acceso y para
   sumar puntos de gamificación al escanear en stands/actividades. Los puntos
   NO se imprimen (el papel quedaría desactualizado): se ven en la tarjeta
   digital de /mi-ticket. Lo que sí se imprime es el tipo/categoría. */

const TAMANOS = [
  { id: 'cr80',  label: 'Tarjeta (85×54 mm)',  w: 85.6, h: 54,  cols: 2 },
  { id: '9x5',   label: 'Escarapela (90×55 mm)', w: 90, h: 55,  cols: 2 },
  { id: 'a6',    label: 'A6 (105×148 mm)',     w: 105, h: 148, cols: 2 },
  { id: '10x15', label: 'Colgante (100×150 mm)', w: 100, h: 150, cols: 2 },
];

const DEFECTO = {
  tamano: '9x5',
  logo_url: '',
  mostrar: { logo: true, nombre: true, tipo: true, qr: true, codigo: false },
  campos_extra: [],           // ids de campos_formulario (ej. Empresa, Cargo)
  colores: {},                // { 'VIP': '#d4af37', 'Staff': '#ef4444' }
};

export default function CredencialesSection({ evento }) {
  const { success, error } = useToast();
  const [clientes, setClientes] = useState([]);
  const [campos, setCampos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [sel, setSel] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState(() => ({ ...DEFECTO, ...(evento.page_json?.credenciales || {}) }));

  const set = (patch) => setCfg(c => ({ ...c, ...patch }));
  const setMostrar = (k, v) => setCfg(c => ({ ...c, mostrar: { ...c.mostrar, [k]: v } }));

  useEffect(() => {
    clientesApi.list(evento.id, { limit: 1000 })
      .then(d => {
        setClientes(d.clientes || d.tickets || []);
        setCampos(d.campos_formulario || []);
      })
      .finally(() => setLoading(false));
  }, [evento.id]);

  /* Normaliza: el API devuelve guest_nombre y `tipo` como OBJETO {id, nombre}.
     Leerlos mal hacía que todos salieran como "Asistente" y que React
     intentara renderizar un objeto. */
  const filas = useMemo(() => clientes
    .map(c => ({
      id    : c.id,
      nombre: c.guest_nombre || c.usuario?.nombre || 'Asistente',
      tipo  : c.tipo?.nombre || c.ticket_nombre || 'General',
      codigo: c.codigo || String(c.id),
      respuestas: c.respuestas || {},
    }))
    .filter(f => !filtro
      || f.nombre.toLowerCase().includes(filtro.toLowerCase())
      || f.tipo.toLowerCase().includes(filtro.toLowerCase())),
  [clientes, filtro]);

  const tiposPresentes = useMemo(
    () => [...new Set(filas.map(f => f.tipo))],
    [filas],
  );

  const toggle = (id) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const todos = () => setSel(s => s.size === filas.length ? new Set() : new Set(filas.map(f => f.id)));
  const aImprimir = filas.filter(f => sel.size === 0 || sel.has(f.id));
  const tam = TAMANOS.find(t => t.id === cfg.tamano) || TAMANOS[1];

  const guardar = async () => {
    setSaving(true);
    try {
      await eventosApi.update(evento.id, { page_json: { ...(evento.page_json || {}), credenciales: cfg } });
      success('Diseño de escarapela guardado.');
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const demo = filas[0] || { nombre: 'María Restrepo', tipo: 'VIP', codigo: 'ABC123', respuestas: {} };

  if (loading) return <p className="text-sm text-text-3 py-8">Cargando asistentes…</p>;

  return (
    <div className="space-y-5">
      {/* ── Diseñador ── */}
      <div className="grid xl:grid-cols-[1fr_minmax(300px,360px)] gap-6 items-start no-print">
        <div className="space-y-5 min-w-0">
          <div className="card">
            <div className="card-header"><h3 className="text-base font-semibold text-text-1">Diseño de la escarapela</h3></div>
            <div className="card-body space-y-4">
              <div>
                <label className="label">Tamaño</label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {TAMANOS.map(t => (
                    <button key={t.id} onClick={() => set({ tamano: t.id })}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors text-left
                        ${cfg.tamano === t.id ? 'border-accent bg-accent/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Logo <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
                <ImagePicker value={cfg.logo_url} onChange={v => set({ logo_url: v })} ownerId={evento.id} placeholder="Logo de la empresa o del evento" />
              </div>

              <div>
                <label className="label">Qué se imprime</label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[['logo', 'Logo'], ['nombre', 'Nombre'], ['tipo', 'Tipo / rol'], ['qr', 'Código QR'], ['codigo', 'Código en texto']].map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
                      <input type="checkbox" checked={!!cfg.mostrar[k]} onChange={e => setMostrar(k, e.target.checked)} className="accent-[#8B5CF6]" />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              {campos.length > 0 && (
                <div>
                  <label className="label">Datos del formulario a imprimir</label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {campos.map(c => (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
                        <input type="checkbox"
                          checked={cfg.campos_extra.includes(c.id)}
                          onChange={e => set({ campos_extra: e.target.checked
                            ? [...cfg.campos_extra, c.id]
                            : cfg.campos_extra.filter(x => x !== c.id) })}
                          className="accent-[#8B5CF6]" />
                        {c.etiqueta}
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-text-3 mt-1">Ej. Empresa o Cargo, si los pides en el formulario de compra.</p>
                </div>
              )}

              {tiposPresentes.length > 0 && (
                <div>
                  <label className="label">Color por tipo de asistente</label>
                  <div className="space-y-2">
                    {tiposPresentes.map(t => (
                      <div key={t} className="flex items-center gap-3">
                        <input type="color" value={cfg.colores[t] || '#0A0F1A'}
                          onChange={e => set({ colores: { ...cfg.colores, [t]: e.target.value } })}
                          className="w-10 h-8 rounded-md border border-border bg-surface cursor-pointer p-0.5" />
                        <span className="text-sm text-text-2">{t}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-text-3 mt-1">Diferencia de un vistazo VIP, Staff, prensa…</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface/40 px-4 py-3 text-xs text-text-2 leading-relaxed">
            El <strong className="text-text-1">QR es el mismo del ticket</strong>: sirve para el control de ingreso y para sumar puntos al escanear en stands o actividades. Los puntos no se imprimen (quedarían desactualizados) — el asistente los ve en su tarjeta digital.
          </div>

          <div className="flex justify-end">
            <button onClick={guardar} disabled={saving} className="btn-primary">{saving ? 'Guardando…' : 'Guardar diseño'}</button>
          </div>
        </div>

        {/* Vista previa a tamaño real proporcional */}
        <div className="xl:sticky xl:top-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-3">Vista previa</p>
          <div className="mx-auto" style={{ width: '100%', maxWidth: 320 }}>
            <Escarapela f={demo} cfg={cfg} evento={evento} campos={campos} tam={tam} />
          </div>
          <p className="text-xs text-text-3">{tam.label} · así saldrá impresa.</p>
        </div>
      </div>

      {/* ── Selección e impresión ── */}
      {clientes.length === 0 ? (
        <div className="card p-10 text-center no-print"><p className="text-sm text-text-2">Cuando tengas asistentes inscritos podrás imprimir sus escarapelas aquí.</p></div>
      ) : (<>
        <div className="flex items-center justify-between gap-3 flex-wrap no-print">
          <div className="flex items-center gap-2">
            <input className="input !h-9 w-64" placeholder="Filtrar por nombre o tipo…" value={filtro} onChange={e => setFiltro(e.target.value)} />
            <button onClick={todos} className="btn-ghost btn-sm">{sel.size === filas.length ? 'Quitar selección' : 'Seleccionar todos'}</button>
          </div>
          <button onClick={() => window.print()} className="btn-primary btn-sm">
            Imprimir {aImprimir.length} escarapela{aImprimir.length !== 1 ? 's' : ''}
          </button>
        </div>

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

        {/* Hoja imprimible */}
        <div className="credenciales-print grid grid-cols-2 md:grid-cols-3 gap-4">
          {aImprimir.map(f => (
            <Escarapela key={f.id} f={f} cfg={cfg} evento={evento} campos={campos} tam={tam} />
          ))}
        </div>
      </>)}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .credenciales-print, .credenciales-print * { visibility: visible; }
          .credenciales-print { position: absolute; inset: 0; padding: 10mm; display: flex !important; flex-wrap: wrap; gap: 6mm; align-content: flex-start; }
          .escarapela { break-inside: avoid; width: ${tam.w}mm !important; height: ${tam.h}mm !important; border: 1px solid #ddd !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* Una escarapela. En pantalla usa la proporción real del tamaño elegido;
   al imprimir, el CSS de arriba le fija los milímetros exactos. */
function Escarapela({ f, cfg, evento, campos, tam }) {
  const color = cfg.colores?.[f.tipo] || '#0A0F1A';
  const vertical = tam.h > tam.w;
  const extras = (cfg.campos_extra || [])
    .map(id => ({ etiqueta: campos.find(c => c.id === id)?.etiqueta, valor: f.respuestas?.[id] }))
    .filter(x => x.etiqueta && x.valor);

  return (
    <div className="escarapela rounded-xl overflow-hidden bg-white text-slate-900 flex flex-col"
      style={{ aspectRatio: `${tam.w} / ${tam.h}` }}>
      <div className="px-3 py-2 flex items-center gap-2" style={{ background: color }}>
        {cfg.mostrar?.logo && cfg.logo_url && (
          <img src={cfg.logo_url} alt="" className="h-5 w-auto object-contain flex-shrink-0" />
        )}
        <p className="text-[8px] uppercase tracking-widest text-white/70 truncate">{evento.titulo}</p>
      </div>

      <div className={`flex-1 p-3 flex ${vertical ? 'flex-col' : 'flex-row'} items-center justify-center gap-2 text-center min-h-0`}>
        {cfg.mostrar?.qr && (
          <div className="flex-shrink-0">
            <QRCodeSVG value={`${window.location.origin}/mi-ticket/${f.codigo}`} size={vertical ? 96 : 66} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {cfg.mostrar?.nombre && <p className="text-[13px] font-bold leading-tight break-words">{f.nombre}</p>}
          {extras.map((x, i) => (
            <p key={i} className="text-[9px] text-slate-600 leading-tight truncate">{String(x.valor)}</p>
          ))}
          {cfg.mostrar?.tipo && (
            <span className="inline-block mt-1 text-[8px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full text-white"
              style={{ background: color }}>{f.tipo}</span>
          )}
          {cfg.mostrar?.codigo && <p className="text-[8px] font-mono text-slate-500 mt-1">{f.codigo}</p>}
        </div>
      </div>
    </div>
  );
}
