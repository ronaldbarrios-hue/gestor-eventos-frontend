# Parches que esperan permiso de escritura

Aquí vive código **del backend** guardado dentro del repositorio del frontend.
No es un sitio bonito para ponerlo. Es el único que sobrevive.

## Por qué

La app de Claude tiene permiso de escritura sobre
`ronaldbarrios-hue/gestor-eventos-frontend`, pero **no** sobre
`ronaldbarrios-hue/gestor-eventos-backend`: cualquier `push` al segundo
contesta 403. Y una sesión corre en un contenedor que se recicla, así que lo
que no se sube se pierde — ya pasó una vez, con este mismo trabajo.

Guardar el parche aquí lo pone a salvo con un `push` que sí funciona.

## Cómo se aplica

En un clon del backend, con la rama al día:

```bash
cd gestor-eventos-backend
git checkout -b auth-propia
git am < ../gestor-eventos-frontend/parches/backend-identidad-propia.patch
npm install          # el parche añade bcryptjs y mysql2
npm test             # tienen que pasar 199
```

`git am` conserva el mensaje y la autoría del commit original. Si algo no
aplica porque `main` avanzó, `git apply --3way` deja los conflictos marcados
como los de siempre.

## Cómo se deja de necesitar esto

Un administrador de la organización instala la app de GitHub sobre el
repositorio del backend —<https://github.com/apps/claude/installations/select_target>—
y a partir de la **sesión siguiente** el `push` funciona directamente.
Reconectar a mitad de una sesión no basta: las credenciales se toman al
arrancar. Comprobado.

Cuando eso pase: aplicar los parches, subirlos, y borrar esta carpeta.

---

## Lo que hay

| Archivo | Qué es | Del día |
|---|---|---|
| `backend-identidad-propia.patch` | **Seis commits.** Fase 4 (`modules/auth/`, `core/`, migración MySQL), fase 5 (`modules/archivos/`, copia del Storage y reescritura de URLs), el andamiaje de la fase 7 (`core/permisos/` y el censo de las 279 rutas), el barrido de huérfanos, la migración que cierra `profiles` del todo y la fase 1.b (arranque en cPanel y crons fuera del proceso). 116 pruebas nuevas, 257 en la suite. Con `CONFIGURAR.md` | 29 de agosto |

`git am` los aplica los seis en orden. Si sólo interesa uno, `git am` para y
se puede seguir con `git am --skip`.
