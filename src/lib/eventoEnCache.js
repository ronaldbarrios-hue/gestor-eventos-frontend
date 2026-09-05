/* Lo mínimo del evento para que la puerta funcione sin conexión.
 *
 * ── El eslabón que faltaba ───────────────────────────────────────────────
 *
 * El service worker ya hace que la aplicación ABRA sin internet, y la cola
 * guarda los escaneos. Pero entre las dos cosas el panel del evento pide el
 * evento al servidor, y sin red eso fallaba: se veía «Network Error» y un
 * botón para volver a la lista. La aplicación abría y no había escáner.
 *
 * ── Por qué se guarda RECORTADO ──────────────────────────────────────────
 *
 * El evento entero lleva `page_json` con los bloques de la landing, el lienzo
 * y los marcadores del mapa: puede ser grande. Y comparte `localStorage` con
 * la cola de escaneos — que es lo único que no se puede perder. Guardar el
 * evento completo podría llenar el almacenamiento y dejar sin sitio a un
 * escaneo, o sea cambiar un problema por otro peor.
 *
 * Así que se guarda sólo lo que la puerta usa: el id, cómo se llama, las
 * puertas y las zonas. Son unos pocos kilobytes.
 *
 * ── Por qué esto no relaja ningún permiso ────────────────────────────────
 *
 * Se guardan también los permisos, pero sólo deciden qué pestañas se dibujan.
 * Cada acción la sigue autorizando el SERVIDOR en cada llamada, y los escaneos
 * guardados se validan al sincronizar. Una lista de permisos vieja como mucho
 * enseña un botón que después contesta 403 — nunca deja hacer algo que no se
 * pueda.
 */

const KEY = (eventoId) => `gestek-evento-cache:${eventoId}`;

/* Lo que se guarda, y nada más. La lista es explícita para que añadir un campo
   sea una decisión y no un descuido: cada cosa que entre aquí ocupa sitio que
   la cola de escaneos puede necesitar. */
function recortar(evento) {
  const pj = evento?.page_json || {};
  return {
    id: evento?.id,
    titulo: evento?.titulo,
    slug: evento?.slug,
    estado: evento?.estado,
    page_json: {
      accesos: Array.isArray(pj.accesos) ? pj.accesos : [],
      zonas: Array.isArray(pj.zonas) ? pj.zonas : [],
    },
  };
}

export function guardarEvento(eventoId, { evento, permisos, soyOwner, miRolId }) {
  try {
    localStorage.setItem(KEY(eventoId), JSON.stringify({
      evento: recortar(evento),
      permisos, soyOwner, miRolId,
      guardado_at: new Date().toISOString(),
    }));
    return true;
  } catch {
    /* Si no cabe, no se guarda y ya. Esto es una comodidad; la cola de
       escaneos es lo que no se puede perder, y prefiere el sitio. */
    return false;
  }
}

export function leerEvento(eventoId) {
  try {
    const crudo = localStorage.getItem(KEY(eventoId));
    if (!crudo) return null;
    const d = JSON.parse(crudo);
    return d?.evento?.id ? d : null;
  } catch {
    return null;
  }
}
