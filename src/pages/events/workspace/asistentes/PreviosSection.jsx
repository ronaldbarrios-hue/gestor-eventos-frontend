import { useState } from 'react';
import InvitacionesSection from './InvitacionesSection.jsx';
import WaitlistTab from '../../tabs/WaitlistTab.jsx';

/* Asistentes · Antes de la boleta — gente que todavía no tiene entrada.
 *
 * La lista de espera y las invitaciones eran dos pestañas y son el mismo
 * momento: alguien que quiere entrar y aún no tiene boleta. Se operan juntas
 * —se libera un cupo, se invita a quien esperaba— y estaban separadas.
 *
 * ── Dos cosas con dueños distintos ───────────────────────────────────────
 *
 * Los permisos no coinciden, y por eso lo que se enseña se decide aquí dentro
 * y no en el menú:
 *   · Invitaciones (el padrón) va con `gestionar_padron` o `editar_evento`:
 *     es lo que piden todas sus rutas, incluida la de leer su estado.
 *   · La lista de espera va con `gestionar_clientes`. Era del dueño y de nadie
 *     más — mirar quién espera un cupo y ofrecérselo cuando alguien cancela es
 *     trabajo de logística, y dejarlo en el dueño obligaba a dar permisos muy
 *     altos a quien sólo tenía que atender la fila.
 *
 * Quien tiene una sola de las dos ve esa, sin el conmutador: dos botones donde
 * uno lleva a un 403 es peor que un botón.
 */
export default function PreviosSection({ evento, soyOwner, permisos = [] }) {
  const puede = (p) => soyOwner || permisos.includes('*') || permisos.includes(p);
  /* `PERMS_PADRON` es ['gestionar_padron','editar_evento']: los dos, o el fino
     de la 0124 no abriría el padrón que se creó para él. */
  const puedeInvitar = puede('editar_evento') || puede('gestionar_padron');
  const puedeEspera  = puede('gestionar_clientes');

  /* Se arranca en lo que se pueda ver. Empezar en «invitaciones» por costumbre
     dejaría a quien sólo atiende la fila mirando una pantalla vacía. */
  const [vista, setVista] = useState(puedeInvitar ? 'invitaciones' : 'espera');

  /* El menú abre esta pestaña con cualquiera de los dos permisos, así que aquí
     no debería llegar nadie sin ninguno. Si llega —un rol que cambió con la
     pantalla abierta— se dice, en vez de pintar un recuadro vacío. */
  if (!puedeInvitar && !puedeEspera) {
    return <p className="text-sm text-text-3">Tu rol no incluye invitaciones ni lista de espera.</p>;
  }
  if (!puedeEspera)  return <InvitacionesSection evento={evento} />;
  if (!puedeInvitar) return <WaitlistTab evento={evento} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 w-fit">
        {[['invitaciones', 'Invitaciones'], ['espera', 'Lista de espera']].map(([k, l]) => (
          <button key={k} onClick={() => setVista(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${vista === k ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            {l}
          </button>
        ))}
      </div>
      {vista === 'espera' ? <WaitlistTab evento={evento} /> : <InvitacionesSection evento={evento} />}
    </div>
  );
}
