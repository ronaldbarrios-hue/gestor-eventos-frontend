/* Cerrar una ventana sin tirar lo que alguien acaba de escribir.
 *
 * ── El problema, dicho por quien lo usa ──────────────────────────────────
 *
 * «Suele pasar mucho que se abre una nueva ventana y al dar click por fuera se
 * pierde el progreso de todo.»
 *
 * Y es literal: trece ventanas de la aplicación tienen el fondo cableado
 * directo a `onClose`. Para una que sólo enseña algo está bien —cerrar es
 * gratis—. Para una donde se han escrito ocho preguntas, un clic a dos
 * centímetros del borde borra veinte minutos, sin preguntar y sin deshacer.
 *
 * ── Por qué esto y no convertirlas en páginas ────────────────────────────
 *
 * La ventana no es el problema: el problema es que cerrar sea gratis cuando
 * hay trabajo dentro. Una página propia arregla eso y trae lo suyo —una ruta,
 * un sitio al que volver, perder de vista la lista desde la que se entró— y
 * son trece pantallas. El daño real está en que no se avise.
 *
 * ── Qué hace ─────────────────────────────────────────────────────────────
 *
 * Devuelve un `cerrar` que se puede poner en el fondo, en la ✕ y en Escape:
 *   · sin cambios → cierra, como siempre;
 *   · con cambios → pregunta, y sólo cierra si se dice que sí.
 *
 * `hayCambios` lo decide quien llama, porque sólo esa pantalla sabe qué es un
 * cambio. Si no se le pasa nada, se comporta como antes — así adoptarlo nunca
 * empeora lo que ya había.
 */
import { useCallback, useEffect, useRef } from 'react';
import { confirmDialog } from './Confirm.jsx';

export const AVISO_CAMBIOS_SIN_GUARDAR =
  'Escribiste cosas que todavía no se han guardado. Si cierras ahora se pierden.';

export function useCierreSeguro(hayCambios, onClose, opciones = {}) {
  /* En una `ref` y no en las dependencias: si no, cada tecla que se escribe
     reconstruye `cerrar` y vuelve a montar el listener de Escape. */
  const sucio = useRef(false);
  sucio.current = Boolean(hayCambios);

  const preguntando = useRef(false);

  const cerrar = useCallback(async () => {
    if (!sucio.current) { onClose?.(); return; }
    /* Dos clics fuera seguidos no deben apilar dos preguntas. */
    if (preguntando.current) return;
    preguntando.current = true;
    try {
      const ok = await confirmDialog({
        title: 'Hay cambios sin guardar',
        message: opciones.mensaje || AVISO_CAMBIOS_SIN_GUARDAR,
        confirmLabel: 'Cerrar y perderlos',
        cancelLabel: 'Seguir editando',
        danger: true,
      });
      if (ok) onClose?.();
    } finally { preguntando.current = false; }
  }, [onClose, opciones.mensaje]);

  /* Escape cierra por el mismo camino. Iba suelto en cada ventana —o no iba—,
     y una tecla que borra el trabajo sin avisar es peor que un clic fuera:
     nadie la pulsa a propósito. */
  useEffect(() => {
    const alTeclado = (e) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [cerrar]);

  return cerrar;
}

/* Para el fondo: sólo cuenta el clic en el fondo mismo, no el que sube desde
   dentro. Va aquí para no repetir el `stopPropagation` en cada tarjeta —que es
   donde se olvida, y entonces pulsar un campo cierra la ventana. */
export function alPulsarElFondo(cerrar) {
  return (e) => { if (e.target === e.currentTarget) cerrar(); };
}

/* ── Y cuando lo que se cierra es la pestaña ─────────────────────────────
 *
 * Lo de arriba cubre una ventana dentro de la aplicación. No cubre recargar,
 * pulsar «atrás», o cerrar la pestaña — y ahí la aplicación no puede preguntar
 * nada por su cuenta: sólo el navegador puede, y sólo si se lo pide.
 *
 * Medido: no había un solo `beforeunload` en toda la aplicación. Un asistente
 * llenando veintiuna preguntas de la batalla de pitch que roza «atrás» pierde
 * las veintiuna, sin aviso. El navegador enseña su propio texto —no se puede
 * cambiar, y da igual el que se ponga—; lo que importa es que salga.
 *
 * Sólo mientras haya algo que perder: registrado siempre, el navegador
 * pregunta al salir de cualquier página y se aprende a decir que sí. */
export function useAvisoAlSalir(hayCambios) {
  useEffect(() => {
    if (!hayCambios) return undefined;
    const alSalir = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', alSalir);
    return () => window.removeEventListener('beforeunload', alSalir);
  }, [hayCambios]);
}
