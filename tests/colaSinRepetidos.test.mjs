/* La cola sin conexión no guarda dos veces el mismo escaneo.
 *
 * ── Por qué no basta el cerrojo de la pantalla ───────────────────────────
 *
 * Con red, el servidor contesta «esa boleta ya entró» en el momento y quien
 * está en la puerta lo resuelve delante de la persona. Sin red no hay quien
 * conteste: el escaneo repetido se guarda dos veces y el aviso llega HORAS
 * después, al sincronizar, convertido en un 409 que ya no se puede relacionar
 * con nadie.
 *
 * Y el cerrojo de pantalla no llega a esto: no sobrevive a una recarga, ni al
 * móvil que mata la pestaña por memoria — que es lo que hace un móvil con la
 * pantalla apagada un rato en una puerta. Así que lo tiene que saber la cola.
 *
 * Esta prueba corre el módulo DE VERDAD, con un `localStorage` de mentira: es
 * lógica que decide qué se guarda, y comprobarla leyendo el archivo sería
 * comprobar que el texto no cambió, no que la regla funciona.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/* `localStorage` de mentira, antes de importar el módulo. */
const almacen = new Map();
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => { almacen.set(k, String(v)); },
  removeItem: (k) => { almacen.delete(k); },
  key: (i) => [...almacen.keys()][i] ?? null,
  get length() { return almacen.size; },
};

const { encolar, leerCola, TIPO_INGRESO, TIPO_SESION } =
  await import('../src/lib/checkinOffline.js');

const EV = 'ev-prueba';
const limpiar = () => almacen.clear();

test('el mismo QR escaneado dos veces se guarda una', () => {
  limpiar();
  const qr = 'firmado.abc.123';
  const a = encolar(EV, { qr_token: qr });
  const b = encolar(EV, { qr_token: qr });

  assert.equal(a.cantidad, 1);
  assert.equal(b.cantidad, 1, 'el segundo escaneo del mismo QR entró otra vez en la cola');
  assert.equal(b.yaEstaba, true, 'no se dice que ya estaba: la pantalla no puede distinguirlo');
  assert.equal(leerCola(EV).length, 1);
});

test('quien está en la puerta sigue viendo «guardado»', () => {
  /* Que ya estuviera no es un fallo de quien escanea, y el escaneo SÍ está a
     salvo. Contestar `guardado: false` le haría apuntar el código a mano para
     nada, con la fila esperando. */
  limpiar();
  encolar(EV, { codigo: 'ABC123' });
  const segundo = encolar(EV, { codigo: 'ABC123' });
  assert.equal(segundo.guardado, true);
});

test('el código a mano se compara sin mirar mayúsculas', () => {
  limpiar();
  encolar(EV, { codigo: 'abc123' });
  encolar(EV, { codigo: 'ABC123' });
  assert.equal(leerCola(EV).length, 1,
    'el mismo código escrito en minúscula pasa como si fuera otra boleta');
});

test('dos personas distintas siguen siendo dos escaneos', () => {
  limpiar();
  encolar(EV, { codigo: 'AAA111' });
  encolar(EV, { codigo: 'BBB222' });
  assert.equal(leerCola(EV).length, 2, 'la cola se está comiendo escaneos buenos');
});

test('la misma pulsera en dos charlas son dos apuntes', () => {
  /* La asistencia a sub-eventos es lo contrario del ingreso: la misma persona
     pasa por varias sesiones y todas cuentan. Sin el sub-evento en la huella,
     la segunda charla no se registraría — y eso es perder datos, que es peor
     que el problema que esto arregla. */
  limpiar();
  encolar(EV, { qr_token: 'x', sesion_id: 's1' }, TIPO_SESION);
  encolar(EV, { qr_token: 'x', sesion_id: 's2' }, TIPO_SESION);
  assert.equal(leerCola(EV).length, 2);
});

test('entrar y asistir a una charla no se confunden', () => {
  limpiar();
  encolar(EV, { qr_token: 'y' }, TIPO_INGRESO);
  encolar(EV, { qr_token: 'y', sesion_id: 's1' }, TIPO_SESION);
  assert.equal(leerCola(EV).length, 2);
});

test('el repetido no se cuela por una recarga', () => {
  /* El caso que el cerrojo de pantalla no cubre: la pestaña se muere entre un
     escaneo y otro, así que el guardia de memoria empieza de cero. Lo que
     queda es lo guardado, y es ahí donde se mira. */
  limpiar();
  encolar(EV, { qr_token: 'z' });
  const cola = leerCola(EV);           // como si se releyera al arrancar
  assert.equal(cola.length, 1);
  encolar(EV, { qr_token: 'z' });
  assert.equal(leerCola(EV).length, 1);
});
