/* «Máximo 10 palabras» dicho antes de escribir, no después.
 *
 * ── Lo que hay que sostener ──────────────────────────────────────────────
 *
 * El límite lo hace cumplir el servidor. Lo que aporta el navegador es que
 * NADIE llegue a pasarse sin enterarse: un contador que se mueve mientras se
 * escribe, y un `maxLength` que simplemente no deja teclear de más. Descubrir
 * el tope al enviar es descubrirlo después de haber escrito, y entonces hay que
 * recortar a ciegas.
 *
 * ── El riesgo real ───────────────────────────────────────────────────────
 *
 * Que las dos cuentas de palabras se separen. Si el navegador cuenta 10 y el
 * servidor 11, el contador dice que va bien y el envío falla — y no hay nada en
 * pantalla que explique la contradicción. Por eso la regla se compara aquí
 * contra la del servidor, carácter a carácter.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const CAMPO = 'src/components/ui/CampoFormulario.jsx';
const LIB = 'src/lib/limiteTexto.js';
const EDITOR = 'src/pages/events/tabs/FormularioTab.jsx';
const SUBEVENTO = 'src/pages/events/tabs/PreguntasSubEvento.jsx';
const PLANTILLA = 'src/lib/plantillaFormulario.js';
const BACK = '../../../../gestor-eventos-backend/lib/formularioCampos.js';

const leer = (p) => readFileSync(p, 'utf8').replace(/\r/g, '');

/* Las funciones de verdad, importadas y ejecutadas: contar palabras es lógica,
   y comprobarla leyendo el archivo sólo diría que el texto no cambió.
   Por eso viven en un módulo plano y no dentro del `.jsx`: importar JSX desde
   node falla, y estas pruebas se saltaban solas diciendo «ok». */
const { contarPalabras, limiteDe, mensajeLimite } = await import('../src/lib/limiteTexto.js');

test('las dos cuentas de palabras son la MISMA regla', () => {
  /* Se compara el cuerpo de las dos funciones, no su resultado sobre unos
     ejemplos: dos reglas distintas pueden coincidir en los casos fáciles y
     separarse justo en el que trae el problema. */
  if (!existsSync(BACK)) return;                       // repos separados
  const cuerpo = (src) => {
    const i = src.indexOf('function contarPalabras');
    assert.ok(i > 0, 'no encuentro `contarPalabras`; ¿se renombró?');
    return src.slice(i, src.indexOf('}', i) + 1).replace(/\s+/g, ' ').replace(/^export /, '');
  };
  assert.equal(
    cuerpo(leer(LIB)).replace('export function', 'function'),
    cuerpo(leer(BACK)),
    'la cuenta de palabras del navegador y la del servidor se separaron: el contador diría 10 y el envío fallaría por 11');
});

test('cuenta lo mismo que el servidor en los casos que separan reglas', () => {
  assert.equal(contarPalabras('uno dos tres'), 3);
  assert.equal(contarPalabras('  uno   dos  '), 2);
  assert.equal(contarPalabras('uno\ndos\ttres'), 3);
  assert.equal(contarPalabras(''), 0);
  assert.equal(contarPalabras('   '), 0);
  assert.equal(contarPalabras('veinticuatro-siete'), 1);
});

test('se avisa mientras se escribe, no al enviar', () => {
  const campo = { tipo: 'texto', etiqueta: 'Propuesta', max_palabras: 3 };
  assert.equal(limiteDe(campo, 'una dos').pasado, false);
  assert.equal(limiteDe(campo, 'una dos tres').pasado, false, 'justo en el límite no es pasarse');
  assert.equal(limiteDe(campo, 'una dos tres cuatro').pasado, true);
  assert.equal(limiteDe({ tipo: 'texto', etiqueta: 'X' }, 'lo que sea'), null,
    'una pregunta sin límite no debe pintar contador');
  assert.equal(limiteDe({ tipo: 'email', etiqueta: 'X', max_caracteres: 3 }, 'alguien@dominio.com'), null,
    'un correo se está midiendo con un límite de texto');
});

test('pasarse impide enviar, y el mensaje dice cuánto sobra', () => {
  /* `maxLength` no cubre las palabras —el atributo no existe para eso— y pegar
     texto puede saltárselo en algunos navegadores, así que la comprobación al
     enviar tiene que estar igual. */
  const campo = { tipo: 'texto', etiqueta: 'Propuesta', max_palabras: 3 };
  const err = mensajeLimite(campo, limiteDe(campo, 'una dos tres cuatro'));
  assert.match(err, /máximo 3 palabras/);
  assert.match(err, /te sobran 1/);

  const c2 = { tipo: 'parrafo', etiqueta: 'Resumen', max_caracteres: 5 };
  assert.match(mensajeLimite(c2, limiteDe(c2, 'abcdefgh')), /máximo 5 caracteres/);
  assert.equal(mensajeLimite(campo, limiteDe(campo, 'una dos tres')), null,
    'justo en el límite se estaría rechazando');

  /* Y el componente lo usa: si dejara de llamarlo, lo de arriba seguiría
     pasando y el formulario dejaría enviar de más. */
  const usado = leer(CAMPO).includes('const pasado = mensajeLimite(campo, lim);')
    && leer(CAMPO).includes('if (pasado) return pasado;');
  assert.ok(usado, 'el campo dejó de comprobar el límite al enviar');
});

test('el campo no deja teclear de más ni esconde cuánto lleva', () => {
  const src = leer(CAMPO);
  const veces = [...src.matchAll(/maxLength=\{lim\?\.maxC > 0 \? lim\.maxC : undefined\}/g)].length;
  assert.equal(veces, 2, 'falta el tope en el campo de una línea o en el de párrafo');
  assert.match(src, /aria-live="polite"/, 'el contador cambia sin que un lector de pantalla se entere');
  assert.match(src, /te pasaste/, 'pasarse se ve igual que ir bien');
});

test('el organizador puede ponerlo en los dos editores', () => {
  /* Uno es el del evento y sus boletas; el otro, el de sub-eventos y torneos.
     Son dos pantallas distintas y el ajuste tiene que estar en las dos, o
     «todos los formularios» es mentira. */
  for (const [archivo, donde] of [[EDITOR, 'el formulario del evento'], [SUBEVENTO, 'los sub-eventos y torneos']]) {
    const src = leer(archivo);
    assert.match(src, /max_caracteres/, `no se puede poner el tope de caracteres en ${donde}`);
    assert.match(src, /max_palabras/, `no se puede poner el tope de palabras en ${donde}`);
    /* Y tiene que VIAJAR: el ajuste que se edita y no se manda es el que
       parece guardarse y vuelve vacío al recargar. */
    assert.match(src, /max_caracteres:[^,\n]*(Number|null)/, `${donde}: el tope no viaja al servidor`);
  }
});

test('sólo se ofrece donde significa algo', () => {
  /* En un correo el límite ya lo pone su verificación; en una selección, sus
     opciones. Ofrecerlo ahí es un ajuste que no hace nada. */
  for (const archivo of [EDITOR, SUBEVENTO]) {
    assert.match(leer(archivo), /\['texto', 'parrafo'\]\.includes\(c?a?m?p?o?\.?c?\.?tipo\)|\['texto', 'parrafo'\]\.includes\(/,
      `${archivo}: el tope se ofrece en tipos donde no aplica`);
  }
});

test('la hoja de importación también los trae', () => {
  /* Un formulario de treinta preguntas se monta importando. Si el tope sólo se
     pudiera poner a mano habría que abrir las treinta después de importar — o
     sea que en la práctica no se pondría. */
  const src = leer(PLANTILLA);
  assert.match(src, /max_caracteres: tope\('max_caracteres', 10000\)/,
    'la plantilla dejó de leer el tope de caracteres');
  assert.match(src, /max_palabras\s*: tope\('max_palabras', 2000\)/,
    'la plantilla dejó de leer el tope de palabras');
  /* Una celda con basura se ignora, no tumba la importación entera. */
  assert.match(src, /Number\.isFinite\(n\) && n > 0 \? Math\.min\(n, max\) : null/,
    'una celda mal escrita volvería a guardarse como límite roto');
});
