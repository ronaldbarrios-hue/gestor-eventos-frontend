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
export function embedSnippet({ origin, slug, seccion, titulo, tema = 'auto', fondo = 'transparente', alto = 600, autoAlto = true, heredarEstilo = true }) {
  const fid = embedFrameId(slug, seccion);
  const url = embedUrl({ origin, slug, seccion, tema, fondo, fid });
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const destino = base ? `'${base}'` : "'*'";
  const title = String(titulo || 'Sección del evento').replace(/"/g, "'");
  const iframe =
`<iframe id="${fid}"
        src="${url}"
        title="${title}"
        height="${alto}"
        loading="lazy"
        style="width:100%;border:0;display:block;overflow:hidden"
        scrolling="no"></iframe>`;
  if (!autoAlto && !heredarEstilo) return iframe;
  return `${iframe}
<script>
(function () {
  var f = document.getElementById('${fid}');
  if (!f) return;
${heredarEstilo ? `  function estilo() {
    try {
      f.contentWindow.postMessage({
        gestek: 'estilo', fid: '${fid}',
        fuente: getComputedStyle(document.body).fontFamily
      }, ${destino});
    } catch (e) {}
  }
  f.addEventListener('load', estilo);
` : ''}  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.fid !== '${fid}') return;
${autoAlto ? `    if (d.gestek === 'alto') { f.style.height = d.alto + 'px'; }
` : ''}${heredarEstilo ? `    if (d.gestek === 'pide-estilo') { estilo(); }
` : ''}  });
})();
<\/script>`;
}

/* ── El botón de registro ───────────────────────────────────────────────────
 *
 * Lo de arriba incrusta una SECCIÓN de la landing dentro de la web de otro.
 * Esto es lo otro que pide el cliente: sólo un botón en su web que, al
 * pulsarlo, abre el registro encima de su página, sin sacar al visitante del
 * sitio donde estaba.
 *
 * Quien pinta el botón y abre la ventana es `public/widget.js`, que se sirve
 * tal cual —sin empaquetar, porque lo carga una web ajena— y dentro sólo hay
 * un iframe a `/embed/<slug>/registro`.
 *
 * ── Por qué el pago sale de la ventana y el formulario no ──────────────────
 *
 * El formulario, la reserva gratuita y la confirmación con sus sub-eventos
 * ocurren dentro: son peticiones a nuestra propia API y funcionan igual estén
 * donde estén.
 *
 * El salto a Mercado Pago o a Wompi, no. Un checkout dentro de un iframe de
 * otro dominio se rompe por tres sitios a la vez: las cookies de terceros que
 * los navegadores ya bloquean por defecto, el 3-D Secure del banco —que se
 * niega a cargarse enmarcado— y las redirecciones de vuelta de la pasarela,
 * que aterrizan dentro del recuadro. Así que cuando toca pagar, el iframe le
 * pide al anfitrión que abra la pasarela en una pestaña de verdad. Lo que se
 * escribió no se pierde: la boleta ya está creada cuando eso pasa.
 */

/* Los tres tamaños del botón. Van aquí y no en el widget porque el panel los
   enseña al organizador y el widget los aplica: una sola lista para los dos. */
export const WIDGET_TAMANOS = {
  sm: { padding: '8px 16px',  fuente: '14px' },
  md: { padding: '12px 22px', fuente: '15px' },
  lg: { padding: '16px 30px', fuente: '17px' },
};

export const WIDGET_DEFECTOS = {
  texto     : 'Registrarme',
  color     : '#E0B12B',
  colorTexto: '#12100B',
  radio     : '12',
  tamano    : 'md',
};

/* ¿Estamos dentro del iframe de otra web? Se pregunta dentro de un try porque
   en un iframe de otro dominio, leer `window.parent` puede lanzar. */
export function estaIncrustado() {
  if (typeof window === 'undefined') return false;
  try { return window.parent && window.parent !== window; } catch { return true; }
}

/* Le dice algo al anfitrión. Los tipos que entiende `widget.js`:
     alto   { alto }        redimensiona la ventana
     abrir  { url }         abre una pestaña de verdad (la pasarela de pago)
     listo  { codigo }      el registro terminó
     cerrar {}              cerrar la ventana */
export function avisarAlAnfitrion(tipo, datos = {}, fid = '') {
  if (!estaIncrustado()) return false;
  try {
    window.parent.postMessage({ gestek: tipo, fid, ...datos }, '*');
    return true;
  } catch {
    /* Cross-origin con el anfitrión bloqueado: no hay nada que hacer y no es
       motivo para romper la pantalla de quien está registrándose. */
    return false;
  }
}

/* A dónde mandar a alguien que va a pagar. Devuelve true si se delegó en el
   anfitrión, para que quien llama no navegue además por su cuenta. */
export function irAPagar(url, fid = '') {
  if (!url) return false;
  if (estaIncrustado() && avisarAlAnfitrion('abrir', { url }, fid)) return true;
  window.location.href = url;
  return true;
}

/* El snippet que copia el organizador. Una línea, sin iframe a la vista: el
   botón y la ventana los pone el script. */
export function widgetSnippet({ origin, slug, ...opciones }) {
  const o = { ...WIDGET_DEFECTOS, ...opciones };
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const attr = (k, v) => `\n        data-${k}="${String(v).replace(/"/g, '&quot;')}"`;

  return `<script src="${base}/widget.js"${
    attr('gestek-evento', slug)}${
    attr('texto', o.texto)}${
    attr('color', o.color)}${
    attr('color-texto', o.colorTexto)}${
    attr('radio', o.radio)}${
    attr('tamano', o.tamano)}></script>`;
}

/* La otra forma: el botón donde el organizador quiera, y el script una sola
   vez al final. Es lo que hace falta cuando el botón va dentro de un menú o
   repetido en varias secciones de la misma página. */
export function widgetSnippetEnSitio({ origin, slug, ...opciones }) {
  const o = { ...WIDGET_DEFECTOS, ...opciones };
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `<!-- donde quieras que salga el botón -->
<div data-gestek-registro="${slug}"
     data-texto="${o.texto}"
     data-color="${o.color}"
     data-color-texto="${o.colorTexto}"
     data-radio="${o.radio}"
     data-tamano="${o.tamano}"></div>

<!-- una sola vez, al final de la página -->
<script src="${base}/widget.js"></script>`;
}

/* El estilo del botón, calculado igual que lo calcula `public/widget.js`.
 *
 * Existe para la vista previa del panel: el organizador tiene que ver
 * exactamente el botón que va a salir en su web. Las dos tablas de arriba
 * —`WIDGET_TAMANOS` y las sombras— son la fuente; `widget.js` lleva su copia
 * porque lo carga una web ajena y no puede importar nada de aquí.
 *
 * Que las dos copias no se separen no se deja a la buena fe: `tests/widget/`
 * compara lo que pinta el widget de verdad contra estos valores. */
export const WIDGET_SOMBRAS = {
  no: 'none',
  sm: '0 1px 2px rgba(0,0,0,.16)',
  md: '0 6px 16px rgba(0,0,0,.20)',
  lg: '0 14px 34px rgba(0,0,0,.28)',
};

export function estiloBotonWidget(opciones = {}) {
  const o = { ...WIDGET_DEFECTOS, ...opciones };
  const t = WIDGET_TAMANOS[o.tamano] || WIDGET_TAMANOS.md;
  return {
    display      : o.ancho === 'completo' ? 'block' : 'inline-block',
    width        : o.ancho === 'completo' ? '100%' : 'auto',
    padding      : t.padding,
    fontSize     : t.fuente,
    fontWeight   : 600,
    lineHeight   : 1.2,
    color        : o.colorTexto,
    background   : o.color2
      ? `linear-gradient(${o.gradiente || '135deg'}, ${o.color}, ${o.color2})`
      : o.color,
    border       : `${parseInt(o.borde, 10) || 0}px solid ${o.colorBorde || 'transparent'}`,
    borderRadius : `${parseInt(o.radio, 10) || 0}px`,
    boxShadow    : Object.prototype.hasOwnProperty.call(WIDGET_SOMBRAS, o.sombra)
      ? WIDGET_SOMBRAS[o.sombra]
      : o.sombra,
    cursor       : 'pointer',
  };
}
