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

### 3.3 · Un bug activo, en producción

**El buzón de sugerencias devuelve 404 siempre.** `src/api/sugerencias.js:8-9`
llama a `/me/sugerencias`, y el backend sólo expone `/sugerencias/dinamica`
(`routes/sugerencias.js:53,84`, montado en `/` y en `/me` — `index.js:140,165`).
Falta el segmento `/dinamica`.

No es teórico: `BuzonSugerencia.jsx:30` lo usa de verdad, y está montado en
`EventCreatePage.jsx:491` y `VacantesTab.jsx:182`. Y hay una **segunda
implementación del mismo buzón** que sí funciona porque escribe la ruta bien:
`components/eventos/PedirDinamica.jsx:34,43`. Arreglo: dos líneas.

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

### 3.5 · Dos migraciones mienten en su cabecera

`0084_*.sql` y `0087_*.sql` dicen **«PENDIENTE DE APLICAR»** y **las dos están
aplicadas**. Verificado el 2026-09-02 contra la base de producción
(`information_schema`, sólo lectura): existen `event_form_fields.visible_si`,
`zona_cortes.tipo` y `zona_cortes.foto_url`.

Importa por lo de siempre en este proyecto: el backend no mira el error de
`supabase-js`, así que una columna que falta se ve como datos en blanco sin
aviso. Un comentario que dice «pendiente» cuando no lo está entrena a
desconfiar del único sitio donde se registra ese estado. Arreglo: corregir las
dos cabeceras.

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

## FRENTE H · Impresión de escarapelas el día del evento

**Sin empezar, a propósito — anotado el 2026-09-01, se retoma más adelante.**
Se consiguió una impresora térmica de etiquetas (**SAT TT460**, 203 dpi,
máx. 6 ips, soporta cinta de cera/resina para transferencia térmica, USB +
Ethernet + Bluetooth 5.0 (BLE/WiFi), identifica el sensor automáticamente con
el botón de calibración) para imprimir en el sitio los QR de las escarapelas
el día del evento.

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

## FRENTE I · Zonas de interés · un solo lugar de administración

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

### Fase 0 · Cerrar el segundo camino de escritura

Barato, y quita la duplicación que originó el pedido. Sin backend.

- `MapaSection.jsx` deja de editar `nombre` y `aforo_max` (líneas 384-393): se
  queda con color y posición, y una nota que apunta al lugar único —
  **exactamente el trato que ya recibe «puerta»** en ese mismo archivo
  (líneas 357-377), que dice «el nombre… se edita en Accesos e ingresos. Aquí
  sólo se decide dónde queda en el plano». Sólo hay que aplicarle a zona lo que
  ya se le aplicó a puerta.
- Desaparece el flag `zonasTocadas` y la rama `parche.zonas` (`:150`): un solo
  camino de escritura.
- Un `<SelectorZona>` compartido reemplaza las tres copias del desplegable
  (`SessionForm.jsx:52`, `StandsTab.jsx:115`, `CheckinTab.jsx:61` — esta última
  hoy sin el filtro, que es un bug menor real).

### Fase 1 · La sección, en sólo lectura

Pestaña nueva **«Zonas de interés»** en *Espacio del evento*, alimentada por
`mapa/vivo`. Maestro-detalle:

- **Lista:** cada zona con nombre, aforo, cuánta gente hay dentro ahora,
  cuántas actividades tiene, cuántos stands, y si está colocada en el plano.
  Una zona sin nada conectado se ve de un golpe — hoy no.
- **Detalle (el centro de mando):** identidad, dónde está en el plano, qué pasa
  aquí ahora y después, qué stands hay, ocupación viva, y el histórico
  (curva del día, estancia media). Todo lo que hoy está repartido, junto.

Nada de esto cambia datos todavía: es la pantalla que hoy no existe, sobre el
endpoint que ya existe. Se puede soltar sola y ya vale.

### Fase 2 · Mover el CRUD de zonas aquí

- Crear, renombrar, cambiar aforo y borrar zonas pasa de `AccesosSection.jsx` a
  la sección nueva. **Éste es el «1 lugar de administración» del pedido.**
- `AccesosSection.jsx` se queda con las puertas, que es lo que su nombre dice.
  Su enlace «Ponerla en el mapa →» (que ya existe) apunta ahora a la sección
  nueva.
- `REUBICADAS` (`EventWorkspace.jsx:180-191`) redirige las direcciones viejas,
  mismo mecanismo que ya se usó para mover aforo, stands y accesos.

### Fase 3 · Las relaciones, en dirección inversa

Lo que hoy no se puede hacer. Necesita backend chico:

- Desde la zona, **añadir o quitar actividades**: escribe `agenda_sessions.zona_id`
  en lote. El `PATCH` de agenda ya admite `zona_id` (`routes/agenda.js:224`,
  está en la lista `allowed`) — falta el endpoint que acepte varias sesiones de
  una vez, o hacerlo con N llamadas si son pocas.
- Desde la zona, **añadir o quitar stands**: escribe
  `networking_expositores.zona_id`, ya validado por `zonaInvalida`
  (`routes/networking.js:483-487`).
- Los dos formularios de siempre (`SessionForm`, `StandsTab`) **se quedan como
  están**: elegir la zona mientras creas una charla es cómodo y hay que
  conservarlo. Lo que cambia es que ya no es la única dirección posible.

### Fase 4 · Zona ↔ puerta, la relación que falta

Hoy `page_json.accesos` y `page_json.zonas` son dos listas sin ningún campo
cruzado (verificado en `AccesosSection.jsx:23-26`: `limpiarAccesos` no tiene
`zona_id`), y las puertas cuentan ingresos por `tickets.acceso`, que es un
nombre, no una zona.

- Una puerta declara **a qué zona da**. Sin migración: `page_json.accesos`
  gana `zona_id`, y el `PATCH` ya mezcla `page_json` por clave (0064).
- Con eso la zona contesta «por dónde se entra aquí», y el conteo por puerta
  se puede leer junto al de la zona.

### Fase 5 · El marcador compartido

Lo que la Fase 4 del Camino unitario dejó anotado como «su propia sesión»
(§3.2 de la auditoría): un `<MarcadorMapa tipo color valor label modo>`
compartido por las tres implementaciones de mapa, que hoy copian las mismas
80-120 líneas cada una. **Va al final a propósito:** es refactor sin función
nueva, y es el único paso que puede romper las tres pantallas a la vez.

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

### Ahora · un bug que está fallando en producción

1. **El buzón de sugerencias devuelve 404.** `src/api/sugerencias.js:8-9`:
   `/me/sugerencias` → `/me/sugerencias/dinamica`. Dos líneas. Y decidir si
   `BuzonSugerencia.jsx` y `PedirDinamica.jsx` —dos implementaciones del mismo
   buzón, una rota— se unifican (§3.3).
2. **Corregir la cabecera de `0084` y `0087`**: dicen «PENDIENTE DE APLICAR» y
   están aplicadas, verificado contra producción (§3.5).

### Barato y con valor claro

3. **Un solo alta de expositor.** El caso más grave de la auditoría: dos
   pantallas, dos endpoints, la misma tabla, y desde «Rueda de negocios» el
   expositor **no se puede editar** porque esa ruta no tiene `PATCH` (§3.1).
   Que `NetworkingTab` use el endpoint de Stands, o que el suyo gane los
   campos y el `PATCH` que le faltan. **Toca `routes/networking.js`, igual que
   el Frente I fase 3 — coordinar.**
4. **Conectar `oauth_barrer()`** a alguno de los `cron-*.js` que ya corren, o
   documentar que sigue pendiente. Hoy `oauth_codes`/`oauth_tokens` crecen sin
   límite (§3.4).
5. **Adoptar `StatCard.jsx`** donde el layout ya coincide, y añadir un
   `<BarraProgreso>` para las 7 copias a mano (§3.4, §3.6). Empezar por dos o
   tres pantallas, no por las 18 de golpe.
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

## Cómo repartirlo

Los frentes **A, B, C, D, E** no comparten archivos. Se pueden llevar en
sesiones distintas sin que el merge duela.

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

1. **J.1 y J.2** — el buzón que devuelve 404 y las dos cabeceras de migración
   que mienten. Minutos, y una de las dos está fallando hoy.
2. **I fase 0** — cerrar el segundo camino de escritura de zonas y compartir el
   selector. Es la duplicación que originó el pedido, y es barata.
3. **I fases 1-2** — la sección «Zonas de interés» y mover ahí el CRUD. Fase 1
   no necesita backend: `mapa/vivo` ya devuelve todo.
4. **J.3** — un solo alta de expositor. El caso más grave de la auditoría.
5. **I fases 3-4** — las relaciones en dirección inversa, y zona ↔ puerta.
6. **J.4-J.6** — `oauth_barrer`, `StatCard`/`BarraProgreso`, limpieza mecánica.
7. **I fase 5** — el marcador compartido. Refactor sin función nueva, al final.

Los frentes **B, C, D, E** ya están cerrados (ver sus marcas ✅). Lo que queda
de C vive en el Camino unitario y en el Frente I.

**Regla de reparto para los frentes nuevos:** I y J **no** se pueden tomar a la
vez sin coordinar, porque J.3 toca `routes/networking.js`, que también toca la
fase 3 de I. Todo lo demás de J es independiente.

### Lo que no depende de nosotros

Frentes **F** y **G**, más lo de la tabla de accesos de `CONTINUAR.md` §5:
SMTP, `MP_WEBHOOK_SECRET`, el egress de Supabase, y decir si la pasarela de
producción es real o de pruebas antes de recorrer el flujo de compra.
