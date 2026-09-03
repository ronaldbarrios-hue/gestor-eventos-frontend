import { useState, useEffect, useMemo } from 'react';
import { clientesApi } from '../../../../api/clientes.js';
import ImprimirEtiquetas from '../../../../components/public/ImprimirEtiquetas.jsx';
import EtiquetaTermica from '../../../../components/public/EtiquetaTermica.jsx';
import { ETIQUETA, medidas } from '../../../../lib/etiquetaTermica.js';
import { impresionConfig } from '../../../../lib/wallet.js';

/* Asistentes · Imprimir en etiquetadora.
 *
 * La escarapela térmica estaba construida entera —medidas, QR comprobado
 * contra el token real, CSS de impresión, pruebas— y **no colgaba de ninguna
 * pantalla**. Existía en el repositorio y no en la plataforma, que para quien
 * la usa es lo mismo que no existir. Esto es su puerta.
 *
 * ── Por qué es una vista aparte del diseñador ────────────────────────────
 *
 * No es la misma escarapela con otro botón. El diseñador compone una HOJA con
 * varias, a color, para cortar a mano; la etiquetadora saca UNA por etiqueta,
 * a tamaño exacto, en un solo bit —sin grises ni colores—. Mezclarlas obligaría
 * a que el diseñador enseñara opciones que en térmica no hacen nada: el color
 * por tipo, la marca de agua, el logo a color. Una opción que no hace nada es
 * peor que no tenerla.
 *
 * Lo único que se hereda del diseño es lo que sí sobrevive a un bit: el logo
 * (si es silueta) y si se imprime el código en texto. */

export default function EtiquetadoraSection({ evento }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [sel, setSel] = useState(new Set());
  const [destacados, setDestacados] = useState([]);

  const cfg = useMemo(
    () => impresionConfig(evento.page_json, { publico: 'asistentes' }) || {},
    [evento.page_json],
  );

  useEffect(() => {
    clientesApi.list(evento.id, { limit: 1000 })
      .then(d => setClientes(d.clientes || d.tickets || []))
      .finally(() => setLoading(false));
  }, [evento.id]);

  const filas = useMemo(() => clientes.filter(c => {
    if (!filtro) return true;
    const t = `${c.guest_nombre || c.usuario?.nombre || ''} ${c.tipo?.nombre || ''}`.toLowerCase();
    return t.includes(filtro.toLowerCase());
  }), [clientes, filtro]);

  const tipos = useMemo(
    () => [...new Set(clientes.map(c => c.tipo?.nombre).filter(Boolean))],
    [clientes],
  );

  const toggle = (id) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const todos = () => setSel(s => s.size === filas.length ? new Set() : new Set(filas.map(f => f.id)));
  const aImprimir = filas.filter(f => sel.size === 0 || sel.has(f.id));

  /* El QR es quien decide si esto se puede imprimir: su tamaño sale del largo
     del token firmado, no del gusto de nadie. Si un token creciera hasta no
     caber, hay que decirlo AQUÍ y no dejar salir del rollo escarapelas
     ilegibles, que además ya cuestan etiqueta y cinta. */
  const problema = aImprimir
    .map(t => medidas(t.qr_token || t.codigo || ''))
    .find(m => !m.cabe);

  if (loading) return <p className="text-sm text-text-3 py-8">Cargando asistentes…</p>;

  return (
    <div className="space-y-5">
      <div className="card no-print">
        <div className="card-body space-y-3">
          <p className="text-sm text-text-2">
            Sale <strong>una escarapela por etiqueta</strong> del rollo, de {ETIQUETA.ancho}×{ETIQUETA.alto} mm,
            en blanco y negro. No es el diseño a color: la impresora térmica sólo
            marca el punto o lo deja en blanco.
          </p>
          <p className="text-xs text-text-3">
            Al imprimir, deja la escala en <strong>100 %</strong> y desmarca «ajustar al área
            imprimible». Si el navegador reescala, el QR pierde definición y el lector de la
            puerta empieza a fallar de vez en cuando, que cuesta más de encontrar que fallar
            siempre.
          </p>

          {tipos.length > 0 && (
            <div>
              <label className="label">Tipos que van con el recuadro relleno</label>
              <div className="flex flex-wrap gap-2">
                {tipos.map(t => (
                  <button key={t}
                    onClick={() => setDestacados(d => d.includes(t) ? d.filter(x => x !== t) : [...d, t])}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors
                      ${destacados.includes(t) ? 'border-accent bg-accent/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-3 mt-1">
                En térmica no hay colores: destacar un tipo es invertir su recuadro. Si de
                verdad hacen falta dos, se cambia la cinta y se imprimen en dos tandas.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Vista previa a tamaño real: lo que se mira aquí es si el nombre cabe. */}
      <div className="no-print">
        <p className="text-xs text-text-3 mb-2">Así sale, a tamaño real:</p>
        <div className="inline-block bg-white rounded-xl p-2 ring-1 ring-black/10">
          <EtiquetaTermica
            ticket={aImprimir[0] || { guest_nombre: 'María Restrepo', codigo: 'ABC123' }}
            evento={evento}
            destacados={destacados}
            logoUrl={cfg.logo_url || ''}
            mostrarCodigo={cfg.mostrar?.codigo !== false}
          />
        </div>
      </div>

      {clientes.length === 0 ? (
        <div className="card p-10 text-center no-print">
          <p className="text-sm text-text-2">Cuando tengas asistentes inscritos podrás imprimir sus escarapelas aquí.</p>
        </div>
      ) : (<>
        <div className="flex items-center justify-between gap-3 flex-wrap no-print">
          <div className="flex items-center gap-2">
            <input className="input !h-9 w-64" placeholder="Filtrar por nombre o tipo…"
              value={filtro} onChange={e => setFiltro(e.target.value)} />
            <button onClick={todos} className="btn-ghost btn-sm">
              {sel.size === filas.length ? 'Quitar selección' : 'Seleccionar todos'}
            </button>
          </div>
          <button onClick={() => window.print()} disabled={!!problema} className="btn-primary btn-sm">
            Imprimir {aImprimir.length} etiqueta{aImprimir.length !== 1 ? 's' : ''}
          </button>
        </div>

        {problema && (
          <p className="no-print text-sm text-danger-light">No se puede imprimir: {problema.motivo}</p>
        )}

        <div className="no-print rounded-2xl border border-border overflow-hidden max-h-56 overflow-y-auto">
          <ul className="divide-y divide-border">
            {filas.map(f => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-2/40 cursor-pointer" onClick={() => toggle(f.id)}>
                <input type="checkbox" readOnly checked={sel.size === 0 || sel.has(f.id)} className="accent-[#8B5CF6]" />
                <span className="text-sm text-text-1 flex-1 truncate">{f.guest_nombre || f.usuario?.nombre || 'Asistente'}</span>
                <span className="text-xs text-text-3">{f.tipo?.nombre || 'General'}</span>
              </li>
            ))}
          </ul>
        </div>

        <ImprimirEtiquetas
          tickets={aImprimir}
          evento={evento}
          destacados={destacados}
          logoUrl={cfg.logo_url || ''}
          mostrarCodigo={cfg.mostrar?.codigo !== false}
        />
      </>)}

      {/* La tanda entera se monta para que exista al imprimir, pero en pantalla
          no pinta nada: son cien etiquetas a tamaño real una debajo de otra.
          Se oculta con `@media screen` y NO con `no-print`, porque un
          `display:none` de los de siempre tampoco llegaría al papel. */}
      <style>{`@media screen { .etiquetas-print { display: none; } }`}</style>
    </div>
  );
}
