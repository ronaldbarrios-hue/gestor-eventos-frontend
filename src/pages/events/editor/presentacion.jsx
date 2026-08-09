/* Presentación compartida de las secciones de la página del evento.

   El problema que resuelve: 7 de los 25 bloques —título, descripción,
   información, dirección, links, galería y boletas— no exponían ni un
   control. Solo pintaban datos del evento. Y son justo la columna
   vertebral: todo lo que un asistente entra a leer. Por eso la página se
   sentía pobre aunque el editor tuviera lienzo libre y veintiséis bloques.

   Estos ajustes viven en `block.data`, así que los lee igual el editor, la
   página pública y el iFrame: los tres pintan con el mismo componente.

   Se queda deliberadamente corto. Un panel con treinta perillas no hace
   mejores páginas, hace páginas indecisas: cuatro decisiones que siempre
   importan (fondo, aire, alineación y ancho) y luego lo propio de cada
   bloque. */

const FONDOS = {
  ninguno:  '',
  suave:    'bg-surface/40',
  marcado:  'bg-surface-2',
  contorno: 'border border-border bg-transparent',
};
const ESPACIADOS = {
  compacto: 'py-4',
  normal:   'py-8',
  amplio:   'py-14',
};
const ANCHOS = {
  estrecho: 'max-w-2xl',
  normal:   'max-w-4xl',
  ancho:    'max-w-6xl',
  completo: 'max-w-none',
};

export const PRESENTACION_POR_DEFECTO = {
  fondo: 'ninguno',
  espaciado: 'normal',
  alineacion: 'izquierda',
  ancho: 'normal',
  titulo: '',
};

/* Envuelve el contenido de una sección con su presentación. Si el bloque no
   tiene nada configurado, el resultado es el de siempre. */
export function Seccion({ data = {}, children, className = '' }) {
  const p = { ...PRESENTACION_POR_DEFECTO, ...data };
  const centrado = p.alineacion === 'centro';
  const conCaja = p.fondo !== 'ninguno';

  return (
    <div className={`${ESPACIADOS[p.espaciado] || ESPACIADOS.normal} ${className}`}>
      <div
        className={`mx-auto ${ANCHOS[p.ancho] || ANCHOS.normal} ${centrado ? 'text-center' : ''}
                    ${conCaja ? `${FONDOS[p.fondo]} rounded-3xl px-6 sm:px-8 py-7` : ''}`}
      >
        {p.titulo && (
          <p className={`text-xs font-semibold uppercase tracking-[0.22em] text-primary mb-4 ${centrado ? '' : ''}`}>
            {p.titulo}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/* ─────────── Controles ─────────── */

export function Grupo({ label, children }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-text-3 font-semibold mb-1.5">{label}</p>
      {children}
    </div>
  );
}

export function Opciones({ valor, onChange, opciones, columnas = 0 }) {
  const cols = columnas || opciones.length;
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {opciones.map(([v, etiqueta]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={valor === v}
          className={`px-2.5 py-2 rounded-xl text-[12px] font-medium border transition-colors ${
            valor === v
              ? 'border-accent bg-accent/12 text-text-1'
              : 'border-border text-text-3 hover:text-text-1 hover:bg-surface-2'
          }`}
        >
          {etiqueta}
        </button>
      ))}
    </div>
  );
}

export function Interruptor({ label, valor, onChange, nota }) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer select-none">
      <span className="min-w-0">
        <span className="block text-[13px] text-text-1">{label}</span>
        {nota && <span className="block text-[11px] text-text-3 mt-0.5 leading-snug">{nota}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={!!valor}
        onClick={() => onChange(!valor)}
        className={`relative w-9 h-5 rounded-full flex-shrink-0 mt-0.5 transition-colors ${valor ? 'bg-accent' : 'bg-surface-3'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${valor ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

/* Los cuatro ajustes que aplican a cualquier sección. */
export function ControlesPresentacion({ data = {}, onChange }) {
  const p = { ...PRESENTACION_POR_DEFECTO, ...data };
  const set = (patch) => onChange({ ...data, ...patch });

  return (
    <div className="space-y-3.5">
      <Grupo label="Título de la sección">
        <input
          value={p.titulo}
          onChange={(e) => set({ titulo: e.target.value })}
          placeholder="Opcional. Ej: Sobre el evento"
          className="input rounded-xl py-2 text-sm"
        />
      </Grupo>

      <Grupo label="Fondo">
        <Opciones
          valor={p.fondo} onChange={(v) => set({ fondo: v })} columnas={2}
          opciones={[['ninguno', 'Sin fondo'], ['suave', 'Suave'], ['marcado', 'Marcado'], ['contorno', 'Solo borde']]}
        />
      </Grupo>

      <Grupo label="Aire alrededor">
        <Opciones
          valor={p.espaciado} onChange={(v) => set({ espaciado: v })}
          opciones={[['compacto', 'Poco'], ['normal', 'Normal'], ['amplio', 'Mucho']]}
        />
      </Grupo>

      <Grupo label="Alineación">
        <Opciones
          valor={p.alineacion} onChange={(v) => set({ alineacion: v })}
          opciones={[['izquierda', 'Izquierda'], ['centro', 'Centro']]}
        />
      </Grupo>

      <Grupo label="Ancho">
        <Opciones
          valor={p.ancho} onChange={(v) => set({ ancho: v })} columnas={2}
          opciones={[['estrecho', 'Estrecho'], ['normal', 'Normal'], ['ancho', 'Ancho'], ['completo', 'Completo']]}
        />
      </Grupo>
    </div>
  );
}
