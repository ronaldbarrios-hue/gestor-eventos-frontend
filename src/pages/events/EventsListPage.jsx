import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n, tEstatico } from '../../context/I18nContext.jsx';
import AccionEnCurso from '../../components/ui/AccionEnCurso.jsx';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmDialog } from '../../components/ui/Confirm.jsx';
import { eventosApi } from '../../api/eventos.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEventosPrefs } from '../../hooks/useEventosPrefs.js';
import { EstadoBadge } from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

/* ──────────────────────────────────────────────────────────────────
   Eventos — Rework Fase 2
   "¿En qué evento quiero trabajar ahora?"
   Header con conteos · búsqueda en tiempo real · filtros
   Vistas: Grid / Lista / Calendario (preferencia persistida)
   Favoritos y recientes arriba · acciones rápidas por evento
   ────────────────────────────────────────────────────────────────── */

const FILTRO_ROL = [
  { value: '',            label: 'Organizando y colaborando' },
  { value: 'organizando', label: 'Organizando' },
  { value: 'colaborando', label: 'Colaborando' },
];
const FILTRO_ESTADOS = [
  { value: '',            label: 'Todos'         },
  { value: 'publicado',   label: 'Publicados'    },
  { value: 'borrador',    label: 'Borradores'    },
  { value: 'configuracion', label: 'Configuración' },
  { value: 'en_curso',    label: 'En curso'      },
  { value: 'finalizado',  label: 'Finalizados'   },
  { value: 'archivado',   label: 'Archivados'    },
];
const FILTRO_FECHAS = [
  { value: '',         label: 'Cualquier fecha' },
  { value: 'hoy',      label: 'Hoy'             },
  { value: 'semana',   label: 'Esta semana'     },
  { value: 'mes',      label: 'Este mes'        },
  { value: 'proximos', label: 'Próximos'        },
  { value: 'pasados',  label: 'Pasados'         },
];
const FILTRO_MODALIDAD = [
  { value: '',        label: 'Modalidad' },
  { value: 'fisico',  label: 'Presencial' },
  { value: 'virtual', label: 'Virtual'   },
  { value: 'hibrido', label: 'Híbrido'   },
];

function pasaFiltroFecha(e, filtro) {
  if (!filtro) return true;
  if (!e.fecha_inicio) return false;
  const f = new Date(e.fecha_inicio);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fin = new Date(hoy); fin.setHours(23, 59, 59);
  switch (filtro) {
    case 'hoy':      return f >= hoy && f <= fin;
    case 'semana': { const s = new Date(hoy); s.setDate(s.getDate() + 7);  return f >= hoy && f <= s; }
    case 'mes':    { const m = new Date(hoy); m.setMonth(m.getMonth() + 1); return f >= hoy && f <= m; }
    case 'proximos': return f >= hoy;
    case 'pasados':  return f < hoy;
    default: return true;
  }
}

export default function EventsListPage() {
  const { t } = useI18n();
  const { success, error: err } = useToast();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { vista, favoritos, recientes, setVista, toggleFavorito, registrarReciente } = useEventosPrefs();

  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState([]);
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [filtros, setFiltros] = useState({ rol: '', estado: '', fecha: '', modalidad: '', categoria: '' });
  const [accionando, setAccionando] = useState(null);
  /* Publicar y duplicar tardan y cambian algo visible para el público, así
     que merecen decir qué están haciendo en vez de dejar el botón girando
     en una esquina. El resto de acciones son instantáneas. */
  const [enCurso, setEnCurso] = useState(null);   // 'publicar' | 'duplicar' | null

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await eventosApi.list({ limit: 200 });
      setEventos(data.eventos || []);
    } catch (e) { err(e.message); }
    finally { setLoading(false); }
  }, [err]);

  useEffect(() => { cargar(); }, [cargar]);
  /* Sólo alimenta el filtro de la lista. Si no llega, no hay filtro por
     categoría y los eventos se ven todos, que es el estado por defecto. */
  useEffect(() => { eventosApi.categorias().then(d => setCategorias(d.categorias || [])).catch(() => {}); }, []);
  useEffect(() => {
    const h = () => cargar();
    window.addEventListener('gestek:refrescar-eventos', h);
    return () => window.removeEventListener('gestek:refrescar-eventos', h);
  }, [cargar]);

  /* Conteos del header (sobre TODO el universo, sin filtros) */
  const conteos = useMemo(() => ({
    total      : eventos.length,
    publicados : eventos.filter(e => e.estado === 'publicado').length,
    borradores : eventos.filter(e => ['borrador', 'configuracion'].includes(e.estado)).length,
    finalizados: eventos.filter(e => e.estado === 'finalizado').length,
  }), [eventos]);

  /* Búsqueda en tiempo real + filtros (client-side sobre la lista cargada) */
  const filtrados = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return eventos.filter(e => {
      if (filtros.rol) {
        const soyDueno = String(e.owner_id) === String(usuario?.id);
        if (filtros.rol === 'organizando' && !soyDueno) return false;
        if (filtros.rol === 'colaborando' && soyDueno) return false;
      }
      if (!filtros.estado && e.estado === 'archivado') return false; /* archivados solo bajo demanda */
      if (filtros.estado && e.estado !== filtros.estado) return false;
      if (filtros.modalidad && e.modalidad !== filtros.modalidad) return false;
      if (filtros.categoria && String(e.categoria_id) !== filtros.categoria && e.categoria?.slug !== filtros.categoria) return false;
      if (!pasaFiltroFecha(e, filtros.fecha)) return false;
      if (texto) {
        const blob = `${e.titulo} ${e.location_nombre || ''} ${e.location_direccion || ''} ${e.categoria?.nombre || ''} ${e.estado}`.toLowerCase();
        if (!blob.includes(texto)) return false;
      }
      return true;
    });
  }, [eventos, q, filtros, usuario?.id]);

  /* Orden: favoritos → recientes → fecha próxima */
  const ordenados = useMemo(() => {
    return [...filtrados].sort((a, b) => {
      const fa = favoritos.includes(a.id), fb = favoritos.includes(b.id);
      if (fa !== fb) return fa ? -1 : 1;
      const ra = recientes.indexOf(a.id), rb = recientes.indexOf(b.id);
      if ((ra !== -1) !== (rb !== -1)) return ra !== -1 ? -1 : 1;
      if (ra !== -1 && rb !== -1 && ra !== rb) return ra - rb;
      return new Date(b.fecha_inicio || 0) - new Date(a.fecha_inicio || 0);
    });
  }, [filtrados, favoritos, recientes]);

  const abrir = (e) => { registrarReciente(e.id); navigate(`/eventos/${e.id}`); };

  /* ── Acciones rápidas ── */
  const compartir = async (e) => {
    const url = `${window.location.origin}/explorar/${e.slug}`;
    try { await navigator.clipboard.writeText(url); success('Enlace público copiado.'); }
    catch { err('No se pudo copiar el enlace.'); }
  };
  const plantillaToggle = async (e) => {
    setAccionando(e.id);
    try {
      const esPlantilla = !!e.page_json?.plantilla;
      await eventosApi.update(e.id, { page_json: { plantilla: !esPlantilla } });
      success(esPlantilla ? 'Ya no es plantilla.' : 'Guardado como plantilla. Aparecerá al crear eventos.');
      cargar();
    } catch (x) { err(x.response?.data?.error || x.message); }
    finally { setAccionando(null); }
  };
  const duplicar = async (e) => {
    setAccionando(e.id); setEnCurso('duplicar');
    try { const r = await eventosApi.duplicar(e.id); success(`Evento duplicado: ${r.evento.titulo}`); cargar(); }
    catch (x) { err(x.response?.data?.error || x.message); }
    finally { setAccionando(null); setEnCurso(null); }
  };
  const publicarToggle = async (e) => {
    const despublicando = e.estado === 'publicado';
    setAccionando(e.id);
    /* Despublicar es instantáneo y no expone nada: no merece pantalla. */
    if (!despublicando) setEnCurso('publicar');
    try {
      if (despublicando) { await eventosApi.cambiarEstado(e.id, 'borrador'); success('Evento despublicado.'); }
      else {
        const r = await eventosApi.publicar(e.id);
        /* Lo mismo que en el editor: publicar sin forma de inscribirse no
           puede quedarse en un «Evento publicado» a secas. */
        const avisos = r?.avisos || [];
        if (avisos.length) err(`Publicado, pero: ${avisos.join(' · ')}`, 9000);
        else success('Evento publicado.');
      }
      cargar();
    } catch (x) { err(x.response?.data?.error || x.message); }
    finally { setAccionando(null); setEnCurso(null); }
  };
  const archivar = async (e) => {
    if (!await confirmDialog({ title: 'Archivar evento', message: `"${e.titulo}" dejará de aparecer por defecto, pero conserva toda su información y puede restaurarse.`, confirmLabel: 'Archivar' })) return;
    setAccionando(e.id);
    try { await eventosApi.archivar(e.id); success('Evento archivado.'); cargar(); }
    catch (x) { err(x.response?.data?.error || x.message); }
    finally { setAccionando(null); }
  };
  const restaurar = async (e) => {
    setAccionando(e.id);
    try { await eventosApi.cambiarEstado(e.id, 'borrador'); success('Evento restaurado a borrador.'); cargar(); }
    catch (x) { err(x.response?.data?.error || x.message); }
    finally { setAccionando(null); }
  };
  const eliminar = async (e) => {
    if (!await confirmDialog({ title: 'Eliminar evento', message: `¿Eliminar "${e.titulo}"? Podrás pedir su recuperación durante un tiempo limitado.`, confirmLabel: 'Eliminar', danger: true })) return;
    setAccionando(e.id);
    try { await eventosApi.delete(e.id); success('Evento eliminado.'); cargar(); }
    catch (x) { err(x.response?.data?.error || x.message); }
    finally { setAccionando(null); }
  };

  const acciones = { abrir, compartir, duplicar, publicarToggle, archivar, restaurar, eliminar, toggleFavorito, plantillaToggle };

  return (
    <div className="space-y-6 animate-[fadeUp_0.4s_ease_both]">
      {enCurso && <AccionEnCurso accion={enCurso} />}

      {/* ── Header con conteos ── */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-1 tracking-tight">{t('Eventos')}</h1>
          <p className="text-sm text-text-2 mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-1">
              {conteos.total === 1 ? t('{n} evento', { n: 1 }) : t('{n} eventos', { n: conteos.total })}
            </span>
            <Dot /> {t('{n} publicados',  { n: conteos.publicados })}
            <Dot /> {t('{n} borradores',  { n: conteos.borradores })}
            <Dot /> {t('{n} finalizados', { n: conteos.finalizados })}
          </p>
        </div>
        <Link to="/eventos/nuevo" className="btn-gradient">
          <PlusIcon className="w-4 h-4" /> {t('Crear evento')}
        </Link>
      </header>

      {/* ── Búsqueda + filtros + vista ── */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3 pointer-events-none" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('Buscar por nombre, ciudad, categoría, estado…')}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-border text-sm text-text-1
                       placeholder:text-text-3 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filtros.rol}       onChange={v => setFiltros(f => ({ ...f, rol: v }))}       opciones={FILTRO_ROL} />
          <Select value={filtros.estado}    onChange={v => setFiltros(f => ({ ...f, estado: v }))}    opciones={FILTRO_ESTADOS} />
          <Select value={filtros.fecha}     onChange={v => setFiltros(f => ({ ...f, fecha: v }))}     opciones={FILTRO_FECHAS} />
          <Select value={filtros.modalidad} onChange={v => setFiltros(f => ({ ...f, modalidad: v }))} opciones={FILTRO_MODALIDAD} />
          {categorias.length > 0 && (
            <Select value={filtros.categoria} onChange={v => setFiltros(f => ({ ...f, categoria: v }))}
              opciones={[{ value: '', label: t('Categoría') }, ...categorias.map(c => ({ value: String(c.id), label: c.nombre }))]} />
          )}
          <div className="flex rounded-xl border border-border bg-surface overflow-hidden">
            {[['grid', GridIcon], ['lista', ListIcon], ['calendario', CalIcon]].map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                aria-label={t('Vista {v}', { v })}
                className={`px-3 h-10 transition-colors ${vista === v ? 'bg-accent text-[#15171C]' : 'text-text-3 hover:text-text-1 hover:bg-surface-2'}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      {loading ? (
        <div className="flex justify-center py-24"><Spinner size="lg" /></div>
      ) : ordenados.length === 0 ? (
        <EmptyState
          titulo={q || filtros.estado || filtros.fecha ? t('Sin resultados') : t('Aún no tienes eventos')}
          descripcion={q || filtros.estado || filtros.fecha ? t('Prueba ajustando la búsqueda o los filtros.') : t('Crea tu primer evento y empieza a organizarlo todo desde aquí.')}
          accion={!q && !filtros.estado ? <Link to="/eventos/nuevo" className="btn-primary">{t('Crear evento')}</Link> : null}
        />
      ) : vista === 'lista' ? (
        <VistaLista eventos={ordenados} favoritos={favoritos} acciones={acciones} accionando={accionando} />
      ) : vista === 'calendario' ? (
        <VistaCalendario eventos={ordenados} onAbrir={abrir} />
      ) : (
        <VistaGrid eventos={ordenados} favoritos={favoritos} acciones={acciones} accionando={accionando} />
      )}
    </div>
  );
}

/* ════════ VISTA GRID ════════ */
function VistaGrid({ eventos, favoritos, acciones, accionando }) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {eventos.map(e => <TarjetaEvento key={e.id} e={e} fav={favoritos.includes(e.id)} acciones={acciones} ocupado={accionando === e.id} />)}
    </div>
  );
}

function TarjetaEvento({ e, fav, acciones, ocupado }) {
  const pct = e.aforo_total > 0 ? Math.min(100, Math.round((e.aforo_vendido || 0) / e.aforo_total * 100)) : null;
  const f = e.fecha_inicio ? new Date(e.fecha_inicio) : null;
  return (
    <div className="group relative rounded-3xl border border-border bg-surface/60 overflow-hidden hover:border-border-2 hover:shadow-card transition-all">
      <button onClick={() => acciones.abrir(e)} className="block w-full text-left">
        <div className="relative h-36 bg-gradient-dark overflow-hidden">
          {e.cover_url
            ? <img src={e.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <div className="w-full h-full bg-gradient-to-br from-accent/30 to-primary/20 flex items-center justify-center">
                <span className="text-4xl font-display font-bold text-white/30">{(e.titulo || '?')[0].toUpperCase()}</span>
              </div>}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <EstadoBadge estado={e.estado} />
            {e.page_json?.plantilla && <span className="badge badge-purple text-[10px]">Plantilla</span>}
          </div>
          {f && (
            <div className="absolute bottom-3 left-3 rounded-xl bg-bg/80 backdrop-blur px-2.5 py-1 text-center">
              <p className="text-[9px] uppercase text-text-3 leading-none">{f.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}</p>
              <p className="text-sm font-bold font-display text-text-1 leading-tight">{f.getDate()}</p>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-[15px] font-semibold text-text-1 truncate">{e.titulo}</h3>
          <p className="text-xs text-text-3 truncate mt-0.5">
            {e.location_nombre || (e.modalidad === 'virtual' ? 'Virtual' : 'Sin ubicación')}
            {' · '}{e.aforo_vendido || 0} asistentes{pct !== null ? ` · ${pct}% aforo` : ''}
          </p>
          {pct !== null && (
            <div className="h-1 rounded-full bg-surface-2 overflow-hidden mt-2.5">
              <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </button>

      {/* Favorito */}
      <button
        onClick={() => acciones.toggleFavorito(e.id)}
        aria-label="Favorito"
        className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur flex items-center justify-center transition-all
                    ${fav ? 'bg-warning/90 text-white' : 'bg-bg/60 text-white/70 opacity-0 group-hover:opacity-100 hover:text-warning'}`}
      >
        <StarIcon className="w-4 h-4" relleno={fav} />
      </button>

      {/* Acciones hover */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <MenuAcciones e={e} acciones={acciones} ocupado={ocupado} />
      </div>
    </div>
  );
}

/* ════════ VISTA LISTA ════════ */
function VistaLista({ eventos, favoritos, acciones, accionando }) {
  return (
    <div className="rounded-3xl border border-border bg-surface/60 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[760px]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-text-3 border-b border-border">
            <th className="px-5 py-3 font-semibold">Evento</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">Fecha</th>
            <th className="px-4 py-3 font-semibold">Asistentes</th>
            <th className="px-4 py-3 font-semibold">Aforo</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {eventos.map(e => {
            const pct = e.aforo_total > 0 ? Math.min(100, Math.round((e.aforo_vendido || 0) / e.aforo_total * 100)) : null;
            return (
              <tr key={e.id} className="hover:bg-surface-2/40 transition-colors group">
                <td className="px-5 py-3">
                  <div role="button" tabIndex={0} onClick={() => acciones.abrir(e)}
                       onKeyDown={(ev) => ev.key === 'Enter' && acciones.abrir(e)}
                       className="flex items-center gap-3 text-left min-w-0 cursor-pointer">
                    <button
                      onClick={(ev) => { ev.stopPropagation(); acciones.toggleFavorito(e.id); }}
                      className={`flex-shrink-0 transition-colors ${favoritos.includes(e.id) ? 'text-warning' : 'text-text-3/40 hover:text-warning'}`}
                      aria-label="Favorito"
                    >
                      <StarIcon className="w-4 h-4" relleno={favoritos.includes(e.id)} />
                    </button>
                    <span className="font-medium text-text-1 truncate">{e.titulo}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><EstadoBadge estado={e.estado} /></td>
                <td className="px-4 py-3 text-text-2 whitespace-nowrap">
                  {e.fecha_inicio ? new Date(e.fecha_inicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </td>
                <td className="px-4 py-3 text-text-2 tabular-nums">{e.aforo_vendido || 0}</td>
                <td className="px-4 py-3">
                  {pct !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-text-3 tabular-nums">{pct}%</span>
                    </div>
                  ) : <span className="text-xs text-text-3">Sin tope</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <MenuAcciones e={e} acciones={acciones} ocupado={accionando === e.id} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ════════ VISTA CALENDARIO ════════ */
function VistaCalendario({ eventos, onAbrir }) {
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const dias = useMemo(() => {
    const primero = new Date(mes);
    const offset = (primero.getDay() + 6) % 7; /* lunes = 0 */
    const inicio = new Date(primero); inicio.setDate(1 - offset);
    return [...Array(42)].map((_, i) => { const d = new Date(inicio); d.setDate(inicio.getDate() + i); return d; });
  }, [mes]);

  const porDia = useMemo(() => {
    const map = {};
    eventos.forEach(e => {
      if (!e.fecha_inicio) return;
      const k = new Date(e.fecha_inicio).toDateString();
      (map[k] = map[k] || []).push(e);
    });
    return map;
  }, [eventos]);

  const hoy = new Date().toDateString();

  return (
    <div className="rounded-3xl border border-border bg-surface/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-text-1 capitalize">
          {mes.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="btn-icon btn-ghost" aria-label="Mes anterior">‹</button>
          <button onClick={() => setMes(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="btn-ghost text-xs px-2.5 py-1.5">Hoy</button>
          <button onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="btn-icon btn-ghost" aria-label="Mes siguiente">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] uppercase tracking-wider text-text-3 border-b border-border">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d, i) => {
          const evs = porDia[d.toDateString()] || [];
          const esMes = d.getMonth() === mes.getMonth();
          const esHoy = d.toDateString() === hoy;
          return (
            <div key={i} className={`min-h-[86px] border-b border-r border-border p-1.5 ${esMes ? '' : 'opacity-40'} ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}`}>
              <p className={`text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full
                             ${esHoy ? 'bg-accent text-white font-bold' : 'text-text-3'}`}>{d.getDate()}</p>
              <div className="space-y-1">
                {evs.slice(0, 2).map(e => (
                  <button
                    key={e.id}
                    onClick={() => onAbrir(e)}
                    className="block w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded-md bg-accent/15 text-accent hover:bg-accent/25 truncate transition-colors"
                  >
                    {e.titulo}
                  </button>
                ))}
                {evs.length > 2 && <p className="text-[10px] text-text-3 px-1.5">+{evs.length - 2} más</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════ Menú de acciones rápidas ════════ */
function MenuAcciones({ e, acciones, ocupado }) {
  const [open, setOpen] = useState(false);
  const run = (fn) => { setOpen(false); fn(e); };
  const archivado = e.estado === 'archivado';

  return (
    <div className="relative">
      <button
        onClick={(ev) => { ev.stopPropagation(); setOpen(v => !v); }}
        aria-label="Acciones"
        className="w-8 h-8 rounded-full bg-bg/70 backdrop-blur text-text-1 flex items-center justify-center hover:bg-surface-2 transition-colors"
      >
        {ocupado ? <Spinner size="sm" /> : <DotsIcon className="w-4 h-4" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(ev) => { ev.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 bottom-10 z-20 w-52 card-glass rounded-xl overflow-hidden py-1.5">
            <Item onClick={() => run(acciones.abrir)}>Abrir evento</Item>
            <Item onClick={() => run(acciones.compartir)}>Compartir enlace público</Item>
            <Item onClick={() => run(acciones.duplicar)}>Duplicar</Item>
            <Item onClick={() => run(acciones.plantillaToggle)}>
              {e.page_json?.plantilla ? 'Quitar de plantillas' : 'Guardar como plantilla'}
            </Item>
            {!archivado && (
              <Item onClick={() => run(acciones.publicarToggle)}>
                {e.estado === 'publicado' ? 'Despublicar' : 'Publicar'}
              </Item>
            )}
            {archivado
              ? <Item onClick={() => run(acciones.restaurar)}>Restaurar</Item>
              : <Item onClick={() => run(acciones.archivar)}>Archivar</Item>}
            <div className="border-t border-border my-1" />
            <Item danger onClick={() => run(acciones.eliminar)}>Eliminar</Item>
          </div>
        </>
      )}
    </div>
  );
}

function Item({ children, onClick, danger }) {
  return (
    <button
      onClick={(ev) => { ev.stopPropagation(); onClick(); }}
      className={`w-full text-left px-3.5 py-2 text-sm transition-colors
                  ${danger ? 'text-danger hover:bg-danger/10' : 'text-text-2 hover:text-text-1 hover:bg-surface-2'}`}
    >
      {children}
    </button>
  );
}

/* ════════ UI helpers ════════ */
function Select({ value, onChange, opciones }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-10 px-3 rounded-xl bg-surface border border-border text-sm text-text-1
                 focus:outline-none focus:border-accent/50 cursor-pointer"
    >
      {opciones.map(o => <option key={o.value} value={o.value}>{tEstatico(o.label)}</option>)}
    </select>
  );
}
function Dot() { return <span className="w-1 h-1 rounded-full bg-text-3 inline-block" />; }
function PlusIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
}
function SearchIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
function GridIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
}
function ListIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>;
}
function CalIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
function StarIcon({ className, relleno }) {
  return <svg className={className} viewBox="0 0 24 24" fill={relleno ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.05 3.7c.3-.92 1.6-.92 1.9 0l1.52 4.67a1 1 0 00.95.69h4.91c.97 0 1.37 1.24.59 1.81l-3.97 2.88a1 1 0 00-.36 1.12l1.51 4.67c.3.92-.75 1.69-1.54 1.12l-3.97-2.89a1 1 0 00-1.18 0l-3.97 2.89c-.78.57-1.84-.2-1.54-1.12l1.51-4.67a1 1 0 00-.36-1.12L2.08 10.87c-.78-.57-.38-1.81.6-1.81h4.9a1 1 0 00.95-.69l1.52-4.67z" /></svg>;
}
function DotsIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>;
}
