// ============================================================================
// BUILD — puts the game together into ONE file:  ../robinson_v<VERSION>.html  (next to this folder)
//   node build.mjs              -> VERSION below          node build.mjs v=063  -> other version
// Needs nothing but Node itself (no packages).
//
// How the files fit together
//   robinson.html   page frame, all CSS and the embedded fonts; gets the code at /*CODE*/
//   sound.js, spiel.js, logbuch.js, traumbild.js, traum.js — each in its own function scope, written first;
//                   only names marked `export` come out (`import` lines are only markers)
//   world STRAND    strand.js + titel.js              -> one block { … } = one shared scope
//   world KAMPF     surf.js
//   world INSEL     inselgenerator.js + insel.js      -> one block { … } = one shared scope
// A world sees every exported module name. A name kept per world (PET_CODES_STRAND / PET_CODES_INSEL) arrives in that
// world under the plain name (PET_CODES). Checks: no world re-declares a module name; no code hides inside a trailing
// comment (the guard); `node --check` must pass on the result.
// Test/console access: window.SPIEL, window.TRAUM, window.STRAND.<name>, window.KAMPF.<name>, window.INSEL.<name>.
// v063: rebuilt after the sources were recovered from robinson_v062.html (same output layout as v062).
// ============================================================================
import fs from 'fs'; import path from 'path'; import os from 'os'; import { execFileSync } from 'child_process';
const ROOT = path.dirname(new URL(import.meta.url).pathname);
let VERSION = '064';
process.argv.slice(2).forEach(a => { const [k, v] = a.split('='); if (k === 'v') VERSION = v; });
const WORLDS = {
  strand: { name: 'STRAND', suffix: '_STRAND', files: ['strand.js', 'titel.js'] },
  kampf:  { name: 'KAMPF', suffix: '_KAMPF', files: ['surf.js'] },
  insel:  { name: 'INSEL', suffix: '_INSEL', files: ['inselgenerator.js', 'insel.js'] },
};
const MODULES = ['sound.js', 'spiel.js', 'logbuch.js', 'traumbild.js', 'traum.js'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// skip a string / template / comment / regex starting at i; returns the index after it (or -1 if none starts here)
function skip(src, i, prev) {
  const c = src[i], n = src[i + 1];
  if (c === '/' && n === '/') { const e = src.indexOf('\n', i); return e < 0 ? src.length : e; }
  if (c === '/' && n === '*') return src.indexOf('*/', i + 2) + 2;
  if (c === "'" || c === '"') { for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++; return i + 1; }
  if (c === '`') { let d = 0; for (i++; i < src.length; i++) { if (src[i] === '\\') { i++; continue; } if (!d && src[i] === '`') return i + 1; if (src[i] === '$' && src[i + 1] === '{') { d++; i++; continue; } if (d && src[i] === '}') d--; else if (d && (src[i] === "'" || src[i] === '"' || src[i] === '`')) { i = skip(src, i, '(') - 1; } } return i; }
  if (c === '/' && '(,=:[!&|?{};+-*%<>~^\n'.includes(prev)) { let cls = false; for (i++; i < src.length; i++) { const x = src[i]; if (x === '\\') { i++; continue; } if (x === '[') cls = true; else if (x === ']') cls = false; else if (x === '/' && !cls) break; } i++; while (/[a-z]/.test(src[i] || '')) i++; return i; }
  return -1;
}
// top-level declarations: [name, settable, exported] — depth-0 statements only
function topNames(src) {
  const out = []; let d = 0, prev = '\n', lineStart = true;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (d === 0 && (lineStart || prev === ';')) {
      const m = /^[ \t]*(export )?(?:(async )?function\*? ([\w$]+)|class ([\w$]+)|(const|let|var) )/.exec(src.slice(i, i + 160));
      if (m) {
        if (m[3] || m[4]) { out.push([m[3] || m[4], !!m[3], !!m[1]]); }
        else {   // declarators: names at depth 0 after the keyword or a comma; destructuring { a, b } / [a, b]
          let j = i + m[0].length, dd = 0, expect = true, p = ' ';
          for (; j < src.length; j++) {
            const ch = src[j]; const k = skip(src, j, p); if (k >= 0) { j = k - 1; p = 'a'; continue; }
            if (expect && dd === 0 && /[\w$]/.test(ch)) { const nm = /^[\w$]+/.exec(src.slice(j))[0]; out.push([nm, m[5] !== 'const', !!m[1]]); j += nm.length - 1; expect = false; p = 'a'; continue; }
            if (expect && dd === 0 && (ch === '{' || ch === '[')) { const close = ch === '{' ? '}' : ']'; let e = j + 1, q = 1; while (q && e < src.length) { if (src[e] === ch) q++; else if (src[e] === close) q--; e++; }
              src.slice(j + 1, e - 1).split(',').forEach(part => { const nm = /([\w$]+)\s*$/.exec(part.split('=')[0].trim().split(':').pop().trim()); if (nm) out.push([nm[1], m[5] !== 'const', !!m[1]]); }); j = e - 1; expect = false; continue; }
            if ('([{'.includes(ch)) dd++; else if (')]}'.includes(ch)) dd--;
            else if (dd === 0 && ch === ',') expect = true;
            else if (dd === 0 && (ch === ';' || (ch === '\n' && !/[=,(\[{+\-*/?:&|.]\s*$/.test(src.slice(Math.max(0, j - 40), j)) && !/^\s*[.?:+\-*/&|,)\]]/.test(src.slice(j + 1, j + 40))))) break;
            if (!/\s/.test(ch)) p = /[\w$]/.test(ch) ? 'a' : ch;
          }
          i = j; prev = ';'; lineStart = src[j] === '\n'; continue;
        }
      }
    }
    lineStart = false;
    const k = skip(src, i, prev); if (k >= 0) { i = k - 1; prev = 'a'; continue; }
    if (c === '\n') { lineStart = true; continue; }
    if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--;
    if (!/\s/.test(c)) prev = /[\w$]/.test(c) ? 'a' : c;
  }
  const seen = new Set(); return out.filter(n => !seen.has(n[0]) && seen.add(n[0]));
}
// the guard (v060/v061): code hiding behind a trailing `//` comment on the same line
function guard(f, src) {
  const bad = [];
  src.split('\n').forEach((l, n) => {
    let i = 0, p = '\n'; for (; i < l.length; i++) { const c = l[i]; if (c === '/' && l[i + 1] === '/') break; const k = skip(l, i, p); if (k >= 0) { i = k - 1; p = 'a'; continue; } if (!/\s/.test(c)) p = c; }
    if (i >= l.length || !l.slice(0, i).trim()) return;
    const cm = l.slice(i + 2);
    if (/\belse if\b|\b(const|let) [\w$]+ =|\bG\.[\w$]+ (=|\+\+)|\.push\(|; *[\w$.]+ *(\(|=[^=]|\+\+|--)[^;]*;/.test(cm)) bad.push(f + ':' + (n + 1) + '  ' + l.trim().slice(0, 140));
  });
  return bad;
}
function build() {
  const modNames = new Set(), swallowed = [];
  const modCode = MODULES.map(f => {
    const src = read(f); swallowed.push(...guard(f, src));
    const ex = topNames(src).filter(n => n[2]).map(n => n[0]); ex.forEach(n => modNames.add(n));
    const body = src.replace(/^import .*?;\s*$/gm, '').replace(/^export /gm, '').replace(/\n$/, '');
    return `// ---------- file: ${f} ----------\nconst { ${ex.join(', ')} } = (() => {\n${body}\n\nreturn { ${ex.join(', ')} };\n})();`;
  }).join('\n');
  const blocks = [];
  for (const [key, Wd] of Object.entries(WORLDS)) {
    Wd.files.forEach(f => swallowed.push(...guard(f, read(f))));
    const body = Wd.files.map(f => `// ---------- file: ${f} ----------\n` + read(f).replace(/\n$/, '')).join('\n');
    const own = topNames(body), ownSet = new Set(own.map(n => n[0]));
    const clash = own.filter(([n]) => modNames.has(n)).map(n => n[0]);
    if (clash.length) throw new Error(`${key}: declares names that the modules already have: ${clash.join(', ')}`);
    const alias = [...modNames].filter(n => n.endsWith(Wd.suffix)).map(n => [n, n.slice(0, -Wd.suffix.length)]).filter(([, l]) => !ownSet.has(l));
    const shared = [...modNames].filter(n => !/_(STRAND|INSEL)$/.test(n));
    const expose = [...own.map(([n, set]) => `d(${JSON.stringify(n)}, () => ${n}${set ? `, v => { ${n} = v; }` : ''});`),
      ...shared.filter(n => !ownSet.has(n)).map(n => `d(${JSON.stringify(n)}, () => ${n});`), ...alias.map(([, l]) => `d(${JSON.stringify(l)}, () => ${l});`)];
    blocks.push(`// =================== WORLD: ${key} ===================\n{\n${alias.map(([e, l]) => `const ${l} = ${e};`).join('\n')}\n${body}\n` +
      `// ---------- test/console access: window.${Wd.name}.<name> ----------\n{ const o = window.${Wd.name} = {}; const d = (n, g, s) => Object.defineProperty(o, n, { get: g, set: s, enumerable: true });\n${expose.join('\n')} }\n}\n`);
    console.log(`  ${key}: ${Wd.files.join(' + ')} · ${own.length} own names`);
  }
  if (swallowed.length) throw new Error('code inside a trailing comment:\n' + swallowed.map(l => '  ' + l).join('\n'));
  let js = `(() => {\n'use strict';\n${modCode}\nwindow.SPIEL = SPIEL; window.TRAUM = TRAUM;\n${blocks.join('\n')}})();\n`;
  js = js.replace(/\b__VERSION__\b/g, JSON.stringify('v' + VERSION));
  const tmp = path.join(os.tmpdir(), `robinson_check_${process.pid}.js`); fs.writeFileSync(tmp, js);
  try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); }
  catch (e) { throw new Error('syntax check failed:\n' + String(e.stderr)); } finally { fs.unlinkSync(tmp); }
  const html = read('robinson.html').replace(/__VERSION__/g, 'v' + VERSION).replace('/*CODE*/', () => js.replace(/<\/script/gi, '<\\/script'));
  const out = path.join(ROOT, '..', `robinson_v${VERSION}.html`);
  fs.writeFileSync(out, html);
  console.log(`robinson_v${VERSION}.html: ${(html.length / 1024).toFixed(0)} KB -> ${out}`);
}
build();
