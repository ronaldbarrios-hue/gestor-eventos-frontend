import { useEffect, useState, useCallback, useMemo } from 'react';
import Icono from '../../../components/ui/Iconos.jsx';
import { interaccionesApi } from '../../../api/interacciones.js';
import { networkingApi } from '../../../api/networking.js';
import { eventosApi } from '../../../api/eventos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import ImagePicker from '../../../components/ui/ImagePicker.jsx';
import { zonasDelEvento, etiquetaZona } from '../../../lib/zonas.js';
import GalleryUploader from '../../../components/ui/GalleryUploader.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';

/* Tab Stands — la CONFIGURACIÓN de los stands y de la mecánica de puntos.

   Aquí se monta lo que existe antes de que empiece el evento: los stands, el
   pasaporte, el catálogo de motivos que se podrán marcar, y el historial de lo
   que se marcó.

   Escanear para dar puntos o canjear ya NO está aquí: se hace en
   «Asistentes → Escanear», junto al check-in, el reingreso y los sub-eventos.
   La acción física es la misma —pasar una escarapela por un móvil— y tenerla
   repartida en dos pantallas obligaba a cambiar de sitio con la misma persona
   delante. Aquí queda montar; allí, operar. */

const PRESETS = [
  { nombre: 'Visitó el stand',      tipo: 'positivo', puntos: 10 },
  { nombre: 'Participó en actividad', tipo: 'positivo', puntos: 25 },
  { nombre: 'Ganó el reto',         tipo: 'positivo', puntos: 50 },
  { nombre: 'Compró en el stand',   tipo: 'positivo', puntos: 30 },
  { nombre: 'Llamado de atención',  tipo: 'negativo', puntos: 20 },
  { nombre: 'Queja de un tercero',  tipo: 'negativo', puntos: 30 },
  { nombre: 'Daño a la propiedad',  tipo: 'negativo', puntos: 100 },
];

export default function StandsTab({ evento, soyOwner }) {
  const { success, error: toastErr } = useToast();
  const [motivos, setMotivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState('stands');   // stands | pasaporte | motivos | historial
  const [historial, setHistorial] = useState([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const d = await interaccionesApi.motivos(evento.id);
      setMotivos(d.motivos || []);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, [evento.id, toastErr]);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarHistorial = useCallback(async () => {
    try {
      const d = await interaccionesApi.historial(evento.id, { limit: 100 });
      setHistorial(d.interacciones || []);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  }, [evento.id, toastErr]);

  useEffect(() => { if (vista === 'historial') cargarHistorial(); }, [vista, cargarHistorial]);

  if (loading) return <GLoader message="Cargando stands..." />;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Stands</h2>
          <p className="text-sm text-text-2 mt-1">
            Los stands del evento, su cuota de puntos y el catálogo de motivos.
            Dar puntos y canjear premios se hacen en <b className="text-text-1">Asistentes → Escanear</b>,
            con el resto de escaneos.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 overflow-x-auto max-w-full no-scrollbar">
          {[['stands', 'Stands'], ['pasaporte', 'Pasaporte'], ['motivos', 'Motivos'], ['historial', 'Historial']].map(([k, l]) => (
            <button key={k} onClick={() => setVista(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${vista === k ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {vista === 'stands' && <StandsEditor evento={evento} soyOwner={soyOwner} />}
      {vista === 'pasaporte' && <PasaporteConfig evento={evento} soyOwner={soyOwner} />}


      {vista === 'motivos' && (
        <MotivosEditor evento={evento} motivos={motivos} soyOwner={soyOwner}
          onGuardado={(lista) => { setMotivos(lista); success('Motivos guardados.'); setVista('stands'); }} />
      )}

      {vista === 'historial' && (
        <Historial evento={evento} items={historial} soyOwner={soyOwner} onCambio={cargarHistorial} />
      )}
    </div>
  );
}

/* ─────────── Stands del evento (lista + alta manual) ─────────── */

function StandsEditor({ evento, soyOwner }) {
  const { success, error: toastErr } = useToast();
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);   // null | 'nuevo' | <id>
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  /* Las zonas del plano, para poder ubicar el stand (0088). */
  const zonasEvento = useMemo(() => zonasDelEvento(evento), [evento]);
  const porUbicar = useMemo(() => stands.filter(s => !s.zona_id).length, [stands]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const d = await networkingApi.expositoresAdmin(evento.id);
      setStands(d.expositores || []);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, [evento.id, toastErr]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo   = () => { setEditando('nuevo'); setForm({ nombre: '', stand: '', zona_id: '', descripcion: '', logo_url: '', sitio_web: '', galeria: [] }); };
  const abrirEdicion = (s) => { setEditando(s.id); setForm({ nombre: s.nombre || '', stand: s.stand || '', zona_id: s.zona_id || '', descripcion: s.descripcion || '', logo_url: s.logo_url || '', sitio_web: s.sitio_web || '', galeria: s.galeria || [] }); };
  const cerrar       = () => { setEditando(null); setForm(null); };
  const set          = (patch) => setForm(f => ({ ...f, ...patch }));

  const guardar = async () => {
    if (!form.nombre.trim()) { toastErr('El stand necesita un nombre.'); return; }
    setSaving(true);
    try {
      if (editando === 'nuevo') { await networkingApi.crearStand(evento.id, form); success('Stand agregado.'); }
      else { await networkingApi.editarStand(evento.id, editando, form); success('Stand actualizado.'); }
      cerrar();
      await cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  const borrar = async (s) => {
    if (!(await confirmDialog({ message: `¿Eliminar el stand "${s.nombre}"? Si vino de una boleta-stand se quita del directorio, pero la boleta sigue existiendo.`, danger: true }))) return;
    try { await networkingApi.borrarStand(evento.id, s.id); success('Stand eliminado.'); await cargar(); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  if (!soyOwner) return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-14 text-center">
      <p className="text-sm text-text-3">Solo el organizador puede gestionar los stands.</p>
    </div>
  );

  if (loading) return <GLoader message="Cargando stands..." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-text-3 leading-relaxed max-w-2xl">
          Estos son los stands/expositores del evento. Se crean solos cuando alguien compra una
          <strong className="text-text-2"> boleta de stand</strong>, y también puedes agregarlos aquí a mano
          (patrocinadores, aliados). Aparecen en el <strong className="text-text-2">directorio</strong> y en el
          <strong className="text-text-2"> mapa</strong> del evento.
        </p>
        {editando === null && (
          <button onClick={abrirNuevo} className="btn-primary btn-sm flex-shrink-0">+ Agregar stand</button>
        )}
      </div>

      {/* La zona de cada stand no se pudo deducir de lo que ya había: "A-12" es
          una etiqueta, no un sitio, y adivinar habría mandado al visitante a
          caminar hasta la zona equivocada. Así que se asigna a mano, y esto
          convierte ese trabajo en algo visible y con final en vez de un dato
          que falta sin que nadie se entere. */}
      {zonasEvento.length > 0 && porUbicar > 0 && (
        <p className="rounded-2xl border border-border bg-surface/40 px-4 py-3 text-xs text-text-3">
          <strong className="text-text-2">{porUbicar}</strong>{' '}
          {porUbicar === 1 ? 'stand no tiene zona asignada' : 'stands no tienen zona asignada'} en el plano.
          Sin ella no aparecen al tocar su zona en el mapa del evento.
        </p>
      )}

      {/* Formulario de alta/edición */}
      {editando !== null && form && (
        <div className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-1">{editando === 'nuevo' ? 'Nuevo stand' : 'Editar stand'}</p>
            <button onClick={cerrar} className="text-text-3 hover:text-text-1 text-sm">✕</button>
          </div>
          <div className="grid sm:grid-cols-[1fr_180px] gap-3">
            <div className="field">
              <label className="label text-xs">Nombre *</label>
              <input value={form.nombre} onChange={e => set({ nombre: e.target.value })}
                className="input rounded-xl py-2.5 text-sm" placeholder="Ej. Nintendo, Café del Valle" autoFocus />
            </div>
            <div className="field">
              <label className="label text-xs">Stand</label>
              <input value={form.stand} onChange={e => set({ stand: e.target.value })}
                className="input rounded-xl py-2.5 text-sm" placeholder="Ej. A-12" />
            </div>
          </div>
          {zonasEvento.length > 0 && (
            <div className="field">
              <label className="label text-xs">Zona del plano <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
              {/* A diferencia del formulario de sub-eventos, elegir zona NO
                  rellena el campo de arriba: "A-12" es la etiqueta del puesto
                  y "Zona Gamer" es dónde está. Son dos datos distintos, y
                  copiarlos el uno sobre el otro es justo lo que hacía que no
                  se pudiera contestar qué stands hay en una zona. */}
              <select value={form.zona_id} onChange={e => set({ zona_id: e.target.value })}
                className="input rounded-xl py-2.5 text-sm">
                <option value="">Sin ubicar</option>
                {zonasEvento.map(z => (
                  <option key={z.id} value={z.id}>{etiquetaZona(z)}</option>
                ))}
              </select>
              <p className="text-[11px] text-text-3 mt-1">
                Al tocar esa zona en el plano, este stand aparece entre los que están montados ahí.
              </p>
            </div>
          )}
          <div className="field">
            <label className="label text-xs">Descripción</label>
            <textarea value={form.descripcion} onChange={e => set({ descripcion: e.target.value })}
              rows={2} className="input rounded-xl py-2.5 text-sm resize-none" placeholder="Qué ofrece este stand (opcional)" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="field">
              <label className="label text-xs">Logo</label>
              <ImagePicker value={form.logo_url} onChange={(url) => set({ logo_url: url })} ownerId={evento.id} placeholder="URL del logo o subir" />
            </div>
            <div className="field">
              <label className="label text-xs">Sitio web</label>
              <input value={form.sitio_web} onChange={e => set({ sitio_web: e.target.value })}
                className="input rounded-xl py-2.5 text-sm" placeholder="https://…" />
            </div>
          </div>
          <GalleryUploader value={form.galeria} onChange={(galeria) => set({ galeria })} ownerId={evento.id}
            maxItems={3} label="Fotos del stand" />
          <div className="flex justify-end gap-2">
            <button onClick={cerrar} className="btn-ghost btn-sm">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="btn-primary btn-sm">
              {saving ? <><Spinner size="sm" /> Guardando…</> : (editando === 'nuevo' ? 'Agregar stand' : 'Guardar cambios')}
            </button>
          </div>
        </div>
      )}

      {/* Lista de stands */}
      {stands.length === 0 && editando === null ? (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-14 text-center">
          <p className="text-sm text-text-2 mb-4">Todavía no hay stands en este evento.</p>
          <button onClick={abrirNuevo} className="btn-primary btn-sm">Agregar el primero</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {stands.map(s => (
            <TarjetaStand key={s.id} s={s} evento={evento}
              onEditar={() => abrirEdicion(s)} onBorrar={() => borrar(s)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────── Pasaporte gamificado (config) ─────────── */

function PasaporteConfig({ evento, soyOwner }) {
  const { success, error: toastErr } = useToast();
  const inicial = evento.page_json?.pasaporte || {};
  const [form, setForm] = useState({
    activo: Boolean(inicial.activo),
    titulo: inicial.titulo || 'Pasaporte del evento',
    descripcion: inicial.descripcion || 'Visita los stands y reúne sellos para reclamar tu premio.',
    meta: inicial.meta || 5,
    premio_texto: inicial.premio_texto || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const guardar = async () => {
    setSaving(true);
    try {
      await eventosApi.update(evento.id, {
        page_json: { pasaporte: { ...form, meta: Number(form.meta) || 0 } },
      });
      success('Pasaporte guardado.');
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  if (!soyOwner) return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-14 text-center">
      <p className="text-sm text-text-3">Solo el organizador puede configurar el pasaporte.</p>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-text-3 leading-relaxed">
        El pasaporte convierte los stands en un juego: cada stand que le marque la escarapela al asistente
        es un <strong className="text-text-2">sello</strong>. Al reunir la meta, desbloquea el premio. El
        asistente ve su progreso en <span className="font-mono">/mi-ticket</span>.
      </p>

      <div className="rounded-3xl border border-border bg-surface/40 p-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-1">Pasaporte activo</p>
          <p className="text-xs text-text-3">Actívalo para que los asistentes vean su progreso.</p>
        </div>
        <button onClick={() => set({ activo: !form.activo })}
          className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${form.activo ? 'bg-accent' : 'bg-surface-3'}`}>
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${form.activo ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-surface/40 p-5 space-y-4">
        <div className="field">
          <label className="label text-xs">Título</label>
          <input value={form.titulo} onChange={e => set({ titulo: e.target.value })} className="input rounded-xl py-2.5 text-sm" />
        </div>
        <div className="field">
          <label className="label text-xs">Descripción</label>
          <textarea value={form.descripcion} onChange={e => set({ descripcion: e.target.value })} rows={2} className="input rounded-xl py-2.5 text-sm resize-none" />
        </div>
        <div className="grid sm:grid-cols-[140px_1fr] gap-3">
          <div className="field">
            <label className="label text-xs">Sellos para completar</label>
            <input type="number" min="1" value={form.meta} onChange={e => set({ meta: e.target.value })} className="input rounded-xl py-2.5 text-sm" />
          </div>
          <div className="field">
            <label className="label text-xs">Premio al completar</label>
            <input value={form.premio_texto} onChange={e => set({ premio_texto: e.target.value })} className="input rounded-xl py-2.5 text-sm" placeholder="Ej. Reclama una camiseta en el stand de información" />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={guardar} disabled={saving} className="btn-primary btn-sm">{saving ? <><Spinner size="sm" /> Guardando…</> : 'Guardar pasaporte'}</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Resultado del último escaneo ─────────── */

function CodigoManual({ onSubmit, disabled }) {
  const [codigo, setCodigo] = useState('');
  return (
    <form className="flex items-center gap-2 mt-4"
      onSubmit={e => { e.preventDefault(); if (codigo.trim()) { onSubmit(codigo.trim().toUpperCase()); setCodigo(''); } }}>
      <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
        placeholder="O escribe el código: ABCD1234" maxLength={12}
        className="input rounded-xl py-2.5 text-sm font-mono flex-1" />
      <button type="submit" disabled={disabled || codigo.trim().length < 4} className="btn-secondary btn-sm">Registrar</button>
    </form>
  );
}

/* ─────────── Canjear (mismo QR de la escarapela) ─────────── */

/* ─────────── Catálogo de motivos ─────────── */

function MotivosEditor({ evento, motivos, soyOwner, onGuardado }) {
  const { error: toastErr } = useToast();
  const [lista, setLista] = useState(() => motivos.map(m => ({ ...m, _key: m.id })));
  const [saving, setSaving] = useState(false);

  const set = (key, patch) => setLista(l => l.map(m => m._key === key ? { ...m, ...patch } : m));
  const quitar = (key) => setLista(l => l.filter(m => m._key !== key));
  const agregar = (preset = {}) => setLista(l => [...l, {
    _key: Math.random().toString(36).slice(2), id: null,
    nombre: preset.nombre || '', tipo: preset.tipo || 'positivo',
    puntos: preset.puntos ?? 10, activo: true,
  }]);

  const guardar = async () => {
    for (const m of lista) {
      if (!m.nombre?.trim()) { toastErr('Todos los motivos necesitan un nombre.'); return; }
    }
    setSaving(true);
    try {
      const payload = lista.map(({ id, nombre, tipo, puntos, activo, descripcion }) =>
        ({ id, nombre, tipo, puntos: Number(puntos) || 0, activo, descripcion: descripcion || null }));
      const r = await interaccionesApi.guardarMotivos(evento.id, payload);
      onGuardado(r.motivos || []);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  if (!soyOwner) return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-14 text-center">
      <p className="text-sm text-text-3">Solo el organizador puede definir los motivos.</p>
    </div>
  );

  const sugeridos = PRESETS.filter(p => !lista.some(m => m.nombre.trim().toLowerCase() === p.nombre.toLowerCase()));

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-text-3 leading-relaxed">
        Define qué se puede registrar al escanear una escarapela en un stand. Los positivos suman puntos
        (canjeables al final del evento) y los negativos restan y quedan como constancia.
      </p>

      {sugeridos.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface/40 p-4">
          <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-3">Sugeridos</p>
          <div className="flex flex-wrap gap-2">
            {sugeridos.map(p => (
              <button key={p.nombre} onClick={() => agregar(p)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-2 text-xs text-text-2 hover:text-text-1 hover:bg-surface-2 transition-colors">
                <span className={p.tipo === 'negativo' ? 'text-danger' : 'text-success'}>+</span> {p.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {lista.length === 0 && (
          <div className="rounded-3xl border border-border bg-surface/40 px-6 py-12 text-center">
            <p className="text-sm text-text-3">Aún no hay motivos. Añade uno sugerido o créalo en blanco.</p>
          </div>
        )}
        {lista.map(m => (
          <div key={m._key} className="rounded-2xl border border-border bg-surface/40 p-4">
            <div className="grid sm:grid-cols-[1fr_130px_110px_auto] gap-2 items-end">
              <div className="field">
                <label className="label text-xs">Motivo</label>
                <input value={m.nombre} onChange={e => set(m._key, { nombre: e.target.value })}
                  className="input rounded-xl py-2.5 text-sm" placeholder="Ej. Visitó el stand" />
              </div>
              <div className="field">
                <label className="label text-xs">Tipo</label>
                <select value={m.tipo} onChange={e => set(m._key, { tipo: e.target.value })}
                  className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                  <option value="positivo">Suma puntos</option>
                  <option value="negativo">Resta / novedad</option>
                </select>
              </div>
              <div className="field">
                <label className="label text-xs">Puntos</label>
                <input type="number" min="0" value={Math.abs(Number(m.puntos) || 0)}
                  onChange={e => set(m._key, { puntos: Number(e.target.value) || 0 })}
                  className="input rounded-xl py-2.5 text-sm" />
              </div>
              <div className="flex items-center gap-1 pb-1">
                <label className="flex items-center gap-1.5 text-xs text-text-2 cursor-pointer mr-1">
                  <input type="checkbox" checked={m.activo !== false}
                    onChange={e => set(m._key, { activo: e.target.checked })} className="w-4 h-4 rounded accent-primary" />
                  Activo
                </label>
                <button onClick={() => quitar(m._key)}
                  className="w-8 h-8 rounded-lg text-danger-light hover:bg-danger/10 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => agregar()} className="btn-ghost btn-sm">+ Añadir motivo en blanco</button>
        <button onClick={guardar} disabled={saving} className="btn-primary btn-sm">
          {saving ? <><Spinner size="sm" /> Guardando…</> : 'Guardar motivos'}
        </button>
      </div>
    </div>
  );
}

/* ─────────── Historial ─────────── */

function Historial({ evento, items, soyOwner, onCambio }) {
  const { success, error: toastErr } = useToast();

  const borrar = async (it) => {
    if (!(await confirmDialog({ message: `¿Deshacer "${it.motivo_texto || 'registro'}"? Se le devuelven los puntos.`, danger: true }))) return;
    try { await interaccionesApi.borrar(evento.id, it.id); success('Registro deshecho.'); onCambio(); }
    catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  if (!items.length) return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-14 text-center">
      <p className="text-sm text-text-3">Todavía no se ha registrado ningún escaneo en stands.</p>
    </div>
  );

  return (
    <div className="rounded-3xl border border-border bg-surface/40 overflow-hidden">
      <ul className="divide-y divide-border max-h-[70vh] overflow-y-auto">
        {items.map(it => {
          const neg = it.tipo === 'negativo';
          return (
            <li key={it.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/30 group">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${neg ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'}`}>
                {neg ? <Icono nombre="aviso" className="w-3.5 h-3.5" /> : <Icono nombre="estrella" className="w-3.5 h-3.5" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-1 truncate">
                  {it.motivo_texto || 'Registro'}
                  {it.lugar && <span className="text-text-3"> · {it.lugar}</span>}
                  {it.expositor?.nombre && <span className="ml-1.5 text-[10px] uppercase tracking-wide bg-accent/10 text-accent-light px-1.5 py-0.5 rounded"><Icono nombre="empresa" className="w-3 h-3 inline-block align-[-2px]" /> {it.expositor.nombre}</span>}
                </p>
                <p className="text-xs text-text-3 truncate">
                  {it.ticket?.guest_nombre || 'Asistente'} · <span className="font-mono">{it.ticket?.codigo}</span> · {new Date(it.created_at).toLocaleString('es-CO')}
                </p>
                {it.nota && <p className="text-xs text-text-2 mt-0.5 italic">“{it.nota}”</p>}
              </div>
              <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${neg ? 'text-danger' : 'text-success'}`}>
                {it.puntos > 0 ? `+${it.puntos}` : it.puntos}
              </span>
              {soyOwner && (
                <button onClick={() => borrar(it)} title="Deshacer"
                  className="w-8 h-8 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─────────── La tarjeta de un stand ───────────

   Antes era un logo de 44px, el nombre y poco más. El problema no era que
   faltara sitio: era que los datos que hacen útil esta pantalla ya venían del
   servidor —`puntos: { otorgados, veces, asistentes_distintos, disponibles }`
   y `cuota_puntos`, que salen de la vista `v_consumo_puntos_stand`— y no se
   pintaban. La consulta ya se pagaba; sólo se tiraba el resultado.

   Lo que se enseña, y por qué esos cuatro números y no otros:

   · **Cuánto lleva repartido de su cuota.** Es lo que decide si el stand puede
     seguir dando puntos, y quien lo mira suele estar decidiendo si ampliársela.
   · **A cuánta gente distinta.** Cien escaneos a diez personas no es lo mismo
     que a cien, y el total de puntos no distingue las dos cosas.
   · **Su sitio en el mapa**, si lo tiene. Estos stands se pintan en el plano y
     no había forma de saber cuáles estaban puestos y cuáles no.

   La barra de cuota se pinta sólo cuando hay tope: sin cuota no hay nada que
   llenar, y una barra vacía se lee como «no ha dado nada». */
function TarjetaStand({ s, evento, onEditar, onBorrar }) {
  const manual = !s.ticket_id;
  const borrador = s.estado_ficha === 'borrador';
  const p = s.puntos || {};
  const tope = s.cuota_puntos;
  const dados = p.otorgados || 0;
  const pct = tope > 0 ? Math.min(100, Math.round((dados / tope) * 100)) : null;
  const agotado = tope != null && dados >= tope;

  /* ¿Está puesto en el plano? Los marcadores del mapa viven en page_json. */
  const marcadores = Array.isArray(evento?.page_json?.mapa?.marcadores) ? evento.page_json.mapa.marcadores : [];
  const enMapa = marcadores.some(m => m?.expositor_id === s.id);

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3 group">
      <div className="flex items-start gap-3">
        {s.logo_url
          ? <img src={s.logo_url} alt="" className="w-20 h-20 rounded-xl object-cover border border-border flex-shrink-0" />
          : <div className="w-20 h-20 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-2xl font-bold text-text-3 flex-shrink-0">{(s.nombre || '?').charAt(0).toUpperCase()}</div>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-1 truncate">{s.nombre}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {s.stand && <span className="text-[10px] font-mono bg-surface-2 text-text-2 px-1.5 py-0.5 rounded">{s.stand}</span>}
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${manual ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-light'}`}>{manual ? 'Manual' : 'Boleta'}</span>
            {borrador && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning">Borrador</span>}
            {enMapa
              ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success">En el mapa</span>
              : marcadores.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-text-3">Sin ubicar</span>}
          </div>
          {s.descripcion && <p className="text-xs text-text-3 mt-1.5 line-clamp-2">{s.descripcion}</p>}
          {s.galeria?.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {s.galeria.slice(0, 3).map((url, i) => (
                <img key={i} src={url} alt="" className="w-8 h-8 rounded-md object-cover border border-border" />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEditar} title="Editar"
            className="w-8 h-8 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
          <button onClick={onBorrar} title="Eliminar"
            className="w-8 h-8 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>

      {/* Lo que reparte. Sale del servidor desde siempre y no se estaba usando. */}
      <div className="rounded-xl bg-surface-2/50 px-3 py-2.5 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] uppercase tracking-widest text-text-3 font-semibold">Puntos</span>
          <span className="text-xs tabular-nums text-text-1">
            <b>{dados}</b>
            {tope != null && <span className="text-text-3"> / {tope}</span>}
            {tope == null && <span className="text-text-3"> · sin tope</span>}
          </span>
        </div>

        {pct != null && (
          <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${agotado ? 'bg-danger' : pct > 80 ? 'bg-warning' : 'bg-success'}`}
                 style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="flex items-center gap-3 text-[10px] text-text-3">
          {/* Cien escaneos a diez personas no es lo mismo que a cien, y el
              total de puntos no distingue las dos cosas. */}
          <span><b className="text-text-2 tabular-nums">{p.asistentes_distintos || 0}</b> persona{(p.asistentes_distintos || 0) === 1 ? '' : 's'}</span>
          <span><b className="text-text-2 tabular-nums">{p.veces || 0}</b> escaneo{(p.veces || 0) === 1 ? '' : 's'}</span>
          {agotado && <span className="text-danger font-medium ml-auto">Cuota agotada</span>}
          {!agotado && p.disponibles != null && <span className="ml-auto">le quedan <b className="text-text-2 tabular-nums">{p.disponibles}</b></span>}
        </div>
      </div>
    </div>
  );
}
