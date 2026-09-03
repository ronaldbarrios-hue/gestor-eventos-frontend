import { useEffect, useMemo, useRef, useState } from 'react';
import { Flotante, usePosicionFlotante } from './Flotante.jsx';

/* GESTEK — Elegir de una lista larga escribiendo.

   Un desplegable con los 300 barrios de una ciudad obliga a recorrerlos todos
   para encontrar el propio; como casillas de selección múltiple es peor. Aquí
   se escriben tres letras y la lista se reduce.

   Lo que NO cambia: el valor sigue teniendo que ser una de las opciones. Esto
   es una forma de pintar una selección, no un campo de texto libre — si
   dejáramos escribir cualquier cosa, los datos llegarían con «Modelia»,
   «modelia» y «Modelía» como tres barrios distintos, que es exactamente el
   problema que la selección existe para evitar.

   Sobre acentos: se comparan las palabras sin tildes ni mayúsculas. En
   Colombia nadie escribe «Bogotá» con tilde en un buscador, y una lista que no
   responde a «bogota» se siente rota. Se descompone el texto (NFD) y se quitan
   las marcas diacríticas — así «ñ» se conserva como «n» y «Chocó» aparece
   escribiendo «choco». */

/* El rango va escapado (\u0300-\u036f) y no con los caracteres literales: son
   marcas combinantes invisibles en el editor, y cualquier copia o guardado con
   otra codificación las rompe sin que se note hasta que un acento deja de
   buscarse. */
const sinTildes = (s) => String(s ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

/* Las coincidencias por el principio van primero: quien escribe «san» busca
   «San Antonio» antes que «Villa de San Luis», aunque las dos valgan. */
export function filtrarOpciones(opciones, texto) {
  const q = sinTildes(texto);
  if (!q) return opciones;
  const empiezan = [];
  const contienen = [];
  for (const op of opciones) {
    const n = sinTildes(op);
    if (n.startsWith(q)) empiezan.push(op);
    else if (n.includes(q)) contienen.push(op);
  }
  return [...empiezan, ...contienen];
}

/* ── Una opción ──────────────────────────────────────────────────────── */

export default function SelectorBuscable({
  id, opciones = [], value = '', onChange, requerido, placeholder = 'Escribe para buscar…',
}) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [resaltada, setResaltada] = useState(0);
  const caja = useRef(null);
  const campo = useRef(null);
  const lista = useRef(null);

  /* M1 · La lista se pintaba `absolute` dentro del contenedor del modal, que
     recorta a sus hijos con `overflow`: en «Comuna» se veían cinco opciones de
     cuarenta y ocho y al resto no había forma de llegar. La colocación vive en
     [[Flotante]], compartida con el menú de descarga de la boleta, que nació
     con este mismo fallo el mismo día. */
  const pos = usePosicionFlotante(abierto, campo);

  const filtradas = useMemo(
    () => filtrarOpciones(opciones, abierto ? texto : ''),
    [opciones, texto, abierto],
  );

  /* Cerrar al pinchar fuera. Sin esto la lista se queda abierta encima del
     resto del formulario y tapa la pregunta siguiente. */
  useEffect(() => {
    if (!abierto) return;
    /* La lista ya no es hija de `caja` —vive en el portal—, así que pinchar una
       opción contaba como «fuera» y cerraba antes de que llegara el clic. */
    const fuera = (e) => {
      if (lista.current?.contains(e.target)) return;
      if (caja.current && !caja.current.contains(e.target)) cerrar();
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  });

  const cerrar = () => { setAbierto(false); setTexto(''); setResaltada(0); };

  const elegir = (op) => { onChange(op); cerrar(); };

  const teclado = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!abierto) { setAbierto(true); return; }
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      setResaltada(i => Math.min(Math.max(i + paso, 0), Math.max(filtradas.length - 1, 0)));
      return;
    }
    if (e.key === 'Enter') {
      /* Sin esto, Enter envía el formulario entero con la lista abierta. */
      if (abierto && filtradas[resaltada]) { e.preventDefault(); elegir(filtradas[resaltada]); }
      return;
    }
    if (e.key === 'Escape' && abierto) { e.preventDefault(); cerrar(); }
  };

  /* Con la lista cerrada se enseña lo ELEGIDO; al abrirla, lo que se escribe.
     Así el campo siempre dice qué quedó seleccionado en vez de una búsqueda a
     medias que la persona creería haber guardado. */
  const mostrado = abierto ? texto : (value || '');

  return (
    <div className="relative" ref={caja}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-autocomplete="list"
        autoComplete="off"
        value={mostrado}
        placeholder={value && !abierto ? value : placeholder}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); setResaltada(0); }}
        onFocus={() => setAbierto(true)}
        onKeyDown={teclado}
        ref={campo}
        className="input-form bg-surface-2 w-full"
      />

      {/* El campo real que valida el navegador. El de arriba no puede llevar
          `required` porque se vacía al abrir la lista, y el navegador se
          quejaría de un campo que la persona ya rellenó. */}
      {requerido && (
        <input
          tabIndex={-1} aria-hidden="true" required value={value || ''} onChange={() => {}}
          className="sr-only absolute opacity-0 pointer-events-none h-0"
        />
      )}

      {value && !abierto && (
        <button type="button" onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1 text-sm"
          aria-label="Quitar la selección">×</button>
      )}

      {abierto && (
        <Flotante pos={pos} as="ul" role="listbox" ref={lista}
          className="rounded-2xl border border-border-2 bg-surface shadow-2xl py-1">
          {filtradas.length === 0 ? (
            <li className="px-4 py-3 text-sm text-text-3">
              Nada coincide con «{texto}».
            </li>
          ) : filtradas.map((op, i) => (
            <li key={op} role="option" aria-selected={op === value}>
              <button type="button"
                onMouseEnter={() => setResaltada(i)}
                onClick={() => elegir(op)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                  ${i === resaltada ? 'bg-surface-2 text-text-1' : 'text-text-2'}
                  ${op === value ? 'font-semibold' : ''}`}>
                {op}
              </button>
            </li>
          ))}
        </Flotante>
      )}

      {/* Cuántas hay: sin esto, una lista filtrada a tres resultados parece la
          lista entera y nadie sabe que puede seguir buscando. */}
      {abierto && opciones.length > filtradas.length && (
        <p className="text-[11px] text-text-3 mt-1">
          {filtradas.length} de {opciones.length} opciones
        </p>
      )}
    </div>
  );
}

/* ── Varias opciones ─────────────────────────────────────────────────── */

/* Mismo problema con selección múltiple, y peor: 300 casillas. Aquí lo elegido
   se queda arriba como etiquetas —para poder quitarlo sin buscarlo otra vez— y
   debajo va el buscador con el resto. */
export function MultiBuscable({ id, opciones = [], value = [], onChange, placeholder = 'Escribe para buscar…' }) {
  const [texto, setTexto] = useState('');
  const marcadas = Array.isArray(value) ? value : [];

  const disponibles = useMemo(
    () => filtrarOpciones(opciones.filter(o => !marcadas.includes(o)), texto),
    [opciones, marcadas, texto],
  );

  /* Se guarda en el orden del catálogo, no en el de los clics: dos respuestas
     iguales tienen que verse iguales al exportarlas. */
  const alternar = (op) => {
    const siguiente = marcadas.includes(op)
      ? marcadas.filter(x => x !== op)
      : [...marcadas, op];
    onChange(opciones.filter(o => siguiente.includes(o)));
  };

  return (
    <div className="space-y-2">
      {marcadas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {opciones.filter(o => marcadas.includes(o)).map(op => (
            <button key={op} type="button" onClick={() => alternar(op)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                         bg-primary/15 border border-primary/30 text-text-1 hover:bg-primary/25">
              {op}<span className="text-text-3" aria-hidden="true">×</span>
              <span className="sr-only">Quitar</span>
            </button>
          ))}
        </div>
      )}

      <input
        id={id} type="text" autoComplete="off" value={texto}
        placeholder={placeholder}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
        className="input-form bg-surface-2 w-full"
      />

      <div className="max-h-56 overflow-y-auto rounded-2xl border border-border bg-surface-2/40 divide-y divide-border/50">
        {disponibles.length === 0 ? (
          <p className="px-4 py-3 text-sm text-text-3">
            {texto ? `Nada coincide con «${texto}».` : 'Ya las marcaste todas.'}
          </p>
        ) : disponibles.map(op => (
          <button key={op} type="button" onClick={() => alternar(op)}
            className="w-full text-left px-4 py-2.5 text-sm text-text-2 hover:bg-surface-2 hover:text-text-1">
            {op}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-text-3">
        {marcadas.length} marcada{marcadas.length === 1 ? '' : 's'} de {opciones.length}
      </p>
    </div>
  );
}
