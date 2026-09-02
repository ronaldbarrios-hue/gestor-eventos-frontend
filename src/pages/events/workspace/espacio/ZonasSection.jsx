import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { clientesApi } from '../../../../api/clientes.js';
import { eventosApi } from '../../../../api/eventos.js';
import { agendaApi } from '../../../../api/agenda.js';
import { networkingApi } from '../../../../api/networking.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../../components/ui/Confirm.jsx';
import GLoader from '../../../../components/ui/GLoader.jsx';
import { useSondeo } from '../../../../hooks/useSondeo.js';
import { zonasDelEvento } from '../../../../lib/zonas.js';
import {
  nivelDeZona, estaEnLlamas, IconoLlama, DetalleMarcador,
} from '../../../../components/aforo/MapaAforo.jsx';

/* Espacio del evento · Zonas de interés — la zona, entera, en un sitio.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * Una zona era lo único del evento que salía en cuatro pantallas y no se podía
 * mirar en ninguna. Se creaba en «Accesos e ingresos», se colocaba en «Mapa
 * del evento», se operaba en «Aforo por zonas», y para saber qué ocurría
 * dentro había que ir al Calendario; para saber qué stands había, a Stands.
 *
 * Peor que estar repartido: **todas sus relaciones se establecían desde el
 * otro lado**. Un sub-evento elegía su zona; un stand elegía su zona. Se podía
 * decir «esta charla es en la Zona Gamer», pero estando en la Zona Gamer no se
 * podía preguntar qué pasa aquí.
 *
 * Esta pantalla contesta eso. Empieza siendo de sólo lectura a propósito: lo
 * primero que hacía falta no era otro formulario, era un sitio donde ver la
 * zona completa. La administración se muda aquí en la fase siguiente.
 *
 * ── Lo que NO hace, y por qué ─────────────────────────────────────────────
 *
 * No dibuja el plano y no repinta el histórico. Las dos cosas ya existen —el
 * mapa en «Mapa del evento», la curva y la estancia media en el Reporte de
 * «Aforo por zonas»— y copiarlas aquí habría sido exactamente el problema que
 * esta pantalla viene a resolver. Enlaza a las dos.
 *
 * Todo lo vivo sale de UNA petición, `mapa/vivo`, que ya devolvía zonas con
 * ocupación, agenda y stands en una sola llamada y hasta ahora sólo consumía
 * el tablero de aforo. La ficha de la derecha es literalmente el mismo
 * `DetalleMarcador` de ese tablero: si allí se ve bien, aquí también.
 *
 * ── Quién puede editar ────────────────────────────────────────────────────
 *
 * La pestaña se abre con permiso de `checkin`, porque mirar la zona es parte
 * de trabajar el evento. Pero las tres cosas que se pueden CAMBIAR desde aquí
 * viven en tres tablas distintas, y el backend pide un permiso distinto para
 * cada una:
 *
 *   la zona en sí → `page_json`               → `editar_pagina_publica`
 *   la actividad  → `agenda_sessions.zona_id` → `gestionar_agenda` | `editar_evento`
 *   el stand      → `networking_expositores`  → `gestionar_expositores` | `editar_evento`
 *
 * (el owner puede las tres). Se comprueban por separado y no con una sola
 * bandera, por dos razones: enseñar un botón que devuelve 403 es peor que no
 * enseñarlo, y juntarlas obligaría a exigir el permiso más alto de los tres
 * para hacer lo más barato.
 */

const puedeCon = (soyOwner, permisos, lista) =>
  Boolean(soyOwner) || lista.some(p => (permisos || []).includes(p));

function uid() { return 'zona_' + Math.random().toString(36).slice(2, 9); }

/* Con una clave de React estable, para que editar el nombre de una fila no
   remonte el input en cada tecla. Las zonas nuevas todavía no tienen nada que
   las distinga salvo su id generado en cliente. */
const zonasConClave = (evento) => zonasDelEvento(evento).map(z => ({ ...z, _k: z.id }));

/* El mismo recorte que se manda al servidor. Sirve para comparar y saber si
   una fila tiene cambios sin guardar: sin esto, un espacio de más en el
   nombre marcaría «sin guardar» para siempre. */
const limpiar = (l) => (l || []).map(({ id, nombre, aforo_max }) =>
  ({ id, nombre: (nombre || '').trim(), aforo_max: Number(aforo_max) || null }));

/* Una zona configurada de la que el endpoint en vivo todavía no sabe nada
   —recién creada, o sin un solo movimiento— sale en ceros en vez de
   desaparecer de la lista. */
const VACIA = { dentro: 0, entradas: 0, salidas: 0, excedido: 0, agenda: [], ahora: [], siguiente: null, stands: [] };

export default function ZonasSection({ evento, soyOwner = false, permisos, reload }) {
  const puedeEditar = puedeCon(soyOwner, permisos, ['editar_pagina_publica']);
  const puedeAgenda = puedeCon(soyOwner, permisos, ['gestionar_agenda', 'editar_evento']);
  const puedeStands = puedeCon(soyOwner, permisos, ['gestionar_expositores', 'editar_evento']);

  const { success, error } = useToast();
  const [zonas, setZonas] = useState(null);
  const [sel, setSel] = useState(null);
  const [ultimo, setUltimo] = useState(null);
  const [fallo, setFallo] = useState('');
  const vivoRef = useRef(true);

  useEffect(() => () => { vivoRef.current = false; }, []);

  /* Las zonas CONFIGURADAS, que es la lista de verdad: `mapa/vivo` sólo trae
     las que tienen movimiento, así que una zona recién creada no aparecería y
     parecería que no existe.
     Es estado y no un `useMemo` porque aquí se editan: la lista local es la
     que manda desde el primer cambio hasta que el evento se recargue. */
  const [configuradas, setConfiguradas] = useState(() => zonasConClave(evento));
  const [guardadas, setGuardadas] = useState(() => limpiar(zonasConClave(evento)));
  const [guardando, setGuardando] = useState(false);

  /* Qué zonas están puestas en el plano. Es un dato del `page_json`, no del
     endpoint: se lee aquí para poder avisar de las que faltan por colocar. */
  const enElPlano = useMemo(() => new Set(
    (evento.page_json?.mapa?.marcadores || [])
      .filter(m => m?.tipo === 'zona' && m.zona_id)
      .map(m => m.zona_id),
  ), [evento.page_json]);

  const cargar = useCallback(async () => {
    try {
      const d = await clientesApi.mapaVivo(evento.id);
      if (!vivoRef.current) return;
      setZonas(d.zonas || []);
      setUltimo(d.at || new Date().toISOString());
      setFallo('');
    } catch (e) {
      if (!vivoRef.current) return;
      /* Un fallo de red no vacía la pantalla: si ya había datos se quedan y se
         avisa. Volver a «Cargando…» en cada hipo de la conexión hace que el
         tablero parezca roto cuando sólo está viejo. */
      setFallo(e.response?.data?.error || e.message);
      setZonas(z => z ?? []);
    }
  }, [evento.id]);

  useEffect(() => { cargar(); }, [cargar]);
  useSondeo(cargar, 15000);

  /* ── Editar ────────────────────────────────────────────────────────────
     El PATCH mezcla `page_json` por clave desde la 0064, así que mandar sólo
     `zonas` no toca las puertas ni el mapa. `lista` opcional es para poder
     guardar de inmediato la lista recién recortada al borrar una fila, antes
     de que el estado de React se haya actualizado. */
  const editar = (k, patch) => setConfiguradas(l => l.map(z => z._k === k ? { ...z, ...patch } : z));

  const guardar = useCallback(async (lista) => {
    const l = lista || configuradas;
    for (const z of l) if (!String(z.nombre || '').trim()) { error('Cada zona necesita un nombre.'); return false; }
    setGuardando(true);
    try {
      const limpio = limpiar(l);
      await eventosApi.update(evento.id, { page_json: { zonas: limpio } });
      setGuardadas(limpio);
      success('Zonas guardadas.');
      /* Que el resto del workspace vea las zonas nuevas: el selector de zona
         del Calendario y el de Stands leen `evento.page_json`, no esta lista. */
      reload?.();
      return true;
    } catch (e) {
      error(e.response?.data?.error || e.message);
      return false;
    } finally { setGuardando(false); }
  }, [configuradas, evento.id, error, success, reload]);

  const agregar = () => setConfiguradas(l => [...l, { _k: uid(), id: uid(), nombre: '', aforo_max: '' }]);

  const borrar = async (z) => {
    /* Se pregunta, y no por costumbre: una zona borrada se lleva por delante
       la referencia de los sub-eventos y los stands que apuntaban a ella. */
    const enPlano = enElPlano.has(z.id);
    const vivo = (zonas || []).find(x => x.id === z.id);
    const avisos = [
      vivo?.dentro > 0 ? `Ahora mismo hay ${vivo.dentro} personas dentro.` : null,
      (vivo?.agenda || []).length ? `${vivo.agenda.length} actividad(es) quedan sin zona.` : null,
      (vivo?.stands || []).length ? `${vivo.stands.length} stand(s) quedan sin ubicar.` : null,
      enPlano ? 'Su marcador quedará huérfano en el plano.' : null,
    ].filter(Boolean);

    const ok = await confirmDialog({
      title: `¿Borrar «${String(z.nombre || '').trim() || 'esta zona'}»?`,
      message: avisos.length
        ? `${avisos.join(' ')} El histórico de aforo no se borra.`
        : 'El histórico de aforo no se borra.',
      confirmLabel: 'Borrar zona',
      danger: true,
    });
    if (!ok) return;

    const lista = configuradas.filter(x => x._k !== z._k);
    setConfiguradas(lista);
    if (sel === z.id) setSel(null);
    await guardar(lista);   // borrar persiste al momento, no espera al botón
  };

  const sucio = JSON.stringify(limpiar(configuradas)) !== JSON.stringify(guardadas);

  /* ── Colgar cosas de la zona (fase 3) ──────────────────────────────────
     Las listas completas de actividades y de stands, que `mapa/vivo` no trae:
     de la agenda sólo devuelve lo que está puesto en el plano, y de los stands
     sólo los que YA tienen zona. Para poder asignar hace falta ver también lo
     que todavía no está en ninguna parte.

     Se piden una sola vez y sólo si se puede asignar algo: a quien no tiene el
     permiso no se le gasta la petición. */
  const [agendaTodo, setAgendaTodo] = useState(null);
  const [standsTodo, setStandsTodo] = useState(null);
  const [asignando, setAsignando] = useState(false);

  const cargarAsignables = useCallback(async () => {
    const [ag, st] = await Promise.all([
      puedeAgenda ? agendaApi.sessions(evento.id).catch(() => null) : Promise.resolve(null),
      puedeStands ? networkingApi.expositoresAdmin(evento.id).catch(() => null) : Promise.resolve(null),
    ]);
    if (!vivoRef.current) return;
    if (ag) setAgendaTodo(ag.sessions || []);
    if (st) setStandsTodo(st.expositores || []);
  }, [evento.id, puedeAgenda, puedeStands]);

  useEffect(() => { cargarAsignables(); }, [cargarAsignables]);

  /* Asignar y desasignar son la MISMA operación con distinto valor, así que es
     una sola función: `zonaId` a null desasigna. Van de a una petición por
     ítem —los endpoints de agenda y de stands ya aceptan `zona_id` en su
     PATCH— y no hay endpoint en lote porque para un puñado de ítems no hace
     falta uno; si algún día se asignan cincuenta de golpe, ahí sí. */
  const mover = async (que, id, zonaId) => {
    setAsignando(true);
    try {
      if (que === 'agenda') await agendaApi.editarSession(evento.id, id, { zona_id: zonaId });
      else await networkingApi.editarStand(evento.id, id, { zona_id: zonaId });
      success(zonaId ? 'Movido a la zona.' : 'Quitado de la zona.');
      /* Dos refrescos y los dos hacen falta: `cargar` trae la zona con su
         contenido nuevo, `cargarAsignables` actualiza qué queda por asignar. */
      await Promise.all([cargar(), cargarAsignables()]);
    } catch (e) {
      error(e.response?.data?.error || e.message);
    } finally { setAsignando(false); }
  };

  /* Cada zona configurada con lo que se sepa de ella en vivo. La configurada
     manda: si el endpoint no la trae todavía, sale en ceros en vez de
     desaparecer. */
  const filas = useMemo(() => {
    const vivo = new Map((zonas || []).map(z => [z.id, z]));
    return configuradas.map(c => ({
      ...VACIA,
      ...(vivo.get(c.id) || {}),
      /* La configuración manda sobre lo que devolvió el endpoint: si alguien
         acaba de renombrar la zona, el nombre nuevo se ve sin esperar al
         siguiente sondeo. */
      id: c.id,
      _k: c._k,
      nombre: c.nombre,
      aforo_max: c.aforo_max === '' || c.aforo_max == null ? null : Number(c.aforo_max),
      _enPlano: enElPlano.has(c.id),
    }));
  }, [configuradas, zonas, enElPlano]);

  const seleccionada = filas.find(z => z.id === sel) || null;
  /* `DetalleMarcador` lee de `datos.zonas`, así que se le pasa la fila ya
     mezclada — es la que tiene el nombre y el aforo al día. */
  const datosDetalle = useMemo(() => ({ zonas: filas }), [filas]);

  const sinColocar = filas.filter(z => !z._enPlano).length;

  if (zonas === null) return <GLoader message="Cargando zonas…" />;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Zonas de interés</h2>
          <p className="text-sm text-text-2 mt-1">
            {puedeEditar
              ? 'Aquí se crean las zonas del recinto, y aquí se ve cada una con su aforo en vivo, lo que ocurre dentro y los stands montados.'
              : 'Cada zona con su aforo en vivo, lo que ocurre dentro y los stands que hay montados.'}
          </p>
          {puedeEditar && (
            <p className="text-xs text-text-3 mt-1">
              El aforo máximo avisa, no bloquea: si una zona se pasa, la gente sigue entrando y queda
              registrado el excedente.
            </p>
          )}
        </div>
        {ultimo && (
          <p className="text-[11px] text-text-3">
            Al día de {new Date(ultimo).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            {fallo ? ' · sin conexión, mostrando lo último' : ''}
          </p>
        )}
      </div>

      {configuradas.length === 0 ? (
        <div className="card"><div className="card-body text-center py-10">
          <p className="text-sm text-text-2">Todavía no hay zonas.</p>
          <p className="text-xs text-text-3 mt-1.5 max-w-md mx-auto">
            Una zona es un espacio del recinto —una tarima, la zona VIP, el patio de comidas— con
            su aforo. Después se le cuelgan las actividades y los stands que ocurren ahí.
          </p>
          {puedeEditar
            ? <button onClick={agregar} className="btn-primary btn-sm mt-4">+ Crear la primera zona</button>
            : <p className="text-[11px] text-text-3 mt-3">Las crea quien administra el evento.</p>}
        </div></div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
          <div className="space-y-2">
            {filas.map(z => (
              <FilaZona key={z._k} z={z} activa={z.id === sel}
                editable={puedeEditar}
                onSelect={() => setSel(z.id === sel ? null : z.id)}
                onEditar={(patch) => editar(z._k, patch)}
                onBorrar={() => borrar(z)} />
            ))}

            {puedeEditar && (
              <div className="flex items-center gap-2 pt-1">
                <button onClick={agregar} className="btn-ghost btn-sm">+ Añadir zona</button>
                {sucio && (
                  <button onClick={() => guardar()} disabled={guardando} className="btn-primary btn-sm">
                    {guardando ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                )}
              </div>
            )}

            {sinColocar > 0 && (
              <p className="text-[11px] text-text-3 px-1 pt-1">
                {sinColocar === 1 ? 'Una zona no está' : `${sinColocar} zonas no están`} en el plano: sin colocarlas
                no salen en el mapa ni en el tablero en vivo.{' '}
                <Link to={`/eventos/${evento.id}?s=espacio&t=mapa`} className="text-primary-light hover:underline">
                  Colocarlas →
                </Link>
              </p>
            )}
          </div>

          <div className="lg:sticky lg:top-4 space-y-3">
            {seleccionada ? (
              <>
                <DetalleMarcador sel={`zona:${seleccionada.id}`} datos={datosDetalle} />
                {puedeAgenda && (
                  <Colgar titulo="Actividades aquí" vacio="Ninguna actividad programada en esta zona."
                    ocupando={asignando}
                    dentro={(agendaTodo || []).filter(s => s.zona_id === seleccionada.id)}
                    fuera={(agendaTodo || []).filter(s => s.zona_id !== seleccionada.id)}
                    etiqueta={s => s.titulo || 'Sin título'}
                    nota={s => s.zona_id ? 'en otra zona' : null}
                    onMeter={id => mover('agenda', id, seleccionada.id)}
                    onSacar={id => mover('agenda', id, null)} />
                )}
                {puedeStands && (
                  <Colgar titulo="Stands aquí" vacio="Ningún stand montado en esta zona."
                    ocupando={asignando}
                    dentro={(standsTodo || []).filter(s => s.zona_id === seleccionada.id)}
                    fuera={(standsTodo || []).filter(s => s.zona_id !== seleccionada.id)}
                    etiqueta={s => `${s.nombre}${s.stand ? ` · ${s.stand}` : ''}`}
                    nota={s => s.zona_id ? 'en otra zona' : null}
                    onMeter={id => mover('stands', id, seleccionada.id)}
                    onSacar={id => mover('stands', id, null)} />
                )}
                <Acciones evento={evento} z={seleccionada} puedeAgenda={puedeAgenda} puedeStands={puedeStands} />
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-surface/40 p-5 text-center">
                <p className="text-sm text-text-2">Toca una zona</p>
                <p className="text-xs text-text-3 mt-1.5">
                  Verás su aforo, qué hay programado dentro y qué stands están montados ahí.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* Una fila de la lista. Lo que tiene que contestar de un golpe es «cuáles de
   mis zonas están vacías de contenido», que es lo que hoy no se puede ver sin
   recorrer tres pantallas: por eso los conteos de actividades y stands van
   aquí y no sólo en la ficha. */
function FilaZona({ z, activa, editable, onSelect, onEditar, onBorrar }) {
  const nivel = nivelDeZona(z);
  const enLlamas = estaEnLlamas(z);
  const pct = z.aforo_max ? Math.min(100, Math.round((z.dentro / z.aforo_max) * 100)) : null;
  const actividades = (z.agenda || []).length;
  const stands = (z.stands || []).length;
  const nueva = !String(z.nombre || '').trim();

  return (
    <div className={`rounded-2xl border p-3.5 transition-colors ${
      activa ? 'border-primary-light bg-surface-2/60' : 'border-border bg-surface/40'
    }`}>
      <div className="flex items-center gap-2.5">
        {enLlamas
          ? <span className="text-orange-500 flex-shrink-0"><IconoLlama className="w-4 h-4" /></span>
          : <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: nivel.color }} />}

        {editable ? (
          <>
            <input value={z.nombre} onChange={e => onEditar({ nombre: e.target.value })}
              placeholder="Nombre de la zona" autoFocus={nueva}
              className="input !h-9 text-sm flex-1 min-w-0" />
            <input type="number" min="0" value={z.aforo_max ?? ''}
              onChange={e => onEditar({ aforo_max: e.target.value })}
              placeholder="Aforo" title="Aforo máximo (opcional)"
              className="input !h-9 text-sm w-20 flex-shrink-0" />
            <button onClick={onBorrar} title="Borrar zona"
              className="w-8 h-8 rounded-lg text-danger-light hover:bg-danger/10 flex items-center justify-center flex-shrink-0">✕</button>
          </>
        ) : (
          <>
            <p className="font-medium text-text-1 flex-1 min-w-0 truncate">{z.nombre}</p>
            <p className="text-sm font-bold font-display tabular-nums text-text-1 flex-shrink-0">
              {z.dentro}
              {z.aforo_max ? <span className="text-text-3 text-xs font-normal"> / {z.aforo_max}</span> : null}
            </p>
          </>
        )}
      </div>

      {/* Una zona recién añadida no tiene nada que enseñar todavía: ni aforo,
          ni actividades, ni sitio en el plano. Enseñarle «Sin actividades · no
          está en el plano» antes de que tenga nombre es regañar a alguien por
          no haber terminado de escribir. */}
      {!nueva && (
        <>
          {pct != null && (
            <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mt-2.5">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: enLlamas ? '#F97316' : nivel.color }} />
            </div>
          )}

          <button onClick={onSelect}
            className="w-full text-left flex items-center gap-2 flex-wrap mt-2.5 text-[11px] text-text-3 hover:text-text-2 transition-colors">
            {editable && <span className="tabular-nums text-text-2">{z.dentro}{z.aforo_max ? ` / ${z.aforo_max}` : ''} dentro</span>}
            {editable && <span>·</span>}
            <span>{actividades === 0 ? 'Sin actividades' : `${actividades} ${actividades === 1 ? 'actividad' : 'actividades'}`}</span>
            <span>·</span>
            <span>{stands === 0 ? 'Sin stands' : `${stands} ${stands === 1 ? 'stand' : 'stands'}`}</span>
            {!z._enPlano && (<><span>·</span><span className="text-warning">No está en el plano</span></>)}
            {z.excedido > 0 && (<><span>·</span><span className="text-danger font-semibold">+{z.excedido} por encima</span></>)}
            <span className="ml-auto text-primary-light">{activa ? 'Ocultar' : 'Ver zona'} →</span>
          </button>
        </>
      )}
    </div>
  );
}

/* A dónde se va desde aquí.
 *
 * Son enlaces y no formularios a propósito: mientras la administración siga
 * viviendo en Accesos e ingresos, duplicarla aquí sería volver a tener dos
 * dueños del mismo dato — que es justo lo que se acaba de quitar del mapa. */
function Acciones({ evento, z, puedeAgenda, puedeStands }) {
  const base = `/eventos/${evento.id}?s=espacio`;
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-3.5 space-y-2">
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Ir a</p>
      <Enlace to={`${base}&t=mapa`} texto={z._enPlano ? 'Mover en el plano' : 'Colocar en el plano'} nota="Mapa del evento" />
      <Enlace to={`${base}&t=aforo`} texto="Operar y tomar reporte" nota="Aforo por zonas" />
      {/* Asignar ya se hace arriba, desde la zona. Estos dos enlaces se quedan
          para lo que aquí NO se puede hacer: crear la actividad o el stand que
          todavía no existe. Sólo se ofrecen a quien no puede asignar desde
          aquí; a quien sí, serían dos caminos al mismo sitio. */}
      {!puedeAgenda && <Enlace to={`${base}&t=calendario`} texto="Programar una actividad" nota="Calendario · campo «Zona del plano»" />}
      {!puedeStands && <Enlace to={`${base}&t=stands`} texto="Montar un stand" nota="Stands · campo «Zona del plano»" />}
      <Enlace to={`${base}&t=calendario`} texto="Crear una actividad nueva" nota="Calendario" />
      <Enlace to={`${base}&t=accesos`} texto="Puertas del recinto" nota="Accesos e ingresos" />
    </div>
  );
}

/* Colgar cosas de una zona, y descolgarlas.
 *
 * Es la mitad que faltaba: hasta ahora una actividad elegía su zona y un stand
 * elegía la suya, y desde la zona no se podía conectar nada. Los dos casos son
 * el mismo problema —una lista de lo que ya está y un desplegable con lo que
 * se puede añadir— así que es un solo componente y no dos parecidos.
 *
 * El desplegable dice «en otra zona» cuando corresponde, en vez de esconder
 * esos ítems: mover una charla de la Sala A a la Sala B es una cosa
 * perfectamente normal, y ocultarla obligaría a ir a buscarla al Calendario.
 */
function Colgar({ titulo, vacio, dentro, fuera, etiqueta, nota, onMeter, onSacar, ocupando }) {
  const [abierto, setAbierto] = useState('');

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-3.5 space-y-2">
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{titulo}</p>

      {dentro.length === 0
        ? <p className="text-xs text-text-3">{vacio}</p>
        : (
          <ul className="space-y-1">
            {dentro.map(it => (
              <li key={it.id} className="flex items-center gap-2 text-sm text-text-1">
                <span className="flex-1 min-w-0 truncate">{etiqueta(it)}</span>
                <button onClick={() => onSacar(it.id)} disabled={ocupando}
                  title="Quitar de esta zona"
                  className="text-[11px] text-text-3 hover:text-danger transition-colors flex-shrink-0 disabled:opacity-40">
                  quitar
                </button>
              </li>
            ))}
          </ul>
        )}

      {fuera.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <select value={abierto} onChange={e => setAbierto(e.target.value)}
            disabled={ocupando} className="input !h-9 text-sm flex-1 min-w-0">
            <option value="">Añadir…</option>
            {fuera.map(it => (
              <option key={it.id} value={it.id}>
                {etiqueta(it)}{nota(it) ? ` — ${nota(it)}` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={async () => { const id = abierto; setAbierto(''); await onMeter(id); }}
            disabled={ocupando || !abierto}
            className="btn-secondary btn-sm flex-shrink-0">
            Añadir
          </button>
        </div>
      )}
    </div>
  );
}

function Enlace({ to, texto, nota }) {
  return (
    <Link to={to} className="block rounded-xl px-2.5 py-2 hover:bg-surface-2/60 transition-colors">
      <p className="text-sm text-text-1">{texto} <span className="text-text-3">→</span></p>
      <p className="text-[11px] text-text-3">{nota}</p>
    </Link>
  );
}
