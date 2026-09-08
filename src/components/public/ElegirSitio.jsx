import { useCallback, useEffect, useRef, useState } from 'react';
import { planoApi, sesionDelCarrito } from '../../api/espacios.js';

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
 * ── Por qué una lista y no un plano dibujado ─────────────────────────────
 *
 * Porque esto empieza por palcos y mesas —decenas de unidades—, donde una lista
 * se lee mejor que un plano, funciona en cualquier móvil y no depende de que
 * alguien haya dibujado nada. El plano SVG viene después sobre los mismos
 * datos; lo que hay debajo no cambia.
 */

export default function ElegirSitio({ slug, ticketTypeId, valor, onElegir, onError }) {
  const [mapa, setMapa] = useState(null);        // null = cargando
  const [seccion, setSeccion] = useState('');
  const seccionRef = useRef('');
  seccionRef.current = seccion;
  const [tomando, setTomando] = useState('');
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
        /* Se abre por la primera que tenga sitios libres, no por la primera a
           secas: empezar en una sección agotada parece que no queda nada. */
        const conSitio = d.secciones.find(s => s.libres > 0) || d.secciones[0];
        setSeccion(conSitio?.id || '');
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

      {secciones.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {secciones.map(s => (
            <button key={s.id} type="button" onClick={() => setSeccion(s.id)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors
                ${seccion === s.id ? 'border-accent bg-accent/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
              {s.nombre}
              <span className="text-text-3"> · {s.libres}</span>
            </button>
          ))}
        </div>
      )}

      {libres.length === 0 ? (
        <p className="text-xs text-warning">
          No quedan sitios libres {secciones.length > 1 ? 'en esta zona' : ''}. {secciones.length > 1 && 'Prueba en otra.'}
        </p>
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
