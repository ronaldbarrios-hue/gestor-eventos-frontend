/* GESTEK — Iconografía propia.

   Un componente y un registro. Los iconos se dibujan sobre rejilla de 24,
   trazo 1.8 y `currentColor`, así que heredan el color y el tamaño del texto
   que los rodea y funcionan igual en claro y en oscuro. Nada de emoji: el
   emoji lo dibuja el sistema operativo, así que el mismo icono se veía plano
   en Windows, de otro color en Android y con relleno propio en iOS — nunca era
   la marca del producto, era la del teléfono.

   Uso:
     <Icono name="charla" />                  16px, hereda color
     <Icono name="trofeo" className="w-5 h-5 text-accent" />
     <Icono name="aviso" titulo="Atención" /> con nombre accesible

   Sin `titulo` el icono es decorativo y se marca aria-hidden, que es lo
   correcto cuando al lado ya va la etiqueta en texto.

   Para añadir uno: una entrada más en TRAZOS. Si el dibujo necesita relleno en
   vez de trazo, se pone `relleno: true`. */

const V = 24;

/* Cada entrada devuelve los elementos internos del <svg>. Se escriben a mano
   sobre la rejilla de 24 para que el peso visual sea parejo entre todos. */
const TRAZOS = {
  /* ── Tipos de sub-evento (lib/espacio.js) ── */
  charla: (
    <>
      <rect x="9.5" y="2.5" width="5" height="10" rx="2.5" />
      <path d="M6 10.5a6 6 0 0 0 12 0" />
      <path d="M12 16.5V21M8.5 21h7" />
    </>
  ),
  taller: (
    <>
      <path d="M14.2 6.2a3.4 3.4 0 0 1 4.6-4.6l-2.5 2.5 2 2 2.5-2.5a3.4 3.4 0 0 1-4.6 4.6" />
      <path d="M16.3 8.2 8.6 15.9" />
      <path d="M7.4 3.5 3.5 7.4l3.2 3.2 2-2 2 2 1.9-1.9z" />
      <path d="M6.6 17.4l-2.1 2.1a1.6 1.6 0 0 0 2.3 2.3l2.1-2.1z" />
    </>
  ),
  panel: (
    <>
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h7A2.5 2.5 0 0 1 15 6.5v4A2.5 2.5 0 0 1 12.5 13H8l-3.5 3v-3.3A2.5 2.5 0 0 1 3 10.5z" />
      <path d="M17.5 8h1A2.5 2.5 0 0 1 21 10.5v4a2.5 2.5 0 0 1-1.5 2.3V20l-3-3h-3" />
    </>
  ),
  trofeo: (
    <>
      <path d="M7.5 4h9v5.5a4.5 4.5 0 0 1-9 0z" />
      <path d="M7.5 5.5H5a2.5 2.5 0 0 0 2.5 5" />
      <path d="M16.5 5.5H19a2.5 2.5 0 0 1-2.5 5" />
      <path d="M12 14v3.5M8.5 20.5h7M9.5 20.5l.6-3h3.8l.6 3" />
    </>
  ),
  show: (
    <>
      <path d="M4 4.5h7v8a3.5 3.5 0 0 1-7 0z" />
      <path d="M6.3 8h.01M8.7 8h.01M6 11.2c.9.7 2.1.7 3 0" />
      <path d="M13 6.5h7v7a3.5 3.5 0 0 1-7 0z" />
      <path d="M15.3 10h.01M17.7 10h.01" />
    </>
  ),
  stand: (
    <>
      <path d="M3 8.5h18L19 4H5z" />
      <path d="M4.5 8.5V20h15V8.5" />
      <path d="M3 8.5c0 1.4 1.1 2.5 2.5 2.5S8 9.9 8 8.5m0 0c0 1.4 1.1 2.5 2.5 2.5S13 9.9 13 8.5m0 0c0 1.4 1.1 2.5 2.5 2.5S18 9.9 18 8.5" />
      <path d="M9.5 20v-5h5v5" />
    </>
  ),
  activacion: (
    <>
      <circle cx="11" cy="13" r="8" />
      <circle cx="11" cy="13" r="4" />
      <path d="M11 13l8.5-8.5M17 3.5h4v4" />
    </>
  ),
  proyeccion: (
    <>
      <path d="M3 9.5h18v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
      <path d="M3.6 9.5 6 4l14.4 2.8-.7 2.7" />
      <path d="M9.6 5.2 8.2 9.5M13.9 6l-1.4 4.3" />
      <path d="M10.5 13.5l4.5 2.5-4.5 2.5z" />
    </>
  ),
  estrella: (
    <>
      <path d="M12 3l2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8z" />
    </>
  ),
  ceremonia: (
    <>
      <path d="M3.5 20.5 9 8l7 7-12.5 5.5z" />
      <path d="M13 3.5v2M17.5 4.5l-1.3 1.6M21 8h-2M20 12.5l-1.9-.8M15.5 2.5" />
      <path d="M11 10.5c1.5-1.5 2-3.5 1-5M14 13.5c1.5-1.5 3.5-2 5-1" />
    </>
  ),
  chincheta: (
    <>
      <path d="M9 3h6l-.8 5.2 3.3 3.3H6.5l3.3-3.3z" />
      <path d="M12 11.5V21" />
    </>
  ),

  /* ── Uso general ── */
  calendario: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M7.5 13.5h3M7.5 17h3M13.5 13.5h3" />
    </>
  ),
  edificio: (
    <>
      <path d="M4.5 20.5V5.5A2 2 0 0 1 6.5 3.5h7a2 2 0 0 1 2 2v15" />
      <path d="M15.5 9.5h3a2 2 0 0 1 2 2v9" />
      <path d="M3 20.5h18" />
      <path d="M8 7.5h1.5M12 7.5h1.5M8 11.5h1.5M12 11.5h1.5M8 15.5h1.5M12 15.5h1.5M18 13.5h.01M18 17h.01" />
    </>
  ),
  acuerdo: (
    <>
      <path d="M2.5 11 6 7.5l4 2.5 2-1.5 2 1.5 4-2.5 3.5 3.5" />
      <path d="M6 7.5V16a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 16V7.5" />
      <path d="M9 13.5l1.8 1.8a1.7 1.7 0 0 0 2.4 0L15 13.5" />
    </>
  ),
  ubicacion: (
    <>
      <path d="M12 21.5s7-6.1 7-11.1A7 7 0 0 0 5 10.4c0 5 7 11.1 7 11.1z" />
      <circle cx="12" cy="10" r="2.8" />
    </>
  ),
  adjunto: (
    <>
      <path d="M20 11.5l-8.4 8.4a4.9 4.9 0 0 1-7-7l8.8-8.8a3.3 3.3 0 0 1 4.7 4.7l-8.8 8.8a1.7 1.7 0 0 1-2.4-2.4l8-8" />
    </>
  ),
  /* Sin usar todavía: el saludo de Gestbot dejó de llevar emoji y pasó a texto.
     Se queda porque el widget de Inicio lo pide. */
  bot: (
    <>
      <rect x="4" y="7.5" width="16" height="12" rx="3.5" />
      <path d="M12 3.5v4M9.5 13h.01M14.5 13h.01" />
      <path d="M9.5 16.5c1.6.9 3.4.9 5 0" />
      <path d="M2.5 12v3M21.5 12v3" />
    </>
  ),
  documento: (
    <>
      <path d="M14 3.5H7.5A2 2 0 0 0 5.5 5.5v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M8.5 12.5h7M8.5 16h5" />
    </>
  ),
  camara: (
    <>
      <path d="M3.5 8.5h3.2l1.4-2.2h7.8l1.4 2.2h3.2a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18v-8a1.5 1.5 0 0 1 1.5-1.5z" />
      <circle cx="12" cy="14" r="3.6" />
    </>
  ),
  medalla: (
    <>
      <path d="M7.5 2.5l3 6M16.5 2.5l-3 6" />
      <circle cx="12" cy="15" r="6.2" />
      <path d="M12 11.8l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4L8.5 14.3l2.4-.3z" />
    </>
  ),
  bandeja: (
    <>
      <path d="M3.5 14.5v4a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5v-4" />
      <path d="M3.5 14.5h5l1.2 2h4.6l1.2-2h5" />
      <path d="M12 3.5v8M8.5 8l3.5 3.5L15.5 8" />
    </>
  ),
  megafono: (
    <>
      <path d="M3.5 10v4a1.5 1.5 0 0 0 1.5 1.5h2L14 20V4L7 8.5H5A1.5 1.5 0 0 0 3.5 10z" />
      <path d="M7 8.5v7" />
      <path d="M17.5 8.5a5 5 0 0 1 0 7M20 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  bandera: (
    <>
      <path d="M5.5 21V3.5" />
      <path d="M5.5 4.5h13v9h-13z" />
      <path d="M9.8 4.5v9M14.1 4.5v9M5.5 9h13" />
    </>
  ),
  paleta: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.4 0 2-1 2-2s-.6-2-2-2h-.5a2.5 2.5 0 0 1 0-5H17a4 4 0 0 0 4-4c0-3-4-5-9-5z" />
      <path d="M7.5 9h.01M7 13.5h.01M10.5 6.5h.01" />
    </>
  ),
  impresora: (
    <>
      <path d="M7 8.5V3.5h10v5" />
      <path d="M7 17.5H5.5A2 2 0 0 1 3.5 15.5v-5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H17" />
      <path d="M7 13.5h10v7H7z" />
      <path d="M17.5 11.5h.01" />
    </>
  ),
  aviso: (
    <>
      <path d="M12 3.5 21 19a1.5 1.5 0 0 1-1.3 2.2H4.3A1.5 1.5 0 0 1 3 19z" />
      <path d="M12 9v5M12 17.2h.01" />
    </>
  ),
  destello: (
    <>
      <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9z" />
      <path d="M18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5 10-11" />,
  cerrar: <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />,

  /* Entrada y salida del recinto (check-in y check-out). Antes eran las
     flechas ↳ y ↰, que a 12px no se distinguían una de otra. */
  entrar: (
    <>
      <path d="M14 3.5h4.5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H14" />
      <path d="M3.5 12h10M10 8.5l3.5 3.5-3.5 3.5" />
    </>
  ),
  salir: (
    <>
      <path d="M10 3.5H5.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2H10" />
      <path d="M20.5 12h-10M17 8.5l3.5 3.5-3.5 3.5" />
    </>
  ),

  /* Subcanal del chat. Iba al lado de LockIcon y HashIcon, que son SVG, con un
     ↳ de texto: se veía de otro peso que sus dos hermanos. */
  subcanal: <path d="M6 4.5v8a3 3 0 0 0 3 3h9M14.5 11.5l3.5 4-3.5 4" />,

  /* Tema claro y oscuro. */
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  luna: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
};

export const NOMBRES_ICONO = Object.keys(TRAZOS);

/* Los que se dibujan con relleno en vez de trazo. */
const RELLENOS = new Set(['estrella', 'destello']);

export default function Icono({ name, className = 'w-4 h-4', titulo, strokeWidth = 1.8, ...resto }) {
  const trazo = TRAZOS[name];
  /* Un nombre mal escrito no debe dejar un hueco silencioso ni reventar la
     pantalla: se avisa en desarrollo y no se pinta nada. */
  if (!trazo) {
    if (import.meta.env.DEV) console.warn(`[Icono] no existe "${name}". Disponibles: ${NOMBRES_ICONO.join(', ')}`);
    return null;
  }

  const conRelleno = RELLENOS.has(name);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${V} ${V}`}
      fill={conRelleno ? 'currentColor' : 'none'}
      stroke={conRelleno ? 'none' : 'currentColor'}
      strokeWidth={conRelleno ? undefined : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : 'true'}
      aria-label={titulo || undefined}
      {...resto}
    >
      {titulo && <title>{titulo}</title>}
      {trazo}
    </svg>
  );
}
