import { useState } from 'react';
import { eventosApi } from '../../../api/eventos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';

/* Automatizaciones — "cuando pasa X, haz Y". Reglas guardadas en
   page_json.automatizaciones; el backend las dispara en check-in y aforo lleno. */

const TRIGGERS = [
  { id: 'checkin',     label: 'Cuando alguien hace check-in', vars: '{{nombre}}, {{acceso}}' },
  { id: 'aforo_lleno', label: 'Cuando una zona llega a su aforo', vars: '{{zona}}' },
];
const ACCIONES = [
  { id: 'alerta',              label: 'Crear una alerta en vivo' },
  { id: 'notificar_asistente', label: 'Notificar al asistente', soloCon: ['checkin'] },
];
const uid = () => 'auto_' + Math.random().toString(36).slice(2, 9);

export default function AutomatizacionesSection({ evento }) {
  const { success, error: toastErr } = useToast();
  const [reglas, setReglas] = useState(() => (evento.page_json?.automatizaciones || []).map(r => ({ ...r, _k: r.id || uid() })));
  const [saving, setSaving] = useState(false);

  const set = (k, patch) => setReglas(l => l.map(r => r._k === k ? { ...r, ...patch } : r));
  const agregar = () => setReglas(l => [...l, { _k: uid(), id: uid(), activo: true, trigger: 'checkin', accion: 'alerta', mensaje: '' }]);
  const quitar = (k) => setReglas(l => l.filter(r => r._k !== k));

  const guardar = async () => {
    setSaving(true);
    try {
      const limpio = reglas.map(({ id, activo, trigger, accion, mensaje }) => ({ id, activo: activo !== false, trigger, accion, mensaje: mensaje || '' }));
      await eventosApi.update(evento.id, { page_json: { automatizaciones: limpio } });
      success('Automatizaciones guardadas.');
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">Automatizaciones</h2>
          <p className="text-sm text-text-2 mt-1">Reglas simples «cuando pasa X, haz Y». Se ejecutan solas durante el evento.</p>
        </div>
        <button onClick={guardar} disabled={saving} className="btn-primary">{saving ? <><Spinner size="sm" /> Guardando…</> : 'Guardar'}</button>
      </div>

      {reglas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
          <p className="text-sm text-text-3 mb-4">Aún no hay automatizaciones. Crea una regla para reaccionar a lo que pasa en tu evento.</p>
          <button onClick={agregar} className="btn-primary btn-sm">+ Nueva automatización</button>
        </div>
      ) : (
        <div className="space-y-3">
          {reglas.map(r => {
            const trig = TRIGGERS.find(t => t.id === r.trigger);
            const accionesValidas = ACCIONES.filter(a => !a.soloCon || a.soloCon.includes(r.trigger));
            return (
              <div key={r._k} className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer">
                    <input type="checkbox" checked={r.activo !== false} onChange={e => set(r._k, { activo: e.target.checked })} className="w-4 h-4 rounded accent-primary" />
                    Activa
                  </label>
                  <button onClick={() => quitar(r._k)} className="w-8 h-8 rounded-lg text-danger-light hover:bg-danger/10 flex items-center justify-center">✕</button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="field">
                    <label className="label text-xs">Cuando…</label>
                    <select value={r.trigger} onChange={e => {
                      const nuevoTrigger = e.target.value;
                      const validas = ACCIONES.filter(a => !a.soloCon || a.soloCon.includes(nuevoTrigger));
                      set(r._k, { trigger: nuevoTrigger, accion: validas.some(a => a.id === r.accion) ? r.accion : validas[0].id });
                    }} className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                      {TRIGGERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label text-xs">Haz…</label>
                    <select value={r.accion} onChange={e => set(r._k, { accion: e.target.value })} className="input bg-surface-2 rounded-xl py-2.5 text-sm">
                      {accionesValidas.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="label text-xs">Mensaje</label>
                  <input value={r.mensaje || ''} onChange={e => set(r._k, { mensaje: e.target.value })}
                    className="input rounded-xl py-2.5 text-sm" placeholder={r.accion === 'notificar_asistente' ? 'Ej. ¡Bienvenido, {{nombre}}!' : 'Ej. Zona {{zona}} llena'} />
                  {trig && <p className="text-[11px] text-text-3 mt-1">Puedes usar: <span className="font-mono">{trig.vars}</span></p>}
                </div>
              </div>
            );
          })}
          <button onClick={agregar} className="btn-ghost btn-sm">+ Añadir automatización</button>
        </div>
      )}

      <p className="text-xs text-text-3">Más adelante se sumarán disparadores (compra confirmada, nueva postulación…) y acciones (enviar email) cuando se conecten los servicios externos.</p>
    </div>
  );
}
