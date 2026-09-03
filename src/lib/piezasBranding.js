import { normalizarEtiqueta, medidas } from './etiquetaTermica.js';

/* Las piezas que un evento imprime: escarapelas, manillas, tarjetas.
 *
 * ── Por qué es un catálogo y no una medida ────────────────────────────────
 *
 * Esto empezó siendo un número escrito en el código —100 × 50, porque ese era el
 * rollo que teníamos delante—. Luego pasó a ser configurable por evento, que ya
 * era mejor. Pero seguía dando por hecho que **un evento imprime una cosa**, y
 * no es verdad: el mismo evento saca escarapelas para el staff, manillas para
 * los tres días y tarjetas para los patrocinadores, y cada una es otro tamaño,
 * otro rollo y otro contenido.
 *
 * Así que el catálogo es de la plataforma —los tipos que existen y lo que se
 * sabe de cada uno— y las piezas son del evento: cada organizador arma las
 * suyas, partiendo de un tipo o desde cero.
 *
 * ── Lo que el catálogo aporta y una lista de medidas no ──────────────────
 *
 * Las medidas son la parte fácil. Lo que cambia de una pieza a otra es **qué
 * cabe dentro**, y eso es lo que hay que saber antes de comprar el rollo:
 *
 * · En una escarapela cabe el QR del token firmado y el nombre grande.
 * · En una manilla **no cabe ese QR**, y no es cuestión de diseño (ver abajo).
 * · En una tarjeta cabe todo, pero se lee de cerca: el nombre no necesita 6 mm.
 *
 * Por eso cada tipo trae su nota. Es lo que evita descubrirlo con mil manillas
 * ya impresas.
 */

/* ── El QR: qué lleva dentro ───────────────────────────────────────────────
 *
 * Dos opciones, y la diferencia importa:
 *
 * · **`token`** — la firma. Es lo que el control de ingreso valida sin dudar, y
 *   ocupa 27,4 mm de lado como mínimo absoluto. Es el que va en todo lo que
 *   tenga sitio.
 * · **`codigo`** — los 8 caracteres del código corto. Ocupa unos 9 mm, así que
 *   cabe donde el otro no. A cambio es **adivinable**: 8 caracteres sobre 32
 *   símbolos son ~1,1 billones de combinaciones, así que nadie lo acierta en una
 *   puerta, pero alguien que pruebe en bloque contra la API sí podría — eso se
 *   tapa con límite de intentos, no con el papel.
 *
 * El servidor acepta los dos, así que la elección no rompe nada: cambia lo que
 * hay que proteger por otro lado.
 */
export const CONTENIDOS_QR = [
  { id: 'token',  label: 'Firma completa', pista: 'Lo más seguro. Necesita al menos 28 mm de alto libre.' },
  { id: 'codigo', label: 'Código corto',   pista: 'Cabe en casi nada. Es adivinable en bloque: conviene sólo donde el otro no entra.' },
];

/* Los tipos que conoce la plataforma. Un evento puede partir de uno y cambiarle
   lo que quiera; lo que no puede es inventarse el ancho de un rollo que no
   existe, y por eso cada uno trae medidas reales de material que se compra. */
export const TIPOS_PIEZA = [
  {
    id: 'escarapela',
    nombre: 'Escarapela',
    pista: 'La de colgar del cuello. Es la que se lee de lejos.',
    medidas: { ancho: 100, alto: 50, margen: 3, qr_objetivo: 40, disposicion: 'auto' },
    qr_contenido: 'token',
  },
  {
    id: 'tarjeta',
    nombre: 'Tarjeta',
    pista: 'Tamaño de tarjeta bancaria (ISO 7810). Entra en cualquier portatarjetas.',
    medidas: { ancho: 85.6, alto: 54, margen: 3, qr_objetivo: 38, disposicion: 'auto' },
    qr_contenido: 'token',
  },
  {
    id: 'manilla',
    nombre: 'Manilla',
    pista: 'Para los días completos. Ojo: el QR firmado NO cabe — ver el aviso al elegirla.',
    medidas: { ancho: 250, alto: 25, margen: 2, qr_objetivo: 20, disposicion: 'lado' },
    /* Aquí no es una preferencia: con 25 mm de alto y márgenes, el QR firmado no
       entra ni a tres puntos por módulo. O código corto, o no hay QR. */
    qr_contenido: 'codigo',
  },
  {
    id: 'mini',
    nombre: 'Etiqueta pequeña',
    pista: 'Para marcar cosas: equipaje, sillas, cajas.',
    medidas: { ancho: 70, alto: 40, margen: 2, qr_objetivo: 30, disposicion: 'auto' },
    qr_contenido: 'token',
  },
  {
    id: 'colgante',
    nombre: 'Colgante grande',
    pista: 'Vertical, para prensa y staff. El nombre se lee a varios metros.',
    medidas: { ancho: 100, alto: 150, margen: 5, qr_objetivo: 60, disposicion: 'debajo' },
    qr_contenido: 'token',
  },
];

export const tipoPieza = (id) => TIPOS_PIEZA.find(t => t.id === id) || TIPOS_PIEZA[0];

let contador = 0;
const nuevoId = () => `pz_${Date.now().toString(36)}_${++contador}`;

/* Una pieza, puesta en forma. Las medidas pasan por el mismo acotado que ya
   existía —topes y punto entero de 203 dpi—, así que una pieza no puede tener
   medidas que la impresora no sepa imprimir. */
export function normalizarPieza(p) {
  const base = p && typeof p === 'object' ? p : {};
  const tipo = tipoPieza(base.tipo);
  return {
    id: base.id || nuevoId(),
    tipo: tipo.id,
    nombre: String(base.nombre || tipo.nombre).slice(0, 60),
    qr_contenido: CONTENIDOS_QR.some(c => c.id === base.qr_contenido) ? base.qr_contenido : tipo.qr_contenido,
    ...normalizarEtiqueta({ ...tipo.medidas, ...base }),
  };
}

export function piezaDesdeTipo(id) {
  const t = tipoPieza(id);
  return normalizarPieza({ tipo: t.id, nombre: t.nombre, qr_contenido: t.qr_contenido, ...t.medidas });
}

/* Las piezas de un evento. Si no ha armado ninguna, se le da la escarapela: es
   lo que imprime todo el mundo, y arrancar con una lista vacía obliga a decidir
   antes de ver nada. */
export function piezasDelEvento(evento) {
  const guardadas = evento?.page_json?.piezas;
  if (Array.isArray(guardadas) && guardadas.length) return guardadas.map(normalizarPieza);
  return [piezaDesdeTipo('escarapela')];
}

/* El QR de una boleta para una pieza concreta.
 *
 * Se cae al código corto si no hay token, que es lo que ya hacía antes: un
 * papel sin QR no sirve para nada, y el servidor acepta los dos. */
export function valorQr(pieza, ticket = {}) {
  if (pieza?.qr_contenido === 'codigo') return ticket.codigo || ticket.qr_token || '';
  return ticket.qr_token || ticket.codigo || '';
}

/* Si esta pieza puede imprimirse tal como está, y si no, qué hay que cambiar.
 *
 * Se comprueba contra un token REAL de 253 caracteres —no contra el código
 * corto— cuando la pieza lleva firma, porque es el caso que decide. */
export function revisarPieza(pieza, muestra = 'x'.repeat(253)) {
  const p = normalizarPieza(pieza);
  const valor = p.qr_contenido === 'codigo' ? 'ABCD2345' : muestra;
  const m = medidas(valor, p);

  /* El caso que hay que explicar y no sólo marcar en rojo: la manilla. Decir
     «no cabe» sin decir que hay salida deja a alguien creyendo que las manillas
     no se pueden usar. */
  const arreglo = (!m.cabe && p.qr_contenido === 'token')
    ? 'Con la firma completa no entra. Cambia el QR a «código corto» —cabe en 9 mm— o usa una pieza más alta.'
    : null;

  return { ...m, pieza: p, arreglo };
}
