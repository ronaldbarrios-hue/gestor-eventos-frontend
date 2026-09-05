import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { equipoTorneoApi } from '../../api/interacciones.js';
import { useToast } from '../../context/ToastContext.jsx';
import GLoader from '../../components/ui/GLoader.jsx';
import Volver from '../../components/ui/Volver.jsx';
import { mensajePublico } from '../../lib/mensajeDeError.js';
import CampoFormulario, { primerFallo } from '../../components/ui/CampoFormulario.jsx';
import { camposVisibles } from '../../lib/camposCondicionales.js';

/* El portal del capitán de un equipo.
 *
 * ── Lo que faltaba ────────────────────────────────────────────────────────
 *
 * Un tipo de boleta que declara «crea un equipo» (0093) hace nacer la ficha al
 * pagarse, con lo único que se sabe: el nombre de quien compró y su correo. Lo
 * que el torneo pida además —dorsal y posición, o nick, rango y servidor— lo
 * tiene que poner el capitán, y no tenía por dónde: la promesa era «completa
 * sus datos por su enlace» y ese enlace no existía. El equipo nacía a medias y
 * alguien del staff acababa copiando datos de un WhatsApp.
 *
 * ── Se entra con el código de la boleta ──────────────────────────────────
 *
 * Igual que el expositor con la suya, y a propósito: es el mismo caso —alguien
 * sin cuenta que edita UNA ficha— y resolverlo de dos maneras distintas serían
 * dos maneras distintas de equivocarse.
 */

export default function EquipoTorneoPage() {
  const { codigo } = useParams();
  const { success, error: toastErr } = useToast();
  const [data, setData] = useState(undefined);   // undefined = cargando
  const [fallo, setFallo] = useState(null);
  const [intento, setIntento] = useState(0);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [respuestas, setRespuestas] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    equipoTorneoApi.panel(codigo)
      .then(d => {
        setData(d);
        setNombre(d.equipo?.nombre || '');
        setEmail(d.equipo?.contacto_email || '');
        setRespuestas(d.equipo?.respuestas || {});
      })
      /* Sin traducir, un fallo de red llegaba aquí como «Network Error» y la
         pantalla lo remataba con «el código es el de tu boleta» — o sea que se
         le decía a alguien que su código está mal cuando lo que pasó es que no
         llegamos a preguntar. */
      .catch(e => setFallo(mensajePublico(e, 'No encontramos ese equipo.')));
  }, [codigo, intento]);

  const campos = data?.campos || [];
  const visibles = useMemo(() => camposVisibles(campos, respuestas), [campos, respuestas]);

  const nombrePorId = useMemo(
    () => new Map((data?.equipos || []).map(e => [e.id, e.nombre])),
    [data],
  );

  if (fallo) return (
    <section className="px-5 py-20 max-w-md mx-auto text-center animate-[fadeUp_0.4s_ease_both]">
      <p className="text-sm text-text-1 mb-1.5">{fallo.texto}</p>
      {/* La pista del código sólo cuando el código PUEDE ser el problema. Con
          un fallo de comunicación, mandar a revisar el código es mandar a
          buscar donde no está. */}
      {fallo.reintentable ? (
        <button onClick={() => setIntento(n => n + 1)}
          className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border
                     text-sm text-text-1 hover:bg-surface-2 transition-colors">
          Reintentar
        </button>
      ) : (
        <p className="text-xs text-text-3 mb-5">
          El código es el de tu boleta de inscripción, el mismo que te llegó al pagar.
        </p>
      )}
      <div><Volver a="/explorar" tono="chip">Explorar eventos</Volver></div>
    </section>
  );

  if (data === undefined) return (
    <section className="px-5 py-20 max-w-2xl mx-auto"><GLoader message="Cargando tu equipo…" /></section>
  );

  const { equipo, torneo, evento, partidos, puede_renombrar: puedeRenombrar } = data;

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { toastErr('El equipo necesita un nombre.'); return; }
    /* Se comprueba aquí además de en el servidor: el servidor contesta el
       primer fallo y esto evita el viaje. */
    const malo = primerFallo(visibles, respuestas);
    if (malo) { toastErr(malo); return; }
    setGuardando(true);
    try {
      const d = await equipoTorneoApi.guardar(codigo, {
        ...(puedeRenombrar ? { nombre: nombre.trim() } : {}),
        contacto_email: email.trim() || null,
        ...(campos.length ? { respuestas } : {}),
      });
      setData(x => ({ ...x, equipo: d.equipo }));
      success('Listo, tus datos quedaron guardados.');
    } catch (err) {
      toastErr(err.response?.data?.error || err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cuando = (p) => (p.fecha_hora
    ? new Date(p.fecha_hora).toLocaleString('es-CO', {
        weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : 'Sin fecha todavía');

  return (
    <section className="px-5 py-10 max-w-2xl mx-auto space-y-6 animate-[fadeUp_0.4s_ease_both]">
      <header>
        <p className="text-xs uppercase tracking-widest text-text-3 font-semibold mb-1">
          {torneo.nombre}{torneo.disciplina ? ` · ${torneo.disciplina}` : ''}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-text-1">
          {equipo.nombre}
        </h1>
        {evento?.titulo && <p className="text-sm text-text-2 mt-1">{evento.titulo}</p>}
      </header>

      {/* Cuándo juega: es lo primero que se pregunta quien abre esto. */}
      <div className="card">
        <div className="card-header"><h2 className="text-base font-semibold text-text-1">Cuándo juegas</h2></div>
        <div className="card-body">
          {partidos.length === 0 ? (
            <p className="text-sm text-text-2">
              Todavía no se ha sorteado el cuadro. Cuando se sepa contra quién juegas, aparecerá aquí.
            </p>
          ) : (
            <ul className="space-y-2">
              {partidos.map(p => {
                const rivalId = p.equipo_a_id === equipo.id ? p.equipo_b_id : p.equipo_a_id;
                const jugado = p.estado === 'jugado';
                const mios  = p.equipo_a_id === equipo.id ? p.marcador_a : p.marcador_b;
                const suyos = p.equipo_a_id === equipo.id ? p.marcador_b : p.marcador_a;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm text-text-1 truncate">
                        vs {nombrePorId.get(rivalId) || 'Por definir'}
                      </p>
                      <p className="text-[11px] text-text-3">
                        {cuando(p)}{p.cancha ? ` · ${p.cancha}` : ''}
                      </p>
                    </div>
                    {jugado && (
                      <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${mios > suyos ? 'text-success' : 'text-text-3'}`}>
                        {mios} – {suyos}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <form onSubmit={guardar} className="card">
        <div className="card-header">
          <h2 className="text-base font-semibold text-text-1">Los datos de tu equipo</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="field">
            <label className="label">Nombre del equipo</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              disabled={!puedeRenombrar} className="input rounded-2xl py-3 disabled:opacity-60" />
            {!puedeRenombrar && (
              /* No es una limitación caprichosa y conviene decir por qué: los
                 partidos ya jugados hablan de este equipo. */
              <p className="text-[11px] text-text-3 mt-1.5">
                El torneo ya empezó, así que el nombre queda fijo: los partidos ya jugados hablan de
                él. Si hay un error, escríbele al organizador.
              </p>
            )}
          </div>

          <div className="field">
            <label className="label">Correo de contacto</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="input rounded-2xl py-3" placeholder="capitan@correo.com" />
            <p className="text-[11px] text-text-3 mt-1.5">Se usa para avisarte cuándo juega tu equipo.</p>
          </div>

          {visibles.map(c => (
            <CampoFormulario key={c.id} campo={c} value={respuestas[c.id]}
              onChange={v => setRespuestas(r => ({ ...r, [c.id]: v }))}
              eventoId={evento?.id} />
          ))}

          {campos.length === 0 && (
            <p className="text-xs text-text-3">
              Este torneo no pide nada más. Con el nombre y el contacto ya estás inscrito.
            </p>
          )}
        </div>
        <div className="card-footer flex justify-end">
          <button type="submit" disabled={guardando} className="btn-primary btn-sm">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>

      {evento?.slug && (
        <Volver a={`/explorar/${evento.slug}`}>Ver el evento</Volver>
      )}
    </section>
  );
}
