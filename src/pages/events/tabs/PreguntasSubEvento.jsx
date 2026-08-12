import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { agendaApi } from '../../../api/agenda.js';
import { useToast } from '../../../context/ToastContext.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';

/* ──────────────────────────────────────────────────────────────────
   Las preguntas propias de un sub-evento.

   El modo 'propio' existía desde la migración 0059 y se podía elegir, pero no
   había pantalla para ESCRIBIR las preguntas: el sub-evento se quedaba con
   cero y se comportaba igual que 'ninguno'. El selector lo advertía en vez de
   prometerlo. Esta es la pantalla que faltaba.

   Deliberadamente corto: sin grupos, sin ayuda por campo, sin "solo para el
   tipo VIP". Esas cosas son del formulario de compra del evento, que ya tiene
   su editor grande. Aquí son tres o cuatro preguntas sobre la actividad —
   talla de camiseta, si trae equipo, nivel— y el tope está en doce a
   propósito: quien necesite treinta quiere el formulario del evento, y para
   eso está el modo 'evento'.
   ────────────────────────────────────────────────────────────────── */

/* Sólo los tipos que tienen sentido en una pregunta corta. El catálogo
   completo viaja en la respuesta del servidor, pero ofrecerlo entero aquí
   invita a montar la ficha de caracterización en el sitio equivocado. */
const TIPOS = [
  { id: 'texto',    label: 'Texto corto' },
  { id: 'textarea', label: 'Texto largo' },
  { id: 'numero',   label: 'Número' },
  { id: 'select',   label: 'Elegir una' },
  { id: 'multiple', label: 'Elegir varias' },
  { id: 'checkbox', label: 'Sí / no' },
  { id: 'email',    label: 'Correo' },
  { id: 'telefono', label: 'Teléfono' },
  { id: 'fecha',    label: 'Fecha' },
];
const CON_OPCIONES = new Set(['select', 'multiple']);

let contador = 0;
const claveLocal = () => `nueva_${++contador}`;

export default function PreguntasSubEvento({ evento, sesion, onClose, onGuardado }) {
  const { success, error: toastErr } = useToast();
  const [campos, setCampos] = useState(null);   // null = cargando
  const [max, setMax] = useState(12);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let vivo = true;
    agendaApi.formularioSesion(evento.id, sesion.id)
      .then(d => {
        if (!vivo) return;
        setCampos((d.campos || []).map(c => ({ ...c, _k: c.id })));
        if (d.max_campos) setMax(d.max_campos);
      })
      .catch(e => { if (vivo) { toastErr(e.response?.data?.error || e.message); setCampos([]); } });
    return () => { vivo = false; };
  }, [evento.id, sesion.id, toastErr]);

  const set = (k, patch) => setCampos(cs => cs.map(c => (c._k === k ? { ...c, ...patch } : c)));
  const quitar = (k) => setCampos(cs => cs.filter(c => c._k !== k));
  const mover = (k, delta) => setCampos(cs => {
    const i = cs.findIndex(c => c._k === k);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= cs.length) return cs;
    const copia = [...cs];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    return copia;
  });
  const agregar = () => setCampos(cs => [
    ...cs,
    { _k: claveLocal(), tipo: 'texto', etiqueta: '', requerido: false, opciones: null },
  ]);

  const guardar = async () => {
    for (const c of campos) {
      if (!c.etiqueta?.trim()) { toastErr('Hay una pregunta sin enunciado.'); return; }
      if (CON_OPCIONES.has(c.tipo) && !(c.opciones || []).filter(Boolean).length) {
        toastErr(`"${c.etiqueta}" necesita al menos una opción.`); return;
      }
    }
    setSaving(true);
    try {
      const payload = campos.map(c => ({
        /* Las que ya existían viajan con su id: el servidor las actualiza en
           su sitio y las respuestas ya guardadas siguen apuntando a ellas. */
        ...(String(c._k).startsWith('nueva_') ? {} : { id: c.id }),
        tipo: c.tipo,
        etiqueta: c.etiqueta.trim(),
        requerido: Boolean(c.requerido),
        opciones: CON_OPCIONES.has(c.tipo) ? (c.opciones || []).filter(Boolean) : null,
      }));
      const d = await agendaApi.guardarFormularioSesion(evento.id, sesion.id, payload);
      success(payload.length
        ? `Guardado. Quien se apunte a «${sesion.titulo}» verá estas ${payload.length} preguntas.`
        : 'Sin preguntas: apuntarse a este sub-evento vuelve a ser un solo botón.');
      onGuardado?.(d);
      onClose();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text-1">Preguntas de «{sesion.titulo}»</h3>
            <p className="text-xs text-text-3 mt-0.5">
              Sólo para apuntarse a esta actividad. Cortas: la boleta ya sabe quién es.
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-text-3 hover:text-text-1 flex-shrink-0">✕</button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {campos === null ? (
            <p className="text-sm text-text-3 text-center py-8">Cargando…</p>
          ) : campos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
              <p className="text-sm text-text-2">
                Sin preguntas, apuntarse es un solo botón — que suele ser lo correcto.
              </p>
              <p className="text-xs text-text-3 mt-1.5">
                Añade alguna sólo si necesitas algo que la boleta no sabe.
              </p>
            </div>
          ) : campos.map((c, i) => (
            <Pregunta
              key={c._k}
              campo={c}
              primera={i === 0}
              ultima={i === campos.length - 1}
              onChange={patch => set(c._k, patch)}
              onQuitar={() => quitar(c._k)}
              onSubir={() => mover(c._k, -1)}
              onBajar={() => mover(c._k, +1)}
            />
          ))}

          {campos !== null && (
            <button
              onClick={agregar}
              disabled={campos.length >= max}
              className="w-full py-2.5 rounded-2xl border border-dashed border-border text-sm text-text-2 hover:text-text-1 hover:border-accent/50 transition-colors disabled:opacity-40">
              {campos.length >= max ? `Máximo ${max} preguntas` : '+ Añadir pregunta'}
            </button>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <p className="text-[11px] text-text-3">
            {campos?.length || 0} de {max}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-ghost btn-sm">Cancelar</button>
            <button onClick={guardar} disabled={saving || campos === null} className="btn-primary btn-sm">
              {saving ? <><Spinner size="sm" /> Guardando…</> : 'Guardar preguntas'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Pregunta({ campo, primera, ultima, onChange, onQuitar, onSubir, onBajar }) {
  const conOpciones = CON_OPCIONES.has(campo.tipo);
  const opciones = campo.opciones || [];

  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 p-3.5 space-y-2.5">
      <div className="flex items-start gap-2">
        <div className="flex flex-col flex-shrink-0 pt-1.5">
          <button onClick={onSubir} disabled={primera} aria-label="Subir"
            className="text-text-3 hover:text-text-1 disabled:opacity-20 leading-none text-[10px] px-1">▲</button>
          <button onClick={onBajar} disabled={ultima} aria-label="Bajar"
            className="text-text-3 hover:text-text-1 disabled:opacity-20 leading-none text-[10px] px-1">▼</button>
        </div>

        <input
          value={campo.etiqueta}
          onChange={e => onChange({ etiqueta: e.target.value })}
          placeholder="¿Qué le preguntas? Ej: ¿Traes tu propia raqueta?"
          className="input !h-10 flex-1 text-sm" />

        <button onClick={onQuitar} aria-label="Quitar pregunta"
          className="w-9 h-10 flex items-center justify-center text-text-3 hover:text-danger flex-shrink-0 text-lg">×</button>
      </div>

      <div className="flex items-center gap-2 flex-wrap pl-7">
        <select
          value={campo.tipo}
          onChange={e => {
            const tipo = e.target.value;
            /* Al cambiar a un tipo con opciones se arranca con una vacía; al
               salir de él se limpian, para que no queden restos invisibles. */
            onChange({ tipo, opciones: CON_OPCIONES.has(tipo) ? (opciones.length ? opciones : ['']) : null });
          }}
          className="input !h-9 text-xs w-auto">
          {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        <label className="flex items-center gap-1.5 text-xs text-text-2 cursor-pointer">
          <input type="checkbox" checked={Boolean(campo.requerido)}
            onChange={e => onChange({ requerido: e.target.checked })}
            className="w-3.5 h-3.5 accent-[#8B5CF6]" />
          Obligatoria
        </label>
      </div>

      {conOpciones && (
        <div className="pl-7 space-y-1.5">
          {opciones.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={o}
                onChange={e => onChange({ opciones: opciones.map((x, k) => (k === i ? e.target.value : x)) })}
                placeholder={`Opción ${i + 1}`}
                className="input !h-9 flex-1 text-sm" />
              <button onClick={() => onChange({ opciones: opciones.filter((_, k) => k !== i) })}
                aria-label="Quitar opción"
                className="w-8 h-8 flex items-center justify-center text-text-3 hover:text-danger flex-shrink-0">×</button>
            </div>
          ))}
          <button onClick={() => onChange({ opciones: [...opciones, ''] })}
            className="text-xs text-accent hover:underline">+ Añadir opción</button>
        </div>
      )}
    </div>
  );
}
