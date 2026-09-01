/* Una zona del mapa que se prende en fuego cuando el aforo llega al tope.
 *
 * La idea (pedido del 1 de septiembre): en el mapa del evento, la zona llena no
 * se limita a ponerse roja — arde. Es la señal de "aquí está la tendencia, esto
 * está petado", que se lee de un vistazo desde el otro lado del recinto.
 *
 * Tres niveles, los calcula el backend (`lib/aforoZonas.js` → `nivel`):
 *   · normal    — por debajo del 85%
 *   · caliente  — 85%+  → halo naranja alrededor del círculo
 *   · en_fuego  — 100%+ → llamas animadas detrás del círculo
 *
 * `nivelZona` está aquí también para cuando el dato llega como `ocupacion_pct`
 * suelto (el tablero del editor lo tiene así) y hay que derivarlo en el cliente.
 * Las llamas son CSS puro (ver index.css, `.zona-llamas`); se apagan con
 * `prefers-reduced-motion`.
 */

export function nivelZona(pct, lleno) {
  if (lleno || (pct != null && pct >= 100)) return 'en_fuego';
  if (pct != null && pct >= 85) return 'caliente';
  return 'normal';
}

export default function LlamaZona({ nivel, size = 44, children, className = '' }) {
  const clase = nivel === 'en_fuego' ? 'zona-marca--fuego'
    : nivel === 'caliente' ? 'zona-marca--caliente'
    : '';
  return (
    <span className={`zona-marca ${clase} ${className}`} style={{ '--zona-size': `${size}px` }}>
      {nivel === 'en_fuego' && (
        <span className="zona-llamas" aria-hidden="true"><span /><span /><span /></span>
      )}
      {children}
    </span>
  );
}
