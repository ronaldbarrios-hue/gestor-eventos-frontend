import { test, expect } from '@playwright/test';
import { WIDGET_TAMANOS, WIDGET_SOMBRAS } from '../../src/lib/embed.js';

/* El botón que se incrusta en la web de otro.
 *
 * Se prueba contra una página que hace de web ajena (`host.html`) servida por
 * un servidor estático, no contra la app: lo que hay que comprobar es
 * justamente lo que ocurre FUERA del iframe, en la página del organizador.
 *
 * Lo que se mira aquí no es «sale un botón». Es lo que se rompe en la web de
 * un cliente y nadie se entera hasta que se queja:
 *
 *   · que el visitante NO salga de su web al pulsar —era el fallo reportado—;
 *   · que se pueda cerrar, y que al cerrar la página quede como estaba,
 *     incluido el scroll, que es lo que más se nota cuando falla;
 *   · que sólo se escuche a nuestro iframe, y no a cualquier script de la
 *     página anfitriona que quiera cerrar la ventana o hacernos abrir una URL.
 *
 * Correr:  npm run test:widget
 */

const HOST = '/host.html';

test.describe('botón de registro incrustado', () => {
  test('pinta los dos botones con la personalización pedida', async ({ page }) => {
    await page.goto(HOST);

    const enSitio = page.locator('#en-sitio button');
    const delScript = page.locator('body > button');

    await expect(enSitio).toHaveText('Quiero mi entrada');
    await expect(delScript).toHaveText('Registrarme');

    /* El degradado: dos colores y el ángulo que se pidió. Es la parte de la
       personalización que más fácil se queda a medias. */
    const fondo = await enSitio.evaluate(el => getComputedStyle(el).backgroundImage);
    expect(fondo).toContain('linear-gradient');
    expect(fondo).toContain('124, 58, 237');   // #7C3AED
    expect(fondo).toContain('236, 72, 153');   // #EC4899

    const estilos = await enSitio.evaluate(el => {
      const s = getComputedStyle(el);
      return { radio: s.borderRadius, borde: s.borderWidth, sombra: s.boxShadow };
    });
    expect(estilos.radio).toBe('999px');
    expect(estilos.borde).toBe('2px');
    expect(estilos.sombra).not.toBe('none');

    /* El de una línea es el otro camino: color plano, sin degradado. */
    const fondoPlano = await delScript.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(fondoPlano).toBe('rgb(224, 177, 43)');
  });

  test('al pulsar abre la ventana encima, sin sacar al visitante de la web', async ({ page }) => {
    await page.goto(HOST);
    const urlAntes = page.url();

    await page.locator('#en-sitio button').click();

    const marco = page.locator('iframe[title="Registro"]');
    await expect(marco).toBeVisible();

    /* Lo que se pedía: el registro se abre aquí, no en una pestaña de GESTEK. */
    expect(page.url()).toBe(urlAntes);
    expect(await marco.getAttribute('src')).toContain('/embed/evento-de-prueba/registro');

    /* Y con la ventana abierta, la página de detrás no se puede desplazar. */
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  });

  test('se cierra con Escape y deja la página como estaba', async ({ page }) => {
    await page.goto(HOST);
    await page.locator('#en-sitio button').click();
    await expect(page.locator('iframe[title="Registro"]')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.locator('iframe[title="Registro"]')).toHaveCount(0);
    /* El scroll vuelve. Sin esto, la web del organizador se queda congelada
       después de cerrar y parece que se rompió su página, no la nuestra. */
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  });

  test('se cierra pulsando fuera, y no al pulsar dentro', async ({ page }) => {
    await page.goto(HOST);
    await page.locator('#en-sitio button').click();
    await expect(page.locator('iframe[title="Registro"]')).toBeVisible();

    /* Dentro del recuadro no cierra: quien pulsa el formulario no quiere irse. */
    await page.locator('iframe[title="Registro"]').click({ position: { x: 5, y: 5 }, force: true });
    await expect(page.locator('iframe[title="Registro"]')).toBeVisible();

    /* En el borde de la pantalla, sí. */
    await page.mouse.click(5, 5);
    await expect(page.locator('iframe[title="Registro"]')).toHaveCount(0);
  });

  test('ignora los mensajes que no vienen de nuestro iframe', async ({ page }) => {
    /* Sin la comprobación de origen, cualquier script de la web anfitriona
       —una etiqueta de publicidad, un chat de soporte— podría cerrar la
       ventana o, peor, hacernos abrir la URL que quisiera en una pestaña
       nueva a nombre del organizador. */
    await page.goto(HOST);
    await page.locator('#en-sitio button').click();
    await expect(page.locator('iframe[title="Registro"]')).toBeVisible();

    await page.evaluate(() => {
      window.postMessage({ gestek: 'cerrar' }, '*');
      window.postMessage({ gestek: 'abrir', url: 'https://example.com/robo' }, '*');
    });
    await page.waitForTimeout(300);

    await expect(page.locator('iframe[title="Registro"]')).toBeVisible();
  });

  test('los tamaños del widget y los del panel son los mismos', async ({ page }) => {
    /* `widget.js` no puede importar nada de la app —lo carga una web ajena—,
       así que lleva su propia copia de la tabla de tamaños y de sombras. Dos
       copias de lo mismo se separan a la primera corrección, y el organizador
       vería en el panel un botón distinto del que sale en su web.

       Esto las ata: lo que pinta el widget de verdad, contra la tabla que usa
       la vista previa. */
    await page.goto(HOST);

    for (const [nombre, esperado] of Object.entries(WIDGET_TAMANOS)) {
      const boton = page.locator(`#t-${nombre} button`);
      const real = await boton.evaluate(el => {
        const s = getComputedStyle(el);
        return { padding: s.padding, fuente: s.fontSize };
      });
      /* `12px 22px` en el CSS sale como `12px 22px` normalizado; se comparan
         los números, no la cadena, para no atarse al formato del navegador. */
      const nums = (v) => v.match(/[\d.]+/g).map(Number);
      expect(nums(real.padding).slice(0, 2), `padding de ${nombre}`).toEqual(nums(esperado.padding));
      expect(nums(real.fuente)[0], `fuente de ${nombre}`).toBe(nums(esperado.fuente)[0]);
    }

    /* Y la sombra por defecto, que es la que más se nota si cambia. */
    const sombra = await page.locator('#t-md button').evaluate(el => getComputedStyle(el).boxShadow);
    expect(sombra).not.toBe('none');
    expect(WIDGET_SOMBRAS.md).toContain('rgba(0,0,0,.20)');
  });

  test('se puede abrir desde el código del propio organizador', async ({ page }) => {
    await page.goto(HOST);
    await page.evaluate(() => window.GestekRegistro.abrir('otro-evento'));

    const marco = page.locator('iframe[title="Registro"]');
    await expect(marco).toBeVisible();
    expect(await marco.getAttribute('src')).toContain('/embed/otro-evento/registro');

    await page.evaluate(() => window.GestekRegistro.cerrar());
    await expect(marco).toHaveCount(0);
  });
});
