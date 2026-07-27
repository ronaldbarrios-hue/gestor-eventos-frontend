import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { eventosApi } from '../../api/eventos.js';
import { DESTINOS_ACCESO, SECCIONES_EVENTO } from '../../hooks/useAccesosDirectos.js';

/* ──────────────────────────────────────────────────────────────────
   Paleta de comandos ⌘K — saltar a cualquier parte de GESTEK con el
   teclado. Se abre con ⌘K / Ctrl+K en cualquier pantalla autenticada.
   Reutiliza el catálogo de accesos directos (destinos + secciones de
   evento) y añade "ir a un evento".
   ────────────────────────────────────────────────────────────────── */

function normaliza(s) { return (s || '').toString().toLowerCase(); }

export default function CommandPalette() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const [eventos, setEventos] = useState(null);   // lazy
  const inputRef = useRef(null);
  const listRef = useRef(null);

  /* evento activo si estamos dentro de /eventos/:id */
  const eventoId = useMemo(() => {
    const m = location.pathname.match(/^\/eventos\/([^/]+)/);
    const id = m?.[1];
    return id && !['nuevo'].includes(id) ? id : null;
  }, [location.pathname]);

  /* Atajo global ⌘K / Ctrl+K */
  useEffect(() => {
    if (!token) return;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [token]);

  /* Al abrir: reset + foco + carga perezosa de eventos */
  useEffect(() => {
    if (!open) return;
    setQ(''); setIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    if (eventos === null) {
      eventosApi.list({ limit: 50 }).then(d => setEventos(d.eventos || [])).catch(() => setEventos([]));
    }
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line

  /* Construye la lista de comandos según el contexto */
  const comandos = useMemo(() => {
    const cmds = [];
    // Navegación global
    for (const d of DESTINOS_ACCESO) cmds.push({ tipo: 'Ir a', label: d.label, kw: d.kw, run: () => navigate(d.to) });
    cmds.push({ tipo: 'Acción', label: 'Crear evento', kw: 'nuevo evento', run: () => navigate('/eventos/nuevo') });
    cmds.push({ tipo: 'Acción', label: 'Explorar vacantes', kw: 'empleo trabajo', run: () => navigate('/vacantes') });

    // Secciones del evento activo
    if (eventoId) {
      for (const s of SECCIONES_EVENTO) {
        cmds.push({ tipo: 'Sección', label: s.label, kw: s.kw, run: () => navigate(`/eventos/${eventoId}${s.q}`) });
      }
    }

    // Ir a un evento concreto
    for (const ev of eventos || []) {
      cmds.push({ tipo: 'Evento', label: ev.titulo, kw: 'abrir evento workspace', run: () => navigate(`/eventos/${ev.id}`) });
    }
    return cmds;
  }, [eventoId, eventos, navigate]);

  const filtrados = useMemo(() => {
    const t = normaliza(q).trim();
    if (!t) return comandos.slice(0, 40);
    return comandos.filter(c => `${c.label} ${c.kw || ''} ${c.tipo}`.toLowerCase().includes(t)).slice(0, 40);
  }, [q, comandos]);

  useEffect(() => { setIdx(0); }, [q]);

  const ejecutar = useCallback((c) => { if (!c) return; setOpen(false); c.run(); }, []);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtrados.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); ejecutar(filtrados[idx]); }
  };

  /* Mantén el ítem activo a la vista */
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${idx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  if (!token || !open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-border bg-bg shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <svg className="w-4 h-4 text-text-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar secciones, eventos, acciones…"
            className="flex-1 bg-transparent py-3.5 text-sm text-text-1 placeholder:text-text-3 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-text-3 border border-border rounded px-1.5 py-0.5 flex-shrink-0">esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-1.5">
          {filtrados.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-3">Sin resultados para “{q}”.</p>
          ) : filtrados.map((c, i) => (
            <button
              key={`${c.tipo}-${c.label}-${i}`}
              data-idx={i}
              onMouseEnter={() => setIdx(i)}
              onClick={() => ejecutar(c)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === idx ? 'bg-accent/10' : 'hover:bg-surface-2'}`}
            >
              <span className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0 ${i === idx ? 'bg-accent/20 text-accent-light' : 'bg-surface-2 text-text-3'}`}>{c.tipo}</span>
              <span className={`text-sm truncate ${i === idx ? 'text-text-1 font-medium' : 'text-text-2'}`}>{c.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[11px] text-text-3">
          <span className="flex items-center gap-1.5"><kbd className="font-mono border border-border rounded px-1">↑↓</kbd> navegar <kbd className="font-mono border border-border rounded px-1 ml-1">↵</kbd> abrir</span>
          <span className="flex items-center gap-1"><kbd className="font-mono border border-border rounded px-1">⌘</kbd><kbd className="font-mono border border-border rounded px-1">K</kbd></span>
        </div>
      </div>
    </div>
  );
}
