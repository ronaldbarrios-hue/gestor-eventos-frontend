import { useState } from 'react';
import InvitacionesSection from './InvitacionesSection.jsx';
import WaitlistTab from '../../tabs/WaitlistTab.jsx';

/* Asistentes · Antes de la boleta — gente que todavía no tiene entrada.
 *
 * La lista de espera y las invitaciones eran dos pestañas y son el mismo
 * momento: alguien que quiere entrar y aún no tiene boleta. Se operan juntas
 * —se libera un cupo, se invita a quien esperaba— y estaban separadas.
 *
 * Los permisos no coinciden y no se pueden igualar: la lista de espera es del
 * dueño (mueve cupos y manda correos con enlace de reserva) y las invitaciones
 * las manda quien lleva los clientes. La pestaña se ve con `ver_clientes` y la
 * lista de espera sólo aparece dentro si eres el dueño — fusionarlas a secas
 * habría repartido poder sin que nadie lo pidiera. */
export default function PreviosSection({ evento, soyOwner }) {
  const [vista, setVista] = useState('invitaciones');
  if (!soyOwner) return <InvitacionesSection evento={evento} />;

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
