/* De qué color es la web donde nos incrustaron.
 *
 * ── El fallo que arregla ─────────────────────────────────────────────────
 *
 * Un formulario incrustado con el fondo transparente —que es el valor por
 * omisión, y lo que pidió el cliente: «que se vea como parte de su página»—
 * NO pinta ningún fondo: el color lo pone la web anfitriona. Pero el tema
 * —de dónde salen el color del texto y el de los campos— lo decidía
 * `prefers-color-scheme`, o sea el sistema operativo de QUIEN MIRA.
 *
 * Son dos cosas que no tienen por qué coincidir, y cuando no coinciden el
 * formulario queda ilegible. Es exactamente lo que llegó en una foto de
 * FESTECH: su web es azul noche, el visitante tenía el portátil en modo claro,
 * y el registro salió con la paleta clara encima del azul —el título en
 * #15171C sobre casi negro, invisible, y los campos en #E4DFD1, unos recuadros
 * color crema flotando—. Nada falló: cada mitad hizo lo que le tocaba.
 *
 * ── La regla ─────────────────────────────────────────────────────────────
 *
 * Si el fondo lo pone la web anfitriona, el tema también. El sistema operativo
 * del visitante sólo decide cuando no hay nada que copiar: cuando el
 * formulario sí pinta su propio fondo, o cuando la web anfitriona no ejecuta
 * el script que nos lo cuenta (Notion, Wix y demás bloques de «insertar web»).
 *
 * El umbral es la luminancia relativa de la WCAG, no el promedio de los tres
 * canales: el verde pesa siete veces más que el azul para el ojo, y un verde
 * medio con el promedio sale «oscuro» cuando se lee como claro.
 */

/* Un color de CSS a [r, g, b], o null si no se puede saber. `transparent` y
   `rgba(...,0)` devuelven null a propósito: un fondo transparente no dice de
   qué color es la página, dice que hay que seguir mirando hacia arriba. */
export function aRGB(color) {
  const s = String(color || '').trim().toLowerCase();
  if (!s || s === 'transparent' || s === 'none') return null;

  const rgb = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.%]+)\s*)?\)$/);
  if (rgb) {
    const alfa = rgb[4] === undefined ? 1
      : (rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]));
    /* Casi transparente es transparente: un velo al 5 % no manda sobre lo que
       hay debajo, y tomarlo por el fondo de la página da el color equivocado. */
    if (!(alfa > 0.5)) return null;
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }

  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return null;
}

/* Luminancia relativa (WCAG 2.x). 0 = negro, 1 = blanco. */
export function luminancia([r, g, b]) {
  const lineal = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

/* El umbral. 0.18 y no 0.5: entre los dos temas, el que gana es el que da más
   contraste, y un gris medio se lee mejor con texto claro encima que con texto
   oscuro. Con 0.5 un azul de marca como el de FESTECH (#0B1220, luminancia
   0.01) acertaría igual, pero un gris pizarra (#4A5568, 0.09) volvería a caer
   del lado claro y a repetir el problema con menos escándalo. */
const UMBRAL_OSCURO = 0.18;

/* 'oscuro' | 'claro' | null. Null significa «no se pudo saber», y quien
   pregunta tiene que quedarse con lo que ya tenía: adivinar aquí es lo que
   produjo el fallo original. */
export function esquemaDeFondo(color) {
  const rgb = aRGB(color);
  if (!rgb) return null;
  return luminancia(rgb) < UMBRAL_OSCURO ? 'oscuro' : 'claro';
}

/* El fondo de verdad detrás de un elemento: se sube por los padres hasta el
   primero que pinte algo. Un `<div>` sin fondo dentro de una sección azul es
   azul, y preguntarle a él solo devuelve `rgba(0,0,0,0)`.
 *
 * `leerFondo` se inyecta para poder probarlo sin navegador. */
export function fondoDetrasDe(el, leerFondo) {
  let n = el;
  let saltos = 0;
  while (n && saltos < 30) {
    const c = esquemaDeFondo(leerFondo(n));
    if (c) return c;
    n = n.parentElement;
    saltos++;
  }
  return null;
}

/* Qué se lee encima del color de la marca, y qué fondo lo permite.
 *
 * Hace falta porque los botones del formulario pasan a llevar el color del
 * evento, y un dorado como el de FESTECH (#E0B12B) con texto blanco encima no
 * se lee. La cuenta ya existía para decidir el tema de un formulario embebido
 * —`lib/esquemaAnfitrion.js`, luminancia WCAG— y es la misma pregunta.
 *
 * Son dos pasos porque uno no basta:
 *
 * 1. Se elige el texto que MÁS contraste da, no el que caiga de un lado de un
 *    umbral fijo. Con umbral hay marcas que se quedan en el filo.
 * 2. Si ni el claro ni el oscuro llegan al 4.5 que pide la WCAG para AA, se
 *    mueve el FONDO hasta que llegue. Medido: el morado por defecto (#8B5CF6)
 *    da 4.49 con texto oscuro y 4.32 con claro — elegir el mejor de los dos
 *    deja el botón por debajo de AA igual. Un color de marca en esa franja
 *    media no tiene ningún texto que se lea encima; lo único que queda es
 *    oscurecerlo (o aclararlo) un poco, conservando el tono.
 *
 * El tono no cambia: se multiplica el canal, así que sigue siendo el morado
 * del evento, un paso más oscuro. Nadie mira un botón y dice «ése no es mi
 * color»; sí dice «no se lee». */
const CLARO = '#FFFFFF';
const OSCURO = '#12100B';
const AA = 4.5;

function contraste(rgbA, rgbB) {
  const l = [luminancia(rgbA), luminancia(rgbB)].sort((x, y) => y - x);
  return (l[0] + 0.05) / (l[1] + 0.05);
}

const aHex = ([r, g, b]) =>
  '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/* Devuelve {fondo, texto} legibles, partiendo del color de la marca.
 *
 * Si el color no se puede interpretar se devuelve el de siempre: un color que
 * no entendemos no es motivo para cambiarle el botón a nadie. */
export function botonDeMarca(color) {
  const rgb = aRGB(color);
  if (!rgb) return { fondo: null, texto: OSCURO };

  const texto = contraste(rgb, aRGB(CLARO)) >= contraste(rgb, aRGB(OSCURO)) ? CLARO : OSCURO;
  const rgbTexto = aRGB(texto);

  /* Con texto claro el fondo tiene que oscurecerse; con texto oscuro,
     aclararse. Pasos del 6%, hasta 12: es de sobra para cruzar la franja
     media, y el tope evita quedarse dando vueltas si algo no cuadra. */
  let f = rgb;
  for (let i = 0; i < 12 && contraste(f, rgbTexto) < AA; i++) {
    f = texto === CLARO
      ? f.map(v => v * 0.94)
      : f.map(v => v + (255 - v) * 0.06);
  }
  return { fondo: aHex(f), texto };
}
