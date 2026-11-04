# v061: the island tutorial played through from the new cat jump T13 (right after the first boss), then the new rules:
# roots start at 2, withered roots regrow, the trebuchet, the roots' harvest, the Wandel stages, spring tides for deeds,
# the Board's rescue only at the end, offers only after the radio, one priority window per ebb, the threat level, prices
# that double, the beach tower at the start of the ebb, the readable save without doubled snapshots, the surf's new things.
# Run after build:  python3 -u test_insel_v061.py
import asyncio, glob, re, os, sys
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
FILE = max(glob.glob(os.path.join(HERE, '..', 'robinson_v*.html')), key=lambda f: int(re.findall(r'v(\d+)', f)[-1]))
FAIL = []
def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok: FAIL.append(what)
CLOSE = """() => { const r = document.getElementById('insel'), v = id => { const e = r.querySelector('#' + id); return e && e.style.display === 'flex'; }; let d = '';
  if (v('prio')) { d += 'P:' + r.querySelector('#pTitle').textContent + ';'; r.querySelector('#pBtn').click(); r.querySelector('#pBtn').click(); } if (v('card')) { d += 'C:' + r.querySelector('#cardT').textContent + ';'; r.querySelector('#cardBtn').click(); }
  if (v('treeScr')) r.querySelector('#treeScr').style.display = 'none'; const sk = document.querySelector('#strand #sketch'); if (sk && sk.style.display === 'flex') document.querySelector('#strand #skBtn').click();
  if (STRAND.el.result.style.display === 'flex') STRAND.el.resBtn.click(); if (SPIEL.aktiv === 'kampf' && KAMPF.running) KAMPF.testEnde(true); if (r.querySelector('#fight').style.display === 'flex') r.querySelector('#fGo').click(); return d; }"""
async def settle(pg, n=4):
    out = ''
    for _ in range(n): out += await pg.evaluate(CLOSE); await pg.wait_for_timeout(180)
    return out
async def flood(pg):
    t0 = await pg.evaluate("INSEL.G.tide"); await pg.evaluate("SPIEL.endEbb(); 1"); log = ''
    for _ in range(400):
        await pg.wait_for_timeout(150); log += await pg.evaluate(CLOSE)
        if await pg.evaluate(f"INSEL.G.phase === 'ebb' && !SPIEL.flutLaeuft && INSEL.G.tide > {t0}"): return log
    return log + ' !!STUCK'

async def main():
    print('file:', FILE.split('/')[-1])
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200)
        await pg.evaluate("localStorage.clear(); localStorage.setItem('robinson_beach_mode', 'real')")
        print('1 · the cat jump T13: right after the first boss, the briefcase already found on the beach')
        await pg.evaluate("STRAND.applyCheckpoint('T13'); 0"); await pg.wait_for_timeout(2000)
        check(await pg.evaluate("STRAND.S.kofferDa === true && STRAND.S.mapUnlocked && STRAND.S.giftLater === 'glide' && STRAND.S.flood === 12"), 'T13: map open, briefcase found, the glider explained at the next fight')
        await pg.evaluate("SPIEL.zeige('insel', { force: true }); 0")
        for _ in range(120):
            await pg.wait_for_timeout(200)
            if await pg.evaluate("SPIEL.inselBereit && !!INSEL.G.frisch && INSEL.G.phase === 'ebb'"): break
        await pg.wait_for_timeout(1500)
        r = await pg.evaluate("({ tut: INSEL.G.tut, k: INSEL.kurs(), case: !!INSEL.G.caseFound, targets: INSEL.G.targets.length, dens: INSEL.bossNests().length, goal: document.querySelector('#insel #hGoal').textContent })")
        check(r['tut'] == 0 and r['k'] and r['k']['hl'] == 'protect' and r['case'] and r['targets'] == 0 and r['dens'] == 0 and '1/' in r['goal'], f'the tutorial starts: protect, the briefcase came along, no strikes, no dens yet ({r["goal"]})')
        print('2 · the tutorial, played through (following the arrow)')
        quiet = True; seen = []
        for it in range(90):
            st = await pg.evaluate("({ tut: INSEL.G.tut, k: INSEL.kurs(), targets: INSEL.G.targets.length })")
            if st['tut'] == 'done': break
            k = st['k']
            if st['tut'] < 11 and st['targets'] > 0: quiet = False
            if k['step'] not in seen: seen.append(k['step'])
            a = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T, k = INSEL.kurs(); G.gezeit = Math.max(G.gezeit, 8); const z = k.ping;
              if (z >= 0 && G.at !== z) { const p = INSEL.tutPath(G.at, z); const nx = p.length > 1 ? p[1] : z; INSEL.act('move', nx); return 'move'; }
              const hl = k.hl; if (hl === 'end' || k.step === 'spill') return 'end';
              if (hl === 'burn' && SPIEL.rum() < 3) SPIEL.rumSetzen(9);
              if (hl === 'nourish' && STRAND.S.green < 20) STRAND.S.green = 200;
              if (hl === 'geckoFeed' && G.res.fruit < 4) return 'end';
              if (hl === 'gecko' && (G.res.fruit < 5 || G.res.coco < 2 || G.tide <= G.geckoFedTide)) return 'end';
              const b0 = JSON.stringify([G.tut, T[G.at].prot, T[G.at].rooted, T[G.at].b, G.friends.banyan, G.geckoFed]); INSEL.act(hl, G.at);
              return JSON.stringify([G.tut, T[G.at].prot, T[G.at].rooted, T[G.at].b, G.friends.banyan, G.geckoFed]) === b0 ? 'end' : hl; })()""")
            await settle(pg, 2)
            if a == 'end': await flood(pg); await settle(pg, 3)
        r = await pg.evaluate("({ tut: INSEL.G.tut, tide: INSEL.G.tide, dens: INSEL.bossNests().length, hidden: INSEL.bossNests().every(id => INSEL.T[id].state === 0), boss: INSEL.G.boss.revealed, spring: INSEL.G.springSrc.slice(), frischDone: INSEL.G.frisch && INSEL.G.frisch.G.tut === 'done', glimmer: !!INSEL.G.glimmer })")
        check(r['tut'] == 'done', f"tutorial finished at tide {r['tide']} · steps seen: {', '.join(seen)}")
        check(quiet, 'no strikes before the spillover step')
        check(r['dens'] == 2 and r['hidden'] and r['boss'] and r['glimmer'], f'his two dens spawn at the end — under the cloud, with a camera flight ({r})')
        check(all(x in r['spring'] for x in ['banyan', 'roots', 'gecko', 'nest2']), f"spring tides for deeds: {r['spring']}")
        check(r['frischDone'], 'the way back after a loss starts after the tutorial')
        await settle(pg, 6)
        print('3 · roots, withered roots, the trebuchet, the harvest')
        r = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T, t = T.find(x => x.state > 0 && !x.rooted && x.reg !== 5 && !x.source && x.b < 2 && INSEL.canGrowTo(x) && INSEL.rootCap(x.id) >= 2); if (!t) return { none: true };
          INSEL.setRooted(t, true); const rs = t.rs; t.rs = 1; INSEL.welken(t, 0, 0); const w = { welk: t.welk, rooted: t.rooted }; t.b = 0; const n = INSEL.welkNachwachsen(); return { rs, w, back: t.rooted && t.rs === 1 && !t.welk, n }; })()""")
        check(r.get('rs') == 2 and r['w'] == {'welk': True, 'rooted': False} and r['back'], f'a new root starts at 2; a root at 0 withers and regrows on a clean tile ({r})')
        r = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T, d = INSEL.distToStart();
          const pair = T.filter(a => a.reg !== 5 && !a.source && !a.content && a.id !== G.banyan && !G.banyans.includes(a.id)).flatMap(a => [...a.nb].filter(n => T[n].reg !== 5 && !T[n].source && T[n].b < 3 && d[n] < d[a.id] && n !== G.cave).map(n => [a.id, n]))[0]; if (!pair) return { none: true };
          const [x, y] = pair, X = T[x], Y = T[y]; X.b = 3; X.rooted = false; X.rs = 0; X.full3 = G.tide - 1; Y.rooted = true; Y.rs = 2; Y.b = 0; G.omen = null; INSEL.planFlood(true);
          const planned = !!(G.tinfo[y] && G.tinfo[y].overflow && G.tinfo[y].from === x); return { planned, aim: INSEL.treboZiel(x) === y, x, y }; })()""")
        check(r.get('planned') and r.get('aim'), f'a rootless rot-3 tile plans its trebuchet shot at the neighbour nearest the banyan, and aims there ({r})')
        r = await pg.evaluate("""(async () => { const G = INSEL.G, T = INSEL.T; const x = %d, y = %d; await INSEL.treboSchuss(x, y); const a = { rs: T[y].rs, b: T[y].b }; T[y].rooted = false; T[y].rs = 0; T[y].welk = false; await INSEL.treboSchuss(x, y); return { first: a, second: T[y].b }; })()""" % (r.get('x', 0), r.get('y', 0)))
        check(r['first'] == {'rs': 1, 'b': 0} and r['second'] == 1, f'the ball always lands: root −1 first, +1 rot only without a root ({r})')
        h = await pg.evaluate("(() => { const T = INSEL.T, f = T.find(t => t.content && t.content.res === 'fruit'); f.rooted = true; f.rs = 2; f.b = 0; f.prot = true; return INSEL.ernte(); })()")
        check(h['fruit'] >= 2, f'a protected rooted breadfruit tile harvests +2 every flood ({h})')
        print('4 · Wandel stages, spring tides, rescue, offers, messages, threat')
        r = await pg.evaluate("({ max: INSEL.G.wandelMax, notches: document.querySelectorAll('#insel #hWb .nt').length })")
        check(r['max'] == 60 and r['notches'] == 3, f'the long Wandel bar: 60, notches at 15/30/45 ({r})')
        r = await pg.evaluate("(() => { const G = INSEL.G, m = G.springMax; const ok = INSEL.springErfolg('tower'); return { up: G.springMax === m + 1, ok, flash: INSEL.tiden ? 1 : 1, banner: document.querySelector('#insel #banner').textContent }; })()")
        check(r['up'] and 'spring tide' in r['banner'], f"a deed: +1 spring tide, loud ({r['banner']})")
        r = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T; INSEL.PRIO.q = []; G.flags.rettung = 0; G.blevel = 2; T[G.banyan].b = 2; G.targets = []; INSEL.rettungPruefen(); const at2 = INSEL.PRIO.q.some(m => m.title === 'A GENEROUS OFFER');
          G.blevel = 1; INSEL.rettungPruefen(); const at1 = INSEL.PRIO.q.some(m => m.title === 'A GENEROUS OFFER'); INSEL.PRIO.q = []; T[G.banyan].b = 0; G.blevel = 3; return { at2, at1 }; })()""")
        check(not r['at2'] and r['at1'], f'the Board\'s rescue only when the next hit would end it ({r})')
        r = await pg.evaluate("""(async () => { const G = INSEL.G, B = G.board; G.flags.radio = false; B.nextOffer = G.tide; INSEL.PRIO.q = []; INSEL.PRIO.open = null; G.prioShown = 0; B.offerHeld = -1; INSEL.boardTick();
          await new Promise(r => setTimeout(r, 2900)); const before = INSEL.PRIO.q.concat(INSEL.PRIO.open ? [INSEL.PRIO.open] : []).some(m => m.title.startsWith('A PRIVATE OFFER'));
          G.flags.radio = true; G.caseFound = true; INSEL.PRIO.q = []; INSEL.PRIO.open = null; G.prioShown = 0; INSEL.boardTick(); await new Promise(r => setTimeout(r, 2900));
          const m = INSEL.PRIO.q.concat(INSEL.PRIO.open ? [INSEL.PRIO.open] : []).find(m => m.title.startsWith('A PRIVATE OFFER')); return { before, after: !!m, txt: m ? m.text.slice(0, 400) : '' }; })()""")
        check(not r['before'] and r['after'] and 'tide' not in r['txt'].split('On offer:')[1].split('.')[0], f"offers only after the radio, and never more tides ({r['txt'][r['txt'].find('On offer'):][:90]!r})")
        await settle(pg, 4)
        r = await pg.evaluate("""(() => { INSEL.PRIO.q = []; INSEL.PRIO.open = null; const G = INSEL.G; G.prioShown = 1; INSEL.prio('tortoise', 'Test A', 'a', { must: true }); const can = INSEL.prioBudget(); const st0 = G.stau || 0;
          INSEL.prio('tortoise', 'Test U', 'u', { must: true, urgent: true }); const can2 = INSEL.prioBudget(); const first = INSEL.PRIO.q[0].title; INSEL.PRIO.q = INSEL.PRIO.q.filter(m => m.title !== 'Test U'); return { can, can2, first, st0, held: INSEL.PRIO.q.length }; })()""")
        check(not r['can'] and r['can2'] and r['first'] == 'Test U', f'one priority window per ebb; an urgent one jumps the queue ({r})')
        await flood(pg); await settle(pg, 4)
        r = await pg.evaluate("({ stau: INSEL.G.stau || 0, col: INSEL.bilanz().msg_backlog })")
        check(r['stau'] >= 1 and 'held back' in r['col'], f'the backlog is logged ({r})')
        r = await pg.evaluate("(() => { const G = INSEL.G, T = INSEL.T; G.targets = []; T[G.banyan].b = 0; G.blevel = 3; const a = INSEL.threatLevel(); G.blevel = 1; T[G.banyan].b = 2; const b = INSEL.threatLevel(); T[G.banyan].b = 0; G.blevel = 3; return [a, b]; })()")
        check(r[1] == 4 and r[0] <= 2, f'the threat level: {r}')
        r = await pg.evaluate("(() => { const G = INSEL.G; G.shooTide = G.tide; G.shooN = 2; const a = INSEL.shooPreis(); G.shooTide = -1; const b = INSEL.shooPreis(); return [a, b]; })()")
        check(r == [20, 5], f'the Rot Chaser doubles its price within an ebb: {r}')
        print('5 · the beach tower at the start of the ebb, with beach tides')
        r = await pg.evaluate("""(() => { const S = STRAND.S; SPIEL.turm = () => 1; S.auto = 'silver'; S.tideMax = 6; S.stamina = 1; S.maxStamina = 20; S.palmPending = 0; S.palmMax = 3;
          const lvl = STRAND.towerLvl ? STRAND.towerLvl() : -1; STRAND.setupEbb(false); return { lvl, tide: S.tide, max: S.tideMax, txt: S.autoTxt || '', crabs: S.crabs.length }; })()""")
        check((r['lvl'] < 1) or (r['tide'] < r['max'] and 'beach tide' in r['txt']), f'the tower pays its chores with beach tides ({r})')
        print('6 · the save: readable, the island snapshot only in the newest row')
        await pg.evaluate("SPIEL.autosave()"); await flood(pg); await settle(pg, 3); await pg.evaluate("SPIEL.autosave()")
        r = await pg.evaluate("(() => { const L = SPIEL.logLesen(), withState = L.filter(r => r.state); return { rows: withState.length, frisch: withState.map(r => r.state.indexOf('\"frisch\"') >= 0) }; })()")
        check(r['rows'] >= 2 and r['frisch'][-1] and not any(r['frisch'][:-1]), f'only the newest row carries the snapshot ({r})')
        print('7 · the surf: shorter late stages, eels from 15, clouds from 20')
        r = await pg.evaluate("({ t11: KAMPF.stageTime(11), t15: KAMPF.stageTime(15) })")
        check(r['t11'] == 75 and r['t15'] == 79, f'stage times {r}')
        r = await pg.evaluate("(() => { const lv = n => KAMPF.buildLevel(KAMPF.stageDef({ stage: n, kind: 'wave', upg: {} }), KAMPF.mulberry32(3)); const k = (L, x) => L.ev.filter(e => e.k === x).length; const a = lv(14), b = lv(16), c = lv(21); return { e14: k(a, 'e'), e16: k(b, 'e'), cl16: k(b, 'cloud'), cl21: k(c, 'cloud'), kick21: k(c, 'kick') }; })()")
        check(r['e14'] == 0 and r['e16'] > 0 and r['cl16'] == 0 and r['cl21'] > 0 and r['kick21'] > 0, f'eels from 15, clouds from 20, free waves with sky rewards between the phrases ({r})')
        check(not errs, f'no page errors ({errs[:3]})')
        await br.close()
    print('RESULT:', 'all ok' if not FAIL else f'{len(FAIL)} failed'); sys.exit(1 if FAIL else 0)
asyncio.run(main())
