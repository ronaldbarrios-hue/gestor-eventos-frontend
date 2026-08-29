import { useEffect, useState, useCallback } from 'react';
import Icono from '../../../../components/ui/Iconos.jsx';
import { torneosApi } from '../../../../api/torneos.js';
import { agendaApi } from '../../../../api/agenda.js';
import { aplanar } from '../../../../lib/torneoCategorias.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';

/* Dar de alta un torneo, y el hueco que le corresponde en el calendario.

   Van juntos porque son el mismo problema: un torneo que no aparece en la
   agenda es un torneo invisible para el público, y ése era justo el camino
   de vuelta que faltaba. */

export default function CrearTorneo({ eventoId, onCreado, onCancelar, categorias = [], categoriaSugerida = null }) {
  const [nombre, setNombre] = useState('');
  const [disciplina, setDisciplina] = useState('');
  /* Si venías filtrando por una rama, el torneo nace ahí: es lo que estabas
     mirando cuando pulsaste "nuevo". */
  const [categoriaId, setCategoriaId] = useState(categoriaSugerida || '');
  const [formato, setFormato] = useState('eliminacion');
  const [numGrupos, setNumGrupos] = useState(2);
  const [avanzanPorGrupo, setAvanzanPorGrupo] = useState(2);
  const [working, setWorking] = useState(false);
  const { error: toastErr } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { toastErr('El nombre del torneo es requerido.'); return; }
    setWorking(true);
    try {
      const body = {
        nombre: nombre.trim(), formato,
        disciplina: disciplina.trim() || null,
        categoria_id: categoriaId || null,
      };
      if (formato === 'grupos_eliminacion') {
        body.num_grupos = Number(numGrupos);
        body.avanzan_por_grupo = Number(avanzanPorGrupo);
      }
      const { torneo } = await torneosApi.crear(eventoId, body);
      onCreado?.(torneo);
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-3xl border border-border bg-surface/40 p-6">
        <h2 className="text-xl font-bold font-display text-text-1 tracking-tight mb-1">Nuevo torneo</h2>
        <p className="text-sm text-text-3 mb-6 leading-relaxed">
          Un evento puede tener varios torneos (por ejemplo un torneo por videojuego). Elige un formato; luego agregas los equipos participantes.
        </p>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="field">
              <label className="label">Nombre del torneo</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                className="input rounded-2xl py-3" placeholder="Ej. Copa Smash 2026" required autoFocus />
            </div>
            <div className="field">
              <label className="label">Disciplina <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
              <input value={disciplina} onChange={e => setDisciplina(e.target.value)}
                className="input rounded-2xl py-3" placeholder="Ej. Smash Bros, Boxeo, Fútbol" />
            </div>
          </div>

          {/* #48 · Dónde cuelga del árbol. Sólo si hay árbol: preguntar por
              una categoría cuando no existe ninguna es hacer perder el tiempo.
              La disciplina de arriba es otra cosa —la etiqueta corta que se
              pinta al lado del nombre— y por eso conviven. */}
          {categorias.length > 0 && (
            <div className="field">
              <label className="label">Categoría <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
              <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}
                className="input bg-surface-2 rounded-2xl py-3">
                <option value="">Sin clasificar</option>
                {aplanar(categorias).map(c => (
                  <option key={c.id} value={c.id}>
                    {'  '.repeat(c.profundidad)}{c.profundidad > 0 ? '› ' : ''}{c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label mb-2">Formato</label>
            <div className="space-y-2">
              <button type="button" onClick={() => setFormato('eliminacion')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${formato === 'eliminacion' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
                <p className="text-sm font-semibold text-text-1">Eliminación directa</p>
                <p className="text-xs text-text-3 mt-1 leading-relaxed">Llaves tipo bracket. Quien pierde, queda fuera.</p>
              </button>
              <button type="button" onClick={() => setFormato('liga')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${formato === 'liga' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
                <p className="text-sm font-semibold text-text-1">Liga / todos contra todos</p>
                <p className="text-xs text-text-3 mt-1 leading-relaxed">Tabla de posiciones por puntos.</p>
              </button>
              <button type="button" onClick={() => setFormato('grupos_eliminacion')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${formato === 'grupos_eliminacion' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
                <p className="text-sm font-semibold text-text-1">Grupos + Eliminación</p>
                <p className="text-xs text-text-3 mt-1 leading-relaxed">Fase de grupos (todos contra todos) y luego los mejores pasan a eliminación directa — como un mundial.</p>
              </button>
            </div>
          </div>

          {formato === 'grupos_eliminacion' && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-2/40 border border-border p-4">
              <div className="field">
                <label className="label text-xs">Número de grupos</label>
                <input type="number" min="2" value={numGrupos} onChange={e => setNumGrupos(e.target.value)}
                  className="input rounded-xl py-2.5" required />
              </div>
              <div className="field">
                <label className="label text-xs">Avanzan por grupo</label>
                <input type="number" min="1" value={avanzanPorGrupo} onChange={e => setAvanzanPorGrupo(e.target.value)}
                  className="input rounded-xl py-2.5" required />
              </div>
              <p className="col-span-2 text-[11px] text-text-3 leading-relaxed">
                Ej. 4 grupos, avanzan 2 por grupo → 8 equipos clasifican a cuartos de final.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            {onCancelar && (
              <button type="button" onClick={onCancelar} className="px-4 py-3.5 rounded-2xl text-base font-medium border border-border text-text-2 hover:text-text-1">
                Cancelar
              </button>
            )}
            <button type="submit" disabled={working}
              className="flex-1 py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
              {working ? <><Spinner size="sm" /> Creando...</> : 'Crear torneo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* El torneo dentro del calendario.

   `agenda_sessions` tiene `torneo_id` desde siempre, así que un sub-evento
   podía apuntar a unas llaves. Lo que no había era el camino de vuelta: se
   creaba el torneo aquí, no aparecía en el Espacio del evento, y para que
   saliera había que acordarse de crear a mano un sub-evento y elegir el
   torneo en un selector de otra pantalla. Quien no se acordaba tenía un
   torneo invisible para el público.

   Esto lo cierra: se dice si el torneo tiene hueco en el calendario y, si no,
   se crea desde aquí. */
export function HuecoEnCalendario({ evento, torneo, soyOwner }) {
  const { success, error: toastErr } = useToast();
  const [sesiones, setSesiones] = useState(null);
  const [creando, setCreando] = useState(false);
  const [cuando, setCuando] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    agendaApi.sessions(evento.id)
      .then(d => setSesiones((d.sessions || []).filter(s => String(s.torneo_id) === String(torneo.id))))
      .catch(() => setSesiones([]));
  }, [evento.id, torneo.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async () => {
    if (!cuando) { toastErr('Dinos cuándo se juega.'); return; }
    setGuardando(true);
    try {
      await agendaApi.crearSession(evento.id, {
        titulo: torneo.nombre,
        inicio: new Date(cuando).toISOString(),
        tipo: 'competencia',
        torneo_id: torneo.id,
        descripcion: torneo.disciplina || null,
      });
      success('Listo. El torneo ya aparece en el Espacio del evento y en la agenda pública.');
      setCreando(false);
      setCuando('');
      cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setGuardando(false); }
  };

  if (sesiones === null) return null;

  if (sesiones.length > 0) {
    const [s] = sesiones;
    const fecha = s.inicio
      ? new Date(s.inicio).toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'sin hora';
    return (
      <p className="text-[11px] text-text-3">
        <Icono nombre="calendario" className="w-3 h-3 inline-block align-[-2px]" /> En el calendario: <span className="text-text-2">{fecha}</span>
        {sesiones.length > 1 && ` · y ${sesiones.length - 1} franja${sesiones.length > 2 ? 's' : ''} más`}
      </p>
    );
  }

  if (!soyOwner) return null;

  if (!creando) {
    return (
      <button onClick={() => setCreando(true)}
        className="text-[11px] text-warning hover:underline text-left">
        <Icono nombre="aviso" className="w-3.5 h-3.5 inline-block align-[-2px]" /> No está en el calendario — el público no lo ve. Ponerle hora
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <input type="datetime-local" value={cuando} onChange={e => setCuando(e.target.value)}
        className="input !h-9 text-xs w-auto" autoFocus />
      <button onClick={crear} disabled={guardando} className="btn btn-sm">
        {guardando ? 'Creando…' : 'Añadir al calendario'}
      </button>
      <button onClick={() => setCreando(false)} className="btn-ghost btn-sm">Cancelar</button>
    </div>
  );
}

