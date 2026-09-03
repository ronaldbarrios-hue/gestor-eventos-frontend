/* ──────────────────────────────────────────────────────────────────
   Chrome compartido de la página del evento (Rework · consistencia)
   Fuente ÚNICA de verdad para:
     · el branding resuelto (logo + nombre del organizador)
     · el navbar/píldora de páginas
     · el orden y filtrado de los bloques (portada hoisted, ocultos)
   Lo usan TANTO la página pública (EventoPublicoPage) COMO el editor
   (ExperienceBuilder), para que el editor sea idéntico al público y
   no se desincronicen el orden ni el navbar.
   ────────────────────────────────────────────────────────────────── */

/* Resuelve el branding del evento igual en editor y público:
   el White Label del evento (page_json.branding) pisa el del organizador. */
export function resolveBranding(evento) {
  const brandingEvento = evento?.page_json?.branding || {};
  const organizador = {
    ...(evento?.organizador || {}),
    branding: { ...((evento?.organizador || {}).branding || {}), ...brandingEvento },
    ...(brandingEvento.logo_url ? { empresa_logo_url: brandingEvento.logo_url } : {}),
  };
  const logoUrl = organizador?.empresa_logo_url;
  const nombreOrg =
    organizador?.branding?.plataforma ||
    organizador?.empresa ||
    organizador?.nombre ||
    evento?.titulo ||
    'Evento';
  return { organizador, logoUrl, nombreOrg };
}

/* Tamaño/forma de la imagen de portada — configurable desde el bloque "Portada".
   Fuente única usada por el público (EventoPublicoPage) y el editor
   (EditorTopChrome), para que la portada se vea igual en ambos. */
export const COVER_ASPECTOS = [
  { value: '',      label: 'Panorámica (21:9)', ratio: '21 / 9' },
  { value: '16/9',  label: 'Ancha (16:9)',      ratio: '16 / 9' },
  { value: '16/10', label: 'Estándar (16:10)',  ratio: '16 / 10' },
  { value: '3/2',   label: 'Foto (3:2)',        ratio: '3 / 2' },
  { value: '4/3',   label: 'Compacta (4:3)',    ratio: '4 / 3' },
];
export function coverLayout(portadaData) {
  const contenido = (portadaData?.cover_modo || 'full') === 'contenido';
  const ratio = COVER_ASPECTOS.find(a => a.value === (portadaData?.cover_aspecto || ''))?.ratio || '21 / 9';
  return { contenido, ratio };
}

/* Config editable del navbar (page_json.navbar) — alineación de la píldora,
   mostrar/ocultar "Explorar eventos" y "Compartir", y enlaces personalizados.
   La leen igual el editor (EditorTopChrome) y el público (EventoPublicoPage). */
/* Las secciones del evento que pueden salir en la barra. Cada una tiene un
   dato que dice si «existe» —hay torneo, hay mapa…— y hasta ahora eso decidía
   solo: creabas un mapa y el botón aparecía arriba sin pedirte permiso y sin
   forma de quitarlo. Tres estados, y el de por defecto es el de siempre:

     'auto' → aparece si la sección existe. Lo que hacía antes.
     'si'   → aparece siempre, exista o no.
     'no'   → no aparece nunca, aunque exista.

   `auto` sigue siendo el defecto a propósito: quien no toque nada ve
   exactamente lo de hoy, y lo que se gana es poder decir que no. */
export const SECCIONES_NAVBAR = [
  { id: 'networking', label: 'Rueda de negocios' },
  { id: 'torneo',     label: 'Torneo' },
  { id: 'espacio',    label: 'Espacio del evento' },
  { id: 'ranking',    label: 'Ranking' },
  { id: 'mapa',       label: 'Mapa del evento' },
];

const MODOS_SECCION = ['auto', 'si', 'no'];

export function navbarConfig(pageJson) {
  const n = pageJson?.navbar || {};
  const s = n.secciones && typeof n.secciones === 'object' ? n.secciones : {};
  const secciones = {};
  for (const { id } of SECCIONES_NAVBAR) {
    secciones[id] = MODOS_SECCION.includes(s[id]) ? s[id] : 'auto';
  }
  return {
    alineacion       : ['left', 'center', 'right'].includes(n.alineacion) ? n.alineacion : 'center',
    mostrar_explorar : n.mostrar_explorar !== false,
    mostrar_compartir: n.mostrar_compartir !== false,
    enlaces          : Array.isArray(n.enlaces) ? n.enlaces.filter(e => e && e.label) : [],
    secciones,
  };
}

/* ¿Sale este botón? Una sola función para las cinco, en vez de repetir la
   condición en cada sitio — que es como estaban, y por eso no se podían
   configurar sin tocar cinco condiciones sueltas. */
export function muestraSeccion(nav, id, existe) {
  const modo = nav?.secciones?.[id] || 'auto';
  if (modo === 'no') return false;
  if (modo === 'si') return true;
  return Boolean(existe);
}
export const NAVBAR_ALINEACION = { left: 'justify-start', center: 'justify-center', right: 'justify-end' };

/* Orden + filtrado de bloques idéntico en editor y público.
   - salta los bloques ocultos
   - salta el bloque "portada" cuando hay cover_url (se muestra arriba). */
export function blocksVisibles(page, hasCover) {
  return (page?.blocks || []).filter(b => {
    if (!b) return false;
    if (b?.data?.oculto) return false;
    if (hasCover && b?.type === 'portada') return false;
    return true;
  });
}

/* Píldora de navegación entre páginas — misma en editor y público.
   onNav(index) recibe el índice 0-based; si no se pasa, los botones no navegan
   (útil como representación fiel dentro del editor). */
export function EventNavbar({ evento, pages, activeIdx = 0, onNav }) {
  const { logoUrl, nombreOrg } = resolveBranding(evento);
  const mostrarTabs = pages.length > 1;
  return (
    <div className="flex items-center gap-1 bg-surface/80 backdrop-blur-md border border-border-2 rounded-full px-1.5 py-1.5 shadow-lg overflow-x-auto no-scrollbar">
      <div className="flex-shrink-0 pl-1 pr-1.5">
        {logoUrl
          ? <img src={logoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                 style={{ background: 'linear-gradient(135deg, var(--brand-primary, #C9A227), var(--brand-accent, #E0B12B))' }}>
              {(nombreOrg || 'O').charAt(0).toUpperCase()}
            </div>
          )}
      </div>
      {mostrarTabs && pages.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onNav?.(i)}
          className={`flex-shrink-0 h-8 px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
            ${activeIdx === i ? 'bg-text-1 text-bg' : 'text-text-2 hover:text-text-1 hover:bg-surface-2'}`}
          aria-current={activeIdx === i ? 'page' : undefined}
        >
          <span className="hidden sm:inline mr-1">{i + 1}.</span>
          {p.nombre}
        </button>
      ))}
    </div>
  );
}

/* ─────────── Las secciones del evento, una sola lista ───────────
 *
 * ── El problema, dicho por quien lo usa ──────────────────────────────────
 *
 * «Al seleccionar Mapa del evento, y al darle en Rueda de negocios, es como si
 * redirigiera a otra página». Y es exactamente lo que pasa, aunque el enlace
 * sea correcto: **la sub-página no lleva la ropa del evento**. La portada tiene
 * navbar, logo y marca; la agenda, el torneo, el mapa y el ranking tenían otra
 * cosa —una fila de píldoras distinta— sin logo y sin marca. El navegador no
 * cambia de sitio; el que cambia de sitio es lo que se ve.
 *
 * Y encima los cinco botones estaban pintados de cinco colores distintos
 * —primary, warning, success y dos grises—, sin que el color significara nada:
 * la rueda no es más importante que el mapa. Cinco cosas del mismo tipo
 * pintadas de cinco maneras es lo que hace que algo se vea «hecho a medias».
 *
 * Así que la lista de secciones se declara UNA vez, con su ruta, su icono y su
 * condición, y la usan tanto la portada como todas las sub-páginas. Cambiar el
 * conjunto es cambiar este array.
 */
export const SECCIONES_PUBLICAS = [
  { id: 'inicio',     ruta: '',           label: 'Inicio',              icono: 'estrella',   hay: () => true },
  { id: 'espacio',    ruta: 'agenda',     label: 'Espacio del evento',  icono: 'calendario', hay: (e) => e.tiene_espacio ?? e.tiene_agenda },
  { id: 'networking', ruta: 'networking', label: 'Rueda de negocios',   icono: 'manos',      hay: (e) => e.tiene_networking },
  { id: 'torneo',     ruta: 'torneo',     label: 'Torneo',              icono: 'trofeo',     hay: (e) => e.tiene_torneo },
  { id: 'ranking',    ruta: 'ranking',    label: 'Ranking',             icono: 'estrella',   hay: (e) => e.tiene_expositores },
  { id: 'mapa',       ruta: 'mapa',       label: 'Mapa del evento',     icono: 'pin',        hay: (e) => Boolean(e.page_json?.mapa) },
];

/* Las que se enseñan de un evento: las que tienen contenido, más las que el
   organizador forzó a mano. «Inicio» sale siempre que haya alguna otra: una
   píldora sola no es una navegación. */
export function seccionesDe(evento, nav) {
  const con = SECCIONES_PUBLICAS.filter(s => s.id === 'inicio'
    ? true
    : muestraSeccion(nav, s.id, s.hay(evento || {})));
  return con.length > 1 ? con : [];
}
