# v069 review: the main game on an emulated Android phone (Pixel 7, Chromium, touch) — layout, touch targets, small print,
# touch input in the surf, storage denied (as on a content:// page), what a killed tab loses, save size, frame cost under a 4× slower CPU.
# It reports numbers (REPORT lines) and fails only on hard errors. Run after build:  python3 -u test_android.py
import asyncio, glob, re, os, sys, json
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
FILE = max(glob.glob(os.path.join(HERE, '..', 'robinson_v*.html')), key=lambda f: int(re.findall(r'v(\d+)', f)[-1]))
SHOTS = os.environ.get('SHOTS'); FAIL = []; REP = {}
def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok: FAIL.append(what)
def report(k, v): REP[k] = v; print('  REPORT', k, '=', json.dumps(v)[:600])
AUDIT = """(rootSel) => { const root = document.querySelector(rootSel) || document.body, vw = innerWidth, vh = innerHeight, small = [], off = [], tiny = new Map();
  const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const shown = e => { for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden') return false; } return true; };
  root.querySelectorAll('button, [role=button], select, input, a, .btn').forEach(e => { if (!shown(e) || !vis(e)) return; const r = e.getBoundingClientRect(), name = (e.id || e.className || e.tagName) + ':' + (e.textContent || '').trim().slice(0, 18);
    if (Math.min(r.width, r.height) < 40) small.push(name + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (r.right > vw + 2 || r.bottom > vh + 2 || r.left < -2 || r.top < -2) off.push(name); });
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = n.textContent.trim(); if (t.length < 4) continue; const e = n.parentElement; if (!e || !shown(e) || !vis(e)) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 12) tiny.set(Math.round(fs * 10) / 10, (tiny.get(Math.round(fs * 10) / 10) || 0) + 1); }
  return { small: small.slice(0, 14), nSmall: small.length, off: off.slice(0, 8), tiny: [...tiny.entries()].sort((a, b) => a[0] - b[0]), scrollW: document.documentElement.scrollWidth, vw }; }"""
TIME = """(world) => new Promise(res => { const W = window[world], f0 = W.frame, t = []; W.frame = function (now) { const a = performance.now(); f0(now); t.push(performance.now() - a); };
  let n0 = performance.now(), frames = 0; const tick = () => { frames++; if (performance.now() - n0 < 3000) requestAnimationFrame(tick); else { W.frame = f0; t.sort((x, y) => x - y); res({ fps: Math.round(frames / 3), ms: +(t.reduce((x, y) => x + y, 0) / Math.max(1, t.length)).toFixed(1), p95: +(t[Math.floor(t.length * 0.95)] || 0).toFixed(1), n: t.length }); } }; requestAnimationFrame(tick); })"""

async def boot(ctx, init=None):
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    if init: await pg.add_init_script(init)
    await pg.goto('file://' + FILE); await pg.wait_for_timeout(1500); return pg, errs

async def main():
    print('file:', FILE.split('/')[-1])
    async with async_playwright() as p:
        br = await p.chromium.launch(); dev = p.devices['Pixel 7']
        land = dict(dev); land['viewport'] = {'width': dev['viewport']['height'], 'height': dev['viewport']['width']}
        for name, d in [('portrait', dev), ('landscape', land)]:
            print(f'1 · {name}: title, beach, island — layout, touch targets, small print')
            ctx = await br.new_context(**d); pg, errs = await boot(ctx)
            await pg.evaluate("localStorage.clear(); localStorage.setItem('robinson_beach_mode', 'real'); localStorage.setItem('robinson_tutorials', 'off')"); await pg.goto('file://' + FILE); await pg.wait_for_timeout(1500)
            a = await pg.evaluate(AUDIT, '#overlay'); report(f'{name}.title', a)
            check(a['scrollW'] <= a['vw'] + 1 and not a['off'], f'{name}: the title fits the screen, nothing off-screen')
            if SHOTS: await pg.screenshot(path=f'{SHOTS}/a_{name}_title.png')
            await pg.evaluate("STRAND.applyCheckpoint('T14')"); await pg.wait_for_timeout(1800)
            a = await pg.evaluate(AUDIT, '#strand'); report(f'{name}.beach', a)
            if SHOTS: await pg.screenshot(path=f'{SHOTS}/a_{name}_beach.png')
            await pg.evaluate("SPIEL.zeige('insel', { force: true }); 0")
            for _ in range(100):
                await pg.wait_for_timeout(200)
                if await pg.evaluate("SPIEL.inselBereit && INSEL.G.phase === 'ebb'"): break
            await pg.evaluate("INSEL.applySkip('T40')"); await pg.wait_for_timeout(3500)
            for _ in range(10):
                await pg.evaluate("""(() => { const r = document.getElementById('insel'), v = id => { const e = r.querySelector('#' + id); return e && e.style.display === 'flex'; }; if (v('prio')) { r.querySelector('#pBtn').click(); r.querySelector('#pBtn').click(); } if (v('card')) r.querySelector('#cardBtn').click(); return 1; })()"""); await pg.wait_for_timeout(150)
            a = await pg.evaluate(AUDIT, '#insel'); report(f'{name}.island', a)
            if SHOTS: await pg.screenshot(path=f'{SHOTS}/a_{name}_island.png')
            check(not errs, f'{name}: no page errors ({errs[:2]})')
            if name == 'portrait':
                print('2 · save: size, and what a killed tab loses in the middle of an ebb')
                r = await pg.evaluate("""(() => { SPIEL.autosave(); const t = localStorage.getItem('robinson_save_v1') || ''; const rows = t.split('\\n').length - 1; let all = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); all += k.length + (localStorage.getItem(k) || '').length; } return { saveKB: Math.round(t.length / 1024), rows, allKB: Math.round(all / 1024) }; })()""")
                report('save', r)
                r = await pg.evaluate("""(() => { const S = STRAND.S, g0 = S.green; S.green = g0 + 777; return [g0, S.green]; })()""")
                await pg.goto('file://' + FILE); await pg.wait_for_timeout(1500)
                r2 = await pg.evaluate("(async () => { await SPIEL.ladeAutosave(); return STRAND.S.green; })()")
                report('killedTab', {'greenBefore': r[0], 'greenChangedTo': r[1], 'afterReload': r2, 'lost': r2 != r[1]})
            await ctx.close()

        print('3 · storage denied (a downloaded file opened as content:// on Android has no localStorage)')
        ctx = await br.new_context(**dev)
        pg, errs = await boot(ctx, "Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } });")
        r = await pg.evaluate("(() => { try { STRAND.applyCheckpoint('T12'); return 'ok'; } catch (e) { return String(e); } })()"); await pg.wait_for_timeout(1500)
        r2 = await pg.evaluate("(() => { try { SPIEL.autosave(); return [STRAND.S.day, SPIEL.autosaveInfo()]; } catch (e) { return String(e); } })()")
        report('storageDenied', {'start': r, 'state': r2, 'errors': errs[:3]})
        check(r == 'ok' and not errs, f'without localStorage the game still starts and plays (nothing is kept) ({errs[:2]})')
        await ctx.close()

        print('4 · touch in the surf: left half = A, right half = D, two fingers at once')
        ctx = await br.new_context(**dev); pg, errs = await boot(ctx)
        await pg.evaluate("localStorage.setItem('robinson_tutorials', 'off'); window._r = null; SPIEL.surf({ stage: 12, kind: 'wave', upg: { dmg: 3, speed: 3, splash: 2, glide: 1 }, stam: 30, stamMax: 30, cat: true, seen: {} }).then(r => window._r = r); 1")
        await pg.wait_for_timeout(1500); vp = dev['viewport']
        j0 = await pg.evaluate("[KAMPF.G.C.jumps, KAMPF.G.C.cycles]")
        await pg.touchscreen.tap(vp['width'] * 0.8, vp['height'] * 0.6); await pg.wait_for_timeout(400)
        for _ in range(40):
            if not await pg.evaluate('KAMPF.G.air'): break
            await pg.wait_for_timeout(100)
        await pg.touchscreen.tap(vp['width'] * 0.2, vp['height'] * 0.6); await pg.wait_for_timeout(400)
        j1 = await pg.evaluate("[KAMPF.G.C.jumps, KAMPF.G.C.cycles]")
        check(j1[0] > j0[0] and j1[1] > j0[1], f'a tap right jumps (D), a tap left starts the wave cycle (A) ({j0} → {j1})')
        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 60, 'y': 500, 'id': 1}]}); await pg.wait_for_timeout(120)
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 60, 'y': 500, 'id': 1}, {'x': 350, 'y': 500, 'id': 2}]}); await pg.wait_for_timeout(120)
        both = await pg.evaluate("[KAMPF.IN.a, KAMPF.IN.d]")
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); await pg.wait_for_timeout(120)
        none = await pg.evaluate("[KAMPF.IN.a, KAMPF.IN.d]")
        check(both == [True, True] and none == [False, False], f'two fingers: A and D held together, both released ({both} → {none})')
        r = await pg.evaluate("(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); const p = KAMPF.paused; delete document.hidden; return p; })()")
        check(r is True, 'the surf pauses when the app goes to the background')
        check(not errs, f'no page errors in the surf ({errs[:2]})')

        print('5 · frame cost with a 4× slower CPU (emulation; a real phone draws on its GPU, so read the numbers against each other)')
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        await pg.evaluate("KAMPF.paused = false; 1"); await pg.touchscreen.tap(200, 500); await pg.wait_for_timeout(400)
        report('cost.surf12', await pg.evaluate(TIME, 'KAMPF'))
        await pg.evaluate("window._r = null; SPIEL.surf({ stage: 27, kind: 'wave', upg: { dmg: 5, speed: 4, splash: 3, glide: 1, flame: 1 }, stam: 60, stamMax: 60, cat: true, seen: {} }).then(r => window._r = r); KAMPF.P.godMode = true; 1"); await pg.wait_for_timeout(6000)
        report('cost.surf27', await pg.evaluate(TIME, 'KAMPF'))
        await pg.evaluate("KAMPF.G.mons = []; KAMPF.G.cyc = null; KAMPF.G.air = false; KAMPF.startBarrel(); KAMPF.G.barrel.ph = 'enter'; KAMPF.G.barrel.t = 9; 1"); await pg.wait_for_timeout(2500)
        report('cost.barrel', await pg.evaluate(TIME, 'KAMPF'))
        report('barrelPhase', await pg.evaluate("KAMPF.G.barrel ? KAMPF.G.barrel.ph : 'none'"))
        await pg.evaluate("KAMPF.P.godMode = false; KAMPF.testEnde(true); 1"); await pg.wait_for_timeout(4500)
        await pg.evaluate("STRAND.applyCheckpoint('T14')"); await pg.wait_for_timeout(2500)
        report('cost.beach', await pg.evaluate(TIME, 'STRAND'))
        await pg.evaluate("SPIEL.zeige('insel', { force: true }); 0")
        for _ in range(150):
            await pg.wait_for_timeout(200)
            if await pg.evaluate("SPIEL.inselBereit && INSEL.G.phase === 'ebb'"): break
        await pg.evaluate("INSEL.applySkip('T40')"); await pg.wait_for_timeout(9000)
        for _ in range(10):
            await pg.evaluate("""(() => { const r = document.getElementById('insel'), v = id => { const e = r.querySelector('#' + id); return e && e.style.display === 'flex'; }; if (v('prio')) { r.querySelector('#pBtn').click(); r.querySelector('#pBtn').click(); } if (v('card')) r.querySelector('#cardBtn').click(); return 1; })()"""); await pg.wait_for_timeout(300)
        report('cost.island', await pg.evaluate(TIME, 'INSEL'))
        check(not errs, f'no page errors ({errs[:2]})')
        await br.close()
    json.dump(REP, open(os.path.join(HERE, '..', 'android_report.json'), 'w'), indent=1)
    print('RESULT:', 'all ok' if not FAIL else f'{len(FAIL)} FAILED'); sys.exit(1 if FAIL else 0)
asyncio.run(main())
