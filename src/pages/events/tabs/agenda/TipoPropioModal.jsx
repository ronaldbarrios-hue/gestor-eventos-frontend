import { useState } from 'react';
import Icono from '../../../../components/ui/Iconos.jsx';
import { eventosApi } from '../../../../api/eventos.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import { ICONOS_TIPO, PREFIJO_TIPO_PROPIO, tiposPropios } from '../../../../lib/espacio.js';

/* Crear un tipo de sub-evento propio del evento.
 *
 * Antes esto sólo se podía PEDIR: los once tipos eran una constante en
 * `lib/espacio.js`, así que añadir «Cata», «Rueda de prensa» o «Torneo de
 * cosplay» era publicar código. El buzón de «¿Falta tu tipo? Pídenoslo» se
 * queda, porque sigue sirviendo para lo que no se puede hacer aquí — pero lo
 * normal ya no pasa por nosotros.
 *
 * ── Las dos cosas que no se dejan inventar, y por qué ─────────────────────
 *
 * · **El icono se elige de una lista.** Un tipo se pinta en el panel, en la
 *   agenda pública y en el embed, los tres con trazos de `Iconos.jsx`. Un
 *   nombre inventado dejaría un hueco en los tres sitios y nadie lo vería
 *   hasta que el público abriera la agenda.
 * · **«Competitivo» no se ofrece.** Es lo que engancha un tipo con las llaves
 *   de un torneo: una relación del modelo, no un adorno. Un tipo propio que se
 *   declarara competitivo pediría un torneo que no sabría crear.
 *
 * Se guarda en `page_json.tipos_extra`. El PATCH mezcla `page_json` por clave
 * (0064), así que esto no toca la landing ni el plano. */

const COLORES = [
  '#3B82F6', '#8B5CF6', '#0EA5E9', '#F59E0B', '#EC4899',
  '#10B981', '#F43F5E', '#6366F1', '#EAB308', '#14B8A6', '#64748B',
];

const idDesde = (label) => PREFIJO_TIPO_PROPIO + String(label).trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24);

export default function TipoPropioModal({ evento, onCerrar, onCreado }) {
  const { success, error: toastErr } = useToast();
  const [label, setLabel] = useState('');
  const [icono, setIcono] = useState('pin');
  const [color, setColor] = useState('#64748B');
  const [guardando, setGuardando] = useState(false);

  const yaEstan = tiposPropios(evento);

  const guardar = async (e) => {
    e.preventDefault();
    const nombre = label.trim();
    if (!nombre) { toastErr('Ponle un nombre al tipo.'); return; }
    const id = idDesde(nombre);
    if (!id) { toastErr('Ese nombre no deja un identificador válido. Usa letras o números.'); return; }
    if (yaEstan.some(t => t.id === id)) { toastErr('Ya tienes un tipo con ese nombre.'); return; }

    setGuardando(true);
    try {
      /* Se manda la lista entera y no sólo el nuevo: `page_json` se mezcla por
         clave de primer nivel, así que `tipos_extra` se reemplaza como un todo. */
      await eventosApi.update(evento.id, {
        page_json: { tipos_extra: [...yaEstan, { id, label: nombre, icono, color }] },
      });
      success(`«${nombre}» ya se puede elegir al crear un sub-evento.`);
      onCreado?.();
    } catch (err) {
      toastErr(err.response?.data?.error || err.message);
    } finally { setGuardando(false); }
  };

  const borrar = async (t) => {
    setGuardando(true);
    try {
      await eventosApi.update(evento.id, {
        page_json: { tipos_extra: yaEstan.filter(x => x.id !== t.id) },
      });
      /* Los sub-eventos que ya usaban ese tipo no se tocan: `tipoEspacio` cae
         al tipo por defecto y siguen viéndose. Borrar el tipo no puede borrar
         lo que se programó con él. */
      success(`«${t.label}» ya no se ofrece. Los sub-eventos que lo usaban siguen ahí.`);
      onCreado?.();
    } catch (err) {
      toastErr(err.response?.data?.error || err.message);
    } finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md" onClick={onCerrar}>
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-surface px-6 py-5 border-b border-border flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold font-display tracking-tight text-text-1">Tipo de sub-evento propio</h2>
          <button onClick={onCerrar} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={guardar} className="p-6 space-y-5">
          <div className="field">
            <label className="label">Cómo se llama</label>
            <input value={label} onChange={e => setLabel(e.target.value)} autoFocus
              placeholder="Cata, Rueda de prensa, Desfile…" className="input rounded-2xl py-3" />
            <p className="text-[11px] text-text-3 mt-1.5">
              Sale en el calendario del panel, en la agenda pública y en el embed.
            </p>
          </div>

          <div className="field">
            <label className="label">Icono</label>
            <div className="flex flex-wrap gap-1.5">
              {ICONOS_TIPO.map(n => (
                <button key={n} type="button" onClick={() => setIcono(n)}
                  aria-label={n}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors
                    ${icono === n ? 'border-primary bg-primary/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
                  <Icono nombre={n} className="w-4 h-4" />
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-3 mt-1.5">
              Se elige de esta lista y no se escribe: el icono se pinta en tres sitios distintos
              y uno inventado dejaría el hueco en los tres.
            </p>
          </div>

          <div className="field">
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {COLORES.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} aria-label={c}
                  style={{ background: c }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-text-1 scale-110' : 'border-transparent'}`} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-2/40 p-3">
            <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-2">Se verá así</p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1"
              style={{ color, background: `${color}1A`, borderColor: `${color}55` }}>
              <Icono nombre={icono} className="w-3.5 h-3.5" />{label.trim() || 'Sin nombre'}
            </span>
          </div>

          {yaEstan.length > 0 && (
            <div className="field">
              <label className="label">Los que ya tienes</label>
              <div className="flex flex-wrap gap-1.5">
                {yaEstan.map(t => (
                  <button key={t.id} type="button" onClick={() => borrar(t)} disabled={guardando}
                    title="Quitar de la lista"
                    className="text-xs font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1 disabled:opacity-60"
                    style={{ color: t.color, background: `${t.color}1A`, borderColor: `${t.color}55` }}>
                    <Icono nombre={t.icono} className="w-3.5 h-3.5" />{t.label}
                    <span className="text-text-3" aria-hidden>×</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-3 mt-1.5">
                Quitar uno no borra los sub-eventos que lo usan: se siguen viendo, con el tipo por defecto.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCerrar}
              className="flex-1 py-3 rounded-2xl text-sm font-medium text-text-1 border border-border-2 hover:bg-surface-2">Cerrar</button>
            <button type="submit" disabled={guardando}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60">
              {guardando ? 'Guardando…' : 'Crear tipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
