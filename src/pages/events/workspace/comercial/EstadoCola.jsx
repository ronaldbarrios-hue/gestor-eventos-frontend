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
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(() => {
    emailsApi.cola(evento.id)
      .then(setEstado)
      /* Sin cola montada, esta tarjeta simplemente no sale. No es un error que
         merezca un aviso rojo en la pantalla del organizador. */
      .catch(() => setEstado(null));
  }, [evento.id]);

  useEffect(() => { cargar(); }, [cargar]);

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
  if (!pendientes && !fallidos && !enCurso && !enviados) return null;

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
