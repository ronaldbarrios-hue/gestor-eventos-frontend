# GESTEK · Cómo seguir — 29 de agosto de 2026 · actualizado 1 de septiembre

Para retomar en otra sesión sin releer la conversación. Sustituye a la versión
del 28 de agosto, que ya no describe el estado.

Complementa, sin repetirlos:

- `SUBIR.md` — cómo subir los commits que no se pudieron empujar
- `INDEPENDENCIA.md` — el plan de las 9 fases y en cuál va cada una
- `db/migraciones/NOTAS-ESQUEMA.md` (repo del **backend**) — el detalle técnico
  de la fase 6
- `PENDIENTE.md` §4/§5/§6 — el pedido del 1 de septiembre y qué se hizo
- `NUBE.md` — retomar sin la máquina local

---

## 0 · Lo primero: todo está subido

Ya no hay parches ni commits colgando. El 403 de GitHub se resolvió mergeando
desde una sesión con permisos, y desde entonces el trabajo va directo a la rama
`claude/gestek-storage-cleanup-auth-41d8d8` en los dos repositorios.

**Los dos repos se despliegan JUNTOS.** Pasó una vez y costó: el frontend salió
con llamadas por POST y el backend se quedó en GET, y los dos escáneres de
canje devolvieron 401 en producción hasta que se desplegó el otro lado.

---

## 0.b · Sesión del 1 de septiembre — registro embebido, mapa, tiempo real

Con FESTECH IBAGUÉ (`festech2026`) **registrando en vivo**, se pidió: que el
registro embebido funcione fino, el mapa por zonas, y bajar el ruido del
WebSocket de Supabase. **Todo mergeado a `main`** (frontend PR #11, #14–#19;
backend PR #13–#17). Detalle en `PENDIENTE.md §4/§5/§6`.

| # | Qué | PR | Dónde |
|---|---|---|---|
| §4.1 | Enlace de «volver a ver la boleta» configurable (`checkout.enlace_boleta`, `{codigo}`; vacío → `/mi-ticket`) | FE #15 | `EventoPublicoPage.jsx`, `CheckoutSection.jsx` |
| §4.2 | La página pública reconoce a quien ya tiene boleta (localStorage `gestek-boleta:<slug>` + entrada manual) | FE #17 | `components/public/BoletaConocida.jsx` |
| §4.3 | Sub-eventos como paso final del registro: «Ver sub-eventos», lista uno-por-uno, «seguir / terminar» | FE #15 | `ConfirmacionModal`, `InscripcionSesionModal.jsx` |
| §4.4 | Ancho/alto del modal editables (`checkout.modal_ancho`/`modal_alto`) | FE #15 | `EventoPublicoPage.jsx`, `CheckoutSection.jsx` |
| §4.5 | El embed **hereda la tipografía** de la web anfitriona (postMessage `estilo`; `.font-mono` se respeta; `?fuente=` para Notion/Wix). Opt-out `data-heredar-fuente="0"` | FE #19 | `public/widget.js`, `lib/embed.js`, `EmbedPage.jsx`, `ExportIframeModal.jsx` |
| §4.6 | Sub-evento `formulario_modo='propio'` con **0 preguntas** → se trata como sin datos, no abre modal vacío | BE #15 | `routes/sesiones.js` (`pide_datos`) |
| §5 | Mapa por zonas — **casi todo ya estaba**; lo nuevo es el efecto «zona llena se prende en fuego» (`nivel` normal/`caliente` ≥85%/`en_fuego` ≥100%) | FE #16, BE #17 | `components/aforo/LlamaZona.jsx`, `index.css`, `blocks.jsx`, `MapaSection.jsx` · `lib/aforoZonas.js`, `routes/eventos.publicos.js` |
| §6 | Realtime a **cero en segundo plano**: asistencia por sondeo (12 s), latido 25→50 s, `TopBar` sin canal, `ChatTab` sólo con pestaña visible | FE #11–#14, #18 | `useAsistenciaEnVivo.js`, `lib/supabase.js`, `ChatTab.jsx` |

**Base de datos (Supabase producción):** aplicadas `0084` (`event_form_fields.visible_si`),
`0082` (`points_log.origen_*`), `0085` (`padron_previo`) — las tres aditivas.
**Sin aplicar a propósito** con registro en vivo: `0081` (DROP COLUMN ×3),
`0083` (muta page_json de 1 evento), `0086` (función muerta). §5 no añadió
migraciones.

**Bug de producción arreglado:** la `0084` nunca se había aplicado y el backend
hace `const { data } = await supabase...` sin mirar `error` → todas las
consultas de formulario fallaban en silencio y la página pública mostraba 3
campos en vez de 10, sin exigir los obligatorios al comprar. Queda **auditar
todos los `.select()` que ignoran `error`**.

**Sin verificar de punta a punta.** Evento de banco de pruebas: **TechNova
Summit 2026** (`technova-summit-2026`), NO Festech. Mapa de pruebas con 90
casos: artefacto `claude.ai/code/artifact/94881685-f739-4ad7-97d3-316f7138d54c`.
§4.5 necesita prueba **cross-site real** (web en otro origen con fuente propia);
§5 necesita **crear una zona** en TechNova primero (no tiene ninguna).

**Falta de §4.5 (sesión aparte, grande):** color de acento heredado y el SDK
sin iframe que monte el formulario inline en un `<div>` del cliente.

---

## 1 · Qué se hizo, en una tabla

Las fases son las de `INDEPENDENCIA.md`.

| Fase | Qué | Estado |
|---|---|---|
| 0 | Medir Supabase (egress, tablas, políticas) | ✅ |
| 1 | Identidad propia sobre MySQL (`modules/auth`) | ✅ escrito, **apagado** |
| 1.b | Arranque en cPanel (Passenger, cron fuera del proceso) | ✅ escrito |
| 2 | Almacén propio de archivos (`modules/archivos`) | ✅ escrito, **apagado** |
| 3 | Cerrar la lectura anónima de datos personales | ✅ **aplicado en producción** |
| 4 | Barrido de huérfanos del Storage | ⏸ script y lista listos, falta correrlo |
| 5 | Contingencia del correo (cola, rescate, reintento) | ✅ |
| 6 | **Las 71 tablas a MySQL** | 🚧 esquema **y datos** ya en `db/esquema/` (backend PR #14/#15); falta aplicarlo en un MySQL 8 real + `comparar-bases` |
| 7 | Permisos en el código (lo que sustituye a RLS) | 🚧 de 230 a **49** sin declarar |
| 8 | Botón de registro incrustable (widget) | ✅ |
| 9 | La escarapela y la tarjeta, una sola | ✅ un diseño, dos salidas |
| 10 | Cada punto dice de dónde salió | ✅ y participar en un sub-evento por fin paga |

Lo que está «escrito, apagado» funciona y tiene pruebas, pero **no cambia el
comportamiento de nada** hasta que se encienda su interruptor (`AUTH_PROPIA`,
`ARCHIVOS_PROPIOS`). Subir el código es seguro.

**336 pruebas** en el backend, todas en verde. **7 pruebas** del widget en
Chromium, en verde.

---

## 2 · Dónde me quedé exactamente: la fase 6

Es el bloque grande que queda. La sesión del 29-ago hizo la **medición y el
traductor**; la del **1-sep sacó el esquema y los datos a archivo** (backend
PR #14/#15). Falta aplicarlo en un MySQL 8 real y comparar.

### Lo que ya está en el repo del backend

```
db/esquema/                          ← NUEVO (1-sep). El archivo de verdad, para MySQL 8
  01_tablas.sql  02_indices_unicos_parciales.sql  04_indices.sql
  05_claves_foraneas.sql  06_vistas.sql
  03_datos.sql                       ← GITIGNORED — datos personales reales (611 KB, 2139 filas)
  generar-datos.mjs                  ← lo regenera: npm i pg, PG_URL=<session pooler>, node ...
  README.md                          ← orden de aplicación
db/migraciones/
  generar-esquema-mysql.sql          ← el traductor. Se corre CONTRA POSTGRES
  003_esquema_indices_parciales.sql  ← los 8 índices que van a mano (BUG abierto, ver abajo)
  NOTAS-ESQUEMA.md                   ← cada decisión, con su porqué
```

**Bug abierto:** `torneo_categorias_unica_hija` en `003_esquema_indices_parciales.sql`
va sobre columna TEXT y MySQL lo rechaza sin prefijo. Arreglado **sólo** en la
copia `db/esquema/02_indices_unicos_parciales.sql` (columna generada). Arreglar
el original o dejar claro que `db/esquema/` manda.

`generar-esquema-mysql.sql` es de **sólo lectura** y se puede pegar tal cual en
el editor SQL de Supabase. Devuelve el DDL de MySQL en tres tandas: las tablas,
los índices y las claves foráneas. Está probado contra producción: las tres
secciones corren y devuelven lo que deben.

Es un generador y no un archivo escrito a mano a propósito: el esquema se va a
seguir moviendo hasta el día del corte, y un archivo a mano queda viejo en una
semana sin que nadie se entere.

### El tamaño del problema, medido

71 tablas · 829 columnas · 156 claves foráneas · 225 índices · 13 disparadores ·
20 funciones · 4 vistas · 6 tipos enumerados.

### Las cinco cosas que no se traducen solas

1. **Los 8 índices únicos parciales.** El riesgo real de la fase. Postgres puede
   decir «único, pero sólo en las filas que cumplan esto»; MySQL no. Tirarles la
   condición convierte un índice que *permitía* repetidos en uno que los
   *prohíbe* — y eso no se ve al migrar, se ve cuando una inscripción legítima
   falla. Resueltos uno por uno en `003_esquema_indices_parciales.sql`.

2. **Los 8 arreglos → JSON.** Obligan a tocar código: lo que hoy se consulta con
   `@>` o `= ANY(...)` pasa a `JSON_CONTAINS` / `MEMBER OF`. El que más importa
   es `event_members.custom_permissions`, porque lo lee el guardia de todas las
   rutas de evento.

3. **Los 9 disparadores** que quedan (los otros 4 son `set_updated_at` y se
   resuelven en el propio DDL). Se van al código, no se reescriben en MySQL.
   Cuidado con los dos que **cuentan** —la cuota del stand y los inscritos por
   sesión—: un contador en un disparador es atómico y el mismo contador desde el
   código no lo es. Necesitan transacción y `SELECT ... FOR UPDATE`, o el aforo
   se pasa de largo el día del evento.

4. **Las 7 funciones que el backend llama por RPC.** `canjear_recompensa` es la
   delicada: descuenta puntos y crea el canje en una sola transacción. Partida
   en dos consultas sin transacción, se puede canjear dos veces lo mismo.

5. **Las 8 claves hacia `auth.users` dejan de ser claves foráneas.** Es una
   pérdida real: hoy la base impide la fila huérfana y mañana no.

Dos hallazgos que ahorran trabajo, por si sirven de consuelo:

- **Los 6 tipos enumerados no los usa ninguna columna.** Restos de un diseño
  anterior. No hay nada que migrar.
- **Los 829 campos usan sólo diez tipos y los diez se traducen.** No hay ningún
  tipo raro escondido.

Y uno que ahorra un fallo tonto: la colación tiene que ser
**`utf8mb4_0900_as_ci`**, no la `ai_ci` que se pone por costumbre. `ai_ci`
ignora acentos además de mayúsculas, y entonces «José» y «Jose» chocarían donde
hoy conviven.

### Lo que sigue en la fase 6

De los cinco pasos queda **medio**. El detalle de cada decisión, con su porqué,
está en `db/migraciones/NOTAS-ESQUEMA.md` y `db/esquema/README.md` del backend.

| Paso | Estado |
|---|---|
| 1 · Generar el esquema → `db/esquema/*.sql` | ✅ 1-sep (backend PR #14). Re-generar antes del corte: el esquema aún se mueve |
| 2 · Las 4 vistas | ✅ `db/esquema/06_vistas.sql`, comprobadas contra Postgres |
| 3 · El volcado de datos → `03_datos.sql` | ✅ 1-sep, con `generar-datos.mjs`. Gitignored. **Falta**: aplicar todo en un MySQL 8 real |
| 4 · Los 9 disparadores y las 7 funciones RPC | ✅ `modules/contadores/`, `modules/eventos/semillas.js`, `modules/aforo/consultas.js` |
| 5 · Comparar las dos bases antes del corte | ✅ `scripts/comparar-bases.js` (falta correrlo contra el MySQL real) |

Tres cosas de esos módulos que conviene no deshacer:

- Los contadores van con transacción **y** `SELECT … FOR UPDATE`. El bloqueo es
  lo que serializa; la transacción sola no basta, porque MySQL en REPEATABLE
  READ deja que dos escaneos lean lo mismo y el stand reparta 520 de una cuota
  de 500.
- Al traerlos se arreglaron **dos fallos del original**: `canjear_recompensa`
  sólo bloqueaba la recompensa, así que dos canjes distintos de la misma
  persona podían descontar del mismo saldo; y el cupo del sub-evento se
  comprobaba fuera de transacción.
- Cada conexión de MySQL fija `SET time_zone = '+00:00'`. `timezone: 'Z'` es
  del driver y no toca la sesión, y las franjas del aforo se calculan con la de
  la sesión: el pico de las 8 de la noche habría salido a las 3 de la tarde sin
  que nada fallara de forma visible.

Nada de esto se llama desde ninguna ruta todavía, a propósito: los datos siguen
en Supabase y allí los disparadores hacen su trabajo.

---

## 3 · La otra mitad abierta: la fase 7

El censo de rutas ya existe y la prueba lo sostiene (`test/permisos.test.js`).
Hoy: **285 rutas**, 236 declaradas y **49 sin declarar**. Se bajó de 230 en
siete tandas.

El número está anotado como tope en `core/permisos/inventario.json` y **sólo
puede bajar**: si alguien añade una ruta sin declararla, la prueba se pone roja
el mismo día. Eso es lo que hay que ir bajando, en tandas, con:

```bash
node scripts/censar-rutas.js            # ver el estado
node scripts/censar-rutas.js --guardar  # anotar y bajar el tope
```

Hay tres formas de declarar una ruta y elegir la correcta es la parte que
piensa: `exige([...])` cuando cuelga de un permiso de evento, `sesion('motivo')`
cuando es «esta fila es suya», `publica('motivo')` cuando no pide sesión a
propósito. El motivo es obligatorio en las dos últimas porque es lo que se lee
dentro de un año.

**El método que funcionó en las tres tandas:** leer qué comprueba el handler
HOY y declarar exactamente eso. `exige()` es un guardia real, no un marcador
como `sesion()`, así que declarar de más deja gente fuera de su propio evento.
Cuando la lista de permisos ya existía en un helper, se saca a una constante
que usan los dos — escrita dos veces acaban separándose, y entonces la ruta
dice que pide un permiso y el handler exige otro.

Dos categorías que el sistema no tenía nombradas y aparecieron declarando:

- **Pertenencia** (`chat`, `tareas`, `solicitudes`). «Eres del equipo activo»
  no es un permiso, no es público y no es «esta fila es tuya». Van con
  `sesion()`; inventarles un permiso habría dejado fuera a quien hoy entra.
- **Sólo el dueño** (`waitlist`, `promociones`). Comparan `owner_id` y no piden
  permiso. Aquí `exige()` habría sido un fallo de seguridad y no una
  declaración: `puede()` deja pasar al dueño **o** a quien tenga la acción, así
  que ponerle un permiso ABRE la ruta a los editores.

Y un tropiezo que se repitió tres veces, por si sirve en las 49 que quedan: si
el archivo YA importaba algo de `core/permisos`, la inserción automática del
import se lo salta y las rutas quedan referenciando algo inexistente. Revienta
al cargar, no al leer el diff — lo cazaron las pruebas las tres veces.

---

## 4 · Los siete puntos de la lista que mandaste

| # | Qué pediste | Estado |
|---|---|---|
| 1 | Botón personalizable (colores, gradientes, sombras, bordes, esquinas) | ✅ Panel con vista previa en vivo, en `PublicacionSection.jsx` |
| 2 | Que se integre sólo el botón, no toda la sección | ✅ `public/widget.js`, sin dependencias |
| 3 | Que el formulario abra el modal en la web del cliente, no redirija a GESTEK | ✅ El registro va en un iframe sobre la página del cliente |
| 4 | Una base para el auth y otra para el registro de usuarios | ✅ `core/db/mysql.js`: `bd('auth')` y `bd('datos')` |
| 5 | El QR no se centra en las distintas vistas | ✅ Corregido en la escarapela vertical |
| 6 | Descargar el QR en la vista de después del formulario | ✅ Botón de descarga en PNG |
| 7 | Contingencia para los correos | ✅ Cola con reintentos, rescate de los que se quedan a medias, y pantalla para verlos |

**Sobre el punto 3, una advertencia que conviene no perder:** el *formulario* sí
abre dentro de la web del cliente, pero **el pago no puede**. Las pasarelas
redirigen a su propio dominio y el 3-D Secure no funciona dentro de un iframe de
otro sitio. Así que al pagar se abre una pestaña. No es una limitación de cómo
está hecho: es cómo funcionan las pasarelas.

**Lo que sigue pendiente de esa lista: pijaohub** (los puntos 10 y 11 de la hoja
de cálculo). Está **bloqueado por falta de información de producto**, no de
código: no existe ningún evento de pijaohub en producción, y hacen falta fechas,
lugar y tipos de entrada para crearlo.

---

## 4.b · La regla que manda sobre todo lo demás: Supabase NO se apaga todavía

**Se migra por partes, pero la plataforma sigue corriendo sobre Supabase hasta
que todo lo nuevo esté conectado y probado.** Hay un pitch pronto: si se
desconecta Supabase de golpe, no hay plataforma que enseñar.

Qué significa en la práctica, para no tener que preguntarlo cada vez:

- **`AUTH_PROPIA` y `ARCHIVOS_PROPIOS` se quedan apagados.** Ya lo están por
  defecto (`core/config/index.js` los lee de una variable que nadie ha puesto),
  y el código detrás sólo se monta si se encienden. Subirlo es seguro;
  encenderlo es otra conversación.
- **Las migraciones destructivas se escriben, no se corren.** `0081` quita tres
  columnas de `perfil_talento` y está pendiente a propósito. El código que la
  acompaña ya funciona **sin** aplicarla: dejó de escribir en esas columnas y
  lee de `profiles`, que también está en Supabase. Ése es el patrón a seguir —
  primero que el código deje de depender de algo, y sólo al final se quita.
- **La fase 6 (las 71 tablas a MySQL) se prepara en paralelo, no se corta.** El
  generador, el esquema **y el volcado de datos ya están en `db/esquema/`**
  (1-sep). Falta aplicarlo contra un MySQL de pruebas y `comparar-bases`, sin
  tocar producción. El corte es lo último.
- Y sigue en pie lo de siempre: en septiembre no se migra nada, que el evento
  es a mediados de mes.

---

## 5 · Lo que sólo puede hacer alguien con accesos

Por orden de urgencia. **Lo de arriba corre prisa de verdad; lo de abajo puede
esperar a después del pitch.**

| Qué | Qué hace falta | Cuánto |
|---|---|---|
| **Desplegar backend y frontend a la vez** | ✅ Hecho. Los escáneres ya responden 200 en producción. Se deja anotado porque la regla sigue en pie: los dos repos salen juntos, y no hacerlo fue lo que los rompió | — |
| **Correr el barrido de huérfanos** | `SUPABASE_SERVICE_KEY` en el entorno. Son 36 objetos, 28,1 MB, ya medidos y listados | 2 min |
| **Cerrar el correo entre cuentas** | Desplegar el frontend y **después** correr `db/migraciones/postgres/002_…`. En ese orden, o el chat se rompe | 10 min |
| **Conseguir el SMTP** | Bloquea todo el correo, y con él la mitad del recorrido de prueba: boletas con QR, invitaciones, recordatorios, lista de espera. `POR-HACER.md` §1.1 | — |
| **`MP_WEBHOOK_SECRET`** | Del panel de Mercado Pago. Sin ella los webhooks se aceptan **sin verificar firma**: cualquiera que sepa la URL puede marcar una boleta como pagada | 5 min |
| **Decir si la pasarela de producción es real o de pruebas** | Antes de recorrer el flujo de compra de punta a punta. Si el token de Render es de producción, «comprar una boleta» mueve dinero de verdad | — |
| **Mirar el egress** | Entrar al panel de Supabase. Es el dato que decide si hace falta plan Pro el mes del evento | 2 min |
| **Aplicar las migraciones `0081`, `0083`, `0086`** | El 1-sep ya se aplicaron `0084`, `0082` y `0085` (aditivas). Quedan a propósito sin aplicar: `0081` (DROP COLUMN ×3, destructiva — post-evento), `0083` (muta el page_json de 1 evento en vivo; el frontend ya lo deduce), `0086` (función muerta). Ninguna corre prisa | 2 min |
| **Rotar la contraseña de Postgres** | Se pegó en un chat para generar `03_datos.sql`. El backend usa `SUPABASE_SERVICE_KEY`, no esa — rotarla no rompe nada | 2 min |
| **Encender la identidad propia** | cPanel: base MySQL, variables, consola de Google. `CONFIGURAR.md`. **No antes del pitch** | 1 h |
| **Mover el backend de Render a cPanel** | Acceso a cPanel. Quita los 21 s de arranque en frío, que es la causa **medida** del congelamiento | 1 h |

El primero es el que corre prisa: no es trabajo pendiente, es algo que hoy está
roto. El arranque en frío de Render es la causa medida de lo que se ve como
«congelamiento», así que para un pitch conviene tenerlo caliente antes de
empezar, aunque no se mueva de sitio.

---

## 6 · Una nota de honestidad sobre esta sesión

Para medir el largo real de las columnas de texto creé una tabla temporal en
producción (`public._medidas_texto`) y **la borré al terminar**. No quedó nada.
Todo lo demás que se hizo contra Supabase esta sesión fue de sólo lectura.

La única escritura en producción de todo el trabajo sigue siendo la migración
de la fase 3, del 28 de agosto, que cerró la lectura anónima de datos
personales — y ésa estaba pedida.
