import { useMemo, useState } from 'react';
import { permisosPorGrupo } from '../../lib/permisos.js';

/* Elegir los permisos de un rol.
 *
 * ── De dónde sale este rediseño ──────────────────────────────────────────
 *
 * De capacitar a quien iba a llevar la logística de un evento: hubo que darle
 * permisos muy altos para que pudiera operar, y encontrar cuáles en una lista
 * de treinta casillas agrupadas costó más que la propia capacitación.
 *
 * Los tres problemas que tenía, en orden de cuánto estorbaban:
 *
 * 1. No se podía buscar. Treinta permisos en ocho grupos dentro de una caja de
 *    320 px de alto: para saber si existía «el de los documentos» había que
 *    leerlos todos. Y si no aparecía, no se sabía si es que no existía o si es
 *    que estaba con otro nombre en otro grupo.
 * 2. No se veía cuánto llevabas puesto de cada grupo, ni había forma de decir
 *    «todo lo de Clientes» sin dar quince clics.
 * 3. Nada distinguía un permiso que abre una pantalla de uno que deja BORRAR
 *    cosas. La lista los pinta iguales, y al armar un rol deprisa eso es cómo
 *    se acaba concediendo de más — que es exactamente lo que pasó.
 */

/* Los permisos cuyo efecto no se deshace, o que dan poder sobre el equipo.
 *
 * No se esconden ni se bloquean: se marcan. Quien arma un rol suele ir deprisa
 * y a golpe de reconocer palabras, y estas cinco merecen que la vista se pare
 * un segundo antes de marcarlas. */
const DELICADOS = new Set([
  '*',                  // el co-dueño: manda igual que quien creó el evento
  'borrar_boletas',     // se lleva la boleta y sus respuestas, sin vuelta atrás
  'gestionar_roles',    // reparte los papeles del resto del equipo
  'remover_miembros',   // saca gente del evento
  'reembolsar',         // deja constancia de que se devolvió dinero
]);

/* Para buscar sin que estorben los acentos ni las mayúsculas: quien escribe
   «acreditacion» tiene que encontrar «Diseñar escarapelas y carnés». */
const normal = (v) => String(v || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function PermisosSelector({ value = [], catalogo, onChange }) {
  const [busca, setBusca] = useState('');
  const grupos = useMemo(() => permisosPorGrupo(catalogo), [catalogo]);

  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter(p => p !== id) : [...value, id]);
  };

  /* Marcar o desmarcar un grupo entero. Es lo que se hace de verdad al armar un
     rol —«todo lo de puerta»— y a mano son quince clics, que es cuando alguien
     decide que es más rápido dar el permiso grande. */
  const alternarGrupo = (perms, todosPuestos) => {
    const ids = perms.map(p => p.id);
    onChange(todosPuestos
      ? value.filter(p => !ids.includes(p))
      : [...new Set([...value, ...ids])]);
  };

  /* La búsqueda mira etiqueta, descripción, grupo Y el id técnico.
   *
   * El id porque es lo que sale en los mensajes de error del servidor y en la
   * documentación: quien viene de leer «hace falta gestionar_padron» tiene que
   * poder pegarlo aquí. Por palabras y no por trozo literal, como las demás
   * búsquedas del panel: «documentos subir» encuentra «Subir y quitar
   * documentos». */
  const palabras = useMemo(
    () => normal(busca).split(/\s+/).filter(Boolean),
    [busca]);

  const visibles = useMemo(() => grupos
    .map(([grupo, perms]) => [
      grupo,
      perms.filter(p => {
        if (!palabras.length) return true;
        const donde = normal(`${p.label} ${p.desc} ${grupo} ${p.id}`);
        return palabras.every(w => donde.includes(w));
      }),
    ])
    .filter(([, perms]) => perms.length > 0), [grupos, palabras]);

  const totalVisible = visibles.reduce((n, [, perms]) => n + perms.length, 0);
  const total = grupos.reduce((n, [, perms]) => n + perms.length, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-2 flex-wrap">
        <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Permisos</p>
        <p className="text-[11px] text-text-3 tabular-nums">
          {value.length} de {total} marcados
        </p>
      </div>

      {/* Buscar. Va arriba y siempre visible: es lo primero que se necesita
          cuando lo que se busca es «el de los documentos». */}
      <div className="relative mb-2">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar permiso: documentos, puerta, borrar…"
          className="input rounded-2xl py-2 text-sm w-full pr-16"
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-text-3 hover:text-text-1 px-2 py-1">
            limpiar
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Que la búsqueda no encuentre nada se dice. Antes, con la lista
            entera delante, «no está» y «no lo veo» eran lo mismo. */}
        {totalVisible === 0 && (
          <p className="text-sm text-text-3 py-6 text-center">
            Ningún permiso coincide con «{busca}».
          </p>
        )}

        {visibles.map(([grupo, perms]) => {
          const puestos = perms.filter(p => value.includes(p.id)).length;
          const todos = puestos === perms.length;
          return (
            <div key={grupo}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[10px] uppercase tracking-widest text-text-3 font-semibold">
                  {grupo}
                  {puestos > 0 && (
                    <span className="ml-1.5 text-text-2 tabular-nums normal-case tracking-normal">
                      {puestos}/{perms.length}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => alternarGrupo(perms, todos)}
                  className="text-[11px] text-text-3 hover:text-text-1 transition-colors">
                  {todos ? 'quitar todo' : 'marcar todo'}
                </button>
              </div>

              <div className="space-y-1.5">
                {perms.map(p => {
                  const checked = value.includes(p.id);
                  const delicado = DELICADOS.has(p.id);
                  return (
                    <label key={p.id}
                      className={`flex items-start gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors
                        ${checked
                          ? (delicado
                            ? 'bg-danger/10 border border-danger/25'
                            : 'bg-primary/10 border border-primary/20')
                          : 'border border-transparent hover:bg-surface-2/60'}`}>
                      <input
                        type="checkbox" checked={checked} onChange={() => toggle(p.id)}
                        className="mt-0.5 w-4 h-4 rounded border-border bg-surface-2 accent-primary flex-shrink-0"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="text-sm text-text-1 font-medium block">
                          {p.label}
                          {/* Se marca lo que no se deshace. No se esconde ni se
                              bloquea: quien arma un rol va deprisa y reconoce
                              palabras, y estos merecen que la vista se pare. */}
                          {delicado && (
                            <span className="ml-1.5 text-[10px] uppercase tracking-wide text-danger-light border border-danger/30 bg-danger/10 px-1.5 py-0.5 rounded">
                              delicado
                            </span>
                          )}
                          {/* Concederlo no cambia nada todavía. Decirlo aquí
                              evita que alguien dé un permiso, se quede
                              tranquilo, y descubra dentro de un mes que no
                              hacía nada. */}
                          {p.aplicado === false && (
                            <span className="ml-1.5 text-[10px] uppercase tracking-wide text-warning border border-warning/30 bg-warning/10 px-1.5 py-0.5 rounded">
                              sin efecto aún
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-text-3 block mt-0.5">{p.desc}</span>
                        {/* El id técnico, en pequeño. Es lo que dicen los
                            mensajes del servidor —«hace falta gestionar_padron»—
                            y hasta hoy no había forma de saber cuál casilla era
                            ésa. */}
                        <span className="text-[10px] font-mono text-text-3/70 block mt-0.5">{p.id}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-text-3 mt-2">
        {value.length === 0
          ? 'Sin permisos: este rol entra al evento y no puede hacer nada.'
          : `${value.length} ${value.length === 1 ? 'permiso marcado' : 'permisos marcados'}.`}
      </p>
    </div>
  );
}
