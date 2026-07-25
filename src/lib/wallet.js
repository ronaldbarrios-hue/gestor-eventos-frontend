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
  color1: '#3B82F6',
  color2: '#8B5CF6',
  mostrar_qr: true,
  mostrar_puntos: true,
  mostrar_tipo: true,
  titulo_puntos: 'Puntos de asistencia',
  logo: '',
};

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
    ...patch,
  };
}

function soloDiseno(v) {
  const out = {};
  for (const k of CLAVES_DISENO) out[k] = v?.[k] !== undefined ? v[k] : WALLET_DEFECTO[k];
  return out;
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
  /* Forma antigua: un único diseño plano → variante "Asistentes". */
  return [nuevaVariante({
    id: 'principal',
    nombre: 'Asistentes',
    publico: 'asistentes',
    ...(w && typeof w === 'object' ? soloDiseno(w) : {}),
  })];
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
