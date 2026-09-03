import { Link } from 'react-router-dom';
import { LegalLayout, Seccion, Lista } from './legal.jsx';
import { CORREO_CONTACTO } from '../../lib/enlacesPublicos.js';

/* ──────────────────────────────────────────────────────────────────
   Política de Privacidad y Tratamiento de Datos Personales
   Redactada conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013
   (Colombia) y a la Política de Datos de Usuario de los Servicios de
   API de Google (incluido el requisito de Uso Limitado).
   NOTA INTERNA: reemplazar [RAZÓN SOCIAL], [NIT] y [DIRECCIÓN] con los
   datos de la empresa antes del lanzamiento. Este texto no sustituye
   asesoría legal profesional.
   ────────────────────────────────────────────────────────────────── */

export default function PrivacidadPage() {
  return (
    <LegalLayout titulo="Política de Privacidad" actualizada="19 de julio de 2026">
      <Seccion n={1} titulo="Quiénes somos y alcance">
        <p>
          GESTEK es una plataforma de gestión de eventos (creación, boletería, check-in,
          equipo y comunicación) operada por <strong className="text-text-1">[RAZÓN SOCIAL]</strong>,
          identificada con NIT <strong className="text-text-1">[NIT]</strong>, con domicilio en{' '}
          <strong className="text-text-1">[DIRECCIÓN — Colombia]</strong> (en adelante, "GESTEK",
          "nosotros"). Esta política describe cómo recolectamos, usamos, almacenamos y protegemos
          los datos personales de quienes usan la plataforma en{' '}
          <span className="font-mono text-sm">gestekeventost.dpdns.org</span> y en los sitios de
          eventos creados con GESTEK, en cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de
          2013 y demás normas aplicables en Colombia.
        </p>
        <p>
          GESTEK actúa como <strong className="text-text-1">responsable del tratamiento</strong> de
          los datos de las cuentas de organizadores y usuarios de la plataforma, y como{' '}
          <strong className="text-text-1">encargado del tratamiento</strong> de los datos de los
          asistentes que cada organizador recolecta a través de sus eventos: en ese caso, el
          organizador del evento es el responsable.
        </p>
      </Seccion>

      <Seccion n={2} titulo="Datos que recolectamos">
        <Lista items={[
          'Datos de cuenta: nombre, apellidos, correo electrónico, contraseña (cifrada), foto de perfil, teléfono, empresa, cargo y ciudad.',
          'Inicio de sesión con Google: si eliges esta opción, recibimos de Google tu nombre, correo y foto de perfil. No recibimos tu contraseña de Google.',
          'Datos de eventos y asistentes: información de los eventos que creas y los datos que los asistentes entregan al inscribirse (nombre, correo, documento y los campos del formulario que defina cada organizador).',
          'Datos de asistencia: registros de check-in/check-out mediante código QR, fecha y hora de ingreso.',
          'Datos de pago: cuando el organizador usa Mercado Pago, la transacción la procesa Mercado Pago — GESTEK no almacena números de tarjeta. Para pagos por Bre-B, el dinero fluye directamente entre asistente y organizador.',
          'Contenido que subes: imágenes de portada, galerías, logos, documentos y archivos de trabajo.',
          'Mensajes al asistente de IA (Gestbot): las conversaciones y archivos que le envíes para procesar tu solicitud.',
          'Datos técnicos: dirección IP, tipo de navegador, sistema operativo, páginas visitadas y preferencias guardadas en tu dispositivo (localStorage) como tema, idioma y disposición de widgets.',
        ]} />
      </Seccion>

      <Seccion n={3} titulo="Finalidades del tratamiento">
        <Lista items={[
          'Crear y administrar tu cuenta, autenticarte y mantener tu sesión.',
          'Prestar las funciones de la plataforma: eventos, boletería, QR, check-in, equipo, tareas, chat y notificaciones.',
          'Enviar correos transaccionales: confirmaciones de compra, boletas con QR, recordatorios, invitaciones y avisos de seguridad.',
          'Enviar notificaciones push si las activas (puedes desactivarlas cuando quieras).',
          'Operar el asistente de IA cuando decidas usarlo.',
          'Mejorar el servicio, prevenir fraude y abuso, y cumplir obligaciones legales.',
        ]} />
        <p>No vendemos datos personales ni los usamos para publicidad de terceros.</p>
      </Seccion>

      <Seccion n={4} titulo="Datos obtenidos de Google (Uso Limitado)">
        <p>
          El uso que GESTEK hace de la información recibida de las APIs de Google se ajusta a la{' '}
          <a className="text-primary-light hover:underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            Política de Datos de Usuario de los Servicios de API de Google
          </a>, incluidos los requisitos de Uso Limitado. Los datos de tu cuenta de Google
          (nombre, correo y foto) se usan únicamente para crear tu cuenta e identificarte dentro
          de GESTEK; no se transfieren a terceros salvo los subprocesadores necesarios para operar
          el servicio, no se usan para publicidad y ningún humano los lee salvo con tu
          consentimiento, por obligación legal o por razones de seguridad.
        </p>
      </Seccion>

      <Seccion n={5} titulo="Con quién compartimos datos (subprocesadores)">
        <p>Usamos proveedores de infraestructura que procesan datos por cuenta nuestra, bajo sus propias medidas de seguridad:</p>
        <Lista items={[
          'Supabase (base de datos, autenticación y almacenamiento de archivos — servidores en la nube, EE. UU./UE).',
          'Vercel (alojamiento del sitio web) y Render (alojamiento del servidor de la aplicación).',
          'Mercado Pago (procesamiento de pagos, cuando el organizador lo habilita).',
          'Anthropic (procesamiento de las conversaciones con el asistente Gestbot).',
          'Google (inicio de sesión con Google, si lo eliges).',
          'Proveedores de correo electrónico transaccional y de notificaciones push.',
        ]} />
        <p>
          Algunos de estos proveedores están fuera de Colombia, por lo que autorizas la
          transmisión y transferencia internacional de datos necesaria para prestar el servicio,
          siempre bajo estándares de protección adecuados.
        </p>
      </Seccion>

      <Seccion n={6} titulo="Tus derechos (habeas data)">
        <p>Como titular de los datos, en cualquier momento puedes:</p>
        <Lista items={[
          'Conocer, actualizar y rectificar tus datos personales.',
          'Solicitar prueba de la autorización otorgada y ser informado sobre el uso de tus datos.',
          'Revocar la autorización y/o solicitar la supresión de tus datos cuando no exista un deber legal o contractual de conservarlos.',
          'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones al régimen de protección de datos.',
          'Acceder gratuitamente a tus datos, descargar tu información y eliminar tu cuenta desde Ajustes.',
        ]} />
        <p>
          Canal de atención: <a className="text-primary-light hover:underline" href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>.
          Responderemos las consultas en máximo diez (10) días hábiles y los reclamos en máximo
          quince (15) días hábiles, conforme a la ley.
        </p>
      </Seccion>

      <Seccion n={7} titulo="Seguridad y conservación">
        <p>
          Protegemos los datos con cifrado en tránsito (HTTPS), contraseñas cifradas, controles de
          acceso por roles y registros de auditoría. Conservamos los datos mientras la cuenta esté
          activa o mientras sean necesarios para las finalidades descritas; los eventos archivados
          conservan su información para reportes del organizador. Al eliminar tu cuenta, los datos
          se suprimen o anonimizan salvo aquellos que debamos conservar por obligación legal,
          contable o fiscal.
        </p>
      </Seccion>

      <Seccion n={8} titulo="Menores de edad">
        <p>
          GESTEK no está dirigida a menores de 18 años. Los organizadores que gestionen eventos con
          asistentes menores de edad son responsables de contar con la autorización de los padres o
          representantes, conforme a la ley.
        </p>
      </Seccion>

      <Seccion n={9} titulo="Cambios a esta política">
        <p>
          Podremos actualizar esta política. Publicaremos la versión vigente en esta página con su
          fecha de actualización y, si el cambio es sustancial, lo avisaremos dentro de la
          plataforma o por correo.
        </p>
        <p>
          Consulta también nuestros <Link to="/terminos" className="text-primary-light hover:underline">Términos y Condiciones del Servicio</Link>.
        </p>
      </Seccion>
    </LegalLayout>
  );
}
