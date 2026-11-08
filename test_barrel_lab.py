# v067: the barrel workbench (builds/barrel_lab.html): every way out plays through on its own, in both views, from every start point.
# Run after build:  python3 -u test_barrel_lab.py
import asyncio, os, sys
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); FILE = os.path.join(HERE, 'builds', 'barrel_lab.html'); FAIL = []
def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok: FAIL.append(what)
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + FILE); await pg.wait_for_timeout(1500)
        await pg.evaluate("KAMPF.running = false; KAMPF.LAB.loop = false; window.RUN = (mode, from, view) => { KAMPF.BRL.view = view; KAMPF.LAB.mode = mode; KAMPF.LAB.from = from; KAMPF.labGo(); KAMPF.running = false; const seen = new Set(); let kind = null;"
                          " for (let i = 0; i < 60 * 26 && !kind; i++) { KAMPF.update(1 / 60); const B = KAMPF.G.barrel; if (B) { seen.add(B.ph); if (B.kind) kind = B.kind; } } return [kind, [...seen].join(',')]; }; 1")
        check(await pg.evaluate("!!document.getElementById('blab') && document.getElementById('overlay').style.display === 'none'"), 'the workbench panel is there, the title screen is gone')
        for view in ['side', 'behind']:
            for mode, want in [('spit', 'spit'), ('early', 'fat'), ('late', 'wake'), ('asky', 'fat')]:
                r = await pg.evaluate(f"RUN('{mode}', 'roll', '{view}')")
                check(r[0] == want and 'enter' in r[1] and 'in' in r[1] and 'sky' in r[1] or (mode == 'asky' and r[0] == want), f'{view} · {mode}: from the roll-in to the way out → {r[0]} ({r[1]})')
            for frm in ['ride', 'open', 'exit']:
                r = await pg.evaluate(f"RUN('spit', '{frm}', '{view}')")
                check(r[0] == 'spit', f'{view} · start at {frm} → {r[0]} ({r[1]})')
        r = await pg.evaluate("KAMPF.LAB.mons = false; (() => { KAMPF.BRL.view = 'side'; KAMPF.LAB.mode = 'manual'; KAMPF.LAB.from = 'ride'; KAMPF.labGo(); KAMPF.running = false; let n = 0; for (let i = 0; i < 60 * 6; i++) { KAMPF.update(1 / 60); const B = KAMPF.G.barrel; if (B && B.mons) n = Math.max(n, B.mons.length); } return n; })()")
        check(r == 0, f'monsters off: nothing spirals out of the eye ({r})')
        check(not errs, f'no page errors ({errs[:3]})')
        await br.close()
    print('RESULT:', 'all ok' if not FAIL else f'{len(FAIL)} FAILED'); sys.exit(1 if FAIL else 0)
asyncio.run(main())
