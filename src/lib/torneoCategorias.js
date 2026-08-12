/* #48 · El árbol de categorías de torneos.

   El servidor devuelve la lista plana con `padre_id`; aquí se arma el árbol.
   Vive suelto y no dentro de una pantalla porque lo usan tres: el editor del
   panel, el selector al crear un torneo y la navegación pública. Tres copias
   de un recorrido recursivo es exactamente como se separan las cosas.

   Todo lo de aquí tolera un árbol roto —un `padre_id` que apunta a una
   categoría borrada— sin perder ramas: lo huérfano sube a la raíz en vez de
   desaparecer. Una categoría invisible es peor que una mal colocada. */

/* Lista plana → árbol. Cada nodo lleva `hijos` y `profundidad`. */
export function armarArbol(categorias = []) {
  const porId = new Map(categorias.map(c => [String(c.id), { ...c, hijos: [] }]));
  const raices = [];

  for (const nodo of porId.values()) {
    const padre = nodo.padre_id ? porId.get(String(nodo.padre_id)) : null;
    if (padre && padre !== nodo) padre.hijos.push(nodo);
    else raices.push(nodo);   // raíz de verdad, o huérfana rescatada
  }

  const ordenar = (lista, profundidad) => {
    lista.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || String(a.nombre).localeCompare(String(b.nombre)));
    for (const n of lista) {
      n.profundidad = profundidad;
      ordenar(n.hijos, profundidad + 1);
    }
    return lista;
  };
  return ordenar(raices, 0);
}

/* El árbol aplanado en orden de lectura, con la profundidad de cada rama.
   Es lo que necesitan un `<select>` con sangría y una lista con niveles. */
export function aplanar(categorias = []) {
  const salida = [];
  const recorrer = (nodos) => {
    for (const n of nodos) {
      salida.push(n);
      recorrer(n.hijos);
    }
  };
  recorrer(armarArbol(categorias));
  return salida;
}

/* "deportes › contacto › boxeo". Sin esto, un torneo en un nivel hondo se
   presenta con una palabra suelta que no dice de dónde cuelga. */
export function rutaDe(categorias, id) {
  const porId = new Map(categorias.map(c => [String(c.id), c]));
  const partes = [];
  let actual = porId.get(String(id));
  const vistos = new Set();
  while (actual && !vistos.has(String(actual.id))) {
    vistos.add(String(actual.id));       // corta cualquier ciclo heredado
    partes.unshift(actual.nombre);
    actual = actual.padre_id ? porId.get(String(actual.padre_id)) : null;
  }
  return partes;
}

/* Todos los descendientes de una rama, ella incluida. Al pulsar "deportes" se
   quieren ver también los torneos de "deportes › contacto", que es justo lo
   que hace que el árbol sirva para navegar y no sólo para etiquetar. */
export function ramaCompleta(categorias, id) {
  if (!id) return new Set();
  const hijosDe = new Map();
  for (const c of categorias) {
    const p = c.padre_id ? String(c.padre_id) : '__raiz__';
    if (!hijosDe.has(p)) hijosDe.set(p, []);
    hijosDe.get(p).push(String(c.id));
  }
  const dentro = new Set();
  const pila = [String(id)];
  while (pila.length) {
    const actual = pila.pop();
    if (dentro.has(actual)) continue;     // ciclo heredado: se corta aquí
    dentro.add(actual);
    for (const h of (hijosDe.get(actual) || [])) pila.push(h);
  }
  return dentro;
}

/* Un punto de partida para quien no quiere inventarse el árbol. No se siembra
   solo al crear el evento: la mayoría de los eventos no tienen torneos, y un
   árbol que aparece sin pedirlo es ruido que hay que borrar. */
export const ARBOL_SUGERIDO = [
  { nombre: 'Deportes', hijos: [
    { nombre: 'Contacto' },
    { nombre: 'Pesca' },
    { nombre: 'Caminata' },
    { nombre: 'Pelota' },
  ]},
  { nombre: 'Juegos de mesa', hijos: [
    { nombre: 'Cartas' },
    { nombre: 'Estrategia' },
    { nombre: 'Rol' },
  ]},
  { nombre: 'Gaming', hijos: [
    { nombre: 'Peleas' },
    { nombre: 'Deportivos' },
    { nombre: 'Estrategia' },
  ]},
];
