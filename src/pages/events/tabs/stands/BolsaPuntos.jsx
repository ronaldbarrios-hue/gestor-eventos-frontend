import { useCallback, useEffect, useState } from 'react';
import { networkingApi } from '../../../../api/networking.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import BarraProgreso from '../../../../components/ui/BarraProgreso.jsx';

/* La bolsa de puntos del evento, y su reparto por stand.
 *
 * ── Lo que faltaba ────────────────────────────────────────────────────────
 *
 * El backend tenía esto entero desde la 0057: la vista `v_bolsa_evento`, el
 * reparto por stand, y hasta un **trigger** que aplica el tope aunque aparezca
 * otro camino para otorgar puntos. Lo que no había era por dónde meterlo:
 * `PUT /expositores/bolsa` y `PUT /expositores/cuotas` no los llamaba nadie.
 *
 * El resultado era una función construida a medias: la tarjeta de cada stand
 * ya enseñaba «% de la bolsa repartida» leyendo `cuota_puntos`… un número que
 * no se podía fijar desde ninguna pantalla. Medido antes de escribir esto: 0
 * eventos con bolsa y 0 stands con cuota. La gamificación no se podía limitar.
 *
 * ── Por qué el reparto se guarda de una vez y no stand por stand ──────────
 *
 * El backend valida la SUMA antes de escribir nada: repartir de más y
 * descubrirlo en el cuarto stand es peor que no dejar guardar. Guardar fila a
 * fila haría imposible esa comprobación, porque cada una sería válida por
 * separado. */

const entero = (v) => (v === '' || v === null || v === undefined ? null : Math.max(0, Math.trunc(Number(v) || 0)));

export default function BolsaPuntos({ evento }) {
  const { success, error: toastErr } = useToast();
  const [datos, setDatos] = useState(null);
  const [total, setTotal] = useState('');
  const [cuotas, setCuotas] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    networkingApi.bolsa(evento.id)
      .then((d) => {
        setDatos(d);
        setTotal(d.bolsa?.total ?? '');
        setCuotas(Object.fromEntries((d.reparto || []).map((r) => [r.expositor_id, r.cuota_puntos ?? ''])));
      })
      .catch((e) => {
        /* Sin la 0057 el endpoint contesta 503 con un mensaje claro; se enseña
           tal cual en vez de dejar la pantalla en blanco. */
        setDatos({ error: e.response?.data?.error || e.message });
      });
  }, [evento.id]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!datos) return <p className="text-sm text-text-3">Cargando la bolsa…</p>;
  if (datos.error) {
    return <p className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-text-2">{datos.error}</p>;
  }

  const reparto = datos.reparto || [];
  const repartido = reparto.reduce((a, r) => a + (entero(cuotas[r.expositor_id]) || 0), 0);
  const totalN = entero(total);
  /* «Sin repartir» sólo tiene sentido con un total puesto. Sin él la bolsa es
     ilimitada y el número sería negativo y confuso. */
  const libre = totalN == null ? null : totalN - repartido;
  const pasado = libre != null && libre < 0;

  const guardar = async () => {
    setGuardando(true);
    try {
      await networkingApi.guardarBolsa(evento.id, { total: totalN });
      await networkingApi.guardarCuotas(evento.id, {
        cuotas: Object.fromEntries(reparto.map((r) => [r.expositor_id, entero(cuotas[r.expositor_id])])),
      });
      success('Bolsa y cuotas guardadas.');
      cargar();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally { setGuardando(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-surface/40 p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-text-1">Bolsa de puntos del evento</p>
          <p className="text-xs text-text-3 mt-1 leading-relaxed">
            El total que hay para repartir entre los stands. Déjalo vacío para no poner tope:
            entonces cada stand da los puntos que quiera.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="field">
            <label className="label">Total</label>
            <input type="number" min="0" value={total} onChange={(e) => setTotal(e.target.value)}
              placeholder="Sin tope" className="input rounded-2xl py-3" />
          </div>
          <div className="rounded-2xl border border-border bg-surface-2/40 px-4 py-3">
            <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Repartido</p>
            <p className="text-2xl font-bold font-display tabular-nums text-text-1 leading-none mt-1">{repartido}</p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 ${pasado ? 'border-danger/30 bg-danger/5' : 'border-border bg-surface-2/40'}`}>
            <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Sin repartir</p>
            <p className={`text-2xl font-bold font-display tabular-nums leading-none mt-1 ${pasado ? 'text-danger' : 'text-text-1'}`}>
              {libre == null ? '—' : libre}
            </p>
          </div>
        </div>

        {totalN != null && totalN > 0 && (
          <BarraProgreso pct={(repartido / totalN) * 100}
            color={pasado ? 'bg-danger' : 'bg-success'}
            etiqueta={`${repartido} de ${totalN} puntos repartidos`} />
        )}

        {pasado && (
          <p className="text-xs text-danger">
            Has repartido {Math.abs(libre)} puntos más de los que hay. El servidor no lo va a guardar:
            baja alguna cuota o sube el total.
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-surface/40 overflow-hidden">
        <p className="px-5 py-3 text-[11px] uppercase tracking-widest text-text-3 font-semibold border-b border-border">
          Cuánto puede dar cada stand
        </p>
        {reparto.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-3">
            Todavía no hay stands. Créalos arriba y aquí podrás repartirles la bolsa.
          </p>
        ) : reparto.map((r) => {
          const cuota = entero(cuotas[r.expositor_id]);
          const dados = r.otorgados || 0;
          /* Lo ya dado importa al repartir: bajarle la cuota por debajo de lo
             que un stand YA entregó no le quita esos puntos a nadie, pero lo
             deja sin poder dar uno más. Conviene verlo antes de guardar. */
          const cortoDeMas = cuota != null && dados > cuota;
          return (
            <div key={r.expositor_id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-1 truncate">{r.nombre}</p>
                <p className="text-[11px] text-text-3">
                  Ya dio {dados} punto{dados === 1 ? '' : 's'}
                  {r.asistentes_distintos != null ? ` a ${r.asistentes_distintos} persona${r.asistentes_distintos === 1 ? '' : 's'}` : ''}
                  {r.stand ? ` · stand ${r.stand}` : ''}
                </p>
                {cortoDeMas && (
                  <p className="text-[11px] text-warning mt-0.5">
                    Ya dio más de esa cuota: se quedaría sin poder dar más.
                  </p>
                )}
              </div>
              <input type="number" min="0" placeholder="Sin tope"
                value={cuotas[r.expositor_id] ?? ''}
                onChange={(e) => setCuotas((c) => ({ ...c, [r.expositor_id]: e.target.value }))}
                className="input w-28 text-right" />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button onClick={guardar} disabled={guardando || pasado} className="btn-gradient btn-sm disabled:opacity-60">
          {guardando ? 'Guardando…' : 'Guardar bolsa y cuotas'}
        </button>
      </div>
    </div>
  );
}
