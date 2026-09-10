import { useEffect, useState } from 'react';
import { agendaApi } from '../../../../api/agenda.js';
import { useToast } from '../../../../context/ToastContext.jsx';

/* Quién se apuntó a esta actividad.
 *
 * ── El hueco que tapa ─────────────────────────────────────────────────────
 *
 * El servidor lleva tiempo contestando esto entero: nombre, correo, teléfono,
 * las respuestas del formulario propio de la actividad, el código de la boleta
 * y si asistió. Hay hasta una ruta para corregir el estado a mano. Y no había
 * ni una pantalla que lo pidiera — `agendaApi.inscripciones` no lo llamaba
 * ningún archivo.
 *
 * Lo que sí se veía era el NÚMERO: «Ya hay 14 inscritos». Para un taller de
 * cupo 15 el número no sirve de nada; lo que hace falta es la lista con la que
 * se planta uno en la puerta.
 *
 * ── Por qué se puede cambiar el estado desde aquí ────────────────────────
 *
 * La asistencia se marca pasando el QR en la puerta del taller, y ése es el
 * camino bueno. Pero el día del evento se cae el móvil, se queda sin batería o
 * la persona llega sin el correo: sin una salida manual, el staff se queda
 * mirando una lista que no puede tocar. Es la excepción, no el método — por eso
 * es un selector pequeño al lado de cada fila y no un botón grande.
 */
/* Cuántos inscritos por página. El mismo número que la lista de asistentes:
   dos listas del mismo panel con tamaños distintos sólo confunden. */
const POR_PAGINA = 50;

export default function InscritosSesion({ evento, sesion, onClose, onCambio }) {
  const { success, error: toastErr } = useToast();
  const [lista, setLista] = useState(null);
  const [err, setErr] = useState('');
  const [busca, setBusca] = useState('');
  const [guardando, setGuardando] = useState(null);
  /* Lo dice el servidor cuando la tabla todavía no está: sin esto, «no hay
     inscritos» y «esto aún no existe en la base» se ven exactamente igual. */
  const [sinTabla, setSinTabla] = useState(false);
  /* Esta lista se servía con un tope de 500 y sin decirlo: el mismo corte en
     silencio que tenía la de asistentes, sólo con el techo más arriba,
     esperando el primer taller grande. */
  const [pagina, setPagina] = useState(1);
  const [tramo, setTramo] = useState({ total: 0, paginas: 1, por_pagina: POR_PAGINA });

  useEffect(() => {
    let vivo = true;
    /* La búsqueda la hace el SERVIDOR. Antes se filtraba en memoria sobre lo
       que hubiera cargado, y con la lista partida en páginas eso buscaría sólo
       dentro de la página que se está viendo — que es peor que no buscar,
       porque contesta «nadie con ese nombre» cuando sí está. */
    const t = setTimeout(() => {
      agendaApi.inscripciones(evento.id, sesion.id, { page: pagina, limit: POR_PAGINA, ...(busca.trim() ? { q: busca.trim() } : {}) })
        .then(r => {
          if (!vivo) return;
          setLista(r.inscripciones || []);
          setSinTabla(r.almacenamiento_listo === false);
          setTramo({
            total: r.total ?? (r.inscripciones || []).length,
            paginas: r.paginas ?? 1,
            por_pagina: r.por_pagina ?? POR_PAGINA,
            /* `null` si el servidor no los pudo contar, o `undefined` si es
               viejo y no los manda: las dos cosas caen al recuento local. */
            apuntados: r.apuntados ?? undefined,
            asistieron: r.asistieron ?? undefined,
          });
        })
        .catch(e => { if (vivo) setErr(e.response?.data?.error || e.message); });
    }, busca ? 300 : 0);
    return () => { vivo = false; clearTimeout(t); };
  }, [evento.id, sesion.id, pagina, busca]);

  const cambiar = async (i, estado) => {
    setGuardando(i.id);
    try {
      await agendaApi.estadoInscripcion(evento.id, sesion.id, i.id, estado);
      setLista(l => l.map(x => (x.id === i.id ? { ...x, estado } : x)));
      success(estado === 'asistio' ? 'Marcado como asistió.' : 'Estado actualizado.');
      onCambio?.();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally { setGuardando(null); }
  };

  /* Lo que llegó ES lo que se pinta: filtrar aquí otra vez sería filtrar dos
     veces la misma cosa, y con la lista paginada, mal. */
  const filtrada = lista || [];

  /* Los dos numeros de la cabecera son del SUB-EVENTO, no de la pagina.
     Se calculaban sobre las filas cargadas, y con la lista paginada eso diria
     «50 apuntados» en un taller de ochenta — un numero equivocado ahi es peor
     que no ponerlo, porque se usa para decidir si queda cupo. Los cuenta el
     servidor; si no pudo, se cae a lo cargado, que es como estaba. */
  const asistieron = tramo.asistieron ?? (lista || []).filter(i => i.estado === 'asistio').length;
  const activos = tramo.apuntados ?? (lista || []).filter(i => i.estado !== 'cancelado').length;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
         onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-text-1">
            Inscritos · {sesion.titulo || sesion.nombre}
          </h3>
          <p className="text-xs text-text-3 mt-1">
            {lista === null ? 'Cargando…' : (
              <>
                {activos} apuntados{sesion.cupo ? ` de ${sesion.cupo}` : ''}
                {asistieron > 0 ? ` · ${asistieron} ya asistieron` : ''}
              </>
            )}
          </p>
        </div>

        {/* El umbral se mira sobre el TOTAL y no sobre lo cargado: con la
            lista paginada, «lista.length > 8» es «esta página tiene más de
            ocho», que no es la pregunta. Y una vez escrito algo, la caja se
            queda — si desapareciera al filtrar hasta dos resultados, no habría
            forma de borrar la búsqueda. */}
        {(tramo.total > 8 || busca) && (
          <div className="px-5 pt-4">
            <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }}
              placeholder="Buscar por nombre o correo"
              className="input w-full text-sm" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {err && <p className="text-sm text-danger">{err}</p>}
          {sinTabla && (
            <p className="text-sm text-text-2 leading-relaxed">
              Las inscripciones a actividades todavía no están montadas en la base de datos.
              Falta correr la migración; hasta entonces esta lista sale vacía aunque haya gente.
            </p>
          )}
          {lista !== null && !sinTabla && filtrada.length === 0 && (
            <p className="text-sm text-text-2">
              {busca ? 'Nadie con ese nombre.' : 'Todavía no se ha apuntado nadie.'}
            </p>
          )}
          {filtrada.map(i => (
            <div key={i.id}
                 className={`rounded-2xl border px-4 py-3 ${i.estado === 'cancelado'
                   ? 'border-border bg-surface/20 opacity-60' : 'border-border bg-surface/40'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-1 truncate">{i.nombre_mostrar}</p>
                  <p className="text-xs text-text-3 truncate">{i.email_mostrar}</p>
                  {i.codigo_boleta && (
                    <p className="text-[11px] font-mono text-text-3 mt-0.5">Boleta {i.codigo_boleta}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {i.estado === 'asistio' && (
                    <span className="text-[11px] font-semibold text-success">Asistió</span>
                  )}
                  <select
                    value={i.estado}
                    disabled={guardando === i.id}
                    onChange={e => cambiar(i, e.target.value)}
                    aria-label={`Estado de ${i.nombre_mostrar}`}
                    className="input text-xs py-1 px-2 w-32">
                    <option value="apuntado">Apuntado</option>
                    <option value="asistio">Asistió</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Lo que contestó al apuntarse. Si la actividad pregunta talla o
                  nivel, esto es justo lo que hay que llevar impreso. */}
              {i.respuestas && Object.keys(i.respuestas).length > 0 && (
                <dl className="mt-2 pt-2 border-t border-border grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(i.respuestas).map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-wide text-text-3 truncate">{k}</dt>
                      <dd className="text-xs text-text-2 truncate">{String(v ?? '—')}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ))}
          {/* El paginador. Dentro del área que hace scroll y al final de las
              filas: es donde está la mano cuando se acaba la página. */}
          {tramo.paginas > 1 && (
            <div className="flex items-center justify-between gap-3 pt-3">
              <p className="text-[11px] text-text-3 tabular-nums">
                {(pagina - 1) * tramo.por_pagina + 1}–{(pagina - 1) * tramo.por_pagina + filtrada.length} de {tramo.total}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina <= 1}
                  className="btn-secondary btn-sm">Anterior</button>
                <span className="text-[11px] text-text-3 tabular-nums">{pagina} / {tramo.paginas}</span>
                <button onClick={() => setPagina(p => Math.min(tramo.paginas, p + 1))} disabled={pagina >= tramo.paginas}
                  className="btn-secondary btn-sm">Siguiente</button>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end">
          <button onClick={onClose} className="btn-ghost btn-sm">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
