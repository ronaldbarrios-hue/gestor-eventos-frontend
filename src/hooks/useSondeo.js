import { useEffect, useRef } from 'react';

/**
 * Sondeo que se calla cuando nadie está mirando.
 *
 * ── El problema que resuelve ──────────────────────────────────────────────
 *
 * Las pantallas de aforo y accesos piden datos cada 5 y 8 segundos con un
 * `setInterval` pelado. Eso son 720 y 450 peticiones por hora **por pestaña
 * abierta**, las haga falta o no: un portátil de la organización con la
 * pantalla abierta toda la noche sondea igual que uno en uso, y en una jornada
 * con varias personas y varias pestañas la cuenta se dispara a decenas de miles.
 *
 * Aquí se corrigen las tres cosas que fallaban:
 *
 * · **Se para si la pestaña no se ve.** `visibilitychange` no se usaba en
 *   ninguna parte del frontend. Una pestaña de fondo no necesita datos frescos:
 *   los necesita cuando alguien vuelve a ella, y entonces se piden de una.
 * · **No se solapan.** Si una petición tarda más que el intervalo, el
 *   `setInterval` lanza la siguiente igual y se encadenan. Aquí cada ciclo
 *   espera a que termine el anterior.
 * · **La función puede cambiar sin reiniciar el reloj.** Guardada en una ref,
 *   así que pasarle una función nueva en cada render no reinicia el intervalo
 *   ni dispara una petición extra.
 *
 * Al volver a la pestaña se refresca en el acto, que es justo cuando importa.
 *
 * @param {Function} tarea     lo que se ejecuta en cada pulso (puede ser async)
 * @param {number}   cadaMs    milisegundos entre pulsos
 * @param {boolean}  activo    permite pararlo desde fuera (el botón "en vivo")
 */
export function useSondeo(tarea, cadaMs, activo = true) {
  const tareaRef = useRef(tarea);
  tareaRef.current = tarea;

  useEffect(() => {
    if (!activo || !cadaMs) return undefined;

    let vivo = true;
    let temporizador = null;
    let enCurso = false;

    const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

    const pulso = async () => {
      /* Si la anterior sigue en el aire, este pulso se salta. Encadenar
         peticiones lentas es cómo un sondeo de 5 s acaba haciendo tres a la vez
         contra un servidor que ya va justo. */
      if (enCurso || !visible()) return;
      enCurso = true;
      try { await tareaRef.current(); } catch { /* la pantalla ya muestra su error */ }
      finally { enCurso = false; }
    };

    const arrancar = () => {
      if (temporizador) return;
      temporizador = setInterval(pulso, cadaMs);
    };
    const parar = () => {
      if (!temporizador) return;
      clearInterval(temporizador);
      temporizador = null;
    };

    const alCambiarVisibilidad = () => {
      if (!vivo) return;
      if (visible()) {
        /* Al volver, los datos de la pantalla son viejos: se piden ya, sin
           esperar al siguiente pulso. */
        pulso();
        arrancar();
      } else {
        parar();
      }
    };

    if (visible()) arrancar();
    document.addEventListener('visibilitychange', alCambiarVisibilidad);

    return () => {
      vivo = false;
      parar();
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    };
  }, [cadaMs, activo]);
}

/**
 * Agrupa muchas señales en una sola llamada.
 *
 * Para lo que llega por tiempo real: si en la puerta se escanean cien boletas
 * en un minuto, cada pantalla abierta recibe cien avisos, y si cada aviso
 * dispara una petición son cien peticiones **por pantalla**. Con N pantallas y
 * M escaneos, N×M — que es el multiplicador que llenó los registros.
 *
 * Agrupando, cien avisos seguidos son una sola petición. El número que se ve en
 * pantalla llega con un segundo de retraso como mucho, que para un contador de
 * aforo no lo nota nadie.
 *
 * @param {Function} tarea    qué ejecutar
 * @param {number}   esperaMs cuánto agrupar
 */
export function useAgrupado(tarea, esperaMs = 1200) {
  const tareaRef = useRef(tarea);
  tareaRef.current = tarea;
  const temporizador = useRef(null);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  return useRef((...args) => {
    if (temporizador.current) return;   // ya hay una programada: este aviso se suma a ella
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      try { tareaRef.current(...args); } catch { /* la pantalla ya muestra su error */ }
    }, esperaMs);
  }).current;
}
