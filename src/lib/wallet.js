/* Tarjetas del evento — VARIANTES por público.

   Un evento no tiene una sola tarjeta: la del staff no es la del asistente,
   y un VIP puede querer la suya. `page_json.wallet` guarda una lista de
   variantes y aquí se resuelve cuál le toca a cada persona.

   Forma nueva:
     page_json.wallet = { variantes: [ { id, nombre, publico, tipos:[], ...diseño } ] }

   Forma antigua (un solo diseño plano) se migra al vuelo, así que las
   tarjetas ya configuradas siguen viéndose igual. */

export const WALLET_DEFECTO = {
  estilo: 'gradiente',        // gradiente | oscuro | claro | neon
  color1: '#C9A227',
  color2: '#E0B12B',
  mostrar_qr: true,
  mostrar_puntos: true,
  mostrar_tipo: true,
  titulo_puntos: 'Puntos de asistencia',
  logo: '',
};

/* Lo que sólo tiene sentido en PAPEL. Vivía aparte, en `page_json.credenciales`
   y con su propio editor, y era la misma escarapela: mismo QR, mismo portador,
   misma función. El organizador la diseñaba dos veces y, si cambiaba el logo
   en una, la otra se quedaba como estaba.

   No se fusiona metiendo todo en el mismo saco: el tamaño físico, los campos
   del formulario que se imprimen y la marca de agua no significan nada en una
   pantalla, igual que el degradado y los puntos no significan nada en papel.
   Son la MISMA tarjeta con dos salidas, así que la variante lleva las dos
   partes y cada medio lee la suya. */
export const IMPRESION_DEFECTO = {
  tamano: '9x5',
  mostrar_nombre: true,
  mostrar_codigo: false,
  /* Se guarda en vez de deducirse de si hay logo: son cosas distintas. El
     organizador puede querer el hueco del logo reservado aunque todavía no lo
     haya subido, y deducirlo apagaba la opción sola. */
  mostrar_logo: true,
  campos_extra: [],           // ids de campos_formulario (ej. Empresa, Cargo)
  campos_libres: [],          // { etiqueta, valor } — texto fijo del organizador
  colores: {},                // banda por tipo: { 'VIP': '#d4af37' }
  fondo: '#FFFFFF',
  texto: '#0F172A',
  banda_texto: '#FFFFFF',
  marca_agua_url: '',
  marca_agua_opacidad: 12,
  borde: true,
};

export const CLAVES_IMPRESION = Object.keys(IMPRESION_DEFECTO);

export const PUBLICOS = [
  { value: 'asistentes', label: 'Asistentes',     nota: 'Quien compra o reserva una boleta.' },
  { value: 'staff',      label: 'Staff y equipo', nota: 'Quien trabaja en el evento (equipo, colaboradores).' },
];

/* Claves que definen el DISEÑO (lo demás — id, nombre, publico, tipos — es
   metadato de la variante). Sirve para migrar y para clonar. */
export const CLAVES_DISENO = Object.keys(WALLET_DEFECTO);

export function nuevaVariante(patch = {}) {
  return {
    id: `v_${Math.random().toString(36).slice(2, 10)}`,
    nombre: 'Nueva tarjeta',
    publico: 'asistentes',
    tipos: [],                // nombres de tipo de boleta: ['VIP', 'Prensa']
    ...WALLET_DEFECTO,
    ...IMPRESION_DEFECTO,
    ...patch,
  };
}

function soloDiseno(v) {
  const out = {};
  for (const k of CLAVES_DISENO) out[k] = v?.[k] !== undefined ? v[k] : WALLET_DEFECTO[k];
  return out;
}

/* Lo de papel de la variante que le toca a esta persona. Espejo de
   `walletConfig`, para que la escarapela impresa salga de la MISMA variante
   que la digital: si el organizador pone una tarjeta distinta para los VIP,
   su escarapela impresa también es la de VIP. */
export function impresionConfig(pageJson, ctx = {}) {
  const v = resolverVariante(pageJson, ctx);
  const out = {};
  for (const k of CLAVES_IMPRESION) out[k] = v?.[k] !== undefined ? v[k] : IMPRESION_DEFECTO[k];
  /* El logo es de la identidad, no del medio: se comparte con la digital. */
  out.logo_url = v?.logo || '';
  const val = (k, def) => (v?.[k] !== undefined ? !!v[k] : def);
  /* El editor de impresión agrupa esto en un objeto `mostrar`; en la variante
     son claves planas, porque anidarlas obligaría a la tarjeta digital a
     conocer una forma que no usa. Se traduce aquí, en un solo sitio. */
  out.mostrar = {
    logo  : val('mostrar_logo', IMPRESION_DEFECTO.mostrar_logo),
    qr    : val('mostrar_qr', WALLET_DEFECTO.mostrar_qr),
    tipo  : val('mostrar_tipo', WALLET_DEFECTO.mostrar_tipo),
    nombre: val('mostrar_nombre', IMPRESION_DEFECTO.mostrar_nombre),
    codigo: val('mostrar_codigo', IMPRESION_DEFECTO.mostrar_codigo),
  };
  return out;
}

/* El camino de vuelta: lo que edita la pantalla de impresión, guardado dentro
   de la variante. Sin esto el editor leería de `wallet` y escribiría en
   `credenciales`, que es peor que no haber unificado nada. */
export function variantesConImpresion(pageJson, cfg, ctx = {}) {
  const vs = walletVariantes(pageJson);
  const objetivo = resolverVariante(pageJson, ctx);
  const parche = {};
  for (const k of CLAVES_IMPRESION) if (cfg[k] !== undefined) parche[k] = cfg[k];
  if (cfg.logo_url !== undefined) parche.logo = cfg.logo_url;
  if (cfg.mostrar) {
    parche.mostrar_qr     = !!cfg.mostrar.qr;
    parche.mostrar_tipo   = !!cfg.mostrar.tipo;
    parche.mostrar_nombre = !!cfg.mostrar.nombre;
    parche.mostrar_codigo = !!cfg.mostrar.codigo;
    parche.mostrar_logo   = !!cfg.mostrar.logo;
  }
  return vs.map(v => (v.id === objetivo?.id ? { ...v, ...parche } : v));
}

/* Siempre devuelve al menos una variante. Migra la forma antigua sin perder
   lo que el organizador ya había configurado. */
export function walletVariantes(pageJson) {
  const w = pageJson?.wallet;
  if (Array.isArray(w?.variantes) && w.variantes.length) {
    return w.variantes.map((v, i) => ({
      ...nuevaVariante(),
      ...v,
      id: v?.id || `v_${i}`,
      tipos: Array.isArray(v?.tipos) ? v.tipos : [],
    }));
  }
  /* Forma antigua: un único diseño plano → variante "Asistentes".

     Y si no hay `wallet` pero sí el viejo `credenciales`, ése era el diseño de
     la escarapela y se lee como variante. Sin esto, el único evento que ya la
     tenía diseñada vería su escarapela volver a los valores por defecto el día
     que se despliegue esto — que es exactamente lo que no puede pasar. */
  const cred = !w && pageJson?.credenciales;
  return [nuevaVariante({
    id: 'principal',
    nombre: 'Asistentes',
    publico: 'asistentes',
    ...(w && typeof w === 'object' ? soloDiseno(w) : {}),
    ...(cred && typeof cred === 'object' ? desdeCredenciales(cred) : {}),
  })];
}

/* El viejo `page_json.credenciales` traducido a las claves de una variante.
   `mostrar` era un objeto anidado y aquí son claves planas, que es lo que
   permite que un solo editor toque las dos salidas. */
function desdeCredenciales(c) {
  const out = {};
  for (const k of CLAVES_IMPRESION) if (c[k] !== undefined) out[k] = c[k];
  if (c.logo_url) out.logo = c.logo_url;
  const m = c.mostrar && typeof c.mostrar === 'object' ? c.mostrar : null;
  if (m) {
    if (m.qr !== undefined)     out.mostrar_qr = !!m.qr;
    if (m.tipo !== undefined)   out.mostrar_tipo = !!m.tipo;
    if (m.nombre !== undefined) out.mostrar_nombre = !!m.nombre;
    if (m.codigo !== undefined) out.mostrar_codigo = !!m.codigo;
    if (m.logo !== undefined)   out.mostrar_logo = !!m.logo;
  }
  return out;
}

/* Cuál le toca a esta persona.
   ctx = { publico: 'staff' | 'asistentes', tipo: 'VIP' }
   Sin ctx devuelve la de asistentes — así el código antiguo que llamaba
   walletConfig(pageJson) sigue funcionando igual. */
export function walletConfig(pageJson, ctx = {}) {
  return soloDiseno(resolverVariante(pageJson, ctx));
}

export function resolverVariante(pageJson, ctx = {}) {
  const vs = walletVariantes(pageJson);
  const tipo = String(ctx.tipo || '').trim().toLowerCase();
  const publico = ctx.publico === 'staff' ? 'staff' : 'asistentes';

  /* 1. Una variante que nombra explícitamente este tipo de boleta gana:
        es lo más específico que pudo pedir el organizador. */
  if (tipo) {
    const porTipo = vs.find(v => (v.tipos || []).some(t => String(t).trim().toLowerCase() === tipo));
    if (porTipo) return porTipo;
  }
  return vs.find(v => v.publico === publico)
      || vs.find(v => v.publico === 'asistentes')
      || vs[0];
}

/* ── Reglas de puntos del evento (page_json.puntos) ──────────────────
   El backend tiene los mismos valores por defecto; si el organizador no
   toca nada, todo se comporta como antes. */

export const PUNTOS_DEFECTO = {
  activo: true,
  alcance: 'evento',      // evento | organizador — ver ALCANCES
  asistencia: 100,        // al asistente, cuando le hacen check-in
  /* Al asistente, cuando le marcan la entrada a UN sub-evento. Vale menos que
     la asistencia general a propósito: se gana una vez por cada taller, y si
     valiera lo mismo, tres talleres pesarían más que todo el evento.
     Espeja PUNTOS en lib/gamificacion.js del backend. */
  participacion_sesion: 30,
  registro_operado: 10,   // al staff, por cada asistente que registra
  checkin_operado: 5,     // al staff, por cada boleta que valida
  tarea_completada: 25,   // al staff, por cada tarea que cierra
  tope_expositor: 500,    // máximo de puntos que un expositor da por escaneo
};

/* Hasta dónde valen los puntos. Si fueran globales sin más, alguien redimiría
   en este evento lo que ganó en otro y la mecánica pierde sentido; por eso el
   organizador elige el alcance. */
export const ALCANCES = [
  { value: 'evento',      label: 'Solo este evento',
    nota: 'Los puntos se ganan y se canjean dentro del evento. Al terminar, no viajan.' },
  { value: 'organizador', label: 'Todos mis eventos',
    nota: 'El asistente acumula entre tus eventos y canjea en cualquiera. Se identifica por su correo.' },
];

export const REGLAS_PUNTOS = [
  { key: 'asistencia',       label: 'Asistencia confirmada', quien: 'Al asistente',  nota: 'Cuando le hacen check-in en la puerta.' },
  { key: 'participacion_sesion', label: 'Participación en un sub-evento', quien: 'Al asistente', nota: 'Por cada taller o charla al que le marcan la entrada. Se gana una vez por sub-evento.' },
  { key: 'registro_operado', label: 'Asistente registrado',  quien: 'Al staff',      nota: 'Por cada persona que inscribe o importa.' },
  { key: 'checkin_operado',  label: 'Check-in validado',     quien: 'Al staff',      nota: 'Por cada boleta que escanea en la entrada.' },
  { key: 'tarea_completada', label: 'Tarea completada',      quien: 'Al staff',      nota: 'Por cada tarea del evento que cierra.' },
];

export function reglasPuntos(pageJson) {
  const p = pageJson?.puntos;
  const out = { ...PUNTOS_DEFECTO };
  if (p && typeof p === 'object') {
    if (p.activo === false) out.activo = false;
    if (ALCANCES.some(a => a.value === p.alcance)) out.alcance = p.alcance;
    for (const r of REGLAS_PUNTOS) {
      const n = Number(p[r.key]);
      if (Number.isFinite(n) && n >= 0) out[r.key] = Math.floor(n);
    }
    const tope = Number(p.tope_expositor);
    if (Number.isFinite(tope) && tope > 0) out.tope_expositor = Math.floor(tope);
  }
  return out;
}
