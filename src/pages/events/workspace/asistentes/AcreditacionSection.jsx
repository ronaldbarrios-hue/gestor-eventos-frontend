import { useState } from 'react';
import CredencialesSection from './CredencialesSection.jsx';
import TarjetaSection from './TarjetaSection.jsx';
import EtiquetadoraSection from './EtiquetadoraSection.jsx';

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
 * quien sólo escanea sigue viendo escarapelas y no el carné.
 *
 * ── Las vistas dicen QUÉ SE HACE, no dónde acaba ─────────────────────────
 *
 * Se llamaban «Escarapela impresa» y «Carné digital» —dos soportes— y no
 * contestaban lo que la persona viene a hacer, que es diseñar o imprimir.
 * Ahora son tres verbos: diseñar la escarapela, diseñar el carné, e imprimir en
 * la etiquetadora. La tercera es nueva: la escarapela térmica llevaba
 * construida desde el Frente H y no colgaba de ninguna pantalla.
 *
 * Imprimir va con `checkin` y no con `ver_clientes`: quien imprime es quien
 * está en la puerta. */
export default function AcreditacionSection({ evento, soyOwner, permisos = [] }) {
  const puede = (p) => soyOwner || permisos.includes('*') || permisos.includes(p);
  const vistas = [
    ...(puede('ver_clientes') ? [['escarapela', 'Diseñar escarapela']]      : []),
    ...(puede('ver_clientes') ? [['carne',       'Diseñar carné digital']]   : []),
    ...(puede('checkin')      ? [['etiquetas',   'Imprimir en etiquetadora']] : []),
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
      {vista === 'carne'     && <TarjetaSection evento={evento} />}
      {vista === 'etiquetas' && <EtiquetadoraSection evento={evento} />}
      {vista === 'escarapela' && <CredencialesSection evento={evento} />}
    </div>
  );
}
