import { useEffect, useState } from 'react';
import Icono from '../../../components/ui/Iconos.jsx';
import { torneosApi } from '../../../api/torneos.js';
import { aplanar, ramaCompleta, rutaDe } from '../../../lib/torneoCategorias.js';
import CategoriasTorneo from './CategoriasTorneo.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { confirmDialog } from '../../../components/ui/Confirm.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import CrearTorneo, { HuecoEnCalendario } from './torneo/TorneoCrear.jsx';
import EquiposView from './torneo/TorneoEquipos.jsx';
import BracketView from './torneo/TorneoBracket.jsx';
import LigaView from './torneo/TorneoLiga.jsx';
import GruposView from './torneo/TorneoGrupos.jsx';

/* Tab Torneo — VARIOS torneos por evento (Smash, Tekken, boxeo, fútbol…),
   cada uno con su disciplina. Disponible para cualquier evento (ya no solo
   Deportes). Formatos: eliminación directa (bracket), liga (tabla) o grupos +
   eliminación. Cada partido se puede PROGRAMAR (fecha/hora/cancha) aparte de
   registrar su resultado; al programar se avisa al contacto de cada equipo.

   Aquí queda el armazón: la lista de torneos del evento, el selector y el
   reparto hacia la vista que toque. Cada formato vive en `torneo/`, porque el
   archivo pasaba de 1.300 líneas y cambiar una regla de la liga obligaba a
   desplazarse por el bracket entero para llegar. */

export default function TorneoTab({ evento, soyOwner }) {
  const [torneos, setTorneos] = useState(undefined); // undefined = cargando
  const [selId, setSelId] = useState(null);
  const [detalle, setDetalle] = useState(null);      // { torneo, equipos, partidos }
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [creando, setCreando] = useState(false);
  /* #48 · El árbol y por qué rama se está mirando. `null` = todas. */
  const [categorias, setCategorias] = useState([]);
  const [ramaSel, setRamaSel] = useState(null);
  const [editorCats, setEditorCats] = useState(false);
  const { error: toastErr } = useToast();

  const cargarCategorias = async () => {
    try {
      const { categorias: cats } = await torneosApi.categorias(evento.id);
      setCategorias(cats || []);
    } catch {
      /* Sin la 0062 aplicada esto falla y no pasa nada: sin árbol, los
         torneos se listan como siempre. */
      setCategorias([]);
    }
  };

  /* Refresca la lista y deja seleccionado `preferId` (o el actual, o el 1º). */
  const refrescar = async (preferId) => {
    try {
      const { torneos: lista } = await torneosApi.list(evento.id);
      const arr = lista || [];
      setTorneos(arr);
      const target = [preferId, selId].find(id => id && arr.some(t => t.id === id)) || arr[0]?.id || null;
      setSelId(target);
      if (target) await cargarDetalle(target);
      else setDetalle(null);
    } catch (e) { toastErr(e.response?.data?.error || e.message); setTorneos([]); }
  };

  const cargarDetalle = async (torneoId) => {
    setCargandoDetalle(true);
    try {
      const d = await torneosApi.getOne(evento.id, torneoId);
      setDetalle({ torneo: d.torneo, equipos: d.equipos || [], partidos: d.partidos || [] });
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
    finally { setCargandoDetalle(false); }
  };

  useEffect(() => { refrescar(); cargarCategorias(); /* eslint-disable-next-line */ }, [evento.id]);

  const seleccionar = (id) => { setCreando(false); setSelId(id); cargarDetalle(id); };

  if (torneos === undefined) return <GLoader message="Cargando torneos..." />;

  /* Sin torneos: owner ve el creador directo; visitante, un vacío. */
  if (torneos.length === 0 && !creando) {
    return soyOwner
      ? <CrearTorneo eventoId={evento.id} categorias={categorias} onCreado={(t) => refrescar(t?.id)} onCancelar={null} />
      : (
        <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
          <p className="text-sm text-text-3">El organizador todavía no configuró torneos en este evento.</p>
        </div>
      );
  }

  /* Al elegir una rama se ven también los torneos de sus sub-ramas: pulsar
     "deportes" y no ver los de "deportes › contacto" convertiría el árbol en
     un montón de etiquetas sueltas. */
  const dentroDeRama = ramaCompleta(categorias, ramaSel);
  const visibles = ramaSel
    ? torneos.filter(t => t.categoria_id && dentroDeRama.has(String(t.categoria_id)))
    : torneos;
  const sinClasificar = torneos.filter(t => !t.categoria_id).length;

  return (
    <div className="space-y-5">
      {/* #48 · Navegación por categorías. Sólo aparece si hay árbol: con dos
          torneos sueltos, una fila de filtros vacía es ruido. */}
      {(categorias.length > 0 || soyOwner) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {categorias.length > 0 && (
            <>
              <button onClick={() => setRamaSel(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                  ${ramaSel === null ? 'border-primary bg-primary/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
                Todos ({torneos.length})
              </button>
              {aplanar(categorias).map(c => {
                const cuantos = torneos.filter(t => t.categoria_id && ramaCompleta(categorias, c.id).has(String(t.categoria_id))).length;
                return (
                  <button key={c.id} onClick={() => setRamaSel(ramaSel === c.id ? null : c.id)}
                    /* La sangría dice el nivel sin necesidad de dibujar el
                       árbol otra vez en una fila de botones. */
                    style={{ marginLeft: c.profundidad ? c.profundidad * 6 : 0 }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                      ${ramaSel === c.id ? 'border-primary bg-primary/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}
                      ${cuantos === 0 ? 'opacity-50' : ''}`}>
                    {c.profundidad > 0 && <span className="opacity-50 mr-1">›</span>}
                    {c.nombre}{cuantos > 0 && <span className="ml-1 opacity-70">{cuantos}</span>}
                  </button>
                );
              })}
              {sinClasificar > 0 && (
                <span className="text-[11px] text-text-3 ml-1">
                  {sinClasificar} sin clasificar
                </span>
              )}
            </>
          )}
          {soyOwner && (
            <button onClick={() => setEditorCats(true)}
              className="px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-border text-text-3 hover:text-text-1 hover:border-primary/40 transition-colors">
              {categorias.length > 0 ? 'Editar categorías' : '+ Organizar por categorías'}
            </button>
          )}
        </div>
      )}

      {/* Selector de torneos + crear */}
      {(torneos.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          {visibles.length === 0 && ramaSel && (
            <p className="text-sm text-text-3">No hay torneos en esta categoría todavía.</p>
          )}
          {visibles.map(t => {
            const ruta = t.categoria_id ? rutaDe(categorias, t.categoria_id) : [];
            return (
              <button key={t.id} onClick={() => seleccionar(t.id)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors text-left
                  ${!creando && selId === t.id ? 'border-primary/50 bg-primary/10 text-text-1' : 'border-border text-text-3 hover:text-text-1'}`}>
                <span className="flex items-center gap-2">
                  <Icono nombre="trofeo" className="w-3.5 h-3.5" />{t.nombre}
                  {t.disciplina && <span className="text-[10px] uppercase tracking-wide bg-surface-3 text-text-2 px-1.5 py-0.5 rounded">{t.disciplina}</span>}
                </span>
                {ruta.length > 0 && (
                  <span className="block text-[10px] text-text-3 mt-0.5">{ruta.join(' › ')}</span>
                )}
              </button>
            );
          })}
          {soyOwner && (
            <button onClick={() => setCreando(true)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border border-dashed transition-colors
                ${creando ? 'border-primary/50 bg-primary/10 text-text-1' : 'border-border text-text-3 hover:text-text-1 hover:border-primary/40'}`}>
              + Nuevo torneo
            </button>
          )}
        </div>
      )}

      {editorCats && (
        <CategoriasTorneo
          evento={evento}
          categorias={categorias}
          onCambio={cargarCategorias}
          onClose={() => setEditorCats(false)}
        />
      )}

      {creando ? (
        <CrearTorneo eventoId={evento.id}
          categorias={categorias}
          categoriaSugerida={ramaSel}
          onCreado={(t) => { setCreando(false); refrescar(t?.id); }}
          onCancelar={torneos.length > 0 ? () => setCreando(false) : null} />
      ) : cargandoDetalle || !detalle ? (
        <GLoader message="Cargando torneo..." />
      ) : (
        <TorneoView
          evento={evento}
          torneo={detalle.torneo}
          equipos={detalle.equipos}
          partidos={detalle.partidos}
          soyOwner={soyOwner}
          onReload={() => refrescar(selId)}
        />
      )}
    </div>
  );
}


function TorneoView({ evento, torneo, equipos, partidos, soyOwner, onReload }) {
  const esGrupos = torneo.formato === 'grupos_eliminacion';
  const defaultSub = esGrupos
    ? (torneo.fase_actual === 'eliminacion' ? 'bracket' : (torneo.fase_actual === 'grupos' ? 'grupos' : 'equipos'))
    : (torneo.formato === 'eliminacion' ? 'bracket' : 'liga');
  const [sub, setSub] = useState('equipos');

  useEffect(() => { setSub(defaultSub); /* eslint-disable-next-line */ }, [torneo.id, torneo.fase_actual]);

  const nombreFormato = torneo.formato === 'eliminacion' ? 'Eliminación'
    : torneo.formato === 'liga' ? 'Liga' : 'Grupos + Eliminación';

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-display text-text-1 tracking-tight">{torneo.nombre}</h2>
            <span className="badge badge-blue text-[10px]">{nombreFormato}</span>
            {esGrupos && (
              <span className="badge badge-gray text-[10px]">
                {torneo.fase_actual === 'grupos' ? 'Fase de grupos' : torneo.fase_actual === 'eliminacion' ? 'Fase eliminatoria' : 'Sin iniciar'}
              </span>
            )}
          </div>
          <p className="text-sm text-text-2 mt-1">
            {torneo.estado === 'armando' ? 'Agregando equipos — todavía no inició' : 'Torneo en curso'}
          </p>
          <div className="mt-1.5">
            <HuecoEnCalendario evento={evento} torneo={torneo} soyOwner={soyOwner} />
          </div>
        </div>
        {soyOwner && torneo.estado === 'armando' && (
          <BorrarTorneoBtn evento={evento} torneo={torneo} onDone={onReload} />
        )}
      </div>

      <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1 w-fit flex-wrap">
        <button onClick={() => setSub('equipos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'equipos' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
          Equipos
        </button>
        {torneo.formato === 'liga' && (
          <button onClick={() => setSub('liga')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'liga' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            Tabla de posiciones
          </button>
        )}
        {torneo.formato === 'eliminacion' && (
          <button onClick={() => setSub('bracket')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'bracket' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            Bracket
          </button>
        )}
        {esGrupos && torneo.fase_actual !== 'unica' && (
          <button onClick={() => setSub('grupos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'grupos' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            Grupos
          </button>
        )}
        {esGrupos && torneo.fase_actual === 'eliminacion' && (
          <button onClick={() => setSub('bracket')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sub === 'bracket' ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2'}`}>
            Bracket
          </button>
        )}
      </div>

      {sub === 'equipos' && (
        <EquiposView evento={evento} torneo={torneo} equipos={equipos} soyOwner={soyOwner} onReload={onReload} />
      )}
      {sub === 'bracket' && (
        <BracketView evento={evento} torneo={torneo} partidos={partidos.filter(p => p.fase === 'eliminacion' || p.fase === 'unica')} equipos={equipos} soyOwner={soyOwner} onReload={onReload} />
      )}
      {sub === 'liga' && (
        <LigaView evento={evento} torneo={torneo} partidos={partidos} equipos={equipos} soyOwner={soyOwner} onReload={onReload} />
      )}
      {sub === 'grupos' && (
        <GruposView evento={evento} torneo={torneo} partidos={partidos.filter(p => p.fase === 'grupos')} equipos={equipos} soyOwner={soyOwner} onReload={onReload} />
      )}
    </div>
  );
}

function BorrarTorneoBtn({ evento, torneo, onDone }) {
  const { success, error: toastErr } = useToast();
  const borrar = async () => {
    if (!(await confirmDialog({ message: `¿Borrar el torneo "${torneo.nombre}" completo? Se pierden equipos y partidos.`, danger: true }))) return;
    try {
      await torneosApi.borrar(evento.id, torneo.id);
      success('Torneo borrado.');
      onDone();
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };
  return <button onClick={borrar} className="btn-ghost btn-sm text-danger/80 hover:text-danger">Borrar torneo</button>;
}

/* ─────────── Vista Equipos ─────────── */
