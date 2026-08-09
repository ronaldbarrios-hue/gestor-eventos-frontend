# GESTEK · Lo que falta

Documento de trabajo. Tres partes:

1. **Lo que hay que hacer** — pedido por el equipo, en orden.
2. **Lo que propongo añadir** — no lo ha pedido nadie, pero creo que hace falta.
3. **Verificación de flujos** — qué está probado de verdad y qué no.

La numeración `#NN` es la del gestor de tareas de la sesión.

Regla que se mantiene: **el frontend se sube a producción de forma continua**;
lo que toque backend o base de datos se avisa antes.

---

## 1 · Lo que hay que hacer

### Bloque A — Editor de la página pública (prioridad declarada)

Sin esto, la promesa central de la plataforma (que cualquiera se monte la
página de su evento) no está entera.

- **#30 · Marca / White Label no conserva los cambios.** Diagnosticado, ver
  sección "Fallos con causa confirmada" más abajo. No es cosmético: es
  pérdida de datos silenciosa.
- **#31 · El panel de sección no scrollea solo.** Al abrir Portada hay que
  mover el scroll de la página principal para ver el resto de opciones.
- **#29 · Mover el botón de editar** abajo, junto a `+ Página`, y que ambos
  destaquen. Esa franja pasa a ser solo del editor.
- **#32 · iFrame: los tres modos de publicación.** Enlazar la web propia del
  organizador, incrustar iFrame, o llevar directo a la landing de GESTEK.
  Necesita migración (`eventos.modo_publico`, `url_externa`). Ampliar el
  catálogo con mapa, torneos con ganador y participantes, ranking y
  expositores. **Backend: avisar antes de tocar producción.**

### Bloque B — Landing

Después de esto la landing queda cerrada salvo videos e imágenes.

- **#33 · Producto por secciones.** Hoy es una lista plana. Que cada módulo
  tenga su sección (Eventos → asistentes ilimitados, wizard, presencial…) con
  hueco preparado para capturas reales.
- **#34 · Privacidad, cookies y términos** dentro del botón de configuración,
  que ya tiene idioma y tema.
- **#35 · Desde el login, entrar a términos te deja sin vuelta atrás.**
- **#36 · "Cambiar propósito" se pierde** en el registro, y la casilla del
  teléfono de "solo quiero asistir" va demasiado apretada.

### Bloque C — Gestbot y la lámpara

- **#41 · La lámpara, tercera vez.** En la foto de referencia hay un tirador
  corto colgando del brazo y el cordón **no** cruza la bombilla. Rehacer
  contra esa foto en vez de seguir parcheando.
- **#37 · Agrandar el widget de Inicio** y meter al bot dentro.
- **#38 · Quitar la caja "¿Necesitas ayuda? / Abrir Gestbot"** y poner al bot
  trabajando, que de vez en cuando saque un bocadillo con animación.
- **#39 · Avisos según el estado real del evento:** sin tipos de boleta, sin
  logo, sin dirección, solicitudes sin responder.
- **#40 · Dos pantallas:** la suya, que no muestra nada, y un monitor girado
  hacia el usuario con idioma y tema.

### Bloque D — Panel interno

- **#46 · Ajustes.** Organización dice "solo para administradores" y al
  administrador no le sale nada. El resto repite o no aporta. Auditar qué
  ajustes necesita de verdad la plataforma.
- **#45 · Vista Colaborador.** No dice en qué evento colaboro ni qué
  pendientes tengo. Es media aplicación vacía.
- **#47 · Vacantes.** El formulario ocupa media pantalla y deja el resto en
  blanco. Aprovechar el ancho y meter vista previa de la vacante publicada
  con la marca del organizador, editable desde ahí.
- **#44 · El menú de los tres puntos** de los widgets sale cortado en los
  widgets bajos: se recorta contra el alto en vez de flotar por encima.
- **#42 · El navbar del panel se pierde** con el fondo en modo oscuro.
- **#43 · El sidebar se queda demasiado negro** en modo claro.

### Bloque E — Módulos

- **#51 · Verificar los QR de punta a punta.** Ver sección 3.
- **#48 · Dinámicas: torneos por categorías anidadas.** Torneos → deportes /
  juegos de mesa / gaming → contacto, pesca, caminata… y de ahí a los torneos
  concretos, con tantos niveles como haga falta.
- **#50 · Emails: alias, plantillas y variables.** Que insertar una variable
  sea elegirla de una lista y no escribir `{{nombre}}` a mano. **Backend:**
  además hay que cerrar la cascada de email contra el SMTP de cPanel.
- **#49 · Buzón de sugerencias** para tipos de evento y de vacante. Es la
  forma barata de descubrir qué falta sin adivinar.
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

El arreglo tiene tres partes y ninguna vale sola: pasar `reload`, re-sincronizar
el estado cuando cambia el evento, y que los dos guardados escriban campos
separados en vez de pisarse el `page_json` entero.

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
| **Marca → guardar → se ve en público** | **Roto** | Causa confirmada arriba |
| Comprar o reservar boleta → email → QR | Sin probar | — |
| **Escanear QR → check-in → métricas** | Sin probar | `CheckinTab` llama a `clientesApi.checkin` y `reingreso`; existe el camino, no se ha ejecutado |
| **Vacante pública → candidato aplica** | **Roto en producción** | El backend nunca se desplegó en Render: sigue devolviendo 401 |
| Emails automáticos (recordatorios, recibos) | Sin cerrar | Falta atar la cascada al SMTP de cPanel |
| iFrame incrustado en una web externa | Sin construir | #32 |
| Cambio de idioma en toda la app | Verificado | Auditor: 297 usadas / 297 traducidas / 0 faltan |
| Modo claro y oscuro | Parcial | Contraste medido en los tokens; quedan #42 y #43 |
| Colaborador invitado → acepta → ve sus tareas | Sin probar | La vista está vacía (#45) |

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
