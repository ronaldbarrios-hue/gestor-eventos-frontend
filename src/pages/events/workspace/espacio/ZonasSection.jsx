import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { clientesApi } from '../../../../api/clientes.js';
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
 * Todo lo de aquí sale de UNA petición, `mapa/vivo`, que ya devolvía zonas con
 * ocupación, agenda y stands en una sola llamada y hasta ahora sólo consumía
 * el tablero de aforo. La ficha de la derecha es literalmente el mismo
 * `DetalleMarcador` de ese tablero: si allí se ve bien, aquí también.
 */

export default function ZonasSection({ evento }) {
  const [zonas, setZonas] = useState(null);
  const [sel, setSel] = useState(null);
  const [ultimo, setUltimo] = useState(null);
  const [fallo, setFallo] = useState('');
  const vivoRef = useRef(true);

  useEffect(() => () => { vivoRef.current = false; }, []);

  /* Las zonas configuradas, que es la lista de verdad. `mapa/vivo` sólo trae
     las que tienen movimiento, así que una zona recién creada no aparecería
     y parecería que no existe. */
  const configuradas = useMemo(() => zonasDelEvento(evento), [evento]);

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

  /* Cada zona configurada con lo que se sepa de ella en vivo. La configurada
     manda: si el endpoint no la trae todavía, sale en ceros en vez de
     desaparecer. */
  const filas = useMemo(() => {
    const vivo = new Map((zonas || []).map(z => [z.id, z]));
    return configuradas.map(c => ({
      ...(vivo.get(c.id) || { id: c.id, nombre: c.nombre, dentro: 0, entradas: 0, salidas: 0, excedido: 0, agenda: [], ahora: [], stands: [] }),
      nombre: c.nombre,
      aforo_max: c.aforo_max ?? null,
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
            Cada zona con su aforo en vivo, lo que ocurre dentro y los stands que hay montados.
          </p>
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
          <p className="text-xs text-text-3 mt-1.5">
            Se crean en <b>Accesos e ingresos</b>, junto a las puertas.
          </p>
          <Link to={`/eventos/${evento.id}?s=espacio&t=accesos`} className="btn-primary btn-sm mt-4 inline-block">
            Crear la primera zona
          </Link>
        </div></div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
          <div className="space-y-2">
            {filas.map(z => (
              <FilaZona key={z.id} z={z} activa={z.id === sel}
                onSelect={() => setSel(z.id === sel ? null : z.id)} />
            ))}
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
                <Acciones evento={evento} z={seleccionada} />
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
function FilaZona({ z, activa, onSelect }) {
  const nivel = nivelDeZona(z);
  const enLlamas = estaEnLlamas(z);
  const pct = z.aforo_max ? Math.min(100, Math.round((z.dentro / z.aforo_max) * 100)) : null;
  const actividades = (z.agenda || []).length;
  const stands = (z.stands || []).length;

  return (
    <button onClick={onSelect}
      className={`w-full text-left rounded-2xl border p-3.5 transition-colors ${
        activa ? 'border-primary-light bg-surface-2/60' : 'border-border bg-surface/40 hover:bg-surface-2/40'
      }`}>
      <div className="flex items-center gap-3">
        {enLlamas
          ? <span className="text-orange-500 flex-shrink-0"><IconoLlama className="w-4 h-4" /></span>
          : <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: nivel.color }} />}
        <p className="font-medium text-text-1 flex-1 min-w-0 truncate">{z.nombre}</p>
        <p className="text-sm font-bold font-display tabular-nums text-text-1 flex-shrink-0">
          {z.dentro}
          {z.aforo_max ? <span className="text-text-3 text-xs font-normal"> / {z.aforo_max}</span> : null}
        </p>
      </div>

      {pct != null && (
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mt-2.5">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: enLlamas ? '#F97316' : nivel.color }} />
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap mt-2.5 text-[11px] text-text-3">
        <span>{actividades === 0 ? 'Sin actividades' : `${actividades} ${actividades === 1 ? 'actividad' : 'actividades'}`}</span>
        <span>·</span>
        <span>{stands === 0 ? 'Sin stands' : `${stands} ${stands === 1 ? 'stand' : 'stands'}`}</span>
        {!z._enPlano && (<><span>·</span><span className="text-warning">No está en el plano</span></>)}
        {z.excedido > 0 && (<><span>·</span><span className="text-danger font-semibold">+{z.excedido} por encima</span></>)}
      </div>
    </button>
  );
}

/* A dónde se va desde aquí.
 *
 * Son enlaces y no formularios a propósito: mientras la administración siga
 * viviendo en Accesos e ingresos, duplicarla aquí sería volver a tener dos
 * dueños del mismo dato — que es justo lo que se acaba de quitar del mapa. */
function Acciones({ evento, z }) {
  const base = `/eventos/${evento.id}?s=espacio`;
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-3.5 space-y-2">
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Ir a</p>
      <Enlace to={`${base}&t=accesos`} texto="Editar nombre y aforo" nota="Accesos e ingresos" />
      <Enlace to={`${base}&t=mapa`} texto={z._enPlano ? 'Mover en el plano' : 'Colocar en el plano'} nota="Mapa del evento" />
      <Enlace to={`${base}&t=aforo`} texto="Operar y tomar reporte" nota="Aforo por zonas" />
      <Enlace to={`${base}&t=calendario`} texto="Programar una actividad aquí" nota="Calendario · campo «Zona del plano»" />
      <Enlace to={`${base}&t=stands`} texto="Montar un stand aquí" nota="Stands · campo «Zona del plano»" />
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
