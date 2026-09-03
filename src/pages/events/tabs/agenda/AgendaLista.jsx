import Icono from '../../../../components/ui/Iconos.jsx';
import { tipoEspacio, tipoEstilo } from '../../../../lib/espacio.js';
import { EditIcon, TrashIcon } from './agendaComun.jsx';
import SessionForm from './SessionForm.jsx';
import { zonasDelEvento } from '../../../../lib/zonas.js';

/* La vista de lista y la fila de cada sub-evento. Es la vista por defecto:
   la que se usa mientras se está armando la agenda, antes de que las horas
   importen. */

export default function SessionsList({ sessions, editing, speakers, torneos, evento, expositores = [], tiposBoleta = [], onEdit, onSave, onDelete }) {
  const grupos = sessions.reduce((acc, s) => {
    const d = new Date(s.inicio).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    (acc[d] = acc[d] || []).push(s);
    return acc;
  }, {});

  /* Si el evento tiene plano, una actividad sin zona no sale en ninguna parte
     de él. Medido en producción: 2 de 11 sesiones tenían zona. El aviso va en
     la LISTA y no sólo en el formulario porque aquí se ven todas de golpe, que
     es cuando se nota que faltan nueve. */
  const hayZonas = zonasDelEvento(evento).length > 0;

  return (
    <div className="space-y-6">
      {Object.entries(grupos).map(([dia, items]) => (
        <div key={dia}>
          <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-3">{dia}</p>
          <div className="rounded-3xl border border-border bg-surface/40 overflow-hidden">
            {items.map((s, i) => editing === s.id
              ? <SessionForm key={s.id} initial={s} speakers={speakers} torneos={torneos} evento={evento} sessions={sessions}
                  expositores={expositores} tiposBoleta={tiposBoleta}
                  onCancel={() => onEdit(null)} onSave={(p) => onSave(s.id, p)} />
              : <SessionRow key={s.id} session={s} hayZonas={hayZonas} onEdit={() => onEdit(s.id)} onDelete={() => onDelete(s)} isLast={i === items.length - 1} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionRow({ session, hayZonas = false, onEdit, onDelete, isLast }) {
  const hi = new Date(session.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const hf = session.fin ? new Date(session.fin).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : null;
  const tip = tipoEspacio(session.tipo);
  return (
    <div className={`flex items-start gap-4 px-5 py-4 ${!isLast ? 'border-b border-border' : ''} hover:bg-surface-2/30 transition-colors group`}
      style={{ boxShadow: `inset 3px 0 0 ${tip.color}` }}>
      <div className="text-text-1 font-display font-bold tabular-nums text-base w-20 flex-shrink-0 leading-tight">
        {hi}
        {hf && <span className="block text-xs text-text-3 font-sans font-normal mt-0.5">— {hf}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1" style={tipoEstilo(session.tipo)}>
            <Icono nombre={tip.icono} className="w-3.5 h-3.5" />{tip.label}
          </span>
          <h3 className="text-base font-semibold text-text-1">{session.titulo}</h3>
          {session.track && session.track !== 'principal' && (
            <span className="text-xs uppercase tracking-widest text-primary-light bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">{session.track}</span>
          )}
          {session.torneo_id && (
            <span className="text-[10px] uppercase tracking-wide text-text-3 border border-border px-2 py-0.5 rounded-full"><Icono nombre="trofeo" className="w-3 h-3 inline-block align-[-2px]" /> con llaves</span>
          )}
          {/* Que pida inscripción cambia lo que ve el público: sin decirlo
              aquí, el organizador tiene que abrir cada sub-evento para saber
              cuáles la piden y cuáles no. */}
          {session.requiere_inscripcion && (
            <span className="text-[10px] uppercase tracking-wide text-accent border border-accent/40 bg-accent/10 px-2 py-0.5 rounded-full">
              Inscripción
              {session.cupo != null && ` · ${session.inscritos || 0}/${session.cupo}`}
              {session.cupo == null && (session.inscritos || 0) > 0 && ` · ${session.inscritos}`}
            </span>
          )}
        </div>
        {session.descripcion && <p className="text-sm text-text-2 mt-1 leading-relaxed">{session.descripcion}</p>}
        {/* Una actividad que pide inscripción y no tiene descripción sale en la
            confirmación del registro como un título suelto: nadie puede decidir
            si apuntarse. Medido contra Festech, donde la única actividad con
            inscripción viene sin descripción ni ponente. Se avisa aquí, que es
            donde se arregla, y no en la pantalla del público, que ya no tiene
            nada que enseñar. */}
        {session.requiere_inscripcion && !session.descripcion?.trim() && !session.speaker && (
          <p className="text-xs text-warning mt-1.5 leading-relaxed">
            Pide inscripción pero no dice de qué es. Al público le sale sólo el título, la hora y
            el cupo — añade una descripción o un ponente para que pueda decidir.
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 text-sm text-text-3 flex-wrap">
          {session.ubicacion && <span className="inline-flex items-center gap-1"><Icono nombre="pin" className="w-3.5 h-3.5" />{session.ubicacion}</span>}
          {hayZonas && !session.zona_id && (
            <span className="inline-flex items-center gap-1 text-warning">
              <Icono nombre="pin" className="w-3.5 h-3.5" />Sin zona: no sale en el plano
            </span>
          )}
          {session.speaker && (
            <span className="inline-flex items-center gap-2">
              {session.speaker.foto_url
                ? <img src={session.speaker.foto_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                : <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-[10px] font-bold">{session.speaker.nombre.charAt(0)}</span>}
              <span>{session.speaker.nombre}{session.speaker.empresa ? ` · ${session.speaker.empresa}` : ''}</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} aria-label="Editar"
          className="w-8 h-8 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center">
          <EditIcon className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} aria-label="Borrar"
          className="w-8 h-8 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center">
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─────────── Vista Mes ─────────── */

