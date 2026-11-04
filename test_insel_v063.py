# v063: roots start at 1 and wither for a whole flood; trebuchets load/fire (no cap), towers behind the front (range 2),
# nothing on the steep flanks; supply drops every 10 tides (+1 spearhead per network, a scene); +1 Wandel for a held strike
# with Robinson there; radio replies instead of the wipe; Gold can lose (odds from upgrades); the tile screen splits
# Bad Omen and Overflow; the old UI stays hidden behind screens; T40 shortcut; the logbook keeps the new tile fields.
# Run after build:  python3 -u test_insel_v063.py
import asyncio, glob, re, os, sys, json
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
FILE = max(glob.glob(os.path.join(HERE, '..', 'robinson_v*.html')), key=lambda f: int(re.findall(r'v(\d+)', f)[-1]))
FAIL = []
def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok: FAIL.append(what)
CLOSE = """() => { const r = document.getElementById('insel'), v = id => { const e = r.querySelector('#' + id); return e && e.style.display === 'flex'; };
  if (v('prio')) { r.querySelector('#pBtn').click(); r.querySelector('#pBtn').click(); } if (v('card')) r.querySelector('#cardBtn').click();
  if (STRAND.el.result.style.display === 'flex') STRAND.el.resBtn.click(); return 1; }"""

async def main():
    print('file:', FILE.split('/')[-1])
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200)
        await pg.evaluate("localStorage.clear(); localStorage.setItem('robinson_beach_mode', 'real'); localStorage.setItem('robinson_tutorials', 'off')")
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200)
        await pg.evaluate("STRAND.applyCheckpoint('T14')"); await pg.wait_for_timeout(1500)
        await pg.evaluate("SPIEL.zeige('insel', { force: true }); 0")
        for _ in range(100):
            await pg.wait_for_timeout(200)
            if await pg.evaluate("SPIEL.inselBereit && INSEL.G.phase === 'ebb'"): break
        await pg.evaluate("INSEL.applySkip('T40')"); await pg.wait_for_timeout(3500)
        for _ in range(10): await pg.evaluate(CLOSE); await pg.wait_for_timeout(150)
        print('1 · the T40 shortcut (Jan\'s v062 run); the old wipe is withdrawn')
        r = await pg.evaluate("[INSEL.G.tide, STRAND.S.day, INSEL.G.fiWipe === undefined, Object.keys(INSEL.PET_CODES).join()]")
        check(r[0] == 40 and r[1] == 40 and r[2] and r[3] == 'T20,T30,T40,T51', f'T40 loads tide 40, no wipe pending, island codes T20/T30/T40/T51 ({r})')
        print('2 · roots start at 1; a withered root waits a whole flood')
        r = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T; const t = T.find(x => !x.rooted && x.reg !== 5 && x.b === 0 && !x.source && x.id !== G.cave); INSEL.setRooted(t, true); const rs = t.rs;
          INSEL.welken(t, 0, 0); const same = INSEL.welkNachwachsen(), stillWelk = t.welk && !t.rooted; [...t.nb].forEach(n => { if (T[n].reg !== 5) { T[n].rooted = true; T[n].rs = T[n].rs || 1; } });
          const same2 = INSEL.welkNachwachsen(); G.tide++; const next = INSEL.welkNachwachsen(); G.tide--; return [rs, same + same2, stillWelk, next >= 1, t.rooted, t.rs]; })()""")
        check(r[0] == 1 and r[1] == 0 and r[2] and r[3] and r[4] and r[5] == 1, f'a new root has strength 1; it does not regrow in the flood it withered, only a flood later ({r})')
        print('3 · trebuchets: load one flood, fire the next — no cap per network; towers behind the front shoot 2 far; nothing on the slopes')
        r = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T, t0 = G.tide; G.ruheBis = undefined; G.board.tr = 100;
          const front = T.filter(t => t.b >= 3 && !t.source && !t.rooted && t.reg !== 5 && !INSEL.steil(t) && INSEL.istFront(t));
          const shots = []; for (let k = 0; k < 4; k++) { G.tide = t0 + k; INSEL.planFlood(true); shots.push(front.filter(t => Object.values(G.tinfo).some(i => i.overflow && i.from === t.id)).map(t => t.id).sort()); }
          G.tide = t0; INSEL.planFlood(true);
          const slope = T.filter(t => INSEL.steil(t)), slopeArmed = slope.some(t => t.full3 !== undefined || t.trebo !== undefined);
          return { n: front.length, shots, slopeArmed, slopes: slope.length }; })()""")
        alt = all(set(r['shots'][i]) & set(r['shots'][i + 1]) == set() for i in range(3))
        check(r['n'] >= 3 and alt and max(len(x) for x in r['shots']) >= 3, f'every front trebuchet fires every second flood, and more than 2 at once ({r["n"]} at the front, shots per flood {[len(x) for x in r["shots"]]})')
        check(not r['slopeArmed'] and r['slopes'] >= 2, f'the steep flanks of Fire Mountain carry no trebuchet or tower ({r["slopes"]} slope tiles)')
        r = await pg.evaluate("""(() => { const G = INSEL.G, T = INSEL.T, t0 = G.tide, d = INSEL.distToStart();
          const t = T.find(x => x.reg !== 5 && !x.source && !INSEL.steil(x) && x.id !== G.banyan && [...x.nb].every(n => T[n].reg === 5 || !T[n].source) && [...x.nb].some(n => [...T[n].nb].some(m => m !== x.id && T[m].reg !== 5)));
          const keep = [t, ...[...t.nb].map(n => T[n])].map(o => [o, o.b, o.rooted, o.rs, o.full3, o.turm, o.trebo]);
          [t, ...[...t.nb].map(n => T[n])].forEach(o => { if (o.reg !== 5) { o.b = 3; o.rooted = false; o.rs = 0; delete o.full3; delete o.turm; delete o.trebo; } });
          G.tide = t0; INSEL.planFlood(true); const turm0 = t.turm;
          G.tide = t0 + 3; INSEL.planFlood(true); const trebo = t.trebo, reach = INSEL.treboReich(t);
          G.tide = t0 + 4; INSEL.planFlood(true); const shot = Object.keys(G.tinfo).find(k => G.tinfo[k].overflow && G.tinfo[k].from === t.id);
          const far = shot !== undefined && ![...t.nb].includes(+shot);
          keep.forEach(([o, b, ro, rs, f3, tu, tr]) => { o.b = b; o.rooted = ro; o.rs = rs; o.full3 = f3; o.turm = tu; o.trebo = tr; if (f3 === undefined) delete o.full3; if (tu === undefined) delete o.turm; if (tr === undefined) delete o.trebo; });
          G.tide = t0; INSEL.planFlood(true); return [turm0 === t0, trebo === t0 + 3, reach, shot !== undefined, far]; })()""")
        check(r[0] and r[1] and r[2] == 2 and r[3], f'behind the front: a tower starts, stands after 3 floods, a trebuchet on top with range 2, and it fires ({r})')
        print('4 · supply drops: every 10 tides one more spearhead per network, with a scene')
        r = await pg.evaluate("[(() => { const G = INSEL.G, t = G.tide; const o = []; for (const x of [15, 20, 29, 30, 41]) { G.tide = x; o.push(INSEL.nachschub()); } G.tide = t; return o; })()]")
        check(r[0] == [0, 1, 1, 2, 3], f'0 · 1 · 1 · 2 · 3 at tides 15/20/29/30/41 ({r[0]})')
        r = await pg.evaluate("""(() => { const G = INSEL.G; G.tide = 39; G.nachLand = 0; INSEL.nextEbb(); return new Promise(res => setTimeout(() => res([G.tide, !!G.landung, G.nachLand]), 2600)); })()""")
        check(r[0] == 40 and r[1] and r[2] == 40, f'at tide 40 the Board\'s barge lands ({r})')
        await pg.wait_for_timeout(1500); await pg.screenshot(path='/tmp/claude-0/v063_landung.png')
        for _ in range(60):
            await pg.wait_for_timeout(200)
            if await pg.evaluate("document.querySelector('#insel #card').style.display === 'flex'"): break
        r = await pg.evaluate("[document.querySelector('#insel #cardT').textContent, document.querySelector('#insel #cardX') ? 1 : 1]")
        check(r[0] == 'Supplies for the rot', f'then the card explains it ({r[0]})')
        await pg.evaluate(CLOSE); await pg.wait_for_timeout(500)
        check(await pg.evaluate("!INSEL.G.landung"), 'the scene ends')
        print('5 · +1 Wandel for a strike held with Robinson on the tile')
        check(await pg.evaluate("/id === G\\.at && !G\\.below\\) \\{ addWandel\\(1\\)/.test(INSEL.endEbb.toString())"), 'the flood pays a Wandel for a held strike where he stands')
        print('6 · the radio: its own header, replies, the briefcase explains — no wipe')
        r = await pg.evaluate("""(() => { const P = INSEL.PRIO; P.q = []; P.open = null; INSEL.prio('radio', 'A PRIVATE OFFER', 'test', { must: true, urgent: true, ill: 'radio' }); const m = P.q[0]; INSEL.showPrio();
          const who = document.querySelector('#insel #pWho').textContent, cls = document.querySelector('#insel #prio').className; document.querySelector('#insel #prio').style.display = 'none'; P.open = null; return [m.radio, who, cls]; })()""")
        check(r[0] and 'INCOMING RADIO MESSAGE' in r[1] and 'radio' in r[2], f'radio windows: "+++ INCOMING RADIO MESSAGE · DECRYPTED +++" ({r[1]})')
        r = await pg.evaluate("""(() => { const P = INSEL.PRIO; P.q = []; delete INSEL.storySeen.funkMacht; INSEL.G.caseFound = true; INSEL.funkAntwort(false, 1); const seen = []; const iv = setInterval(() => { [P.open, ...P.q].forEach(m => { if (m && !seen.includes(m)) seen.push(m); }); if (P.open && P.open.done !== undefined) { document.querySelector('#insel #prio').style.display = 'none'; P.open = null; } }, 100); return new Promise(res => setTimeout(() => { clearInterval(iv); res(seen.map(m => m.title + (m.radio ? '/radio' : ''))); }, 3200)); })()""")
        check(r == ['Reply · offer declined/radio', 'Who is on the radio'], f'a first refusal: a threat on the radio, then the briefcase explains who is on that line ({r})')
        r = await pg.evaluate("""(() => { const P = INSEL.PRIO; P.q = []; INSEL.funkAntwort(true, 2); return new Promise(res => setTimeout(() => res(P.q.map(m => m.text.split('\\n')[1])), 1300)); })()""")
        check(r and r[0].startswith('Twice now'), f'a second acceptance: an even smugger reply ({r})')
        r = await pg.evaluate("(() => { const G = INSEL.G; G.board.offers = 3; INSEL.fiTips && INSEL.fiTips(); return [G.fiWipe === undefined, INSEL.fiStufe()]; })()")
        check(r[0], f'no wipe, however many offers ({r})')
        print('7 · the tile screen: Bad Omen and Overflow in their own sections; the trebuchet rolls no dice')
        r = await pg.evaluate("""(() => { const G = INSEL.G; INSEL.planFlood(true); const o = G.targets.find(id => G.tinfo[id].overflow && INSEL.T[id].state > 0), b = G.targets.find(id => !G.tinfo[id].overflow && INSEL.T[id].state > 0);
          const txt = id => { G.sel = id; INSEL.renderPanel(); return document.querySelector('#insel #panel').innerText; }; return [o !== undefined ? txt(o) : '', b !== undefined ? txt(b) : '']; })()""")
        check('Overflow · trebuchet' in r[0] and 'always lands' in r[0] and 'Odds:' not in r[0], 'overflow target: own heading, "the ball always lands", no dice odds')
        check('Bad Omen ·' in r[1] and 'Odds:' in r[1], 'Bad Omen target: own heading with the odds')
        print('8 · Gold can lose: the odds come from upgrades, the stage gap and stamina')
        r = await pg.evaluate("""(() => { const S = STRAND.S, real = SPIEL.turmStufe, rnd = Math.random; SPIEL.turmStufe = () => 2; S.auto = 'gold'; S.wins = { 20: { n: 1, green: 1000, tails: 10, rum: 2, kills: 600 } }; S.flood = 20;
          const keep = Object.assign({}, S.upg); const p0 = STRAND.goldChance(); S.flood = 22; const p2 = STRAND.goldChance(); Object.keys(S.upg).forEach(k => S.upg[k] = 0); const pWeak = STRAND.goldChance(); Object.assign(S.upg, keep); S.flood = 20;
          Math.random = () => .99; const g0 = S.green; STRAND.sweep(); const lost = !STRAND.S.autoLetzt.win; Math.random = rnd; SPIEL.turmStufe = real; S.auto = 'off'; return [p0, p2, pWeak, lost]; })()""")
        check(r[0] > r[1] > 0 and r[2] < r[0] and r[3] and r[2] >= .1 and r[0] <= .95, f'odds fall with the stage gap and weak upgrades, and a ride can be lost ({[round(x, 2) for x in r[:3]]})')
        await pg.wait_for_timeout(2500)
        print('9 · the old buttons stay hidden while the banyan screen covers the hub; the chat: briefcase left, tortoise right')
        await pg.evaluate("document.querySelector('#fiBust button[data-k=\"banyan\"]').click()"); await pg.wait_for_timeout(800)
        r = await pg.evaluate("[document.body.classList.contains('fiUI'), getComputedStyle(document.querySelector('#insel #bTree')).visibility, getComputedStyle(document.querySelector('#insel #hWp')).display]")
        check(r == [True, 'hidden', 'none'], f'no old Banyan/Memos buttons, no old Wandel bar behind the banyan screen ({r})')
        await pg.evaluate("document.querySelector('#insel #treeScr').style.display = 'none'")
        r = await pg.evaluate("""(() => { INSEL.say('briefcase', 'left'); INSEL.say('tortoise', 'right'); const ls = [...document.querySelectorAll('#insel #chatT .ln')].slice(-2); return ls.map(l => [l.className, getComputedStyle(l).marginLeft === 'auto' || parseFloat(getComputedStyle(l).marginLeft) > 20]); })()""")
        check(r[0][0] == 'ln neu lb' and not r[0][1] and r[1][0] == 'ln neu lt' and r[1][1], f'briefcase left, tortoise right, both marked as this ebb ({r})')
        print('10 · the logbook keeps towers, trebuchets and withered roots')
        r = await pg.evaluate("""(async () => { const T = INSEL.T, t = T.find(x => x.reg !== 5 && !x.source && x.b >= 3 && !x.rooted && !INSEL.steil(x) && x.turm === undefined); t.turm = 33; t.trebo = 36; t.welkSeit = 39; const txt = await SPIEL.logbuchText(); await SPIEL.logbuchLaden(txt); const u = INSEL.T[t.id]; return [u.turm, u.trebo, u.welkSeit]; })()""")
        check(r == [33, 36, 39], f'turm / trebo / welkSeit survive the logbook ({r})')
        check(not errs, f'no page errors ({errs[:3]})')
        await br.close()
    print('RESULT:', 'all ok' if not FAIL else f'{len(FAIL)} failed'); sys.exit(1 if FAIL else 0)
asyncio.run(main())
