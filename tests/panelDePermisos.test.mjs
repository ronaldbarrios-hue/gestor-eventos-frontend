/* El panel de roles tiene que dejar encontrar el permiso que hace falta.
 *
 * De capacitar a quien iba a llevar la logística de un evento: hubo que darle
 * permisos muy altos para que pudiera operar, y encontrar cuáles en una lista
 * de treinta casillas costó más que la propia capacitación.
 *
 * Lo que faltaba, en orden de cuánto estorbaba:
 *   1. no se podía buscar — para saber si existía «el de los documentos» había
 *      que leer los treinta, y si no aparecía no se sabía si es que no existe
 *      o si está con otro nombre en otro grupo
 *   2. no se veía cuánto llevabas puesto de cada grupo, ni había forma de
 *      decir «todo lo de Clientes» sin dar quince clics
 *   3. nada distinguía un permiso que abre una pantalla de uno que BORRA
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SEL = fs.readFileSync(
  path.join(process.cwd(), 'src', 'components', 'permisos', 'PermisosSelector.jsx'), 'utf8');
const PERMISOS = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'permisos.js'), 'utf8');

test('se puede buscar, y por palabras', () => {
  assert.match(SEL, /placeholder="Buscar permiso/);
  /* Por palabras y no por trozo literal, igual que las demás búsquedas del
     panel: «quitar documentos» tiene que encontrar «Subir y quitar
     documentos». */
  assert.match(SEL, /palabras\.every\(w => donde\.includes\(w\)\)/);
});

test('la búsqueda mira también el id técnico', () => {
  /* Es lo que dicen los mensajes del servidor —«hace falta gestionar_padron»—
     y hasta hoy no había forma de saber qué casilla era ésa. */
  assert.match(SEL, /\$\{p\.label\} \$\{p\.desc\} \$\{grupo\} \$\{p\.id\}/);
  assert.match(SEL, /\{p\.id\}<\/span>/, 'el id no se enseña en la casilla');
});

test('los acentos no estorban', () => {
  /* Quien escribe «acreditacion» tiene que encontrar «Diseñar escarapelas y
     carnés». */
  assert.match(SEL, /normalize\('NFD'\)/);
});

test('que la búsqueda no encuentre nada se dice', () => {
  /* Con la lista entera delante, «no está» y «no lo veo» eran lo mismo. */
  assert.match(SEL, /Ningún permiso coincide/);
});

test('se ve cuánto llevas de cada grupo y se puede marcar el grupo entero', () => {
  /* A mano son quince clics, y es cuando alguien decide que es más rápido dar
     el permiso grande — que es justo lo que pasó. */
  assert.match(SEL, /alternarGrupo/);
  assert.match(SEL, /\{puestos\}\/\{perms\.length\}/);
  assert.match(SEL, /todos \? 'quitar todo' : 'marcar todo'/);
});

test('lo que no se deshace se marca', () => {
  /* No se esconde ni se bloquea: se marca. Quien arma un rol va deprisa y a
     golpe de reconocer palabras. */
  assert.match(SEL, /const DELICADOS = new Set\(/);
  for (const id of ['borrar_boletas', 'gestionar_roles', 'remover_miembros', 'reembolsar']) {
    assert.match(SEL, new RegExp(`'${id}'`), `${id} dejó de estar marcado como delicado`);
  }
  assert.match(SEL, /delicado/);
});

test('los cuatro permisos que partían la llave maestra están en el panel', () => {
  /* `editar_evento` era el único que abría cinco sitios: subir un documento,
     diseñar la escarapela, cargar el padrón y publicar vacantes. Para dejar
     hacer una de esas cuatro había que dar el evento entero. */
  for (const id of ['gestionar_documentos', 'gestionar_acreditacion',
    'gestionar_padron', 'gestionar_vacantes']) {
    assert.match(PERMISOS, new RegExp(`id: '${id}'`), `${id} no se puede conceder desde el panel`);
  }
  /* Y con descripción: una casilla sin explicación se marca por el nombre, que
     es como se concede de más. */
  const conDesc = [...PERMISOS.matchAll(/\{\s*id:\s*'([^']+)'[^}]*?desc:\s*'([^']+)'/g)].map(m => m[1]);
  for (const id of ['gestionar_documentos', 'gestionar_acreditacion',
    'gestionar_padron', 'gestionar_vacantes']) {
    assert.ok(conDesc.includes(id), `${id} sale sin explicación`);
  }
});

test('el selector vive en su propio archivo', () => {
  /* Estaba dentro de EquipoTab, que son 700 líneas de otra cosa. */
  const eq = fs.readFileSync(
    path.join(process.cwd(), 'src', 'pages', 'events', 'tabs', 'EquipoTab.jsx'), 'utf8');
  assert.doesNotMatch(eq, /function PermisosSelector/);
  assert.match(eq, /import PermisosSelector from/);
});
