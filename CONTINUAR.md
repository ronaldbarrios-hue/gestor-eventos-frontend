# GESTEK · Cómo seguir — 29 de agosto de 2026

Para retomar en otra sesión sin releer la conversación. Sustituye a la versión
del 28 de agosto, que ya no describe el estado.

Complementa, sin repetirlos:

- `SUBIR.md` — cómo subir los commits que no se pudieron empujar
- `INDEPENDENCIA.md` — el plan de las 9 fases y en cuál va cada una
- `db/migraciones/NOTAS-ESQUEMA.md` (repo del **backend**) — el detalle técnico
  de la fase 6

---

## 0 · Lo primero, porque se pierde

**Hay 20 commits hechos y sin subir**, y el contenedor de esta sesión es
efímero:

| Repositorio | Rama | Commits |
|---|---|---|
| `gestor-eventos-backend` | `claude/gestek-storage-cleanup-auth-41d8d8-46jiml` | **9** |
| `gestor-eventos-frontend` | `claude/gestek-storage-cleanup-auth-41d8d8-46jiml` | **11** |

`git push` devuelve **403 en los dos repositorios**. No es un fallo del
trabajo: es un permiso de la integración de Claude con GitHub, y sólo lo
concede un admin de esa cuenta. La conexión MCP de GitHub que hay en esta
sesión es de **sólo lectura**.

Mientras tanto, el trabajo del backend viaja **dentro del repo del frontend**,
como parche: `parches/backend-identidad-propia.patch` (9 commits, 468 KB). El
procedimiento para aplicarlo y subirlo está en `SUBIR.md`, paso a paso.

> Si sólo se conserva un archivo de esta sesión, que sea el repo del frontend:
> lleva el backend dentro.

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
| 6 | **Las 71 tablas a MySQL** | 🚧 **aquí me quedé** |
| 7 | Permisos en el código (lo que sustituye a RLS) | 🚧 230 de 281 rutas sin declarar |
| 8 | Botón de registro incrustable (widget) | ✅ |

Lo que está «escrito, apagado» funciona y tiene pruebas, pero **no cambia el
comportamiento de nada** hasta que se encienda su interruptor (`AUTH_PROPIA`,
`ARCHIVOS_PROPIOS`). Subir el código es seguro.

**265 pruebas** en el backend, todas en verde. **7 pruebas** del widget en
Chromium, en verde.

---

## 2 · Dónde me quedé exactamente: la fase 6

Es el bloque grande que queda. Esta sesión hizo la **medición y el traductor**;
falta generar el archivo y mover los datos.

### Lo que ya está en el repo del backend

```
db/migraciones/
  generar-esquema-mysql.sql          ← el traductor. Se corre CONTRA POSTGRES
  003_esquema_indices_parciales.sql  ← los 8 índices que van a mano
  NOTAS-ESQUEMA.md                   ← cada decisión, con su porqué
```

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

### Lo que sigue en la fase 6, por orden

1. Correr el generador y guardar la salida como `db/migraciones/003_esquema.sql`.
2. Traducir a mano las 4 vistas (`perfiles_publicos`, `v_bolsa_evento`,
   `v_consumo_puntos_stand`, `v_participacion_sesiones`). **`perfiles_publicos`
   no puede quedarse fuera**: es la que cerró la lectura anónima.
3. El script de carga de datos: 829 campos, `timestamptz` a UTC, 8 arreglos a
   JSON.
4. Reescribir en código los 9 disparadores y las 7 funciones RPC.
5. Una prueba que compare fila a fila las dos bases **antes** del corte.

---

## 3 · La otra mitad abierta: la fase 7

El censo de rutas ya existe y la prueba lo sostiene (`test/permisos.test.js`).
Hoy: **281 rutas**, de las cuales 36 públicas, 13 de sesión, 2 con permiso
exigido y **230 sin declarar**.

El número 230 está anotado como tope en `core/permisos/inventario.json` y **sólo
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

## 5 · Lo que sólo puede hacer alguien con accesos

Por orden de urgencia:

| Qué | Qué hace falta | Cuánto |
|---|---|---|
| **Subir los 20 commits** | Una sesión local con permiso de escritura. `SUBIR.md` lo explica paso a paso | 15 min |
| **Correr el barrido de huérfanos** | `SUPABASE_SERVICE_KEY` en el entorno. Son 36 objetos, 28,1 MB, ya medidos y listados | 2 min |
| **Cerrar el correo entre cuentas** | Desplegar el frontend y **después** correr `db/migraciones/postgres/002_…`. En ese orden, o el chat se rompe | 10 min |
| **Mirar el egress** | Entrar al panel de Supabase. Es el dato que decide si hace falta plan Pro el mes del evento | 2 min |
| **Encender la identidad propia** | cPanel: base MySQL, variables, consola de Google. `CONFIGURAR.md` | 1 h |
| **Mover el backend de Render a cPanel** | Acceso a cPanel. Quita los 21 s de arranque en frío, que es la causa **medida** del congelamiento | 1 h |

Los dos primeros son los que corren prisa. El resto puede esperar, pero el
arranque en frío de Render es la causa medida de lo que se ve como
«congelamiento», así que cuanto antes se mueva, mejor.

---

## 6 · Una nota de honestidad sobre esta sesión

Para medir el largo real de las columnas de texto creé una tabla temporal en
producción (`public._medidas_texto`) y **la borré al terminar**. No quedó nada.
Todo lo demás que se hizo contra Supabase esta sesión fue de sólo lectura.

La única escritura en producción de todo el trabajo sigue siendo la migración
de la fase 3, del 28 de agosto, que cerró la lectura anónima de datos
personales — y ésa estaba pedida.
