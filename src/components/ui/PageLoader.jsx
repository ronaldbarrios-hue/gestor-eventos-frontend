export default function PageLoader({ show, message = 'Cargando...' }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease_both]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-border" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          <div className="absolute inset-2 rounded-full bg-primary/20 animate-[pulseSoft_2s_ease-in-out_infinite]" />
        </div>
        <p className="text-sm text-text-2 font-medium">{message}</p>
      </div>
    </div>
  );
}

export function InlineLoader({ message }) {
  return (
    <div className="flex items-center gap-2 text-text-2 text-sm">
      <span className="inline-block w-4 h-4 rounded-full border-2 border-border border-t-primary animate-spin" />
      {message && <span>{message}</span>}
    </div>
  );
}
