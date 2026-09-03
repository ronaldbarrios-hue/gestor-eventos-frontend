import { useState, useEffect, useCallback } from 'react';

/* Accesos directos personales del usuario (se guardan por usuario en
   localStorage). Se muestran en el sidebar y se sincronizan entre
   componentes con un evento propio + el evento 'storage' (otras pestañas). */

const KEY = (uid) => `gestek-accesos:${uid || 'anon'}`;
const EVT = 'gestek-accesos-cambio';

function leer(uid) {
  try { return JSON.parse(localStorage.getItem(KEY(uid)) || '[]'); }
  catch { return []; }
}

/* Destinos globales de la app que se pueden fijar, agrupados por categoría
   (el picker los sectoriza y permite buscar). */
export const DESTINOS_ACCESO = [
  { to: '/inicio',      label: 'Inicio',      cat: 'Navegación' },
  { to: '/eventos',     label: 'Eventos',     cat: 'Navegación' },
  { to: '/explorar',    label: 'Explorar',    cat: 'Navegación' },
  { to: '/mi-espacio',  label: 'Mi Espacio',  cat: 'Navegación' },
  { to: '/vacantes',    label: 'Vacantes',    cat: 'Navegación', kw: 'empleo trabajo talento postular bolsa' },
  { to: '/chat',        label: 'Chats',       cat: 'Herramientas' },
  { to: '/gestbot',     label: 'Gestbot',     cat: 'Herramientas' },
  { to: '/mis-boletas', label: 'Mis boletas', cat: 'Herramientas' },
  { to: '/ajustes',     label: 'Ajustes',     cat: 'Herramientas' },
];

/* Secciones de UN evento concreto que se pueden fijar como acceso directo.
   La ruta final es /eventos/<id>?s=<seccion>&t=<tab>. Sin límite de cuántos
   se fijan. `cat` sectoriza; `kw` son sinónimos para que el buscador las
   encuentre aunque el usuario escriba otra palabra (ej. "qr" → ingreso). */
/* Las rutas de aquí son las de HOY. Si el menú se reagrupa, `REUBICADAS`
   en EventWorkspace traduce las viejas y esto sigue funcionando — pero se
   queda diciendo nombres que ya no existen. `tests/menu.test.mjs` comprueba
   que todo `?s=…&t=…` del código lleve a alguna parte. */
export const SECCIONES_EVENTO = [
  { q: '?s=resumen',                     label: 'Resumen',            cat: 'Equipo', kw: 'panel general' },
  { q: '?s=equipo&t=tareas',       label: 'Tareas',             cat: 'Equipo', kw: 'pendientes' },
  { q: '?s=configuracion&t=general',     label: 'Configuración',      cat: 'Equipo' },

  { q: '?s=asistentes&t=checkin',        label: 'Escanear',           cat: 'Ingreso', kw: 'escanear qr entrada checkin puerta reingreso subevento puntos canjear premios' },
  { q: '?s=zonas&t=stands',            label: 'Stands',             cat: 'Zonas del evento', kw: 'motivos pasaporte cuota gamificacion premios' },
  { q: '?s=asistentes&t=acreditacion',   label: 'Credenciales',       cat: 'Ingreso', kw: 'escarapela imprimir tarjeton' },
  { q: '?s=asistentes&t=acreditacion',        label: 'Tarjeta',            cat: 'Ingreso', kw: 'wallet puntos gamificacion alcance' },

  { q: '?s=pagina&t=landing',        label: 'Landing',            cat: 'Tu página', kw: 'pagina publica editor' },
  { q: '?s=actividades&t=calendario',       label: 'Espacio del evento', cat: 'Tu página', kw: 'agenda calendario charlas stands sub-eventos' },
  { q: '?s=actividades&t=torneos',          label: 'Torneos',            cat: 'Tu página', kw: 'llaves bracket competencia gaming' },
  { q: '?s=pagina&t=seo',            label: 'SEO',                cat: 'Tu página' },
  { q: '?s=equipo&t=documentos',   label: 'Documentos',         cat: 'Tu página', kw: 'archivos contratos' },

  { q: '?s=comercial&t=boletas',         label: 'Boletas',            cat: 'Comercial', kw: 'tickets entradas precios' },
  { q: '?s=pagina&t=checkout',       label: 'Proceso de compra',  cat: 'Comercial', kw: 'checkout formulario' },
  { q: '?s=comercial&t=pagos',           label: 'Pagos',              cat: 'Comercial', kw: 'mercadopago cobros' },
  { q: '?s=comercial&t=promociones',     label: 'Promociones',        cat: 'Comercial', kw: 'descuentos cupones' },
  { q: '?s=resumen&t=analytics',       label: 'Analytics',          cat: 'Comercial', kw: 'estadisticas ventas' },
  { q: '?s=comercial&t=facturacion',     label: 'Facturación',        cat: 'Comercial' },

  { q: '?s=asistentes&t=clientes',       label: 'Clientes',           cat: 'Personas', kw: 'asistentes registrados' },
  { q: '?s=asistentes&t=previos',   label: 'Invitaciones',       cat: 'Personas' },
  { q: '?s=equipo&t=equipo',       label: 'Equipo y roles',     cat: 'Personas', kw: 'staff permisos colaboradores' },
  { q: '?s=equipo&t=vacantes',     label: 'Vacantes',           cat: 'Personas', kw: 'empleo trabajo contratar personal talento pipeline' },

  { q: '?s=mensajes&t=emails',         label: 'Emails',             cat: 'Comunicación', kw: 'correos campañas' },
  { q: '?s=mensajes&t=chat',         label: 'Chats del evento',   cat: 'Comunicación', kw: 'mensajes' },
];

/* Categorías en el orden en que se muestran en el picker. */
export const CATEGORIAS_GENERAL = ['Navegación', 'Herramientas'];
export const CATEGORIAS_EVENTO  = ['Ingreso', 'Contenido', 'Comercial', 'Personas', 'Comunicación', 'Organización'];

/* Filtra por texto (label + kw) y agrupa por categoría, respetando el orden. */
export function filtrarYAgrupar(items, texto, ordenCategorias) {
  const t = (texto || '').trim().toLowerCase();
  const filtrados = t
    ? items.filter(i => `${i.label} ${i.kw || ''} ${i.cat}`.toLowerCase().includes(t))
    : items;
  return ordenCategorias
    .map(cat => ({ cat, items: filtrados.filter(i => i.cat === cat) }))
    .filter(g => g.items.length > 0);
}

export function useAccesosDirectos(userId) {
  const [accesos, setAccesos] = useState(() => leer(userId));

  useEffect(() => { setAccesos(leer(userId)); }, [userId]);

  useEffect(() => {
    const h = () => setAccesos(leer(userId));
    window.addEventListener(EVT, h);
    window.addEventListener('storage', h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener('storage', h); };
  }, [userId]);

  const guardar = useCallback((lista) => {
    try { localStorage.setItem(KEY(userId), JSON.stringify(lista)); } catch { /* noop */ }
    setAccesos(lista);
    window.dispatchEvent(new Event(EVT));
  }, [userId]);

  const agregar = useCallback((item) => {
    const actual = leer(userId);
    if (!item?.to || actual.some(a => a.to === item.to)) return;
    guardar([...actual, { to: item.to, label: item.label || item.to }]);
  }, [userId, guardar]);

  const quitar = useCallback((to) => guardar(leer(userId).filter(a => a.to !== to)), [userId, guardar]);

  return { accesos, agregar, quitar };
}
