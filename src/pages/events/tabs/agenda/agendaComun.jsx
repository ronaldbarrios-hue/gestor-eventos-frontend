/* Lo que comparten todas las vistas de la agenda: el formato de fechas, los
   iconos y el cartel de vacío.

   Estaban al final de AgendaTab, después de mil líneas de vistas, y cada una
   de las cinco los usaba. Al partir el archivo tenían que salir primero: si no,
   cada módulo se habría hecho su propia copia de `startOfWeek`, y ahí es donde
   una semana empieza en lunes en una vista y en domingo en otra. */

export const horaCorta = (d) => d ? new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';

export const DOW_SHORT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
export const MES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const DIA_SEMANA = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

export function EmptyState({ title, desc }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
      <h2 className="text-xl font-bold font-display text-text-1 mb-2">{title}</h2>
      <p className="text-sm text-text-2 max-w-sm mx-auto">{desc}</p>
    </div>
  );
}

/* ─────────── helpers ─────────── */
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d)) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function withDefaultTime(date, h, m) {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}
export function startOfDay(d)   { const x = new Date(d); x.setHours(0,0,0,0); return x; }
export function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
export function startOfWeek(d)  { const x = new Date(d); const off = (x.getDay()+6)%7; x.setDate(x.getDate()-off); x.setHours(0,0,0,0); return x; }
export function addDays(d, n)   { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
export function pad(n) { return String(n).padStart(2,'0'); }
export function dmy(d) { return `${pad(d.getDate())} ${MES_LARGO[d.getMonth()].slice(0,3).toLowerCase()}`; }

export function PlusIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
}
export function EditIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
}
export function TrashIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}
export function ChevL() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>; }
export function ChevR() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>; }
