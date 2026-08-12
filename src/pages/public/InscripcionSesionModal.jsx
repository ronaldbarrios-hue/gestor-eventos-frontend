import { useState } from 'react';
import { createPortal } from 'react-dom';
import { eventosApi } from '../../api/eventos.js';

/* ──────────────────────────────────────────────────────────────────
   Apuntarse a un sub-evento desde la agenda pública.

   El endpoint existía desde la 0055 y nadie lo llamaba: se podía marcar un
   taller como «pide inscripción» y no había manera de apuntarse salvo que
   alguien del equipo lo metiera a mano desde el panel.

   Dos caminos, y el orden importa:

     · CON código de boleta — el normal. La boleta ya dice quién eres, así que
       no se te piden otra vez el nombre y el correo. Es lo primero que se
       ofrece.
     · SIN código — para quien aparece en el taller sin haber pasado por la
       entrada general. Pasa siempre, y si no se le puede registrar el conteo
       de participación miente.

   Las preguntas propias del sub-evento (modo 'propio') llegan con la agenda;
   el modo 'evento' manda al formulario completo, que se llena al comprar y no
   se repite aquí.
   ────────────────────────────────────────────────────────────────── */

export default function InscripcionSesionModal({ slug, sesion, preguntas = [], onClose, onInscrito }) {
  const [conBoleta, setConBoleta] = useState(true);
  const [codigo, setCodigo] = useState('');
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '' });
  const [respuestas, setRespuestas] = useState({});
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState('');
  const [hecho, setHecho] = useState(false);

  const pide = sesion.formulario_modo === 'propio' ? preguntas : [];
  const modoEvento = sesion.formulario_modo === 'evento';

  const setResp = (id, v) => setRespuestas(r => ({ ...r, [id]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');

    if (conBoleta && !codigo.trim()) { setErr('Escribe el código de tu boleta.'); return; }
    if (!conBoleta) {
      if (!form.nombre.trim()) { setErr('Necesitamos tu nombre.'); return; }
      if (!form.email.includes('@')) { setErr('Necesitamos un correo válido.'); return; }
    }
    for (const c of pide) {
      if (!c.requerido) continue;
      const v = respuestas[c.id];
      if (v === undefined || v === null || v === '' || v === false) {
        setErr(`"${c.etiqueta}" es obligatoria.`);
        return;
      }
    }

    setWorking(true);
    try {
      await eventosApi.inscribirSesion(slug, sesion.id, {
        ...(conBoleta ? { codigo: codigo.trim().toUpperCase() } : form),
        respuestas,
      });
      setHecho(true);
      onInscrito?.(sesion.id);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally { setWorking(false); }
  };

  if (hecho) {
    return createPortal(
      <Fondo onClose={onClose}>
        <div className="p-8 text-center">
          <p className="text-4xl mb-3" aria-hidden="true">✓</p>
          <h3 className="text-lg font-bold font-display text-text-1 mb-1">Quedaste inscrito</h3>
          <p className="text-sm text-text-2 mb-6">
            Te apuntamos a «{sesion.titulo}». Si nos diste un correo, te llega la confirmación.
          </p>
          <button onClick={onClose} className="btn-primary">Listo</button>
        </div>
      </Fondo>,
      document.body,
    );
  }

  return createPortal(
    <Fondo onClose={onClose}>
      <form onSubmit={submit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
        <div>
          <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-1.5">Apuntarse</p>
          <h3 className="text-xl font-bold font-display text-text-1 tracking-tight">{sesion.titulo}</h3>
          {sesion.libres != null && (
            <p className="text-xs text-text-3 mt-1">
              {sesion.libres > 0 ? `Quedan ${sesion.libres} lugares.` : 'Sin lugares libres.'}
            </p>
          )}
        </div>

        {err && (
          <div className="px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20 text-danger-light text-sm">{err}</div>
        )}

        {/* Con boleta primero: es el camino normal y el que evita escribir dos
            veces los mismos datos. */}
        <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1">
          {[[true, 'Tengo boleta'], [false, 'No tengo boleta']].map(([v, label]) => (
            <button key={String(v)} type="button" onClick={() => { setConBoleta(v); setErr(''); }}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${conBoleta === v ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
              {label}
            </button>
          ))}
        </div>

        {conBoleta ? (
          <div className="field">
            <label className="label">Código de tu boleta *</label>
            <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
              placeholder="ABCD1234" autoFocus
              className="input rounded-2xl py-3 text-base font-mono tracking-widest uppercase" />
            <p className="text-[11px] text-text-3 mt-1.5">
              Está en el correo de tu entrada y en tu boleta digital. Con él no hace falta
              que vuelvas a escribir tus datos.
            </p>
          </div>
        ) : (
          <>
            <div className="field">
              <label className="label">Nombre completo *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className="input rounded-2xl py-3 text-base" placeholder="Tu nombre" autoFocus />
            </div>
            <div className="field">
              <label className="label">Correo *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input rounded-2xl py-3 text-base" placeholder="tu@correo.com" />
            </div>
            <div className="field">
              <label className="label">Teléfono <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
              <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                className="input rounded-2xl py-3 text-base" placeholder="300 000 0000" />
            </div>
          </>
        )}

        {pide.map(c => (
          <CampoSesion key={c.id} campo={c} value={respuestas[c.id]} onChange={v => setResp(c.id, v)} />
        ))}

        {/* El modo 'evento' reutiliza el formulario de compra: preguntarlo aquí
            otra vez sería pedirle lo mismo dos veces a la misma persona. */}
        {modoEvento && (
          <p className="text-[11px] text-text-3 leading-relaxed">
            Este sub-evento usa el formulario del evento. Si ya lo llenaste al sacar tu
            boleta, no hay nada más que escribir.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={working || sesion.lleno} className="btn-gradient">
            {working ? 'Apuntando…' : sesion.lleno ? 'Sin lugares' : 'Apuntarme'}
          </button>
        </div>
      </form>
    </Fondo>,
    document.body,
  );
}

function CampoSesion({ campo, value, onChange }) {
  const etiqueta = <label className="label">{campo.etiqueta}{campo.requerido && ' *'}</label>;
  const ayuda = campo.ayuda ? <p className="text-[11px] text-text-3 mt-1">{campo.ayuda}</p> : null;
  const cls = 'input rounded-2xl py-3 text-base';

  if (campo.tipo === 'checkbox') {
    return (
      <label className="flex items-start gap-2.5 text-sm text-text-2 cursor-pointer">
        <input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded accent-primary" />
        <span>{campo.etiqueta}{campo.requerido && ' *'}{campo.ayuda && <span className="block text-[11px] text-text-3">{campo.ayuda}</span>}</span>
      </label>
    );
  }

  if (campo.tipo === 'select') {
    return (
      <div className="field">
        {etiqueta}
        <select value={value ?? ''} onChange={e => onChange(e.target.value)} className={`${cls} bg-surface-2`}>
          <option value="">Elige una…</option>
          {(campo.opciones || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {ayuda}
      </div>
    );
  }

  if (campo.tipo === 'multiple') {
    const sel = Array.isArray(value) ? value : [];
    return (
      <div className="field">
        {etiqueta}
        <div className="space-y-1.5">
          {(campo.opciones || []).map(o => (
            <label key={o} className="flex items-center gap-2 text-sm text-text-2 cursor-pointer">
              <input type="checkbox" checked={sel.includes(o)}
                onChange={e => onChange(e.target.checked ? [...sel, o] : sel.filter(x => x !== o))}
                className="w-4 h-4 rounded accent-primary" />
              {o}
            </label>
          ))}
        </div>
        {ayuda}
      </div>
    );
  }

  if (campo.tipo === 'textarea') {
    return (
      <div className="field">
        {etiqueta}
        <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={3}
          className={`${cls} resize-none`} />
        {ayuda}
      </div>
    );
  }

  const type = { numero: 'number', email: 'email', telefono: 'tel', fecha: 'date' }[campo.tipo] || 'text';
  return (
    <div className="field">
      {etiqueta}
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} className={cls} />
      {ayuda}
    </div>
  );
}

function Fondo({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={onClose}>
      <div className="w-full max-w-lg bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
