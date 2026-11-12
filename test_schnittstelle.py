# v070: the joints between beach, surf and island (rewritten — the old file was lost with the sources).
# The documented world APIs exist; the beach hands the surf what it has and takes back what the surf returns; green and spring hours are one stock;
# an island fight is played on the beach and reported back; a save from the middle of an ebb comes back as it was.
# Run after build:  python3 -u test_schnittstelle.py
import asyncio, glob, re, os, sys, json
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
FILE = max(glob.glob(os.path.join(HERE, '..', 'robinson_v*.html')), key=lambda f: int(re.findall(r'v(\d+)', f)[-1]))
FAIL = []
def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok: FAIL.append(what)
CL = """(() => { const r = document.getElementById('insel'), v = id => { const e = r.querySelector('#' + id); return e && e.style.display === 'flex'; }; if (v('prio')) { r.querySelector('#pBtn').click(); r.querySelector('#pBtn').click(); } if (v('card')) r.querySelector('#cardBtn').click(); return 1; })()"""
async def main():
    print('file:', FILE.split('/')[-1])
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200)
        await pg.evaluate("localStorage.clear(); localStorage.setItem('robinson_beach_mode', 'real'); localStorage.setItem('robinson_tutorials', 'off')"); await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200)
        await pg.evaluate("STRAND.applyCheckpoint('T14')"); await pg.wait_for_timeout(1500); await pg.evaluate("SPIEL.zeige('insel', { force: true }); 0")
        for _ in range(100):
            await pg.wait_for_timeout(200)
            if await pg.evaluate("SPIEL.inselBereit && INSEL.G.phase === 'ebb'"): break
        await pg.evaluate("INSEL.applySkip('T30')"); await pg.wait_for_timeout(3500)
        for _ in range(10): await pg.evaluate(CL); await pg.wait_for_timeout(120)
        print('1 · the world APIs the hub relies on')
        r = await pg.evaluate("""(() => { const need = { strand: ['kannWechseln', 'gezeigt', 'tag', 'welle', 'gruen', 'gruenSetzen', 'zustand', 'zustandJetzt', 'laden', 'bilanz', 'flut', 'kampf', 'tagOhneKampf', 'tagSetzen', 'demoEnde', 'aufTitel', 'imKampf', 'banner'],
            insel: ['kannWechseln', 'kannEnden', 'gezeigt', 'endEbb', 'zustand', 'laden', 'bilanz', 'spring', 'springNehmen', 'turm', 'kofferFaellig', 'katzeWeg', 'toast'], kampf: ['kannWechseln', 'gezeigt', 'start', 'laeuft'] }, miss = [];
          for (const w in need) for (const k of need[w]) if (typeof window[w.toUpperCase()].WELT.api[k] !== 'function') miss.push(w + '.' + k); return miss; })()""")
        check(r == [], f'every documented API function is there (missing: {r})')
        print('2 · beach → surf → beach')
        r = await pg.evaluate("""(() => { const S = STRAND.S, c = STRAND.combatCfg ? STRAND.combatCfg(null) : null; return c ? [c.stage === S.flood, c.stamMax === S.maxStamina, c.stam >= 1, JSON.stringify(c.upg) === JSON.stringify(S.upg), c.kind] : null; })()""")
        check(r is None or (r[0] and r[1] and r[2] and r[3]), f'the fight gets the stage, the stamina and the upgrades of the beach ({r})')
        r = await pg.evaluate("""(async () => { const S = STRAND.S, g0 = S.green, t0 = S.tails, fl = S.flood, ms = S.maxStamina; const p = SPIEL.surf({ stage: fl, kind: 'wave', upg: S.upg, stam: S.maxStamina, stamMax: S.maxStamina, cat: true, seen: {} });
            await new Promise(r => setTimeout(r, 800)); KAMPF.G.greenF = 40; KAMPF.G.gain.tails = 3; KAMPF.G.stam = 7; KAMPF.testEnde(true); const res = await p;
            return { win: res.win, green: res.gain.green, tails: res.gain.tails, stam: res.stam, keys: ['win', 't', 'kills', 'total', 'gain', 'stam', 'seen', 'bossDown'].filter(k => !(k in res)) }; })()""")
        check(r['win'] and r['green'] == 40 and r['tails'] == 3 and r['stam'] == 7 and r['keys'] == [], f'the surf returns win, haul, stamina and what was seen ({r})')
        print('3 · one stock of green and of spring hours')
        r = await pg.evaluate("""(() => { const a = STRAND.WELT.api, g0 = a.gruen(); a.gruenSetzen(g0 + 5); const g1 = STRAND.S.green; a.gruenSetzen(g0); const G = INSEL.G, s0 = G.spring, i = INSEL.WELT.api; const had = i.spring(); const took = i.springNehmen(1); const s1 = G.spring; G.spring = s0; return [g1 - g0, had, took, s0 - s1]; })()""")
        check(r[0] == 5 and (r[1] == 0 or (r[2] and r[3] == 1)), f"green set through the API is the beach's green; a spring hour taken on the beach is gone on the island ({r})")
        print('4 · a save from the middle of an ebb')
        r = await pg.evaluate("""(async () => { const G = INSEL.G, S = STRAND.S; const g0 = S.green; S.green = g0 - 11; G.gezeit = Math.max(0, G.gezeit - 3); const want = [S.green, G.gezeit, S.tide, S.maxStamina, G.tide];
            document.dispatchEvent(new Event('visibilitychange')); SPIEL.zwischenspeichern(); return want; })()""")
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200); await pg.evaluate("SPIEL.ladeAutosave()"); await pg.wait_for_timeout(3500)
        for _ in range(100):
            await pg.wait_for_timeout(200)
            if await pg.evaluate("SPIEL.inselBereit"): break
        r2 = await pg.evaluate("[STRAND.S.green, INSEL.G.gezeit, STRAND.S.tide, STRAND.S.maxStamina, INSEL.G.tide]")
        check(r == r2, f'green, island hours, beach hours, stamina and tide come back exactly ({r} → {r2})')
        print('5 · saving fails out loud; lite graphics; the back button')
        r = await pg.evaluate("""(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); }; let said = ''; const h = SPIEL.hinweis; SPIEL.hinweis = t => { said = t; };
            SPIEL.autosave(); const f1 = SPIEL.speicherFehler; SPIEL.autosave(); Storage.prototype.setItem = o; SPIEL.hinweis = h; SPIEL.autosave(); return [f1, said.slice(0, 16), SPIEL.speicherFehler]; })()""")
        check(r[0] is True and r[1].startswith('⚠ Saving failed') and r[2] is False, f'a failed write warns once and clears when saving works again ({r})')
        r = await pg.evaluate("[SPIEL.gfx(), SPIEL.gfxWeiter(), SPIEL.istLite(), SPIEL.gfxWeiter(), SPIEL.istLite(), SPIEL.gfxWeiter(), !!document.getElementById('bGfx')]")
        check(r == ['auto', 'lite', True, 'full', False, 'auto', True], f'graphics: auto → lite → full → auto, with a button in the island menu ({r})')
        r = await pg.evaluate("""(async () => { let said = ''; const h = SPIEL.hinweis; SPIEL.hinweis = t => { said = t; }; const len0 = history.length; window.dispatchEvent(new PopStateEvent('popstate')); await new Promise(r => setTimeout(r, 50)); SPIEL.hinweis = h; return [said.slice(0, 24), location.href.length > 0]; })()""")
        check(r[0].startswith('Back again to leave'), f'back: first press saves and warns instead of leaving ({r})')
        check(not errs, f'no page errors ({errs[:3]})')
        await br.close()
    print('RESULT:', 'all ok' if not FAIL else f'{len(FAIL)} FAILED'); sys.exit(1 if FAIL else 0)
asyncio.run(main())
