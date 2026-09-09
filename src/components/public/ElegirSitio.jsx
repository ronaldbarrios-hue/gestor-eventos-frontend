import { useCallback, useEffect, useRef, useState } from 'react';
import { planoApi, sesionDelCarrito } from '../../api/espacios.js';
import PlanoSVG, { LeyendaDePrecios, centroDe } from './PlanoSVG.jsx';

/* Elegir una silla, una mesa o un palco antes de comprar.
 *
 * ── El reloj es la mitad del asunto ──────────────────────────────────────
 *
 * Al elegir un sitio se RETIENE, y la retención caduca. Eso hay que enseñarlo:
 * quien rellena un formulario largo sin saber que hay un plazo se encuentra con
 * «se acabó el tiempo» al final, cuando ya escribió todo. El contador no es un
 * adorno — es la diferencia entre entenderlo y sentirse estafado.
 *
 * ── Y soltar lo que no se usa ────────────────────────────────────────────
 *
 * Cerrar el formulario devuelve la silla. Sin eso, cada persona que se lo
 * piensa deja un sitio bloqueado diez minutos: en una preventa, el mapa se ve
 * en rojo sin una sola venta hecha.
 *
 * ── Los dos niveles del mapa ─────────────────────────────────────────────
 *
 * Nadie elige entre dos mil sillas a la vez. Si los bloques del recinto tienen
 * forma dibujada, primero se ve el recinto entero pintado por precio, se toca
 * un bloque, y sólo entonces aparecen sus sillas. Es el gesto que ya conoce
 * cualquiera que haya comprado una entrada.
 *
 * Y si nadie ha dibujado el recinto, no pasa nada: quedan las pastillas de
 * texto y la lista, que se leen en cualquier móvil y con veinte mesas son
 * mejores que un plano. El plano es una forma de elegir, no la única.
 */

/* El precio en la leyenda, corto. Un mapa con «450.000,00 COP» ocho veces es
   ilegible; lo que hace falta es distinguir el rojo del azul de un vistazo.
   Gratis se dice con la palabra: «0» al lado de un color no se lee como
   gratis. */
function precioCorto(precio, currency) {
  const n = Number(precio);
  if (!Number.isFinite(n)) return '';
  if (n === 0) return 'Gratis';
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)} ${currency || 'COP'}`;
}

export default function ElegirSitio({ slug, ticketTypeId, valor, onElegir, onError }) {
  const [mapa, setMapa] = useState(null);        // null = cargando
  const [seccion, setSeccion] = useState('');
  const seccionRef = useRef('');
  seccionRef.current = seccion;
  const [tomando, setTomando] = useState('');
  /* Lista o plano. Arranca en lista a propósito: se lee en cualquier móvil, no
     depende de que nadie haya dibujado nada, y con veinte mesas es mejor que un
     plano. El plano se ofrece cuando hay coordenadas y hay bastantes sitios
     como para que buscar uno en una lista canse. */
  const [comoPlano, setComoPlano] = useState(false);
  const [expira, setExpira] = useState(null);
  const sesion = useRef(sesionDelCarrito()).current;

  /* Para soltar al desmontar sin que el efecto se vuelva a montar en cada
     cambio. Con `valor` en las dependencias, elegir una silla soltaría la que
     se acaba de elegir. */
  const elegido = useRef(null);
  elegido.current = valor;

  const cargar = useCallback(async () => {
    try {
      const d = await planoApi.mapa(slug);
      setMapa(d);
      if (d.hay_plano && d.secciones?.length && !seccionRef.current) {
        /* Si el recinto está dibujado, se abre POR EL RECINTO: sección vacía es
           «enséñame el mapa entero». Elegir una sección por él sería saltarse
           el primer nivel, que es justo donde se decide qué zona quiere.

           Y si no hay recinto dibujado, se abre por la primera sección que
           tenga sitios libres —no por la primera a secas—: empezar en una
           agotada parece que no queda nada. */
        const dibujado = d.secciones.filter(x => (x.geometria?.puntos || []).length >= 3);
        if (dibujado.length <= 1) {
          const conSitio = d.secciones.find(x => x.libres > 0) || d.secciones[0];
          setSeccion(conSitio?.id || '');
        }
      }
    } catch (e) {
      onError?.(e.response?.data?.error || e.message);
      setMapa({ hay_plano: false, unidades: [], secciones: [] });
    }
    /* La sección elegida se lee por `ref` y no por dependencia: si fuera
       dependencia, elegir una sección volvería a pedir el mapa entero al
       servidor en cada clic. Sólo se usa para no pisar la que ya eligió. */
  }, [slug, onError]);

  useEffect(() => { cargar(); }, [cargar]);

  /* Soltar al salir. Es lo que hace que el mapa vuelva a estar disponible
     cuando alguien cierra el formulario sin comprar. */
  useEffect(() => () => {
    if (elegido.current) planoApi.soltar(slug, elegido.current, sesion).catch(() => {});
  }, [slug, sesion]);

  const tomar = async (u) => {
    if (tomando) return;
    setTomando(u.id);
    try {
      /* Soltar la anterior antes de tomar otra: sin esto, cambiar de opinión
         tres veces deja tres sillas bloqueadas diez minutos cada una. */
      if (valor && valor !== u.id) await planoApi.soltar(slug, valor, sesion).catch(() => {});
      const r = await planoApi.retener(slug, u.id, sesion);
      setExpira(r.expira_at ? new Date(r.expira_at) : null);
      onElegir({ id: u.id, nombre: u.nombre, sesion });
      /* Se recarga el mapa: mientras esta persona decidía, otras han comprado.
         Enseñar el mapa de hace tres minutos hace que la siguiente elección
         falle sin motivo aparente. */
      cargar();
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      onError?.(msg);
      /* Si la tomó otro, el mapa que se está viendo ya es viejo. */
      cargar();
    } finally { setTomando(''); }
  };

  if (mapa === null) {
    return <p className="text-xs text-text-3 py-3">Cargando los sitios disponibles…</p>;
  }
  /* Sin plano no hay nada que elegir: el evento se vende por aforo, que es lo
     normal. No se enseña ni un hueco. */
  if (!mapa.hay_plano) return null;

  /* Sólo lo que abre esta boleta. Enseñar la platea a quien compra gradería
     sería ofrecerle algo que el servidor le va a rechazar al pagar. */
  const mias = mapa.unidades.filter(u => !ticketTypeId || u.ticket_type_id === ticketTypeId);
  const secciones = (mapa.secciones || []).filter(s => mias.some(u => u.parent_id === s.id));
  const enSeccion = mias.filter(u => !seccion || u.parent_id === seccion);
  const libres = enSeccion.filter(u => u.libre);
  const hayGeometria = enSeccion.some(u => u.geometria?.x != null);

  /* El color de cada silla es el de su localidad, no el suyo: cambiar el precio
     de «Platea» repinta sus dos mil sillas de una vez. */
  const colorDeLocalidad = new Map((mapa.localidades || []).map(l => [l.id, l.color]));
  const colorDe = (u) => colorDeLocalidad.get(u.ticket_type_id) || null;

  /* Los bloques dibujables de ESTA boleta, con su cuenta de libres encima.
     Un bloque sin forma no entra: pintar un rectángulo inventado donde no se
     dibujó nada es peor que no dibujarlo. */
  const bloques = secciones
    .filter(s => (s.geometria?.puntos || []).length >= 3)
    .map(s => {
      const dentro = mias.filter(u => u.parent_id === s.id);
      /* El color del bloque es el de la localidad de sus sillas. Si tiene
         varias, se queda sin color y se pinta neutro: inventar cuál de los tres
         precios representa el bloque haría mentir a la leyenda. */
      const colores = new Set(dentro.map(colorDe).filter(Boolean));
      return {
        ...s,
        libres: dentro.filter(u => u.libre).length,
        color: colores.size === 1 ? [...colores][0] : null,
        centro: centroDe(s.geometria),
      };
    });

  /* El primer nivel sólo tiene sentido con más de un bloque dibujado: con uno
     solo, obligar a tocarlo para ver sus sillas es un clic de peaje. */
  const hayRecinto = bloques.length > 1;
  const verRecinto = hayRecinto && !seccion;

  if (!mias.length) {
    return (
      <p className="text-xs text-warning py-3">
        Esta boleta no tiene sitios asignados en el plano todavía. Escribe a quien organiza.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <label className="label text-xs">Elige tu sitio</label>
        {valor && <Cuenta expira={expira} />}
      </div>

      {/* Nivel 1: el recinto. Se toca un bloque y se entra en sus sillas. */}
      {verRecinto ? (
        <>
          <p className="text-xs text-text-2">Toca la zona donde quieres sentarte.</p>
          <PlanoSVG bloques={bloques} onBloque={(b) => b?.libres > 0 && setSeccion(b.id)} alto={420} />
          <LeyendaDePrecios localidades={mapa.localidades} formato={precioCorto} />
        </>
      ) : (
        <>
          {/* La vuelta al recinto. Sin ella, entrar en una zona es un callejón
              sin salida: hay que recargar la página para ver el mapa otra vez. */}
          {hayRecinto && (
            <button type="button" onClick={() => setSeccion('')}
              className="text-[11px] text-accent hover:underline">
              ← Ver todo el recinto
            </button>
          )}

          {secciones.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {secciones.map(s2 => (
                <button key={s2.id} type="button" onClick={() => setSeccion(s2.id)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors
                    ${seccion === s2.id ? 'border-accent bg-accent/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
                  {s2.nombre}
                  <span className="text-text-3"> · {s2.libres}</span>
                </button>
              ))}
            </div>
          )}

          {/* El plano sólo se ofrece si hay algo que dibujar. Un botón «ver
              plano» que abre una cuadrícula sin sentido es peor que no tenerlo. */}
          {hayGeometria && enSeccion.length > 6 && (
            <button type="button" onClick={() => setComoPlano(v => !v)}
              className="text-[11px] text-accent hover:underline ml-3">
              {comoPlano ? 'Ver como lista' : 'Ver el plano'}
            </button>
          )}
        </>
      )}

      {verRecinto ? null : libres.length === 0 ? (
        <p className="text-xs text-warning">
          No quedan sitios libres {secciones.length > 1 ? 'en esta zona' : ''}. {secciones.length > 1 && 'Prueba en otra.'}
        </p>
      ) : comoPlano ? (
        <>
          <PlanoSVG unidades={enSeccion} valor={valor} onElegir={tomar}
            colorDe={colorDe} ocupadoTitulo="ya no está disponible" />
          <LeyendaDePrecios localidades={(mapa.localidades || [])
            .filter(l => enSeccion.some(u => u.ticket_type_id === l.id))} formato={precioCorto} />
        </>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-0.5">
          {enSeccion.map(u => {
            const mio = valor === u.id;
            return (
              <button key={u.id} type="button"
                disabled={(!u.libre && !mio) || Boolean(tomando)}
                onClick={() => tomar(u)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors
                  ${mio ? 'border-accent bg-accent/15 text-text-1 font-medium'
                  : u.libre ? 'border-border text-text-2 hover:border-accent/60'
                  : 'border-border/40 text-text-3 line-through cursor-not-allowed'}`}>
                {tomando === u.id ? '…' : u.nombre}
                {u.capacidad > 1 && <span className="text-text-3"> ·{u.capacidad}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Lo que se cobra es el sitio, y conviene decirlo antes de que alguien
          pulse «pagar» esperando otra cosa. */}
      {valor && (
        <p className="text-[11px] text-text-3">
          Tu sitio queda reservado mientras terminas. Si cierras esta ventana, vuelve a estar disponible.
        </p>
      )}
    </div>
  );
}

/* Cuánto queda.
 *
 * En minutos y segundos, no en «quedan unos minutos»: la diferencia entre 4:59
 * y 0:20 es la que hace que alguien se dé prisa o se lo tome con calma, y es
 * justo lo que hay que comunicar.
 *
 * Al llegar a cero no se hace nada por su cuenta —no se cierra el formulario ni
 * se borra lo escrito—: el servidor rechazará la compra con un mensaje que
 * explica qué pasó y deja volver a elegir. Cerrar de golpe lo escrito por un
 * temporizador del navegador sería peor que el problema. */
function Cuenta({ expira }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    if (!expira) return undefined;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expira]);

  if (!expira) return null;
  const seg = Math.max(0, Math.floor((expira.getTime() - ahora) / 1000));
  const m = Math.floor(seg / 60);
  const s = String(seg % 60).padStart(2, '0');

  return (
    <span className={`text-[11px] tabular-nums ${seg <= 60 ? 'text-danger' : 'text-text-3'}`}>
      {seg === 0 ? 'Se acabó el tiempo — vuelve a elegir' : `Reservado ${m}:${s}`}
    </span>
  );
}
