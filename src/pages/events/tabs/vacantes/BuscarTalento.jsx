import { useCallback, useEffect, useState } from 'react';
import { vacantesApi } from '../../../../api/vacantes.js';
import { useToast } from '../../../../context/ToastContext.jsx';

/* Buscar en la bolsa de talento.
 *
 * ── El hueco que tapa, y es de los que duelen ────────────────────────────
 *
 * El módulo de talento estaba entero por el lado de quien busca trabajo: se
 * crea el perfil, se rellena, se sube el CV y se marca **«publicado»** — que
 * significa exactamente una cosa, «que me encuentren».
 *
 * Y por el lado del que contrata no había dónde encontrarlos. El servidor
 * lleva la búsqueda montada desde hace tiempo (`GET /eventos/:id/talento`,
 * filtra por texto y por ciudad, y sólo devuelve perfiles publicados) y la
 * ficha pública también (`GET /perfil-talento/:userId`, con sus reseñas). No
 * las llamaba **ninguna pantalla**.
 *
 * Así que el organizador sólo podía esperar: publicar una vacante y ver quién
 * llegaba. Buscar a alguien y ofrecerle el puesto no existía, aunque la
 * persona hubiera hecho todo lo que había que hacer para que la encontraran.
 *
 * Y la política RLS de la 0097 abre `perfil_talento` justo con esa condición
 * —`publicado = true`—: la base ya estaba preparada para que esto se pudiera
 * leer. Faltaba el que lee.
 *
 * ── Por qué vive dentro de Vacantes ──────────────────────────────────────
 *
 * Porque es la misma tarea con la aguja al revés: conseguir gente para el
 * evento. Publicar una vacante es esperar a que vengan; buscar es ir. En
 * pantallas separadas, la segunda sería una que nadie abre.
 */
export default function BuscarTalento({ evento }) {
  const { error: toastErr } = useToast();
  const [q, setQ] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [lista, setLista] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(null);

  const buscar = useCallback(async (e) => {
    e?.preventDefault();
    setBuscando(true);
    try {
      /* Sin filtros trae los últimos publicados, que es lo correcto: la
         primera vez nadie sabe qué escribir, y una pantalla que sólo enseña
         algo después de buscar parece vacía cuando no lo está. */
      const d = await vacantesApi.talento(evento.id, {
        ...(q.trim() ? { q: q.trim() } : {}),
        ...(ciudad.trim() ? { ciudad: ciudad.trim() } : {}),
      });
      setLista(d.talento || []);
    } catch (e2) { toastErr(e2.response?.data?.error || e2.message); }
    finally { setBuscando(false); }
  }, [evento.id, q, ciudad, toastErr]);

  /* Se busca al MONTAR, y en un efecto.
     Llamarlo desde el cuerpo del render sería un bucle: la respuesta llama a
     `setLista`, eso vuelve a renderizar, y el render vuelve a buscar. Y el
     efecto va sin `buscar` en las dependencias a propósito — `buscar` cambia
     con cada tecla que se escribe en el filtro, y entonces esto pediría al
     servidor por letra. */
  useEffect(() => { buscar(); /* eslint-disable-next-line */ }, [evento.id]);

  return (
    <div className="space-y-4">
      <form onSubmit={buscar} className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[12rem]">
          <label className="label">Qué buscas</label>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="logística, sonido, fotografía…"
            className="input w-full" />
        </div>
        <div className="w-40">
          <label className="label">Ciudad</label>
          <input value={ciudad} onChange={e => setCiudad(e.target.value)}
            placeholder="Ibagué" className="input w-full" />
        </div>
        <button type="submit" disabled={buscando} className="btn-primary btn-sm">
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {lista !== null && lista.length === 0 && (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-14 text-center">
          <p className="text-sm text-text-2">
            {q || ciudad
              ? 'Nadie con eso, de momento.'
              : 'Todavía no hay perfiles de talento publicados.'}
          </p>
          <p className="text-xs text-text-3 mt-2 max-w-md mx-auto leading-relaxed">
            Aquí sólo salen quienes marcaron su perfil como público. Publicar una vacante sigue
            siendo la otra vía: ahí se postulan ellos.
          </p>
        </div>
      )}

      {lista !== null && lista.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {lista.map(t => (
            <button key={t.user_id} onClick={() => setAbierto(t.user_id)}
              className="rounded-2xl border border-border bg-surface/40 p-4 text-left hover:border-border-2 transition-colors">
              <div className="flex items-start gap-3">
                {t.foto_url
                  ? <img src={t.foto_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-10 h-10 rounded-full bg-surface-2 text-text-3 flex items-center justify-center text-sm flex-shrink-0">
                      {(t.titular || '?').charAt(0).toUpperCase()}
                    </div>}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-1 truncate">{t.titular || 'Sin titular'}</p>
                  <p className="text-xs text-text-3 truncate">{t.ciudad || 'Sin ciudad'}</p>
                  {/* Verificado es de Truora y significa que alguien comprobó
                      su documento: en una contratación es el dato que decide. */}
                  {t.verificacion_estado === 'verificado' && (
                    <span className="text-[10px] uppercase tracking-wide text-success">Verificado</span>
                  )}
                </div>
              </div>
              {t.habilidades?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {t.habilidades.slice(0, 5).map(h => (
                    <span key={h} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-text-2">{h}</span>
                  ))}
                  {t.habilidades.length > 5 && (
                    <span className="text-[10px] text-text-3">+{t.habilidades.length - 5}</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {abierto && <FichaTalento userId={abierto} onClose={() => setAbierto(null)} />}
    </div>
  );
}

/* La ficha, con sus reseñas. El servidor la devuelve entera —bio, experiencia,
   disponibilidad, portafolio, CV y las reseñas que le dejaron organizadores— y
   sólo si está publicada: un borrador lo ve su dueño y nadie más. */
function FichaTalento({ userId, onClose }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  /* En un efecto, y con la guarda de siempre: si se cierra la ficha antes de
     que conteste el servidor, no se escribe en un componente que ya no está. */
  useEffect(() => {
    let vivo = true;
    vacantesApi.perfilPublico(userId)
      .then(r => { if (vivo) setD(r); })
      .catch(e => { if (vivo) setErr(e.response?.data?.error || e.message); });
    return () => { vivo = false; };
  }, [userId]);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
         onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {err && <p className="text-sm text-danger">{err}</p>}
          {!d && !err && <p className="text-sm text-text-3">Cargando…</p>}
          {d && (
            <>
              <div className="flex items-start gap-3">
                {d.perfil.foto_url
                  ? <img src={d.perfil.foto_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                  : <div className="w-14 h-14 rounded-full bg-surface-2" />}
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-text-1">{d.perfil.nombre || d.perfil.titular}</h3>
                  <p className="text-xs text-text-3">{d.perfil.titular}</p>
                  <p className="text-xs text-text-3">
                    {[d.perfil.ciudad, d.perfil.pais].filter(Boolean).join(' · ') || 'Sin ubicación'}
                  </p>
                  {d.total_resenas > 0 && (
                    <p className="text-xs text-text-2 mt-1">
                      {d.promedio.toFixed(1)} ★ · {d.total_resenas} reseña{d.total_resenas === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
              </div>

              {d.perfil.bio && <p className="text-sm text-text-2 leading-relaxed">{d.perfil.bio}</p>}
              {d.perfil.experiencia && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-1">Experiencia</p>
                  <p className="text-sm text-text-2 leading-relaxed whitespace-pre-line">{d.perfil.experiencia}</p>
                </div>
              )}
              {d.perfil.disponibilidad && (
                <p className="text-xs text-text-3">Disponibilidad: {d.perfil.disponibilidad}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {d.perfil.portfolio_url && (
                  <a href={d.perfil.portfolio_url} target="_blank" rel="noreferrer noopener"
                     className="btn-secondary btn-sm">Portafolio</a>
                )}
                {d.perfil.cv_url && (
                  <a href={d.perfil.cv_url} target="_blank" rel="noreferrer noopener"
                     className="btn-secondary btn-sm">{d.perfil.cv_nombre || 'CV'}</a>
                )}
              </div>

              {d.resenas?.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">
                    Lo que dicen quienes lo contrataron
                  </p>
                  <div className="space-y-2">
                    {d.resenas.map((r, i) => (
                      <div key={i} className="rounded-xl border border-border bg-surface/40 px-3 py-2">
                        <p className="text-xs text-text-2">{'★'.repeat(r.estrellas)}</p>
                        {r.comentario && <p className="text-sm text-text-2 mt-1 leading-relaxed">{r.comentario}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end">
          <button onClick={onClose} className="btn-ghost btn-sm">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
