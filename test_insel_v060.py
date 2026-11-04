# v060: the real flow — walk to the banyan, listen (= the friendship), plant, a real flood; save repair; burn hits nests;
# readable save; beach walking with tides spent; Lap Cat stays; one tortoise line per tide; glider explained at the fight.
# Run after build:  python3 -u test_insel_v060.py
import asyncio, glob, re, os, sys
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
FILE = max(glob.glob(os.path.join(HERE, '..', 'robinson_v*.html')), key=lambda f: int(re.findall(r'v(\d+)', f)[-1]))
FAIL = []
def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok: FAIL.append(what)
CLOSE = """() => { const r = document.getElementById('insel'), v = id => { const e = r.querySelector('#' + id); return e && e.style.display === 'flex'; };
  if (v('prio')) { r.querySelector('#pBtn').click(); r.querySelector('#pBtn').click(); } if (v('card')) r.querySelector('#cardBtn').click();
  if (STRAND.el.result.style.display === 'flex') STRAND.el.resBtn.click(); if (SPIEL.aktiv === 'kampf' && KAMPF.running) KAMPF.testEnde(true); return 1; }"""

async def flood(pg):
    t0 = await pg.evaluate("INSEL.G.tide"); await pg.evaluate("SPIEL.endEbb(); 1")
    for _ in range(300):
        await pg.wait_for_timeout(150); await pg.evaluate(CLOSE)
        if await pg.evaluate(f"INSEL.G.phase === 'ebb' && !SPIEL.flutLaeuft && INSEL.G.tide > {t0}"): return True
    return False

async def main():
    print('file:', FILE.split('/')[-1])
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200)
        await pg.evaluate("localStorage.clear(); localStorage.setItem('robinson_beach_mode', 'real')")
        await pg.evaluate("STRAND.applyCheckpoint('T14'); 0"); await pg.wait_for_timeout(2000)
        await pg.evaluate("SPIEL.zeige('insel', { force: true }); 0")
        for _ in range(100):
            await pg.wait_for_timeout(200)
            if await pg.evaluate("SPIEL.inselBereit && !!INSEL.G.frisch && INSEL.G.phase === 'ebb'"): break
        for _ in range(8): await pg.evaluate(CLOSE); await pg.wait_for_timeout(200)
        print('1 · walk to the banyan and listen: that is the friendship')
        r = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T; G.gezeit = 30; let n = 0;
          while (G.at !== G.banyan && n++ < 30) { const p = INSEL.landPath(G.at, G.banyan); if (!T[G.at].prot) INSEL.act('protect', G.at); INSEL.act('move', p.length > 1 ? p[1] : G.banyan); }
          if (!T[G.at].prot) INSEL.act('protect', G.at); if (G.wFree < 2) G.wFree = 2;
          G.sel = G.banyan; INSEL.renderPanel(); const b = [...document.querySelectorAll('#insel #panel button')].map(x => x.dataset.a + (x.disabled ? '(off)' : ''));
          return { at: G.at === G.banyan, friend: !!G.friends.banyan, btns: b, course: (INSEL.kurs() || {}).step }; })()""")
        check(r['at'] and not r['friend'] and 'listen' in r['btns'] and r['course'] == 'wait', f'on the banyan, not yet a friend: Listen button, course says listen ({r})')
        await pg.evaluate("document.querySelector('#insel #panel button[data-a=\"listen\"]').click()"); await pg.wait_for_timeout(500)
        r = await pg.evaluate("""(() => { const G = INSEL.G; return { friend: !!G.friends.banyan, listen: !!G.unl.listen, tree: G.banyans.includes(G.banyan), spring: G.springSrc.filter(s => s === 'banyan').length, b: INSEL.T[G.banyan].b,
          card: document.querySelector('#insel #cardT').textContent, cardOn: document.querySelector('#insel #card').style.display }; })()""")
        check(r['friend'] and r['listen'] and r['tree'] and r['spring'] == 1 and r['b'] == 0 and r['card'] == 'The banyan' and r['cardOn'] == 'flex', f'one tap: friend + Listen + living tree + spring tide, card ({r})')
        await pg.evaluate("document.querySelector('#insel #cardBtn').click()"); await pg.wait_for_timeout(500)
        check(await pg.evaluate("document.querySelector('#insel #treeScr').style.display === 'flex'"), 'the card opens the banyan screen')
        await pg.evaluate("document.querySelector('#insel #treeScr').style.display = 'none'")
        r = await pg.evaluate("(() => { const G = INSEL.G; G.sel = G.banyan; INSEL.renderPanel(); return { btns: [...document.querySelectorAll('#insel #panel button')].map(x => x.dataset.a), txt: document.querySelector('#insel #panel').innerText }; })()")
        check('openTree' in r['btns'] and 'listen' not in r['btns'] and 'Plant roots on the tiles around it' in r['txt'], f'banyan tile: Open the banyan + the planting hint ({r["btns"]})')
        print('2 · plant a root next door; a greyed button says why where it cannot')
        r = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T; G.gezeit = 30; STRAND.S.green = Math.max(STRAND.S.green, 50); INSEL.gruenKoppeln && INSEL.gruenKoppeln();
          const nb = [...T[G.banyan].nb].filter(n => T[n].reg !== 5 && n !== G.cave && T[n].state > 0); const bad = nb.find(n => T[n].b >= 2), ok = nb.find(n => T[n].b < 2 && !T[n].source);
          let why = null; if (bad !== undefined) { INSEL.act('move', bad); G.sel = bad; INSEL.renderPanel(); const b = document.querySelector('#insel #panel button[data-a="nourish"]'); why = b ? (b.disabled ? b.innerText : 'enabled?') : 'none'; INSEL.act('move', G.banyan); }
          else { const t = T[ok]; const old = t.b; t.b = 2; INSEL.act('move', ok); G.sel = ok; INSEL.renderPanel(); const b = document.querySelector('#insel #panel button[data-a="nourish"]'); why = b ? (b.disabled ? b.innerText : 'enabled?') : 'none'; t.b = old; INSEL.act('move', G.banyan); }
          INSEL.act('move', ok); const r0 = T[ok].rooted; INSEL.act('nourish', ok); return { why, before: r0, after: T[ok].rooted, canSay: INSEL.canGrowTo(T[ok]) }; })()""")
        check(r['why'] and 'too much rot' in r['why'] and not r['before'] and r['after'], f'greyed with the reason on rot 2, root planted next door ({r})')
        print('3 · a real flood: the banyan drinks')
        s0 = await pg.evaluate("INSEL.G.sap || 0")
        check(await flood(pg), 'the flood runs through')
        r = await pg.evaluate("({ sap: INSEL.G.sap || 0, last: INSEL.G.lastSap, friend: !!INSEL.G.friends.banyan, tree: INSEL.G.banyans.includes(INSEL.G.banyan), over: !!INSEL.G.over })")
        check(r['friend'] and r['tree'] and (r['last'] or 0) > 0 and not r['over'], f'sap after the flood ({r}, before {s0})')
        print('4 · the course points with a green arrow')
        check(await pg.evaluate("(() => { INSEL.kurs(); return INSEL.G.kursZ >= 0 || !!INSEL.G.flags.kursAus; })()"), 'the arrow has a target while the course runs')
        print('5 · repair of a v059 save: friend, but not a living tree')
        r = await pg.evaluate("""(() => { const st = SPIEL.zustand(); const G = st.m.G; G.banyans = G.banyans.filter(b => b !== G.banyan); G.springSrc = G.springSrc.filter(s => s !== 'banyan'); G.springMax--; G.unl.listen = true; G.friends.banyan = true;
          const sm = G.springMax; return SPIEL.laden(st).then(() => ({ tree: INSEL.G.banyans.includes(INSEL.G.banyan), spring: INSEL.G.springMax === sm + 1, src: INSEL.G.springSrc.includes('banyan') })); })()""")
        check(r['tree'] and r['spring'] and r['src'], f'loading puts the banyan back among the living trees, with its spring tide ({r})')
        for _ in range(6): await pg.evaluate(CLOSE); await pg.wait_for_timeout(200)
        print('6 · a burn hits the nests that feed the banyan')
        r = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T, d = INSEL.bfsFrom(G.banyan); let nest = T.find(t => t.source === 'nest' && d[t.id] <= 2);
          if (!nest) { nest = T.find(t => d[t.id] === 2 && t.reg !== 5); nest.source = 'nest'; } nest.b = 3; G.blevel = 3; T[G.banyan].b = 3;
          const p = INSEL.treeBurn(G.banyan); return new Promise(res => { const w = () => { const c = document.querySelector('#insel #card'); if (c.style.display === 'flex') { document.querySelector('#insel #cardBtn').click(); } setTimeout(() => res({ nest: nest.b, lvl: G.blevel, b: T[G.banyan].b }), 300); }; setTimeout(w, 3800); }); })()""")
        check(r['nest'] == 2 and r['lvl'] == 1 and r['b'] == 1, f'banyan burns two rings, the nest within two steps loses one ({r})')
        print('7 · the save is readable')
        await pg.evaluate("SPIEL.autosave()")
        t = await pg.evaluate("SPIEL.logText()")
        last = [l for l in t.split('\n') if l.strip()][-1]
        check('{"v":' in last, 'the state column is plain JSON')
        r = await pg.evaluate("t => { const p = SPIEL.RSAVE.pick(t, 'game'); return !!(p && p.st && p.st.m && p.st.b); }", t)
        check(r, 'the readable save picks and decodes')
        print('8 · beach: walking with the tides spent; Lap Cat stays; one tortoise line per tide; the glider waits for the fight')
        await pg.evaluate("SPIEL.zeige('strand', { force: true }); 0"); await pg.wait_for_timeout(800)
        r = await pg.evaluate("""(() => { const S = STRAND.S; S.spent = true; S.busy = true; S.cr.fx = .3; S.keys.d = true; return new Promise(res => setTimeout(() => { S.keys.d = false; res(S.cr.fx); }, 600)); })()""")
        check(r > .32, f'he walks with the tides spent (fx {r:.3f})')
        r = await pg.evaluate("""(() => { const S = STRAND.S; S.tails = 0; S.seen.fish = false; S.tailsSeen = false; S.upg.catDive = 1; S.upg.lapcat = 0; const u = STRAND.UPGRADES.find(x => x.id === 'lapcat'); return STRAND.upgVisible(u); })()""")
        check(r, 'Lap Cat still shows after Fishing Dive took the last tail')
        r = await pg.evaluate("""(() => { const S = STRAND.S, u = id => STRAND.UPGRADES.find(x => x.id === id); return { board: u('catBoard').base, void: u('void').base }; })()""")
        check(r['board'] == 13 and r['void'] == 8, f'Her Own Board and VOID dearer ({r})')
        r = await pg.evaluate("""(() => { const S = STRAND.S; S.upg.glide = 0; STRAND.giftNow('glide', true); return { later: S.giftLater, now: S.pendingGift || null }; })()""")
        check(r['later'] == 'glide' and r['now'] != 'glide', f'the glider is explained at the next fight, not at the ebb ({r})')
        check(await pg.evaluate("KAMPF.stageTime(11) === 75 && KAMPF.stageTime(4) === 64.5"), 'late stages grow half as fast')
        check(not errs, f'no page errors ({errs[:3]})')
        await br.close()
    print('RESULT:', 'all ok' if not FAIL else f'{len(FAIL)} failed'); sys.exit(1 if FAIL else 0)
asyncio.run(main())
