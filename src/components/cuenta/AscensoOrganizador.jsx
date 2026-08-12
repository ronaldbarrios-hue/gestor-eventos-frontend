import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Spinner from '../ui/Spinner.jsx';
import Icono from '../ui/Icono.jsx';

/* Pasar de asistente a organizador sin volver a registrarse.

   El registro ya se parte en dos caminos: en el paso 0 se elige entre «solo
   quiero asistir» y «voy a organizar», y quien elige asistir se salta las
   preguntas de organizador. Eso funciona.

   Lo que no existía era la vuelta. `cambiarModo` estaba en el contexto de auth
   desde el principio y NADIE la llamaba: el Sidebar incluso tiene un comentario
   prometiendo «switch en la TopBar» que no está en ninguna parte. Así que quien
   entró para comprar una boleta y luego quiso montar su propio evento no tenía
   camino: o se quedaba en modo asistente, o se registraba otra vez con otro
   correo.

   Se pregunta lo que el camino ligero se saltó —tamaño típico y contexto— porque
   es lo que se usa para no llenarle el panel de cosas que no le sirven. Las dos
   son opcionales: si alguien quiere empezar ya, empieza, y el panel se ajusta
   después.

   No hay nada que pagar. Todo GESTEK es de uso gratuito. */

const PARTICIPANTES = [
  'Menos de 50',
  'Entre 50 y 200',
  'Entre 200 y 1000',
  'Más de 1000',
  'Todavía no lo sé',
];

export default function AscensoOrganizador() {
  const { usuario, cambiarModo, updateProfile } = useAuth();
  const { success, error: toastErr } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [participantes, setParticipantes] = useState('');
  const [contexto, setContexto] = useState('');
  const [guardando, setGuardando] = useState(false);

  /* Solo aparece a quien está en modo asistente. Para un organizador esto no
     significa nada y sería ruido. */
  if (usuario?.modoActivo !== 'asistente') return null;

  const ascender = async () => {
    setGuardando(true);
    try {
      /* Primero los datos y luego el modo: si el cambio de modo falla, no se
         queda a medias con el panel de organizador y el perfil vacío. */
      if (participantes || contexto.trim()) {
        const r = await updateProfile({
          participantes: participantes || undefined,
          contexto: contexto.trim() || undefined,
        });
        if (!r.ok) throw new Error(r.error);
      }
      const r2 = await cambiarModo('organizador');
      if (!r2.ok) throw new Error(r2.error);
      success('Listo. Ya puedes crear eventos: los verás en tu panel.');
      setAbierto(false);
    } catch (e) {
      toastErr(e.message || 'No se pudo cambiar tu cuenta.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-3xl border border-accent/30 bg-accent/5 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
          <Icono name="destello" className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text-1">¿Quieres organizar tus propios eventos?</h3>
          <p className="text-sm text-text-2 mt-1 leading-relaxed">
            Tu cuenta está en modo asistente: sirve para explorar eventos y guardar tus
            boletas. Puedes pasarla a organizador sin registrarte de nuevo y sin perder
            nada de lo que ya tienes. Es gratis, como todo lo demás.
          </p>
        </div>
      </div>

      {!abierto ? (
        <button onClick={() => setAbierto(true)} className="btn-primary btn-sm">
          Quiero organizar eventos
        </button>
      ) : (
        <div className="space-y-4 pt-1">
          <p className="text-xs text-text-3 leading-relaxed">
            Dos preguntas opcionales. Solo sirven para no llenarte el panel de cosas que
            no vas a usar — puedes saltarlas y empezar ya.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 items-start">
            <div className="field">
              <label className="label text-xs">Tamaño típico de tus eventos</label>
              <select value={participantes} onChange={e => setParticipantes(e.target.value)}
                className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                <option value="">Prefiero no decirlo</option>
                {PARTICIPANTES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label text-xs">¿Qué tipo de eventos?</label>
              <input value={contexto} onChange={e => setContexto(e.target.value)}
                className="input rounded-xl py-2.5 text-sm"
                placeholder="Ferias, conciertos, torneos…" />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={ascender} disabled={guardando} className="btn-primary btn-sm">
              {guardando ? <><Spinner size="sm" /> Cambiando…</> : 'Pasar a organizador'}
            </button>
            <button onClick={() => setAbierto(false)} disabled={guardando} className="btn-ghost btn-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* La vuelta atrás: un organizador que quiere el panel simple de asistente.

   Va aparte y sin adornos porque es una preferencia, no una decisión: no se
   pierde nada, los eventos siguen ahí, y se puede volver cuando quiera. */
export function VolverAModoAsistente() {
  const { usuario, cambiarModo } = useAuth();
  const { success, error: toastErr } = useToast();
  const [guardando, setGuardando] = useState(false);

  if (usuario?.modoActivo === 'asistente') return null;

  const bajar = async () => {
    setGuardando(true);
    const r = await cambiarModo('asistente');
    setGuardando(false);
    if (r.ok) success('Tu panel pasa a modo asistente. Tus eventos siguen ahí.');
    else toastErr(r.error || 'No se pudo cambiar el modo.');
  };

  return (
    <div className="rounded-2xl border border-border bg-surface/40 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm text-text-1">Ver el panel como asistente</p>
        <p className="text-xs text-text-3 mt-0.5 leading-relaxed">
          Esconde lo de organizar y deja solo explorar y tus boletas. No se borra nada
          y puedes volver cuando quieras.
        </p>
      </div>
      <button onClick={bajar} disabled={guardando} className="btn-ghost btn-sm flex-shrink-0">
        {guardando ? <Spinner size="sm" /> : 'Cambiar'}
      </button>
    </div>
  );
}
