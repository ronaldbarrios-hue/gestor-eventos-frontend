/* GESTEK — El día de una fecha, en hora LOCAL.

   Existe porque el mismo fallo salió ya tres veces: `toISOString()` da el día
   en UTC, y en Colombia (UTC-5) todo lo que pasa después de las 7 p. m. cae en
   el día siguiente. Un show de las 8, un partido de las 9, una ceremonia de
   cierre: el asistente los ve un día tarde y llega cuando ya pasó.

   Es una línea, y precisamente por eso se copiaba en vez de compartirse. Al
   ser una copia, arreglar una no arreglaba las otras. */

const pad = (n) => String(n).padStart(2, '0');

/* "2026-09-15" a partir de una Date, según el reloj de quien mira. Sirve tanto
   para agrupar por día como para rellenar un <input type="date">, que es el
   otro sitio donde el desfase se convierte en dato guardado. */
export function ymdLocal(d) {
  const f = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(f.getTime())) return '';
  return `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`;
}

/* "20:00" local. Va con la anterior: leer el día en UTC y la hora en local
   —que es lo que hacía el modal de programar partidos— mueve el evento un día
   cada vez que alguien abre y guarda sin tocar nada. */
export function hmLocal(d) {
  const f = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(f.getTime())) return '';
  return `${pad(f.getHours())}:${pad(f.getMinutes())}`;
}
