/* Idioma de la aplicación — español por defecto, inglés bajo demanda.
   Traducción manual: no hay servicio externo ni detección automática.

   La clave del diccionario ES el texto en español, así que:
   - en español t() devuelve la clave tal cual (cero costo, cero riesgo)
   - en inglés busca en src/i18n/en.js y, si no está, cae al español

   Además expone `recargando`: se pone en true durante ~1.1s cada vez que
   se cambia de idioma, para que el bot pueda "reiniciar la cara". */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import en from '../i18n/en.js';

const I18nContext = createContext(null);
const STORAGE_KEY = 'gestek-lang';
/* Evento compartido con lib/i18n.js (el diccionario por clave de las
   páginas públicas de evento) para que ambos lados se enteren. */
const EVENTO_CAMBIO = 'gestek:lang-changed';
const DICCIONARIOS = { es: null, en };
export const IDIOMAS = [
  { code: 'es', label: 'Español', corto: 'ES' },
  { code: 'en', label: 'English',  corto: 'EN' },
];

/* Reemplaza {marcadores} por valores. Se deja fuera del componente para
   que no se recree en cada render. */
function interpolar(texto, vars) {
  if (!vars) return texto;
  return texto.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === 'undefined') return 'es';
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es';
  });
  const [recargando, setRecargando] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new Event(EVENTO_CAMBIO));
  }, [lang]);

  /* Si el idioma cambia desde el otro lado (o desde otra pestaña), este
     provider se pone al día. Al comparar contra el estado actual, el
     evento que nosotros mismos emitimos no provoca un ciclo. */
  useEffect(() => {
    const sincronizar = () => {
      const guardado = localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es';
      setLangState((actual) => (actual === guardado ? actual : guardado));
    };
    window.addEventListener(EVENTO_CAMBIO, sincronizar);
    window.addEventListener('storage', sincronizar);
    return () => {
      window.removeEventListener(EVENTO_CAMBIO, sincronizar);
      window.removeEventListener('storage', sincronizar);
    };
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const setLang = useCallback((next) => {
    setLangState((actual) => {
      if (actual === next) return actual;
      // el bot recarga la cara mientras "reconstruye" la interfaz
      setRecargando(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setRecargando(false), 1150);
      return next;
    });
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'es' ? 'en' : 'es');
  }, [lang, setLang]);

  const t = useCallback((texto, vars) => {
    if (texto == null) return texto;
    const dic = DICCIONARIOS[lang];
    const traducido = dic ? (dic[texto] ?? texto) : texto;
    return interpolar(traducido, vars);
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t, recargando, idiomas: IDIOMAS }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de I18nProvider');
  return ctx;
};

/* Atajo para componentes que solo necesitan traducir. */
export const useT = () => useI18n().t;

/* Traducción sin hooks — para componentes de clase (ErrorBoundary) y para
   utilidades sueltas. Lee el idioma del <html lang>, que el provider
   mantiene sincronizado, así que no necesita contexto. */
export function tEstatico(texto, vars) {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : 'es';
  const dic = DICCIONARIOS[lang];
  return interpolar(dic ? (dic[texto] ?? texto) : texto, vars);
}
