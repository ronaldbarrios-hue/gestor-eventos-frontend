import { useState } from 'react';
import { createPortal } from 'react-dom';

/* Los ajustes del sitio, en un solo sitio.
 *
 * ── Qué había ─────────────────────────────────────────────────────────────
 *
 * Tres botones en la barra —«Publicación», «Navbar», «Marca»— que abrían tres
 * cajones distintos, cada uno con su propia cabecera, su propia aspa y su
 * propio ancho. Tres copias del mismo armazón para tres respuestas a la misma
 * pregunta: **cómo es este sitio**.
 *
 * Y eran tres de los seis controles de la barra superior. Con las tres de la
 * franja de abajo —añadir página, datos, lienzo— salían nueve cosas
 * compitiendo antes de tocar un solo bloque. Eso es lo que se sentía saturado.
 *
 * ── Qué hace ─────────────────────────────────────────────────────────────
 *
 * Un cajón con tres pestañas. Un botón en la barra en vez de tres, y el ancho
 * lo pide cada pestaña: la de marca necesita mil píxeles para su previa, la
 * del navbar no.
 *
 * ── Por qué pestañas y no un acordeón ────────────────────────────────────
 *
 * Porque las tres son largas. Un acordeón con tres secciones abiertas obliga a
 * desplazarse para saber si la de abajo existe, y cerradas obliga a abrirlas
 * una por una para buscar dónde estaba aquello. Con pestañas siempre se ve
 * cuántas hay y en cuál estás.
 */

const PESTANAS = [
  { id: 'marca',       label: 'Marca',       pista: 'Logo, colores, tipografía y footer.',       ancho: 'w-[1040px]' },
  { id: 'navbar',      label: 'Navbar',      pista: 'Posición, botones y enlaces de la barra.',  ancho: 'w-[560px]'  },
  { id: 'publicacion', label: 'Publicación', pista: 'Dónde vive la página y qué ve quien entra.', ancho: 'w-[720px]' },
];

export default function AjustesDelSitio({ abierta, onClose, marca, navbar, publicacion }) {
  /* `abierta` viene de fuera para poder entrar directo a una pestaña: el aviso
     de «tu página vive en otro dominio» lleva a Publicación, no al principio.
     Dentro se recuerda cuál se está mirando, para que cambiar de pestaña y
     volver no empiece de cero.
     
     Y las dos cosas hay que reconciliarlas: `useState` sólo lee su valor
     inicial la PRIMERA vez, así que sin esto el cajón se abriría siempre en la
     pestaña donde se quedó — y el enlace que pide «llévame a Publicación» no
     llevaría a ninguna parte. Es el patrón de React para ajustar estado cuando
     cambia una prop, y va durante el render a propósito: en un efecto se
     pintaría un fotograma con la pestaña equivocada. */
  const [activa, setActiva] = useState(abierta || 'marca');
  const [pedida, setPedida] = useState(abierta);
  if (abierta && abierta !== pedida) {
    setPedida(abierta);
    setActiva(abierta);
  }

  if (!abierta) return null;

  const p = PESTANAS.find(x => x.id === activa) || PESTANAS[0];
  const contenido = { marca, navbar, publicacion }[p.id];

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] bg-black/25" onClick={onClose} />
      {/* En PORTAL al body: dentro del árbol, los ancestros con transform
          rompían el `fixed` y el panel se fusionaba con la barra superior. */}
      <aside className={`fixed top-0 right-0 z-[9999] h-full ${p.ancho} max-w-[96vw]
                         bg-bg border-l border-border flex flex-col shadow-2xl`}>
        <header className="px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-text-1">Ajustes del sitio</h2>
            <button onClick={onClose} aria-label="Cerrar"
              className="w-9 h-9 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-1 mt-3 -mb-px">
            {PESTANAS.map(t => (
              <button key={t.id} onClick={() => setActiva(t.id)}
                className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                  activa === t.id ? 'text-text-1' : 'text-text-3 hover:text-text-2'}`}>
                {t.label}
                {activa === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-3 mt-2">{p.pista}</p>
        </header>

        <div className="flex-1 overflow-y-auto p-5">{contenido}</div>
      </aside>
    </>,
    document.body,
  );
}
