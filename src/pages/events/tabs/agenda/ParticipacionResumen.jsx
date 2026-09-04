import { useEffect, useState } from 'react';
import { agendaApi } from '../../../../api/agenda.js';

/* Si la agenda está funcionando o no.
 *
 * ── Qué contesta, y por qué no lo contestaba nadie ───────────────────────
 *
 * La pregunta que se hace un organizador a mitad del evento no es «cuántas
 * boletas vendí» —eso ya lo sabe— sino **«¿la gente está entrando a las
 * actividades?»**. Trescientas personas dentro del recinto y cuarenta
 * inscripciones en toda la agenda quiere decir que la programación no está
 * llegando, y eso se arregla el mismo día: se anuncia por el chat, se cambia
 * una hora, se mueve una sala.
 *
 * El servidor lo contesta entero desde una vista (`v_participacion_sesiones`):
 * cada sub-evento con sus inscritos y sus asistentes, más los totales del
 * evento. `agendaApi.participacion` **no la llamaba ningún archivo**.
 *
 * ── Por qué las boletas van al lado ──────────────────────────────────────
 *
 * Porque «40 inscripciones» no dice nada solo. Al lado de «300 entraron al
 * evento» dice bastante. El servidor las cuenta aparte a propósito —son
 * boletas, no inscripciones, y quien tiene boleta puede no haber entrado a
 * ninguna actividad— y ésa es justo la comparación que hace falta.
 */
export default function ParticipacionResumen({ evento }) {
  const [d, setD] = useState(null);

  useEffect(() => {
    let vivo = true;
    agendaApi.participacion(evento.id)
      .then(r => { if (vivo) setD(r); })
      /* En silencio: esto es un extra encima de la agenda. Si falla, lo que no
         puede pasar es que tape la pantalla con la que se trabaja. */
      .catch(() => {});
    return () => { vivo = false; };
  }, [evento.id]);

  /* Sin la migración de inscripciones, o sin ninguna actividad que las pida,
     no hay nada que resumir — y una fila de ceros parece un fallo. */
  if (!d || d.almacenamiento_listo === false) return null;
  const t = d.totales;
  if (!t || !t.sub_eventos) return null;

  /* La columna se llama `asistentes` — comprobado contra la vista
     `v_participacion_sesiones` en producción, no deducido del nombre del dato.
     Escribir `asistieron` no habría fallado: el número saldría `undefined`, el
     `!= null` daría falso y el dato desaparecería de la pantalla sin que nadie
     supiera que estuvo ahí. El síntoma de siempre en este proyecto.

     Si la columna no viniera se omite el dato, en vez de enseñar un cero que se
     leería como «no fue nadie». */
  const asistieron = d.participacion.reduce((s, r) => s + Number(r.asistentes || 0), 0);
  const hayAsistencia = d.participacion.some(r => r.asistentes != null);

  const dato = (valor, etiqueta, pista) => (
    <div className="min-w-0">
      <p className="text-xl font-bold font-display text-text-1 tabular-nums leading-none">{valor}</p>
      <p className="text-[11px] uppercase tracking-wide text-text-3 mt-1">{etiqueta}</p>
      {pista && <p className="text-[11px] text-text-3 mt-0.5 leading-snug">{pista}</p>}
    </div>
  );

  /* Qué porcentaje de los que entraron al evento se apuntó a algo. Sólo se
     enseña si de verdad entró alguien: dividir por cero da un número que
     miente con mucha seguridad. */
  const pct = t.entraron_al_evento > 0
    ? Math.round((t.inscripciones / t.entraron_al_evento) * 100)
    : null;

  return (
    <div className="rounded-2xl border border-border bg-surface/40 px-5 py-4">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {dato(t.sub_eventos, 'Actividades')}
        {dato(t.inscripciones, 'Inscripciones', pct != null ? `${pct}% de quien entró` : null)}
        {hayAsistencia && dato(asistieron, 'Asistieron', 'QR pasado en la puerta de la actividad')}
        {dato(t.entraron_al_evento, 'Entraron al evento', `de ${t.boletas_emitidas} boletas`)}
      </div>

      {/* Lo que de verdad se busca aquí: cuál se está quedando vacía. Se enseña
          sólo si hay alguna con cupo y muy poca gente — una lista completa de
          actividades ya está justo debajo. */}
      {(() => {
        const flojas = d.participacion
          .filter(r => r.cupo && Number(r.inscritos || 0) < Number(r.cupo) * 0.3)
          .slice(0, 3);
        if (!flojas.length) return null;
        return (
          <p className="text-xs text-text-2 mt-3 pt-3 border-t border-border leading-relaxed">
            Van flojas: {flojas.map(f => `${f.titulo} (${f.inscritos || 0}/${f.cupo})`).join(' · ')}
          </p>
        );
      })()}
    </div>
  );
}
