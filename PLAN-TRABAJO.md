# GESTEK · Qué falta, repartido en frentes que no se pisan

Escrito el 29 de agosto de 2026, después de repasar la hoja de requisitos
actualizada y de comprobar **en el código** qué existe ya. Varias cosas de la
lista estaban hechas; están marcadas abajo para no volver a pagarlas.

**Actualizado el 1 de septiembre de 2026** (Sekkon0906): sección 2 nueva
—«Camino unitario»— con lo cerrado ese día y el backlog de aforo/reporte, y
avance anotado dentro de los frentes A y C.

**Actualizado el 2 de septiembre de 2026** (Sekkon0906): sección 3 nueva con la
**auditoría del proyecto** —qué está duplicado, muerto o desconectado, con
archivo y línea—, y dos frentes nuevos que salen de ella: **Frente I · Zonas de
interés** (el «un solo lugar de administración» que se pidió) y **Frente J**
(la deuda que dejó la auditoría, incluido un bug que está fallando hoy en
producción).

La división no es por tamaño: es por **qué archivos toca cada frente**. Dos
sesiones en frentes distintos no chocan al hacer merge. Dos sesiones en el
mismo frente sí, y por eso están separados así y no de otra manera.

---

## 0-bis · El flujo de registro · 2026-09-02

**Prioridad máxima, dicho por Sekkon0906 con gente intentando registrarse en
ese momento.** Todo lo demás de este documento queda aparcado hasta que esto
esté cerrado.

### ✅ El botón de «Continuar» no se podía alcanzar en móvil

El síntoma reportado fue «el formulario activa `overflow: hidden` y no permite
hacer scroll para ver el botón de continuar». El `overflow: hidden` era real
pero **no era la causa**: era lo que quitaba la última salida.

La causa: `position: fixed; inset: 0` en un móvil abarca el viewport **grande**
—el que habría si las barras del navegador estuvieran escondidas— y lo que se
ve es el **pequeño**, unos 122 px menos en iOS Safari. La tarjeta se ancla
abajo (`items-end`), así que su borde inferior, donde está el botón, caía
detrás de la barra del navegador. Y `overflow-y-auto` de la tarjeta no
scrollea, porque el contenido no desborda la tarjeta: es la tarjeta la que
desborda la pantalla.

**Medido en navegador** con una barra de 122 px simulada y las clases reales
del componente:

| Variante | Botón | ¿Alcanzable? |
|---|---|---|
| `90vh` + overlay `inset-0` (lo que había) | se sale 98 px | ❌ |
| `90dvh` + overlay `inset-0` | se sale 98 px | ❌ **igual** |
| `90dvh` + overlay `alto-visible` | entra (666 ≤ 690) | ✅ |

La fila del medio importa: **el primer intento de arreglo fue cambiar sólo
`ALTO_MODAL` a `dvh`, y no servía de nada.** Acotar la tarjeta no ayuda si
sigue anclada al fondo de un overlay que abarca el viewport grande. Lo que hay
que acotar es el overlay.

Arreglado: `.alto-visible` en `index.css` (con `vh` de respaldo para
iOS < 15.4), el overlay pasa a `inset-x-0 top-0 alto-visible` con su propio
scroll de emergencia, `ALTO_MODAL` en `dvh`, y `env(safe-area-inset-bottom)`
para que el botón no quede bajo la barra de gestos.

**El camino incrustado (`public/widget.js`) NO tenía este fallo**, y por qué
conviene saberlo: centra la ventana en vez de anclarla abajo, el overlay ya
scrollea, y acota el iframe con `window.innerHeight`, que en iOS sí sigue al
área visible — al contrario que `vh`.

### ✅ El flujo de la aplicación · 2026-09-02

Pedido con una lista de síntomas. La causa de cada uno, medida en el código:

| Síntoma | Causa | Estado |
|---|---|---|
| «Siempre entra en la landing en vez del panel, pero al darle iniciar sesión entra bien» | `App.jsx` registraba `/` **sin ningún guard**, mientras `/login` y `/register` sí tenían `PublicOnlyRoute`. No era una carrera async: no había redirect | ✅ |
| «Al volver atrás desde un evento volvemos a la landing» | Los tres «Explorar eventos» de la página pública apuntaban a `/explorar`, que vive **fuera** del panel | ✅ ahora `/app/explorar` con sesión |
| «Parece otra página ajena; sale la vista de un usuario sin registrarse» | `EventoPublicoPage` **no consultaba `useAuth` en ningún punto**. Es marca blanca a propósito, pero para quien tiene cuenta era un callejón sin salida | ✅ enlace «Mi panel» |
| «Hay 2 navbar; Inicio/Expositores/FAQ debe ir arriba» | Dos barras fijas apiladas: la de salidas y la píldora de **páginas** del builder. La misma pregunta partida en dos filas | ✅ una sola barra |
| «Quitar el ocultar, el bot abajo, la mesa como borde, más pequeño» | El botón «Ocultar» era del acompañante (no del sidebar); medía 250×190 y flotaba con margen | ✅ 176×134, pegado al borde, sin botón |
| «Donde esté el gestbot en carga, pon el logo» | `PantallaCarga` repetía el personaje que ya vive en la barra lateral | ✅ logo; y el de la barra dice «Poniéndote en línea…» |
| «Gestbot del home debería ser Sugerencias de Gestbot y sin el bot» | — | ✅ |
| **El crash de vacantes** (`GLoader is not defined`) | `DetalleVacante.jsx` usaba `<GLoader>` sin importarlo | ✅ |

**Un hallazgo que vale más que su arreglo:** `eslint.config.js` tiene
`no-undef` puesta *exactamente* para esa clase de fallo —su cabecera enumera
tres incidentes previos— y **no la cazó, porque `no-undef` no mira dentro de
JSX**. Un componente inexistente en una etiqueta compila sin una queja y
revienta al pintar. Se revisó el proyecto entero: no hay más. Cerrarlo de
verdad pide `eslint-plugin-react` y su regla `react/jsx-no-undef`, que lo hace
por AST en vez de por texto.

### Lo que queda del flujo de registro, en auditoría

Pedido: «todo el flujo de registro debe quedar bien, desde la creación de
boletas, el ponerlas en la landing, el poder exportar las boletas, y que al
momento de exportar todo funcione». En curso.

### FRENTE K · Vacantes — ⚠️ era mucho menos de lo que parecía

**Lo primero que se hizo fue mirar qué existe, y eso cambió el tamaño del
trabajo.** Casi todo estaba construido y sin conectar:

| Lo pedido | Estado real |
|---|---|
| «Poder dejar la CV» | **Ya existía.** `PerfilTalentoEditor` la sube a Storage (`cv_url`, `cv_nombre`) y viaja en el `perfil_snapshot` al postularse |
| «Responder las preguntas» | **Ya existía** en `DetalleVacante` |
| «La empresa agenda una reunión, por Meet o donde prefiera» | **Ya existía**, y completo: `POST …/entrevista` con **Google Calendar integrado** (`lib/googleCalendar.js`) y respaldo de enlace manual, aviso al candidato y salto de etapa |
| Que el candidato vea su reunión | **Ya existía**: `MisPostulaciones.jsx:52`, con fecha y enlace |
| Requisitos de la vacante | ❌ la columna existía en la base, en `SEL_VACANTE` **y** en `CAMPOS_VACANTE`, y nadie la escribía ni la pintaba |
| «Hacer preguntas» (candidato → empresa) | ❌ no existe en ninguna capa |

**✅ Hecho el 2026-09-02:**

- **Los requisitos.** El único sitio donde se pedían era el *placeholder* de la
  descripción («horarios, requisitos generales»): metidos a mano dentro de un
  párrafo. Ahora son una lista en el formulario del organizador y una lista en
  la vista del candidato. Aparte de la descripción a propósito — un párrafo se
  lee en diagonal; una lista de requisitos se compara consigo mismo.
- **«Lo que envías».** El pie decía «Necesitas un perfil de talento…», un aviso
  genérico que no decía si lo tenías ni si tu hoja de vida iba dentro. Y va
  dentro. Ahora se lista, con el nombre del archivo y enlace para abrirlo; si
  falta, lleva a subirla. Una promesa pasa a ser una comprobación.

**Queda una sola decisión, y es la de «hacer preguntas»:** es una conversación,
y el proyecto ya tiene canales de chat (`routes/chat.js`). **Antes de construir
una bandeja nueva hay que decidir si un canal por postulación encaja.** Es lo
único de este frente que no existe en ninguna capa.

**Corrección al §3.5:** la migración `0081` **no** bloquea nada de la CV. Borra
`foto_url`, `telefono` y `ciudad` de `perfil_talento`; `cv_url` y `cv_nombre`
no los toca. Sigue pendiente por ser `DROP COLUMN` irreversible, no por esto.

### Redacción original del frente, para contexto

**Pedido el 2026-09-02.** «El apartado de vacantes no está sirviendo. Sería
pertinente mejorar la creación de este, que todo sea más profesional, poder
dejar la CV, cosas importantes. Y en la vista de la persona que quiere
postularse, que pueda responder las preguntas, agregar CV, hacer preguntas. Y
ya la empresa lo que hace es agendar una reunión para formalizar todo, ya sea
por Meet o donde prefiera la empresa.»

Es rediseño, no un arreglo, así que **no se toca sin diseñar antes** — la
lección del botón de móvil de hoy: la primera hipótesis obvia no servía.

**Qué hay ya, comprobado:** `pages/vacantes/DetalleVacante.jsx` (modal de
postulación, con `preguntas` y un `mensaje` libre), `api/vacantes.js`
(`ETAPAS_VACANTE`, `formatoPago`), el perfil de talento (`perfil_talento`) que
se crea al postularse por primera vez, y `VacantesTab.jsx` en el panel.

**Las cuatro decisiones que hay que tomar antes de escribir código:**

1. **La CV.** ¿Un archivo por postulación o uno en el perfil de talento que se
   reutiliza? Ya existe `src/lib/archivos.js` con `TIPOS_CV`/`MAX_CV` y un
   `PerfilTalentoEditor` que lo sube. Reusar el del perfil es más barato y
   evita que la misma persona suba diez copias; adjuntar por postulación
   permite adaptar la CV a la vacante. **Ojo:** la migración `0081` —pendiente—
   borra columnas de `perfil_talento`, así que esta decisión y esa migración
   son la misma conversación.
2. **Las preguntas.** Hoy son texto libre (`input`). ¿Se les da tipo —opción
   múltiple, sí/no, número, archivo— como ya tiene el formulario de registro
   (`lib/formularioCampos.js`, con `visible_si` y todo)? **Reutilizar ese
   motor** en vez de escribir un segundo sistema de preguntas es lo correcto:
   ya está probado y ya sabe validar en servidor.
3. **Preguntas DEL candidato.** «Hacer preguntas» es una conversación, y eso
   ya existe en el proyecto: `routes/chat.js` con sus canales. Antes de
   construir una bandeja nueva hay que ver si un canal por postulación encaja.
4. **La reunión.** «Meet o donde prefiera la empresa» son dos cosas muy
   distintas: integrar Google Calendar de verdad (ya hay
   `lib/googleCalendar.js` y `routes/google.js`, con OAuth) o **sólo guardar un
   enlace y una hora** que la empresa pega a mano. Lo segundo funciona el
   primer día y no depende de credenciales de nadie; lo primero es una
   integración con su propio mantenimiento. **Recomendación: empezar por el
   enlace pegado a mano**, y dejar la integración para cuando se pida.

**Entregable antes de programar:** las cuatro respuestas. Sin ellas, lo que se
escriba se tira.

### FRENTE L · El workspace del evento ya habla inglés — ✅ Hecho el 2026-09-02

`EventWorkspace.jsx` y `ResumenSection.jsx` no importaban `useI18n` en
absoluto. **63 claves nuevas** (864 en el diccionario): las 46 etiquetas de
sección y pestaña, los KPIs del resumen, los títulos de las tarjetas, los
estados vacíos y las sugerencias de Gestbot.

**Dos trampas que tenía este trabajo, por si vuelve a aparecer el patrón:**

1. **`t` estaba ocupado.** Las pestañas se recorrían con `.map(t => …)`, así
   que declarar el `t()` del i18n lo habría tapado en silencio: `t.label`
   seguiría funcionando y `t('Resumen')` explotaría. Se renombraron a `tab`.
2. **`Contenido` es otro componente**, no una parte del primero. Envolver ahí
   un texto en `t()` dejó dos `t` sin definir — y **esta vez el linter sí lo
   cazó**, porque son llamadas a función y no etiquetas JSX. Es exactamente la
   diferencia que dejó pasar el `<GLoader>` de vacantes (§0-bis).

Las frases con número usan `{n}`/`{pct}`, que `t()` interpola, y **el plural se
elige en el componente**: `tarea${n>1?'s':''}` no se puede traducir porque el
inglés no lo forma en el mismo sitio. Son dos claves, no una con parches. Las
fechas y los miles también siguen a `lang` — estaban clavados en `es-CO`.

Las traducciones no son literales donde eso ayuda: «Accesos e ingresos» es
*Doors and entries* y no *Access and entries*, porque lo que se configura ahí
son puertas; «Stands» es *Booths*; y «Tarjeta» es *Wallet card* para que no se
confunda con una tarjeta de pago.

### Aparcado por esto (retomar después)

- **Frente I fase 5** — el marcador de mapa compartido. Era lo siguiente.
- **Frente J.3** — que existan dos rutas para crear un expositor. El bug de
  datos que escondía (nacían invisibles para el público) ya está arreglado;
  unificar las rutas sigue pendiente y es decisión de producto.
- **Frente J.4-J.6** — `oauth_barrer`, `StatCard`/`BarraProgreso`, limpieza.
- **Migración `0083`** — ✅ **aplicada el 2026-09-02.** Medido antes y después:
  tocó **1 fila de 33**, quedó 1 con `wallet.variantes`, 1 conserva
  `credenciales` (la red de vuelta) y 0 pendientes.
- **Migración `0081`** — **no aplicar todavía, a propósito.** Es `DROP COLUMN`
  sobre datos de persona en `perfil_talento`: irreversible. Y toca justo la
  tabla que el **Frente K** va a rediseñar, así que decidirla antes de saber
  qué necesita el perfil de talento es decidir a ciegas.

---

## 0 · Antes de nada: lo que está roto hoy

**Los dos escáneres de canje fallan en producción.** El frontend desplegado
llama por POST y el backend desplegado sólo tiene GET. Medido contra Render:
POST devuelve 401, GET devuelve 200. Escanear una escarapela para dar puntos
—lo que se enseña en un pitch— no funciona ahora mismo.

El arreglo ya está en la rama. **Hay que desplegar los dos repositorios a la
vez**: sólo el frontend, sobre un backend viejo, lo rompe en más sitios.

**✅ Verificado el 2026-09-01:** en el código actual de `main` (ambos
repos) las dos rutas de canje y sus dos llamadores usan POST — no hay
mismatch. `routes/interacciones.js:292` y `routes/expositor.js:263`, con un
comentario explícito de por qué es POST (no filtrar `qr_token` en logs de
acceso). Si sigue fallando en producción es porque **lo desplegado en Render
está desactualizado**, no un problema de código.

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

## 2 · Camino unitario · tareas que puede tomar cualquiera de los dos

A diferencia del reparto A/B del final (servidor vs código), esto son tareas
que **no dependen de cPanel y no se pisan entre sí**. Cualquiera de los dos
desarrolladores las puede tomar. La columna «Quién · cuándo» se rellena al
cerrarlas, con el nombre de quien la hizo y la fecha.

### Hecho

| Tarea | Frente | Quién · cuándo | PR |
|---|---|---|---|
| La lista del selector buscable ya no cae **detrás** del campo siguiente en el registro incrustado (`_both` de la animación de paso dejaba un `transform` pegado que creaba contexto de apilamiento) | D · modal de registro | Sekkon0906 · 2026-09-01 | frontend #21 |
| Índice `torneo_categorias_unica_hija` compilable en MySQL: va sobre `nombre` (TEXT) y MySQL no lo indexa sin prefijo (error 1170) → columna generada, igual que el caso raíz. `db/esquema/02` y `db/migraciones/003` quedan idénticos | **A · los 8 índices parciales a mano** | Sekkon0906 · 2026-09-01 | backend #18 |
| «Accesos e ingresos» movido de **Asistentes → Espacio del evento** (puertas y zonas son DÓNDE, no quién). Mismo patrón que aforo/stands: `REUBICADAS` para los enlaces viejos | **C1** | Sekkon0906 · 2026-09-01 | frontend #22 |
| Revisión de los artefactos de la fase 6 ya subidos (`db/esquema/`, `scripts/comparar-bases.js`, `modules/contadores/`). Hallazgos anotados abajo en el frente A | **A · pasos 3–5** | Sekkon0906 · 2026-09-01 | — revisión, sin PR |
| Fix del bug de documento del padrón previo (columna se buscaba en minúscula exacta) + aviso de UUIDs en vez de cédulas al subir el archivo | D · prellenado por cédula | Sekkon0906 · 2026-09-01 | backend #19, frontend #24 |
| Fase 1 (Camino unitario): quitar el modelo de incidente del aforo, dos links stale corregidos, guardar puertas/zonas por fila en vez de un botón global, borrar persiste al momento | **C · fase 1** | Sekkon0906 · 2026-09-01 | backend #20, frontend #25 |
| Fase 2: reporte manual de aforo con foto de evidencia y nota, sin resetear el contador (migración 0087 ya aplicada en Supabase — verificada contra 0 filas antes de aplicar) | **C · fase 2** | Sekkon0906 · 2026-09-01 | backend #20, frontend #25 |
| Fase 3: cron del reporte automático de aforo (mínimo 60 min, configurable por evento) | **C · fase 3** | Sekkon0906 · 2026-09-01 | backend #21, frontend #26 |
| Fase 4: tabla «qué actividad llena cada zona», cruzando los reportes contra la agenda. Hallazgo sin resolver: hay tres implementaciones de mapa en vivo sin compartir componente — consolidarlas es su propia sesión | **C · fase 4** | Sekkon0906 · 2026-09-01 | frontend #26 |
| Duplicado quitado: el editor del mapa tenía su propio «+ Crear zona», una segunda forma de crear lo que ya se crea en Accesos e ingresos | **C1** | Sekkon0906 · 2026-09-01 | frontend #25 |
| Hasta 3 fotos por stand (`galeria`, ya existía desde la 0057 pero no llegaba al directorio/mapa públicos) + logo más grande en la tarjeta del panel | — pedido nuevo, fuera del plan original | Sekkon0906 · 2026-09-01 | backend #22, frontend #27 |
| Fuga del embed: `/embed/<slug>/<sección>` pedía el evento completo y filtraba en el navegador — el resto de la landing viajaba igual, sólo sin dibujarse. La sección se resuelve ahora en servidor | — pedido nuevo | Sekkon0906 · 2026-09-01 | backend #23, frontend #29 |
| Un stand sabe en qué zona del plano está (`zona_id`, migración 0088, sin backfill a propósito) | — pedido nuevo, fuera del plan original | Sekkon0906 · 2026-09-01 | backend #24, frontend #30 |
| 5 bugs del código dormido de Frente A (cobertura de `comparar-bases.js`, clave natural, falso DIFIERE en decimales, `canjearRecompensa` con premio gratis y sin saldo previo, preámbulo SQL que faltaba) | **A** | Sekkon0906 · 2026-09-01 | backend #25 |
| Zona como centro de mando: tocar una zona ya muestra también sus stands (`standsPorZona`, que existía sin usarse), en el tablero en vivo y en el mapa público | **C2/C3** · pedido nuevo | Sekkon0906 · 2026-09-01 | backend #26, frontend #31 |
| E1, pulido: la píldora de páginas mide con `ResizeObserver` la altura real de la barra de arriba en vez de un `top-[72px]` fijo, que se desalineaba en móvil con los enlaces envueltos | **E1** | Sekkon0906 · 2026-09-01 | frontend #32 |

### Backlog · aforo, mapa y «tomar reporte» (frente C)

Diseño cerrado con Sekkon0906 el 2026-09-01. Reutiliza lo que ya existe: los
**cortes de `zona_cortes`** como almacén (ya alimentan `zonas/reporte`), el
endpoint `mapa/vivo` (zonas + puertas + sesiones en una llamada) y
`agenda_sessions.zona_id` (migración 0080). El reporte manual lleva **foto de
evidencia**; el automático lo marca cada evento con **cadencia mínima de 1 h**.

**Fase 1 — quitar el modelo de «incidente» + botón por ítem.** Sólo frontend +
un ajuste chico de backend. Sin migración.
- `alertarAforo` (`routes/clientes.js`) deja de crear la alerta «resuelve esto»
  cuando una zona se pasa de aforo. Se quedan el aviso al owner y el disparo de
  automatización `aforo_lleno`. El exceso se ve en rojo en el tablero y punto —
  pasarse de aforo es un dato, no un incidente que resolver.
- Arreglar el botón «Resolver» que no responde, y el link stale
  `s=asistentes&t=aforo` (aforo ya está en `espacio`).
- Cada puerta y cada zona con su **propio botón de crear/guardar**; fuera el
  «Guardar accesos» global; borrar persiste al momento. El `PATCH` mezcla
  `page_json` por clave (0064), así que guardar sólo `accesos` no toca `zonas`.

**Fase 1 — ✅ hecha el 2026-09-02.** Al medirla, casi todo ya estaba:
`alertarAforo` hace tiempo que no abre una fila de incidente, el botón
«Resolver» tiene su endpoint y Accesos guarda por fila. **Lo que sí seguía mal
eran los enlaces de los avisos**, y de una forma que no da error: tres
notificaciones apuntaban a pantallas que ya no existen con ese nombre y
**dejaban al organizador en el Resumen**. La peor no era de la reagrupación del
menú — `?s=vacantes` **nunca** fue una sección, siempre fue una pestaña, así que
el aviso de que alguien se postuló no ha llevado nunca a las vacantes. Lo
vigila ahora `tests/menu.test.mjs`, que mira también el repo del backend.

**Fase 2 — «Tomar reporte» manual.** Migración aditiva + endpoint + subida de foto.
- `zona_cortes` gana `tipo` (`reset` | `auto` | `manual`), `foto_url`, `nota` y
  `contexto` jsonb: ocupación de cada zona + qué sesión de agenda estaba
  corriendo en ese instante (por hora + `sesiones_en_zona`).
- Botón en Aforo por zonas → corte `manual` con foto (mismo Storage que las
  fotos de formulario) y nota. Sin límite de cuántos.
- `page_json.aforo.reporte_cada_min`: cadencia del automático, elegida por
  evento; **mínimo 60**, opciones 15/30/60.

**Fase 3 — el cron.** Patrón de `scripts/cron-*` (ya hay `cron-cola`, `cron-recordatorios`).
- Job que, **sólo dentro de la ventana del evento**, escribe un corte `auto` a
  la cadencia configurada.

**Fase 4 — el estudio + rematar el mapa.** Frente C2/C3.
- Vista que cruza cortes ↔ agenda: «mientras corría *Keynote IA*, zona gamer
  110 %; durante *Networking*, 40 %» → qué actividades atraen. En la pestaña
  Reporte de Aforo.
- Auditar `MapaSection` / `MapaAforo` contra `mapa/vivo` para que cada marcador
  (zona, puerta, sub-evento, expositor) tire del mismo estado vivo y enlace a
  su tablero.

---

## 3 · Auditoría del 2026-09-02 · qué está duplicado, muerto o desconectado

Pedida por Sekkon0906 con esta frase: «hay varias zonas donde se crean aforos,
se crean zonas, se crean de muchas maneras las mismas cosas». Se comprobó en el
código de los dos repos, no en documentos. **La sospecha se confirma, y el peor
caso no era el de las zonas.**

Cada hallazgo lleva su archivo y línea para que nadie tenga que volver a
buscarlo. Los que ya tienen tarea propia apuntan al frente correspondiente.

### 3.1 · Lo que se crea o edita desde más de un sitio

| Qué | Dónde 1 | Dónde 2 | Gravedad |
|---|---|---|---|
| **Expositor / stand** | `StandsTab.jsx:105-272` → `POST/PATCH/DELETE /eventos/:id/expositores` (`routes/networking.js:491`) | `NetworkingTab.jsx:206-372` → `POST/DELETE /eventos/:id/networking/expositores` (`routes/networking.js:592`) | **Alta.** Dos pantallas, **dos endpoints distintos**, la misma tabla `networking_expositores`. El de Networking no tiene `PATCH`: un expositor creado en «Rueda de negocios» **no se puede editar** sin ir a Stands. El de Stands acepta `zona_id`, `galeria`, `sitio_web`; el otro no. |
| **Zona de aforo** | `AccesosSection.jsx:105-164` (alta, nombre, aforo, borrado) | `MapaSection.jsx:384-393` edita `nombre` y `aforo_max` desde el marcador, y guarda por su propio PATCH (`:150`, tras el flag `zonasTocadas`) | Media. El flag evita el choque, pero son dos formularios y dos caminos de escritura para el mismo array. **Lo arregla el Frente I, fase 0.** |
| **Selector `<select>` de zonas** | `SessionForm.jsx:52-53` | `StandsTab.jsx:115-116` (su comentario admite «mismo filtro que el formulario de sub-eventos») y `CheckinTab.jsx:61`, que lee `page_json.zonas` **crudo, sin el filtro** | Baja, pero es una inconsistencia real: la tercera copia muestra zonas sin id o sin nombre. |

### 3.2 · El mapa está escrito tres veces

- `MapaSection.jsx` (editor: sube plano, arrastra marcadores) — su propio
  `Marcador`/`CirculoMarcador`, líneas 236-313.
- `components/aforo/MapaAforo.jsx` (tablero en vivo) — su propio render,
  líneas 162-193. Exporta `nivelDeZona`, `calorDeZona`, `estaEnLlamas`.
- `editor/blocks.jsx:1274+` (`MapaEventoPreview`, el mapa público) — tercer
  render completo, líneas 1309-1385, **sin importar** los helpers de nivel de
  `MapaAforo.jsx`: los reimplementa.

Lo único compartido hoy entre las tres es `components/aforo/LlamaZona.jsx`. El
«dibuja un marcador según su tipo, color y valor» —unas 80-120 líneas por
archivo, con las mismas clases de Tailwind— es el mismo problema resuelto tres
veces. **Lo aborda el Frente I, fase 5.** Lo que NO hay que fusionar: editar
posición vs. sólo lectura vs. modal público son tres comportamientos distintos
y deben seguir siéndolo.

### 3.3 · Un bug activo, en producción — ✅ arreglado el 2026-09-02

**El buzón de sugerencias devolvía 404 siempre.** `src/api/sugerencias.js:8-9`
llama a `/me/sugerencias` y esa ruta **nunca se escribió**: el backend sólo
tenía `/sugerencias/dinamica` (`routes/sugerencias.js`, montado en `/` y en
`/me` — `index.js:140,165`). Fallaba desde el 2026-08-12 en las dos pantallas
donde está puesto (`BuzonSugerencia.jsx:30`, desde `EventCreatePage.jsx:491` y
`VacantesTab.jsx:182`).

**La primera lectura de este hallazgo era equivocada, y conviene dejarla
escrita.** Parecía que faltaba el segmento `/dinamica` en el frontend —
arreglo de dos líneas. No: **el frontend estaba bien**. Son dos buzones
distintos, con dos tablas distintas:

- `sugerencias_catalogo` (migración 0063, ya en producción): «la lista se quedó
  corta». Una línea al lado del `<select>`, **sin mínimo de longitud** a
  propósito — quien escribe «feria de adopción» ya dijo todo lo que hacía
  falta.
- `sugerencias_dinamica` (0075): pedir una mecánica que no existe. Exige
  explicar cómo funciona (mínimo 40 caracteres), porque sin eso no se puede
  construir.

Apuntar el primero al endpoint del segundo lo habría roto: el cuerpo no pasa la
validación, y exigirle un párrafo a quien sólo quería avisar que falta una
opción es la forma segura de no recibir ninguna respuesta. La tabla estaba, el
formulario estaba; **faltaba la ruta de en medio**, y es lo que se escribió
(backend, 9 pruebas nuevas).

Queda una decisión de producto: `BuzonSugerencia.jsx` y
`components/eventos/PedirDinamica.jsx` son dos formularios para dos cosas
parecidas. Hoy los dos funcionan. Si se unifican, que sea por diseño y no
porque uno estaba roto.

### 3.4 · Piezas construidas y nunca conectadas

| Qué | Dónde | Estado |
|---|---|---|
| `components/ui/StatCard.jsx` | existe, con su clase `stat-card` en `index.css` | **Cero consumidores.** Mientras tanto, 18 pantallas reinventan su propia tarjeta de número (`ReporteTab`, `AnalyticsTab`, `ClientesTab`, `EquipoTab`, `TicketsTab`, `VacantesTab`, `ChatTab`, `NetworkingTab`, `CheckoutSection`…). |
| Editor de plantillas de correo | `routes/emails.js:160,198,226,243,266,347` (GET/PUT/DELETE catálogo, previsualizar, diagnóstico, envíos) | Seis endpoints sin una sola pantalla que los llame. El frontend sólo usa `prueba`, `enviar`, `cola`, `reintentarCola`. Decidir: conectar o borrar. |
| Bolsa y cuotas de expositores | `routes/networking.js:341,361,392` | Sin UI. Relacionado con la migración 0057. |
| `public.oauth_barrer()` | `db/migrations/0073:92-98` | **Nadie la llama.** La propia migración dice que el backend debería invocarla «en el mismo ciclo que ya corre cada quince minutos», y ningún `cron-*.js` la incluye: `oauth_codes`/`oauth_tokens` crecen sin límite. |
| Editar franja de expositor | `routes/expositor.js:328` (`PATCH`) | El frontend sólo crea y borra franjas. ¿Falta el botón «editar horario»? |
| `modules/aforo/consultas.js` | backend | Muerto **a propósito**: es la traducción a MySQL para el corte del Frente A. Su comentario ya lo dice. No tocar. |
| `ARCHIVOS_PROPIOS` | `core/config/index.js:108` | Apagada, y a diferencia de `AUTH_PROPIA` **no tiene ningún consumidor en el frontend**: encenderla hoy no cambiaría nada visible. Ninguna de las dos banderas está en los `.env.example`. |
| `src/lib/archivos.js:26,42,45` | `TIPOS_DOCUMENTO`, `ACCEPT_DOCUMENTO`, `MAX_DOCUMENTO` | El comentario del archivo dice que se extrajeron de `DocumentosSection.jsx` para reusarlas — y `DocumentosSection.jsx` nunca importa el módulo. Refactor a medias. |

### 3.5 · Cinco migraciones mentían en su cabecera — ✅ arreglado el 2026-09-02

**Siete** archivos decían «PENDIENTE DE APLICAR». Comprobado contra producción
(`information_schema` y un conteo sobre `eventos`, sólo lectura), la verdad era
otra:

| Estado real | Migraciones |
|---|---|
| **Aplicadas** — la cabecera mentía | `0079`, `0082`, `0084`, `0085`, `0087` |
| **Pendientes de verdad** | `0081`, `0083` |

Importa por lo de siempre en este proyecto: el backend no mira el error de
`supabase-js`, así que una columna que falta se ve como datos en blanco sin
aviso. Un comentario que dice «pendiente» cuando no lo está entrena a
desconfiar del único sitio donde se registra ese estado — y entonces el día
que una de verdad falte, nadie lo cree.

Las cinco cabeceras se corrigieron. Las dos pendientes quedaron anotadas con lo
que se midió, **sin aplicarlas**:

- **`0081`** borra columnas de datos de persona de `perfil_talento`, y
  `foto_url` sigue ahí. No rompe nada, pero **la intención de privacidad no
  está cumplida**. Y es `DROP COLUMN`: revertirla no devuelve los datos, así
  que antes hay que ver cuántas filas los tienen rellenos.
- **`0083`** migra `credenciales` → `wallet.variantes`, y la tienen **0 de 33
  eventos**. No rompe nada porque `walletVariantes()`
  (`src/lib/wallet.js:127`) traduce la forma vieja en caliente: **el fallback
  del código está haciendo el trabajo de la migración**. Aplicarla sigue siendo
  lo correcto —deja el dato en su forma nueva en vez de traducirlo en cada
  render—, pero no es urgente.

Las dos necesitan que alguien decida aplicarlas contra producción, y ninguna es
automática: la primera destruye datos y la segunda toca los 33 eventos.

### 3.6 · Basura de refactors anteriores

- **10 comentarios de sección huérfanos** (el header quedó, la función se fue a
  otro archivo): `StandsTab.jsx:367`, `AgendaLista.jsx:95`, `SalasGrid.jsx:85`,
  `SessionForm.jsx:330`, `AgendaTab.jsx:414`, `TorneoBracket.jsx:136`,
  `TorneoEquipos.jsx:284`, `TorneoLiga.jsx:145`,
  `TorneoPartidoModales.jsx:159`, `TorneoTab.jsx:302`. Todos son la huella del
  split de `AgendaTab`/`TorneoTab` en subcarpetas.
- **11 imports sin usar**: `CheckinTab.jsx:2`, `ClientesTab.jsx:7`,
  `EquipoTab.jsx:8`, `FormularioTab.jsx:1`, `StandsTab.jsx:3` (`leerQr` — del
  canje que se movió), `TareasTab.jsx:1`, `GestbotPage.jsx:5`,
  `CompletarPerfilPage.jsx:2`, `EventsListPage.jsx:10`,
  `EventoPublicoPage.jsx:4`, `ProductoPage.jsx:1`.
- **Un estado que nadie lee**: `AuthPage.jsx:440`, `checkingInvite` se asigna
  (`:481,483`) y no se usa en el JSX. Probablemente falta un spinner.
- **11 exports sin un solo consumidor** (verificados con `grep -rw` sobre el
  árbol completo, descartando la copia de `.claude/worktrees/`):
  frontend — `LlamaZona.jsx:18` `nivelZona` (sólo se menciona en su propio
  comentario; nació el 2026-09-01), `embed.js:98` `modoPublicacion`,
  `enlacesPublicos.js:35` `enlaceEvento`, `Badge.jsx:34` `RolBadge`,
  `Iconos.jsx:79` `NOMBRES_ICONO`, `CampoFormulario.jsx:51` `valorInicial`,
  `hojaCalculo.js:376` `esAfirmativo`, `archivos.js:43` `ACCEPT_DOCUMENTO`;
  backend — `agente.js:3496` `_TOOLS` y `:3497` `_seleccionar` (alias de debug;
  `routes/mcp.js` usa `agente.TOOLS` directo), `turnstile.js:7`
  `turnstileHabilitado`.
  **Ojo con el falso positivo:** `paletaImagen.js:14` `rgbAHex` aparece en
  listas de «muerto» pero se usa 3 veces dentro de su propio archivo — es
  export de más, no código muerto. Hay decenas de ese tipo en `lib/` de los dos
  repos (constantes de configuración exportadas y usadas sólo en casa);
  **no vale la pena tocarlas**, el riesgo supera al beneficio.
- **Sin barra de progreso compartida**: el mismo
  `<div className="h-2 rounded-full …">` a mano en `AccesosSection.jsx:313`,
  `AforoSection.jsx:313`, `AnalyticsTab.jsx:221`, `ImportarAsistentes.jsx:365`,
  `StandsTab.jsx:621`, `EventsListPage.jsx:388`, `MiTicketPage.jsx:322`.

### 3.7 · Nombres que engañan

- **`page_json.zonas` (espacio físico) vs. `ticket_types.zonas_acceso`**
  (`0001_init.sql:153`, `routes/tickets.js:22`): un `text[]` libre tipo
  `["general","vip"]`, **sin ningún vínculo** con los id de las zonas del
  recinto. La misma palabra para dos cosas que no se tocan. Es la trampa más
  fácil de pisar de todo el proyecto.
- **`clave` vs. `zona_id` vs. `id`**: tres nombres para el mismo
  identificador según la capa (`lib/aforoZonas.js:33` usa `clave` =
  `COALESCE(zona_id, zona)`).
- **`dentro` vs. `personas`**: son dos números distintos a propósito (uno
  incluye conteos manuales, el otro cuenta boletas únicas) y el nombre no lo
  delata. Está comentado en `modules/aforo/consultas.js:49-51`.
- **`mapa_zonas` vs. `mapa_aforo`** (`routes/eventos.publicos.js:563,581`): el
  segundo es formato legado mantenido en paralelo porque hay páginas
  publicadas que ya lo leen. Documentado, pero quien consuma la ficha pública
  tiene que saber que existen los dos.
- **`zonas/aforo` vs. `mapa/vivo`**: el segundo es superconjunto del primero, y
  los nombres no lo dicen. `AforoSection.jsx:61-67` necesita un fallback
  explícito entre ambos.

### 3.8 · Pestañas que hacen demasiado

`AgendaTab.jsx` tiene **dos niveles** de sub-pestañas anidadas: `view`
(`sessions | speakers`) × `subView` (`lista | dia | semana | mes | salas`) —
diez combinaciones dentro de una pestaña llamada «Calendario».
`StandsTab.jsx` mete cuatro trabajos (`stands | pasaporte | motivos |
historial`) en 638 líneas. `AforoSection.jsx` mezcla operar en vivo con
reportería. `CheckinTab.jsx` son 778 líneas con cinco modos — pero ése es
**deliberado y correcto** (C4): la acción física es una sola.

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

### Avance · Sekkon0906 · 2026-09-01

- **Paso 1 (índices parciales):** `torneo_categorias_unica_hija` de
  `003_esquema_indices_parciales.sql` no compilaba en MySQL 8 (índice sobre
  `nombre` TEXT, error 1170). Arreglado con columna generada; `db/esquema/02`
  y `db/migraciones/003` quedan idénticos. **backend #18.**
- **Pasos 3–5 (revisión de lo ya subido):** `db/esquema/` y los módulos de
  contadores están bien hechos y con pruebas. Pendientes encontrados:
  1. **`scripts/comparar-bases.js` compara 24 de las 72 tablas y no lo dice.**
     No cubre torneos, `oauth_tokens`, `discount_codes`, `evento_legal`,
     `padron_previo`, `email_cola`… y aun así imprime «Todo cuadra». Es el
     paso que decide el corte. Debería cubrir todas o listar en voz alta las
     que deja fuera.
  2. Ese mismo script asume `id` en toda tabla (`ORDER BY id`); al cubrir las
     72 fallará en las de PK compuesta. El comentario dice «clave natural»
     pero no está implementado.
  3. Falsos DIFIERE garantizados en columnas `numeric`/`decimal`: `mysql2`
     las da como texto y `supabase-js` como número, y `normalizar` mantiene
     `12` ≠ `"12"` a propósito.
  4. `canjearRecompensa` revienta con `bal.id` si el premio cuesta 0 y el
     usuario no tiene fila de saldo (`bal` es `undefined`).
  5. `db/esquema/02` no trae preámbulo `SET NAMES`/`SET time_zone` aunque el
     README dice que sí.

### ✅ Los 5 hallazgos, arreglados · Sekkon0906 · 2026-09-01 · backend #25

Nada de esto corre contra producción (código dormido para la futura
migración), pero se arregló para no arrastrarlo:

1. `TABLAS` en `comparar-bases.js` ahora cubre las ~70 tablas del esquema
   (antes 24), y `verificarCobertura()` avisa si el esquema real gana una
   tabla que la lista no conoce.
2. `CLAVE_POR_TABLA` declara la clave natural de las 6 tablas sin `id`
   (comprobado contra el `PRIMARY KEY` real de cada una).
3. El falso `DIFIERE` en columnas `numeric`/`decimal` se arregló en el origen
   (`decimalNumbers: true` en `core/db/mysql.js`), no en la comparación.
4. `canjearRecompensa` ya no truena con `bal.id` cuando el premio cuesta 0 y
   no hay saldo previo.
5. `02_indices_unicos_parciales.sql` y `04_indices.sql` ya tienen su
   preámbulo `SET NAMES`/`SET time_zone`.

398 tests en verde (6 nuevos).

---

## FRENTE B · El editor de landing y la exportación

**Archivos:** `src/pages/events/editor/**` (`blocks.jsx`, `PageBuilder.jsx`,
`ExperienceBuilder.jsx`, `ExportIframeModal.jsx`), `public/widget.js`.
**No toca:** el workspace del evento ni la página pública.

Es el frente con más diseño por delante y el que más se beneficia de tener una
sesión entera dedicada.

### B1 · Modo desarrollador de la landing — ✅ Hecho (verificado 2026-09-01)

**Ya está construido por completo, en una sesión anterior a este plan** (commit
`1d6ccbb`: la landing pasa a tener contrato, y un asistente de IA puede
armarla por MCP). La decisión que sigue estaba pendiente cuando se escribió
este documento ya se tomó: **(b) un DSL propio en JSON**.

- `lib/bloquesLanding.js` (backend): el catálogo de bloques (`BLOQUES`) es el
  contrato — qué campos admite cada uno y de qué tipo — y `fallaBloque`/
  `fallaPaginas` lo hacen cumplir. Nada de HTML libre; cero superficie de XSS.
- `lib/agente.js` (backend): tres herramientas MCP —
  `catalogo_bloques_landing` (el contrato, listo para pasárselo a un modelo),
  `ver_landing`, `guardar_landing` (valida ANTES de tocar la base; si algo no
  encaja, no se guarda nada)—. Esto es exactamente «que un asistente de IA
  pueda armar una página por MCP llamando a las funciones».
- `PageBuilder.jsx` (frontend): editor de JSON crudo con validación, para el
  humano que sepa escribirlo.

Redacción original, para contexto — lo que se pedía decidir:

Hoy hay 21 tipos de bloque (`BLOCKS` en `blocks.jsx`) y **ninguna forma de
escribir código**. La idea es que quien sepa pueda hacerlo, y que un asistente
de IA pueda armar una página por MCP llamando a las funciones.

Lo que hay que decidir antes de escribir nada, porque cambia todo lo demás:

- **Qué se ejecuta.** Meter HTML libre en la landing pública es una vía directa
  a XSS: el bloque lo escribe el organizador, pero lo ve todo el público, y un
  `<script>` ahí corre con el origen del evento. Las tres salidas razonables
  son (a) HTML saneado sin scripts, (b) un DSL propio en JSON que el
  renderizador interpreta, (c) el código dentro de un iframe con `sandbox`.
  **La (b) es la que hace posible lo del asistente de IA por MCP** — un
  esquema JSON es algo que un modelo puede generar y validar; HTML libre no
  se puede validar.
- **Qué funciones se exponen.** Si el asistente va a "llamar las funciones", esas
  funciones tienen que ser un contrato estable y documentado, no los internos
  del editor. Es una API pública en la práctica.

**Entregable de este bloque antes de programar:** el contrato. Qué bloques,
qué props, qué valida el servidor. Sin eso, lo que se escriba se tira.

### B2 · Exportación granular — ✅ Hecho (verificado 2026-09-01)

**Ya está construido por completo.** `ExportIframeModal.jsx` ya ofrece las
tres opciones de abajo (bloque completo, sin fondo, sólo el botón sin
iframe vía `widget.js`), con el aviso correcto de que el pago abre pestaña
aparte porque las pasarelas no funcionan dentro de un iframe ajeno.

Redacción original, para contexto — lo que se pedía:

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

### C1 · Mover dos secciones de sitio — ✅ Sekkon0906 · 2026-09-01

`Aforo por zonas` y `Stands` ya se movieron a **Espacio del evento**, con su
redirección en `REUBICADAS`. Ahora también **«Accesos e ingresos»** (mismo
`EventWorkspace.jsx`, misma lista de `tabs`, misma `REUBICADAS`) — **frontend
#22**. Por lo mismo: puertas y zonas son DÓNDE se entra, no quién asiste.

Redacción original, para contexto: `Aforo por zonas` y `Stands y puntos`
estaban bajo **Asistentes** y son de **Espacio del evento**. El movimiento es
barato (`EventWorkspace.jsx`, la lista de `tabs`) y hay que dejar las
direcciones viejas redirigidas: el mecanismo `REUBICADAS` en ese mismo archivo
existe justo para esto, de cuando se fusionó Dinámicas.

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

**Y al ir a enlazarlo, resultó que ya estaba enlazado.** Comprobado en el
código, no supuesto:

- `SessionForm` **ya tiene el selector de zona** (`zonasEvento`, `form.zona_id`).
- `agendaPorZona()` en `lib/aforoZonas.js` **ya junta las tres cosas**: qué hay
  ahora, qué viene después y el aforo. Y empareja por id **y** por nombre, así
  que los sub-eventos viejos con la ubicación escrita a mano siguen apareciendo
  en su zona.
- La usan `routes/clientes.js` y `routes/eventos.publicos.js`, y `MapaAforo.jsx`
  **ya la pinta** (`z.agenda`, con los estados `ahora` / `terminado`).

El enlace de base ya está hecho, incluido lo pequeño: crear una zona en
«Accesos e ingresos» ya ofrece **ponerla en el mapa** ahí mismo
(`AccesosSection.jsx`, enlace «Ponerla en el mapa →»).

**Lo que sigue abierto (2026-09-01, Sekkon0906):** el mapa y el aforo se ven
como piezas sueltas al operarlos. El trabajo real —revisar cada función para
reusarla y que todo tire del mismo estado vivo (`mapa/vivo`)— más el **estudio
de qué actividad llena cada zona** están en el **Camino unitario, Fases 1–4**
de la sección 2. Ese estudio es alcance nuevo respecto a la redacción de este
C2.

**✅ Zona como centro de mando · Sekkon0906 · 2026-09-01 · backend #26, frontend
#31.** Pedido nuevo del usuario: tocar una zona debía mostrar también sus
stands, no sólo aforo y agenda. `standsPorZona()` ya existía (`lib/expositores.js`,
migración 0088) sin usarse desde ninguna ruta — se cruzó en `mapa/vivo`
(tablero en vivo) y se agrupó client-side en el mapa público (`evento.expositores`
ya trae `zona_id`). **No se consolidaron** las tres implementaciones de mapa
en un componente compartido — eso sigue siendo su propia sesión, tal como se
anotó abajo en la Fase 4.

### C3 · Nutrir «Estancia y puntos» — ⤷ reemplazado por el FRENTE I

**No tomar esta tarea.** Los datos que pedía ya se calculan y ya se pintan
(`aforo_zonas_estancia` → `routes/clientes.js:846` → `AforoSection.jsx:497-498`,
con los tramos medidos al lado). Lo que faltaba era un sitio donde leerlos
junto al resto de la zona, y eso es la **Fase 1 del Frente I**.

Redacción original, para contexto:

Hoy muestra el nombre y una foto pequeña, y poco más. Se va a llamar desde el
mapa, así que tiene que aguantar que la miren. Antes de rediseñar conviene
mirar qué datos hay ya: `aforo_zonas_estancia` devuelve minutos promedio,
máximo y cuántos tramos se midieron —ese último número está a propósito, para
que el promedio se pueda leer con contexto— y no se está usando.

### C4 · Un solo escáner — ✅ Hecho (verificado 2026-09-01)

**Ya está construido por completo** (commit `e3f3e8f`, «Un solo escáner, y el
aforo y los stands se van al Espacio del evento», 2026-08-29 — el mismo día
en que se decidió, antes de que este documento se actualizara). `CheckinTab`
(`src/pages/events/tabs/CheckinTab.jsx`) tiene los 5 modos —`checkin`,
`reingreso`, `subevento`, `puntos`, `canjear`— con un único `QrScanner`
compartido y un despachador que enruta cada resultado. `StandsTab` ya no
escanea nada: quedó con `stands | pasaporte | motivos | historial`, la
configuración previa al evento.

Redacción original, para contexto — el diagnóstico que llevó a la decisión: el problema no es que falten funciones. Es que la misma
función está repetida en varias ventanas, y quien la usa tiene que saber en
cuál está.

Medido en el código: hay **tres escáneres**. `CheckinTab` escanea para entrar,
y `StandsTab` mete otras cinco cosas en una sola pestaña
(`stands | escanear | canjear | motivos | historial`), de las que dos son
escanear otra vez.

Lo revelador es que **`CheckinTab` ya es multiuso**: tiene tres modos
—`checkin | reingreso | subevento`—, ya elige zona y ya elige sub-evento. El
problema estaba resuelto; a los puntos los dejaron fuera.

La acción física es UNA: pasar una escarapela por un móvil. Lo único que
cambia es qué se hace con el resultado. Obligar a cambiar de pantalla según
vayas a marcar entrada o a dar puntos —con la misma persona delante y la misma
escarapela en la mano— es lo que hay que quitar.

**Lo que se hace:**

- **Escanear** (hoy «Control de ingreso») pasa a cinco modos: entrada,
  reingreso, sub-evento, **dar puntos** y **canjear**.
- **Stands** se queda con crear el stand, su ficha, su cuota y sus **motivos**
  —que son catálogo, configuración previa al evento— y se va a Espacio del
  evento.
- **Historial** es reporte: sale de ahí.

Y encaja con lo de unificar credenciales y tarjeta: la tarjeta es donde el
asistente **ve** sus puntos; el escáner es donde el staff **los da**. La
separación es por quién lo usa, no por qué mecánica es.

### C4-bis · Nota de por qué no va a Credenciales ni a Tarjeta

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

### D1 · Preguntas condicionales — ✅ Hecho (verificado 2026-09-01)

**Ya está construido por completo** (migración 0084, ya aplicada pese a que
su comentario dice «PENDIENTE DE APLICAR» — residuo, no estado real).
`lib/formularioCampos.js` (validación server-side) + `lib/camposCondicionales.js`
(mismo cálculo en el cliente, para reactividad instantánea) implementan
`visible_si: { campo, op, valor }` completo: un campo oculto no se exige como
obligatorio y sus respuestas no se guardan. UI en `FormularioTab.jsx`, filtro
en `EventoPublicoPage.jsx`.

Redacción original, para contexto:

«Si vive en zona rural, se abren estas opciones; si urbana, estas otras.»

Hoy `event_form_fields` tiene `id, tipo, etiqueta, opciones, requerido, orden,
ticket_type_id, grupo, ayuda, buscable`. **No hay nada de condiciones.** Hace
falta una columna nueva —algo como `visible_si: { campo_id, operador, valor }`—
y que la validación del servidor la respete: si un campo está oculto por su
condición, exigirlo como obligatorio deja el formulario imposible de enviar, y
ése es el fallo clásico de esta función.

### D2 · Prellenado por cédula desde una base anterior — ✅ Hecho

Las tres cosas de abajo ya existían (el padrón previo, con `lib/padronPrevio.js`
y su endpoint de subida) y, además, el bug del alias de columna en mayúscula
se arregló esta sesión (Sekkon0906 · 2026-09-01 · backend #19, frontend #24):
la columna del documento se buscaba en minúscula exacta y «Documento», «NIT»
en mayúscula o alias en inglés (`id_number`) no se reconocían.

Redacción original, para contexto — tres cosas que van juntas:

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

### E1 · Barra de navegación fija — ✅ Hecho (verificado y pulido 2026-09-01)

**Ya estaba hecho cuando se investigó**: las dos barras de
`EventoPublicoPage.jsx` son `sticky` (`top-0` la de salidas, `top-[72px]` la
píldora de páginas) — no como describía este documento. Lo único que faltaba
—el offset fijo de `72px` podía desalinearse en móvil si los enlaces se
envolvían a dos filas— se arregló con `ResizeObserver` (frontend #32).

Redacción original, para contexto — comprobado en el código en su momento:
hay dos barras y sólo una es fija.

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

## Estudio del flujo de registro — 2026-09-02, contra producción

Medido contra **FESTECH IBAGUÉ** (`festech2026`), publicado, y con el frontend
local apuntando al backend desplegado. Sirve de base para el **Frente H**
(impresión de escarapelas el día del evento).

### Lo que está sano

| Pieza | Medido |
|---|---|
| Estado del evento | `publicado`, aforo **41 / 7.000** |
| Boletas emitidas | **41**, todas `pagado`, **0 sin `qr_token`** |
| Tipo de boleta | uno, gratis, cupo 7.000, activo |
| Formulario | 11 preguntas, **9 obligatorias**, 4 pasos |
| Recordatorios por correo | activados |
| Página pública | carga y el registro avanza; **cero errores en consola** |
| Selector de «Comuna» | 48 opciones, fuera del recorte, dentro de pantalla |

**La cadena del QR es coherente de punta a punta**, que es lo que importa para
la impresora:

1. Al emitir, la boleta guarda un `qr_token` **firmado** (253 caracteres, sin
   barras — no es una URL).
2. La API pública de la boleta lo devuelve, junto con `evento.page_json`, así
   que las tres salidas resuelven el mismo diseño y **el mismo valor de QR**
   (`DescargarEntrada` lo reparte desde un solo sitio).
3. `resolverTicket()` acepta **las dos formas**: el token firmado —verificado y
   acotado al evento— y el código corto de 8 caracteres, también acotado.

Es decir: el fallo histórico —la escarapela que imprimía la URL y no pasaba el
control de ingreso— **está cerrado de origen y con un traductor para las
impresas antes**.

### Lo que NO está listo, y bloquea o condiciona la impresora

1. **El padrón previo no prellena nada.** `page_json.padron` sigue en `NULL`, así
   que de las 11 preguntas cruza una. Y de las 4.124 personas del archivo, sólo
   500 traen datos. **No es un problema de código.**
2. **Sin captcha y sin términos.** `terminos_activo` está en falso y no hay
   Turnstile. Para un evento de 7.000 personas con 9 campos obligatorios, el
   formulario está abierto a envíos automáticos. Es una decisión, no un fallo,
   pero conviene tomarla a propósito.
3. **El panel no se ha visto en navegador.** Todo lo del organizador —el menú
   reagrupado, el selector de personas, la pantalla de mapeo— sigue verificado
   sólo por código: este entorno no tiene credenciales de sesión.

### Para el Frente H · lo que este estudio deja decidido

**Qué imprimir en el QR: el `qr_token`, no el código corto.** Los dos funcionan,
pero el token va firmado y el código de 8 caracteres sobre un alfabeto de 32
(~40 bits) es adivinable. El código corto se queda donde ya está: impreso en
texto debajo, como respaldo para teclear cuando el QR no lee.

**El tamaño físico, que es la decisión de verdad.** 253 caracteres en QR nivel M
piden alrededor de una versión 11–12, es decir **unos 61–65 módulos por lado**.
La SAT TT460 es de **203 dpi** (8 puntos/mm), y un lector fiable quiere ≥ 3
puntos por módulo:

> 65 módulos × 3 puntos = 195 puntos ÷ 8 = **≈ 24 mm de lado, mínimo**.

Con 4 puntos por módulo son ~33 mm. En una etiqueta de 50 mm de ancho cabe, pero
**hay que probarlo físicamente antes del evento**: el cálculo dice que es
viable, no que lea bien con esa cinta y ese papel.

**Si no lee a ese tamaño**, la salida no es bajar a nivel L —menos corrección de
errores en un papel que se dobla y se moja es peor—, sino **acortar el
contenido**: un token más corto emitido para impresión, o el código corto con el
riesgo asumido. Esa es una decisión de producto y va antes de programar nada.

### Antes de la impresora, en este orden

1. **Aplicar `0089`, `0090` y `0091`** — están escritas, probadas y reversibles.
2. **Verificar el panel en navegador**, que es lo único construido a ciegas.
3. **Decidir captcha y términos** para Festech.
4. **Subir el padrón con los datos completos**, o asumir que 3.624 personas
   escriben todo a mano — con 9 campos obligatorios, eso es cola en la puerta.

---

## FRENTE H · Impresión de escarapelas el día del evento

**Sin empezar, a propósito — anotado el 2026-09-01, se retoma más adelante.**
Se consiguió una impresora térmica de etiquetas (**SAT TT460**, 203 dpi,
máx. 6 ips, soporta cinta de cera/resina para transferencia térmica, USB +
Ethernet + Bluetooth 5.0 (BLE/WiFi), identifica el sensor automáticamente con
el botón de calibración) para imprimir en el sitio los QR de las escarapelas
el día del evento.

### El diseño de la etiqueta — ✅ decidido y construido el 2026-09-03

Primera pieza del frente. **No reemplaza al diseñador de escarapelas que ya
existe**: aquél compone una HOJA con varias para cortar a mano en una impresora
normal; la TT460 saca **una etiqueta a la vez, a tamaño exacto, desde un rollo**.
Son dos medios distintos y el mismo diseño no vale para los dos.

#### Lo que decidió el diseño, y no fue el gusto

**1 · No hay colores. Ni grises.** La transferencia térmica es de **un bit**:
cada punto se imprime o no, con la tinta de la cinta cargada. Un gris sólo se
finge con trama, y a 203 dpi una trama se ve sucia.

Eso **tumba lo único configurable de la escarapela actual**: el color por tipo
de asistente (`colores: { 'VIP': '#d4af37' }`), la marca de agua con opacidad y
el logo a color. En térmica, todo eso es una mancha o no es nada.

Se sustituye por lo que sí sobrevive en un bit: **el tipo en un recuadro con
borde**, y relleno (texto en blanco) para el que se quiera destacar. Si de
verdad hacen falta dos colores, la salida es **operativa y no de diseño**:
cargar una cinta dorada e imprimir los VIP en una tanda aparte.

**2 · Los rellenos grandes se evitan.** Una banda negra a lo ancho gasta cinta,
calienta el cabezal —lo que baja la velocidad real— y se corre si la escarapela
roza durante el día. Por eso el recuadro invertido es pequeño y el resto va en
línea fina.

**3 · Todo cae en punto entero.** 203 dpi son exactamente **8 puntos/mm**. Una
medida de 3,3 mm son 26,4 puntos: el cabezal redondea por su cuenta y el borde
sale con diente. Todas las medidas son múltiplos de 0,125 mm.

#### El tamaño: 90 × 55 mm

Es el `9x5` que el diseñador de escarapelas **ya trae por defecto**. No es una
medida inventada: si ya se compraron portagafetes para ese tamaño, la etiqueta
entra en ellos. A 203 dpi son 720 × 440 puntos.

#### El QR, que es quien manda

Lleva el **token firmado**, no el código corto: el código son 8 caracteres sobre
32 símbolos —unos 40 bits— y se puede adivinar.

El token son **253 caracteres**, medidos contra producción. Comprobado
**empíricamente** contra `qrcode.react`, no de memoria:

| Nivel | Margen | Módulos |
|---|---|---|
| M | sin | **65 × 65** (versión 12) |
| M | con | 73 × 73 |
| L | con | 65 × 65 |

Se usa **M**: una escarapela se dobla, se moja y se roza, y bajar a L para ganar
2 mm es cambiar tamaño por fallos intermitentes.

    73 módulos × 3 puntos = 219 puntos ÷ 8 = **27,375 mm de lado**

Tres puntos por módulo es el mínimo con el que un lector barato acierta a la
primera. Con dos se lee en un móvil bueno y falla en la puerta, que es donde
importa. Quedan **56,6 mm** para el nombre, el tipo y el evento.

**El tamaño no está fijo: se calcula.** El día que el token crezca —una firma
más larga, un campo más— el QR sube de versión, y `medidas()` lo recalcula y
avisa si deja de caber. Lo que no puede pasar es imprimir un QR ilegible sin que
nadie lo sepa.

#### Lo que se imprime, y lo que no

| Sale | No sale, y por qué |
|---|---|
| QR 27,4 mm + código corto debajo, monoespaciado | Marca de agua — es una trama, ensucia y come contraste junto al QR |
| Nombre, 6 mm de altura de mayúscula, máximo 2 líneas | Colores por tipo — no existen en un bit |
| Tipo, en recuadro | Campos extra del formulario — caben dos líneas y el nombre y el tipo son lo que se mira |
| Nombre del evento, 2,5 mm | Logo a color — se deja opcional, pero sólo funciona si es silueta de un tono |

Las alturas van en **milímetros y no en puntos tipográficos**: lo que decide si
un nombre se lee desde el otro lado de la mesa es su altura física, y por debajo
de 2 mm a 203 dpi las letras se rellenan y una «e» es un borrón.

#### La impresión

`@page { size: 90mm 55mm; margin: 0 }` y **un salto de página por etiqueta**.
Una etiquetadora no tiene hoja: si el navegador manda una A4 con seis
escarapelas, imprime la primera y tira el resto. Y el margen por defecto del
navegador, sobre 55 mm de alto, deja el diseño a escala y el QR fuera de la zona
imprimible.

**Lo que el navegador no puede garantizar:** que el driver no reescale. Casi
todos ofrecen «ajustar al área imprimible», y eso rompe la relación
puntos↔módulos: 3 puntos por módulo pasan a 2,7 y el lector empieza a fallar **a
veces**, que es peor que fallar siempre. Al imprimir hay que dejar la escala al
100 % y desmarcar el ajuste.

**Si el driver da guerra**, la salida no es pelearse con él: es generar el
lenguaje de la impresora (TSPL o ZPL, según lo que hable la TT460) y mandárselo
por USB o red. Eso ya no es diseño, es fontanería, y hasta no probar en el
aparato no se sabe si hace falta.

#### Lo que falta, y necesita el aparato delante

1. **Una prueba física.** El cálculo dice que 27,4 mm con cinta de cera/resina
   se lee; no dice que se lea con **esa** cinta y **ese** papel. Es la única
   forma de cerrar esto.
2. **Confirmar el rollo.** Todo esto asume etiquetas de 90 × 55 mm. Si el rollo
   que hay es otro, `ETIQUETA` es un objeto y se cambia en un sitio — pero el
   QR necesita 27,4 mm de alto libre, así que **una etiqueta de menos de 34 mm
   de alto no sirve** para este token.
3. **Decidir la cinta.** Cera se corre con el roce de un día colgada; cera/resina
   o resina aguanta. Es la diferencia entre una escarapela legible a las seis de
   la tarde y una manchada.


**Lo que hay que decidir antes de programar nada** (esto sí es una decisión
de arquitectura, como B1 lo fue — no una tarea mecánica):

- **Cómo habla el navegador con la impresora.** Tres caminos, con
  implicaciones muy distintas:
  1. *Driver del sistema operativo + diálogo de impresión del navegador*:
     más simple de montar, pero un layout de etiqueta preciso (tamaño exacto,
     sin márgenes del navegador) vía `window.print()` + `@media print` es
     frágil entre navegadores y no sirve bien para "que el staff imprima
     desde el celular en la puerta".
  2. *WebUSB o Web Bluetooth desde el navegador, mandando comandos crudos*
     (la mayoría de impresoras térmicas de esta gama hablan **TSPL** o un
     dialecto de **ESC/POS**): control total, sin instalar nada, encaja con
     que GESTEK ya es una app web — pero hace falta el manual de comandos
     del fabricante (SAT/PCS) o probar contra la impresora real para
     confirmar qué dialecto habla, y WebUSB no funciona en Safari/iOS.
  3. *Servidor de impresión local* (un pequeño proceso en el computador de
     la puerta que recibe la orden por HTTP/websocket y la manda a la
     impresora por USB): más piezas que mantener, pero es lo único que
     funciona igual en cualquier navegador/SO el día del evento.
- **Qué lleva la etiqueta.** Sólo el QR, o QR + nombre + tipo de boleta —
  afecta el tamaño de etiqueta que hay que comprar y el layout.
- **Desde dónde se dispara la impresión.** ¿Un botón en Credenciales/Tarjeta
  (config previa) que imprime en lote antes del evento, o un botón en
  Escanear/Check-in que imprime una escarapela al vuelo cuando alguien llega
  sin la suya? Son dos flujos de trabajo distintos.

**Entregable antes de programar:** probar la impresora contra un mensaje
simple (por USB, siguiendo la guía impresa que trae en la caja) para
confirmar el dialecto de comandos, y decidir el camino de arriba con esa
información en mano.

---

## FRENTE I · Zonas de interés — ✅ completo (fases 0-5)

**Pedido por Sekkon0906 el 2026-09-02**, con estas palabras: «un apartado que
se llame *zonas de interés*, y ahí se pueda conectar TODO: la creación de
zonas, conectar las actividades a las zonas, etc. Sería conveniente manejar
sólo 1 lugar de administración, y ya luego en el resto se llaman a esas
funciones».

**Archivos:** `AccesosSection.jsx`, `AforoSection.jsx`, `MapaSection.jsx`,
`components/aforo/`, `StandsTab.jsx`, `agenda/SessionForm.jsx`,
`routes/clientes.js`, `routes/networking.js`, `routes/agenda.js`,
`lib/aforoZonas.js`.

> **No se puede correr en paralelo con el FRENTE C ni con las Fases 1-4 del
> Camino unitario: toca los mismos archivos.** Este frente es su continuación
> natural, y **reemplaza a C3** (ver más abajo).

### El diagnóstico, medido

Una zona es lo único del evento que aparece en cuatro pantallas y no se puede
administrar en ninguna. Hoy:

| Qué de la zona | Dónde se hace | Dirección |
|---|---|---|
| Crearla, nombrarla, ponerle aforo | `AccesosSection.jsx:105-164`, mezclada con las puertas | — |
| Editar nombre y aforo **otra vez** | `MapaSection.jsx:384-393`, segundo camino de escritura | — |
| Colocarla en el plano | `MapaSection.jsx` | — |
| Ver quién hay dentro, tomar reporte | `AforoSection.jsx` | — |
| Qué actividades ocurren en ella | `SessionForm.jsx:181-194` | **el sub-evento elige su zona** |
| Qué stands están en ella | `StandsTab.jsx:209-227` | **el stand elige su zona** |
| Por qué puerta se entra | *no existe la relación* | — |

Las dos últimas filas son el corazón del problema: **todas las relaciones de
una zona se establecen desde el otro lado**. Se puede decir «esta charla ocurre
en la Zona Gamer», pero estando en la Zona Gamer no se puede decir «aquí ocurre
esta charla». Para armar una zona hay que recorrer cuatro pantallas, y en tres
de ellas la zona es un desplegable dentro del formulario de otra cosa.

### La buena noticia: el backend ya está

`GET /:eventoId/mapa/vivo` (`routes/clientes.js:735`) **ya devuelve en una sola
llamada** las zonas con su ocupación viva (`ocupacion()`), su agenda
(`agendaPorZona()`), sus stands (`standsPorZona()`), las puertas con su conteo
y las sesiones con inscritos. Es exactamente el modelo de datos que necesita un
centro de mando, y hoy sólo lo consume `AforoSection.jsx:63`.

Por eso las fases 1 y 2 de abajo **no necesitan backend nuevo**: son montar una
pantalla sobre datos que ya viajan.

### Fase 0 · Cerrar el segundo camino de escritura — ✅ Hecho el 2026-09-02

- `MapaSection.jsx` ya no edita `nombre` ni `aforo_max`: se queda con color y
  posición, y muestra el nombre con una nota que apunta a Accesos e ingresos —
  **el mismo trato que ya recibía «puerta»** en ese archivo. Sólo hubo que
  aplicarle a zona lo que ya se le aplicaba a puerta.
- Fuera el flag `zonasTocadas`, la función `editarZona`, la rama
  `parche.zonas` y el prop `onZona`. `zonas` pasó de `useState` a `useMemo`:
  **si no es editable, no es estado.** Un solo camino de escritura.
- **No se hizo un `<SelectorZona>`**, y conviene explicar por qué: los tres
  `onChange` son distintos **a propósito** y está documentado en cada uno (en
  sub-eventos elegir zona rellena también `ubicacion`; en stands
  deliberadamente NO, porque «A-12» es la etiqueta del puesto y no dónde está).
  Un componente único habría tenido que aceptar tres comportamientos por
  parámetro, que es más enredo que las tres copias.
  Lo que sí se repetía era el **filtro** y la **etiqueta**, y eso vive ahora en
  `src/lib/zonas.js` (`zonasDelEvento`, `etiquetaZona`) — con el mismo nombre
  que el helper del backend (`lib/aforoZonas.js`), que es el mismo concepto.
  De paso arregla el bug real: `CheckinTab` leía `page_json.zonas` **crudo**,
  así que una zona recién creada y aún sin nombre salía como opción en blanco.

Verificado: `eslint` y `build` limpios, y las 7 pruebas del widget en verde.

### Fase 1 · La sección, en sólo lectura — ✅ Hecho el 2026-09-02

Pestaña nueva **«Zonas de interés»** en *Espacio del evento*
(`src/pages/events/workspace/espacio/ZonasSection.jsx`), entre «Accesos e
ingresos» y «Aforo por zonas», con el mismo permiso que el aforo (`checkin`):
se mira mientras se trabaja el evento, no es configuración.

- **Lista:** cada zona con su aforo en vivo, barra de ocupación, cuántas
  actividades y cuántos stands tiene, y un aviso si no está colocada en el
  plano. **Una zona sin nada conectado se ve de un golpe** — que era lo que
  no se podía ver sin recorrer tres pantallas.
- **Detalle:** es **el mismo `DetalleMarcador`** del tablero de aforo, reusado
  tal cual (`sel={\`zona:${id}\`}`). Ya traía ocupación, entradas, salidas,
  programación y stands. Hacer una cuarta ficha de zona habría sido el
  problema que este frente viene a resolver.
- **La lista manda sobre el endpoint:** `mapa/vivo` sólo devuelve zonas con
  movimiento, así que una zona recién creada no aparecería y parecería no
  existir. Se cruza con `zonasDelEvento(evento)` y las que no tienen datos
  salen en ceros.

Sin backend nuevo: una sola llamada a `mapa/vivo`, que ya devolvía todo esto y
hasta ahora sólo consumía el tablero de aforo.

**Desviación respecto a lo planeado, a propósito:** este apartado decía que el
detalle llevaría también el histórico (curva del día, estancia media). No se
hizo: eso ya está pintado en el Reporte de «Aforo por zonas», y copiarlo aquí
habría sido duplicar. La ficha enlaza a las cinco pantallas donde se actúa
sobre la zona (editar, colocar, operar, programar una actividad, montar un
stand) en vez de reimplementarlas.

Verificado: `eslint` y `build` limpios. **No se probó en navegador con datos
reales** — este entorno no tiene credenciales de Supabase, así que la app no
arranca con datos. Queda pendiente mirarla contra un evento de verdad.

### Fase 2 · Mover el CRUD de zonas aquí — ✅ Hecho el 2026-09-02

**Éste es el «1 lugar de administración» del pedido.** Crear, renombrar,
cambiar aforo y borrar zonas ya vive en «Zonas de interés».

- `AccesosSection.jsx` se quedó con las puertas, que es lo que su nombre dice.
  Fuera: el estado `zonas`, `zonasGuardadas`, `limpiarZonas`, `setZona`,
  `agregarZona`, `quitarZona`, `guardarZonas`, `zonasSucio`, `guardandoZonas`,
  `zonasEnMapa`, `sinUbicar` y el fetch de `aforoZonas`. En su sitio queda un
  enlace a la sección nueva, y sólo el enlace.
- **De paso murió una tercera copia** de la barra de ocupación: el recuadro
  «Ocupación ahora» de `AccesosSection` repintaba lo que ya pinta el tablero de
  aforo y ahora también la lista de zonas (§3.6).
- **El permiso, que era la trampa.** La pestaña se abre con `checkin` (mirar la
  zona es parte de trabajar el evento), pero escribir `page_json` lo reserva el
  backend a `editar_pagina_publica` o al owner (`routes/eventos.js`, el PATCH).
  Mover el alta sin más habría dado a cualquier staff de puerta unos botones
  que devuelven 403. Se resolvió pasando `permisos` a `Contenido` en
  `EventWorkspace.jsx` y calculando `puedeEditarSitio`: el alta sólo se dibuja
  si de verdad se puede guardar.
- **Borrar ahora pregunta, y dice qué se lleva por delante**: cuánta gente hay
  dentro en este momento, cuántas actividades quedan sin zona, cuántos stands
  sin ubicar y si su marcador quedará huérfano en el plano. Antes se borraba de
  inmediato sin avisar de nada de eso.
- Al guardar se llama a `reload()` del workspace, porque el selector de zona
  del Calendario y el de Stands leen `evento.page_json`, no la lista local.
- **No hizo falta `REUBICADAS`**: `espacio/accesos` sigue existiendo (las
  puertas) y la pestaña de zonas es nueva, así que ninguna dirección vieja
  apunta a ella.
- Se corrigieron los seis textos que seguían mandando a «Accesos e ingresos»
  para editar zonas (`MapaSection`, `AforoSection`, `lib/zonas.js`).

Verificado: `eslint` y `build` limpios.

### Fase 3 · Las relaciones, en dirección inversa — ✅ Hecho el 2026-09-02

**Esto era el corazón del pedido.** Desde la zona ya se pueden colgar y
descolgar actividades y stands: la dirección que no existía.

- **Sin backend nuevo.** Los `PATCH` que ya había aceptan `zona_id`
  (`routes/agenda.js:218` lo tiene en su lista `allowed`;
  `routes/networking.js:513` además lo valida con `zonaInvalida`). Se manda una
  petición por ítem. No se hizo endpoint en lote: para un puñado de ítems no
  hace falta, y añadir una ruta nueva es añadir superficie de permisos. Si
  algún día hay que asignar cincuenta de golpe, ahí sí.
- **Un solo componente `<Colgar>` para los dos casos**, porque son el mismo
  problema: una lista de lo que ya está y un desplegable con lo que se puede
  añadir. Asignar y desasignar son la misma llamada con `zona_id` a `null`.
- **El desplegable no esconde lo que está en otra zona**, lo marca «en otra
  zona». Mover una charla de la Sala A a la Sala B es normal, y ocultarla
  obligaría a ir a buscarla al Calendario — es decir, a lo de antes.
- **Hacía falta pedir las listas completas**: `mapa/vivo` sólo devuelve la
  agenda que está puesta en el plano y los stands que YA tienen zona. Para
  asignar hay que ver también lo que no está en ninguna parte, así que se
  piden `sessions` y `expositores` aparte — y sólo a quien tiene el permiso,
  para no gastar la petición.
- Los dos formularios de siempre (`SessionForm`, `StandsTab`) **se quedaron
  igual**: elegir la zona mientras creas una charla es cómodo. Lo que cambia
  es que ya no es la única dirección posible.

**Los tres permisos, que era la parte delicada.** Cada cosa que se cambia
desde esta pantalla vive en una tabla distinta y el backend pide un permiso
distinto:

| Qué se cambia | Dónde | Permiso |
|---|---|---|
| La zona | `page_json` | `editar_pagina_publica` |
| La actividad | `agenda_sessions.zona_id` | `gestionar_agenda` \| `editar_evento` |
| El stand | `networking_expositores.zona_id` | `gestionar_expositores` \| `editar_evento` |

Se comprueban por separado (`puedeCon`) y no con una bandera única: juntarlas
obligaría a exigir el permiso más alto de los tres para hacer lo más barato.

Verificado: `eslint` y `build` limpios.

### Fase 4 · Zona ↔ puerta, la relación que falta — ✅ Hecho el 2026-09-02

Era la única relación de la zona que **no existía**: `page_json.accesos` y
`page_json.zonas` eran dos listas sin un solo campo cruzado, así que la
pregunta de quien está delante del plano —«¿por dónde se entra a la tarima?»—
no tenía respuesta en ninguna pantalla.

- **Sin migración y sin backend.** `page_json.accesos` gana `zona_id`
  (`limpiarAccesos` lo arrastra ahora), y el `PATCH` ya mezcla `page_json` por
  clave desde la 0064.
- **Se asigna desde la puerta**, en «Accesos e ingresos», y esta vez a
  propósito: una puerta da a UNA zona, así que su dueño natural es la puerta.
  Lo que faltaba no era otro formulario, era poder leerlo desde el otro lado.
  El desplegable usa el `zonasDelEvento`/`etiquetaZona` de la fase 0 — cuarto
  consumidor del helper, ninguna copia nueva del filtro.
- **Es opcional**, y el valor por defecto lo dice: «Al recinto en general». La
  mayoría de las puertas no dan a una zona concreta.
- **La zona lo lee de la configuración, no de `mapa/vivo`.** Ese endpoint sólo
  devuelve las puertas COLOCADAS en el plano —las necesita para dibujarlas— y
  una puerta sin marcador sigue siendo la puerta por la que se entra. El
  conteo de ingresos se pega desde lo vivo cuando lo hay, y cuando no hay se
  omite: `null` no es `0`, y enseñar «0 ingresos» en una puerta que nadie ha
  medido sería mentir.

**Lo que NO se hizo:** el conteo por puerta no alimenta la ocupación de la
zona. Es dato mostrado al lado, no aritmética nueva — cambiar cómo se calcula
el aforo no lo pidió nadie y es la parte que no conviene tocar sin necesidad.

### Fase 5 · El marcador compartido — ✅ Hecho el 2026-09-02

El círculo que se coloca sobre el plano estaba escrito **dos** veces, igual, en
`MapaSection.jsx` (el editor) y `editor/blocks.jsx` (el mapa público). Ahora es
`components/mapa/MarcadorMapa.jsx`.

**Corrección al plan, y conviene que quede escrita:** este apartado decía que
el mapa está escrito **tres** veces y que había que unificar las tres. Al mirar
el código, no: `components/aforo/MapaAforo.jsx` —el tablero en vivo— **no es la
tercera copia**. Lo suyo es una píldora ancha con un valor grande, un halo
naranja que se ve de lejos y una etiqueta debajo; su trabajo es que alguien de
pie en el recinto lea el número desde tres metros. Meterlo en el componente
compartido habría sido forzar tres comportamientos con banderas, que es peor
que dos copias honestas. **Se queda como está.**

El contrato del componente es de presentación —`tipo`, `color`, `logoUrl`,
`inicial`, `valor`, `nivel`, `puntoVivo`, `codigo`— y no de dominio. Ésa es la
costura: cada mapa sabe leer lo suyo (el editor tiene marcadores y mapas de
ids; el público recibe el evento ya resuelto por el servidor) y los dos saben
decir «un círculo azul con este logo».

**Verificado en navegador** con las 12 combinaciones: nada desborda, todos
redondos, todos ≥ 44 px. Los dos casos que importaban: una zona con 4 cifras
(`1240`) ensancha en vez de recortar, y `0` se distingue de «sin dato» —uno
dice que la zona está vacía y el otro que no lo sabemos—, que era fácil de
perder al unificar.

**Pendiente:** mirar los dos mapas contra un evento real. El componente está
medido; el cableado de cada pantalla, no.

### Qué NO hace este frente

- **No fusiona** el editor del mapa, el tablero en vivo y el mapa público en
  una sola pantalla. Son tres contextos de permisos distintos (organizador
  editando, organizador operando, público mirando) y deben seguir separados.
  Lo que se comparte son los datos y el marcador, no la pantalla.
- **No toca** `ticket_types.zonas_acceso`. Pese al nombre, no tiene nada que
  ver con las zonas del recinto (§3.7).

### C3 queda reemplazado

C3 («Nutrir Estancia y puntos») se escribió cuando no existía dónde colgar esos
datos. Ya existe: `aforo_zonas_estancia` se usa desde
`GET /zonas/reporte` (`routes/clientes.js:846`) y se pinta en
`AforoSection.jsx:497-498` con sus tramos medidos para dar contexto. Lo que
faltaba —un sitio donde leerlo junto al resto de la zona— **es la Fase 1 de
este frente**. No hace falta una tarea aparte.

---

## FRENTE J · Deuda de la auditoría del 2026-09-02

Tareas sueltas que salieron de la sección 3, ordenadas por lo que cuesta contra
lo que arregla. **No comparten archivos con el Frente I** salvo donde se
indica, así que se pueden tomar en paralelo.

### ✅ Hecho el 2026-09-02

1. **El buzón de sugerencias ya no devuelve 404.** Faltaba la ruta, no el
   segmento de la URL: se escribió `POST`/`GET /me/sugerencias` contra
   `sugerencias_catalogo`, con 9 pruebas (§3.3). **401 tests en verde.**
2. **Cabeceras de migración corregidas**: cinco decían «pendiente» estando
   aplicadas; las dos que sí lo están quedaron anotadas con la medición (§3.5).

### Pendiente de una decisión tuya

0. **Aplicar `0081` y `0083`**, o dejarlas. No las apliqué a propósito: `0081`
   es `DROP COLUMN` sobre datos de persona (irreversible) y `0083` reescribe
   `page_json` de los 33 eventos. Ver §3.5 para lo que se midió de cada una.

### Barato y con valor claro

3. ~~**Un solo alta de expositor.**~~ — ✅ **hecho el 2026-09-02.** Los tres
   manejadores (crear, editar, borrar) viven una sola vez y se montan en las
   dos rutas; las dos URL siguen existiendo porque las usan dos pantallas
   distintas. El gate de categoría de la Rueda de Negocios pasó a middleware,
   porque los stands funcionan para cualquier evento y ponérselo los rompería.

   **Y apareció un agujero al juntarlas:** el `DELETE` de la Rueda borraba por
   `id` a secas. `assertOwner` comprueba que quien pide manda en ESTE evento,
   no que el expositor sea de este evento — así que quien organizara un evento
   cualquiera podía borrar la ficha de otro evento ajeno pasándole su id, y ese
   id sale en el directorio público. El borrado unificado filtra por
   `evento_id`.

   En el frontend, `NetworkingTab` gana el botón de editar y el modal sirve
   para alta y edición. Antes, corregir una letra del nombre obligaba a borrar
   al expositor —con sus horarios y las citas ya reservadas— y crearlo de
   nuevo.

   Backend PR #30, con `test/expositoresRutas.test.js` (424 en verde).
   **Sin ver en navegador:** el panel exige cuenta y este entorno no tiene
   credenciales de sesión.
4. **Conectar `oauth_barrer()`** a alguno de los `cron-*.js` que ya corren, o
   documentar que sigue pendiente. Hoy `oauth_codes`/`oauth_tokens` crecen sin
   límite (§3.4).
5. ~~**Adoptar `StatCard` y añadir `<BarraProgreso>`**~~ — ✅ **hecho**, pero
   con una corrección a la tarea: **`StatCard` no encajaba y se retiró.** Es una
   baldosa de tablero —icono, tendencia, paleta de cinco colores— y las tres
   copias reales no tienen icono ni tendencia; dos tienen una nota debajo que
   `StatCard` no sabe pintar. Adoptarlo obligaba a las tres a perder algo, y no
   lo usaba nadie desde que se escribió. La pieza que hacía falta es
   `components/ui/Kpi.jsx`, sacada de lo que las tres HACÍAN: unifica
   `KpiCard` (Analytics), `Kpi` (vista del colaborador) y `Stat` (widget), que
   se habían inventado tres vocabularios distintos para el estado
   (`accent="success"`, `alerta`, `tono="warning"`). También se fue la clase
   `.stat-card` del CSS, que se quedó sin consumidor.

   Y la barra:
   `components/ui/BarraProgreso.jsx`, adoptada en Boletas, Stands y Analytics.
   Las siete copias no eran idénticas y las diferencias no las había decidido
   nadie: `bg-surface-2` en unas y `bg-surface-3` en otras, `h-1`/`h-1.5`/`h-2`
   según el día. Lo que **sí** varía de verdad —alto y color— son props, y el
   color acepta clase o color CSS porque los tres casos existen (fijo, según el
   valor, y venido de un dato). Y acota el porcentaje: el aforo permite
   excederse a propósito, así que un 140 llega hasta aquí y sin acotar se
   pintaba fuera del carril.
6. **Limpieza mecánica:** los 10 comentarios huérfanos, los 11 imports sin
   usar, los 11 exports sin consumidor y el estado no leído de
   `AuthPage.jsx:440` (§3.6). Un solo PR, sin decisiones.

### Decisiones de producto antes de programar

7. **Editor de plantillas de correo:** seis endpoints
   (`routes/emails.js:160-347`) sin UI. ¿Se conecta o se borra? (§3.4)
8. **Bolsa y cuotas de expositores** (`routes/networking.js:341,361,392`):
   misma pregunta (§3.4).
9. **`PATCH` de franja de expositor** (`routes/expositor.js:328`): ¿falta el
   botón «editar horario» o sobra el endpoint? (§3.4)
10. **`ARCHIVOS_PROPIOS`**: la bandera existe y el frontend no tiene ningún
    consumidor, así que encenderla hoy no cambia nada. Decidir si se completa
    o se retira. Y meter las dos banderas en los `.env.example`, donde hoy no
    están (§3.4).

### Anotado, sin tarea

11. `modules/aforo/consultas.js` está muerto **a propósito** (es la traducción
    a MySQL del Frente A). No tocar.
12. Los «exports de más» de `lib/` en los dos repos —constantes internas que se
    exportan sin consumidor externo— son ruido de bajo riesgo. Dejarlos.

---

---

## FRENTE M · El flujo de registro visto de punta a punta — en curso

**Pedido el 2026-09-02**, recorriendo el registro real de FESTECH 2026 con
capturas. Nueve cosas de interfaz más el padrón, que es lo único con
diagnóstico ya hecho. **Nada de esto está empezado.**

### M0 · El padrón previo no reconoce a nadie — ✅ HECHO el 2026-09-02

«Se puso la base de datos grande y no sirve.» Medido contra producción, y la
causa **no** es el tamaño.

**Lo que hay subido:** 4.124 personas en `padron_previo` (una fila por persona
— el `upsert` con `onConflict: evento_id,documento_hash` deduplica bien, así
que subirlo dos veces actualiza en vez de duplicar). Origen:
`reporte_evento_visitas_unicas.xlsx`.

**Por qué no cruza.** `emparejar()` (`lib/padronPrevio.js`) compara el
**encabezado de la columna del archivo** contra la **etiqueta de la pregunta
del formulario**, normalizada, por igualdad exacta. Los encabezados del archivo
son los nombres internos del sistema de origen, así que casi nada coincide:

| Pregunta del formulario | Columna del archivo | ¿Cruza? |
|---|---|---|
| Comuna | `comuna` | ✅ |
| Ciudad de residencia | `ciudad` | ❌ |
| Barrio o vereda | `barrio_vereda` | ❌ — sobra la «o» |
| Edad | `fecha_nacimiento` | ❌ y además es otro dato |
| Documento de identidad | — | no se guarda, **y está bien**: sólo su hash |

**Y hay un segundo problema, más grande:** de las 4.124 personas, **sólo 500
traen esas columnas**. Las otras 3.624 traen únicamente `apellidos` y `nombre
completo`. Otras 436 traen `visit_date`, `room`, `latitude`, `longitude` — datos
de la visita, no de la persona. Así que **aun con los encabezados perfectos, el
88 % del padrón no puede prellenar nada**, porque no hay nada que prellenar.

**Lo construido (los cuatro puntos que se propusieron, hechos):**

1. **Un paso de mapeo, sin plantilla obligatoria.** Tabla en el panel: cada
   pregunta con un desplegable de las columnas del archivo. El organizador las
   conecta una vez y sube el archivo **como lo tenga**. `PUT
   /eventos/:id/padron/mapeo`, guardado en `page_json.padron` — sin migración.
2. **Guardado por `id` de pregunta, no por etiqueta.** Era la mina: el cruce
   iba contra el texto del enunciado, así que renombrar una pregunta rompía el
   padrón **en silencio**. Con el id, renombrarla no lo toca.
3. **«El archivo no lo trae» es una opción del desplegable**, y se conserva
   como decisión: si el organizador lo deja en blanco a propósito, el sistema
   **no** vuelve a adivinar por nombre a sus espaldas. Son tres estados
   distintos —sin mapear / en blanco / mapeado— y confundir dos de ellos
   desactiva el prellenado de todos los eventos que hoy funcionan. Pasó: la
   primera versión usaba `mapeo && mapeo[id]`, que da `null` sin mapeo, y lo
   trataba como «en blanco». **Lo cazó la prueba antes de salir**, y hay un
   test que lo fija.
4. **La subida dice cuántas filas no llenan NI UNA pregunta.** Era el número
   que faltaba: informaba «4.124 personas en el padrón» y con eso un archivo
   inútil se veía igual que uno bueno.

Además: reemplazar el archivo **conserva el mapeo** de las preguntas que sigan
existiendo, y el estado del padrón devuelve columnas y mapeo para poder
corregir una columna sin volver a subir nada.

**Lo que sigue valiendo como consejo:** el archivo debería ser **una fila por
persona** con las columnas que el formulario pregunta. El mapeo arregla los
nombres, no la ausencia de datos: si 3.624 filas traen sólo nombre y apellidos,
no hay mapeo que las salve.

**Lo que NO se hizo, y a propósito:** cruce difuso por parecido. «ciudad»
contra «Ciudad de nacimiento» mete el dato en la pregunta equivocada, y eso es
peor que no prellenar. El mapeo explícito es justo lo que evita adivinar.

**Lo que NO hay que hacer:** cruce difuso por parecido. «Barrio» contra
«Barrio o vereda» acierta, pero «ciudad» contra «Ciudad de nacimiento» mete el
dato en la pregunta equivocada, y eso es peor que no prellenar.

### M0-bis · El mapeo, medido contra producción (2-sep)

Con la conexión a Supabase ya disponible, medido contra **FESTECH IBAGUÉ**
(`festech2026`), que es el evento que tiene padrón:

- `page_json->padron` está **en NULL**: nadie ha guardado todavía el mapeo. Con
  lo que hay hoy, `emparejar()` cae al cruce por nombre y **de las 11 preguntas
  del formulario sólo cruza una**, «Comuna».
- Las 4.124 filas confirman lo diagnosticado: `apellidos` en las 4.124,
  `nombre completo` en 3.624, y **las columnas que el formulario sí pregunta
  —`ciudad`, `barrio_vereda`, `zona_residencia`, `corregimiento`, `genero`,
  `poblaciones`, `discapacidad`, `situacion_actual`— sólo en 500**. Otras 436
  traen `visit_date`, `room`, `latitude`, `longitude`.

Es decir: **guardar el mapeo sube el cruce de 1 pregunta a 10, pero sólo para
esas 500 personas.** Para las otras 3.624 no hay nada que prellenar, y ningún
mapeo lo arregla — eso se arregla subiendo un archivo con los datos, no tocando
código. El mapeo que corresponde, columna por columna:

| Pregunta | Columna |
|---|---|
| Barrio o Vereda | `barrio_vereda` |
| Comuna | `comuna` |
| Ciudad de residencia | `ciudad` |
| Zona | `zona_residencia` |
| Corregimiento | `corregimiento` |
| Identidad de Género | `genero` |
| Autorreconocimiento Étnico | `poblaciones` |
| Discapacidad | `discapacidad` |
| Situación Actual / Enfoque Diferencial | `situacion_actual` |
| Edad | *(sin mapear: el archivo trae `fecha_nacimiento`, que es otro dato)* |
| Documento de Identidad | *(sin mapear: sólo se guarda su hash, y está bien)* |

Falta **guardarlo desde la pantalla de mapeo**, que es lo que sigue sin verse
contra el evento real (M9).

### M-bis · Recorrido en navegador contra eventos reales (2-sep)

Ya no está construido a ciegas. Con el front local apuntando al backend
desplegado, la página pública no pide cuenta, así que el registro se recorrió
entero.

**Contra FESTECH IBAGUÉ (sólo lectura, sin registrar a nadie):** M1 medido en
el sitio donde fallaba. La lista de «Comuna» sale a `document.body`, en
`position: fixed`, con **las 48 opciones** y entera dentro de la pantalla
(526–782 de 800). En móvil (375×812), con el campo pegado al borde inferior
(759–812), **se abre hacia arriba** (499–755) y tampoco se recorta. Elegir una
opción la selecciona y cierra: el clic-fuera aprendió que la lista ya no es hija
del campo.

**Contra TechNova Summit 2026 (el evento de pruebas):** una reserva de prueba de
punta a punta, 14 pasos, **anulada después** (boleta `5TBVH3AV`). En la
confirmación se vio M5 («SI QUIERES SEGUIR EXPLORANDO EL EVENTO», ya no «Falta
un paso»), la tarjeta de sub-eventos con su «Ver →», y M6 como **un solo
«Descargar ▾»** con los tres formatos y su línea de para qué sirve cada uno.

**Y el recorrido encontró un fallo que la lectura no vio:** el menú de descarga
recién escrito **nacía con el mismo problema que M1**. Iba `absolute` dentro del
modal, medía 653–921, y el modal acaba en 769: **la tercera opción, «Sólo el
QR», quedaba fuera del recorte y no se podía pulsar.** Es exactamente el fallo
que se acababa de arreglar al lado.

Por eso la colocación dejó de estar escrita dos veces y vive en
`components/ui/Flotante.jsx` (`usePosicionFlotante` + `Flotante`): portal a
`body`, coordenadas de pantalla, vuelta hacia arriba si abajo no cabe, y remedida
en cada scroll con captura. Lo usan el selector buscable y el menú de descarga.
**Suelto, este fallo vuelve cada vez que alguien añada un desplegable dentro de
un modal.**

**Lo que queda sin ver en navegador:** el menú de descarga después del arreglo
(exigía una segunda reserva de prueba y no se hizo), la lista de sub-eventos por
dentro, el cierre de M8, los dos mapas y «Zonas de interés», y la pantalla de
mapeo del padrón.

### M7-bis · La descripción no existe, y ése es el problema

Medido contra los dos eventos: la única actividad con inscripción de Festech
(`PijaoTech`) **no tiene descripción ni ponente**, sólo `track: "principal"`,
que es el valor por defecto de la agenda. Es decir, pintar lo que venga no
arregla M7 para Festech: no hay nada que pintar.

Dos consecuencias en el código:

1. El `track` por defecto (`principal`, `general`, `default`, `main`) **no se
   enseña**. Llenaba el hueco de la descripción con algo que parece información
   y no lo es.
2. **El aviso se pone donde se arregla**, no donde se sufre: en la agenda del
   panel, un sub-evento que pide inscripción y no tiene ni descripción ni
   ponente lo dice — «al público le sale sólo el título, la hora y el cupo».

### M1 · El desplegable se corta dentro del modal — ✅ hecho

En la captura de «Comuna», la lista de opciones se corta contra el borde del
modal: se ven `10, 11, 12, 13, No sé` y no hay forma de llegar al resto. El
selector buscable pinta su lista **dentro** del contenedor con `overflow`, así
que la recorta. Es primo del fallo del botón de «Continuar» (§0-bis): el modal
acota a sus hijos y un desplegable no es un hijo cualquiera.

### M2 · El correo de contacto de las páginas legales — ✅ HECHO

El contacto es un **Gmail personal** (`medinapipe123@gmail.com`) y tiene que
ser el corporativo. Está **hardcodeado en tres páginas públicas**:
`TerminosPage.jsx:121`, `PrivacidadPage.jsx:103` y `FAQPage.jsx` — una
aparición en cada una.

Hecho como **una sola constante** (`CORREO_CONTACTO` en
`lib/enlacesPublicos.js`) y no como tres reemplazos: repetido en tres sitios,
el día que cambie habría quedado uno viejo — y en una página legal un correo
viejo es la dirección a la que alguien manda un derecho de petición.

**Puesto `juan.medina@hytrex.co`**, que es corporativo y real. Si el definitivo
es un buzón genérico (`contacto@`, `hola@`), es cambiar esa línea — pero antes
hay que comprobar que ese buzón existe y que alguien lo lee, porque si rebota,
rebota un aviso legal.

### M3 · El «← Atrás» del modal — ✅ HECHO

### M4 · El modal de boletas nunca se cierra — ✅ hecho

Si de verdad tiene que desaparecer, hay que dar otra forma de volver (los pasos
de la barra de progreso, por ejemplo) antes de quitarlo.

### M4 · El modal de boletas nunca se cierra — ✅ HECHO

**Era una consecuencia directa de un arreglo anterior, y conviene que quede
escrito.** El modal incrustado se hizo `embebido` —sin fondo oscuro y en el
flujo del documento— para que el botón de «Continuar» fuera alcanzable en
móvil. Aquel fondo oscuro era lo que tapaba la lista de boletas; al quitarlo,
la lista se quedó **arriba** del formulario. Así que alguien rellenaba sus
datos con un «Reservar» a la vista y, tras confirmar, seguía viendo «Boletas
disponibles · Gratis · Reservar» como si no hubiera hecho nada.

Arreglado en `EmbedPage.jsx`: mientras hay formulario o confirmación, la
sección no se pinta. Dentro de un iframe no hay sitio para dos cosas a la vez.

**Queda M8**, que es la otra mitad: al pulsar «Listo» el flujo tiene que
despedirse, no volver al principio.

### M5 · «Falta un paso» es mentira — ✅ hecho

Lo dice cuando el registro ya está hecho. Lo que hay debajo —una actividad que
se apunta aparte— no es un paso que falte, es algo que **se puede** hacer. En
su sitio: «si quieres seguir explorando el evento», y de ahí desplegar los
sub-eventos.

### M6 · Tres descargas para lo mismo — ✅ hecho

«Descargar boleta (PDF)», «Descargar QR» y «Descargar tarjeta» son tres
botones para el mismo objeto. **Un solo «Descargar»**, y que la persona elija
formato (PDF o imagen). Ya se había pedido unificar esto; se quedó en tres
funciones distintas por costumbre, no por diseño.

### M7 · «Actividades con inscripción» no dice nada — ✅ hecho

Sólo sale `PijaoTech · 17 de sept, 10:43 a.m. · 16 cupos · Auditorio 02`. Ni
descripción, ni de qué es, ni quién la da. Literalmente no hay información
para decidir si apuntarse.

### M8 · El flujo no termina — ✅ hecho

Al pulsar «Listo» vuelve al modal de boletas. Tiene que **cerrar** con un
cierre de verdad: «gracias por inscribirte, te esperamos el {fecha}», y salir.

### M9 · Verificar en navegador lo que se construyó a ciegas

Arrastrado de antes y sigue pendiente: **«Zonas de interés» y los dos mapas no
se han visto contra un evento real.** Los componentes están medidos en
aislamiento —el marcador con sus 12 combinaciones—, pero el cableado de cada
pantalla no. El entorno donde se escribieron no tiene credenciales de Supabase.

**Orden sugerido:** M2 y M3 son de un minuto y uno es un dato público. Luego M4
y M8, que son el mismo bug de fondo —el modal no se desmonta— y son lo que hace
que el flujo «no tenga sentido». Después M6 y M5 (texto y unificación), M7 y M1.
M0 aparte, porque necesita decidir entre el apaño de hoy y el mapeo de verdad.

## FRENTE N · Dos secciones, y que todo se relacione con todo — sin empezar

**Pedido por Sekkon0906 el 2026-09-02**, con estas palabras: «tener una sola
zona para crear las zonas de interés, y ahí mismo manejar el aforo, etc. No
tener todo separado por secciones porque la experiencia de usuario sería más
compleja. Una sección *Actividades del evento* con Torneos, ruedas de negocio y
las actividades que se vayan colocando; otra *Zonas del evento* con Zonas de
interés, aforo por zonas, stands y mapa del evento, y que todo esté conectado
para poder relacionar todo entre sí: asignar actividades a las zonas, también
speakers, etc.»

Continúa el **Frente I**, que hizo esto para una zona sola. Aquí se cierra: la
agrupación de las nueve pestañas, y las relaciones que hoy existen y no se usan.

---

### El hallazgo, y cambia por dónde se empieza

**Casi todo lo que se pide ya existe en la base de datos. Lo que no existe es en
la pantalla, y las relaciones que hay están vacías.**

`agenda_sessions` —la tabla de los sub-eventos— ya es la tabla de unión de todo
esto. Medido contra producción el 2-sep, sobre **11 sesiones**:

| Columna | Con qué relaciona | Filas que la usan |
|---|---|---|
| `speaker_id` | el ponente | **5 de 11** |
| `zona_id` | la zona del recinto | **2 de 11** |
| `torneo_id` | las llaves del torneo | **0 de 11** — y hay **4 torneos** |
| `expositor_id` | el stand / expositor | **0 de 11** |
| `ticket_type_id` | qué boleta da derecho | **0 de 11** |
| `tipo`, `subcategoria` | qué clase de actividad es | 3 tipos de 11 posibles |

Y en paralelo: **4 sesiones tienen `ubicacion` escrita a mano**, más que las 2
que tienen zona. De **3 expositores, ninguno tiene zona**.

**No hace falta inventar el modelo. Hace falta que se use.**

### Por qué está vacío: la relación es opcional y compite con un atajo

Las tres relaciones muertas fallan por la misma razón, y no es que falte
código:

- **Zona.** El formulario ofrece dos maneras de decir dónde pasa algo: elegir
  una zona, o escribir un texto. Gana el texto, porque el texto siempre está y
  la zona sólo aparece si alguien creó zonas antes. Peor: `SessionForm.jsx:189`
  **copia el nombre de la zona al campo de texto** al elegirla, así que el dato
  bueno y el dato suelto conviven y nadie sabe cuál manda.
- **Torneo.** El camino existe y funciona: `HuecoEnCalendario` en
  `TorneoCrear.jsx:156` pregunta si el torneo tiene hueco en el calendario y lo
  crea. Es **opcional**, y el resultado es 4 torneos y 0 enlaces. Su propio
  comentario dice qué pasa cuando nadie se acuerda: «un torneo invisible para
  el público».
- **Expositor y boleta.** Las columnas están y ningún formulario las ofrece.

**Ésta es la causa de fondo de lo que se siente como «todo separado».** Un plan
que sólo reordene el menú dejaría esto exactamente igual: las pestañas juntas y
los datos igual de sueltos.

### La otra causa: una zona no es una fila

Una zona vive en `eventos.page_json.zonas`. No hay tabla `zonas`. Lo que ya se
paga por eso:

1. **No hay integridad.** Un `zona_id` que apunta a una zona borrada se guarda
   igual. Tanto es así que `routes/networking.js` tiene `zonaInvalida()`, una
   validación **a mano** que lee `page_json` en cada escritura para hacer el
   trabajo de una clave foránea. La 0079 y la 0080 no la hacen, y por eso
   acumulan huérfanos.
2. **No se puede preguntar «qué hay en esta zona» con un join.** Hay que leer
   `page_json`, leer las sesiones, leer los stands y cruzar en memoria. Eso es
   lo que hace `GET /:eventoId/mapa/vivo`, y funciona — pero es la única
   puerta, y cada relación nueva tiene que pasar por ahí o repetir el cruce.

**Convertir la zona en tabla es lo que hace barato «relacionar todo con todo».**
Sin eso, cada relación nueva es otro cruce a mano.

### Lo que ya está hecho y conviene no volver a planificar

El Frente I dejó más cerrado de lo que dicen sus propios comentarios:

- **La administración de zonas ya vive en «Zonas de interés»**
  (`ZonasSection.jsx:150` crea, edita, borra y guarda). Ya **no** hay dos
  caminos de escritura: `MapaSection` sólo coloca (`:145`, «esta pantalla no es
  dueña de zonas ni de accesos») y `AccesosSection` sólo escribe `accesos`.
- **La cabecera de `ZonasSection` está vieja**: dice «la administración se muda
  aquí en la fase siguiente» y ya se mudó. Corregirla entra en la Fase 1.
- **`MapaSection.jsx:387` apunta a una pestaña que se movió**: dice «Se opera en
  Asistentes → Aforo por zonas» y el aforo está hoy en Espacio del evento. Un
  renglón, pero manda a la gente a un sitio donde no está.

---

### La agrupación que se pide

Nueve pestañas hoy, todas bajo «Espacio del evento»:

> Calendario · Torneos · Rueda de negocios · Mapa del evento · Accesos e
> ingresos · Zonas de interés · Aforo por zonas · Stands · Ranking

Propuesta, dos secciones de cinco:

**Actividades del evento** — *qué pasa*

| Pestaña | Qué contesta | Viene de |
|---|---|---|
| Calendario | cuándo pasa cada cosa | `calendario` |
| Torneos | cómo van las llaves | `torneos` |
| Rueda de negocios | las citas con expositores | `networking` |
| Speakers | quién habla | hoy es un interruptor dentro del Calendario |
| Ranking | qué puntos reparten las actividades | `ranking` |

**Zonas del evento** — *dónde pasa*

| Pestaña | Qué contesta | Viene de |
|---|---|---|
| Zonas de interés | qué es esta zona (y se administra aquí) | `zonas` |
| Mapa del evento | dónde queda en el plano | `mapa` |
| Aforo por zonas | cómo va ahora mismo | `aforo` |
| Stands | quién está montado ahí | `stands` |
| Accesos e ingresos | por dónde se entra | `accesos` |

La regla que las separa, para que no haya que discutirla cada vez: **una
actividad ocurre en el tiempo; una zona existe en el espacio.** Un torneo es
actividad aunque tenga sitio; un stand es sitio aunque tenga horario.

### Qué NO fusionar, y por qué

Decidido en el Frente I, sigue valiendo:

- **Los tres mapas no se fusionan.** Editor del plano, tablero en vivo y mapa
  público son tres contextos de permisos distintos (organizador editando,
  organizador operando, público mirando). Se comparten los datos y el marcador,
  no la pantalla.
- **Aforo no entra dentro de Zonas de interés.** Zonas contesta «qué es esta
  zona» y se mira; Aforo contesta «cómo va» y se opera de pie, con el móvil,
  con cola en la puerta. Se enlazan, no se funden.
- **`ticket_types.zonas_acceso` no es esto.** Pese al nombre, no tiene que ver
  con las zonas del recinto (§3.7).

---

### Fase 2 — ✅ hecha el 2026-09-02 · que la relación deje de ser opcional

- **La zona ya no compite con un atajo.** El formulario copiaba el nombre de la
  zona al campo de texto al elegirla: dejaba DOS verdades y, al renombrar la
  zona, la copia se quedaba vieja sin aviso. Ahora la zona es la respuesta y
  «Ubicación» pasa a «Detalle del sitio».
- **Avisos donde se ven:** en el formulario y en la LISTA, que es donde se
  notan las nueve que faltan.
- **El torneo se pregunta al crearlo.** La tarjeta `HuecoEnCalendario` existía,
  funcionaba y era opcional: 4 torneos, 0 enlazados. Ahora «¿cuándo se juega?»
  va en el alta, y la franja se crea en su propio `try` — si falla, el torneo ya
  existe y perderlo por no poder escribir la hora sería absurdo.
- **Expositor y boleta**, los dos campos que faltaban para dos columnas que ya
  estaban. Backend: entraron en la lista blanca del PATCH y en el alta, con
  validación de que el id **sea de este evento** — `assertOwner` dice que mandas
  en el evento, no que ese expositor sea suyo.
- `test/agendaRelaciones.test.js`: las cinco relaciones se pueden editar, se
  pueden poner al crear, y lo que apunta a otra tabla se valida.

### Fase 1 · La agrupación · barato, sin backend

> **Se hace en la misma pasada que el FRENTE O2**, que reagrupa el menú entero.
> Es la misma estructura y el mismo mapa de rutas viejas: partirlo en dos
> sesiones es tocar `EventWorkspace.jsx` dos veces y migrar los enlaces dos
> veces.

Partir `espacio` en `actividades` y `zonas` en la lista de secciones
(`EventWorkspace.jsx:94`). Es una estructura de datos; el `switch` de render
(`:439`) cambia sólo de prefijo.

**Lo que no se puede olvidar:** el mapa de rutas viejas (`:190-199`) ya traduce
seis rutas heredadas a `['espacio', …]`. Hay que **ampliarlo, no
reemplazarlo**, y añadir las nueve `espacio/*`. Hay enlaces internos que
apuntan a `?s=espacio&t=…` —`CheckinTab.jsx:400,425`, `AforoSection.jsx:141`,
`AccesosSection.jsx:285`, `MapaSection.jsx:474`— y quedarían rotos.

Aprovechar para: sacar **Speakers** a su propia pestaña (hoy es un interruptor
dentro del Calendario y por eso no se encuentra), corregir la cabecera vieja de
`ZonasSection` y el puntero muerto de `MapaSection.jsx:387`.

**Prueba que conviene dejar escrita:** que toda ruta vieja resuelva a una
sección y pestaña que existan, y que ningún enlace interno del código apunte a
un par que no está en la lista. Es el tipo de fallo que no da error y deja la
pantalla en blanco — el mismo espíritu que `montaje.test.js`.

### Fase 2 · Que la relación deje de ser opcional · lo que de verdad cambia el uso

Sin esto, lo demás es mudar muebles.

1. **Si el evento tiene zonas, el sitio se elige — no se escribe.** El texto
   libre queda como salida para eventos sin plano, no como camino por defecto.
   Y deja de copiarse el nombre de la zona al campo de texto: hoy eso crea dos
   verdades.
2. **`ubicacion` se rellena desde la zona al leer**, no al escribir. Lo ya
   escrito a mano se sigue viendo, y lo nuevo queda relacionado.
3. **Crear un torneo ofrece su hueco en el calendario en el mismo paso**, en
   vez de dejarlo para una tarjeta que hay que ir a buscar. 4 de 4 torneos sin
   enlazar dicen que la tarjeta no basta.
4. **El expositor y la boleta, en el formulario de sub-evento.** Las columnas
   están; falta el campo. «Este taller lo da tal stand» y «hace falta boleta
   VIP» son dos preguntas que hoy no se pueden contestar.
5. **Avisos donde se arreglan**, como el de M7-bis: una actividad sin zona
   teniendo el evento zonas, y un torneo sin hueco en el calendario, se
   señalan en su propia pantalla.

### Fase 3 · Que la zona sea una fila · el trabajo de fondo

Migración: tabla `zonas` (`id`, `evento_id`, `nombre`, `aforo_max`, `color`,
`x`, `y`, `orden`), con FK desde `agenda_sessions.zona_id`,
`networking_expositores.zona_id` y `zona_cortes.zona_id`.

**Expand/contract, y `page_json.zonas` NO se borra en el mismo paso.** Es DDL
sobre datos de eventos en producción; la regla del repo es escribir el rollback
antes (§3.5 ya tiene dos migraciones paradas por esto). Orden: crear tabla y
copiar → escribir en las dos → leer de la tabla → dejar de escribir el JSON →
borrar el JSON, **en una migración aparte y más tarde**.

Lo que se gana: `zonaInvalida()` desaparece —lo hace la FK—, y «qué hay en esta
zona» pasa a ser un join.

Va **después** de la Fase 2 a propósito: hacer que la relación se use no
necesita la tabla, y al revés la tabla nacería con 2 de 11 filas apuntando a
algo. Primero que el dato exista, después que la base lo sostenga.

### Fases 3, 4 y 5 — ✅ hechas el 2026-09-02

**Fase 3 (zonas como tabla)** aplicada en producción en tres pasos:
la 0091 creó y copió; el código pasó a **leer de la tabla y escribir en las
dos**. `zonasDelEvento` resultó ser la única puerta de lectura del backend
—nueve llamadas en cinco archivos—, así que cambiarla lo cambió todo, incluida
`zonaInvalida()`, que ahora valida contra la misma tabla que la clave foránea.
**Falta el paso 3** (dejar de escribir el JSON): mientras siga ahí, revertir es
gratis, y conviene dejarlo correr.

**Fase 4:** `agendaPorZona` trae ya el speaker, el expositor y el tipo de
boleta de cada sesión, y la ficha de zona dice **quién habla aquí** sin repetir
a quien da dos charlas. Es la pregunta que obligaba a recorrer el calendario
entero mirando cuál cae en esta zona.

**Fase 5:** los tipos de sub-evento son un dato (`page_json.tipos_extra`), con
pantalla para crearlos donde antes sólo se podían pedir. **La firma de
`tipoEspacio(id)` no cambió** — el segundo argumento es opcional, así que los
seis consumidores siguen funcionando y los que tienen el evento ven los tipos
propios. El icono se elige de una lista cerrada y `competitivo` no se ofrece:
lo primero porque un trazo inventado dejaría el hueco en el panel, la agenda
pública y el embed; lo segundo porque engancha con las llaves de un torneo.

### Fase 4 · La ficha de zona, completada

**Ojo con no replanificar lo hecho:** «asignar actividades a las zonas» —colgar
y descolgar una actividad o un stand **desde la zona**— ya está, es la Fase 3
del Frente I, con el componente `<Colgar>` y sus tres permisos por separado.
Lo que se pidió como «desde la zona» en su parte gruesa está resuelto.

Lo que falta es lo que las relaciones nuevas de la Fase 2 hacen posible:

- **Quién habla en esta zona.** `speaker_id` ya existe y `mapa/vivo` ya trae la
  agenda de la zona; es juntar dos cosas que están, no una función nueva.
- **Qué boleta hace falta para lo que pasa aquí**, en cuanto la Fase 2 llene
  `ticket_type_id`. Es la pregunta que hoy se contesta mirando tres pantallas.
- **El expositor que da la actividad**, distinto del stand que está montado en
  la zona: hoy se confunden porque sólo existe el segundo.

Barato después de la Fase 3; con `page_json` cada uno es otro cruce en memoria.

### Fase 5 · Que un tipo de actividad sea un dato

«Las diferentes actividades que se irán colocando» hoy son una constante:
`lib/espacio.js` → `TIPOS_ESPACIO`, once tipos fijos. Añadir uno es **publicar
código**, y por eso existe el «¿Falta tu tipo de sub-evento? Pídenoslo» del
Calendario, que es un buzón (J1) — sirve para decirlo, no para ponerlo.

Que el catálogo sea una tabla por organizador, con los once actuales de semilla.
Cuidado con lo que la constante ya protege: `competitivo: true` es lo que
engancha un tipo con las llaves del torneo, y el color y el icono los leen el
panel, la página pública y el embed. Un tipo creado por el organizador tiene que
traer las tres cosas o se verá roto en dos de los tres sitios. Y el icono es un
trazo de `Iconos.jsx`, no un emoji — eso se decidió a propósito.

**Va la última.** Es la más vistosa y la que menos arregla: no sirve de nada
inventar tipos de actividad si la actividad sigue sin saber en qué zona ocurre.

---

### Orden

**1 → 2 → 3 → 4 → 5.** La 1 es barata y es la que se ve. La 2 es la que cambia
los números de arriba. La 3 es la cara y la que no conviene tocar con prisa.

### Lo que este frente no arregla

Que `mapa/vivo` sea la única puerta a los datos cruzados. Funciona y da la
pantalla entera en una llamada; partirlo en consultas pequeñas «porque ahora hay
joins» sería cambiar algo que anda por algo que se lee mejor. Se mira cuando la
Fase 3 esté, no antes.

---

## FRENTE O · El menú entero, los roles y a quién se le asigna — sin empezar

**Pedido por Sekkon0906 el 2026-09-02**, tres cosas en una: «agrupar la mayoría
de funciones, porque hay varias cosas que están separadas por secciones que al
final son para la misma sección»; «mejorar la asignación de tareas, que se pueda
seleccionar por roles — al asignar una puerta de ingreso sólo se puede
seleccionar por nombres, y en un evento con mucha gente es poco eficiente»; y
«volver a crear los roles, uno que tenga todos los permisos y el resto
refactorizados según el nombre».

El **Frente N** parte «Espacio del evento» en dos. Éste mira el menú completo,
y las dos cosas que lo cruzan: quién puede hacer qué, y a quién se le asigna.

---

# Parte 1 · El menú entero

Hoy: **8 secciones, 39 pestañas.**

| Sección | Pestañas |
|---|---|
| Resumen | Resumen |
| Event Experience | Landing · Publicación · Proceso de compra · Emails · SEO |
| Espacio del evento | Calendario · Torneos · Rueda de negocios · Mapa · Accesos · Zonas de interés · Aforo · Stands · Ranking |
| Organización | Equipo y roles · Vacantes · Tareas · Sugerencias · Documentos · **Reporte** |
| Comercial | Boletas · Pagos · **Analytics** · Promociones · Facturación |
| Asistentes | Clientes · Escanear · Lista de espera · Invitaciones · **Credenciales** · **Tarjeta** |
| Comunicación | Chats · **Anuncios** |
| Configuración | General · Integraciones · Automatizaciones · API\* · Seguridad\* |

\* placeholders: dos pestañas que no hacen nada ocupando sitio en el menú.

### El diagnóstico: el menú mezcla tres criterios

No están mal agrupadas por descuido. Están agrupadas por **tres ejes a la vez**,
y por eso una misma cosa cae en dos sitios según con qué eje se mire:

- por **objeto** — Espacio del evento, Asistentes;
- por **momento** — Event Experience es *antes*, Comercial es *la venta*;
- por **quién mira** — Organización es papeleo del organizador.

Cuando hay tres ejes, la respuesta a «¿dónde está X?» es «depende», y eso es
exactamente lo que se siente. Es el mismo error que ya se corrigió una vez: la
Agenda colgaba de Organización —junto a Vacantes y Documentos— y los torneos
vivían en «Dinámicas», siendo las dos cosas sub-eventos de la misma tabla.

### Lo que está partido y es lo mismo, con la evidencia

1. **Credenciales + Tarjeta** (Asistentes). Una diseña la **escarapela
   imprimible**, la otra el **carné digital**. Es la misma pregunta —qué lleva
   encima el asistente— en dos pantallas que no se hablan. → una pestaña,
   **Acreditación**, con las dos vistas.
2. **Reporte (Organización) + Analytics (Comercial).** El propio encabezado de
   `ReporteTab` dice que «consolida en una sola hoja lo que quedó repartido por
   el workspace: ventas, asistencia, gamificación, expositores, tareas y
   contrataciones». Analytics son las mismas métricas por rango de fechas. Las
   dos contestan «cómo va / cómo fue», y están en secciones distintas — y
   Reporte, además, junto a Vacantes y Documentos, que es papeleo.
3. **Lista de espera + Invitaciones** (Asistentes). Las dos son **gente que
   todavía no tiene boleta**. Se operan juntas y están separadas.
4. **Emails (Event Experience) + Anuncios (Comunicación).** Las dos mandan
   mensajes a los asistentes. Emails está en Event Experience porque son
   plantillas; Anuncios en Comunicación porque es un envío. Quien quiere «avisar
   algo» tiene que saber de antemano cuál de las dos es.
5. **Proceso de compra (Event Experience) + Boletas + Promociones (Comercial).**
   Qué se vende, cómo se vende y con qué descuento, en dos secciones.
6. **Resumen es una sección con una sola pestaña.** Una sección entera del menú
   para una pantalla.

### La propuesta: un solo eje, el objeto

**Nueve secciones, ~33 pestañas.** La regla, escrita para no discutirla cada
vez: **cada sección es una cosa del evento, no un momento ni un departamento.**

| Sección | Pestañas | Qué cambia |
|---|---|---|
| **Resumen** | Resumen · Analytics · Reporte | deja de ser una sección de una pestaña; la medición vive junta |
| **Tu página** | Landing · Publicación · SEO · Proceso de compra | era Event Experience; se va Emails |
| **Actividades del evento** | Calendario · Torneos · Rueda de negocios · Speakers · Ranking | Frente N |
| **Zonas del evento** | Zonas de interés · Mapa · Aforo · Stands · Accesos | Frente N |
| **Entradas y dinero** | Boletas · Promociones · Pagos · Facturación | era Comercial; se va Analytics |
| **Asistentes** | Clientes · Escanear · Acreditación · Antes de la boleta | Credenciales+Tarjeta juntas; Lista de espera+Invitaciones juntas |
| **Equipo y tareas** | Equipo y roles · Tareas · Vacantes · Sugerencias · Documentos | era Organización; se va Reporte |
| **Mensajes** | Chats · Anuncios · Emails | las tres formas de decir algo, juntas |
| **Configuración** | General · Integraciones · Automatizaciones | fuera los dos placeholders |

**Dónde no tocar:** «Escanear» se queda como está y con su nombre. Ya se
renombró a propósito —«ya no sólo controla el ingreso»— y es la pantalla que se
usa de pie, con cola delante. Cambiarle el sitio a esa cuesta caro.

---

# Parte 2 · Los roles

### Lo medido, y es peor que «hay que refactorizarlos»

10 roles de sistema por evento, **273 filas** en `event_roles`, y **29
miembros, todos con rol asignado**. El catálogo de permisos tiene **21
permisos** (`src/lib/permisos.js`).

**a) No existe el rol que se pide. Sólo el dueño puede todo, y el dueño no es
un rol.** Las pantallas más sensibles se guardan con `__solo_owner__`
(Accesos, Anuncios, Lista de espera, toda Configuración). No hay forma de
delegar «todo» a una segunda persona: hay que darle el evento.

**b) 6 de los 21 permisos no los comprueba nadie.** El propio catálogo lo marca
con `aplicado: false`: `gestionar_descuentos`, `vip_zone`, `crear_canales`,
`borrar_mensajes`, `ver_pagos`, `reembolsar`. Consecuencia directa:

- **«VIP host»** concede `vip_zone` — y `vip_zone` no aparece en ninguna ruta
  del backend. El rol no da nada.
- **«Finanzas»** concede `ver_pagos` y `reembolsar`; ninguno se comprueba. Lo
  único suyo que surte efecto es `ver_analytics`.
- **«Moderación»** concede `borrar_mensajes` y `crear_canales`, ninguno
  aplicado. Lo único que le funciona es `gestionar_agenda`, que no tiene nada
  que ver con moderar.

**c) Nombres que no dicen lo que dan.**

| Rol | Lo que concede | El problema |
|---|---|---|
| **Speaker** | `gestionar_agenda` | un ponente puede editar la agenda **entera** |
| **Expositor** | `gestionar_expositores` | un expositor puede administrar a **todos** los expositores — y el expositor de verdad ya tiene su propio camino público, `/expositor/:codigo`, con su lista corta de campos |
| **Staff · Logística** | `ver_clientes` y nada más | no puede hacer nada logístico |

**d) CORRECCIÓN (2-sep, al ir a arreglarlo): las dos semillas SÍ coinciden.**
`private.fn_roles_semilla()` y `modules/eventos/semillas.js` dicen exactamente
lo mismo. Lo que diverge es **lo guardado**, y el hallazgo real es peor: **el
mismo rol da permisos distintos según cuándo se creó el evento.** Medido sobre
los 33 de producción — 31 creados antes del 11-ago llevan la lista traducida
del inglés de la 0007, y sólo 2 (del 16-ago en adelante) llevan la buena:

| Rol | En `semillas.js` | En producción |
|---|---|---|
| Editor | + `gestionar_imagenes`, `gestionar_agenda` | + `ver_clientes`, `crear_canales` |
| Coordinador | + `gestionar_agenda`, `ver_analytics` | + `gestionar_tickets`, `ver_pagos` |
| Staff · Logística | `crear_canales`, `gestionar_agenda` | `ver_clientes` |
| Staff · Atención | `ver_clientes`, `checkin` | `ver_clientes`, `gestionar_clientes` |

La 0054 arregló la función; los datos ya escritos se quedaron. Traducir
«view_analytics» da «ver_analytics», pero no puede inventar los permisos que
aquella lista en inglés no tenía. Resultado hoy: en 31 de 33 eventos,
«Staff · Logística» **no puede hacer nada logístico** — sólo `ver_clientes`.

Lo arregla la **0089** (O3), que realinea ÚNICAMENTE las filas cuyo contenido es
exactamente el de la traducción vieja: si alguien editó el rol a mano, esa
decisión es suya y se respeta.

**e) La unión de permisos está escrita tres veces.** `role.permissions ∪
custom_permissions` se resuelve en `core/permisos/index.js:168`,
`routes/eventos.js:133` y `routes/eventos.js:289`. Es el patrón que este repo
ya pagó dos veces esta semana.

### Los roles propuestos

Regla: **el nombre dice quién es la persona; los permisos dicen qué puede.** Y
un rol no concede permisos que el servidor no comprueba.

| Rol | Permisos | Nota |
|---|---|---|
| **Administrador** | todos los `aplicado: true` | **el que falta.** Delegar sin regalar el evento |
| **Editor** | `editar_evento`, `editar_pagina_publica`, `gestionar_imagenes` | la página, no la gente |
| **Coordinador** | Editor + `gestionar_agenda`, `gestionar_torneo`, `gestionar_expositores`, `invitar_staff` | arma el evento por dentro |
| **Programación** | `gestionar_agenda`, `gestionar_torneo` | era **Speaker** |
| **Coordinación de expositores** | `gestionar_expositores` | era **Expositor** |
| **Puerta** | `checkin`, `ver_clientes` | era **Staff · Acceso** |
| **Atención** | `ver_clientes`, `gestionar_clientes` | era **Staff · Atención** |
| **Taquilla** | `gestionar_tickets`, `ver_clientes`, `gestionar_clientes` | nuevo: hoy vender boletas exige `editar_evento` |
| **Finanzas** | `ver_analytics` (+ `ver_pagos`, `reembolsar` cuando se apliquen) | |
| **Moderación** | (`borrar_mensajes`, `crear_canales` cuando se apliquen) | sin `gestionar_agenda` |

**Se van:** «Speaker» y «Expositor» como roles de staff. Un ponente y un
expositor **no son personal del evento**: sus fichas ya viven en `speakers` y
en `networking_expositores`, y el expositor ya tiene su enlace propio. Tener
además un rol con su nombre es lo que hace que conceda de más.

**«Staff · Logística» desaparece** hasta que haya un permiso que signifique
algo para logística. Un rol que sólo deja ver la lista de clientes no es un rol.

### El riesgo, y cómo se toca

**29 miembros apuntan a un `rol_id`.** Borrar y recrear roles deja gente sin
permisos en 27 eventos. Va con expand/contract:

1. Crear **Administrador** (nuevo, no toca a nadie) y arreglar la semilla para
   que las dos coincidan.
2. **Renombrar** in situ los que cambian de nombre — el `id` no se toca, así
   que nadie pierde su rol.
3. **Ajustar permisos** de los que conceden de más, uno por uno y anotado.
4. **No borrar** un rol que tenga miembros: primero mover a la gente, y eso lo
   decide el organizador, no la migración.

Y una regla nueva que conviene dejar escrita: **un rol no puede conceder un
permiso con `aplicado: false`.** Una prueba que compare la semilla contra el
catálogo lo caza solo, en el estilo de `montaje.test.js`.

---

# Parte 3 · A quién se le asigna

### Lo medido

`tareas` **ya asigna por persona o por rol** (`asignado_user_id`,
`asignado_rol_id`), y `TareasTab` ya lo ofrece. Eso no hay que rehacerlo — de
5 tareas, 1 está asignada a un rol.

**El problema está en la puerta, y es exactamente el que se describe.**
`AccesosSection.jsx:257-268` pinta «Quién registra aquí» como **un botón por
cada miembro del equipo**, con el nombre y nada más: sin rol, sin buscador, sin
agrupar. Con 40 personas son 40 fichas seguidas, y no hay forma de saber cuál
de los cuatro «Juan» es el de puerta.

Y hay **siete sitios** que piden el equipo y arman su propia lista:
`AccesosSection`, `TareasTab`, `ChatTab`, `EquipoTab`, `ResumenSection`,
`MiEventoWidget` y `AjustesPage`. Cada uno decide por su cuenta qué enseña de
cada persona. Por eso uno sabe de roles y otro no.

### La propuesta

**Un solo `<SelectorDePersonas>`**, y que los siete lo usen:

- **Busca** por nombre y por correo (el mismo `sinTildes` de
  `SelectorBuscable`: nadie escribe «Muñoz» con eñe en un buscador).
- **Agrupa por rol** y enseña el rol al lado del nombre. Es el dato que
  distingue a los cuatro «Juan».
- **Deja elegir un rol entero**: «todos los de Puerta». Es lo que se pide de
  verdad —no se asigna a Juan, se asigna a quien esté en la puerta— y es lo que
  hace que el evento con mucha gente sea manejable.
- **Muestra a los que ya están seleccionados arriba**, como `MultiBuscable`, en
  vez de obligar a buscarlos entre cuarenta para quitarlos.

En datos: `page_json.accesos[].staff` guarda ids de persona; se le añade
`roles: [rolId]`, igual que `tareas` ya distingue las dos. Al resolver quién
atiende una puerta se unen las dos listas.

**Sin backend nuevo:** `equipoApi.list` ya devuelve `rol` y `rol_id` por
miembro (`routes/equipo.js:26`), y `rolesApi.list` ya da el catálogo. Lo que
falta es una pantalla que los junte.

---

# Orden

**O1** · El selector de personas compartido, y la puerta usándolo. Frontend
solo, sin migración, y arregla hoy lo que se pidió. → *empezar por aquí*

**O2** · ~~El menú: las nueve secciones~~ — ✅ **hecho el 2026-09-02**, junto con
la Fase 1 del Frente N. **9 secciones, 36 pestañas** (eran 8 y 39).

- «Espacio del evento» partido en **Actividades del evento** (qué pasa) y
  **Zonas del evento** (dónde pasa). **Speakers** sale a su propia pestaña: era
  un conmutador dentro del Calendario y por eso no se encontraba.
- Fusionadas: **Acreditación** (Credenciales+Tarjeta), **Antes de la boleta**
  (Lista de espera+Invitaciones), **Analytics y Reporte** dentro de Resumen
  —que era una sección de una sola pestaña— y **Mensajes** (Chats, Anuncios,
  Emails). Fuera los dos placeholders de Configuración.
- **Las dos fusiones de Asistentes cambiaban permisos y no se hicieron a
  secas.** La escarapela la imprime quien está en la puerta (`checkin`) y el
  carné lo diseña quien lleva los clientes (`ver_clientes`); la lista de espera
  es del dueño y las invitaciones no. Cada pantalla fusionada comprueba dentro
  el permiso de su vista, así que nadie ganó ni perdió acceso.
- `REUBICADAS` pasó de 8 a 37 entradas: **ningún enlace guardado cae en el
  Resumen**. Las de la primera mudanza (Dinámicas → Espacio) siguen ahí y ahora
  apuntan dos saltos más allá, a su destino de hoy.
- `tests/menu.test.mjs`: que toda pestaña tenga pantalla, que toda ruta vieja
  lleve a una que existe, y que **todo `?s=…&t=…` escrito en el código** lleve
  a alguna parte. Comprobado que muerde: renombrando un `case` a mano, falla.
- Actualizados los 16 atajos del buscador y los enlaces internos. Uno de ellos
  construía la ruta por partes (`base` + `&t=…`) y **se escapaba de la prueba**:
  sus cinco destinos ahora viven en dos secciones distintas.

**O3** · ~~El rol **Administrador** y la semilla arreglada~~ — ✅ **escrito el
2026-09-02, SIN APLICAR**. Migración `0089_rol_administrador_y_realineo.sql`:
crea el rol que puede todo (con `orden = 0`), lo mete en los 33 eventos que ya
existen, y realinea los roles viejos **sólo donde nadie los tocó**. Reversible,
idempotente, sin un solo `DROP`, con el rollback escrito al final.

Un detalle que casi la rompe: la 0056 movió `fn_roles_semilla` de `public` a
`private`. Escribirla en `public` no habría dado error — habría creado una
función **fantasma** que nadie llama, y el rol nuevo no habría aparecido en
ningún evento nuevo. Comprobado contra la base antes de escribirla.

Pruebas: `test/rolesSemilla.test.js` — que las dos semillas repartan lo mismo,
que exista un rol que puede todo (y que ningún otro pueda algo que él no), y que
ninguna siembre un permiso que la pantalla de roles no conoce. **427 en verde.**

**Falta aplicarla**: es DDL sobre producción y va con permiso.

**O4** · ~~Renombrar roles~~ — ✅ **escrito, SIN APLICAR** (`0090`). Speaker →
**Programación** (y pierde poder editar la agenda entera), Expositor →
**Coordinación de expositores**, Staff·Acceso → **Puerta**, Staff·Atención →
**Atención**, y Moderación pierde `gestionar_agenda`. Se **renombra in situ**:
recrear el rol dejaría sin permisos a los 29 miembros que apuntan a su `rol_id`.
Sólo donde conserva su nombre Y su descripción de origen.

**O5** · ~~La unión de permisos en un solo sitio~~ — ✅ **hecho**, y era peor de
lo anotado: estaba escrita en **cinco** sitios y **dos no hacían la unión**.
`routes/clientes.js` es el gate del escáner: quien tuviera `checkin` como
permiso **suelto** —sin cambiarle el rol, que es para lo que existen los
sueltos— recibía «No autorizado». `routes/chat.js` ignoraba igual
`crear_canales` y `borrar_mensajes` individuales. Ahora `permisosDeMiembro()` y
`SELECT_PERMISOS` en `core/permisos`.

**Y otra corrección medida:** los permisos decorativos son **cuatro, no seis**.
`crear_canales` y `borrar_mensajes` **sí** se comprueban —cinco veces en
`chat.js`— y el catálogo los marcaba como no aplicados. La marca mentía en la
dirección peor: decía que conceder eso no cambia nada.

**O6** · Aplicar de verdad los seis permisos decorativos, o quitarlos del
catálogo. Es una decisión de producto, no de código: hoy `ver_pagos` esconde una
pestaña en el navegador y no protege nada en el servidor. Esconder una pestaña
no es control de acceso — en este caso lo que sí protege esas pantallas es
`editar_evento`, así que no hay un agujero abierto, pero el rol promete algo que
no cumple.

---

## FRENTE P · Una entrada, tres salidas — sin empezar

**Pedido por Sekkon0906 el 2026-09-02**: «plantea la relación de la tarjeta con
la entrada de la persona y demás, ya que, como dije en su momento, se estaba
dándole manejo como si fueran diferentes modalidades, cuando literalmente
sirven para lo mismo».

Tiene razón, y ya se pagó una vez.

---

### La prueba de que no son modalidades distintas

Está escrita en `lib/qrEscaneado.js`, y es el mejor argumento del frente:

> El diseñador de credenciales imprimía la URL `https://…/mi-ticket/ABCD1234`,
> mientras la boleta digital imprimía el **token firmado**. Así que **la
> escarapela impresa no pasaba el control de ingreso**: el servidor recibía una
> URL donde esperaba una firma y contestaba «QR inválido». Ni servía para dar
> puntos en un stand, ni para canjear. **Un papel con un QR que no abre ninguna
> puerta.**

Está corregido de origen, y quedó un traductor permanente para las escarapelas
impresas antes —a nadie se le puede pedir que reimprima cien la mañana del
evento—. Pero la causa no fue un descuido de programación: fue que **dos
pantallas trataban el mismo objeto como si fueran dos cosas**, y cada una
decidió por su cuenta qué meter en el QR.

### Lo que hay hoy, medido

Una sola cosa —**la entrada de una persona**, fila en `tickets` con su `codigo`
y su `qr_token`— sale por **tres puertas**:

| Salida | Quién la dibuja | Diseño del organizador |
|---|---|---|
| **Tarjeta en pantalla** (`WalletCard`) | `components/public/WalletCard.jsx` | ✅ `page_json.wallet`, por variante |
| **Escarapela impresa** | mismo componente, mitad `IMPRESION_DEFECTO` | ✅ la misma variante |
| **Boleta en PDF** | `lib/boletaPdf.jsx` | ❌ **ninguno** |

**Las dos primeras ya están unificadas** y conviene no replanificarlo:
`lib/wallet.js` fusionó `page_json.credenciales` dentro de la variante, y su
propio comentario explica por qué no se metió todo en el mismo saco —«el tamaño
físico y los campos que se imprimen no significan nada en una pantalla, igual
que el degradado y los puntos no significan nada en papel. Son la MISMA tarjeta
con dos salidas»—. Ésa es exactamente la forma correcta, y es la que le falta a
la tercera.

**La que se quedó fuera es el PDF.** `descargarBoletaPdf()` no recibe `design`
ni llama a `walletConfig`: pinta con tres constantes fijas al principio del
archivo (`NEGRO`, `GRIS`, `BORDE`). Consecuencias medibles:

- Un evento con **White Label** —marca propia, logo propio, colores propios—
  entrega un PDF gris neutro. El archivo que **más se reenvía y más se
  imprime** es el único que no lleva la marca del organizador.
- Cambiar el logo en la tarjeta no lo cambia en el PDF. Es el mismo problema que
  ya se arregló entre escarapela y tarjeta, un archivo más allá.
- Las **variantes por público y por tipo** (`staff`, `VIP`) no existen para el
  PDF: todos reciben el mismo.

### Y el vocabulario, que es la mitad del problema

En la interfaz hay **cinco palabras para un objeto**: «boleta», «tarjeta»,
«escarapela», «credencial» y «carné digital». Los propios comentarios del código
las tratan como cosas distintas —«La escarapela es para colgarse; el PDF es la
boleta con sus datos»— y ahí es donde nace la sensación de modalidades.

**La forma de nombrarlo, y de ahí sale todo lo demás:**

> **La entrada** es el objeto. Tiene **tres salidas**: en pantalla, en papel y
> en PDF. No son tipos de entrada: son formas de llevarla encima.

Ya hay dos señales de que el sistema iba solo hacia ahí: la fusión de
Credenciales+Tarjeta en **Acreditación** (hecho hoy) y el «Descargar» único con
el formato después (M6). Falta decirlo también en el modelo.

### Dónde se nota hoy, además del PDF

**`MiTicketPage` —la página a la que vuelve el asistente el día del evento—
todavía tiene las tres acciones sueltas**: «Imprimir mi escarapela», «Descargar
mi tarjeta» y «Descargar boleta (PDF)». M6 unificó esto en la confirmación del
registro y **no aquí**, que es justo donde más se usa: quien vuelve por el
enlace en la puerta se encuentra tres botones para el mismo objeto.

---

### Fases 1, 2 y 4 — ✅ hechas el 2026-09-02

`components/public/DescargarEntrada.jsx`: las tres salidas se piden **desde un
solo sitio**, y por eso el `qrValue` es el mismo para las tres — que es la
lección de `qrEscaneado.js`, ahora estructural y no de memoria.

- **`/mi-ticket` tenía CUATRO acciones para el mismo objeto**, no tres:
  «Imprimir mi escarapela», «Descargar mi tarjeta», «Descargar boleta (PDF)» y,
  más abajo, «Descargar el QR como imagen». Ahora es un «Descargar mi entrada»
  con el formato después.
- **El PDF ya lleva la marca del organizador** (Fase 2): recibe `design` —la
  misma variante que resuelve `walletConfig`— y usa su color y su logo. Antes
  pintaba siempre con `NEGRO`, así que un evento con White Label entregaba un
  PDF gris: el archivo que más se reenvía era el único sin su marca.
- Dos detalles que salían al hacerlo: el texto de la cabecera se elige por
  **luminancia** (una marca clara con título blanco era ilegible), y el logo va
  dentro de un `try` — perder la boleta entera por un logo mal subido no tiene
  sentido, sin él la hoja sigue sirviendo para entrar.
- `tests/entrada.test.mjs` (Fase 4): que **nadie más** llame a las tres
  funciones de salida, que el `qrValue` sea uno solo, y que el PDF acepte y use
  el diseño. Comprobado que muerde. Y se quitó la única excepción de la lista
  al ver que no excusaba nada: el panel no llama a ninguna.

**Queda la Fase 3** (una sola palabra en la interfaz) y una cosa anotada al
pasar: `ClientesTab` dibuja su propio QR desde un `<canvas>` — no usa ninguna de
las tres, así que la prueba no lo ve. Es el panel del organizador y otro caso de
uso, pero es una cuarta forma de producir la misma imagen.

### Fase 1 · El «Descargar» único, también en /mi-ticket

Llevar el menú de formatos de M6 a `MiTicketPage`. Es el mismo componente y el
mismo `FORMATOS_BOLETA`; hoy están escritos dos veces con distinta forma. Barato
y es donde el asistente de verdad entra.

### Fase 2 · El PDF, con el diseño del organizador

`descargarBoletaPdf()` recibe `design` —la misma variante que ya resuelve
`walletConfig(page_json, { publico, tipo })`— y usa su logo, sus dos colores y
sus campos.

**Lo que NO hay que hacer:** volcar la tarjeta entera en el PDF. Una hoja no es
una pantalla: el degradado a sangre y los puntos de gamificación no ayudan en
papel, y el PDF tiene algo que las otras dos no —la tabla de respuestas del
formulario, que es lo que se revisa en la fila—. Mismo criterio que ya usó
`wallet.js` al separar `IMPRESION_DEFECTO`: **la variante manda la identidad
(logo, colores, qué campos), cada salida decide su forma.**

### Fase 3 · Una sola palabra en la interfaz

Renombrar a **«tu entrada»** con sus tres salidas, en las cuatro pantallas que
hoy dicen cinco cosas distintas: la confirmación del registro, `/mi-ticket`,
Acreditación y el escáner. Es texto, no modelo — pero es lo que hace que deje
de sentirse como modalidades.

### Fase 4 · Una prueba que impida que se vuelvan a separar

La lección de `qrEscaneado.js` merece un guardarraíl: **las tres salidas tienen
que llevar el mismo `qrValue`**. Hoy eso depende de que quien toque una se
acuerde de las otras dos. Una prueba que compruebe que las tres lo piden a la
misma función lo caza — en el estilo de `tests/menu.test.mjs`.

### Lo que este frente no toca

- **`ticket_types`** (VIP, general, stand). Ésos **sí** son modalidades de
  verdad: cambian precio, cupo y a qué da derecho. No confundirlos con las
  salidas de una entrada ya emitida.
- **La variante por público** (`asistentes` / `staff`). También es real: la
  tarjeta del staff no es la del asistente. Lo que se unifica es la salida, no
  el público.

### Orden

**1 → 2 → 4 → 3.** La 1 es de un rato y se nota. La 2 es la que arregla el
agravio de verdad (el White Label que no llega al archivo más usado). La 4 antes
que la 3 porque la 3 es texto y la 4 evita que vuelva el fallo del QR.

---

## FRENTE Q · Lo que se vio al usar el panel — sin empezar

**Pedido por Sekkon0906 el 2026-09-03**, mirando el panel desplegado por primera
vez. Es el frente más grande de todos: no son arreglos sueltos, son **cuatro
cosas que deberían estar conectadas y no lo están**, más dos que están en el
sitio equivocado.

Cada punto lleva **lo que se comprobó en el código**, porque varias
suposiciones cambiaron al medirlas.

---

### Q0 · Los tres fallos que se vieron en las capturas — ✅ arreglados el 2026-09-03

Antes de planear nada, lo que estaba roto a la vista:

1. **Facturación reventaba entera.** `c.tipo` llega del servidor como OBJETO
   —`tipo:ticket_types(id, nombre, precio, currency)`, exactamente las cuatro
   claves del error #31 de React— y se pintaba como texto. De paso, la factura
   usaba el precio ACTUAL del tipo en vez de `precio_pagado`: una venta de hace
   un mes salía con el precio de hoy, que es una factura falsa.
2. **«Este evento todavía no tiene tipos de boleta» salía SIEMPRE.**
   `GET /eventos/:id` no traía `ticket_types`, así que la lista llegaba
   `undefined` y el aviso saltaba en todos los eventos, tuvieran cuatro o
   ninguno. **Un consejero que se equivoca siempre enseña a ignorar también los
   avisos que sí aciertan.** Ahora el backend lo trae, y el aviso distingue «no
   hay» de «no lo sé».
3. **El rol salía con el nombre viejo.** Regresión de la 0090: se renombraron
   los roles y `event_members.rol` —columna de texto heredada— se quedó con el
   nombre de cuando se invitó. Quien es «Puerta» seguía saliendo como
   «Staff · Acceso». El nombre bueno es el de la tabla, siempre.

---

### Q1 · La boleta de stand no conecta con el stand

**Lo pedido:** que la boleta se vincule al stand, para que el expositor se
registre solo y su información se despliegue — o se haga a mano. Y lo mismo para
el resto de actividades (torneos, etc.).

**Lo medido:** el camino existe —un trigger de la 0036 crea la ficha cuando se
paga una boleta-stand— y **nunca ha corrido**: 0 stands creados desde una
boleta, 5 a mano. Hay 1 tipo de boleta «Stand comercial» con 0 vendidas.

Así que no es que falte el enganche: es que **nadie lo ha visto funcionar** y no
hay nada en la pantalla que diga que existe. Un tipo de boleta no declara «esto
es un stand»; se adivina por el nombre.

**Lo que hay que hacer:** que un tipo de boleta diga **qué crea al venderse**
—nada, un stand, un equipo de torneo— en vez de deducirlo. Eso abre el mismo
camino para los torneos, que es lo que se pide: comprar la inscripción crea el
equipo, y el capitán completa sus datos por su enlace.

### Q2 · Un equipo de torneo no cabe en la tabla

**Lo pedido:** poder poner la información del equipo, los rangos, etc. Cada
evento es distinto: un equipo de fútbol y uno de esports no se presentan igual.
«Todo el flujo está hecho para un torneo de fútbol.»

**Lo medido, y confirma el diagnóstico:** `torneo_equipos` tiene `nombre`,
`foto_url`, `posicion_bracket`, `contacto_email`, `contacto_user_id`, `grupo`.
**Y nada más.** No hay jugadores, ni roles dentro del equipo, ni rango, ni
nickname, ni país, ni nada que dependa de la disciplina.

**Lo que hay que hacer:** lo mismo que ya se resolvió para el registro de
asistentes — **un formulario por torneo**. `event_form_fields` ya existe y ya
resuelve exactamente este problema (campos definidos por el organizador,
condicionales incluidos). Un torneo de fútbol pide dorsal y posición; uno de
esports pide nick, rango y servidor. **No hay que inventar el mecanismo, hay que
apuntarlo a otra tabla.**

### Q3 · Torneos y Rueda de negocios deberían nacer como sub-evento

**Lo pedido:** que en «Nuevo sub-evento», el selector de TIPO ofrezca también
torneo y rueda de negocios; y que las secciones aparte queden para editar los
datos propios de cada uno.

**Por qué encaja:** `agenda_sessions` ya tiene `tipo` y `torneo_id`, y el tipo
`competencia` ya está marcado como `competitivo`. La N-Fase 2 ya puso el
«¿cuándo se juega?» dentro del alta del torneo — esto es el mismo movimiento en
la otra dirección, y el que faltaba: **una sola puerta para crear cualquier cosa
que ocurra en el evento.**

Hoy hay dos puertas y por eso existían 4 torneos sin hueco en el calendario.

### Q4 · La rueda de negocios YA es un stand — ✅ dicho el 2026-09-03

No se tocó el modelo, que estaba bien: las dos cabeceras se apuntan ahora la una
a la otra y dicen que es **la misma ficha vista por el otro lado**. Lo que
cambia entre las dos pantallas no es la lista, son las columnas —citas y
horarios aquí, número de stand y cuota allí— y eso sí había que decirlo.

De paso, la cabecera de Stands ya no manda a «Asistentes → Escanear» a dar los
puntos de un stand: después de Q8, un stand da los suyos desde su enlace y el
panel sólo da los del evento.

#### Lo que decía la ficha original

**Lo observado por Sekkon0906:** «al parecer la rueda de negocios está vinculada
a los stands, entonces al crear una rueda de negocios se registra como un
stand».

**Es exacto, y está bien que lo sea:** las dos escriben en
`networking_expositores`. Se unificó en J3 el 2-sep, cuando resultó que había
dos altas para la misma tabla y la de la rueda ni siquiera tenía `PATCH`.

**El problema es que la interfaz no lo cuenta.** Se crea un expositor en una
pantalla y aparece en otra sin explicación. No hay que cambiar el modelo: hay
que **decirlo** — y que las dos pantallas enseñen que están mirando lo mismo
desde dos lados.

### Q5 · El aforo no dice cuánto está repartido

**Lo pedido:** ver el aforo total y el **aforo predispuesto** (lo distribuido
entre las zonas). Y que el stand se elija de una lista en vez de escribir su
número.

**Lo medido:** el evento tiene `aforo_total` (1500 en TechNova) y cada zona su
`aforo_max`. **Nadie compara los dos.** Se pueden declarar zonas que sumen 3000
en un recinto de 1500 y nada avisa.

Es el mismo patrón que la bolsa de puntos, que se acaba de arreglar: un total,
un reparto, y lo que queda sin repartir. Ahí ya está resuelto y se puede copiar
la forma.

Y el número de stand es texto libre (`networking_expositores.stand`): dos stands
pueden llamarse «A11» y nadie lo nota.

### Q6 · «Accesos e ingresos» es una zona más

**Lo pedido:** meterlo dentro de Zonas de interés, y que al añadir una zona se
elija su **tipo** — zona de evento, zona de ingreso, zona de evacuación, otras —
con su edición propia.

**Encaja con lo que ya pasó:** en la reagrupación del menú los dos quedaron
juntos en «Zonas del evento» justamente porque son lo mismo —sitios—. Esto es el
paso siguiente: que también sean lo mismo **en el modelo**, no sólo vecinos en
el menú.

Hoy las puertas viven en `page_json.accesos` y las zonas en la tabla `zonas`
(desde la 0091). Unificar quiere decir: `zonas.tipo`, y las puertas pasan a ser
zonas de tipo ingreso.

**Y una zona de evacuación no es un capricho:** un recinto de 7.000 personas
tiene salidas de emergencia, y hoy no hay dónde declararlas.

### Q7 · El panel de zonas desperdiciaba la pantalla — ✅ hecho el 2026-09-03

La segunda columna estaba **siempre**: 380 px reservados para una tarjeta que
decía «Toca una zona», con la lista —que es donde se trabaja— apretada al lado.
Ahora esa columna sólo existe cuando hay una zona elegida; sin selección, la
lista se queda con el ancho entero.

Y el bloque «Ir a», que son hasta seis enlaces abiertos —media ficha para lo que
menos se hace desde aquí—, va plegado. Lo que se usa a diario es colgar una
actividad o un stand, y eso queda arriba.

#### Lo que decía la ficha original

**Lo pedido:** «se pierde mucho espacio mostrando ese modal de las zonas que
está vacío, toca agrandar la zona de personalización».

Se ve en la captura: la ficha de la derecha ocupa un tercio de la pantalla para
decir «Sin gente», «Ninguna actividad», «Ningún stand». **El vacío ocupa lo
mismo que lo lleno.** La lista de la izquierda, que es donde se trabaja, va
apretada.

### Q8 · El escáner de puntos no es del organizador — ✅ hecho el 2026-09-03

**Y al medirlo, la solución no era la que parecía.** Quitar «Puntos» y
«Canjear» del panel habría roto **lo único que se usa**: las 5 recompensas y los
5 motivos que existen son **del evento**, no de expositores (0 de expositor). El
escáner del panel es la herramienta del staff para los puntos del evento; el
portal del expositor es la del stand. No sobra ninguno.

Lo que sí estaba mal:

- **El panel ofrecía los motivos de los stands.** `evento_motivos` guarda los del
  evento y los de cada stand, y el endpoint no filtraba: el staff podía dar
  puntos **en nombre de un stand**, con su motivo y contra su cuota. Justo la
  frontera que separa al evento de un tercero.
- **Y arreglarlo destapó algo peor:** el guardado del catálogo **borra todo lo
  que no venga en la lista**. Con el filtro puesto sólo en la lectura, guardar
  un motivo desde el panel habría borrado de golpe **los motivos de todos los
  stands**, que ni siquiera se ven en esa pantalla. Filtrado también ahí.
- **La barra mezclaba entrar y premiar** en cinco botones seguidos. Ahora son
  dos grupos —«Ingreso» y «Puntos del evento»— y el texto dice que un stand da
  los suyos por su enlace. De ahí salía la idea de que un expositor necesita
  esta pantalla: no la necesita, y por eso no hay que meterlo en el equipo.

#### Lo que decía la ficha original

**Lo pedido, y es un problema de permisos, no de comodidad:** dar puntos y
canjear deberían estar en «mi espacio», en el stand de quien se registró.
«Escanear» sólo debería salirle al staff. **Quien no es del evento no puede
tener permiso de entrar a las ediciones del evento.**

**Lo medido:** ya existen las dos cosas y ahí está el lío.

| Dónde | Quién entra | Qué hace |
|---|---|---|
| `Asistentes → Escanear` | miembro con permiso `checkin` | check-in, reingreso, sub-evento, **puntos**, canjear |
| `/expositor/:codigo` | el expositor, con el código de su boleta | su ficha, cronograma, **dar puntos**, sus premios |

**Dar puntos está en los dos.** Y para que un expositor use el del panel habría
que meterlo en el equipo del evento, que es exactamente lo que no debe pasar: un
expositor es un tercero, no personal.

**Lo que hay que hacer:** `Asistentes → Escanear` se queda **sólo con lo de
entrar** —check-in, reingreso, sub-evento—, y puntos y canje viven donde ya
funcionan, en el portal del expositor. Eso quita la duplicación y, de paso,
quita la razón para dar acceso al panel a quien no es del evento.

### Q9 · Los nombres, y la etiqueta que no colgaba de ninguna pantalla — ✅ hecho el 2026-09-03

**El hallazgo gordo no era el nombre.** La escarapela térmica del Frente H
estaba construida entera —medidas, QR comprobado contra el token real, CSS de
impresión, seis pruebas en verde— y **no colgába de ninguna pantalla**. Existía
en el repositorio y no en la plataforma, que para quien la usa es lo mismo que
no existir: las pruebas pasaban y no había forma de imprimir una escarapela.

Ahora hay `EtiquetadoraSection`, y una prueba comprueba el camino entero
—sección → vista → componente— porque el fallo no fue que el componente
estuviera mal, fue que no estaba enchufado.

**Es vista aparte del diseñador, y no el mismo diseño con otro botón.** El
diseñador compone una hoja con varias, a color, para cortar a mano; la
etiquetadora saca una por etiqueta, a tamaño exacto, en un bit. Mezclarlas
obligaría a enseñar ahí opciones que en térmica no hacen nada —color por tipo,
marca de agua, logo a color—, y una opción que no hace nada es peor que no
tenerla.

**Los nombres, que era lo pedido:** las vistas decían el soporte —«Escarapela
impresa», «Carné digital»— y no lo que la persona viene a hacer. Ahora son tres
verbos: diseñar escarapela, diseñar carné, imprimir en etiquetadora. Y la
sección pasó de «Acreditación» a **«Escarapelas y carnés»**; «Antes de la
boleta» —nombre que puse yo y no se entendía— a **«Invitaciones»**.

**Imprimir va con `checkin` y no con `ver_clientes`**: quien imprime es quien
está en la puerta, no quien lleva los clientes.

Falta el número del rollo real para cerrar las medidas —ver
`09 — Impresora de escarapelas (traspaso)`—, pero eso es un objeto de una línea
y una prueba que dice si el QR sigue cabiendo.

#### Lo que decía la ficha original

**Acreditación** debería separar **diseñar** (escarapela y carné) de
**imprimir**, que hoy están mezclados. Y el imprimir tiene que enlazar con la
etiqueta térmica del Frente H, que ya está construida y no está conectada a
ninguna pantalla.

**«Antes de la boleta»** — nombre que puse yo en la reagrupación — no se
entiende. Junté ahí Invitaciones y Lista de espera porque las dos son «gente que
todavía no tiene boleta», y visto en uso el nombre no lo dice. Va a
**«Invitaciones»**, con la lista de espera dentro.

---

### Orden

**Primero lo que quita permisos de más:** Q8. Es el único con consecuencia de
seguridad —hoy la única forma de que un expositor dé puntos es meterlo en el
equipo del evento— y además borra una duplicación.

**Después lo barato y visible:** Q9 (nombres y separar diseñar de imprimir, que
además conecta el Frente H), Q7 (el espacio de la pantalla), Q4 (decir que la
rueda y los stands son lo mismo).

**Luego lo de modelo, de menor a mayor:** Q5 (aforo repartido, copiando la forma
de la bolsa de puntos), Q3 (una sola puerta para crear), Q6 (la puerta como tipo
de zona), Q1 (qué crea un tipo de boleta).

**Y al final Q2**, que es el más grande: el formulario por torneo. No porque
importe menos —es lo que hace que la plataforma sirva para algo que no sea
fútbol— sino porque conviene hacerlo cuando Q3 ya haya dejado una sola puerta
para crear un torneo.

---

## FRENTE R · La landing y la navegación — sin empezar

**Pedido por Sekkon0906 el 2026-09-03**, después del Frente Q y mirando la
página pública: «remodelar todo el sistema de landing page, tanto visual como el
cómo funciona y todas las funciones que tiene». Y aparte: «analizar todos los
botones e interacciones que hay en GESTEK, dado que muchos son ← atrás o flecha
y salir, eso se ve horrible».

**Orden explícito suyo: la landing va DESPUÉS de conectar la plataforma.**
Primero el Frente Q, luego esto. Queda aquí escrito para que no se pierda, no
para hacerlo ya.

---

### R1 · La navegación: «atrás» no es una forma de moverse

**Lo medido:** hay **al menos 16 vueltas atrás escritas a mano**, cada una con
su propio texto: «← Volver a explorar» (6 veces), «← Volver a vacantes» (2),
«← Volver al preview», «← Volver al evento», «← Volver a eventos», «Atrás»,
«Volver», y un «Salir del evento» en el menú lateral.

Y no es sólo que sean feas: **cada una es una decisión distinta sobre a dónde se
vuelve**, tomada por separado. Nadie decidió el conjunto.

El problema de fondo es que una flecha «atrás» es lo que se pone cuando no está
claro dónde estás. En un panel con un evento activo, un menú lateral y un
buscador global, volver atrás casi nunca es lo que la persona quiere: quiere ir
a otro sitio concreto.

**Lo que hay que decidir antes de tocar nada** (es diseño, no código):

- ¿Qué papel juega la miga de pan de arriba —«Eventos › Detalle»— que hoy está
  y nadie usa? Si funcionara, sobran la mitad de esas vueltas.
- ¿«Salir del evento» es salir, o es cambiar de evento? Son dos cosas
  distintas y hoy comparten botón.
- ¿La página pública debe tener «← Volver a explorar» cuando se llega desde
  Google, que es de donde llega casi todo el mundo? Ahí no hay «atrás».

### R2 · La landing pública

Lo visto en las capturas del evento real:

- **El directorio de expositores está roto de layout.** La galería de un
  expositor se sale de su tarjeta y pisa las de al lado; una tarjeta con
  descripción larga y tres fotos desborda sobre la vecina. Se ve en DevUP.
- **«STAND STAND C10»** — el dato trae la palabra «Stand» y la etiqueta le
  añade otra. *(Arreglado el 2026-09-03; se deja anotado porque salió de aquí.)*
- **La página pública de un torneo está casi vacía:** el nombre, la disciplina,
  el formato y dos equipos. Ni fecha, ni hora, ni sede, ni marcador, ni cuándo
  se juega la final. Es la pantalla que un asistente abre para saber si le
  interesa, y no contesta nada.
- **Huecos grandes de espacio muerto** entre bloques.

**Lo que R2 tiene que resolver, y es más que pintar:**

1. **Qué información expone cada bloque.** El torneo es el ejemplo claro: la
   información existe (`torneo_partidos` tiene `fecha_hora`, `cancha`,
   marcadores) y la página no la enseña.
2. **Qué pasa cuando un bloque va vacío o casi.** Hoy se pinta igual: un
   apartado con un dato se ve como un apartado completo.
3. **El desbordamiento del directorio**, que es un fallo y no una preferencia.

**Y lo que conviene NO rehacer:** el editor por bloques y el catálogo
(`lib/bloquesLanding.js`, validado en el servidor desde que Claude escribe por
MCP) funcionan y son la parte cara. Lo que se rehace es cómo se ven y qué
enseñan, no el mecanismo.

---

### Por qué va después del Frente Q, y no es sólo porque lo pidió

La landing **enseña** lo que la plataforma tiene conectado. Si un torneo
todavía no sabe qué equipos lo juegan con qué datos (Q2), ni cuándo se juega
(Q3), rediseñar cómo se muestra un torneo es decidir la vitrina antes que la
mercancía. Se haría dos veces.

---

## Cómo repartirlo

Los frentes **A, B, C, D, E** no comparten archivos. Se pueden llevar en
sesiones distintas sin que el merge duela.

El **Frente N** es la continuación del I y **no se puede correr en paralelo con
él ni con el Frente C**: toca `EventWorkspace.jsx`, `SessionForm.jsx`,
`StandsTab.jsx`, `MapaSection.jsx`, `ZonasSection.jsx` y `lib/espacio.js`. Su
Fase 1 es de un rato y no toca backend; la Fase 3 es DDL sobre datos de
producción y va con [[db-guardian]].

El **Camino unitario** (sección 2) es el tercer cubo: tareas que no dependen
de cPanel ni se pisan entre sí, así que las toma quien esté libre —no hay
Persona A / Persona B ahí—.

Lo único que los cruza es `page_json`, y ahí hay una trampa ya conocida: el
`PATCH` **mezcla por claves de primer nivel** desde la migración 0064, así que
mandar sólo tu clave no pisa la de otro. Si alguien reemplaza `page_json`
entero, vuelve el fallo de la marca que se borraba sola.

El corte es **cPanel**, no la base de datos.

### Persona A — sólo lo que necesita el servidor

- Crear la base MySQL en cPanel.
- Importar la base antigua al servidor nuevo.
- Correr el esquema y la carga que le llegan escritos, y **rematar lo que no
  cuadre**. Se le entrega un script que debería funcionar; si algo falla, lo
  resuelve contra la base real, que es donde se ve.
- Desplegar los servicios (`CONFIGURAR.md`, `DESPLIEGUE-CPANEL.md`).
- Encender `AUTH_PROPIA` y `ARCHIVOS_PROPIOS` — **no antes del pitch**.

### Persona B — todo lo que es código

Los 5 primeros pasos del frente A son **código, no servidor**: el generador se
corre desde el editor SQL de Supabase, las 4 vistas son SQL a mano, el script
de carga se escribe, y los 9 disparadores y las 7 funciones RPC se reescriben
en JavaScript dentro del repo del backend. Eso es el grueso, y no toca cPanel.

Más los frentes **B, C, D, E** enteros, que son la plataforma.

Orden por lo que rinde antes — **reordenado el 2026-09-02**, porque casi todo
lo de la lista vieja (E, C1, C4, C2, D, B) resultó estar hecho ya:

1. ~~**J.1 y J.2**~~ — ✅ el buzón que devolvía 404 (faltaba la ruta) y las
   cabeceras de migración. Hecho el 2026-09-02.
2. ~~**I fase 0**~~ — ✅ cerrado el segundo camino de escritura de zonas y
   compartido el filtro en `lib/zonas.js`.
3. ~~**I fases 1-2**~~ — ✅ la sección «Zonas de interés» y el CRUD movido ahí.
4. ~~**I fases 3-4**~~ — ✅ las relaciones en dirección inversa y zona ↔ puerta.
5. **J.3** — un solo alta de expositor. **El caso más grave de la auditoría** y
   lo siguiente que rinde: dos pantallas, dos endpoints, la misma tabla, y
   desde «Rueda de negocios» el expositor no se puede editar.
6. **J.4-J.6** — `oauth_barrer`, `StatCard`/`BarraProgreso`, limpieza mecánica.
7. **I fase 5** — el marcador compartido. Refactor sin función nueva, al final
   y a propósito: es el único paso que puede romper las tres pantallas de mapa
   a la vez, y conviene hacerlo con las fases 1-4 ya probadas en navegador.

**Antes de seguir, dos cosas esperan decisión:** aplicar (o no) las migraciones
`0081` y `0083` —§3.5— y mirar «Zonas de interés» contra un evento real, que
en el entorno donde se escribió no se pudo por falta de credenciales.

Los frentes **B, C, D, E** ya están cerrados (ver sus marcas ✅). Lo que queda
de C vive en el Camino unitario y en el Frente I.

**Regla de reparto para los frentes nuevos:** I y J **no** se pueden tomar a la
vez sin coordinar, porque J.3 toca `routes/networking.js`, que también toca la
fase 3 de I. Todo lo demás de J es independiente.

### Lo que no depende de nosotros

Frentes **F** y **G**, más lo de la tabla de accesos de `CONTINUAR.md` §5:
SMTP, `MP_WEBHOOK_SECRET`, el egress de Supabase, y decir si la pasarela de
producción es real o de pruebas antes de recorrer el flujo de compra.
