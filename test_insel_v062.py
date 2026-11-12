# v062: Gold sweep within 2 stages, 4+4 cat codes, calm-to-rough beach, tides reminders with rings, Dream ring, rules timing,
# signs in the first surf, briefcase in the hub from the beach, harder surf (×1.5 / ×3, eels bite, poison cloud, herald closer),
# one messenger chat, prio windows that expire or lose their moment, cat screen from title ears and intro kitten, the logbook save.
# Run after build:  python3 -u test_insel_v062.py
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
  if (STRAND.el.result.style.display === 'flex') STRAND.el.resBtn.click(); if (SPIEL.aktiv === 'kampf' && KAMPF.running) KAMPF.testEnde(true); return 1; }"""

async def fresh(pg, tut='on'):
    await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200)
    await pg.evaluate(f"localStorage.clear(); localStorage.setItem('robinson_beach_mode', 'real'); localStorage.setItem('robinson_tutorials', '{tut}')")
    await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200)

async def island(pg, code):
    await pg.evaluate("STRAND.applyCheckpoint('T14')"); await pg.wait_for_timeout(1500)
    await pg.evaluate("SPIEL.zeige('insel', { force: true }); 0")
    for _ in range(100):
        await pg.wait_for_timeout(200)
        if await pg.evaluate("SPIEL.inselBereit"): break
    await pg.evaluate(f"INSEL.applySkip('{code}')"); await pg.wait_for_timeout(3500)
    for _ in range(8): await pg.evaluate(CLOSE); await pg.wait_for_timeout(150)

async def main():
    print('file:', FILE.split('/')[-1])
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await fresh(pg)
        print('1 · the cat screen: a tap on her ears on the title; eight codes, four constellations')
        await pg.click('#ovCat'); await pg.wait_for_timeout(600)
        check(await pg.evaluate("SPIEL.katzeOffen"), 'a plain tap on the ears on the title opens her screen')
        r = await pg.evaluate("[SPIEL.katzeCodes().join(), Object.keys(STRAND.PET_CODES).join(), Object.keys(INSEL.PET_CODES).every((k, i) => { const a = INSEL.PET_CODES[k].seq, b = STRAND.PET_CODES[['T5', 'T12', 'T13', 'T14'][i]].seq; return a.length === 5 && a[2] === 'bg' && a.filter(z => z !== 'bg').join() === b.join(); })]")
        check(r[0] == 'T5,T12,T13,T14,T20,T30,T40,T51' and r[1] == 'T5,T12,T13,T14' and r[2], f'4 beach + 4 island codes, each island code = its beach constellation + the sky ({r})')
        await pg.evaluate("SPIEL.katzeZu()")
        print('2 · the intro: hold the kitten on her plank (the sea waits)')
        r = await pg.evaluate("""(() => { const o = document.getElementById('overlay'); if (o) o.remove(); STRAND.startSwim(); const s = STRAND.S.swim; s.t = 9.5; return new Promise(res => setTimeout(() => res(!!s.kitten && s.kitten.sx !== undefined), 900)); })()""")
        check(r, 'the kitten floats in on her plank and knows where she is on screen')
        k = await pg.evaluate("(() => { const s = STRAND.S.swim, c = document.querySelector('#strand canvas'), b = c.getBoundingClientRect(); return [b.left + s.kitten.sx, b.top + s.kitten.sy + STRAND.OY]; })()")
        await pg.mouse.move(k[0], k[1]); await pg.mouse.down(); await pg.wait_for_timeout(1800); await pg.mouse.up()
        t0 = await pg.evaluate("STRAND.S.swim ? STRAND.S.swim.t : -1"); await pg.wait_for_timeout(600); t1 = await pg.evaluate("STRAND.S.swim ? STRAND.S.swim.t : -1")
        check(await pg.evaluate("SPIEL.katzeOffen") and t0 == t1, f'holding her 1.5 s opens the cat screen, the swim pauses ({t0} → {t1})')
        await pg.evaluate("SPIEL.katzeZu()")
        print('3 · tide 1–2: the sea grows with the spent tides; tides told with a ring; the Dream with a ring')
        await fresh(pg)
        await pg.evaluate("STRAND.applyCheckpoint('T5')"); await pg.wait_for_timeout(1200)
        r = await pg.evaluate("(() => { const S = STRAND.S; const a = STRAND.unruhe(); S.tide = 0; const b = STRAND.unruhe(); S.tide = S.tideMax; return [a, b]; })()")
        check(r == [0, 1], f'calm at ebb start (0), the full sea when the beach tides are spent (1) ({r})')
        r = await pg.evaluate("[STRAND.LINES.tides[0], STRAND.LINES.green.join(' ')]")
        check('bottom right' in r[0] and 'up there' not in r[0] and 'bottom left' in r[1] and 'Up there' not in r[1], 'the texts say where things really are (compass bottom right, Dream bottom left)')
        r = await pg.evaluate("""(() => { const S = STRAND.S; S.seen.tides = false; S.firstGreen = false; S.green = 40; S.talkNext = []; S.day = 2; STRAND.setupEbb(false); return new Promise(res => setTimeout(() => res([document.querySelectorAll('.uiRing').length, STRAND.BQ.q.length + (STRAND.BQ.on ? 1 : 0), document.getElementById('ledgerBtn').classList.contains('tutRingB')]), 1500)); })()""")
        check(r[0] >= 1 and r[1] >= 3, f'tides explained (with the Dream lines) and a ring on the compass ({r})')
        await pg.wait_for_timeout(300); STRAND_ready = await pg.evaluate("STRAND.updateHUD(); document.querySelector('#fiBust button[data-k=\"traum\"]').classList.contains('tutRingB')")
        check(STRAND_ready, 'the Dream button wears the tutorial ring until opened')
        await pg.evaluate("document.querySelector('#fiBust button[data-k=\"traum\"]').click()"); await pg.wait_for_timeout(500); await pg.evaluate("TRAUM.zu()")
        check(not await pg.evaluate("STRAND.updateHUD(); document.querySelector('#fiBust button[data-k=\"traum\"]').classList.contains('tutRingB')"), 'opened once from the hub, the ring is gone')
        r = await pg.evaluate("""(() => { const S = STRAND.S; S.leftTides = 2; S.tidesLeftTold = 0; S.talkNext = []; S.day++; STRAND.setupEbb(false); return new Promise(res => setTimeout(() => res(document.getElementById('bubbleTxt') ? document.getElementById('bubbleTxt').textContent : STRAND.el.bubbleTxt.textContent), 1200)); })()""")
        check('2 tides' in r, f'tides left on the sand are mentioned again ({r[:70]})')
        print('4 · rules: Riding the wave from stage 2, the tower only once it stands')
        r = await pg.evaluate("(() => { const S = STRAND.S; S.flood = 1; SPIEL.regeln('surf'); const t = [...document.querySelectorAll('#rgTabs button')].map(b => b.textContent + (b.disabled ? '(off)' : '')); S.flood = 4; SPIEL.regeln('surf'); const t2 = [...document.querySelectorAll('#rgTabs button')].map(b => b.textContent + (b.disabled ? '(off)' : '')); document.getElementById('rgClose').click(); return [t, t2]; })()")
        check(any('? ? ?(off)' == x for x in r[0]) and not any('Riding' in x for x in r[0]) and any('Riding the wave' == x for x in r[1]) and not any('beach tower' in x for x in r[0] + r[1]), f'stage 1: no "Riding the wave", no tower; stage 4: riding shows ({r})')
        print('5 · the first surf: drifting signs; the wreck on the horizon; harder hits')
        r = await pg.evaluate("""(() => { KAMPF.reset({ stage: 1, kind: 'wave', upg: {}, stamMax: 10, cat: true }); const a = KAMPF.G.tafeln.length; KAMPF.G.T = 10; KAMPF.tap('d'); const b = KAMPF.G.tafeln.length; KAMPF.reset({ stage: 2, kind: 'wave', upg: {}, stamMax: 10 }); return [a, b, KAMPF.G.tafeln]; })()""")
        check(r[0] == 1 and r[1] == 2 and r[2] is None, f'stage 1 shows "Just watch and enjoy", a tap sends the second sign; stage 2 has none ({r[:2]})')
        r = await pg.evaluate("""(() => { const out = []; for (const [n, k] of [[3, 'wave'], [5, 'wave'], [9, 'wave']]) { KAMPF.reset({ stage: n, kind: k, upg: {}, stamMax: 40, stam: 40 }); const G = KAMPF.G, s0 = G.stam; G.inv = 0; G.ifr = 0; KAMPF.hurt('t'); G.ifr = 0; KAMPF.hurt('t'); out.push(s0 - G.stam); }
          KAMPF.reset({ stage: 16, kind: 'wave', upg: {}, stamMax: 40, stam: 40 }); const G = KAMPF.G, s0 = G.stam; G.inv = 0; G.ifr = 0; KAMPF.hurt('eel', 2); out.push(s0 - G.stam); return out; })()""")
        check(r == [2, 3, 4, 6], f'two hits cost 2 (stage 3), 3 (stage 5: ×1.5), 4 (stage 9: ×2 since v070; ×3 from stage 12); an eel bite at 16 costs 6 ({r})')
        r = await pg.evaluate("""(() => { KAMPF.reset({ stage: 16, kind: 'wave', upg: {}, stamMax: 40 }); const lv = KAMPF.levelInit ? null : null; const ev = KAMPF.LV.ev.filter(e => e.k === 'e').length; return [ev, KAMPF.HPB.e]; })()""")
        check(r[0] >= 6 and r[1] == 9, f'stage 16 brings schools of eels with 9 hp ({r})')
        r = await pg.evaluate("""(() => { const lead = n => { KAMPF.reset({ stage: n, kind: 'wave', upg: { cycle: 1 }, stamMax: 40 }); const G = KAMPF.G; G.mons = []; KAMPF.spawnWall({ n: 9, u: 0, f: 0 }); const h = G.mons.find(m => m.herald), w = G.mons.filter(m => m.wall && !m.herald); return Math.round(Math.min(...w.map(m => m.u)) - h.u); }; return [lead(10), lead(16), lead(22)]; })()""")
        check(r[0] > r[1] > r[2], f'the herald swims ever closer in front of the wall (gap at 10/16/22: {r})')
        print('6 · Gold: up to 2 stages past your own last ride, never a boss')
        r = await pg.evaluate("""(() => { const S = STRAND.S, real = SPIEL.turmStufe; SPIEL.turmStufe = () => 2; S.auto = 'gold'; S.wins = { 18: { n: 1, green: 100, tails: 2, rum: 1, kills: 50 } }; const out = [];
          for (const f of [18, 19, 20, 21]) { S.flood = f; out.push(STRAND.sweepable()); } SPIEL.turmStufe = real; S.auto = 'off'; return out; })()""")
        check(r == [True, True, True, False], f'stages 18–20 ride themselves after a hand win at 18; 21 is yours ({r})')
        print('7 · the briefcase from the beach sits in the hub at once')
        r = await pg.evaluate("""(() => { const S = STRAND.S; S.kofferDa = true; S.talkNext = []; STRAND.setupEbb(false); STRAND.updateHUD(); return new Promise(res => setTimeout(() => res([SPIEL.kofferStrand(), getComputedStyle(document.getElementById('fiBust')).display]), 400)); })()""")
        check(r[0] and r[1] == 'block', f'kofferStrand and the hub is shown on the beach ({r})')
        print('8 · the island: one messenger chat; windows that wait too long become pinned lines; the cutting at once')
        await fresh(pg)
        await island(pg, 'T30')
        r = await pg.evaluate("""(() => { INSEL.say('tortoise', 'Hello from the left.'); INSEL.say('briefcase', 'MEMO from the right.'); const box = document.querySelector('#insel #chatT .lines'), ls = [...box.querySelectorAll('.ln')].slice(-2);
          return [ls.map(l => l.className), getComputedStyle(document.querySelector('#insel #chatB')).display, document.querySelector('#insel #chatT .who').textContent]; })()""")
        check(r[0] == ['ln neu lt', 'ln neu lb'] and r[1] == 'none' and 'Tortoise' in r[2], f'tortoise left, briefcase right, in one window ({r})')
        r = await pg.evaluate("""(() => { const G = INSEL.G, P = INSEL.PRIO; P.q = []; P.open = null; G.prioShown = 5;
          INSEL.prio('tortoise', 'Old news', 'text', { must: true }); P.q[P.q.length - 1].t0 = G.tide - 3;
          INSEL.prio('tortoise', 'Gone already', 'text', { must: true, valid: () => false });
          INSEL.prio('tortoise', 'Fresh', 'text', { must: true }); INSEL.prioPruefen();
          const pins = [...document.querySelectorAll('#insel #chatT .ln.pin')].map(l => l.dataset.full); return [P.q.map(m => m.title), pins.slice(-1)[0]]; })()""")
        check(r[0] == ['Fresh'] and 'Old news' in (r[1] or ''), f'too old → pinned in the chat, moment passed → dropped, fresh waits ({r})')
        r = await pg.evaluate("""(() => { const G = INSEL.G, P = INSEL.PRIO; P.q = []; G.order = 'ableger'; G.blevel = 3; G.sapProd = 999; delete INSEL.storySeen.cuttingQuest; G.cutting = false; INSEL.sapPhase && INSEL.sapPhase(); const m = P.q.find(x => x.title === 'A cutting'); return [!!G.cutting, m ? m.urgent : null, document.querySelector('#insel #card').style.display]; })()""")
        check(r[0] and r[1] is True and r[2] != 'flex', f'the cutting: the window comes at once (urgent), no extra card ({r})')
        print('9 · the logbook: write, read back, a disturbed shell box is caught, numbers can be changed')
        txt = await pg.evaluate("SPIEL.logbuchText()")
        check(txt.startswith("THE TORTOISE'S LOGBOOK") and 'Tide 1. The sea spat out' in txt and 'Tide 30 — the reckoning.' in txt and 'What I saw of the island:' in txt and 'She left me a gift: a ' in txt, f'the logbook reads as a story and ends with the reckoning ({len(txt)} chars)')
        check(not re.search(r'[​-‏⁠-⁤﻿]', txt), 'no invisible characters')
        paras = txt.split('\n\n'); check(not re.search(r'\d{3,}', paras[1] + paras[2]), 'the first two paragraphs are story only')
        before = json.loads(await pg.evaluate("JSON.stringify(SPIEL.zustand().m.T.map(t => [t.state, t.b, !!t.rooted, t.rs, !!t.prot, t.source || '']))"))
        pg2 = await br.new_page(viewport={'width': 1280, 'height': 720}); pg2.on('pageerror', lambda e: errs.append('B ' + str(e)))
        await fresh(pg2, 'off')
        r = await pg2.evaluate("t => SPIEL.logbuchLaden(t).then(() => 'ok', e => 'ERR ' + e.message)", txt); await pg2.wait_for_timeout(2500)
        for _ in range(6): await pg2.evaluate(CLOSE); await pg2.wait_for_timeout(150)
        after = json.loads(await pg2.evaluate("JSON.stringify(SPIEL.zustand().m.T.map(t => [t.state, t.b, !!t.rooted, t.rs, !!t.prot, t.source || '']))"))
        v = await pg2.evaluate("[INSEL.G.tide, STRAND.S.day, STRAND.S.green, INSEL.G.blevel, INSEL.G.board.tr]")
        check(r == 'ok' and before == after and v[0] == 30 and v[1] == 30, f'read back in a fresh game (tutorials off): every tile, tide 30 ({r}, {v})')
        bad = txt.replace(', ', ', amber cowrie, ', 1) if False else re.sub(r'(exact order: )(\w+ \w+)', r'\1amber anchor', txt)
        r = await pg2.evaluate("t => SPIEL.logbuchLaden(t).then(() => 'ok', e => 'ERR ' + e.message)", bad)
        check(r.startswith('ERR') and 'gift' in r, f'a disturbed shell box is refused ({r})')
        cheat = re.sub(r'In his pockets: \d+ green hearts', 'In his pockets: 99999 green hearts', txt)
        r = await pg2.evaluate("t => SPIEL.logbuchLaden(t).then(() => STRAND.S.green, e => 'ERR ' + e.message)", cheat)
        check(r == 99999, f'the open numbers can be changed (a cheat, allowed) ({r})')
        await pg2.close()
        check(not errs, f'no page errors ({errs[:3]})')
        await br.close()
    print('RESULT:', 'all ok' if not FAIL else f'{len(FAIL)} failed'); sys.exit(1 if FAIL else 0)
asyncio.run(main())
