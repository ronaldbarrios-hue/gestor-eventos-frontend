/* Modal de confirmación estilizado, global.

   Uso (en cualquier parte, dentro o fuera de hooks):
     import { confirmDialog } from '../components/ui/Confirm.jsx';
     if (!(await confirmDialog({ message: '¿Borrar?', danger: true }))) return;

   Montar <ConfirmHost /> una sola vez (en App, junto a los providers).

   ── `escribir`: cuando un botón no basta ────────────────────────────────

   Con `escribir: 'ana@correo.com'` el modal pide que se teclee ese texto para
   habilitar el botón. Es para lo que no tiene vuelta atrás.

   El motivo no es poner una traba: es que un «¿seguro?» se contesta que sí sin
   leer —se aprende a despacharlo—, y teclear el correo de alguien obliga a
   mirar a QUIÉN se está borrando. La diferencia entre confirmar y leer.

   Se compara sin distinguir mayúsculas ni espacios de los extremos: quien
   copia y pega desde la fila de al lado se trae un espacio, y castigarlo por
   eso no protege de nada. */

import { useEffect, useState, useCallback } from 'react';
import { tEstatico as t } from '../../context/I18nContext.jsx';

let _open = null; // setter registrado por el host

export function confirmDialog(opts = {}) {
  return new Promise((resolve) => {
    if (!_open) { // fallback si el host no está montado
      /* Con `escribir` no vale un `window.confirm`: se pidió teclear algo
         justamente porque un botón no basta. Sin host, se dice que no — negar
         una acción que no tiene vuelta atrás es el lado seguro del error. */
      if (opts.escribir) { resolve(false); return; }
      resolve(typeof window !== 'undefined' ? window.confirm(opts.message || t('¿Confirmar?')) : false);
      return;
    }
    _open({
      title: opts.title || (opts.okOnly ? t('Aviso') : t('Confirmar')),
      message: opts.message || '',
      confirmLabel: opts.confirmLabel || (opts.okOnly ? t('Entendido') : t('Aceptar')),
      cancelLabel: opts.cancelLabel || t('Cancelar'),
      danger: !!opts.danger,
      okOnly: !!opts.okOnly,
      /* Lo que hay que teclear para habilitar el botón, y cómo llamarlo en la
         etiqueta del campo. */
      escribir: opts.escribir || null,
      escribirEtiqueta: opts.escribirEtiqueta || t('Escribe {que} para confirmar'),
      resolve,
    });
  });
}

/* Atajo para reemplazar alert(): muestra solo botón "Entendido". */
export function alertDialog(message, title) {
  return confirmDialog({ message, title, okOnly: true });
}

export function ConfirmHost() {
  const [state, setState] = useState(null);
  const [tecleado, setTecleado] = useState('');

  useEffect(() => {
    /* Se limpia al abrir: si no, el segundo borrado hereda lo que se escribió
       en el primero y el botón sale habilitado de entrada. */
    _open = (s) => { setTecleado(''); setState(s); };
    return () => { _open = null; };
  }, []);

  const igual = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  const falta = Boolean(state?.escribir) && !igual(tecleado, state.escribir);

  const close = useCallback((val) => {
    setState((s) => { s?.resolve?.(val); return null; });
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      /* Enter confirma… salvo que falte teclear lo que se pidió. Sin esto, la
         verificación se salta con una tecla y no protege de nada. */
      if (e.key === 'Enter' && !falta) close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, close, falta]);

  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm animate-fade-in"
           onClick={() => close(false)} />
      <div className="relative w-full max-w-md rounded-3xl border border-border-2 bg-surface
                      shadow-card-hover p-6 animate-scale-in">
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0
            ${state.danger ? 'bg-danger/15 text-danger' : 'bg-primary/15 text-primary-light'}`}>
            {state.danger ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-display font-bold text-text-1">{state.title}</h3>
            {state.message && (
              <p className="text-sm text-text-2 mt-1.5 leading-relaxed whitespace-pre-wrap">{state.message}</p>
            )}
          </div>
        </div>

        {state.escribir && (
          <label className="block mt-4">
            <span className="text-xs text-text-3">
              {state.escribirEtiqueta.replace('{que}', state.escribir)}
            </span>
            <input
              value={tecleado}
              onChange={e => setTecleado(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder={state.escribir}
              className="input mt-1.5 w-full text-sm font-mono"
            />
          </label>
        )}

        <div className="flex justify-end gap-2 mt-6">
          {!state.okOnly && (
            <button onClick={() => close(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-2 border border-border
                         hover:text-text-1 hover:border-border-2 transition">
              {state.cancelLabel}
            </button>
          )}
          {/* Con `escribir`, el foco va al campo y no al botón: enfocar el
              botón invita a pulsarlo, que es lo contrario de lo que se busca. */}
          <button onClick={() => close(true)} autoFocus={!state.escribir} disabled={falta}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition active:scale-95
              disabled:opacity-40 disabled:pointer-events-none
              ${state.danger ? 'bg-danger hover:opacity-90' : 'bg-gradient-primary hover:opacity-90'}`}>
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
