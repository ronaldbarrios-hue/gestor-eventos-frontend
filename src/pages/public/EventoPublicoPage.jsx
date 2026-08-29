import { useEffect, useState, useMemo, useRef } from 'react';
import Icono from '../../components/ui/Iconos.jsx';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { eventosApi } from '../../api/eventos.js';
import { pagosApi }   from '../../api/pagos.js';
import { waitlistApi } from '../../api/waitlist.js';
import { BLOCKS, BLOCK_TYPES_SISTEMA } from '../events/editor/blocks.jsx';
import { BrandingProvider, BrandHeader, PoweredBy } from '../../components/public/Branding.jsx';
import { blocksVisibles, coverLayout, navbarConfig, NAVBAR_ALINEACION } from '../../components/public/EventChrome.jsx';
import CanvasPublico from '../events/editor/canvas/CanvasPublico.jsx';
import Turnstile, { turnstileActivo } from '../../components/public/Turnstile.jsx';
import CampoFormulario, { fallosDe, ocupaFila } from '../../components/ui/CampoFormulario.jsx';
/* `verificar` y no `verificarCorreo`: la primera añade la pista cruzada
   —«eso parece un teléfono, aquí va el correo»—, que es justo lo que hace
   falta en la casilla de al lado. Llamar a la comprobación base se saltaba esa
   pista precisamente en el sitio donde más sirve. */
import { verificar } from '../../lib/validarDato.js';
import AceptarTerminos, { useLegalEvento } from '../../components/public/AceptarTerminos.jsx';
import { dividirEnModulos, convienePaginar } from '../../lib/modulosFormulario.js';
import { descargarBoletaPdf } from '../../lib/boletaPdf.jsx';
import { descargarQrPng } from '../../lib/qrPng.jsx';
import { descargarTarjetaPng } from '../../lib/tarjetaPng.jsx';
import WalletCard, { walletConfig } from '../../components/public/WalletCard.jsx';
import InscripcionSesionModal from './InscripcionSesionModal.jsx';
import { baseEnlaces, enlaceBoleta } from '../../lib/enlacesPublicos.js';
import { useT } from '../../lib/i18n.js';
import { irAPagar } from '../../lib/embed.js';

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

  useEffect(() => {
    if (!cupoToken) { setCupo(false); return; }
    let vivo = true;
    waitlistApi.verificarCupo(cupoToken)
      .then(d => { if (vivo) setCupo(d?.valida ? d : false); })
      .catch(() => { if (vivo) setCupo(false); });
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

  const tabsPill = (
    <div className="flex items-center gap-1 bg-surface/80 backdrop-blur-md border border-border-2 rounded-full px-1.5 py-1.5 shadow-lg overflow-x-auto no-scrollbar">
      <div className="flex-shrink-0 pl-1 pr-1.5">
        {logoUrl
          ? <img src={logoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                 style={{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-accent))` }}>
              {(nombreOrg || 'O').charAt(0).toUpperCase()}
            </div>
          )}
      </div>
      {pages.length > 1 && pages.map((p, i) => (
        <button
          key={p.id}
          onClick={() => setParams(prev => { const x = new URLSearchParams(prev); x.set('p', String(i + 1)); return x; })}
          className={`flex-shrink-0 h-8 px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
            ${pageIdx === i + 1 ? 'bg-text-1 text-bg' : 'text-text-2 hover:text-text-1 hover:bg-surface-2'}`}
          aria-current={pageIdx === i + 1 ? 'page' : undefined}
        >
          <span className="hidden sm:inline mr-1">{i + 1}.</span>
          {p.nombre}
        </button>
      ))}
    </div>
  );

  return (
    <BrandingProvider organizador={organizador}>
    <section className="px-5 sm:px-8 py-8 sm:py-12 max-w-6xl mx-auto">

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
          <Link to="/explorar"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border
                       text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Explorar eventos
          </Link>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {nav.enlaces.map((l, i) => (
            <a key={i} href={l.url || '#'} target={l.url?.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
              {l.label}
            </a>
          ))}
          {evento.tiene_networking && (
            <Link to={`/explorar/${slug}/networking`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30
                         bg-primary/10 text-sm text-primary-light hover:bg-primary/20 transition-colors">
              <Icono nombre="manos" className="w-4 h-4" />Rueda de Negocios
            </Link>
          )}
          {evento.tiene_torneo && (
            <Link to={`/explorar/${slug}/torneo`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-warning/30
                         bg-warning/10 text-sm text-warning hover:bg-warning/20 transition-colors">
              Ver Torneo
            </Link>
          )}
          {(evento.tiene_espacio ?? evento.tiene_agenda) && (
            <Link to={`/explorar/${slug}/agenda`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-success/30
                         bg-success/10 text-sm text-success hover:bg-success/20 transition-colors">
              <Icono nombre="calendario" className="w-4 h-4" />Espacio del evento
            </Link>
          )}
          {evento.tiene_expositores && (
            <Link to={`/explorar/${slug}/ranking`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border
                         text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
              <Icono nombre="estrella" className="w-4 h-4" />Ranking
            </Link>
          )}
          {/* El mapa, si el organizador lo configuró. Faltaba aquí y en todas
              partes: se armaba en el panel y no había un solo enlace hacia él. */}
          {evento.page_json?.mapa && (
            <Link to={`/explorar/${slug}/mapa`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border
                         text-sm text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
              <Icono nombre="pin" className="w-4 h-4" />Mapa del evento
            </Link>
          )}
          {nav.mostrar_compartir && <ShareButton />}
        </div>
      </div>

      {/* Contenedor único que envuelve TODO el contenido restante (imagen + bloques + footer):
          la píldora es sticky dentro de este contenedor, así que se mantiene visible mientras
          se hace scroll por toda la página, no solo mientras se ve la imagen de portada. */}
      <div className="relative">
        {/* La píldora va por debajo de la barra de salidas, que ahora también
            es fija: a `top-4` quedaría tapada por ella. El desplazamiento es
            la altura de esa barra más un respiro. */}
        {hasCover && (
          <div className={`sticky top-[72px] z-20 flex ${pillAlign} mb-[-1px]`}>
            <div className="max-w-[calc(100%-2rem)]">
              {tabsPill}
            </div>
          </div>
        )}

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
            {pages.length > 1 && (
              <nav className={`mb-8 flex items-center ${pillAlign} gap-1.5 flex-wrap`}>
                {pages.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setParams(prev => { const x = new URLSearchParams(prev); x.set('p', String(i + 1)); return x; })}
                    className={`min-w-[40px] h-10 px-4 rounded-full text-sm font-medium transition-all
                      ${pageIdx === i + 1
                        ? 'bg-text-1 text-bg'
                        : 'border border-border text-text-2 hover:text-text-1 hover:bg-surface-2'}
                    `}
                    aria-current={pageIdx === i + 1 ? 'page' : undefined}
                  >
                    <span className="hidden sm:inline mr-1.5">{i + 1}.</span>
                    {p.nombre}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}

        {/* Lista de espera: el aviso de que este cupo es suyo va arriba del
            todo y antes de las boletas. Si el enlace ya caducó también se
            dice, porque la alternativa es que la persona lo descubra tras
            rellenar el formulario. */}
        {cupoToken && cupo !== null && (
          <AvisoCupo cupo={cupo} onTomar={() => {
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
              <div key={block.id} className={`${animCls} ${ancho}`} style={animStyle}>
                <Preview data={block.data || {}} evento={evento} onReservar={setReservaTipo} onWaitlist={setWaitlistTipo} />
              </div>
            );
          })}
        </div>
        )}

        {/* Volver a explorar (oculto en modo standalone) */}
        <div className="mt-12 text-center">
          {!isStandalone && (
            <Link to="/explorar" className="text-xs text-text-3 hover:text-text-1 transition-colors">
              ← Volver a explorar
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
          onSuccess={(t) => { setReservaTipo(null); setReservaOk(t); }}
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

  const submit = async (e) => {
    e.preventDefault();
    if (turnstileActivo && !captcha) { setErr('Completá la verificación anti-bot.'); return; }
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
    } finally { setWorking(false); }
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
            <input required value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
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
function AvisoCupo({ cupo, onTomar }) {
  if (!cupo) {
    return (
      <div className="mb-8 rounded-2xl border border-warning/30 bg-warning/5 px-5 py-4">
        <p className="text-sm font-semibold text-text-1">Ese enlace de cupo ya no vale</p>
        <p className="text-sm text-text-2 mt-1">
          O se usó, o se pasó el plazo y le tocó al siguiente de la lista. Sigues
          en la fila: si se libera otro, te volvemos a avisar.
        </p>
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
      <button onClick={onTomar} className="btn-gradient flex-shrink-0">Tomar mi cupo</button>
    </div>
  );
}

export function ReservaModal({ tipo, slug, currency, evento, cupoToken = '', onClose, onSuccess }) {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '' });
  const [respuestas, setRespuestas] = useState({});
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState('');
  const [captcha, setCaptcha] = useState(null);
  const [acepta, setAcepta] = useState(false);
  const [confirmaEdad, setConfirmaEdad] = useState(false);
  const hasEarly = tipo.early_bird_precio != null && tipo.early_bird_hasta && new Date(tipo.early_bird_hasta) > new Date();
  const precio = hasEarly ? Number(tipo.early_bird_precio) : Number(tipo.precio);
  const isFree = precio === 0;
  const tienePagoSimple = Boolean(evento?.pago_llave || evento?.pago_qr_url);
  const pagoWompi = Boolean(evento?.pago_wompi);
  const pagoMp = Boolean(evento?.pago_mp);
  const gatewayRef = useRef(pagoWompi ? 'wompi' : 'mp');
  /* Campos aplicables a ESTE tipo de boleta: los globales + los propios del tipo. */
  const camposForm = (evento?.campos_formulario || []).filter(c => !c.ticket_type_id || c.ticket_type_id === tipo.id);
  const checkout = evento?.page_json?.checkout || {};

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
     ejecución no la ve nadie — el estilo no existiría. */
  const claseEntrada = !paginado ? ''
    : haciaAdelante
      ? 'animate-[pasoAdelante_180ms_cubic-bezier(0.16,1,0.3,1)_both]'
      : 'animate-[pasoAtras_180ms_cubic-bezier(0.16,1,0.3,1)_both]';

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
      if (!form.nombre.trim()) { setErr('Necesitamos tu nombre.'); return 1; }
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

  const avanzar = () => {
    if (validarPasoActual() > 0) return;
    irAPaso(Math.min(paso + 1, pasos.length - 1));
  };

  const submit = async (e) => {
    e.preventDefault();
    /* Con módulos, pulsar Enter dentro de un campo también llega aquí. Si
       todavía no es el último paso, esto es un «Continuar» y no un envío. */
    if (!enUltimo) { avanzar(); return; }
    if (turnstileActivo && !captcha) { setErr('Completá la verificación anti-bot.'); return; }
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
          return;
        }
      }
      setErr(cuantos === 1 ? 'Revisa el dato marcado abajo.' : `Revisa los ${cuantos} datos marcados abajo.`);
      return;
    }
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
          ...(cupoToken ? { waitlist_token: cupoToken } : {}) };
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
    finally    { setWorking(false); }
  };

  return (
    /* Ancho de verdad: con `max-w-md` (400px) menos el padding quedaban 352px,
       y dos columnas de 166px son peores que una. Con `3xl` quedan ~700px
       utiles, o sea dos columnas de ~340px, que es donde un correo o una
       direccion se leen enteros. */
    <ModalShell onClose={onClose} ancho="sm:max-w-3xl">
      <form onSubmit={submit} className="grid-form">
        {/* La cabecera manda sobre todo lo demas: es el que y el cuanto. Ocupa
            la fila entera y el precio sube de tamano, que es el dato por el que
            la gente decide. */}
        <div className="ancho">
          <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-2">
            {isFree ? 'Reserva tu cupo' : 'Compra tu boleta'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-text-1 tracking-tight">{tipo.nombre}</h2>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-bold font-display text-text-1 tabular-nums">
              {isFree ? 'Gratis' : `$${precio.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
            </p>
            {!isFree && <span className="text-xs text-text-3">{tipo.currency || currency}</span>}
          </div>
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
          </div>
        )}

        {err && <div className="ancho px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger-light text-sm">{err}</div>}

        {/* Nombre y correo ocupan fila entera: los dos se leen enteros o no se
            leen. Un correo cortado a 21 caracteres obliga a hacer scroll dentro
            del campo para releer lo que uno escribio. */}
        {/* El paso 0 también entra: si no, volver a él desde el 1 se siente
            como un salto seco justo después de haber visto deslizarse el resto. */}
        {(!paginado || paso === 0) && (<>
        <div className={`field ancho ${claseEntrada}`}>
          <label className="label" htmlFor="res-nombre">Nombre completo *</label>
          <input id="res-nombre" required value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
            className="input-form" placeholder="Tu nombre" autoFocus />
        </div>
        <div className={`field ancho ${claseEntrada}`}>
          <label className="label" htmlFor="res-email">Email *</label>
          <input id="res-email" required type="email" inputMode="email" autoComplete="email"
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
          {paginado && paso > 0
            ? <button type="button" onClick={() => { setErr(''); irAPaso(Math.max(0, paso - 1)); }}
                className="px-4 py-2.5 rounded-full text-sm text-text-2 hover:text-text-1">← Atrás</button>
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

export function ConfirmacionModal({ ticket, evento = {}, slug, checkout = {}, onClose }) {
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

  /* El PDF se pide aquí y no en un correo: el correo puede tardar, caer en spam
     o ni siquiera existir si el organizador no configuró remitente. Esto está
     en la mano de quien acaba de reservar, ahora. */
  const descargarPdf = () => {
    setBajando(true);
    try {
      descargarBoletaPdf({
        evento, ticket, tipo: ticket.tipo,
        asistente: ticket.asistente, respuestas: ticket.respuestas,
        campos: evento.campos_formulario, qrValue,
        origen: baseEnlaces(evento),
      });
    } finally { setBajando(false); }
  };
  const descargarQr = () => {
    if (!descargarQrPng(qrValue, `qr-${ticket.codigo}`)) {
      /* Si el navegador no pudo dibujarlo, el PDF sigue estando: es mejor
         decirlo que dejar un botón que no responde. */
      alert('No se pudo generar la imagen del QR. Descargá la boleta en PDF, que lo lleva dentro.');
    }
  };
  /* La tarjeta entera como imagen, que es lo que se guarda en el móvil y se
     enseña en la puerta. Va aparte del QR suelto a propósito: el QR pelado es
     para reenviar por WhatsApp, la tarjeta es la boleta. */
  const [bajandoTarjeta, setBajandoTarjeta] = useState(false);
  const descargarTarjeta = async () => {
    setBajandoTarjeta(true);
    try {
      const ok = await descargarTarjetaPng(
        {
          design: walletConfig(evento.page_json, { publico: 'asistentes', tipo: ticket.tipo?.nombre }),
          evento, ticket,
        },
        `tarjeta-${ticket.codigo}`,
      );
      if (!ok) alert('No se pudo generar la imagen de la tarjeta. Descargá la boleta en PDF, que lleva el QR dentro.');
    } finally { setBajandoTarjeta(false); }
  };

  const redirectUrl = checkout.redirect_url;
  useEffect(() => {
    if (redirectUrl && checkout.redirect_auto) {
      const t = setTimeout(() => { window.location.href = redirectUrl; }, 5000);
      return () => clearTimeout(t);
    }
  }, [redirectUrl, checkout.redirect_auto]);
  return (
    <ModalShell onClose={onClose}>
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
          Guarda este link para volver a verlo: <br/>
          {/* El texto del enlace es el dominio de la empresa cuando está
              configurado; el `href` se queda relativo para que, si el dominio
              propio todavía no apunta a ningún sitio, el botón siga abriendo
              la boleta desde donde la persona ya está navegando. */}
          <a href={`/mi-ticket/${ticket.codigo}`} className="text-primary-light hover:underline break-all">
            {enlaceBoleta(evento, ticket.codigo)}
          </a>
        </p>
        {subeventos.length > 0 && (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 mb-5 text-left">
            <p className="text-xs uppercase tracking-widest text-accent-light font-semibold mb-1">Falta un paso</p>
            <p className="text-sm text-text-2 mb-3">
              Tu entrada no incluye estas actividades: hay que apuntarse aparte y tienen cupo. Puedes hacerlo ahora, con la boleta que acabas de sacar.
            </p>
            <ul className="space-y-1.5">
              {subeventos.map(s => {
                const ya = inscritas.has(s.id);
                return (
                  <li key={s.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-1 truncate">{s.titulo}</p>
                      <p className="text-[11px] text-text-3">
                        {s.inicio ? new Date(s.inicio).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        {s.libres != null ? ` · ${s.libres} cupo${s.libres === 1 ? '' : 's'}` : ''}
                        {s.ubicacion ? ` · ${s.ubicacion}` : ''}
                      </p>
                    </div>
                    {ya ? (
                      <span className="text-xs font-semibold text-success flex-shrink-0">Apuntado ✓</span>
                    ) : (
                      <button onClick={() => setInscribiendo(s)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border-2 text-text-1 hover:bg-surface-2 transition-colors flex-shrink-0">
                        Apuntarme
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button onClick={descargarPdf} disabled={bajando}
            className="px-6 py-3 rounded-full border border-border-2 text-text-1 hover:bg-surface-2 text-sm font-semibold transition-all disabled:opacity-60">
            {bajando ? 'Generando…' : 'Descargar boleta (PDF)'}
          </button>
          {/* El QR suelto, además del PDF. Es lo que la gente reenvía por
              WhatsApp y lo que enseña en la puerta sin abrir un lector de PDF
              con el móvil al 4% de batería. */}
          <button onClick={descargarQr}
            className="px-6 py-3 rounded-full border border-border-2 text-text-1 hover:bg-surface-2 text-sm font-semibold transition-all">
            Descargar QR
          </button>
          <button onClick={descargarTarjeta} disabled={bajandoTarjeta}
            className="px-6 py-3 rounded-full border border-border-2 text-text-1 hover:bg-surface-2 text-sm font-semibold transition-all disabled:opacity-60">
            {bajandoTarjeta ? 'Generando…' : 'Descargar tarjeta'}
          </button>
          <button onClick={onClose} className="px-6 py-3 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-all">
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
function ModalShell({ children, onClose, ancho = 'sm:max-w-md' }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/80 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]" onClick={onClose}>
      <div
        className={`relative w-full ${ancho} rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl max-h-[90vh] overflow-y-auto animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]`}
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
        <div className="p-6 sm:p-8">
          {children}
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
