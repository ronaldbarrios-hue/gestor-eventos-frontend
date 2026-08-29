/* Servidores mínimos para probar el botón incrustable.
 *
 * Son DOS, en dos puertos, y eso es lo importante:
 *
 *   4319  tests/widget/ — la página que hace de web ajena (host.html)
 *   4320  public/       — widget.js, servido como lo sirve la app
 *
 * Con un solo puerto la prueba mentiría. El widget sólo hace caso a los
 * mensajes que vienen de SU origen, y si el script y la web anfitriona
 * comparten origen esa comprobación no se puede ejercitar: un `postMessage`
 * de la propia página pasaría por bueno. Separados, el montaje es el de
 * producción —el script en el dominio de la app, la web del cliente en el
 * suyo— y la comprobación se prueba de verdad.
 *
 * Sin dependencias y sin construir nada: `widget.js` se sirve exactamente como
 * lo va a cargar la web del organizador. Cualquier otra ruta —`/embed/...`, la
 * del iframe— devuelve 404 a propósito: lo que se prueba ocurre FUERA del
 * iframe.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITIOS = [
  { puerto: 4319, carpeta: path.join(RAIZ, 'tests', 'widget'), indice: '/host.html' },
  { puerto: 4320, carpeta: path.join(RAIZ, 'public'),          indice: '/widget.js' },
];

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js'  : 'text/javascript; charset=utf-8',
  '.css' : 'text/css; charset=utf-8',
  '.svg' : 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

for (const sitio of SITIOS) {
  http.createServer((req, res) => {
    const pedido = decodeURIComponent((req.url || '/').split('?')[0]);
    const nombre = pedido === '/' ? sitio.indice : pedido;
    const destino = path.join(sitio.carpeta, nombre);

    /* Que no se salga de la carpeta: es un servidor de pruebas, pero un `..`
       en la URL leería el repositorio entero y esa costumbre se pega. */
    const dentro = destino.startsWith(sitio.carpeta + path.sep);
    if (dentro && fs.existsSync(destino) && fs.statSync(destino).isFile()) {
      res.writeHead(200, {
        'Content-Type': TIPOS[path.extname(destino)] || 'application/octet-stream',
        /* El script lo carga una web de otro origen, igual que en producción. */
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(destino).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No está aquí (y para estas pruebas, da igual).');
  }).listen(sitio.puerto, '127.0.0.1', () => {
    console.log(`[widget] http://127.0.0.1:${sitio.puerto}${sitio.indice}`);
  });
}
