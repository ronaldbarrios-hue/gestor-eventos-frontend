import { useEffect, useMemo, useState } from 'react';
import { espaciosApi, recintosApi } from '../../../api/espacios.js';
import { ticketsApi } from '../../../api/tickets.js';
import { eventosApi } from '../../../api/eventos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog, pedirTexto } from '../../../components/ui/Confirm.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import Icono from '../../../components/ui/Iconos.jsx';
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

export default function PlanoTab({ evento, recargarEvento }) {
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

  /* El recinto de partida. Nadie empieza bien delante de un lienzo vacío. */
  const plantilla = async (opciones) => {
    setTrabajando(true);
    try {
      const r = await espaciosApi.plantillaConcierto(evento.id, opciones);
      await cargar();
      success(`Recinto creado: ${r.creados} piezas. Ahora colócalo sobre el plano real.`);
      setColocando(true);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setTrabajando(false); }
  };

  /* El plano oficial que se calca. Vive en `page_json` del evento y no en un
     espacio: es del recinto entero, no de una silla. */
  const fondo = evento.page_json?.plano_fondo || null;
  const guardarFondo = async (nuevo) => {
    try {
      await eventosApi.update(evento.id, {
        page_json: { ...(evento.page_json || {}), plano_fondo: nuevo },
      });
      recargarEvento?.();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const crearBloque = async ({ tipo, geometria }) => {
    try {
      /* El nombre se propone y se cambia después en la lista: parar a teclear
         un nombre por cada bloque rompe el ritmo de dibujar veinte seguidos. */
      const cuantos = (datos?.espacios || []).filter(e => e.tipo === tipo).length + 1;
      const nombre = tipo === 'tarima' ? 'Tarima'
        : tipo === 'pista' ? `General ${String.fromCharCode(64 + cuantos)}`
        : tipo === 'palco' ? `Palco ${cuantos}`
        : String(100 + cuantos);
      await espaciosApi.crear(evento.id, {
        nombre, tipo, geometria,
        /* Una tribuna o una general son contenedores: lo que se vende son sus
           butacas. Sólo el palco nace vendible. */
        modo: tipo === 'palco' ? 'vendible' : 'aforo',
        ...(tipo === 'palco' ? { capacidad: 8 } : {}),
      });
      await cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  /* Guardar lo dibujado como recinto reutilizable, y montar un evento desde
     uno guardado. Es lo que separa una herramienta de dibujo de una plataforma
     de recintos: el trabajo de calcar un arena se paga UNA vez. */
  const guardarRecinto = async (datosDelRecinto) => {
    setTrabajando(true);
    try {
      const r = await recintosApi.guardar({
        ...datosDelRecinto, evento_id: evento.id, fondo,
      });
      success(`«${r.recinto.nombre}» guardado con ${r.espacios} espacios. Ya puedes montarlo en otros eventos.`);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setTrabajando(false); }
  };

  const montarRecinto = async (recintoId) => {
    setTrabajando(true);
    try {
      const r = await recintosApi.montarEn(evento.id, recintoId);
      /* El fondo viaja con el recinto: es del edificio, no del concierto, y sin
         él la copia no se puede seguir calcando. */
      if (r.fondo?.url && !fondo?.url) await guardarFondo(r.fondo);
      await cargar();
      success(`Recinto montado: ${r.creados} espacios. Ahora ponle precios.`);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setTrabajando(false); }
  };

  /* Llenar una tribuna trazada con sus butacas. Lo que se pide —cuántas filas,
     cuántas por fila— lo recoge el editor, que es donde está el bloque a la
     vista: preguntarlo en un diálogo aparte obliga a recordar de memoria lo que
     se acaba de dibujar. */
  const llenarBloque = async (bloque, opciones) => {
    setTrabajando(true);
    try {
      const r = await espaciosApi.llenarBloque(evento.id, bloque.id, opciones);
      await cargar();
      success(`${r.creadas} butacas en «${bloque.nombre}».`);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setTrabajando(false); }
  };

  const borrarRecinto = async (r) => {
    const ok = await confirmDialog({
      message: `¿Borrar el recinto «${r.nombre}»?\n\nLos eventos ya montados con él no cambian: cada uno tiene su propia copia.`,
      danger: true,
    });
    if (!ok) return;
    try {
      await recintosApi.borrar(r.id);
      success(`«${r.nombre}» borrado.`);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
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
    const nombre = await pedirTexto({
      title: 'Renombrar',
      message: `¿Cómo se llama ahora «${esp.nombre}»?`,
      valor: esp.nombre,
    });
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

      {/* Los sitios accesibles, y si están donde deben. Va con el plano porque es
          una revisión DEL plano: en una pantalla aparte, nadie la abre. */}
      <Accesibilidad datos={datos?.accesibilidad} />

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
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => setCreando(true)} className="btn-ghost btn-sm">Crear una zona a mano</button>
          </div>

          {/* Lo primero que se ofrece es lo que menos trabajo cuesta: si el
              recinto ya está dibujado de otro concierto, montarlo son dos
              clics. Dibujarlo otra vez son horas. */}
          <MisRecintos onMontar={montarRecinto} onBorrar={borrarRecinto} trabajando={trabajando} />

          {/* El camino corto para un concierto nuevo. Va aquí y no escondido en
              un menú porque es por donde debería empezar casi todo el mundo:
              montar tarima, general y tribunas a mano son treinta formularios. */}
          <RecintoDeConcierto onCrear={plantilla} trabajando={trabajando} />
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
            {/* Sólo tiene sentido guardar lo que costó dibujar: con cuatro
                mesas sueltas, ofrecerlo es ruido. */}
            {(datos?.espacios || []).length >= 8 && (
              <GuardarComoRecinto onGuardar={guardarRecinto} trabajando={trabajando} />
            )}
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
            <EditorDePlano
              espacios={vendibles}
              /* Los contenedores con forma: la tarima, la general, las
                 tribunas. Se dibujan de fondo para saber dónde se está
                 colocando cada silla. */
              bloques={(datos?.espacios || [])
                .filter(e => e.modo !== 'vendible' && (e.geometria?.puntos || []).length >= 3)}
              colorDe={colorDe}
              onGuardar={guardarColocacion}
              onCrearBloque={crearBloque}
              onLlenar={llenarBloque}
              fondo={fondo} onFondo={guardarFondo} ownerId={evento.id}
              guardando={trabajando} />
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

/* El recinto de concierto de partida.
 *
 * ── Por qué la abertura es la primera pregunta ──────────────────────────
 *
 * Porque es la decisión que hay que tomar ANTES de dibujar nada: determina todo
 * el resto del mapa, y cambiarla después es rehacerlo. Se pregunta con las tres
 * formas reales de montar un concierto, no en grados — nadie piensa «240°»,
 * piensa «el escenario a un extremo».
 *
 * Y lo que sale NO es el recinto: es por dónde se empieza. El recinto se
 * termina poniendo el plano oficial de fondo y calcándolo encima.
 */
function RecintoDeConcierto({ onCrear, trabajando }) {
  const [abierto, setAbierto] = useState(false);
  const [forma, setForma] = useState(240);
  const [anillos, setAnillos] = useState(2);
  const [porAnillo, setPorAnillo] = useState(10);
  const [palcos, setPalcos] = useState(0);
  const [conPista, setConPista] = useState(true);

  const FORMAS = [
    { v: 180, label: 'Escenario contra la pared', ayuda: 'Auditorio, teatro, salón' },
    { v: 240, label: 'Escenario a un extremo',    ayuda: 'Arena, coliseo' },
    { v: 360, label: 'En redondo',                ayuda: 'Escenario en el centro' },
  ];

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="btn-primary btn-sm mt-3">
        Empezar con un recinto de concierto
      </button>
    );
  }

  return (
    <div className="mt-5 text-left rounded-2xl border border-border p-4 space-y-3">
      <p className="text-sm font-medium text-text-1">Cómo está montado el escenario</p>
      <div className="grid sm:grid-cols-3 gap-2">
        {FORMAS.map(f => (
          <button key={f.v} type="button" onClick={() => setForma(f.v)}
            className={`text-left rounded-xl border p-3 transition-colors
              ${forma === f.v ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}>
            <span className="block text-xs font-medium text-text-1">{f.label}</span>
            <span className="block text-[11px] text-text-3">{f.ayuda}</span>
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Numero label="Anillos de tribunas" valor={anillos} onCambio={setAnillos} min={1} max={6} />
        <Numero label="Tribunas por anillo" valor={porAnillo} onCambio={setPorAnillo} min={1} max={40} />
        <Numero label="Palcos" valor={palcos} onCambio={setPalcos} min={0} max={60} />
        <label className="flex items-center gap-2 text-xs text-text-2 self-end pb-1">
          <input type="checkbox" checked={conPista} onChange={(e) => setConPista(e.target.checked)} />
          Con general de pie delante
        </label>
      </div>

      <p className="text-[11px] text-text-3">
        Sale un punto de partida con la numeración de un recinto real —101, 102… 201, 202…—.
        Después se pone el plano oficial de fondo y se calca encima.
      </p>

      <div className="flex gap-2">
        <button type="button" disabled={trabajando}
          onClick={() => onCrear({ abertura: forma, anillos, porAnillo, palcos, conPista })}
          className="btn-primary btn-sm">
          {trabajando ? 'Creando…' : 'Crear el recinto'}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="btn-ghost btn-sm">Cancelar</button>
      </div>
    </div>
  );
}

function Numero({ label, valor, onCambio, min, max }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-text-3 mb-1">{label}</span>
      <input type="number" value={valor} min={min} max={max}
        onChange={(e) => onCambio(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className="input input-sm text-xs w-full" />
    </label>
  );
}

/* Montar el evento desde un recinto ya dibujado.
 *
 * Se carga la lista sólo al abrirla: la inmensa mayoría de los eventos se venden
 * por aforo y no van a mirar esto nunca, y una consulta en cada apertura de la
 * pestaña sería trabajo por nada.
 */
function MisRecintos({ onMontar, onBorrar, trabajando }) {
  const [recintos, setRecintos] = useState(null);   // null = sin pedir
  const [abierto, setAbierto] = useState(false);

  const recargar = async () => {
    try { setRecintos((await recintosApi.list()).recintos || []); }
    catch { setRecintos([]); }
  };

  const abrir = async () => {
    setAbierto(true);
    if (recintos === null) await recargar();
  };

  if (!abierto) {
    return (
      <button onClick={abrir} className="btn-ghost btn-sm mt-3">
        Montar un recinto que ya tengo
      </button>
    );
  }

  if (recintos === null) return <p className="text-xs text-text-3 mt-3">Buscando tus recintos…</p>;

  if (!recintos.length) {
    return (
      <p className="text-xs text-text-3 mt-3 max-w-sm mx-auto">
        Todavía no tienes recintos guardados. Dibuja éste y, cuando quede bien,
        guárdalo: el siguiente concierto en el mismo sitio se monta en dos clics.
      </p>
    );
  }

  return (
    <div className="mt-4 text-left rounded-2xl border border-border p-3 space-y-2">
      <p className="text-xs text-text-2">Tus recintos</p>
      <ul className="space-y-1.5">
        {recintos.map(r => (
          <li key={r.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm text-text-1 truncate">{r.nombre}</span>
              <span className="block text-[11px] text-text-3">
                {r.ciudad ? `${r.ciudad} · ` : ''}{r.espacios} espacios
                {/* El aforo legal y lo dibujado son dos números distintos: un
                    arena de 14.000 monta 6.000 para un acústico. */}
                {r.aforo_legal ? ` · aforo legal ${r.aforo_legal.toLocaleString('es-CO')}` : ''}
              </span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <button type="button" disabled={trabajando} onClick={() => onMontar(r.id)}
                className="btn-primary btn-sm">Montar</button>
              {/* Borrar un recinto NO toca los eventos montados con él: son
                  copias, y ésa es justo la razón de que sean copias. Se dice
                  al confirmar, porque desde fuera parece lo contrario. */}
              <button type="button" disabled={trabajando}
                onClick={async () => { await onBorrar(r); await recargar(); }}
                className="text-[11px] text-text-3 hover:text-danger underline">borrar</button>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-text-3">
        Se monta una <b>copia</b>: lo que cambies aquí no toca el recinto guardado
        ni los otros eventos.
      </p>
    </div>
  );
}

/* Guardar lo dibujado para la próxima vez.
 *
 * Se pide el nombre y no se propone el del evento: el recinto es el edificio
 * —«Movistar Arena»— y el evento es el concierto —«Juice WRLD»—. Proponer el
 * segundo llenaría la lista de recintos llamados como shows.
 */
function GuardarComoRecinto({ onGuardar, trabajando }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [aforo, setAforo] = useState('');

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="text-xs text-accent hover:underline">
        Guardar este recinto para otros eventos
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border p-3 space-y-2">
      <p className="text-xs text-text-2">
        Guarda el <b>edificio</b>, no el concierto: se copian las formas, los nombres y
        las capacidades. Los precios y las ventas se quedan en este evento.
      </p>
      <div className="grid sm:grid-cols-3 gap-2">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del recinto" aria-label="Nombre del recinto"
          className="input input-sm text-xs" />
        <input value={ciudad} onChange={(e) => setCiudad(e.target.value)}
          placeholder="Ciudad" aria-label="Ciudad" className="input input-sm text-xs" />
        <input value={aforo} onChange={(e) => setAforo(e.target.value.replace(/\D/g, ''))}
          placeholder="Aforo legal" aria-label="Aforo legal del edificio"
          inputMode="numeric" className="input input-sm text-xs" />
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={!nombre.trim() || trabajando}
          onClick={async () => {
            await onGuardar({ nombre: nombre.trim(), ciudad: ciudad.trim() || null,
                              aforo_legal: aforo ? Number(aforo) : null });
            setAbierto(false); setNombre('');
          }}
          className="btn-primary btn-sm">{trabajando ? 'Guardando…' : 'Guardar recinto'}</button>
        <button type="button" onClick={() => setAbierto(false)} className="btn-ghost btn-sm">Cancelar</button>
      </div>
    </div>
  );
}

/* El aviso de accesibilidad.
 *
 * Avisa, no impide: quien organiza sabrá si su recinto tiene una razón; lo que
 * no puede es no enterarse. Y no se enseña nada cuando la regla no aplica —un
 * salón de 200 personas— porque un «todo bien» por una norma que ni se le
 * aplica engaña más que callar.
 */
function Accesibilidad({ datos }) {
  if (!datos?.aplica) return null;

  if (datos.ok) {
    return (
      <p className="text-xs text-success flex items-center gap-2">
        <Icono name="hecho" className="w-4 h-4" />
        {datos.accesibles} espacios accesibles, repartidos en {datos.zonas} zonas
        {datos.localidades > 1 ? ` y ${datos.localidades} localidades` : ''}.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/5 p-4 space-y-2">
      <p className="text-sm font-medium text-text-1 flex items-center gap-2">
        <Icono name="aviso" className="w-4 h-4 text-warning" />
        Sitios accesibles
      </p>
      <ul className="space-y-1.5">
        {datos.avisos.map(a => (
          <li key={a.clave} className="text-xs text-text-2">· {a.texto}</li>
        ))}
      </ul>
      <p className="text-[11px] text-text-3">
        Marca un sitio como accesible o de acompañante desde su ficha. La referencia
        son las normas ADA —36 espacios desde 5.000 asientos, más uno por cada 200—
        y piden repartirlos por niveles y por bandas de precio, no juntarlos.
      </p>
    </div>
  );
}
