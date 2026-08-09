# Tutorial · cómo sacar el video de principio a fin

Cinco partes. Las tres primeras las haces tú y son las que deciden si el video
sale bien; la cuarta es pegar el prompt; la quinta es revisar.

Tiempo real: **unas dos horas**, y hora y media es montar el evento de mentira
y tomar las capturas. No hay atajo. Es literalmente lo que faltó la vez pasada.

---

## Parte 1 · Monta el evento de mentira (45 min)

Ahora mismo tu evento se llama `a` y su página `desc`. Eso en un video se ve
exactamente como lo que es. Antes de capturar nada, monta un evento que
parezca de verdad.

Usa estos datos, que ya están pensados para que llenen bien el encuadre:

**El evento**
```
Nombre      Convención Andina 2026
Fecha       15 de agosto de 2026
Ciudad      Bogotá
Lugar       Centro de Convenciones Ágora
Capacidad   2.400
Descripción Tres días de tecnología, negocio y diseño en el corazón de
            Bogotá. Cuarenta charlas, doce talleres y una feria con
            ochenta expositores.
```

**Tres tipos de boleta** (tres se ven mejor que dos: llenan la columna)
```
General        $ 180.000    1.800 cupos
Profesional    $ 340.000      500 cupos    incluye talleres
Estudiante     $  95.000      100 cupos    con carné vigente
```

**Sube una portada.** Cualquier foto de auditorio lleno, horizontal y oscura.
Sin portada, la mitad de las capturas se ven vacías.

**Mete asistentes.** Con veinte basta. Si es a mano y se hace largo, con diez.
Lo que importa es que los números del panel no digan cero: un panel en cero
comunica que nadie usa la plataforma.

**Ponle marca.** Logo y colores en Marca / White Label. **Ojo:** hoy esto no
guarda bien (es el fallo #30, ya diagnosticado). Si al volver se te borró, es
eso. Para el video basta con que se vea puesto en el momento de capturar.

---

## Parte 2 · Toma las ocho capturas (30 min)

**No uses Recortes de Windows.** Te mete la barra de tareas, el reloj y un
tamaño distinto en cada captura. Usa Chrome, que te da 1920×1080 exactos y
limpios:

1. Abre la aplicación en Chrome y **ponla en modo oscuro**.
2. `F12` para abrir las herramientas.
3. `Ctrl + Shift + M` para el modo dispositivo.
4. Arriba, donde dice *Dimensions*, elige **Responsive** y escribe
   **1920 × 1080**.
5. Menú `⋮` (arriba a la derecha del panel) → **Capture screenshot**.
6. La imagen cae en Descargas. Muévela a `kit-video/capturas/`.

Repite para las ocho. **Nómbralas con número delante**, así el orden se
respeta solo:

| Archivo | Qué tiene que salir | Truco |
|---|---|---|
| `1-wizard-datos.png` | Wizard paso 1 con "Convención Andina 2026" escrito | Que se vea el campo del nombre lleno |
| `2-wizard-boletas.png` | Wizard paso 2 con los tres tipos de boleta | Los tres visibles a la vez |
| `3-editor.png` | Editor de la página pública | Con la lista de secciones a la izquierda |
| `4-pagina-publica.png` | La página ya publicada | Con la portada y el botón de comprar |
| `5-boleta-qr.png` | La boleta con su QR | El QR bien nítido y grande |
| `6-checkin.png` | Pantalla de check-in escaneando | Mejor con una confirmación en verde |
| `7-panel-inicio.png` | Inicio con números que no sean cero | Por esto metiste los asistentes |
| `8-gestbot.png` | Gestbot respondiendo algo | Una respuesta larga se ve mejor que una corta |

**Antes de mover cada imagen, míralas.** Tapa o cambia lo que sea tuyo de
verdad: tu correo, tu nombre en la esquina, notificaciones. Ese video lo va a
ver gente.

---

## Parte 3 · Arma la carpeta (2 min)

Al terminar, `kit-video/` tiene que verse así:

```
kit-video/
  nudo-dibujandose.svg      ← ya está
  marca.svg                 ← ya está
  capturas/
    1-wizard-datos.png      ← lo pones tú
    2-wizard-boletas.png
    3-editor.png
    4-pagina-publica.png
    5-boleta-qr.png
    6-checkin.png
    7-panel-inicio.png
    8-gestbot.png
```

**Sube los ocho archivos a Claude Design junto con los dos SVG.** Los diez, en
la misma conversación, antes de pedir nada.

No le des el repositorio entero. Es lo que hizo que se colara el logo azul la
vez pasada.

---

## Parte 4 · Qué pegar en Claude Design

Sube primero los diez archivos. Después pega esto tal cual:

---

Haz un video de 60 segundos para GESTEK, una plataforma de gestión de eventos.
Sin voz: solo imagen, texto y música. Formato 1920×1080.

**MATERIALES — úsalos, no los sustituyas por nada dibujado por ti**

- Logo animándose: `nudo-dibujandose.svg`. Ya trae dentro la animación de
  dibujado. No la rehagas y no dibujes un logo alternativo bajo ningún
  concepto.
- Logo quieto: `marca.svg`.
- Pantallas de producto: **únicamente** las ocho imágenes de `capturas/`.
  Está prohibido dibujar interfaz. Si una escena necesita una pantalla que no
  está en la carpeta, cambia la escena; no inventes la pantalla.

**COLORES — exactos**

```
Latón claro  #F2D66B   ·  Latón  #E0B12B  ·  Latón oscuro  #8A6E19
Noche  #12100B  ·  Superficie  #1B1811  ·  Superficie 2  #252118
Texto  #F5F0E6  ·  Texto apagado  #ADA595
```

La noche es cálida: tiene más rojo que azul. Si el fondo tira a gris azulado,
está mal.

**TIPOGRAFÍAS** — Space Grotesk para titulares, Inter para el resto.

**RITMO — esto es lo que falló antes: iba todo demasiado suave**

- Cortes secos. Nada de fundidos cruzados entre escenas.
- El movimiento entra rápido y frena despacio: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Cada plano de producto es un zoom cerrado sobre un detalle, no la pantalla
  entera flotando. Se ve el campo, se ve el dato entrando, se ve el botón.
- El texto se escribe carácter a carácter donde haya un campo de formulario.
- Deja aire: medio segundo de negro con el logo pequeño entre bloque y bloque.
- Referencia: los videos de producto de Apple y de Anthropic. Plano cerrado,
  un dato por plano, sin adornos.

**ESCENAS**

**0–10 s · El nudo.** Negro. Entra `nudo-dibujandose.svg` y se dibuja solo.
Al cerrarse, un pulso de brillo. Debajo aparece **GESTEK** en Space Grotesk y,
más pequeño, *Personaliza, organiza y crece*. Nada más se mueve.

**10–22 s · Créalo.** Corte seco a `1-wizard-datos.png`, en zoom cerrado sobre
el campo del nombre; el nombre se escribe carácter a carácter. Corte a
`2-wizard-boletas.png`: zoom sobre los tipos de boleta, que entran uno debajo
de otro con medio segundo entre cada uno. La cámara retrocede y se ve el
wizard entero. Rótulo abajo: **Créalo**.

**22–34 s · Publícalo.** `3-editor.png`, zoom sobre la lista de secciones.
Corte a `4-pagina-publica.png`, que entra desde arriba como si se cargara.
Rótulo: **Publícalo**.

**34–44 s · Véndelo.** `5-boleta-qr.png`. Zoom cerrado sobre el QR hasta que
ocupa la pantalla. Rótulo: **Véndelo**.

**44–52 s · Contrólalo.** `6-checkin.png` con un destello verde de
confirmación. Corte a `7-panel-inicio.png`: los números cuentan hacia arriba
desde cero. Rótulo: **Contrólalo**.

**52–60 s · Cierre.** Negro. Las dos lazadas del nudo entran desde lados
opuestos, se cruzan y se traban. Tiran en direcciones contrarias tres veces y
no ceden. Aparece **Todo unido y controlado** y, debajo, el wordmark GESTEK.

**LOS CUATRO RÓTULOS** — Créalo · Publícalo · Véndelo · Contrólalo — aparecen
además como una línea fija abajo durante todo el video: se enciende en latón
el que toca y los otros quedan apagados.

---

## Parte 5 · Revisa lo que salga

Míralo con esta lista en la mano. Si falla algo, casi siempre es una de tres:

| Lo que ves | Qué pasó | Qué decirle |
|---|---|---|
| Pantallas que no son tu aplicación | Faltaba esa captura | "La escena X no usa ninguna imagen de `capturas/`. Cámbiala por una que sí, o quítala." |
| El logo no es el logo | Se le coló otro archivo | "Usa exclusivamente `nudo-dibujandose.svg` y `marca.svg`. No dibujes ningún logo." |
| Va suave, todo flota | Lo de siempre | "Cortes secos, sin fundidos. Cada plano es un zoom cerrado sobre un detalle." |
| Fondo grisáceo o azulado | Se salió de la paleta | "El fondo es `#12100B`. Es cálido: más rojo que azul." |
| Se lee mal el texto sobre las capturas | Falta velo | "Oscurece la captura al 40% detrás de cualquier rótulo." |

**La música va al final**, cuando la imagen ya te convenza. Algo instrumental,
sin letra, que suba hacia el segundo 52. Si la pones antes, vas a montar la
imagen para que le cuadre a la música, y eso siempre se nota.

**Exporta a MP4, 1920×1080, 30 fps.** Para redes, pídele además una versión
vertical 1080×1920, pero **después** de aprobar la horizontal: recortar a
vertical obliga a recomponer los planos y no conviene hacerlo dos veces.

---

## Lo que no puedo hacer yo

Las capturas. Y no es pereza: la herramienta de video no puede arrancar tu
aplicación ni entrar con tu cuenta, y yo no puedo tomar pantallazos de la
aplicación real desde aquí.

Es el único paso sin el cual el video vuelve a salir inventado, y es donde
está la hora y media. El resto ya está resuelto en esta carpeta.
