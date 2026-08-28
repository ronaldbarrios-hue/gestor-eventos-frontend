# GESTEK · Cómo seguir — 28 de agosto de 2026

Para retomar en otra sesión sin releer la conversación. Complementa a
`TRASPASO.md` (25 de agosto) y a `SUPABASE.md` (hoy); no los repite.

---

## 0 · Lo primero, porque se pierde

**Hay un commit hecho y sin subir: `44107c8`, «Supabase medido hoy».** Contiene
`SUPABASE.md`, que es todo el trabajo de esta sesión.

No se pudo empujar. GitHub responde **403** a la app de Claude sobre
`ronaldbarrios-hue/gestor-eventos-frontend` — la lectura funciona, la escritura
no. Se intentó por git y por la API; el mismo resultado. **Esto no es un fallo
del trabajo, es un permiso de la integración**, y sólo lo concede un admin de esa
cuenta de GitHub en https://github.com/apps/claude/installations/select_target.

El contenedor de la sesión es efímero: **si nadie guarda el archivo, el commit
desaparece con él.** Tres formas de rescatarlo, cualquiera sirve:

1. Subir `SUPABASE.md` por la web de GitHub (*Add file → Upload files*), con la
   sesión del navegador, que sí escribe.
2. Aplicar el parche `0001-supabase-doc.patch` en un clon local:
   `git am 0001-supabase-doc.patch && git push -u origin claude/traspaso-handoff-doc-ivr7go`
3. Que un admin instale la app, y en **una sesión nueva** el push sale directo
   (las credenciales se emiten al arrancar; reconectar a mitad no las refresca).

Si al intentar (1) o (2) GitHub también rechaza **con tu cuenta personal**,
entonces el problema ya no es la app: es que la cuenta perdió escritura sobre el
repo, y eso lo devuelve Ronald.

---

## 1 · Coordenadas

| | |
|---|---|
| Proyecto Supabase | `GestorEventosMarcaBlanca` · ref `yopontbwgdybfsniqawz` |
| Postgres | 17.6.1.121 · región `us-east-2` · plan **free** |
| Repos | `ronaldbarrios-hue/gestor-eventos-{frontend,backend}` |
| Rama de trabajo | `claude/traspaso-handoff-doc-ivr7go` |
| Documentos vigentes | `TRASPASO.md` · `SUPABASE.md` · `MIGRACION-SUPABASE.md` (plan, números caducos) |

El MCP de Supabase funciona sin problema en la sesión: lectura, SQL y linter.
Es lo que permitió medir todo esto. **El de GitHub sólo lee.**

---

## 2 · Qué se hizo esta sesión

Una sola cosa: **revisar Supabase de punta a punta y escribir `SUPABASE.md`**,
con el estado medido hoy, cómo se almacenan las fotos y el arranque concreto de
la migración. Nada de código. **Nada tocado en Supabase**: ni una política, ni
un borrado, ni el job de cron. Todo lo que sigue son hallazgos, no arreglos.

---

## 3 · Lo que hay que saber sin abrir nada más

**El almacenamiento es el problema, no la base.** La base son 22 MB contra un
techo de 500. Los archivos van así:

| | 13 ago | 25 ago | 28 ago |
|---|---|---|---|
| Total | 24 MB · 73 obj. | 62 MB · 103 obj. | **80 MB · 107 obj.** |

**+17 MB en tres días.** La causa está medida: **40 objetos, 28 MB, no los
referencia ninguna fila.** Sólo `DocumentosSection` borra el archivo al quitar el
registro; los otros cuatro uploaders dejan la foto anterior cada vez que alguien
cambia la suya. No es que se suba más — es que no se borra nunca.

**Las fotos se guardan como URL absoluta dentro de la fila.** Buscado en las 71
tablas: **13 columnas, 9 tablas, 57 filas**. Cinco de esas columnas son JSON
(`gallery`, `page_json`, `paginas`, `branding`, `tickets.respuestas`), así que un
`replace` sobre texto no las alcanza. La tabla completa y la forma que sí
funciona están en `SUPABASE.md` §3.3 y §6.4.

**Cuatro problemas del almacenamiento, ninguno arreglado** (`SUPABASE.md` §3.4):

- 40 huérfanos, 28 MB.
- **Subida anónima abierta**: la política de `form-uploads` es literalmente
  `bucket_id = 'form-uploads'` para el rol `public`. Con la llave anónima del
  bundle, cualquiera escribe en el bucket, y no hay política de DELETE para
  limpiar lo que metan.
- **Hojas de vida en bucket público.** No se pueden *listar*, pero cada archivo
  se *lee* por su URL. Son datos personales.
- **La subida de CV no puede funcionar**: el código manda PDF/DOCX de 8 MB a un
  bucket que sólo admite jpeg/png/webp de 4 MB. Cero PDFs en `form-uploads` lo
  confirma. Nunca se cargó un CV.

**Corrección al plan de auth de `TRASPASO.md`.** Dice que los hashes bcrypt son
portables y nadie tendría que restablecer contraseña. Eso vale para **10 de los
29 usuarios**; los otros 19 entran **por Google** (22 identidades OAuth). Los
hashes se migran solos, pero el OAuth hay que reconectarlo con el mismo
`client_id`, o esos usuarios quedan fuera con sus filas intactas.

**Peso muerto** (`SUPABASE.md` §5): el job `send-reminders-hourly` ya está
desactivado (1.981 de 1.981 fallos) pero no borrado; la Edge Function
`send-reminders` **nunca se desplegó**, sólo está en el repo; y sí hay una
desplegada y activa, `quick-processor`, que es el «Hello World» de ejemplo de
Supabase del 18 de mayo, sin referencias en ningún repo.

---

## 4 · Por dónde seguir

En este orden. Los tres primeros no dependen de decidir nada.

1. **Mirar el egress** en Organization → Usage del panel de Supabase. Es el
   único dato que falta para saber si la migración corre o espera, y **no se
   puede leer desde una sesión** — hay que entrar al panel. Sin él, todo lo que
   se diga sobre el techo del plan gratis es aritmética de servilleta.
2. **Cerrar la subida anónima a `form-uploads` y sacar los CV del bucket
   público.** Son datos personales expuestos hoy y no dependen de migrar nada.
3. **Barrer los 40 huérfanos y el peso muerto** del §5. Media hora, riesgo cero,
   y deja el inventario limpio antes de que alguien copie archivos.
4. **Verificación local del token** (`TRASPASO.md` §3.1). Sigue siendo correcta
   y sigue siendo pequeña: quince líneas en `middleware/auth.js`, con
   `jsonwebtoken` ya instalado. Va después de las tres de arriba sólo porque
   esas son más baratas todavía.

Lo que sigue **pendiente de decisión**, sin cambios desde `TRASPASO.md`:
Realtime (autoalojar o sustituir por sondeo/SSE) y si los archivos se migran
antes que la base. Mi recomendación en `SUPABASE.md` §7 es **los archivos
primero**, que es al revés de lo que parece natural, porque son lo que crece y lo
que se cobra por tráfico.

Y sigue en pie lo de `TRASPASO.md`: **en septiembre no se migra nada.** El evento
es a mediados de mes.

---

## 5 · Consultas que conviene no reescribir

Todas se lanzan con el MCP de Supabase contra `yopontbwgdybfsniqawz`.

**Dónde están las URLs de Storage metidas en filas** (regenera la tabla de §3.3):

```sql
select * from (
  select c.table_name, c.column_name,
    (xpath('/row/n/text()', query_to_xml(format(
      'select count(*) as n from public.%I where %I::text like ''%%/storage/v1/object/%%''',
      c.table_name, c.column_name), false, true, '')))[1]::text::int as filas
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema='public' and t.table_name=c.table_name and t.table_type='BASE TABLE'
  where c.table_schema='public' and c.data_type in ('text','character varying','jsonb','json')
) s where filas > 0 order by filas desc;
```

**Cuántos objetos sobran** (los 40 huérfanos):

```sql
with refs as (
  select unnest(regexp_matches(t::text, '/storage/v1/object/public/([^"''\s\)]+)', 'g')) as ruta
  from (
    select cover_url::text||' '||coalesce(gallery::text,'')||' '||coalesce(page_json::text,'')||' '||
           coalesce(paginas::text,'')||' '||coalesce(branding::text,'')||' '||coalesce(pago_qr_url,'') from eventos
    union all select coalesce(foto_url,'') from torneo_equipos
    union all select coalesce(respuestas::text,'') from tickets
    union all select coalesce(empresa_logo_url,'')||' '||coalesce(avatar_url,'') from profiles
    union all select coalesce(file_url,'') from chat_messages
    union all select coalesce(foto_url,'') from speakers
    union all select coalesce(logo_url,'') from networking_expositores
  ) x(t) where t is not null
)
select count(*) as huerfanos, pg_size_pretty(sum((o.metadata->>'size')::bigint)) as peso
from storage.objects o
where not exists (select 1 from refs r where r.ruta = o.bucket_id||'/'||o.name);
```

**Reparto de usuarios entre contraseña y Google:**

```sql
select
 (select count(*) from auth.users) as usuarios,
 (select count(*) from auth.users where encrypted_password is not null and encrypted_password<>'') as con_contrasena,
 (select count(*) from auth.identities where provider<>'email') as identidades_oauth;
```

---

## 6 · Qué está verificado y qué no

**Verificado hoy contra producción:** tamaños y conteos; los tres buckets con
sus límites y tipos; los 107 objetos y su reparto por carpeta; los 40 huérfanos
y sus 28 MB; las 13 columnas con URLs y sus 57 filas; las 8 políticas de
`storage`; las 21 tablas con RLS y sin política; los 29 usuarios con su reparto;
el cron desactivado con sus 1.981 fallos; que la Edge Function desplegada es
`quick-processor`; que en `form-uploads` no hay ningún PDF.

**Sin verificar:**

- **El egress real.** Es el punto 1 de la sección 4 y sigue sin mirarse.
- Los límites vigentes del plan gratis. Supabase los cambia.
- **Nada del plan de migración se ha ensayado.** El volcado, la restauración y
  la reescritura de URLs están escritos a partir del esquema real, pero no se
  han ejecutado ni contra una copia. La primera vez, contra un proyecto de
  pruebas.
- Sigue sin verificarse lo que `TRASPASO.md` §8 ya marcaba: el workspace
  completo con sesión iniciada, que nunca se pudo recorrer.

**Y no olvidar la trampa que ya estaba anotada:** `VITE_DEV_BYPASS_AUTH=1` hay
que quitarlo antes de iniciar sesión de verdad, o la app sigue usando el usuario
ficticio y las pantallas salen vacías.
