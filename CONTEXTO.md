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
| Correos intentados **en la historia del proyecto** | **0** |
| Eventos con términos propios escritos | **0** |
| Buzones propios / llaves de IA / conectores | 0 / 0 / 0 |

---

## 2 · El riesgo número uno

**No hay proveedor de correo configurado, y nunca ha salido un solo correo.**
No es que fallen: la tabla de envíos está vacía con 34 boletas emitidas.

Si los registros abren sin SMTP, la gente compra y **no recibe nada** — ni
boleta, ni QR, ni calendario. Todo lo construido esta sesión encamina correo y
queda esperando esa credencial.

Hace falta **una** de estas tres, en el `.env` del backend en Render:

| Opción | Variables |
|---|---|
| **cPanel SMTP** (la de producción) | `CPANEL_SMTP_USER`, `CPANEL_SMTP_PASS`, `CPANEL_SMTP_HOST`, `CPANEL_SMTP_PORT` |
| Gmail OAuth2 | `GMAIL_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` |
| Resend | `RESEND_API_KEY` |

En cuanto lleguen, comprobarlas sin desplegar y sin escribirle a nadie:

```bash
npm run probar:smtp                       # ¿sirven?
npm run probar:smtp -- --enviar tu@correo.com   # mándate una de verdad
```

Si falla por puerto, el script prueba el otro solo y dice cuál poner.

---

## 3 · Lo que falta poner en el servidor

| Variable | Para qué | Sin ella |
|---|---|---|
| `CPANEL_SMTP_*` | Todo el correo | Nada sale. **Bloquea la apertura de registros** |
| `SMTP_CRYPTO_KEY` | Cifrar buzones propios y llaves de IA | Las tablas existen, guardar devuelve un error claro |
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

1. **El SMTP.** Sección 2. Es lo único que bloquea funciones enteras.
2. **Escribir los términos de los eventos.** `evento_legal` está vacía en los
   16. Una vez que alguien se registra sin haberlos aceptado, **no hay forma de
   conseguir ese consentimiento hacia atrás** — y el formulario pide documento,
   teléfono y, con la ficha, etnia, discapacidad y condición de víctima.
3. **Retirar el puente de `page_json`.** Sigue vivo: dos copias del mismo dato
   y un trigger evitando que se separen. El paso que faltaba (desplegar el
   frontend) ya está hecho. Queda: abrir una página pública, guardar algo desde
   el editor, y entonces ejecutar el `drop` del final de la `0065`.
4. **Encender la cola** (`EMAIL_COLA_ACTIVA=1`). Sin ella, el pico del día de
   apertura puede bloquear la cuenta de cPanel y dejar sin correo a **toda** la
   venta, no sólo a ese pico.
5. **Decidir Supabase Pro** (~25 USD/mes). Quita la pausa por inactividad y el
   techo de cómputo el día del pico. Ver `MIGRACION-SUPABASE.md`.

### Antes del evento

6. **Probar el reparto de punta a punta**: imprimir un bloque y **escanear uno
   de esos QR en el check-in**. Diez minutos, y es lo único que confirma que la
   red de seguridad funciona.
7. **Prueba de carga del escaneo.** Es la única función que no puede fallar el
   día del evento.
8. **El recorrido completo** con un evento de prueba (está en `PENDIENTE.md`).
9. **`MP_WEBHOOK_SECRET`.** Hueco de seguridad abierto.

### Después del evento

10. **Salir de Supabase a un VPS.** Plan completo en `MIGRACION-SUPABASE.md`.
    Ojo: **la base son 20 MB** — los datos no son el problema, el egress sí.
11. **Envío desde el dominio del organizador** (DKIM por DNS). Necesita la
    misma máquina del punto 10. Ver `CORREO-Y-DOMINIOS.md`. Pregunta abierta y
    bloqueante: **¿el proveedor da puerto 25 saliente y PTR propio?**

---

## 6 · Lo que está construido y NADIE ha visto funcionar

Honestidad sobre el alcance de las pruebas: compila, las 104 pruebas del
backend pasan, y verifiqué los flujos de máquina contra producción. Pero
**ningún recorrido con una cuenta real se ha ejecutado**:

- El importador de asistentes no se ha corrido contra el endpoint real.
- La impresión de invitaciones no se ha visto salir de una impresora.
- El paso humano del OAuth (aprobar) necesita una sesión: no lo he hecho.
- El buzón propio no se ha probado con credenciales reales.
- No se ha enviado **ningún** correo, nunca.

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
