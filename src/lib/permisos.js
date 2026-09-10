/* Catálogo central de permisos por rol dentro de un evento.
   Cada permiso tiene id, label, descripción y grupo.

   `aplicado` dice si el servidor lo VERIFICA de verdad hoy. Los que están en
   `false` **no cambian nada al concederlos**, y ninguna pantalla se guarda ya
   con ellos: eso se corrigió en el menú el 2-sep, porque «Pagos» pedía
   `ver_pagos` —que nadie comprueba— y «Promociones» pedía `gestionar_tickets`
   cuando esa ruta es sólo del dueño. Una pestaña que se abre y devuelve 403 es
   peor que una pestaña que no se ve.

   **Corregido el 2-sep:** `crear_canales` y `borrar_mensajes` estaban marcados
   como no aplicados y `routes/chat.js` los comprueba en cinco sitios. La marca
   miente en la dirección peor: le dice a quien arma un rol que conceder eso no
   cambia nada, cuando sí cambia. Se midió buscando cada id en las rutas antes
   de tocarlo. Al 2026-09-03 queda **uno solo** sin comprobar: `vip_zone`, que
   no es que falte enchufarlo —es que no existe la función que promete—.
   `gestionar_descuentos`, `ver_pagos` y `reembolsar` ya hacen algo. Los que están en
   `false` se pueden conceder y no cambian nada todavía: se dejan porque los
   roles semilla ya los reparten y esconderlos haría que un rol tuviera
   permisos invisibles en su propia pantalla de edición. Con la marca, quien
   arma un rol sabe cuál va a surtir efecto.

   Faltaban tres que el backend SÍ comprueba —`gestionar_agenda`,
   `gestionar_expositores` y `gestionar_torneo`— y que la semilla de la 0054
   reparte entre Editor, Coordinador, Expositor, Speaker y Moderación. Al no
   estar aquí, no se podían conceder a mano y un rol podía tener poderes que
   su propio editor no enseñaba. */

export const PERMISOS = [
  /* Co-dueño.
   *
   * Va primero y aparte porque no es un permiso más: es «manda igual que
   * quien lo creó». Existe porque en FESTECH el evento lo llevan varias
   * organizaciones y todas mandan igual — y el rol más alto, «Administrador»,
   * enumera 22 permisos y aun así no llega a cinco pantallas que el panel
   * reserva a quien figura como dueño. La salida hasta hoy era compartir la
   * cuenta.
   *
   * El servidor ya conocía esta cadena en `core/permisos/puede()`; lo que no
   * la conocía era `lib/acceso.js`, que es quien vigila las 58 rutas. Un
   * miembro con `*` pasaba un guardia y lo paraba el otro. */
  { id: '*', grupo: 'Co-dueño', label: 'Manda igual que quien creó el evento',
    desc: 'Todos los permisos, incluidas las pantallas de ajustes, integraciones y anuncios. No incluye borrar el evento ni transferirlo: eso se queda en quien lo creó.',
    aplicado: true },

  /* Evento */
  { id: 'editar_evento',         grupo: 'Evento',    label: 'Editar evento',           desc: 'Cambiar título, descripción, fechas, ubicación y modalidad.', aplicado: true },
  { id: 'publicar_evento',       grupo: 'Evento',    label: 'Publicar / cancelar',     desc: 'Cambiar el estado del evento.', aplicado: true },
  { id: 'editar_pagina_publica', grupo: 'Evento',    label: 'Editar página pública',   desc: 'Usar el editor visual, la marca y la publicación.', aplicado: true },
  { id: 'gestionar_imagenes',    grupo: 'Evento',    label: 'Imágenes y galería',      desc: 'Subir y borrar portada y galería.', aplicado: true },

  /* Espacio del evento */
  { id: 'gestionar_agenda',      grupo: 'Espacio',   label: 'Gestionar el espacio',    desc: 'Crear y editar sub-eventos: charlas, talleres, shows, competencias.', aplicado: true },
  { id: 'gestionar_torneo',      grupo: 'Espacio',   label: 'Gestionar torneos',       desc: 'Equipos, llaves, resultados y categorías.', aplicado: true },
  { id: 'gestionar_expositores', grupo: 'Espacio',   label: 'Gestionar expositores',   desc: 'Stands, fichas y puntos de los expositores.', aplicado: true },
  { id: 'gestionar_accesos',     grupo: 'Espacio',   label: 'Accesos e ingresos',      desc: 'Definir las puertas del evento y qué boletas admite cada una.', aplicado: true },

  /* Equipo */
  { id: 'invitar_staff',         grupo: 'Equipo',    label: 'Invitar al equipo',       desc: 'Agregar nuevas personas como staff.', aplicado: true },
  { id: 'gestionar_roles',       grupo: 'Equipo',    label: 'Gestionar roles',         desc: 'Crear, editar y borrar roles del evento.', aplicado: true },
  { id: 'remover_miembros',      grupo: 'Equipo',    label: 'Quitar miembros',         desc: 'Sacar gente del equipo del evento.', aplicado: true },
  { id: 'gestionar_solicitudes', grupo: 'Equipo',    label: 'Atender solicitudes',     desc: 'Responder sugerencias e incidencias del equipo, y aprobar las correcciones de ficha.', aplicado: true },
  { id: 'ver_documentos',        grupo: 'Equipo',    label: 'Ver documentos',          desc: 'Contratos, riders y listas del evento. Sin esto la sección no aparece y los archivos ni siquiera viajan.', aplicado: true },

  /* Tickets */
  { id: 'gestionar_tickets',     grupo: 'Tickets',   label: 'Gestionar tipos de boleta', desc: 'Crear, editar y borrar tipos de ticket.', aplicado: true },
  { id: 'gestionar_descuentos',  grupo: 'Tickets',   label: 'Códigos de descuento',    desc: 'Crear y administrar cupones.', aplicado: true },

  /* Clientes */
  { id: 'ver_clientes',          grupo: 'Clientes',  label: 'Ver lista de clientes',   desc: 'Acceso a la lista de inscritos.', aplicado: true },
  { id: 'gestionar_clientes',    grupo: 'Clientes',  label: 'Editar clientes',         desc: 'Cambiar el estado de una boleta, invalidarla, importar y exportar.', aplicado: true },
  { id: 'checkin',               grupo: 'Clientes',  label: 'Hacer check-in',          desc: 'Escanear QR y marcar asistencia.', aplicado: true },
  /* Faltaba, y no en el sentido inofensivo: el servidor lo comprueba desde la
     0122 y aqui no estaba, asi que la casilla no existia y quien organiza NO
     podia concederselo a nadie. El permiso, el boton y la ruta estaban los
     tres; lo que faltaba era la forma de unirlos. Sin ningun error — la
     casilla simplemente no aparecia. */
  { id: 'borrar_boletas',        grupo: 'Clientes',  label: 'Borrar boletas',          desc: 'Quitar una boleta y sus respuestas para siempre. Es para los duplicados que deja un fallo; para lo demas, invalidar.', aplicado: true },
  { id: 'vip_zone',              grupo: 'Clientes',  label: 'Atender cualquier puerta', desc: 'Llave maestra: marca entradas por puertas restringidas sin estar en la lista de staff de cada una. Sin esto, sólo atiende las puertas donde esté apuntado.', aplicado: true },

  /* Chat */
  { id: 'crear_canales',         grupo: 'Chat',      label: 'Crear canales',           desc: 'Crear chats principales y subgrupos.', aplicado: true },
  { id: 'borrar_mensajes',       grupo: 'Chat',      label: 'Moderar mensajes',        desc: 'Borrar mensajes de otros miembros.', aplicado: true },
  { id: 'publicar_anuncios',     grupo: 'Chat',      label: 'Publicar anuncios',       desc: 'Escribirle a todo el evento. Antes era sólo del dueño.', aplicado: true },

  /* Pagos */
  { id: 'ver_pagos',             grupo: 'Pagos',     label: 'Ver pagos e ingresos',    desc: 'La pestaña Dinero: cuánto entró, de qué, qué falta por cobrar y qué se devolvió.', aplicado: true },
  { id: 'reembolsar',            grupo: 'Pagos',     label: 'Registrar reembolsos',    desc: 'Marcar una boleta como reembolsada y liberar su cupo. El dinero se devuelve en la pasarela.', aplicado: true },

  /* Analytics */
  { id: 'ver_analytics',         grupo: 'Analytics', label: 'Ver analytics',           desc: 'Métricas, conversión y reportes.', aplicado: true },
];

/* Agrupado para UI.
 *
 * ── Manda el servidor, si lo dice ───────────────────────────────────────
 *
 * `GET /eventos/:id/roles` devuelve su propio catalogo. Cuando llega, ES la
 * lista: la de arriba solo aporta la redaccion —el `desc` largo que explica que
 * hace cada permiso, que no vale la pena mandar por la red en cada carga— y
 * sirve de respaldo mientras la respuesta no llega o si el servidor es viejo.
 *
 * Por que asi y no como estaba: la lista de aqui se mantenia «a mano y a
 * proposito identica» a la del backend, y duro lo que duran esas cosas. Se
 * anadio `borrar_boletas` al servidor, se protegio la ruta con el, y la casilla
 * no aparecio nunca en el panel. El permiso existia y no habia forma de
 * concederlo.
 *
 * Ahora, si el servidor conoce un permiso que aqui no esta, sale igual con la
 * etiqueta que el mande. Se vera sin explicacion larga —y eso se arregla
 * escribiendola aqui— pero se PUEDE conceder, que es lo que importa. */
export function permisosPorGrupo(catalogo) {
  const local = new Map(PERMISOS.map(p => [p.id, p]));
  const lista = Array.isArray(catalogo) && catalogo.length
    ? catalogo.map(c => {
        const mio = local.get(c.id);
        return {
          ...c,
          label: mio?.label || c.label || c.id,
          grupo: mio?.grupo || c.grupo || 'Otros',
          desc : mio?.desc  || '',
          /* Sin marca local, se asume que si aplica: viene del servidor, que es
             quien lo comprueba. Decir «no cambia nada» de un permiso que si
             cambia algo es el error caro de los dos. */
          aplicado: mio ? mio.aplicado : true,
        };
      })
    : PERMISOS;

  /* El co-dueño no es un permiso del catalogo del servidor —es la cadena `*`
     que `assertPermiso` trata aparte—, asi que se conserva siempre. */
  const conCodueno = lista.some(p => p.id === '*') ? lista : [local.get('*'), ...lista].filter(Boolean);

  const map = new Map();
  for (const p of conCodueno) {
    if (!map.has(p.grupo)) map.set(p.grupo, []);
    map.get(p.grupo).push(p);
  }
  return Array.from(map.entries()); // [['Evento', [...]], ['Equipo', [...]], ...]
}

export function labelFor(id) {
  return PERMISOS.find(p => p.id === id)?.label || id;
}
