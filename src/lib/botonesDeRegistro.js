import { WIDGET_OPCIONES } from './embed.js';

/* Los botones de registro que el organizador pega en otras webs.
 *
 * ── El problema, dicho por quien lo usa ──────────────────────────────────
 *
 * «Está bueno, pero los botones que se crean no los vuelvo a ver.»
 *
 * Y es literal: el código se generaba, se copiaba y se olvidaba. Si la web del
 * organizador se rehace, o hay que cambiar el color, o simplemente volver a
 * copiar el mismo botón para otra página, había que reconstruirlo de memoria —
 * y cada reconstrucción salía un poco distinta.
 *
 * ── Y el otro ────────────────────────────────────────────────────────────
 *
 * «No sé cómo funciona con varias boletas. Solo veo un lugar donde se maneja.»
 *
 * Un botón podía llevar a la lista de boletas y a nada más. Con cuatro tipos,
 * quien pega «Comprar VIP» en la página de patrocinadores y «Stand comercial»
 * en la de expositores no podía: los dos abrían lo mismo.
 *
 * ── Dónde viven ──────────────────────────────────────────────────────────
 *
 * En `page_json.botones`, junto al resto de la configuración de la página. No
 * hacen falta ni tabla ni migración: son ajustes del evento, como los bloques
 * o la marca, y se guardan por el mismo camino.
 *
 * Lo que SÍ necesita la base es `tickets.origen` (0111), porque eso no es un
 * ajuste: es un dato de cada inscripción, y es lo que después contesta «este
 * botón trajo 34».
 */

/* Un código corto y estable para el botón. Va en la URL, así que se limpia
   igual que en el servidor (`lib/origenDeRegistro.js`): si las dos limpiezas
   se separan, el botón mandaría un origen y el informe contaría otro. */
export function codigoDeOrigen(nombre, existentes = []) {
  const base = String(nombre || 'boton')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'boton';

  const usados = new Set((existentes || []).map(b => b.origen));
  if (!usados.has(base)) return base;
  /* Dos botones con el mismo origen contarían como uno solo en el informe, que
     es peor que un nombre feo. */
  for (let n = 2; n < 999; n++) {
    const alt = `${base}-${n}`.slice(0, 40);
    if (!usados.has(alt)) return alt;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 40);
}

export function botonesDelEvento(evento) {
  const lista = evento?.page_json?.botones;
  return Array.isArray(lista) ? lista : [];
}

export function nuevoBoton(preset = {}, existentes = []) {
  const nombre = preset.nombre || 'Botón de registro';
  /* La apariencia se copia ENTERA desde `WIDGET_OPCIONES`.
   *
   * Antes se listaban ocho campos a mano, y el panel dejaba configurar
   * dieciséis: el degradado, el borde, su color, la sombra, el ancho y el
   * título del formulario se perdían al pulsar «Guardar este botón». No al
   * copiar el código —eso era otro fallo, en `embed.js`— sino al guardarlo,
   * así que el botón volvía de la lista distinto del que se había visto en la
   * vista previa, y sin nada que lo avisara.
   *
   * Copiando desde la tabla, una opción nueva del panel se guarda sola. */
  const apariencia = Object.fromEntries(
    WIDGET_OPCIONES.map(o => [o.clave, preset[o.clave] ?? o.def]),
  );

  return {
    ...apariencia,
    id: `b_${Math.random().toString(36).slice(2, 9)}`,
    nombre,
    origen: preset.origen || codigoDeOrigen(nombre, existentes),
    creado_at: preset.creado_at || new Date().toISOString(),
  };
}

/* Cuántas inscripciones trajo cada botón, cruzando lo guardado con lo que
   contesta el servidor. Los orígenes que YA NO tienen botón se devuelven
   aparte en vez de descartarse: son inscripciones reales de un botón que
   alguien borró, y esconderlas haría que las cuentas no cuadraran con la
   lista de asistentes. */
export function cruzarConUso(botones, origenes = []) {
  const porOrigen = new Map((origenes || []).map(o => [o.origen || '__directo__', o]));

  const conUso = (botones || []).map(b => ({
    ...b,
    uso: porOrigen.get(b.origen) || { total: 0, pagadas: 0, ingresos: 0 },
  }));

  const conocidos = new Set((botones || []).map(b => b.origen));
  const huerfanos = (origenes || [])
    .filter(o => o.origen && !conocidos.has(o.origen));

  return { conUso, directo: porOrigen.get('__directo__') || null, huerfanos };
}
