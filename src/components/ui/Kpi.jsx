/* Un número grande con su etiqueta.
 *
 * Estaba escrito tres veces, con tres nombres —`KpiCard` en Analytics, `Kpi` en
 * la vista del colaborador, `Stat` en el widget de «mi trabajo»— y las tres
 * hacían lo mismo: una caja redondeada, un número en grande y una etiqueta,
 * teñida cuando el dato pide atención.
 *
 * Lo que de verdad se diferenciaba era el **vocabulario del estado**, y cada
 * una se había inventado el suyo: `accent="success"`, `alerta={true}`,
 * `tono="warning"`. Tres formas de decir «esto va bien / esto va mal» que no se
 * podían comparar entre pantallas.
 *
 * ── Sobre `StatCard.jsx`, que la auditoría pedía adoptar ─────────────────
 *
 * No encajaba. `StatCard` es una baldosa de tablero —icono, tendencia, paleta
 * de cinco colores por nombre— y ninguna de las tres copias tenía icono ni
 * tendencia; dos, en cambio, tenían una nota debajo que `StatCard` no sabe
 * pintar. Adoptarlo habría obligado a las tres a perder algo. Y no lo usaba
 * nadie: cero consumidores desde que se escribió.
 *
 * Así que la pieza compartida es ésta, sacada de lo que las tres hacían, y
 * `StatCard` se retira en vez de forzarlo.
 *
 * ── El orden, que no es capricho ─────────────────────────────────────────
 *
 * Analytics pone la etiqueta arriba; las otras dos, el número. No es un
 * descuido: en un panel de seis KPIs que se leen en columna, la etiqueta
 * primero deja los números alineados y comparables; en una tarjeta suelta,
 * el número primero es lo que se lee de un vistazo. Se conservan los dos. */

const TONOS = {
  neutro   : { caja: 'border border-border bg-surface/50', valor: 'text-text-1',       etiqueta: 'text-text-3' },
  exito    : { caja: 'border border-success/30 bg-success/5', valor: 'text-success-light', etiqueta: 'text-text-3' },
  alerta   : { caja: 'border border-danger/30 bg-danger/5',   valor: 'text-danger',    etiqueta: 'text-text-3' },
  aviso    : { caja: 'bg-warning/10',                          valor: 'text-warning',   etiqueta: 'text-warning opacity-80' },
  primario : { caja: 'bg-primary/10',                          valor: 'text-primary',   etiqueta: 'text-primary opacity-80' },
};

export default function Kpi({
  label,
  valor,
  nota = null,
  tono = 'neutro',
  orden = 'valor-primero',   // 'valor-primero' | 'label-primero'
  className = '',
}) {
  const t = TONOS[tono] || TONOS.neutro;
  const etiqueta = (
    <p className={`text-[11px] uppercase tracking-widest font-semibold ${t.etiqueta}`}>{label}</p>
  );
  const numero = (
    <p className={`text-2xl font-bold font-display tabular-nums leading-none ${t.valor}`}>
      {valor ?? '—'}
    </p>
  );

  return (
    <div className={`rounded-2xl px-4 py-3.5 ${t.caja} ${className}`}>
      {orden === 'label-primero' ? <>{etiqueta}<div className="mt-1">{numero}</div></> : <>{numero}<div className="mt-1">{etiqueta}</div></>}
      {nota && <p className="text-[11px] text-text-3 mt-1.5">{nota}</p>}
    </div>
  );
}
