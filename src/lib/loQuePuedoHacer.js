/* Qué puedo hacer YO en este evento.
 *
 * ── El hueco que tapa ────────────────────────────────────────────────────
 *
 * Quien colabora en un evento ve su nombre y su rol —«Puerta», «Atención»— y
 * nada más. El nombre del rol no dice qué se puede hacer con él: hay que
 * entrar, mirar el menú y deducirlo. Y si entra por el enlace de siempre,
 * aterriza en el Resumen aunque su rol no le deje tocar nada de lo que hay
 * ahí.
 *
 * El servidor ya manda los permisos resueltos de cada persona en cada evento
 * (`/me/equipo/eventos` → `mi_ficha.permisos`, los del rol MÁS los sueltos).
 * Lo que faltaba era traducirlos a frases y a un sitio a donde ir.
 *
 * ── Por qué esta tabla no es la del menú ─────────────────────────────────
 *
 * El menú del evento lista PANTALLAS. Esto lista TRABAJOS: «escanear
 * entradas» no es una pestaña, es lo que alguien viene a hacer. Atarlo al menú
 * habría convertido cualquier reordenación de pestañas en un cambio de lo que
 * esta pantalla promete.
 *
 * El orden importa: es el orden en que se ofrece, y el primero que encaje
 * decide a dónde entra el botón. Va de lo más operativo —lo que se hace de pie
 * el día del evento— a lo más administrativo.
 *
 * Y dentro de eso, los permisos que nombran UN ÁREA —expositores, agenda,
 * torneo— van antes que los que dan una capacidad suelta como `ver_clientes`.
 * «Coordinación de expositores» tiene los dos, y su trabajo son los stands: si
 * mandara `ver_clientes`, ese rol entraría a la lista de asistentes, que es lo
 * que usa de apoyo y no lo que viene a hacer.
 */

export const TRABAJOS = [
  { permiso: 'checkin',               frase: 'Escanear entradas en la puerta',      ruta: '?s=asistentes&t=checkin' },
  { permiso: 'gestionar_expositores', frase: 'Stands y rueda de negocios',          ruta: '?s=actividades&t=networking' },
  { permiso: 'gestionar_agenda',      frase: 'Armar la agenda y los sub-eventos',   ruta: '?s=actividades&t=calendario' },
  { permiso: 'gestionar_torneo',      frase: 'Llevar los torneos',                  ruta: '?s=actividades&t=torneos' },
  { permiso: 'gestionar_clientes',    frase: 'Editar boletas y reenviarlas',        ruta: '?s=asistentes&t=clientes' },
  { permiso: 'ver_clientes',          frase: 'Ver la lista de asistentes',          ruta: '?s=asistentes&t=clientes' },
  { permiso: 'gestionar_tickets',     frase: 'Crear y editar tipos de boleta',      ruta: '?s=comercial&t=boletas' },
  { permiso: 'gestionar_descuentos',  frase: 'Códigos de descuento',                ruta: '?s=comercial&t=promociones' },
  { permiso: 'ver_pagos',             frase: 'Ver el dinero del evento',            ruta: '?s=comercial&t=dinero' },
  { permiso: 'reembolsar',            frase: 'Registrar reembolsos',                ruta: '?s=asistentes&t=clientes' },
  { permiso: 'editar_pagina_publica', frase: 'Editar la página pública',            ruta: '?s=pagina&t=landing' },
  { permiso: 'editar_evento',         frase: 'Editar la información del evento',    ruta: '?s=resumen&t=general' },
  { permiso: 'gestionar_roles',       frase: 'Gestionar el equipo y sus roles',     ruta: '?s=equipo&t=equipo' },
  { permiso: 'invitar_staff',         frase: 'Invitar gente al equipo',             ruta: '?s=equipo&t=equipo' },
  { permiso: 'remover_miembros',      frase: 'Quitar gente del equipo',             ruta: '?s=equipo&t=equipo' },
  { permiso: 'gestionar_solicitudes', frase: 'Atender las solicitudes del equipo',  ruta: '?s=equipo&t=solicitudes' },
  { permiso: 'crear_canales',         frase: 'Abrir canales de chat',               ruta: '?s=mensajes&t=chat' },
  { permiso: 'borrar_mensajes',       frase: 'Moderar el chat',                     ruta: '?s=mensajes&t=chat' },
  { permiso: 'ver_analytics',         frase: 'Ver analytics y reportes',            ruta: '?s=resumen&t=analytics' },
  { permiso: 'vip_zone',              frase: 'Atender cualquier puerta',            ruta: '?s=asistentes&t=checkin' },
];

/* Todo el mundo, tenga el rol que tenga, puede hacer esto. No se anuncia como
   un permiso porque no lo es: son las cosas de uno mismo dentro del evento. */
const SIEMPRE = { frase: 'Ver tus tareas y el chat del equipo', ruta: '?s=equipo&t=tareas' };

const listaDe = (permisos) => (Array.isArray(permisos) ? permisos : []);

/* Lo que esta persona puede hacer, en frases y en orden de utilidad.
 *
 * El dueño lo puede todo: se dice con una sola frase en vez de recitarle
 * veintidós, que es ruido para quien ya sabe que es su evento. */
export function loQuePuedoHacer({ permisos = [], soyOwner = false } = {}) {
  if (soyOwner) return ['Todo: es tu evento'];
  const p = listaDe(permisos);
  const frases = TRABAJOS.filter(t => p.includes(t.permiso)).map(t => t.frase);
  return frases.length ? frases : [SIEMPRE.frase];
}

/* A dónde entrar.
 *
 * Sin esto, el enlace lleva al Resumen y quien tiene un rol de puerta aterriza
 * en una pantalla que no le sirve —y, según el rol, en una que ni siquiera
 * puede abrir—. Entrar por lo primero que SÍ puede hacer ahorra el paseo. */
export function porDondeEntro({ permisos = [], soyOwner = false } = {}) {
  if (soyOwner) return '';
  const p = listaDe(permisos);
  return (TRABAJOS.find(t => p.includes(t.permiso)) || SIEMPRE).ruta;
}

/* Las rutas de arriba no son libres: tienen que existir en el menú del evento.
   `tests/menu.test.mjs` recorre el código buscando enlaces `?s=…&t=…` y falla
   si alguno no lleva a ninguna parte — cazó dos de esta misma tabla al
   escribirla («general/general» y «general/analytics», cuando esa sección se
   llama «resumen»). Un enlace inventado aquí manda a quien colabora a una
   pantalla en blanco justo el día que entra por primera vez. */

/* Cuántas cosas de más hay, para poder decir «y 4 más» sin recitarlas. */
export function resumenCorto(frases, tope = 3) {
  const vistas = frases.slice(0, tope);
  const resto = frases.length - vistas.length;
  return { vistas, resto };
}
