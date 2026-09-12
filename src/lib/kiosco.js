import { useEffect, useRef, useState } from 'react';

/* Modo kiosco: la landing del evento en una pantalla táctil del recinto.
 *
 * ── Qué cambia respecto a la misma página en un móvil ────────────────────
 *
 * La pantalla no es de nadie. Se usa de pie, en treinta segundos, y detrás hay
 * alguien esperando. De ahí las tres diferencias:
 *
 * 1. **Vuelve sola al inicio.** Quien se va a mitad de un formulario no cierra
 *    nada: se da la vuelta y se marcha. Sin esto, sus datos se quedan en
 *    pantalla para el siguiente.
 * 2. **Avisa antes de volver.** Una pantalla que se reinicia sin avisar corta a
 *    quien está leyendo o tecleando despacio, y eso se lee como que se colgó.
 *    Quince segundos de cuenta atrás, y tocar la cancela.
 * 3. **No deja rastro.** Es lo que se encontró al mirarlo: el formulario guarda
 *    el progreso en `localStorage` para que quien recarga no pierda lo escrito.
 *    En una pantalla compartida eso es peor que dejarlo a la vista — sobrevive
 *    al reinicio, y el siguiente abre el formulario con el nombre y el correo
 *    del anterior ya puestos. En kiosco, no se guarda.
 *
 * Se enciende con `?kiosco=1` en la URL de la landing. Un parámetro y no una
 * ruta aparte a propósito: es la MISMA página, y una ruta gemela sería otra
 * copia que mantener —el patrón que este proyecto ya ha pagado varias veces—.
 */

export const esKiosco = (params) => {
  const v = params?.get?.('kiosco');
  return v === '1' || v === 'true' || v === 'si';
};

/* Segundos sin tocar antes de volver al inicio, y cuántos de aviso.
 *
 * 60 y 15 están medidos contra lo que pasa delante de una pantalla así: rellenar
 * un campo largo con teclado en pantalla puede pasar de 30 segundos sin ningún
 * evento —se teclea dentro del mismo campo y no siempre se dispara `input`—, y
 * 15 de aviso dan tiempo a levantar la mano y tocar. */
export const INACTIVIDAD = 60;
export const AVISO = 15;

/* Llama a `alVolver` cuando la pantalla lleva un rato sin que nadie la toque.
 *
 * Devuelve los segundos que faltan mientras está avisando, o `null` si no toca
 * avisar todavía. Quien lo usa decide cómo pintar la cuenta atrás; esto sólo
 * cuenta.
 *
 * Los eventos se escuchan en captura y con `passive`: en captura para enterarse
 * aunque algo dentro pare la propagación, y `passive` para no retrasar el
 * desplazamiento con el dedo. */
export function useVueltaAlInicio({ activo, alVolver, inactividad = INACTIVIDAD, aviso = AVISO }) {
  const [quedan, setQuedan] = useState(null);
  const ultimoToque = useRef(Date.now());
  /* En una `ref` y no en el estado: `alVolver` suele ser una función nueva en
     cada render, y meterla en las dependencias reiniciaría el temporizador en
     cada latido — o sea, no volvería nunca. */
  const volver = useRef(alVolver);
  volver.current = alVolver;

  useEffect(() => {
    if (!activo) { setQuedan(null); return undefined; }

    const tocar = () => { ultimoToque.current = Date.now(); setQuedan(null); };
    const eventos = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];
    for (const e of eventos) window.addEventListener(e, tocar, { capture: true, passive: true });

    const reloj = setInterval(() => {
      const pasados = (Date.now() - ultimoToque.current) / 1000;
      const restan = Math.ceil(inactividad - pasados);
      if (restan <= 0) { ultimoToque.current = Date.now(); setQuedan(null); volver.current?.(); }
      else if (restan <= aviso) setQuedan(restan);
    }, 1000);

    return () => {
      clearInterval(reloj);
      for (const e of eventos) window.removeEventListener(e, tocar, { capture: true });
    };
  }, [activo, inactividad, aviso]);

  return quedan;
}
