/* Con quién empieza un formulario público.
 *
 * ── El hueco que tapa ────────────────────────────────────────────────────
 *
 * Los formularios públicos nacían con `{ nombre: '', email: '', telefono: '' }`
 * SIEMPRE — incluido cuando quien está mirando tiene su sesión abierta y esos
 * tres datos ya están en el contexto de la aplicación. Se los escribía otra
 * vez, a mano, en el móvil, con el teclado tapando media pantalla.
 *
 * Es el hueco más común de todos los de heredar datos: no hace falta ni boleta
 * ni padrón ni código, sólo haber entrado.
 *
 * ── Por qué queda editable ───────────────────────────────────────────────
 *
 * Porque quien tiene la cuenta no siempre es quien va: se compran boletas para
 * la pareja, para un hijo, para el equipo. Se rellena y se puede cambiar —eso
 * ahorra el trabajo sin decidir por nadie—. Bloquearlo convertiría un atajo en
 * una trampa.
 *
 * ── Y por qué el nombre puede venir siendo el correo ─────────────────────
 *
 * `mapUser` cae a `user.email` cuando no hay nombre en los metadatos. Poner un
 * correo en la casilla «Nombre completo» se ve como un dato bueno y no lo es:
 * quien lo mire por encima lo da por rellenado y manda su correo como nombre.
 * Así que ese caso se deja vacío a propósito.
 */

export function datosIniciales(usuario) {
  const vacio = { nombre: '', email: '', telefono: '' };
  if (!usuario) return vacio;

  const email = (usuario.email || '').trim();
  const nombre = (usuario.nombre || '').trim();

  return {
    /* El nombre sólo si es un nombre de verdad. Ver arriba. */
    nombre: nombre && nombre.toLowerCase() !== email.toLowerCase() ? nombre : '',
    email,
    telefono: (usuario.telefono || '').trim(),
  };
}

/* ¿Se rellenó algo? Sirve para poder decírselo a quien mira —«son tus datos,
   cámbialos si la boleta es para otra persona»— en vez de que aparezcan
   escritos sin explicación, que es lo que hace dudar de si se envió algo. */
export function seRellenoAlgo(datos) {
  return Boolean(datos && (datos.nombre || datos.email || datos.telefono));
}
