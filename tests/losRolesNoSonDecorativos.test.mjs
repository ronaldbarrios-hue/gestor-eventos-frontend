/* Un rol que se puede conceder tiene que servir para algo.
 *
 * ── El patrón ────────────────────────────────────────────────────────────
 *
 * El menú deja entrar por permiso —y bien: la lista de `perm` de cada pestaña
 * coincide con la que exige el servidor— y luego, dentro, la pantalla decidía
 * por `soyOwner`. Así que la pestaña se abría y decía «Solo el organizador
 * puede…». No es un 403 ni un error: es una pantalla que se abre para
 * enseñarte que no puedes.
 *
 * Encontrado en CINCO sitios, y siempre el mismo daño: un rol de la semilla
 * que se puede repartir y no sirve para nada.
 *
 *   Stands          «Coordinación de expositores» tiene `gestionar_expositores`
 *                   y encontraba tres muros
 *   Rueda           el mismo rol veía sólo «Explorar» y «Mis citas»: podía
 *                   mirar la rueda como un asistente y no operarla
 *   Aforo           quien lleva la logística veía el número y no podía ponerlo
 *                   a cero
 *   Tareas          la persona cuyo trabajo es repartir el trabajo no podía
 *                   crear ni una
 *   Vacantes        el más gratuito: la pestaña dejaba entrar con
 *                   `editar_evento` y el servidor pedía exactamente eso
 *
 * La única salida en los cinco casos era compartir la cuenta de quien creó el
 * evento — que es exactamente lo que los roles existen para evitar.
 *
 * Correr: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const leer = (f) => fs.readFileSync(path.join(process.cwd(), 'src', f), 'utf8').replace(/\r/g, '');
const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

/* Las pantallas que ya se arreglaron, con lo que el SERVIDOR pide en cada una.
 *
 * `soyOwner` puede seguir apareciendo —es el respaldo cuando una pantalla vieja
 * no pasa la bandera, y eso es correcto: lo que no puede hacer es abrirse
 * sola—. Lo que no puede volver es el muro. */
const ARREGLADAS = [
  {
    archivo: 'pages/events/tabs/StandsTab.jsx',
    banderas: ['puedeStands', 'puedeConfigurar'],
    /* Dos poderes y no uno: llevar el directorio es de cada día, cambiar
       cuánto vale un sello es una decisión del evento. */
  },
  { archivo: 'pages/events/tabs/NetworkingTab.jsx', banderas: ['puedeGestionar'] },
  { archivo: 'pages/events/workspace/asistentes/AforoSection.jsx', banderas: ['puedeLimpiar'] },
  { archivo: 'pages/events/tabs/TareasTab.jsx', banderas: ['puedeAsignar'] },
  /* El más gratuito de los cinco: la pestaña dejaba entrar con `editar_evento`
     y el servidor pedía exactamente eso, así que Editor y Coordinador la abrían
     para leer que no podían. */
  { archivo: 'pages/events/tabs/VacantesTab.jsx', banderas: ['puedeGestionar'] },
];

for (const p of ARREGLADAS) {
  test(`${p.archivo.split('/').pop()} decide por permiso, no por haber creado el evento`, () => {
    const src = leer(p.archivo);
    for (const b of p.banderas) {
      assert.ok(src.includes(b), `no recibe ${b}`);
    }
    /* El muro, en cualquiera de sus redacciones. */
    assert.doesNotMatch(sinComentarios(src), /Solo el organizador/,
      'volvió el muro de «Solo el organizador puede…»');
  });
}

test('el workspace calcula esas banderas con los permisos, no con soyOwner a secas', () => {
  const ws = sinComentarios(leer('pages/events/workspace/EventWorkspace.jsx'));
  for (const b of ['puedeStands', 'puedeConfigurar', 'puedeGestionar', 'puedeLimpiar', 'puedeAsignar']) {
    const i = ws.indexOf(`${b}=`);
    assert.ok(i > 0, `el workspace no pasa ${b}`);
    /* Cada una tiene que salir de `puedeVer(...)`, que es quien mira los
       permisos del miembro. Pasar `soyOwner` a secas sería el mismo muro
       escrito una capa más arriba. */
    assert.match(ws.slice(i, i + 120), /puedeVer\('/,
      `${b} no sale de un permiso`);
  }
});

test('y las pestañas siguen dejando entrar a los mismos que el servidor', () => {
  /* Si el menú se cerrara más que el servidor, el arreglo de dentro no lo vería
     nadie: la pestaña no aparecería. Los `perm` de estas tres se corresponden
     con `PERMS_EXPOSITORES` (rueda), `gestionar_expositores`/`checkin` (stands)
     y `checkin` (aforo). */
  const ws = leer('pages/events/workspace/EventWorkspace.jsx');
  assert.match(ws, /id: 'networking'.*perm: \['gestionar_expositores', 'editar_evento'\]/);
  assert.match(ws, /id: 'stands'.*perm: \['gestionar_expositores', 'checkin'\]/);
  assert.match(ws, /id: 'aforo'.*perm: 'checkin'/);
});
