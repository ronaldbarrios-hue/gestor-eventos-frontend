import { Fragment } from 'react';

/* Los campos de un formulario, con su título de grupo cuando cambia.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * `grupo` es una columna de `event_form_fields` desde la 0055 y la usan los
 * tres formularios — el del evento, el de un sub-evento y el de un torneo—
 * porque las preguntas de los tres viven en la misma tabla. Pero sólo el
 * formulario del evento la PINTABA: en la inscripción a un sub-evento y en la
 * ficha de un equipo, veinte preguntas salían en una sola tirada sin ninguna
 * separación.
 *
 * Así que el editor no ofrecía el grupo ahí — con razón: un campo que se
 * guarda y no cambia nada es peor que no tenerlo, porque quien lo llena cree
 * que hizo algo. Esto es la mitad que faltaba para poder ofrecerlo.
 *
 * El título sale cuando el grupo CAMBIA respecto al campo anterior, no una vez
 * por grupo: así respeta el orden que puso el organizador en vez de reordenar
 * por su cuenta. Si alguien intercala «Datos de la empresa» dos veces, salen
 * dos títulos — que es exactamente lo que se ve en el editor.
 */
export default function CamposAgrupados({ campos = [], render }) {
  /* Sin envoltorio, y no por elegancia.
   *
   * La primera versión metía cada campo en un `<div className="contents">`.
   * Parece inocuo —`display: contents` no dibuja caja— y ahí está el problema:
   * los contenedores de los dos formularios usan `space-y-*`, que en Tailwind
   * es `> :not([hidden]) ~ :not([hidden]) { margin-top }`. El selector SÍ
   * casaba con el envoltorio, pero un elemento con `display: contents` no
   * genera caja, así que ese margen no se aplica a nada.
   *
   * Medido en Chromium: 0px con el envoltorio, 16px sin él. O sea, todas las
   * preguntas pegadas unas a otras. Un fallo puramente visual que ninguna
   * prueba de las de aquí habría visto.
   *
   * `Fragment` no genera nodo DOM, así que el elemento que devuelve `render`
   * es hijo directo del contenedor y el espaciado vuelve a funcionar. */
  let anterior = null;
  return campos.flatMap((c) => {
    const abre = c.grupo && c.grupo !== anterior;
    anterior = c.grupo || null;
    const campo = <Fragment key={c.id}>{render(c)}</Fragment>;
    if (!abre) return [campo];
    return [
      <p key={`grupo-${c.id}`}
        className="text-[11px] uppercase tracking-widest text-text-3 font-semibold pt-2">
        {c.grupo}
      </p>,
      campo,
    ];
  });
}
