# Pruebas E2E de navegación (Playwright)

Cazan pantallas que se caen (blanco / error) al navegar. Recorren las rutas
globales y **todas las secciones del workspace de un evento**, y fallan si
aparece la Error Boundary, si la página queda en blanco o si hay errores de
consola.

## Correr

```bash
npm install                 # instala @playwright/test
npx playwright install      # baja el navegador (una vez)

# credenciales de una cuenta de PRUEBA (no la real de producción)
export E2E_EMAIL="cuenta@prueba.com"
export E2E_PASSWORD="..."
export E2E_BASE_URL="https://gestekeventost.dpdns.org"   # o http://localhost:5173
export E2E_EVENT_ID="uuid-de-un-evento"                  # opcional; si no, usa el primero

npm run test:e2e            # o  npm run test:e2e:ui  para ver el navegador
```

## Notas
- Sin `E2E_EMAIL`/`E2E_PASSWORD` las pruebas se **saltan** (no fallan).
- `SECCIONES_EVENTO` en `navegacion.spec.js` es espejo de `SECCIONES` en
  `EventWorkspace.jsx` — al agregar/quitar secciones, actualízalo.
- La escritura de más pruebas se puede automatizar con IA (Codegen):
  `npx playwright codegen https://gestekeventost.dpdns.org`.
