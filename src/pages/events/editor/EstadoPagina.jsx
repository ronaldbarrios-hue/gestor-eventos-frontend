import { useState } from 'react';
import { eventosApi } from '../../../api/eventos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { avisosDelEvento } from '../../../components/agente/GestbotSidebar.jsx';
import { enlaceEvento } from '../../../lib/enlacesPublicos.js';

/* ¿Esta página la ve alguien? Y si no, ¿qué falta?
 *
 * ── El hueco que tapa ─────────────────────────────────────────────────────
 *
 * Se podía montar la página entera sin enterarse nunca de si estaba viva. El
 * estado del evento —borrador o publicado— vivía en la cabecera del panel, dos
 * pantallas más atrás, y el botón de publicar también. Así que el recorrido
 * natural —montar, mirar, publicar— obligaba a salir del editor justo al final,
 * a buscar un botón en otro sitio, para hacer lo único que quedaba por hacer.
 *
 * ── Y una confusión que costaba explicar dos veces ───────────────────────
 *
 * En el editor ya había un botón llamado **«Publicación»**, y no publica: elige
 * DÓNDE vive la página —la de GESTEK o la web propia del organizador—. Dos
 * cosas distintas con el mismo nombre, a diez centímetros. Aquí se dicen las
 * dos juntas y con las palabras separadas: **si se ve** y **dónde se ve**.
 *
 * ── Publicar con lo que falta delante ────────────────────────────────────
 *
 * La lista de lo que falta ya existía: es la misma que da los consejos del
 * asistente (`avisosDelEvento`), y hasta ahora sólo se veía en una esquina del
 * panel. Enseñarla **en el momento de publicar** es lo que la vuelve útil: no es
 * lo mismo leer «le falta la portada» un martes que leerlo justo antes de
 * enseñarle la página al mundo.
 *
 * No bloquea. Un evento sin portada se puede publicar —a veces se publica a
 * propósito, para reservar el enlace—, y una comprobación que impide seguir
 * acaba desactivándose entera.
 */
export default function EstadoPagina({ evento, dirty }) {
  const { success, error: toastErr } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [publicando, setPublicando] = useState(false);
  /* El estado se recuerda aquí en vez de recargar la página al publicar.

     Recargar habría sido lo fácil —y se habría llevado por delante los cambios
     sin guardar del editor—. Publicar no toca los bloques, así que no hay nada
     que volver a pedir: lo único que cambia es esto. */
  const [reciénPublicada, setReciénPublicada] = useState(false);
  /* Cancelar es lo único de aquí que no se deshace con otro clic, así que pide
     escribir CANCELAR. No es ceremonia: un evento cancelado deja de venderse y
     a quien ya compró se le queda una boleta de algo que no va a pasar. */
  const [cancelando, setCancelando] = useState(false);
  const [confirmaCancelar, setConfirmaCancelar] = useState('');
  const [reciénCancelada, setReciénCancelada] = useState(false);

  const cancelado = evento.estado === 'cancelado' || reciénCancelada;
  const publicada = (evento.estado === 'publicado' || reciénPublicada) && !cancelado;
  const fuera = (evento.modo_publico || 'gestek') !== 'gestek' && Boolean(evento.url_externa);
  const enlace = enlaceEvento(evento);
  const faltan = avisosDelEvento(evento).filter(a => a.id !== 'publicar');

  const publicar = async () => {
    setPublicando(true);
    try {
      await eventosApi.publicar(evento.id);
      success('Publicado. Ya se puede abrir el enlace.');
      setReciénPublicada(true);
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally { setPublicando(false); }
  };

  /* El endpoint existía desde siempre y `eventosApi.cancelar` también: lo que
     no había era un botón. Se podía publicar y no se podía dar marcha atrás
     — y la palabra «Cancelado» ya estaba en las etiquetas de la plataforma,
     así que el estado se pintaba en sitios a los que nadie podía llegar. */
  const cancelar = async () => {
    setCancelando(true);
    try {
      await eventosApi.cancelar(evento.id);
      success('Evento cancelado. La página lo dice y ya no se vende.');
      setReciénCancelada(true);
      setConfirmaCancelar('');
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally { setCancelando(false); }
  };

  return (
    <>
      <button onClick={() => setAbierto(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12.5px] font-medium border transition-colors
          ${cancelado
            ? 'border-danger/40 bg-danger/10 text-text-1'
            : publicada
              ? 'border-success/40 bg-success/10 text-text-1'
              : 'border-warning/40 bg-warning/10 text-text-1'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cancelado ? 'bg-danger' : publicada ? 'bg-success' : 'bg-warning'}`} aria-hidden="true" />
        {cancelado ? 'Cancelado' : publicada ? 'Publicada' : 'Borrador'}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
             onClick={() => setAbierto(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-text-1">
                {cancelado ? 'Este evento está cancelado'
                  : publicada ? 'Esta página está publicada' : 'Todavía no la ve nadie'}
              </h3>
              <p className="text-xs text-text-3 mt-1 leading-relaxed">
                {cancelado
                  ? 'La página sigue abierta y lo dice de frente: quien compró entra y se entera. No se vende nada más.'
                  : publicada
                    ? 'Cualquiera con el enlace puede abrirla.'
                    : 'Puedes seguir montándola con calma: en borrador sólo la ves tú.'}
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Dónde vive, que es la otra mitad y se confunde con la primera. */}
              <div className="rounded-2xl border border-border bg-surface/40 px-4 py-3">
                <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Dónde se ve</p>
                {fuera ? (
                  <>
                    <p className="text-sm text-text-1 mt-1">Tu propia web</p>
                    <p className="text-xs text-text-2 mt-1 leading-relaxed break-all">
                      El público sale a <b>{evento.url_externa}</b>. Esta página de GESTEK se queda como
                      respaldo — se puede abrir, pero no es a la que llega la gente.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-text-1 mt-1">La página de GESTEK</p>
                    <a href={enlace} target="_blank" rel="noreferrer noopener"
                       className="text-xs text-primary-light hover:underline break-all">{enlace}</a>
                  </>
                )}
              </div>

              {dirty && (
                <p className="text-xs text-warning-light leading-relaxed">
                  Tienes cambios sin guardar. Lo que se publica es lo último guardado, no lo que hay
                  ahora mismo en pantalla.
                </p>
              )}

              {faltan.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">
                    {publicada ? 'Se puede mejorar' : 'Antes de publicar, mira esto'}
                  </p>
                  <ul className="space-y-1.5">
                    {faltan.map(a => (
                      <li key={a.id} className="text-xs text-text-2 leading-relaxed flex gap-2">
                        <span className="text-text-3 flex-shrink-0">·</span>{a.texto}
                      </li>
                    ))}
                  </ul>
                  {!publicada && (
                    <p className="text-[11px] text-text-3 mt-2 leading-relaxed">
                      Nada de esto impide publicar. A veces se publica a medias para reservar el
                      enlace, y está bien.
                    </p>
                  )}
                </div>
              )}

              {faltan.length === 0 && !publicada && !cancelado && (
                <p className="text-sm text-text-2">Está completa. Cuando quieras.</p>
              )}

              {/* Cancelar sólo tiene sentido si hay algo que cancelar: en un
                  borrador que nadie ha visto no hay nada que deshacer, se
                  edita y ya. */}
              {publicada && (
                <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Cancelar el evento</p>
                  <p className="text-xs text-text-2 mt-1 leading-relaxed">
                    Deja de venderse y la página lo anuncia. <b>No devuelve el dinero</b> de lo ya
                    vendido: los reembolsos se hacen uno a uno desde Asistentes, y avisar a la gente
                    también es cosa tuya — Mensajes → Emails.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <input
                      value={confirmaCancelar}
                      onChange={e => setConfirmaCancelar(e.target.value.toUpperCase())}
                      placeholder="Escribe CANCELAR"
                      aria-label="Escribe CANCELAR para confirmar"
                      className="input flex-1 text-xs font-mono" />
                    <button onClick={cancelar}
                      disabled={confirmaCancelar !== 'CANCELAR' || cancelando}
                      className="btn-danger btn-sm shrink-0">
                      {cancelando ? 'Cancelando…' : 'Cancelar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setAbierto(false)} className="btn-ghost btn-sm">Cerrar</button>
              {!publicada && !cancelado && (
                <button onClick={publicar} disabled={publicando} className="btn-gradient btn-sm">
                  {publicando ? 'Publicando…' : 'Publicar el evento'}
                </button>
              )}
              {(publicada || cancelado) && (
                <a href={enlace} target="_blank" rel="noreferrer noopener" className="btn-secondary btn-sm">
                  Abrir la página
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
