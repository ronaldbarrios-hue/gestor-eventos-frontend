import { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { clientesApi } from '../../../../api/clientes.js';
import { eventosApi } from '../../../../api/eventos.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import ImagePicker from '../../../../components/ui/ImagePicker.jsx';
import { impresionConfig, variantesConImpresion } from '../../../../lib/wallet.js';

/* Asistentes · Credenciales — diseñador de escarapelas imprimibles.
   El organizador elige tamaño, logo, qué datos se imprimen y el color por
   tipo de asistente (VIP, Staff…), ve la vista previa y manda a imprimir.

   El QR es el MISMO código del ticket: sirve para control de acceso y para
   sumar puntos de gamificación al escanear en stands/actividades. Los puntos
   NO se imprimen (el papel quedaría desactualizado): se ven en la tarjeta
   digital de /mi-ticket. Lo que sí se imprime es el tipo/categoría. */

const TAMANOS = [
  { id: 'cr80',  label: 'Tarjeta (85×54 mm)',      w: 85.6, h: 54,  cols: 2 },
  { id: '9x5',   label: 'Escarapela (90×55 mm)',   w: 90,  h: 55,  cols: 2 },
  { id: 'mini',  label: 'Mini (70×40 mm)',         w: 70,  h: 40,  cols: 3 },
  { id: 'us',    label: 'Badge US (102×76 mm)',    w: 102, h: 76,  cols: 2 },
  { id: 'a7',    label: 'A7 (74×105 mm)',          w: 74,  h: 105, cols: 2 },
  { id: 'a6',    label: 'A6 (105×148 mm)',         w: 105, h: 148, cols: 2 },
  { id: '10x15', label: 'Colgante (100×150 mm)',   w: 100, h: 150, cols: 2 },
  { id: 'a5',    label: 'A5 grande (148×210 mm)',  w: 148, h: 210, cols: 1 },
  { id: 'cuad',  label: 'Cuadrada (100×100 mm)',   w: 100, h: 100, cols: 2 },
];

const DEFECTO = {
  tamano: '9x5',
  logo_url: '',
  mostrar: { logo: true, nombre: true, tipo: true, qr: true, codigo: false },
  campos_extra: [],           // ids de campos_formulario (ej. Empresa, Cargo)
  campos_libres: [],          // { etiqueta, valor } — texto fijo que el organizador escribe
  colores: {},                // { 'VIP': '#d4af37', 'Staff': '#ef4444' }

  /* ── Diseño ──
     La escarapela era blanca con una banda azul marino y no había más:
     lo único configurable era el color de esa banda por tipo de asistente.
     Estos campos son el resto del diseño. Los valores por defecto reproducen
     exactamente lo de antes, así que nadie ve cambiar su escarapela sin
     haberla tocado. */
  fondo: '#FFFFFF',           // papel de la escarapela
  texto: '#0F172A',           // color del nombre y los datos
  banda_texto: '#FFFFFF',     // texto sobre la banda de color
  marca_agua_url: '',         // imagen de fondo, tenue
  marca_agua_opacidad: 12,    // %  — tenue de verdad: el QR tiene que leerse
  borde: true,
};

export default function CredencialesSection({ evento }) {
  const { success, error } = useToast();
  const [clientes, setClientes] = useState([]);
  const [campos, setCampos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [sel, setSel] = useState(new Set());
  const [saving, setSaving] = useState(false);
  /* El diseño sale de la MISMA variante de `wallet` que la tarjeta digital, no
     de una clave aparte. Eran la misma escarapela —mismo QR, mismo portador—
     con dos editores, y cambiar el logo en uno dejaba el otro como estaba.
     `impresionConfig` traduce la variante a las claves que esta pantalla ya
     usaba, incluido el viejo `page_json.credenciales` de los eventos que lo
     tuvieran, así que nadie ve cambiar su escarapela. */
  const [cfg, setCfg] = useState(() => ({ ...DEFECTO, ...impresionConfig(evento.page_json, { publico: 'asistentes' }) }));

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
      /* El token firmado de la boleta: es lo que se imprime en el QR para que
         la escarapela valga en el control de ingreso. */
      qr_token: c.qr_token || null,
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
      /* Se guarda DENTRO de la variante de wallet, no en una clave aparte: es
         la misma escarapela que la digital. El PATCH mezcla por claves de
         primer nivel (migración 0064), así que mandar sólo `wallet` no pisa lo
         demás de page_json. */
      const variantes = variantesConImpresion(evento.page_json, cfg, { publico: 'asistentes' });
      await eventosApi.update(evento.id, { page_json: { wallet: { variantes } } });
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

              {/* Campos LIBRES: cualquier texto que el organizador quiera imprimir */}
              <div>
                <label className="label">Otros datos a imprimir <span className="lowercase tracking-normal font-normal text-text-3">(los que quieras)</span></label>
                <div className="space-y-2">
                  {(cfg.campos_libres || []).map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={c.etiqueta || ''} placeholder="Etiqueta (ej. Acceso)"
                        onChange={e => set({ campos_libres: cfg.campos_libres.map((x, j) => j === i ? { ...x, etiqueta: e.target.value } : x) })}
                        className="input !h-9 w-40" />
                      <input value={c.valor || ''} placeholder="Valor (ej. Zona A · Wifi: gestek)"
                        onChange={e => set({ campos_libres: cfg.campos_libres.map((x, j) => j === i ? { ...x, valor: e.target.value } : x) })}
                        className="input !h-9 flex-1" />
                      <button onClick={() => set({ campos_libres: cfg.campos_libres.filter((_, j) => j !== i) })}
                        className="w-8 h-8 rounded-lg text-danger-light hover:bg-danger/10 flex items-center justify-center flex-shrink-0">✕</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => set({ campos_libres: [...(cfg.campos_libres || []), { etiqueta: '', valor: '' }] })}
                  className="btn-ghost btn-sm mt-2">+ Añadir dato</button>
                <p className="text-[11px] text-text-3 mt-1">Texto fijo igual para todas las escarapelas (o del tipo que imprimas). Ej. “Acceso: General”, “Wifi: gestek2026”.</p>
              </div>

              {/* ── Diseño ──
                  La escarapela era blanca con una banda azul marino y punto:
                  lo único configurable era el color de esa banda. Esto es el
                  resto. Los valores por defecto son los de siempre, así que a
                  nadie le cambia la escarapela sin tocarla. */}
              <div className="pt-3 border-t border-border">
                <label className="label">Diseño</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['fondo',       'Papel',        '#FFFFFF'],
                    ['texto',       'Texto',        '#0F172A'],
                    ['banda_texto', 'Sobre la banda', '#FFFFFF'],
                  ].map(([k, etiqueta, porDefecto]) => (
                    <div key={k}>
                      <p className="text-[11px] text-text-3 mb-1">{etiqueta}</p>
                      <input type="color" value={cfg[k] || porDefecto}
                        onChange={e => set({ [k]: e.target.value })}
                        className="w-full h-8 rounded-md border border-border bg-surface cursor-pointer p-0.5" />
                    </div>
                  ))}
                </div>

                <label className="flex items-center gap-2 mt-3 text-sm text-text-2 cursor-pointer">
                  <input type="checkbox" checked={cfg.borde !== false}
                    onChange={e => set({ borde: e.target.checked })}
                    className="w-4 h-4 accent-[#8B5CF6]" />
                  Borde fino alrededor
                  <span className="text-[11px] text-text-3">— ayuda a recortar</span>
                </label>
              </div>

              <div>
                <label className="label">Marca de agua <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
                <ImagePicker value={cfg.marca_agua_url} onChange={(u) => set({ marca_agua_url: u })}
                  ownerId={evento.id} placeholder="Imagen de fondo de la escarapela" />
                {cfg.marca_agua_url && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-text-3">Intensidad</p>
                      <p className="text-[11px] text-text-2 tabular-nums">{cfg.marca_agua_opacidad ?? 12}%</p>
                    </div>
                    {/* Tope al 35%: por encima se come el contraste del QR, y
                        un QR que no lee convierte la escarapela en un adorno. */}
                    <input type="range" min={0} max={35} value={cfg.marca_agua_opacidad ?? 12}
                      onChange={e => set({ marca_agua_opacidad: Number(e.target.value) })}
                      className="w-full accent-[#8B5CF6]" />
                    <p className="text-[11px] text-text-3">
                      El tope es 35%: más oscura y el lector deja de ver el QR.
                    </p>
                  </div>
                )}
              </div>

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
            <strong className="text-text-1">Un solo QR para todo.</strong> El que se imprime aquí
            es exactamente el mismo de la boleta digital: sirve para entrar, para sumar puntos
            en un stand y para canjear un premio. No hay dos códigos que llevar encima.
            <span className="block mt-1.5 text-text-3">
              Los puntos no se imprimen —el papel quedaría desactualizado a la primera—:
              el asistente los ve en su tarjeta, en /mi-ticket, con este mismo QR.
            </span>
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
  const fondo = cfg.fondo || '#FFFFFF';
  const texto = cfg.texto || '#0F172A';
  const bandaTexto = cfg.banda_texto || '#FFFFFF';
  const vertical = tam.h > tam.w;
  const extras = (cfg.campos_extra || [])
    .map(id => ({ etiqueta: campos.find(c => c.id === id)?.etiqueta, valor: f.respuestas?.[id] }))
    .filter(x => x.etiqueta && x.valor);

  /* EL MISMO QR QUE LA BOLETA DIGITAL.

     Antes aquí se imprimía `${origin}/mi-ticket/${codigo}` — una URL. Pero el
     escáner manda lo que lee como token FIRMADO, así que la escarapela
     impresa no pasaba el control de ingreso: el servidor recibía una URL
     donde esperaba una firma y contestaba "QR inválido". Un papel con un QR
     que no abría ninguna puerta.

     Ahora lleva el `qr_token`, exactamente lo mismo que /mi-ticket. Con eso
     el mismo QR sirve para las tres cosas —entrar, sumar puntos en un stand
     y canjear un premio—, que es la unificación que se pedía: una sola cosa
     que escanear.

     Si por lo que sea no hubiera token, se cae al código corto, que el
     servidor también acepta. Lo que no vuelve es la URL. */
  const valorQr = f.qr_token || f.codigo;

  return (
    <div className={`escarapela rounded-xl overflow-hidden flex flex-col relative ${cfg.borde === false ? '' : 'ring-1 ring-black/10'}`}
      style={{ aspectRatio: `${tam.w} / ${tam.h}`, background: fondo, color: texto }}>

      {/* Marca de agua: debajo de todo y sin capturar clics. La opacidad se
          limita al 35% porque por encima empieza a comerse el contraste del
          QR, y un QR que no lee convierte la escarapela en un adorno. */}
      {cfg.marca_agua_url && (
        <img
          src={cfg.marca_agua_url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: Math.min(35, Math.max(0, Number(cfg.marca_agua_opacidad) || 0)) / 100 }}
        />
      )}

      <div className="px-3 py-2 flex items-center gap-2 relative" style={{ background: color }}>
        {cfg.mostrar?.logo && cfg.logo_url && (
          <img src={cfg.logo_url} alt="" className="h-5 w-auto object-contain flex-shrink-0" />
        )}
        <p className="text-[8px] uppercase tracking-widest truncate" style={{ color: bandaTexto, opacity: 0.75 }}>
          {evento.titulo}
        </p>
      </div>

      <div className={`flex-1 p-3 flex ${vertical ? 'flex-col' : 'flex-row'} items-center justify-center gap-2 text-center min-h-0 relative`}>
        {cfg.mostrar?.qr && (
          /* Fondo blanco propio bajo el QR: si el papel es oscuro o hay marca
             de agua, el lector necesita el contraste. */
          <div className="flex-shrink-0 bg-white p-1 rounded">
            <QRCodeSVG value={valorQr} size={vertical ? 96 : 66} level="M" />
          </div>
        )}
        {/* `flex-1` sólo cuando la escarapela es horizontal.

            En vertical, este bloque es el segundo de una columna, y `flex-1` le
            daba todo el alto sobrante: el texto se estiraba y el QR quedaba
            pegado al borde de arriba en vez de centrado. Se veía en la vista
            previa del diseñador y también en el papel, que es peor.

            Y `w-full` en vertical porque, con `items-center`, un bloque sin
            ancho se encoge a lo que mida su texto y el `truncate` de los campos
            deja de recortar donde debe. */}
        <div className={vertical ? 'w-full min-w-0' : 'min-w-0 flex-1'}>
          {cfg.mostrar?.nombre && <p className="text-[13px] font-bold leading-tight break-words">{f.nombre}</p>}
          {extras.map((x, i) => (
            <p key={i} className="text-[9px] leading-tight truncate" style={{ opacity: 0.7 }}>{String(x.valor)}</p>
          ))}
          {(cfg.campos_libres || []).filter(c => (c.etiqueta || c.valor)).map((c, i) => (
            <p key={`l${i}`} className="text-[9px] leading-tight truncate" style={{ opacity: 0.7 }}>
              {c.etiqueta ? <span className="font-semibold">{c.etiqueta}: </span> : null}{c.valor}
            </p>
          ))}
          {cfg.mostrar?.tipo && (
            <span className="inline-block mt-1 text-[8px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: color, color: bandaTexto }}>{f.tipo}</span>
          )}
          {cfg.mostrar?.codigo && <p className="text-[8px] font-mono mt-1" style={{ opacity: 0.55 }}>{f.codigo}</p>}
        </div>
      </div>
    </div>
  );
}
