# Cómo subir lo que quedó sin subir

Para pegar en una sesión local, o para hacerlo a mano. Todo lo que hay aquí es
**trabajo terminado y probado**; lo único que falta es un `git push` que desde
la sesión en la nube devuelve 403.

> **Nada de esto hay que rehacerlo.** Si la sesión local empieza a reescribir
> `modules/auth/` o `core/permisos/`, algo se entendió mal: el código ya existe
> y está en los parches.

---

## 0 · Lo que hay, en dos líneas

| Repositorio | Rama | Commits sin subir |
|---|---|---|
| `ronaldbarrios-hue/gestor-eventos-frontend` | `claude/gestek-storage-cleanup-auth-41d8d8-46jiml` | 7 |
| `ronaldbarrios-hue/gestor-eventos-backend` | `claude/gestek-storage-cleanup-auth-41d8d8-46jiml` | 6 |

Los dos parches vienen del chat:

- `gestek-backend-6-commits.patch`
- `gestek-frontend-7-commits.patch`

El del frontend **ya lleva dentro** una copia del otro (en `parches/`), así que
si sólo se conserva uno, que sea ése.

---

## 1 · El backend

```bash
git clone https://github.com/ronaldbarrios-hue/gestor-eventos-backend
cd gestor-eventos-backend
git checkout -b claude/gestek-storage-cleanup-auth-41d8d8-46jiml

git am < ~/Downloads/gestek-backend-6-commits.patch

npm install          # el parche añade bcryptjs y mysql2
npm test             # tienen que pasar 257
```

Si `npm test` no da 257, **parar y decirlo** en vez de arreglar por encima: el
parche se aplicó mal o la rama base se movió.

```bash
git push -u origin claude/gestek-storage-cleanup-auth-41d8d8-46jiml
```

## 2 · El frontend

```bash
git clone https://github.com/ronaldbarrios-hue/gestor-eventos-frontend
cd gestor-eventos-frontend
git checkout -b claude/gestek-storage-cleanup-auth-41d8d8-46jiml origin/claude/gestek-storage-cleanup-auth-41d8d8-46jiml

git am < ~/Downloads/gestek-frontend-7-commits.patch

npm install
npm run build        # tiene que construir sin errores
npm run lint

git push -u origin claude/gestek-storage-cleanup-auth-41d8d8-46jiml
```

La rama del frontend **ya existe en el remoto** con trabajo anterior; hay que
partir de ella (`origin/…`), no del `main`, o los commits de ayer se quedan
fuera.

## 3 · Si `git am` no aplica

Pasa si la rama base avanzó. En ese caso:

```bash
git am --abort
git apply --3way ~/Downloads/gestek-backend-6-commits.patch
# resolver los conflictos como siempre, y commitear a mano
```

Se pierden los mensajes de commit originales, que son largos a propósito
—explican por qué está hecho así—, así que conviene intentar primero el
`git am`.

## 4 · Lo que NO hay que tocar

- **La migración de Supabase ya está aplicada en producción**
  (`cerrar_lectura_anonima_de_datos_personales`, del 29 de agosto). No hay que
  volver a correrla ni deshacerla.
- **`AUTH_PROPIA` y `ARCHIVOS_PROPIOS` se quedan apagados.** Subir el código no
  cambia el comportamiento de nada: los dos módulos nuevos sólo se montan si su
  interruptor está encendido, y encenderlos es el procedimiento de
  `CONFIGURAR.md`, que pide cosas de cPanel.
- **No abrir un pull request** salvo que se pida. Las ramas se suben y ya.

---

## 5 · Qué lleva cada commit

### Backend (6)

1. **Identidad propia sobre MySQL.** `modules/auth/` entero —usuarios, Google,
   sesiones con rotación, recuperación, freno por cuenta—, `core/db` y
   `core/config`, la migración `001_identidad.sql`, el script que trae las 29
   cuentas conservando UUID y hashes, el que comprueba la base, y
   `CONFIGURAR.md`. El middleware verifica la firma en local y sólo cae a
   Supabase si el token no es nuestro: ahí desaparece una llamada de red por
   petición y las sesiones abiertas no se cortan.
2. **Almacén propio.** `modules/archivos/`: el navegador sube al backend en vez
   de a Supabase, se borra el archivo anterior, hay cuota por cuenta, el tipo se
   deduce de los primeros bytes y las hojas de vida salen del bucket público a
   enlaces firmados. Con la copia del Storage y el SQL de reescritura de las 13
   columnas.
3. **Permisos (andamiaje de la fase 7).** `core/permisos/` con `puede()`,
   `exige()` y `publica()`, y la prueba que pasa lista a las 279 rutas
   registradas y falla si aparece una nueva sin declarar. 32 declaradas, 247
   anotadas como tope que sólo puede bajar.
4. **Barrido de huérfanos.** El script y la lista medida de los 36 objetos
   (28,1 MB) que no referencia ninguna fila.
5. **La migración que cierra `profiles` del todo**, escrita y SIN aplicar: se
   corre cuando el frontend nuevo esté desplegado, no antes.
6. **Arranque en cPanel (fase 1.b).** `app.js` para Passenger, los dos ciclos
   sacados del proceso a los Trabajos de cron del panel, el `.cpanel.yml` que
   reinicia Passenger, y `DESPLIEGUE-CPANEL.md`.

### Frontend (7)

1. **Confirmar y restablecer** dejan de pasar por Supabase, detrás del mismo
   interruptor. Y `parches/`, con el código del backend guardado como parche.
2. **El candado** anota `eslint`, que estaba declarado y no dentro.
3. **La fase 5** se anota en el estado, y el parche pasa a llevar dos commits.
4. **La lectura anónima cerrada**, con lo que se encontró de más y lo que queda.
5. **Este documento.**
6. **El chat lee `perfiles_publicos`**, no la ficha entera. Es lo que permite
   dar el último paso del punto 4.
7. **El estado al día**, con la fase 1.b y el aviso de que §1.1 ya está cerrada.

---

## 6 · Lo que queda después de subir esto

Por orden, y con lo que hace falta para cada uno:

| Qué | Hace falta |
|---|---|
| Ejecutar el barrido de huérfanos | La `SUPABASE_SERVICE_KEY` en el entorno. Dos minutos |
| Cerrar el correo entre cuentas | Ya está la vista y el cambio del chat. Falta desplegar el frontend y **después** correr `db/migraciones/postgres/002_…` |
| Encender la identidad propia | cPanel: base MySQL, variables, consola de Google. `CONFIGURAR.md` |
| Mover el backend de Render a cPanel | Acceso a cPanel. El código y la guía están; falta hacerlo en el panel. Quita los 21 s de arranque en frío, que es la causa medida del congelamiento |
| Mirar el egress | Entrar al panel de Supabase. Es el dato que decide si hace falta plan Pro el mes del evento |
| Las 71 tablas y el resto de la fase 7 | Que lo de arriba esté corriendo |
