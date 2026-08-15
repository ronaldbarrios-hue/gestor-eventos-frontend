import { useEffect, useState } from 'react';
import { eventosApi } from '../../../../api/eventos.js';
import { useToast } from '../../../../context/ToastContext.jsx';
import Spinner from '../../../../components/ui/Spinner.jsx';

/* GESTEK — Los términos y la privacidad DEL EVENTO.

   El backend lleva tiempo listo (GET/PUT /eventos/:id/legal, migración 0059) y
   el formulario público ya enlaza aquí. Faltaba lo único que importaba: una
   pantalla donde escribirlos. Por eso había cero eventos con términos — no
   porque a nadie le pareciera necesario, sino porque no se podía.

   Y no es un detalle administrativo. El formulario de inscripción pide
   documento, teléfono y, con la ficha de caracterización, etnia, discapacidad
   y condición de víctima. Una vez que alguien se registra sin haber aceptado
   nada, ese consentimiento NO se puede pedir hacia atrás: la persona ya
   entregó los datos. Cada día con registros abiertos son más personas en esa
   situación.

   Dos documentos separados a propósito: los términos dicen qué se puede y qué
   no en el evento; la privacidad dice qué datos se recogen, para qué y a quién
   reclamarle. Meterlos en uno deja al asistente sin saber a quién reclamar. */

/* Punto de partida, NO un documento legal.

   Existe porque la razón real por la que esto no se escribe no es la desidia,
   es la página en blanco. Un esqueleto con los huecos marcados se rellena en
   diez minutos; un cuadro vacío se deja para mañana.

   Los huecos van en MAYÚSCULAS y entre corchetes para que salten a la vista si
   alguien publica sin rellenarlos. Y lo que no sabemos no se inventa: no hay
   plazos de conservación ni bases legales escritas por nosotros, porque eso
   depende de cada organizador y de su país, y un texto que suena legal pero no
   lo es resulta peor que no tener nada. */
const ESQUELETO_TERMINOS = `Términos y condiciones de [NOMBRE DEL EVENTO]

1. Quién organiza
Este evento lo organiza [NOMBRE O RAZÓN SOCIAL], identificado con [NIT / DOCUMENTO], con contacto en [CORREO DE CONTACTO].

2. Tu entrada
La boleta es personal. Para entrar hay que presentar el código QR que llega al correo.
[¿SE PUEDE TRANSFERIR A OTRA PERSONA? ESCRIBE AQUÍ LA REGLA]

3. Cambios y cancelaciones
[¿QUÉ PASA SI EL EVENTO SE APLAZA O SE CANCELA? ¿HAY DEVOLUCIÓN? ¿EN CUÁNTO TIEMPO?]
[¿PUEDE EL ASISTENTE PEDIR DEVOLUCIÓN? ¿HASTA CUÁNDO?]

4. Comportamiento en el evento
[REGLAS DE INGRESO: EDAD MÍNIMA, OBJETOS NO PERMITIDOS, MOTIVOS DE EXPULSIÓN]

5. Imagen
[¿SE VA A FOTOGRAFIAR O GRABAR? ¿PARA QUÉ SE VAN A USAR ESAS IMÁGENES?]

6. Contacto
Para cualquier reclamo: [CORREO] · [TELÉFONO]
`;

const ESQUELETO_PRIVACIDAD = `Tratamiento de datos personales — [NOMBRE DEL EVENTO]

1. Quién responde por tus datos
[NOMBRE O RAZÓN SOCIAL], [NIT / DOCUMENTO], [DIRECCIÓN], [CORREO].

2. Qué datos pedimos
Nombre, correo y teléfono para emitir la boleta y avisarte del evento.
[SI TU FORMULARIO PIDE DOCUMENTO, ESCRÍBELO AQUÍ Y DI PARA QUÉ]
[SI PIDES DATOS SENSIBLES —ETNIA, DISCAPACIDAD, CONDICIÓN DE VÍCTIMA— DILO
 EXPRESAMENTE, EXPLICA PARA QUÉ, Y ACLARA QUE RESPONDERLOS ES VOLUNTARIO]

3. Para qué los usamos
[ENUMERA LOS USOS REALES: EMITIR LA BOLETA, CONTROL DE INGRESO, REPORTES A
 ENTIDADES, COMUNICACIONES SOBRE ESTE EVENTO]

4. Con quién los compartimos
[¿ENTIDAD PÚBLICA? ¿PATROCINADOR? ¿NADIE? SI COMPARTES CON ALGUIEN, NÓMBRALO]

5. Cuánto tiempo los guardamos
[TIEMPO CONCRETO Y POR QUÉ]

6. Tus derechos
Puedes pedir que te digamos qué datos tenemos, corregirlos o eliminarlos
escribiendo a [CORREO DE CONTACTO], y te respondemos en [PLAZO].
`;

const HUECO = /\[[^\]]{4,}\]/;

export default function TerminosEvento({ evento }) {
  const [f, setF] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [otros, setOtros] = useState([]);
  const { success, error: toastErr } = useToast();

  useEffect(() => {
    let vivo = true;
    Promise.all([
      eventosApi.legal(evento.id).catch(() => ({ legal: null })),
      /* Para copiar de otro evento propio. Escribir lo mismo dieciséis veces
         es la razón por la que no se escribe ninguna. */
      eventosApi.list?.({ limit: 50 }).catch(() => null),
    ]).then(([r, lista]) => {
      if (!vivo) return;
      setF({
        terminos_texto  : r.legal?.terminos_texto || '',
        privacidad_texto: r.legal?.privacidad_texto || '',
        terminos_url    : r.legal?.terminos_url || '',
        privacidad_url  : r.legal?.privacidad_url || '',
        responsable     : r.legal?.responsable || evento?.organizador?.empresa || '',
        contacto_datos  : r.legal?.contacto_datos || '',
      });
      const evs = lista?.eventos || lista?.data || [];
      setOtros(evs.filter(e => e.id !== evento.id).slice(0, 20));
    }).finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [evento.id]);

  const set = (patch) => setF(x => ({ ...x, ...patch }));

  const guardar = async () => {
    setGuardando(true);
    try {
      await eventosApi.guardarLegal(evento.id, f);
      success('Términos guardados. Ya se enlazan en el formulario de inscripción.');
    } catch (e) {
      toastErr(e.response?.data?.error || e.message);
    } finally { setGuardando(false); }
  };

  const copiarDe = async (id) => {
    try {
      const r = await eventosApi.legal(id);
      if (!r.legal) { toastErr('Ese evento tampoco tiene términos escritos.'); return; }
      set({
        terminos_texto  : r.legal.terminos_texto || '',
        privacidad_texto: r.legal.privacidad_texto || '',
        terminos_url    : r.legal.terminos_url || '',
        privacidad_url  : r.legal.privacidad_url || '',
        responsable     : r.legal.responsable || f.responsable,
        contacto_datos  : r.legal.contacto_datos || f.contacto_datos,
      });
      success('Copiado. Revisa que el nombre del evento y las fechas correspondan a este.');
    } catch (e) { toastErr(e.response?.data?.error || e.message); }
  };

  if (cargando || !f) return <div className="py-8 flex justify-center"><Spinner /></div>;

  const tieneTerminos   = Boolean(f.terminos_texto.trim() || f.terminos_url.trim());
  const tienePrivacidad = Boolean(f.privacidad_texto.trim() || f.privacidad_url.trim());
  const huecosSinLlenar = [f.terminos_texto, f.privacidad_texto].filter(t => HUECO.test(t)).length;
  const publicado = evento?.estado === 'publicado';

  return (
    <div className="space-y-5">
      {/* Lo primero, y sólo cuando de verdad urge: un evento publicado que ya
          puede estar recibiendo inscritos sin haber dicho bajo qué condiciones. */}
      {publicado && !tieneTerminos && (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3">
          <p className="text-sm font-semibold text-danger-light">Este evento está publicado y no tiene términos.</p>
          <p className="text-xs text-text-2 mt-1 leading-relaxed">
            El formulario pide datos personales y no dice bajo qué condiciones. Quien se registre
            ahora lo hará sin haber aceptado nada, y ese consentimiento no se puede pedir después.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-text-1">Términos del evento</h3>
          <p className="text-xs text-text-3 mt-1 leading-relaxed max-w-2xl">
            Los tuyos, no los de GESTEK. Cubren qué pasa con la boleta, con las cancelaciones y con
            los datos que pides. Se enlazan solos en el formulario de inscripción.
          </p>
        </div>
        {otros.length > 0 && (
          <div className="field">
            <label className="label text-xs" htmlFor="copiar-de">Copiar de otro evento</label>
            <select id="copiar-de" defaultValue="" onChange={e => { if (e.target.value) copiarDe(e.target.value); e.target.value = ''; }}
              className="input rounded-xl py-2 text-sm pr-10">
              <option value="">Elegir…</option>
              {otros.map(o => <option key={o.id} value={o.id}>{o.titulo}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid-form">
        <div className="field">
          <label className="label" htmlFor="leg-resp">Quién responde por los datos</label>
          <input id="leg-resp" className="input-form" maxLength={200}
            value={f.responsable} onChange={e => set({ responsable: e.target.value })}
            placeholder="Hytrex S.A.S. · NIT 900.000.000-1" />
        </div>
        <div className="field">
          <label className="label" htmlFor="leg-cont">Contacto para reclamos</label>
          <input id="leg-cont" className="input-form" maxLength={200} type="email" inputMode="email"
            value={f.contacto_datos} onChange={e => set({ contacto_datos: e.target.value })}
            placeholder="datos@tuempresa.com" />
        </div>
      </div>

      <Documento
        titulo="Términos y condiciones"
        listo={tieneTerminos}
        texto={f.terminos_texto} url={f.terminos_url}
        onTexto={v => set({ terminos_texto: v })} onUrl={v => set({ terminos_url: v })}
        esqueleto={ESQUELETO_TERMINOS}
      />

      <Documento
        titulo="Tratamiento de datos personales"
        listo={tienePrivacidad}
        texto={f.privacidad_texto} url={f.privacidad_url}
        onTexto={v => set({ privacidad_texto: v })} onUrl={v => set({ privacidad_url: v })}
        esqueleto={ESQUELETO_PRIVACIDAD}
      />

      {huecosSinLlenar > 0 && (
        <p className="text-xs text-warning-light bg-warning/10 border border-warning/20 rounded-xl px-3 py-2 leading-relaxed">
          Quedan huecos entre corchetes sin rellenar. Se publican tal cual, y un documento con
          «[NOMBRE DEL EVENTO]» dentro no protege a nadie.
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={guardar} disabled={guardando} className="btn-primary btn-sm">
          {guardando ? <><Spinner size="sm" /> Guardando…</> : 'Guardar términos'}
        </button>
        <a href={`/explorar/${evento.slug}/legal`} target="_blank" rel="noreferrer"
          className="text-xs text-primary-light hover:underline">Ver cómo queda en público</a>
      </div>
    </div>
  );
}

/* Un documento: se escribe aquí, o se enlaza si el organizador ya lo tiene en
   su web. La URL gana sobre el texto —así lo resuelve el servidor—, y por eso
   se dice en pantalla en vez de dejar que alguien escriba mil palabras que no
   se van a mostrar. */
function Documento({ titulo, listo, texto, url, onTexto, onUrl, esqueleto }) {
  const [modo, setModo] = useState(url ? 'enlace' : 'texto');

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-text-1">{titulo}</h4>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${listo
            ? 'bg-success/10 text-success border-success/25'
            : 'bg-text-3/10 text-text-3 border-border'}`}>
            {listo ? 'listo' : 'sin escribir'}
          </span>
        </div>
        <div className="flex gap-1">
          {['texto', 'enlace'].map(m => (
            <button key={m} type="button" onClick={() => setModo(m)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${modo === m
                ? 'border-primary/40 bg-primary/10 text-text-1'
                : 'border-border text-text-3 hover:text-text-1'}`}>
              {m === 'texto' ? 'Escribirlo aquí' : 'Enlazar el mío'}
            </button>
          ))}
        </div>
      </div>

      {modo === 'texto' ? (
        <>
          <textarea rows={12} value={texto} onChange={e => onTexto(e.target.value)}
            className="input-form font-mono text-[13px] leading-relaxed"
            placeholder="Escribe aquí, o empieza desde el borrador de abajo." />
          {!texto.trim() && (
            <button type="button" onClick={() => onTexto(esqueleto)}
              className="text-xs text-primary-light hover:underline">
              Empezar desde un borrador
            </button>
          )}
          {url && (
            <p className="text-[11px] text-warning-light">
              Tienes un enlace puesto, y el enlace gana: este texto no se mostrará mientras esté ahí.
            </p>
          )}
        </>
      ) : (
        <>
          <input value={url} onChange={e => onUrl(e.target.value)} className="input-form"
            placeholder="https://tuempresa.com/terminos" inputMode="url" />
          <p className="text-[11px] text-text-3">
            Tiene que empezar por http:// o https://. Si lo pones, se usa este en vez del texto.
          </p>
        </>
      )}
    </div>
  );
}

/* El borrador NO es asesoría legal y no se presenta como tal: es un guion con
   los huecos marcados para que nadie empiece desde una página en blanco. Lo
   que depende del país o del organizador —plazos de conservación, bases
   legales, política de devoluciones— se deja como hueco a propósito. Un texto
   que suena legal y no lo es es peor que no tener nada: da confianza sin dar
   protección. */
