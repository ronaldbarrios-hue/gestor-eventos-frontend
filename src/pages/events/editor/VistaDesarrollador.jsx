import { useMemo, useState } from 'react';
import { BLOCKS, BLOCK_TYPES_SISTEMA, BLOCK_TYPES_CUSTOM } from './blocks.jsx';

/* La página vista como datos, y sacada de aquí en el trozo que haga falta.
 *
 * ── De dónde sale ─────────────────────────────────────────────────────────
 *
 * `PageBuilder.jsx` era un editor entero —470 líneas: páginas, bloques,
 * plantillas— **sin un solo consumidor**. Un segundo editor de lo mismo que ya
 * hace `ExperienceBuilder`, construido y nunca enchufado. Resucitarlo habría
 * dejado dos editores de la misma página, que es exactamente la duplicación que
 * este proyecto lleva meses deshaciendo.
 *
 * Así que se rescata **lo único que tenía y no existe en el otro**: ver y
 * escribir la página como JSON. El resto se borra.
 *
 * ── Por qué esto no es una consola de HTML ───────────────────────────────
 *
 * Lo que se edita aquí es el MISMO contrato que valida el servidor
 * (`lib/bloquesLanding.js`): una lista de bloques `{ type, data }` con campos
 * declarados. No hay HTML libre, y no es una limitación pendiente de arreglar:
 * un `<script>` en la landing corre con el origen del evento y lo ve todo el
 * público. Un esquema en JSON, además, es lo que permite que un asistente
 * escriba la página por MCP y que el servidor pueda decir que no.
 *
 * ── El alcance, que es lo que se pidió ───────────────────────────────────
 *
 * Se puede mirar y copiar **la página entera o un solo bloque**. No es lo
 * mismo llevarse el sitio a otra parte que llevarse el formulario de registro:
 * lo primero se hace una vez y lo segundo se pega en la web que ya se tiene.
 */

function uid(p = 'b') { return `${p}_${Math.random().toString(36).slice(2, 10)}`; }

/* Los dos alcances que no son bloques. Van con prefijo `__` para que no
   puedan chocar nunca con el id de un bloque, que se genera con otra forma. */
const ALCANCE_MARCA  = '__marca__';
const ALCANCE_NAVBAR = '__navbar__';

export default function VistaDesarrollador({
  pages, pageId, onAplicar, onExportar,
  branding, navbar, onAplicarMarca, onAplicarNavbar,
}) {
  const pagina = pages.find(p => p.id === pageId) || pages[0] || { blocks: [] };
  const bloques = pagina.blocks || [];

  /* '' = la página entera · `__marca__` y `__navbar__` = los ajustes del sitio ·
     cualquier otra cosa = el id de un bloque.

     La marca y el navbar están aquí porque «personalización total desde
     código» quiere decir eso: todo lo que se puede tocar mirándolo, se tiene
     que poder tocar escribiéndolo. Si no, el modo código es media herramienta
     y hay que salir a la interfaz para lo que falta. */
  const [alcance, setAlcance] = useState('');
  const bloque = bloques.find(b => b.id === alcance) || null;
  const esMarca  = alcance === ALCANCE_MARCA;
  const esNavbar = alcance === ALCANCE_NAVBAR;

  const datos = useMemo(() => {
    if (esMarca)  return branding || {};
    if (esNavbar) return navbar || {};
    return bloque ? bloque : { ...pagina, blocks: bloques };
  }, [esMarca, esNavbar, branding, navbar, bloque, pagina, bloques]);

  const [texto, setTexto] = useState(() => JSON.stringify(datos, null, 2));
  const [tocado, setTocado] = useState(false);
  const [fallo, setFallo] = useState('');
  const [copiado, setCopiado] = useState(false);

  /* Al cambiar de alcance se reescribe el cuadro, salvo que haya cambios sin
     aplicar: perder lo que alguien acaba de escribir por tocar un desplegable
     es de las cosas que no se perdonan. */
  const cambiarAlcance = (v) => {
    if (tocado && !window.confirm('Tienes cambios sin aplicar en el cuadro. ¿Los descartas?')) return;
    setAlcance(v);
    const siguiente = v === ALCANCE_MARCA  ? (branding || {})
      : v === ALCANCE_NAVBAR ? (navbar || {})
      : (bloques.find(x => x.id === v) || { ...pagina, blocks: bloques });
    setTexto(JSON.stringify(siguiente, null, 2));
    setTocado(false);
    setFallo('');
  };

  const aplicar = () => {
    let leido;
    try { leido = JSON.parse(texto); }
    catch (e) { setFallo(`No es JSON válido: ${e.message}`); return; }

    /* La marca y el navbar son objetos sueltos: se validan aquí lo justo
       —que sean un objeto— y el resto lo comprueba el servidor al guardar,
       igual que con los bloques. Inventar aquí una segunda validación sería
       tener dos opiniones sobre el mismo contrato. */
    if (esMarca || esNavbar) {
      if (!leido || typeof leido !== 'object' || Array.isArray(leido)) {
        setFallo(`${esMarca ? 'La marca' : 'El navbar'} tiene que ser un objeto.`); return;
      }
      (esMarca ? onAplicarMarca : onAplicarNavbar)?.(leido);
      setFallo('');
      setTocado(false);
      return;
    }

    if (bloque) {
      if (!leido || typeof leido !== 'object' || Array.isArray(leido)) {
        setFallo('Un bloque tiene que ser un objeto.'); return;
      }
      if (!leido.type) { setFallo('Al bloque le falta el `type`.'); return; }
      if (!BLOCKS[leido.type]) { setFallo(`«${leido.type}» no es un tipo de bloque conocido.`); return; }
      /* El id se conserva aunque venga otro: un embed ya pegado en otra web
         apunta a este bloque por su id, y cambiarlo lo deja en blanco sin que
         nadie se entere hasta que alguien visita esa otra web. */
      onAplicar(pagina.id, bs => bs.map(b => (b.id === bloque.id ? { ...leido, id: bloque.id } : b)));
    } else {
      const lista = Array.isArray(leido?.blocks) ? leido.blocks : null;
      if (!lista) { setFallo('La página tiene que traer una lista `blocks`.'); return; }
      const malo = lista.find(b => !b?.type || !BLOCKS[b.type]);
      if (malo) { setFallo(`«${malo?.type || '(sin type)'}» no es un tipo de bloque conocido.`); return; }
      onAplicar(pagina.id, () => lista.map(b => ({ ...b, id: b.id || uid() })));
    }
    setFallo('');
    setTocado(false);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { setFallo('El navegador no dejó copiar. Selecciona el texto a mano.'); }
  };

  const descargar = () => {
    const nombre = esMarca ? 'marca.json'
      : esNavbar ? 'navbar.json'
      : bloque ? `${bloque.type}.json`
      : `${(pagina.nombre || 'pagina')}.json`;
    const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = nombre.replace(/\s+/g, '-').toLowerCase();
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-primary/40 bg-surface/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-1">La página como datos</p>
          <p className="text-xs text-text-3 mt-0.5 leading-relaxed max-w-2xl">
            Cada bloque es <code className="text-text-2">{'{ type, data }'}</code>. Al aplicar se ve en el
            editor; para publicarlo, Guardar. El servidor valida los tipos y los campos con el mismo
            contrato: si algo no encaja, lo dice y no guarda nada.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {/* Qué trozo se mira: la página entera o un bloque suelto. */}
          <select value={alcance} onChange={e => cambiarAlcance(e.target.value)}
            className="input !h-9 text-sm max-w-[240px]">
            <option value="">Toda la página · {bloques.length} bloque{bloques.length !== 1 ? 's' : ''}</option>
            {/* Los ajustes del sitio, agrupados aparte: no son bloques de esta
                página, son de todo el sitio. Mezclarlos en la misma lista sin
                separar haría pensar que se borran al borrar la página. */}
            <optgroup label="Ajustes del sitio">
              <option value={ALCANCE_MARCA}>Marca · colores, tipografía, footer</option>
              <option value={ALCANCE_NAVBAR}>Navbar · botones y enlaces</option>
            </optgroup>
            <optgroup label="Bloques de esta página">
              {bloques.map(b => (
                <option key={b.id} value={b.id}>{BLOCKS[b.type]?.label || b.type}</option>
              ))}
            </optgroup>
          </select>
          <button onClick={copiar} className="btn-secondary btn-sm">{copiado ? 'Copiado' : 'Copiar'}</button>
          <button onClick={descargar} className="btn-secondary btn-sm">Descargar</button>
          {bloque && onExportar && (
            /* Y el otro tipo de exportación, que ya existía y vivía escondida
               en el menú de cada sección: llevarse el bloque FUNCIONANDO a otra
               web, no sus datos. Son dos cosas distintas y conviene que se vean
               juntas: una es para mover, la otra para incrustar. */
            <button onClick={() => onExportar(bloque.id)} className="btn-secondary btn-sm">
              Incrustar en otra web
            </button>
          )}
          <button onClick={aplicar} className="btn-primary btn-sm">Aplicar</button>
        </div>
      </div>

      {fallo && (
        <p className="text-xs text-danger-light rounded-xl bg-danger/10 border border-danger/20 px-3 py-2">{fallo}</p>
      )}

      <textarea
        value={texto}
        onChange={e => { setTexto(e.target.value); setTocado(true); setFallo(''); }}
        spellCheck={false} rows={22}
        className="input w-full font-mono text-[11px] leading-relaxed resize-y" />

      <details className="text-[11px] text-text-3">
        <summary className="cursor-pointer hover:text-text-2">Tipos de bloque que el servidor acepta</summary>
        <p className="mt-1.5 leading-relaxed">
          {BLOCK_TYPES_SISTEMA.concat(BLOCK_TYPES_CUSTOM).join(', ')}.
        </p>
        <p className="mt-1.5 leading-relaxed">
          No hay HTML libre, y no es una limitación pendiente: un <code>&lt;script&gt;</code> aquí correría
          con el origen del evento y lo ve todo el público. El contrato en JSON es además lo que permite
          que un asistente escriba la página por MCP y que el servidor pueda decirle que no.
        </p>
      </details>
    </div>
  );
}
