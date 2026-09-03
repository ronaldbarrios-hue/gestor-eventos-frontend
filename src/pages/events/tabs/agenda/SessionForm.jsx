import { useMemo, useState } from 'react';
import Icono from '../../../../components/ui/Iconos.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';
import { TIPO_DEFECTO, tipoEspacio, tipoEstilo, esCompetitivo, tiposDelEvento } from '../../../../lib/espacio.js';
import { zonasDelEvento, etiquetaZona } from '../../../../lib/zonas.js';
import PreguntasSubEvento from '../PreguntasSubEvento.jsx';
import { toLocalInput, withDefaultTime } from './agendaComun.jsx';

/* El formulario de un sub-evento. Es la pieza más grande de la agenda con
   diferencia —tipo, horario, sala, cupo, modo de inscripción y el editor de
   preguntas propias—, y la que más cambia, así que va sola. */

function sitiosDelEvento(evento, sessions, campo) {
  const vistos = new Map();
  const meter = (valor, origen) => {
    const v = String(valor || '').trim();
    if (!v) return;
    const k = v.toLocaleLowerCase('es');
    if (!vistos.has(k)) vistos.set(k, { valor: v, origen });
  };

  for (const s of sessions) meter(s?.[campo], 'ya en uso');

  const pj = evento?.page_json || {};
  for (const z of (Array.isArray(pj.zonas) ? pj.zonas : [])) {
    meter(z?.nombre, z?.aforo_max ? `zona · aforo ${z.aforo_max}` : 'zona de aforo');
  }
  for (const m of (Array.isArray(pj.mapa?.marcadores) ? pj.mapa.marcadores : [])) {
    if (m?.tipo === 'punto') meter(m.nombre, 'punto del plano');
  }
  /* Las puertas sólo tienen sentido como ubicación: un track es una sala. */
  if (campo === 'ubicacion') {
    for (const a of (Array.isArray(pj.accesos) ? pj.accesos : [])) meter(a?.nombre, 'puerta');
  }

  return [...vistos.values()].sort((a, b) => a.valor.localeCompare(b.valor, 'es'));
}

export default function SessionForm({ initial, speakers, prefillDate, torneos = [], evento, sessions = [], expositores = [], tiposBoleta = [], onSave, onCancel }) {
  /* Los grupos que este evento ya usa, para sugerirlos. Se ordenan para que la
     lista no baile entre aperturas, y se deduplica sin distinguir mayusculas
     —el servidor reutiliza la variante existente al guardar, asi que ofrecer
     las dos aqui solo confundiria. */
  const subcategoriasUsadas = useMemo(() => {
    const vistos = new Map();
    for (const s of sessions) {
      const v = (s?.subcategoria || '').trim();
      if (v && !vistos.has(v.toLocaleLowerCase('es'))) vistos.set(v.toLocaleLowerCase('es'), v);
    }
    return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }, [sessions]);

  const zonasEvento = useMemo(() => zonasDelEvento(evento), [evento]);
  const tracksUsados = useMemo(() => sitiosDelEvento(evento, sessions, 'track'), [evento, sessions]);
  const ubicaciones  = useMemo(() => sitiosDelEvento(evento, sessions, 'ubicacion'), [evento, sessions]);

  const [form, setForm] = useState({
    titulo     : initial?.titulo || '',
    descripcion: initial?.descripcion || '',
    inicio     : initial?.inicio ? toLocalInput(initial.inicio) : (prefillDate ? toLocalInput(withDefaultTime(prefillDate, 9, 0)) : ''),
    fin        : initial?.fin    ? toLocalInput(initial.fin)    : '',
    track      : initial?.track || 'principal',
    ubicacion  : initial?.ubicacion || '',
    zona_id    : initial?.zona_id || '',
    speaker_id : initial?.speaker_id || '',
    expositor_id  : initial?.expositor_id || '',
    ticket_type_id: initial?.ticket_type_id || '',
    tipo       : initial?.tipo || TIPO_DEFECTO,
    subcategoria: initial?.subcategoria || '',
    torneo_id  : initial?.torneo_id || '',
    requiere_inscripcion: Boolean(initial?.requiere_inscripcion),
    cupo       : initial?.cupo ?? '',
    formulario_modo: initial?.formulario_modo || 'ninguno',
  });
  const [saving, setSaving] = useState(false);
  const [preguntasOpen, setPreguntasOpen] = useState(false);
  const competitivo = esCompetitivo(form.tipo);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.inicio) return;
    setSaving(true);
    await onSave({
      titulo     : form.titulo,
      descripcion: form.descripcion || null,
      inicio     : new Date(form.inicio).toISOString(),
      fin        : form.fin ? new Date(form.fin).toISOString() : null,
      track      : form.track,
      ubicacion  : form.ubicacion || null,
      zona_id    : form.zona_id || null,
      speaker_id : form.speaker_id || null,
      expositor_id  : form.expositor_id || null,
      ticket_type_id: form.ticket_type_id || null,
      tipo       : form.tipo,
      subcategoria: form.subcategoria.trim() || null,
      torneo_id  : competitivo ? (form.torneo_id || null) : null,
      requiere_inscripcion: form.requiere_inscripcion,
      /* Vacío = sin límite. No se convierte a 0, que significaría "lleno
         desde el primer minuto". */
      cupo       : form.requiere_inscripcion && form.cupo !== '' ? Number(form.cupo) : null,
      formulario_modo: form.requiere_inscripcion ? form.formulario_modo : 'ninguno',
    });
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="rounded-3xl border border-primary/25 bg-surface/40 p-5 space-y-3 animate-[fadeUp_0.3s_ease_both]">
      <p className="text-xs uppercase tracking-widest text-text-3 font-semibold">{initial ? 'Editar sub-evento' : 'Nuevo sub-evento'}</p>

      {/* Tipo de sub-evento */}
      <div className="field">
        <label className="label">Tipo</label>
        <div className="flex flex-wrap gap-1.5">
          {tiposDelEvento(evento).map(t => (
            <button type="button" key={t.id} onClick={() => setForm(f => ({...f, tipo: t.id}))}
              style={form.tipo === t.id ? tipoEstilo(t.id, evento) : undefined}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1
                ${form.tipo === t.id ? '' : 'border-border text-text-3 hover:text-text-1'}`}>
              <Icono nombre={t.icono} className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* El nivel de abajo, y este SI lo escribe el organizador:
            competencia -> Deportes    -> Futbol, Padel
            competencia -> Gaming      -> FIFA, Fortnite
            competencia -> Habilidades -> Hackaton

          Se usa <datalist> y no un desplegable porque hacen falta las dos
          cosas a la vez: reutilizar lo que ya se escribio en este evento
          —para no acabar con «Gaming» y «gaming» como dos grupos— y poder
          inventar uno nuevo sin tener que crearlo antes en ningun sitio. */}
      <div className="field">
        <label className="label">
          Grupo <span className="lowercase tracking-normal font-normal text-text-3">(opcional, dentro de «{tipoEspacio(form.tipo, evento).label}»)</span>
        </label>
        <input list="gestek-subcategorias" value={form.subcategoria}
          onChange={e => setForm(f => ({ ...f, subcategoria: e.target.value }))}
          placeholder="Deportes, Gaming, Desarrollo de habilidades..."
          maxLength={60}
          className="input-form" />
        <datalist id="gestek-subcategorias">
          {subcategoriasUsadas.map(v => <option key={v} value={v} />)}
        </datalist>
        <p className="text-[11px] text-text-3 mt-1">
          Para agrupar varios sub-eventos del mismo tipo. El tipo lo pone la plataforma; el grupo, tu.
        </p>
      </div>

      {competitivo && (
        <div className="field">
          <label className="label">Llaves del torneo <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
          {torneos.length > 0 ? (
            <select value={form.torneo_id} onChange={e => setForm(f => ({...f, torneo_id: e.target.value}))}
              className="input bg-surface-2 rounded-2xl py-3 text-base">
              <option value="">Sin llaves vinculadas</option>
              {torneos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          ) : (
            <p className="text-[11px] text-text-3">Crea un torneo en la pestaña «Torneo» y podrás vincular sus llaves aquí para que aparezcan en la página pública.</p>
          )}
        </div>
      )}

      <input value={form.titulo} onChange={e => setForm(f => ({...f, titulo: e.target.value}))}
        placeholder="Título" required autoFocus
        className="input-form font-medium" />
      <textarea value={form.descripcion} onChange={e => setForm(f => ({...f, descripcion: e.target.value}))}
        placeholder="Descripción (opcional)" rows={2}
        className="input-form resize-none" />
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="field">
          <label className="label">Inicio *</label>
          <input type="datetime-local" value={form.inicio} onChange={e => setForm(f => ({...f, inicio: e.target.value}))}
            required className="input bg-surface-2 rounded-2xl py-3 text-base" />
        </div>
        <div className="field">
          <label className="label">Fin (opcional)</label>
          <input type="datetime-local" value={form.fin} onChange={e => setForm(f => ({...f, fin: e.target.value}))}
            className="input bg-surface-2 rounded-2xl py-3 text-base" />
        </div>
      </div>
      {zonasEvento.length > 0 && (
        <div className="field">
          <label className="label">Zona del plano <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
          <select value={form.zona_id}
            onChange={e => setForm(f => ({ ...f, zona_id: e.target.value }))}
            className="input bg-surface-2 rounded-2xl py-3 text-base">
            <option value="">Sin zona</option>
            {zonasEvento.map(z => (
              <option key={z.id} value={z.id}>{etiquetaZona(z)}</option>
            ))}
          </select>
          <p className="text-[11px] text-text-3 mt-1">
            Al tocar esa zona en el plano, este sub-evento aparece en su programación junto con el aforo del momento.
          </p>
          {/* Antes, elegir la zona copiaba su nombre al campo «Ubicación» de
              abajo si estaba vacío. La intención era buena —son la misma
              respuesta a «dónde es»— pero el efecto era el contrario: dejaba
              DOS verdades, y en cuanto alguien renombraba la zona el texto
              copiado se quedaba viejo sin que nada avisara. Medido en
              producción: 2 de 11 sesiones tenían zona y 4 tenían ubicación
              escrita a mano. Ahora la zona es la respuesta y la ubicación es el
              detalle. */}
          {!form.zona_id && (
            <p className="text-[11px] text-warning mt-1">
              Sin zona, esta actividad no sale en el plano ni en la ficha de ninguna zona.
            </p>
          )}
        </div>
      )}

      {/* Quién la da y con qué boleta se entra.
          Las dos columnas viven en `agenda_sessions` desde hace tiempo y NINGUNA
          pantalla las escribía: medido en producción, 0 de 11 sesiones tenían
          una u otra. No faltaba modelo, faltaba el campo. */}
      {(expositores.length > 0 || tiposBoleta.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {expositores.length > 0 && (
            <div className="field">
              <label className="label">La da <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
              <select value={form.expositor_id} onChange={e => setForm(f => ({...f, expositor_id: e.target.value}))}
                className="input bg-surface-2 rounded-2xl py-3 text-base">
                <option value="">Nadie en concreto</option>
                {expositores.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </select>
              <p className="text-[11px] text-text-3 mt-1">
                Un expositor del evento. Distinto del speaker: aquí va la empresa, arriba la persona.
              </p>
            </div>
          )}
          {tiposBoleta.length > 0 && (
            <div className="field">
              <label className="label">Hace falta boleta <span className="lowercase tracking-normal font-normal text-text-3">(opcional)</span></label>
              <select value={form.ticket_type_id} onChange={e => setForm(f => ({...f, ticket_type_id: e.target.value}))}
                className="input bg-surface-2 rounded-2xl py-3 text-base">
                <option value="">Cualquiera</option>
                {tiposBoleta.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
              <p className="text-[11px] text-text-3 mt-1">
                Para las actividades que sólo entran con un tipo de boleta (VIP, por ejemplo).
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="field">
          <label className="label">Track / sala</label>
          <input list="gestek-tracks" value={form.track} onChange={e => setForm(f => ({...f, track: e.target.value}))}
            placeholder="principal" className="input-form" />
          <datalist id="gestek-tracks">
            {tracksUsados.map(o => <option key={o.valor} value={o.valor}>{o.origen}</option>)}
          </datalist>
          <p className="text-[11px] text-text-3 mt-1">
            {tracksUsados.length > 0
              ? 'Escribe o elige uno de los que ya usa este evento. Sesiones con el mismo track aparecen juntas en la vista "Salas".'
              : 'Ej. "Auditorio A", "Sala 2". Sesiones con el mismo track aparecen juntas en la vista "Salas".'}
          </p>
        </div>
        <div className="field">
          <label className="label">
            {zonasEvento.length > 0 ? 'Detalle del sitio' : 'Ubicación'}
          </label>
          <input list="gestek-ubicaciones" value={form.ubicacion} onChange={e => setForm(f => ({...f, ubicacion: e.target.value}))}
            placeholder={zonasEvento.length > 0 ? 'Piso 2, al fondo…' : 'Piso 2'} className="input-form" />
          <datalist id="gestek-ubicaciones">
            {ubicaciones.map(o => <option key={o.valor} value={o.valor}>{o.origen}</option>)}
          </datalist>
          <p className="text-[11px] text-text-3 mt-1">
            {zonasEvento.length > 0
              ? 'Sólo si hace falta precisar algo dentro de la zona. El sitio lo dice la zona de arriba.'
              : ubicaciones.length > 0
                ? 'Salen las zonas, los puntos del plano y las puertas ya creadas.'
                : 'Ej. «Auditorio A», «Piso 2».'}
          </p>
        </div>
        <div className="field">
          <label className="label">Speaker</label>
          <select value={form.speaker_id} onChange={e => setForm(f => ({...f, speaker_id: e.target.value}))}
            className="input bg-surface-2 rounded-2xl py-3 text-base">
            <option value="">Sin speaker</option>
            {speakers.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      </div>
      {/* ── Inscripción a este sub-evento ──
          La boleta del evento sigue siendo la llave; esto es apuntarse a esta
          actividad concreta, con su cupo aparte. Sirve para responder la
          pregunta que importa al reportar: cuánta gente vino al evento y
          cuánta participó en cada taller. */}
      <div className="rounded-2xl border border-border bg-surface-2/40 p-3.5 space-y-3">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={form.requiere_inscripcion}
            onChange={e => setForm(f => ({ ...f, requiere_inscripcion: e.target.checked }))}
            className="w-4 h-4 mt-0.5 accent-[#8B5CF6]" />
          <span className="text-sm">
            <span className="font-medium text-text-1 block">Pide inscripción aparte</span>
            <span className="text-xs text-text-3">
              Con la entrada al evento no basta: hay que apuntarse a esta actividad.
            </span>
          </span>
        </label>

        {form.requiere_inscripcion && (
          <div className="space-y-3 pl-6.5">
            <div className="field">
              <label className="label">Cupo <span className="lowercase tracking-normal font-normal text-text-3">(vacío = sin límite)</span></label>
              <input type="number" min={1} value={form.cupo}
                onChange={e => setForm(f => ({ ...f, cupo: e.target.value }))}
                placeholder="Sin límite"
                className="input bg-surface-2 rounded-2xl py-2.5 text-base w-40" />
              {initial?.inscritos > 0 && (
                <p className="text-[11px] text-text-3 mt-1">Ya hay {initial.inscritos} inscritos.</p>
              )}
            </div>

            <div className="field">
              <label className="label">Qué se le pregunta al apuntarse</label>
              <div className="space-y-1.5">
                {[
                  ['ninguno', 'Nada, un botón y listo', 'Lo normal: la boleta ya sabe quién es. Volver a pedirle sus datos es hacerle escribir dos veces lo mismo.'],
                  ['propio',  'Preguntas propias de esta actividad', 'Cortas y sobre lo que pasa aquí: talla, si trae equipo, nivel.'],
                  ['evento',  'El formulario completo del evento', 'El mismo que se llena al comprar la boleta. Largo.'],
                ].map(([v, titulo, nota]) => (
                  <label key={v}
                    className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border transition-colors
                                ${form.formulario_modo === v ? 'border-accent/60 bg-accent/5' : 'border-border hover:bg-surface-2'}`}>
                    <input type="radio" name="formulario_modo" checked={form.formulario_modo === v}
                      onChange={() => setForm(f => ({ ...f, formulario_modo: v }))}
                      className="mt-0.5 accent-[#8B5CF6]" />
                    <span className="text-xs">
                      <span className="font-medium text-text-1 block">{titulo}</span>
                      <span className="text-text-3">{nota}</span>
                    </span>
                  </label>
                ))}
              </div>

              {form.formulario_modo === 'propio' && (
                initial?.id ? (
                  <button type="button" onClick={() => setPreguntasOpen(true)}
                    className="btn-secondary btn-sm mt-2">
                    Escribir las preguntas
                  </button>
                ) : (
                  <p className="text-[11px] text-warning mt-2">
                    Crea el sub-evento primero y luego vuelve a editarlo para escribir sus preguntas.
                  </p>
                )
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost btn-sm">Cancelar</button>
        <button type="submit" disabled={saving || !form.titulo.trim() || !form.inicio} className="btn-primary btn-sm">
          {saving ? <><Spinner size="sm" /> Guardando...</> : (initial ? 'Guardar' : 'Crear sesión')}
        </button>
      </div>

      {preguntasOpen && initial?.id && (
        <PreguntasSubEvento
          evento={evento}
          sesion={initial}
          onClose={() => setPreguntasOpen(false)}
          /* Si el editor deja el sub-evento sin ninguna pregunta, el servidor
             lo devuelve a 'ninguno' — y el selector tiene que enterarse, o
             enseñaría "propio" sobre una lista vacía. */
          onGuardado={d => { if (d?.formulario_modo) setForm(f => ({ ...f, formulario_modo: d.formulario_modo })); }}
        />
      )}
    </form>
  );
}

/* ─────────── Speakers ─────────── */

