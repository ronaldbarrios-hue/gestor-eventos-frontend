import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'gestek-theme';

/* Modo CLARO por defecto (rework 2026). El modo oscuro se activa
   agregando la clase "dark" al <html>. Los tokens viven en index.css. */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.remove('light'); // clase legada del sistema anterior
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setLight = useCallback(() => setTheme('light'), []);
  const setDark  = useCallback(() => setTheme('dark'), []);
  const toggle   = useCallback(() => setTheme(t => (t === 'dark' ? 'light' : 'dark')), []);

  return (
    <ThemeContext.Provider value={{ theme, setLight, setDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
};
