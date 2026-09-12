/* El mapa dice QUÉ es cada actividad, y de qué día.
 *
 * ── De dónde sale ────────────────────────────────────────────────────────
 *
 * De una captura de la ficha de «Zona gamer»: 261 de 200 personas dentro, y
 * debajo «03:41 a. m. · Torneo gamer». Eso es todo lo que se decía de la
 * actividad. Ni qué es, ni para quién, ni cómo entrar.
 *
 * La descripción estaba guardada —«League of legends», en la fila de esa misma
 * actividad— y no llegaba a la pantalla: el `select` del servidor no la pedía.
 * 14 de las 18 actividades de producción tienen una escrita.
 *
 * ── Y el segundo, que es peor ────────────────────────────────────────────
 *
 * «Después, aquí mismo» escribía sólo la HORA. FESTECH son dos días, así que
 * dos actividades de días distintos se leían seguidas:
 *
 *     08:02 a. m. · Torneo de Videojuegos FIFA   (día 17)
 *     12:00 p. m. · PijaoHub · DemoDay           (día 18)
 *
 * Nadie ve que hay una noche en medio. No da error: da a alguien plantado en
 * la zona equivocada.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(
  path.join(process.cwd(), 'src', 'pages', 'events', 'editor', 'blocks.jsx'), 'utf8').replace(/\r/g, '');
const sinComentarios = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('la ficha de la zona enseña la descripción de cada actividad', () => {
  assert.match(sinComentarios, /\{s\.descripcion && \(/,
    'la ficha del mapa volvió a decir sólo la hora y el título');
  /* Recortada con CSS, no con `slice`: cortar por caracteres parte palabras y
     miente sobre lo que hay escrito. */
  assert.match(sinComentarios, /line-clamp-3/);
  assert.ok(!/descripcion\.slice\(/.test(sinComentarios),
    'la descripción se corta por caracteres, partiendo palabras');
});

test('se puede entrar a la actividad, y no por una pantalla nueva', () => {
  /* Lleva a la agenda pública enfocando esa actividad: ya sabe enseñarla
     entera con su inscripción. `AgendaPublicaPage` cuenta en un comentario que
     escribir una pantalla aparte ya se intentó, y la copia se llevó su propio
     modal de inscripción sin la salida para quien llega sin boleta. */
  assert.match(sinComentarios, /\/explorar\/\$\{evento\.slug\}\/agenda\?sesion=\$\{encodeURIComponent\(s\.id\)\}/,
    'la actividad del mapa no lleva a ninguna parte');

  /* En el editor no navega: quien monta la landing no puede acabar en la
     página pública por tocar la vista previa. */
  assert.match(sinComentarios, /const puedeEntrar = Boolean\(evento\?\.slug && !isEditor\)/);
});

test('las dos listas usan la misma pieza', () => {
  /* «Ahora mismo» y «Después, aquí mismo» tenían la línea escrita dos veces, y
     sólo una de las dos enseñaba el cupo: ya se habían separado un poco. */
  const veces = (sinComentarios.match(/<ActividadDeLaZona\b/g) || []).length;
  assert.ok(veces >= 3, `la fila de actividad se usa ${veces} veces: alguna lista volvió a tener su propia copia`);
  assert.equal((sinComentarios.match(/function ActividadDeLaZona\b/g) || []).length, 1);
});

test('en un evento de varios días, cada día se dice', () => {
  assert.match(sinComentarios, /function porDia\(items\)/);
  assert.match(sinComentarios, /if \(grupos\.length <= 1\)/,
    'agrupa por día aunque sólo haya uno: el encabezado sobra y repite lo que ya se sabe');

  /* La clave del día se calcula en hora LOCAL. Con `toISOString`, a las 8 de la
     noche en Colombia ya es el día siguiente en UTC y la actividad saldría bajo
     el día equivocado — un fallo que sólo aparece de noche. */
  const i = sinComentarios.indexOf('function claveDeDia');
  const cuerpo = sinComentarios.slice(i, sinComentarios.indexOf('}', i));
  assert.match(cuerpo, /getFullYear\(\)/);
  assert.ok(!/toISOString/.test(cuerpo), 'la clave del día se calcula en UTC');
});

test('lo que no tiene hora no desaparece', () => {
  /* El organizador la creó; esconderla es decirle al visitante que no hay
     nada. Va al final, junta y dicho. */
  assert.match(sinComentarios, /Sin hora todavía/);
});

/* ── Y el calendario de la landing, que es el otro sitio donde se listan ──
 *
 * El bloque de agenda tenía los tres mismos problemas que la ficha del mapa, y
 * uno propio:
 *
 *   · decía el título y la hora, sin qué es la actividad
 *   · no se podía entrar a ninguna
 *   · mezclaba días sin separarlos
 *   · y se cortaba en `limite` SIN DECIRLO: con seis de dieciocho, lo que se
 *     lee es que el evento tiene seis actividades
 *
 * El enlace a «el programa completo» no desmiente ese corte: suena a «lo
 * mismo, en otra página», no a «aquí falta la mitad».
 */

test('el calendario de la landing agrupa por día, y sólo cuando hay varios', () => {
  assert.match(sinComentarios, /const porDias = grupos\.length > 1;/,
    'la landing agrupa por día aunque el evento sea de un solo día');

  /* Agrupando, la fecha entera en cada línea sobra: ya está arriba del grupo.
     Sin agrupar, se dice entera o no hay forma de saber de qué día es. */
  assert.match(sinComentarios, /porDias\s*\n?\s*\? \{ hour: '2-digit', minute: '2-digit' \}/,
    'agrupado por día se sigue repitiendo la fecha en cada línea');
});

test('la landing dice cuántas actividades deja fuera, y si falta un día entero', () => {
  assert.match(sinComentarios, /const fuera = todas\.length - items\.length;/);
  assert.match(sinComentarios, /Hay \$\{fuera\} actividades más/,
    'el bloque vuelve a cortarse en `limite` sin decir que hay más');
  /* Y que el aviso se PINTE, no sólo que el texto exista en el archivo. Se
     probó cambiando la condición a `false`: el texto seguía ahí y este test
     pasaba en verde sobre un aviso que ya no salía nunca. */
  assert.match(sinComentarios, /\{fuera > 0 && \(/,
    'el aviso de lo que falta está escrito pero no se pinta');

  /* Lo de los días no es un adorno. Medido con la agenda real de FESTECH y un
     tope de cuatro: el bloque enseña el jueves entero y el viernes DESAPARECE.
     «Hay 1 actividad más» es cierto y no dice lo que hace falta saber — que hay
     otro día de evento. */
  assert.match(sinComentarios, /diasFuera === 1 \? ', de otro día'/,
    'se corta un día entero del programa sin decirlo');

  /* Y se cuenta contra los días que SÍ se enseñan: una actividad más del mismo
     día no es «un día más». */
  assert.match(sinComentarios, /\.filter\(c => !diasEnseñados\.has\(c\)\)\.length/);
});

test('las actividades se ordenan antes de agruparlas', () => {
  /* `porDia` junta las CONSECUTIVAS del mismo día: con la lista desordenada
     saldría el mismo día dos veces y otro en medio. Llegan ordenadas del
     servidor, y ordenarlas aquí deja de depender de eso. */
  assert.match(sinComentarios, /const todas = \[\.\.\.\(evento\?\.agenda \|\| \[\]\)\]\.sort\(/);
});

test('y desde la landing también se entra a la actividad', () => {
  const veces = (sinComentarios.match(/\/agenda\?sesion=\$\{encodeURIComponent\(s\.id\)\}/g) || []).length;
  assert.equal(veces, 2, 'el mapa y la landing tienen que llevar los dos a la misma pantalla');
});
