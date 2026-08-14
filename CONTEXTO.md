# GESTEK · Dónde estamos y qué sigue

Documento de traspaso. Escrito el 14 de agosto de 2026, al final de una sesión
larga. Sirve para retomar el trabajo sin releer nada más.

Todo lo que dice «medido» o «verificado» se comprobó contra producción o contra
la base de datos, no leyendo el código. Lo que no, va marcado.

---

## 0 · El reloj, que es lo que ordena todo lo demás

| | |
|---|---|
| **Hoy** | 14 de agosto de 2026 |
| **Abren los registros** | La semana del 17 de agosto |
| **El evento** | Mediados de septiembre (~15) |
| **Asistentes esperados** | ~7.000 |

Quedan unas **cuatro semanas de venta** y unos **32 días** para el evento. Ese
reparto es lo que hace que el correo sea tratable: 7.000 correos en cuatro
semanas son ~250/día, muy por debajo de cualquier tope. Lo que no cabe son los
picos — la apertura de registros y el recordatorio masivo.

---

## 1 · El terreno

**Dos repos, los dos con auto-despliegue desde `main`:**

| Repo | Dónde vive | Producción |
|---|---|---|
| `gestor-eventos-frontend` | React + Vite | Vercel → https://gestekeventost.dpdns.org |
| `gestor-eventos-backend` | Express | Render → https://gestor-eventos-backend-yx75.onrender.com |

La base es **Supabase** (`yopontbwgdybfsniqawz`, **plan free**), Postgres 17.

> **Un push a `main` despliega.** `PENDIENTE.md` decía lo contrario sobre el
> frontend; era falso y ya está corregido. Comprobado viendo el corte en vivo.

**Estado de los datos, medido hoy:**

| | |
|---|---|
| Eventos vivos | 16 |
| Boletas emitidas | 34 |
| Campos de formulario | 20 |
| Eventos con términos propios escritos | **0** |
| Buzones propios / llaves de IA | 0 / 0 |
| Conector de Claude | 1, funcionando |

---

## 2 · El riesgo número uno

> **Corregido el 14 de agosto por la tarde.** Este documento decía que no había
> proveedor de correo configurado. Era falso: **Resend está puesto en Render
> desde hace tiempo.** El diagnóstico correcto es peor y mejor a la vez.

Durante toda la vida del proyecto, el correo automático **no fallaba: se
evaporaba**. Cero filas en la tabla de envíos con 34 boletas emitidas, y ningún
error en ningún sitio.

La causa, encontrada probando el recorrido completo desde el conector, era una
línea en `lib/emailPlantillas.js`:

```js
if (evento && 'page_json' in evento) return conSitio(evento);
```

El contrato de `enviarEmailEvento` dice que `evento` puede ser sólo el id, y
**nueve** puntos de envío pasan el id pelado —la boleta pagada, los pagos, los
recordatorios, las tareas, el equipo, la cola…—. Pero `'page_json' in "un-uuid"`
lanza `TypeError`: el operador `in` exige un objeto. Y una cadena no vacía es
truthy, así que pasaba el guardia y reventaba ahí.

Lo que lo volvió invisible: esa función se llamaba **fuera** del `try`, así que
el error se escapaba de `enviarEmailEvento` entera, y todos los que la llaman
usan `.catch(() => {})` para que un correo fallido no tumbe una compra. El
`TypeError` caía en ese catch vacío. Ni excepción, ni log, ni registro — el
registro está *después* del punto donde reventaba.

**Ya está arreglado, y comprobado en producción**: el primer envío de la
historia del proyecto quedó registrado. Falló, pero por un motivo real y
visible: `Resend 422`. Ahora el motivo se guarda entero, con lo que dijo Resend
y qué hacer.

### Lo que queda por resolver del correo

El primer 422 se leyó como «el dominio del remitente no está verificado». **No
era eso**: en cuanto el motivo empezó a guardarse entero, Resend dijo qué
pasaba de verdad —

> Invalid `to` field. Please use our testing email address instead of domains
> like `example.com`.

Era la dirección de prueba, no la configuración. O sea que **el correo puede
estar bien ya**, y no hay forma de saberlo sin mandar uno a una bandeja real.

**Lo único que falta comprobar del correo es eso: un envío a una dirección de
verdad.** Emitir una cortesía a un correo propio y mirar:

```sql
select destinatario, ok, motivo from evento_email_envios order by created_at desc limit 5;
```

Si sale `ok = true` y llega, el correo está resuelto. Si vuelve un 422 hablando
del dominio, entonces sí toca verificarlo en
[resend.com/domains](https://resend.com/domains).

Esto es un recordatorio de por qué el motivo hay que guardarlo entero: dos
diagnósticos opuestos —«hay que tocar DNS» y «no hay nada que tocar»— cabían
igual de bien en «Resend 422».

---

## 3 · Lo que falta poner en el servidor

| Variable | Para qué | Sin ella |
|---|---|---|
| `RESEND_API_KEY` | El correo | **Ya está puesta.** Lo que falta es verificar el dominio en Resend |
| `SMTP_CRYPTO_KEY` | Cifrar buzones propios y llaves de IA | Las tablas existen, guardar devuelve un error que ahora dice por qué |
| `EMAIL_COLA_ACTIVA=1` | Encender la cola con freno | Envío directo, sin protección ante picos |
| `EMAIL_MAX_POR_HORA` | Ritmo de la cola | Por defecto 150/h |
| `ANTHROPIC_API_KEY` | Gestbot con la cuenta de la plataforma | Sin ella, cada organizador usa la suya (que es lo que queremos) |
| `MP_WEBHOOK_SECRET` | Firma de webhooks de Mercado Pago | **Hueco de seguridad**: cualquiera con la URL marca una boleta como pagada |

La llave de cifrado se genera así, y **se guarda también en un gestor de
contraseñas** — si se pierde, todos los secretos cifrados dejan de poder
descifrarse:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`FRONTEND_URL` **ya está puesta** (verificado: el redirect de OAuth apunta al
dominio correcto).

---

## 4 · Qué se construyó en esta sesión

Todo está en `main` de los dos repos, desplegado y con las migraciones
aplicadas. **104 pruebas del backend en verde.**

### Formularios — estaban rotos y nadie lo sabía

El servidor tenía 11 tipos de campo, validación por tipo y tres fichas
prearmadas (incluida la de caracterización, de 22 preguntas), y los servía en
cada respuesta. **El panel no leía nada de eso**: mantenía su propia lista de
seis. Consecuencias que estaban vivas:

- Selección múltiple, párrafo, correo, teléfono y documento **no se podían
  elegir**, así que la validación por tipo no se disparaba nunca.
- Las fichas **no tenían botón en ninguna pantalla**.
- El editor de sub-eventos mandaba `select` y `textarea`, que no existen — el
  servidor los rechazaba. Guardar una pregunta «Elegir una» fallaba siempre.
- Había **tres copias** del renderizador público, ya divergidas.

Ahora hay un catálogo (el del servidor) y un renderizador
(`components/ui/CampoFormulario.jsx`).

### Excel — tres caminos de carga

`src/lib/hojaCalculo.js` lee `.xlsx` y CSV **sin dependencias**
(`DecompressionStream` + `DOMParser`), con 28 pruebas contra un archivo real.
Se evitó SheetJS a propósito: su versión de npm arrastra dos CVE y va justo por
donde entran los datos de los asistentes.

Se usa en: la batería de preguntas, las opciones de un campo, y **la carga de
inscritos en masa** con mapeo de columnas. El endpoint se rehizo: acepta 5.000
por envío, inserta por lotes, y **el correo pasó a ser opcional** — porque la
gente a la que hay que entregarle la boleta en mano es justo la que no lo tiene.

### La red de seguridad del correo

- **Reparto sin correo** (pestaña de asistentes): imprime invitaciones con el
  QR firmado, arma un enlace de WhatsApp por persona, y exporta la lista.
- **Calendario `.ics`** con alarmas a 1 día y 1 hora, adjunto en la boleta. Es
  lo que traslada el recordatorio al teléfono y **evita el envío masivo**, que
  es el único que no cabe (7.000 de golpe son 35 h al tope de cPanel).
- **Cola con freno por hora** (migración 0070), apagada por defecto.
- **Buzón propio por evento**: el correo sale de la cuenta del organizador.
- **Verificación real del SMTP**: antes el diagnóstico sólo miraba si las
  variables existían.

### Claude

- **Conector de llave**: cada organizador pone su cuenta de Anthropic y paga su
  consumo. Antes lo pagaba la plataforma por todos.
- **Servidor MCP** con las 70 herramientas de `lib/agente.js` (mismo ejecutor,
  no un catálogo aparte).
- **OAuth 2.1** completo, para que se pueda añadir como conector en claude.ai
  pegando sólo una URL.
- **Pantalla de permiso** en `/conectar/autorizar`.

### Migraciones aplicadas

| | Qué |
|---|---|
| 0069 | Constancia de aceptación de términos |
| 0070 | Cola de correo |
| 0071 | Buzón SMTP por evento |
| 0072 | Conexiones del organizador (llave de IA) |
| 0073 | OAuth para conectores |

---

## 5 · Lo que sigue, en orden

### Esta semana, antes de que abran los registros

1. **Verificar el dominio en Resend.** Sección 2. Es lo único que separa a la
   plataforma de mandar correo de verdad, y el código ya está arreglado.
2. **Escribir los términos de los eventos.** `evento_legal` está vacía en los
   16. Una vez que alguien se registra sin haberlos aceptado, **no hay forma de
   conseguir ese consentimiento hacia atrás** — y el formulario pide documento,
   teléfono y, con la ficha, etnia, discapacidad y condición de víctima.
3. ~~**Decidir qué hacer con `send-reminders-hourly`.**~~ **Decidido y hecho el
   14 de agosto: los recordatorios los hace Google Calendar, no la
   plataforma.** El cron quedó **desactivado** (`active = false`, no borrado)
   tras 1.980 ejecuciones fallidas sin haber enviado nunca nada — nunca se
   configuró, quedó la plantilla literal con `<TU_PROJECT_REF>` sin rellenar.

   Consecuencia de la decisión: **el `.ics` de la boleta deja de ser un extra y
   pasa a ser el único recordatorio que recibe el asistente.** Si el correo de
   la boleta no llega, no hay segunda oportunidad.
4. **Retirar el puente de `page_json`.** Sigue vivo: dos copias del mismo dato
   y un trigger evitando que se separen. El paso que faltaba (desplegar el
   frontend) ya está hecho. Queda: abrir una página pública, guardar algo desde
   el editor, y entonces ejecutar el `drop` del final de la `0065`.
5. **Encender la cola** (`EMAIL_COLA_ACTIVA=1`). Sin ella, el pico del día de
   apertura sale de golpe contra el tope del proveedor.
6. **Decidir Supabase Pro** (~25 USD/mes). Quita la pausa por inactividad y el
   techo de cómputo el día del pico. Ver `MIGRACION-SUPABASE.md`.

### Antes del evento

7. **Probar el reparto de punta a punta**: imprimir un bloque y **escanear uno
   de esos QR en el check-in**. Diez minutos, y es lo único que confirma que la
   red de seguridad funciona.
8. **Prueba de carga del escaneo.** Es la única función que no puede fallar el
   día del evento.
9. **`MP_WEBHOOK_SECRET`.** Hueco de seguridad abierto.

### Después del evento

10. **Salir de Supabase a un VPS.** Plan completo en `MIGRACION-SUPABASE.md`.
    Ojo: **la base son 20 MB** — los datos no son el problema, el egress sí.
11. **Envío desde el dominio del organizador** (DKIM por DNS). Necesita la
    misma máquina del punto 10. Ver `CORREO-Y-DOMINIOS.md`. Pregunta abierta y
    bloqueante: **¿el proveedor da puerto 25 saliente y PTR propio?**

---

## 6 · Qué se ha visto funcionar, y qué no

### Probado contra producción, de punta a punta (14 de agosto)

Recorrido completo de un evento, desde el conector de Claude:

| Paso | Resultado |
|---|---|
| Crear evento, boletas, ponente, agenda, descuento | Bien, con la zona horaria correcta |
| Publicar | Bien |
| Página pública (API y web) | 200, con las dos boletas y la agenda |
| Emitir cortesía | Bien |
| Página de la boleta con QR firmado | 200, token de 253 caracteres |
| Check-in | Bien |
| **Check-in otra vez con la misma boleta** | **Rechazado**, y dice a qué hora entró |
| Check-in con código inventado | Rechazado |
| Aislamiento del conector | Sólo ve los eventos de su dueño, no los 16 |

El evento de prueba se borró después.

### El correo, resuelto

Con el TypeError arreglado, una cortesía a una dirección real quedó registrada
con **`ok = true`**: Resend la aceptó. Es el primer correo que sale del
proyecto. Lo que Resend acepta no es lo mismo que lo que llega a la bandeja
—queda mirar carpeta de correo no deseado—, pero la cadena entera funciona.

### Construido pero sin recorrido humano

- El importador no se ha corrido contra el endpoint real con un Excel de verdad.
- La impresión de invitaciones no se ha visto salir de una impresora.
- El buzón propio no se ha probado con credenciales reales.

### Un detalle pendiente, menor

Los recordatorios sueltos salen con tipo `personalizado`, que **no lleva el
`.ics` adjunto** (`CON_CALENDARIO` no lo incluye). Los recordatorios
automáticos sí. Añadirlo es una línea, pero afectaría también a las campañas
libres del panel, donde un calendario no siempre pinta. Decisión pendiente.

---

## 7 · Cosas que la próxima ventana debe saber

**Montaje de routers.** Un `router.use(auth)` en un router montado en `'/'`
autentica **toda** petición que pasa por él, no sólo las que casan con sus
rutas. Puesto antes del bloque público, deja la web entera en 401. Pasó al
añadir el MCP y se cazó antes de producción. Hay una prueba
(`test/montaje.test.js`) que lo vigila **por posición** — hay siete routers
heredados con el mismo patrón que no rompen porque van detrás de lo público.

**Cómo comprobar un despliegue.** Comparar el hash del bundle local contra el
de producción **no vale**: no tienen por qué coincidir. Hay que buscar texto
que sólo exista en el código nuevo:

```bash
curl -s https://gestekeventost.dpdns.org/ | grep -oE 'assets/index-[^"]+\.js'
# y buscar una cadena nueva dentro del chunk
```

**Base de datos.** Lo que toque migraciones se avisa antes de aplicar. Y una
migración que salga por delante del código ya costó un incidente (31 páginas
públicas vacías unos minutos).

**Una prueba que pasa no siempre protege.** Al arreglar el TypeError del correo
se escribió una prueba que comprobaba «no lanza». Pasaba con el fallo puesto:
el `try` que se había añadido en el mismo arreglo atrapaba el error y devolvía
un objeto igual. La prueba medía el segundo arreglo, no el primero. La forma de
saberlo es **volver a meter el fallo a propósito y exigir que la prueba falle**
— y hacerlo antes de creerse la prueba, no después.

**`git checkout --` para deshacer un experimento borra todo lo no commiteado
de ese archivo.** Al probar lo anterior se perdieron los dos arreglos, y la
comprobación de que seguían ahí dio un falso positivo porque el `grep` casó con
otra línea parecida. Si se va a experimentar sobre un archivo con cambios sin
guardar, se hace copia primero, y se verifica con el texto exacto.

**Estilo de la casa.** Comentarios en español que explican **por qué**, no qué.
Los mensajes de commit cuentan el problema y la decisión, no la lista de
archivos. Merece la pena mantenerlo: buena parte de lo que se arregló esta
sesión se encontró leyendo comentarios que explicaban una decisión vieja.

**Documentos vivos:**

| Archivo | Qué contiene |
|---|---|
| `PENDIENTE.md` | Estado del despliegue y las tareas pedidas por el equipo |
| `MIGRACION-SUPABASE.md` | Plan para salir de Supabase, con lo medido |
| `CORREO-Y-DOMINIOS.md` | Cómo enviar mucho correo y desde el dominio propio |
| `CONTEXTO.md` | Este archivo |
| `../gestor-eventos-backend/DESPLIEGUE.md` | Credenciales y qué se rompe sin cada una |

---

## 8 · Para conectar Claude ahora mismo

No necesita `SMTP_CRYPTO_KEY`. En **Claude → Configuración → Conectores →
Añadir conector personalizado**:

```
https://gestor-eventos-backend-yx75.onrender.com/mcp
```

Claude descubre el OAuth solo, se registra, trae al organizador a la pantalla
de permiso, y vuelve conectado. Verificado en producción salvo el paso de
aprobar.

Para Claude Code o Claude Desktop, que no usan ese conector, hay un token en
*Ajustes → Integraciones → «Conectar desde Claude Code o Claude Desktop»*.
