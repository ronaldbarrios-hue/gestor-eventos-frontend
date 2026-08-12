import { useEffect, useState, useCallback } from 'react';
import { interaccionesApi } from '../../../api/interacciones.js';
import { networkingApi } from '../../../api/networking.js';
import { eventosApi } from '../../../api/eventos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import QrScanner from '../../../components/ui/QrScanner.jsx';
import ImagePicker from '../../../components/ui/ImagePicker.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';
import Icono from '../../../components/ui/Icono.jsx';

/* Tab Stands — el otro lado de la escarapela.
   En la puerta el QR sirve para entrar (Check-in); aquí, en cada stand o
   actividad, se escanea la MISMA escarapela para registrar un motivo: sumar
   puntos (participó, ganó, compró) o dejar constancia de algo negativo
   (queja, llamado de atención). Los puntos se redimen al final del evento.

   Flujo: eliges el motivo ANTES de escanear (en un stand se repite el mismo
   motivo decenas de veces) y luego escaneas en cadena. */

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
  const [vista, setVista] = useState('stands');   // stands | escanear | canjear | bolsa | pasaporte | motivos | historial
  const [motivoSel, setMotivoSel] = useState(null);
  const [lugar, setLugar] = useState('');
  const [ultimo, setUltimo] = useState(null);
  const [working, setWorking] = useState(false);
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

  const registrar = useCallback(async (payload) => {
    if (working) return;
    if (!motivoSel) { toastErr('Elige primero un motivo.'); return; }
    setWorking(true);
    try {
      const r = await interaccionesApi.registrar(evento.id, {
        ...payload, motivo_id: motivoSel.id, lugar: lugar.trim() || null,
      });
      setUltimo({ ok: true, ...r });
    } catch (e) {
      setUltimo({ ok: false, error: e.response?.data?.error || e.message });
    } finally {
      setTimeout(() => setWorking(false), 600);
    }
  }, [evento.id, motivoSel, lugar, working, toastErr]);

  const onScanQr = useCallback((qr) => registrar({ qr_token: qr }), [registrar]);

  if (loading) return <GLoader message="Cargando stands..." />;

  const activos = motivos.filter(m => m.activo);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Stands y puntos</h2>
          <p className="text-sm text-text-2 mt-1">Gestiona los stands del evento y, con la misma escarapela, registra puntos y entrega premios.</p>
        </div>
        <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 overflow-x-auto max-w-full no-scrollbar">
          {[['stands', 'Stands'], ['escanear', 'Dar puntos'], ['canjear', 'Canjear'], ['bolsa', 'Bolsa de puntos'], ['pasaporte', 'Pasaporte'], ['motivos', 'Motivos'], ['historial', 'Historial']].map(([k, l]) => (
            <button key={k} onClick={() => setVista(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${vista === k ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {vista === 'stands' && <StandsEditor evento={evento} soyOwner={soyOwner} />}
      {vista === 'bolsa' && <BolsaPuntos evento={evento} soyOwner={soyOwner} />}
      {vista === 'pasaporte' && <PasaporteConfig evento={evento} soyOwner={soyOwner} />}

      {vista === 'escanear' && (
        activos.length === 0 ? (
          <div className="rounded-3xl border border-border bg-surface/40 px-6 py-14 text-center">
            <p className="text-sm text-text-2 mb-4">Primero define los motivos que se pueden registrar en un stand.</p>
            <button onClick={() => setVista('motivos')} className="btn-primary btn-sm">Definir motivos</button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
            <div className="space-y-4">
              {/* 1. Motivo */}
              <div className="rounded-3xl border border-border bg-surface/40 p-5">
                <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-3">1 · Elige el motivo</p>
                <div className="flex flex-wrap gap-2">
                  {activos.map(m => {
                    const sel = motivoSel?.id === m.id;
                    const neg = m.tipo === 'negativo';
                    return (
                      <button key={m.id} onClick={() => setMotivoSel(m)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors flex items-center gap-2
                          ${sel
                            ? (neg ? 'border-danger bg-danger/10 text-text-1' : 'border-success bg-success/10 text-text-1')
                            : 'border-border text-text-3 hover:text-text-1'}`}>
                        <Icono name={neg ? 'aviso' : 'estrella'} className="w-3.5 h-3.5" />
                        {m.nombre}
                        <span className={`text-[10px] font-mono ${neg ? 'text-danger' : 'text-success'}`}>
                          {m.puntos > 0 ? `+${m.puntos}` : m.puntos}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <label className="label text-xs">Stand o actividad (opcional)</label>
                  <input value={lugar} onChange={e => setLugar(e.target.value)}
                    placeholder="Ej. Stand Nintendo, Zona gaming"
                    className="input rounded-xl py-2.5 text-sm max-w-sm" />
                </div>
              </div>

              {/* 2. Escanear */}
              <div className="rounded-3xl border border-border bg-surface/40 p-5">
                <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-3">2 · Escanea las escarapelas</p>
                {!motivoSel ? (
                  <p className="text-sm text-text-3">Elige un motivo arriba para habilitar el escáner.</p>
                ) : (
                  <>
                    <QrScanner onScan={onScanQr}
                      containerId="qr-stand"
                      titulo={`${motivoSel.nombre} · apunta al QR`}
                      textoActivar="Escanear en el stand"
                      descripcion="Puedes escanear varias escarapelas seguidas sin salir de la cámara."
                      overlay={ultimo ? <ResultadoStand r={ultimo} compact /> : null} />
                    <CodigoManual onSubmit={(codigo) => registrar({ codigo })} disabled={working} />
                  </>
                )}
              </div>

              {ultimo && <ResultadoStand r={ultimo} />}
            </div>

            <aside className="rounded-3xl border border-border bg-surface/40 p-5 h-fit">
              <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">Cómo funciona</p>
              <ul className="text-xs text-text-2 space-y-2 leading-relaxed">
                <li>· Es <strong className="text-text-1">la misma escarapela</strong> del ingreso: un QR sirve para entrar y para todo lo de adentro.</li>
                <li>· Los puntos se guardan en <strong className="text-text-1">la boleta</strong>, así que funcionan también con asistentes sin cuenta.</li>
                <li>· El asistente ve su saldo y el detalle en su móvil, en <span className="font-mono">/mi-ticket</span>.</li>
                <li>· Los motivos negativos restan y quedan como constancia en el historial.</li>
              </ul>
            </aside>
          </div>
        )
      )}

      {vista === 'canjear' && <CanjearVista evento={evento} />}

      {vista === 'motivos' && (
        <MotivosEditor evento={evento} motivos={motivos} soyOwner={soyOwner}
          onGuardado={(lista) => { setMotivos(lista); success('Motivos guardados.'); setVista('escanear'); }} />
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

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const d = await networkingApi.expositoresAdmin(evento.id);
      setStands(d.expositores || []);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  }, [evento.id, toastErr]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo   = () => { setEditando('nuevo'); setForm({ nombre: '', stand: '', descripcion: '', logo_url: '', sitio_web: '' }); };
  const abrirEdicion = (s) => { setEditando(s.id); setForm({ nombre: s.nombre || '', stand: s.stand || '', descripcion: s.descripcion || '', logo_url: s.logo_url || '', sitio_web: s.sitio_web || '' }); };
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

      {/* Formulario de alta/edición */}
      {editando !== null && form && (
        <div className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-1">{editando === 'nuevo' ? 'Nuevo stand' : 'Editar stand'}</p>
            <button onClick={cerrar} className="text-text-3 hover:text-text-1 text-sm"><Icono name="cerrar" className="w-4 h-4" /></button>
          </div>
          <div className="grid sm:grid-cols-[1fr_180px] gap-3">
            <div className="field">
              <label className="label text-xs">Nombre *</label>
              <input value={form.nombre} onChange={e => set({ nombre: e.target.value })}
                className="input rounded-xl py-2.5 text-sm" placeholder="Ej. Nintendo, Café del Valle" autoFocus />
            </div>
            <div className="field">
              <label className="label text-xs">Stand / ubicación</label>
              <input value={form.stand} onChange={e => set({ stand: e.target.value })}
                className="input rounded-xl py-2.5 text-sm" placeholder="Ej. A-12" />
            </div>
          </div>
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
            <TarjetaStand
              key={s.id}
              s={s}
              onEditar={() => abrirEdicion(s)}
              onBorrar={() => borrar(s)}
            />
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
        page_json: { ...(evento.page_json || {}), pasaporte: { ...form, meta: Number(form.meta) || 0 } },
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

function ResultadoStand({ r, compact }) {
  const ok = r.ok;
  const neg = ok && r.interaccion?.tipo === 'negativo';
  const cls = !ok ? 'border-danger/40 bg-danger/10'
    : neg ? 'border-warning/40 bg-warning/10' : 'border-success/40 bg-success/10';
  const icono = !ok ? 'cerrar' : neg ? 'aviso' : 'check';
  const iconCls = !ok ? 'bg-danger text-white' : neg ? 'bg-warning text-white' : 'bg-success text-white';

  return (
    <div className={`rounded-3xl border-2 ${cls} ${compact ? 'backdrop-blur-xl bg-surface/90 p-5' : 'p-6'} animate-[fadeUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconCls}`}>
          <Icono name={icono} className="w-6 h-6" strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          {!ok ? (
            <>
              <h3 className="text-xl font-bold font-display text-text-1 mb-1">No se pudo registrar</h3>
              <p className="text-sm text-text-2">{r.error}</p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold font-display text-text-1 mb-1">{r.interaccion?.motivo_texto || 'Registrado'}</h3>
              <p className="text-base font-medium text-text-1">{r.ticket?.nombre}</p>
              <p className="text-xs text-text-3">{r.ticket?.tipo} · <span className="font-mono">{r.ticket?.codigo}</span></p>
              <div className="flex items-center gap-3 mt-3">
                <span className={`text-lg font-bold font-display tabular-nums ${neg ? 'text-danger' : 'text-success'}`}>
                  {r.interaccion?.puntos > 0 ? `+${r.interaccion.puntos}` : r.interaccion?.puntos}
                </span>
                <span className="text-xs text-text-3">Saldo: <strong className="text-text-1 tabular-nums">{r.total_puntos} pts</strong></span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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

function CanjearVista({ evento }) {
  const { success, error: toastErr } = useToast();
  const [datos, setDatos] = useState(null);   // { ticket, saldo, recompensas, alcance }
  const [buscando, setBuscando] = useState(false);
  const [entregando, setEntregando] = useState(null);
  const [entregado, setEntregado] = useState(null);

  const buscar = useCallback(async (params) => {
    setBuscando(true); setEntregado(null);
    try {
      const d = await interaccionesApi.saldo(evento.id, params);
      setDatos(d);
    } catch (e) {
      setDatos(null);
      toastErr(e.response?.data?.error || e.message);
    } finally { setBuscando(false); }
  }, [evento.id, toastErr]);

  const onScanQr = useCallback((qr) => buscar({ qr_token: qr }), [buscar]);

  const entregar = async (r) => {
    setEntregando(r.id);
    try {
      const d = await interaccionesApi.canjear(evento.id, { codigo: datos.ticket.codigo, recompensa_id: r.id });
      setEntregado({ titulo: r.titulo, codigo: d.canje?.codigo });
      success(`Entregado: ${r.titulo}`);
      await buscar({ codigo: datos.ticket.codigo });
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setEntregando(null); }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
      <div className="space-y-4">
        <div className="rounded-3xl border border-border bg-surface/40 p-5">
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-3">Escanea la escarapela</p>
          <QrScanner onScan={onScanQr}
            containerId="qr-canje"
            titulo="Canje · apunta al QR"
            textoActivar="Escanear para canjear"
            descripcion="Es el mismo QR de la entrada: al leerlo verás su saldo y qué puede llevarse." />
          <CodigoManual onSubmit={(codigo) => buscar({ codigo })} disabled={buscando} />
        </div>

        {buscando && <p className="text-sm text-text-3">Buscando…</p>}

        {datos && (
          <div className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-6">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div>
                <p className="text-lg font-bold font-display text-text-1">{datos.ticket.nombre}</p>
                <p className="text-xs text-text-3">{datos.ticket.tipo} · <span className="font-mono">{datos.ticket.codigo}</span></p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold font-display text-text-1 tabular-nums">{datos.saldo}</p>
                <p className="text-[11px] text-text-3">puntos disponibles</p>
              </div>
            </div>
            <p className="text-[11px] text-text-3 mt-2">
              Ganados {datos.ganados} · canjeados {datos.canjeados} ·
              {datos.alcance === 'organizador' ? ' acumula entre todos tus eventos' : ' solo este evento'}
            </p>

            {entregado && (
              <div className="mt-4 rounded-2xl border border-success/30 bg-success/10 px-4 py-3">
                <p className="text-sm text-text-1 font-medium">Entregado: {entregado.titulo}</p>
                {entregado.codigo && <p className="text-xs text-text-3">Código de canje: <span className="font-mono">{entregado.codigo}</span></p>}
              </div>
            )}

            <div className="mt-5 space-y-2">
              {(datos.recompensas || []).length === 0 && (
                <p className="text-sm text-text-3">No hay recompensas activas para este evento.</p>
              )}
              {(datos.recompensas || []).map(r => (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-1 truncate">{r.titulo}</p>
                    <p className="text-xs text-text-3">
                      {r.costo_puntos} pts
                      {r.evento_id ? ' · solo este evento' : ' · de la empresa'}
                      {r.stock != null && ` · quedan ${Math.max(0, r.stock - r.canjeados)}`}
                    </p>
                  </div>
                  <button onClick={() => entregar(r)}
                    disabled={!r.alcanzable || entregando === r.id}
                    className="btn-primary btn-sm flex-shrink-0 disabled:opacity-40">
                    {entregando === r.id ? <Spinner size="sm" /> : r.agotada ? 'Agotada' : r.alcanzable ? 'Entregar' : 'Sin saldo'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="rounded-3xl border border-border bg-surface/40 p-5 h-fit">
        <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">Una sola tarjeta</p>
        <ul className="text-xs text-text-2 space-y-2 leading-relaxed">
          <li>· El <strong className="text-text-1">mismo QR</strong> sirve para entrar, sumar puntos en stands y reclamar premios.</li>
          <li>· El saldo respeta el <strong className="text-text-1">alcance</strong> que fijaste en Tarjeta: solo este evento, o todos tus eventos.</li>
          <li>· Las recompensas de un evento concreto no se pueden entregar en otro.</li>
          <li>· Funciona con asistentes sin cuenta: el canje queda contra la boleta.</li>
        </ul>
      </aside>
    </div>
  );
}

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
                <Icono name={neg ? 'aviso' : 'estrella'} className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-1 truncate">
                  {it.motivo_texto || 'Registro'}
                  {it.lugar && <span className="text-text-3"> · {it.lugar}</span>}
                  {it.expositor?.nombre && <span className="ml-1.5 text-[10px] uppercase tracking-wide bg-accent/10 text-accent-light px-1.5 py-0.5 rounded inline-flex items-center gap-1"><Icono name="edificio" className="w-3 h-3" />{it.expositor.nombre}</span>}
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

/* ─────────── Tarjeta de un stand ───────────

   Antes era un rectángulo con el nombre y dos botones al pasar el ratón. No
   decía si el stand podía operar —si tiene motivos que registrar, si tiene
   premios—, ni cuántos puntos había dado, ni de qué boleta salió, ni cómo
   entrar a su portal. Todo eso existía en la base y no se veía en ninguna
   pantalla. */
function TarjetaStand({ s, onEditar, onBorrar }) {
  const { success } = useToast();
  const manual = !s.creado_por_boleta;
  const borrador = s.estado_ficha === 'borrador';
  const p = s.puntos || {};
  const conCuota = s.cuota_puntos != null;
  const gastado = Number(p.otorgados || 0);
  const pct = conCuota && s.cuota_puntos > 0
    ? Math.min(100, Math.round((gastado / s.cuota_puntos) * 100))
    : 0;

  /* El expositor entra a su portal con el código de su boleta-stand. Ese enlace
     es lo que hay que pasarle, y hasta ahora había que armarlo a mano. */
  const enlacePortal = s.codigo_boleta ? `${window.location.origin}/expositor/${s.codigo_boleta}` : null;

  const copiarEnlace = () => {
    if (!enlacePortal) return;
    navigator.clipboard?.writeText(enlacePortal);
    success('Enlace del portal copiado. Pásaselo al expositor.');
  };

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3 group">
      <div className="flex items-start gap-3">
        {s.logo_url
          ? <img src={s.logo_url} alt="" className="w-11 h-11 rounded-xl object-cover border border-border flex-shrink-0" />
          : <div className="w-11 h-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
              <Icono name="stand" className="w-5 h-5 text-text-3" />
            </div>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-1 truncate">{s.nombre}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {s.stand && <span className="text-[10px] font-mono bg-surface-2 text-text-2 px-1.5 py-0.5 rounded">{s.stand}</span>}
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${manual ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-light'}`}>
              {manual ? 'Manual' : 'De una boleta'}
            </span>
            {borrador && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning">Borrador</span>}
            {!s.activo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger/15 text-danger">Desactivado</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button onClick={onEditar} aria-label="Editar"
            className="w-8 h-8 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
          <button onClick={onBorrar} aria-label="Eliminar"
            className="w-8 h-8 rounded-lg text-text-3 hover:text-danger hover:bg-danger/10 flex items-center justify-center">
            <Icono name="cerrar" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {s.descripcion && <p className="text-xs text-text-3 line-clamp-2">{s.descripcion}</p>}

      {/* ¿Puede operar? Un stand sin motivos no puede registrar nada, y eso solo
          se descubría cuando el expositor lo intentaba. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        <Senal ok={s.tiene_motivos} si="con motivos" no="sin motivos que registrar" />
        <Senal ok={s.tiene_premios} si="con premios" no="sin premios" neutro />
      </div>

      {/* Lo que ha repartido */}
      <div className="rounded-xl bg-surface-2/50 border border-border px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] text-text-3">Puntos otorgados</p>
          <p className="text-sm font-semibold text-text-1 tabular-nums">
            {gastado}{conCuota && <span className="text-text-3 font-normal"> / {s.cuota_puntos}</span>}
          </p>
        </div>
        {conCuota && (
          <div className="mt-1.5 h-1 rounded-full bg-surface-3 overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-accent'}`}
              style={{ width: `${pct}%` }} />
          </div>
        )}
        <p className="text-[11px] text-text-3 mt-1">
          {p.veces || 0} registro{(p.veces || 0) !== 1 ? 's' : ''} · {p.asistentes_distintos || 0} asistente{(p.asistentes_distintos || 0) !== 1 ? 's' : ''}
          {conCuota && p.disponibles === 0 && <span className="text-danger"> · cuota agotada</span>}
          {!conCuota && <span className="text-text-3"> · sin cuota asignada</span>}
        </p>
      </div>

      {/* El portal del expositor */}
      {enlacePortal ? (
        <div className="flex items-center gap-2">
          <a href={enlacePortal} target="_blank" rel="noreferrer noopener" className="btn-secondary btn-sm flex-1 justify-center">
            Abrir su portal
          </a>
          <button onClick={copiarEnlace} className="btn-ghost btn-sm" title="Copiar el enlace para pasárselo">Copiar</button>
        </div>
      ) : (
        <p className="text-[11px] text-text-3 border-l-2 border-border pl-2 leading-snug">
          Este stand se creó a mano, así que no tiene portal: el expositor entra con el código de
          una boleta de stand.
        </p>
      )}
    </div>
  );
}

function Senal({ ok, si, no, neutro }) {
  return (
    <span className={`inline-flex items-center gap-1 ${ok ? 'text-success' : neutro ? 'text-text-3' : 'text-warning'}`}>
      <Icono name={ok ? 'check' : 'aviso'} className="w-3 h-3" />
      {ok ? si : no}
    </span>
  );
}

/* ─────────── Bolsa de puntos del evento ───────────

   El organizador define un total y reparte cuota por stand. Antes cada stand
   podía otorgar sin límite, así que la economía del evento dependía de que
   nadie se pasara — y la gracia de una gamificación es justo controlar cuánto
   se reparte. El tope lo aplica además un trigger en la base: si mañana
   aparece otro camino para dar puntos, sigue valiendo. */
function BolsaPuntos({ evento, soyOwner }) {
  const { success, error: toastErr } = useToast();
  const [bolsa, setBolsa] = useState(null);
  const [reparto, setReparto] = useState([]);
  const [listo, setListo] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [total, setTotal] = useState('');
  const [cuotas, setCuotas] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const d = await networkingApi.bolsa(evento.id);
      setBolsa(d.bolsa || null);
      setReparto(d.reparto || []);
      setListo(d.almacenamiento_listo !== false);
      setTotal(d.bolsa?.bolsa_total != null ? String(d.bolsa.bolsa_total) : '');
      const c = {};
      for (const r of (d.reparto || [])) c[r.expositor_id] = r.cuota_puntos != null ? String(r.cuota_puntos) : '';
      setCuotas(c);
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setCargando(false); }
  }, [evento.id, toastErr]);

  useEffect(() => { cargar(); }, [cargar]);

  const sumaCuotas = Object.values(cuotas).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalNum = Number(total) || 0;
  const sobra = total !== '' ? totalNum - sumaCuotas : null;

  const guardarTodo = async () => {
    setGuardando(true);
    try {
      await networkingApi.guardarBolsa(evento.id, { total: total === '' ? null : totalNum });
      const limpias = {};
      for (const [id, v] of Object.entries(cuotas)) limpias[id] = v === '' ? null : Number(v);
      await networkingApi.guardarCuotas(evento.id, limpias);
      success('Bolsa y reparto guardados.');
      await cargar();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setGuardando(false); }
  };

  /* Reparte lo que queda a partes iguales entre los stands sin cuota. Es lo que
     todo el mundo hace a mano con una calculadora. */
  const repartirParejo = () => {
    if (total === '') { toastErr('Primero pon el total de la bolsa.'); return; }
    const sinCuota = reparto.filter(r => !cuotas[r.expositor_id]);
    const objetivo = sinCuota.length ? sinCuota : reparto;
    if (!objetivo.length) return;
    const yaFijado = reparto
      .filter(r => !objetivo.some(o => o.expositor_id === r.expositor_id))
      .reduce((s, r) => s + (Number(cuotas[r.expositor_id]) || 0), 0);
    const porStand = Math.floor(Math.max(0, totalNum - yaFijado) / objetivo.length);
    setCuotas(c => {
      const n = { ...c };
      for (const r of objetivo) n[r.expositor_id] = String(porStand);
      return n;
    });
  };

  if (!soyOwner) return null;
  if (cargando) return <div className="card p-6"><Spinner size="md" /></div>;

  if (!listo) return (
    <div className="rounded-2xl bg-warning/10 border border-warning/25 px-4 py-3">
      <p className="text-sm text-text-1 font-medium">Falta aplicar la migración 0057</p>
      <p className="text-xs text-text-2 mt-0.5">La bolsa de puntos necesita las tablas nuevas.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-text-1">Bolsa de puntos del evento</h3>
        <p className="text-sm text-text-3 mt-0.5 leading-relaxed max-w-2xl">
          Define cuántos puntos se reparten en total y cuántos puede dar cada stand.
          Un stand no puede pasarse de su cuota. Si dejas una cuota vacía, ese stand
          no tiene tope.
        </p>
      </div>

      <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-end">
        <div className="field">
          <label className="label text-xs">Total de la bolsa</label>
          <input type="number" min="0" value={total} onChange={e => setTotal(e.target.value)}
            className="input rounded-xl py-2.5 text-sm" placeholder="Ej. 10000" />
        </div>
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <span className="text-text-3">Repartido: <strong className="text-text-1 tabular-nums">{sumaCuotas}</strong></span>
          {sobra !== null && (
            <span className={sobra < 0 ? 'text-danger' : 'text-text-3'}>
              {sobra < 0 ? `Te pasas por ${-sobra}` : `Sin asignar: `}
              {sobra >= 0 && <strong className="text-text-1 tabular-nums">{sobra}</strong>}
            </span>
          )}
          <span className="text-text-3">Otorgado real: <strong className="text-text-1 tabular-nums">{bolsa?.otorgado_real ?? 0}</strong></span>
          <button onClick={repartirParejo} className="btn-ghost btn-sm">Repartir parejo</button>
        </div>
      </div>

      {reparto.length === 0 ? (
        <p className="text-sm text-text-3">Todavía no hay stands a los que repartir.</p>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-3 border-b border-border bg-surface/60">
                <th className="px-4 py-2.5 font-semibold">Stand</th>
                <th className="px-4 py-2.5 font-semibold w-32">Cuota</th>
                <th className="px-4 py-2.5 font-semibold text-right">Ya dio</th>
                <th className="px-4 py-2.5 font-semibold text-right">Le queda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reparto.map(r => {
                const v = cuotas[r.expositor_id] ?? '';
                const dio = Number(r.otorgados || 0);
                const bajo = v !== '' && Number(v) < dio;
                return (
                  <tr key={r.expositor_id}>
                    <td className="px-4 py-2">
                      <p className="text-text-1">{r.nombre}</p>
                      {r.stand && <p className="text-[11px] font-mono text-text-3">{r.stand}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" min="0" value={v}
                        onChange={e => setCuotas(c => ({ ...c, [r.expositor_id]: e.target.value }))}
                        className={`input rounded-lg py-1.5 text-sm ${bajo ? 'border-danger' : ''}`} placeholder="sin tope" />
                      {bajo && <p className="text-[10px] text-danger mt-0.5">Ya dio {dio}</p>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-text-2">{dio}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {v === ''
                        ? <span className="text-text-3">sin tope</span>
                        : <span className={Number(v) - dio <= 0 ? 'text-danger' : 'text-text-1'}>{Math.max(0, Number(v) - dio)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={guardarTodo} disabled={guardando || (sobra !== null && sobra < 0)} className="btn-primary">
          {guardando ? <><Spinner size="sm" /> Guardando…</> : 'Guardar bolsa y reparto'}
        </button>
      </div>
    </div>
  );
}
