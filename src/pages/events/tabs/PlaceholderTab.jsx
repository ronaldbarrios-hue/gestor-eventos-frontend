/* Placeholder simple para tabs que aún no están implementadas.
   Mantiene la estética minimalista: icon outline + título + descripción + chip "Próximamente". */

const ICONS = {
  users   : UsersIcon,
  ticket  : TicketIcon,
  calendar: CalendarIcon,
  wallet  : WalletIcon,
  chat    : ChatIcon,
  chart   : ChartIcon,
  default : SparkleIcon,
};

export default function PlaceholderTab({ title, desc, icon = 'default' }) {
  const Icon = ICONS[icon] || ICONS.default;
  return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center max-w-xl mx-auto animate-[fadeUp_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface border border-border mb-5">
        <Icon className="w-6 h-6 text-text-2" />
      </div>
      <span className="inline-block text-[10px] uppercase tracking-widest text-text-3 font-semibold border border-border rounded-full px-2.5 py-1 mb-4">
        Próximamente
      </span>
      <h2 className="text-xl font-bold font-display text-text-1 tracking-tight mb-2">{title}</h2>
      <p className="text-sm text-text-2 leading-relaxed max-w-md mx-auto">{desc}</p>
    </div>
  );
}

function UsersIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3a4 4 0 11-8 0 4 4 0 018 0zm5-1a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function TicketIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;
}
function CalendarIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
function WalletIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm14 5a1 1 0 100-2 1 1 0 000 2z" /></svg>;
}
function ChatIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
}
function ChartIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6m4 6V5m4 14v-10" /></svg>;
}
function SparkleIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L23 12l-6.857 2.143L14 21l-2.143-6.857L5 12l6.857-2.143L14 3z" /></svg>;
}
