import { useState } from 'react';
import CredencialesSection from './CredencialesSection.jsx';
import TarjetaSection from './TarjetaSection.jsx';

/* Asistentes · Acreditación — lo que el asistente lleva encima.
 *
 * Eran dos pestañas separadas —«Credenciales» (la escarapela imprimible) y
 * «Tarjeta» (el carné digital)— que contestan la misma pregunta y no se
 * hablaban. Quien diseña una casi siempre acaba mirando la otra.
 *
 * ── Los permisos, que es la parte delicada de fusionar ────────────────────
 *
 * No son el mismo: la escarapela la imprime quien está en la puerta
 * (`checkin`) y el carné lo diseña quien lleva los clientes (`ver_clientes`).
 * Fusionar sin mirar habría dado a cada uno lo del otro, en silencio. Por eso
 * la pestaña se ve con CUALQUIERA de los dos y cada vista comprueba el suyo:
 * quien sólo escanea sigue viendo escarapelas y no el carné. */
export default function AcreditacionSection({ evento, soyOwner, permisos = [] }) {
  const puede = (p) => soyOwner || permisos.includes('*') || permisos.includes(p);
  const vistas = [
    ...(puede('checkin')      ? [['escarapela', 'Escarapela impresa']] : []),
    ...(puede('ver_clientes') ? [['carne',      'Carné digital']]      : []),
  ];
  const [vista, setVista] = useState(() => vistas[0]?.[0] || 'escarapela');

  if (vistas.length === 0) return null;

  return (
    <div className="space-y-4">
      {vistas.length > 1 && (
        <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 w-fit">
          {vistas.map(([k, l]) => (
            <button key={k} onClick={() => setVista(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${vista === k ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
              {l}
            </button>
          ))}
        </div>
      )}
      {vista === 'carne' ? <TarjetaSection evento={evento} /> : <CredencialesSection evento={evento} />}
    </div>
  );
}
