import { useState } from 'react';
import { createPortal } from 'react-dom';
import { torneosApi } from '../../../api/torneos.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import { armarArbol, ARBOL_SUGERIDO } from '../../../lib/torneoCategorias.js';

/* ──────────────────────────────────────────────────────────────────
   #48 · El árbol de categorías de torneos.

   Antes clasificar un torneo era escribir una palabra en `disciplina`. Con
   tres torneos funciona; con treinta —una convención con deportes, juegos de
   mesa y gaming a la vez— no hay forma de agrupar ni de navegar.

   Aquí se construye el árbol: Torneos → deportes → contacto → los torneos
   concretos, con los niveles que hagan falta. Cada rama se añade colgando de
   otra, y borrar una NO borra torneos: los deja sin clasificar, sueltos, que
   es lo único aceptable cuando alguien reorganiza sus etiquetas.
   ────────────────────────────────────────────────────────────────── */

export default function CategoriasTorneo({ evento, categorias, onCambio, onClose }) {
  const { success, error: toastErr } = useToast();
  const [creandoEn, setCreandoEn] = useState(undefined); // undefined = ninguno; null = raíz
  const [nombre, setNombre] = useState('');
  const [editando, setEditando] = useState(null);
  const [working, setWorking] = useState(false);

  const arbol = armarArbol(categorias);

  const crear = async (padreId) => {
    const n = nombre.trim();
    if (!n) return;
    setWorking(true);
    try {
      await torneosApi.crearCategoria(evento.id, { nombre: n, padre_id: padreId || null });
      setNombre('');
      setCreandoEn(undefined);
      await onCambio();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setWorking(false); }
  };

  const renombrar = async (cat, nuevo) => {
    if (!nuevo.trim() || nuevo.trim() === cat.nombre) { setEditando(null); return; }
    try {
      await torneosApi.editarCategoria(evento.id, cat.id, { nombre: nuevo.trim() });
      await onCambio();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setEditando(null); }
  };

  const borrar = async (cat) => {
    const hijas = (cat.hijos || []).length;
    const ok = await confirmDialog({
      title: `Borrar «${cat.nombre}»`,
      message: hijas > 0
        ? `Se borra también lo que cuelga de ella (${hijas} ${hijas === 1 ? 'rama' : 'ramas'}). Los torneos NO se borran: quedan sin clasificar.`
        : 'Los torneos que estuvieran aquí no se borran: quedan sin clasificar.',
      confirmLabel: 'Borrar categoría',
      danger: true,
    });
    if (!ok) return;
    try {
      const r = await torneosApi.borrarCategoria(evento.id, cat.id);
      success(r.torneos_sin_clasificar > 0
        ? `Categoría borrada. ${r.torneos_sin_clasificar} torneo${r.torneos_sin_clasificar > 1 ? 's quedaron' : ' quedó'} sin clasificar.`
        : 'Categoría borrada.');
      await onCambio();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  /* Un punto de partida para quien no quiere inventarse el árbol entero. Se
     crea en serie porque cada hija necesita el id de su madre. */
  const sembrarSugerido = async () => {
    setWorking(true);
    try {
      for (const raiz of ARBOL_SUGERIDO) {
        const { categoria } = await torneosApi.crearCategoria(evento.id, { nombre: raiz.nombre });
        for (const hija of (raiz.hijos || [])) {
          await torneosApi.crearCategoria(evento.id, { nombre: hija.nombre, padre_id: categoria.id });
        }
      }
      success('Árbol sugerido creado. Renombra o borra lo que no te sirva.');
      await onCambio();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setWorking(false); }
  };

  const Rama = ({ cat }) => (
    <li>
      <div className="flex items-center gap-1.5 group py-1">
        <span className="text-text-3 text-xs select-none" aria-hidden="true">
          {cat.hijos.length ? '▾' : '·'}
        </span>
        {editando === cat.id ? (
          <input
            defaultValue={cat.nombre}
            autoFocus
            onBlur={e => renombrar(cat, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setEditando(null);
            }}
            className="input !h-8 text-sm flex-1 max-w-[240px]" />
        ) : (
          <button onClick={() => setEditando(cat.id)}
            className="text-sm text-text-1 hover:text-accent transition-colors text-left">
            {cat.nombre}
          </button>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setCreandoEn(cat.id); setNombre(''); }}
            title="Añadir dentro" className="text-xs text-text-3 hover:text-accent px-1">+</button>
          <button onClick={() => borrar(cat)}
            title="Borrar" className="text-xs text-text-3 hover:text-danger px-1">×</button>
        </div>
      </div>

      {creandoEn === cat.id && (
        <div className="flex items-center gap-1.5 pl-5 py-1">
          <input
            value={nombre}
            autoFocus
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') crear(cat.id);
              if (e.key === 'Escape') setCreandoEn(undefined);
            }}
            placeholder={`Dentro de ${cat.nombre}…`}
            className="input !h-8 text-sm flex-1 max-w-[240px]" />
          <button onClick={() => crear(cat.id)} disabled={working} className="btn btn-sm">Añadir</button>
          <button onClick={() => setCreandoEn(undefined)} className="btn-ghost btn-sm">Cancelar</button>
        </div>
      )}

      {cat.hijos.length > 0 && (
        <ul className="pl-5 border-l border-border ml-1.5">
          {cat.hijos.map(h => <Rama key={h.id} cat={h} />)}
        </ul>
      )}
    </li>
  );

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-text-1">Categorías de torneos</h3>
            <p className="text-xs text-text-3 mt-0.5">
              Deportes → contacto → los torneos. Tantos niveles como necesites.
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-text-3 hover:text-text-1">✕</button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {arbol.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
              <p className="text-sm text-text-2 mb-4">
                Todavía no hay categorías. Los torneos aparecen sueltos, que está bien si
                son pocos.
              </p>
              <button onClick={sembrarSugerido} disabled={working} className="btn-secondary btn-sm">
                {working ? 'Creando…' : 'Empezar con el árbol sugerido'}
              </button>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {arbol.map(c => <Rama key={c.id} cat={c} />)}
            </ul>
          )}

          {creandoEn === null ? (
            <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-border">
              <input
                value={nombre}
                autoFocus
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') crear(null);
                  if (e.key === 'Escape') setCreandoEn(undefined);
                }}
                placeholder="Nueva categoría principal…"
                className="input !h-9 text-sm flex-1" />
              <button onClick={() => crear(null)} disabled={working} className="btn btn-sm">Añadir</button>
              <button onClick={() => setCreandoEn(undefined)} className="btn-ghost btn-sm">Cancelar</button>
            </div>
          ) : (
            <button onClick={() => { setCreandoEn(null); setNombre(''); }}
              className="mt-3 text-sm text-accent hover:underline">
              + Categoría principal
            </button>
          )}
        </div>

        <footer className="px-6 py-3 border-t border-border flex-shrink-0">
          <p className="text-[11px] text-text-3">
            Toca un nombre para renombrarlo. Borrar una categoría no borra sus torneos.
          </p>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
