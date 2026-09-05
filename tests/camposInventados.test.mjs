/* Campos que la pantalla lee y el servidor no manda nunca.
 *
 * ── La forma de fallar de este proyecto, en una línea ────────────────────
 *
 * `t.asignado_id` en vez de `t.asignado_user_id`. `s.inicio_at` en vez de
 * `s.inicio`. No revientan: devuelven `undefined`, y a partir de ahí la
 * pantalla decide mal en silencio.
 *
 * Lo que se encontró con esto:
 *
 *   · «Mis tareas» filtraba con `!t.asignado_id`, que era SIEMPRE cierto —
 *     así que enseñaba las tareas de todo el equipo. Mostraba de más, que es
 *     justo lo que nadie mira dos veces.
 *   · «Próximas actividades» filtraba por `s.inicio_at`, que no existe — así
 *     que descartaba todas las sesiones y salía siempre vacío, en un evento
 *     con la agenda entera cargada.
 *
 * ── Cómo funciona ────────────────────────────────────────────────────────
 *
 * Se buscan lecturas `objeto.algo_con_guion_bajo` en `src/` y se comprueba que
 * ese nombre aparezca en algún sitio del backend. El guion bajo es el filtro:
 * es como se llaman las columnas, y deja fuera los métodos de JavaScript y las
 * props en camelCase.
 *
 * Muchos nombres legítimos viven dentro de `page_json` —un jsonb que el
 * servidor guarda entero sin nombrar sus campos— o son claves de traducción.
 * Ésos van en `PROPIOS`, con su motivo: la lista es corta a propósito, y cada
 * entrada nueva obliga a mirar una vez si de verdad no viene del servidor.
 *
 * Sin el backend al lado la prueba se salta sola: son dos repositorios.
 *
 * Correr: node --test tests/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const BACK = join('..', '..', '..', '..', 'gestor-eventos-backend');

/* Nombres con guion bajo que NO vienen del servidor, y por qué. */
const PROPIOS = {
  /* Ajustes dentro de `page_json`: el servidor guarda el bloque entero y no
     nombra lo que lleva dentro, así que nunca aparecerán en su código. */
  boton_como_llegar: 'ajuste del bloque de mapa, dentro de page_json',
  sin_caja: 'ajuste de presentación del bloque de información',
  cierre_texto: 'texto de cierre de la página, en page_json',
  cierre_titulo: 'texto de cierre de la página, en page_json',
  favicon_url: 'marca blanca del evento, en page_json',
  enlace_boleta: 'ajuste del checkout, en page_json',
  modal_alto: 'ajuste del checkout, en page_json',
  modal_ancho: 'ajuste del checkout, en page_json',
  mostrar_puntos: 'ajuste de la tarjeta, en page_json',
  titulo_puntos: 'ajuste de la tarjeta, en page_json',
  tipos_extra: 'tipos de sub-evento propios del organizador, en page_json',
  caja_mm: 'medida de la etiquetadora, en page_json',
  lado_mm: 'medida de la etiquetadora, en page_json',
  texto_mm: 'medida de la etiquetadora, en page_json',
  texto_alto_mm: 'medida de la etiquetadora, en page_json',
  formato_codigo: 'ajuste de la etiquetadora, en page_json',
  qr_contenido: 'ajuste de la etiquetadora, en page_json',
  qr_objetivo: 'ajuste de la etiquetadora, en page_json',
  puntos_por_modulo: 'ajuste de la etiquetadora, en page_json',

  /* Se calculan aquí y se cuelgan del objeto antes de pintarlo. */
  inscripcion_abierta: 'se calcula en la pantalla y se adjunta a cada sesión',
  modo_activo: 'estado de la sesión del navegador, no del servidor',
  offline_id: 'id local de la cola de escaneos sin conexión',
  guardado_at: 'cuándo se guardó la copia local del evento, para poder decirlo en pantalla',

  /* Formularios y traducciones. */
  asignado_tipo: 'campo del formulario de tareas, no viaja a la API',
  precios_sugeridos: 'lo devuelve el lector de PDF del navegador',
  no_encontrado_titulo: 'clave de traducción',
  volver_explorar: 'clave de traducción',

  /* Facturación: la pantalla arma el objeto que va a la pasarela. */
  cliente_email: 'lo compone la pantalla para la factura',
  cliente_nombre: 'lo compone la pantalla para la factura',
  tipo_id: 'lo compone la pantalla para la factura',
};

const sinComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

function archivos(dir) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (/\.(js|jsx)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

function textoDe(dir, exts) {
  const trozos = [];
  const recorrer = (d) => {
    for (const nombre of readdirSync(d)) {
      if (nombre === 'node_modules' || nombre === '.git' || nombre === '.claude') continue;
      const ruta = join(d, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (exts.some((e) => nombre.endsWith(e))) trozos.push(readFileSync(ruta, 'utf8'));
    }
  };
  recorrer(dir);
  return trozos.join('\n');
}

test('ningún campo leído en pantalla se lo inventa', { skip: !existsSync(BACK) }, () => {
  const backend = textoDe(BACK, ['.js', '.sql']);
  const inventados = new Map();

  for (const f of archivos('src')) {
    /* Sin comentarios: los motivos escritos NOMBRAN el campo equivocado para
       explicar por qué lo era —«ponía `asignado_id`, que no existe»— y sin
       quitarlos la prueba se caza a sí misma y no deja arreglar nada. */
    const src = sinComentarios(readFileSync(f, 'utf8'));
    for (const m of src.matchAll(/\.([a-z][a-z0-9]*_[a-z0-9_]+)\b/g)) {
      const campo = m[1];
      if (PROPIOS[campo]) continue;
      if (new RegExp(`\\b${campo}\\b`).test(backend)) continue;
      if (!inventados.has(campo)) inventados.set(campo, []);
      inventados.get(campo).push(relative('src', f));
    }
  }

  const lista = [...inventados].map(([c, fs]) => `${c}  ←  ${[...new Set(fs)].join(', ')}`);
  assert.deepEqual(lista, [],
    'la pantalla lee campos que el servidor no manda. Devuelven `undefined` y la\n' +
    'pantalla decide mal en silencio. Si de verdad son suyos, añádelos a PROPIOS\n' +
    'con su motivo:\n  ' + lista.join('\n  '));
});
