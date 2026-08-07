/* Cargador de marca — el nudo de GESTEK con una luz recorriéndolo.
   Reemplaza los spinners genéricos: el usuario ve la marca decenas de
   veces al día, así que es el sitio donde más rinde. */

export default function GLoader({ size = 'md', message, fullscreen = false }) {
  const px = size === 'xl' ? 88 : size === 'lg' ? 64 : size === 'sm' ? 32 : 48;

  const inner = (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: px, height: px }}>
        {/* halo cálido detrás */}
        <div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(224,177,43,.55), transparent 70%)',
            animation: 'gkHalo 2.4s ease-in-out infinite',
          }}
        />
        <div className="gk-nudo relative w-full h-full" role="img" aria-label="Cargando" />
      </div>
      {message && (
        <p className="text-sm text-text-2 font-medium animate-[pulseSoft_2s_ease-in-out_infinite]">
          {message}
        </p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 backdrop-blur-sm">
        {inner}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-12">{inner}</div>;
}
