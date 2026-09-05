import { useState, useMemo, useEffect } from 'react';
import { eventosApi } from '../../../api/eventos.js';
import { clientesApi } from '../../../api/clientes.js';
import {
  botonesDelEvento, nuevoBoton, cruzarConUso, codigoDeOrigen,
} from '../../../lib/botonesDeRegistro.js';
import { useToast } from '../../../context/ToastContext.jsx';
import {
  MODOS_PUBLICACION, EMBED_ESPECIALES, EMBED_TEMAS,
  embedSnippet, embedUrl, embedFrameId,
  WIDGET_DEFECTOS, WIDGET_TAMANOS, WIDGET_SOMBRAS,
  estiloBotonWidget, widgetSnippet, widgetSnippetEnSitio,
} from '../../../lib/embed.js';

/* ──────────────────────────────────────────────────────────────────
   #32 · Publicación — a dónde lleva el enlace público del evento.

   Tres caminos que hasta ahora eran uno solo: la landing de GESTEK, la web
   propia del organizador, o la web propia con secciones de GESTEK dentro.
   Se guardan en `eventos.modo_publico` y `eventos.url_externa` (migración
   0060), columnas propias y no dentro de `page_json`: ese campo ya lo
   escriben tres sitios distintos y no hacía falta un cuarto.

   Igual que el panel de Marca, funciona de dos maneras:
     · SUELTO (`evento`, `reload`) — su estado y su botón. Espacio de trabajo.
     · CONTROLADO (`valor`, `onChange`) — informa hacia arriba y no guarda.
       Dentro del editor de la página, que guarda todo de una vez.
   ────────────────────────────────────────────────────────────────── */

function urlValida(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

export default function PublicacionSection({ evento, reload, valor, onChange }) {
  const { success, error } = useToast();
  const controlado = typeof onChange === 'function';

  const base = useMemo(() => ({
    modo_publico: evento.modo_publico || 'gestek',
    url_externa: evento.url_externa || '',
  }), [evento.modo_publico, evento.url_externa]);

  const [propio, setPropio] = useState(base);
  const [saving, setSaving] = useState(false);

  const v = controlado ? { ...base, ...(valor || {}) } : propio;
  const set = (patch) => {
    const siguiente = { ...v, ...patch };
    if (controlado) onChange(siguiente); else setPropio(siguiente);
  };

  const modoActual = MODOS_PUBLICACION.find(m => m.value === v.modo_publico) || MODOS_PUBLICACION[0];
  const faltaUrl = modoActual.pideUrl && !urlValida(v.url_externa);

  const guardar = async () => {
    if (faltaUrl) { error('Escribe la dirección de tu web antes de guardar.'); return; }
    setSaving(true);
    try {
      await eventosApi.update(evento.id, {
        modo_publico: v.modo_publico,
        url_externa: v.modo_publico === 'gestek' ? (v.url_externa || null) : v.url_externa.trim(),
      });
      success('Guardado. El enlace público del evento ya lleva a donde dijiste.');
      reload?.();
    } catch (e) { error(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {!controlado && (
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Publicación</h2>
          <p className="text-sm text-text-2 mt-1">
            Dónde vive la página de tu evento y qué ve quien abre el enlace.
          </p>
        </div>
      )}

      {/* ── Los tres modos ── */}
      <div className="grid sm:grid-cols-3 gap-3">
        {MODOS_PUBLICACION.map(m => {
          const activo = v.modo_publico === m.value;
          return (
            <button key={m.value} type="button"
              onClick={() => set({ modo_publico: m.value })}
              aria-pressed={activo}
              className={`text-left rounded-2xl border p-4 transition-colors ${
                activo ? 'border-accent bg-accent/10' : 'border-border bg-surface/40 hover:border-accent/50'
              }`}>
              <p className="text-sm font-semibold text-text-1">{m.label}</p>
              <p className="text-[11px] text-text-3 mt-0.5">{m.resumen}</p>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-text-2 leading-relaxed">{modoActual.detalle}</p>

      {/* ── La URL, sólo cuando el modo la necesita ── */}
      {modoActual.pideUrl && (
        <div>
          <label className="text-xs font-semibold text-text-2 block mb-1.5" htmlFor="url-externa">
            Dirección de tu web
          </label>
          <input
            id="url-externa"
            type="url"
            inputMode="url"
            value={v.url_externa}
            onChange={e => set({ url_externa: e.target.value })}
            placeholder="https://mievento.com"
            className="input w-full font-mono text-sm" />
          {faltaUrl ? (
            <p className="text-[11px] text-warning mt-1.5">
              Falta la dirección, o no empieza por <code>http://</code> o <code>https://</code>.
              Mientras esté así, el enlace público sigue mostrando la página de GESTEK.
            </p>
          ) : (
            <p className="text-[11px] text-text-3 mt-1.5">
              Quien abra <code>/explorar/{evento.slug}</code> saldrá aquí. Tu página de GESTEK
              sigue existiendo como respaldo en <code>?gestek=1</code>.
            </p>
          )}
        </div>
      )}

      {/* ── El catálogo de secciones incrustables ──
          Sólo en el modo que las usa: en los otros dos sería ruido. El botón
          de exportar sección a sección sigue estando en el editor. */}
      {v.modo_publico === 'iframe' && (
        <>
          <BotonDeRegistro evento={evento} />
          <CatalogoEmbeds evento={evento} />
        </>
      )}

      {!controlado && (
        <div className="pt-4 border-t border-border">
          <button onClick={guardar} disabled={saving || faltaUrl} className="btn-gradient">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  );
}

/* Todo lo que se puede incrustar, con el código listo para copiar.
   El tema y el alto se eligen una vez y valen para todas: quien está armando
   su web las pega seguidas y no quiere configurar ocho veces lo mismo. */
function CatalogoEmbeds({ evento }) {
  const { success, error } = useToast();
  const [tema, setTema] = useState('auto');
  const [alto, setAlto] = useState(600);
  const [abierta, setAbierta] = useState(null);

  const slug = evento.slug;

  const copiar = async (texto, que) => {
    try {
      await navigator.clipboard.writeText(texto);
      success(`${que} copiado`);
    } catch {
      error('No se pudo copiar — selecciona el texto y usa Ctrl+C');
    }
  };

  if (!slug) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/5 px-4 py-3">
        <p className="text-sm text-text-2">
          Este evento todavía no tiene dirección pública. Publícalo desde Configuración
          y aquí aparecerá el código de cada sección.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-text-1">Secciones para tu web</p>
          <p className="text-[11px] text-text-3 mt-0.5">
            Cada una se actualiza sola: si cambias las boletas aquí, cambian allí.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-3 block mb-1">Tema</label>
            <select value={tema} onChange={e => setTema(e.target.value)} className="input !h-9 text-xs">
              {EMBED_TEMAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-3 block mb-1">Alto (px)</label>
            <input type="number" min={200} max={2000} value={alto}
              onChange={e => setAlto(Number(e.target.value) || 600)}
              className="input !h-9 text-xs w-24" />
          </div>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {EMBED_ESPECIALES.map(s => {
          const titulo = `${s.label} — ${evento.titulo || 'Evento'}`;
          const snippet = embedSnippet({ slug, seccion: s.seccion, titulo, tema, alto });
          const url = embedUrl({ slug, seccion: s.seccion, tema, fid: embedFrameId(slug, s.seccion) });
          const abierto = abierta === s.seccion;
          return (
            <li key={s.seccion} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-1">{s.label}</p>
                  <p className="text-[11px] text-text-3 leading-relaxed">{s.nota}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => setAbierta(abierto ? null : s.seccion)} className="btn-ghost btn-sm">
                    {abierto ? 'Ocultar' : 'Ver'}
                  </button>
                  <button onClick={() => copiar(snippet, s.label)} className="btn btn-sm">Copiar código</button>
                </div>
              </div>

              {abierto && (
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl border border-border overflow-hidden bg-surface-2">
                    <iframe
                      src={url}
                      title={`Vista previa · ${s.label}`}
                      className="w-full block bg-transparent"
                      style={{ height: `${Math.min(Math.max(alto, 200), 700)}px`, border: 0 }} />
                  </div>
                  <textarea readOnly value={snippet} rows={6}
                    onFocus={e => e.target.select()}
                    className="input w-full font-mono text-[11px] leading-relaxed resize-y" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}


/* ── El botón de registro para la web del cliente ──────────────────────────
 *
 * Lo de abajo incrusta una SECCIÓN entera. Esto es lo otro que hacía falta y
 * no existía: sólo un botón, y al pulsarlo el registro se abre ENCIMA de su
 * página. Antes, el botón de una sección incrustada mandaba al visitante a
 * GESTEK en otra pestaña, que es justo lo que un organizador con web propia no
 * quiere: pierde a la persona en mitad de su sitio.
 *
 * Todo lo que se toca aquí sale del mismo sitio que lo aplica `widget.js`, así
 * que la vista previa es el botón de verdad y no una aproximación.
 */
function BotonDeRegistro({ evento }) {
  const { success, error } = useToast();
  const [cfg, setCfg] = useState({ ...WIDGET_DEFECTOS, degradado: false, color2: '#F2D66B', ancho: 'auto' });
  const [comoSitio, setComoSitio] = useState(false);

  /* Los botones que ya se crearon.
     «Los botones que se crean no los vuelvo a ver»: el código se generaba, se
     copiaba y se olvidaba. Si la web se rehace, o hay que cambiar el color, o
     volver a copiarlo para otra página, había que reconstruirlo de memoria — y
     cada reconstrucción salía un poco distinta. */
  const [guardados, setGuardados] = useState(() => botonesDelEvento(evento));
  const [uso, setUso] = useState([]);
  const [guardando, setGuardando] = useState(false);

  /* Cuánto trajo cada uno. Es lo que convierte una lista de códigos en algo que
     se mira: sin esto, saber cuál de los cuatro sitios funcionó es imposible. */
  useEffect(() => {
    let vivo = true;
    clientesApi.origenes(evento.id)
      .then(d => { if (vivo) setUso(d.origenes || []); })
      /* Si no se puede leer, la lista sigue sirviendo para copiar: los números
         son un extra, no la razón de la pantalla. */
      .catch(() => {});
    return () => { vivo = false; };
  }, [evento.id]);

  const tipos = (evento.ticket_types || []).filter(t => t.activo !== false);
  const { conUso, directo, huerfanos } = cruzarConUso(guardados, uso);

  const persistir = async (lista) => {
    setGuardando(true);
    try {
      /* El PATCH mezcla por claves de primer nivel: mandar sólo `botones` no
         pisa el resto de `page_json`. */
      await eventosApi.update(evento.id, { page_json: { botones: lista } });
      setGuardados(lista);
    } catch (e) {
      error(e.response?.data?.error || e.message);
      throw e;
    } finally { setGuardando(false); }
  };

  const guardarActual = async () => {
    const nombre = (window.prompt('¿Cómo llamas a este botón? Ej: «Home de la web», «Correo a socios»') || '').trim();
    if (!nombre) return;
    const b = nuevoBoton({ ...cfg, nombre, origen: codigoDeOrigen(nombre, guardados) }, guardados);
    try {
      await persistir([...guardados, b]);
      success(`Guardado. Ahora sabrás cuánta gente entró por «${nombre}».`);
    } catch { /* ya se avisó */ }
  };

  const borrarGuardado = async (id) => {
    const b = guardados.find(x => x.id === id);
    if (!b) return;
    /* Se avisa de lo que NO pasa: las inscripciones que trajo se quedan. Sin
       decirlo, borrar un botón parece que borra su historia. */
    if (!window.confirm(`¿Quitar «${b.nombre}» de la lista?

El código que ya pegaste en tu web sigue funcionando, y las ${b.uso?.total || 0} inscripciones que trajo se quedan en el evento.`)) return;
    try { await persistir(guardados.filter(x => x.id !== id)); } catch { /* ya se avisó */ }
  };

  const copiarDe = async (b) => {
    const codigo = (comoSitio ? widgetSnippetEnSitio : widgetSnippet)({ slug: evento.slug, ...b });
    try {
      await navigator.clipboard.writeText(codigo);
      success(`Código de «${b.nombre}» copiado`);
    } catch {
      error('No se pudo copiar — ábrelo y usa Ctrl+C');
    }
  };

  const slug = evento.slug;
  const set = (patch) => setCfg(c => ({ ...c, ...patch }));

  /* El degradado es un interruptor en el panel y "hay segundo color" en el
     widget: se traduce aquí para que la casilla no tenga que borrar el color
     que el organizador ya eligió. */
  const opciones = useMemo(() => ({
    ...cfg,
    color2: cfg.degradado ? cfg.color2 : '',
  }), [cfg]);

  const snippet = useMemo(
    () => (comoSitio ? widgetSnippetEnSitio : widgetSnippet)({ slug, ...opciones }),
    [comoSitio, slug, opciones],
  );

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      success('Código del botón copiado');
    } catch {
      error('No se pudo copiar — selecciona el texto y usa Ctrl+C');
    }
  };

  if (!slug) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-text-1">Botón de registro</p>
        <p className="text-[11px] text-text-3 mt-0.5">
          Un botón en tu web. Al pulsarlo, el formulario se abre encima de tu página:
          quien se registra no sale de tu sitio.
        </p>
      </div>

      <div className="p-4 grid lg:grid-cols-[1fr_minmax(260px,320px)] gap-5 items-start">
        <div className="space-y-3 min-w-0">
          {/* A qué lleva.
              Con varias boletas, un botón que abre la lista obliga a elegir
              dentro de una ventana pequeña — y no se podía poner «Comprar VIP»
              en una página y «Stand comercial» en otra, que es justo para lo
              que se pega el botón en sitios distintos. */}
          {tipos.length > 1 && (
            <div>
              <label className="label">¿A qué lleva?</label>
              <select value={cfg.boleta || ''} onChange={e => set({ boleta: e.target.value })}
                className="input w-full">
                <option value="">A la lista de boletas (todas)</option>
                {tipos.map(t => <option key={t.id} value={t.id}>Directo a «{t.nombre}»</option>)}
              </select>
              <p className="text-[11px] text-text-3 mt-1 leading-relaxed">
                Si esa boleta se agota o se desactiva, el botón cae a la lista en vez de
                romperse: un botón viejo en una web ajena no puede convertirse en una
                puerta cerrada.
              </p>
            </div>
          )}

          <div>
            <label className="label">Texto del botón</label>
            <input value={cfg.texto} onChange={e => set({ texto: e.target.value })}
              className="input w-full" placeholder="Registrarme" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Color etiqueta="Color" valor={cfg.color} onChange={v => set({ color: v })} />
            <Color etiqueta="Color del texto" valor={cfg.colorTexto} onChange={v => set({ colorTexto: v })} />
          </div>

          <label className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
            <input type="checkbox" checked={cfg.degradado}
              onChange={e => set({ degradado: e.target.checked })} className="accent-[#8B5CF6]" />
            Degradado de dos colores
          </label>

          {cfg.degradado && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Color etiqueta="Segundo color" valor={cfg.color2} onChange={v => set({ color2: v })} />
              <div>
                <label className="label">Ángulo</label>
                <select value={cfg.gradiente} onChange={e => set({ gradiente: e.target.value })} className="input w-full">
                  {['90deg', '120deg', '135deg', '180deg', 'to right', 'to bottom right'].map(g =>
                    <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Esquinas (px)</label>
              <input type="number" min={0} max={999} value={cfg.radio}
                onChange={e => set({ radio: e.target.value })} className="input w-full" />
            </div>
            <div>
              <label className="label">Borde (px)</label>
              <input type="number" min={0} max={8} value={cfg.borde}
                onChange={e => set({ borde: e.target.value })} className="input w-full" />
            </div>
            <Color etiqueta="Color del borde" valor={cfg.colorBorde === 'transparent' ? '#ffffff' : cfg.colorBorde}
              onChange={v => set({ colorBorde: v })} />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Sombra</label>
              <select value={cfg.sombra} onChange={e => set({ sombra: e.target.value })} className="input w-full">
                {Object.keys(WIDGET_SOMBRAS).map(s =>
                  <option key={s} value={s}>{{ no: 'Sin sombra', sm: 'Suave', md: 'Media', lg: 'Marcada' }[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tamaño</label>
              <select value={cfg.tamano} onChange={e => set({ tamano: e.target.value })} className="input w-full">
                {Object.keys(WIDGET_TAMANOS).map(s =>
                  <option key={s} value={s}>{{ sm: 'Pequeño', md: 'Mediano', lg: 'Grande' }[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ancho</label>
              <select value={cfg.ancho} onChange={e => set({ ancho: e.target.value })} className="input w-full">
                <option value="auto">Del texto</option>
                <option value="completo">Todo el ancho</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Así se verá</label>
            {/* Sobre un gris neutro: encima del fondo del panel, un botón
                claro parecería tener menos contraste del que tendrá en la web
                del organizador. */}
            <div className="rounded-2xl border border-border bg-[#f4f4f5] p-6 flex items-center justify-center">
              <button type="button" style={estiloBotonWidget(opciones)}>{cfg.texto || 'Registrarme'}</button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer">
            <input type="checkbox" checked={comoSitio}
              onChange={e => setComoSitio(e.target.checked)} className="accent-[#8B5CF6]" />
            Quiero colocarlo yo (varios botones o dentro de un menú)
          </label>

          <textarea readOnly value={snippet} rows={comoSitio ? 10 : 8}
            onFocus={e => e.target.select()}
            className="input w-full font-mono text-[11px] leading-relaxed resize-y" />
          <div className="flex gap-2">
            <button onClick={copiar} className="btn btn-sm flex-1">Copiar código</button>
            {/* Guardarlo es lo que hace que se pueda volver a ver. */}
            <button onClick={guardarActual} disabled={guardando} className="btn-secondary btn-sm flex-1">
              {guardando ? 'Guardando…' : 'Guardar este botón'}
            </button>
          </div>
          <p className="text-[11px] text-text-3 leading-relaxed">
            Pégalo en tu web donde quieras que salga el botón. El pago, si la entrada
            es de pago, se abre en una pestaña aparte: las pasarelas no funcionan
            dentro de una ventana incrustada.
          </p>
        </div>
      </div>

      <BotonesGuardados
        botones={conUso} directo={directo} huerfanos={huerfanos}
        tipos={tipos} onCopiar={copiarDe} onBorrar={borrarGuardado} />
    </div>
  );
}

/* Los botones que ya se crearon, con lo que trajo cada uno.
 *
 * ── Por qué esta lista es la mitad de la función ─────────────────────────
 *
 * Un botón se pega en la web, en un correo, en el Instagram de la alcaldía y
 * en el WhatsApp del gremio. Sin esta lista son cuatro copias iguales de un
 * enlace: no se pueden volver a copiar, no se pueden cambiar, y sobre todo no
 * se sabe cuál trajo gente. Con ella, el botón deja de ser un pegote y pasa a
 * ser el canal que se puede medir.
 *
 * ── «Directo» se cuenta y se nombra ──────────────────────────────────────
 *
 * Quien llegó a la página del evento sin pasar por ningún botón es la mayoría,
 * y esconderlo haría que las cuentas de esta pantalla no cuadraran con las de
 * asistentes. Es una fila más, con su nombre.
 */
function BotonesGuardados({ botones, directo, huerfanos, tipos, onCopiar, onBorrar }) {
  const nombreDeBoleta = (id) => tipos.find(t => String(t.id) === String(id))?.nombre;

  if (!botones.length && !directo && !huerfanos.length) return null;

  const Fila = ({ titulo, sub, total, pagadas, acciones = null, tenue = false }) => (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-border">
      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${tenue ? 'text-text-2' : 'text-text-1 font-medium'}`}>{titulo}</p>
        {sub && <p className="text-[11px] text-text-3 truncate">{sub}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold font-display tabular-nums text-text-1">{total}</p>
        {/* Las pagadas aparte: cien reservas sin pagar y diez pagadas no son
            lo mismo, y el número grande es el que engaña. */}
        <p className="text-[10px] text-text-3 tabular-nums">{pagadas} pagada{pagadas === 1 ? '' : 's'}</p>
      </div>
      {acciones}
    </div>
  );

  return (
    <div className="border-t border-border">
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-text-1">Tus botones</p>
        <p className="text-[11px] text-text-3 mt-0.5">
          Los que guardaste, y cuánta gente entró por cada uno.
        </p>
      </div>

      {botones.map(b => (
        <Fila key={b.id}
          titulo={b.nombre}
          sub={[
            b.boleta ? `→ ${nombreDeBoleta(b.boleta) || 'una boleta que ya no existe'}` : '→ lista de boletas',
            b.texto,
          ].filter(Boolean).join(' · ')}
          total={b.uso.total} pagadas={b.uso.pagadas}
          acciones={
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onCopiar(b)} className="btn-ghost btn-sm">Copiar</button>
              <button onClick={() => onBorrar(b.id)} className="btn-ghost btn-sm text-danger/80 hover:text-danger">Quitar</button>
            </div>
          } />
      ))}

      {directo && (
        <Fila tenue titulo="Directo" sub="Entraron por la página del evento, sin pasar por un botón"
          total={directo.total} pagadas={directo.pagadas} />
      )}

      {/* Un botón borrado no borra a quien trajo. Esconder estas filas haría
          que la suma de aquí no cuadrara con la lista de asistentes. */}
      {huerfanos.map(h => (
        <Fila key={h.origen} tenue titulo={h.origen}
          sub="De un botón que ya no está en la lista"
          total={h.total} pagadas={h.pagadas} />
      ))}
    </div>
  );
}

function Color({ etiqueta, valor, onChange }) {
  return (
    <div>
      <label className="label">{etiqueta}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={valor} onChange={e => onChange(e.target.value)}
          className="h-9 w-12 rounded-lg border border-border bg-transparent cursor-pointer" />
        <input value={valor} onChange={e => onChange(e.target.value)}
          className="input flex-1 font-mono text-xs" />
      </div>
    </div>
  );
}
