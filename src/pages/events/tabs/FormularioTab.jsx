import { useEffect, useState, useMemo } from 'react';
import { eventosApi } from '../../../api/eventos.js';
import { ticketsApi } from '../../../api/tickets.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import Icono from '../../../components/ui/Icono.jsx';

/* Tab Formulario — qué se le pregunta a cada persona al inscribirse.

   El catálogo de tipos, los grupos y las fichas prearmadas los manda el
   backend (lib/formularioCampos.js), que es el mismo módulo que valida las
   respuestas. No se repite aquí: es la lección de los correos, donde el panel
   mantenía su propia lista de tipos y se diseñaban plantillas que el servidor
   no conocía.

   El guardado hace un diff por `id`: los campos que ya existen se actualizan
   en su sitio, así las respuestas ya diligenciadas nunca quedan huérfanas. */

function nuevoCampo(preset = {}) {
  return {
    _key: preset.id || Math.random().toString(36).slice(2),
    id: preset.id || null,
    tipo: preset.tipo || 'texto',
    etiqueta: preset.etiqueta || '',
    opciones: preset.opciones || [],
    requerido: preset.requerido ?? false,
    grupo: preset.grupo || '',
    ayuda: preset.ayuda || '',
    ticket_type_id: preset.ticket_type_id || '',   // '' = todas las boletas
  };
}

export default function FormularioTab({ evento }) {
  const [campos, setCampos] = useState([]);
  const [tiposBoleta, setTiposBoleta] = useState([]);
  const [catalogo, setCatalogo] = useState({ tipos: [], grupos: [], fichas: [], max_campos: 60 });
  const [agrupacionLista, setAgrupacionLista] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { success, error: toastErr } = useToast();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      eventosApi.getFormulario(evento.id),
      ticketsApi.list(evento.id).catch(() => ({ tickets: [] })),
    ])
      .then(([d, tt]) => {
        setCampos((d.campos || []).map(c => nuevoCampo({ ...c, opciones: c.opciones || [] })));
        setCatalogo({
          tipos: d.tipos || [],
          grupos: d.grupos || [],
          fichas: d.fichas || [],
          max_campos: d.max_campos || 60,
        });
        setAgrupacionLista(d.agrupacion_lista !== false);
        setTiposBoleta((tt.tickets || []).filter(t => (t.descripcion || '') !== 'GESTEK_INVITACION'));
      })
      .catch(e => toastErr(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
    /* eslint-disable-next-line */
  }, [evento.id]);

  const conOpciones = useMemo(
    () => new Set(catalogo.tipos.filter(t => t.conOpciones).map(t => t.id)),
    [catalogo.tipos],
  );

  const agregar = (preset) => setCampos(l => [...l, nuevoCampo(preset)]);
  const quitar = (key) => setCampos(l => l.filter(c => c._key !== key));
  const actualizar = (key, patch) => setCampos(l => l.map(c => c._key === key ? { ...c, ...patch } : c));
  const mover = (key, dir) => setCampos(l => {
    const i = l.findIndex(c => c._key === key);
    const j = i + dir;
    if (j < 0 || j >= l.length) return l;
    const copia = [...l];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    return copia;
  });

  /* Una ficha entra completa, saltándose lo que ya esté por etiqueta: agregarla
     dos veces no debe duplicar 22 preguntas. */
  const agregarFicha = (ficha) => {
    const existentes = new Set(campos.map(c => c.etiqueta.trim().toLowerCase()));
    const nuevos = ficha.campos.filter(c => !existentes.has(c.etiqueta.trim().toLowerCase()));
    if (nuevos.length === 0) { toastErr('Esa ficha ya está agregada completa.'); return; }
    if (campos.length + nuevos.length > catalogo.max_campos) {
      toastErr(`No cabe: el formulario admite ${catalogo.max_campos} campos y ya tienes ${campos.length}.`);
      return;
    }
    setCampos(l => [...l, ...nuevos.map(nuevoCampo)]);
    success(`${nuevos.length} campo${nuevos.length !== 1 ? 's' : ''} agregado${nuevos.length !== 1 ? 's' : ''}. Revisa y guarda.`);
  };

  const quitarGrupo = async (grupo) => {
    const cuantos = campos.filter(c => (c.grupo || '') === grupo).length;
    if (!(await confirmDialog({
      title: `Quitar «${grupo || 'Sin grupo'}»`,
      message: `Se quitan ${cuantos} campo${cuantos !== 1 ? 's' : ''} del formulario. Las respuestas ya guardadas de esos campos se borran al guardar.`,
      confirmLabel: 'Quitar', danger: true,
    }))) return;
    setCampos(l => l.filter(c => (c.grupo || '') !== grupo));
  };

  const guardar = async () => {
    for (const c of campos) {
      if (!c.etiqueta.trim()) { toastErr('Todos los campos necesitan un nombre.'); return; }
      if (conOpciones.has(c.tipo) && c.opciones.length === 0) {
        toastErr(`El campo "${c.etiqueta}" necesita al menos una opción.`); return;
      }
    }
    setSaving(true);
    try {
      const payload = campos.map(c => ({
        id: c.id, tipo: c.tipo, etiqueta: c.etiqueta, opciones: c.opciones,
        requerido: c.requerido, grupo: c.grupo || null, ayuda: c.ayuda || null,
        ticket_type_id: c.ticket_type_id || null,
      }));
      const r = await eventosApi.guardarFormulario(evento.id, payload);
      setCampos((r.campos || []).map(c => nuevoCampo({ ...c, opciones: c.opciones || [] })));
      success('Formulario guardado. Ya se aplica al inscribirse.');
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <GLoader message="Cargando formulario..." />;

  /* Los campos se pintan en el orden en que están, pero con un separador cuando
     cambia el grupo: una ficha de 22 preguntas sin cortes es un muro. */
  const bloques = [];
  for (const c of campos) {
    const g = c.grupo || '';
    if (!bloques.length || bloques[bloques.length - 1].grupo !== g) bloques.push({ grupo: g, campos: [] });
    bloques[bloques.length - 1].campos.push(c);
  }

  const obligatorios = campos.filter(c => c.requerido).length;
  const porBoleta = campos.filter(c => c.ticket_type_id).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-2xl">
          <h2 className="text-xl font-bold font-display text-text-1 tracking-tight mb-1">Formulario de inscripción</h2>
          <p className="text-sm text-text-3 leading-relaxed">
            Qué le pides a cada persona al inscribirse, además del nombre y el correo de la boleta.
            {tiposBoleta.length > 1
              ? ' Cada pregunta puede aplicar a todas las boletas o solo a un tipo: a un stand no se le piden los mismos datos que a un asistente.'
              : ' Se aplica a todas las boletas de este evento.'}
          </p>
        </div>
        <div className="flex items-center gap-5 text-right">
          <Dato v={`${campos.length}/${catalogo.max_campos}`} l="preguntas" />
          <Dato v={obligatorios} l="obligatorias" />
          {porBoleta > 0 && <Dato v={porBoleta} l="por tipo de boleta" />}
        </div>
      </div>

      {!agrupacionLista && (
        <div className="rounded-2xl bg-warning/10 border border-warning/25 px-4 py-3">
          <p className="text-sm text-text-1 font-medium">Falta aplicar la migración 0055</p>
          <p className="text-xs text-text-2 mt-0.5 leading-relaxed">
            El formulario funciona, pero los grupos y los textos de ayuda no se guardan todavía.
            Aplica <code className="font-mono text-[11px]">db/migrations/0055_formulario_grupos_y_sesion_inscripciones.sql</code>.
          </p>
        </div>
      )}

      {/* Fichas prearmadas */}
      {catalogo.fichas.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface/40 p-4">
          <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-1">Fichas listas</p>
          <p className="text-xs text-text-3 mb-3 leading-relaxed">
            Baterías de preguntas ya armadas. Se agregan completas y luego puedes quitar lo que no necesites.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {catalogo.fichas.map(f => (
              <button key={f.id} onClick={() => agregarFicha(f)}
                className="text-left rounded-xl border border-border hover:border-border-2 bg-surface/60 hover:bg-surface-2 p-3 transition-colors">
                <p className="text-sm font-medium text-text-1 flex items-center gap-1.5">
                  <Icono name="documento" className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                  {f.nombre}
                  <span className="text-[10px] font-mono text-text-3 ml-auto">{f.campos.length}</span>
                </p>
                <p className="text-[11px] text-text-3 mt-1 leading-snug">{f.descripcion}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {campos.length === 0 && (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-12 text-center">
          <p className="text-sm text-text-2">Todavía no pides ninguna información extra.</p>
          <p className="text-xs text-text-3 mt-1">Agrega una ficha de arriba o una pregunta en blanco.</p>
        </div>
      )}

      {/* Los campos, en rejilla a lo ancho */}
      <div className="space-y-5">
        {bloques.map((b, bi) => (
          <section key={`${b.grupo}-${bi}`} className="space-y-3">
            {b.grupo && (
              <div className="flex items-center gap-3">
                <h3 className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{b.grupo}</h3>
                <span className="text-[10px] font-mono text-text-3">{b.campos.length}</span>
                <div className="flex-1 h-px bg-border" />
                <button onClick={() => quitarGrupo(b.grupo)}
                  className="text-[11px] text-text-3 hover:text-danger transition-colors">Quitar el bloque</button>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-3 items-start">
              {b.campos.map(c => {
                const i = campos.findIndex(x => x._key === c._key);
                return (
                  <CampoEditor
                    key={c._key}
                    c={c}
                    primero={i === 0}
                    ultimo={i === campos.length - 1}
                    tipos={catalogo.tipos}
                    grupos={catalogo.grupos}
                    conOpciones={conOpciones}
                    tiposBoleta={tiposBoleta}
                    agrupacionLista={agrupacionLista}
                    onChange={patch => actualizar(c._key, patch)}
                    onQuitar={() => quitar(c._key)}
                    onMover={dir => mover(c._key, dir)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border">
        <button onClick={() => agregar()} disabled={campos.length >= catalogo.max_campos}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border-2 text-sm
                     text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors disabled:opacity-50">
          + Agregar pregunta en blanco
        </button>
        <button onClick={guardar} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-text-1 text-bg hover:bg-white
                     text-sm font-semibold disabled:opacity-60 transition-all">
          {saving ? <><Spinner size="sm" /> Guardando...</> : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

function Dato({ v, l }) {
  return (
    <div>
      <p className="text-lg font-bold font-display text-text-1 tabular-nums leading-none">{v}</p>
      <p className="text-[10px] text-text-3 mt-0.5">{l}</p>
    </div>
  );
}

function CampoEditor({ c, primero, ultimo, tipos, grupos, conOpciones, tiposBoleta, agrupacionLista, onChange, onQuitar, onMover }) {
  const necesitaOpciones = conOpciones.has(c.tipo);

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2 min-w-0">
          <input value={c.etiqueta} onChange={e => onChange({ etiqueta: e.target.value })}
            className="input rounded-xl py-2.5 text-sm" placeholder="La pregunta. Ej. Número de documento" />
          <div className="grid grid-cols-2 gap-2">
            <select value={c.tipo} onChange={e => onChange({ tipo: e.target.value })}
              className="input bg-surface-2 rounded-xl py-2.5 text-sm">
              {tipos.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            {agrupacionLista && (
              <select value={c.grupo || ''} onChange={e => onChange({ grupo: e.target.value })}
                className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                <option value="">Sin bloque</option>
                {grupos.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <button onClick={() => onMover(-1)} disabled={primero} aria-label="Subir"
            className="w-7 h-7 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center disabled:opacity-30 text-xs">↑</button>
          <button onClick={() => onMover(1)} disabled={ultimo} aria-label="Bajar"
            className="w-7 h-7 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center disabled:opacity-30 text-xs">↓</button>
          <button onClick={onQuitar} aria-label="Quitar"
            className="w-7 h-7 rounded-lg text-danger-light hover:bg-danger/10 flex items-center justify-center">
            <Icono name="cerrar" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {necesitaOpciones && (
        <div className="field">
          <label className="label text-xs">Opciones (una por coma)</label>
          <textarea rows={2}
            value={c.opciones.join(', ')}
            onChange={e => onChange({ opciones: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            className="input !h-auto resize-y rounded-xl py-2.5 text-sm"
            placeholder="Hombre, Mujer, Hombre trans, Mujer trans, LGTBIQ+, Otro" />
          {c.tipo === 'multiple' && (
            <p className="text-[11px] text-text-3 mt-1">Se pueden marcar varias a la vez.</p>
          )}
        </div>
      )}

      {agrupacionLista && (
        <input value={c.ayuda || ''} onChange={e => onChange({ ayuda: e.target.value })}
          className="input rounded-xl py-2 text-xs" placeholder="Texto de ayuda bajo la pregunta (opcional)" />
      )}

      {tiposBoleta.length > 1 && (
        <select value={c.ticket_type_id || ''} onChange={e => onChange({ ticket_type_id: e.target.value })}
          className="input bg-surface-2 rounded-xl py-2 text-xs">
          <option value="">Se pide en todas las boletas</option>
          {tiposBoleta.map(t => <option key={t.id} value={t.id}>Solo en «{t.nombre}»</option>)}
        </select>
      )}

      {c.tipo === 'foto' && (
        <p className="text-[11px] text-text-3 bg-surface-2/60 rounded-xl px-3 py-2 leading-relaxed">
          <Icono name="camara" className="w-3.5 h-3.5 inline-block align-[-2px] mr-1" />
          Sube una imagen (JPG, PNG o WEBP, máx. 4 MB). Queda junto a su respuesta y se puede ver desde el detalle del asistente.
        </p>
      )}

      <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer w-fit">
        <input type="checkbox" checked={c.requerido} onChange={e => onChange({ requerido: e.target.checked })}
          className="w-4 h-4 rounded accent-primary" />
        Obligatoria
      </label>
    </div>
  );
}
