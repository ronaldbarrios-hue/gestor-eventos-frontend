/* ─────────── El enlace de una sección, una sola vez ───────────
 *
 * ── Por qué esto es un componente y no dos trozos de clases ──────────────
 *
 * Los mismos cinco enlaces se pintaban en dos sitios —la barra de la portada y
 * el marco de las sub-páginas— con clases escritas a mano en cada uno. Y ya
 * habían derivado: el marco marcaba la sección actual invirtiendo el color, y
 * la barra de la portada no marcaba nada. Moverse entre secciones se veía como
 * cambiar de sitio, que es exactamente la queja de origen.
 *
 * ── Por qué el color viene de la marca ───────────────────────────────────
 *
 * `--brand-primary` la pone el evento (`page_json.branding`). Usar el gris del
 * sistema hacía que la barra pareciera una pieza de GESTEK posada encima de la
 * página del organizador — en una plataforma de marca blanca, eso es justo lo
 * que no puede pasar. Ahora la barra se pinta con el color del evento.
 *
 * El activo lleva TINTE, no relleno: un fondo sólido con el color de marca
 * necesita saber si el texto va en blanco o en negro, y eso depende de cada
 * marca. Un borde y un fondo al 12 % se ven bien con cualquier color y en los
 * dos temas. */
export function claseEnlaceSeccion(activo) {
  return `inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors
          flex-shrink-0 whitespace-nowrap border ${activo
    ? 'text-text-1 font-medium'
    : 'border-transparent text-text-2 hover:text-text-1'}`;
}

export function estiloEnlaceSeccion(activo) {
  return activo
    ? {
      borderColor: 'color-mix(in srgb, var(--brand-primary, #C9A227) 55%, transparent)',
      background: 'color-mix(in srgb, var(--brand-primary, #C9A227) 12%, transparent)',
    }
    : undefined;
}
