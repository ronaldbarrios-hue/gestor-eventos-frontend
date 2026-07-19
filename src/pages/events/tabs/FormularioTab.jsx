import { useEffect, useState } from 'react';
import { eventosApi } from '../../../api/eventos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';

/* Tab Formulario — campos personalizados que se piden en el formulario de compra
   (cédula, edad, ciudad, talla, foto, etc). Se guardan preservando el `id` de cada
   campo existente (el backend hace un diff: actualiza los que ya existen,
   agrega los nuevos, borra los quitados) — así las respuestas que ya
   diligenciaron los asistentes nunca quedan "huérfanas" al editar el formulario. */

const TIPOS = [
  { value: 'texto',     label: 'Texto corto' },
  { value: 'numero',    label: 'Número' },
  { value: 'fecha',     label: 'Fecha' },
  { value: 'seleccion', label: 'Selección (lista de opciones)' },
  { value: 'checkbox',  label: 'Casilla (sí / no)' },
  { value: 'foto',      label: 'Foto (la persona sube una imagen)' },
];

function sugerenciasPorCategoria(nombreCategoria) {
  const n = (nombreCategoria || '').toLowerCase();
  if (/deport/.test(n)) return [
    { etiqueta: 'Grupo sanguíneo', tipo: 'texto' },
    { etiqueta: 'EPS', tipo: 'texto' },
    { etiqueta: 'Talla de camiseta', tipo: 'seleccion', opciones: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { etiqueta: 'Foto del equipo', tipo: 'foto' },
  ];
  if (/corporat|conferenc|empresa|negocio/.test(n)) return [
    { etiqueta: 'Empresa', tipo: 'texto' },
    { etiqueta: 'Cargo', tipo: 'texto' },
  ];
  if (/fiesta|concierto|música|musica|club/.test(n)) return [
    { etiqueta: 'Cédula', tipo: 'texto' },
    { etiqueta: 'Edad', tipo: 'numero' },
  ];
  if (/educat|académ|academic|curso|taller/.test(n)) return [
    { etiqueta: 'Institución educativa', tipo: 'texto' },
    { etiqueta: 'Programa o carrera', tipo: 'texto' },
  ];
  return [
    { etiqueta: 'Cédula', tipo: 'texto' },
    { etiqueta: 'Ciudad de residencia', tipo: 'texto' },
    { etiqueta: 'Edad', tipo: 'numero' },
  ];
}

function nuevoCampo(preset = {}) {
  return {
    _key: preset.id || Math.random().toString(36).slice(2),
    id: preset.id || null,
    tipo: preset.tipo || 'texto',
    etiqueta: preset.etiqueta || '',
    opciones: preset.opciones || [],
    requerido: preset.requerido ?? true,
  };
}

export default function FormularioTab({ evento }) {
  const [campos,  setCampos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const { success, error: toastErr } = useToast();

  useEffect(() => {
    setLoading(true);
    eventosApi.getFormulario(evento.id)
      .then(d => setCampos((d.campos || []).map(c => nuevoCampo({ ...c, opciones: c.opciones || [] }))))
      .catch(e => toastErr(e.message))
      .finally(() => setLoading(false));
    /* eslint-disable-next-line */
  }, [evento.id]);

  const agregar = (preset) => setCampos(list => [...list, nuevoCampo(preset)]);
  const quitar  = (key)    => setCampos(list => list.filter(c => c._key !== key));
  const mover   = (key, dir) => setCampos(list => {
    const i = list.findIndex(c => c._key === key);
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    const copia = [...list];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    return copia;
  });
  const actualizar = (key, patch) => setCampos(list => list.map(c => c._key === key ? { ...c, ...patch } : c));

  const guardar = async () => {
    for (const c of campos) {
      if (!c.etiqueta.trim()) { toastErr('Todos los campos necesitan un nombre.'); return; }
      if (c.tipo === 'seleccion' && c.opciones.length === 0) {
        toastErr(`El campo "${c.etiqueta}" necesita al menos una opción.`); return;
      }
    }
    setSaving(true);
    try {
      const payload = campos.map(({ id, tipo, etiqueta, opciones, requerido }) => ({ id, tipo, etiqueta, opciones, requerido }));
      const r = await eventosApi.guardarFormulario(evento.id, payload);
      setCampos((r.campos || []).map(c => nuevoCampo({ ...c, opciones: c.opciones || [] })));
      success('Formulario guardado. Ya se aplica en la página de compra.');
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <GLoader message="Cargando formulario..." />;

  const sugerencias = sugerenciasPorCategoria(evento.categoria?.nombre)
    .filter(s => !campos.some(c => c.etiqueta.trim().toLowerCase() === s.etiqueta.toLowerCase()));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display text-text-1 tracking-tight mb-1">Formulario de compra</h2>
        <p className="text-sm text-text-3 leading-relaxed">
          Define qué información le pides a cada persona al comprar o reservar una boleta,
          además de nombre y email (que siempre se piden). Se aplica a todas las boletas de este evento.
        </p>
      </div>

      {sugerencias.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface/40 p-4">
          <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-3">
            Sugeridos para este tipo de evento
          </p>
          <div className="flex flex-wrap gap-2">
            {sugerencias.map(s => (
              <button key={s.etiqueta} onClick={() => agregar(s)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-2
                           text-xs text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
                <span className="text-primary-light">+</span> {s.etiqueta}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {campos.length === 0 && (
          <div className="rounded-3xl border border-border bg-surface/40 px-6 py-12 text-center">
            <p className="text-sm text-text-3">Aún no agregas campos personalizados.</p>
          </div>
        )}

        {campos.map((c, i) => (
          <div key={c._key} className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 grid sm:grid-cols-2 gap-2">
                <div className="field">
                  <label className="label text-xs">Nombre del campo</label>
                  <input value={c.etiqueta} onChange={e => actualizar(c._key, { etiqueta: e.target.value })}
                    className="input rounded-xl py-2.5 text-sm" placeholder="Ej. Cédula, Edad, Talla..." />
                </div>
                <div className="field">
                  <label className="label text-xs">Tipo de respuesta</label>
                  <select value={c.tipo} onChange={e => actualizar(c._key, { tipo: e.target.value })}
                    className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-1 pt-6">
                <button onClick={() => mover(c._key, -1)} disabled={i === 0}
                  className="w-8 h-8 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center disabled:opacity-30">↑</button>
                <button onClick={() => mover(c._key, 1)} disabled={i === campos.length - 1}
                  className="w-8 h-8 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center disabled:opacity-30">↓</button>
                <button onClick={() => quitar(c._key)}
                  className="w-8 h-8 rounded-lg text-danger-light hover:bg-danger/10 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {c.tipo === 'seleccion' && (
              <div className="field">
                <label className="label text-xs">Opciones (separadas por coma)</label>
                <input
                  value={c.opciones.join(', ')}
                  onChange={e => actualizar(c._key, { opciones: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="input rounded-xl py-2.5 text-sm" placeholder="Ej. S, M, L, XL" />
              </div>
            )}

            {c.tipo === 'foto' && (
              <p className="text-xs text-text-3 bg-surface-2/60 rounded-xl px-3 py-2">
                📷 La persona podrá subir una foto (JPG, PNG o WEBP, máx. 4 MB) al llenar el formulario. La foto quedará guardada junto a su respuesta y podrás verla/descargarla desde el detalle del asistente.
              </p>
            )}

            <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer w-fit">
              <input type="checkbox" checked={c.requerido} onChange={e => actualizar(c._key, { requerido: e.target.checked })}
                className="w-4 h-4 rounded accent-primary" />
              Campo obligatorio
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
        <button onClick={() => agregar()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border-2 text-sm
                     text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
          + Agregar campo en blanco
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
