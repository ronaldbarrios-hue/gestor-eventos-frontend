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
  { to: '/chat',        label: 'Chats',       cat: 'Herramientas' },
  { to: '/gestbot',     label: 'Gestbot',     cat: 'Herramientas' },
  { to: '/mis-boletas', label: 'Mis boletas', cat: 'Herramientas' },
  { to: '/ajustes',     label: 'Ajustes',     cat: 'Herramientas' },
];

/* Secciones de UN evento concreto que se pueden fijar como acceso directo.
   La ruta final es /eventos/<id>?s=<seccion>&t=<tab>. Sin límite de cuántos
   se fijan. `cat` sectoriza; `kw` son sinónimos para que el buscador las
   encuentre aunque el usuario escriba otra palabra (ej. "qr" → ingreso). */
export const SECCIONES_EVENTO = [
  { q: '?s=resumen',                     label: 'Resumen',            cat: 'Organización', kw: 'panel general' },
  { q: '?s=organizacion&t=tareas',       label: 'Tareas',             cat: 'Organización', kw: 'pendientes' },
  { q: '?s=configuracion&t=general',     label: 'Configuración',      cat: 'Organización' },

  { q: '?s=asistentes&t=checkin',        label: 'Control de ingreso', cat: 'Ingreso', kw: 'escanear qr entrada checkin puerta' },
  { q: '?s=asistentes&t=stands',         label: 'Stands y puntos',    cat: 'Ingreso', kw: 'escanear qr motivos gamificacion canje premios' },
  { q: '?s=asistentes&t=credenciales',   label: 'Credenciales',       cat: 'Ingreso', kw: 'escarapela imprimir tarjeton' },
  { q: '?s=asistentes&t=tarjeta',        label: 'Tarjeta',            cat: 'Ingreso', kw: 'wallet puntos gamificacion alcance' },

  { q: '?s=experience&t=landing',        label: 'Landing',            cat: 'Contenido', kw: 'pagina publica editor' },
  { q: '?s=organizacion&t=agenda',       label: 'Espacio del evento', cat: 'Contenido', kw: 'agenda calendario charlas stands sub-eventos' },
  { q: '?s=dinamicas&t=torneo',          label: 'Torneos',            cat: 'Contenido', kw: 'llaves bracket competencia gaming' },
  { q: '?s=experience&t=seo',            label: 'SEO',                cat: 'Contenido' },
  { q: '?s=organizacion&t=documentos',   label: 'Documentos',         cat: 'Contenido', kw: 'archivos contratos' },

  { q: '?s=comercial&t=boletas',         label: 'Boletas',            cat: 'Comercial', kw: 'tickets entradas precios' },
  { q: '?s=experience&t=checkout',       label: 'Proceso de compra',  cat: 'Comercial', kw: 'checkout formulario' },
  { q: '?s=comercial&t=pagos',           label: 'Pagos',              cat: 'Comercial', kw: 'mercadopago cobros' },
  { q: '?s=comercial&t=promociones',     label: 'Promociones',        cat: 'Comercial', kw: 'descuentos cupones' },
  { q: '?s=comercial&t=analytics',       label: 'Analytics',          cat: 'Comercial', kw: 'estadisticas ventas' },
  { q: '?s=comercial&t=facturacion',     label: 'Facturación',        cat: 'Comercial' },

  { q: '?s=asistentes&t=clientes',       label: 'Clientes',           cat: 'Personas', kw: 'asistentes registrados' },
  { q: '?s=asistentes&t=invitaciones',   label: 'Invitaciones',       cat: 'Personas' },
  { q: '?s=organizacion&t=equipo',       label: 'Equipo y roles',     cat: 'Personas', kw: 'staff permisos colaboradores' },

  { q: '?s=experience&t=emails',         label: 'Emails',             cat: 'Comunicación', kw: 'correos campañas' },
  { q: '?s=comunicacion&t=chat',         label: 'Chats del evento',   cat: 'Comunicación', kw: 'mensajes' },
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
