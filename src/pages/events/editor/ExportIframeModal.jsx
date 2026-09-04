import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../../../context/ToastContext.jsx';
import { embedUrl, embedSnippet, embedFrameId, widgetSnippet, EMBED_TEMAS, EMBED_SLUG_AMIGABLE, EMBED_ESPECIALES } from '../../../lib/embed.js';

/* Exportar UNA sección de la landing como iframe: la empresa arma su web
   donde quiera y trae de GESTEK solo lo que le sirve (boletas, cómo llegar,
   llaves del torneo…). Se copia el snippet y listo. */

export default function ExportIframeModal({ evento, bloque, label, onClose }) {
  const toast = useToast();
  const [modo,   setModo]   = useState('tipo');   // tipo | exacta
  /* bloque = la sección con su fondo · contenido = sin fondo, para meterlo en
     un diseño ajeno · boton = sólo el botón, sin iframe. */
  const [alcance, setAlcance] = useState('bloque');
  const [tema,   setTema]   = useState('auto');
  const [alto,   setAlto]   = useState(600);
  const [autoAlto, setAutoAlto] = useState(true);
  const [heredarEstilo, setHeredarEstilo] = useState(true);

  /* El código, cuando alguien lo ha tocado a mano.
   *
   * `null` = tal y como sale de las opciones. Un texto = lo que escribió la
   * persona, y entonces manda ése.
   *
   * ── Por qué se puede tocar ───────────────────────────────────────────────
   *
   * Porque esto se pega en la web de otro y esa web tiene sus propias reglas:
   * una clase que hay que añadir, un `style` que el CMS exige, un atributo que
   * pide su plantilla. Obligar a copiar, pegar fuera y editar allí convierte
   * un ajuste de diez segundos en una ida y vuelta — y lo que se pega acaba
   * siendo distinto de lo que aquí se vio.
   *
   * ── Y por qué cambiar una opción lo descarta ────────────────────────────
   *
   * Porque las opciones REGENERAN el código entero. Intentar conservar lo
   * escrito a mano encima de una plantilla nueva es adivinar qué parte era
   * suya, y adivinar mal aquí deja un iframe roto en la web de un cliente. Se
   * descarta, y se avisa antes. */
  const [tocado, setTocado] = useState(null);

  const slug = evento?.slug;
  const seccion = modo === 'exacta'
    ? bloque?.id
    : (EMBED_SLUG_AMIGABLE[bloque?.type] || bloque?.type);

  /* El fondo ya no es una pregunta aparte: es lo que distingue «la sección
     completa» de «sólo el contenido». Preguntarlo dos veces dejaba elegir
     combinaciones que no significan nada. */
  const fondo = alcance === 'contenido' ? 'transparente' : 'solido';

  /* Sólo los bloques que llevan un botón de registro pueden exportar el botón
     suelto: en una galería o en un mapa no hay ninguno que sacar. */
  const tieneBoton = ['tickets', 'registrar_stand', 'cta', 'hero', 'portada'].includes(bloque?.type);

  const url = useMemo(
    () => embedUrl({ slug, seccion, tema, fondo, fid: embedFrameId(slug, seccion) }),
    [slug, seccion, tema, fondo]
  );
  const snippet = useMemo(
    () => (alcance === 'boton'
      ? widgetSnippet({ slug })
      : embedSnippet({ slug, seccion, titulo: `${label} — ${evento?.nombre || 'Evento'}`, tema, fondo, alto, autoAlto, heredarEstilo })),
    [alcance, slug, seccion, label, evento?.nombre, tema, fondo, alto, autoAlto, heredarEstilo]
  );

  /* Lo que se ve y lo que se copia son lo mismo: si se ha tocado, manda lo
     tocado. Copiar el generado mientras la pantalla enseña otra cosa sería la
     peor versión de esto. */
  const codigoFinal = tocado ?? snippet;

  /* Cambiar una opción regenera. Si hay algo escrito a mano, se avisa antes en
     vez de borrarlo por la espalda. */
  const conOpcion = (fn) => (...args) => {
    if (tocado !== null && tocado !== snippet
        && !window.confirm('Editaste el código a mano. Cambiar esta opción lo vuelve a generar y se pierde lo escrito. ¿Sigo?')) {
      return;
    }
    setTocado(null);
    fn(...args);
  };

  /* Las opciones, cada una envuelta. Se hace aqui y no en el JSX para que no
     haya forma de añadir un control nuevo y olvidarse: si se llama al setter
     crudo desde abajo, lo escrito a mano desaparece sin avisar. */
  const opcModo      = conOpcion(setModo);
  const opcAlcance   = conOpcion(setAlcance);
  const opcTema      = conOpcion(setTema);
  const opcAlto      = conOpcion(setAlto);
  const opcAutoAlto  = conOpcion(setAutoAlto);
  const opcHeredar   = conOpcion(setHeredarEstilo);

  const copiar = async (texto, que) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast?.success?.(`${que} copiado`);
    } catch {
      toast?.error?.('No se pudo copiar — selecciona el texto y usa Ctrl+C');
    }
  };

  if (!slug) {
    return createPortal(
      <Fondo onClose={onClose}>
        <div className="p-6">
          <h3 className="text-base font-semibold text-text-1 mb-2">Falta la URL pública</h3>
          <p className="text-sm text-text-2">
            Este evento todavía no tiene una dirección pública (slug). Publícalo desde
            Configuración y vuelve para exportar la sección.
          </p>
          <button onClick={onClose} className="btn btn-sm mt-5">Entendido</button>
        </div>
      </Fondo>,
      document.body
    );
  }

  return createPortal(
    <Fondo onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold text-text-1">Exportar «{label}» como iframe</h3>
          <p className="text-xs text-text-3 mt-0.5">Pega este código en cualquier web y la sección aparece ahí, siempre actualizada.</p>
        </div>
        <button onClick={onClose} aria-label="Cerrar" className="text-text-3 hover:text-text-1">✕</button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-0 max-h-[75vh] overflow-y-auto">
        {/* Vista previa real: es el mismo iframe que verá el visitante */}
        <div className="p-6 border-r border-border min-w-0">
          <p className="text-xs font-semibold text-text-2 mb-2">Vista previa</p>
          <div className="rounded-xl border border-border overflow-hidden bg-surface-2">
            <iframe
              key={url}
              src={url}
              title="Vista previa del embed"
              className="w-full block bg-transparent"
              style={{ height: `${Math.min(Math.max(Number(alto) || 600, 200), 900)}px`, border: 0 }}
            />
          </div>
          <p className="text-[11px] text-text-3 mt-2">
            Dentro de una web ajena, comprar abre la página del evento en una pestaña nueva
            (los pagos no funcionan bien incrustados).
          </p>
        </div>

        {/* Opciones + código */}
        <div className="p-6 space-y-5">
          {/* Cuánto se lleva. Las tres piezas ya existían por separado —el
              iframe, el fondo transparente y el widget del botón— pero había
              que saber que existían y llegar a ellas por sitios distintos.
              Elegirlo aquí es lo que convierte tres funciones sueltas en una
              decisión: ¿la sección entera, sólo su contenido, o sólo el botón? */}
          <Campo label="Cuánto se lleva">
            <div className="space-y-1.5">
              <Radio checked={alcance === 'bloque'} onChange={() => opcAlcance('bloque')}
                titulo="La sección completa"
                nota="Con su fondo y su espaciado, tal como se ve en la landing." />
              <Radio checked={alcance === 'contenido'} onChange={() => opcAlcance('contenido')}
                titulo="Sólo el contenido, sin fondo"
                nota="Para meterlo dentro de una sección que ya tiene su propio diseño." />
              {tieneBoton && (
                <Radio checked={alcance === 'boton'} onChange={() => opcAlcance('boton')}
                  titulo="Sólo el botón de registro"
                  nota="Sin iframe: el botón se pinta con el estilo de tu web y abre la ventana encima." />
              )}
            </div>
          </Campo>

          {alcance !== 'boton' && (
          <Campo label="Qué se exporta">
            <div className="space-y-1.5">
              <Radio checked={modo === 'tipo'} onChange={() => opcModo('tipo')}
                titulo={`Por tipo · /${EMBED_SLUG_AMIGABLE[bloque?.type] || bloque?.type}`}
                nota="Recomendado: si borras y vuelves a crear la sección, el embed sigue vivo." />
              <Radio checked={modo === 'exacta'} onChange={() => opcModo('exacta')}
                titulo="Esta sección exacta"
                nota="Útil si tienes dos secciones del mismo tipo y quieres una en concreto." />
            </div>
          </Campo>
          )}

          {alcance === 'boton' ? (
            <p className="text-xs text-text-3 leading-relaxed rounded-xl border border-border bg-surface-2/40 px-3 py-2.5">
              El botón se pinta con el estilo que hayas configurado en <b className="text-text-1">Publicación</b>,
              y al pulsarlo abre el registro en una ventana sobre tu web, sin sacar a nadie de ella.
              <span className="block mt-1.5">
                Ojo: el <b className="text-text-1">pago</b> sí abre una pestaña. Las pasarelas redirigen a su propio
                dominio y el 3-D Secure no funciona dentro de un iframe ajeno. No es cómo está hecho: es cómo
                funcionan las pasarelas.
              </span>
            </p>
          ) : (<>
          <Campo label="Tema">
            <select value={tema} onChange={e => opcTema(e.target.value)} className="input text-sm w-full">
              {EMBED_TEMAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Campo>

          <Campo label="Alto inicial (px)">
            <input type="number" min={200} max={2000} value={alto}
              onChange={e => opcAlto(Number(e.target.value) || 600)}
              className="input text-sm w-full" />
          </Campo>

          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={autoAlto} onChange={e => opcAutoAlto(e.target.checked)} className="mt-0.5" />
            <span className="text-xs text-text-2">
              <span className="font-medium text-text-1">Ajustar el alto solo</span><br />
              Añade unas líneas de JavaScript para que el iframe crezca con el contenido.
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={heredarEstilo} onChange={e => opcHeredar(e.target.checked)} className="mt-0.5" />
            <span className="text-xs text-text-2">
              <span className="font-medium text-text-1">Heredar la tipografía de mi web</span><br />
              La sección usa la misma fuente que el resto de tu página, para que no parezca traída de fuera.
            </span>
          </label>
          </>)}

          <div>
            <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
              <p className="text-xs font-semibold text-text-2">Código para pegar</p>
              <div className="flex items-center gap-2">
                {tocado !== null && (
                  <button onClick={() => setTocado(null)} className="btn-ghost btn-sm">
                    Volver al generado
                  </button>
                )}
                <button onClick={() => copiar(codigoFinal, 'Código')} className="btn btn-sm">Copiar código</button>
              </div>
            </div>
            {/* Editable: se pega en la web de otro y esa web tiene sus reglas.
                Se copia lo que se ve, no lo que se generó — si no, tocarlo
                sería un adorno. */}
            <textarea
              value={codigoFinal}
              onChange={e => setTocado(e.target.value)}
              rows={alcance === 'boton' ? 6 : 10}
              spellCheck={false}
              className="input w-full font-mono text-[11px] leading-relaxed resize-y" />
            <p className="text-[11px] text-text-3 mt-1 leading-snug">
              {tocado !== null
                ? 'Lo estás editando. Si cambias una opción de arriba, se vuelve a generar y se pierde lo escrito.'
                : 'Puedes editarlo antes de copiar — añadir una clase, un estilo o lo que pida tu web.'}
            </p>
          </div>

          {alcance !== 'boton' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-text-2">Solo el enlace</p>
              <button onClick={() => copiar(url, 'Enlace')} className="btn-ghost btn-sm">Copiar enlace</button>
            </div>
            <input readOnly value={url} onFocus={e => e.target.select()}
              className="input text-sm w-full font-mono text-[11px]" />
            <p className="text-[11px] text-text-3 mt-1.5">
              Sirve para Notion, Wix, WordPress o cualquier bloque de “insertar web”.
            </p>
          </div>
          )}

          <div className="pt-4 border-t border-border">
            <p className="text-xs font-semibold text-text-2 mb-2">También puedes incrustar</p>
            <div className="space-y-1.5">
              {EMBED_ESPECIALES.map(e => (
                <div key={e.seccion} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-1">{e.label}</p>
                    <p className="text-[11px] text-text-3">{e.nota}</p>
                  </div>
                  <button
                    onClick={() => copiar(
                      embedSnippet({ slug, seccion: e.seccion, titulo: `${e.label} — ${evento?.nombre || 'Evento'}`, tema, fondo, alto, autoAlto, heredarEstilo }),
                      e.label
                    )}
                    className="btn-ghost btn-sm flex-shrink-0">
                    Copiar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Fondo>,
    document.body
  );
}

function Fondo({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
         onClick={onClose}>
      <div className="w-full max-w-4xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-2 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Radio({ checked, onChange, titulo, nota }) {
  return (
    <label className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border transition-colors
                       ${checked ? 'border-accent/60 bg-accent/5' : 'border-border hover:bg-surface-2'}`}>
      <input type="radio" checked={checked} onChange={onChange} className="mt-0.5" />
      <span className="text-xs">
        <span className="font-medium text-text-1 block">{titulo}</span>
        <span className="text-text-3">{nota}</span>
      </span>
    </label>
  );
}
