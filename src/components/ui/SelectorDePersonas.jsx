import { useMemo, useState } from 'react';
import { asignables, porRol } from '../../lib/equipo.js';

/* GESTEK — A quién se le asigna esto.
 *
 * ── Por qué existe ────────────────────────────────────────────────────────
 *
 * «Quién registra aquí», en la puerta de ingreso, era una ficha por cada
 * miembro del equipo con el nombre y nada más. En un evento con cuarenta
 * personas son cuarenta fichas seguidas, sin buscador y sin el rol al lado —
 * así que no hay forma de saber cuál de los cuatro «Juan» es el de puerta.
 *
 * Y hay algo que se pide más a menudo que elegir personas: **elegir un rol
 * entero**. En la puerta no se asigna a Juan, se asigna «a quien esté en
 * puerta». Escrito con personas, cada cambio de turno obliga a volver a esta
 * pantalla; escrito con el rol, se arregla solo. `tareas` ya distingue las dos
 * cosas (`asignado_user_id` / `asignado_rol_id`) — esto trae esa idea al resto.
 *
 * ── Cómo se lee el valor ──────────────────────────────────────────────────
 *
 * `personas` y `roles` son dos listas, no una. Se unen al resolver quién
 * atiende algo, y se guardan aparte a propósito: si se guardaran resueltas —la
 * gente que hoy tiene ese rol—, mañana entra alguien al rol y no queda
 * asignado, que es exactamente el problema que el rol viene a resolver. */

/* Escapado (\u0300-\u036f) y no con los caracteres literales, por lo mismo que
   avisa `SelectorBuscable`: son marcas combinantes invisibles en el editor y
   cualquier guardado con otra codificación las rompe sin que se note hasta que
   un acento deja de buscarse. Nadie escribe «Muñoz» con eñe en un buscador. */
const sinTildes = (s) => String(s ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

export default function SelectorDePersonas({
  miembros = [],
  roles = [],
  personas = [],
  rolesSel = [],
  onChange,
  permitirRoles = true,
  /* A partir de cuántas personas aparece el buscador. Con seis, buscar es más
     trabajo que mirar. */
  umbralBuscador = 8,
}) {
  const [texto, setTexto] = useState('');

  const gente = useMemo(() => asignables(miembros), [miembros]);

  const filtrados = useMemo(() => {
    const q = sinTildes(texto);
    if (!q) return gente;
    /* Por nombre, por correo y **por rol**: escribir «puerta» tiene que sacar a
       la gente de puerta, que es como se piensa al asignar. */
    return gente.filter(m =>
      sinTildes(m.nombre).includes(q)
      || sinTildes(m.email).includes(q)
      || sinTildes(m.rolNombre).includes(q));
  }, [gente, texto]);

  const grupos = useMemo(() => porRol(filtrados), [filtrados]);

  const alternarPersona = (id) => {
    const hay = personas.includes(id);
    onChange?.({
      personas: hay ? personas.filter(x => x !== id) : [...personas, id],
      roles: rolesSel,
    });
  };

  const alternarRol = (id) => {
    const hay = rolesSel.includes(id);
    onChange?.({
      personas,
      roles: hay ? rolesSel.filter(x => x !== id) : [...rolesSel, id],
    });
  };

  const porId = useMemo(() => new Map(gente.map(m => [m.id, m])), [gente]);
  const rolPorId = useMemo(() => new Map((roles || []).map(r => [r.id, r])), [roles]);
  const hayAlgo = personas.length > 0 || rolesSel.length > 0;

  return (
    <div className="space-y-2">
      {/* Lo elegido, arriba y siempre visible. Sin esto hay que buscar entre
          cuarenta a quien se quiere quitar, que es el mismo problema al revés. */}
      {hayAlgo && (
        <div className="flex flex-wrap gap-1.5">
          {rolesSel.map(id => (
            <button key={`r-${id}`} type="button" onClick={() => alternarRol(id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                         bg-accent/15 border border-accent/40 text-text-1 hover:bg-accent/25">
              Todo «{rolPorId.get(id)?.nombre || 'rol'}»
              <span className="text-text-3" aria-hidden="true">×</span>
              <span className="sr-only">Quitar</span>
            </button>
          ))}
          {personas.map(id => (
            <button key={`p-${id}`} type="button" onClick={() => alternarPersona(id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                         bg-primary/15 border border-primary/30 text-text-1 hover:bg-primary/25">
              {porId.get(id)?.nombre || 'Alguien que ya no está en el equipo'}
              <span className="text-text-3" aria-hidden="true">×</span>
              <span className="sr-only">Quitar</span>
            </button>
          ))}
        </div>
      )}

      {gente.length >= umbralBuscador && (
        <input
          type="text" value={texto} autoComplete="off"
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
          placeholder="Buscar por nombre, correo o rol…"
          className="input-form bg-surface-2 w-full text-sm"
        />
      )}

      <div className="max-h-64 overflow-y-auto rounded-2xl border border-border bg-surface-2/40 divide-y divide-border/50">
        {grupos.length === 0 ? (
          <p className="px-4 py-3 text-sm text-text-3">
            {texto ? `Nadie coincide con «${texto}».` : 'Todavía no hay nadie en el equipo con cuenta activa.'}
          </p>
        ) : grupos.map(([rol, personasDelRol]) => {
          /* El id del rol sale de la primera persona que lo tiene: el catálogo
             puede no estar cargado y no vale la pena bloquear la lista por eso. */
          const rolId = personasDelRol.find(p => p.rolId)?.rolId || '';
          const rolCompleto = rolId && rolesSel.includes(rolId);
          return (
            <div key={rol}>
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-surface/60">
                <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">
                  {rol} <span className="font-normal tracking-normal normal-case">· {personasDelRol.length}</span>
                </p>
                {permitirRoles && rolId && rol !== 'Organizador' && rol !== 'Sin rol' && (
                  <button type="button" onClick={() => alternarRol(rolId)}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors
                      ${rolCompleto
                        ? 'border-accent/50 bg-accent/15 text-text-1'
                        : 'border-border text-text-3 hover:text-text-1'}`}>
                    {rolCompleto ? 'Todo el rol ✓' : 'Todo el rol'}
                  </button>
                )}
              </div>
              {personasDelRol.map(m => {
                const elegida = personas.includes(m.id);
                /* Quien ya entra por su rol se enseña marcado y apagado: si se
                   pudiera desmarcar, quedaría asignado igual y el botón
                   mentiría. */
                const porSuRol = rolCompleto;
                return (
                  <button key={m.id} type="button"
                    onClick={() => !porSuRol && alternarPersona(m.id)}
                    disabled={porSuRol}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors
                      ${porSuRol ? 'opacity-60 cursor-default' : 'hover:bg-surface-2'}
                      ${elegida || porSuRol ? 'text-text-1' : 'text-text-2'}`}>
                    <span className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center text-[10px]
                      ${elegida || porSuRol ? 'bg-primary border-primary text-white' : 'border-border-2'}`}>
                      {(elegida || porSuRol) ? '✓' : ''}
                    </span>
                    <span className="truncate flex-1">{m.nombre}</span>
                    {porSuRol && <span className="text-[10px] text-text-3 flex-shrink-0">por su rol</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
