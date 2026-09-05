import { useEffect, useState, useMemo, useRef } from 'react';
import Icono from '../../components/ui/Iconos.jsx';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import { pagosApi }   from '../../api/pagos.js';
import { promocionesApi } from '../../api/promociones.js';
import { waitlistApi } from '../../api/waitlist.js';
import { BLOCKS, BLOCK_TYPES_SISTEMA } from '../events/editor/blocks.jsx';
import { BrandingProvider, BrandHeader, PoweredBy } from '../../components/public/Branding.jsx';
import { blocksVisibles, coverLayout, navbarConfig, seccionesDe, NAVBAR_ALINEACION } from '../../components/public/EventChrome.jsx';
import CanvasPublico from '../events/editor/canvas/CanvasPublico.jsx';
import Turnstile, { turnstileActivo } from '../../components/public/Turnstile.jsx';
import CampoFormulario, { fallosDe, ocupaFila } from '../../components/ui/CampoFormulario.jsx';
import { camposVisibles } from '../../lib/camposCondicionales.js';
import { useAuth } from '../../context/AuthContext.jsx';
/* `verificar` y no `verificarCorreo`: la primera añade la pista cruzada
   —«eso parece un teléfono, aquí va el correo»—, que es justo lo que hace
   falta en la casilla de al lado. Llamar a la comprobación base se saltaba esa
   pista precisamente en el sitio donde más sirve. */
import { verificar } from '../../lib/validarDato.js';
import AceptarTerminos, { useLegalEvento } from '../../components/public/AceptarTerminos.jsx';
import { dividirEnModulos, convienePaginar } from '../../lib/modulosFormulario.js';
import WalletCard, { walletConfig } from '../../components/public/WalletCard.jsx';
import InscripcionSesionModal from './InscripcionSesionModal.jsx';
import { enlaceBoleta } from '../../lib/enlacesPublicos.js';
import BoletaConocida, { guardarBoleta } from '../../components/public/BoletaConocida.jsx';
import { useT } from '../../lib/i18n.js';
import { irAPagar } from '../../lib/embed.js';
import DescargarEntrada from '../../components/public/DescargarEntrada.jsx';
import Volver from '../../components/ui/Volver.jsx';

/* Tamaño del recuadro de compra/confirmación, configurable por el organizador en
   Event Experience → Proceso de compra (`page_json.checkout.modal_ancho` /
   `modal_alto`). Lo pidió Festech: incrustado por iframe en su web se veía
   estrecho y con mucho scroll. Catálogo cerrado —no un número libre— para que
   las clases de Tailwind sean literales y no se purguen en el build. */
export const ANCHO_MODAL = {
  sm:  'sm:max-w-md',
  md:  'sm:max-w-lg',
  lg:  'sm:max-w-2xl',
  xl:  'sm:max-w-3xl',
  xxl: 'sm:max-w-5xl',
};
/* `dvh` y no `vh`, y esto costó registros de verdad.
 *
 * En un móvil `vh` es el viewport GRANDE: el que habría si las barras del
 * navegador estuvieran escondidas. Lo que se ve es el PEQUEÑO, un 15-20% menos
 * en iOS Safari. Con `max-h-[90vh]` la tarjeta podía medir el 90% del grande
 * estando anclada abajo (`items-end`), así que su parte final —donde está el
 * botón de «Continuar»— quedaba por debajo de lo visible.
 *
 * Y no había forma de llegar a él: `overflow-y-auto` de la tarjeta no scrollea
 * porque el contenido NO desborda la tarjeta —es la tarjeta la que desborda la
 * pantalla—, y `ModalShell` bloquea el scroll del documento mientras el modal
 * está abierto. Resultado: gente que abría el formulario, lo rellenaba y no
 * podía enviarlo.
 *
 * `dvh` mide el viewport visible de verdad y se actualiza cuando las barras
 * aparecen o desaparecen. La variante `completo` ya lo usaba —alguien topó con
 * esto y arregló sólo ese caso—; ahora lo usan las tres. */
export const ALTO_MODAL = {
  normal:   'max-h-[90dvh]',
  alto:     'max-h-[95dvh]',
  completo: 'max-h-[100dvh] sm:max-h-[97dvh]',
};
/* `porDefecto` es la clase que ese modal usaba antes: sin configurar nada, nada
   cambia. */
export const anchoModal = (v, porDefecto) => ANCHO_MODAL[v] || porDefecto;
export const altoModal  = (v) => ALTO_MODAL[v] || ALTO_MODAL.normal;

/* Los mismos bloques que siembra el editor, y en su orden: así lo que ve el
   público sin que nadie haya tocado nada es lo que el organizador se
   encontrará el día que abra el editor, no otra página distinta. */
function bloquesSistema() {
  return BLOCK_TYPES_SISTEMA.map(type => ({ id: `sys_${type}`, type, data: {} }));
}

export default function EventoPublicoPage() {
  const { slug } = useParams();
  const { t } = useT();
  const [params, setParams] = useSearchParams();
  const [evento,  setEvento]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [reservaTipo, setReservaTipo] = useState(null);
  const [reservaOk,   setReservaOk]   = useState(null);
  const [waitlistTipo, setWaitlistTipo] = useState(null);

  const isStandalone = params.get('standalone') === '1';

  /* Lista de espera: `?cupo=<token>` es el enlace del correo `cupo_liberado`.
     Se comprueba nada más entrar —antes de que la persona escriba nada— para
     poder decirle si su cupo sigue guardado y hasta cuándo. `null` mientras se
     consulta, `false` si ya no vale. */
  const cupoToken = params.get('cupo') || '';
  const [cupo, setCupo] = useState(null);

  /* ¿Hay sesión? La página pública no lo preguntaba nunca, y por eso el
     organizador que entraba a ver su propio evento publicado se encontraba la
     vista de un desconocido: sin panel, sin vuelta al panel, y con los enlaces
     de salida llevándolo fuera de GESTEK. Aquí sólo se usa para dos cosas —a
     dónde vuelve y ofrecerle su panel—; el CONTENIDO del evento sigue siendo
     el mismo para todo el mundo, que es lo correcto: esta página es la que ve
     el público y el organizador tiene que verla tal cual. */
  const { token } = useAuth();
  const conSesion = Boolean(token);

  /* Aquí vivía un `ResizeObserver` que medía la barra de salidas para que la
     segunda barra —la píldora de páginas— se pegara justo debajo sin
     solaparse. Ya no hace falta: las páginas se movieron DENTRO de la barra de
     salidas y sólo queda una. El desplazamiento que había que calcular era el
     precio de tener dos barras fijas, no un requisito. */

  useEffect(() => {
    if (!cupoToken) { setCupo(false); return; }
    let vivo = true;
    waitlistApi.verificarCupo(cupoToken)
      /* Cuando no vale, el motivo viaja igual: `false` a secas obligaba a
         contestar lo mismo a quien ya compro y a quien llego tarde. */
      .then(d => { if (vivo) setCupo(d?.valida ? d : { valida: false, motivo: d?.motivo }); })
      .catch(() => { if (vivo) setCupo({ valida: false }); });
    return () => { vivo = false; };
  }, [cupoToken]);

  useEffect(() => {
    setLoading(true);
    eventosApi.publicoBySlug(slug)
      .then(d => setEvento(d.evento))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  /* Suelo de la página pública: un evento publicado tiene que poder venderse
     aunque nadie haya abierto el editor visual.

     `crear_evento` —la vía del conector de Claude— deja `page_json` con
     `pages: []` y `blocks: []`. Ese array vacío entraba en la rama de abajo y
     se envolvía en una página sin un solo bloque: quien abría el enlace veía
     el logo del organizador y nada más. Sin título, sin fecha, sin lugar y
     —lo que importa— sin boletas, mientras la API devolvía los tipos de
     boleta correctamente. O sea que el organizador comparte su evento y no se
     puede comprar.

     El editor ya caía a los bloques del sistema en el mismo caso
     (`defaultPages`, PageBuilder). El público era el único lado sin suelo, y
     es el que vende. */
  const pages = useMemo(() => {
    if (!evento) return [];
    const pj = evento.page_json;
    if (pj?.pages?.length) return pj.pages;
    const propios = Array.isArray(pj?.blocks) && pj.blocks.length ? pj.blocks : bloquesSistema();
    return [{ id: 'inicio', nombre: 'Inicio', blocks: propios }];
  }, [evento]);

  /* Favicon, título y metadatos SEO (page_json.seo) en el <head> */
  useEffect(() => {
    if (!evento) return;
    const seo = evento.page_json?.seo || {};
    document.title = seo.title?.trim() || brandingEventoTitulo(evento);

    const fav = evento.page_json?.branding?.favicon_url;
    if (fav) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = fav;
    }

    /* Si no hay contenido, se QUITA el tag: al navegar entre eventos (SPA) el
       <head> es global y si no, quedarían pegados los metadatos del anterior. */
    const setMeta = (selector, attr, key, content) => {
      let el = document.head.querySelector(selector);
      if (!content) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    const desc  = seo.description?.trim() || evento.descripcion || evento.titulo || '';
    const img   = seo.og_image || evento.cover_url || '';
    const title = seo.title?.trim() || evento.titulo;
    const url   = seo.canonical?.trim() || `${window.location.origin}/explorar/${evento.slug}`;
    setMeta('meta[name="description"]', 'name', 'description', desc);
    setMeta('meta[name="keywords"]', 'name', 'keywords', seo.keywords);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    setMeta('meta[property="og:image"]', 'property', 'og:image', img);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', img);

    let canon = document.head.querySelector("link[rel='canonical']");
    if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
    canon.href = url;
  }, [evento]);

  const pageIdx = (() => {
    /* Blindado contra ?p= no numérico o decimal (NaN dejaba la página en blanco). */
    const raw = Number(params.get('p'));
    const p = Number.isFinite(raw) ? Math.floor(raw) : 1;
    return Math.max(1, Math.min(pages.length || 1, p));
  })();

  const activePage = pages[pageIdx - 1];

  if (loading) return (
    <section className="px-5 sm:px-8 py-12 max-w-5xl mx-auto">
      <div className="h-64 rounded-3xl bg-surface/40 border border-border animate-pulse" />
    </section>
  );

  if (error || !evento) return (
    <section className="px-5 sm:px-8 py-20 max-w-3xl mx-auto text-center">
      <p className="text-xs uppercase tracking-widest text-danger mb-3">Evento no encontrado</p>
      <h1 className="text-3xl font-bold font-display tracking-tight text-text-1 mb-4">
        {t('evento.no_encontrado_titulo')}
      </h1>
      <Link to="/explorar" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border-2 text-sm hover:bg-surface">
        {t('evento.volver_explorar')}
      </Link>
    </section>
  );

  /* ── Modo de publicación (migración 0060) ──
     Si el organizador dijo que su evento vive en su propia web, aquí no hay
     landing que pintar: se sale. Dos excepciones, ambas necesarias:
       - `?standalone=1`, que es como el iframe abre el checkout — si eso
         rebotara a la web del organizador, comprar desde un embed no
         terminaría nunca;
       - `?gestek=1`, para que el propio organizador pueda ver su landing de
         respaldo sin tener que cambiar el modo de ida y vuelta.
     Y si la URL está vacía o mal, se pinta la landing igual: dejar al
     visitante en blanco es peor que enseñarle la página que sí existe. */
  const salidaExterna = !isStandalone
    && params.get('gestek') !== '1'
    && (evento.modo_publico === 'externa' || evento.modo_publico === 'iframe')
    && urlExternaValida(evento.url_externa);

  if (salidaExterna) return <SalidaAWebPropia evento={evento} />;

  const hasCover = Boolean(evento.cover_url);
  const nav = navbarConfig(evento.page_json);
  const pillAlign = NAVBAR_ALINEACION[nav.alineacion] || 'justify-center';
  /* White Label del evento (page_json.branding) pisa el branding del
     organizador SOLO en esta página — corazón de iFrame. */
  const brandingEvento = evento.page_json?.branding || {};
  const organizador = {
    ...(evento.organizador || {}),
    branding: { ...((evento.organizador || {}).branding || {}), ...brandingEvento },
    ...(brandingEvento.logo_url ? { empresa_logo_url: brandingEvento.logo_url } : {}),
  };
  const logoUrl = organizador?.empresa_logo_url;
  const nombreOrg = organizador?.branding?.plataforma || organizador?.empresa || organizador?.nombre;

  /* La identidad del organizador y sus páginas, para meterlas DENTRO de la
     barra de salidas.
   *
   * Antes esto era una segunda barra fija flotando por debajo de la primera,
   * con su propio `sticky` y un desplazamiento medido con ResizeObserver para
   * no solaparse. Dos barras de navegación en la misma pantalla, y el
   * visitante no tenía por qué saber que las páginas del evento estaban en una
   * y las secciones en la otra: es la misma pregunta —«a dónde puedo ir»—
   * partida en dos filas. Ahora es un grupo más de la única barra. */
  const grupoPaginas = (
    <div className="flex items-center gap-1 min-w-0">
      <div className="flex-shrink-0 pr-1.5">
        {logoUrl
          ? <img src={logoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                 style={{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-accent))` }}>
              {(nombreOrg || 'O').charAt(0).toUpperCase()}
            </div>
          )}
      </div>
      {pages.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setParams(prev => { const x = new URLSearchParams(prev); x.set('p', String(i + 1)); return x; })}
              className={`flex-shrink-0 h-8 px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${pageIdx === i + 1 ? 'bg-text-1 text-bg' : 'text-text-2 hover:text-text-1 hover:bg-surface-2'}`}
              aria-current={pageIdx === i + 1 ? 'page' : undefined}
            >
              {p.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <BrandingProvider organizador={organizador}>
    <section className="px-5 sm:px-8 py-8 sm:py-12 max-w-6xl mx-auto">

      {/* Evento cancelado.
          Va lo primero y no se puede cerrar: quien llega aquí con una boleta
          comprada viene a preguntar exactamente esto, y hasta hoy la respuesta
          era un 404 de «este evento no existe» — con el dinero cobrado y el
          correo en la bandeja. Las boletas siguen abriéndose desde su enlace;
          lo que ya no hay es venta, y el servidor rechaza las cuatro rutas de
          compra por su cuenta, así que esto es el aviso, no el candado. */}
      {/* Vuelta de una pasarela que rechazó el pago.
       *
       * La pasarela devuelve aquí con `?pago=fallo` y hasta ahora no lo leía
       * NADIE: se volvía de que te rechazaran la tarjeta a la página del
       * evento, igual que si no hubiera pasado nada. Y la duda que trae a esa
       * persona es una sola —«¿me han cobrado?»—, así que eso es lo primero
       * que hay que contestar, antes de invitarla a intentarlo otra vez.
       *
       * Se quita de la dirección al leerlo: si no, recargar o compartir el
       * enlace repetiría el susto sin motivo. */}
      {params.get('pago') === 'fallo' && (
        <div role="alert" className="mb-6 rounded-2xl border border-warning/50 bg-warning/10 px-5 py-4">
          <p className="text-xs uppercase tracking-widest text-warning font-semibold">El pago no se completó</p>
          <p className="text-sm text-text-1 mt-1 leading-relaxed">
            <b>No se te cobró nada.</b> Puede haber sido la tarjeta, el banco o que se cerrara la
            ventana. Puedes intentarlo otra vez desde las boletas, aquí abajo.
          </p>
          <button onClick={() => { const p = new URLSearchParams(params); p.delete('pago'); setParams(p, { replace: true }); }}
            className="mt-2 text-xs text-text-2 hover:text-text-1 underline">
            Entendido
          </button>
        </div>
      )}

      {evento.cancelado && (
        <div role="alert" className="mb-6 rounded-2xl border border-danger/40 bg-danger/10 px-5 py-4">
          <p className="text-xs uppercase tracking-widest text-danger font-semibold">Evento cancelado</p>
          <p className="text-sm text-text-1 mt-1 leading-relaxed">
            {evento.titulo} no se va a realizar. Si ya tenías una boleta, sigue funcionando el enlace
            que te llegó por correo — para lo del reembolso, escribe a quien organiza.
          </p>
        </div>
      )}

      {/* Barra secundaria: volver + Rueda de Negocios/Torneo/Agenda (si aplican)
          + compartir (oculta "Explorar eventos" en modo standalone).

          Va FIJA. Estas son las salidas del evento —rueda de negocios, espacio,
          ranking, mapa— y quedaban arriba del todo: quien bajaba a mirar la
          agenda o las boletas tenía que volver hasta el principio para llegar
          a ellas, y en un móvil eso son varias pasadas de dedo.

          `top-0` con el fondo de la página detrás, y no `top-4` como la píldora
          de páginas, porque son dos barras distintas y si las dos flotaran a la
          misma altura se solaparían. Ésta se pega arriba y la otra queda por
          debajo, que además es el orden en que se leen. */}
      <div className="sticky top-0 z-30 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 mb-6
                      bg-bg/85 backdrop-blur-md border-b border-border/60
                      flex items-center justify-between gap-4 flex-wrap">
        {(isStandalone || !nav.mostrar_explorar) ? <span /> : (
          /* La vuelta respeta la sesión. Con cuenta iniciada iba a `/explorar`,
             que vive fuera del panel, así que quien estaba trabajando en su
             evento y entraba a verlo publicado se encontraba, al volver, fuera
             de GESTEK entero: sin barra lateral y en la vitrina pública. Ahora
             vuelve a `/app/explorar`, que es la misma vitrina PERO dentro del
             panel. Sin sesión, a la pública de siempre. */
          <Link to={conSesion ? '/app/explorar' : '/explorar'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border
                       text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Explorar eventos
          </Link>
        )}

        {/* Las páginas del evento, que antes eran una segunda barra. */}
        {grupoPaginas}

        {/* Con sesión, la puerta de vuelta a GESTEK.
            Esta pantalla es marca blanca a propósito —oculta la cabecera y el
            pie de la plataforma para que el visitante vea la web del
            organizador, no la nuestra— y eso está bien para el público. Para
            quien tiene cuenta era un callejón: entraba a ver su evento
            publicado y se quedaba sin ninguna forma de volver a su panel salvo
            el botón de atrás del navegador. Un enlace discreto, no una barra
            entera: el protagonista sigue siendo el evento. */}
        {conSesion && !isStandalone && (
          <Link to="/inicio"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-accent/30
                       bg-accent/10 text-xs text-accent hover:bg-accent/20 transition-colors flex-shrink-0"
            title="Volver a tu panel de GESTEK">
            <Icono nombre="panel" className="w-3.5 h-3.5" />
            Mi panel
          </Link>
        )}

        {/* En el móvil, UNA fila que se desliza; envolviendo, no.
            Medido en un iPhone: siete secciones envolvían en cinco filas y la
            barra medía 260 px — un tercio de la pantalla— y como está pegada
            arriba, se los comía todo el rato, no sólo al principio. El nombre
            del evento aparecía al 76 % de la pantalla: había que desplazarse
            para ver a qué evento se había entrado.
            De `sm` para arriba sigue envolviendo, que ahí sí caben y una fila
            deslizable en un ratón es peor que una lista completa. */}
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto no-scrollbar
                        -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
          {nav.enlaces.map((l, i) => (
            <a key={i} href={l.url || '#'} target={l.url?.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors flex-shrink-0 whitespace-nowrap">
              {l.label}
            </a>
          ))}
          {/* Las secciones del evento salen de la MISMA lista que usan sus
              páginas (`seccionesDe`), con la misma forma y el mismo color.
              Aquí había cinco enlaces escritos a mano y pintados de cinco
              colores —dorado, ámbar, verde y dos grises— sin que el color
              significara nada, y con etiquetas que no coincidían con las de la
              barra de las sub-páginas: «Ver Torneo» aquí, «Torneo» allí. Dos
              listas del mismo conjunto siempre acaban diciendo cosas
              distintas.

              «Inicio» se salta: en la portada, es donde ya estamos. */}
          {seccionesDe(evento, nav).filter(x => x.id !== 'inicio').map(x => (
            <Link key={x.id} to={`/explorar/${slug}/${x.ruta}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border
                         text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors
                         flex-shrink-0 whitespace-nowrap">
              <Icono nombre={x.icono} className="w-4 h-4" />{x.label}
            </Link>
          ))}
          {nav.mostrar_compartir && <ShareButton />}
        </div>
      </div>

      {/* Quien ya tiene boleta: reconocerlo y darle sus dos salidas (ver la
          boleta, apuntarse a actividades) en vez de sólo el botón de
          registrarse otra vez. */}
      <BoletaConocida slug={slug} />

      {/* Contenedor único que envuelve TODO el contenido restante (imagen + bloques + footer):
          la píldora es sticky dentro de este contenedor, así que se mantiene visible mientras
          se hace scroll por toda la página, no solo mientras se ve la imagen de portada. */}
      <div className="relative">
        {/* La píldora va por debajo de la barra de salidas, que ahora también
            es fija: a `top-4` quedaría tapada por ella. El desplazamiento es
            la altura REAL de esa barra (medida con ResizeObserver arriba), no
            un número fijo — en móvil, con los enlaces envueltos a dos filas,
            72px deja de ser cierto y las dos barras se solapan. */}
        {hasCover ? (
          <div className="mb-8">
            {(() => {
              /* Tamaño de la portada según el bloque "Portada" (full-bleed o
                 contenida, con proporción configurable). */
              const portadaData = (activePage?.blocks || []).find(b => b.type === 'portada')?.data || {};
              const { contenido, ratio } = coverLayout(portadaData);
              return contenido ? (
                <div className="overflow-hidden border border-border rounded-3xl bg-surface-2" style={{ aspectRatio: ratio }}>
                  <img src={evento.cover_url} alt={evento.titulo} className="w-full h-full object-cover" />
                </div>
              ) : (
                /* Full-bleed: se sale del ancho máximo y llega de borde a borde de la pantalla. */
                <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden border-y sm:border border-border sm:rounded-3xl -mt-[52px] pt-[52px]">
                  <div className="w-full bg-surface-2" style={{ aspectRatio: ratio }}>
                    <img src={evento.cover_url} alt={evento.titulo} className="w-full h-full object-cover" />
                  </div>
                </div>
              );
            })()}

            {nombreOrg && (
              <p className="text-xs text-text-3 text-center mt-3">
                Presentado por <span className="text-text-2 font-medium">{nombreOrg}</span>
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Fallback sin portada: logo grande centrado + pestañas como antes */}
            <div className="mb-8">
              <BrandHeader organizador={organizador} size="lg" />
            </div>
          </>
        )}

        {/* Lista de espera: el aviso de que este cupo es suyo va arriba del
            todo y antes de las boletas. Si el enlace ya caducó también se
            dice, porque la alternativa es que la persona lo descubra tras
            rellenar el formulario. */}
        {cupoToken && cupo !== null && (
          <AvisoCupo
            cupo={cupo}
            /* El tipo de boleta puede haber dejado de estar a la venta desde
               que salió el correo. Sin esto el botón «Tomar mi cupo» no hacía
               NADA al pulsarlo: ni abría el formulario ni decía por qué, que
               es la peor forma de negarse. */
            tipoDisponible={(evento.ticket_types || []).some(x => x.id === cupo?.ticket_type_id)}
            onTomar={() => {
              const t = (evento.ticket_types || []).find(x => x.id === cupo?.ticket_type_id);
              if (t) setReservaTipo(t);
            }} />
        )}

        {/* Contenido de la página: lienzo libre o bloques ordenados */}
        {activePage?.modo === 'lienzo' && activePage?.canvas?.elementos?.length > 0 ? (
          <div key={activePage?.id} className="animate-[fadeUp_0.4s_ease_both]">
            <CanvasPublico
              canvas={activePage.canvas}
              evento={evento}
              boletasRender={
                <BloqueBoletasCanvas evento={evento} onReservar={setReservaTipo} onWaitlist={setWaitlistTipo} />
              }
            />
          </div>
        ) : (
        <div className="space-y-8" key={activePage?.id}>
          {blocksVisibles(activePage, hasCover).map(block => {
            if (block.type === 'lienzo') {
              return (
                <div key={block.id} className="animate-[fadeUp_0.4s_ease_both] -mx-4 sm:mx-0">
                  <CanvasPublico
                    canvas={block.data?.canvas}
                    evento={evento}
                    boletasRender={<BloqueBoletasCanvas evento={evento} onReservar={setReservaTipo} onWaitlist={setWaitlistTipo} />}
                  />
                </div>
              );
            }
            const B = BLOCKS[block.type];
            if (!B) return null;
            const Preview = B.Preview;
            const animCls = { aparecer: 'gk-anim-fade', subir: 'gk-anim-up', bajar: 'gk-anim-down', zoom: 'gk-anim-zoom', izq: 'gk-anim-left', der: 'gk-anim-right', rebote: 'gk-anim-bounce', girar: 'gk-anim-rotate', voltear: 'gk-anim-flip', desenfoque: 'gk-anim-blur' }[block.data?._anim] || 'animate-[fadeUp_0.4s_ease_both]';
            const animStyle = block.data?._anim ? { animationDuration: `${block.data?._animDur || 0.8}s`, animationDelay: `${block.data?._animDelay || 0}s` } : undefined;
            const ancho = block.data?._ancho === 'full' ? '' : block.data?._ancho === 'angosto' ? 'max-w-xl mx-auto' : 'max-w-4xl mx-auto';
            return (
              <div key={block.id} className={`gk-bloque ${animCls} ${ancho}`} style={animStyle}>
                <Preview data={block.data || {}} evento={evento} onReservar={setReservaTipo} onWaitlist={setWaitlistTipo} />
              </div>
            );
          })}
        </div>
        )}

        {/* Volver a explorar (oculto en modo standalone).
            El enlace va `inline-block` con aire: siendo `inline`, su caja medía
            sólo la altura del texto —15 px— y quedaba por debajo de cualquier
            recomendación de zona de toque. */}
        <div className="mt-12 text-center">
          {!isStandalone && (
            <Link to={conSesion ? '/app/explorar' : '/explorar'}
              className="inline-block py-2.5 sm:py-0 text-xs text-text-3 hover:text-text-1 transition-colors">
              Volver a explorar
            </Link>
          )}
          <PoweredBy organizador={organizador} />
        </div>
      </div>

      {/* Modales */}
      {reservaTipo && (
        <ReservaModal
          tipo={reservaTipo}
          slug={slug}
          currency={evento.currency}
          evento={evento}
          /* Sólo si la oferta es para ESTA boleta: el token guarda un cupo
             concreto, no una entrada libre a cualquier tipo del evento. */
          cupoToken={cupo && cupo.ticket_type_id === reservaTipo.id ? cupoToken : ''}
          onClose={() => setReservaTipo(null)}
          onSuccess={(t) => {
            setReservaTipo(null);
            setReservaOk(t);
            /* Para que al volver a esta página se le reconozca (§4.2). */
            if (t?.codigo) guardarBoleta(slug, t.codigo);
          }}
        />
      )}
      {reservaOk && (
        <ConfirmacionModal ticket={reservaOk} evento={evento} slug={slug} checkout={evento.page_json?.checkout || {}} onClose={() => setReservaOk(null)} />
      )}
      {waitlistTipo && (
        <WaitlistModal
          tipo={waitlistTipo}
          slug={slug}
          onClose={() => setWaitlistTipo(null)}
        />
      )}
    </section>
    </BrandingProvider>
  );
}

/* ─────────── Botón compartir (genera link standalone, sin la app GESTEK) ─────────── */
function ShareButton() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('standalone', '1');
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {copied ? '¡Copiado!' : 'Compartir'}
    </button>
  );
}

/* ─────────── Modal lista de espera ─────────── */
function WaitlistModal({ tipo, slug, onClose }) {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '' });
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState('');
  const [captcha, setCaptcha] = useState(null);
  /* Mismo cerrojo que en la reserva: dos toques seguidos apuntaban dos veces
     a la misma persona y le daban dos puestos en la fila. */
  const enviando = useRef(false);

  const submit = async (e) => {
    e.preventDefault();
    if (turnstileActivo && !captcha) { setErr('Completá la verificación anti-bot.'); return; }
    if (enviando.current) return;
    enviando.current = true;
    setWorking(true); setErr('');
    try {
      const { waitlistApi } = await import('../../api/waitlist.js');
      const r = await waitlistApi.join(slug, {
        ticket_type_id: tipo.id,
        nombre: form.nombre, email: form.email,
        captcha_token: captcha,
      });
      setDone({ posicion: r.entry?.posicion });
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { enviando.current = false; setWorking(false); }
  };

  return (
    <ModalShell onClose={onClose}>
      {done ? (
        <div className="text-center py-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-warning/15 border border-warning/30 mb-5">
            <svg className="w-7 h-7 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight mb-2">¡Estás en la lista!</h2>
          <p className="text-sm text-text-2 mb-5 leading-relaxed max-w-sm mx-auto">
            Sos el <strong className="text-text-1">#{done.posicion}</strong> en la lista de espera de <strong className="text-text-1">{tipo.nombre}</strong>. Si se libera un cupo, el organizador te contactará por email.
          </p>
          <button onClick={onClose} className="px-5 py-2.5 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-all">
            Entendido
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-2">Lista de espera</p>
            <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">{tipo.nombre}</h2>
            <p className="text-sm text-text-2 mt-2 leading-relaxed">
              Este tipo de boleta está agotado. Anotate y te avisamos si se libera un cupo.
            </p>
          </div>
          {err && <div className="px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger-light text-sm">{err}</div>}
          <div className="field">
            <label className="label">Nombre completo *</label>
            <input required autoComplete="name" value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
              className="input-form" placeholder="Tu nombre" autoFocus />
          </div>
          <div className="field">
            <label className="label">Email *</label>
            <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
              className="input-form" placeholder="tu@email.com" />
          </div>
          <div className="field">
            <label className="label">Teléfono <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
            <input value={form.telefono} onChange={e => setForm(f => ({...f, telefono: e.target.value}))}
              className="input-form" placeholder="300 000 0000" />
          </div>
          <Turnstile onToken={setCaptcha} />
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-full text-sm text-text-2 hover:text-text-1">Cancelar</button>
            <button type="submit" disabled={working}
              className="px-5 py-2.5 rounded-full bg-warning/90 text-bg hover:bg-warning text-sm font-semibold disabled:opacity-60 transition-all">
              {working ? 'Anotando...' : 'Anotarme en la lista'}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}


/* ─────────── Modales de reserva ─────────── */
/* Aviso del cupo que llegó por correo. Dos caras: la buena, con el plazo a la
   vista, y la de "llegaste tarde", que hay que decir igual — enterarse al
   pulsar Reservar, después de escribirlo todo, es peor. */
/* Por qué no vale un enlace de cupo, dicho para cada caso.
 *
 * Antes los tres compartían una frase: «o se usó, o se pasó el plazo… sigues
 * en la fila». A quien YA COMPRÓ con ese enlace eso le dice que espere un
 * correo que no va a llegar —ya tiene su boleta—, y encima puede hacerle
 * comprar otra vez. Una frase que vale para todos no vale para ninguno. */
const CUPO_NO_VALE = {
  ya_usado: {
    titulo: 'Ese cupo ya lo tomaste',
    texto: 'Tu boleta está emitida. Búscala en el correo que te llegó al reservarla; si no aparece, mira también en spam.',
  },
  vencido: {
    titulo: 'Se pasó el plazo de tu cupo',
    texto: 'El sitio que te guardamos volvió a la lista. Sigues en la fila: si se libera otro, te avisamos.',
  },
  paso_al_siguiente: {
    titulo: 'Ese cupo ya le tocó a otra persona',
    texto: 'Sigues en la fila: si se libera otro, te volvemos a avisar.',
  },
  desconocido: {
    titulo: 'Ese enlace de cupo ya no vale',
    texto: 'O se usó, o se pasó el plazo y le tocó al siguiente de la lista.',
  },
};

function AvisoCupo({ cupo, onTomar, tipoDisponible = true }) {
  if (!cupo?.valida) {
    const { titulo, texto } = CUPO_NO_VALE[cupo?.motivo] || CUPO_NO_VALE.desconocido;
    return (
      <div className="mb-8 rounded-2xl border border-warning/30 bg-warning/5 px-5 py-4">
        <p className="text-sm font-semibold text-text-1">{titulo}</p>
        <p className="text-sm text-text-2 mt-1">{texto}</p>
      </div>
    );
  }

  const expira = cupo.expira ? new Date(cupo.expira) : null;
  const cuando = expira && !Number.isNaN(expira.getTime())
    ? expira.toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div className="mb-8 rounded-2xl border border-success/40 bg-success/5 px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-1">
          Se liberó un cupo y es tuyo{cupo.ticket_type_nombre ? ` · ${cupo.ticket_type_nombre}` : ''}
        </p>
        <p className="text-sm text-text-2 mt-1">
          {cuando
            ? <>Te lo guardamos hasta el <strong className="text-text-1">{cuando}</strong>. Pasado ese momento le toca al siguiente de la lista.</>
            : 'Te lo guardamos un rato. Después le toca al siguiente de la lista.'}
        </p>
      </div>
      {tipoDisponible
        ? <button onClick={onTomar} className="btn-gradient flex-shrink-0">Tomar mi cupo</button>
        : <p className="text-sm text-text-2 flex-shrink-0">
            Esa boleta ya no está a la venta. Escribe a quien organiza el evento
            con este correo a mano.
          </p>}
    </div>
  );
}

export function ReservaModal({ tipo, slug, currency, evento, cupoToken = '', onClose, onSuccess, embebido = false }) {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '' });
  const [respuestas, setRespuestas] = useState({});
  /* Lo que trajo el padrón, para poder decir qué queda por rellenar. */
  const [prellenado, setPrellenado] = useState(null);
  const [working, setWorking] = useState(false);
  /* Ver el cerrojo en `submit`: `working` pinta, esto impide. */
  const enviando = useRef(false);
  const [err, setErr] = useState('');
  const [captcha, setCaptcha] = useState(null);
  const [acepta, setAcepta] = useState(false);
  const [confirmaEdad, setConfirmaEdad] = useState(false);
  const hasEarly = tipo.early_bird_precio != null && tipo.early_bird_hasta && new Date(tipo.early_bird_hasta) > new Date();
  const precioLista = hasEarly ? Number(tipo.early_bird_precio) : Number(tipo.precio);

  /* Código de descuento.
     El panel deja crear promociones desde hace tiempo y aquí no había dónde
     escribirlas: el organizador anunciaba un código y la página cobraba el
     precio entero. Lo que se manda al servidor es el CÓDIGO; el importe lo
     calcula él y lo vuelve a calcular al cobrar. Esto de aquí sólo pinta. */
  const [promoCodigo, setPromoCodigo] = useState('');
  const [promo, setPromo] = useState(null);
  const [promoErr, setPromoErr] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);

  const precio = promo ? promo.precio : precioLista;
  /* Gratis de salida o gratis por un código del 100 %: en los dos casos no hay
     nada que cobrar y la boleta se reserva sin pasar por la pasarela —que
     rechaza cobros de cero—. */
  const isFree = precio === 0;
  const tienePagoSimple = Boolean(evento?.pago_llave || evento?.pago_qr_url);
  const pagoWompi = Boolean(evento?.pago_wompi);
  const pagoMp = Boolean(evento?.pago_mp);
  const gatewayRef = useRef(pagoWompi ? 'wompi' : 'mp');
  /* Campos aplicables a ESTE tipo de boleta: los globales + los propios del
     tipo, y de esos, los que las respuestas de ahora dejan ver.

     Va aquí y no al pintar cada campo porque de esta lista salen también los
     módulos, el paginado y la validación: si el filtro estuviera más abajo, un
     paso podría quedarse sin ninguna pregunta visible y aun así aparecer como
     un paso vacío que hay que pasar. */
  const camposDelTipo = (evento?.campos_formulario || []).filter(c => !c.ticket_type_id || c.ticket_type_id === tipo.id);
  const camposForm = camposVisibles(camposDelTipo, respuestas);
  const checkout = evento?.page_json?.checkout || {};
  /* Nombre y correo siguen siendo obligatorios por defecto (`undefined` cuenta
     como «sí exigido») — así ningún evento existente cambia de comportamiento
     sin que el organizador lo apague a propósito, igual que ya pasa con
     `requiere_telefono` pero en la dirección contraria. */
  const requiereNombre = checkout.requiere_nombre !== false;
  const requiereEmail  = checkout.requiere_email  !== false;

  /* Módulos. El reparto lo decide la columna «Grupo» de la plantilla, no este
     archivo: ver lib/modulosFormulario.js para por qué por grupo y no cada N.

     El paso 0 son siempre los datos de la persona. Nombre y correo no son
     preguntas del organizador: son lo que necesita la plataforma para emitir
     la boleta y mandarla, así que van primero y aparte. */
  const modulos = dividirEnModulos(camposForm);
  const paginado = convienePaginar(modulos, camposForm.length);
  const pasos = paginado ? ['Tus datos', ...modulos.map(m => m.titulo)] : [];
  const [paso, setPaso] = useState(0);
  /* Hacia dónde se fue el último cambio, para que el bloque de campos entre
     por el lado que corresponde: desde la derecha al avanzar, desde la
     izquierda al volver. Sin esto los campos se sustituyen de golpe y en
     catorce pasos seguidos no hay forma de saber si uno avanzó o retrocedió. */
  const [haciaAdelante, setHaciaAdelante] = useState(true);
  const irAPaso = (n) => {
    setHaciaAdelante(prev => (typeof n === 'number' ? n >= paso : prev));
    setPaso(n);
  };
  const enUltimo = !paginado || paso >= pasos.length - 1;
  /* Los del paso que se está mirando; en el 0 no hay ninguno del organizador. */
  const camposDelPaso = paginado ? (modulos[paso - 1]?.campos || []) : camposForm;

  /* La entrada va en CADA campo y no en un envoltorio: son hijos directos de
     la rejilla y meter un div en medio rompería las dos columnas. Doce píxeles
     y 180 ms — lo justo para leer la dirección del cambio sin que catorce
     pasos seguidos se sientan lentos.

     Las dos clases van escritas ENTERAS y no armadas con plantilla: Tailwind
     las genera leyendo el código, y una clase construida en tiempo de
     ejecución no la ve nadie — el estilo no existiría.

     SIN `_both` a propósito: con `both` el `transform` del último fotograma se
     queda pegado en cada campo para siempre, y un `transform` —aunque sea la
     identidad y no mueva nada— crea un contexto de apilamiento. Eso encerraba
     la lista de `SelectorBuscable` (que es `absolute z-30`) dentro de su
     propio campo: su z-index no podía subir por encima del campo siguiente y
     la lista salía DEBAJO del `<select>` que venía después. Sin fill-mode el
     transform desaparece al acabar la animación (180 ms) y el apilamiento con
     él; el estado final —opacity 1, sin desplazamiento— es el natural del
     campo, así que no se nota ningún salto al terminar. */
  const claseEntrada = !paginado ? ''
    : haciaAdelante
      ? 'animate-[pasoAdelante_180ms_cubic-bezier(0.16,1,0.3,1)]'
      : 'animate-[pasoAtras_180ms_cubic-bezier(0.16,1,0.3,1)]';

  const setRespuesta = (id, value) => setRespuestas(r => ({ ...r, [id]: value }));

  /* Términos PROPIOS del evento (0059). Si el organizador los publicó, la
     casilla es obligatoria y la aceptación queda registrada con la boleta. */
  const legal = useLegalEvento(slug);

  /* Los errores se guardan POR CAMPO y se pintan en el campo. El cuadro de
     arriba sigue para lo que no pertenece a ninguno (captcha, términos). */
  const [errCampos, setErrCampos] = useState({});
  const [errForm, setErrForm] = useState({});

  /* Avanzar valida SÓLO el módulo que se está mirando. Dejarlo todo para el
     final significa pulsar «Confirmar» y que te manden tres pantallas atrás,
     que es la forma más rápida de perder a alguien que ya escribió veinte
     respuestas. Devuelve cuántos fallos encontró. */
  const validarPasoActual = () => {
    if (paso === 0) {
      const mal = {
        email: verificar('email', form.email),
        telefono: verificar('telefono', form.telefono),
      };
      setErrForm(mal);
      /* El `required` del HTML no sirve con módulos: al cambiar de paso el
         campo sale del DOM y el navegador deja de mirarlo. */
      if (requiereNombre && !form.nombre.trim()) { setErr('Necesitamos tu nombre.'); return 1; }
      if (requiereEmail && !form.email.trim()) { setErr('Necesitamos tu correo.'); return 1; }
      if (checkout.requiere_telefono && !form.telefono.trim()) { setErr('El teléfono es obligatorio.'); return 1; }
      const cuantos = Object.values(mal).filter(Boolean).length;
      setErr(cuantos ? 'Revisa el dato marcado abajo.' : '');
      return cuantos;
    }
    const fallos = fallosDe(camposDelPaso, respuestas, tipo.id);
    setErrCampos(prev => ({ ...prev, ...fallos }));
    const cuantos = Object.keys(fallos).length;
    setErr(cuantos === 0 ? ''
      : cuantos === 1 ? 'Revisa el dato marcado abajo.'
      : `Faltan ${cuantos} datos de este bloque.`);
    return cuantos;
  };

  /* Llevar a lo que falta, no sólo decirlo.
   *
   * El aviso dice «Revisa el dato marcado abajo» y hasta ahora no llevaba a
   * ningún sitio. Con el teclado abierto —que se come media pantalla— eso deja
   * un final ciego: se pulsa «Continuar», la pantalla no se mueve, el aviso
   * queda fuera por arriba y lo que parece es que el botón no funciona.
   * Medido a 375×420, que es un móvil con el teclado abierto: el aviso a
   * −138 px y la página sin moverse.
   *
   * Se lleva al CAMPO y no al aviso: el aviso dice que hay un problema, el
   * campo es donde se arregla. Y se le da el foco, que en un móvil abre el
   * teclado justo donde toca escribir.
   *
   * Va en un EFECTO y no en un `requestAnimationFrame` justo después de
   * validar. Probado: con `rAF` el marcado todavía no está en el DOM —React
   * agrupa y pinta después— así que no se encontraba nada y el foco se quedaba
   * donde estaba. El efecto corre cuando el marcado ya existe, que es la única
   * forma de estar seguro. */
  const [buscarFallo, setBuscarFallo] = useState(0);
  const irAloQueFalta = () => setBuscarFallo(n => n + 1);

  useEffect(() => {
    if (!buscarFallo) return;
    const malo = document.querySelector('[aria-invalid="true"]');
    if (!malo) return;
    malo.scrollIntoView({ block: 'center', behavior: 'smooth' });
    /* `preventScroll` para que el foco no deshaga el desplazamiento suave con
       un salto seco. */
    try { malo.focus({ preventScroll: true }); } catch { malo.focus(); }
  }, [buscarFallo]);

  const avanzar = () => {
    if (validarPasoActual() > 0) { irAloQueFalta(); return; }
    irAPaso(Math.min(paso + 1, pasos.length - 1));
  };

  /* Comprobar el código antes de pagar. Contesta el servidor —con la MISMA
     función con la que va a cobrar un minuto después—, así que lo que se
     enseña aquí y lo que se cobra no pueden discrepar. Si el código no vale,
     dice por qué: «no existe», «ya venció» y «es para otra boleta» son
     problemas distintos y con arreglos distintos. */
  const aplicarPromo = async () => {
    const codigo = promoCodigo.trim().toUpperCase();
    if (!codigo) return;
    setPromoBusy(true); setPromoErr('');
    try {
      const r = await promocionesApi.validar(slug, { codigo, ticket_id: tipo.id, cantidad: 1 });
      if (!r.valida) { setPromo(null); setPromoErr(r.motivo || 'Ese código no vale para esta boleta.'); return; }

      /* El precio tiene que venir del servidor, y tiene que ser un número.
       *
       * Esto no es paranoia: es la ventana entre desplegar esta pantalla y
       * desplegar la API. La versión anterior de `/promocion/validar` contesta
       * `{ valida: true, tipo, valor, min_cantidad }` y **no manda `precio`**.
       * Sin esta guarda, `promo.precio` sería `undefined`, y la cabecera hace
       * `precio.toLocaleString(...)` — o sea que el modal de compra reventaría
       * entero en vez de cobrar mal, que es lo único peor que cobrar mal.
       *
       * Calcularlo aquí con `tipo` y `valor` sería peor todavía: enseñaría un
       * descuento que la API vieja no va a aplicar al cobrar. Mejor decir que
       * ahora no se puede. */
      const precioServidor = Number(r.precio);
      if (!Number.isFinite(precioServidor)) {
        setPromo(null);
        setPromoErr('Los códigos no se pueden aplicar ahora mismo. Vuelve a intentarlo en un rato.');
        return;
      }
      setPromo({
        ...r,
        codigo,
        precio: precioServidor,
        precio_lista: Number.isFinite(Number(r.precio_lista)) ? Number(r.precio_lista) : precioLista,
        ahorro: Number(r.ahorro) || Math.max(0, precioLista - precioServidor),
      });
    } catch (e) {
      setPromoErr(e.response?.data?.error || 'No se pudo comprobar el código.');
    } finally { setPromoBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    /* Con módulos, pulsar Enter dentro de un campo también llega aquí. Si
       todavía no es el último paso, esto es un «Continuar» y no un envío. */
    if (!enUltimo) { avanzar(); return; }
    if (turnstileActivo && !captcha) { setErr('Completá la verificación anti-bot.'); return; }
    if (requiereNombre && !form.nombre.trim()) { setErr('Necesitamos tu nombre.'); return; }
    if (requiereEmail && !form.email.trim()) { setErr('Necesitamos tu correo.'); return; }
    if (checkout.requiere_telefono && !form.telefono.trim()) { setErr('El teléfono es obligatorio.'); return; }
    if (checkout.edad_minima && !confirmaEdad) { setErr(`Debes confirmar que tienes al menos ${checkout.edad_minima} años.`); return; }
    if ((legal.exige || checkout.terminos_activo) && !acepta) { setErr('Debes aceptar los términos para continuar.'); return; }
    /* Misma regla que aplica el servidor (lib/formularioCampos.js). Antes aquí
       sólo se miraba el hueco: un correo mal escrito o una selección fuera de
       la lista pasaban el filtro y el rechazo llegaba del backend con las 22
       preguntas ya llenas. */
    /* Todos los fallos de golpe, no el primero: con 22 preguntas, corregir de
       una en una son 22 intentos. Se marcan en su campo y el cuadro de arriba
       sólo dice cuántos faltan. */
    const fallos = fallosDe(camposForm, respuestas, tipo.id);
    const malFormulario = {
      email: verificar('email', form.email),
      telefono: verificar('telefono', form.telefono),
    };
    setErrCampos(fallos);
    setErrForm(malFormulario);
    const cuantos = Object.keys(fallos).length + Object.values(malFormulario).filter(Boolean).length;
    if (cuantos > 0) {
      /* Con módulos, un fallo puede estar en una pantalla que ya no se ve.
         Marcarlo «abajo» sería mentira: hay que volver a donde está. La
         comprobación al avanzar hace esto raro, pero puede pasar si el
         organizador cambia el formulario a mitad del registro. */
      if (paginado) {
        const roto = Object.keys(fallos)[0];
        const iMod = roto ? modulos.findIndex(m => m.campos.some(c => String(c.id) === String(roto))) : -1;
        const destino = Object.values(malFormulario).some(Boolean) ? 0 : (iMod >= 0 ? iMod + 1 : 0);
        if (destino !== paso) {
          irAPaso(destino);
          setErr('Falta un dato en este bloque.');
          irAloQueFalta();
          return;
        }
      }
      setErr(cuantos === 1 ? 'Revisa el dato marcado abajo.' : `Revisa los ${cuantos} datos marcados abajo.`);
      irAloQueFalta();
      return;
    }
    /* Cerrojo del doble toque.
     *
     * `disabled={working}` no llega: el botón se deshabilita cuando React
     * pinta, y dos toques en el mismo fotograma —lo normal en un móvil con
     * un botón que tarda— entran los dos antes de eso. Cada uno emite SU
     * boleta: la misma persona acaba con dos, y en un tipo con cupo son dos
     * sitios ocupados. Un `ref` cambia en el acto, sin esperar a pintar. */
    if (enviando.current) return;
    enviando.current = true;
    setWorking(true); setErr('');
    try {
      /* El token del correo viaja con la compra: es lo que le da derecho al
         cupo que el servidor le está guardando. Sin él, el backend ve el sitio
         como reservado para otro y la venta se rechaza. */
      if (isFree || tienePagoSimple) {
        const res = await eventosApi.reservar(slug, {
          ticket_type_id: tipo.id,
          nombre: form.nombre, email: form.email, telefono: form.telefono,
          captcha_token: captcha, respuestas,
          ...(acepta ? { legal_aceptado: true } : {}),
          ...(cupoToken ? { waitlist_token: cupoToken } : {}),
          ...(promo ? { promocion_codigo: promo.codigo } : {}),
        });
        /* El PDF de la boleta se arma en el navegador con lo que se acaba de
           escribir: la respuesta de `reservar` sólo trae id, código y estado.
           Si no viajaran aquí, el archivo saldría sin nombre ni respuestas y
           habría que ir a buscarlas al servidor para nada. */
        onSuccess({
          ...res.ticket, requierePago: !isFree, tipo, pagoSimple: tienePagoSimple && !isFree,
          asistente: { nombre: form.nombre, email: form.email, telefono: form.telefono },
          respuestas,
        });
      } else {
        const body = { ticket_type_id: tipo.id, nombre: form.nombre, email: form.email, telefono: form.telefono, captcha_token: captcha, respuestas,
          ...(acepta ? { legal_aceptado: true } : {}),
          ...(cupoToken ? { waitlist_token: cupoToken } : {}),
          /* El código, no el precio. Si aquí viajara el importe, cambiarlo en
             las herramientas del navegador sería comprar a lo que uno quisiera:
             a la pasarela le decimos nosotros cuánto cobrar. */
          ...(promo ? { promocion_codigo: promo.codigo } : {}) };
        /* `irAPagar` navega igual que siempre en la página pública. Dentro del
           botón incrustado en la web de otro, en cambio, le pide al anfitrión
           que abra la pasarela en una pestaña de verdad: un checkout dentro de
           un iframe ajeno se rompe por las cookies de terceros, por el 3-D
           Secure —que se niega a cargarse enmarcado— y por la redirección de
           vuelta, que aterrizaría dentro del recuadro. */
        if (gatewayRef.current === 'wompi') {
          const res = await pagosApi.comprarWompi(slug, body);
          const url = res.checkout?.url;
          if (!url) throw new Error('Wompi no devolvió el link de pago.');
          irAPagar(url);
        } else {
          const res = await pagosApi.comprar(slug, body);
          const url = res.checkout?.init_point || res.checkout?.sandbox_init_point;
          if (!url) throw new Error('Mercado Pago no devolvió el link de pago.');
          irAPagar(url);
        }
      }
    } catch (e) { setErr(e.response?.data?.error || e.message); }
    /* Se suelta el cerrojo pase lo que pase: si falló, tiene que poder
       reintentar. Lo que no puede es salir dos veces a la vez. */
    finally    { enviando.current = false; setWorking(false); }
  };

  return (
    /* Ancho de verdad: con `max-w-md` (400px) menos el padding quedaban 352px,
       y dos columnas de 166px son peores que una. Con `3xl` quedan ~700px
       utiles, o sea dos columnas de ~340px, que es donde un correo o una
       direccion se leen enteros. El organizador puede subirlo o bajarlo desde
       Proceso de compra (`checkout.modal_ancho` / `modal_alto`). */
    <ModalShell onClose={onClose} embebido={embebido}
      ancho={anchoModal(checkout.modal_ancho, 'sm:max-w-3xl')}
      alto={altoModal(checkout.modal_alto)}>
      <form onSubmit={submit} className="grid-form">
        {/* La cabecera manda sobre todo lo demas: es el que y el cuanto. Ocupa
            la fila entera y el precio sube de tamano, que es el dato por el que
            la gente decide. */}
        <div className="ancho">
          <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-2">
            {isFree ? 'Reserva tu cupo' : 'Compra tu boleta'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-text-1 tracking-tight">{tipo.nombre}</h2>
          <div className="flex items-baseline gap-2 mt-2 flex-wrap">
            {/* Con descuento se enseñan los dos: el de antes tachado y el de
                ahora. Enseñar sólo el nuevo esconde justo lo que la persona
                quiere ver, que es cuánto se ahorró. */}
            {promo && promo.precio_lista > promo.precio && (
              <p className="text-lg text-text-3 line-through tabular-nums">
                ${promo.precio_lista.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </p>
            )}
            <p className="text-3xl font-bold font-display text-text-1 tabular-nums">
              {isFree ? 'Gratis' : `$${precio.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
            </p>
            {!isFree && <span className="text-xs text-text-3">{tipo.currency || currency}</span>}
            {promo && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {promo.codigo} · ahorras ${Number(promo.ahorro || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
          {/* Sólo si hay algo que descontar: en una boleta gratis un campo de
              código es una pregunta sin respuesta posible. */}
          {precioLista > 0 && (
            <div className="mt-3">
              {promo ? (
                <button type="button"
                  onClick={() => { setPromo(null); setPromoCodigo(''); setPromoErr(''); }}
                  className="text-xs text-text-3 underline hover:text-text-1">
                  Quitar el código {promo.codigo}
                </button>
              ) : (
                <div className="flex gap-2 items-start">
                  <input
                    value={promoCodigo}
                    onChange={(e) => { setPromoCodigo(e.target.value.toUpperCase()); setPromoErr(''); }}
                    placeholder="¿Tienés un código?"
                    aria-label="Código de descuento"
                    className="input flex-1 max-w-[14rem] font-mono uppercase" />
                  <button type="button" disabled={!promoCodigo.trim() || promoBusy}
                    onClick={aplicarPromo}
                    className="btn-ghost text-sm shrink-0">
                    {promoBusy ? 'Comprobando…' : 'Aplicar'}
                  </button>
                </div>
              )}
              {promoErr && <p className="text-xs text-danger mt-1">{promoErr}</p>}
            </div>
          )}
        </div>
        {/* Dónde estoy y cuánto falta. Con veintidós preguntas repartidas, un
            formulario sin esto se siente infinito: no se sabe si quedan dos
            pantallas o diez, y esa duda es la que hace abandonar. */}
        {paginado && (
          <div className="ancho">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <p className="text-sm font-semibold text-text-1">{pasos[paso]}</p>
              <p className="text-[11px] text-text-3 tabular-nums whitespace-nowrap">Paso {paso + 1} de {pasos.length}</p>
            </div>
            <div className="flex gap-1" role="presentation">
              {pasos.map((t, i) => (
                <span key={t + i} title={t}
                  className={`h-1 flex-1 rounded-full transition-colors ${i <= paso ? 'bg-primary' : 'bg-surface-2'}`} />
              ))}
            </div>
            {/* Si vino del padrón, qué le queda por rellenar. Se recalcula con
                las respuestas de AHORA y no con las que trajo el padrón: lo que
                ya escribió mientras avanzaba deja de contar como pendiente, que
                es lo que convierte esto en un avance y no en un reproche fijo. */}
            {prellenado?.encontrado && (() => {
              const quedan = (prellenado.faltan || []).filter(f => {
                const v = respuestas[f.id];
                return v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
              });
              if (!quedan.length) return (
                <p className="text-[11px] text-success mt-2">Ya no falta nada de lo que traíamos.</p>
              );
              return (
                <p className="text-[11px] text-text-3 mt-2">
                  Te falta{quedan.length === 1 ? '' : 'n'} por llenar: {quedan.map(f => f.etiqueta).join(', ')}.
                </p>
              );
            })()}
          </div>
        )}

        {err && <div className="ancho px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger-light text-sm">{err}</div>}

        {/* Nombre y correo ocupan fila entera: los dos se leen enteros o no se
            leen. Un correo cortado a 21 caracteres obliga a hacer scroll dentro
            del campo para releer lo que uno escribio. */}
        {/* El paso 0 también entra: si no, volver a él desde el 1 se siente
            como un salto seco justo después de haber visto deslizarse el resto. */}
        {(!paginado || paso === 0) && (<>
        <BuscarPorDocumento slug={slug} campos={camposDelTipo}
          onEncontrado={(r) => {
            setRespuestas(prev => ({ ...prev, ...r.respuestas }));
            setPrellenado(r);
          }} />
        <div className={`field ancho ${claseEntrada}`}>
          <label className="label" htmlFor="res-nombre">Nombre completo {requiereNombre
            ? <span className="text-danger-light">*</span>
            : <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span>}</label>
          {/* `autocomplete="name"`: el correo y el teléfono ya lo tenían y el
              nombre no, que es justo donde el móvil más escritura ahorra — y
              además es el primero, con el teclado recién abierto. Sin esto el
              teléfono no ofrece el nombre guardado. */}
          <input id="res-nombre" required={requiereNombre} autoComplete="name"
            value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
            className="input-form" placeholder="Tu nombre" autoFocus />
        </div>
        <div className={`field ancho ${claseEntrada}`}>
          <label className="label" htmlFor="res-email">Email {requiereEmail
            ? <span className="text-danger-light">*</span>
            : <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span>}</label>
          <input id="res-email" required={requiereEmail} type="email" inputMode="email" autoComplete="email"
            value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
            onBlur={() => setErrForm(v => ({ ...v, email: verificar('email', form.email) }))}
            aria-invalid={Boolean(errForm.email)}
            className={`input-form ${errForm.email ? 'field-error' : ''}`} placeholder="tu@email.com" />
          {errForm.email && <p className="text-[11px] text-danger-light mt-1">{errForm.email}</p>}
        </div>
        {/* El telefono si cabe en media: son diez digitos de forma conocida. */}
        <div className={`field ${claseEntrada}`}>
          <label className="label" htmlFor="res-tel">Teléfono {checkout.requiere_telefono
            ? <span className="text-danger-light">*</span>
            : <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span>}</label>
          <input id="res-tel" type="tel" inputMode="tel" autoComplete="tel"
            value={form.telefono} required={Boolean(checkout.requiere_telefono)}
            onChange={e => setForm(f => ({...f, telefono: e.target.value}))}
            onBlur={() => setErrForm(v => ({ ...v, telefono: verificar('telefono', form.telefono) }))}
            aria-invalid={Boolean(errForm.telefono)}
            className={`input-form ${errForm.telefono ? 'field-error' : ''}`} placeholder="300 000 0000" />
          {errForm.telefono && <p className="text-[11px] text-danger-light mt-1">{errForm.telefono}</p>}
        </div>
        </>)}

        {/* Cada pregunta decide su ancho segun su tipo: lo corto y de forma
            conocida en media columna, el resto entero. La regla vive en
            CampoFormulario, que es el unico que sabe de tipos. */}
        {camposDelPaso.map(c => (
          /* La clave lleva el paso para que React remonte el campo al cambiar
             de módulo; sin eso reutilizaría el nodo y la entrada no se
             dispararía. */
          <div key={`${paso}:${c.id}`} className={`${ocupaFila(c) ? 'ancho ' : ''}${claseEntrada}`}>
            <CampoFormulario campo={c} value={respuestas[c.id]} onChange={v => setRespuesta(c.id, v)}
              eventoId={evento?.id} error={errCampos[c.id]} />
          </div>
        ))}

        {/* El cierre —edad, términos, anti-bot, pago— sólo en el último paso.
            Pedir la aceptación de unas condiciones en la primera pantalla, con
            la mitad del formulario aún por delante, es pedirla antes de que
            haya nada que aceptar. */}
        {enUltimo && (<>
        {checkout.edad_minima > 0 && (
          <label className="ancho flex items-start gap-2.5 text-sm text-text-2 cursor-pointer">
            <input type="checkbox" checked={confirmaEdad} onChange={e => setConfirmaEdad(e.target.checked)} className="w-4 h-4 mt-0.5 rounded accent-primary" />
            <span>Confirmo que tengo al menos <strong className="text-text-1">{checkout.edad_minima}</strong> años.</span>
          </label>
        )}
        {/* Los del EVENTO (0059). Si el organizador no publicó los suyos, este
            componente enlaza los de GESTEK y no bloquea. El `terminos_activo`
            viejo de page_json se respeta como casilla extra sólo si el
            organizador lo dejó encendido y no tiene documentos propios. */}
        <div className="ancho">
          <AceptarTerminos slug={slug} estado={legal} aceptado={acepta} onChange={setAcepta} />
        </div>
        {!legal.exige && checkout.terminos_activo && (
          <label className="flex items-start gap-2.5 text-sm text-text-2 cursor-pointer">
            <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} className="w-4 h-4 mt-0.5 rounded accent-primary" />
            <span>
              {checkout.terminos_texto || 'He leído y acepto los términos y condiciones.'}
              {checkout.terminos_url && <> <a href={checkout.terminos_url} target="_blank" rel="noreferrer noopener" className="text-primary-light hover:underline">Ver términos</a></>}
            </span>
          </label>
        )}
        {!isFree && tienePagoSimple && (
          <div className="rounded-2xl bg-warning/10 border border-warning/25 px-4 py-3 text-xs text-text-2 leading-relaxed space-y-2">
            <p className="font-semibold text-warning-light">Pago manual vía Mercado Pago</p>
            {evento.pago_llave && (
              <p>Pagá <strong className="text-text-1">${precio.toLocaleString('es-CO')} {tipo.currency || currency}</strong> a la llave/alias <span className="font-mono text-text-1">{evento.pago_llave}</span> en tu app de MP.</p>
            )}
            {evento.pago_qr_url && (
              <div className="mt-2">
                <p className="mb-2">Escaneá este QR desde tu app de MP:</p>
                <img src={evento.pago_qr_url} alt="QR Mercado Pago" className="w-40 h-40 rounded-xl bg-white object-contain mx-auto p-2" />
              </div>
            )}
            {evento.pago_instrucciones && (
              <p className="text-text-3 mt-1">{evento.pago_instrucciones}</p>
            )}
            <p className="text-text-3 mt-2 pt-2 border-t border-warning/15">
              Al continuar, tu boleta queda <strong className="text-text-1">reservada</strong> pero pendiente de confirmación. El organizador la valida cuando reciba el pago.
            </p>
          </div>
        )}
        {!isFree && !tienePagoSimple && (pagoWompi || pagoMp) && (
          <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 text-xs text-text-2 leading-relaxed">
            Al continuar serás redirigido a la pasarela para completar el pago de forma segura. Al volver verás tu boleta con QR.
          </div>
        )}
        {!isFree && !tienePagoSimple && !pagoWompi && !pagoMp && (
          <div className="rounded-2xl bg-danger/10 border border-danger/20 px-4 py-3 text-xs text-danger-light leading-relaxed">
            El organizador aún no configuró un método de pago online para este evento.
          </div>
        )}
        <Turnstile onToken={setCaptcha} />
        </>)}

        <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
          {/* Sin la flecha. Se pidió quitar «← Atrás» porque se ve mal, y la
              flecha era lo que se veía mal: el botón en sí es la navegación de
              un formulario de cuatro pasos, y sin él alguien que va por el
              tercero se queda encerrado. Así queda con el mismo peso visual
              que «Cancelar», que es lo que es — una salida secundaria. */}
          {paginado && paso > 0
            ? <button type="button" onClick={() => { setErr(''); irAPaso(Math.max(0, paso - 1)); }}
                className="px-4 py-2.5 rounded-full text-sm text-text-2 hover:text-text-1">Atrás</button>
            : <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-full text-sm text-text-2 hover:text-text-1">Cancelar</button>}
          {!enUltimo ? (
            <button type="button" onClick={avanzar}
              className="px-5 py-2.5 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-all">
              Continuar
            </button>
          ) : (isFree || tienePagoSimple) ? (
            <button type="submit" disabled={working}
              className="px-5 py-2.5 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold disabled:opacity-60 transition-all">
              {working ? 'Reservando...' : (isFree ? 'Confirmar reserva' : 'Apartar boleta')}
            </button>
          ) : (<>
            {pagoWompi && (
              <button type="submit" disabled={working} onClick={() => { gatewayRef.current = 'wompi'; }}
                className="px-5 py-2.5 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold disabled:opacity-60 transition-all">
                {working ? 'Redirigiendo…' : 'Pagar con Wompi'}
              </button>
            )}
            {pagoMp && (
              <button type="submit" disabled={working} onClick={() => { gatewayRef.current = 'mp'; }}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-60 transition-all ${pagoWompi ? 'border border-border-2 text-text-1 hover:bg-surface-2' : 'bg-text-1 text-bg hover:bg-white'}`}>
                {working ? 'Redirigiendo…' : 'Pagar con Mercado Pago'}
              </button>
            )}
          </>)}
        </div>
      </form>
    </ModalShell>
  );
}

/* El «track» sólo dice algo si el evento tiene varias líneas. Medido contra
   Festech: su única actividad con inscripción viene con `track: "principal"`,
   que es el valor por defecto de la agenda. Enseñarlo es peor que no enseñar
   nada — llena el hueco de la descripción con algo que parece información. */
const TRACKS_VACIOS = new Set(['principal', 'general', 'default', 'main']);
const trackUtil = (t) => {
  const v = String(t ?? '').trim();
  return TRACKS_VACIOS.has(v.toLowerCase()) ? '' : v;
};

export function ConfirmacionModal({ ticket, evento = {}, slug, checkout = {}, onClose, embebido = false }) {
  const qrValue = ticket.qr_token || ticket.codigo;
  const [bajando, setBajando] = useState(false);

  /* El segundo registro, aquí mismo.
     La entrada al evento no da acceso a los talleres que piden inscripción
     aparte, y hasta ahora enterarse de eso dependía de volver a la agenda por
     tu cuenta días después. Este es el único momento en que la persona está
     mirando: acaba de reservar y tiene su código delante.
     No hace falta cuenta en GESTEK: la boleta recién emitida es la
     identificación, y el modal de inscripción la da por buena sin pedir
     nombre ni correo otra vez. */
  const [subeventos, setSubeventos] = useState([]);
  const [preguntas, setPreguntas] = useState({});
  const [inscribiendo, setInscribiendo] = useState(null);
  const [inscritas, setInscritas] = useState(new Set());
  /* Dos vistas dentro de la misma confirmación: la boleta, y la lista de
     sub-eventos. Se pidió que «Listo» pasara a «Ver sub-eventos» y que apuntarse
     a varios fuera el paso siguiente, no una tarjeta al margen.

     Y una tercera, la despedida: «Listo» devolvía a la página de boletas —con
     «Reservar» otra vez delante de quien acababa de reservar—, así que el
     flujo no terminaba, se repetía. Ahora cierra con un cierre. */
  const [vista, setVista] = useState('boleta');   // 'boleta' | 'subeventos' | 'cierre'
  const [apuntando, setApuntando] = useState(null); // id del sub-evento en curso

  useEffect(() => {
    if (!slug) return;
    let vivo = true;
    eventosApi.sesionesPublicas(slug)
      .then(d => {
        if (!vivo) return;
        setSubeventos((d.sesiones || []).filter(s => s.requiere_inscripcion && !s.lleno));
        setPreguntas(d.preguntas || {});
      })
      .catch(() => { /* sin agenda o sin sub-eventos: no se ofrece nada */ });
    return () => { vivo = false; };
  }, [slug]);

  const pendientes = subeventos.filter(s => !inscritas.has(s.id));

  /* Apuntar sin abrir formulario: para los sub-eventos que no piden datos, la
     boleta ya identifica a la persona y basta un toque. Los que sí piden datos
     (modo 'propio' con preguntas) abren InscripcionSesionModal. */
  const apuntarDirecto = async (s) => {
    setApuntando(s.id);
    try {
      await eventosApi.inscribirSesion(slug, s.id, { codigo: ticket.codigo });
      setInscritas(prev => new Set(prev).add(s.id));
      setSubeventos(prev => prev.map(x => x.id === s.id
        ? { ...x, libres: x.libres == null ? null : Math.max(0, x.libres - 1) }
        : x));
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'No se pudo apuntar. Puedes intentarlo desde la agenda del evento.');
    } finally { setApuntando(null); }
  };

  /* La fecha para la despedida. Sin hora: lo que hay que recordar al salir es
     el día. Si el evento no tiene fecha, la frase se queda sin ella en vez de
     decir «Invalid Date». */
  const fechaEvento = useMemo(() => {
    const d = evento.fecha_inicio ? new Date(evento.fecha_inicio) : null;
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [evento.fecha_inicio]);

  const redirectUrl = checkout.redirect_url;
  /* A dónde vuelve la persona para ver su boleta. Vacío → la página /mi-ticket de
     GESTEK. Con enlace propio (Festech quiere el suyo) → ese, con `{codigo}`
     reemplazado y abriéndose en pestaña nueva por ser externo. */
  const enlacePropio = checkout.enlace_boleta?.trim();
  const urlBoleta = enlacePropio
    ? enlacePropio.replace('{codigo}', encodeURIComponent(ticket.codigo))
    : `/mi-ticket/${ticket.codigo}`;
  const textoBoleta = enlacePropio ? urlBoleta : enlaceBoleta(evento, ticket.codigo);
  useEffect(() => {
    /* Sin redirección automática mientras la persona está mirando los
       sub-eventos: sacarla de la pantalla a media inscripción sería peor que no
       redirigir. */
    if (redirectUrl && checkout.redirect_auto && vista === 'boleta') {
      const t = setTimeout(() => { window.location.href = redirectUrl; }, 5000);
      return () => clearTimeout(t);
    }
  }, [redirectUrl, checkout.redirect_auto, vista]);
  return (
    <ModalShell onClose={onClose} embebido={embebido}
      ancho={anchoModal(checkout.modal_ancho, 'sm:max-w-md')}
      alto={altoModal(checkout.modal_alto)}>
      {vista === 'cierre' ? (
        /* M8 · El cierre. Antes «Listo» devolvía a la lista de boletas, con
           «Reservar» delante de alguien que ya tenía la suya: el flujo no
           acababa, daba la vuelta. Esto se despide, dice cuándo es el evento y
           se va solo. */
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-success/15 border border-success/30 mb-5">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight mb-3">
            {checkout.cierre_titulo?.trim() || '¡Gracias por inscribirte!'}
          </h2>
          <p className="text-sm text-text-2 leading-relaxed max-w-sm mx-auto mb-2">
            {checkout.cierre_texto?.trim()
              || (fechaEvento ? `Te esperamos el ${fechaEvento}.` : 'Te esperamos en el evento.')}
          </p>
          <p className="text-xs text-text-3 mb-6">
            Tu entrada queda guardada en <span className="font-mono text-text-2">{ticket.codigo}</span>.
            {' '}Puedes volver a verla cuando quieras en{' '}
            <a href={urlBoleta} {...(enlacePropio ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
              className="text-primary-light hover:underline break-all">{textoBoleta}</a>.
          </p>
          <button onClick={onClose}
            className="px-8 py-3 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-all">
            Cerrar
          </button>
        </div>
      ) : vista === 'subeventos' ? (
        <div className="py-2">
          <Volver onClick={() => setVista('boleta')} className="mb-3">Volver a mi entrada</Volver>
          <h2 className="text-xl font-bold font-display text-text-1 tracking-tight mb-1">Actividades con inscripción</h2>
          <p className="text-sm text-text-2 mb-4 leading-relaxed">
            Tu entrada no las incluye: cada una se apunta aparte y tiene cupo. Con la boleta que acabas de
            sacar no tienes que volver a escribir tus datos.
          </p>
          <ul className="space-y-2">
            {subeventos.map(s => {
              const ya = inscritas.has(s.id);
              const cargando = apuntando === s.id;
              return (
                <li key={s.id} className="flex items-start gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-1">{s.titulo}</p>
                    {/* M7 · Antes sólo salía «título · fecha · cupos · sala»: no
                        había con qué decidir si apuntarse. La descripción y
                        quién la da ya venían en la respuesta, sin pintar. */}
                    {s.descripcion?.trim() && (
                      <p className="text-xs text-text-2 mt-1 leading-relaxed line-clamp-3">{s.descripcion.trim()}</p>
                    )}
                    {(s.speaker?.nombre || trackUtil(s.track)) && (
                      <p className="text-[11px] text-text-2 mt-1">
                        {s.speaker?.nombre && <>Con <span className="font-medium text-text-1">{s.speaker.nombre}</span>{s.speaker.empresa ? ` · ${s.speaker.empresa}` : ''}</>}
                        {s.speaker?.nombre && trackUtil(s.track) ? ' · ' : ''}
                        {trackUtil(s.track)}
                      </p>
                    )}
                    <p className="text-[11px] text-text-3 mt-0.5">
                      {s.inicio ? new Date(s.inicio).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      {s.libres != null ? ` · ${s.libres} cupo${s.libres === 1 ? '' : 's'}` : ''}
                      {s.ubicacion ? ` · ${s.ubicacion}` : ''}
                    </p>
                  </div>
                  {ya ? (
                    <span className="text-xs font-semibold text-success flex-shrink-0">Apuntado ✓</span>
                  ) : s.lleno ? (
                    <span className="text-xs text-text-3 flex-shrink-0">Sin cupo</span>
                  ) : s.pide_datos ? (
                    <button type="button" onClick={() => setInscribiendo(s)}
                      className="text-xs font-semibold px-4 py-2 rounded-full border border-border-2 text-text-1 hover:bg-surface-2 transition-colors flex-shrink-0">
                      Apuntarme
                    </button>
                  ) : (
                    <button type="button" onClick={() => apuntarDirecto(s)} disabled={cargando}
                      className="text-xs font-semibold px-4 py-2 rounded-full bg-text-1 text-bg hover:bg-white transition-colors flex-shrink-0 disabled:opacity-60">
                      {cargando ? '…' : 'Apuntarme'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-end gap-2 mt-6">
            <button onClick={() => setVista('cierre')} className="px-6 py-3 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-all">
              Listo
            </button>
          </div>
        </div>
      ) : (
      <div className="text-center py-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-success/15 border border-success/30 mb-5">
          <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight mb-2">
          {checkout.confirmacion_titulo?.trim() || (ticket.requierePago ? '¡Boleta apartada!' : '¡Reserva confirmada!')}
        </h2>
        <p className="text-sm text-text-2 mb-5 leading-relaxed max-w-sm mx-auto">
          {checkout.confirmacion_texto?.trim() || 'Muestra este QR en la entrada del evento. También puedes mostrar el código.'}
        </p>
        {/* La tarjeta entera, no un QR suelto. Es la misma que verá en
            /mi-ticket y la misma que se imprime, con el diseño del
            organizador: lo que se guarda en este momento —que es cuando la
            gente guarda— se parece a la boleta de verdad. */}
        <div className="max-w-sm mx-auto mb-4">
          <WalletCard
            design={walletConfig(evento.page_json, { publico: 'asistentes', tipo: ticket.tipo?.nombre })}
            evento={evento} ticket={ticket} puntos={null} />
        </div>
        <div className="rounded-2xl border border-border-2 bg-surface px-4 py-3 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-text-3 font-semibold mb-1">Código alternativo</p>
          <p className="font-mono text-xl font-bold text-text-1 tabular-nums tracking-widest">{ticket.codigo}</p>
        </div>
        <p className="text-xs text-text-3 mb-5">
          {enlacePropio ? 'Vuelve a tu registro en:' : 'Guarda este link para volver a verlo:'} <br/>
          <a href={urlBoleta} {...(enlacePropio ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
            className="text-primary-light hover:underline break-all">
            {textoBoleta}
          </a>
        </p>
        {pendientes.length > 0 && (
          <button type="button" onClick={() => setVista('subeventos')}
            className="w-full flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/5 hover:bg-accent/10 p-4 mb-5 text-left transition-colors">
            <div className="flex-1 min-w-0">
              {/* M5 · Decía «Falta un paso» con el registro ya hecho. No falta
                  nada: esto es algo que se puede hacer, no un trámite a medias. */}
              <p className="text-xs uppercase tracking-widest text-accent-light font-semibold mb-0.5">
                Si quieres seguir explorando el evento
              </p>
              <p className="text-sm text-text-2">
                {pendientes.length === 1
                  ? 'Hay 1 actividad que se apunta aparte y tiene cupo.'
                  : `Hay ${pendientes.length} actividades que se apuntan aparte y tienen cupo.`}
                {' '}Con esta boleta no vuelves a escribir tus datos.
              </p>
            </div>
            <span className="text-sm font-semibold text-accent-light flex-shrink-0">Ver →</span>
          </button>
        )}

        {/* M6 · Un solo «Descargar», y el formato después. Vive en
            [[DescargarEntrada]] porque `/mi-ticket` —donde la gente vuelve el
            día del evento— tenía los tres botones sueltos de antes: el arreglo
            no había llegado al sitio donde más se usa. */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <DescargarEntrada evento={evento} ticket={ticket} qrValue={qrValue} />
          {pendientes.length > 0 && (
            <button onClick={() => setVista('subeventos')}
              className="px-6 py-3 rounded-full bg-accent text-white hover:brightness-110 text-sm font-semibold transition-all">
              Ver sub-eventos
            </button>
          )}
          <button onClick={() => setVista('cierre')}
            className={`px-6 py-3 rounded-full text-sm font-semibold transition-all ${pendientes.length > 0
              ? 'border border-border-2 text-text-1 hover:bg-surface-2'
              : 'bg-text-1 text-bg hover:bg-white'}`}>
            Listo
          </button>
          {redirectUrl && (
            <a href={redirectUrl} className="px-6 py-3 rounded-full border border-border-2 text-text-1 hover:bg-surface-2 text-sm font-semibold transition-all">
              Continuar →
            </a>
          )}
        </div>
        {redirectUrl && checkout.redirect_auto && (
          <p className="text-[11px] text-text-3 mt-3">Te redirigiremos automáticamente en unos segundos…</p>
        )}
      </div>
      )}

      {/* Se monta por encima de esta confirmación (portal, z mayor): la boleta
          recién emitida entra como identificación, así que no vuelve a pedir
          nombre ni correo. */}
      {inscribiendo && (
        <InscripcionSesionModal
          slug={slug}
          sesion={inscribiendo}
          preguntas={preguntas[inscribiendo.id] || []}
          boleta={{ codigo: ticket.codigo, nombre: ticket.asistente?.nombre }}
          onClose={() => setInscribiendo(null)}
          onTerminar={() => { setInscribiendo(null); onClose(); }}
          onInscrito={(id) => {
            setInscritas(prev => new Set(prev).add(id));
            setSubeventos(prev => prev.map(x => x.id === id
              ? { ...x, libres: x.libres == null ? null : Math.max(0, x.libres - 1) }
              : x));
          }}
        />
      )}
    </ModalShell>
  );
}

/* El contenedor de los modales del checkout.

   Dos arreglos que se ven poco y molestan mucho:

   · El boton de cerrar era `sticky float-right` y el contenido subia con
     `-mt-9` para meterse debajo. Resultado: la primera linea del formulario
     nacia 36px mas estrecha que el resto —ahi empezaba la sensacion de
     "hay campos donde no se ve el resto de la informacion"— y la «x» quedaba
     flotando ENCIMA de los campos durante todo el scroll. Ahora es una
     cabecera propia con su franja: no roba ancho a nada.

   · `ancho` es un parametro porque el mismo cascaron sirve para un formulario
     de dos campos y para uno de veinte. Fijarlo en `max-w-md` obligaba a que
     todo cupiera en 400px, que es de donde viene la columna larguisima. */
function ModalShell({ children, onClose, ancho = 'sm:max-w-md', alto = 'max-h-[90vh]', embebido = false }) {
  useEffect(() => {
    /* Bloquear el scroll del fondo tiene sentido cuando el modal tapa TODA la
       pantalla — dentro de un iframe embebido no la tapa (ver abajo), y
       bloquear el scroll del documento del iframe no sirve de nada: quien
       scrollea es la página del cliente, por fuera del iframe. */
    if (embebido) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [embebido]);

  /* Embebido: sin fondo oscuro ni tarjeta, en el flujo normal del documento
     en vez de `fixed inset-0`. Es lo que pidió el cliente al incrustar el
     registro en su web — que se vea como parte de su página, no como un
     recuadro de software ajeno flotando encima. De paso, esto es lo que deja
     que `EmbedPage` mida el alto con el mismo ResizeObserver de siempre: un
     modal `fixed` no se puede medir (mide casi cero, fuera del flujo), que es
     por lo que hoy existe el truco de pedir un alto fijo de 20000px mientras
     hay un modal abierto. En flujo normal, ese truco deja de hacer falta. */
  if (embebido) {
    return (
      <div className="relative w-full animate-[fadeIn_0.2s_ease_both]">
        <div className="flex items-center justify-end mb-1">
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2/60 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    );
  }

  /* `inset-x-0 top-0 alto-visible` y NO `inset-0`. Medido en navegador con una
     barra de 122px simulada, y es la parte que de verdad arregla el fallo:

       tarjeta 90vh  + overlay inset-0        → el botón se sale 98px
       tarjeta 90dvh + overlay inset-0        → el botón se sale 98px  ← igual
       tarjeta 90dvh + overlay alto-visible   → el botón entra

     Acotar la tarjeta no basta, porque sigue anclada al fondo de un overlay
     que abarca el viewport grande. Lo que hay que acotar es el overlay; la
     tarjeta va después. (El por qué está en `.alto-visible`, en index.css.)

     Y dos scrolls, los dos necesarios: el de la TARJETA es el normal —un
     formulario largo se recorre dentro de su recuadro— y el del OVERLAY es la
     red de seguridad para cuando la tarjeta aun acotada no cabe: un navegador
     sin `dvh`, o el teclado abierto, que encoge la pantalla sin que `dvh` se
     entere. Sin esa segunda salida el modal se queda sin ninguna, porque el
     scroll del documento está bloqueado arriba.
     `overscroll-contain` evita que al llegar al final se arrastre la página de
     detrás, que en móvil se siente como que el modal «salta». */
  return (
    <div
      className="fixed inset-x-0 top-0 alto-visible z-50 overflow-y-auto overscroll-contain bg-bg/80 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]"
      onClick={onClose}
    >
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className={`relative w-full ${ancho} rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl ${alto} overflow-y-auto animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]`}
          onClick={e => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-end px-4 sm:px-6 py-2.5 bg-surface/95 backdrop-blur border-b border-border">
            <button onClick={onClose} aria-label="Cerrar"
              className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* `pb` extra en móvil: deja aire por debajo del último control para
              que el botón de enviar no quede pegado al borde de la pantalla ni
              debajo de la barra de gestos del sistema. */}
          <div className="p-6 sm:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function brandingEventoTitulo(evento) {
  const marca = evento.page_json?.branding?.plataforma;
  return marca ? `${evento.titulo} · ${marca}` : `${evento.titulo} · GESTEK`;
}

/* Sólo http/https. La columna la valida la API al guardarla, pero esto se
   pinta con lo que devuelve el servidor y acaba en un `href`: una fila vieja
   o tocada a mano no puede convertirse en un `javascript:` clicable. */
function urlExternaValida(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

/* Pantalla de salida cuando el evento vive en la web del organizador.

   Redirige, pero no en blanco: se dice a dónde va y se deja el enlace a mano.
   Si el navegador bloquea la redirección —o si tarda— el visitante tiene algo
   que tocar en vez de una pantalla muerta. `replace` y no `href` para que el
   botón de atrás vuelva de donde vino y no rebote otra vez hacia fuera. */
function SalidaAWebPropia({ evento }) {
  const destino = evento.url_externa.trim();
  const anfitrion = (() => { try { return new URL(destino).hostname.replace(/^www\./, ''); } catch { return destino; } })();

  useEffect(() => {
    const id = setTimeout(() => { window.location.replace(destino); }, 400);
    return () => clearTimeout(id);
  }, [destino]);

  return (
    <section className="px-5 py-24 max-w-md mx-auto text-center">
      <p className="text-xs uppercase tracking-widest text-text-3 mb-3">{evento.titulo}</p>
      <h1 className="text-2xl font-bold font-display tracking-tight text-text-1 mb-2">
        Te llevamos a {anfitrion}
      </h1>
      <p className="text-sm text-text-2 mb-6">
        Este evento se publica en la web de su organizador.
      </p>
      <a href={destino} rel="noreferrer noopener"
         className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border-2 text-sm hover:bg-surface">
        Ir ahora →
      </a>
    </section>
  );
}

/* Boletas funcionales incrustadas en el lienzo libre */
export function BloqueBoletasCanvas({ evento, onReservar, onWaitlist }) {
  const B = BLOCKS['tickets'];
  if (!B) return null;
  const Preview = B.Preview;
  return <Preview data={{}} evento={evento} onReservar={onReservar} onWaitlist={onWaitlist} />;
}

/* ─────────── Buscar por documento en el padrón de eventos anteriores ───────────

   Quien ya vino a una edición pasada no debería volver a escribirlo todo. Al
   poner la cédula se consulta el padrón que subió el organizador y se rellena
   lo que ya se sabía.

   Es opcional a propósito y no un paso obligatorio: si no hay padrón, o la
   persona es nueva, el formulario sigue igual. Un buscador que no encuentra
   nada no puede bloquear un registro.

   No se dice «no estás en la base». Cuando no hay coincidencia, el servidor
   contesta igual que si el padrón estuviera vacío — distinguir las dos cosas
   es justo lo que haría útil probar cédulas ajenas. */
function BuscarPorDocumento({ slug, campos, onEncontrado }) {
  const [doc, setDoc] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null);

  /* Si el formulario no pregunta nada, no hay nada que prellenar. */
  if (!campos?.length) return null;

  const buscar = async () => {
    if (!doc.trim() || buscando) return;
    setBuscando(true);
    try {
      const r = await eventosApi.prellenar(slug, doc.trim());
      setResultado(r);
      if (r.encontrado) onEncontrado?.(r);
    } catch {
      /* Incluye el 429 del limitador. Se trata como "no encontrado": el
         registro tiene que poder seguir aunque esto falle. */
      setResultado({ encontrado: false });
    } finally { setBuscando(false); }
  };

  return (
    <div className="ancho rounded-2xl border border-border bg-surface-2/40 px-4 py-3 space-y-2">
      <label className="label text-xs" htmlFor="res-doc">
        ¿Ya viniste a un evento nuestro? <span className="text-text-3 font-normal">(opcional)</span>
      </label>
      <div className="flex gap-2">
        <input id="res-doc" value={doc} onChange={e => setDoc(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } }}
          inputMode="numeric" autoComplete="off"
          className="input-form flex-1 min-w-0" placeholder="Tu número de documento" />
        <button type="button" onClick={buscar} disabled={buscando || !doc.trim()}
          className="btn-secondary btn-sm flex-shrink-0 disabled:opacity-40">
          {buscando ? 'Buscando…' : 'Traer mis datos'}
        </button>
      </div>
      {resultado && (
        resultado.encontrado ? (
          <p className="text-[11px] text-success">
            Listo, rellenamos lo que ya sabíamos.
            {resultado.faltan?.length
              ? ` Falta${resultado.faltan.length === 1 ? '' : 'n'}: ${resultado.faltan.map(f => f.etiqueta).join(', ')}.`
              : ' No falta nada más.'}
          </p>
        ) : (
          <p className="text-[11px] text-text-3">
            No encontramos datos previos. Sigue y llena el formulario normalmente.
          </p>
        )
      )}
    </div>
  );
}
