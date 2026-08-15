import { useEffect, useState } from 'react';
import client from '../../api/client.js';
import Spinner from '../ui/Spinner.jsx';
import { useToast } from '../../context/ToastContext.jsx';

/* Pedir una dinámica que la plataforma todavía no tiene.

   El tipo de un espacio lo fija GESTEK (charla, taller, competencia, stand…) y
   eso es a propósito: es lo que permite que un torneo active sus llaves y una
   charla pida ponente. El precio de esa decisión es que quien monta un show de
   stand-up no encuentra la suya, elige «Otro», se apaña — y nosotros no nos
   enteramos de que el catálogo se quedó corto.

   Este formulario existe para enterarnos. Por eso lo que pide de verdad no es
   el nombre sino CÓMO FUNCIONA: saber que alguien quiere «stand-up» no permite
   construir nada; saber que necesita turnos, inscripción de comediantes y
   votación del público, sí. */

const ESTADO = {
  nueva:      { texto: 'Recibida',    cls: 'bg-surface-2 text-text-2 border-border' },
  leida:      { texto: 'Leída',       cls: 'bg-primary/10 text-primary-light border-primary/30' },
  planeada:   { texto: 'En cola',     cls: 'bg-warning/10 text-warning-light border-warning/30' },
  hecha:      { texto: 'Construida',  cls: 'bg-success/10 text-success border-success/30' },
  descartada: { texto: 'Descartada',  cls: 'bg-text-3/10 text-text-3 border-border' },
};

export default function PedirDinamica({ eventoId, onCerrar }) {
  const [form, setForm] = useState({ titulo: '', como_funciona: '', alternativa: '' });
  const [enviando, setEnviando] = useState(false);
  const [mias, setMias] = useState(null);
  const { success, error: toastErr } = useToast();

  useEffect(() => {
    client.get('/sugerencias/dinamica')
      .then(r => setMias(r.data.sugerencias || []))
      .catch(() => setMias([]));
  }, []);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await client.post('/sugerencias/dinamica', { ...form, evento_id: eventoId });
      setMias(m => [r.data.sugerencia, ...(m || [])]);
      setForm({ titulo: '', como_funciona: '', alternativa: '' });
      success('Solicitud enviada. La leemos nosotros, no un robot.');
    } catch (err) {
      toastErr(err.response?.data?.error || err.message);
    } finally { setEnviando(false); }
  };

  /* El contador desde 40 no es decoración: es el mínimo que acepta el
     servidor, y verlo evita escribir tres palabras y llevarse un rechazo. */
  const faltan = Math.max(0, 40 - form.como_funciona.trim().length);

  return (
    <div className="rounded-3xl border border-border-2 bg-surface p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold font-display text-text-1">¿Falta tu dinámica?</h3>
          <p className="text-xs text-text-3 leading-relaxed mt-1 max-w-lg">
            Los tipos de sub-evento los ponemos nosotros para que cada uno traiga su comportamiento
            —un torneo trae llaves, una charla trae ponente—. Si el tuyo no está, cuéntanoslo y lo
            construimos.
          </p>
        </div>
        {onCerrar && (
          <button onClick={onCerrar} className="text-text-3 hover:text-text-1 text-sm shrink-0"
            aria-label="Cerrar">×</button>
        )}
      </div>

      <form onSubmit={enviar} className="grid sm:grid-cols-2 gap-4">
        <div className="field sm:col-span-1">
          <label className="label text-xs" htmlFor="din-titulo">Cómo se llama</label>
          <input id="din-titulo" required maxLength={120}
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            placeholder="Show de stand-up"
            className="input rounded-2xl py-2.5 text-sm" />
        </div>

        <div className="field sm:col-span-1">
          <label className="label text-xs" htmlFor="din-alt">Mientras tanto, ¿qué usas?</label>
          <input id="din-alt" maxLength={500}
            value={form.alternativa}
            onChange={e => setForm(f => ({ ...f, alternativa: e.target.value }))}
            placeholder="Lo puse como «Show» y llevo los turnos aparte"
            className="input rounded-2xl py-2.5 text-sm" />
        </div>

        <div className="field sm:col-span-2">
          <label className="label text-xs" htmlFor="din-como">Cómo funciona</label>
          <textarea id="din-como" required rows={5}
            value={form.como_funciona}
            onChange={e => setForm(f => ({ ...f, como_funciona: e.target.value }))}
            placeholder={'¿Hay inscritos, o sólo público?\n¿Hay turnos, rondas o eliminatorias?\n¿Vota alguien? ¿El público, un jurado?\n¿Qué debería verse en la agenda pública?'}
            className="input rounded-2xl py-2.5 text-sm leading-relaxed" />
          <p className="text-[11px] text-text-3 mt-1">
            {faltan > 0
              ? `Cuéntanos un poco más — faltan ${faltan} caracteres.`
              : 'Con esto podemos construirla. Sólo con el nombre, no.'}
          </p>
        </div>

        <div className="sm:col-span-2">
          <button type="submit" disabled={enviando || faltan > 0 || !form.titulo.trim()}
            className="btn-primary btn-sm disabled:opacity-50">
            {enviando ? <><Spinner size="sm" /> Enviando…</> : 'Enviar solicitud'}
          </button>
        </div>
      </form>

      {/* Lo que ya pediste, y en qué quedó. Un buzón sin respuesta se usa una
          vez: si nadie ve qué pasó con lo suyo, no vuelve a escribir. */}
      {mias === null ? null : mias.length > 0 && (
        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Lo que has pedido</p>
          {mias.map(s => {
            const e = ESTADO[s.estado] || ESTADO.nueva;
            return (
              <div key={s.id} className="rounded-2xl border border-border bg-surface-2/40 px-4 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-text-1">{s.titulo}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${e.cls}`}>{e.texto}</span>
                </div>
                {s.respuesta && <p className="text-xs text-text-2 mt-1.5 leading-relaxed">{s.respuesta}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
