/* Exportación de secciones como iframe (iFrame).
   Una sección de la landing puede vivir dentro de la web de otra empresa:
   /embed/<slug>/<seccion>. Este módulo es la única fuente de verdad del
   formato de la URL y del snippet, para que el editor y la página pública
   nunca se desincronicen. */

/* Alias amigables → tipo de bloque real. El organizador pega
   /embed/mi-evento/boletas y no necesita saber que internamente es "tickets". */
export const EMBED_ALIAS = {
  boletas: 'tickets',
  entradas: 'tickets',
  tickets: 'tickets',
  'como-llegar': 'mapa',
  ubicacion: 'mapa',
  mapa: 'mapa',
  'mapa-evento': 'mapa_evento',
  'plano': 'mapa_evento',
  mapa_evento: 'mapa_evento',
  ponentes: 'speakers',
  speakers: 'speakers',
  patrocinadores: 'sponsors',
  sponsors: 'sponsors',
  expositores: 'expositores',
  directorio: 'expositores',
  premios: 'recompensas',
  recompensas: 'recompensas',
  preguntas: 'faq',
  faq: 'faq',
  'cuenta-regresiva': 'countdown',
  countdown: 'countdown',
  informacion: 'info',
  info: 'info',
};

/* Tipo de bloque → slug bonito para la URL pública del embed. */
export const EMBED_SLUG_AMIGABLE = {
  tickets: 'boletas',
  mapa: 'como-llegar',
  mapa_evento: 'mapa-evento',
  speakers: 'ponentes',
  sponsors: 'patrocinadores',
  expositores: 'directorio',
  recompensas: 'premios',
  faq: 'preguntas',
  countdown: 'cuenta-regresiva',
  info: 'informacion',
};

/* Bloques que se pueden servir aunque el organizador los haya quitado de la
   landing: se alimentan de los datos del evento, no de configuración propia.
   Se sirven con sus `defaults` (títulos incluidos), no con data vacía: si no,
   una sección incrustada llegaría sin encabezado y parecería rota. */
export const EMBED_SIN_CONFIG = [
  'tickets', 'info', 'direccion', 'titulo', 'descripcion', 'galeria_evento', 'links',
  'mapa', 'mapa_evento', 'expositores', 'recompensas',
];

/* Secciones del evento que no viven en la landing pero también se incrustan.
   Este es el catálogo que ve el organizador en el modal de exportar. */
export const EMBED_ESPECIALES = [
  { seccion: 'espacio',     label: 'Espacio del evento',    nota: 'El calendario de charlas, stands, competencias y shows.' },
  { seccion: 'torneo',      label: 'Llaves del torneo',     nota: 'El bracket o la tabla de la liga, en vivo.' },
  { seccion: 'torneos',     label: 'Torneos y campeones',   nota: 'Cada torneo con su ganador y los equipos que jugaron.' },
  { seccion: 'ranking',     label: 'Ranking de expositores',nota: 'Quién dio más puntos en su stand. Sólo empresas, nunca asistentes.' },
  { seccion: 'directorio',  label: 'Directorio de expositores', nota: 'Las marcas del evento con su stand y su cronograma.' },
  { seccion: 'mapa-evento', label: 'Mapa del evento',       nota: 'El plano con los stands y las actividades ubicadas.' },
  { seccion: 'como-llegar', label: 'Cómo llegar',           nota: 'La dirección del evento sobre Google Maps.' },
  { seccion: 'boletas',     label: 'Boletas',               nota: 'Los tipos de entrada con su precio. Comprar abre GESTEK aparte.' },
];

/* ── Los tres modos de publicación (columna eventos.modo_publico) ──
   A dónde lleva el enlace público del evento. Lo define la migración 0060 y
   lo respeta EventoPublicoPage. */
export const MODOS_PUBLICACION = [
  {
    value: 'gestek',
    label: 'La página de GESTEK',
    resumen: 'El evento vive aquí.',
    detalle: 'La página que armas en este editor es la del evento. No necesitas web propia ni tocar nada más.',
    pideUrl: false,
  },
  {
    value: 'externa',
    label: 'Mi propia web',
    resumen: 'El enlace lleva a tu sitio.',
    detalle: 'Ya tienes la página del evento hecha en otro sitio. GESTEK se queda con la gestión —boletas, asistentes, check-in— y quien llegue por aquí sale a tu web.',
    pideUrl: true,
  },
  {
    value: 'iframe',
    label: 'Mi web, con GESTEK dentro',
    resumen: 'Tu sitio, nuestras secciones.',
    detalle: 'Tu página, pero las boletas, la agenda, el mapa o el torneo se sirven desde GESTEK incrustados y se actualizan solos. Copia el código de cada sección abajo y pégalo en tu web.',
    pideUrl: true,
  },
];

export function modoPublicacion(valor) {
  return MODOS_PUBLICACION.find(m => m.value === valor) || MODOS_PUBLICACION[0];
}

export const EMBED_TEMAS = [
  { value: 'auto',   label: 'Seguir al sitio que lo incrusta' },
  { value: 'claro',  label: 'Siempre claro' },
  { value: 'oscuro', label: 'Siempre oscuro' },
];

/* Slug corto y estable para identificar el iframe en el DOM del anfitrión. */
export function embedFrameId(slug, seccion) {
  return `gestek-${String(slug || 'evento')}-${String(seccion || 'seccion')}`
    .toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').slice(0, 60);
}

export function embedUrl({ origin, slug, seccion, tema = 'auto', fondo = 'transparente', fid }) {
  const base = `${origin || (typeof window !== 'undefined' ? window.location.origin : '')}/embed/${encodeURIComponent(slug)}/${encodeURIComponent(seccion)}`;
  const q = new URLSearchParams();
  if (tema && tema !== 'auto') q.set('tema', tema);
  if (fondo && fondo !== 'transparente') q.set('fondo', fondo);
  if (fid) q.set('fid', fid);
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

/* Snippet listo para pegar. El script es opcional (autoAlto): sin él el
   iframe queda a la altura fija indicada; con él se ajusta solo mediante
   postMessage, que es lo que la mayoría va a querer. */
export function embedSnippet({ origin, slug, seccion, titulo, tema = 'auto', fondo = 'transparente', alto = 600, autoAlto = true }) {
  const fid = embedFrameId(slug, seccion);
  const url = embedUrl({ origin, slug, seccion, tema, fondo, fid });
  const title = String(titulo || 'Sección del evento').replace(/"/g, "'");
  const iframe =
`<iframe id="${fid}"
        src="${url}"
        title="${title}"
        height="${alto}"
        loading="lazy"
        style="width:100%;border:0;display:block;overflow:hidden"
        scrolling="no"></iframe>`;
  if (!autoAlto) return iframe;
  return `${iframe}
<script>
(function () {
  var f = document.getElementById('${fid}');
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.gestek !== 'alto' || d.fid !== '${fid}') return;
    f.style.height = d.alto + 'px';
  });
})();
<\/script>`;
}
