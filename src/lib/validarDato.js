/* GESTEK — Verificar que un dato es lo que dice ser.

   Las reglas por tipo existían en dos sitios: `validarRespuesta` en el
   servidor y `fallaCampo` en CampoFormulario. Y el registro de la cuenta —el
   formulario por el que pasa TODO el mundo— no usaba ninguna de las dos: sólo
   comprobaba el largo de la contraseña, y el correo llegaba hasta el contexto
   de auth, que se conformaba con que tuviera arroba. Así entra un «juan@casa»
   sin punto, o un teléfono en la casilla del correo, y no se descubre hasta que
   la confirmación no llega a ninguna parte.

   Añadir una tercera copia en el registro era lo fácil. Esto es el sitio único
   del lado del navegador; el servidor sigue siendo la autoridad.

   ── Sobre `detectarTipo` ─────────────────────────────────────────────
   Decir «esto no parece un teléfono» es cierto y no ayuda. Decir «eso parece un
   correo, el teléfono va sin arroba» señala el error real, que casi siempre es
   haber escrito en la casilla de al lado. Por eso se detecta qué PARECE el
   valor, no sólo si encaja con lo que se esperaba. */

/* Espejo de la del servidor (lib/formularioCampos.js). Exige punto en el
   dominio: «juan@localhost» es válido para un RFC y no existe para nadie que
   vaya a recibir una boleta. */
export const RE_EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const digitos = (v) => String(v ?? '').replace(/\D/g, '');

export function verificarCorreo(valor) {
  const v = String(valor ?? '').trim();
  if (!v) return null;
  if (RE_EMAIL.test(v)) return null;

  /* Dos errores tan comunes que merecen su propio mensaje: hay quien escribe
     el correo con espacios al copiarlo, y quien pone dos arrobas al corregir
     sin borrar. */
  if (/\s/.test(v)) return 'El correo no puede llevar espacios.';
  if ((v.match(/@/g) || []).length > 1) return 'El correo tiene dos arrobas.';
  if (!v.includes('@')) return 'Falta la arroba (@) en el correo.';
  if (!/\.[^\s@.]+$/.test(v)) return 'Al correo le falta el final del dominio, como «.com» o «.co».';
  return 'Ese correo no es válido.';
}

/* Entre 7 y 15 dígitos: 7 es un fijo local corto y 15 es el máximo que define
   la norma internacional de numeración. Se cuentan sólo los dígitos, así que
   espacios, guiones, paréntesis y el prefijo con «+» no molestan — la gente
   pega el número como lo tiene guardado y no hay motivo para rechazarlo. */
export function verificarTelefono(valor) {
  const v = String(valor ?? '').trim();
  if (!v) return null;
  if (/[a-zA-Z]/.test(v)) return 'El teléfono no puede llevar letras.';
  const n = digitos(v);
  if (n.length < 7)  return 'Ese teléfono es muy corto. Escríbelo completo, con el indicativo de la ciudad si es fijo.';
  if (n.length > 15) return 'Ese teléfono tiene demasiados dígitos.';
  return null;
}

/* Un documento puede llevar letras (pasaporte, NIT con verificación) y se
   escribe con puntos o guiones según la costumbre de cada país, así que se
   limpian antes de medir. No se valida el formato de ningún país concreto: la
   plataforma no es de un solo país y rechazar un documento válido es peor que
   aceptar uno raro. */
export function verificarDocumento(valor) {
  const v = String(valor ?? '').trim();
  if (!v) return null;
  const limpio = v.replace(/[\s.\-/]/g, '');
  if (!/^[A-Za-z0-9]+$/.test(limpio)) return 'El documento sólo puede llevar letras y números.';
  if (limpio.length < 4)  return 'Ese documento es muy corto.';
  if (limpio.length > 20) return 'Ese documento es demasiado largo.';
  return null;
}

export function verificarNumero(valor) {
  if (valor === '' || valor == null) return null;
  return Number.isFinite(Number(valor)) ? null : 'Escribe sólo números.';
}

export function verificarFecha(valor) {
  const v = String(valor ?? '').trim();
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}/.test(v) ? null : 'La fecha no es válida.';
}

/* Qué PARECE el valor, mirándolo sin saber qué se esperaba. */
export function detectarTipo(valor) {
  const v = String(valor ?? '').trim();
  if (!v) return 'vacio';
  if (v.includes('@')) return 'email';

  const n = digitos(v);
  /* Que casi todo sean dígitos es lo que distingue un teléfono de un documento
     escrito con letras, y de un texto que casualmente tiene números. */
  if (n.length >= 7 && n.length <= 15 && n.length >= v.replace(/[\s+()\-.]/g, '').length) return 'telefono';
  if (/^[A-Za-z0-9\s.\-]{4,20}$/.test(v) && /\d/.test(v)) return 'documento';
  return 'texto';
}

/* La verificación completa: comprueba lo que se esperaba y, si falla, mira qué
   parece para poder decirlo. */
export function verificar(tipo, valor) {
  const base = {
    email    : verificarCorreo,
    telefono : verificarTelefono,
    documento: verificarDocumento,
    numero   : verificarNumero,
    fecha    : verificarFecha,
  }[tipo];

  if (!base) return null;
  const fallo = base(valor);
  if (!fallo) return null;

  /* La pista de «esto va en la otra casilla» sólo se da cuando es evidente, y
     eso son dos casos: un correo (tiene arroba, no hay otra cosa que sea) y un
     teléfono que además ES un teléfono válido.

     «Documento» queda fuera a propósito aunque `detectarTipo` lo reconozca: su
     patrón es el más laxo de los tres y se traga casi cualquier cosa con un
     número dentro. Con él dentro, un teléfono de cinco dígitos se anunciaba
     como «eso parece un documento», que es falso y además tapa el aviso útil
     —«ese teléfono es muy corto»—. Una pista equivocada es peor que ninguna:
     manda a corregir donde no es. */
  const parece = detectarTipo(valor);
  const evidente =
    (parece === 'email'    && !verificarCorreo(valor)) ||
    (parece === 'telefono' && !verificarTelefono(valor));

  if (evidente && parece !== tipo) {
    const nombre   = { email: 'un correo', telefono: 'un teléfono' }[parece];
    const esperado = { email: 'el correo', telefono: 'el teléfono', documento: 'el documento' }[tipo] || 'este campo';
    return `Eso parece ${nombre}. Aquí va ${esperado}.`;
  }
  return fallo;
}
