/* El enlace de cupo que ya no vale: decir CUÁL de los tres casos es.
 *
 * ── Lo que pasaba ────────────────────────────────────────────────────────
 *
 * `verificarCupo` contestaba `valida: false` y la página escribía una sola
 * frase para todos: «o se usó, o se pasó el plazo y le tocó al siguiente.
 * Sigues en la fila: si se libera otro, te volvemos a avisar».
 *
 * A quien YA COMPRÓ con ese enlace —el caso más frecuente, porque el correo
 * se guarda y se vuelve a abrir— eso le dice que espere un aviso que no va a
 * llegar, porque ya tiene su boleta. Y en un evento a doce días, alguien que
 * cree que se quedó sin sitio compra otra vez.
 *
 * Una frase que vale para los tres casos no vale para ninguno.
 *
 * ── Por qué se puede distinguir ahora ────────────────────────────────────
 *
 * Porque `consumirOferta` dejó de borrar `oferta_token`: la fila sigue ahí con
 * su estado, así que el servidor puede decir por qué no vale sin devolver el
 * correo ni el nombre de nadie.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const PAGINA = 'src/pages/public/EventoPublicoPage.jsx';
const BACK = '../../../../gestor-eventos-backend/routes/eventos.publicos.js';
const leer = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');
const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

test('cada motivo tiene su frase, y son distintas', () => {
  const src = leer(PAGINA);
  for (const motivo of ['ya_usado', 'vencido', 'paso_al_siguiente', 'desconocido']) {
    assert.match(src, new RegExp(`${motivo}: \\{`), `falta la frase para «${motivo}»`);
  }

  /* Lo que no puede volver: prometerle a quien ya compró que sigue esperando.
     Se mira dentro de su caso, no en toda la página. */
  const i = src.indexOf('ya_usado:');
  const suyo = src.slice(i, src.indexOf('vencido:'));
  assert.doesNotMatch(suyo, /Sigues en la fila/,
    'a quien ya compró se le vuelve a decir que espere un aviso que no llegará');
  assert.match(suyo, /Tu boleta está emitida/,
    'no se le dice lo único que necesita saber: que ya tiene su boleta');
});

test('el motivo llega hasta la pantalla', () => {
  /* Antes se tiraba: `d?.valida ? d : false`. El motivo puede venir y no
     servir de nada si la pantalla lo descarta por el camino. */
  const src = sinComentarios(leer(PAGINA));
  assert.match(src, /setCupo\(d\?\.valida \? d : \{ valida: false, motivo: d\?\.motivo \}\)/,
    'la pantalla vuelve a tirar el motivo y contesta lo mismo a los tres casos');
  assert.match(src, /if \(!cupo\?\.valida\)/,
    'el aviso distingue válido de inválido por la verdad del objeto, no por `valida`');
});

test('un cupo cuya boleta ya no se vende no deja un botón muerto', () => {
  /* El tipo puede haber dejado de estar a la venta desde que salió el correo.
     El botón buscaba el tipo y, si no estaba, no hacía nada: ni abría el
     formulario ni decía por qué. */
  const src = sinComentarios(leer(PAGINA));
  assert.match(src, /tipoDisponible=\{\(evento\.ticket_types \|\| \[\]\)\.some\(x => x\.id === cupo\?\.ticket_type_id\)\}/,
    'ya no se mira si esa boleta sigue existiendo');
  assert.match(src, /Esa boleta ya no está a la venta/,
    'el botón vuelve a poder pulsarse sin que pase nada');
});

test('el servidor manda el motivo', { skip: !existsSync(BACK) }, () => {
  const src = leer(BACK);
  assert.match(src, /valida: false, motivo: await porQueNoVale\(req\.params\.token\)/,
    'la ruta del cupo volvió a contestar sólo `valida: false`');
  assert.match(src, /if \(data\.estado === 'purchased'\) return 'ya_usado';/,
    'no se distingue a quien ya compró');
  /* Y sigue sin devolver datos de nadie: es una ruta pública sin sesión. */
  const fn = src.slice(src.indexOf('async function porQueNoVale'), src.indexOf("router.get('/cupo/:token'"));
  assert.doesNotMatch(fn, /guest_email|guest_nombre|user_id/,
    'la ruta pública del cupo empezó a devolver datos personales');
});
