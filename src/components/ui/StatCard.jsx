export default function StatCard({ label, value, icon: Icon, trend, color = 'blue', suffix = '' }) {
  const colors = {
    blue  : { icon: 'bg-primary/15 text-primary',    border: 'border-primary/20'  },
    purple: { icon: 'bg-accent/15 text-accent-light', border: 'border-accent/20'  },
    green : { icon: 'bg-success/15 text-success',    border: 'border-success/20'  },
    yellow: { icon: 'bg-warning/15 text-warning',    border: 'border-warning/20'  },
    red   : { icon: 'bg-danger/15 text-danger',      border: 'border-danger/20'   },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={`stat-card border ${c.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-2 uppercase tracking-wide mb-2">{label}</p>
          <p className="text-3xl font-bold text-text-1 font-display tabular-nums">
            {value ?? '—'}{suffix && <span className="text-lg ml-1 text-text-2">{suffix}</span>}
          </p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.up ? 'text-success' : 'text-danger'}`}>
              <span>{trend.up ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
