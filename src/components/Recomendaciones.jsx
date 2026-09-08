/* «Antes de copiar»: los consejos que evitan que el código se vea mal.
 *
 * Estaba dentro de `ExportIframeModal`, o sea sólo al exportar una SECCIÓN. Al
 * botón de registro —que es el código que más se pega en webs ajenas— no le
 * salía ninguno, aunque varios son suyos: «pégalo entero sin quitarle el
 * script» y «si rediseñas tu web vuelve a copiarlo» describen exactamente lo
 * que pasó en FESTECH, cuya copia del script es vieja y está retocada a mano.
 *
 * Va arriba y no al pie porque son decisiones que se toman ANTES de copiar:
 * después ya está pegado en la web del cliente y nadie vuelve.
 *
 * Cerrado por defecto: abierto, siete párrafos entre el organizador y el
 * cuadro de código son siete párrafos que se saltan.
 */
import { useState } from 'react';
import { recomendacionesPara } from '../lib/embed.js';

export default function Recomendaciones({ opciones, ambito = 'seccion', className = 'mx-6 mt-4' }) {
  const [abierto, setAbierto] = useState(false);
  const lista = recomendacionesPara(opciones, ambito);
  if (!lista.length) return null;

  return (
    <div className={`${className} rounded-xl border border-primary/30 bg-primary/5 overflow-hidden`}>
      <button type="button" onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-primary/10 transition-colors">
        <span className="text-xs font-semibold text-text-1">
          Antes de copiar: {lista.length} cosas que evitan que se vea mal en tu web
        </span>
        <span className="text-text-3 text-xs flex-shrink-0">{abierto ? 'Ocultar' : 'Ver'}</span>
      </button>

      {abierto && (
        <ul className="px-4 pb-3 space-y-2.5 border-t border-primary/20 pt-3">
          {lista.map(r => (
            <li key={r.clave}>
              <p className="text-xs font-medium text-text-1">{r.titulo}</p>
              <p className="text-[11px] text-text-3 leading-relaxed mt-0.5">{r.detalle}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

