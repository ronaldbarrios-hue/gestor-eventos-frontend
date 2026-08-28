# GESTEK · Mapa de independencia: salir de Supabase, servicio por servicio

Escrito el **28 de agosto de 2026**. Es el documento de desarrollo: qué guarda
Supabase hoy de lo nuestro, con qué se reemplaza cada pieza, **en qué carpeta
vive** y en qué orden se hace.

Complementa a `SUPABASE.md` (el estado medido) y a `TRASPASO.md`. Sustituye el
plan de `MIGRACION-SUPABASE.md` en un punto de fondo: aquel documento decía
«mover el servidor, no reescribir la aplicación», y eso valía mientras el
destino fuera Postgres. **El servidor de destino sólo tiene MySQL**, así que la
regla cambia y este documento explica en qué.

Todos los números vienen de consultar el proyecto de producción
(`yopontbwgdybfsniqawz`) y los dos repos hoy. Lo no verificado está marcado en
la sección 10.

---

## 0 · Los tres criterios que gobiernan todo lo que sigue

1. **Todo propio.** Ningún servicio de terceros en el camino crítico.
2. **Todo en el backend, en carpetas separadas.** Un módulo por servicio, con
   frontera limpia, de modo que cualquiera se pueda sacar y desplegar aparte
   como microservicio sin reescribirlo.
3. **Incremental.** Cada función se migra y se cambia en el momento, no en un
   corte grande al final. Mientras un módulo no esté listo, la app sigue usando
   Supabase para esa pieza y sólo para esa.

---

## 1 · Lo que hay que arreglar esta semana, antes de migrar nada

Esto no depende de la migración y está abierto ahora mismo.

### 1.1 · `profiles` es legible por cualquiera, sin cuenta

La política `profiles_select_self` está escrita así:

```
((auth.uid() = id) OR true)
```

El `OR true` la anula entera. Comprobado con una petición real, sin sesión, con
la clave anónima que va publicada en el JavaScript del navegador:

```
HTTP 200 — filas devueltas SIN sesión: 29
con email: 29 | con teléfono: 23 | con mp_access_token: 2
```

Los 29 correos, 23 teléfonos y **dos access tokens de MercadoPago en claro**.
Cualquiera con un `curl`. Dos arreglos, los dos necesarios:

- Quitar el `OR true`.
- Sacar los secretos de `profiles` a una tabla aparte que el navegador no pueda
  consultar nunca: `mp_access_token`, `wompi_private_key`, `wompi_events_secret`,
  `wompi_integrity_secret`, `google_refresh_token`. Aunque la política quede
  correcta, esas columnas no deben vivir en una tabla que el front consulta.

### 1.2 · Otras tablas con lectura abierta

Barrido de las 76 políticas buscando `true`:

| Tabla | Política | Veredicto |
|---|---|---|
| `profiles` | `(auth.uid() = id) OR true` | **Error. Cerrar ya** |
| `torneo_equipos` | `true` | Filtra `contacto_email` — **3 correos reales, medidos** |
| `networking_expositores` | `true` | Filtra `contacto_email`/`contacto_telefono`. Hoy 0 rellenos, pero la puerta está abierta |
| `evento_legal` | `true` | Aceptable: textos legales, son públicos por diseño |
| `categorias`, `torneos`, `torneo_partidos`, `networking_horarios` | `true` | Aceptable: son las páginas públicas |

Las dos primeras se arreglan con una vista pública que no exponga columnas de
contacto, o moviendo esas lecturas al backend.

### 1.3 · Lo que ya estaba anotado y sigue sin tocar

De `SUPABASE.md` §3.4, sin cambios: subida anónima abierta a `form-uploads`,
hojas de vida en bucket público, 40 objetos huérfanos (28 MB), y la subida de CV
que no puede funcionar. Y 21 tablas con RLS activo y **ninguna política**, entre
ellas `oauth_tokens`, `evento_smtp`, `organizador_conexiones` y `cobros_vacantes`.
Hoy no filtran porque el backend entra con la service key; el día que algo del
navegador las consulte, fallan o responden de más.

---

## 2 · El motor: MySQL (o MariaDB) y el servidor: cPanel

El servidor de destino sólo ofrece MySQL, y se administra **por cPanel**. Eso se
acepta como restricción, pero conviene saber qué cuesta, porque no es «cambiar
la cadena de conexión».

### 2.0 · Lo que cPanel condiciona, y hay que verificar antes de construir

**La pregunta de fondo, sin resolver:** `TRASPASO.md` dice que el administrador
tiene root, y eso fue lo que retiró la objeción sobre hosting compartido. cPanel
normalmente significa lo contrario. Si es un **VPS con cPanel encima**, hay root
y este plan se sostiene entero. Si es **hosting compartido con cPanel**, cambian
tres cosas de golpe:

| Pieza | En un VPS | En cPanel compartido |
|---|---|---|
| Node | systemd, puerto propio | Passenger («Setup Node.js App»), sin control del proceso, con límites de memoria del plan |
| **SSE** (§7) | Funciona | **Puede no funcionar**: Apache/LiteSpeed suelen bufferizar la respuesta y el flujo no sale nunca |
| Archivos privados (§6) | `X-Accel-Redirect` de Nginx | `mod_xsendfile` o el equivalente de LiteSpeed |
| Módulos como microservicios (§4) | Directo | Cada app Node consume recursos del mismo plan compartido |
| Cron | systemd timers | Los cron jobs de cPanel sirven igual |

**Verificación obligatoria antes de la fase 3:** un endpoint SSE de prueba que
emita una línea cada segundo. Si llega goteando, hay SSE. Si llega todo junto al
final, está bufferizado y el módulo de tiempo real usa sondeo largo (30–60 s) en
vez de SSE — que sigue siendo cien veces menos tráfico que los 5 segundos de hoy.
Son diez minutos de comprobación y condicionan todo el §7.

### 2.0.b · MySQL o MariaDB: no es lo mismo para nosotros

cPanel casi siempre instala **MariaDB**, no MySQL. La diferencia que nos importa
es una: **MariaDB no tiene tipo `JSON` nativo** — es un alias de `LONGTEXT` con
una validación. Nuestras cinco columnas JSON dependen de eso.

| | MySQL 8 | MariaDB 10.6+ |
|---|---|---|
| Tipo `JSON` | Nativo, binario, validado | Alias de `LONGTEXT` + `CHECK (json_valid(...))` |
| Funciones `JSON_EXTRACT`, `JSON_SET` | Sí | Sí |
| Indexar dentro del JSON | Columnas generadas + índice | Columnas generadas, con más limitaciones |

Con MariaDB se trabaja igual, pero conviene **no meter lógica dentro del JSON**:
lo que haya que consultar o filtrar se saca a columnas de verdad. Es buena idea
en los dos casos, y en MariaDB deja de ser opcional.

**Qué mirar:** la versión sale en la página de inicio de cPanel, barra lateral
derecha, o entrando a phpMyAdmin. Hasta saberlo, este documento asume MySQL 8.

**Lo que se traduce solo:** las tablas, los índices, las claves ajenas, y las
consultas normales. El grueso del esquema pasa sin drama.

**Lo que hay que reescribir a mano:**

| Pieza Postgres | Cuánto hay | Qué se hace en MySQL |
|---|---|---|
| `jsonb` (`page_json`, `gallery`, `branding`, `paginas`, `respuestas`) | 5 columnas | Tipo `JSON` de MySQL 8. Los operadores cambian: hay que revisar cada consulta que los use |
| `uuid` nativo | Todas las claves | `CHAR(36)` o `BINARY(16)`. **Los valores se conservan tal cual** — es innegociable, están referenciados por claves ajenas en todo el esquema |
| Funciones plpgsql | 20 | Reescribir en SQL de MySQL o, mejor, subirlas a JavaScript en el backend |
| Triggers | 22 | Igual: la mayoría se lleva mejor en el backend, donde se pueden probar |
| Extensiones (`pgcrypto`, `uuid-ossp`…) | 6 | No existen. Lo que dan se hace en Node |
| Políticas RLS | 76 | **No existen en MySQL.** Ver abajo |
| Vistas | 3 | Revisar una a una |

**Sobre las RLS, la buena noticia medida:** el backend entra con `service_role`,
que ya se salta RLS, y hace su propia autorización comparando contra
`req.user.id` (297 veces). El navegador sólo habla directo con la base en
**cuatro sitios, todos contra `profiles`**. Es decir: las 76 políticas hoy casi
no protegen nada real. No hay que traducir 76 políticas a MySQL — hay que mover
4 llamadas al backend y que la autorización viva donde ya vive. Eso reduce el
trabajo de meses a días, pero **sube la apuesta**: cuando RLS desaparezca no
habrá red de seguridad debajo, así que cada endpoint tiene que comprobar
permisos de verdad. Ver §4.4.

---

## 3 · Inventario: qué de Supabase guarda cosas nuestras

Un módulo por fila. La columna «carpeta» es dónde vive en el backend.

| # | Servicio hoy | Qué guarda / hace | Reemplazo propio | Carpeta |
|---|---|---|---|---|
| 1 | **Auth (GoTrue)** | 29 usuarios, contraseñas, identidades Google, sesiones | Módulo de identidad propio | `modules/auth/` |
| 2 | **Postgres vía PostgREST** | 71 tablas, todos los datos | MySQL + capa de datos propia | `modules/*/repositorio.js` + `db/` |
| 3 | **Storage** | 107 objetos, 80 MB: portadas, avatares, documentos, CV | Módulo de archivos en disco propio | `modules/archivos/` |
| 4 | **Realtime** | 3 canales: notificaciones, aforo, chat | SSE propio | `modules/tiempo-real/` |
| 5 | **pg_cron / pg_net** | 1 job desactivado, 1.981 fallos | Ya está en `node-cron` | `modules/tareas/` |
| 6 | **Edge Functions** | `quick-processor`, un Hello World de ejemplo | Nada. Se borra | — |

Los dos últimos son peso muerto: se borran antes de empezar y no se reemplazan
por nada.

---

## 4 · Arquitectura de carpetas

### 4.1 · Cómo está hoy

19.789 líneas. 38 archivos de rutas montados a mano en `index.js`, algunos con
más de mil líneas (`eventos.publicos.js` 1.027, `clientes.js` 975, `torneos.js`
801). No hay separación entre ruta, lógica y acceso a datos: un archivo de
`routes/` decide permisos, ejecuta la consulta y arma la respuesta. Nueve
`app.use('/')` distintos montan rutas en la raíz, así que para saber qué atiende
un endpoint hay que leer varios archivos.

Eso no es sostenible para lo que viene, porque la migración toca justo lo que
está mezclado: el acceso a datos.

### 4.2 · Cómo debería quedar

Cada módulo es autocontenido y expone **una sola puerta** (`index.js`). Nadie
importa el interior de otro módulo. Esa regla es la que permite sacar cualquier
carpeta y desplegarla aparte sin tocar su código.

```
backend/
├── index.js                    # sólo arranque y montaje
├── core/                       # lo transversal, sin lógica de negocio
│   ├── db/                     # conexión MySQL, pool, transacciones
│   ├── errores/
│   ├── config/                 # lee el entorno, valida al arrancar
│   └── log/
├── modules/
│   ├── auth/                   # ← el primero (§5)
│   │   ├── index.js            # única puerta: rutas + middleware exportado
│   │   ├── rutas.js
│   │   ├── servicio.js         # login, registro, refresco, recuperación
│   │   ├── tokens.js           # emisión y verificación
│   │   ├── google.js           # OAuth
│   │   ├── repositorio.js      # ÚNICO sitio que toca la tabla de usuarios
│   │   └── correos/
│   ├── archivos/               # ← el segundo (§6)
│   ├── tiempo-real/            # ← el tercero (§7)
│   ├── eventos/
│   ├── tickets/
│   ├── pagos/
│   ├── correo/
│   └── ...
└── db/
    └── migraciones/            # numeradas, en orden, sin excepción
```

**Las tres reglas que hacen que esto sirva de algo:**

1. **Sólo `repositorio.js` toca la base.** Ninguna ruta escribe SQL. Cuando se
   cambie de motor, se toca un archivo por módulo, no ciento.
2. **Nadie importa el interior de otro módulo**, sólo su `index.js`. Si
   `tickets` necesita algo de `auth`, lo pide por la puerta.
3. **Un módulo no sabe que existe HTTP** más allá de su `rutas.js`. Así el día
   que se saque a microservicio, sólo cambia cómo entra la petición.

### 4.3 · Cómo se llega ahí sin parar el trabajo

No se reorganiza todo de golpe. Se crea `core/` y `modules/`, y **cada vez que
se migra un servicio, ese servicio nace ya en su carpeta nueva**. Lo viejo se
queda en `routes/` hasta que le toque. Al final `routes/` queda vacío y se borra.

### 4.4 · La autorización, que hoy la sostiene RLS a medias

Cuando RLS desaparezca, cada endpoint tiene que comprobar permisos por sí mismo.
Hoy eso se hace a mano en cada handler comparando `owner_id` contra
`req.user.id`. Con 38 archivos y 312 usos de `req.user`, la probabilidad de que
alguno se olvide no es teórica. La medida concreta: un único helper
`puede(usuario, accion, recurso)` en `core/`, y una prueba automática que
recorra todas las rutas registradas y falle si alguna no declara qué permiso
exige. Es la pieza que sustituye a las 76 políticas, y hay que escribirla
**antes** de apagar RLS, no después.

---

## 5 · Módulo 1 · Auth (`modules/auth/`)

Es el primero porque todo lo demás depende de él.

### 5.1 · Qué hace Supabase Auth hoy, función por función

Esto es lo que hay que cubrir. Nada más, y nada menos.

| Función | Dónde se usa hoy | Qué hará el módulo propio |
|---|---|---|
| Iniciar sesión con contraseña | `AuthContext.jsx:168` | `POST /auth/login` → verifica bcrypt, emite tokens |
| Registro | `AuthContext.jsx:176` | `POST /auth/registro` → crea usuario + envía correo de confirmación |
| Cerrar sesión | `AuthContext.jsx:194`, `client.js:37` | `POST /auth/logout` → revoca el refresh |
| Entrar con Google | `AuthContext.jsx:202` | `GET /auth/google` → consentimiento; el callback abre sesión |
| Recuperar contraseña | `AuthContext.jsx:212` | `POST /auth/recuperar` → correo con enlace de un solo uso |
| Cambiar contraseña | `AuthContext.jsx:220`, `:226` | `PATCH /auth/password` |
| Actualizar metadatos | `AuthContext.jsx:226` y 3 pantallas | `PATCH /auth/perfil` |
| Reenviar confirmación | `AuthContext.jsx:240` | `POST /auth/reenviar` |
| Confirmar correo | `ConfirmarPage.jsx` | `GET /auth/confirmar?token=` |
| Leer sesión / refrescar | `AuthContext.jsx:137`, `client.js:16` | `POST /auth/refresh` |
| Validar token en el backend | `middleware/auth.js:11` y `:23` | Verificación **local**, sin red |

### 5.2 · La mitad ya está escrita

`lib/oauth.js` es un servidor de tokens propio, hoy en producción para el MCP:
tokens aleatorios guardados como hash SHA-256, refresco con rotación (revoca el
anterior), revocación, PKCE S256, sobre `oauth_clients`, `oauth_codes` y
`oauth_tokens`. Ese es el motor de sesiones y **se reutiliza tal cual**.

`lib/googleCalendar.js` ya tiene el flujo OAuth de Google completo: `authUrl`,
`state` firmado, `intercambiarCodigo`, lectura de `userinfo`. Para «entrar con
Google» sólo cambia el scope y qué se hace al volver.

Lo que falta de verdad: la tabla de usuarios, la verificación de contraseña, los
endpoints, y conectar el middleware.

### 5.3 · Los datos que se migran

```
usuarios: 29 · con contraseña: 10 · identidades Google: 22 · sesiones vivas: 21
```

- **Las contraseñas se migran intactas.** Los 10 hashes son `$2a$`, bcrypt
  estándar: `bcryptjs` los verifica sin tocarlos. **Nadie restablece nada.**
- **Los UUID se conservan exactamente.** Están referenciados por claves ajenas
  en todo el esquema y por `profiles.id`. Cambiar uno rompe el evento entero.
- **Las 22 identidades de Google** se migran con su `sub`, y hay que usar el
  **mismo `client_id`**. Si cambia, esos 22 usuarios no entran aunque sus filas
  estén perfectas.
- **Descuadre que hay que mirar antes de migrar:** hay 10 usuarios con
  contraseña pero sólo 9 identidades de tipo `email`. Uno está descolocado; si
  no se revisa, se queda sin poder entrar.

### 5.4 · El cambio que más rinde por línea

`middleware/auth.js` llama hoy a `supabase.auth.getUser(token)` **en cada
petición**: una llamada de red a Supabase por cada petición que hace la app.
Sustituirla por una verificación local de firma son unas quince líneas, y con
compatibilidad hacia atrás (si el token no valida con nuestro secreto, cae al
método viejo) **no se toca ninguno de los 38 archivos de rutas ni las 312
referencias a `req.user`, y las 21 sesiones vivas no se cortan**.

Esto conecta directamente con §7: hoy cada petición del sondeo cuesta dos viajes.

### 5.5 · El frontend casi no se entera

De los 23 usos de `supabase.auth`, **11 están dentro de `AuthContext.jsx`**.
Si el contexto conserva su superficie hacia fuera (`login`, `register`,
`logout`, `signInWithGoogle`, `resetPassword`, `updatePassword`,
`updateProfile`, `resendConfirmation`), **ninguna otra pantalla cambia**.
Quedan sueltos 4 `getSession()` que sólo sacan el token para subir archivos, y
4 `updateUser`.

Un cambio que sí conviene hacer de paso: hoy el token vive en `localStorage`,
donde cualquier XSS lo lee. Con backend propio se puede usar cookie `httpOnly`
+ refresh, que es la razón principal por la que hacerlo propio mejora la
seguridad en vez de sólo moverla.

---

## 6 · Módulo 2 · Archivos e imágenes (`modules/archivos/`)

### 6.1 · Dónde están hoy y dónde quedarían

Tres buckets públicos, 107 objetos, 80 MB. Todo lo sube **el navegador directo
contra Supabase**; el backend no toca Storage en absoluto. Eso se invierte: el
navegador sube al backend, y el backend escribe en disco.

| Hoy | Mañana |
|---|---|
| `avatars/<uid>/avatar-<ts>.jpg` | `/var/gestek/archivos/avatars/<uid>/…` |
| `event-media/<uid>/…` | `/var/gestek/archivos/event-media/<uid>/…` |
| `form-uploads/<eventoId>/…` | `/var/gestek/archivos/form-uploads/<eventoId>/…` |

**La estructura de carpetas se conserva idéntica.** Es lo que convierte la
reescritura de URLs en una sustitución de prefijo y nada más.

Fuera del repo y fuera de la carpeta del código: un disco montado, para que un
despliegue no se lleve los archivos por delante. Servidos por Nginx directamente
(no por Node), con `X-Accel-Redirect` para los privados.

### 6.2 · Las URL están dentro de las filas

Es lo que convierte «copiar archivos» en migración de datos: lo guardado no es
la ruta, es la URL absoluta con el host de Supabase dentro. **13 columnas en 9
tablas, 57 filas**, y **cinco de esas columnas son JSON** (`gallery`,
`page_json`, `paginas`, `branding`, `tickets.respuestas`), donde la URL está a
profundidad variable y un `replace` sobre texto no las alcanza. La tabla
completa y las sentencias que sí funcionan están en `SUPABASE.md` §3.3 y §6.4.

Orden obligatorio: copiar → servir las dos copias en paralelo → reescribir
dentro de una transacción comparando los conteos (16, 13, 5, 5, 4, 4, 3, 2, 1,
1, 1, 1, 1) → y sólo cuando cuadren, apagar el origen.

### 6.3 · Lo que se arregla al pasar por el backend

Los cuatro problemas de `SUPABASE.md` §3.4 desaparecen solos cuando la subida
pasa por nuestro servidor, porque ahí sí se puede validar: tipo real (no la
extensión), tamaño, cuota por usuario, y **borrar el archivo anterior** — que es
lo que hoy no hace nadie salvo `DocumentosSection`, y por lo que hay 40
huérfanos y 28 MB de basura. Los CV dejan de estar en un bucket público y pasan
a servirse con enlace firmado y caducidad.

---

## 7 · Módulo 3 · Tiempo real y el problema de las peticiones

### 7.1 · Lo que está medido

En 24 horas, contra Supabase: **1.170 peticiones, de las cuales 861 (74%) son
`/realtime/v1/websocket`**. Un WebSocket sano se abre una vez y dura horas; 861
aperturas con tres personas es reconexión constante, no uso.

**Las ~70.000 peticiones de ayer no aparecen aquí.** No pasaron por Supabase:
van contra el backend propio. Desde esta sesión no puedo verlas — hay que
mirarlas en el panel de Render o en la pestaña de red del navegador. Lo que sí
puedo hacer es explicar de dónde salen, porque los multiplicadores están en el
código y son tres:

**a) Sondeo fijo.** `AforoSection.jsx:89` pide cada **5 segundos**
(`REFRESCO_MS`); `AccesosSection.jsx:56` cada **8 segundos**. Son 720 y 450
peticiones por hora **por pestaña abierta**. Tres personas con las dos pantallas
abiertas una jornada de 8 horas: ~28.000 peticiones, sin que nadie haga nada.

**b) El amplificador cuadrático.** `useAsistenciaEnVivo.js:35` se suscribe a
`event: '*'` sobre `tickets` y, **por cada cambio en cualquier ticket**, lanza
`refrescar()`, que es otra petición al backend. Con N pantallas abiertas y M
escaneos en la puerta, son **N×M peticiones**. En una jornada de check-in real
es exactamente el patrón que dispara los números a decenas de miles. Este es el
duplicador que se sospechaba, y está aquí.

**c) Cada petición cuesta dos viajes.** Todas pasan por `middleware/auth.js`,
que llama a Supabase para validar el token. El sondeo no multiplica peticiones:
multiplica pares de peticiones. §5.4 lo corta a la mitad de un plumazo.

### 7.2 · Qué se hace

1. **Verificación local del token** (§5.4). Es lo más barato y quita la mitad
   del tráfico sin tocar ninguna pantalla.
2. **Reemplazar el sondeo por SSE** — *si cPanel lo permite*, ver §2.0. Una
   conexión abierta por pantalla, y el servidor empuja cuando algo cambia. El
   aforo pasa de 720 peticiones/hora a una conexión. Si el proxy bufferiza,
   sondeo largo de 30–60 s: peor, pero sigue siendo cien veces menos que hoy.
3. **Que el evento traiga el dato.** El error de `useAsistenciaEnVivo` no es
   suscribirse: es que al recibir el aviso vuelve a preguntar. Si el mensaje ya
   trae el número nuevo, la petición extra sobra entera.
4. **Parar cuando la pestaña no se ve.** Con `visibilitychange` — hoy no hay
   ni uno en todo el frontend. Un portátil olvidado abierto toda la noche
   sondea igual que uno en uso.
5. **Instrumentar antes y después.** Un contador de peticiones por minuto en el
   backend, para que «mejoró» sea un número y no una impresión.

### 7.3 · Por qué se congela: no es Supabase

El sondeo se puso con la idea de que **Supabase se congela si no recibe
peticiones**, por ser plan gratuito. Medido, eso no es lo que pasa:

- El **28 de agosto, de 07:00 a 15:00, el proyecto recibió 1 petición por hora
  durante ocho horas seguidas**, y siguió `ACTIVE_HEALTHY`. Si se congelara por
  falta de tráfico, esas ocho horas lo habrían tumbado.
- La pausa del plan gratuito de Supabase existe, pero es tras **7 días completos
  sin actividad**, y es una pausa explícita que se deshace desde el panel. No es
  algo que se cure sondeando cada 5 segundos.
- Los síntomas no coinciden. Con Supabase dormido la app daría **errores de red**
  (503, peticiones fallidas). Lo que se observa es la **interfaz congelada**, que
  es el navegador, no el servidor.

**Hipótesis, sin confirmar:** el backend está en `onrender.com`, y el plan
gratuito de Render **sí duerme el servicio a los 15 minutos de inactividad**;
despertarlo tarda ~50 segundos. Esa primera petición colgada casi un minuto se
siente exactamente como «se congeló». El sondeo funciona — pero por una razón
distinta a la que se creía, y contra Render, no contra Supabase.

**Cómo confirmarlo, en dos minutos:** dejar la app sin usar 20 minutos, abrirla y
mirar en la pestaña de red cuánto tarda la primera petición. Si son ~50 segundos
y después todo va normal, es Render despertando.

**Si se confirma**, la solución no es sondear desde siete navegadores: es **un
solo ping cada 10 minutos desde un cron** —cPanel los trae— o pagar el plan de
Render. Mismo efecto, decenas de miles de peticiones menos. Y cuando el backend
esté en el servidor propio, el problema desaparece solo: un proceso de Passenger
no se duerme como un servicio gratuito de Render.

**Lo que no hay que hacer es dar por buena la explicación sin medirla.** Si tras
la comprobación resulta que la interfaz se congela igual con el backend
despierto, entonces sí hay algo en el navegador —fuga de memoria, listeners
acumulados, un bucle de renders— y el SSE lo heredaría igual que el sondeo.

---

## 8 · Orden de trabajo

Cada fase deja el sistema funcionando. Nada de un corte grande al final.

| Fase | Qué | Depende de | Riesgo |
|---|---|---|---|
| **0** | Cerrar `profiles` y las dos tablas con contacto. Borrar el cron muerto y `quick-processor`. Barrer los 40 huérfanos | Nada | Ninguno |
| **1** | Verificación local del token (§5.4) | Nada | Bajo. Compatible hacia atrás |
| **2** | `core/` + `modules/`. Migraciones numeradas | Nada | Ninguno: es andamiaje |
| **3** | Sondeo → SSE, y el evento con el dato dentro (§7.2) | Fase 2 | Bajo |
| **4** | **Auth propio** (§5) en MySQL, conviviendo con Supabase | Fases 1–2 | **Alto**. Ver §9 |
| **5** | Archivos propios (§6) | Fase 2 | Medio |
| **6** | El resto de tablas a MySQL, módulo a módulo | Fase 4 | Alto |
| **7** | Helper de permisos + prueba que recorra las rutas (§4.4) | Fase 6 | **Alto**: es lo que sustituye a RLS |
| **8** | Apagar Supabase | Todas | — |

**En septiembre no se migra nada.** El evento es a mediados de mes y sigue en
pie lo que decía `TRASPASO.md`. Las fases 0 a 3 sí caben antes, porque ninguna
cambia dónde viven los datos y las tres primeras sólo quitan riesgo.

---

## 9 · Credenciales: qué hace falta y cuándo

Nada de esto lo puedo hacer yo, y hay dos que tardan por trámite, no por
trabajo. Conviene pedirlas al empezar la fase anterior, no el día que se usan.

| Qué | Para qué | Cuándo hace falta | Quién |
|---|---|---|---|
| **Acceso a cPanel** (usuario, base MySQL/MariaDB, dominio) y **si hay SSH/root** | Todo. Ver §2.0 | **Antes de la fase 2** | Administrador |
| **Google Cloud Console** | Añadir el nuevo dominio de callback **conservando el `client_id`** | **Fase 4.** Si el `client_id` cambia, los 22 usuarios de Google se quedan fuera | Dueño del proyecto Google |
| **SMTP propio** | Confirmación, recuperación de contraseña | Fase 4 — sin esto no se puede registrar nadie | Administrador |
| **Certificado TLS** | Cookies `httpOnly` seguras | Fase 4 | Administrador |
| **Secretos nuevos** (`JWT_SECRET`, refresco) | Firmar los tokens | Fase 4 | Se generan; no se reutiliza ninguno de Supabase |
| **`QR_JWT_SECRET`** | Que los QR ya emitidos sigan validando | Fase 6. **Tiene que viajar idéntico** | Ya existe |

El punto crítico es el de Google, y no por dificultad: es una pantalla de la
consola. Es que si se descubre tarde que el `client_id` no se puede conservar,
afecta a **tres de cada cuatro usuarios** y no hay arreglo rápido. Conviene
verificar que se tiene acceso a esa consola **ahora**, no en la fase 4.

---

## 10 · Qué está medido y qué no

**Medido hoy contra producción y contra el código:** la política de `profiles` y
la lectura anónima real (29 filas, 29 correos, 23 teléfonos, 2 tokens de
MercadoPago); las 8 políticas con `true` y qué expone cada una; los 3 correos
de `torneo_equipos`; las 1.170 peticiones de 24 h con 861 WebSockets; los
intervalos de 5 s y 8 s y dónde están; el amplificador de `useAsistenciaEnVivo`;
297 usos de `req.user.id`, 9 de `.email` y 1 de `user_metadata`; las 4 llamadas
directas del navegador a `profiles`; los 23 usos de `supabase.auth` y su reparto;
los 10 hashes `$2a$`; las 22 identidades de Google; el descuadre de 10 contra 9;
19.789 líneas y 38 archivos de rutas; que `lib/oauth.js` y `lib/googleCalendar.js`
ya implementan lo que se creía por escribir.

**No medido:**

- **Las ~70.000 peticiones de ayer.** No pasaron por Supabase; hay que verlas en
  Render o en el navegador. La aritmética de §7.1 las explica, pero explicar no
  es medir.
- **Por qué se congela la página.** Lo que sí está medido es que **no es
  Supabase por falta de peticiones** (§7.3): ocho horas seguidas a 1 petición
  por hora y el proyecto siguió sano. La hipótesis de Render dormido explica los
  síntomas, pero no la he podido medir desde aquí — hace falta la pestaña de red
  o el panel de Render.
- **La causa exacta de las 861 reconexiones.** El número es real; el porqué hay
  que instrumentarlo.
- **El egress.** Sigue sin mirarse desde el 13 de agosto, y es el único dato que
  decide si hace falta plan Pro el mes del evento.
- **Nada de este plan se ha ensayado.** La primera vez que se corra, contra una
  copia.
- **El servidor de destino.** Se administra por cPanel, y eso es todo lo que se
  sabe. Falta: si hay root o es compartido (§2.0 — es lo que más condiciona),
  **si es MySQL 8 o MariaDB** (§2.0.b), versión de Node, si el proxy deja pasar
  SSE, y cuánto disco hay para los 80 MB de archivos. Todo §2, §6 y §7 asume hoy
  MySQL 8 y SSE disponible: las dos cosas hay que confirmarlas antes de
  construir sobre ellas.

**La trampa de siempre:** `VITE_DEV_BYPASS_AUTH=1` (`AuthContext.jsx:11`) hay
que quitarlo antes de probar de verdad, o la app usa el usuario ficticio y las
pantallas salen vacías.
