/* La escarapela impresa en la etiquetadora térmica (SAT TT460).
 *
 * Esto NO es el diseñador de escarapelas que ya existe. Aquél compone una HOJA
 * con varias escarapelas para cortar a mano, en una impresora normal. La TT460
 * saca **una etiqueta a la vez**, a tamaño exacto, desde un rollo. Son dos
 * medios distintos y el mismo diseño no vale para los dos.
 *
 * ── Lo que cambia el diseño, y no es una cuestión de gusto ────────────────
 *
 * **1 · No hay colores. No hay ni grises.** La transferencia térmica es de un
 * bit: cada punto se imprime o no se imprime, con la tinta de la cinta que esté
 * cargada. Un gris sólo se puede fingir con trama, y a 203 dpi una trama se ve
 * sucia. Así que el color por tipo de asistente —lo único configurable de la
 * escarapela original— **no se puede imprimir aquí**.
 *
 * Se sustituye por algo que sí sobrevive en un bit: el tipo en un recuadro con
 * borde, y para el tipo que se quiera destacar, el recuadro invertido (relleno
 * con el texto en blanco). Si de verdad hacen falta dos colores, la salida es
 * operativa y no de diseño: cargar una cinta dorada e imprimir los VIP en una
 * tanda aparte.
 *
 * **2 · Los rellenos grandes se evitan.** Una banda negra a lo ancho gasta
 * cinta, calienta el cabezal —que baja la velocidad real— y se corre si la
 * escarapela roza. Por eso el recuadro invertido es pequeño y el resto va en
 * línea fina.
 *
 * **3 · Todo cae en puntos enteros.** 203 dpi son exactamente 8 puntos por
 * milímetro. Una medida de 3,3 mm son 26,4 puntos: el cabezal la redondea y el
 * borde queda con un diente. Todas las medidas de aquí abajo son múltiplos de
 * 0,125 mm.
 *
 * ── El tamaño, y por qué éste ────────────────────────────────────────────
 *
 * **90 × 55 mm**, que es el `9x5` que el diseñador de escarapelas ya trae por
 * defecto. No es una medida inventada: si ya se compraron portagafetes para
 * ese tamaño, la etiqueta entra en ellos. Cambiarlo obligaría a comprar otros.
 *
 * A 203 dpi son 720 × 440 puntos.
 *
 * ── El QR, que es quien manda ────────────────────────────────────────────
 *
 * Lleva el token firmado, no el código corto: el código son 8 caracteres sobre
 * 32 símbolos —unos 40 bits— y se puede adivinar. El token va firmado.
 *
 * Ese token son ~253 caracteres, que en modo byte con corrección M no caben por
 * debajo de la **versión 12: 65 × 65 módulos**. Con el margen obligatorio de 4
 * módulos por lado son 73. A 3 puntos por módulo:
 *
 *     73 módulos × 3 puntos = 219 puntos ÷ 8 = 27,375 mm
 *
 * Tres puntos por módulo es el mínimo con el que un lector barato acierta a la
 * primera. Con dos se lee en el móvil bueno y falla en la puerta, que es donde
 * importa.
 *
 * **Si el token creciera**, la versión sube y el QR con ella. Por eso
 * `medidas()` lo calcula en vez de dejarlo fijo: el día que el token pase de
 * 287 caracteres, el cuadrado crece solo y se avisa si ya no cabe. */

/* 203 dpi exactos. */
export const PUNTOS_POR_MM = 8;

/* Capacidad en modo byte por versión, corrección M. Sólo de la 8 a la 16: por
   debajo no cabe un token y por encima el QR ya no entra en la etiqueta. */
const CAPACIDAD_M = [
  [8, 152], [9, 182], [10, 213], [11, 251], [12, 287],
  [13, 331], [14, 362], [15, 412], [16, 450],
];

const MODULOS = (version) => version * 4 + 17;
const QUIET = 4;                 // margen obligatorio, en módulos
const PUNTOS_POR_MODULO = 3;

/* La etiqueta, en milímetros. Todo múltiplo de 0,125 para caer en punto entero. */
export const ETIQUETA = {
  ancho: 90,
  alto: 55,
  margen: 3,
  /* El hueco entre el QR y el texto. Menos de 2 mm y el lector se come parte
     del nombre como si fuera código. */
  separacion: 3,
};

export function versionParaToken(largo) {
  const fila = CAPACIDAD_M.find(([, cap]) => largo <= cap);
  return fila ? fila[0] : null;
}

/* Cuánto ocupa el QR de un token concreto, y si la etiqueta le da. */
export function medidas(token = '') {
  const largo = String(token || '').length;
  const version = versionParaToken(largo);

  if (!version) {
    return {
      cabe: false,
      motivo: `El token tiene ${largo} caracteres y no cabe en un QR que quepa en la etiqueta.`,
    };
  }

  const modulos = MODULOS(version) + QUIET * 2;
  const puntos = modulos * PUNTOS_POR_MODULO;
  const mm = puntos / PUNTOS_POR_MM;
  const alturaUtil = ETIQUETA.alto - ETIQUETA.margen * 2;

  return {
    cabe: mm <= alturaUtil,
    version,
    modulos: MODULOS(version),
    lado_mm: mm,
    lado_puntos: puntos,
    /* Lo que queda para el nombre y lo demás. */
    texto_mm: ETIQUETA.ancho - ETIQUETA.margen * 2 - mm - ETIQUETA.separacion,
    motivo: mm <= alturaUtil
      ? null
      : `El QR necesita ${mm.toFixed(1)} mm de lado y en la etiqueta caben ${alturaUtil} mm.`,
  };
}

/* Tamaños de letra, en milímetros de altura de mayúscula.
 *
 * No se usan puntos tipográficos a propósito: lo que decide si un nombre se lee
 * desde el otro lado de la mesa es su altura física, y a 203 dpi por debajo de
 * 2 mm las letras empiezan a rellenarse y una «e» se convierte en un borrón. */
export const ALTURAS_MM = {
  nombre: 6,      // se lee de pie, a metro y medio
  tipo: 3,
  evento: 2.5,
  codigo: 3.5,    // monoespaciada: es lo que se teclea cuando el QR no lee
};

/* De milímetros a puntos, redondeando al punto entero: si no, el cabezal
   redondea por su cuenta y el resultado no es el que se midió. */
export const aPuntos = (mm) => Math.round(mm * PUNTOS_POR_MM);
