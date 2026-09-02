/* «La aplicación está en su primera carga», para quien no está en el árbol.
 *
 * El acompañante de la barra lateral vive en `AppLayout`, y la pantalla de
 * carga vive dentro de la página. Ninguno es padre del otro, así que no hay
 * props ni contexto que los una sin envolver media aplicación en un provider
 * nuevo — y eso para un dato de una sola línea.
 *
 * Esto es ese dato: quien pinta una espera larga lo enciende, quien quiera
 * reaccionar se suscribe. Un `Set` de avisados y una bandera; nada más.
 *
 * Por qué un contador y no un booleano: si dos pantallas de carga se solapan
 * un instante durante una transición, la primera en desmontarse apagaría la
 * señal mientras la otra sigue esperando.
 */

let cuantos = 0;
const avisar = new Set();

function emitir() {
  for (const fn of avisar) {
    try { fn(cuantos > 0); }
    catch { /* un suscriptor roto no puede tumbar a los demás */ }
  }
}

/* La llama quien empieza a mostrar una espera. Devuelve la función que la
   termina, para que el `useEffect` la use como limpieza y no haya forma de
   dejar la señal encendida. */
export function empiezaCarga() {
  cuantos += 1;
  emitir();
  let cerrado = false;
  return () => {
    if (cerrado) return;   // idempotente: React puede limpiar dos veces
    cerrado = true;
    cuantos = Math.max(0, cuantos - 1);
    emitir();
  };
}

export function alCambiarCarga(fn) {
  avisar.add(fn);
  fn(cuantos > 0);          // el estado de ahora, sin esperar al siguiente cambio
  return () => avisar.delete(fn);
}
