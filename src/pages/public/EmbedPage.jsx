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
import { EMBED_ALIAS, EMBED_SIN_CONFIG, avisarAlAnfitrion } from '../../lib/embed.js';
import { ReservaModal, ConfirmacionModal } from './EventoPublicoPage.jsx';

/* Secciones que no son bloques de la landing sino páginas propias del evento
   (llaves del torneo, agenda). También se pueden incrustar: leen el :slug de
   la misma ruta, así que funcionan tal cual.

   Las dos últimas usan una versión sin cabecera ni enlace de vuelta: dentro
   de la web de otro, un "← Volver a explorar" saca al visitante del sitio que
   estaba mirando. */
/* La tipografía que manda la web anfitriona para que la sección incrustada no
   cante como "software de fuera". Sólo se acepta una lista de font-family de
   verdad: letras, dígitos, espacios, comas, comillas, guiones y puntos.
   Cualquier otro carácter podría cerrar la regla CSS e inyectar estilos, así
   que se descarta la cadena entera. */
function fuenteSegura(v) {
  if (!v || typeof v !== 'string') return '';
  const limpia = v.trim().slice(0, 240);
  return /^[\w\s,."'-]+$/.test(limpia) ? limpia : '';
}

const ESPECIALES = {
  /* `registro` no es una sección de la landing: es el destino del botón que se
     incrusta en la web de otro. Sale por aquí para heredar de EmbedPage el
     tema, el branding, el fondo transparente y el aviso de alto. */
  registro:  RegistroEmbed,
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

  /* El registro ocurre AQUÍ dentro, no en una pestaña de GESTEK. Es lo que
     pidió el cliente y es lo correcto: quien está mirando la web del
     organizador no tiene por qué salir de ella para reservar. */
  const [reservaTipo, setReservaTipo] = useState(null);
  const [reservaOk,   setReservaOk]   = useState(null);

  const soloUnaBoleta = ((evento?.ticket_types || evento?.tipos_ticket || [])
    .filter(t => t.activo).length === 1);

  const tema  = params.get('tema')  || 'auto';
  const fondo = params.get('fondo') || 'transparente';
  const fid   = params.get('fid')   || '';

  /* La fuente de la web anfitriona. Puede venir en la URL (para Notion, Wix y
     demás bloques de "insertar web" que no ejecutan el script) o por
     postMessage (widget.js y el snippet de sección la mandan solos). */
  const fuenteParam = fuenteSegura(params.get('fuente') || '');
  const [fuenteHost, setFuenteHost] = useState('');
  const fuente = fuenteParam || fuenteHost;

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

  /* La web anfitriona puede pasar su tipografía: widget.js lo hace siempre, y
     el snippet de sección si se deja marcada la casilla. Se pide al montar por
     si el anfitrión ya estaba escuchando, y se escucha por si llega después. */
  useEffect(() => {
    const alMensaje = (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object' || d.gestek !== 'estilo') return;
      if (d.fid && fid && d.fid !== fid) return;
      const f = fuenteSegura(d.fuente);
      if (f) setFuenteHost(f);
    };
    window.addEventListener('message', alMensaje);
    try { window.parent?.postMessage({ gestek: 'pide-estilo', fid }, '*'); } catch { /* cross-origin */ }
    return () => window.removeEventListener('message', alMensaje);
  }, [fid]);

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
    /* Se pide la sección: el servidor recorta la landing y manda sólo este
       bloque. Antes llegaba entera y el filtro de abajo la reducía aquí — o
       sea que el resto de la página viajaba igual, dentro de la web de otro.
       El `useMemo` de abajo se queda: sigue haciendo falta para resolver el
       alias y para las secciones que se pintan con sus valores por defecto. */
    eventosApi.publicoBySlug(slug, seccion)
      .then(d => { if (vivo) { setEvento(d.evento); setEstado('ok'); } })
      .catch(() => { if (vivo) setEstado('error'); });
    return () => { vivo = false; };
  }, [slug, seccion]);

  /* Alto automático: el anfitrión escucha este postMessage y redimensiona
     el iframe. Sin esto quedaría cortado o con un hueco enorme debajo. */
  const hayModal = Boolean(reservaTipo || reservaOk);

  useEffect(() => {
    /* Nada mientras carga: si no, el anfitrión encoge el iframe a la altura
       del "Cargando…" y el contenido entra dando un salto feo. */
    if (estado === 'cargando') return;

    /* Con un modal abierto NO se puede medir el contenido: `ModalShell` es
       `position: fixed`, o sea que está fuera del flujo y el div de aquí mide
       casi cero. Midiéndolo, el anfitrión encogería el iframe a nada y el
       formulario quedaría recortado a una franja.

       Se pide un número grande a propósito: el anfitrión lo recorta al 92% de
       su ventana, y dentro del iframe el modal se centra sobre esa altura. Es
       la forma de decir "todo lo alto que puedas" sin saber cuánto mide la
       ventana de la web ajena, que desde aquí no se puede leer. */
    if (hayModal) {
      try { window.parent?.postMessage({ gestek: 'alto', fid, alto: 20000 }, '*'); } catch { /* cross-origin */ }
      return;
    }

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
  }, [fid, evento, estado, hayModal]);

  /* Antes esto abría GESTEK en otra pestaña, y era justo lo que había que
     evitar: quien está en la web del organizador se encontraba de golpe en
     otra web para reservar. Ahora el formulario se abre aquí mismo.

     Lo que SÍ sigue saliendo es el pago, y sólo el pago: un checkout dentro de
     un iframe ajeno se rompe por las cookies de terceros, por el 3-D Secure
     —que se niega a cargarse enmarcado— y por la redirección de vuelta de la
     pasarela. De eso se encarga `irAPagar`, y para cuando ocurre la boleta ya
     está creada: no se pierde nada de lo escrito. */
  const abrirPaginaCompleta = useCallback(() => {
    window.open(`${window.location.origin}/explorar/${slug}?standalone=1`, '_blank', 'noopener,noreferrer');
  }, [slug]);

  const abrirCompra = useCallback((tipo) => {
    if (tipo?.id) { setReservaTipo(tipo); return; }
    /* Sin tipo de boleta no hay nada que rellenar: es un CTA suelto o una
       sección sin boletas, y ahí sí toca la página completa. */
    abrirPaginaCompleta();
  }, [abrirPaginaCompleta]);

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
      <div ref={rootRef} data-gestek-embed className="p-4">
        {fuente && (
          /* Se pisan sólo el contenedor y las dos utilidades de fuente de
             Tailwind (`font-sans` en el cuerpo, `font-display` en los títulos).
             `font-mono` se deja intacta: el código de la boleta tiene que
             seguir siendo monoespaciado. */
          <style>{`
            [data-gestek-embed] { font-family: ${fuente} !important; }
            [data-gestek-embed] .font-sans,
            [data-gestek-embed] .font-display { font-family: ${fuente} !important; }
          `}</style>
        )}
        {Especial ? (
          <Especial evento={evento} onReservar={abrirCompra} />
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
            onWaitlist={abrirPaginaCompleta}
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

        {reservaTipo && (
          <ReservaModal
            tipo={reservaTipo}
            slug={slug}
            currency={evento.currency}
            evento={evento}
            onClose={() => {
              setReservaTipo(null);
              /* Con una sola boleta no hay a dónde volver: detrás del
                 formulario no queda nada que elegir, así que cerrar el
                 formulario es cerrar la ventana. Con varias, se vuelve a la
                 lista, que es lo que espera quien iba a comparar precios. */
              if (soloUnaBoleta) avisarAlAnfitrion('cerrar', {}, fid);
            }}
            onSuccess={(t) => { setReservaTipo(null); setReservaOk(t); }}
          />
        )}
        {reservaOk && (
          <ConfirmacionModal
            ticket={reservaOk}
            evento={evento}
            slug={slug}
            checkout={evento.page_json?.checkout || {}}
            onClose={() => {
              setReservaOk(null);
              /* Terminado el registro, la ventana del anfitrión se cierra sola:
                 dejarla abierta con la confirmación vacía detrás es raro. */
              avisarAlAnfitrion('listo', { codigo: reservaOk?.codigo }, fid);
            }}
          />
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

/* ── El registro, que es a donde lleva el botón incrustado ─────────────────
 *
 * Una boleta: al formulario directo, que es lo que espera quien pulsó un botón
 * que dice "Registrarme". Varias: primero elige, porque el precio y lo que
 * incluye cada una es justo lo que decide.
 *
 * A partir de ahí no hay nada nuevo: son el mismo `ReservaModal` y el mismo
 * `ConfirmacionModal` de la página pública —con el formulario del evento, sus
 * términos, el captcha y los sub-eventos al final—, montados por EmbedPage.
 * Reescribirlos aquí habría sido tener dos registros que se separan al mes.
 */
function RegistroEmbed({ evento, onReservar }) {
  const tipos = (evento?.ticket_types || evento?.tipos_ticket || []).filter(t => t.activo);

  /* Con una sola, se abre sola. El `useEffect` y no una llamada directa porque
     abrir un modal mientras se está pintando el padre es un aviso de React y,
     peor, se dispararía en cada render. */
  const abierto = useRef(false);
  useEffect(() => {
    /* Una sola vez. Sin el pestillo, cerrar el modal volvería a abrirlo y la
       ventana no se podría cerrar nunca. */
    if (abierto.current || tipos.length !== 1) return;
    abierto.current = true;
    onReservar?.(tipos[0]);
  }, [tipos, onReservar]);

  if (!tipos.length) {
    return <p className="text-sm text-text-3 py-8 text-center">Este evento todavía no tiene entradas a la venta.</p>;
  }
  if (tipos.length === 1) {
    return <p className="text-sm text-text-3 py-8 text-center">Abriendo el formulario…</p>;
  }
  return <BloqueBoletas evento={evento} onReservar={onReservar} />;
}
