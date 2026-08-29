# GESTEK · Qué falta, repartido en frentes que no se pisan

Escrito el 29 de agosto de 2026, después de repasar la hoja de requisitos
actualizada y de comprobar **en el código** qué existe ya. Varias cosas de la
lista estaban hechas; están marcadas abajo para no volver a pagarlas.

La división no es por tamaño: es por **qué archivos toca cada frente**. Dos
sesiones en frentes distintos no chocan al hacer merge. Dos sesiones en el
mismo frente sí, y por eso están separados así y no de otra manera.

---

## 0 · Antes de nada: lo que está roto hoy

**Los dos escáneres de canje fallan en producción.** El frontend desplegado
llama por POST y el backend desplegado sólo tiene GET. Medido contra Render:
POST devuelve 401, GET devuelve 200. Escanear una escarapela para dar puntos
—lo que se enseña en un pitch— no funciona ahora mismo.

El arreglo ya está en la rama. **Hay que desplegar los dos repositorios a la
vez**: sólo el frontend, sobre un backend viejo, lo rompe en más sitios.

---

## 1 · Lo que ya estaba hecho (comprobado en el código, no en un documento)

Para que nadie lo vuelva a empezar:

| Pedido | Dónde está |
|---|---|
| Descargar la imagen del QR de la boleta | `lib/qrPng.jsx`, en `/mi-ticket` y tras el registro |
| Descargar la tarjeta de ingreso entera | `lib/tarjetaPng.jsx` — dibujada en canvas, probada en navegador |
| Usar el enlace de la empresa para los QR | `lib/enlacesPublicos.js` · `baseDelEvento` |
| Entrada y salida de personas por zonas | `ticket_movimientos` con `tipo` y `zona_id` |
| Limpiar el aforo sin perder el histórico | `zona_cortes` — marca un corte y cuenta desde ahí |
| Reportar aforo superior al permitido | Se avisa y se registra; **no bloquea** el ingreso, a propósito |
| Registro sin salir de la web (modal) | `public/widget.js` + iframe, 7 pruebas en Chromium |
| Personalización de botones de registro | Panel con vista previa en `PublicacionSection.jsx` |

---

## FRENTE A · Migración a servidor propio

**Archivos:** `db/migraciones/`, `core/`, `modules/`, `config/` del backend.
**No toca:** nada del frontend. Se puede correr en paralelo con todo lo demás.

Es el frente más largo y el más secuencial: cada paso depende del anterior.
No conviene partirlo entre dos personas.

1. Correr `db/migraciones/generar-esquema-mysql.sql` contra Postgres y guardar
   la salida como `003_esquema.sql`.
2. Traducir a mano las 4 vistas. **`perfiles_publicos` no puede faltar**: es la
   que cerró la lectura anónima de datos personales.
3. Script de carga: 829 campos, `timestamptz`→UTC, 8 arreglos→JSON.
   Colación **`utf8mb4_0900_as_ci`**, no `ai_ci` — si no, «José» y «Jose»
   chocan donde hoy conviven.
4. Reescribir en código los 9 disparadores y las 7 funciones RPC. Los dos que
   **cuentan** (cupo del stand, inscritos por sesión) necesitan transacción y
   `SELECT ... FOR UPDATE`, o el aforo se pasa de largo el día del evento.
   `canjear_recompensa` en una sola transacción, o se canjea dos veces lo mismo.
5. Prueba fila a fila entre las dos bases, **antes** del corte.
6. Importar la base de datos antigua al servidor nuevo.
7. Crear la base MySQL en cPanel y desplegar los servicios (`CONFIGURAR.md`).

**Regla que manda sobre este frente:** Supabase **no se apaga** hasta que todo
lo nuevo esté conectado y probado. Hay un pitch. `AUTH_PROPIA` y
`ARCHIVOS_PROPIOS` se quedan apagados; ya lo están por defecto.

---

## FRENTE B · El editor de landing y la exportación

**Archivos:** `src/pages/events/editor/**` (`blocks.jsx`, `PageBuilder.jsx`,
`ExperienceBuilder.jsx`, `ExportIframeModal.jsx`), `public/widget.js`.
**No toca:** el workspace del evento ni la página pública.

Es el frente con más diseño por delante y el que más se beneficia de tener una
sesión entera dedicada.

### B1 · Modo desarrollador de la landing

Hoy hay 21 tipos de bloque (`BLOCKS` en `blocks.jsx`) y **ninguna forma de
escribir código**. La idea es que quien sepa pueda hacerlo, y que Claude pueda
armar una página por MCP llamando a las funciones.

Lo que hay que decidir antes de escribir nada, porque cambia todo lo demás:

- **Qué se ejecuta.** Meter HTML libre en la landing pública es una vía directa
  a XSS: el bloque lo escribe el organizador, pero lo ve todo el público, y un
  `<script>` ahí corre con el origen del evento. Las tres salidas razonables
  son (a) HTML saneado sin scripts, (b) un DSL propio en JSON que el
  renderizador interpreta, (c) el código dentro de un iframe con `sandbox`.
  **La (b) es la que hace posible lo de Claude por MCP** — un esquema JSON es
  algo que un modelo puede generar y validar; HTML libre no se puede validar.
- **Qué funciones se exponen.** Si Claude va a "llamar las funciones", esas
  funciones tienen que ser un contrato estable y documentado, no los internos
  del editor. Es una API pública en la práctica.

**Entregable de este bloque antes de programar:** el contrato. Qué bloques,
qué props, qué valida el servidor. Sin eso, lo que se escriba se tira.

### B2 · Exportación granular

Hoy `ExportIframeModal` exporta **una sección entera como iframe**, y nada más.
Lo pedido es poder elegir:

- el bloque completo, con fondo;
- el bloque **sin fondo**, para meterlo en la web del cliente;
- **sólo el botón** de ese bloque.

Y no sólo como iframe: también como algo que se pueda incrustar sin marco
(el `widget.js` ya hace esto para el botón de registro — es el patrón a seguir
y ya tiene sus 7 pruebas).

Ojo con una cosa medida y que conviene no perder: **el pago no puede ir en un
iframe**. Las pasarelas redirigen a su dominio y el 3-D Secure no funciona
dentro de un iframe ajeno. Al pagar se abre una pestaña. No es cómo está
hecho: es cómo funcionan las pasarelas.

---

## FRENTE C · El espacio del evento: zonas, mapa, calendario y stands

**Archivos:** `src/pages/events/workspace/**`, `MapaSection.jsx`,
`AforoSection.jsx`, `components/aforo/`, `routes/sesiones.js`, `lib/aforoZonas.js`.
**No toca:** el editor de landing ni el formulario público.

Es el frente más "de producto": son varias piezas que ya existen y no se
hablan entre sí.

### C1 · Mover dos secciones de sitio

`Aforo por zonas` y `Stands y puntos` están hoy bajo **Asistentes**, y son de
**Espacio del evento**. El movimiento es barato (`EventWorkspace.jsx`, la
lista de `tabs`) pero hay que dejar las direcciones viejas redirigidas: ya
existe el mecanismo `REUBICADAS` en ese mismo archivo, hecho justo para esto
cuando se fusionó Dinámicas.

### C2 · Conectar zona ↔ calendario ↔ mapa ↔ aforo

Hoy son cuatro cosas separadas que hablan de lo mismo. Lo pedido, con el
ejemplo que lo explica: una zona «Sala de teatro» tiene un aforo, tiene un
sitio en el mapa, y tiene sub-eventos que ocurren en ella. Al tocar esa zona
en el mapa debería salir **qué hay ahora, qué viene después, y cuánta gente
hay dentro**.

**Casi todo lo de base ya existe.** Comprobado antes de escribir esto, porque
la primera versión de este plan daba por hacer trabajo que ya estaba:

- `zonas` viven en `page_json.zonas` con id estable.
- **`agenda_sessions.zona_id` ya existe** (migración 0080, «Un sub-evento
  pertenece a una zona»), con su índice y con el relleno que emparejó lo ya
  escrito. Y quien consulta busca por id **y** por nombre, así que un
  sub-evento viejo con la ubicación bien escrita sigue apareciendo.
- `aforo_zonas(p_evento)` devuelve la ocupación viva por zona.
- `aforo_zonas_serie` y `aforo_zonas_estancia` dan la curva del día y cuánto
  se queda la gente. **Ninguna de las dos se está usando.**
- `MapaSection` ya pinta las zonas sobre el plano con su ocupación.

Así que esto **no es construir, es enlazar**. Lo que falta:

1. Que al crear un sub-evento se **elija la zona de una lista** en vez de
   escribir el sitio a mano — la columna está, la interfaz no.
2. La **ficha de zona**: al tocar una zona en el mapa, qué hay ahora, qué
   viene después y cuánta gente hay dentro. Las tres consultas ya existen.
3. Que crear una zona ofrezca **ponerla en el mapa** ahí mismo, en vez de
   obligar a ir a otra pantalla a buscarla.

### C3 · Nutrir «Estancia y puntos»

Hoy muestra el nombre y una foto pequeña, y poco más. Se va a llamar desde el
mapa, así que tiene que aguantar que la miren. Antes de rediseñar conviene
mirar qué datos hay ya: `aforo_zonas_estancia` devuelve minutos promedio,
máximo y cuántos tramos se midieron —ese último número está a propósito, para
que el promedio se pueda leer con contexto— y no se está usando.

### C4 · Separar «crear stands» de «dar puntos / canjear / motivos / historial»

Son dos trabajos distintos con dos públicos distintos: montar los stands es
configuración, previa al evento; dar puntos y canjear es operación, durante el
evento y muchas veces desde un móvil en la mano de otra persona.

**Mi sugerencia, y el porqué:** que **no** vayan a Credenciales ni a Tarjeta.
Esas dos son de la escarapela —el soporte—, y esto es de la mecánica de
puntos. Lo que propongo:

- **Espacio del evento → Stands**: crear el stand, su ficha, su cuota, su sitio
  en el mapa. Configuración.
- **Asistentes → Control de ingreso** (donde ya está el escáner): añadir ahí el
  escaneo de puntos y el canje. Es la misma acción física —escanear una
  escarapela— y hoy están en dos pantallas distintas obligando a la misma
  persona a cambiar de sitio según qué vaya a marcar.
- Los **motivos** son catálogo: van con la creación del stand.
- El **historial** es reporte: va con Reporte o con la ficha de cada stand.

---

## FRENTE D · El formulario de registro

**Archivos:** `FormularioTab.jsx`, `lib/formularioCampos.js`,
`event_form_fields`, `EventoPublicoPage.jsx` (el modal de registro).
**No toca:** el editor de landing ni el mapa.

### D1 · Preguntas condicionales

«Si vive en zona rural, se abren estas opciones; si urbana, estas otras.»

Hoy `event_form_fields` tiene `id, tipo, etiqueta, opciones, requerido, orden,
ticket_type_id, grupo, ayuda, buscable`. **No hay nada de condiciones.** Hace
falta una columna nueva —algo como `visible_si: { campo_id, operador, valor }`—
y que la validación del servidor la respete: si un campo está oculto por su
condición, exigirlo como obligatorio deja el formulario imposible de enviar, y
ése es el fallo clásico de esta función.

### D2 · Prellenado por cédula desde una base anterior

Tres cosas que van juntas:

1. **Subir la base de datos de eventos anteriores.** Formato, columnas, y qué
   hacer con los duplicados.
2. **Buscar por cédula al empezar el formulario** y rellenar lo que se sepa.
   Ojo: esto es un endpoint público que responde con datos personales a partir
   de un número de cédula. **Necesita límite de peticiones y pensar qué
   devuelve**, o es un extractor de datos personales — el mismo problema que
   ya tuvo `invitacion-pendiente`, que se podía enumerar y por eso ahora lleva
   `authLimiter`.
3. **Sugerir al organizador qué preguntas le faltan** para aprovechar la base
   que subió, y enseñar al asistente qué queda por rellenar mientras avanza
   entre pasos.

El campo `buscable` que ya existe en `formularioCampos.js` es el punto de
enganche natural para el punto 2.

---

## FRENTE E · Página pública del evento

**Archivos:** `EventoPublicoPage.jsx`, `components/public/EventChrome.jsx`.
**No toca:** nada del panel.

### E1 · Barra de navegación fija

**Comprobado en el código:** hay dos barras y sólo una es fija.

- La píldora de páginas **sí** es sticky (`sticky top-4 z-20`), pero además
  sólo se pinta cuando el evento tiene portada (`hasCover`).
- La barra con los enlaces que pediste —volver, Rueda de Negocios, Torneo,
  Espacio del evento, Ranking, Mapa, Compartir— está en un `div` con `mb-6` y
  **sin sticky**: se va con el scroll y no vuelve.

Así que la petición es real y el arreglo es pequeño, pero hay que decidir cómo
conviven las dos barras cuando ambas están fijas, y qué pasa en móvil, donde
dos barras fijas se comen media pantalla.

---

## FRENTE F · Correo y autenticación

**Archivos:** `lib/emailPlantillas.js`, `modules/auth/`, `config/env.js`.
**Bloqueado por credenciales**, no por código.

- **API de envío desde el correo del evento.** El motor está reescrito y la
  cola con reintentos existe; falta el proveedor. `POR-HACER.md` §1.1.
- **Servicio separado de autenticación** (usuario/contraseña y Google). El
  módulo está escrito y **apagado** (`AUTH_PROPIA`). Encenderlo pide cPanel y
  consola de Google, y **no antes del pitch**.
- **Aviso medido:** de los 29 usuarios, 10 entran por contraseña y 19 por
  Google (22 identidades OAuth). Los hashes bcrypt se migran solos; el OAuth
  hay que reconectarlo con el mismo `client_id` o esos 19 se quedan fuera con
  sus filas intactas.

---

## FRENTE G · pijaohub

**Bloqueado por información de producto, no por código.** No existe ningún
evento de pijaohub en producción: hacen falta fechas, lugar y tipos de entrada
para crearlo. Cuando eso llegue, el trabajo es crear el evento y su formulario,
y publicarlo en `pijaohub.festech.co` — que es el mismo camino de dominio
propio que ya usa `baseDelEvento`.

---

## Cómo repartirlo

Los frentes **A, B, C, D, E** no comparten archivos. Se pueden llevar en
sesiones distintas sin que el merge duela.

Lo único que los cruza es `page_json`, y ahí hay una trampa ya conocida: el
`PATCH` **mezcla por claves de primer nivel** desde la migración 0064, así que
mandar sólo tu clave no pisa la de otro. Si alguien reemplaza `page_json`
entero, vuelve el fallo de la marca que se borraba sola.

### Persona A

**Frente A** entero (migración a MySQL). Es lo más largo, lo más secuencial y
lo que no se puede partir. Si le sobra tiempo, **frente C2** —conectar zona,
calendario, mapa y aforo—, porque es donde más se toca la base.

### Persona B — lo que te toca

**Frente E** primero: es media hora y se ve en el pitch.

Después **frente C1 y C4**: mover las dos secciones y separar stands de
puntos. Son cambios de navegación, se ven enseguida y el mecanismo de
redirección ya existe.

Y luego **frente D**, que es el que más valor tiene de lo que queda sin
bloquear — las preguntas condicionales y el prellenado por cédula son las dos
cosas que más trabajo le ahorran a quien organiza.

**El frente B (editor y exportación) merece su propia sesión**, no un rato.
Empieza por escribir el contrato de bloques antes de tocar código: sin eso, lo
del modo desarrollador y lo de Claude por MCP no se sostienen.

### Lo que no depende de nosotros

Frentes **F** y **G**, más lo de la tabla de accesos de `CONTINUAR.md` §5:
SMTP, `MP_WEBHOOK_SECRET`, el egress de Supabase, y decir si la pasarela de
producción es real o de pruebas antes de recorrer el flujo de compra.
