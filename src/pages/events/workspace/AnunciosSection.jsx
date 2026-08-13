import { useEffect, useState, useCallback } from 'react';
import { anunciosApi } from '../../../api/push.js';

/* ──────────────────────────────────────────────────────────────────
   Anuncios del evento.

   Esto era un botón y una frase. Enviar un anuncio no dejaba rastro en
   ninguna parte: no había forma de saber qué se había anunciado, ni cuándo,
   ni a cuánta gente. Y como el envío era sólo un push del navegador, en la
   práctica no llegaba a nadie.

   Ahora cada anuncio se guarda (migración 0068) y esto es su historial. Sirve
   para lo que sirve un historial: no repetir un aviso, y poder responder
   "¿esto se avisó?" sin depender de que alguien se acuerde.
   ────────────────────────────────────────────────────────────────── */

function cuando(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 3600)  return `hace ${Math.max(1, Math.floor(diff / 60))} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

export default function AnunciosSection({ evento, onAnuncio, recargar }) {
  const [anuncios, setAnuncios] = useState(null);   // null = cargando

  const cargar = useCallback(() => {
    anunciosApi.list(evento.id)
      .then(d => setAnuncios(d.anuncios || []))
      .catch(() => setAnuncios([]));
  }, [evento.id]);

  useEffect(() => { cargar(); }, [cargar, recargar]);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Anuncios</h2>
          <p className="text-sm text-text-2 mt-1">
            Un comunicado para todo el equipo del evento. Les llega a la campana de
            notificaciones, y además como aviso del navegador a quien los tenga activados.
          </p>
        </div>
        <button onClick={onAnuncio} className="btn-primary flex-shrink-0">Redactar anuncio</button>
      </div>

      {anuncios === null ? (
        <p className="text-sm text-text-3 py-8 text-center">Cargando anuncios…</p>
      ) : anuncios.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-2 px-6 py-14 text-center">
          <p className="text-sm text-text-2">Todavía no has enviado ningún anuncio.</p>
          <p className="text-xs text-text-3 mt-1.5">
            Los que envíes quedan aquí, con la fecha y a cuánta gente llegaron.
          </p>
        </div>
      ) : (
        <ul className="rounded-3xl border border-border bg-surface/40 divide-y divide-border overflow-hidden">
          {anuncios.map(a => (
            <li key={a.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <p className="text-sm font-semibold text-text-1">{a.titulo}</p>
                <span className="text-[11px] text-text-3 flex-shrink-0">{cuando(a.created_at)}</span>
              </div>
              <p className="text-sm text-text-2 mt-1 leading-relaxed whitespace-pre-line">{a.mensaje}</p>
              <p className="text-[11px] text-text-3 mt-2">
                {a.autor?.nombre ? `${a.autor.nombre} · ` : ''}
                {a.destinatarios} {a.destinatarios === 1 ? 'destinatario' : 'destinatarios'}
                {/* Se dice cuántos lo recibieron por el navegador porque es lo
                    único que puede fallar sin que se note: la campana siempre
                    llega, el push depende de que lo tengan activado. */}
                {a.push_enviados > 0 && ` · ${a.push_enviados} por el navegador`}
                {a.url && ` · enlaza a ${a.url}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
