export default function AsistenciaContador({ ingresados, total, compact = false }) {
  const cargando = ingresados == null;
  const pct = total > 0 && !cargando ? Math.min(100, Math.round((ingresados / total) * 100)) : null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-border bg-surface/60">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
        {cargando ? (
          <div className="h-4 w-20 bg-surface-2 rounded animate-pulse" />
        ) : (
          <p className="text-sm font-semibold text-text-1 tabular-nums">
            {ingresados}{total ? <span className="text-text-3 font-normal"> / {total}</span> : null}
            <span className="text-text-3 font-normal ml-1.5 text-xs">ingresaron</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-surface/40 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
        <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold">Asistencia en vivo</p>
      </div>

      {cargando ? (
        <div className="h-10 w-32 bg-surface-2 rounded animate-pulse" />
      ) : (
        <>
          <div className="flex items-end justify-between mb-2">
            <p className="text-4xl font-bold font-display tabular-nums text-text-1 leading-none">
              {ingresados}
              {total ? <span className="text-text-3 text-2xl"> / {total}</span> : null}
            </p>
            {pct != null && <p className="text-sm text-text-2 tabular-nums">{pct}%</p>}
          </div>
          <p className="text-xs text-text-3">personas ya ingresaron</p>
          {pct != null && (
            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
