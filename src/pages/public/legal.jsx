/* Componentes compartidos de las páginas legales (Privacidad y Términos). */
export function LegalLayout({ titulo, actualizada, children }) {
  return (
    <section className="px-5 sm:px-8 py-14 max-w-3xl mx-auto">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-primary-light font-semibold mb-3">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-text-1">{titulo}</h1>
        <p className="text-sm text-text-3 mt-2">Última actualización: {actualizada}</p>
      </header>
      <div className="space-y-8">{children}</div>
    </section>
  );
}

export function Seccion({ n, titulo, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold font-display text-text-1 mb-3">{n}. {titulo}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-text-2">{children}</div>
    </section>
  );
}

export function Lista({ items }) {
  return (
    <ul className="space-y-1.5 pl-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5"><span className="text-primary-light mt-0.5 flex-shrink-0">·</span><span>{it}</span></li>
      ))}
    </ul>
  );
}
