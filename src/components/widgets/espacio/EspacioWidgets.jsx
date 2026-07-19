import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEspacioData } from './EspacioData.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { tareasApi } from '../../../api/tareas.js';
import { uploadEventImage } from '../../../components/ui/CoverUploader.jsx';

/* ──────────────────────────────────────────────────────────────────
   Widgets de Mi Espacio — Rework Fase 4
   El espacio personal del trabajador: lo suyo, de todos sus eventos.
   ────────────────────────────────────────────────────────────────── */

/* ── Mis tareas (cross-evento) ── */
export function MisTareasWidget() {
  const { tareas, loading, refrescar } = useEspacioData();
  const { usuario } = useAuth();
  const { success, error } = useToast();
  const [completando, setCompletando] = useState(null);

  const mias = tareas
    .filter(t => t.estado !== 'hecho')
    .filter(t => !t.asignado_id || String(t.asignado_id) === String(usuario?.id))
    .sort((a, b) => new Date(a.vence_at || '2999') - new Date(b.vence_at || '2999'))
    .slice(0, 7);

  const completar = async (t) => {
    setCompletando(t.id);
    try { await tareasApi.editar(t.evento.id, t.id, { estado: 'hecho' }); success('Tarea completada.'); refrescar(); }
    catch (e) { error(e.response?.data?.error || e.message); }
    finally { setCompletando(null); }
  };

  if (loading) return <p className="text-sm text-text-3 p-5">Cargando tus tareas…</p>;
  if (mias.length === 0) return <p className="text-sm text-text-2 text-center py-8 px-5">Sin tareas pendientes. ✨</p>;

  return (
    <ul className="divide-y divide-border">
      {mias.map(t => {
        const vencida = t.vence_at && new Date(t.vence_at) < new Date();
        return (
          <li key={`${t.evento.id}-${t.id}`} className="flex items-center gap-3 px-5 py-2.5 group">
            <button
              onClick={() => completar(t)}
              disabled={completando === t.id}
              aria-label="Completar tarea"
              className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-full border-2 border-border-2 hover:border-accent hover:bg-accent/20 transition-colors flex-shrink-0 disabled:opacity-40"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-1 truncate">{t.titulo}</p>
              <p className="text-[11px] text-text-3 truncate">{t.evento.titulo}</p>
            </div>
            {t.vence_at && (
              <span className={`text-xs tabular-nums flex-shrink-0 ${vencida ? 'text-danger font-medium' : 'text-text-3'}`}>
                {new Date(t.vence_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ── Mis solicitudes ── */
export function MisSolicitudesWidget() {
  const { solicitudes, loading } = useEspacioData();
  const items = solicitudes.slice(0, 6);
  if (loading) return <p className="text-sm text-text-3 p-5">Cargando…</p>;
  if (items.length === 0) return <p className="text-sm text-text-2 text-center py-8 px-5">No has enviado solicitudes.</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((s, i) => (
        <li key={s.id || i} className="px-5 py-2.5">
          <p className="text-sm text-text-1 truncate">{s.titulo || s.contenido?.slice(0, 60) || '(sin texto)'}</p>
          <p className="text-[11px] text-text-3 truncate">{s.evento_titulo} · <span className="capitalize">{s.estado}</span></p>
        </li>
      ))}
    </ul>
  );
}

/* ── Mi calendario ── */
export function MiCalendarioWidget() {
  const { eventos, loading } = useEspacioData();
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const proximos = eventos
    .filter(e => e.fecha_inicio && new Date(e.fecha_inicio) >= hoy)
    .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))
    .slice(0, 5);
  if (loading) return <p className="text-sm text-text-3 p-5">Cargando…</p>;
  if (proximos.length === 0) return <p className="text-sm text-text-2 text-center py-8 px-5">Sin compromisos próximos.</p>;
  return (
    <ul className="divide-y divide-border">
      {proximos.map(e => {
        const f = new Date(e.fecha_inicio);
        return (
          <li key={e.id}>
            <Link to={`/eventos/${e.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-2/50 transition-colors">
              <div className="w-10 rounded-xl bg-surface-2 text-center py-1 flex-shrink-0">
                <p className="text-[9px] uppercase text-text-3 leading-none">{f.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}</p>
                <p className="text-sm font-bold font-display text-text-1">{f.getDate()}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-1 truncate">{e.titulo}</p>
                <p className="text-[11px] text-text-3">{f.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ── Mis recursos (PDFs, diapositivas, archivos de trabajo) ── */
const EXT_ICON = { pdf: '📄', ppt: '📊', pptx: '📊', doc: '📝', docx: '📝', xls: '📈', xlsx: '📈', png: '🖼️', jpg: '🖼️', jpeg: '🖼️' };

export function MisRecursosWidget() {
  const { usuario } = useAuth();
  const { success, error } = useToast();
  const KEY = `gestek-recursos:${usuario?.id || 'anon'}`;
  const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } });
  const [subiendo, setSubiendo] = useState(false);

  const persist = (next) => { setItems(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ } };

  const subir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { error('Máximo 25 MB por archivo.'); return; }
    setSubiendo(true);
    try {
      const url = await uploadEventImage(file, `usuario-${usuario.id}`, 'recurso');
      persist([{ id: Date.now(), nombre: file.name, url, ext: file.name.split('.').pop().toLowerCase() }, ...items].slice(0, 30));
      success('Recurso subido.');
    } catch (x) { error(x.message); }
    finally { setSubiendo(false); }
  };

  const quitar = (id) => persist(items.filter(i => i.id !== id));

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-2">
        <label className={`btn-secondary btn-sm w-full justify-center cursor-pointer ${subiendo ? 'opacity-50 pointer-events-none' : ''}`}>
          {subiendo ? 'Subiendo…' : '+ Subir PDF, diapositivas o archivo'}
          <input type="file" className="hidden" onChange={subir}
                 accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" />
        </label>
      </div>
      <ul className="flex-1 divide-y divide-border overflow-y-auto no-scrollbar">
        {items.map(i => (
          <li key={i.id} className="flex items-center gap-2.5 px-4 py-2 group">
            <span className="text-base flex-shrink-0">{EXT_ICON[i.ext] || '📁'}</span>
            <a href={i.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-sm text-text-1 hover:text-accent truncate transition-colors">
              {i.nombre}
            </a>
            <button onClick={() => quitar(i.id)} aria-label="Quitar"
                    className="opacity-0 group-hover:opacity-100 text-text-3 hover:text-danger transition-all text-xs px-1">✕</button>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-text-2 text-center py-6 px-4">Guarda aquí tu material de trabajo.</p>}
      </ul>
    </div>
  );
}

/* ── Mis notas ── */
export function MisNotasWidget() {
  const { usuario } = useAuth();
  const KEY = `gestek-notas:${usuario?.id || 'anon'}`;
  const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } });
  const [texto, setTexto] = useState('');

  const persist = (next) => { setItems(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ } };
  const agregar = (e) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    persist([{ id: Date.now(), texto: t }, ...items].slice(0, 30));
    setTexto('');
  };

  return (
    <div className="h-full flex flex-col">
      <form onSubmit={agregar} className="p-4 pb-2">
        <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Escribir nota rápida…"
               className="w-full h-9 px-3 rounded-xl bg-surface-2 border border-border text-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:border-accent/50" />
      </form>
      <ul className="flex-1 px-4 pb-4 space-y-1.5 overflow-y-auto no-scrollbar">
        {items.map(n => (
          <li key={n.id} className="flex items-start gap-2 group rounded-xl bg-surface-2/60 px-3 py-2">
            <p className="text-sm text-text-1 leading-snug flex-1">{n.texto}</p>
            <button onClick={() => persist(items.filter(i => i.id !== n.id))} aria-label="Borrar"
                    className="opacity-0 group-hover:opacity-100 text-text-3 hover:text-danger transition-all text-xs">✕</button>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-text-2 text-center py-4">Sin notas.</p>}
      </ul>
    </div>
  );
}

/* ── Mis logros (gamificación) ── */
export function MisLogrosWidget() {
  const { loyalty, loading } = useEspacioData();
  const puntos = loyalty?.puntos ?? loyalty?.saldo ?? 0;
  const nivel  = loyalty?.nivel || null;
  return (
    <div className="p-5 flex flex-col h-full">
      <div className="flex items-center gap-4 mb-4">
        <span className="w-12 h-12 rounded-2xl bg-warning/15 text-warning text-xl flex items-center justify-center">🏆</span>
        <div>
          <p className="text-2xl font-bold font-display text-text-1 tabular-nums">{loading ? '—' : puntos.toLocaleString('es-CO')}</p>
          <p className="text-xs text-text-3">Puntos acumulados{nivel ? ` · Nivel ${nivel}` : ''}</p>
        </div>
      </div>
      <Link to="/recompensas" className="mt-auto btn-secondary btn-sm justify-center">Ver logros y recompensas</Link>
    </div>
  );
}

/* ── Mis boletas ── */
export function MisBoletasWidget() {
  const { boletas, loading } = useEspacioData();
  const proximas = boletas.slice(0, 3);
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 px-5 py-4">
        {loading ? <p className="text-sm text-text-3">Cargando…</p>
          : proximas.length === 0 ? <p className="text-sm text-text-2">No tienes boletas activas.</p>
          : (
            <ul className="space-y-2.5">
              {proximas.map((b, i) => (
                <li key={b.id || i} className="flex items-center gap-2.5">
                  <span className="text-base">🎟️</span>
                  <div className="min-w-0">
                    <p className="text-sm text-text-1 truncate">{b.evento_titulo || b.evento?.titulo || 'Evento'}</p>
                    <p className="text-[11px] text-text-3 capitalize">{b.estado || 'confirmada'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>
      <Link to="/mis-boletas" className="block text-center text-sm text-accent hover:underline py-3 border-t border-border">Ver mis boletas →</Link>
    </div>
  );
}

/* ── Mi actividad (notificaciones propias) ── */
export function MiActividadWidget() {
  const { notifs, loading } = useEspacioData();
  const items = notifs.slice(0, 6);
  if (loading) return <p className="text-sm text-text-3 p-5">Cargando…</p>;
  if (items.length === 0) return <p className="text-sm text-text-2 text-center py-8 px-5">Sin actividad reciente.</p>;
  return (
    <ul className="px-5 py-3 space-y-3">
      {items.map(n => (
        <li key={n.id} className="flex gap-2.5 items-start">
          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${n.leida ? 'bg-text-3/40' : 'bg-accent'}`} />
          <p className="text-sm text-text-1 leading-snug truncate">{n.titulo}</p>
        </li>
      ))}
    </ul>
  );
}
