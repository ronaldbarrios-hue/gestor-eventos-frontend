/* GESTEK — Repartir un formulario largo en módulos.

   Un registro de veintidós preguntas en una sola lista se abandona. La ficha
   de caracterización pide documento, teléfono, ubicación, identidad de género,
   pertenencia étnica y discapacidad: verlo todo de golpe, en un modal, parece
   un trámite y no una inscripción a un evento.

   ── Por qué por GRUPO y no cada N ────────────────────────────────────────
   La tentación es trocear cada cinco u ocho. Es peor por dos motivos.

   «Paso 2 de 4» no le dice nada a nadie. «Ubicación» sí: quien se registra
   sabe qué le van a preguntar y cuánto le queda. Y trocear por número parte
   los grupos por la mitad, así que «Discapacidad» acabaría a caballo entre dos
   pantallas — justo la pregunta donde peor sienta perder el contexto de por
   qué se la están haciendo.

   Además el reparto ya está en manos del organizador sin tocar código: es la
   columna «Grupo» de la plantilla que se descarga. Cambia el Excel, cambia la
   paginación.

   El troceo por número se queda como red de seguridad: para el que sube
   treinta preguntas sin llenar esa columna, y para el grupo que se pasa de
   tamaño. Nunca como reparto principal. */

export const TOPE_MODULO = 10;

/* Los campos sin grupo van juntos y al final: son los sueltos que el
   organizador no clasificó, y mezclarlos con un grupo con nombre haría mentir
   al título del módulo. */
const SIN_GRUPO = '__sueltos__';

const limpio = (v) => String(v ?? '').trim();

/* Reparte respetando el orden en que llegan los campos —el servidor ya los
   sirve por `orden`— y el orden de aparición de cada grupo. */
export function dividirEnModulos(campos, { tope = TOPE_MODULO, tituloSueltos = 'Otros datos' } = {}) {
  const lista = Array.isArray(campos) ? campos.filter(Boolean) : [];
  if (lista.length === 0) return [];

  const orden = [];
  const porGrupo = new Map();
  for (const c of lista) {
    const g = limpio(c.grupo) || SIN_GRUPO;
    if (!porGrupo.has(g)) { porGrupo.set(g, []); orden.push(g); }
    porGrupo.get(g).push(c);
  }

  /* Los sueltos al final, pase lo que pase: son el cajón de sastre. */
  orden.sort((a, b) => (a === SIN_GRUPO ? 1 : 0) - (b === SIN_GRUPO ? 1 : 0));

  const modulos = [];
  for (const g of orden) {
    const suyos = porGrupo.get(g);
    const nombre = g === SIN_GRUPO ? tituloSueltos : g;

    if (suyos.length <= tope) {
      modulos.push({ id: `g:${g}:0`, titulo: nombre, campos: suyos });
      continue;
    }

    /* Grupo más largo que el tope: se parte, y el título lo dice. Callarlo
       haría que dos pantallas seguidas se llamaran igual y pareciera que el
       formulario no avanza. */
    const trozos = Math.ceil(suyos.length / tope);
    for (let i = 0; i < trozos; i++) {
      modulos.push({
        id: `g:${g}:${i}`,
        titulo: `${nombre} (${i + 1} de ${trozos})`,
        campos: suyos.slice(i * tope, (i + 1) * tope),
      });
    }
  }

  return modulos;
}

/* ¿Merece la pena paginar?

   Con dos preguntas, partirlas en pasos es peor que no hacer nada: añade
   clics y una barra de progreso para algo que cabía de una vez. Sólo se
   pagina cuando hay varios grupos de verdad, o cuando la lista es larga. */
export function convienePaginar(modulos, totalCampos) {
  if (modulos.length <= 1) return false;
  return totalCampos > 6;
}
