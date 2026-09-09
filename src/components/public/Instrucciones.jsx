/* Lo que tiene que hacer quien tiene esta boleta.
 *
 * ── Por qué existe, y por qué en un componente ───────────────────────────
 *
 * El evento ya podía poner un mensaje al confirmar —«descarga este QR, te lo
 * pedirán en la entrada»— pero es UNO para todo el evento y se ve UNA vez.
 *
 * Faltaban las dos mitades:
 *
 *   POR BOLETA   con actividades, cada una tiene sus instrucciones. La entrada
 *                general dice «trae tu QR»; la postulación de startup, «te
 *                escribiremos para la sesión de pitch»; el taller, «preséntate
 *                en el laboratorio 2 a las 8». Con un solo texto compartido, o
 *                se escribe el del caso común y los demás se enteran por otro
 *                lado, o se escriben los tres juntos y todo el mundo lee
 *                instrucciones que no le tocan.
 *
 *   EN LA BOLETA el mensaje de confirmación sólo salía en el momento de
 *                registrarse. Quien vuelve tres semanas después desde el correo
 *                —que es cuando de verdad se lee «dónde tengo que
 *                presentarme»— no lo veía.
 *
 * Y en un componente porque lo pintan dos pantallas. Escrito dos veces, una de
 * las dos se queda sin el aviso el día que alguien cambie algo.
 */
export default function Instrucciones({ texto, className = '' }) {
  const limpio = String(texto || '').trim();
  if (!limpio) return null;

  return (
    <div className={`rounded-2xl border border-warning/40 bg-warning/5 px-4 py-3 text-left ${className}`}>
      <p className="text-[10px] uppercase tracking-widest text-warning font-semibold mb-1">
        Antes del evento
      </p>
      {/* Los saltos de línea se respetan: quien escribe «preséntate en X.\nTrae
          tu documento.» está haciendo una lista, y en un párrafo corrido se
          lee como una frase larga que nadie termina. */}
      <p className="text-sm text-text-1 leading-relaxed whitespace-pre-line">{limpio}</p>
    </div>
  );
}
