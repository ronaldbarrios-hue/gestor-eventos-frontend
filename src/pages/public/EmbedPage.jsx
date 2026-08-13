import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { eventosApi } from '../../api/eventos.js';
import { BLOCKS } from '../events/editor/blocks.jsx';
import { BrandingProvider } from '../../components/public/Branding.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import CanvasPublico from '../events/editor/canvas/CanvasPublico.jsx';
import TorneoPublicoPage from './TorneoPublicoPage.jsx';
import AgendaPublicaPage from './AgendaPublicaPage.jsx';
import { TarjetaTorneo } from './TorneosResumenPage.jsx';
import { TablaRanking } from './RankingPublicoPage.jsx';
import { EMBED_ALIAS, EMBED_SIN_CONFIG } from '../../lib/embed.js';

/* Secciones que no son bloques de la landing sino páginas propias del evento
   (llaves del torneo, agenda). También se pueden incrustar: leen el :slug de
   la misma ruta, así que funcionan tal cual.

   Las dos últimas usan una versión sin cabecera ni enlace de vuelta: dentro
   de la web de otro, un "← Volver a explorar" saca al visitante del sitio que
   estaba mirando. */
const ESPECIALES = {
  torneo:    TorneoPublicoPage,
  llaves:    TorneoPublicoPage,
  bracket:   TorneoPublicoPage,
  agenda:    AgendaPublicaPage,
  programa:  AgendaPublicaPage,
  espacio:   AgendaPublicaPage,
  torneos:   TorneosEmbed,
  campeones: TorneosEmbed,
  ranking:   RankingEmbed,
};

/* ──────────────────────────────────────────────────────────────────
   iFrame · /embed/:slug/:seccion
   Renderiza UNA sección de la landing, sin chrome de la app, para que
   una empresa la incruste en su propia web. Mismo componente Preview
   que usan el editor y la página pública: si allí se ve bien, aquí
   también. La compra no se resuelve dentro del iframe ajeno — abre la
   página pública en una pestaña nueva.
   ────────────────────────────────────────────────────────────────── */

export default function EmbedPage() {
  const { slug, seccion } = useParams();
  const [params] = useSearchParams();
  const { setDark, setLight } = useTheme();
  const [evento, setEvento] = useState(null);
  const [estado, setEstado] = useState('cargando'); // cargando | ok | error
  const rootRef = useRef(null);

  const tema  = params.get('tema')  || 'auto';
  const fondo = params.get('fondo') || 'transparente';
  const fid   = params.get('fid')   || '';

  /* Tema: se decide una vez, cooperando con ThemeProvider (no tocamos
     la clase del <html> a mano, que la sobreescribiría al montar). */
  useEffect(() => {
    if (tema === 'oscuro') { setDark(); return; }
    if (tema === 'claro')  { setLight(); return; }
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (mq?.matches) setDark(); else setLight();
  }, [tema, setDark, setLight]);

  /* Fondo transparente: el color lo pone la web anfitriona. */
  useEffect(() => {
    if (fondo !== 'transparente') return;
    const html = document.documentElement, body = document.body;
    const prev = [html.style.background, body.style.background];
    html.style.background = 'transparent';
    body.style.background = 'transparent';
    return () => { html.style.background = prev[0]; body.style.background = prev[1]; };
  }, [fondo]);

  /* Cualquier enlace de la sección (CTA, redes, "GESTEK" del footer) debe
     salir a una pestaña nueva: si navega dentro del iframe, el visitante
     se queda atrapado en un recuadro de la web ajena. */
  useEffect(() => {
    const base = document.createElement('base');
    base.target = '_blank';
    document.head.appendChild(base);
    return () => base.remove();
  }, []);

  useEffect(() => {
    let vivo = true;
    setEstado('cargando');
    eventosApi.publicoBySlug(slug)
      .then(d => { if (vivo) { setEvento(d.evento); setEstado('ok'); } })
      .catch(() => { if (vivo) setEstado('error'); });
    return () => { vivo = false; };
  }, [slug]);

  /* Alto automático: el anfitrión escucha este postMessage y redimensiona
     el iframe. Sin esto quedaría cortado o con un hueco enorme debajo. */
  useEffect(() => {
    /* Nada mientras carga: si no, el anfitrión encoge el iframe a la altura
       del "Cargando…" y el contenido entra dando un salto feo. */
    if (estado === 'cargando') return;
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let ultimo = 0;
    const avisar = () => {
      const alto = Math.ceil(el.getBoundingClientRect().height);
      if (!alto || Math.abs(alto - ultimo) < 2) return;
      ultimo = alto;
      try { window.parent?.postMessage({ gestek: 'alto', fid, alto }, '*'); } catch { /* cross-origin */ }
    };
    const ro = new ResizeObserver(avisar);
    ro.observe(el);
    avisar();
    return () => ro.disconnect();
  }, [fid, evento, estado]);

  /* Un iframe en un dominio ajeno no es lugar para un checkout: cookies de
     terceros, 3-D Secure y redirecciones de Mercado Pago fallan ahí dentro. */
  const abrirCompra = useCallback(() => {
    window.open(`${window.location.origin}/explorar/${slug}?standalone=1`, '_blank', 'noopener,noreferrer');
  }, [slug]);

  const Especial = ESPECIALES[seccion] || null;

  const bloque = useMemo(() => {
    if (!evento) return null;
    const pj = evento.page_json;
    const pages = pj?.pages?.length ? pj.pages
      : Array.isArray(pj?.blocks) ? [{ blocks: pj.blocks }]
      : [];
    const todos = pages.flatMap(p => p?.blocks || []).filter(Boolean);

    const porId = todos.find(b => b.id === seccion);
    if (porId) return porId;

    const tipo = EMBED_ALIAS[seccion] || seccion;
    const porTipo = todos.find(b => b.type === tipo && !b.data?.oculto);
    if (porTipo) return porTipo;

    /* La sección no está en la landing pero se alimenta del evento: la
       servimos igual, así el embed no depende de cómo esté armada.
       Con sus `defaults`, no con data vacía: si no, "Directorio de
       expositores" o "Mapa del evento" llegarían sin encabezado y quien la
       incrustó pensaría que está rota. */
    if (BLOCKS[tipo] && EMBED_SIN_CONFIG.includes(tipo)) {
      return { id: tipo, type: tipo, data: structuredClone(BLOCKS[tipo].defaults || {}) };
    }
    return null;
  }, [evento, seccion]);

  if (estado === 'cargando') {
    return <div ref={rootRef} className="p-6 text-center text-sm text-text-3">Cargando…</div>;
  }
  if (estado === 'error' || !evento) {
    return <div ref={rootRef} className="p-6 text-center text-sm text-text-3">No se encontró el evento.</div>;
  }
  if (!Especial && (!bloque || (bloque.type !== 'lienzo' && !BLOCKS[bloque.type]))) {
    return <div ref={rootRef} className="p-6 text-center text-sm text-text-3">Esta sección ya no está disponible.</div>;
  }

  /* Mismo White Label que la página pública (page_json.branding pisa al organizador). */
  const brandingEvento = evento.page_json?.branding || {};
  const organizador = {
    ...(evento.organizador || {}),
    branding: { ...((evento.organizador || {}).branding || {}), ...brandingEvento },
    ...(brandingEvento.logo_url ? { empresa_logo_url: brandingEvento.logo_url } : {}),
  };

  const Preview = (Especial || bloque.type === 'lienzo') ? null : BLOCKS[bloque.type].Preview;

  return (
    <BrandingProvider organizador={organizador}>
      <div ref={rootRef} className="p-4">
        {Especial ? (
          <Especial />
        ) : bloque.type === 'lienzo' ? (
          <CanvasPublico
            canvas={bloque.data?.canvas}
            evento={evento}
            boletasRender={<BloqueBoletas evento={evento} onReservar={abrirCompra} />}
          />
        ) : (
          <Preview
            data={bloque.data || {}}
            evento={evento}
            onReservar={abrirCompra}
            onWaitlist={abrirCompra}
          />
        )}
        {/* Sin "Eventos gestionados con GESTEK".

            Esto se incrusta en la web de otro. Ahí nuestra marca no pinta
            nada: el visitante está en la página del organizador y lo que ve
            tiene que ser suya. El footer propio del organizador sí se
            respeta, porque ése lo puso él. */}
        {organizador?.branding?.footer && (
          <p className="text-xs text-text-3 mt-4 text-center">{organizador.branding.footer}</p>
        )}
      </div>
    </BrandingProvider>
  );
}

/* ── Secciones propias del embed ──────────────────────────────────────
   Reutilizan el cuerpo de las páginas públicas (TarjetaTorneo, TablaRanking)
   sin la cabecera, el ancho máximo ni el enlace de vuelta, que dentro de un
   recuadro ajeno estorban o sacan al visitante del sitio. */

function TorneosEmbed() {
  const { slug } = useParams();
  const [torneos, setTorneos] = useState(undefined);

  useEffect(() => {
    let vivo = true;
    eventosApi.torneosResumen(slug)
      .then(d => { if (vivo) setTorneos(d.torneos || []); })
      .catch(() => { if (vivo) setTorneos([]); });
    return () => { vivo = false; };
  }, [slug]);

  if (torneos === undefined) return <p className="text-sm text-text-3 py-6 text-center">Cargando torneos…</p>;
  if (!torneos.length) return <p className="text-sm text-text-3 py-6 text-center">Este evento todavía no tiene torneos.</p>;
  return (
    <div className="space-y-4">
      {torneos.map(t => <TarjetaTorneo key={t.id} torneo={t} />)}
    </div>
  );
}

function RankingEmbed() {
  const { slug } = useParams();
  const [ranking, setRanking] = useState(undefined);

  useEffect(() => {
    let vivo = true;
    eventosApi.rankingPublico(slug)
      .then(d => { if (vivo) setRanking(d.ranking || []); })
      .catch(() => { if (vivo) setRanking([]); });
    return () => { vivo = false; };
  }, [slug]);

  if (ranking === undefined) return <p className="text-sm text-text-3 py-6 text-center">Cargando ranking…</p>;
  return <TablaRanking ranking={ranking} />;
}

/* El lienzo puede contener una pieza "boletas": se le pasa el mismo bloque
   de tickets que usa la página pública. */
function BloqueBoletas({ evento, onReservar }) {
  const B = BLOCKS.tickets;
  if (!B) return null;
  const P = B.Preview;
  return <P data={{}} evento={evento} onReservar={onReservar} onWaitlist={onReservar} />;
}
