import { useState, useEffect, useCallback } from 'react';
import { emailsApi } from '../../../../api/emails.js';
import { useToast } from '../../../../context/ToastContext.jsx';

/* Qué pasó con los correos que no llegaron.
 *
 * ── Por qué esta pantalla existe ──────────────────────────────────────────
 *
 * La cola marca `fallido` dos cosas distintas y las dos son invisibles hasta
 * que alguien las busca:
 *
 *   · El que rebotó tres veces. Una dirección mal escrita, un buzón lleno.
 *   · El que se quedó a medias porque el proceso murió en mitad del envío.
 *     Con el backend en cPanel eso deja de ser raro: Passenger recicla la
 *     aplicación cuando nadie la usa.
 *
 * Ninguno se reenvía solo, y es a propósito: insistir con una dirección que
 * rebota quema la reputación del dominio, y reenviar lo interrumpido puede
 * mandar una segunda boleta con otro QR. Pero que no se reenvíe solo no puede
 * significar que nadie se entere — la persona aparece en la puerta sin código y
 * ahí ya no hay nada que hacer.
 *
 * Así que: se ven, y hay un botón. Reenviar es una decisión de alguien.
 */
export default function EstadoCola({ evento }) {
  const { success, error } = useToast();
  const [estado, setEstado] = useState(null);
  const [envios, setEnvios] = useState([]);
  /* Cuántos hay en total y qué se está mirando. Antes ponía «últimos N», que
     era honesto y no servía: N era lo cargado, y la pregunta que trae a la
     gente aquí es por una persona concreta que puede estar más atrás. */
  const [totalEnvios, setTotalEnvios] = useState(0);
  const [buscaEnvio, setBuscaEnvio] = useState('');
  const [soloFallidos, setSoloFallidos] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(() => {
    emailsApi.cola(evento.id)
      .then(setEstado)
      /* Sin cola montada, esta tarjeta simplemente no sale. No es un error que
         merezca un aviso rojo en la pantalla del organizador. */
      .catch(() => setEstado(null));

  }, [evento.id]);

  useEffect(() => { cargar(); }, [cargar]);

  /* El registro de envíos va aparte de la cola a propósito: hay correos que
     salen directos, sin pasar por ella, y esos también hay que poder buscarlos.
     Si la tabla no está, la lista queda vacía y la sección no aparece.
     Y va en su propio efecto porque depende del buscador: metido en `cargar`,
     cada tecla volvería a pedir también el estado de la cola. */
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(() => {
      emailsApi.envios(evento.id, {
        limit: 50,
        ...(buscaEnvio.trim() ? { q: buscaEnvio.trim() } : {}),
        ...(soloFallidos ? { solo: 'fallidos' } : {}),
      })
        .then(d => {
          if (!vivo) return;
          setEnvios(d.envios || []);
          setTotalEnvios(d.total ?? (d.envios || []).length);
        })
        .catch(() => { if (vivo) setEnvios([]); });
    }, buscaEnvio ? 300 : 0);
    return () => { vivo = false; clearTimeout(t); };
  }, [evento.id, buscaEnvio, soloFallidos]);

  const reintentar = async () => {
    setTrabajando(true);
    try {
      const r = await emailsApi.reintentarCola(evento.id);
      success(r.reencolados
        ? `${r.reencolados} correo(s) vuelven a la cola.`
        : 'No había nada que reintentar.');
      cargar();
    } catch (e) {
      error(e.response?.data?.error || e.message);
    } finally { setTrabajando(false); }
  };

  if (!estado) return null;

  const pendientes = Number(estado.pendiente || 0);
  const fallidos   = Number(estado.fallido || 0);
  const enviados   = Number(estado.enviado || 0);
  const enCurso    = Number(estado.enviando || 0);

  /* Sin nada en la cola y sin fallidos no hay nada que contar: la tarjeta
     desaparece en vez de ocupar sitio para decir «cero». */
  /* La tarjeta no desaparece porque una búsqueda no encuentre nada: se mira el
     total del registro, no lo que hay en pantalla. Si no, escribir un correo
     que no está haría desaparecer el buscador con el que se escribió. */
  if (!pendientes && !fallidos && !enCurso && !enviados && totalEnvios === 0 && !buscaEnvio && !soloFallidos) return null;

  return (
    <div className={`rounded-2xl border overflow-hidden ${fallidos ? 'border-danger/40 bg-danger/5' : 'border-border bg-surface/40'}`}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-text-1">Cola de envío</p>
          <p className="text-[11px] text-text-3 mt-0.5">
            {estado.activa
              ? `Los correos salen repartidos, hasta ${estado.por_hora} por hora, para no chocar con el tope del servidor.`
              : 'La cola está apagada: los correos salen directos, sin repartir.'}
          </p>
        </div>
        {fallidos > 0 && (
          <button onClick={reintentar} disabled={trabajando} className="btn btn-sm">
            {trabajando ? 'Reencolando…' : `Reintentar ${fallidos}`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
        <Dato n={pendientes} etiqueta="En espera" />
        <Dato n={enCurso}    etiqueta="Saliendo ahora" />
        <Dato n={enviados}   etiqueta="Enviados" />
        <Dato n={fallidos}   etiqueta="Sin salir" alerta={fallidos > 0} />
      </div>

      {/* A quién le llegó, que es la pregunta de verdad.

          Los contadores dicen cuántos no salieron; quien viene aquí viene
          porque UNA persona concreta dice que no le llegó, y con un número no
          se puede contestar eso. El registro estaba en el servidor desde el
          principio y no lo pintaba nadie. Va plegado: se abre cuando hay que
          buscar a alguien. */}
      {(totalEnvios > 0 || buscaEnvio || soloFallidos) && (
        <details className="border-t border-border group">
          <summary className="px-4 py-3 text-sm text-text-2 hover:text-text-1 cursor-pointer list-none flex items-center justify-between">
            ¿A quién le llegó? · {envios.length} de {totalEnvios}
            <span className="text-text-3 group-open:rotate-180 transition-transform">⌄</span>
          </summary>
          {/* Buscar por destinatario y ver sólo lo que NO salió: son las dos
              cosas que se hacen aquí. Sin ellas, «los últimos 50» contestaba
              por casualidad. */}
          <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
            <input
              value={buscaEnvio}
              onChange={e => setBuscaEnvio(e.target.value)}
              placeholder="Buscar por correo…"
              className="input rounded-xl py-1.5 text-xs flex-1 min-w-[160px]" />
            <button
              type="button"
              onClick={() => setSoloFallidos(v => !v)}
              aria-pressed={soloFallidos}
              className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${soloFallidos
                ? 'border-danger/40 bg-danger/10 text-danger-light'
                : 'border-border-2 text-text-2 hover:text-text-1 hover:bg-surface-2'}`}>
              Sólo los que fallaron
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto divide-y divide-border">
            {envios.map(e => (
              <li key={e.id} className="px-4 py-2 flex items-center gap-3">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${e.ok ? 'bg-success' : 'bg-danger'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-1 truncate">{e.destinatario}</p>
                  {/* El motivo sólo cuando falló: en un envío correcto no hay
                      nada que explicar y repetir el asunto no ayuda a nadie. */}
                  <p className="text-[11px] text-text-3 truncate">
                    {e.ok ? (e.asunto || e.tipo) : (e.motivo || 'No se pudo enviar')}
                  </p>
                </div>
                <span className="text-[11px] text-text-3 flex-shrink-0 tabular-nums">
                  {e.created_at
                    ? new Date(e.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {fallidos > 0 && (
        <p className="px-4 py-3 text-[11px] text-text-2 leading-relaxed border-t border-border">
          Esos {fallidos} no salieron: o la dirección rebotó tres veces, o el envío
          se cortó a la mitad. <strong className="text-text-1">No se reenvían solos</strong> —
          insistir con una dirección mala perjudica a todos los demás correos del
          evento, y reenviar uno que quedó a medias puede mandar una segunda boleta.
          Si sabés que el problema ya está resuelto, reintentalos con el botón.
        </p>
      )}
    </div>
  );
}

function Dato({ n, etiqueta, alerta }) {
  return (
    <div className="px-4 py-3">
      <p className={`text-2xl font-bold font-display tabular-nums ${alerta ? 'text-danger' : 'text-text-1'}`}>{n}</p>
      <p className="text-[11px] text-text-3 mt-0.5">{etiqueta}</p>
    </div>
  );
}
