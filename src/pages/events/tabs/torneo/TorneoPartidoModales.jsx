import { useState } from 'react';
import Icono from '../../../../components/ui/Iconos.jsx';
import { torneosApi } from '../../../../api/torneos.js';
import { ymdLocal, hmLocal } from '../../../../lib/fechaLocal.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';

/* Los dos modales de un partido: programarlo (fecha/hora/cancha) y registrar
   su resultado. Viven aparte porque los usan las TRES vistas de torneo
   —bracket, liga y grupos— y no la que los tuviera dentro. */

export function ProgramarModal({ evento, torneo, partido, equipoA, equipoB, onClose, onDone }) {
  /* El día en UTC y la hora en local no casan, y el desfase no se quedaba en
     la pantalla: se guardaba. Un partido de las 9 p. m. del 15 (almacenado
     como el 16 a las 02:00Z) se reabría como «16, 21:00», y guardar sin tocar
     nada lo escribía en el 17. Cada visita al modal lo corría un día más.

     Las dos mitades se leen ahora con el mismo reloj, el de quien mira, que es
     el mismo con el que se vuelven a componer al enviar. */
  const fechaActual = partido.fecha_hora ? new Date(partido.fecha_hora) : null;
  const [fecha, setFecha] = useState(fechaActual ? ymdLocal(fechaActual) : '');
  const [hora, setHora] = useState(fechaActual ? hmLocal(fechaActual) : '');
  const [cancha, setCancha] = useState(partido.cancha || '');
  const [working, setWorking] = useState(false);
  const { success, error: toastErr } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!fecha || !hora) { toastErr('Completa fecha y hora.'); return; }
    setWorking(true);
    try {
      await torneosApi.registrarResultado(evento.id, torneo.id, partido.id, {
        fecha_hora: new Date(`${fecha}T${hora}:00`).toISOString(),
        cancha: cancha.trim() || null,
      });
      success('Horario programado. Se avisó a ambos equipos.');
      onDone();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl max-h-[88vh] overflow-y-auto animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-surface px-6 py-5 border-b border-border flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold font-display tracking-tight text-text-1">Programar partido</h2>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <p className="text-sm text-text-2">
            <strong className="text-text-1">{equipoA?.nombre}</strong> vs <strong className="text-text-1">{equipoB?.nombre}</strong>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="label">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="input rounded-2xl py-3" required autoFocus />
            </div>
            <div className="field">
              <label className="label">Hora</label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)} className="input rounded-2xl py-3" required />
            </div>
          </div>
          <div className="field">
            <label className="label">Cancha / sede <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
            <input value={cancha} onChange={e => setCancha(e.target.value)} className="input rounded-2xl py-3" placeholder="Ej. Cancha 2" />
          </div>
          <p className="text-xs text-text-3">Se le avisará por correo (y push si tiene cuenta) al capitán de ambos equipos.</p>
          <button type="submit" disabled={working}
            className="w-full py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
            {working ? <><Spinner size="sm" /> Guardando...</> : 'Guardar horario'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function ResultadoModal({ evento, torneo, partido, equipoA, equipoB, onClose, onDone }) {
  const [marcadorA, setMarcadorA] = useState(partido.marcador_a ?? '');
  const [marcadorB, setMarcadorB] = useState(partido.marcador_b ?? '');
  const [cancha, setCancha] = useState(partido.cancha || '');
  const [working, setWorking] = useState(false);
  const { success, error: toastErr } = useToast();

  const fechaTxt = partido.fecha_hora
    ? new Date(partido.fecha_hora).toLocaleString('es-CO', { weekday: 'long', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  const submit = async (e) => {
    e.preventDefault();
    if (marcadorA === '' || marcadorB === '') { toastErr('Completa ambos marcadores.'); return; }
    setWorking(true);
    try {
      await torneosApi.registrarResultado(evento.id, torneo.id, partido.id, {
        marcador_a: Number(marcadorA), marcador_b: Number(marcadorB), cancha: cancha.trim() || null,
      });
      success('Resultado guardado.');
      onDone();
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/70 backdrop-blur-md animate-[fadeIn_0.2s_ease_both]" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl border-t sm:border border-border-2 bg-surface shadow-2xl max-h-[88vh] overflow-y-auto animate-[authCardIn_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-surface px-6 py-5 border-b border-border flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold font-display tracking-tight text-text-1">Registrar resultado</h2>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-9 h-9 rounded-xl text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {fechaTxt && (
            <p className="text-xs text-text-3 -mt-1 capitalize"><Icono nombre="calendario" className="w-3 h-3 inline-block align-[-2px]" /> {fechaTxt}{partido.cancha ? ` · ${partido.cancha}` : ''}</p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-text-1 truncate mb-2">{equipoA?.nombre}</p>
              <input type="number" min="0" value={marcadorA} onChange={e => setMarcadorA(e.target.value)}
                className="input rounded-2xl py-3 text-center text-xl font-bold" required autoFocus />
            </div>
            <span className="text-text-3 font-bold pt-6">–</span>
            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-text-1 truncate mb-2">{equipoB?.nombre}</p>
              <input type="number" min="0" value={marcadorB} onChange={e => setMarcadorB(e.target.value)}
                className="input rounded-2xl py-3 text-center text-xl font-bold" required />
            </div>
          </div>
          <div className="field">
            <label className="label">Cancha / sede <span className="text-text-3 lowercase font-normal">(opcional)</span></label>
            <input value={cancha} onChange={e => setCancha(e.target.value)} className="input rounded-2xl py-3" placeholder="Ej. Cancha 2" />
          </div>
          <button type="submit" disabled={working}
            className="w-full py-3.5 rounded-2xl text-base font-semibold bg-text-1 text-bg hover:bg-white disabled:opacity-60 flex items-center justify-center gap-2">
            {working ? <><Spinner size="sm" /> Guardando...</> : 'Guardar resultado'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─────────── Vista Liga (tabla de posiciones, formato "liga") ─────────── */
