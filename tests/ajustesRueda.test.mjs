/* Los ajustes de la rueda en el panel (0113), y la mitad que faltaba de la 0108.
 *
 * ── Lo que se cuida aquí ─────────────────────────────────────────────────
 *
 * Dos huecos del mismo tipo: una regla que existía en el servidor y no en la
 * pantalla, o al revés. Es lo que más ha costado en este proyecto — el valor
 * está, alguien lo lee donde no está, y nada falla: simplemente no hay nada.
 *
 * Correr: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ruedaEncendida, CATEGORIAS_HEREDADAS, topeValido, TOPE_MAX,
  limpiarMotivo, MOTIVO_MAX, estadoDeCasilla,
} from '../src/lib/ajustesRueda.js';

const leer = (f) => fs.readFileSync(path.join(process.cwd(), f), 'utf8').replace(/\r/g, '');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('la pestaña la decide el evento, no su categoría', () => {
  assert.equal(ruedaEncendida({ networking_activo: true, categoria: { slug: 'otros' } }), true);
  assert.equal(ruedaEncendida({ networking_activo: false, categoria: { slug: 'negocios' } }), false);
});

test('contra un backend viejo se sigue viendo lo de ayer', () => {
  /* Hoy hay DOS servidores sirviendo la misma API y uno se despliega a mano.
     Un evento leído del que va por detrás llega sin `networking_activo`: si eso
     se leyera como «apagada», la rueda de FESTECH desaparecería del panel. */
  assert.equal(ruedaEncendida({ categoria: { slug: 'negocios' } }), true);
  assert.equal(ruedaEncendida({ networking_activo: null, categoria: { slug: 'tecnologia' } }), true);
  assert.equal(ruedaEncendida({ categoria: { slug: 'deportes' } }), false);
  assert.equal(ruedaEncendida(null), false);
});

test('el panel y el servidor tienen el mismo techo de tope', () => {
  /* Dos números distintos serían un formulario que acepta lo que la base
     rechaza, y el error llegaría desde Postgres sin traducir.
     El backend es otro repositorio: si no está al lado, se comprueba lo de
     aquí y ya. Una prueba que exige la carpeta del vecino no corre en CI, y
     una prueba que no corre no cuida nada. */
  const vecino = ['../gestor-eventos-backend/lib/ajustesRueda.js',
                  '../../../../gestor-eventos-backend/lib/ajustesRueda.js']
    .map(f => path.resolve(process.cwd(), f)).find(f => fs.existsSync(f));
  if (vecino) {
    assert.match(fs.readFileSync(vecino, 'utf8'), new RegExp(`const TOPE_MAX = ${TOPE_MAX};`));
  }
  assert.equal(topeValido(''), null);
  assert.equal(topeValido(0), undefined);
  assert.equal(topeValido(TOPE_MAX + 1), undefined);
  assert.equal(topeValido('7'), 7);
});

test('el motivo cabe donde se pinta', () => {
  assert.equal(limpiarMotivo('  llega  a las 11:30 '), 'llega a las 11:30');
  assert.equal(limpiarMotivo('x'.repeat(300)).length, MOTIVO_MAX);
  assert.equal(limpiarMotivo(''), null);
});

test('la casilla tiene tres estados, no dos', () => {
  /* «Libre», «ocupada» y «bloqueada» son cosas distintas para quien coordina:
     pintar las dos últimas igual convierte un bloqueo propio en una reunión
     que uno no recuerda haber puesto. */
  assert.equal(estadoDeCasilla({}), 'libre');
  assert.equal(estadoDeCasilla({ bloqueado: true }), 'bloqueada');
  assert.equal(estadoDeCasilla({ cita: { id: 'x' } }), 'ocupada');
  assert.equal(estadoDeCasilla({ cita: { id: 'x' }, bloqueado: true }), 'ocupada');
});

test('la lista de categorías ya no decide nada en el workspace', () => {
  const ws = sinComentarios(leer('src/pages/events/workspace/EventWorkspace.jsx'));
  assert.doesNotMatch(ws, /CATEGORIAS_NETWORKING/);
  assert.match(ws, /const permiteNetworking = ruedaEncendida\(evento\);/);
});

test('el interruptor de la rueda está fuera de la pestaña de la rueda', () => {
  /* Con la rueda apagada esa pestaña no existe: un interruptor dentro de ella
     sólo sabría apagarla. */
  const ws = leer('src/pages/events/workspace/EventWorkspace.jsx');
  assert.match(ws, /function RuedaDelEvento\(/);
  assert.match(ws, /case 'configuracion\/general'\s*:\s*return <ConfigGeneral evento=\{evento\} reload=\{reload\} \/>;/);
  assert.match(ws, /<RuedaDelEvento evento=\{evento\} reload=\{reload\} \/>/);
});

test('encender la rueda recarga el evento', () => {
  /* De eso depende que la pestaña aparezca en el menú. Sin recargar habría que
     salir y volver a entrar, que es justo cuando uno cree que no se guardó. */
  const ws = leer('src/pages/events/workspace/EventWorkspace.jsx');
  assert.match(ws, /reload\?\.\(\);/);
});

/* ── La mitad que faltaba de la 0108 ─────────────────────────────────── */

test('sentar a alguien acepta el correo, no sólo la cuenta', () => {
  /* El servidor lo acepta desde la 0108 y el panel seguía mandando sólo
     `user_id`: comprar una boleta es anónimo a propósito y de la mayoría de
     asistentes lo único que queda es el correo. Con la regla vieja, armar la
     agenda a mano era imposible para casi todos. */
  const api = sinComentarios(leer('src/api/networking.js'));
  assert.match(api, /sentar\s*:\s*\(eventoId, horarioId, quien\)/);
  assert.match(api, /\{ horario_id: horarioId, \.\.\.quien \}/);
});

test('la lista ya no pinta en gris a quien no tiene cuenta', () => {
  const p = sinComentarios(leer('src/pages/events/tabs/ParrillaRueda.jsx'));
  assert.doesNotMatch(p, /compró como invitado, sin cuenta/);
  assert.match(p, /const quien = t\.usuario\?\.id \? \{ user_id: t\.usuario\.id \} : \{ email, nombre \};/);
});

test('se puede sentar un correo que no sale en la búsqueda', () => {
  /* El caso de la rueda que se arma la víspera con una hoja de cálculo
     delante: se tiene el correo y no se tiene tiempo de buscarlo. */
  const p = leer('src/pages/events/tabs/ParrillaRueda.jsx');
  assert.match(p, /pareceCorreo && !yaEnLaLista/);
  assert.match(p, /sentar\(\{ email: correoEscrito \}\)/);
});

test('la parrilla distingue bloqueada de libre', () => {
  const p = leer('src/pages/events/tabs/ParrillaRueda.jsx');
  assert.match(p, /if \(!cita && horario\.bloqueado\)/);
  assert.match(p, /Bloqueada por el equipo/);      // y sale en la leyenda
  assert.match(p, /networkingApi\.bloquearHorario\(/);
});
