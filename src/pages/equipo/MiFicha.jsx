import { useState } from 'react';
import { solicitudesApi } from '../../api/solicitudes.js';
import { useToast } from '../../context/ToastContext.jsx';
import { labelFor } from '../../lib/permisos.js';

/* Tu ficha en este evento — y cómo pedir que la corrijan.
 *
 * ── El hueco que tapa ─────────────────────────────────────────────────────
 *
 * Quien colabora veía una etiqueta: «Tu rol: Logística». Nada más. Ni sus
 * permisos reales, ni con qué nombre figura en las listas y en la escarapela.
 * Y si algo estaba mal —una letra cambiada, un puesto que ya no es el suyo—
 * sólo podía escribirlo en prosa y esperar a que alguien lo transcribiera.
 *
 * ── Por qué se PIDE y no se edita ────────────────────────────────────────
 *
 * Porque esto no es el perfil de la persona: es su ficha DENTRO de un evento
 * que organiza otro. Cómo te llamas en tu cuenta lo cambias tú; cómo apareces
 * en el equipo de alguien, no. La solicitud lleva el cambio dentro para que
 * quien organiza lo apruebe de un clic, sin transcribir — que es donde se
 * cuela el error.
 *
 * Y hay campos que ni se piden: el rol de verdad (`rol_id`, el que decide qué
 * puedes tocar) y los permisos sueltos no están en la lista blanca del
 * servidor. Un permiso se concede, no se solicita.
 */
export default function MiFicha({ ev, onEnviada }) {
  const { success, error: toastErr } = useToast();
  const [pidiendo, setPidiendo] = useState(null);   // campo | null
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const f = ev.mi_ficha;
  /* Sin `mi_ficha` la API es anterior a esto: se enseña lo de siempre y no se
     ofrece pedir nada. Un despliegue no puede quitar lo que ya funcionaba. */
  if (!f) return null;

  const CAMPOS = [
    { id: 'nombre_invitado', label: 'Cómo apareces', valor: f.nombre_invitado, pista: 'El nombre que sale en las listas y en la escarapela.' },
    { id: 'rol',             label: 'Tu puesto',     valor: f.rol,             pista: 'Cómo se llama lo que haces en este evento.' },
  ];

  const abrir = (campo) => {
    setPidiendo(campo.id);
    setValor(campo.valor || '');
    setMotivo('');
  };

  const enviar = async (e) => {
    e.preventDefault();
    const campo = CAMPOS.find(c => c.id === pidiendo);
    if (!campo || !valor.trim() || valor.trim() === (campo.valor || '')) return;
    setEnviando(true);
    try {
      await solicitudesApi.crear(ev.id, {
        tipo: 'cambio',
        titulo: `Corregir «${campo.label.toLowerCase()}»`,
        /* El contenido lleva el antes y el después escritos, no sólo el
           motivo: quien lo lee en una lista de solicitudes tiene que entenderlo
           sin abrir nada. */
        contenido: `${campo.valor || '(vacío)'} → ${valor.trim()}${motivo.trim() ? `\n\n${motivo.trim()}` : ''}`,
        cambio: { campo: campo.id, valor_actual: campo.valor || null, valor_propuesto: valor.trim() },
      });
      success('Pedido. Lo verá quien organiza el evento.');
      setPidiendo(null);
      onEnviada?.();
    } catch (err) {
      toastErr(err.response?.data?.error || err.message);
    } finally { setEnviando(false); }
  };

  /* Los permisos, con el nombre que se lee en el panel y no con su id. Un
     `gestionar_descuentos` suelto no le dice nada a quien no escribió el
     catálogo. */
  const etiquetaPermiso = (id) => labelFor(id) || id;

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Tu ficha en este evento</p>
        <p className="text-xs text-text-3 mt-1 leading-relaxed">
          Esto es lo que ve quien organiza. Para cambiarlo se pide: no se edita aquí.
        </p>
      </div>

      <dl className="space-y-2">
        {CAMPOS.map(c => (
          <div key={c.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <dt className="text-xs text-text-3">{c.label}</dt>
              <dd className="text-sm text-text-1 truncate">{c.valor || <span className="text-text-3">Sin poner</span>}</dd>
            </div>
            <button type="button" onClick={() => abrir(c)}
              className="text-xs text-primary-light hover:underline shrink-0 mt-0.5">
              Pedir cambio
            </button>
          </div>
        ))}
        {f.rol_nombre && (
          <div>
            <dt className="text-xs text-text-3">Rol asignado</dt>
            <dd className="text-sm text-text-1">
              {f.rol_nombre}
              {/* El rol de verdad no se pide: se concede. Decirlo aquí evita
                  que alguien busque el botón que no está. */}
              <span className="text-xs text-text-3"> · lo asigna quien organiza</span>
            </dd>
          </div>
        )}
      </dl>

      {f.permisos?.length > 0 && (
        <div>
          <p className="text-xs text-text-3 mb-1.5">Lo que puedes hacer aquí</p>
          <div className="flex flex-wrap gap-1">
            {f.permisos.map(p => (
              <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-text-2">
                {etiquetaPermiso(p)}
              </span>
            ))}
          </div>
        </div>
      )}

      {pidiendo && (
        <form onSubmit={enviar} className="rounded-xl border border-border bg-surface/60 p-3 space-y-2">
          <label className="label">
            {CAMPOS.find(c => c.id === pidiendo)?.label}
            <span className="lowercase tracking-normal font-normal text-text-3">
              {' — '}{CAMPOS.find(c => c.id === pidiendo)?.pista}
            </span>
          </label>
          <input value={valor} onChange={e => setValor(e.target.value)} autoFocus
            className="input w-full" maxLength={200} />
          <input value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder="Por qué (opcional)" className="input w-full text-sm" maxLength={200} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPidiendo(null)} className="btn-ghost btn-sm">Cancelar</button>
            <button type="submit" className="btn-primary btn-sm"
              disabled={enviando || !valor.trim() || valor.trim() === (CAMPOS.find(c => c.id === pidiendo)?.valor || '')}>
              {enviando ? 'Enviando…' : 'Pedir el cambio'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
