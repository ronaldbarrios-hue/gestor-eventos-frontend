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

import { useEffect, useState, useCallback, useRef } from 'react';
import { tEstatico as t } from '../../context/I18nContext.jsx';

let _open = null; // setter registrado por el host

export function confirmDialog(opts = {}) {
  return new Promise((resolve) => {
    if (!_open) { // fallback si el host no está montado
      /* Con `escribir` no vale un `window.confirm`: se pidió teclear algo
         justamente porque un botón no basta. Sin host, se dice que no — negar
         una acción que no tiene vuelta atrás es el lado seguro del error. */
      if (opts.escribir) { resolve(false); return; }
      /* Los dos respaldos van en un `try`, y esto no es precaución de más:
         medido en el navegador incrustado del editor, `prompt()` NO EXISTE y
         llamarlo LANZA —«prompt() is not supported»— en vez de devolver null.
         Pasa lo mismo en webviews embebidos y en pestañas en segundo plano.
         Sin el `try`, quien llamó a esto se lleva la excepción y la pantalla
         se cae por haber intentado preguntar un nombre. */
      if (opts.pedir) {
        /* Pedir un texto sí cae al del navegador cuando existe: no es una
           acción sin vuelta atrás —es ponerle nombre a algo— y quedarse sin
           poder hacerlo es peor que hacerlo en un recuadro feo. */
        try { resolve(window.prompt(opts.message || '', opts.valor || '')); }
        catch { resolve(null); }
        return;
      }
      try { resolve(window.confirm(opts.message || t('¿Confirmar?'))); }
      catch { resolve(false); }
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
      /* Pedir un texto libre, en vez de confirmar uno concreto. Reusa el mismo
         campo: son la misma pieza con dos preguntas distintas —«escribe ESTO»
         y «escribe lo que quieras»— y duplicarla habría duplicado también el
         foco, el Enter y el limpiado al abrir. */
      pedir: !!opts.pedir,
      pedirEtiqueta: opts.pedirEtiqueta || '',
      valor: opts.valor || '',
      resolve,
    });
  });
}

/* Atajo para reemplazar window.prompt(): pide un texto y devuelve lo escrito,
   o `null` si se canceló — el mismo contrato que el del navegador, para que
   quien lo sustituya no tenga que cambiar la comprobación de después.

   Se devuelve recortado: un nombre que empieza por espacio se ordena raro en
   la lista y nadie ve por qué. */
export function pedirTexto(opts = {}) {
  return confirmDialog({
    ...opts,
    pedir: true,
    confirmLabel: opts.confirmLabel || t('Guardar'),
  }).then(v => (typeof v === 'string' ? v.trim() : null));
}

/* Atajo para reemplazar alert(): muestra solo botón "Entendido". */
export function alertDialog(message, title) {
  return confirmDialog({ message, title, okOnly: true });
}

export function ConfirmHost() {
  const [state, setState] = useState(null);
  const [tecleado, setTecleado] = useState('');
  const campo = useRef(null);

  useEffect(() => {
    /* Se limpia al abrir: si no, el segundo borrado hereda lo que se escribió
       en el primero y el botón sale habilitado de entrada. */
    _open = (s) => { setTecleado(s?.valor || ''); setState(s); };
    return () => { _open = null; };
  }, []);

  const igual = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  /* Qué impide confirmar: con `escribir`, que no coincida; con `pedir`, que
     esté vacío — guardar un nombre en blanco deja una fila sin nombre, y eso
     no se deshace desde la propia lista. */
  const falta = state?.pedir
    ? !tecleado.trim()
    : (Boolean(state?.escribir) && !igual(tecleado, state.escribir));

  /* Al renombrar, el nombre de ahora sale seleccionado: se teclea el nuevo
     encima y ya está. Sin esto hay que borrar a mano lo que había, que es el
     gesto que hace que renombrar canse.

     Va aquí y no en un `onFocus`: medido en el navegador, el `select()` del
     `onFocus` no sobrevive al montaje —el campo salía enfocado y sin nada
     seleccionado—. Con `escribir` no se hace: ahí empieza vacío. */
  useEffect(() => {
    if (state?.pedir && campo.current) campo.current.select();
  }, [state]);

  const close = useCallback((val) => {
    setState((s) => { s?.resolve?.(val); return null; });
  }, []);

  /* Qué se devuelve al aceptar y al cancelar.
   *
   * Con `pedir` el contrato es el de `window.prompt` —el texto, o `null`— y no
   * el `true/false` de una confirmación. Va en estas dos funciones y no en
   * cada botón porque hay cuatro formas de salir de aquí: el botón, Escape,
   * Enter y pulsar fuera. Una que devuelva `false` donde se espera un texto
   * pasaría por un nombre válido. */
  const aceptar  = () => close(state?.pedir ? tecleado : true);
  const cancelar = () => close(state?.pedir ? null : false);

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === 'Escape') cancelar();
      /* Enter confirma… salvo que falte teclear lo que se pidió. Sin esto, la
         verificación se salta con una tecla y no protege de nada. */
      if (e.key === 'Enter' && !falta) aceptar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, close, falta, tecleado]);

  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm animate-fade-in"
           onClick={cancelar} />
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

        {(state.escribir || state.pedir) && (
          <label className="block mt-4">
            {/* La etiqueta sólo si hay algo que decir: con `pedir`, el mensaje
                de arriba suele ser ya la pregunta («¿Cómo se llama ahora?») y
                repetirla debajo del campo es ruido. */}
            {(state.escribir || state.pedirEtiqueta) && (
              <span className="text-xs text-text-3">
                {state.escribir
                  ? state.escribirEtiqueta.replace('{que}', state.escribir)
                  : state.pedirEtiqueta}
              </span>
            )}
            <input
              ref={campo}
              value={tecleado}
              onChange={e => setTecleado(e.target.value)}
              autoFocus
              autoComplete="off"
              /* El corrector, sólo fuera de `escribir`: ahí se teclea un correo
                 o un código y subrayarlo en rojo parece que está mal escrito.
                 Al poner un nombre, en cambio, ayuda. */
              spellCheck={!state.escribir}
              placeholder={state.escribir || ''}
              className={`input mt-1.5 w-full text-sm ${state.escribir ? 'font-mono' : ''}`}
            />
          </label>
        )}

        <div className="flex justify-end gap-2 mt-6">
          {!state.okOnly && (
            <button onClick={cancelar}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-2 border border-border
                         hover:text-text-1 hover:border-border-2 transition">
              {state.cancelLabel}
            </button>
          )}
          {/* Con `escribir`, el foco va al campo y no al botón: enfocar el
              botón invita a pulsarlo, que es lo contrario de lo que se busca. */}
          <button onClick={aceptar} autoFocus={!state.escribir && !state.pedir} disabled={falta}
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
