# Writes docs/regeln_heute.md: the rules as the game itself explains them today — every rule card of the rules screen (surf, beach, island),
# taken from spiel.js. Run after changing a card:  python3 regeln_heute.py
import re, html, datetime, os
HERE = os.path.dirname(os.path.abspath(__file__)); s = open(os.path.join(HERE, 'spiel.js')).read()
ver = re.search(r"let VERSION = '(\d+)'", open(os.path.join(HERE, 'build.mjs')).read()).group(1)
def clean(t):
    t = t.replace("\\'", "'").replace('\\n', '\n'); t = re.sub(r'<br\s*/?>', '\n', t); t = re.sub(r'</p>\s*<p>', '\n\n', t); t = re.sub(r'</?(b|strong)[^>]*>', '**', t); t = re.sub(r'</?(i|em)>', '*', t)
    t = re.sub(r'<[^>]+>', '', t); return html.unescape(t).strip()
out = ['# Robinson — the rules today (v' + ver + ')', '', 'Generated from the rule cards of the game (`python3 regeln_heute.py`). The change history is in `doku_regelbuch.md`.', '']
surf = re.findall(r"\{ id: '(\w+)', title: '((?:[^'\\]|\\.)*)', at: (\d+),[^\n]*\n\s*text: '((?:[^'\\]|\\.)*)'", s)
out += ['## Surf and beach', '']
for cid, title, at, text in surf: out += ['### ' + clean(title) + ' — from stage ' + at, '', clean(text), '']
i = s.index('export const RULECARDS'); j = s.index('];', i)
out += ['## Island', '']
for cid, title, text in re.findall(r"\{ id: '(\w+)', title: '((?:[^'\\]|\\.)*)', ill: '\w*', text: '((?:[^'\\]|\\.)*)'", s[i:j]): out += ['### ' + clean(title), '', clean(text), '']
open(os.path.join(HERE, 'docs', 'regeln_heute.md'), 'w').write('\n'.join(out) + '\n'); print(len(surf), 'surf cards,', len(out), 'lines')
