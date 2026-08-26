import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { clientesApi } from '../../../../api/clientes.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../../components/ui/Confirm.jsx';
import GLoader from '../../../../components/ui/GLoader.jsx';
import MapaAforo, { nivelDeZona, DetalleMarcador, calorDeZona, estaEnLlamas, IconoLlama } from '../../../../components/aforo/MapaAforo.jsx';
import { exportar } from '../../../../lib/hojaEscribir.js';

/* Asistentes · Aforo por zonas — la sala de control del recinto.
 *
 * Antes esto era un recuadro dentro de "Accesos e ingresos": la ocupación se
 * veía, y hasta ahí. Para mover el número había que ir al escáner, ponerlo en
 * modo Reingreso y pasar un QR; para volver a cero, nada; y del histórico no
 * salía ningún reporte. Es decir: se podía mirar, no gestionar.
 *
 * Aquí se gestiona:
 *   · Entradas y salidas a mano, sin boleta — no toda la gente que cruza la
 *     puerta de una tarima trae un QR, y exigirlo era quedarse sin el dato.
 *   · Limpiar el contador, que NO borra: escribe un corte y la cuenta arranca
 *     de cero desde ahí. El reporte del día sigue completo.
 *   · El plano con los números encima, para leer el recinto de un vistazo.
 *   · El reporte: entradas, salidas, personas distintas, pico simultáneo con su
 *     hora, estancia media y la curva.
 *
 * Y una decisión de fondo, que es la que pidió el organizador: el aforo máximo
 * NO frena a nadie. Si la zona se pasa, la gente sigue entrando y el tablero lo
 * dice en rojo con el excedente. Un contador que rechaza gente deja de contar,
 * y entonces no sirve para el reporte, que es justo para lo que existe. */

const REFRESCO_MS = 5000;

const hora = (iso) => iso ? new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—';
const fechaHora = (iso) => iso ? new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function AforoSection({ evento, soyOwner = true }) {
  const { success, error } = useToast();
  const [vista, setVista] = useState('vivo'); // vivo | reporte
  const [zonas, setZonas] = useState(null);
  const [extra, setExtra] = useState({ accesos: [], sesiones: [] });
  const [total, setTotal] = useState(null);
  const [sel, setSel] = useState(null);   // "zona:id" | "acceso:id" | "sesion:id"
  const [enVivo, setEnVivo] = useState(true);
  const [ultimo, setUltimo] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const vivoRef = useRef(true);

  const mapa = evento.page_json?.mapa || null;
  /* El plano sirve aquí en cuanto tenga algo con dato vivo encima: una zona,
     una puerta o un sub-evento. */
  const hayMapaVivo = Boolean(mapa?.imagen_url)
    && (mapa.marcadores || []).some(m => ['zona', 'acceso', 'sesion'].includes(m.tipo) || m.zona_id);

  const cargar = useCallback(async () => {
    try {
      /* Una sola petición trae el plano entero: zonas, puertas y sub-eventos.
         Si el backend todavía no la tiene (despliegue a medias), se cae al
         endpoint de sólo aforo, que existe desde antes. */
      let d;
      try {
        d = await clientesApi.mapaVivo(evento.id);
      } catch (err) {
        if (err.status !== 404) throw err;
        d = await clientesApi.aforoZonas(evento.id);
      }
      if (!vivoRef.current) return;
      setZonas(d.zonas || []);
      setExtra({ accesos: d.accesos || [], sesiones: d.sesiones || [] });
      setTotal(d.total || null);
      setUltimo(d.at || new Date().toISOString());
    } catch (e) {
      if (!vivoRef.current) return;
      /* Un fallo de red no puede vaciar el tablero: si ya había números se
         quedan los últimos buenos y el pulso siguiente los corrige. */
      setZonas(l => l === null ? [] : l);
      error(e.response?.data?.error || e.message);
    }
  }, [evento.id]);

  useEffect(() => {
    vivoRef.current = true;
    cargar();
    return () => { vivoRef.current = false; };
  }, [cargar]);

  /* El pulso se puede parar: en un portátil de la organización con la pantalla
     abierta toda la noche, una petición cada 5 s es ruido que se paga. */
  useEffect(() => {
    if (!enVivo) return;
    const iv = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(iv);
  }, [enVivo, cargar]);

  const mover = async (zona, tipo, cantidad = 1) => {
    setOcupado(true);
    /* Se pinta el cambio antes de que conteste el servidor: en la puerta, el
       staff marca gente a ritmo de gente, no a ritmo de red. Si falla, el
       refresco siguiente devuelve el número verdadero. */
    setZonas(l => (l || []).map(z => z.id === zona.id
      ? { ...z, dentro: Math.max(0, z.dentro + (tipo === 'entrada' ? cantidad : -cantidad)) }
      : z));
    try {
      const d = await clientesApi.movimientoZona(evento.id, { zona_id: zona.id, tipo, cantidad });
      if (d.zona) setZonas(l => (l || []).map(z => z.id === d.zona.id ? d.zona : z));
      else cargar();
    } catch (e) {
      error(e.response?.data?.error || e.message);
      cargar();
    } finally { setOcupado(false); }
  };

  const limpiar = async (zona = null) => {
    const nombre = zona?.nombre || 'todas las zonas';
    const dentro = zona ? zona.dentro : (total?.dentro || 0);
    const ok = await confirmDialog({
      title: 'Limpiar el aforo',
      message: `El contador de ${nombre} vuelve a cero (ahora marca ${dentro}). No se borra nada: los movimientos siguen en el reporte y el corte queda registrado con tu nombre y la hora.`,
      confirmLabel: 'Poner a cero', danger: true,
    });
    if (!ok) return;
    try {
      const d = await clientesApi.limpiarAforo(evento.id, zona ? { zona_id: zona.id } : {});
      setZonas(d.zonas || []);
      success(`Aforo de ${nombre} en cero. El histórico queda entero en el reporte.`);
      cargar();
    } catch (e) { error(e.response?.data?.error || e.message); }
  };

  if (zonas === null) return <GLoader message="Cargando el aforo…" />;

  if (zonas.length === 0) {
    return (
      <div className="max-w-3xl space-y-4">
        <Encabezado />
        <div className="rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-14 text-center">
          <p className="text-sm text-text-2 mb-2">Todavía no hay zonas definidas.</p>
          <p className="text-xs text-text-3 max-w-md mx-auto">
            Las zonas se crean en <b>Asistentes → Accesos e ingresos</b> (nombre y aforo máximo).
            Después, en <b>Espacio del evento → Mapa</b>, se pueden colocar sobre el plano para ver la ocupación encima del recinto.
          </p>
        </div>
      </div>
    );
  }

  const datos = { zonas, ...extra };
  const zonaSel = sel?.startsWith('zona:') ? zonas.find(z => `zona:${z.id}` === sel) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <Encabezado />
        <div className="flex items-center gap-2">
          <button onClick={() => setEnVivo(v => !v)}
            className={`btn-ghost btn-sm flex items-center gap-1.5 ${enVivo ? 'text-text-1' : 'text-text-3'}`}>
            <span className={`w-2 h-2 rounded-full ${enVivo ? 'bg-success animate-pulse' : 'bg-text-3'}`} />
            {enVivo ? 'En vivo' : 'Pausado'}
          </button>
          {soyOwner && <button onClick={() => limpiar(null)} className="btn-ghost btn-sm text-danger">Limpiar todo</button>}
        </div>
      </div>

      <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg p-1 w-fit">
        {[['vivo', 'En vivo'], ['reporte', 'Reporte']].map(([k, l]) => (
          <button key={k} onClick={() => setVista(k)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${vista === k ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>{l}</button>
        ))}
      </div>

      {vista === 'vivo' ? (
        <>
          <Totales total={total} zonas={zonas} ultimo={ultimo} />

          <Tendencia zonas={zonas} sel={sel} onSelect={setSel} />

          {hayMapaVivo ? (
            <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
              <MapaAforo mapa={mapa} datos={datos} sel={sel} onSelect={setSel} />
              {sel ? (
                <DetalleMarcador sel={sel} datos={datos}>
                  {/* La zona se opera desde su propia ficha: si ya hiciste
                      clic en ella en el plano, el siguiente gesto natural es
                      marcar gente, no bajar a buscar su tarjeta. */}
                  {zonaSel && (
                    <div className="col-span-2 pt-2 border-t border-border">
                      <Controles z={zonaSel} ocupado={ocupado}
                        onMover={(tipo, n) => mover(zonaSel, tipo, n)}
                        onLimpiar={soyOwner ? () => limpiar(zonaSel) : null} />
                    </div>
                  )}
                </DetalleMarcador>
              ) : (
                <p className="text-xs text-text-3 lg:pt-2">
                  Toca cualquier círculo del plano para ver cómo va: la gente que hay en una zona, los ingresos por una puerta o la inscripción de un sub-evento.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-3">
              Nada colocado en el plano todavía. En <b>Espacio del evento → Mapa</b> se arrastran al sitio las zonas, las puertas y los sub-eventos, y su número aparece encima del recinto.
            </p>
          )}

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {zonas.map(z => (
              <TarjetaZona key={z.id} z={z} activa={zonaSel?.id === z.id} ocupado={ocupado}
                onSelect={() => setSel(sel === `zona:${z.id}` ? null : `zona:${z.id}`)}
                onMover={(tipo, n) => mover(z, tipo, n)}
                onLimpiar={soyOwner ? () => limpiar(z) : null} />
            ))}
          </div>
        </>
      ) : (
        <Reporte evento={evento} zonas={zonas} />
      )}
    </div>
  );
}

/* Dónde está pasando algo ahora mismo, en una línea.

   En un recinto con siete zonas, la pregunta del organizador a media tarde no
   es "cuánta gente hay" sino "¿dónde se está formando el lío?". El orden lo da
   el aforo más lo que haya en curso: una zona al 95% con un torneo empezando
   importa más que otra al 100% sin nada dentro. */
function Tendencia({ zonas, sel, onSelect }) {
  const orden = [...zonas]
    .filter(z => z.dentro > 0 || (z.ahora || []).length > 0)
    .sort((a, b) => calorDeZona(b) - calorDeZona(a))
    .slice(0, 4);
  if (orden.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Ahora mismo</span>
      {orden.map(z => {
        const arde = estaEnLlamas(z);
        const activa = sel === `zona:${z.id}`;
        return (
          <button key={z.id} onClick={() => onSelect(activa ? null : `zona:${z.id}`)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors
              ${activa ? 'border-accent' : arde ? 'border-orange-500/50 bg-orange-500/10' : 'border-border hover:border-border-2'}`}>
            {arde && <span className="text-orange-500"><IconoLlama className="w-3 h-3" /></span>}
            <span className="text-text-1">{z.nombre}</span>
            <span className="text-text-3 tabular-nums">{z.dentro}{z.aforo_max ? `/${z.aforo_max}` : ''}</span>
            {(z.ahora || []).length > 0 && (
              <span className="text-text-3 truncate max-w-[140px]">· {z.ahora[0].titulo}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Encabezado() {
  return (
    <div>
      <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Aforo por zonas</h2>
      <p className="text-sm text-text-2 mt-1">Cuánta gente hay en cada zona, ahora. Entradas y salidas a mano o por QR, sobre el plano del recinto.</p>
    </div>
  );
}

function Totales({ total, zonas, ultimo }) {
  const llenas = zonas.filter(z => z.aforo_max && z.dentro >= z.aforo_max).length;
  const cap = zonas.reduce((s, z) => s + (z.aforo_max || 0), 0);
  const items = [
    { label: 'Dentro ahora', valor: total?.dentro ?? 0, nota: cap ? `de ${cap} de aforo declarado` : 'sin aforo declarado' },
    { label: 'Entradas', valor: total?.entradas ?? 0, nota: 'desde el último corte' },
    { label: 'Salidas', valor: total?.salidas ?? 0, nota: 'desde el último corte' },
    { label: 'Zonas al tope', valor: llenas, nota: total?.excedido ? `${total.excedido} por encima del aforo` : 'ninguna excedida' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(i => (
        <div key={i.label} className="rounded-2xl border border-border bg-surface/40 p-4">
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{i.label}</p>
          <p className="text-3xl font-bold font-display tabular-nums text-text-1 mt-1">{i.valor}</p>
          <p className="text-[11px] text-text-3 mt-0.5">{i.nota}</p>
        </div>
      ))}
      <p className="col-span-2 lg:col-span-4 text-[11px] text-text-3 -mt-1">Actualizado a las {hora(ultimo)}.</p>
    </div>
  );
}

/* ── Una zona: el número grande y los botones para moverlo ── */
function TarjetaZona({ z, activa, ocupado, onSelect, onMover, onLimpiar }) {
  const nivel = nivelDeZona(z);
  const pct = z.aforo_max ? Math.min(100, Math.round((z.dentro / z.aforo_max) * 100)) : null;

  return (
    <div className={`rounded-2xl border bg-surface/40 p-4 space-y-3 transition-colors ${activa ? 'border-accent' : 'border-border'}`}>
      <button onClick={onSelect} className="w-full text-left">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-text-1 truncate">{z.nombre}</p>
          <p className="text-2xl font-bold font-display tabular-nums text-text-1">
            {z.dentro}{z.aforo_max ? <span className="text-text-3 text-sm font-normal"> / {z.aforo_max}</span> : ''}
          </p>
        </div>
        {pct != null && (
          <div className="h-2 rounded-full bg-surface-3 overflow-hidden mt-2">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: nivel.color }} />
          </div>
        )}
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="text-[11px]" style={{ color: nivel.color }}>
            {nivel.label}{z.excedido > 0 ? ` · +${z.excedido} por encima` : ''}
          </span>
          <span className="text-[11px] text-text-3">
            {z.entradas} entradas · {z.salidas} salidas
          </span>
        </div>
      </button>

      <Controles z={z} ocupado={ocupado} onMover={onMover} onLimpiar={onLimpiar} />
    </div>
  );
}

/* Los botones de marcar gente. Viven aparte porque se usan en dos sitios: la
   tarjeta de la zona y la ficha que abre el plano al hacer clic. */
function Controles({ z, ocupado, onMover, onLimpiar }) {
  const [lote, setLote] = useState(1);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <button onClick={() => onMover('salida', lote)} disabled={ocupado}
          className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold text-text-2 hover:border-danger/50 hover:text-danger transition-colors disabled:opacity-50">
          − Salida
        </button>
        <input type="number" min="1" max="500" value={lote}
          onChange={e => setLote(Math.min(500, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
          className="input !h-9 w-16 text-center tabular-nums" title="Cuántas personas de golpe" />
        <button onClick={() => onMover('entrada', lote)} disabled={ocupado}
          className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold text-text-2 hover:border-success/50 hover:text-success transition-colors disabled:opacity-50">
          + Entrada
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-text-3">
          {z.ultima_at ? `Último movimiento ${hora(z.ultima_at)}` : 'Sin movimientos'}
          {z.corte_at ? ` · limpiada ${hora(z.corte_at)}` : ''}
        </p>
        {onLimpiar && (
          <button onClick={onLimpiar} className="text-[11px] text-text-3 hover:text-danger transition-colors">Limpiar</button>
        )}
      </div>
    </div>
  );
}

/* ── Reporte ── */
function Reporte({ evento, zonas }) {
  const { error } = useToast();
  const [datos, setDatos] = useState(null);
  const [intervalo, setIntervalo] = useState(15);

  useEffect(() => {
    let vivo = true;
    setDatos(null);
    clientesApi.reporteZonas(evento.id, { intervalo })
      .then(d => { if (vivo) setDatos(d); })
      .catch(e => { if (vivo) { setDatos({ zonas: [] }); error(e.response?.data?.error || e.message); } });
    return () => { vivo = false; };
  }, [evento.id, intervalo]);

  const descargar = async () => {
    const filas = [
      ['Aforo por zonas', evento.titulo || ''],
      ['Generado', new Date().toLocaleString('es-CO')],
      [],
      ['Zona', 'Aforo máx', 'Dentro ahora', 'Excedido', 'Entradas', 'Salidas', 'Personas distintas', 'Conteo manual', 'Pico simultáneo', 'Hora del pico', '% del aforo en el pico', 'Estancia media (min)', 'Primer movimiento', 'Último movimiento'],
      ...(datos?.zonas || []).map(z => [
        z.nombre, z.aforo_max ?? '', z.dentro, z.excedido, z.entradas, z.salidas, z.personas, z.manuales,
        z.pico, z.pico_at ? fechaHora(z.pico_at) : '', z.pico_pct ?? '',
        z.estancia_min ?? '', z.primera_at ? fechaHora(z.primera_at) : '', z.ultima_at ? fechaHora(z.ultima_at) : '',
      ]),
      [],
      [`Curva de ocupación (franjas de ${datos?.intervalo || intervalo} min)`],
      ['Zona', 'Franja', 'Entradas', 'Salidas', 'Dentro al cerrar la franja'],
      ...(datos?.zonas || []).flatMap(z => (z.curva || []).map(p => [z.nombre, fechaHora(p.at), p.entradas, p.salidas, p.dentro])),
      [],
      ['Cortes de aforo (limpiezas)'],
      ['Zona', 'Cuándo', 'Personas que marcaba', 'Motivo'],
      ...(datos?.zonas || []).flatMap(z => (z.cortes || []).map(c => [z.nombre, fechaHora(c.created_at), c.dentro_antes ?? '', c.motivo || ''])),
    ];
    try {
      await exportar(filas, { titulo: 'Aforo por zonas', base: `aforo-${evento.titulo || 'evento'}` });
    } catch (e) { error(e.message); }
  };

  if (!datos) return <GLoader message="Armando el reporte…" />;

  const zs = datos.zonas || [];
  if (zs.length === 0) return <p className="text-sm text-text-3">Todavía no hay movimientos que reportar.</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-text-3">
          Todo el histórico del evento, cortes incluidos: limpiar el contador no esconde nada aquí.
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-3">Franja</label>
          <select value={intervalo} onChange={e => setIntervalo(Number(e.target.value))} className="input !h-8 !py-1 text-sm w-auto">
            {[5, 10, 15, 30, 60].map(n => <option key={n} value={n}>{n} min</option>)}
          </select>
          <button onClick={descargar} className="btn-secondary btn-sm">Descargar</button>
        </div>
      </div>

      {zs.map(z => <FichaReporte key={z.id} z={z} intervalo={datos.intervalo} />)}

      <p className="text-[11px] text-text-3">
        «Personas distintas» cuenta boletas, no cabezas: el conteo manual no lleva boleta y por eso va aparte.
        La estancia media sale de emparejar cada entrada con su salida ({zs.reduce((s, z) => s + (z.estancia_tramos || 0), 0)} tramos medidos en total).
      </p>
    </div>
  );
}

function FichaReporte({ z, intervalo }) {
  const datos = [
    ['Dentro ahora', z.dentro + (z.excedido > 0 ? ` (+${z.excedido})` : '')],
    ['Pico simultáneo', `${z.pico}${z.pico_at ? ` · ${hora(z.pico_at)}` : ''}${z.pico_pct != null ? ` · ${z.pico_pct}% del aforo` : ''}`],
    ['Entradas / salidas', `${z.entradas} / ${z.salidas}`],
    ['Personas distintas', z.personas],
    ['Conteo manual', z.manuales],
    ['Estancia media', z.estancia_min != null ? `${z.estancia_min} min` : '—'],
    ['Actividad', z.primera_at ? `${hora(z.primera_at)} → ${hora(z.ultima_at)}` : '—'],
  ];
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <p className="text-base font-semibold text-text-1">{z.nombre}</p>
        <p className="text-xs text-text-3">{z.aforo_max ? `Aforo declarado: ${z.aforo_max}` : 'Sin aforo declarado'}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
        {datos.map(([k, v]) => (
          <div key={k}>
            <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{k}</p>
            <p className="text-sm text-text-1 tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <Curva puntos={z.curva || []} max={z.aforo_max} intervalo={intervalo} />

      {(z.cortes || []).length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-1">Limpiezas del contador</p>
          <ul className="space-y-0.5">
            {z.cortes.slice(0, 5).map((c, i) => (
              <li key={i} className="text-xs text-text-2">
                <span className="font-mono text-text-3">{fechaHora(c.created_at)}</span>
                {c.dentro_antes != null ? ` · marcaba ${c.dentro_antes}` : ''}{c.motivo ? ` · ${c.motivo}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* Curva de ocupación. Sin librería: son unos cientos de puntos y un `path`.
   La línea del aforo se dibuja para que se vea de un golpe cuánto rato estuvo
   la zona por encima — que es la pregunta que hace quien lee esto. */
function Curva({ puntos, max, intervalo }) {
  const { d, area, techo, alto, ancho, sobre } = useMemo(() => {
    const ancho = 600, alto = 120;
    if (puntos.length === 0) return { alto, ancho };
    const pico = Math.max(...puntos.map(p => p.dentro), max || 0, 1);
    const x = i => puntos.length === 1 ? ancho / 2 : (i / (puntos.length - 1)) * ancho;
    const y = v => alto - (v / pico) * (alto - 8) - 4;
    const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.dentro).toFixed(1)}`).join(' ');
    return {
      d: linea,
      area: `${linea} L${ancho},${alto} L0,${alto} Z`,
      techo: max ? y(max) : null,
      sobre: puntos.filter(p => max && p.dentro > max).length,
      alto, ancho,
    };
  }, [puntos, max]);

  if (puntos.length === 0) return <p className="text-xs text-text-3">Sin movimientos registrados.</p>;

  return (
    <div>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full h-28" preserveAspectRatio="none" role="img" aria-label="Curva de ocupación">
        <path d={area} fill="var(--brand-primary, #3B82F6)" opacity="0.12" />
        <path d={d} fill="none" stroke="var(--brand-primary, #3B82F6)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {techo != null && (
          <line x1="0" x2={ancho} y1={techo} y2={techo} stroke="var(--danger, #EF4444)" strokeWidth="1" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <div className="flex items-center justify-between text-[11px] text-text-3">
        <span>{hora(puntos[0].at)}</span>
        <span>
          {max ? (sobre > 0 ? `${sobre} franjas de ${intervalo} min por encima del aforo` : 'Nunca pasó del aforo') : `Franjas de ${intervalo} min`}
        </span>
        <span>{hora(puntos[puntos.length - 1].at)}</span>
      </div>
    </div>
  );
}
