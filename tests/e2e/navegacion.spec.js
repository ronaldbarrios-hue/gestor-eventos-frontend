import { test, expect } from '@playwright/test';

/* Recorre la navegación y falla si alguna pantalla se cae (blanco/error).
   Detecta: errores de consola, excepciones de página, y el fallback de la
   Error Boundary ("Algo se rompió" / "Esta sección tuvo un problema"). */

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const EVENT_ID = process.env.E2E_EVENT_ID;

/* Rutas globales (modo organizador). */
const RUTAS_GLOBALES = ['/inicio', '/eventos', '/mi-espacio', '/vacantes', '/ajustes', '/gestbot', '/chat', '/vacantes'];

/* Secciones del workspace de un evento (s = sección, t = sub-tab). Espejo de
   SECCIONES en EventWorkspace.jsx — mantener en sync. */
const SECCIONES_EVENTO = [
  ['resumen', 'general'],
  ['experience', 'landing'], ['experience', 'checkout'], ['experience', 'emails'], ['experience', 'seo'],
  ['organizacion', 'equipo'], ['organizacion', 'vacantes'], ['organizacion', 'tareas'], ['organizacion', 'solicitudes'],
  ['organizacion', 'agenda'], ['organizacion', 'documentos'], ['organizacion', 'ranking'], ['organizacion', 'reporte'],
  ['comercial', 'boletas'], ['comercial', 'pagos'], ['comercial', 'analytics'], ['comercial', 'promociones'], ['comercial', 'facturacion'],
  ['asistentes', 'clientes'], ['asistentes', 'checkin'], ['asistentes', 'accesos'], ['asistentes', 'stands'],
  ['asistentes', 'waitlist'], ['asistentes', 'invitaciones'], ['asistentes', 'credenciales'], ['asistentes', 'tarjeta'],
  ['dinamicas', 'networking'], ['dinamicas', 'torneo'], ['dinamicas', 'mapa'],
  ['comunicacion', 'chat'], ['comunicacion', 'anuncios'],
  ['configuracion', 'general'], ['configuracion', 'integraciones'], ['configuracion', 'automatizaciones'],
];

async function login(page) {
  test.skip(!EMAIL || !PASSWORD, 'Define E2E_EMAIL y E2E_PASSWORD para correr las pruebas.');
  await page.goto('/login');
  await page.getByPlaceholder(/correo|email/i).first().fill(EMAIL);
  await page.getByPlaceholder(/contraseña|password/i).first().fill(PASSWORD);
  await page.getByRole('button', { name: /iniciar|entrar|ingresar|acceder/i }).first().click();
  await page.waitForURL(/\/(inicio|eventos|mi-espacio)/, { timeout: 15_000 });
}

/* Verifica que la pantalla no se haya caído. */
async function noSeCayo(page, errores, donde) {
  const boundary = page.getByText(/Algo se rompió|Esta sección tuvo un problema/i);
  await expect(boundary, `Error boundary visible en ${donde}`).toHaveCount(0);
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  expect(body.trim().length, `Pantalla en blanco en ${donde}`).toBeGreaterThan(0);
  expect(errores, `Errores de consola en ${donde}: ${errores.join(' | ')}`).toHaveLength(0);
}

test('navegación global sin caídas', async ({ page }) => {
  const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });

  await login(page);
  for (const ruta of RUTAS_GLOBALES) {
    errores.length = 0;
    await page.goto(ruta);
    await page.waitForLoadState('networkidle').catch(() => {});
    await noSeCayo(page, errores, ruta);
  }
});

test('secciones del evento sin caídas', async ({ page }) => {
  const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });

  await login(page);

  let eventId = EVENT_ID;
  if (!eventId) {
    await page.goto('/eventos');
    await page.waitForLoadState('networkidle').catch(() => {});
    const primer = page.locator('a[href^="/eventos/"]').first();
    test.skip(await primer.count() === 0, 'No hay eventos y no se pasó E2E_EVENT_ID.');
    const href = await primer.getAttribute('href');
    eventId = (href || '').split('/eventos/')[1]?.split(/[?#]/)[0];
  }

  for (const [s, t] of SECCIONES_EVENTO) {
    errores.length = 0;
    await page.goto(`/eventos/${eventId}?s=${s}&t=${t}`);
    await page.waitForLoadState('networkidle').catch(() => {});
    await noSeCayo(page, errores, `${s}/${t}`);
  }
});
