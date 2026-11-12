# v058: the island's first tides — sleeping rot, the course, the Board's rescue, the way back after a loss, the cat's chase.
# Run after build:  python3 -u test_insel_v058.py
import asyncio, glob, re, os, sys
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
FILE = max(glob.glob(os.path.join(HERE, '..', 'robinson_v*.html')), key=lambda f: int(re.findall(r'v(\d+)', f)[-1]))
FAIL = []
def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok: FAIL.append(what)

async def main():
    print('file:', FILE.split('/')[-1])
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200)
        await pg.evaluate("localStorage.removeItem('robinson_save_v1'); localStorage.setItem('robinson_beach_mode', 'real'); localStorage.setItem('robinson_tutorials', 'off')")
        await pg.evaluate("STRAND.applyCheckpoint('T14')"); await pg.wait_for_timeout(2500)
        await pg.evaluate("SPIEL.zeige('insel', { force: true })")
        for _ in range(80):
            await pg.wait_for_timeout(250)
            if await pg.evaluate("SPIEL.inselBereit && INSEL.G.started !== undefined && INSEL.G.phase === 'ebb' && INSEL.G.frisch"): break
        await pg.wait_for_timeout(1500)
        await pg.evaluate("INSEL.G.started = true")
        print('1 · the fresh island is kept')
        check(await pg.evaluate("!!INSEL.G.frisch && INSEL.G.frisch.G.tide === INSEL.G.tide"), 'snapshot of the first morning')
        # v063: sections 2–3 (the course, the sleeping rot) were replaced by the v061 tutorial — tested in test_insel_v061.py
        print('4 · the cat chases rot (Rot Chaser)')
        c = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T; STRAND.S.upg.catShoo = 1; STRAND.S.tails = 12; const t = T[G.at]; t.b = 2; t.source = t.source === 'nest' ? t.source : undefined;
          const b0 = t.b; INSEL.act('shoo', G.at); return { b0, b1: t.b, tails: STRAND.S.tails, again: INSEL.katzeJagt(t) }; })()""")
        check(c['b1'] == c['b0'] - 1 and c['tails'] == 7 and not c['again'], f'−1 rot for 5 fish tails, once per ebb ({c})')
        print('5 · the Board\'s rescue')
        await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T; G.friends.banyan = true; G.blevel = 1; T[G.banyan].b = 2; T[G.banyan].nb.forEach(n => { if (T[n].reg !== 5) T[n].b = 3; }); G.flags.rettung = 0; INSEL.PRIO.q = []; STRAND.S.green = 900; STRAND.S.rum = 30; STRAND.S.tails = 20; INSEL.rettungPruefen(); })()""")
        q = await pg.evaluate("INSEL.PRIO.q.map(m => m.title)")
        check('A GENEROUS OFFER' in q, f'the memo comes ({q})')
        res = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T, m = INSEL.PRIO.q.find(x => x.title === 'A GENEROUS OFFER'); m.choices[0][1]();
          const d = INSEL.bfsFrom(G.banyan); return { green: STRAND.S.green, rum: STRAND.S.rum, tails: STRAND.S.tails, near: T.filter(t => d[t.id] <= 3 && t.reg !== 5 && t.b > (t.source === 'nest' ? 1 : 0)).length }; })()""")
        check(res['green'] <= 10 and res['rum'] <= 1 and res['tails'] <= 1 and res['near'] == 0, f'accepting costs everything and clears three tiles deep ({res})')
        check(await pg.evaluate("(() => { INSEL.PRIO.q = []; INSEL.rettungPruefen(); return INSEL.PRIO.q.length === 0; })()"), 'only once a game')
        print('6 · losing: back to the fresh island, the beach keeps everything')
        await pg.evaluate("STRAND.S.green = 444; window._up = JSON.stringify(STRAND.S.upg); window._t = INSEL.G.tide")
        await pg.evaluate("window._p = INSEL.inselVerloren(); 0"); await pg.wait_for_timeout(600)
        txt = await pg.evaluate("document.querySelector('#insel #cardT').textContent + ' | ' + document.querySelector('#insel #cardB').textContent")
        check('The island falls' in txt and 'stays' in txt, f'a card says what stays ({txt[:90]!r})')
        await pg.evaluate("document.querySelector('#insel #cardBtn').click()"); await pg.wait_for_timeout(1500)
        r = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T, F = G.frisch; return { tide: G.tide === window._t, fresh: T.every((t, i) => (F.T[i].b || 0) === (t.b || 0)), friend: !!G.friends.banyan, upg: JSON.stringify(STRAND.S.upg) === window._up, green: STRAND.S.green, phase: G.phase, over: G.over, kurs: !!INSEL.kurs() }; })()""")
        check(r['tide'] and r['fresh'] and not r['friend'] and r['upg'] and r['green'] == 444 and r['phase'] == 'ebb' and not r['over'], f'fresh island, same tide, beach untouched ({r})')
        print('7 · surf: from stage 8 a hit costs 2')
        check(await pg.evaluate("/ST\\.n >= 12 \\? 3 : ST\\.n >= 8 \\? 2 : ST\\.n >= 4 \\? 1\\.5 : 1/.test(KAMPF.hurt.toString())"), 'v070: a hit costs ×1.5 from stage 4, ×2 from 8, ×3 from 12')
        check(not errs, f'no page errors ({errs[:3]})')
        await br.close()
    print('RESULT:', 'all ok' if not FAIL else f'{len(FAIL)} failed'); sys.exit(1 if FAIL else 0)
asyncio.run(main())
