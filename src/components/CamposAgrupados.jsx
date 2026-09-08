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
  let anterior = null;
  return campos.map((c) => {
    const abre = c.grupo && c.grupo !== anterior;
    anterior = c.grupo || null;
    return (
      <div key={c.id} className="contents">
        {abre && (
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mt-4 mb-1">
            {c.grupo}
          </p>
        )}
        {render(c)}
      </div>
    );
  });
}
