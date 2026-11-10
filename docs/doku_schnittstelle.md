# Robinson — Beach ↔ Island interface (after the merger, 2026-10-16)

Status: **one game, one file** — `robinson_v055.html` (v041–v055 = the surf fight, see robinson_combat_interface.md and robinson_surf_concept.md; v046 adds the surf test page `robinson_surf_test_v046.html` via `node build.mjs surf`; Phase 2 done; v031 = flat source layout; v032 = build without outside packages; v033 = save = log, save buttons in the cat window; v034 = shared cat picture, Fi, elf tree). Last separate files: beach `robinson_v023`, island `island_map_play_v025`. This page records how the two worlds share state and hand over, and where the code lives. **v041–v045 (2026-10-22): the fight is its own world — the surf (`surf.js`, world KAMPF, `SPIEL.surf`); v042 dresses it per situation and gives the cat a new job; v043 puts the beach upright and lets the tower run it (Silver / Gold); v044 = one rules screen (surf controls + island rules), S/W buttons, pause with controls; v045 = easier volleys, warning signs, half stamina after a loss, cat jumps recalibrated. v054 (2026-10-24): glider and flamethrower as island gifts, crevasses in nest and den, island fights scale with the beach stage, the surf run in the save log, "Den" instead of "cabin" in player texts, no pause in the main game. v055: rum as the fire currency, Burn for nests, tides as action points, the new hub with silhouette from tide 1, gifts announced on the beach.**

## 1. Guiding decisions
- **Beach is the main world.** The game starts on the beach. The island becomes available after the first boss and **starts the first time the player opens it** (🗺 Island). Its first tide = the beach tide at that moment (`T0`, stored as `G.t0`; old saves: 11).
- **PC-first, mobile retrofittable.** Rules that keep mobile possible later: no hover-only information, landscape layout scaled by window width, HUD/panel/chats as a separate layout layer from the game logic.
- **One tide counter, one End ebb, one save.**

## 2. The shared tide loop (implemented in v030)
1. **Low tide (ebb).** The player can switch scenes at any time during the ebb: 🗺 Island on the beach, 🏖 Beach on the island. There is no switching during a fight or a flood. Beach and island keep **separate tide pools** (beach 8, island 8 🌊). They **share ✨ spring tide**: the beach spends ✨ only once its own tide is gone. Once the island runs, the beach no longer floods by itself; when everything is spent, End ebb pulses.
2. **End ebb** (the same button in both scenes, `SPIEL.endEbb`). The game switches to the island, and its flood runs in this order:
   1. nest fight or army fight, if any;
   2. armies march;
   3. rot strikes;
   4. nests feed;
   5. banyan sap;
   6. boss tick.
3. **Beach fight** (`SPIEL.strandFlut`, called from the island's flood). The game switches to the beach for the wave. This is skipped if a nest or army fight already replaced it (`skipBeach`); the beach day still advances.
4. After the result button, the beach sets up its next ebb. The island then runs `logFlood` and `nextEbb` with the real beach result (`G.lastBeach`), and the game **autosaves**.

Before the island is opened, the beach runs exactly as before: its own flood when its tide runs out, and its own boss waves.

## 3. Shared state

| What | Source of truth | How the other world sees it |
|---|---|---|
| Tide | beach `S.day` = island `G.tide` | Both advance once per flood. Island-only loads and cat shortcuts set the beach day to the island tide (`SPIEL.tagAngleichen`). The beach wave (difficulty, `S.flood`) still rises only on a won wave. |
| 💚 | beach `S.green` | `G.res.green` is a getter/setter onto the beach stock (`gruenKoppeln`). `G.mapSpent` is kept for the log only. |
| ✨ spring | island `G.spring` / `G.springMax` | The beach calls `SPIEL.springNehmen()` and shows "+ ✨ n" in its tide box. |
| Boss | island `G.boss` | If it is ready at the boss tick, the surf run of that flood carries the First Mate in his current rank (`info.boss` = 0 / 1 / 2). v041: his surf hp = 260 / 215 / 170 × the stage factor (1 + 0.08 per stage), × 1.6 at his last stand; the island's own hp table is no longer used on the beach. `bossDown` goes back and drives `bossBeach()`. The beach's own later boss stages (30, 45, …) are off while the island runs. |
| The fight | world KAMPF (`surf.js`, v041) | The beach builds a config (`combatCfg`: kind wave / nest / cabin / army / last, stage, boss rank, army strength, elite, stamina and max, the Ledger levels, cat yes/no, seen kinds, tortoise lines) and calls `SPIEL.surf(cfg)`. The hub shows the KAMPF scene, awaits `api('kampf').start(cfg)` and switches back. The result `{ win, t, kills, total, gain: {green, tails, rum}, bossDown, eliteDown, stam, hearts, heartsAll, dia, seen, catKill }` is booked by the beach (`endCombat`), which shows its own result card and resolves `flut(info)` / `kampf(n)` as before. Tests end a run with `KAMPF.testEnde(win)`. |
| Nest / army fight | island | `SPIEL.kampf({boss, army, tower, elite, L})`. The fight window shows "⚔ To the beach"; the beach plays the fight and the result button reads "Back to the island". The result comes back as true/false. An ebb attack leaves the beach ebb as it was. |
| Tower | island `G.tower`, `G.tower2` (v043) | No more turret in fights (v041). `SPIEL.turmStufe()` = 0 / 1 / 2 decides the beach automation: the right compass wheel (`api('strand').auto()` / `autoToggle()`, state `S.auto`) cycles off → Silver (level 1: `autoChores` at the start of each flood — crabs, coconuts, pool, one bottle for the tortoise) → Gold (level 2: also `sweep()` — a stage in `S.wins` won by hand is resolved without a fight at 70 % of the average haul; never with a boss) → off. Unavailable states are skipped. The fight's `tower` flag from the island is ignored. |
| Briefcase | island `G.caseFound` | From tide `T0 + 5` it washes up on the beach as a find (`CASE_FIND` in Inhalte). Picking it up calls `caseFound()` on the island. |
| Cat | island `G.catFate` | `'gone'` ⇒ the beach has no cat: no drawing, no shadow, no petting, no cat in the surf (`cfg.cat`), no cat upgrades; the cat corner appears in the back forest (`S.katzeWeg`, checked every frame since v033). |
| End of demo | island finale | After Ferrant's call the island calls `SPIEL.demoEnde()`: the beach scene shows the title picture with the friends (`titleEnd`); KEEP PLAYING returns to the island, then free play and next morning the cat leaves. |
| Waiting island messages | island `PRIO` | The beach's 🗺 button pulses while a prio window waits on the island. |
| Gecko | island | Not on the beach yet (planned party member). |
| Cat window | hub (`spiel.js`, `KATZE`) | `SPIEL.katze({ bonus, onClose })`; jumps call `api('strand').sprung(k)` / `api('insel').sprung(k)`. |
| End ebb | hub (`spiel.js`, `KOMPASS`) | Draws from `api('strand').tiden()` / `api('insel').tiden()`, hides when `api(aktiv).modal()`, and clicks the scene's own (invisible) End-ebb button. `SPIEL.endEbb` returns to the starting scene and shows `FLUTBERICHT`. |
| Compass scene buttons | hub `KOMPASS` | v037: `#ebbIsl` / `#ebbStr` click the scenes' hidden `mapBtn` / `bBeach`; `KOMPASS.sichtbar()` is the shared rule for compass and bust. Two wheels: `#ebbAutoI` (island, grey, later) and `#ebbAutoS` (beach automation since v043: grey / Silver / Gold, one tap each). During a surf fight `knopf()` is null, so the compass hides. |
| Rules screen | hub `REGELN` (spiel.js, v044) | `SPIEL.regeln('surf' \| 'insel')`. Tab *Surf controls* is built in the hub (`surfRegeln`, unlocks from `api('strand').surfStand()`); tab *Island rules* comes from `api('insel').regeln(sel)` → `{ tabs, body, draw }` (the island's rule cards; `openRules` now only calls the hub). Beach button `#rulesBtnB`, island `#bRules`, hub spot *rules*. The island's old `#rulesScr` is unused. |
| Resource row | hub `RESS` (spiel.js, v040) | `RESS.html()` from `api('strand').ressB()` and `api('insel').ressI()`; the beach writes it into `#ressB`, the island into `#hR`. Tooltips via `title`, taps show `#ressTip`. |
| Island view | `SW × SH` (inselgenerator.js, v040) | The screen in map units at zoom 1; the map canvas fills the screen. `camClamp`, `toMap`, the frame transform and the vignette use `SW/SH`; the open sea (`drawOpenSea`, `seaSeam`) fills the rest. |
| Save guard | hub `SPIEL.autosave` | v037: no write while `SPIEL.laden` runs (`_laedt`); a row without the island never replaces the file once it holds island rows. |
| Cat picture | `titel.js` (strand world) | Both cat windows draw it and hit-test her spots via `SPIEL.katzenSzene()` → `{ draw(c, w, h, st), hit(w, h, x, y) }`. Beach codes `W6 W9 W10 MAP`; island codes = the same with `bg` in the middle (`M24 M40 M46 M51`, whole-game states in `SAVE_SKIPS`). |
| Fi / elf tree | island `G.fi`, `G.fiLook`, `G.fiWipe` (tide of the wipe memo), `G.fiAt` (tide of the change) | `SPIEL.fi()`. v037: the banyan screen always draws `ELFENBAUM` (before Fi with the island nodes only; the `elf` node sits at Fi's hub). The hub bottom left (`NABE`, spiel.js, v039; shown from the briefcase find on) reads `api('insel').fiInfo()` → `{ fi, koffer, stufe, omen, look, talk, memos, rules, banyan, wandel, wMax, frei, freiAlle, sicht, stufeName, naechste, naechsteName, befall }` and `api('strand').ausdauer()` → `{ n, max }`; `kofferZeichnen(c, x, y, w, o)` draws the briefcase for the hub and the night scene and clicks the scenes' own buttons (`ledgerBtn`, `bTree`, `bLedger`, `bRules`); `body.fiUI` hides those; `body.nabeAn` (hub visible) hides the island's Wandel pill and the beach's stamina bar. With Fi both trees draw `ELFENBAUM` (spiel.js) from `SPIEL.baum()` (beach nodes from `api('strand').baum()`, banyan nodes from `api('insel').baum()`); `SPIEL.baumKauf(id)` routes to `kaufe` / `lerne`. Node look for all trees: `baumKnoten` / `baumPreis`. |

## 4. Still twice (later steps)
- **Dialog:** beach speech bubbles vs the island's prio windows and chats. Plan: the island prio system for both, one queue, one `storySeen`.
- **Sound:** one AudioContext with one bus per world (`SOUND`), but each world still has its own sound code, mute button and voice synth.
- **Logs:** gone as separate things since v033 — the save file is the log (§8). The island keeps `G.outLog` internally for its flood numbers.
- **Pet screens and shortcuts:** both exist (v046: beach checkpoints T5/T9/T12/T14, island codes T24/T47/T46/T51 — named after their tide; every jump also sets the matching surf stage).

## 5. Names, IDs, CSS
- Each world is one block scope in the bundle, so both can keep `$`, `S`, `frame`, `banner` and so on.
- DOM: `<div id="strand">` and `<div id="insel">`. Each world's `$` looks up IDs only inside its own root (`WELT.$`), so duplicate IDs (`cv`, `hud`, `panel`, `pet`, …) are fine.
- CSS is prefixed per root by `build.mjs`. Keyframe names that exist in both worlds get an `_i` suffix on the island (none at the moment).
- Keys: the beach reacts only while visible. Island keys belong to the cave.
- Fonts are bundled as woff2 data (Fredoka 400/600/700, Patrick Hand, Pixelify Sans 500/700, VT323, Pacifico). There is no Google Fonts call any more.

## 6. Merger order — status
1. ✅ Mechanical merge: one HTML, two scenes, one loop, one AudioContext.
2. ✅ Real beach results replace SIM. One tide loop. SIM remains as a test switch ("beach: typical / tough / smooth" in the island's menu: no beach fights).
3. ✅ Save: one game log (§8), autosaved after every flood. The title shows "CONTINUE · TIDE n".
4. ✅ Hand-overs: boss, nest and army fights, briefcase, tower ↔ beach automation (v043), cat gone after Act 2. ⏳ Gecko on the beach.
5. ⏳ One story pace: one prio queue, one `storySeen`.
6. ⏳ Balancing with real playthroughs: Wandel sink, growth curve, rule b. Mirror the beach UI and rename "Ledger".

## 7. Easy to overlook
- **Manual 💾 mid-ebb:** the island part is "right now", the beach part is the start of the current ebb (beach actions of this ebb are replayed). The autosave is taken at the start of an ebb, so both parts match.
- **"The island falls"** clears the autosave and restarts (`SPIEL.neustart`).
- **Act 3 code** (cave) is reachable only through the cat shortcut.

## 8. Save = game log (since v033, `spiel.js`)
- **One file per game**, one row per flood, header line first. Columns (`LOG_COLS`): `tide, wave, result, green, spring, stamina, beach_tide_used, kills, seconds, upgrades, turret, banyan_level, roots, rot_tiles, nests, wandel, boss, board, offensive, armies, island_fight, strikes, briefcase, cat, state` (`turret` stays "no" since v041). The beach fills its part with `bilanz()` in `strand.js`, the island with `bilanz()` in `insel.js`.
- **`state`** (last column) is plain JSON `{v, module:'game', kind, tide, b, m}` (v060; it keeps its commas, the parser takes everything from the state column on; older base64url states still load): `b` = beach `S` at the start of the ebb, `m` = island `G`, tiles, `storySeen`. Only the last 50 rows keep a state (`LOG_KEEP`); older rows keep their readable columns.
- **Autosave** after every flood (and on the beach after each ebb setup before the island exists): a row for the same or a later tide is replaced. Key `robinson_save_v1`. A new game starts a new file; "The island falls" clears it (`SPIEL.neustart`).
- **💾 / 📂** sit in the cat's big window of both worlds (gone with the cat, except via the secret access). 💾 copies the whole file. 📂 takes a whole file or one row; an optional tide picks the row. A pasted game file keeps its rows up to that tide; anything else (old RSAVE rows with `save_v`, `beach`/`map` modules) still loads and starts a new file from there.
- v061: the island snapshot (`m.G.frisch`) is kept only in the newest row; log columns `msg_backlog` (ebbs with held-back priority windows) and `tutorial` (done / step n).
- v061 world APIs: strand `kofferDa()`; insel `kofferHat()`, `rotGekaempft()`, `turmRing()`/`turmRingAus()`, `tiden().flash`, `fiInfo().drohung`; SPIEL `kofferHat()`, `kofferStrand()`, `rotGekaempft()`. Tutorials switch: `localStorage robinson_tutorials = 'off'` (title button; read by the island build and the surf's lesson banners).
- Old RSAVE v1 columns (`save_v, game, module, …, b_*, m_*`) are still read for loading only.

## 9. Source files and workflow (flat, since v031)
One folder, no subfolders, 17 files. Code and build come first; documentation and tests are marked by their name prefix.

| # | File | Content |
|---|---|---|
| 1 | `robinson.html` | page frame and all CSS, with sections for shared rules, Strand (`#strand …`) and Insel (`#insel …`), plus the embedded fonts as a marked block at the end |
| 2 | `spiel.js` | SPIEL (scene switch, one render loop, shared tide flow, shared values, save/autosave, load dialog), RSAVE, and **INHALTE**: all fixed tables and texts |
| 3 | `sound.js` | SOUND: one AudioContext and one bus per world; every sound (beach, island voices, ambience voices, cave) |
| 4 | `titel.js` | shipwreck intro and title screen |
| 5 | `strand.js` | beach: ebb, forest, cat, finds, ledger, HUD, drawing, loop, input, pet screen, beach API |
| 6 | `surf.js` | v041: the surf fight — world KAMPF (stages, wave, monsters, the cat, looks, drawing, its own loop and input); `kampf.js` is gone |
| 7 | `inselgenerator.js` | terrain, regions, tiles, base layer, sprites, borders, tile graph, fog |
| 8 | `insel.js` | island rules and campaign (First Mate, armies, finale, Board, cave), plus the view (dialogs, panel, banyan window, drawing, camera, frame, island API) |
| 8a | `traum.js` | v056: TRAUM — the Dream, the full-screen upgrade screen for both worlds (camera, layer, detail column, gifts, its sound); data and buying through SPIEL.traumKnoten / traumKauf |
| 8b | `traumbild.js` | v056: TRAUMBILD — the Dream's picture as SVG pieces, **generated** by `tools/traumbild.py` (scene code in `tools/traum_szene.py`, `tools/traum_bild.py`, icons in `tools/traum_symbole.svg.txt`) |
| 9 | `build.mjs` | bundles 1–8b (modules: sound, spiel, traumbild, traum) into `robinson_vNNN.html` next to the folder |
| 10–13 | `doku_regelbuch.md`, `doku_story.md`, `doku_schnittstelle.md`, `doku_akt3_beispiel.md` | copies of the project docs |
| 14 | `test_schnittstelle.py` | the permanent test |
| 14a | `test_traum.py` | v056: the Dream's smoke test (screenshots into $SHOT) |
| 15–17 | `test_save_t20.csv`, `test_save_t29.csv`, `test_save_t34.csv` | Jan's saves as test data |

**How the parts connect:**
- **World STRAND** = `strand.js` + `titel.js`. **World KAMPF** = `surf.js` (v041). **World INSEL** = `inselgenerator.js` + `insel.js`. Each world is one block scope in the bundle.
- Each world starts with `const WELT = SPIEL.welt(…)` and fills `WELT.api` with the functions the hub may call. The worlds never call each other directly.
- Each world takes the names it uses from `spiel.js` and `sound.js`. `build.mjs` generates that list from the code.
- A name used in both worlds carries a suffix (e.g. `PET_CODES_STRAND`) and arrives under the plain name.
- The island's "listener on the map" stays in `insel.js` because it reads the map: `ambInit` and `ambTick` decide which ambience is heard at which volume, depending on where the camera is.
- Console and tests: `window.SPIEL`, `window.STRAND.*`, `window.KAMPF.*`, `window.INSEL.*`.
- v043 upright screens: the beach canvas is the full screen (`W × HS`), the scene itself `W × H` with `H ≤ W / 1.15`, drawn at offset `OY`; pointer y is converted (`clientY − OY`), the bubble is placed with `OY`; `drawLetterbox` paints jungle above and sea below.
- Rule for new content: tables and long texts go to the INHALTE part of `spiel.js`. The ~160 single sentences in the code move when that spot is touched anyway.

**Build:** `node build.mjs` needs only Node. It uses no outside packages: esbuild, acorn and the font package are gone since v032. The steps:
- `sound.js` and `spiel.js` each get their own function scope, and only the names marked `export` come out;
- the two worlds become blocks;
- the build finds the top-level names with a small scanner of its own;
- `node --check` checks the finished code.

The built file keeps comments and the original formatting.

**`test_schnittstelle.py`**, run after every build, covers:
- opening the island;
- one tide counter;
- shared 💚 and ✨;
- one End ebb with the beach fight inside the flood;
- army and nest fights as a scene switch;
- the Cabin Boy on the wave with his surf hp by rank and stage;
- v043: the beach wheel (off / Silver / Gold), Silver chores, the Gold sweep;
- v042: nest / cabin / army / last-stand looks, the fishing cat (dive once, clings to the board; her own board);
- v041: Ledger → surf stats, S from stage 5 and W from stage 8 in the Ledger;
- v043: the upright beach (letterbox, taps) and the upright surf;
- v044: the rules screen from beach and island (both tabs), the surf's pause button;
- the briefcase from the beach;
- the cat gone;
- the save file as a game log, autosave and CONTINUE;
- Jan's T29 save plus 3 real floods;
- v033: save buttons in the cat window, coconut cap, army density, splash, the last stand (now: night, Severance wave over the whole face, TERMINATED), rum bar and cat corner, the end-of-demo screen;
- no page errors.


## v056 — the Dream (hub methods)
- `SPIEL.traumKnoten()` — every upgrade node of both worlds (beach `baum()` + island `baum()` incl. the elf); `SPIEL.traumKauf(id)` buys through the world that owns it.
- `SPIEL.traumGesehen()` → the beach's `S.traumSeen` (ids shown, `g_<id>` gift shown, `t_<id>` tapped, `_intro`); `SPIEL.traumKatzeWeg()`; `SPIEL.traumDarf()` (not in a flood or fight); `SPIEL.traum()` opens; `SPIEL.traumZu()` refreshes both HUDs and the banyan screen after closing.
- `TRAUM.zeigen()`, `TRAUM.zu()`, `TRAUM.neu()` (something unseen), `TRAUM.offen`, `TRAUM.zurueck` (the elf bought in the Dream → after Fi's transformation back into the Dream). `window.TRAUM` for tests.
- Beach API: `traumGesehen`, `katzeWegB`; island API: `baumNeu`. The island's unlock parents (`UPOS`) follow the Dream's hierarchy.

## v062 — the logbook (logbuch.js, after spiel.js)
- `LOGBUCH.enc(st, ctx)` → text, `LOGBUCH.dec(text, ctx)` → state (async: deflate-raw via CompressionStream), `LOGBUCH.ist(text)`. Word lists `ADJ`/`NOUN` (256 each) are part of the format — never reorder.
- `SPIEL.logbuchText()`, `SPIEL.logbuchLaden(text)` (fresh log, then `TRAUM.allesGesehen()`), `SPIEL.logbuchCtx()`; `speichernManuell` copies the logbook, `testLogKopieren` the CSV; `ladenDialog` reads either.
- World APIs: strand `grund()` (S before anything happens), `upgListe()`, `traumOffen()`; insel `logbuchCtx()` → `{ gGrund (G defaults at module load), gVorlage (current G), tBase (generated map after buildGame) }`. The island part is read only after the island exists (`ctx.inselCtx(t0)` starts it).
- Rest = only what differs from those defaults; missing keys are filled with the defaults or a falsy value of the session's type. Sets of flags are packed (`'^1'`/`'^t'` key lists).
- Also: `SPIEL.ring(selector, ms)` (white-green ring, no click), island `prioPruefen()` / `prioPin()`, prio options `valid` and `keep`, beach `unruhe()` (0 calm … 1 spent), `KATZE` button `#kzLog`.

## v063 — repository, rot machines, radio, tower odds
- **Repository:** `github.com/janmeyer1/notaxisland` (private). Layout: sources flat at the root, `docs/` (rulebook, interface, story), `builds/robinson_vNNN.html`. `node build.mjs` writes `../robinson_vNNN.html`; copy it to `builds/` before committing. `build.mjs` rewritten after the recovery (module wrapping `const { exports } = (() => { … })();`, the trailing-comment guard, `node --check`); the surf test page is not built any more.
- Island: `steil(t)`, `istFront(t)`, `treboReich(t)`, `treboFeuert(t)`, `treboImRing(t)`, `treboWahl(t, d)`, `nachschub()`, `nachschubSzene()`, `drawLandung()`, `funkAntwort(ja, n)`; tile fields `turm`, `trebo`, `welkSeit` (in `T_KEYS`); `G.nachLand`; `G.landung` (not saved). Prio `who: 'radio'` → briefcase voice, header "+++ INCOMING RADIO MESSAGE · DECRYPTED +++", class `case radio`. New ills: `radio`, `banyanDanger`, `merge`, `memo`, `fired`, `gate`. API `toast(t)`.
- Strand: `goldChance()`, `sweep()` with `r.chance`, `S.autoLetzt`; API `banner(t, ms)`, `autoLetzt()`, `goldFaehrt(info)`, `auto().chance`.
- SPIEL: `hinweis(txt)` (toast on the island, banner on the beach); `strandFlut` stays in the current scene when the tower rides.

## v065 — surf: clouds, shield, flame, barrel
- **Build:** `node build.mjs` also copies the build to `builds/`, rewrites `builds/index.html` (versions with the rulebook heading `### vNNN — …`, date, lines, KB) and `index.html` (forwards to the newest). The repository is public; GitHub Pages serves the root.
- surf.js: `ctx` is now `let` (the shield draws the rider into its own canvas: `drawShield(body, x, y)`, `SH`). `drawRider()` reads `G.riderOv = { x, y, ang, pose, shield }` when set (the barrel places him).
- Clouds: `CLOUD` (warn, rain, pulses, back, fwd), `inRain(c)`; a cloud gets `cu` (wave units), `pi`, `hits`, `teach`; `G.restU` = where he rides at rest; `G.cloudTeach`.
- Flame: `flameAct()`, `updFlame(dt)`, `flameWork(ox, oy, dir, list, dt, start)` (outside and in the drum), `drawFlame(x, y, dir, t0)`, `burnFlames(x, y, k)`; `G.flameX/flameY/flameDir/flameT0`; monsters get `burn`.
- Barrel: `BRL` (timings, wake angle, windows), `brlK(t)`, `brlLipK()` (scales the curl in `drawLip`), `startBarrel()` (level event `'barrel'`), `barrelTap(k)` (called first in `tap()`), `updBarrel(dt)`, `barrelClamp()`, `drum()` / `dpos()`, `enterDrum()`, `drumTap(k)`, `drumMon(type, thArrive, T)`, `drumArrive(o, D, dt)`, `drumHearts(n0)`, `updDrum(dt)` (runs instead of the world in `update()`), `exitDrum(kind)` (`spit` / `fat` / `wake`), `drawBarrelWorld()`, `drawDrum()`. `G.barrel = { ph: herald|enter|crash|in|clear|sky|out, scene, t, K, hold, th, h, act, mons, hearts, shots, fly, open, climb, missed, kind }`. `levelSpawn()` waits while a barrel runs. Surf log: `{ k: 'barrel', what: herald|in|clamp|spit|fat|wake }`; `G.C.barrels`, `G.C.spits`.
- Rules (spiel.js `surfRegeln`): cards `cloud` (at 20) and `barrel` (at 25).

## v067 — barrel look and workbench
- surf.js: `drum()` now returns `{ cx, cy, R, re, rs, Ro, side }` per `BRL.view` (`'side'` | `'behind'`): `re` eye radius, `R` the ring he rides (side: = `re`), `rs` where things spawn (side: near the eye's middle; behind: the eye's rim), `Ro` the tube's outer edge (about ¾ of the screen covered). `drawTube(x, y, s, k, open, t)` draws the tube (scale `s`, roll-up `k`, opened top right `open`); `tubeCols()`. `BRL.enterT` (1.0), `BRL.outT` (0.6); phase `enter` moves `G.riderOv` from the wave into the drum.
- Workbench: `LAB = { on, speed, pause, mons, mode: spit|early|late|asky|manual, from: roll|ride|open|exit, loop }`, `labGo()`, `labTick(dt)` (called from `update` when `LAB.on`), `barrelLab()` (panel, started when `window.BARREL_LAB`). `frame()` scales dt by `LAB.speed` and holds on `LAB.pause`.
- build.mjs writes `builds/barrel_lab.html` (the same build with `window.BARREL_LAB = true`) and links it on `builds/index.html`.

## v068 — barrel tunnel
- `drum()` adds `ex, ey` (the wandering eye; side view: = centre); `dpos(D, th, r)` bends positions with `r < R` towards the eye. `tubeSpin()` (rad/s, stage and boost). `BRL.view` defaults to `'behind'`. `G.barrel.launch = { t, th }` (the take-off, 0.6 s) before `exitDrum('spit', [x, y])`. `drawBarrelRoll()` draws the rolling tube under the rider (before `drawRider`), `drawBarrelWorld()` keeps the curtain and the PULL IN sign.

## v069 — barrel settled in, review tests
- `drum()`: eye right of the middle; `tubeBend(D, r)` (0 … 1, squared depth) used by `dpos` and `drawTube`; `tubeCols()` returns twelve `rgb()` shades; `TB.c` the small canvas of the tube's water; `drawTube` paints water into `TB` (source-atop light/shade, destination-out feathering) and the white water on the main canvas.
- `BRL.waitAt`, `B.waited`, `B.gone` (the herald holds while he is busy); `BRL.enterT` 1.1, `BRL.outT` 0.8; `G.spit` (seconds of safe flight, checked in `hurt`, shown by the shield).
- Tests: `test_android.py` (Pixel 7 emulation; writes `../android_report.json`), `test_haupt_v069.py` (`known()` prints OPEN for findings of the review).

