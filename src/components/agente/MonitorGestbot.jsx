import { useI18n } from '../../context/I18nContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

/* ──────────────────────────────────────────────────────────────────
   #40 · La segunda pantalla.

   Gestbot tiene dos. La suya —el portátil que dibuja `Criatura`— se ve por
   detrás y no muestra nada: si él la está mirando, nosotros estamos al otro
   lado. Lo que hay ahí dentro es asunto suyo.

   Esta es la otra: un monitor girado hacia el usuario, con lo único que tiene
   sentido poner en una pantalla compartida — el idioma y el tema. No es
   decoración: los dos controles son de verdad y cambian la aplicación
   entera. Los mismos que hay en Ajustes, pero aquí, donde ya estás mirando al
   bot y no hace falta ir a buscarlos.

   El cambio de idioma pone al bot en 'recargando' un instante (su cara es una
   pantalla y se reinicia). Eso lo hace el propio I18nContext; aquí sólo se
   toca el idioma.
   ────────────────────────────────────────────────────────────────── */

export default function MonitorGestbot({ compacto = false }) {
  const { lang, setLang, idiomas, t } = useI18n();
  const { theme, setLight, setDark } = useTheme();

  return (
    <div className={`flex flex-col items-center ${compacto ? 'w-[190px]' : 'w-[230px]'}`}>
      {/* Carcasa: marco grueso, filo de latón y una franja inferior con el
          piloto. Lo que hace que se lea como monitor y no como tarjeta. */}
      <div className="w-full rounded-t-xl rounded-b-md border border-accent/30 bg-[#1A1F28] p-2 shadow-lg">
        <div className="rounded-lg bg-bg border border-white/5 px-3 py-3 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-3 font-semibold mb-1.5">
              {t('Idioma')}
            </p>
            <div className="flex gap-1">
              {idiomas.map(i => (
                <button
                  key={i.code}
                  onClick={() => setLang(i.code)}
                  aria-pressed={lang === i.code}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border
                    ${lang === i.code
                      ? 'border-accent bg-accent/15 text-text-1'
                      : 'border-border text-text-3 hover:text-text-1'}`}>
                  {i.corto || i.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-3 font-semibold mb-1.5">
              {t('Tema')}
            </p>
            <div className="flex gap-1">
              {[
                ['light', t('Claro'), setLight],
                ['dark',  t('Oscuro'), setDark],
              ].map(([v, label, fn]) => (
                <button
                  key={v}
                  onClick={fn}
                  aria-pressed={theme === v}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border
                    ${theme === v
                      ? 'border-accent bg-accent/15 text-text-1'
                      : 'border-border text-text-3 hover:text-text-1'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Franja del marco con el piloto encendido. */}
        <div className="flex items-center justify-center gap-1.5 pt-1.5">
          <span className="w-1 h-1 rounded-full bg-success" aria-hidden="true" />
          <span className="text-[9px] uppercase tracking-widest text-text-3">GESTEK</span>
        </div>
      </div>

      {/* Pie del monitor. Dos piezas: el cuello y la base. */}
      <div className="w-6 h-3 bg-[#1A1F28] border-x border-accent/20" aria-hidden="true" />
      <div className="w-20 h-1.5 rounded-full bg-[#1A1F28] border border-accent/25" aria-hidden="true" />
    </div>
  );
}
