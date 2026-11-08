# v065: the surf — poison clouds rain on a fixed stretch (out of it by the A climb and leap; much too early = rain again),
# the shield in the A leap, the flamethrower through the leap, and the BARREL from stage 25 (herald, PULL IN, the drum, the way out).
# Run after build:  python3 -u test_kampf_v065.py
import asyncio, glob, re, os, sys, json
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
FILE = max(glob.glob(os.path.join(HERE, '..', 'robinson_v*.html')), key=lambda f: int(re.findall(r'v(\d+)', f)[-1]))
SHOTS = os.environ.get('SHOTS')
FAIL = []
def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok: FAIL.append(what)
HELP = """() => { window.T65 = {
  start(stage, upg) { window._res = null; SPIEL.surf({ stage, kind: 'wave', upg: Object.assign({ dmg: 4, speed: 3, splash: 2 }, upg || {}), stam: 40, stamMax: 40, cat: false, seen: {} }).then(r => window._res = r); KAMPF.running = false;
    const G = KAMPF.G; KAMPF.LV.ei = KAMPF.LV.ev.length; KAMPF.LV.mi = KAMPF.LV.msgs.length; G.mons = []; G.bq = []; G.banner = null; G.T = 5; return 1; },
  step(sec, f) { const dt = 1 / 60; for (let i = 0; i < Math.round(sec * 60); i++) { if (f) f(i * dt); KAMPF.update(dt); } return 1; },
  calm() { const G = KAMPF.G; G.mons = []; G.inv = 0; G.ifr = 0; G.dmgAcc = 0; return 1; },
  cloud() { const G = KAMPF.G; const c = { x: KAMPF.sx(G.u) + 5, y: G.y - 74, t: 0, ph: 'warn', hit: false, cu: (G.restU || G.u) + 6, pi: 0 }; G.clouds = [c]; return c; },
  press(k) { KAMPF.IN[k] = true; KAMPF.tap(k); }, release(k) { KAMPF.IN[k] = false; }
}; return 1; }"""

async def main():
    print('file:', FILE.split('/')[-1])
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(1200)
        await pg.evaluate("localStorage.clear(); localStorage.setItem('robinson_tutorials', 'off')")
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(1500)
        await pg.evaluate(HELP)

        print('1 · the stage scripts: cloud lessons at 20 and 21, one barrel per stage from 25')
        r = await pg.evaluate("""(() => { const out = {}; for (const n of [20, 21, 22, 24, 26, 27, 28, 30]) { const st = KAMPF.stageDef({ stage: n, kind: 'wave' }), L = KAMPF.buildLevel(st, KAMPF.mulberry32(5));
          out[n] = { barrels: L.ev.filter(e => e.k === 'barrel').length, clouds: L.ev.filter(e => e.k === 'cloud').length }; }
          localStorage.setItem('robinson_tutorials', 'on'); const m = {}; for (const n of [20, 21, 27, 28]) { const L = KAMPF.buildLevel(KAMPF.stageDef({ stage: n, kind: 'wave' }), KAMPF.mulberry32(5)); m[n] = L.msgs.map(x => x.lines && x.lines[0]).join('|'); }
          localStorage.setItem('robinson_tutorials', 'off'); return { out, m }; })()""")
        o = r['out']
        check(all(o[str(n)]['barrels'] == 0 for n in [20, 21, 22, 24, 26]) and all(o[str(n)]['barrels'] == 1 for n in [27, 28, 30]), f'one barrel per stage from 27, none before ({o})')
        check('NEW: POISON CLOUDS' in r['m']['20'] and 'POISON CLOUDS' in r['m']['21'] and 'THE BARREL' in r['m']['27'] and 'THE BARREL' in r['m']['28'], f'lesson cards: clouds at 20 and 21, the barrel at 27 and 28 ({r["m"]})')

        print('2 · the poison cloud: the rain falls where he rides; the A climb and leap take him out, much too early = rain again')
        await pg.evaluate("T65.start(22)"); await pg.evaluate("T65.step(1.0)")
        async def cloud_case(pre, tap_at, key='a'):
            await pg.evaluate("T65.start(22); T65.step(2.0); T65.calm()")
            if pre is not None:
                await pg.evaluate(f"T65.press('{key}'); T65.release('{key}'); T65.step({pre})")
            r = await pg.evaluate(f"""(() => {{ const G = KAMPF.G, s0 = G.stam; const c = T65.cloud(); let tapped = {str(pre is not None).lower()};
              T65.step(3.4, t => {{ if (!tapped && {tap_at} !== null && t >= {tap_at if tap_at is not None else 0}) {{ tapped = true; T65.press('{key}'); T65.release('{key}'); }} }});
              return {{ hits: c.hits || 0, lost: s0 - G.stam }}; }})()""")
            return r
        none = await cloud_case(None, 'null')
        good = await cloud_case(None, 0.05)
        late = await cloud_case(None, 0.95)
        early = await cloud_case(1.6, 'null')
        fine = await cloud_case(0.7, 'null')
        dkey = await cloud_case(None, 0.05, 'd')
        print('    no tap', none, '· A at A!', good, '· A late', late, '· A 1.6 s early', early, '· A 0.7 s early', fine, '· D at A!', dkey)
        check(none['hits'] == 5 and none['lost'] == 6, f'no tap: all five pulses hit, the full dose (6 at stage 22) ({none})')
        check(good['hits'] == 0, f'A as it flashes: climbed back and leapt out — dry ({good})')
        check(1 <= late['hits'] < 5, f'A too late: caught by the first pulse ({late})')
        check(1 <= early['hits'] < 5, f'A much too early: back in the rain when he comes up ({early})')
        check(fine['hits'] == 0, f'A a little early (0.7 s) still counts ({fine})')
        check(dkey['hits'] >= 4, f'a D hop does not get him out of the column ({dkey})')
        r = await pg.evaluate("""(() => { const G = KAMPF.G; T65.calm(); G.clouds = []; const s = KAMPF.stageDef({ stage: 20, kind: 'wave' }); KAMPF.ST.n = 20; G.cloudTeach = false;
          const c = { x: KAMPF.sx(G.u) + 5, y: G.y - 74, t: 0, ph: 'in', hit: false }; G.clouds = [c]; T65.step(0.05); const r = [c.ph, !!c.teach, G.slow > 0]; KAMPF.ST.n = 22; G.slow = 0; G.clouds = []; return r; })()""")
        check(r == ['warn', True, False], f'stage 20/21: the first cloud teaches with a big TAP A — no slow motion ({r})')

        print('3 · the shield and the flamethrower')
        await pg.evaluate("T65.start(12, { flame: 1 })"); await pg.evaluate("T65.step(1.0)")
        r = await pg.evaluate("""(() => { const G = KAMPF.G; T65.calm(); const seen = { boom: 0, climb: 0, dashAir: 0, dive: 0 }, fl = { boom: 0, climb: 0, dashAir: 0, dive: 0 }; let shieldSeen = 0;
          const orig = KAMPF.drawShield; T65.press('a');
          T65.step(2.2, () => { const c = G.cyc; if (!c) return; const k = c.ph === 'dash' ? (G.air ? 'dashAir' : 'dive') : c.ph; seen[k]++; if (G.flameOn) fl[k]++; });
          T65.release('a'); return { seen, fl }; })()""")
        s, f = r['seen'], r['fl']
        check(s['boom'] > 0 and s['climb'] > 0 and s['dashAir'] > 0 and s['dive'] > 0, f'the A cycle runs boomerang, climb, leap, dive ({s})')
        check(f['boom'] >= s['boom'] - 1 and f['climb'] == s['climb'] and f['dashAir'] >= s['dashAir'] - 2 and f['dive'] <= 1, f'held A: the flame burns through boomerang, climb and the whole leap, and stops at the dive ({f})')
        r = await pg.evaluate("""(() => { const G = KAMPF.G; T65.calm(); const m = KAMPF.newMon('t', G.u + 30); G.mons = [m]; const s0 = G.stam; T65.press('a'); let hurtInDash = 0;
          T65.step(0.3); G.cyc && G.cyc.ph; T65.step(0.6, () => { if (G.cyc && G.cyc.ph === 'dash') { const st = G.stam; KAMPF.hurt('t', 1); if (G.stam < st) hurtInDash++; } }); T65.release('a'); return [hurtInDash]; })()""")
        check(r[0] == 0, f'nothing hurts him in the leap and the dive ({r})')
        if SHOTS:
            await pg.evaluate("""(() => { const G = KAMPF.G; T65.calm(); for (let i = 0; i < 6; i++) { const m = KAMPF.newMon('t', G.u + 60 + i * 9); G.mons.push(m); } T65.press('a'); T65.step(0.4); return 1; })()""")
            await pg.wait_for_timeout(120); await pg.screenshot(path=SHOTS + '/k_flame.png')
            await pg.evaluate("T65.step(0.25)"); await pg.wait_for_timeout(120); await pg.screenshot(path=SHOTS + '/k_shield.png'); await pg.evaluate("T65.release('a'); T65.step(1.5)")

        print('4 · the barrel: the herald, PULL IN — HOLD A, the drum, the way out')
        async def barrel_to_window():
            await pg.evaluate("T65.start(27, { flame: 1 }); T65.step(1.0); T65.calm(); KAMPF.startBarrel(); 1")
            return await pg.evaluate("""(() => { const B = KAMPF.G.barrel, K = []; T65.step(3.3, t => { if (Math.round(t * 60) % 12 === 0) K.push(+B.K.toFixed(2)); }); return { ph: B.ph, t: +B.t.toFixed(2), K }; })()""")
        r = await barrel_to_window()
        ks = r['K']; drops = sum(1 for i in range(1, len(ks) - 1) if ks[i] > ks[i - 1] and ks[i] > ks[i + 1])
        check(r['ph'] == 'herald' and drops >= 2 and max(ks) >= 2.85, f'the curl swells and falls back twice, then goes over (peaks {drops}, max {max(ks)})')
        if SHOTS: await pg.wait_for_timeout(120); await pg.screenshot(path=SHOTS + '/k_pullin.png')
        r = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel; T65.press('a'); T65.step(0.2); const mid = [B.ph, !G.cyc]; T65.step(1.2); return [mid, B.ph, !!B.scene, B.th]; })()""")
        check(r[0] == ['herald', True] and r[1] == 'in' and r[2], f'HOLD A in the window: no ordinary leap, after 0.25 s he pulls in ({r})')
        r = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel, s0 = G.stam, k0 = G.kills; T65.release('a'); let mons = 0, mus = 0, hearts = 0, shots = 0;
          T65.step(3.0, () => { mons = Math.max(mons, B.mons.filter(m => m.type !== 'm').length); mus = Math.max(mus, B.mons.filter(m => m.type === 'm').length); hearts = Math.max(hearts, B.hearts.length); shots = Math.max(shots, B.shots.length); });
          return { mons, mus, hearts, shots, kills: G.kills - k0, S: G.S }; })()""")
        check(r['mons'] > 0 and r['mus'] > 0 and r['hearts'] > 0 and r['shots'] > 0 and r['kills'] > 0, f'inside: monsters, mussels and hearts spiral out of the eye, the stamp shoots and kills ({r})')
        if SHOTS: await pg.wait_for_timeout(150); await pg.screenshot(path=SHOTS + '/k_drum.png')
        r = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel, S0 = G.S, seq = []; T65.press('a'); T65.release('a');
          T65.step(1.3, () => { const k = B.act ? B.act.k : '-'; if (seq[seq.length - 1] !== k) seq.push(k); });
          T65.press('d'); T65.release('d'); let hmax = 0; T65.step(0.7, () => { hmax = Math.max(hmax, B.h); }); return { seq, hmax: Math.round(hmax), frozen: G.S === S0 }; })()""")
        check(r['seq'][:5] == ['boom', 'climb', 'dash', 'dive', '-'] and r['hmax'] >= 30 and r['frozen'], f'A = boomerang, climb, dash, dive (short); D = a jump; the wave outside stands still ({r})')
        r = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel, D = KAMPF.drum(); B.act = null; B.h = 0; const m = KAMPF.drumMon('m', B.th - 0.15, 0.01); m.dr.t = 1; m.dr.ring = true; m.dr.th = B.th - 0.15; B.mons.push(m); const bj = G.C.bigJumps; T65.press('d'); T65.release('d'); let hmax = 0; T65.step(0.95, () => { hmax = Math.max(hmax, B.h); }); return [G.C.bigJumps - bj, Math.round(hmax), m.mode]; })()""")
        check(r[0] == 1 and r[1] > 60 and r[2] == 'dead', f'D on a mussel: the big jump ({r})')
        r = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel; T65.step(Math.max(0, 10 - B.t) + 0.6); const a = [B.ph, +B.open.toFixed(2)]; T65.step(1.0); return [a, B.ph, B.open]; })()""")
        check(r[0][0] == 'clear' and 0 < r[0][1] < 1 and r[1] == 'sky' and r[2] == 1, f'after 10 s the drum opens top right, then the sky shows ({r})')
        if SHOTS: await pg.wait_for_timeout(150); await pg.screenshot(path=SHOTS + '/k_sky.png')
        r = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel; T65.press('a'); let n = 0; while (B.scene && B.th < KAMPF.BRL.wakeA - 0.04 && n++ < 400) T65.step(1 / 60);
          const th = B.th; T65.release('a'); T65.step(1 / 60); const launch = !!B.launch; T65.step(0.65); return [B.kind, +th.toFixed(2), G.air, Math.round(G.vy), G.inv > 0, launch]; })()""")
        check(r[0] == 'spit' and r[2] and r[3] < 0 and r[4] and r[5], f'HOLD A up the wall, let go at the wake: a take-off, then SPIT! — he is thrown into the sky ({r})')
        r = await pg.evaluate("""(() => { const G = KAMPF.G; return [Math.round(KAMPF.ysAt(Math.max(3, G.u), G.S) - G.y)]; })()""")
        check(r[0] > 150, f'he flies high above the wave ({r})')
        if SHOTS: await pg.evaluate("T65.step(-0.6 + 0.01)"); await pg.wait_for_timeout(100)

        print('5 · the barrel: the misses')
        async def into_drum():
            await barrel_to_window(); await pg.evaluate("T65.press('a'); T65.step(1.4); T65.release('a'); T65.calm(); KAMPF.G.barrel.t = 9.9; T65.step(0.2); 1")
        await barrel_to_window()
        r = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel, s0 = G.stam; T65.step(1.0); return [B.ph, s0 - G.stam, G.barrel ? 1 : 0]; })()""")
        check(r[0] == 'crash' and r[1] == 6, f'no pull-in: the lip lands on him — stamina damage, then on as normal ({r})')
        await barrel_to_window()
        r = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel, s0 = G.stam; T65.press('a'); T65.release('a'); T65.step(1 / 60); const cyc = !!G.cyc; T65.step(1.0); return [cyc, B.ph, s0 - G.stam]; })()""")
        check(r[0] and r[1] == 'crash' and r[2] == 6, f'a quick tap in the window is an ordinary leap — and the lip still lands on him ({r})')
        await into_drum()
        r = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel; T65.step(1.5); T65.press('a'); let n = 0; while (B.scene && n++ < 400) T65.step(1 / 60); T65.release('a'); return [B.kind]; })()""")
        await into_drum()
        r2 = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel, s0 = G.stam; T65.step(1.5); T65.press('a'); T65.step(0.5); T65.release('a'); T65.step(1 / 60); return [B.kind, s0 - G.stam, G.air]; })()""")
        await into_drum()
        r3 = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel; T65.press('a'); T65.release('a'); const missed = B.missed; T65.step(3.0); return [missed, B.kind, B.ph]; })()""")
        await into_drum()
        r4 = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel; T65.step(4.0); return [B.kind]; })()""")
        r = await pg.evaluate("1")
        print('    held too long', r, '· let go early', r2, '· A before the sky', r3, '· never pressed', r4)
        check(r2[0] == 'fat' and r2[1] == 0 and not r2[2], f'let go too early: the wave backs off — no damage, no leap ({r2})')
        check(r3[0] and r3[1] == 'fat', f'A while the drum is still closing: an ordinary leap, the exit goes by ({r3})')
        check(r4[0] == 'fat', f'no A at all on the way out: the wave backs off ({r4})')
        r = await pg.evaluate("""(async () => { await (async () => 0)(); return 1; })()""")
        await into_drum()
        r = await pg.evaluate("""(() => { const G = KAMPF.G, B = G.barrel, s0 = G.stam; T65.step(1.5); T65.press('a'); let n = 0; while (B.scene && n++ < 400) T65.step(1 / 60); T65.release('a'); return [B.kind, s0 - G.stam]; })()""")
        check(r[0] == 'wake' and r[1] > 0, f'held too long: into the wake — stamina damage ({r})')
        r = await pg.evaluate("KAMPF.G.evlog.filter(e => e.k === 'barrel').map(e => e.what).join(',')")
        check('herald' in r and 'in' in r and 'wake' in r, f'the surf log records the barrel ({r})')
        check(not errs, f'no page errors ({errs[:3]})')
        await br.close()
    print('RESULT:', 'all ok' if not FAIL else f'{len(FAIL)} FAILED'); sys.exit(1 if FAIL else 0)
asyncio.run(main())
