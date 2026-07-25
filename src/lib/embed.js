/* Exportación de secciones como iframe (eFrame).
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
  ponentes: 'speakers',
  speakers: 'speakers',
  patrocinadores: 'sponsors',
  sponsors: 'sponsors',
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
  speakers: 'ponentes',
  sponsors: 'patrocinadores',
  faq: 'preguntas',
  countdown: 'cuenta-regresiva',
  info: 'informacion',
};

/* Bloques que se pueden servir aunque el organizador los haya quitado de la
   landing: se alimentan de los datos del evento, no de configuración propia. */
export const EMBED_SIN_CONFIG = ['tickets', 'info', 'direccion', 'titulo', 'descripcion', 'galeria_evento', 'links'];

/* Secciones del evento que no viven en la landing pero también se incrustan. */
export const EMBED_ESPECIALES = [
  { seccion: 'torneo',  label: 'Llaves del torneo',  nota: 'El bracket o la tabla de la liga, en vivo.' },
  { seccion: 'espacio', label: 'Espacio del evento', nota: 'El calendario de charlas, stands, competencias y shows.' },
];

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
