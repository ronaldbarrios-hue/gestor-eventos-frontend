import { useEffect, useState } from 'react';
import { clientesApi } from '../../../../api/clientes.js';
import GLoader from '../../../../components/ui/GLoader.jsx';

/* Comercial · El dinero del evento.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * El permiso `ver_pagos` decía «acceso al dashboard financiero» y ese dashboard
 * no estaba en ninguna parte: se podía conceder desde el panel y no llevaba a
 * nada. Los números sí estaban, repartidos entre Analítica —que los suma
 * mezclados con visitas y conversión— y Facturación —que lista boletas sin
 * cuadrar nada—.
 *
 * ── Las cuatro preguntas, y por qué son cuatro y no una ──────────────────
 *
 * «Cuánto llevamos» no es una pregunta: son cuatro, y confundirlas es lo que
 * hace que dos personas den dos cifras distintas del mismo evento.
 *
 *   · **Cobrado** — pagado y usado. Dinero que entró.
 *   · **Por cobrar** — emitido. Reservas que todavía no han pagado.
 *   · **Devuelto** — reembolsado. Salió de vuelta.
 *   · Y lo **invalidado** no aparece en ninguna: no se cobró, no se espera y no
 *     se devolvió. Sumarlo a «por cobrar» inflaría la cifra con dinero que
 *     nadie va a pagar, que es el error clásico de estos tableros.
 *
 * ── Las transacciones van aparte ─────────────────────────────────────────
 *
 * Lo de arriba sale de las boletas; lo de abajo, de lo que registró la pasarela.
 * Son dos fuentes distintas y **cuando no cuadran es justo lo que hay que poder
 * ver**: juntarlas en un solo número escondería el único síntoma de que algo se
 * cobró y no se registró, o al revés.
 */

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;

export default function DineroSection({ evento }) {
  const [datos, setDatos] = useState(undefined);   // undefined = cargando
  const [fallo, setFallo] = useState('');

  useEffect(() => {
    clientesApi.dinero(evento.id)
      .then(setDatos)
      .catch(e => setFallo(e.response?.data?.error || e.message));
  }, [evento.id]);

  if (fallo) return (
    <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-text-2">
      {fallo}
    </div>
  );
  if (datos === undefined) return <GLoader message="Sumando…" />;

  const { total, por_tipo: porTipo, transacciones } = datos;
  const hayAlgo = total.cobrado.boletas || total.pendiente.boletas || total.devuelto.boletas;

  if (!hayAlgo) return (
    <div className="card"><div className="card-body text-center py-10">
      <p className="text-sm text-text-2">Todavía no se ha vendido ninguna boleta.</p>
      <p className="text-xs text-text-3 mt-1.5">Cuando se venda la primera, aquí sale cuánto entró y de qué.</p>
    </div></div>
  );

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-3">
        <Cifra titulo="Cobrado" dato={total.cobrado} destacado
          pista="Boletas pagadas o ya usadas." />
        <Cifra titulo="Por cobrar" dato={total.pendiente}
          pista="Reservadas y sin pagar todavía." />
        <Cifra titulo="Devuelto" dato={total.devuelto}
          pista="Reembolsadas. El dinero se devuelve en la pasarela." />
      </div>

      <div className="card">
        <div className="card-header"><h3 className="text-base font-semibold text-text-1">Por tipo de boleta</h3></div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-widest text-text-3">
                <tr className="border-b border-border">
                  <th className="text-left font-semibold px-4 py-2.5">Tipo</th>
                  <th className="text-right font-semibold px-4 py-2.5">Cobrado</th>
                  <th className="text-right font-semibold px-4 py-2.5">Por cobrar</th>
                  <th className="text-right font-semibold px-4 py-2.5">Devuelto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {porTipo.map(t => (
                  <tr key={t.nombre}>
                    <td className="px-4 py-2.5 text-text-1">{t.nombre}</td>
                    <Celda dato={t.cobrado} fuerte />
                    <Celda dato={t.pendiente} />
                    <Celda dato={t.devuelto} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {transacciones.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-text-1">Lo que registró la pasarela</h3>
          </div>
          <div className="card-body space-y-2">
            <p className="text-xs text-text-3 leading-relaxed">
              Esto no sale de las boletas, sale de Mercado Pago o Wompi. Va aparte a propósito: si las
              dos cifras no cuadran, es aquí donde se ve.
            </p>
            <ul className="divide-y divide-border">
              {transacciones.slice(0, 25).map(t => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <span className="text-sm text-text-1 flex-1 min-w-0 truncate">
                    {t.proveedor || 'Pasarela'} · {t.estado}
                  </span>
                  <span className="text-sm tabular-nums text-text-2 flex-shrink-0">
                    {money(t.monto)} {t.moneda || ''}
                  </span>
                  <span className="text-[11px] text-text-3 flex-shrink-0 tabular-nums">
                    {t.created_at ? new Date(t.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Cifra({ titulo, dato, pista, destacado }) {
  return (
    <div className={`rounded-2xl border p-4 ${destacado ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface/40'}`}>
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">{titulo}</p>
      <p className="text-2xl font-bold font-display text-text-1 tabular-nums mt-1">{money(dato.dinero)}</p>
      <p className="text-[11px] text-text-3 mt-0.5">
        {dato.boletas} boleta{dato.boletas !== 1 ? 's' : ''}
      </p>
      {pista && <p className="text-[11px] text-text-3 mt-1.5 leading-relaxed">{pista}</p>}
    </div>
  );
}

function Celda({ dato, fuerte }) {
  /* Un cero se pinta apagado: en una tabla de cinco tipos, lo que se busca es
     dónde hay algo, y los ceros a pleno contraste hacen ruido. */
  const vacio = !dato.dinero && !dato.boletas;
  return (
    <td className={`px-4 py-2.5 text-right tabular-nums ${vacio ? 'text-text-3' : fuerte ? 'text-text-1 font-semibold' : 'text-text-2'}`}>
      {money(dato.dinero)}
      <span className="text-[11px] text-text-3 ml-1.5">({dato.boletas})</span>
    </td>
  );
}
