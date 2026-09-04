/* Cada función de `src/api/` la llama alguien.
 *
 * ── Por qué existe esta prueba ────────────────────────────────────────────
 *
 * El caso que la provocó: `promocionesApi.validar`. El panel llevaba tiempo
 * dejando crear promociones —código, porcentaje, vigencia, límite de usos—, el
 * servidor tenía la ruta que dice si un código sirve, y la pantalla de compra
 * no la llamaba. Nadie la llamaba. El organizador anunciaba «FESTECH20» a su
 * gente y la plataforma cobraba el precio entero.
 *
 * Eso no se ve en ninguna parte: compila, no hay aviso, las pruebas pasan y la
 * pantalla del panel funciona perfectamente. Lo único que falta es el otro
 * extremo del cable, y la única forma de notarlo es buscarlo a propósito.
 *
 * Buscar al revés —del backend al frontend— no serviría: una ruta puede
 * existir para el agente, para un webhook o para el móvil. La capa `src/api/`
 * en cambio se escribe SÓLO para que la use una pantalla. Si nadie la llama,
 * o falta la pantalla o sobra la función.
 *
 * ── Cómo se aprueba una excepción ────────────────────────────────────────
 *
 * La lista de abajo tiene lo que hoy está suelto, cada una con su motivo. Para
 * añadir una nueva hay que escribir el motivo — que es justo el momento en que
 * uno se da cuenta de que no lo tiene.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';

/* Lo que hoy está desconectado y por qué. Cada línea es una pantalla que falta
   o una función que sobra — no una excepción permanente. */
const SUELTAS = {
  /* La única, y no es una pantalla que falte: es media función. Su propio
     comentario en `routes/vacantes.js` dice que registra el cobro como
     pendiente y que el destacado se activará «cuando el pago se confirme
     (webhook de pagos)». Ponerle un botón hoy cobraría por algo que no pasa. */
  'vacantesApi.destacar': 'STUB declarado en el servidor: registra un cobro pendiente y no hay pasarela que lo confirme.',
};

/* `destacar` es un STUB declarado: su propio comentario en `routes/vacantes.js`
   dice que registra el cobro como pendiente y que el destacado se activará
   «cuando el pago se confirme (webhook de pagos)». No es una pantalla que
   falte: es media función. Conectarle un botón hoy cobraría por algo que no
   pasa. */

function archivos(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const ruta = `${dir}/${f}`;
    if (statSync(ruta).isDirectory()) archivos(ruta, out);
    else if (/\.jsx?$/.test(f)) out.push(ruta);
  }
  return out;
}

test('toda función de src/api la llama alguna pantalla', () => {
  /* Qué exporta la capa de API: `export const xApi = { a: ..., b: ... }`. */
  const declaradas = [];
  for (const ruta of archivos('src/api')) {
    const src = readFileSync(ruta, 'utf8');
    for (const obj of src.matchAll(/export const (\w+)\s*=\s*\{([\s\S]*?)\n\};/g)) {
      for (const m of obj[2].matchAll(/^ {2}(\w+)\s*:/gm)) declaradas.push(`${obj[1]}.${m[1]}`);
    }
  }
  assert.ok(declaradas.length > 100, 'no se están leyendo las APIs: la expresión de arriba dejó de encajar');

  /* Todo el código MENOS la propia capa de API: que una función de api/ se
     llame desde api/ no la conecta con ninguna pantalla. */
  const cuerpo = archivos('src')
    .filter((f) => !f.startsWith('src/api/'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');

  const sueltas = declaradas.filter((d) => !cuerpo.includes(d));
  const nuevas = sueltas.filter((d) => !(d in SUELTAS));
  assert.deepEqual(nuevas, [],
    `estas funciones de API no las llama nadie y no están justificadas: ${nuevas.join(', ')}.\n` +
    'O falta la pantalla que las usa, o sobra la función. Si es a propósito, añádela a SUELTAS con su motivo.');

  /* Y al revés: una excepción que ya se conectó tiene que salir de la lista, o
     la lista se vuelve un cementerio que no dice nada. */
  const yaConectadas = Object.keys(SUELTAS).filter((d) => cuerpo.includes(d));
  assert.deepEqual(yaConectadas, [],
    `ya tienen pantalla, quítalas de SUELTAS: ${yaConectadas.join(', ')}`);
});
