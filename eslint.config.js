import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/* Configuración de ESLint.

   El repo no tenía ninguna, y eso dejaba pasar al build una clase de error que
   sí revienta al usuario: un componente usado sin importar. Le pasó a
   `GLoader is not defined` en el detalle de vacante — para Vite es un
   identificador válido, así que compila sin una queja y solo falla cuando
   alguien abre esa pantalla.

   Volvió a pasar al meter el componente <Icono/> en 36 archivos: `npm run
   build` decía "built in 8.32s" con un ChatTab que lo usaba sin importarlo.

   La regla que lo caza es react/jsx-no-undef, y por eso esto existe. El resto
   está deliberadamente flojo: el objetivo es atrapar errores reales, no abrir
   un frente de cientos de avisos de estilo en un código que ya está escrito.

   Correr:  npm run lint
*/

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'dev-dist/**', 'playwright-report/**', 'test-results/**'],
  },

  js.configs.recommended,

  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      /* Sin esta, no-unused-vars no ve los componentes usados dentro de JSX y
         marca como muerto cada import que solo aparece como <Etiqueta/>. */
      'react/jsx-uses-vars': 'error',

      /* ── Lo que de verdad rompe en tiempo de ejecución ── */
      'react/jsx-no-undef': 'error',        // el componente sin importar
      'react/jsx-key': 'error',             // listas sin key
      'react/jsx-no-duplicate-props': 'error',
      'react/no-children-prop': 'error',
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-cond-assign': 'error',

      /* Los hooks mal llamados son fallos, no estilo. */
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      /* ── Ruido conocido, apagado a propósito ── */
      /* No se usa la runtime clásica: React no tiene que estar en el ámbito. */
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      /* Muchos catch vacíos son intencionados y llevan su comentario al lado. */
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
    },
  },

  /* Los service workers viven en otro ámbito: `self`, no `window`. Hay dos, y
     no son iguales: el de src/ lo compila vite-pwa y usa imports; el de
     public/ se sirve tal cual y es un script suelto. */
  {
    files: ['src/sw.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.serviceworker, ...globals.browser },
    },
    rules: { 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }] },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: { ...globals.serviceworker, ...globals.browser },
    },
    rules: { 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }] },
  },

  /* Playwright y los archivos de configuración corren en Node. */
  {
    files: ['tests/**/*.js', 'e2e/**/*.js', 'scripts/**/*.js',
            'playwright.config.js', 'vite.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
];
