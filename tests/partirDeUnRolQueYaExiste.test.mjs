/* Armar un rol estrecho tiene que costar menos que dar uno ancho.
 *
 * ── De dónde sale ────────────────────────────────────────────────────────
 *
 * De la capacitación de logística: «tuve que darle permisos muy altos para que
 * pudieran operar».
 *
 * Eso no fue descuido. Dar uno ancho es elegir «Administrador» de una lista;
 * armar el estrecho obliga a leer y decidir las 31 casillas una por una,
 * sabiendo de antemano cuál abre qué pantalla. Cuando lo correcto pide mucho
 * más que lo cómodo, se hace lo cómodo — y eso no se arregla con un aviso ni
 * con una insignia de «delicado», se arregla acortando el camino.
 *
 * Medido, para que no se venda de más: el rol de logística de TechNova son 8
 * permisos, o sea 8 clics desde cero y 5 partiendo de «Atención». El ahorro en
 * clics es pequeño. Lo que cambia es no tener que componer la lista de memoria.
 * Y partir de «Coordinador» para ese mismo rol sale PEOR —13 clics— así que la
 * lista dice cuántos permisos trae cada uno antes de elegir.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(
  path.join(process.cwd(), 'src', 'pages', 'events', 'tabs', 'EquipoTab.jsx'), 'utf8').replace(/\r/g, '');
/* Sin comentarios: este archivo explica largo por qué copia sólo los permisos,
   y un test que lea la explicación se aprueba a sí mismo. */
const sinComentarios = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('se puede partir de un rol que ya existe', () => {
  assert.match(sinComentarios, /const copiarDe = async \(id\)/,
    'no hay forma de copiar los permisos de otro rol');
  assert.match(sinComentarios, /Partir de un rol que ya existe/,
    'el selector no aparece en el formulario');
  /* Con su cuenta al lado: «Atención · 5 permisos» dice cuánto estás copiando
     antes de copiarlo. Sin el número hay que copiar para enterarse. */
  assert.match(sinComentarios, /\(r\.permissions \|\| \[\]\)\.length\} permisos/,
    'el selector no dice cuántos permisos trae cada rol');
});

test('copia los permisos y NO el nombre', () => {
  /* Dos roles llamados igual es de lo poco que no se arregla desde esta
     pantalla: el desplegable de asignar miembros los muestra por nombre. */
  const i = sinComentarios.indexOf('const copiarDe');
  const cuerpo = sinComentarios.slice(i, sinComentarios.indexOf('};', i));
  assert.match(cuerpo, /permissions: \[\.\.\.suyos\]/);
  assert.ok(!/nombre: rol\.nombre/.test(cuerpo), 'copia también el nombre del rol');
  assert.ok(!/descripcion: rol\.descripcion/.test(cuerpo), 'copia también la descripción');
});

test('no reemplaza en silencio lo que ya estaba marcado', () => {
  /* Es el fallo que llevamos toda la semana quitando de otros sitios: hacer
     algo que el usuario no pidió y no decirlo. */
  const i = sinComentarios.indexOf('const copiarDe');
  const cuerpo = sinComentarios.slice(i, sinComentarios.indexOf('};', i));
  assert.match(cuerpo, /draft\.permissions\.length && !\(await confirmDialog\(/,
    'copiar pisa lo ya marcado sin preguntar');
  /* Y cuando sí copia, lo dice: cuántos y de quién. Un formulario que cambia
     solo sin decir nada se lee como que no hizo caso. */
  assert.match(cuerpo, /success\(`Copiados \$\{suyos\.length\} permisos/);
});

test('«desde cero» de verdad deja cero', () => {
  /* Volver a la primera opción tiene que limpiar, no quedarse con lo copiado:
     si no, «desde cero» miente y es la opción que alguien elige para empezar
     de nuevo. */
  const i = sinComentarios.indexOf('const copiarDe');
  const cuerpo = sinComentarios.slice(i, sinComentarios.indexOf('};', i));
  assert.match(cuerpo, /if \(!rol\) \{ setPartirDe\(''\); setDraft\(p => \(\{ \.\.\.p, permissions: \[\] \}\)\); return; \}/,
    'elegir «desde cero» no vacía los permisos');
});

test('el formulario vuelve a cero después de crear y al cancelar', () => {
  /* Sin esto, el siguiente rol abre diciendo que parte de uno cuyas casillas
     ya no están marcadas: el selector dice una cosa y la lista otra. */
  const crear = sinComentarios.slice(sinComentarios.indexOf('const onCrear'), sinComentarios.indexOf('const onBorrar'));
  assert.match(crear, /setPartirDe\(''\)/, 'crear un rol no limpia el «partir de»');
  assert.match(sinComentarios, /onClick=\{\(\) => \{ setCreating\(false\); setPartirDe\(''\);/,
    'cancelar no limpia el formulario');
});
