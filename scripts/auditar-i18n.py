# -*- coding: utf-8 -*-
"""Auditor de traducción.

Compara las frases envueltas en t() / tr() / tEstatico() contra el
diccionario de src/i18n/en.js y reporta las que todavía no tienen inglés.

    python scripts/auditar-i18n.py .          # cuenta y escribe faltantes.txt
    python scripts/auditar-i18n.py . ruta.txt # detalle en otra ruta

El detalle va a un archivo porque la consola de Windows no imprime acentos.
Salida 0 si no falta nada; útil para enganchar a CI."""
import pathlib, re, sys

RAIZ = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')

PAT = re.compile(r"\b(?:t|tr|tEstatico)\(\s*'((?:[^'\\]|\\.)*)'")
KEY = re.compile(r"^\s*'((?:[^'\\]|\\.)*)'\s*:", re.M)

usadas = {}
for f in list((RAIZ / 'src').rglob('*.jsx')) + list((RAIZ / 'src').rglob('*.js')):
    if 'i18n' in f.parts and f.suffix == '.js':
        continue
    txt = f.read_text(encoding='utf-8')
    # lib/i18n.js es el otro diccionario (claves tipo 'evento.titulo') y trae
    # su propio ingles: sus consumidores no cuentan como falta.
    if "lib/i18n.js" in txt:
        continue
    for m in PAT.finditer(txt):
        k = m.group(1).replace("\\'", "'")
        if k and not k.startswith(('http', '/')):
            usadas.setdefault(k, str(f.relative_to(RAIZ)))

en = (RAIZ / 'src/i18n/en.js').read_text(encoding='utf-8')
tiene = {m.group(1).replace("\\'", "'") for m in KEY.finditer(en)}

faltan = sorted(k for k in usadas if k not in tiene)
print('usadas: %d | traducidas: %d | faltan: %d' % (len(usadas), len(usadas) - len(faltan), len(faltan)))

# La consola de Windows no aguanta acentos ni flechas: el detalle va a un
# archivo UTF-8 y aqui solo queda el conteo.
salida = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else pathlib.Path('faltantes.txt')
salida.write_text('\n'.join('%s\t%s' % (k, usadas[k]) for k in faltan), encoding='utf-8')
print('detalle en:', salida)

sys.exit(1 if faltan else 0)
