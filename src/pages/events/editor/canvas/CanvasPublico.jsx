import { ELEMENTOS, ElementoRender, ANCHO_DISENO } from './elementos.jsx';

/* Render público del lienzo libre: escala proporcionalmente al ancho
   del viewport manteniendo las posiciones del diseño. */
export default function CanvasPublico({ canvas, evento, boletasRender }) {
  const elementos = canvas?.elementos || [];
  const alto = canvas?.alto || 900;
  if (elementos.length === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${ANCHO_DISENO} / ${alto}`, background: canvas?.fondo || 'transparent', borderRadius: 24 }}
    >
      {[...elementos].sort((a, b) => (a.z || 1) - (b.z || 1)).map(el => (
        <div
          key={el.id}
          className="absolute"
          style={{
            left: `${el.x / ANCHO_DISENO * 100}%`,
            top: `${el.y / alto * 100}%`,
            width: `${el.w / ANCHO_DISENO * 100}%`,
            height: `${el.h / alto * 100}%`,
          }}
        >
          <ElementoRender
            el={el}
            evento={evento}
            publico
            animar
            onReservar={el.type === 'boletas' ? boletasRender : undefined}
          />
        </div>
      ))}
    </div>
  );
}
export { ELEMENTOS };
