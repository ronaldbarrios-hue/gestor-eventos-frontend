import { Link } from 'react-router-dom';
import { LegalLayout, Seccion, Lista } from './legal.jsx';
import { CORREO_CONTACTO } from '../../lib/enlacesPublicos.js';

/* Términos y Condiciones del Servicio de GESTEK.
   NOTA INTERNA: reemplazar [RAZÓN SOCIAL] y [NIT] antes del lanzamiento.
   Este texto no sustituye asesoría legal profesional. */

export default function TerminosPage() {
  return (
    <LegalLayout titulo="Términos y Condiciones del Servicio" actualizada="19 de julio de 2026">
      <Seccion n={1} titulo="Aceptación y definiciones">
        <p>
          Estos términos regulan el uso de GESTEK, plataforma de gestión de eventos operada por{' '}
          <strong className="text-text-1">[RAZÓN SOCIAL]</strong> (NIT{' '}
          <strong className="text-text-1">[NIT]</strong>, Colombia). Al crear una cuenta o usar la
          plataforma aceptas estos términos y la{' '}
          <Link to="/privacidad" className="text-primary-light hover:underline">Política de Privacidad</Link>.
          "Organizador" es quien crea y administra eventos; "Asistente" es quien se inscribe o
          compra boletas; "Colaborador" es quien trabaja en el equipo de un evento por invitación
          de un Organizador.
        </p>
      </Seccion>

      <Seccion n={2} titulo="El servicio">
        <p>
          GESTEK ofrece herramientas para crear eventos, publicar su página, vender o reservar
          boletas con código QR, hacer check-in, coordinar equipos (tareas, chat, agenda,
          gamificación) y usar un asistente de inteligencia artificial. El servicio se contrata
          bajo modalidad de marca blanca con planes acordados directamente con GESTEK; sus
          condiciones comerciales (precio, vigencia, soporte) se pactan en el acuerdo de servicio
          correspondiente.
        </p>
      </Seccion>

      <Seccion n={3} titulo="Cuentas y seguridad">
        <Lista items={[
          'Debes entregar información veraz y mantenerla actualizada. Eres responsable de la confidencialidad de tus credenciales y de toda actividad realizada con tu cuenta.',
          'Debes ser mayor de 18 años para crear una cuenta.',
          'Notifícanos de inmediato cualquier uso no autorizado. Podemos suspender cuentas ante indicios razonables de fraude, abuso o riesgo de seguridad.',
        ]} />
      </Seccion>

      <Seccion n={4} titulo="Responsabilidades del Organizador">
        <Lista items={[
          'El Organizador es el responsable del evento: su realización, calidad, cambios, cancelaciones y el cumplimiento de las normas que le apliquen (incluidas las tributarias y de consumo).',
          'Es responsable del tratamiento de los datos de sus Asistentes recolectados a través de GESTEK, y de contar con las autorizaciones exigidas por la Ley 1581 de 2012. GESTEK actúa como encargado del tratamiento.',
          'Los reembolsos y reclamos por boletas son gestionados y decididos por el Organizador, conforme a su propia política y a la ley.',
          'No puede usar la plataforma para eventos ilegales, fraudulentos, o que promuevan violencia o discriminación.',
        ]} />
      </Seccion>

      <Seccion n={5} titulo="Pagos">
        <p>
          Los pagos de boletas ocurren directamente entre Asistente y Organizador: a través de
          Mercado Pago (bajo los términos de Mercado Pago) o mediante transferencia Bre-B a la
          llave del Organizador. GESTEK no custodia ese dinero ni es parte de la transacción.
          Los precios, impuestos y facturación de las boletas son responsabilidad del Organizador.
        </p>
      </Seccion>

      <Seccion n={6} titulo="Contenido de los usuarios">
        <p>
          Conservas la propiedad del contenido que subes (textos, imágenes, logos, documentos).
          Nos otorgas una licencia limitada, no exclusiva y gratuita para alojarlo y mostrarlo
          únicamente con el fin de prestar el servicio (por ejemplo, publicar la página de tu
          evento). Garantizas que tienes los derechos sobre ese contenido y que no infringe
          derechos de terceros. Podemos retirar contenido que viole estos términos o la ley.
        </p>
      </Seccion>

      <Seccion n={7} titulo="Asistente de IA (Gestbot)">
        <p>
          Gestbot genera contenido y sugerencias de forma automatizada. Aunque procuramos su
          calidad, puede contener errores: revisa siempre la información antes de publicarla o
          tomar decisiones con base en ella. Las conversaciones se procesan a través de
          proveedores de IA conforme a la Política de Privacidad.
        </p>
      </Seccion>

      <Seccion n={8} titulo="Propiedad intelectual y marca blanca">
        <p>
          La plataforma, su código, diseño y marcas son propiedad de GESTEK o de sus licenciantes.
          La funcionalidad de marca blanca permite al Organizador presentar sus eventos bajo su
          propia identidad visual; ello no transfiere derechos sobre la plataforma.
        </p>
      </Seccion>

      <Seccion n={9} titulo="Disponibilidad y garantías">
        <p>
          Prestamos el servicio "tal cual", con esfuerzos razonables de disponibilidad y soporte.
          No garantizamos operación ininterrumpida ni libre de errores; podemos realizar
          mantenimientos programados. Dependemos además de servicios de terceros (hosting, pagos,
          correo, IA) cuya indisponibilidad puede afectar temporalmente funciones de la plataforma.
        </p>
      </Seccion>

      <Seccion n={10} titulo="Limitación de responsabilidad">
        <p>
          En la máxima medida permitida por la ley, GESTEK no responde por daños indirectos,
          lucro cesante o pérdida de datos derivados del uso de la plataforma, ni por hechos del
          Organizador frente a sus Asistentes (cancelación del evento, reembolsos, calidad del
          evento). Nada en estos términos limita responsabilidades que por ley no puedan limitarse,
          ni los derechos de los consumidores bajo el Estatuto del Consumidor colombiano.
        </p>
      </Seccion>

      <Seccion n={11} titulo="Terminación">
        <p>
          Puedes eliminar tu cuenta cuando quieras desde Ajustes. Podemos suspender o terminar el
          acceso ante incumplimientos graves de estos términos, con aviso cuando sea razonable.
          Tras la terminación, aplicarán los plazos de conservación descritos en la Política de
          Privacidad.
        </p>
      </Seccion>

      <Seccion n={12} titulo="Ley aplicable y contacto">
        <p>
          Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia
          se someterá a los jueces competentes de Colombia, sin perjuicio de los mecanismos de
          protección al consumidor. Contacto:{' '}
          <a className="text-primary-light hover:underline" href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a>.
        </p>
        <p>
          Podremos modificar estos términos; publicaremos la versión vigente en esta página y
          avisaremos los cambios sustanciales dentro de la plataforma.
        </p>
      </Seccion>
    </LegalLayout>
  );
}
