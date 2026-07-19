import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';

/* Recordatorios personales (localStorage; Fase 4 los lleva a Mi Espacio
   con sincronización). */
export default function RecordatoriosWidget() {
  const { usuario } = useAuth();
  const KEY = `gestek-recordatorios:${usuario?.id || 'anon'}`;
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  });
  const [texto, setTexto] = useState('');

  const persist = (next) => { setItems(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ } };
  const agregar = (e) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    persist([{ id: Date.now(), texto: t }, ...items].slice(0, 20));
    setTexto('');
  };
  const completar = (id) => persist(items.filter(i => i.id !== id));

  return (
    <div className="h-full flex flex-col">
      <form onSubmit={agregar} className="p-4 pb-2">
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Agregar recordatorio…"
          className="w-full h-9 px-3 rounded-xl bg-surface-2 border border-border text-sm text-text-1
                     placeholder:text-text-3 focus:outline-none focus:border-accent/50"
        />
      </form>
      <ul className="flex-1 px-4 pb-4 space-y-1.5 overflow-y-auto no-scrollbar">
        {items.map(i => (
          <li key={i.id} className="flex items-start gap-2.5 group">
            <button
              onClick={() => completar(i.id)}
              aria-label="Completar"
              className="w-4 h-4 mt-0.5 rounded-full border border-border-2 hover:border-accent hover:bg-accent/20 transition-colors flex-shrink-0"
            />
            <p className="text-sm text-text-1 leading-snug">{i.texto}</p>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-text-2 text-center py-4">Sin recordatorios pendientes.</p>}
      </ul>
    </div>
  );
}
