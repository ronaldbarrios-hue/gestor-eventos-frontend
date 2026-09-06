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
  /* Puntaje por jurado ("show de talento"): dos decisiones aparte del
     formato — cómo se califica (una nota o varias que suman) y si hay una
     sola presentación o varias rondas eliminatorias. */
  const [modoCalificacion, setModoCalificacion] = useState('rubrica');
  const [puntajeUnicoMax, setPuntajeUnicoMax] = useState(10);
  const [criterios, setCriterios] = useState([{ nombre: '', puntaje_maximo: 10 }]);
  const [modoRondas, setModoRondas] = useState('una_ronda');
  const [rondas, setRondas] = useState([{ nombre: 'Semifinal', avanzan: 2 }, { nombre: 'Final' }]);
  const [working, setWorking] = useState(false);
  /* Cuándo se juega, en el mismo paso.
     Ya había una forma de darle hueco en el calendario —la tarjeta
     `HuecoEnCalendario`, más abajo— y era opcional: había que verla, entenderla
     y volver. Medido en producción: **4 torneos, 0 enlazados**. Una relación
     opcional al lado de un camino que no la pide es una relación vacía.
     Se pregunta aquí, donde ya se está escribiendo el torneo. Sigue pudiendo
     dejarse en blanco —a veces la fecha no se sabe todavía— y entonces la
     tarjeta de abajo sigue estando para cuando se sepa. */
  const [cuando, setCuando] = useState('');
  const { error: toastErr } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { toastErr('El nombre del torneo es requerido.'); return; }
    if (formato === 'puntaje_jurado') {
      if (modoCalificacion === 'rubrica') {
        for (const c of criterios) {
          if (!c.nombre.trim()) { toastErr('Cada criterio necesita un nombre.'); return; }
          if (!(Number(c.puntaje_maximo) > 0)) { toastErr(`"${c.nombre}": indica un puntaje máximo válido.`); return; }
        }
      } else if (!(Number(puntajeUnicoMax) > 0)) {
        toastErr('Indica un puntaje máximo válido.'); return;
      }
      if (modoRondas === 'eliminatoria') {
        for (let i = 0; i < rondas.length; i++) {
          if (!rondas[i].nombre.trim()) { toastErr(`La ronda ${i + 1} necesita un nombre.`); return; }
          if (i < rondas.length - 1 && !(Number(rondas[i].avanzan) >= 1)) {
            toastErr(`"${rondas[i].nombre}": indica cuántos avanzan a la siguiente ronda (mínimo 1).`); return;
          }
        }
      }
    }
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
      if (formato === 'puntaje_jurado') {
        body.modo_calificacion = modoCalificacion;
        body.modo_rondas = modoRondas;
        body.criterios = modoCalificacion === 'puntaje_unico'
          ? [{ puntaje_maximo: Number(puntajeUnicoMax) }]
          : criterios.map(c => ({ nombre: c.nombre.trim(), puntaje_maximo: Number(c.puntaje_maximo) }));
        body.rondas = modoRondas === 'una_ronda'
          ? [{ nombre: 'Ronda única' }]
          : rondas.map((r, i) => i === rondas.length - 1
              ? { nombre: r.nombre.trim() }
              : { nombre: r.nombre.trim(), avanzan: Number(r.avanzan) });
      }
      const { torneo } = await torneosApi.crear(eventoId, body);

      /* El hueco en el calendario, si dijeron cuándo.
         Va DESPUÉS y en su propio `try`: si esto falla, el torneo ya está
         creado y perderlo por no haber podido escribir la franja sería absurdo.
         Se avisa y se sigue — la tarjeta de abajo deja ponerle hora luego. */
      if (cuando) {
        try {
          await agendaApi.crearSession(eventoId, {
            titulo: nombre.trim(),
            inicio: new Date(cuando).toISOString(),
            tipo: 'competencia',
            torneo_id: torneo.id,
            descripcion: disciplina.trim() || null,
          });
        } catch {
          toastErr('El torneo se creó, pero no se pudo ponerle hora en el calendario. Puedes hacerlo desde su tarjeta.');
        }
      }
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
          {/* Va arriba del todo y no al final: es la pregunta que hace que el
              torneo exista para el público, no un detalle de configuración. */}
          <div className="field">
            <label className="label">
              ¿Cuándo se juega? <span className="lowercase tracking-normal font-normal text-text-3">(puedes dejarlo para luego)</span>
            </label>
            <input type="datetime-local" value={cuando} onChange={e => setCuando(e.target.value)}
              className="input bg-surface-2 rounded-2xl py-3 text-base" />
            <p className="text-[11px] text-text-3 mt-1">
              {cuando
                ? 'Se crea también como sub-evento, así que aparece en el Espacio del evento y en la agenda pública.'
                : 'Sin hora, el torneo existe en el panel pero el público no lo ve en la agenda.'}
            </p>
          </div>
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
                    {'  '.repeat(c.profundidad)}{c.profundidad > 0 ? '› ' : ''}{c.nombre}
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
              <button type="button" onClick={() => setFormato('puntaje_jurado')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${formato === 'puntaje_jurado' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
                <p className="text-sm font-semibold text-text-1">Puntaje por jurado</p>
                <p className="text-xs text-text-3 mt-1 leading-relaxed">Nadie se enfrenta a nadie: todos se presentan y un jurado califica con puntos. Ideal para un show de talento, una feria o un concurso.</p>
              </button>
            </div>
          </div>

          {formato === 'puntaje_jurado' && (
            <CalificacionConfig
              modoCalificacion={modoCalificacion} setModoCalificacion={setModoCalificacion}
              puntajeUnicoMax={puntajeUnicoMax} setPuntajeUnicoMax={setPuntajeUnicoMax}
              criterios={criterios} setCriterios={setCriterios}
              modoRondas={modoRondas} setModoRondas={setModoRondas}
              rondas={rondas} setRondas={setRondas}
            />
          )}

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

/* La configuración propia de "Puntaje por jurado": cómo se califica (una
   nota o varias que suman) y si hay una sola presentación o varias rondas
   eliminatorias. Aparte de CrearTorneo porque son ocho campos que sólo
   existen para este formato — meterlos ahí habría duplicado el patrón
   "if (formato === 'grupos_eliminacion')" con el doble de líneas. */
function CalificacionConfig({
  modoCalificacion, setModoCalificacion, puntajeUnicoMax, setPuntajeUnicoMax,
  criterios, setCriterios, modoRondas, setModoRondas, rondas, setRondas,
}) {
  const setCriterio = (i, campo, valor) => setCriterios(cs => cs.map((c, idx) => idx === i ? { ...c, [campo]: valor } : c));
  const agregarCriterio = () => setCriterios(cs => [...cs, { nombre: '', puntaje_maximo: 10 }]);
  const quitarCriterio = (i) => setCriterios(cs => cs.length > 1 ? cs.filter((_, idx) => idx !== i) : cs);

  const setRonda = (i, campo, valor) => setRondas(rs => rs.map((r, idx) => idx === i ? { ...r, [campo]: valor } : r));
  const agregarRonda = () => setRondas(rs => [...rs, { nombre: '' }]);
  const quitarRonda = (i) => setRondas(rs => rs.length > 2 ? rs.filter((_, idx) => idx !== i) : rs);

  return (
    <div className="space-y-4 rounded-2xl bg-surface-2/40 border border-border p-4">
      <div>
        <label className="label text-xs mb-2">¿Cómo se califica?</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setModoCalificacion('rubrica')}
            className={`px-3 py-2.5 rounded-xl border text-left transition-all ${modoCalificacion === 'rubrica' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
            <p className="text-xs font-semibold text-text-1">Rúbrica</p>
            <p className="text-[11px] text-text-3 mt-0.5">Varios criterios que suman.</p>
          </button>
          <button type="button" onClick={() => setModoCalificacion('puntaje_unico')}
            className={`px-3 py-2.5 rounded-xl border text-left transition-all ${modoCalificacion === 'puntaje_unico' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
            <p className="text-xs font-semibold text-text-1">Puntaje único</p>
            <p className="text-[11px] text-text-3 mt-0.5">Un solo número.</p>
          </button>
        </div>
      </div>

      {modoCalificacion === 'puntaje_unico' ? (
        <div className="field">
          <label className="label text-xs">Puntaje máximo</label>
          <input type="number" min="1" value={puntajeUnicoMax} onChange={e => setPuntajeUnicoMax(e.target.value)}
            className="input rounded-xl py-2.5 max-w-[10rem]" required />
        </div>
      ) : (
        <div className="space-y-2">
          <label className="label text-xs">Criterios de la rúbrica</label>
          {criterios.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={c.nombre} onChange={e => setCriterio(i, 'nombre', e.target.value)}
                placeholder="Ej. Técnica, Creatividad, Presentación"
                className="input rounded-xl py-2 flex-1" required />
              <input type="number" min="1" value={c.puntaje_maximo} onChange={e => setCriterio(i, 'puntaje_maximo', e.target.value)}
                className="input rounded-xl py-2 w-20" title="Puntaje máximo" required />
              {criterios.length > 1 && (
                <button type="button" onClick={() => quitarCriterio(i)} aria-label="Quitar criterio"
                  className="w-8 h-8 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={agregarCriterio} className="text-xs text-text-3 hover:text-text-1">+ Agregar criterio</button>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <label className="label text-xs mb-2">¿Rondas?</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setModoRondas('una_ronda')}
            className={`px-3 py-2.5 rounded-xl border text-left transition-all ${modoRondas === 'una_ronda' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
            <p className="text-xs font-semibold text-text-1">Una sola ronda</p>
            <p className="text-[11px] text-text-3 mt-0.5">Todos se presentan una vez.</p>
          </button>
          <button type="button" onClick={() => setModoRondas('eliminatoria')}
            className={`px-3 py-2.5 rounded-xl border text-left transition-all ${modoRondas === 'eliminatoria' ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border-2'}`}>
            <p className="text-xs font-semibold text-text-1">Eliminatoria</p>
            <p className="text-[11px] text-text-3 mt-0.5">Varias rondas: los mejores avanzan.</p>
          </button>
        </div>
      </div>

      {modoRondas === 'eliminatoria' && (
        <div className="space-y-2">
          {rondas.map((r, i) => {
            const esUltima = i === rondas.length - 1;
            return (
              <div key={i} className="flex items-center gap-2">
                <input value={r.nombre} onChange={e => setRonda(i, 'nombre', e.target.value)}
                  placeholder={esUltima ? 'Ej. Final' : 'Ej. Semifinal'}
                  className="input rounded-xl py-2 flex-1" required />
                {!esUltima && (
                  <input type="number" min="1" value={r.avanzan ?? ''} onChange={e => setRonda(i, 'avanzan', e.target.value)}
                    title="Cuántos avanzan a la siguiente ronda" placeholder="Avanzan"
                    className="input rounded-xl py-2 w-24" required />
                )}
                {rondas.length > 2 && (
                  <button type="button" onClick={() => quitarRonda(i)} aria-label="Quitar ronda"
                    className="w-8 h-8 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            );
          })}
          <button type="button" onClick={agregarRonda} className="text-xs text-text-3 hover:text-text-1">+ Agregar ronda</button>
          <p className="text-[11px] text-text-3 leading-relaxed">
            La última ronda ("{rondas[rondas.length - 1]?.nombre || 'Final'}") no necesita cuántos avanzan: ahí termina el torneo.
          </p>
        </div>
      )}
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
