import { useEffect, useMemo, useState } from 'react';
import { networkingApi } from '../../../api/networking.js';
import { clientesApi } from '../../../api/clientes.js';
import { useToast } from '../../../context/ToastContext.jsx';
import GLoader from '../../../components/ui/GLoader.jsx';
import Spinner from '../../../components/ui/Spinner.jsx';

/* La parrilla de la rueda: horas × mesas.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * El servidor sabía hacer todo esto desde hace tiempo —ver la parrilla
 * entera, aprobar lo pedido, mover a alguien de casilla, sentar a alguien a
 * mano— y no había ni una pantalla que lo llamara. Quien organiza tenía las
 * rutas y las manos atadas: una cita sólo la soltaba quien la había
 * reservado, así que cuando una empresa no llegaba, su hueco se quedaba
 * muerto el resto de la jornada.
 *
 * ── El formato que tiene que resolver ────────────────────────────────────
 *
 * Una compradora sentada en su mesa y vendedores que rotan por hora. Por eso
 * las columnas son las mesas y las filas son las horas: es como se mira una
 * rueda de verdad, y como está impreso el papel que el equipo lleva encima.
 *
 * ── Por qué se toca y no se arrastra ─────────────────────────────────────
 *
 * Mover es «toco la cita, toco dónde va». Arrastrar se ve mejor en una
 * demostración y es peor el día del evento: esto se opera de pie, con una
 * tableta, con prisa y a veces con una mano. Un arrastre que se suelta dos
 * píxeles antes no hace nada y no dice por qué; dos toques siempre caen donde
 * se apuntó, y entre uno y otro se puede parar sin miedo.
 */
export default function ParrillaRueda({ evento, soyOwner }) {
  const { success, error: toastErr } = useToast();
  const [mesas, setMesas] = useState(null);
  const [citas, setCitas] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /* La cita levantada, esperando destino. Null = nadie en la mano. */
  const [enMano, setEnMano] = useState(null);
  /* La casilla abierta en el panel lateral. */
  const [abierta, setAbierta] = useState(null);
  /* La casilla libre a la que se le va a sentar a alguien. */
  const [sentandoEn, setSentandoEn] = useState(null);

  async function cargar() {
    setError('');
    try {
      /* Dos peticiones porque son dos cosas distintas y ninguna sustituye a la
         otra: `admin` trae el esqueleto —qué mesas hay y qué franjas tiene
         cada una, incluidas las vacías— y `citas` trae el estado de verdad,
         con las solicitadas y la nota del equipo. `admin` sólo pega encima las
         confirmadas, así que sólo con él una casilla pedida se vería libre y
         alguien sentaría a otra persona encima. */
      const [a, c] = await Promise.all([
        networkingApi.admin(evento.id),
        networkingApi.citas(evento.id),
      ]);
      setMesas(a.expositores || []);
      setCitas(c.citas || []);
    } catch (e) {
      setError(e.message || 'No pudimos cargar la parrilla.');
      setMesas([]);
    }
  }

  /* Sólo el evento. `cargar` se redefine en cada render y ponerla aquí
     recargaría la parrilla sin parar. */
  // eslint-disable-next-line
  useEffect(() => { cargar(); }, [evento.id]);

  /* Las citas por casilla. Se descartan las canceladas: una cancelada libera
     la casilla —el servidor deja reservar encima— y pintarla ocupada haría
     que el equipo no usara un hueco que sí existe. */
  const porHorario = useMemo(() => {
    const m = new Map();
    for (const c of citas) {
      if (c.estado === 'cancelada') continue;
      if (c.horario?.id) m.set(c.horario.id, c);
    }
    return m;
  }, [citas]);

  /* Las filas: cada hora distinta que exista en cualquier mesa. Si dos mesas
     abren a las 9:00 es una sola fila; si una abre a las 9:30 y ninguna más,
     esa fila existe igual y las demás salen vacías — que es la verdad, no un
     hueco disponible. */
  const filas = useMemo(() => {
    const t = new Set();
    for (const m of mesas || []) for (const h of m.horarios || []) t.add(h.inicio);
    return [...t].sort((a, b) => new Date(a) - new Date(b));
  }, [mesas]);

  const hora = (iso) => new Date(iso)
    .toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  const conMesas = (mesas || []).filter(m => (m.horarios || []).length > 0);

  async function accion(fn) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await cargar();
    } catch (e) {
      /* El 409 es un caso normal al reorganizar —se apuntó a una casilla que
         ya tenía a alguien— y lleva su propio mensaje del servidor. Enseñarlo
         tal cual importa: si esto se leyera como «algo falló», quien está
         reorganizando la parrilla el día del evento deja de tocarla creyendo
         que la rompió. */
      toastErr(e.message || 'No se pudo.');
    } finally {
      setBusy(false);
    }
  }

  const mover = (horarioDestino) => accion(async () => {
    await networkingApi.tocarCita(evento.id, enMano.id, { horario_id: horarioDestino });
    setEnMano(null);
    success('Cita movida.');
  });

  if (mesas === null) return <GLoader message="Cargando la parrilla…" />;

  if (error) return (
    <div className="rounded-2xl border border-border bg-surface/40 p-6 text-center space-y-3">
      <p className="text-sm text-text-1">{error}</p>
      <button onClick={cargar} className="btn-secondary text-sm">Reintentar</button>
    </div>
  );

  if (conMesas.length === 0) return (
    <div className="rounded-3xl border border-border bg-surface/40 px-6 py-16 text-center">
      <p className="text-sm text-text-2">Todavía no hay mesas con horario.</p>
      <p className="text-xs text-text-3 mt-1 max-w-sm mx-auto leading-relaxed">
        En <b className="text-text-2">Gestionar</b> se crean las mesas y se les generan las franjas.
        La parrilla se dibuja sola en cuanto haya una.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Lo que está pasando ahora mismo, arriba y no al lado: si se levantó
          una cita, todo lo demás de la pantalla significa otra cosa. */}
      {enMano && (
        <div className="sticky top-2 z-20 flex items-center justify-between gap-3 flex-wrap
                        rounded-2xl border border-accent bg-accent/10 px-4 py-2.5">
          <p className="text-sm text-text-1">
            Moviendo a <b>{enMano.persona?.nombre || enMano.persona?.email || 'alguien'}</b> —
            toca la casilla a la que va.
          </p>
          <button onClick={() => setEnMano(null)} className="text-xs text-text-2 hover:text-text-1 underline">
            Dejarla donde estaba
          </button>
        </div>
      )}

      <Leyenda />

      {/* El tablero se desplaza dentro de su caja, no empuja la página a lo
          ancho: con diez mesas, el ancho se va y con él la barra lateral. */}
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface-2 border-b border-r border-border
                             px-3 py-2 text-left text-xs font-medium text-text-3 w-20">
                Hora
              </th>
              {conMesas.map(m => (
                <th key={m.id} className="bg-surface-2 border-b border-border px-3 py-2 text-left min-w-[11rem]">
                  <span className="block text-sm font-semibold text-text-1 truncate">{m.nombre}</span>
                  <span className="block text-[11px] text-text-3">
                    {m.stand ? `Mesa ${m.stand}` : 'Mesa por asignar'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(t => (
              <tr key={t}>
                {/* La hora se queda pegada al borde: con doce filas y ocho
                    mesas, al desplazarse a la derecha se pierde de vista de qué
                    hora es la fila que se está mirando. */}
                <th className="sticky left-0 z-10 bg-surface-2 border-r border-b border-border
                               px-3 py-2 text-xs text-text-2 font-medium align-top">
                  {hora(t)}
                </th>
                {conMesas.map(m => {
                  const h = (m.horarios || []).find(x => x.inicio === t);
                  const cita = h ? porHorario.get(h.id) : null;
                  return (
                    <td key={m.id} className="border-b border-border p-1.5 align-top">
                      <Casilla
                        horario={h} cita={cita} enMano={enMano} busy={busy}
                        onAbrir={() => setAbierta({ cita, mesa: m, inicio: t })}
                        onSentar={() => setSentandoEn({ horario: h, mesa: m, inicio: t })}
                        onSoltarAqui={() => mover(h.id)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {abierta?.cita && (
        <PanelCita
          evento={evento} soyOwner={soyOwner} cita={abierta.cita} mesa={abierta.mesa}
          onCerrar={() => setAbierta(null)}
          onLevantar={() => { setEnMano(abierta.cita); setAbierta(null); }}
          onCambio={cargar}
        />
      )}

      {sentandoEn && (
        <ModalSentar
          evento={evento} casilla={sentandoEn}
          onCerrar={() => setSentandoEn(null)}
          onHecho={() => { setSentandoEn(null); cargar(); }}
        />
      )}
    </div>
  );
}

function Leyenda() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-text-3">
      <span className="inline-flex items-center gap-1.5">
        <i className="w-3 h-3 rounded bg-success/20 border border-success/40" /> Confirmada
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="w-3 h-3 rounded bg-warning/20 border border-warning/40" /> Pedida, sin aprobar
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="w-3 h-3 rounded border border-dashed border-border" /> Libre
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="w-3 h-3 rounded bg-surface-2" /> Esa mesa no atiende a esa hora
      </span>
    </div>
  );
}

function Casilla({ horario, cita, enMano, busy, onAbrir, onSentar, onSoltarAqui }) {
  /* Esa mesa no abre a esa hora. No es un hueco disponible y no se puede
     ofrecer como tal: sentar a alguien ahí no tiene dónde caer. */
  if (!horario) {
    return <div className="h-[3.25rem] rounded-lg bg-surface-2/60" aria-hidden="true" />;
  }

  /* Con una cita en la mano, toda casilla libre es un destino. La ocupada
     también se enseña —marcada y sin poder tocarse— porque esconderla dejaría
     un hueco en el tablero justo donde hay alguien. */
  if (enMano && enMano.horario?.id !== horario.id) {
    const ocupada = Boolean(cita);
    return (
      <button type="button" disabled={busy || ocupada} onClick={onSoltarAqui}
        className={`w-full h-[3.25rem] rounded-lg border-2 border-dashed text-[11px] transition-colors ${
          ocupada
            ? 'border-border text-text-3 cursor-not-allowed'
            : 'border-accent text-accent hover:bg-accent/10'}`}>
        {ocupada ? 'Ocupada' : 'Mover aquí'}
      </button>
    );
  }

  if (!cita) {
    return (
      <button type="button" disabled={busy} onClick={onSentar}
        className="w-full h-[3.25rem] rounded-lg border border-dashed border-border
                   text-[11px] text-text-3 hover:text-text-1 hover:border-text-3 transition-colors">
        Libre
      </button>
    );
  }

  const pedida = cita.estado === 'solicitada';
  return (
    <button type="button" onClick={onAbrir}
      className={`w-full h-[3.25rem] rounded-lg border px-2 py-1 text-left transition-colors ${
        pedida
          ? 'bg-warning/10 border-warning/40 hover:bg-warning/20'
          : 'bg-success/10 border-success/40 hover:bg-success/20'}`}>
      <span className="block text-xs text-text-1 font-medium truncate">
        {cita.persona?.nombre || cita.persona?.email || 'Sin nombre'}
      </span>
      <span className="block text-[10px] text-text-3 truncate">
        {pedida ? 'Pedida' : 'Confirmada'}
        {/* Que la reunión dejó algo escrito se dice; lo escrito no se enseña
            aquí. Son apuntes de quien fue, sobre con quién habló y qué le
            pareció, y la parrilla es para operar. */}
        {cita.tiene_notas ? ' · con notas' : ''}
      </span>
    </button>
  );
}

function PanelCita({ evento, soyOwner, cita, mesa, onCerrar, onLevantar, onCambio }) {
  const { success, error: toastErr } = useToast();
  const [nota, setNota] = useState(cita.nota_gestor || '');
  const [busy, setBusy] = useState(false);

  async function tocar(body, exito) {
    setBusy(true);
    try {
      await networkingApi.tocarCita(evento.id, cita.id, body);
      success(exito);
      onCambio();
    } catch (e) {
      toastErr(e.message || 'No se pudo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onCerrar}>
      <aside onClick={e => e.stopPropagation()}
        className="w-full max-w-sm h-full bg-surface border-l border-border overflow-y-auto p-5 space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-text-1 truncate">
              {cita.persona?.nombre || cita.persona?.email || 'Sin nombre'}
            </h3>
            <p className="text-xs text-text-3 truncate">
              {mesa?.nombre}
              {cita.horario?.inicio
                ? ` · ${new Date(cita.horario.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
                : ''}
            </p>
          </div>
          <button onClick={onCerrar} className="text-text-3 hover:text-text-1 text-xl leading-none">×</button>
        </header>

        {cita.persona?.email && (
          <a href={`mailto:${cita.persona.email}`}
             className="text-sm text-primary-light hover:underline block truncate">
            {cita.persona.email}
          </a>
        )}

        <div className="flex flex-wrap gap-2">
          {cita.estado === 'solicitada' && (
            <button disabled={busy} onClick={() => tocar({ estado: 'confirmada' }, 'Cita confirmada.')}
              className="btn-primary text-sm">Confirmar</button>
          )}
          <button disabled={busy} onClick={onLevantar} className="btn-secondary text-sm">
            Mover de casilla
          </button>
          <button disabled={busy} onClick={() => tocar({ estado: 'cancelada' }, 'Cita cancelada.')}
            className="btn-secondary text-sm text-danger">Cancelar</button>
        </div>
        <p className="text-[11px] text-text-3 -mt-3 leading-relaxed">
          A quien va a la cita le llega un aviso de lo que se toque aquí. Hasta ahora se
          enteraba abriendo la pantalla por su cuenta.
        </p>

        {/* La nota del equipo. Existía en la base desde el principio y no la
            escribía nadie, porque no había dónde. Va aparte de la de quien
            asistió a propósito: son de dueños distintos y se escriben en
            momentos distintos — la del equipo antes, para preparar; la de la
            persona después, sobre lo que pasó. Pisar una con otra sería
            perder la mitad. */}
        <div className="space-y-1.5">
          <label className="label">Nota del equipo</label>
          <textarea
            value={nota} onChange={e => setNota(e.target.value)} rows={4} maxLength={4000}
            placeholder="Para el equipo: contexto, qué pidió, a quién avisar…"
            className="input w-full resize-y text-sm" />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-text-3">Sólo la ve el equipo, no quien va a la cita.</p>
            <button
              disabled={busy || nota === (cita.nota_gestor || '')}
              onClick={() => tocar({ nota_gestor: nota }, 'Nota guardada.')}
              className="btn-secondary text-xs disabled:opacity-40">
              Guardar
            </button>
          </div>
        </div>

        {cita.tiene_notas && (
          <div className="rounded-xl border border-border bg-surface-2/40 p-3 space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-text-3">Lo que anotó quien asistió</p>
            <p className="text-sm text-text-2 leading-relaxed">{cita.notas}</p>
            <p className="text-[11px] text-text-3">
              Recortado a propósito: son apuntes suyos y llegan aquí sólo para saber que existen.
            </p>
          </div>
        )}

        {!soyOwner && (
          <p className="text-[11px] text-text-3">
            Algunas acciones piden permiso de expositores; si algo no se deja, es eso.
          </p>
        )}
      </aside>
    </div>
  );
}

/* Sentar a alguien a mano. Es la otra mitad de «tanto autogestionado como por
   solicitud»: hay ruedas donde la agenda la arma el equipo entera. */
function ModalSentar({ evento, casilla, onCerrar, onHecho }) {
  const { success, error: toastErr } = useToast();
  const [q, setQ] = useState('');
  const [gente, setGente] = useState(null);
  /* Buscar asistentes pide `ver_clientes`, y esta pantalla pide el de
     expositores: son permisos distintos y hay quien tiene uno sin el otro.
     Sin decirlo, un 403 se leería como «no hay nadie con ese nombre» y se
     buscaría a la misma persona diez veces. */
  const [sinPermiso, setSinPermiso] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let vivo = true;
    /* Se espera a que pare de teclear: cada letra era una consulta a la base
       para una lista que todavía no se estaba mirando. */
    const t = setTimeout(() => {
      clientesApi.list(evento.id, { q: q.trim() || undefined, limit: 20 })
        .then(d => { if (!vivo) return; setSinPermiso(false); setGente(d.clientes || []); })
        .catch(e => { if (!vivo) return; setSinPermiso(e?.status === 403); setGente([]); });
    }, 300);
    return () => { vivo = false; clearTimeout(t); };
  }, [q, evento.id]);

  async function sentar(userId) {
    setBusy(true);
    try {
      await networkingApi.sentar(evento.id, casilla.horario.id, userId);
      success('Persona sentada. Le llega el aviso.');
      onHecho();
    } catch (e) {
      toastErr(e.message || 'No se pudo sentar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCerrar}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-surface border border-border rounded-2xl p-5 space-y-4 max-h-[80vh] flex flex-col">
        <header>
          <h3 className="text-lg font-semibold text-text-1">Sentar a alguien</h3>
          <p className="text-xs text-text-3">
            {casilla.mesa?.nombre} · {new Date(casilla.inicio)
              .toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </header>

        <input autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, correo o código…" className="input w-full text-sm" />

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
          {gente === null && <div className="py-6 flex justify-center"><Spinner /></div>}
          {sinPermiso && (
            <p className="text-sm text-text-3 text-center py-6 leading-relaxed">
              Para buscar entre los asistentes hace falta el permiso de <b className="text-text-2">ver clientes</b>.
              Quien organiza puede dártelo en Equipo.
            </p>
          )}
          {!sinPermiso && gente?.length === 0 && (
            <p className="text-sm text-text-3 text-center py-6">Nadie con ese nombre.</p>
          )}
          {(gente || []).map(t => {
            /* Sin cuenta no se puede sentar: la cita cuelga de una persona, no
               de una boleta. Se enseñan igual y con el motivo, porque
               esconderlos haría buscar sin encontrar a alguien que sí está en
               la lista de asistentes. */
            const sinCuenta = !t.usuario?.id;
            return (
              <button key={t.id} type="button" disabled={busy || sinCuenta}
                onClick={() => sentar(t.usuario.id)}
                className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${
                  sinCuenta
                    ? 'border-border/60 opacity-60 cursor-not-allowed'
                    : 'border-border hover:bg-surface-2'}`}>
                <span className="text-sm text-text-1 block truncate">
                  {t.usuario?.nombre || t.guest_nombre || 'Sin nombre'}
                </span>
                <span className="text-[11px] text-text-3 block truncate">
                  {t.usuario?.email || t.guest_email || t.codigo}
                  {sinCuenta ? ' · compró como invitado, sin cuenta' : ''}
                </span>
              </button>
            );
          })}
        </div>

        <button onClick={onCerrar} className="btn-secondary text-sm w-full">Cerrar</button>
      </div>
    </div>
  );
}
