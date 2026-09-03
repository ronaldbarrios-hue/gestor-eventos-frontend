/* Las zonas del evento, leídas igual en todas partes.
 *
 * Una zona vive en `page_json.zonas` y se administra en **Zonas de interés**,
 * que es su único dueño. El resto de pantallas la consumen: el formulario de
 * sub-eventos, el de stands, el escáner, el mapa.
 *
 * Esto existe porque el filtro de abajo estaba copiado tres veces —y una de
 * las tres copias no lo tenía—. `CheckinTab` leía `page_json.zonas` crudo, así
 * que una zona a medio crear (recién añadida, sin nombre todavía) se ofrecía
 * como una opción en blanco que al elegirla no hacía nada. El mismo nombre que
 * usa el backend (`lib/aforoZonas.js` → `zonasDelEvento`) a propósito: es el
 * mismo concepto y conviene que se llame igual a los dos lados.
 */

/* Las que se pueden ofrecer: con id y con nombre de verdad.
 *
 * Una zona sin `id` no se puede referenciar desde una sesión ni desde un stand,
 * y una sin nombre no se puede elegir en una lista. Las dos existen de forma
 * legítima y transitoria mientras alguien las está creando en Accesos e
 * ingresos, y por eso se filtran en vez de tratarse como un error. */
export function zonasDelEvento(evento) {
  const zonas = evento?.page_json?.zonas;
  if (!Array.isArray(zonas)) return [];
  return zonas.filter(z => z?.id && String(z.nombre || '').trim());
}

/* Cómo se lee una zona en un desplegable.
 *
 * El aforo va en la etiqueta porque es lo que distingue dos zonas de nombre
 * parecido cuando hay que elegir dónde va una charla: «Sala A (aforo 80)» y
 * «Sala B (aforo 300)» no son intercambiables. Sin tope declarado no se pone
 * nada — un «(aforo 0)» se leería como que no cabe nadie. */
export function etiquetaZona(z) {
  const nombre = String(z?.nombre || '').trim();
  return z?.aforo_max ? `${nombre} (aforo ${z.aforo_max})` : nombre;
}

/* Los tipos de zona (migración 0094).
 *
 * Una puerta y una zona son la misma cosa —sitios del recinto— y en el menú ya
 * quedaron juntas porque nadie supo explicar en qué se diferencian. El tipo es
 * lo que las distingue sin partirlas en dos modelos.
 *
 * `evacuacion` no es un adorno: un recinto de 7.000 personas tiene salidas de
 * emergencia y hasta ahora no había dónde declararlas. */
export const TIPOS_ZONA = [
  { id: 'evento',     label: 'Del evento',  ayuda: 'Donde ocurre algo: una tarima, la zona VIP, el patio de comidas.' },
  { id: 'ingreso',    label: 'De ingreso',  ayuda: 'Una puerta por la que se entra al recinto.' },
  { id: 'evacuacion', label: 'Evacuación',  ayuda: 'Salida de emergencia. No se llena: se vacía por ella.' },
  { id: 'otra',       label: 'Otra',        ayuda: 'Almacén, camerinos, zona técnica.' },
];

export const TIPO_ZONA_DEFECTO = 'evento';

export const tipoDeZona = (z) =>
  TIPOS_ZONA.find(t => t.id === z?.tipo) || TIPOS_ZONA[0];
