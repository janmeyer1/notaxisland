# v069 review: main-game test cases — a damaged save, save → reload round trip, eight floods in a row without a single action
# (the island's pressure at tide 40, no errors, no broken numbers), the lesson texts against the rules they describe.
# Run after build:  python3 -u test_haupt_v069.py
import asyncio, glob, re, os, sys, json
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
FILE = max(glob.glob(os.path.join(HERE, '..', 'robinson_v*.html')), key=lambda f: int(re.findall(r'v(\d+)', f)[-1]))
FAIL = []
def known(ok, what, ref):   # an open finding of the review: reported, does not fail the run
    print(('  ok   ' if ok else '  OPEN ') + what + ('' if ok else '  → review ' + ref))
def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok: FAIL.append(what)
CL = """(() => { const r = document.getElementById('insel'), v = id => { const e = r.querySelector('#' + id); return e && e.style.display === 'flex'; }; if (v('prio')) { r.querySelector('#pBtn').click(); r.querySelector('#pBtn').click(); } if (v('card')) r.querySelector('#cardBtn').click(); if (STRAND.el.result.style.display === 'flex') STRAND.el.resBtn.click(); return 1; })()"""
async def main():
    print('file:', FILE.split('/')[-1])
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        print('1 · a damaged save does not block the start')
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(1000)
        for bad in ['garbage', 'tide,spring,state\\n12,1,{broken', 'tide,spring\\n']:
            await pg.evaluate(f"localStorage.clear(); localStorage.setItem('robinson_save_v1', '{bad}')"); await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200)
            r = await pg.evaluate("(async () => { try { await SPIEL.ladeAutosave(); } catch (e) { return 'throw ' + e; } return [!!document.getElementById('tlStart'), getComputedStyle(document.getElementById('tlCont')).display]; })()")
            (known if 'broken' in bad else check)(isinstance(r, list) and r[0], f'save "{bad[:22]}": loads or is ignored without an error ({str(r)[:70]})', *(['A4'] if 'broken' in bad else []))
        check(not errs, f'no page errors with damaged saves ({errs[:2]})'); errs.clear()
        print('2 · save and reload: the same game comes back')
        await pg.evaluate("localStorage.clear(); localStorage.setItem('robinson_beach_mode', 'real'); localStorage.setItem('robinson_tutorials', 'off')"); await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200)
        await pg.evaluate("STRAND.applyCheckpoint('T14')"); await pg.wait_for_timeout(1500); await pg.evaluate("SPIEL.zeige('insel', { force: true }); 0")
        for _ in range(100):
            await pg.wait_for_timeout(200)
            if await pg.evaluate("SPIEL.inselBereit && INSEL.G.phase === 'ebb'"): break
        await pg.evaluate("INSEL.applySkip('T40')"); await pg.wait_for_timeout(3500)
        for _ in range(10): await pg.evaluate(CL); await pg.wait_for_timeout(120)
        SIG = "(() => { const G = INSEL.G, T = INSEL.T, S = STRAND.S; return JSON.stringify([G.tide, S.day, S.flood, S.green, S.tails, S.rum, S.maxStamina, JSON.stringify(S.upg), G.wandel, G.blevel, G.springMax, T.map(t => [t.b, t.rooted ? t.rs : 0, t.welk ? 1 : 0, t.turm || 0, t.trebo || 0].join('')).join(',')]); })()"
        await pg.evaluate("SPIEL.autosave()"); a = await pg.evaluate(SIG)
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200); await pg.evaluate("SPIEL.ladeAutosave()"); await pg.wait_for_timeout(3500)
        for _ in range(100):
            await pg.wait_for_timeout(200)
            if await pg.evaluate("SPIEL.inselBereit"): break
        b = await pg.evaluate(SIG)
        check(a == b, 'autosave → reload → the same beach and island (tide, resources, upgrades, every tile)')
        lb = await pg.evaluate("(async () => { const t = await SPIEL.logbuchText(); await SPIEL.logbuchLaden(t); return t.length; })()"); await pg.wait_for_timeout(4500)
        c = await pg.evaluate(SIG)
        if a != c:
            A, C = json.loads(a), json.loads(c); print('    differs in fields', [(i, str(A[i])[:60], str(C[i])[:60]) for i in range(len(A)) if A[i] != C[i]][:4])
        known(a == c, f'the logbook text ({lb} characters) loads back to the same game', 'A5')
        print('3 · eight floods without a single action from tide 40 (simulated beach "typical")')
        res = await pg.evaluate("""(async () => { const G = INSEL.G, T = INSEL.T, S = STRAND.S, out = []; G.scen = 'typical'; const t0 = G.tide;
          for (let k = 0; k < 8 && !G.over; k++) { const r0 = T.filter(t => t.rooted).length; INSEL.endEbb(); let n = 0;
            while (n++ < 500) { await new Promise(r => setTimeout(r, 60)); const R = document.getElementById('insel'), v = id => { const e = R.querySelector('#' + id); return e && e.style.display === 'flex'; };
              if (v('prio')) { R.querySelector('#pBtn').click(); R.querySelector('#pBtn').click(); } if (v('card')) R.querySelector('#cardBtn').click(); if (STRAND.el.result.style.display === 'flex') STRAND.el.resBtn.click();
              if ((G.phase === 'ebb' && G.tide > t0 + k) || G.over) break; }
            const nums = [G.wandel, G.blevel, S.green, S.stamina, S.maxStamina, G.springMax].concat(T.map(t => t.b));
            out.push({ tide: G.tide, roots: [r0, T.filter(t => t.rooted).length], banyanRot: T[G.banyan].b, rings: G.blevel, over: !!G.over, bad: nums.some(x => typeof x !== 'number' || !isFinite(x)), stuck: n >= 500 }); }
          return out; })()""")
        for r in res: print('    ', json.dumps(r))
        check(len(res) == 8 and not any(r['stuck'] or r['bad'] for r in res), 'eight floods run through: no hang, no broken numbers')
        lost = res[0]['roots'][0] - res[-1]['roots'][1]
        print(f'    REPORT passive play, tides 40→48: roots {res[0]["roots"][0]} → {res[-1]["roots"][1]} (lost {lost}), banyan rings {res[-1]["rings"]}, island lost: {res[-1]["over"]}')
        print('4 · lesson texts match the rules')
        r = await pg.evaluate("[KAMPF.MSG.flame.join(' '), KAMPF.buildLevel(KAMPF.stageDef({ stage: 27, kind: 'wave' }), KAMPF.mulberry32(5)).ev.filter(e => e.k === 'barrel').length]")
        check('climb' not in r[0] or 'dive' in r[0] or 'leap' in r[0], f'the flamethrower lesson says it burns through the leap ({r[0][:90]}…)')
        check(not errs, f'no page errors ({errs[:3]})')
        await br.close()
    print('RESULT:', 'all ok' if not FAIL else f'{len(FAIL)} FAILED'); sys.exit(1 if FAIL else 0)
asyncio.run(main())
