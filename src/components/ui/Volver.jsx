import { Link } from 'react-router-dom';

/* La forma de volver, una sola vez.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * Había dieciséis vueltas atrás escritas a mano, cada una con su propio texto
 * y su propio aspecto: «← Volver a explorar» seis veces, «← Volver a vacantes»
 * dos, «← Volver al preview», «← Volver al evento», «← Volver a eventos»,
 * «Atrás», «Volver». Ninguna decidida en conjunto.
 *
 * Y lo que peor se veía no era la repetición: era **la flecha escrita dentro
 * del texto**. Un «←» tecleado en la cadena no es un icono, es un carácter que
 * hereda el interlineado de la fuente, se descuadra respecto a la palabra y
 * cambia de grosor según el sistema. Aquí la flecha es un `svg` que se alinea
 * con la línea base como cualquier otro icono de la interfaz.
 *
 * ── Lo que este componente NO hace, a propósito ──────────────────────────
 *
 * **No llama a `history.back()`.** Volver atrás en el historial devuelve a
 * donde estabas, que no siempre es donde quieres ir: quien llega a la página de
 * un torneo desde una búsqueda no tiene «atrás», y quien entra a editar un
 * stand desde tres sitios distintos acabaría en tres sitios distintos. Cada uso
 * declara **a dónde va**, y por eso el texto dice el destino y no la dirección.
 *
 * Un «atrás» a secas se queda para el único caso en que significa algo: los
 * pasos de un asistente, donde el paso anterior es un sitio concreto.
 */

const Flecha = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 19l-7-7 7-7" />
  </svg>
);

/* `a` para una ruta, `onClick` para volver dentro de la misma pantalla —una
   ficha que se cierra, un editor que vuelve a su lista—. Son los dos casos que
   existían y por eso son los dos que se aceptan; pedir siempre una ruta
   obligaría a inventar URLs para estados que no las tienen. */
export default function Volver({ a, onClick, children, tono = 'suave', className = '' }) {
  const estilos = {
    /* Dentro de una pantalla: no compite con lo que se está haciendo. */
    suave: 'text-sm text-text-2 hover:text-text-1',
    /* Cuando es la única salida —un error, un vacío—, tiene que verse. */
    chip: 'text-sm text-text-2 hover:text-text-1 px-4 py-2 rounded-full border border-border hover:bg-surface-2',
    /* El menú lateral tiene su propia paleta oscura, fija y distinta del resto
       de la interfaz: sus grises no salen de los tokens del tema. */
    menu: 'w-full text-left px-3 py-1.5 text-[11px] text-slate-400 hover:text-white',
  };
  const clases = `inline-flex items-center gap-1.5 transition-colors ${estilos[tono] || estilos.suave} ${className}`;

  if (a) return <Link to={a} className={clases}><Flecha />{children}</Link>;
  return <button type="button" onClick={onClick} className={clases}><Flecha />{children}</button>;
}
