import { useEffect, useMemo, useState } from 'react';
import { espaciosApi } from '../../../api/espacios.js';
import { ticketsApi } from '../../../api/tickets.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import PlanoSVG, { LeyendaDePrecios } from '../../../components/public/PlanoSVG.jsx';
import EditorDePlano from '../../../components/plano/EditorDePlano.jsx';

/* El plano: montar los sitios que se venden uno a uno.
 *
 * ── Por dónde se empieza ─────────────────────────────────────────────────
 *
 * Por palcos y mesas, no por sillas. Un evento de boxeo con veinte mesas de
 * ringside es un producto vendible entero, y ejercita lo difícil —retener,
 * cobrar, soltar, caducar— sin la parte cara: dibujar un estadio.
 *
 * Por eso esta pantalla es una LISTA y no un plano. Se ve todo, se entiende
 * todo, y funciona en el móvil del organizador. El plano dibujado viene después
 * y no cambia nada de lo que hay debajo: los mismos espacios con `geometria`.
 *
 * ── Lo que no se puede hacer aquí, y por qué ─────────────────────────────
 *
 * Cambiar de sitio una silla vendida, o borrarla. El servidor lo rechaza y la
 * pantalla lo dice antes: en boletería, deshacer una venta por accidente no se
 * arregla con un «control+z».
 */

const MODOS = [
  { id: 'aforo',     label: 'Cuenta gente',   ayuda: 'Una gradería, un pabellón. No se asigna a nadie.' },
  { id: 'asignable', label: 'Se asigna',      ayuda: 'Un stand, un local de comida. Se le da a alguien sin cobrarlo aquí.' },
  { id: 'vendible',  label: 'Se vende',       ayuda: 'Una silla, una mesa, un palco. Esto es lo que alguien compra.' },
];

export default function PlanoTab({ evento }) {
  const { success, error: toastErr } = useToast();
  const [datos, setDatos] = useState(null);      // null = cargando
  const [tipos, setTipos] = useState([]);
  const [creando, setCreando] = useState(false);
  const [generandoEn, setGenerandoEn] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  /* Ver el plano como lo verá quien compra, SIN publicar el evento.
     Salió montando un concierto: se arman 124 sitios y la única forma de ver
     lo que verá el público era hacer el evento público. Y no hace falta ningún
     endpoint nuevo — el panel ya tiene los espacios y las reservas, y el
     componente del mapa es literalmente el mismo que se sirve fuera. */
  const [previa, setPrevia] = useState(false);
  /* Colocar el recinto arrastrando. Es una vista aparte de la previa y de la
     lista porque son tres intenciones distintas: montar, colocar y comprobar.
     Mezclarlas haría que un clic para mirar moviera algo. */
  const [colocando, setColocando] = useState(false);

  const cargar = async () => {
    try {
      const [d, t] = await Promise.all([
        espaciosApi.list(evento.id),
        ticketsApi.list(evento.id).catch(() => ({ tickets: [] })),
      ]);
      setDatos(d);
      setTipos((t.tickets || []).filter(x => x.activo !== false));
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
      setDatos({ espacios: [], arbol: [], reservas: [], localidades: [] });
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [evento.id]);

  /* Qué está ocupado. Una retención caducada NO ocupa aunque el barrido no haya
     pasado: si contara, el organizador vería en rojo sillas que sí se pueden
     comprar y creería que va mejor de lo que va. */
  const ocupado = useMemo(() => {
    const m = new Map();
    const ahora = Date.now();
    for (const r of datos?.reservas || []) {
      if (r.estado === 'vendido') m.set(r.espacio_id, 'vendido');
      else if (r.expira_at && new Date(r.expira_at).getTime() > ahora) m.set(r.espacio_id, 'retenido');
    }
    return m;
  }, [datos]);

  const precioDe = useMemo(() => {
    const m = new Map();
    for (const l of datos?.localidades || []) m.set(l.espacio_id, l.ticket);
    return m;
  }, [datos]);

  /* El color de un sitio es el de su localidad, no el suyo: cambiar el color de
     «Platea» tiene que repintar sus dos mil sillas de una vez. */
  const colorDe = (e) => precioDe.get(e.id)?.color || null;

  const guardarColocacion = async (cambios) => {
    setTrabajando(true);
    try {
      const r = await espaciosApi.moverGeometria(evento.id, cambios);
      await cargar();
      success(r.movidos === 1 ? 'Se movió 1 sitio.' : `Se movieron ${r.movidos} sitios.`);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setTrabajando(false); }
  };

  const ponerColor = async (tipoId, color) => {
    try {
      await espaciosApi.colorLocalidad(evento.id, tipoId, color);
      await cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const vendibles = (datos?.espacios || []).filter(e => e.modo === 'vendible');
  const vendidas = vendibles.filter(e => ocupado.get(e.id) === 'vendido').length;

  const crear = async (body) => {
    setTrabajando(true);
    try {
      await espaciosApi.crear(evento.id, body);
      await cargar();
      setCreando(false);
      success(`«${body.nombre}» añadido.`);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setTrabajando(false); }
  };

  const generar = async (parent_id, body) => {
    setTrabajando(true);
    try {
      const r = await espaciosApi.generar(evento.id, { ...body, parent_id });
      await cargar();
      setGenerandoEn(null);
      success(r.creados === 1 ? 'Se creó 1 sitio.' : `Se crearon ${r.creados} sitios.`);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setTrabajando(false); }
  };

  const borrar = async (esp) => {
    const dentro = (datos?.espacios || []).filter(e => e.parent_id === esp.id).length;
    const ok = await confirmDialog({
      message: dentro
        ? `¿Borrar «${esp.nombre}» y los ${dentro} sitios que tiene dentro?`
        : `¿Borrar «${esp.nombre}»?`,
      danger: true,
    });
    if (!ok) return;
    try {
      await espaciosApi.borrar(evento.id, esp.id);
      await cargar();
      success('Borrado.');
    } catch (e) {
      /* El servidor cuenta lo vendido de TODO el subárbol y lo rechaza. El
         mensaje que llega dice cuántos son, y es el que hay que enseñar. */
      toastErr(e.response?.data?.error || e.message);
    }
  };

  /* Renombrar. Parece un lujo y no lo es: la zona se crea antes que el plano
     real —«Zona 1»— y se le pone el nombre de verdad cuando el recinto lo
     confirma. Sin esto habría que borrarla y volver a generar los sitios, que
     es imposible en cuanto hay uno vendido. */
  const renombrar = async (esp) => {
    const nombre = (window.prompt(`¿Cómo se llama ahora «${esp.nombre}»?`, esp.nombre) || '').trim();
    if (!nombre || nombre === esp.nombre) return;
    try {
      await espaciosApi.editar(evento.id, esp.id, { nombre });
      await cargar();
      success('Renombrado.');
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const ponerLocalidad = async (esp, ticket_type_id, enCascada) => {
    try {
      if (enCascada) await espaciosApi.localidadEnCascada(evento.id, esp.id, ticket_type_id || null);
      else await espaciosApi.localidad(evento.id, esp.id, ticket_type_id || null);
      await cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const liberar = async (esp) => {
    const estado = ocupado.get(esp.id);
    const ok = await confirmDialog({
      message: estado === 'vendido'
        ? `«${esp.nombre}» está VENDIDA. Liberarla la deja disponible para otra persona, y la boleta ya emitida se queda sin sitio.\n\nQueda anotado quién lo hizo.`
        : `¿Soltar «${esp.nombre}»? Alguien la tiene retenida mientras paga.`,
      danger: true,
      confirmLabel: 'Liberar',
    });
    if (!ok) return;
    try {
      await espaciosApi.liberar(evento.id, esp.id);
      await cargar();
      success('Liberada.');
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  if (datos === null) return <GLoader message="Cargando el plano..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold font-display text-text-1 tracking-tight mb-1">Plano de venta</h2>
        <p className="text-sm text-text-3 leading-relaxed">
          Para eventos donde se compra un sitio concreto: una silla, una mesa, un palco.
          Si tu evento se vende por aforo —lo normal— no necesitas nada de esto.
        </p>
      </div>

      {vendibles.length > 0 && (
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface/40 px-4 py-3 text-sm">
          <span className="text-text-2"><b className="text-text-1 tabular-nums">{vendibles.length}</b> sitios en venta</span>
          <span className="text-text-3">·</span>
          <span className="text-text-2"><b className="text-text-1 tabular-nums">{vendidas}</b> vendidos</span>
          <span className="text-text-3">·</span>
          <span className="text-text-2"><b className="text-text-1 tabular-nums">{vendibles.length - vendidas}</b> libres</span>
        </div>
      )}

      {(datos.arbol || []).length === 0 && !creando && (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-12 text-center">
          <p className="text-sm text-text-1 font-medium mb-1">Todavía no hay plano.</p>
          <p className="text-xs text-text-3 leading-relaxed max-w-sm mx-auto mb-4">
            Empieza por una zona —«Ringside», «Platea», «Palcos»— y dentro genera las
            unidades que se venden. Se pueden crear de una vez: «1 fila de 20 mesas».
          </p>
          <button onClick={() => setCreando(true)} className="btn-primary btn-sm">Crear la primera zona</button>
        </div>
      )}

      {vendibles.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            <button onClick={() => { setPrevia(v => !v); setColocando(false); }}
              className="text-xs text-accent hover:underline">
              {previa ? 'Volver a la lista' : 'Ver como lo verá quien compra'}
            </button>
            {/* Colocar es otra intención distinta de mirar: se separa para que
                un clic para comprobar no mueva nada. */}
            <button onClick={() => { setColocando(v => !v); setPrevia(false); }}
              className="text-xs text-accent hover:underline">
              {colocando ? 'Volver a la lista' : 'Colocar el recinto'}
            </button>
          </div>

          {/* La leyenda con su selector de color. Va en las dos vistas porque en
              un mapa de concierto el color ES el precio, y decidirlo mirando
              sólo la lista es decidirlo a ciegas. */}
          {(previa || colocando) && (
            <ColoresDeLocalidad
              localidades={[...new Map((datos?.localidades || [])
                .filter(l => l.ticket).map(l => [l.ticket.id, l.ticket])).values()]
                .sort((x, y) => Number(y.precio || 0) - Number(x.precio || 0))}
              onColor={ponerColor} />
          )}

          {colocando && (
            <EditorDePlano espacios={vendibles} colorDe={colorDe}
              onGuardar={guardarColocacion} guardando={trabajando} />
          )}

          {previa && (
            <>
              {/* El MISMO componente que se sirve al público, con los datos que
                  el panel ya tenía. Una copia «de previsualización» acabaría
                  enseñando algo que no es lo que se vende. */}
              <PlanoSVG
                unidades={vendibles.map(e => ({
                  id: e.id, nombre: e.nombre, capacidad: e.capacidad,
                  geometria: e.geometria, libre: !ocupado.get(e.id),
                }))}
                valor={null} onElegir={() => {}}
                colorDe={colorDe}
                ocupadoTitulo="vendida o retenida" />
              <p className="text-[11px] text-text-3">
                Así se ve el plano. Aquí sólo se mira: quien compra elige desde la página del evento.
                {vendibles.some(e => !precioDe.get(e.id)) &&
                  ' Los sitios sin tipo de boleta se ven igual y no se pueden comprar.'}
              </p>
            </>
          )}
        </div>
      )}

      {!previa && !colocando && (datos.arbol || []).map(nodo => (
        <Nodo key={nodo.id} nodo={nodo} nivel={0}
          ocupado={ocupado} precioDe={precioDe} tipos={tipos}
          onGenerar={() => setGenerandoEn(nodo)}
          onBorrar={borrar} onLiberar={liberar} onLocalidad={ponerLocalidad} onRenombrar={renombrar} />
      ))}

      {!previa && !colocando && (datos.arbol || []).length > 0 && !creando && (
        <button onClick={() => setCreando(true)} className="btn-ghost btn-sm">+ Otra zona</button>
      )}

      {creando && (
        <FormZona onGuardar={crear} onCancelar={() => setCreando(false)} trabajando={trabajando} />
      )}

      {generandoEn && (
        <FormGenerar dentroDe={generandoEn} max={datos.max_por_lote}
          onGenerar={(body) => generar(generandoEn.id, body)}
          onCancelar={() => setGenerandoEn(null)} trabajando={trabajando} />
      )}
    </div>
  );
}

/* Una zona y lo que tiene dentro.
 *
 * Las unidades vendibles se pintan como fichas pequeñas y no como filas: son
 * decenas, y una lista de veinte filas con sus botones no se lee. */
function Nodo({ nodo, nivel, ocupado, precioDe, tipos, onGenerar, onBorrar, onLiberar, onLocalidad, onRenombrar }) {
  const hijos = nodo.hijos || [];
  const unidades = hijos.filter(h => h.modo === 'vendible');
  const zonas = hijos.filter(h => h.modo !== 'vendible');
  const localidad = precioDe.get(unidades[0]?.id);

  return (
    <div className={`rounded-2xl border border-border bg-surface/40 p-4 space-y-3 ${nivel ? 'ml-4' : ''}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-text-1">{nodo.nombre}</h3>
            <span className="text-[10px] uppercase tracking-widest text-text-3">{nodo.tipo}</span>
          </div>
          <p className="text-[11px] text-text-3 mt-0.5">
            {nodo.modo === 'aforo' && nodo.aforo_max ? `Aforo ${nodo.aforo_max}` : MODOS.find(m => m.id === nodo.modo)?.label}
            {unidades.length > 0 && ` · ${unidades.length} en venta`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {nodo.modo !== 'vendible' && (
            <button onClick={onGenerar} className="btn-ghost btn-sm">+ Sitios</button>
          )}
          <button onClick={() => onRenombrar(nodo)} className="text-xs text-text-3 hover:text-text-1">Renombrar</button>
          <button onClick={() => onBorrar(nodo)} className="text-xs text-text-3 hover:text-danger">Borrar</button>
        </div>
      </div>

      {unidades.length > 0 && tipos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-text-3">Se compran con</label>
          <select
            value={localidad?.id || ''}
            onChange={e => onLocalidad(nodo, e.target.value, true)}
            className="input !h-9 text-xs w-auto">
            <option value="">— sin precio, no se venden —</option>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          {/* Sin localidad, una unidad vendible no la puede comprar nadie: el
              servidor no sabe qué cobrar. Se dice, porque el plano se vería
              lleno y la venta no funcionaría. */}
          {!localidad && (
            <span className="text-[11px] text-warning">
              Elige un tipo de boleta o estos sitios no se podrán comprar.
            </span>
          )}
        </div>
      )}

      {unidades.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unidades.map(u => {
            const est = ocupado.get(u.id);
            return (
              <button key={u.id}
                onClick={() => (est ? onLiberar(u) : onBorrar(u))}
                title={est === 'vendido' ? 'Vendida — pulsa para liberarla'
                     : est === 'retenido' ? 'Alguien la está pagando — pulsa para soltarla'
                     : 'Libre — pulsa para borrarla'}
                className={`px-2 py-1 rounded-lg text-[11px] border transition-colors
                  ${est === 'vendido'  ? 'border-danger/40 bg-danger/10 text-danger'
                  : est === 'retenido' ? 'border-warning/40 bg-warning/10 text-warning'
                  : 'border-border text-text-2 hover:border-border-2'}`}>
                {u.nombre}
                {u.capacidad > 1 && <span className="text-text-3"> ·{u.capacidad}</span>}
              </button>
            );
          })}
        </div>
      )}

      {zonas.map(z => (
        <Nodo key={z.id} nodo={z} nivel={nivel + 1}
          ocupado={ocupado} precioDe={precioDe} tipos={tipos}
          onGenerar={onGenerar} onBorrar={onBorrar} onLiberar={onLiberar}
          onLocalidad={onLocalidad} onRenombrar={onRenombrar} />
      ))}
    </div>
  );
}

function FormZona({ onGuardar, onCancelar, trabajando }) {
  const [f, setF] = useState({ nombre: '', tipo: 'zona', modo: 'aforo', aforo_max: '' });
  return (
    <form onSubmit={e => { e.preventDefault(); onGuardar(f); }}
      className="rounded-2xl border border-primary/25 bg-surface/40 p-4 space-y-3">
      <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">Nueva zona</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input autoFocus value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })}
          placeholder="Ringside, Platea, Palcos…" className="input" required />
        <input value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}
          placeholder="Cómo lo llamas: pabellón, gradería…" className="input" />
      </div>
      <div className="flex flex-wrap gap-2">
        {MODOS.map(m => (
          <label key={m.id} title={m.ayuda}
            className={`px-3 py-2 rounded-xl border cursor-pointer text-xs
              ${f.modo === m.id ? 'border-accent/60 bg-accent/5 text-text-1' : 'border-border text-text-3 hover:bg-surface-2'}`}>
            <input type="radio" name="modo" className="sr-only"
              checked={f.modo === m.id} onChange={() => setF({ ...f, modo: m.id })} />
            {m.label}
          </label>
        ))}
      </div>
      <p className="text-[11px] text-text-3">{MODOS.find(m => m.id === f.modo)?.ayuda}</p>
      {f.modo === 'aforo' && (
        <input type="number" min={1} value={f.aforo_max}
          onChange={e => setF({ ...f, aforo_max: e.target.value })}
          placeholder="Aforo (opcional)" className="input w-40" />
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={trabajando} className="btn-primary btn-sm">
          {trabajando ? <><Spinner size="sm" /> Guardando…</> : 'Crear zona'}
        </button>
        <button type="button" onClick={onCancelar} className="btn-ghost btn-sm">Cancelar</button>
      </div>
    </form>
  );
}

/* Generar las unidades por patrón.
 *
 * Nadie va a crear 240 sillas a mano, y nadie debería. Se describe la sección y
 * salen con su nombre puesto: «Fila A1», «Fila A2»… o «Mesa 1» si es una sola
 * fila, que es como está escrito en el suelo. */
function FormGenerar({ dentroDe, max, onGenerar, onCancelar, trabajando }) {
  const [f, setF] = useState({ filas: 1, porFila: 10, tipo: 'mesa', capacidad: 1, prefijoFila: 'Fila', desdeLaDerecha: false });
  const total = (Number(f.filas) || 0) * (Number(f.porFila) || 0);
  const pasado = total > (max || 2000);

  return (
    <form onSubmit={e => { e.preventDefault(); onGenerar(f); }}
      className="rounded-2xl border border-primary/25 bg-surface/40 p-4 space-y-3">
      <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">
        Sitios dentro de «{dentroDe.nombre}»
      </p>
      <div className="grid sm:grid-cols-4 gap-3">
        <label className="text-xs text-text-3">Filas
          <input type="number" min={1} value={f.filas}
            onChange={e => setF({ ...f, filas: e.target.value })} className="input !h-9 mt-1" />
        </label>
        <label className="text-xs text-text-3">Por fila
          <input type="number" min={1} value={f.porFila}
            onChange={e => setF({ ...f, porFila: e.target.value })} className="input !h-9 mt-1" />
        </label>
        <label className="text-xs text-text-3">Cómo se llama cada uno
          <input value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}
            placeholder="mesa, silla, palco" className="input !h-9 mt-1" />
        </label>
        <label className="text-xs text-text-3">Personas por sitio
          <input type="number" min={1} value={f.capacidad}
            onChange={e => setF({ ...f, capacidad: e.target.value })} className="input !h-9 mt-1" />
        </label>
      </div>

      {Number(f.filas) > 1 && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs text-text-3">
            Las filas se llaman
            <input value={f.prefijoFila} onChange={e => setF({ ...f, prefijoFila: e.target.value })}
              className="input !h-9 w-28 ml-2" />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-text-2 cursor-pointer">
            <input type="checkbox" checked={f.desdeLaDerecha}
              onChange={e => setF({ ...f, desdeLaDerecha: e.target.checked })} className="accent-[#8B5CF6]" />
            Numerar desde la derecha
          </label>
        </div>
      )}

      <p className={`text-[11px] ${pasado ? 'text-danger' : 'text-text-3'}`}>
        {pasado
          ? `Son ${total} y el máximo de una vez es ${max}. Hazlo por secciones.`
          : `Se crearán ${total} ${total === 1 ? 'sitio' : 'sitios'}: ${Number(f.filas) > 1
              ? `«${f.prefijoFila} A1» … «${f.prefijoFila} ${String.fromCharCode(64 + Math.min(26, Number(f.filas)))}${f.porFila}»`
              : `«${(f.tipo || 'sitio').charAt(0).toUpperCase() + (f.tipo || 'sitio').slice(1)} 1» … «${(f.tipo || 'sitio').charAt(0).toUpperCase() + (f.tipo || 'sitio').slice(1)} ${f.porFila}»`}`}
      </p>

      <div className="flex gap-2">
        <button type="submit" disabled={trabajando || pasado || !total} className="btn-primary btn-sm">
          {trabajando ? <><Spinner size="sm" /> Creando…</> : 'Crear los sitios'}
        </button>
        <button type="button" onClick={onCancelar} className="btn-ghost btn-sm">Cancelar</button>
      </div>
    </form>
  );
}

/* Elegir el color de cada localidad.
 *
 * Se enseña ordenado por precio, de más caro a más barato, porque así es como
 * se lee un mapa de recinto: el rojo delante, el azul al fondo. Ver la lista en
 * ese orden hace evidente si dos localidades contiguas tienen colores que no se
 * distinguen.
 *
 * «Automático» devuelve el color de la paleta. Sin esa salida, elegir un color
 * sería irreversible y la única forma de arrepentirse sería adivinar cuál era.
 */
function ColoresDeLocalidad({ localidades = [], onColor }) {
  if (!localidades.length) return null;
  return (
    <div className="rounded-xl border border-border p-3 space-y-2">
      <p className="text-xs text-text-2">
        El color de cada localidad. En el plano, el color <b>es</b> el precio.
      </p>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {localidades.map(l => (
          <li key={l.id} className="flex items-center gap-2">
            <input type="color" value={l.color || '#888888'} aria-label={`Color de ${l.nombre}`}
              onChange={(e) => onColor(l.id, e.target.value)}
              className="w-7 h-7 rounded border border-border bg-transparent cursor-pointer p-0" />
            <span className="text-xs text-text-1">{l.nombre}</span>
            <button type="button" onClick={() => onColor(l.id, null)}
              className="text-[10px] text-text-3 hover:text-text-1 underline">automático</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
