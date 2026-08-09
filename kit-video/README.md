# Kit del video · qué darle a Claude Design y qué pedirle

Este documento existe porque el primer intento salió con **dos círculos en vez
del logo** y con **pantallas de producto inventadas**. Ninguna de las dos cosas
se arregla con un prompt mejor. Las dos tienen causa concreta y están
verificadas en el repo.

---

## Por qué salieron círculos

El repositorio tenía **cuatro archivos de logo, y tres eran el placeholder azul
viejo**:

| Archivo | Qué contenía |
|---|---|
| `public/marca.svg` | El nudo real, en latón. **El bueno.** |
| `src/assets/logo-g.svg` | El nudo real. |
| `src/assets/logo-gestek.svg` | Logo azul viejo, y contenía literalmente `<circle>` |
| `public/icon-192·512·maskable.svg` | Cuadrado degradado azul-morado con una letra G |

Dándole el repositorio entero, Design encontraba el logo equivocado más veces
que el correcto, y uno de los equivocados era, literalmente, círculos.

**Ya está corregido:** los tres iconos se reescribieron con el nudo real en
latón sobre la noche, y los placeholders se borraron. De paso esto arregla un
fallo de producción que nadie había visto: **quien instalaba la aplicación se
llevaba el icono azul viejo.**

## Por qué el logo "no se formaba"

El nudo es una **silueta rellena**, no una línea. No se puede animar con
`stroke-dasharray`, que es lo que hace cualquier herramienta cuando le pides
que un logo se dibuje. Al no poder, sustituye por algo que sí puede trazar: un
círculo.

**Solución, ya construida:** `nudo-dibujandose.svg`, en esta carpeta. Anima una
máscara —dos líneas gruesas que recorren el camino de cada lazada— por encima
del trazado real. Lo que se ve dibujarse es siempre el logo de verdad, curva
por curva. Primero entra una lazada y a mitad de camino la segunda, la que pasa
por dentro, para que se lea como nudo y no como dos aros.

Lleva una red de seguridad: a los 4,4 s se enciende una capa que garantiza que
el fotograma final sea el logo completo, aunque la máscara se quede corta en
algún recodo. Un logo mordido es peor que no animar nada.

## Por qué las pantallas eran inventadas

**Porque no hay ni una captura del producto en el repositorio.** Design no
puede arrancar la aplicación ni entrar con tu cuenta: renderiza HTML, CSS y
JavaScript. Si le pides pantallas de producto y no se las das, se las dibuja.

Esto **no lo arregla ningún prompt**. Es lo único de la lista que tienes que
hacer tú.

---

## Lo que hay que entregarle

### 1. El logo

- `kit-video/nudo-dibujandose.svg` — para los primeros segundos.
- `public/marca.svg` — el nudo quieto, para el resto del video.

### 2. Los colores, tal cual están en la aplicación

```
Latón claro   #F2D66B     Noche          #12100B
Latón         #E0B12B     Superficie     #1B1811
Latón oscuro  #8A6E19     Superficie 2   #252118
Texto         #F5F0E6     Texto apagado  #ADA595
```

La noche es **cálida**: tiene más rojo que azul. Si el fondo tira a gris
azulado, está mal.

### 3. Las tipografías

Las mismas de la aplicación: **Space Grotesk** para titulares, **Inter** para
texto. Las dos están en Google Fonts.

### 4. Las capturas · esto lo tienes que hacer tú

Ocho capturas, a 1920×1080, en modo oscuro, con datos que parezcan de verdad
(nada de "evento a" ni "desc"). Guárdalas en `kit-video/capturas/`.

| # | Qué capturar | Para qué |
|---|---|---|
| 1 | El wizard, paso 1, con el nombre ya escrito | Créalo |
| 2 | El wizard, paso 2, con tipos de boleta puestos | Créalo |
| 3 | El editor de la página pública, con secciones a la izquierda | Publícalo |
| 4 | La página pública ya publicada, con su portada | Publícalo |
| 5 | La boleta con el QR | Véndelo |
| 6 | Check-in escaneando | Contrólalo |
| 7 | El panel de Inicio con números reales | Contrólalo |
| 8 | Gestbot respondiendo | El cierre |

Consejo: **monta un evento de mentira pero completo** antes de capturar.
Un evento con portada, tres tipos de boleta y veinte asistentes se ve como un
producto; el que hay ahora, no.

---

## El prompt

Copia desde aquí.

---

Haz un video de 60 segundos para GESTEK, una plataforma de gestión de eventos.
Sin voz. Solo imagen, texto y música. Formato 1920×1080.

**Materiales. Úsalos, no los sustituyas por nada dibujado por ti.**

- Logo animándose: `nudo-dibujandose.svg`. Ya trae la animación de dibujado.
  No la rehagas y no dibujes un logo alternativo.
- Logo quieto: `marca.svg`.
- Pantallas de producto: **solo** las imágenes de `capturas/`. Está
  terminantemente prohibido dibujar interfaz. Si una escena necesita una
  pantalla que no está en la carpeta, cambia la escena, no inventes la
  pantalla.
- Colores y tipografías: los de arriba, exactos.

**Ritmo. Esto es lo que falló la vez pasada: iba todo demasiado suave.**

- Cortes secos. Nada de fundidos cruzados entre escenas.
- El movimiento entra rápido y frena despacio: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Cada plano de producto es un **zoom cerrado sobre un detalle**, no la
  pantalla entera flotando. Se ve el campo, se ve el dato entrando, se ve el
  botón pulsándose.
- El texto se escribe carácter a carácter donde haya un campo de formulario.
- Deja aire. Entre bloque y bloque, medio segundo de negro con el logo
  pequeño. El silencio es parte del ritmo.
- Referencia de estilo: los videos de producto de Apple y de Anthropic. Plano
  cerrado, un dato por plano, sin adornos.

**Escenas**

**0 a 10 s · El nudo.** Negro. Entra `nudo-dibujandose.svg` y se dibuja solo.
Cuando cierra, un pulso de brillo. Debajo aparece **GESTEK** en Space Grotesk,
y bajo el nombre, en pequeño: *Personaliza, organiza y crece*. Nada más se
mueve en toda la escena.

**10 a 22 s · Créalo.** Corte seco a la captura 1, en zoom cerrado sobre el
campo del nombre. El nombre se escribe carácter a carácter. Corte a la captura
2: zoom sobre los tipos de boleta, que entran uno debajo del otro con medio
segundo entre cada uno. La cámara retrocede y se ve el wizard entero. Rótulo
abajo: **Créalo**.

**22 a 34 s · Publícalo.** Captura 3: el editor. Zoom sobre la lista de
secciones. Corte a la captura 4: la página publicada, entrando desde arriba
como si se cargara. Rótulo: **Publícalo**.

**34 a 44 s · Véndelo.** Captura 5: la boleta. Zoom cerrado sobre el QR hasta
que ocupa la pantalla. Rótulo: **Véndelo**.

**44 a 52 s · Contrólalo.** Captura 6: el escaneo, con un destello verde de
confirmación. Corte a la captura 7: los números del panel, contando hacia
arriba desde cero. Rótulo: **Contrólalo**.

**52 a 60 s · Cierre.** Negro. Las dos lazadas del nudo entran desde los lados
opuestos, se cruzan y se traban. Tiran en direcciones contrarias tres veces y
no ceden. Aparece: **Todo unido y controlado**. Debajo, el wordmark GESTEK.

**Los cuatro rótulos** —Créalo, Publícalo, Véndelo, Contrólalo— aparecen
también como una línea fija en la parte baja durante todo el video, donde se
va encendiendo en latón el que toca y los otros quedan apagados.

---

## Si aun así sale mal

Casi siempre es una de estas tres:

1. **Dibujó interfaz.** Faltaba una captura. Míralo: la escena que se inventó
   es la que no tenía imagen.
2. **El logo no es el logo.** Se le coló otro archivo. Dale solo los dos SVG
   de esta carpeta, no el repositorio entero.
3. **Va suave.** Insiste en cortes secos y planos cerrados. "Suave" es el
   estado por defecto de cualquier herramienta de animación; hay que pedir lo
   contrario de forma explícita.
