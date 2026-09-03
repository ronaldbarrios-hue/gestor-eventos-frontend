import { useEffect, useState } from 'react';
import { torneosApi } from '../../../../api/torneos.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../../components/ui/Confirm.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';
import GLoader from '../../../../components/ui/GLoader.jsx';
import CampoFormulario, { primerFallo } from '../../../../components/ui/CampoFormulario.jsx';
import { camposVisibles } from '../../../../lib/camposCondicionales.js';
import PreguntasSubEvento from '../PreguntasSubEvento.jsx';

/* Los equipos del torneo: la lista, el alta de uno a uno y la importación en
   bloque. FotoEquipoLazy carga el subidor sólo cuando hace falta, que es lo
   que evita arrastrar el componente de imagen en el paquete principal. */

export default function EquiposView({ evento, torneo, equipos, soyOwner, onReload }) {
  const [formOpen, setFormOpen] = useState(false);
  const [importarOpen, setImportarOpen] = useState(false);
  const [camposOpen, setCamposOpen] = useState(false);
  /* Los campos propios del torneo (0095). Se cargan aquí y no dentro del modal
     de alta para poder decir cuántos hay antes de abrirlo. */
  const [campos, setCampos] = useState([]);
  const [sinMigracion, setSinMigracion] = useState(false);

  const cargarCampos = () => torneosApi.formulario(evento.id, torneo.id)
    .then(d => { setCampos(d.campos || []); setSinMigracion(false); })
    .catch(e => { if (e.response?.status === 503) setSinMigracion(true); });

  useEffect(() => { cargarCampos(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [evento.id, torneo.id]);
  const { success, error: toastErr } = useToast();

  const puedeEditar = soyOwner && torneo.estado === 'armando';
  const minRequerido = torneo.formato === 'grupos_eliminacion' ? (torneo.num_grupos || 2) * 2 : 2;

  const borrarEquipo = async (eq) => {
    if (!(await confirmDialog({ message: `¿Quitar a "${eq.nombre}" del torneo?`, danger: true }))) return;
    try {
      await torneosApi.borrarEquipo(evento.id, torneo.id, eq.id);
      success('Equipo eliminado.');
      onReload();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  const generar = async () => {
    if (equipos.length < minRequerido) { toastErr(`Se necesitan al menos ${minRequerido} equipos.`); return; }
    if (!(await confirmDialog({ message: '¿Generar el fixture? Después de esto no podrás agregar ni quitar equipos.' }))) return;
    try {
      await torneosApi.generarFixture(evento.id, torneo.id);
      success('¡Fixture generado!');
      onReload();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  return (
    <div className="space-y-4">
      {puedeEditar && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFormOpen(true)} className="btn-gradient btn-sm">+ Agregar equipo</button>
            <button onClick={() => setImportarOpen(true)} className="btn-secondary btn-sm">
              Importar desde boletas
            </button>
            {/* Qué se le pide a un equipo además del nombre. Un torneo de fútbol
                pide dorsal y posición; uno de esports, nick, rango y servidor.
                Meter esas columnas en la tabla arreglaría uno y dejaría fuera al
                otro, así que las declara el organizador. */}
            {!sinMigracion && (
              <button onClick={() => setCamposOpen(true)} className="btn-ghost btn-sm">
                Datos que pide {campos.length > 0 ? `(${campos.length})` : ''}
              </button>
            )}
          </div>
          {equipos.length >= minRequerido && (
            <button onClick={generar} className="btn-primary btn-sm">
              Generar fixture ({equipos.length} equipos)
            </button>
          )}
        </div>
      )}

      {equipos.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-3">Aún no hay equipos registrados.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {equipos.map(eq => (
            <div key={eq.id} className="rounded-2xl border border-border bg-surface/40 p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold flex-shrink-0">
                {eq.foto_url ? <img src={eq.foto_url} alt="" className="w-full h-full object-cover" /> : eq.nombre?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-1 truncate">{eq.nombre}</p>
                {eq.grupo && <p className="text-[11px] text-text-3">Grupo {eq.grupo}</p>}
                {/* Lo que el torneo pide se enseña aquí. Un dato que se pide, se
                    guarda y no se ve en ninguna pantalla es un dato que nadie
                    vuelve a mirar —y entonces no hacía falta pedirlo. */}
                {campos.map(c => {
                  const v = eq.respuestas?.[c.id];
                  if (v === undefined || v === null || v === '') return null;
                  return (
                    <p key={c.id} className="text-[11px] text-text-3 truncate">
                      {c.etiqueta}: <span className="text-text-2">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                    </p>
                  );
                })}
              </div>
              {puedeEditar && (
                <button onClick={() => borrarEquipo(eq)} aria-label="Quitar"
                  className="w-8 h-8 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <NuevoEquipoModal
          campos={campos}
          evento={evento} torneo={torneo}
          onClose={() => setFormOpen(false)}
          onDone={() => { setFormOpen(false); onReload(); }}
        />
      )}

      {camposOpen && (
        <PreguntasSubEvento
          evento={evento}
          fuente={{
            clave: `torneo:${torneo.id}`,
            titulo: `Datos que pide «${torneo.nombre}»`,
            ayuda: 'Lo que hay que saber de cada equipo además del nombre. Cambia con la disciplina.',
            vacio: 'Sólo se pide el nombre del equipo.',
            vacioAyuda: 'Añade lo que necesites: dorsal y posición, o nick, rango y servidor.',
            cargar : () => torneosApi.formulario(evento.id, torneo.id),
            guardar: (cs) => torneosApi.guardarFormulario(evento.id, torneo.id, cs),
            textoGuardado: (n) => (n
              ? `Guardado. Cada equipo de «${torneo.nombre}» tendrá que dar ${n} dato${n !== 1 ? 's' : ''} más.`
              : 'Guardado. A los equipos sólo se les pide el nombre.'),
          }}
          onClose={() => setCamposOpen(false)}
          onGuardado={(d) => setCampos(d?.campos || [])}
        />
      )}

      {importarOpen && (
        <ImportarEquiposModal
          evento={evento} torneo={torneo}
          onClose={() => setImportarOpen(false)}
          onDone={() => { setImportarOpen(false); onReload(); }}
        />
      )}
    </div>
  );
}

function NuevoEquipoModal({ evento, torneo, campos = [], onClose, onDone }) {
  const [nombre, setNombre] = useState('');
  const [foto, setFoto] = useState('');
  const [contactoEmail, setContactoEmail] = useState('');
  const [respuestas, setRespuestas] = useState({});
  const [working, setWorking] = useState(false);
  const { error: toastErr } = useToast();

  /* Los campos condicionales se resuelven con lo ya contestado, igual que en el
     registro público: un «servidor» que sólo aparece si la modalidad es online
     no puede exigirse cuando no está en pantalla. */
  const visibles = camposVisibles(campos, respuestas);

  const submit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { toastErr('El nombre es requerido.'); return; }
    /* Se comprueba aquí además de en el servidor: el servidor contesta el
       primer fallo y esto evita el viaje. */
    const fallo = primerFallo(visibles, respuestas);
    if (fallo) { toastErr(fallo); return; }
    setWorking(true);
    try {
      await torneosApi.crearEquipo(evento.id, torneo.id, {
        nombre: nombre.trim(), foto_url: foto || null, contacto_email: contactoEmail.trim() || null,
        respuestas,
      });
      onDone();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl max-h-[88vh] overflow-y-auto animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-surface px-6 py-5 border-b border-border flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold font-display tracking-tight text-text-1">Nuevo equipo</h2>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="field">
            <label className="label">Nombre del equipo</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} className="input rounded-2xl py-3" placeholder="Ej. Los Tigres" required autoFocus />
          </div>
          <div className="field">
            <label className="label">Foto / logo <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
            <FotoEquipoLazy value={foto} onChange={setFoto} eventoId={evento.id} torneoId={torneo.id} />
          </div>
          <div className="field">
            <label className="label">Email de contacto (capitán) <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
            <input type="email" value={contactoEmail} onChange={e => setContactoEmail(e.target.value)}
              className="input rounded-2xl py-3" placeholder="capitan@correo.com" />
            <p className="text-xs text-text-3 mt-1.5">Se usa para avisarle automáticamente cuándo juega el equipo.</p>
          </div>
          {visibles.map(c => (
            <CampoFormulario key={c.id} campo={c} value={respuestas[c.id]}
              onChange={v => setRespuestas(r => ({ ...r, [c.id]: v }))}
              eventoId={evento.id} />
          ))}

          <p className="text-xs text-text-3 -mt-1">
            Tip: usa "Importar desde boletas" para traer equipos, foto y contacto automáticamente.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl text-sm font-medium text-text-1 border border-border-2 hover:bg-surface-2">Cancelar</button>
            <button type="submit" disabled={working} className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
              {working ? <><Spinner size="sm" /> Creando...</> : 'Crear equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────── Importar equipos desde boletas ─────────── */
function ImportarEquiposModal({ evento, torneo, onClose, onDone }) {
  const [campos, setCampos] = useState(null);
  const [campoNombre, setCampoNombre] = useState('');
  const [campoFoto, setCampoFoto] = useState('');
  const [working, setWorking] = useState(false);
  const [resultado, setResultado] = useState(null);
  const { error: toastErr } = useToast();

  useEffect(() => {
    torneosApi.camposDisponibles(evento.id, torneo.id)
      .then(d => setCampos(d.campos || []))
      .catch(e => toastErr(e.response?.data?.error || e.message));
    /* eslint-disable-next-line */
  }, []);

  const camposTexto = (campos || []).filter(c => c.tipo === 'texto');
  const camposFoto  = (campos || []).filter(c => c.tipo === 'foto');

  const submit = async (e) => {
    e.preventDefault();
    if (!campoNombre) { toastErr('Selecciona qué campo usar como nombre del equipo.'); return; }
    setWorking(true);
    try {
      const r = await torneosApi.importarEquipos(evento.id, torneo.id, {
        campo_nombre_id: campoNombre,
        campo_foto_id: campoFoto || null,
      });
      setResultado(r);
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl max-h-[88vh] overflow-y-auto animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-surface px-6 py-5 border-b border-border flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold font-display tracking-tight text-text-1">Importar desde boletas</h2>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6">
          {campos === null ? (
            <GLoader message="Buscando campos del formulario..." />
          ) : resultado ? (
            <div className="text-center py-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-success/15 border border-success/30 mb-4">
                <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-lg font-bold font-display text-text-1 mb-1">{resultado.importados} equipos importados</p>
              <p className="text-sm text-text-2 mb-6 leading-relaxed">
                Se revisaron {resultado.total_boletas_revisadas} boletas.
                {resultado.omitidos > 0 && ` ${resultado.omitidos} se omitieron (sin ese campo respondido, o nombre repetido).`}
              </p>
              <button onClick={onDone} className="px-6 py-3 rounded-full bg-text-1 text-bg hover:bg-white text-sm font-semibold transition-all">
                Listo
              </button>
            </div>
          ) : camposTexto.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-text-2 leading-relaxed mb-4">
                Tu formulario de compra no tiene ningún campo de tipo "Texto" que pueda usarse como nombre de equipo.
              </p>
              <p className="text-xs text-text-3 leading-relaxed">
                Ve a la pestaña <strong className="text-text-1">Formulario</strong>, agrega un campo tipo texto (ej. "Nombre del equipo") y opcionalmente uno tipo foto, guarda, y vuelve a intentar aquí.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-text-2 leading-relaxed">
                Elige qué campos de tu formulario de compra corresponden al nombre y la foto del equipo. Se creará un equipo por cada boleta que tenga esos datos, con el email del comprador como contacto del equipo.
              </p>
              <div className="field">
                <label className="label">Campo para el nombre del equipo</label>
                <select value={campoNombre} onChange={e => setCampoNombre(e.target.value)} className="input bg-surface-2 rounded-2xl py-3" required>
                  <option value="">— Selecciona —</option>
                  {camposTexto.map(c => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Campo para la foto <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
                <select value={campoFoto} onChange={e => setCampoFoto(e.target.value)} className="input bg-surface-2 rounded-2xl py-3">
                  <option value="">— Sin foto —</option>
                  {camposFoto.map(c => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
                </select>
              </div>
              <button type="submit" disabled={working}
                className="w-full py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
                {working ? <><Spinner size="sm" /> Importando...</> : 'Importar equipos'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function FotoEquipoLazy({ value, onChange, eventoId, torneoId }) {
  const [Comp, setComp] = useState(null);
  useEffect(() => {
    import('../../../../components/ui/FormPhotoUploader.jsx').then(m => setComp(() => m.default));
  }, []);
  if (!Comp) return <div className="h-40 rounded-2xl bg-surface-2/40 animate-pulse" />;
  return <Comp value={value} onChange={onChange} eventoId={eventoId} campoId={`torneo-${torneoId}`} />;
}

/* ─────────── Vista Bracket (eliminación) ─────────── */
