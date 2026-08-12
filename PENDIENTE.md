# GESTEK · Lo que falta

Documento de trabajo. Tres partes:

1. **Lo que hay que hacer** — pedido por el equipo, en orden.
2. **Lo que propongo añadir** — no lo ha pedido nadie, pero creo que hace falta.
3. **Verificación de flujos** — qué está probado de verdad y qué no.

La numeración `#NN` es la del gestor de tareas de la sesión.

Regla que se mantiene: **el frontend se sube a producción de forma continua**;
lo que toque backend o base de datos se avisa antes.

---

> ## ⚠️ Hay cinco migraciones sin aplicar
>
> Esta ronda cerró casi todo lo pendiente, y buena parte necesita base de
> datos. **Nada de lo nuevo funciona hasta aplicarlas, en este orden:**
>
> | | Qué desbloquea |
> |---|---|
> | `0060_evento_modo_publico` | #32 · los tres modos de publicación |
> | `0061_waitlist_oferta_con_caducidad` | La lista de espera de verdad |
> | `0062_torneo_categorias_anidadas` | #48 · categorías de torneos |
> | `0063_buzon_sugerencias_catalogo` | #49 · el buzón |
> | `0064_sacar_marca_paginas_navbar_de_page_json` | La deuda de `page_json` |
>
> El código aguanta sin ellas sin reventar —las consultas que fallan caen a
> lista vacía y el resto sigue—, pero **la 0064 es la excepción que importa**:
> hasta que se aplique, el editor guarda la marca en una columna que no existe
> y el guardado falla entero. Frontend y backend de esta ronda van juntos.
>
> Y una gratis: **`0007_event_roles.sql` ya no miente.** Siembra los roles en
> español, los mismos valores que dejan la 0054 y la 0056. Reconstruir desde
> cero da por fin el mismo resultado que la base de hoy.

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
| **Vacante pública → candidato aplica** | **Roto en producción** | El backend nunca se desplegó en Render: sigue devolviendo 401 |
| Emails automáticos (recordatorios, recibos) | Sin cerrar | Falta atar la cascada al SMTP de cPanel |
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
