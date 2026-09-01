# GESTEK · Lo que falta

Documento de trabajo. Tres partes:

1. **Lo que hay que hacer** — pedido por el equipo, en orden.
2. **Lo que propongo añadir** — no lo ha pedido nadie, pero creo que hace falta.
3. **Verificación de flujos** — qué está probado de verdad y qué no.

La numeración `#NN` es la del gestor de tareas de la sesión.

Regla que se mantiene: **el frontend se sube a producción de forma continua**;
lo que toque backend o base de datos se avisa antes.

---

> ## ⚠️ Estado del despliegue
>
> | Pieza | Estado |
> |---|---|
> | Migraciones 0060–0068 | ✅ aplicadas |
> | Migración 0069 (constancia legal) | ⏸️ escrita, **sin aplicar** |
> | Backend (Render) | ✅ auto-deploy desde `main` |
> | Frontend (Vercel) | ✅ auto-deploy desde `main` |
>
> **Los dos repos despliegan solos al hacer push a `main`.** No hay que lanzar
> nada a mano.
>
> **Corrección (13 de agosto).** Aquí decía que Vercel *no* auto-desplegaba y
> que había que lanzarlo desde su panel. Ya no es cierto y hacer caso de esa
> línea cuesta tiempo. Comprobado por contenido, que es lo único concluyente:
> el chunk que sirve producción trae `Reparto sin correo` e `Importar Excel` y
> ya no trae `Importar CSV`, minutos después del push.
>
> Y de paso, cómo NO comprobarlo: comparar el hash del bundle local contra el de
> producción **no vale**. El `dist/` que uno construye en su máquina y el que
> construye Vercel no tienen por qué coincidir bit a bit, así que un hash
> distinto no prueba que falte el despliegue. Hay que buscar texto que sólo
> exista en el código nuevo.
>
> ### El puente, y por qué hay que retirarlo
>
> La 0064 sacó `branding`, `pages` y `navbar` de `page_json` dando por hecho
> que el código nuevo estaba arriba. No lo estaba —el backend de Render **sí
> está desplegado**, contra lo que decía `POR-HACER.md`— y sin el `conSitio`
> que devuelve esas claves al JSON, las páginas públicas de los 31 eventos
> salieron vacías unos minutos.
>
> Las migraciones 0065–0067 son el puente: devuelven las copias al JSON y un
> trigger mantiene las dos versiones iguales **escriba quien escriba**, en los
> dos sentidos. Con eso, backend viejo o nuevo y frontend viejo o nuevo son
> cuatro combinaciones seguras.
>
> **Para cerrarlo, en este orden:**
>
> 1. ~~Desplegar el frontend.~~ **Hecho** — despliega solo, ver arriba.
> 2. Comprobar una página pública y un guardado desde el editor.
> 3. Sólo entonces retirar el puente con el `drop` del final de la `0065`.
>    Hasta ese paso hay dos copias del mismo dato a propósito, y el trigger es
>    lo único que evita que se separen.
>
> Es decir: **el puente ya se puede retirar en cuanto se haga el paso 2**, que
> es abrir una página pública y guardar algo desde el editor. Era lo único que
> lo bloqueaba.
>
> Y una gratis: **`0007_event_roles.sql` ya no miente.** Siembra los roles en
> español, los mismos valores que dejan la 0054 y la 0056. Reconstruir desde
> cero da por fin el mismo resultado que la base de hoy. **No se aplicó a
> producción a propósito:** aquí corre la versión de la 0056, con diez roles;
> reaplicar el 0007 la sustituiría por la de seis y sería un retroceso.

---

> ## 🏠 Infraestructura propia (nuevo, 13 de agosto)
>
> Pedido: **base de datos y servicios nuestros**, en nuestro panel, porque al
> evento entran ~7.000 personas y el plan gratis se cae. Plan completo en
> **[MIGRACION-SUPABASE.md](MIGRACION-SUPABASE.md)**. Lo medido, en corto:
>
> - **El plan gratis está confirmado**, pero **no se va a caer por los datos**:
>   la base son **20 MB** de 500, y hay **28 usuarios** y **24 MB** de archivos.
>   Lo que se toca primero es el **egress**, porque las imágenes de las páginas
>   públicas salen de Supabase Storage y los tres buckets son públicos.
> - **«En cPanel» no se sostiene para el motor si el cPanel es compartido**: no
>   hay PostgreSQL con `pg_cron`/`pg_net`, ni forma de correr GoTrue, PostgREST
>   o Realtime. Para el frontend estático y el SMTP sí sirve — ya sirve. Hace
>   falta un VPS con root, y hay una comprobación de diez minutos que lo decide.
> - **No hay que reescribir las 773 llamadas `.from(`.** Levantando las mismas
>   piezas (Postgres + PostgREST + GoTrue + Storage) `supabase-js` sigue igual y
>   sólo cambian la URL y las llaves. La migración mueve el servidor, no
>   reescribe la aplicación.
> - **Recomendación:** hacer ya las tres etapas que no dependen de la máquina
>   (borrar el cron muerto, JWT local, imágenes fuera de Storage), pagar los
>   ~25 USD de Pro el mes del evento, y migrar el motor **después**. Migrar la
>   semana del evento es hoy el mayor riesgo del proyecto.

---

## 1 · Lo que hay que hacer

### Bloque A — Editor de la página pública (prioridad declarada)

Sin esto, la promesa central de la plataforma (que cualquiera se monte la
página de su evento) no está entera.

- ~~**#30 · Marca / White Label no conserva los cambios.**~~ **Hecho.** Un
  solo guardado: la marca vive en el estado del editor y se escribe con todo
  lo demás. Ver "Fallos con causa confirmada" más abajo.
- ~~**#31 · El panel de sección no scrollea solo.**~~ **Hecho.** Era el único
  panel con `block` y dos alturas máximas encajadas; ahora usa la misma
  columna flex que los cajones de Marca y Navbar, que sí funcionaban.
- ~~**#29 · Mover el botón de editar** junto a `+ Página`.~~ **Hecho.** Los dos
  van juntos, destacados y separados de las pestañas por una línea.
- ~~**#32 · iFrame: los tres modos de publicación.**~~ **Hecho.** Migración
  0060 (`eventos.modo_publico`, `url_externa`), pestaña **Publicación** en el
  espacio de trabajo y cajón en el editor. La página pública respeta el modo:
  en «mi propia web» sale fuera con una pantalla que dice a dónde va, y
  `?gestek=1` deja ver la landing de respaldo (lo usan el editor y la vista
  previa de Marca). `?standalone=1` nunca rebota, o comprar desde un embed no
  terminaría nunca. Catálogo ampliado a ocho secciones: espacio, llaves,
  **torneos con campeón y participantes**, **ranking de expositores**,
  directorio, mapa del evento, cómo llegar y boletas.

### Bloque B — Landing

Después de esto la landing queda cerrada salvo videos e imágenes.

- ~~**#33 · Producto por secciones.**~~ **Hecho.** Doce secciones con su visual.
- ~~**#34 · Privacidad, cookies y términos**~~ **Hecho.**
- ~~**#35 · Desde el login, entrar a términos te deja sin vuelta atrás.**~~ **Hecho.**
- ~~**#36 · "Cambiar propósito" se pierde**~~ **Hecho.**

### Bloque C — Gestbot y la lámpara

- ~~**#41 · La lámpara, tercera vez.**~~ **Hecho.**
- ~~**#37 · Agrandar el widget de Inicio** y meter al bot dentro.~~ **Hecho.**
  El bot ya estaba dentro; el widget pasa de `md` a `lg` y caben cuatro avisos
  sin partir frases. Ojo: sólo cambia el DEFAULT — quien ya tenga un layout
  guardado en su navegador no verá nada hasta darle a «Restablecer».
- ~~**#38 · Quitar la caja "¿Necesitas ayuda?"**~~ **Hecho.**
- ~~**#39 · Avisos según el estado real del evento.**~~ **Hecho.** Faltaban dos
  de los cuatro que se pidieron: **sin logo** (mira la marca del evento y la
  del organizador; sin ninguna, la página sale con el logo de GESTEK) y
  **solicitudes sin responder**. En el Inicio se añade el aviso de eventos
  **publicados a medias**, que es peor que un borrador porque ese sí se ve.
- ~~**#40 · Dos pantallas.**~~ **Hecho.** El portátil del bot se ve ahora POR
  DETRÁS —tapa, marca y nada más: si él lo mira, nosotros estamos al otro
  lado— y al lado hay un monitor girado al usuario con idioma y tema, que son
  controles de verdad (`MonitorGestbot.jsx`).

### Bloque D — Panel interno

- ~~**#46 · Ajustes.**~~ **Hecho.** Eran dos fallos encadenados: la puerta
  pedía `hasPermiso('usuarios:ver')` o el rol `admin_global`, y **ninguna
  cuenta real los tiene** —toda cuenta nace como `organizador`—, así que el
  dueño veía el mismo cartel que un invitado; y al otro lado sólo había dos
  tarjetas diciendo que los roles globales no existen. Se quita la puerta
  (no hay roles de organización: son por evento) y se pone lo que sí existe:
  **quién trabaja contigo**, componiendo los equipos de tus eventos con su
  rol y su enlace, y la identidad de la cuenta.
- ~~**#45 · Vista Colaborador.**~~ **Hecho.** La causa: `EspacioData` fusionaba
  las dos listas de eventos con `if (!mapa.has(id))` y los propios iban
  primero, así que la fila que traía `mi_rol` **nunca entraba** y el rol se
  perdía siempre. Además las tareas se cortaban a seis eventos por el orden de
  llegada, dejando fuera justo los de colaboración. Ahora se combinan los dos
  objetos, los eventos donde colaboras van primero en la cola, la lista es
  «lo que me toca a mí» de verdad, cada evento dice tu papel y cuántas tareas
  tienes ahí, y se añade lo que pediste y sigue sin respuesta.
- ~~**#47 · Vacantes.**~~ **Hecho.** La mitad vacía es ahora la vista previa de
  la vacante con la marca del organizador, y el título y la descripción se
  escriben desde ahí (mismo estado que el formulario).
- ~~**#44 · El menú de los tres puntos.**~~ **Hecho.** No era z-index: iba
  `absolute` dentro de una tarjeta con `overflow-hidden`, y nada que viva ahí
  dentro puede salir. Va por portal al body, colocado desde el botón, y se
  voltea hacia arriba si no cabe debajo.
- ~~**#42 · El navbar del panel se pierde en oscuro.**~~ **Hecho.** Iba en
  `surface` (#1B1811) sobre `bg` (#12100B): nueve puntos y un filo al 7%.
  Token propio `topbar` (#2B261B, 25 puntos) y filo al 18%.
- ~~**#43 · El sidebar demasiado negro en claro.**~~ **Hecho.** Era el mismo
  #12100B en los dos modos. En la noche está bien —es el fondo de la casa—;
  sobre papel era un tablón. Sube tres escalones sólo en claro (#241F16),
  sigue siendo noche cálida y el texto conserva 11:1.

### Bloque E — Módulos

- **#51 · Verificar los QR de punta a punta.** Ver sección 3. *(Sin hacer: es
  un recorrido con cuenta real, no código.)*
- ~~**#48 · Torneos por categorías anidadas.**~~ **Hecho.** Migración 0062:
  `torneo_categorias` con `padre_id` a sí misma (profundidad libre, tope de
  seis por sentido, no por técnica) y `torneos.categoria_id`. Borrar una rama
  se lleva sus hijas pero **ningún torneo**: quedan sin clasificar. Editor de
  árbol en el panel, con árbol sugerido de un clic, y navegación por rama en
  el panel y en público — elegir «deportes» incluye lo que cuelga de él.
- **#50 · Emails: alias, plantillas y variables.** *(Sin hacer.)* La cascada
  contra el SMTP de cPanel sigue bloqueada por credenciales.

  **Corrección (13 de agosto):** los recordatorios no estaban sólo esperando el
  SMTP. El job `send-reminders-hourly` de `pg_cron` lleva **1.949 ejecuciones y
  1.949 fallos** —medido en `cron.job_run_details`— porque su comando nunca se
  rellenó: sigue apuntando a `https://<TU_PROJECT_REF>.supabase.co` con
  `Bearer <TU_ANON_KEY>`. **No ha enviado un recordatorio en su vida.** El
  reemplazo ya existe (`node-cron` en `lib/recordatorios.js:10`), así que el job
  y la Edge Function se borran sin romper nada. Ver
  [MIGRACION-SUPABASE.md](MIGRACION-SUPABASE.md) §2.
- ~~**#49 · Buzón de sugerencias.**~~ **Hecho.** Migración 0063. Va pegado al
  selector que se queda corto —la categoría al crear el evento, el rol al
  publicar una vacante— y no en una pantalla de contacto: preguntado tres
  pantallas después, ya nadie recuerda qué buscaba.
- **#10 · Vacantes: integraciones externas** (KYC, Calendar, pagos), a la
  espera de credenciales.

---

## Fallos con causa confirmada

Leídos en el código, no supuestos.

### Marca / White Label se sobrescribe a sí misma

Hay **dos botones distintos que escriben el mismo campo** `page_json`, y cada
uno parte de su propia copia vieja del evento:

```
ExperienceBuilder.jsx:180   page_json: { ...evento.page_json, pages, navbar }
WhiteLabelSection.jsx:69    page_json: { ...evento.page_json, branding: b }
```

Además, el editor monta el panel **sin pasarle `reload`**:

```
ExperienceBuilder.jsx:500   <WhiteLabelSection evento={evento} />
WhiteLabelSection.jsx:36    function WhiteLabelSection({ evento, reload })
```

Consecuencia en cadena:

1. Guardas la marca. Se escribe bien en el servidor.
2. `reload?.()` no hace nada, porque nunca llegó. El editor sigue con el
   evento viejo en memoria.
3. Pulsas "Guardar cambios" del editor. Escribe `{...eventoViejo.page_json,
   pages, navbar}`, **sin** `branding`. La marca recién guardada desaparece.

Y por eso la vista previa muestra azul y morado: son los valores por defecto
de `WhiteLabelSection.jsx:77-79` (`#3B82F6`, `#8B5CF6`, `#070C18`), justo los
que se ven en el panel. El panel está enseñando los defaults, no la marca.

**Arreglado así:** en vez de coordinar dos guardados, se quitó uno. La marca
pasa a vivir en el estado del editor, junto a las páginas y el navbar, y se
escribe con ellas en una sola llamada. El panel funciona ahora de dos maneras:
suelto —con su botón, como se usa desde el espacio de trabajo— o controlado,
que informa hacia arriba y no guarda nada por su cuenta. Dentro del editor va
controlado, así que ya no hay un segundo botón que pueda pisar al primero.

**Y arreglado de raíz (migración 0064).** Lo de arriba quitaba el segundo
botón; esto quita la posibilidad. La marca, las páginas y el navbar salen de
`page_json` a columnas propias: ya no comparten campo, así que no pueden
pisarse ni queriendo. Además el `PATCH` deja de REEMPLAZAR `page_json` y pasa
a **mezclar por claves de primer nivel**, que es lo que protege a las otras
trece pantallas que siguen guardando con `{...evento.page_json, loMío}`.

Dos detalles que costaron decidir y conviene no deshacer:

- Las tres claves **se quitan** de `page_json` al migrar. Mientras haya dos
  copias hay que elegir cuál gana, y la regla tentadora —«si la columna está
  vacía, usa la del JSON»— **resucita la marca borrada**: la quitas a
  propósito y la copia legada te la devuelve.
- Si llega un `page_json` con `branding` dentro, **se descarta, no se
  asciende** a la columna. Ascender reconstruiría el fallo original con trece
  culpables en vez de dos: cada pantalla reenvía su fotografía del JSON, y la
  suya puede ser de hace media hora. No guardar se ve y se reintenta; borrar
  sin avisar no se ve hasta que alguien abre la página pública.

La compatibilidad la da la API: al LEER vuelve a meter las tres dentro de
`page_json`, así que quien siga leyendo `page_json.branding` no se entera.

Y de paso, la vista previa no mentía: **estaba pintando unos defaults que ya
no existen.** El preset llamado "GESTEK" y los colores por defecto del panel
eran el azul y el morado de la marca vieja (`#3B82F6`, `#8B5CF6`, `#070C18`).
Cambiados a latón y noche.

**Falta comprobarlo con una cuenta de verdad:** poner colores, guardar, salir
del evento y volver a entrar. Es el paso 3 del recorrido de abajo.

---

## 2 · Lo que propongo añadir

No lo ha pedido nadie. Va por orden de lo que más dolor evita.

1. **Autoguardado y borrador en el editor.** El fallo de Marca es un aviso: el
   editor guarda todo o nada, a mano, sobre un campo compartido. Un borrador
   local que sobreviva al cierre de pestaña evita perder media tarde.

2. **Salud del evento antes de publicar.** Una lista de comprobación real:
   tiene portada, tiene tipos de boleta, tiene dirección, tiene contacto.
   Alimenta directamente los avisos del bot (#39) y evita eventos publicados
   a medias, que es lo que peor se ve de cara al asistente.

3. **Duplicar evento.** Quien organiza el mismo evento cada mes hoy lo monta
   entero otra vez. Es de las cosas que más rápido se notan.

4. **Exportar asistentes.** CSV o Excel. Es la primera pregunta de cualquiera
   que venga de otra herramienta, y hoy no hay respuesta.

5. **Modo prueba de la boletería.** Comprar sin cobrar, para que el
   organizador vea el correo, el QR y el check-in antes de abrir la venta.
   Hoy la única forma de probarlo es cobrarse a uno mismo.

6. **Registro de actividad por evento.** Quién cambió qué y cuándo. En cuanto
   hay equipo, "yo no fui" aparece solo.

7. **Papelera.** Borrar un evento es definitivo. Treinta días de gracia cuesta
   poco y evita el desastre.

8. **Que la búsqueda global busque.** Está en la barra superior de todo el
   panel; conviene comprobar qué hace hoy antes de seguir prometiéndola.

9. **Errores con salida.** Cuando algo falla, decir qué pasó y qué hacer, en
   vez de dejar la pantalla en blanco.

10. **Documentación de la API pública, límite de peticiones y panel de
    tokens.** Hoy la API se anuncia y no tiene ni docs ni límite; la pestaña
    "Seguridad" es un hueco.

---

## 3 · Verificación de flujos

**Ninguno de estos flujos se ha probado entero.** La tabla dice qué sabemos
hoy y de dónde lo sabemos. Lo que pone "sin probar" significa exactamente eso:
puede funcionar, pero nadie lo ha visto funcionar de principio a fin.

| Flujo | Estado | Qué sabemos |
|---|---|---|
| Registro → confirmación por email → panel | Sin probar | — |
| Crear evento (wizard 4 pasos) → publicar | Parcial | Se ve un evento publicado en el panel |
| Editar landing → guardar → se ve en público | Sin probar | — |
| **Marca → guardar → se ve en público** | Arreglado, sin comprobar | Causa confirmada y corregida arriba; falta el recorrido con cuenta real |
| Comprar o reservar boleta → email → QR | Sin probar | — |
| **Escanear QR → check-in → métricas** | Sin probar | `CheckinTab` llama a `clientesApi.checkin` y `reingreso`; existe el camino, no se ha ejecutado |
| **Vacante pública → candidato aplica** | **No estaba roto** | El 401 es intencionado: `POST /vacantes/:id/postular` usa `req.user.id` y exige perfil de talento. No se puede postular sin cuenta **por diseño**. Queda una decisión de producto —¿se quiere postulación anónima?—, no un fallo que arreglar |
| Emails automáticos (recibos) | **Funcionando** | El correo de boleta sale y queda registrado con `ok`. Ver CONTEXTO.md §2: no faltaba proveedor, había un TypeError que se tragaba un catch vacío |
| Recordatorios automáticos | **Retirados a propósito** | Decisión del 14/08: los hace Google Calendar. El cron quedó desactivado |
| iFrame incrustado en una web externa | Construido, sin probar fuera | #32 hecho: ocho secciones y los tres modos. Falta pegarlo en una web real |
| **Cupo liberado → correo → el siguiente compra** | Construido, sin probar | Todo el ciclo existe (0061). **No se puede ver funcionar sin proveedor de correo** |
| **Apuntarse a un sub-evento desde fuera** | Construido, sin probar | La pantalla que faltaba ya está; el endpoint llevaba tiempo sin usar |
| Cambio de idioma en toda la app | Verificado | Auditor: 302 usadas / 302 traducidas / 0 faltan |
| Modo claro y oscuro | Parcial | Contraste medido en los tokens; #42 y #43 corregidos, sin ver en pantalla real |
| Colaborador invitado → acepta → ve sus tareas | Sin probar | La vista ya no está vacía (#45), pero hace falta una segunda cuenta |

### Cómo propongo probarlos

Un evento de prueba real, recorrido entero y de una sentada, apuntando dónde
se rompe. En este orden, porque cada paso depende del anterior:

1. Cuenta nueva → confirmar correo → entrar.
2. Crear evento con el wizard, con portada y dirección.
3. Marca: poner colores y logo. Guardar. **Salir y volver a entrar.**
4. Editar la landing, guardar, abrir la página pública en otra pestaña.
5. Crear tipos de boleta. Reservar una desde la página pública, sin sesión.
6. Comprobar que llega el correo y que trae QR.
7. Escanear ese QR en Check-in. Escanearlo otra vez para el check-out.
8. Mirar si las métricas se movieron.
9. Publicar una vacante. Aplicar desde otra cuenta.
10. Invitar a un colaborador. Aceptar desde su cuenta. Ver si tiene tareas.

El paso 3 va a fallar hoy. Es el que arreglamos primero.

---

## 4 · Pedido del 1 de septiembre — registro embebido y modal

Cuatro cosas, tras probar el embed en `festech.co`. Van juntas porque tocan los
mismos archivos: `public/widget.js`, `src/pages/public/EventoPublicoPage.jsx`
(el checkout y `ModalShell`), `src/pages/events/workspace/PublicacionSection.jsx`
(la config), `src/lib/enlacesPublicos.js`.

### 4.1 · Enlace de «volver a verlo» configurable por la empresa — HECHO

Campo **«Enlace para volver a ver la boleta»** en *Proceso de compra →
Confirmación post-compra* (`checkout.enlace_boleta`, sin migración). Vacío → la
página `/mi-ticket` de GESTEK, como antes. Con URL propia → la confirmación lleva
ahí (pestaña nueva); `{codigo}` en la URL se reemplaza por el código de la
boleta. Festech quería que llevara a su web.

El botón «Continuar →» sigue siendo `checkout.redirect_url` (ya existía) — son
dos cosas distintas: uno es «vuelve a ver tu boleta», el otro es «sigue en
nuestra web ahora».

### 4.2 · La página pública detecta si la persona ya está registrada

- Que la landing pública del evento reconozca a quien **ya tiene boleta** (por
  código guardado en `localStorage`, o pidiendo el código/correo) y le ofrezca,
  en vez de un registro nuevo: **ver su boleta otra vez** y **apuntarse a
  sub-eventos**.
- Hoy esto sólo pasa dentro del modal de confirmación, justo después de comprar;
  quien vuelve al día siguiente no tiene camino.

### 4.3 · Sub-eventos como paso final del registro — HECHO

`ConfirmacionModal` ahora tiene dos vistas (`vista` = `'boleta' | 'subeventos'`).
En la de boleta, si hay sub-eventos sin apuntar: una tarjeta-botón «Falta un
paso · Ver →» y un botón primario **«Ver sub-eventos»** (el «Listo» pasa a
secundario). La vista de sub-eventos es la lista completa: los que no piden
datos (`!s.pide_datos`) se apuntan con un toque (`apuntarDirecto`, usa el código
de la boleta); los que sí abren `InscripcionSesionModal`. La redirección
automática (`redirect_auto`) se pausa mientras se está en esa vista.

Decisión de diseño: «lista destacada, uno por uno» (no un formulario gigante con
todo apilado — inviable si varios sub-eventos tienen preguntas propias).

Y tras enviar el formulario de un sub-evento (`InscripcionSesionModal`), la
pantalla de «quedaste inscrito» ofrece **«Ver más actividades»** (vuelve a la
lista) o **«Terminar registro»** (cierra todo). Sólo cuando se abre desde la
confirmación — prop opcional `onTerminar`; desde la agenda pública sigue con un
solo botón.

### 4.4 · Ancho y alto del modal, editables

- `ModalShell` (`EventoPublicoPage.jsx:1234`) ya acepta un parámetro `ancho`
  (`sm:max-w-md` por defecto) y tiene `max-h-[90vh] overflow-y-auto`.
- Pedido: exponer **ancho y alto** en `PublicacionSection.jsx` para que la
  empresa los ajuste. Al exportar/incrustar se ve estrecho, con mucho scroll y
  poco margen.

### 4.5 · Otra forma de incrustar, que no parezca software externo

- Hoy el registro se incrusta por **iframe** (`public/widget.js` + iframe sobre
  la web del cliente). Se ve rígido y «de fuera».
- Pedido: que se integre y **parezca propio** de la página que lo usa. Opciones a
  evaluar: Web Component / custom element que herede tipografía y colores del
  sitio anfitrión; SDK JS que monte el formulario inline en un `<div>` del
  cliente; o, como mínimo, iframe con auto-resize (sin scroll interno) y tema
  heredado por parámetros.
- Aviso que no se pierde: **el pago no puede ir dentro del iframe** (las
  pasarelas redirigen a su dominio y 3-D Secure no corre embebido). El
  *formulario* sí; el pago abre pestaña.

**Prioridad sugerida:** 4.1 y 4.4 son rápidas y desbloquean la demo de Festech.
4.3 es media. 4.2 y 4.5 son las grandes.

### 4.6 · PijaoTech: sub-evento con `formulario_modo = 'propio'` y CERO preguntas

Medido en producción el 1 de septiembre: la sesión **PijaoTech** de `festech2026`
(`c9d4f527-bbb1-4755-967d-d75fc7df3377`) tiene `requiere_inscripcion = true`,
`formulario_modo = 'propio'`, cupo 20, **1 inscrito ya** — y **0 filas** en
`event_form_fields` con ese `session_id`.

Probable causa: el organizador intentó guardar las preguntas propias de PijaoTech
mientras el bug de `visible_si` (§ arreglado el 1-sep) hacía fallar
`PUT /eventos/:id/sesiones/:sesionId/formulario` — el `formulario_modo` quedó en
`'propio'` pero las preguntas no se guardaron.

`POR-HACER.md §3.6` dice que un `propio` sin preguntas **debería volver solo a
`ninguno`** («un formulario vacío en la agenda pública es peor que un botón»).
Comprobar que esa regla existe y funciona; si no, implementarla. Y avisar al
organizador de que puede volver a añadir las preguntas ahora que guardar
funciona.

---

## 5 · Mapa del evento — versión completa (pedido 1 sep)

Hoy el mapa es una imagen con zonas marcadas y control de aforo por zona
(`ticket_movimientos.zona_id`, `zona_cortes`, migraciones 0079/0080 «aforo por
zonas» / «sesiones en zona»). Lo que se pide:

- **Guardar y editar horarios por zona.** Cada zona tiene su propia agenda de
  actividades y sus franjas.
- **Al hacer clic en una zona en el mapa**, abrir un panel con TODO lo de esa
  zona: actividades vinculadas (`agenda_sessions.zona_id`), sus horarios, y el
  **aforo en vivo** de la zona (dentro / capacidad).
- En el panel: aprovechar que `agenda_sessions` ya tiene `zona_id` (migración
  0080) y que el aforo por zona ya existe (`aforo_zonas`, `aforo_zonas_resumen`
  en el backend).
- **La zona llena "se prende en fuego":** cuando el aforo de una zona está al
  100% (o casi), el círculo/marca de esa zona en el mapa muestra un efecto de
  llamas — la señal visual de "aquí está la tendencia, esto está petado". Grados:
  normal → caliente (>80%) → en fuego (100%). Se alimenta del mismo
  `aforo_zonas_resumen` en vivo.

Infra que ya existe (mapear antes de empezar):
`src/pages/events/workspace/MapaSection.jsx` (editor del mapa),
`src/components/aforo/MapaAforo.jsx`, `AccesosSection.jsx` (define las zonas),
`agenda_sessions.zona_id`, `modules/aforo/` + `aforo_zonas_resumen`.
Ver `db/migrations/0079_aforo_por_zonas.sql` y `0080_sesiones_en_zona.sql`.
El grueso es frontend: el editor de horarios por zona y el panel de detalle.

**Es su propia sesión** — demasiado para hacerlo bien al final de otra.

---

## 6 · Peticiones de Supabase Realtime — reducido (1 sep)

**Hecho:**
- `useAsistenciaEnVivo` pasó de WebSocket permanente a sondeo (`useSondeo`, se
  para con la pestaña oculta). Latido de Realtime 25 s → 50 s en
  `src/lib/supabase.js`.
- `ChatTab` (`ChannelView`): el socket de Realtime sólo se abre mientras la
  pestaña se ve; al volver, reconecta y recarga los mensajes por si llegó
  alguno. Una pestaña de fondo con el chat abierto pasa a coste cero.

Con esto no queda Realtime de Supabase corriendo en segundo plano. El chat es el
único que sigue en tiempo real cuando la pestaña está activa — que es lo
correcto. Pasarlo a SSE contra Express (MIGRACION-SUPABASE.md §6 etapa 5) es para
cuando se corte Supabase, no urge.
