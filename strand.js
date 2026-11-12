// ============================================================================
// STRAND — the beach: ebb, palm forest, the cat, finds, the ledger upgrades, HUD, pet screen, start
// Shares one scope with titel.js (build.mjs puts them into one block). v041: the fight itself is the surf world (surf.js, SPIEL.surf).
// ============================================================================
'use strict';
// =====================================================================
// GAME DATA — all tunable numbers live here (top of script: TDZ-safe)
// distances are in U (1% of screen height), times in seconds
// =====================================================================
// v011: waves after 13 — fewer tadpoles, more of the tough kinds, slowly (hp still +8 % per wave on top); fine-tuning later
function postWave(n) { return { tadpole: Math.max(2, 6 - Math.floor(n / 4)), clam: 6 + Math.floor(n / 4), rat: 4 + Math.floor(n / 2), wasp: 5 + Math.floor(n / 3) }; }
function bossWelle(w) { return SPIEL.inselBereit ? null : BOSS_WAVES[w]; }   // v030: once the island runs, its First Mate decides when a boss walks in
const BOSS_WAVES = (() => { const o = { [BOSS_PLAN.first]: BOSS_PLAN.type, [BOSS_PLAN.second]: BOSS_PLAN.type }; for (let w = BOSS_PLAN.laterFrom; w <= BOSS_PLAN.upTo; w += BOSS_PLAN.laterEvery) o[w] = BOSS_PLAN.type; return o; })();
const GAME_KEY = 'robinson_game_n';

// upgrades: cur = currency, max = level cap, req = prerequisite check
const UPGRADES = [
  { id: 'dmg', grp: 'Stamp', name: 'Heavier Stamp', desc: '+1 damage per stamp. — The ledger stamp was never this heavy in the office.', cur: 'green', base: 80, mult: 1.8, max: 6 },   // v056: the stamp tops out at 6
  { id: 'speed', grp: 'Stamp', name: 'Faster Stamping', desc: 'Stamp 10 % faster per level (the first level: 20 %). — Signing in triplicate taught your wrist something.', cur: 'green', base: 20, mult: 1.9, max: 6 },
  { id: 'splash', grp: 'Stamp', name: 'Wider Splash', desc: 'Ink splashes 4 px further per level, and harder onto the ones around. — Your signature, now in wide format.', cur: 'green', base: 20, mult: 1.9, max: 6 },
  { id: 'jump', grp: 'Moves', name: 'Jump [D]', key: true, gift: 2, desc: 'Tap D (or the right half) as you ride up a mussel: a big jump, the mussel dies, you get a boost. Jump again where you land. — A gift of stage 2.', cur: 'green', base: 0, mult: 1, max: 1 },
  { id: 'boostLen', grp: 'Moves', name: 'Long Boost', desc: 'The boost after each combo lasts 25 % longer per level. — Momentum, finally on your side.', cur: 'green', base: 280, mult: 1.8, max: 8 },   // v056: Long Boost and Heart Magnet hang on the board itself
  { id: 'magnet', grp: 'Moves', name: 'Heart Magnet', desc: 'After you catch the magnet, hearts fly to you from further away (+1.4 px per level). — Love, it turns out, is attractive.', cur: 'green', base: 280, mult: 1.8, max: 8 },
  { id: 'cycle', grp: 'Moves', name: 'Wall Leap [A]', key: true, gift: 8, desc: 'Tap A (or the left half) at the green sign: boomerang back, climb, leap over the wall, dive where they land. — A gift of stage 8.', cur: 'green', base: 0, mult: 1, max: 1 },
  { id: 'cycleBoom', grp: 'Moves', name: 'Heavy Boomerang', desc: 'The Wall Leap\'s boomerang hits 50 % harder per level. — Polished on the long nights.', cur: 'green', base: 400, mult: 1.8, max: 8, req: () => S.upg.cycle > 0 },
  { id: 'cycleDive', grp: 'Moves', name: 'Deep Dive', desc: 'The dive at the end of the leap reaches 30 % wider per level. — You go in like a bad decision.', cur: 'green', base: 400, mult: 1.8, max: 8, req: () => S.upg.cycle > 0 },
  { id: 'glide', grp: 'Moves', name: 'Glider [hold D]', key: true, gift: 'nest', desc: 'Hold D (or the right half) in the air: a palm-leaf glider, up to 2 s. Wide crevasses need it. — The tortoise wove it for your first island fight.', cur: 'green', base: 0, mult: 1, max: 1 },
  { id: 'glideLen', grp: 'Moves', name: 'Long Glide', desc: 'The glider holds 0.5 s longer per level. — More leaves, fewer prayers.', cur: 'green', base: 300, mult: 1.8, max: 6, req: () => S.upg.glide > 0 },
  { id: 'flame', grp: 'Moves', name: 'Flamethrower [hold A]', key: true, gift: 'army', desc: 'Hold A while you climb in the Wall Leap: a blaze that burns through the wall. — A gift of your first fight against an army.', cur: 'green', base: 0, mult: 1, max: 1 },
  { id: 'flamePow', grp: 'Moves', name: 'Hotter Flames', desc: 'The flamethrower burns 7 damage per second hotter per level. — Better rum, hotter fire.', cur: 'rum', base: 6, mult: 1.7, max: 8, req: () => S.upg.flame > 0 },
  { id: 'void', grp: 'VOID', name: 'VOID [life-saver]', key: true, desc: 'Fills with the hearts you collect. When your stamina would hit 0 it fires by itself: 30 % stamina back and lightning from kill to kill. — The roots under the sea catch you.', cur: 'rum', base: 8, mult: 1, max: 1 },   // v060: 5 → 8
  { id: 'voidCharge', grp: 'VOID', name: 'Quick Charge', desc: 'VOID needs 15 % fewer hearts to charge, per level. — It learns your rhythm.', cur: 'rum', base: 4, mult: 1.6, max: 7, req: () => S.upg.void > 0 },
  { id: 'voidHeal', grp: 'VOID', name: 'Second Wind', desc: 'VOID gives +10 % more stamina back, per level. — A deeper breath before the next wave.', cur: 'rum', base: 5, mult: 1.6, max: 3, req: () => S.upg.void > 0 },
  { id: 'catDive', grp: 'Cat', name: 'Fishing Dive', desc: 'Once a fight she leaps off your head after a rot minnow: a sure fish tail. — Then she clings to the board, soaked and furious.', cur: 'tails', base: 2, mult: 1, max: 1 },
  { id: 'lapcat', grp: 'Cat', name: 'Lap Cat', desc: 'On the beach: four strokes in a row and she purrs +1 stamina, once every tide. — Hold her still to open her own screen.', cur: 'tails', base: 2, mult: 1, max: 1 },
  { id: 'catBoard', grp: 'Cat', name: 'Her Own Board', desc: 'She surfs your wake on her own board and dives again and again: a fish tail for every catch. — Her board, her rules.', cur: 'tails', base: 13, mult: 1, max: 1, req: () => S.upg.catDive > 0 },   // v060: 5 → 13
  { id: 'catFish', grp: 'Cat', name: 'Deeper Dives', desc: 'She dives 15 % more often, reaches 12 px further and goes 25 % deeper, per level. — Fish fear her. Rightly.', cur: 'tails', base: 3, mult: 1.7, max: 8, req: () => S.upg.catBoard > 0 },
  { id: 'catEel', grp: 'Cat', name: 'Eel Catcher', desc: 'She dives for the big black eels too: a caught eel dies and brings 2 🐟. — Twice her length. She does not care.', cur: 'tails', base: 15, mult: 1, max: 1, req: () => S.upg.catBoard > 0 && (S.seen.eel || S.flood >= 15) },   // v061
  { id: 'catShoo', grp: 'Cat', name: 'Rot Chaser', desc: 'Island only. She chases rot off your tile or the one next to you: −1 rot. 5 🐟 — doubling with each chase in the same ebb. Not on nests: she is brave, not stupid.', cur: 'tails', base: 6, mult: 1, max: 1, req: () => S.upg.lapcat > 0 && SPIEL.rotGekaempft() }   // v058; v061: only once Robinson has fought rot himself
];
const GROUND = 76;
const STAMP_SPOT = { fx: .66, fy: .55 };
const BEACH_TORT = { fx: .85, fy: .37 }, PEE_SPOT = { fx: .32, fy: .62 };
const OPEN_NUT = { fx: .43, fy: .62 };
const SWIM = { stamina: 4, hits1: [3.6, 5.8, 8.0], kittenAt: 8.9, hope: 3, hits2: [11.9, 14.1, 16.3] };

// ================= DOM =================
const WELT = SPIEL.welt('strand');   // v030: this world's handle in the game hub (root element, scoped $, render loop, API)
const $ = id => WELT.$(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const el = {
  stBar: $('stBar').firstElementChild, stTxt: $('stTxt'),
  tideBox: $('tideBox'), tideLbl: $('tideLbl'), tideBar: $('tideBar').firstElementChild, day: $('dayLbl'), mute: $('mute'),
  ledgerBtn: $('ledgerBtn'), waitBtn: $('waitBtn'), panel: $('panel'), upgList: $('upgList'), closePanel: $('closePanel'),
  bubble: $('bubble'), bubbleTxt: $('bubbleTxt'), banner: $('banner'), overlay: $('overlay'), result: $('result'),
  resTitle: $('resTitle'), resStats: $('resStats'), resQuip: $('resQuip'), resBtn: $('resBtn')
};

let W = 0, H = 0, U = 1, DPR = 1;
let OY = 0, HS = 0;   // v043: upright screens — the beach scene keeps its shape (W × H) and sits in a full-screen canvas (W × HS), OY from the top
const S = {
  screen: 'start', stamina: 0, maxStamina: 5, green: 0, tails: 0, rum: 0, hasStamp: false, traumSeen: {},   // v056: what the Dream has already shown
  tide: STATS.ebb.tideFirst, tideMax: STATS.ebb.tideFirst, flood: 1, day: 1,
  palmMax: STATS.ebb.palmStart, palmPending: 0, palmNuts: STATS.ebb.palmStart,
  crabs: [], tut: 0, busy: false, cut: null, wl: 0, fade: 0, floats: [], parts: [], hint: null, time: 0,
  wake: null, openNut: null, swim: null,
  firstKill: false, firstGreen: false, toldWalk: false, combats: 0, losses: 0, raided: false,
  seen: {}, forestOpen: false, poolSips: STATS.ebb.poolSips,
  upg: {}, tort: { bar: 0, sleep: 0, walk: null, fx: BEACH_TORT.fx, fy: BEACH_TORT.fy },
  cr: { fx: .5, ph: 0, face: -1 },
  kt: { fx: .44, fy: .58, tfx: .44, tfy: .58, ph: 0, face: 1, dig: 0 },
  keys: {}, pointers: new Map(),
  mapUnlocked: false, mapAt: 0, ms: {}, round: null, gameN: 0,
  auto: 'off', wins: {},   // v043: beach automation (off / silver / gold) and what each surf stage brought home, won by hand
  storySeen: {}, flotSeen: {}, flot: null, ffi: 0, ffind: null, ffDay: -1, lastAct: 0, buyLog: [], treeSel: null, petToday: false
};
UPGRADES.forEach(u => S.upg[u.id] = 0);
// v041: the fight runs in the surf world; S.kampf is true while it runs (and until its result card is closed)

// ================= utils =================
function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function WU() { return W / U; }
function easeOut(t) { return 1 - (1 - t) * (1 - t); }
function inCollect() { return S.screen === 'beach' || S.screen === 'forest'; }
function crFy() { return S.screen === 'forest' ? .72 : .56; }
// derived stats
function stampDmg() { return STATS.crusoe.dmg + S.upg.dmg; }
function atkInt() { return STATS.crusoe.atkInt * Math.pow(.88, S.upg.speed); }
function splashR() { return STATS.crusoe.splashR + 4 * S.upg.splash; }
function catThreshold() { return S.katzeWeg ? 0 : S.upg.catDive + S.upg.catBoard; }   // v042: 0 = she only rides along
function upgCost(u) { return Math.round(u.base * Math.pow(u.mult, S.upg[u.id])); }   // v046: a heart is a heart — the prices carry the inflation
function upgMaxed(u) { return u.max !== undefined && S.upg[u.id] >= u.max; }
function tortAsleep() { return S.tort.sleep > 0; }


window.gameTime = () => S.time;   // v016: the title's exit matches the storm sea's waves
SOUND.strandSzene = () => S.screen;   // v031: the beach ambience (sound.js) follows the beach scene
function unruhe() { return S.tideMax ? clamp(1 - S.tide / S.tideMax, 0, 1) : 1; }
SOUND.strandUnruhe = unruhe;   // v062: 0 = calm at ebb start, 1 = the sea coming back (all beach hours spent)

// ================= tortoise bubble =================
const BQ = { q: [], t: 0, on: false, gap: 0, done: null };
function say(lines, force, who) {
  if (tortAsleep() && force !== true && !who) return;
  BQ.q = (Array.isArray(lines) ? lines : [lines]).slice(); BQ.who = who || 'Tortoise'; BQ.gap = 0; BQ.done = typeof force === 'function' ? force : (arguments[3] || null); nextLine();
}
function chat(lines) {   // v060: side remarks only when she has been quiet for a while — never straight after another line
  if (BQ.on || S.time - (BQ.endT || -99) < 14 || S.saidThisEbb >= 1) return false; S.saidThisEbb = (S.saidThisEbb || 0) + 1; say(lines); return true;
}
function nextLine() {
  const l = BQ.q.shift();
  if (!l) { BQ.on = false; BQ.endT = S.time; el.bubble.style.display = 'none'; const d = BQ.done; BQ.done = null; if (d) d(); return; }
  BQ.on = true; BQ.t = 2 + l.length / 13;   // v016: about 13 characters a second, plus two to find the bubble
  el.bubbleTxt.textContent = l; el.bubble.querySelector('.who').textContent = BQ.who || 'Tortoise'; el.bubble.style.display = 'block'; placeBubble(); if ((BQ.who || 'Tortoise') === 'Tortoise') SFX.speak(l);
}
function placeBubble() {
  if (!BQ.on) return;
  const b = el.bubble, bw = b.offsetWidth, bh = b.offsetHeight;
  if (S.screen !== 'beach' || (BQ.who && BQ.who !== 'Tortoise')) { b.style.left = (W / 2 - bw / 2) + 'px'; b.style.top = (OY + 13 * U) + 'px'; return; }
  const tx = S.tort.fx * W, ty = S.tort.fy * H;
  b.style.left = clamp(tx - bw * .8, 8, W - bw - 8) + 'px';
  b.style.top = (OY + clamp(ty - 9 * U - bh, 8 * U, H - bh - 8)) + 'px';
}
el.bubble.addEventListener('pointerdown', e => { e.stopPropagation(); nextLine(); });

function banner(txt, ms) {
  el.banner.textContent = txt; el.banner.style.opacity = 1;
  clearTimeout(banner._t); banner._t = setTimeout(() => el.banner.style.opacity = 0, ms || 1300);
}
function float(x, y, txt, col) { S.floats.push({ x, y, txt, col: col || '#fff6e3', t: 0, life: 1.1 }); }
function poof(x, y, col, n, spd) {
  const k = (spd || 1) * U * 4;
  for (let i = 0; i < (n || 8); i++) S.parts.push({ x, y, vx: rand(-1, 1) * k, vy: rand(-1.6, -.3) * k, life: rand(.3, .6), t: 0, col, r: rand(.4, .8) });
}

// ================= progress track: past milestones, current wave, what's coming =================
function newTypesAt(w) { return SURF_NEU[w] ? [SURF_NEU[w]] : []; }   // v041: what a surf stage brings for the first time
function trackHTML() {
  const cur = S.flood, a = Math.max(1, cur - 2);
  let b = cur + 3; Object.keys(BOSS_WAVES).forEach(k => { const w = +k; if (bossWelle(w) && w > cur && w <= cur + 6) b = Math.max(b, w); });
  let h = '';
  for (let w = a; w <= b; w++) {
    const boss = bossWelle(w), done = w < cur, cls = 'nd' + (done ? ' done' : '') + (w === cur ? ' cur' : '') + (boss ? ' boss' : '');
    let icon = (!done && boss) ? '💀' : (S.ms[w] || '');
    if (!icon && !done) icon = newTypesAt(w).join('');
    if (w > a) h += '<span class="ln"></span>';
    h += '<span class="' + cls + '">' + (icon ? '<i>' + icon + '</i>' : '') + w + '</span>';
  }
  return h;
}
function renderTrack(node) { node.innerHTML = trackHTML(); }
function milestone(w, icon) { S.ms[Math.max(1, w)] = icon; }
// v033: no separate beach log any more — the save file (spiel.js) is the log; the beach gives it its readable columns (bilanz)
const TOUCH = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();   // v070: a phone or tablet — hints name gestures, not keys
const S_SKIP = new Set(['tapGo', 'kampf', 'res', 'autoLetzt', 'warte', 'flutBoss', 'spent', 'katzeWeg', 'pointers', 'keys', 'floats', 'parts', 'crabs', 'cut', 'wake', 'swim', 'openNut', 'hint', 'round', 'busy', 'fade', 'wl', 'time', 'flot', 'ffind', 'lastAct', '_snap', 'screen']);
function beachState(first) { const b = {}; Object.keys(S).forEach(k => { if (!S_SKIP.has(k) && typeof S[k] !== 'function') b[k] = S[k]; }); return { v: RSAVE.V, module: 'beach', tide: S.day, first: !!first, b: JSON.parse(JSON.stringify(b)) }; }   // v030: tide = the shared tide counter (= day)
const S_GRUND = JSON.parse(JSON.stringify(beachState(true).b));   // v062: the beach as it is before anything happens — the logbook only writes what differs
function beachLoad(st) {
  if (S.screen === 'start') {
    try { S.gameN = (+localStorage.getItem(GAME_KEY) || 0) + 1; localStorage.setItem(GAME_KEY, S.gameN); } catch (e) { S.gameN = 1; }
    el.overlay.style.opacity = 0; setTimeout(() => el.overlay.remove(), 650); setTimeout(resize, 0);
  }
  S.swim = null; S.wake = null; S.openNut = null; S.cut = null; S.kampf = false; S.busy = false;
  el.result.style.display = 'none'; el.panel.style.display = 'none';
  Object.keys(st.b).forEach(k => { if (!S_SKIP.has(k)) S[k] = st.b[k]; });
  catMigrate();
  UPGRADES.forEach(u => { if (S.upg[u.id] === undefined) S.upg[u.id] = 0; });
  const mid = S._mid; delete S._mid; setupEbb(!!st.first, mid); banner('Loaded · wave ' + S.flood + ' · day ' + S.day, 1800);
}
// v042: older saves bought Courage / Teamwork — they become Fishing Dive / Her Own Board / Deeper Dives
function catMigrate() {
  abilityMigrate();
  const u = S.upg; if (u.courage === undefined && u.teamwork === undefined) return;
  const c = u.courage || 0, t = u.teamwork || 0;
  u.catDive = Math.max(u.catDive || 0, c > 0 ? 1 : 0); u.catBoard = Math.max(u.catBoard || 0, t > 0 ? 1 : 0); u.catFish = Math.max(u.catFish || 0, u.catBoard ? Math.min(5, Math.max(0, c - 2)) : 0);
  delete u.courage; delete u.teamwork;
  S.buyLog = (S.buyLog || []).map(id => id === 'courage' ? 'catDive' : id === 'teamwork' ? 'catBoard' : id);
}
// v046: the old S/W abilities become the new branches (no refunds): Quick Catch → Heavy Boomerang, VOID charge → Quick Charge, Seek levels → Second Wind
function abilityMigrate() {
  const u = S.upg, map = { boomCd: 'cycleBoom', voidCd: 'voidCharge' };
  Object.keys(map).forEach(k => { if (u[k]) u[map[k]] = Math.max(u[map[k]] || 0, u[k]); });
  if (u.voidSeek || u.voidR) u.voidHeal = Math.max(u.voidHeal || 0, Math.min(3, (u.voidSeek || 0) + Math.floor((u.voidR || 0) / 2)));
  ['boom', 'boomCd', 'voidCd', 'voidSeek', 'voidR'].forEach(k => delete u[k]);
  S.buyLog = (S.buyLog || []).map(id => map[id] || id).filter(id => UPGRADES.some(x => x.id === id) || id === 'courage' || id === 'teamwork');
  grantGifts();
}
const GIFT_CARD = {   // v055: a gift is announced on the beach, in its own window
  glide: ['The tortoise', ["The island is open — and the nests sit on rotten scree, full of crevasses. Fall into one and it takes everything you have.", "So I wove you a glider from palm leaves. Hold D (or the right half) in the air and it opens. Practise on the beach; the first crevasse in the nest is a small one."]],
  flame: ['The tortoise', ["Armies are marching. Walls of them, one after the other.", "The banyan sends you fire for that. Hold A (or the left half) while you climb in the Wall Leap — the flamethrower burns into the wall as long as you hold."]]
};
const TIDE_UPS = { stamp: "The stamp is yours. Each low tide you'll have a little more time now: +1 hour.", forest: "The palm forest is open. More to do, more time to do it: +1 hour every ebb.", crusoe1: "Crusoe's notes. Someone managed here before you — and so will you: +1 hour every ebb.", bark: "Crusoe's bark map. You know where to look now: +1 hour every ebb.", map: "The whole island is yours to work now: +1 hour every ebb." };
function tideMaxNow() { const n = [S.hasStamp, S.forestOpen, S.ffi >= 1, S.ffi >= 4, S.mapUnlocked].filter(Boolean).length; return Math.min(STATS.ebb.tide, STATS.ebb.tideFirst + n); }   // derived from the story, so old saves fit too
function tideUp(k) {   // v055: a story moment earns a tide for every following ebb
  S.tideUps = S.tideUps || {}; if (S.tideUps[k]) return; S.tideUps[k] = S.day;
  float(W * .5, H * .28, '+1 🌊 hour every ebb', '#7fe3ff'); S.tideMsg = TIDE_UPS[k];
}
function giftNow(id, later) { if (S.upg[id]) return; S.upg[id] = 1; S.buyLog.push(id); TREE_FX.push({ id, t: 0 }); if (later) S.giftLater = id; else S.pendingGift = id; }   // v060: later = explained at the start of the next fight, when it can be used   // v055: given on the beach, before the fight that needs it
function grantGifts(N) {   // Jump [D] comes with stage 2, Wave Cycle [A] with stage 8; v054: the Glider with the first island fight, the Flamethrower with the first army
  UPGRADES.forEach(g => { const due = typeof g.gift === 'number' ? S.flood >= g.gift : g.gift === 'nest' ? !!(N || S.upg.flame) : g.gift === 'army' ? !!(N && N.army) : false;
    if (g.gift && due && !S.upg[g.id]) { S.upg[g.id] = 1; S.buyLog.push(g.id); TREE_FX.push({ id: g.id, t: 0 }); } });
}
const SAVEUI = {   // v030: one save for the whole game (beach + island), see SPIEL
  save: () => SPIEL.speichernManuell(ok => banner(ok ? '💾 Game saved to the clipboard — start of tide ' + S.day : 'Copy failed', 2200)),
  open: () => SPIEL.ladenDialog()
};
function startRound() { S.round = { game: S.gameN, round: S.day, wave: S.flood, tide_start: S.tideMax, green_start: S.green, green_spent: 0 }; }
function finishRound(result, gain, kills, total, secs, turret) {
  const r = S.round; if (!r) return;
  if (r.tide_free === undefined) r.tide_free = 0;
  Object.assign(r, { tide_spent: r.tide_start - r.tide_free, green_earned: gain, green_free: S.green, result, kills, total, seconds: secs, max_stamina: S.maxStamina, turret: turret ? 1 : 0, map: S.mapUnlocked ? 1 : 0 });
  S.lastRound = r; S.round = null;   // v033: read by bilanz() for the save file
}
const RESULT_TXT = { win: 'won', lose: 'lost', nest_win: 'nest won', nest_lose: 'nest lost', raid: 'raid (no stamp)', island_fight: 'island fight', sim: 'simulated' };
function surfSummary(r) {   // v054: the run log in short, one cell of the save log (for analysis)
  const ev = r.evlog || [], W = ev.filter(e => e.k === 'wall'), rp = ev.filter(e => e.k === 'ramp'), hu = ev.filter(e => e.k === 'hurt'), c = {};
  hu.forEach(h => { const k = h.cause + (h.cyc ? '/' + h.cyc : ''); c[k] = (c[k] || 0) + 1; });
  return 'st' + r.stage + ' ' + (r.kind || 'wave') + ' m' + (r.meters || 0) + ' h' + (r.hearts || 0) + '/' + (r.heartsAll || 0) + ' walls ' + W.map(w => (w.tap || '-')[0] + (w.hits || 0) + (w.earlyMs !== undefined ? '(' + w.earlyMs + ')' : '')).join(' ') +
    ' ramps ' + rp.filter(e => e.hit).length + '/' + rp.length + ' taps ' + rp.map(e => e.tapMs === null || e.tapMs === undefined ? '-' : e.tapMs).join(';') + ' hits ' + Object.entries(c).map(([k, v]) => k + v).join(';') +
    (ev.some(e => e.k === 'crevasse') ? ' gaps ' + ev.filter(e => e.k === 'crevasse').length : '');
}
function bilanz() {   // v033: the beach's readable columns of the save file
  const r = S.lastRound || {};
  return { tower: S.autoTxt || '', wave: S.flood, result: RESULT_TXT[r.result] || r.result || '', green: S.green, stamina: S.maxStamina, beach_tide_used: r.tide_start ? (r.tide_spent || 0) + '/' + r.tide_start : '', kills: r.total ? r.kills + '/' + r.total : '', seconds: r.seconds || '', upgrades: S.buyLog.length, surf: r.surf || '', turret: r.turret ? 'yes' : 'no' };
}
function copyText(txt, done) {
  const fb = () => { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(true); } catch (e) { done(false); } ta.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => done(true), fb); else fb();
}

// ================= HUD =================
function updateHUD() {
  if (S.screen === 'beach') SPIEL.speichernBald();   // v070: whatever changed the HUD is worth keeping
  el.stBar.style.width = (100 * S.stamina / S.maxStamina) + '%';
  el.stTxt.textContent = S.stamina + '/' + S.maxStamina;
  { const h = RESS.html(), e = $('ressB'); if (e.innerHTML !== h) e.innerHTML = h; }   // v040: one resource row for both scenes
  el.day.textContent = 'Tide ' + S.day;
  $('mapBtn').textContent = SPIEL.inselGestartet() ? '🗺 Island' : '🗺 Map';
  $('mapBtn').style.display = S.mapUnlocked ? 'inline-block' : 'none'; $('mapBtn').classList.toggle('hint', !!S.mapHint || SPIEL.inselWartet());
  const combat = S.screen === 'combat';
  el.tideBox.classList.remove('top');
  const tr = $('track');
  {
    const sp = SPIEL.spring();   // v030: the island's spring hour is shared — the beach spends it when its own tide is gone
    el.tideLbl.innerHTML = '🌊 <b>' + S.tide + '</b>/' + S.tideMax + (sp ? ' <span class="spr">+ ✨ ' + sp + '</span>' : '') + (S.spent ? ' · spent' : S.screen === 'forest' ? ' · Palm forest' : ' · Low tide');
    el.tideBar.parentElement.style.display = '';
    el.tideBar.style.width = (100 * S.tide / S.tideMax) + '%';
    tr.style.display = 'none';
  }
  el.tideBox.style.display = (combat || S.screen === 'swim' || S.wake || S.screen === 'start' || (!combat && S.tut >= 3)) ? 'none' : 'flex';   // v036: at low tide the End-ebb compass shows the tides
  const col = inCollect() && !S.busy && !S.wake;
  el.ledgerBtn.style.display = col && S.hasStamp ? 'block' : 'none';
  $('rulesBtnB').style.display = col && S.hasStamp ? 'block' : 'none';   // v044: the controls, to read up on
  el.ledgerBtn.classList.toggle('ready', UPGRADES.some(u => upgVisible(u) && !upgMaxed(u) && !u.gift && S[u.cur] >= upgCost(u)) || TRAUM.neu() || (SPIEL.inselBereit && SPIEL.traumKnoten().some(n => n.welt === 'insel' && n.state === 'buy')));   // v056: something to buy, or something new in the Dream
  { const on = S.hasStamp && !S.seen.dreamOpen && S.firstGreen && el.ledgerBtn.classList.contains('ready'), hb = document.querySelector('#fiBust button[data-k="traum"]'); el.ledgerBtn.classList.toggle('tutRingB', on); if (hb) hb.classList.toggle('tutRingB', on); }   // v062: until the Dream has been opened once (the hub's moon, or the old button)
  el.waitBtn.style.display = (col || (S.spent && inCollect() && !S.wake)) && S.tut >= 3 ? 'block' : 'none';
  el.waitBtn.textContent = SPIEL.inselBereit ? 'End ebb ⏭' : 'Wait for the tide ⏭';
  el.waitBtn.classList.toggle('pulse', !!S.spent);
  if (el.panel.style.display === 'flex') renderLedger();
}

// ================= ledger (upgrade screen) =================
function upgVisible(u) {
  if (u.req && !u.req()) return false;
  if (S.katzeWeg && u.grp === 'Cat') return false;   // v030: the cat has left the island
  if (u.gift && !S.upg[u.id]) return false;                                 // v046: Jump and Wave Cycle are gifts of their stage
  if (u.id === 'void' && !S.upg.void && S.flood < 6) return false;          // VOID (the life-saver) from stage 6
  if (S.tails > 0) S.tailsSeen = true;   // v060: once you had fish tails, the cat's upgrades stay — spending the last tail used to hide Lap Cat
  if (u.cur === 'tails' && S.tails === 0 && !S.seen.fish && !S.tailsSeen && !UPGRADES.some(x => x.cur === 'tails' && S.upg[x.id])) return false;
  return true;
}
function canGiveRum() { return !tortAsleep() && !S.tort.walk && S.tort.bar < STATS.tortoise.barMax && S.screen === 'beach'; }
function treeG() { return clamp(S.buyLog.length / TREE_FULL, 0, 1); }
function nodeO(id) {                       // 0 = ledger entry … 1 = living branch
  const n = TREE[id], tot = S.buyLog.length, g = treeG();
  if (n.kind === 'root') return g;
  if (n.kind === 'hub') { const ch = Object.keys(TREE).filter(k => TREE[k].p === id); return ch.reduce((a, k) => a + nodeO(k), 0) / ch.length; }
  const first = S.buyLog.indexOf(id);
  if (first < 0) return clamp(g * .85, 0, 1);
  return clamp(first / TREE_FULL + (tot - 1 - first) * .035 + .05, 0, 1);
}
// v034: every ledger entry as a node (the same model as the banyan's, so the elf tree can hold both)
function beachNode(id) {
  const u = UPGRADES.find(x => x.id === id), n = TREE[id], lv = S.upg[id] || 0, vis = upgVisible(u), maxed = upgMaxed(u), cost = upgCost(u), hubP = !n.p || TREE[n.p].kind;
  const parOwn = hubP || (S.upg[n.p] || 0) > 0;
  const state = lv > 0 ? (maxed ? 'max' : 'own') : u.gift ? 'locked' : vis ? (S[u.cur] >= cost ? 'buy' : 'poor') : parOwn ? 'locked' : 'hidden';
  const next = lv > 0 && !maxed && vis ? (S[u.cur] >= cost ? 'buy' : 'poor') : null;   // owned, but another level can be bought
  return { id, welt: 'strand', name: u.name, desc: u.desc, grp: n.grp, cur: u.cur, lvl: lv, max: u.max, cost, have: S[u.cur], p: hubP ? 'fi' : n.p, state, next, key: !!u.key };
}
function beachNodes() { return Object.keys(TREE).filter(id => !TREE[id].kind).map(beachNode); }
function renderLedger() {
  let h = '';
  if (S.rum > 0 || S.tort.bar > 0 || S.forestOpen) {
    let why = 'Give her a bottle.';
    if (tortAsleep()) why = 'Sleeping it off.'; else if (S.tort.walk) why = 'Busy.'; else if (S.screen !== 'beach') why = 'On the beach.';
    const bm = STATS.tortoise.barMax;
    h = '<div class="item"><span>🐢 ' + '●'.repeat(S.tort.bar) + '○'.repeat(bm - S.tort.bar) + ' <small>' + why + '</small></span> <button class="btn" data-rum="1"' + (S.rum > 0 && canGiveRum() ? '' : ' disabled') + '>🥃 1</button></div>';
  }
  el.upgList.innerHTML = h;
  const g = treeG(), fi = SPIEL.fi();
  $('treeTitle').textContent = fi ? 'The Elf Tree' : g < .35 ? 'The Ledger' : g < .7 ? 'The Ledger (overgrown)' : 'The Tree';
  $('treeSub').textContent = fi ? 'Fi keeps the ledger now — and the banyan listens through her.' : g < .35 ? 'Every expense, accounted for.' : g < .7 ? 'Something is growing between the columns.' : 'It grew out of the stamp. Naturally.';
  el.panel.classList.toggle('elf', !!fi);
  renderTreeInfo(); drawTree();
}
function renderTreeInfo() {
  if (SPIEL.fi()) return renderElfInfo();
  const id = S.treeSel, b = $('tiBuy');
  const u = id && UPGRADES.find(x => x.id === id);
  if (!u) { $('tiName').textContent = 'Tap an entry'; $('tiDesc').textContent = 'Every upgrade grows from the stamp.'; b.style.display = 'none'; return; }
  if (u.gift && !S.upg[u.id]) { $('tiName').textContent = u.name + ' · 🎁 a gift'; $('tiDesc').textContent = u.desc; $('tiName').style.color = '#b8860b'; $('tiDesc').style.color = ''; b.style.display = 'none'; return; }   // v055: gifts are never for sale
  const icon = { green: '💚', tails: '🐟', rum: '🥃' }[u.cur], vis = upgVisible(u), maxed = upgMaxed(u), c = upgCost(u);
  const lv = u.max === 1 ? (S.upg[u.id] ? ' · owned' : '') : ' · Lv ' + S.upg[u.id] + (u.max ? '/' + u.max : '');
  $('tiName').textContent = (vis && u.key && !S.upg[u.id] ? '★ Key upgrade · ' : '') + (vis ? u.name : 'Not yet grown') + (vis ? lv : '');
  $('tiDesc').textContent = vis ? u.desc : 'Keep going. Something will sprout here.';
  $('tiName').style.color = vis && u.key && !S.upg[u.id] ? '#b8860b' : ''; $('tiDesc').style.color = vis && u.key && !S.upg[u.id] ? '#8a6400' : '';
  b.style.display = vis ? 'inline-block' : 'none';
  b.textContent = maxed ? '✓' : icon + ' ' + c + ' (you have ' + S[u.cur] + ')'; b.disabled = maxed || S[u.cur] < c;   // v033: have / need on every purchase
}
// v034: with Fi the ledger shows the elf tree — ledger and banyan together; the info box reads any node
function renderElfInfo() {
  const n = S.treeSel && SPIEL.baum().find(x => x.id === S.treeSel), b = $('tiBuy');
  $('tiName').style.color = ''; $('tiDesc').style.color = '';
  if (!n) { $('tiName').textContent = 'Tap a symbol'; $('tiDesc').textContent = 'Above the ground, round Fi: what the stamp and the cat can learn. Below it, the banyan\'s roots.'; b.style.display = 'none'; return; }
  const hid = n.state === 'hidden', lv = n.max > 1 ? ' · Lv ' + n.lvl + '/' + n.max : n.max === undefined && n.lvl ? ' · Lv ' + n.lvl : n.lvl ? ' · learned' : '';
  $('tiName').textContent = hid ? 'Something in the dark' : n.name + lv;
  $('tiDesc').textContent = hid ? 'Not yet. Learn what grows before it.' : n.desc + (n.state === 'locked' && n.p && n.p !== 'fi' ? ' (Learn ' + SPIEL.baum().find(x => x.id === n.p).name + ' first.)' : '');
  b.style.display = !n.cur || hid || n.state === 'max' ? 'none' : 'inline-block';
  b.textContent = BAUM_CUR[n.cur] + ' ' + n.cost + ' (you have ' + n.have + ')'; b.disabled = n.state !== 'buy' && n.next !== 'buy';
}
function buyUpgrade(id) {
  const u = UPGRADES.find(x => x.id === id); if (!u || u.gift || upgMaxed(u) || !upgVisible(u)) return;
  const c = upgCost(u); if (S[u.cur] < c) return;
  S[u.cur] -= c; S.upg[u.id]++; S.buyLog.push(u.id); SFX.buy(); updateHUD();
  if (u.cur === 'green' && S.round) S.round.green_spent += c;
  if (u.id === 'void') setTimeout(() => chat(LINES.voidBuy), 500);   // v017: no second VOID line at the next ebb
  if (u.id === 'lapcat') setTimeout(() => chat(LINES.lapBuy), 500);
  TREE_FX.push({ id, t: 0 });
  renderLedger();
}
const TREE_FX = [];
// positions stretch to the canvas (wide phone screens), node size scales with the tighter axis but never gets tiny
function treeFit(cv) {
  const w = cv.clientWidth, h = cv.clientHeight, sx = w / 940, sy = h / 600, z = clamp(Math.min(sx, sy) * 1.15, .55, 1.1);
  return { w, h, sx, sy, z, ox: -30 * sx, oy: 10 * sy, P: (x, y) => [-30 * sx + x * sx, 10 * sy + (y - 20) * sy] };
}
function mixHex(a, b, t) { const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const A = p(a), B = p(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; }
function drawTree() {
  const cv = $('treeCv'); if (!cv || el.panel.style.display !== 'flex') return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), F = treeFit(cv);
  if (cv.width !== Math.round(F.w * dpr) || cv.height !== Math.round(F.h * dpr)) { cv.width = Math.round(F.w * dpr); cv.height = Math.round(F.h * dpr); }
  const c = cv.getContext('2d'), t = S.time, g = treeG();
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, F.w, F.h);
  if (SPIEL.fi()) { ELFENBAUM.zeichnen(c, F.w, F.h, t, SPIEL.baum(), S.treeSel); return; }
  // background: ruled ledger paper fading into a sunny island clearing
  c.fillStyle = '#fbf3dc'; c.fillRect(0, 0, F.w, F.h);
  if (g < 1) {
    c.globalAlpha = 1 - g; c.strokeStyle = 'rgba(80,130,190,.28)'; c.lineWidth = 1;
    for (let y = 26; y < F.h; y += 26) { c.beginPath(); c.moveTo(0, y); c.lineTo(F.w, y); c.stroke(); }
    c.strokeStyle = 'rgba(200,60,60,.4)'; c.beginPath(); c.moveTo(F.ox + 40 * F.sc, 0); c.lineTo(F.ox + 40 * F.sc, F.h); c.stroke();
    c.globalAlpha = 1;
  }
  if (g > 0) {
    c.globalAlpha = g;
    const bg = c.createLinearGradient(0, 0, 0, F.h); bg.addColorStop(0, '#bfe9df'); bg.addColorStop(.62, '#e9f2c9'); bg.addColorStop(1, '#efd59f');
    c.fillStyle = bg; c.fillRect(0, 0, F.w, F.h);
    const sun = c.createRadialGradient(F.w * .82, F.h * .1, 0, F.w * .82, F.h * .1, F.h * .45); sun.addColorStop(0, 'rgba(255,240,180,.8)'); sun.addColorStop(1, 'rgba(255,240,180,0)');
    c.fillStyle = sun; c.fillRect(0, 0, F.w, F.h);
    c.fillStyle = 'rgba(60,140,70,.18)';
    for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(F.w * (i / 8), -F.h * .02, F.h * .16, F.h * .1, 0, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1;
  }
  const P = F.P, z = F.z;
  const ids = Object.keys(TREE), bought = id => TREE[id].kind ? true : S.upg[id] > 0;
  // branches
  ids.forEach(id => {
    const n = TREE[id]; if (!n.p) return;
    const pn = TREE[n.p], o = (nodeO(id) + nodeO(n.p)) / 2, has = bought(id), [ax, ay] = P(pn.x, pn.y), [bx, by] = P(n.x, n.y);
    const depth = n.kind === 'hub' ? 1 : TREE[n.p].kind === 'hub' ? .62 : .45;
    const aE = clamp((.6 - o) / .25, 0, 1), aC = 1 - aE;
    if (aE > 0) {          // ledger: inked elbow connectors
      const my = (ay + by) / 2;
      c.globalAlpha = aE; c.strokeStyle = has ? '#3b2a1a' : 'rgba(59,42,26,.35)'; c.lineWidth = 1.4; c.setLineDash(has ? [] : [4, 4]);
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax, my); c.lineTo(bx, my); c.lineTo(bx, by); c.stroke(); c.setLineDash([]);
    }
    if (aC > 0) {          // tree: curved bark branches, young shoots where nothing grew yet
      const sway = Math.sin(t * .8 + n.x * .01) * 3 * o * z;
      c.globalAlpha = aC; c.lineCap = 'round';
      const w = (has ? lerp(3, 20 * depth, o) : lerp(2, 5 * depth, o)) * z;
      const path = () => { c.beginPath(); c.moveTo(ax, ay); c.bezierCurveTo(ax + sway, ay - (ay - by) * .65, bx - (bx - ax) * .15, by + (ay - by) * .35, bx, by); };
      c.strokeStyle = has ? mixHex('#3b2a1a', '#6e4a28', o) : 'rgba(110,160,80,.55)'; c.lineWidth = w; path(); c.stroke();
      if (has && o > .5) { c.strokeStyle = 'rgba(214,180,120,' + ((o - .5) * .9) + ')'; c.lineWidth = w * .25; path(); c.stroke(); }
    }
    c.globalAlpha = 1;
    if (n.link) {          // cross dependency: a thin tendril
      const ln = TREE[n.link], [lx, ly] = P(ln.x, ln.y); c.strokeStyle = o < .5 ? 'rgba(59,42,26,.4)' : 'rgba(80,150,70,.6)'; c.lineWidth = 1.5; c.setLineDash([3, 5]);
      c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo((bx + lx) / 2, Math.min(by, ly) - 60 * F.sy, lx, ly); c.stroke(); c.setLineDash([]);
    }
  });
  // nodes
  ids.forEach(id => {
    const n = TREE[id], o = nodeO(id);
    c.save(); const [qx, qy] = P(n.x, n.y); c.translate(qx - n.x * z, qy - n.y * z); c.scale(z, z);
    if (n.kind === 'hub') {
      c.globalAlpha = clamp((.7 - o) * 2, 0, 1); c.fillStyle = '#3b2a1a'; c.font = '600 18px Fredoka, sans-serif'; c.textAlign = 'center';
      c.fillText('— ' + n.label + ' —', n.x, n.y + 6);
      c.globalAlpha = o; c.fillStyle = '#6e4a28'; c.beginPath(); c.ellipse(n.x, n.y, 12, 9, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(59,42,26,.75)'; c.font = '600 14px Fredoka, sans-serif'; c.fillText(n.label, n.x + (n.x < 500 ? -34 : 34), n.y + 5);
      c.globalAlpha = 1; c.restore(); return;
    }
    if (n.kind === 'root') {
      c.globalAlpha = 1 - o; c.fillStyle = '#fffaf0'; c.strokeStyle = '#3b2a1a'; c.lineWidth = 2;
      c.fillRect(n.x - 70, n.y - 18, 140, 34); c.strokeRect(n.x - 70, n.y - 18, 140, 34);
      c.fillStyle = '#3b2a1a'; c.font = '600 14px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText('Acct. 000 · NOTAX', n.x, n.y + 5);
      c.globalAlpha = o;     // the stamp as a seed in the sand, roots spreading
      c.strokeStyle = '#6e4a28'; c.lineWidth = 3; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(n.x, n.y + 4); c.quadraticCurveTo(n.x + k * 22, n.y + 14, n.x + k * 40, n.y + 30); c.stroke(); }
      c.fillStyle = '#5a3b22'; c.fillRect(n.x - 6, n.y - 34, 12, 26); c.fillStyle = '#2b2b2b'; c.fillRect(n.x - 22, n.y - 10, 44, 12); c.fillStyle = '#39e639'; c.fillRect(n.x - 22, n.y, 44, 4);
      c.globalAlpha = 1; c.restore(); return;
    }
    const u = UPGRADES.find(x => x.id === id), nd = beachNode(id), vis = upgVisible(u), has = nd.lvl > 0, sel = S.treeSel === id;
    const fx = TREE_FX.find(f => f.id === id), pop = fx ? 1 + .25 * Math.sin(Math.min(1, fx.t / .5) * Math.PI) : 1;
    c.save(); c.translate(n.x, n.y); c.scale(pop, pop);
    if (o < .55) {          // ledger side: an inked entry in the book
      const w = lerp(124, 80, o / .55), h = 40;
      c.globalAlpha = clamp((.55 - o) * 3, 0, 1); c.fillStyle = has ? mixHex('#fffaf0', GRP_COL[n.grp], .25) : '#fffaf0'; c.strokeStyle = has ? '#3b2a1a' : 'rgba(59,42,26,.45)'; c.lineWidth = has ? 2 : 1.4;
      c.setLineDash(vis ? [] : [4, 4]); c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 3); c.fill(); c.stroke(); c.setLineDash([]);
      c.textAlign = 'center'; c.fillStyle = vis ? '#3b2a1a' : 'rgba(59,42,26,.5)'; c.font = '400 11px Fredoka, sans-serif'; c.fillText('Acct. ' + n.acct, 0, -5);
      c.font = '600 13px Fredoka, sans-serif'; c.fillText(vis ? SHORT[id] : '— pending —', 0, 11);
      if (nd.state === 'buy') { c.strokeStyle = 'rgba(230,160,20,' + (.5 + .4 * Math.sin(t * 5)) + ')'; c.lineWidth = 3; c.beginPath(); c.roundRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 6); c.stroke(); }
      if (sel) { c.strokeStyle = '#146b86'; c.lineWidth = 3; c.beginPath(); c.roundRect(-w / 2 - 7, -h / 2 - 7, w + 14, h + 14, 8); c.stroke(); }
    }
    if (o > .35) {          // tree side: v034 the shared node look (colour = branch, shape = currency)
      c.globalAlpha = clamp((o - .35) * 3, 0, 1);
      if (u.key && vis && !has) { const gl = c.createRadialGradient(0, 0, 0, 0, 0, 52); gl.addColorStop(0, 'rgba(255,205,60,' + (.45 + .2 * Math.sin(t * 3)) + ')'); gl.addColorStop(1, 'rgba(255,205,60,0)'); c.fillStyle = gl; c.beginPath(); c.arc(0, 0, 52, 0, 7); c.fill();
        c.fillStyle = '#b8860b'; c.font = '600 13px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText('★ KEY UPGRADE', 0, -40); }
      baumKnoten(c, 0, 0, 24, nd, t, false); baumPreis(c, 0, 0, 24, nd, false, 13);
      c.fillStyle = 'rgba(59,42,26,.8)'; c.font = '600 12px Fredoka, sans-serif'; c.textAlign = 'center'; if (vis) c.fillText(SHORT[id], 0, -32);
      if (sel) { c.strokeStyle = '#146b86'; c.lineWidth = 3; c.setLineDash([5, 4]); c.beginPath(); c.arc(0, 0, 36, 0, 7); c.stroke(); c.setLineDash([]); }
    }
    c.globalAlpha = 1;
    c.restore(); c.restore();
  });
}
function treeLoop() {
  if (el.panel.style.display !== 'flex') return;
  TREE_FX.forEach(f => f.t += .016); for (let i = TREE_FX.length - 1; i >= 0; i--) if (TREE_FX[i].t > .6) TREE_FX.splice(i, 1);
  drawTree(); requestAnimationFrame(treeLoop);
}
$('treeCv').addEventListener('pointerdown', e => {
  const cv = $('treeCv'), F = treeFit(cv), b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
  if (SPIEL.fi()) { S.treeSel = ELFENBAUM.treffer(cv.clientWidth, cv.clientHeight, x, y, SPIEL.baum()); renderTreeInfo(); return; }
  let best = null, bd = 1e9;
  Object.keys(TREE).forEach(id => { if (TREE[id].kind) return; const [qx, qy] = F.P(TREE[id].x, TREE[id].y), d = Math.hypot(qx - x, qy - y); if (d < 60 * F.z + 10 && d < bd) { bd = d; best = id; } });
  if (best) { S.treeSel = best; renderTreeInfo(); }
});
$('tiBuy').addEventListener('click', () => { if (!S.treeSel) return; if (SPIEL.fi()) { SPIEL.baumKauf(S.treeSel); renderLedger(); } else buyUpgrade(S.treeSel); });
el.upgList.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.rum) { el.panel.style.display = 'none'; giveRum(); }
});
el.ledgerBtn.addEventListener('click', () => { if (!inCollect() || S.busy || S.wake) return; S.seen.dreamOpen = true; el.ledgerBtn.classList.remove('tutRingB'); TRAUM.zeigen(); });   // v056: the Dream replaces the Ledger
$('mapBtn').addEventListener('click', () => {   // v030: the island is a scene of the same game
  S.mapHint = false; updateHUD();
  if (!SPIEL.zeige('insel')) banner(S.kampf ? 'Not during the fight' : 'Only at low tide', 1400);
});
$('rulesBtnB').addEventListener('click', () => SPIEL.regeln('surf'));
el.closePanel.addEventListener('click', () => { el.panel.style.display = 'none'; });
el.panel.addEventListener('pointerdown', e => { if (e.target === el.panel) el.panel.style.display = 'none'; });

// ================= tortoise & rum =================
function giveRum() {
  if (!canGiveRum() || S.rum <= 0) return;
  S.rum--; S.tort.bar++; SFX.gulp(); updateHUD();
  say(S.tort.bar >= STATS.tortoise.barMax ? ["Hic."] : [LINES.rum[Math.min(S.tort.bar - 1, LINES.rum.length - 1)]]);
  S.tort.walk = { t: -1.2, peed: false };
}
function updateTortoise(dt) {
  const w = S.tort.walk; if (!w) return;
  w.t += dt;
  const go = 4, pee = 1.6, back = 4, t = w.t;
  if (t < 0) return;
  if (t < go) { const q = easeOut(t / go); S.tort.fx = lerp(BEACH_TORT.fx, PEE_SPOT.fx, q); S.tort.fy = lerp(BEACH_TORT.fy, PEE_SPOT.fy, q); }
  else if (t < go + pee) {
    S.tort.fx = PEE_SPOT.fx; S.tort.fy = PEE_SPOT.fy;
    if (!w.peed) { w.peed = true; SFX.pee(); }
    if (Math.random() < .5) S.parts.push({ x: (PEE_SPOT.fx - .025) * W, y: PEE_SPOT.fy * H - 1 * U, vx: rand(-14, -8) * U, vy: rand(-6, -2) * U, life: .35, t: 0, col: '#f3e27a', r: .35 });
  } else if (t < go + pee + back) {
    if (!w.done) { w.done = true; S.palmPending++; float(palmBase().x, palmBase().y - 6 * U, '+1 coconut tomorrow', '#ffe08a'); }
    const q = easeOut((t - go - pee) / back); S.tort.fx = lerp(PEE_SPOT.fx, BEACH_TORT.fx, q); S.tort.fy = lerp(PEE_SPOT.fy, BEACH_TORT.fy, q);
  } else {
    S.tort.fx = BEACH_TORT.fx; S.tort.fy = BEACH_TORT.fy; S.tort.walk = null;
    if (S.tort.bar >= STATS.tortoise.barMax) {
      say(LINES.tip, true); S.forestOpen = true; tideUp('forest'); S.tort.sleep = 2; milestone(S.flood - 1, '🌴');
      setTimeout(() => float(.5 * W, .2 * H, 'The palm forest is open ▲', '#c8f7c5'), 400);
    }
    updateHUD();
  }
}
function tortoiseReset() {
  if (S.tort.walk) {
    if (!S.tort.walk.done) S.palmPending++;
    if (S.tort.bar >= STATS.tortoise.barMax && !tortAsleep()) { S.forestOpen = true; tideUp('forest'); S.tort.sleep = 2; }
  }
  S.tort.walk = null; S.tort.fx = BEACH_TORT.fx; S.tort.fy = BEACH_TORT.fy;
}

// ================= layout (beach, fractions of screen) =================
function palmBase() { return { x: .25 * W, y: .63 * H }; }
function palmCrown() { return { x: .29 * W, y: .27 * H }; }
function poolPos() { return { x: .56 * W, y: .66 * H }; }
function waterTarget() { return H * (.88 - .28 * (1 - S.tide / S.tideMax)); }
function crX() { return S.cr.fx * W; }
function inReach(x) { return Math.abs(x - crX()) <= STATS.crusoe.reach * U; }

function spawnCrab() {
  for (let k = 0; k < 20; k++) {
    const top = !S.crabs.length, c = { fx: rand(.4, .8), fy: top ? rand(.555, .58) : rand(.6, .71), ph: rand(0, 6) };   // v057: the first (top) crab stays above the water even at the highest tide
    if (!S.crabs.some(o => Math.abs(o.fx - c.fx) < .06 && Math.abs(o.fy - c.fy) < .05) &&
        !(Math.abs(c.fx - STAMP_SPOT.fx) < .05 && Math.abs(c.fy - STAMP_SPOT.fy) < .06)) { S.crabs.push(c); return; }
  }
}

// ================= ebb (collect phase) =================
function setupEbb(first, mid) {
  S._snap = beachState(first);   // v022: the save of this ebb's start (before anything changes)
  S.screen = 'beach'; S.busy = false; S.spent = false; S.cut = null; S.kampf = false; S.fade = 0;
  S.tideMax = tideMaxNow(); S.tide = S.tideMax;   // v055: tides are action points — 3, and story moments add more (up to 8)
  S.palmMax += S.palmPending; S.palmPending = 0; S.palmNuts = S.palmMax; S.poolSips = STATS.ebb.poolSips;
  S.crabs = [];
  let nCrabs, buried = false;
  if (first) nCrabs = STATS.ebb.crabsFirst;
  else if (S.raided) nCrabs = 1;
  else {
    const P = STATS.crabPlan;
    nCrabs = S.day <= P.twoUntil ? 2 : S.day <= P.oneUntil ? 1 : S.day <= (P.everyOtherUntil || 0) ? (S.day % 2 === 0 ? 1 : 0) : 0;
    if (!nCrabs && Math.random() < P.buriedChance) { nCrabs = 1; buried = true; }
  }
  if (mid) { nCrabs = mid.crabs; buried = mid.buried; }
  for (let i = 0; i < nCrabs; i++) spawnCrab();
  if (buried && S.crabs[0]) S.crabs[0].buried = true;
  if (mid) { S.tide = Math.min(S.tideMax, mid.tide); S.palmNuts = Math.min(S.palmMax, mid.palmNuts); S.poolSips = mid.poolSips; }   // v070: a save from the middle of an ebb comes back as it was
  if (!first && !mid) autoChores();   // v061: the tower works at the start of the ebb, with beach hours
  S.petToday = false; S.katzeWeg = SPIEL.katzeWeg();
  S.kt.circle = !first && S.day >= 7 && S.hasStamp && S.stamina < S.maxStamina && Math.random() < .5;
  S.flot = (!first && FLOTSAM[S.day] && !S.flotSeen[S.day] && S.hasStamp) ? Object.assign({ fx: rand(.48, .74), fy: .7, day: S.day }, FLOTSAM[S.day]) : null;
  if (!first && !S.flot && !S.kofferDa && S.hasStamp && S.day >= 8 && !SPIEL.kofferHat()) S.flot = { fx: rand(.5, .72), fy: .7, day: 'case', kind: 'briefcase', lines: CASE_FIND };   // v030: the briefcase is a beach find now
  S.raided = false;
  S.cr.fx = .38; S.cr.face = -1;
  Object.assign(S.kt, { fx: .33, fy: .58, tfx: .33, tfy: .58 });
  S.hint = null; S.pointers.clear();
  tortoiseReset();
  const talk = S.talkNext || []; S.talkNext = []; S.saidThisEbb = 0;   // v060: one tortoise message per tide — the most important one; the rest waits for the next tide, chatter is dropped
  if (!first && S.tort.sleep > 0) {
    S.tort.sleep--;
    if (S.tort.sleep === 0) { S.tort.bar = 0; talk.push({ p: 6, l: LINES.wakeUp, drop: true }); }
  }
  setSurf(.2);
  startRound();
  updateHUD();
  if (!first && !SPIEL.inselBereit && S.screen === 'beach') SPIEL.autosave();   // v033: one row per flood in the save file
  if (!first && S.tut === 3) { talk.push({ p: 1, l: S.cutJustHappened ? LINES.afterCut : LINES.digAgain, hint: 'stamp' }); S.cutJustHappened = false; }
  if (S.pendingGift && GIFT_CARD[S.pendingGift]) { const [who, lines] = GIFT_CARD[S.pendingGift]; S.pendingGift = null; setTimeout(() => showFind(who, lines), S.pendingLine ? 9000 : 1200); }
  if (S.pendingLine) { talk.push({ p: 0, l: S.pendingLine, must: S.pendingMust }); S.pendingLine = null; S.pendingMust = false; }   // v055: lines that unlock something are never swallowed by her sleep
  if (!first && S.hasStamp && !S.seen.tides) { S.seen.tides = true; S.tidesTold = 0; S.tideMsg = null; talk.push({ p: 2, l: LINES.tides, must: true, ring: '#ebbCv' }); }   // v055: the tortoise explains action points once (v062: with a ring on the compass)
  else if (!first && S.tideMsg) { talk.push({ p: 3, l: [S.tideMsg], must: true }); S.tideMsg = null; }
  if (!first && S.hasStamp && S.seen.tides && S.leftTides > 0 && (S.tidesLeftTold || 0) < 2) { S.tidesLeftTold = (S.tidesLeftTold || 0) + 1; talk.push({ p: 3, l: [LINES.tidesLeft[0].replace('N', S.leftTides)], ring: '#ebbCv' }); }   // v062: tides left on the sand — said again, twice at most
  else if (!first && S.hasStamp && S.seen.tides && (S.tidesTold || 0) < 3 && !SPIEL.inselBereit) { S.tidesTold = (S.tidesTold || 0) + 1; talk.push({ p: 7, l: [LINES.tidesAgain[0].replace('N', S.tideMax)], ring: '#ebbCv', drop: true }); }   // v062: the first low tides: how many, and where
  S.leftTides = 0;
  if (!first && S.hasStamp && !S.firstGreen && S.green > 0) { S.firstGreen = true; const t = talk.find(x => x.l === LINES.tides);   // v062: the Dream is told at the ebb after the first hearts — with the tides explanation if that comes now too
    if (t) { t.l = t.l.concat(LINES.green); t.rings = [[DREAM_SEL, 14000]]; } else talk.push({ p: 1, l: LINES.green, must: true, ring: DREAM_SEL }); }
  if (!first && S.tut !== 3 && STORY[S.day] && !S.storySeen[S.day] && S.hasStamp) { S.storySeen[S.day] = 1; talk.push({ p: 4, l: STORY[S.day] }); }
  if (S.rumGift) { S.rumGift = false; talk.push({ p: 5, l: ['Rough flood. Here — one bottle, from my secret stash. Give it to me and the palm grows you a coconut. Don\'t tell the crabs.'] }); }   // v060
  let delay = 600;
  if (!first && talk.length) { talk.sort((x, y) => x.p - y.p); const top = talk.shift(); S.talkNext = talk.filter(x => !x.drop).map(x => ({ p: x.p, l: x.l, must: x.must, ring: x.ring }));
    S.saidThisEbb = 1; setTimeout(() => { say(top.must && tortAsleep() ? ['Hic— what? A map?'].concat(top.l) : top.l, top.must || undefined); if (top.hint) setHint(top.hint); if (top.ring) SPIEL.ring(top.ring); (top.rings || []).forEach(([sel, ms]) => setTimeout(() => SPIEL.ring(sel), ms)); }, 600); delay = 6500; }
  else if (first && talk.length) S.talkNext = talk.filter(x => !x.drop).map(x => ({ p: x.p, l: x.l, must: x.must, ring: x.ring }));
  if (buried && S.hasStamp && S.tut >= 4) setTimeout(() => { if (!S.hint && S.screen === 'beach' && S.crabs.some(c => c.buried)) setHint('buried'); }, Math.min(delay, 2500));
}
const DREAM_SEL = '#fiBust button[data-k="traum"]';   // v062: the Dream sits in the hub (bottom left)
function setHint(type) {
  S.hint = type ? { type } : null;
  if (!type) return;
  if (type === 'palm') { S.kt.tfx = .3; S.kt.tfy = .66; }
  if (type === 'buried') { const c = S.crabs.find(o => o.buried); if (c) { S.kt.tfx = c.fx - .035; S.kt.tfy = c.fy + .01; } }
  if (type === 'crab' && S.crabs[0]) { S.kt.tfx = S.crabs[0].fx - .05; S.kt.tfy = S.crabs[0].fy + .02; }
  if (type === 'stamp') { S.kt.tfx = STAMP_SPOT.fx - .035; S.kt.tfy = STAMP_SPOT.fy + .03; }
  if (!S.katzeWeg) SFX.meow();
}
function spendTide() {
  if (!S.hasStamp) { updateHUD(); return; }   // v057: the tutorial (coconuts, crab, digging) costs no tide — it could run dry before the stamp
  if (SPIEL.inselBereit) {   // v030: beach tide first, then the shared ✨ spring hour; then the beach waits for “End ebb”
    if (S.tide > 0) S.tide--; else SPIEL.springNehmen();
    if (S.tide <= 0 && !SPIEL.spring()) { S.spent = true; S.busy = true; el.panel.style.display = 'none'; banner('Beach hours spent · 🗺 the island, or End ebb ⏭', 2200); }
    updateHUD(); return;
  }
  S.tide = Math.max(0, S.tide - 1); updateHUD();
  if (S.tide <= 0) { S.spent = true; S.busy = true; el.panel.style.display = 'none'; updateHUD(); banner('Hours spent · tap “Wait for the tide ⏭” when you are ready', 2600); }   // v055: no autostart — the button blinks
}
function tooFar(x, y) {
  float(x, y - 3 * U, 'Too far', '#e9dcc0');
  if (!S.toldWalk) { S.toldWalk = true; say(LINES.walk); }
}
function onBeachTap(x, y) {
  if (S.wake) {
    if (S.openNut) {
      const nx = S.openNut.fx * W, ny = S.openNut.fy * H;
      if (dist(x, y, nx, ny) < Math.max(30, 6 * U)) { if (Math.abs(nx - crX()) < 16 * U) drinkOpenNut(); else float(crX(), crFy() * H - 8 * U, 'Crawl closer…', '#e9dcc0'); return true; }
    }
    return false;
  }
  const tp = { x: S.tort.fx * W, y: S.tort.fy * H };
  if (dist(x, y, tp.x, tp.y - 2 * U) < Math.max(30, 8 * U)) {
    if (tortAsleep()) { float(tp.x, tp.y - 8 * U, 'Zzz…', '#e9dcc0'); return true; }
    if (S.rum > 0 && canGiveRum()) { giveRum(); return true; }
    if (S.tort.walk) return true;
    say(S.seen.clam && S.rum === 0 && Math.random() < .4 ? LINES.noRum : LINES.idle[Math.floor(Math.random() * LINES.idle.length)]);
    return true;
  }
  if (S.busy) return !S.spent;   // v060: tides spent → he can still walk, only the actions stop
  const r = Math.max(28, 5.5 * U);
  if (!S.hasStamp && S.tut >= 3) {
    const sx = STAMP_SPOT.fx * W, sy = STAMP_SPOT.fy * H;
    if (dist(x, y, sx, sy) < r) { if (!inReach(sx)) tooFar(sx, sy); else findStamp(); return true; }
  }
  const cr = palmCrown();
  if (dist(x, y, cr.x, cr.y + 3 * U) < Math.max(36, 9 * U)) { if (!inReach(palmBase().x)) tooFar(cr.x, cr.y + 6 * U); else takeNut(); return true; }
  if (S.flot) {
    const fx = S.flot.fx * W, fy = S.flot.fy * H;
    if (fy < S.wl - U && dist(x, y, fx, fy) < r) {
      if (!inReach(fx)) tooFar(fx, fy);
      else { S.flotSeen[S.flot.day] = 1; if (S.flot.kind === 'briefcase') { S.kofferDa = true; SPIEL.kofferGefunden(); setTimeout(() => SPIEL.ring('#fiBust'), 900); } showFind(S.flot.kind === 'briefcase' ? 'Found' : 'Memory', S.flot.lines, S.flot.sketch); poof(fx, fy, '#fff6e3', 10); SFX.find(); float(fx, fy - 4 * U, '✦ memory', '#fff6e3'); S.flot = null; }
      return true;
    }
  }
  for (let i = S.crabs.length - 1; i >= 0; i--) {
    const c = S.crabs[i], cx = c.fx * W + Math.sin(S.time * 1.3 + c.ph) * 1.2 * U, cy = c.fy * H;
    if (cy < S.wl - U && dist(x, y, cx, cy) < r) { if (!inReach(cx)) tooFar(cx, cy); else catchCrab(i); return true; }
  }
  const kx = S.kt.fx * W, ky = S.kt.fy * H;
  if (dist(x, y, kx, ky - 2 * U) < Math.max(26, 4.5 * U)) { SFX.meow(); float(kx, ky - 7 * U, '♥', '#ff7f6b'); return true; }
  return false;
}
function onForestTap(x, y) {
  if (S.busy) return !S.spent;
  const p = poolPos();
  if (dist(x, y, p.x, p.y) < Math.max(40, 11 * U)) { if (!inReach(p.x)) tooFar(p.x, p.y); else sipPool(); return true; }
  if (S.ffind) { const fx = S.ffind.fx * W, fy = S.ffind.fy * H; if (dist(x, y, fx, fy) < Math.max(28, 5.5 * U)) { if (!inReach(fx)) tooFar(fx, fy); else { const f = S.ffind; S.ffind = null; S.ffi++; if (S.ffi === 1) tideUp('crusoe1'); if (S.ffi === 4) tideUp('bark'); showFind('A note', f.lines, f.sketch); poof(fx, fy, '#c8f7c5', 10); SFX.find(); float(fx, fy - 4 * U, '✦ found', '#c8f7c5'); } return true; } }
  const kx = S.kt.fx * W, ky = S.kt.fy * H;
  if (dist(x, y, kx, ky - 2 * U) < Math.max(26, 4.5 * U)) { SFX.meow(); float(kx, ky - 7 * U, '♥', '#ff7f6b'); return true; }
  return false;
}
function takeNut() {
  const cr = palmCrown();
  if (S.palmNuts <= 0) { float(cr.x, cr.y, 'No coconuts left', '#e9dcc0'); return; }
  if (S.stamina >= S.maxStamina) { float(cr.x, cr.y + 4 * U, 'Not thirsty', '#e9dcc0'); return; }
  S.palmNuts--; S.stamina++; SFX.knock();
  float(cr.x, cr.y + 4 * U, '+1 Water', '#7fe3ff'); poof(cr.x, cr.y + 4 * U, '#7fe3ff', 6);
  if (S.tut === 0) { S.tut = 1; say(LINES.nut); }
  if (S.tut === 1 && (S.palmNuts === 0 || S.stamina >= S.maxStamina)) { S.tut = 2; setTimeout(() => { say(LINES.crab); setHint('crab'); }, 500); }
  spendTide();
}
function sipPool() {
  const p = poolPos();
  if (S.poolSips <= 0) { float(p.x, p.y - 4 * U, 'Muddy. Wait for tomorrow.', '#e9dcc0'); return; }
  if (S.stamina >= S.maxStamina) { float(p.x, p.y - 4 * U, 'Not thirsty', '#e9dcc0'); return; }
  S.poolSips--; S.stamina++; SFX.sip();
  float(p.x, p.y - 4 * U, '+1 Water', '#7fe3ff'); poof(p.x, p.y, '#7fe3ff', 8);
  spendTide();
}
function catchCrab(i) {
  const c = S.crabs[i]; S.crabs.splice(i, 1);
  S.maxStamina++; SFX.crab();
  float(c.fx * W, c.fy * H - 3 * U, (c.buried ? 'Dug up! ' : '') + '+1 Max stamina', '#ffb347'); poof(c.fx * W, c.fy * H, c.buried ? '#d9b47a' : '#e4572e', c.buried ? 12 : 6);
  if (c.buried && S.hint && S.hint.type === 'buried') S.hint = null;
  if (S.tut <= 2) { S.tut = 3; S.hint = null; setTimeout(() => { say(LINES.dig); setHint('stamp'); }, 600); }
  else if (S.hint && S.hint.type === 'crab') S.hint = null;
  spendTide();
}
function findStamp() {
  S.hasStamp = true; S.tut = 4; S.hint = null; SFX.find(); tideUp('stamp');
  const sx = STAMP_SPOT.fx * W, sy = STAMP_SPOT.fy * H;
  poof(sx, sy, '#e6c48a', 14); poof(sx, sy, '#39e639', 10);
  float(sx, sy - 5 * U, 'NOTAX stamp!', '#7dff6b');
  say(LINES.stamp);
  updateHUD();   // v055: the stamp is story — it costs no tide
}

// ================= moving between beach and forest =================
function goForest() {
  if (S.screen !== 'beach' || S.busy || S.wake) return;
  if (!S.forestOpen) { if (!tortAsleep()) say(LINES.thicket); else float(.5 * W, .24 * H, 'Too thick up there', '#e9dcc0'); return; }
  tortoiseReset(); S.screen = 'forest'; S.fade = 1; S.pointers.clear(); S.cr.fx = .5;
  Object.assign(S.kt, { fx: .45, fy: .74, tfx: .45, tfy: .74 }); S.hint = null; updateHUD();
  const ff = FOREST_FINDS[S.ffi];
  if (!S.ffind && ff && S.ffDay !== S.day && S.day >= (ff.minDay || 0) && S.flood >= (ff.minFlood || 0)) { S.ffDay = S.day; S.ffind = Object.assign({ fx: Math.random() < .5 ? rand(.12, .26) : rand(.74, .88), fy: .79 }, ff); }
}
function goBeach() {
  if (S.screen !== 'forest') return;
  S.screen = 'beach'; S.fade = 1; S.pointers.clear(); S.cr.fx = .5;
  Object.assign(S.kt, { fx: .44, fy: .58, tfx: .44, tfy: .58 }); updateHUD();
}

// ================= flood =================
function startFlood() {
  if (S.screen === 'forest') { S.screen = 'beach'; S.cr.fx = .5; }
  tortoiseReset();
  banner('The tide turns…', 1500); SFX.swell(); setSurf(.32);
  setTimeout(() => { if (S.hasStamp) startCombat(); else startCutscene(); }, 1500);
}
function startCutscene() {
  const mons = [];
  for (let i = 0; i < 6; i++) mons.push({ fx: 1.05 + i * .09, fy: rand(.3, .46), sp: rand(.25, .35), ph: rand(0, 6) });
  S.cut = { t: 0, mons, start: S.wl };
  say(LINES.noStamp);
}
function updateCutscene(dt) {
  const c = S.cut; c.t += dt;
  if (c.t > 1.1) c.mons.forEach(r => { r.fx -= r.sp * dt; r.ph += dt * 10; });
  if (c.t < 1.1) S.wl = lerp(c.start, .48 * H, easeOut(c.t / 1.1));
  else if (c.t < 4.0) S.wl = .48 * H;
  else S.wl = lerp(.48 * H, .88 * H, easeOut(clamp((c.t - 4.0) / 1.0, 0, 1)));
  if (c.t > 1.4 && !c.squeak) { c.squeak = true; SFX.squelch(); setTimeout(SFX.squelch, 300); }
  if (c.t > 5.2) { finishRound('raid', 0, 0, 0, 0, false); S.raided = true; S.day++; S.cutJustHappened = true; setupEbb(false); }
}

// ================= v041: the fight = the surf world (surf.js); the beach starts it, books the result, shows the card =================
function startCombat() {
  if (S.giftLater && GIFT_CARD[S.giftLater] && SPIEL.aktiv === 'strand') { const [who, lines] = GIFT_CARD[S.giftLater]; S.giftLater = null; showFind(who, lines); const w = () => findOpen() ? setTimeout(w, 200) : startCombat(); setTimeout(w, 300); return; }   // v060: the glider is explained when the wave is here
  if (S.giftLater) { S.pendingGift = S.giftLater; S.giftLater = null; }   // not on the beach right now: explained at the next beach ebb instead
  S.screen = 'combat'; S.combats++; S.kampf = true;
  el.panel.style.display = 'none'; BQ.q = []; nextLine(); S.pointers.clear();
  const N = S.nest || null, cfg = combatCfg(N);
  updateHUD();
  SPIEL.surf(cfg).then(r => endCombat(r, N), err => { console.error(err); endCombat({ win: false, t: 0, kills: 0, total: 0, gain: { green: 0, tails: 0, rum: 0 }, stam: 1, seen: {} }, N); });
}
function combatCfg(N) {
  grantGifts(N);
  const L = N ? Math.max(N.L || 0, S.flood + (N.last ? 3 : N.army ? 2 + Math.max(0, (N.army || 5) - 5) : N.boss ? 2 : 1)) : S.flood;   // v054: island fights keep pace with the beach
  let kind = 'wave', boss = null;
  if (N) { kind = N.last ? 'last' : N.army ? 'army' : N.boss ? 'cabin' : 'nest'; if (N.boss || N.last) boss = N.boss || 0; }
  else if (S.flutBoss !== null && S.flutBoss !== undefined) boss = S.flutBoss;   // v030: the island's First Mate walks in (his rank)
  else if (bossWelle(L)) boss = 0;                                                  // before the island: stage 10, 30, 45 …
  const lines = [];
  if (S.combats === 1) lines.push(...LINES.firstFight); else if (S.combats === 2 && !S.katzeWeg) lines.push(...LINES.catWatch);
  if (kind === 'last') lines.push("He has nothing left to lose, darling. That makes him dangerous.");
  return { kind, stage: L, boss, army: N && N.army || 0, elite: !!(N && N.elite), stam: Math.max(1, S.stamina), stamMax: S.maxStamina, upg: Object.assign({}, S.upg),
    cat: !S.katzeWeg, seen: Object.assign({}, S.seen), lines, seed: S.day };
}
function endCombat(r, N) {
  const win = !!r.win, g = r.gain || { green: 0, tails: 0, rum: 0 };
  if (win && !N && !r.swept) { const w = S.wins[S.flood] || (S.wins[S.flood] = { n: 0, green: 0, tails: 0, rum: 0, kills: 0 }); w.n++; w.green += g.green; w.tails += g.tails; w.rum += g.rum; w.kills += r.kills || 0; }   // v043: for the Gold sweep
  S.green += g.green; S.tails += g.tails; S.rum += g.rum;
  S.stamina = clamp(Math.round(r.stam || 0), 0, S.maxStamina);
  Object.assign(S.seen, r.seen || {});
  if (!win) S.losses++;
  if (!win && !N && S.rum === 0 && S.seen.clam) { S.rum = 1; S.rumGift = true; }   // v060: a lost flood with no rum left — the tortoise slips you a bottle, so a weak run doesn't starve the coconuts
  if (r.catKill && !S.firstKill) { S.firstKill = true; S.pendingLine = LINES.firstKill; }
  if (r.bossDown && !N) {
    if (!S.mapUnlocked) { S.mapUnlocked = true; S.mapAt = S.day; milestone(S.flood, '🗺'); S.pendingLine = LINES.bossWin; S.pendingMust = true; S.mapHint = true; (S.talkNext = S.talkNext || []).push({ p: 4, l: ['One more thing, darling: the golden ✨ spring hours. You earn them on the island — every real deed there gives you one more, for good.', 'They work here on the beach too, and they are always spent last.'] }); S.res1Boss = true; giftNow('glide', true); tideUp('map'); }   // v061: the spring hours explained on the beach
    else milestone(S.flood, '👁');
  }
  S.res = { win, N, r };
  showResult();
}
function showResult() {
  const { win, N, r } = S.res, g = r.gain || { green: 0, tails: 0, rum: 0 };
  el.resTitle.textContent = N ? (win ? (N.army ? (N.elite ? 'The Repo Crab is down!' : 'Through the army!') : N.last ? 'TERMINATED.' : N.boss ? 'His den is cleared!' : 'Through the nest!') + ' → report “Won” on the map' : 'Washed off the board' + (N.army ? ' by the army' : N.boss ? ' in his den' : ' in the nest') + ' → report “Lost” on the map')
    : r.swept ? '🗼 Swept — stage ' + S.flood + ' (the tower rode it for you)' : win ? (r.bossDown ? (S.flutBoss !== null && S.flutBoss !== undefined ? BOSS.name[S.flutBoss] : 'The First Mate') + ' is down!' : 'Stage ' + S.flood + ' — the reef!') : 'Washed off the board';
  el.result.classList.toggle('win', win);
  let st = (r.meters !== undefined ? '<span>🌊 ' + r.meters.toLocaleString('en') + ' m</span>' : '') + '<span>⏱ ' + (r.t || 0).toFixed(1) + 's</span><span>👾 ' + (r.kills || 0) + '</span><span>💚 +' + g.green + '</span>';
  if (g.tails) st += '<span>🐟 +' + g.tails + '</span>';
  if (g.rum) st += '<span>🥃 +' + g.rum + '</span>';
  if (r.heartsAll) st += '<span>♥ ' + r.hearts + '/' + r.heartsAll + '</span>';
  el.resStats.innerHTML = st;
  let q;
  if (win) q = LINES.win;
  else if (S.losses === 1) q = 'You lasted ' + (r.t || 0).toFixed(1) + ' seconds. On a wave. Against tadpoles. Open your Dream — Faster Stamping or Wider Splash.';   // v054: a clear hint after the first loss
  else if (UPGRADES.some(u => upgVisible(u) && !upgMaxed(u) && !u.gift && S[u.cur] >= upgCost(u))) { const u = UPGRADES.filter(u => upgVisible(u) && !upgMaxed(u) && !u.gift && S[u.cur] >= upgCost(u)).sort((a, b) => upgCost(a) - upgCost(b))[0]; q = 'You could afford ' + u.name.replace(/ \[.*\]/, '') + ' right now. Open your Dream. Dream harder.'; }   // v059: the hint again, as long as something is affordable
  else q = LINES.lose[Math.floor(Math.random() * LINES.lose.length)];
  if (tortAsleep()) q = '…zzz…';
  if (S.res1Boss) { S.res1Boss = false; q = 'He dropped a folder — a survey of THIS island. Tap 🗺 Island — the blue button under the compass.'; }   // v055: the island must not depend on a sleeping tortoise
  if (win && q === LINES.win && S.combats > 2) q = LINES.waveWin[Math.floor(Math.random() * LINES.waveWin.length)];
  el.resQuip.textContent = '“' + q + '”';
  if (N && S.round) S.round.wave = (N.army ? 'ARMY-' : 'NEST-') + N.code;
  if (S.seen.clam && !S.seen.clamTip) { S.seen.clamTip = true; S.pendingLine = S.pendingLine || LINES.clamTip; }
  finishRound(N ? (win ? 'nest_win' : 'nest_lose') : win ? 'win' : 'lose', g.green, r.kills || 0, r.total || 0, +(r.t || 0).toFixed(1), false);
  if (S.lastRound) S.lastRound.surf = surfSummary(r);
  const keep = S.flood; if (win && !N) S.flood++; $('resTrack').innerHTML = trackHTML(); S.flood = keep;
  el.resBtn.textContent = S.warte && S.warte.typ === 'kampf' ? 'Back to the island' : win ? 'Back to the beach' : 'Wake up';
  el.result.style.display = 'flex'; el.bubble.style.display = 'none'; BQ.q = []; BQ.on = false;
  updateHUD();
  if (win || r.swept) { const me = S.res; setTimeout(() => { if (S.res === me && el.result.style.display === 'flex') el.resBtn.click(); }, r.swept ? 1600 : 3000); }   // v036: a win moves on by itself (v063: a tower ride too, won or lost)
}
el.resBtn.addEventListener('click', () => {
  if (!S.res || el.result.style.display !== 'flex') return;   // never twice
  const { win, N, r } = S.res;
  el.result.style.display = 'none'; S.res = null; S.kampf = false;
  if (S.warte && S.warte.typ === 'kampf') {   // v030: a nest/army fight from the island — straight back, the beach day moves on with the flood
    const w = S.warte; S.warte = null; S.nest = null; S.screen = 'beach'; S.busy = w.busy; S.spent = w.spent; if (!win) S.stamina = lossStamina(); updateHUD(); w.resolve(win); return;
  }
  const res = { win, wave: S.flood, kills: r.kills || 0, total: r.total || 0, earned: (r.gain || {}).green || 0, green: S.green, bossDown: !!r.bossDown, turret: false, boss: S.flutBoss };
  if (win && !N) S.flood++; else if (!win) S.stamina = lossStamina();
  S.nest = null; S.flutBoss = null;
  S.day++;
  setupEbb(false);
  if (S.warte && S.warte.typ === 'flut') { const w = S.warte; S.warte = null; w.resolve(res); }   // v030: tell the island how the beach went
});
// ================= v043: the beach tower runs the beach — the compass's right wheel: off → Silver → Gold → off =================
function towerLvl() { return SPIEL.turmStufe ? SPIEL.turmStufe() : 0; }
function autoMode() { const l = towerLvl(), m = S.auto || 'off'; return m === 'gold' && l >= 2 ? 'gold' : (m === 'silver' || m === 'gold') && l >= 1 ? 'silver' : 'off'; }
function autoToggle() {
  const l = towerLvl();
  if (!l) { banner('🗼 Grow the beach tower on the island — then it runs the beach for you', 2400); return 'off'; }
  const order = ['off', 'silver', 'gold'].filter(m => m === 'off' || (m === 'silver' && l >= 1) || (m === 'gold' && l >= 2));
  S.auto = order[(order.indexOf(autoMode()) + 1) % order.length];
  banner({ off: 'Beach automation off', silver: '🥈 Silver: the tower does the beach chores', gold: '🥇 Gold: chores — and it rides up to 2 stages past your own last ride' }[S.auto], 2200);
  SFX.buy(); updateHUD(); return S.auto;
}
// Silver: what you would do at low tide — crabs, coconuts (and the pool), one bottle for the tortoise. Free, at the end of the ebb.
function autoChores() {   // v061: at the start of the ebb, and every chore costs a beach tide — like doing it by hand (spring hours stay yours)
  S.autoLast = null; if (autoMode() === 'off' || !S.hasStamp || S.wake) return null;
  const got = { crabs: 0, water: 0, rum: 0, tide: 0 }, pay = () => { if (S.tide <= 0) return false; S.tide--; got.tide++; return true; };
  while (S.crabs.length && pay()) { const c = S.crabs.pop(); S.maxStamina++; got.crabs++; }
  while (S.palmNuts > 0 && S.stamina < S.maxStamina && pay()) { S.palmNuts--; S.stamina++; got.water++; }
  if (S.forestOpen) while (S.poolSips > 0 && S.stamina < S.maxStamina && pay()) { S.poolSips--; S.stamina++; got.water++; }
  if (S.rum > 0 && !tortAsleep() && !S.tort.walk && S.tort.bar < STATS.tortoise.barMax && pay()) {
    S.rum--; S.tort.bar++; S.palmPending++; got.rum++;
    if (S.tort.bar >= STATS.tortoise.barMax) { S.forestOpen = true; tideUp('forest'); S.tort.sleep = 2; milestone(S.flood, '🌴'); }
  }
  if (got.crabs + got.water + got.rum) { S.autoLast = got; S.autoTxt = '🗼 The tower tended the beach' + (got.crabs ? ' · 🦀 +' + got.crabs + ' max stamina' : '') + (got.water ? ' · 💧 +' + got.water + ' stamina' : '') + (got.rum ? ' · 🥃 → 🐢' : '') + ' · −' + got.tide + ' beach tide'; banner(S.autoTxt, 3200); }
  else S.autoTxt = S.crabs.length || S.palmNuts ? '🗼 The tower had no beach hours left' : '';
  updateHUD(); return got;
}
// Gold (v062): the tower rides a stage at most 2 above the last one you beat by hand — about 70 % of your average haul there, no risk. Bosses are always yours.
function wonRef() { let b = null; for (const k in S.wins) if (S.wins[k] && S.wins[k].n > 0 && +k <= S.flood && (b === null || +k > b)) b = +k; return b; }
function sweepable() { const ref = wonRef(); return autoMode() === 'gold' && ref !== null && S.flood - ref <= 2 && (S.flutBoss === null || S.flutBoss === undefined) && !bossWelle(S.flood); }
// v063: the tower can lose — the odds come from your upgrades against the stage, how far past your own last ride it is, and your stamina
function goldChance() { const ref = wonRef(); if (ref === null) return 0; const power = Object.values(S.upg).reduce((a, v) => a + (v || 0), 0), gap = S.flood - ref, st = S.maxStamina ? S.stamina / S.maxStamina : .5;
  return clamp(.72 + .03 * (power - 1.5 * S.flood) - .12 * gap + .15 * (st - .5), .1, .95); }   // v070: 1.5 × stage (was 2) — with the longer upgrade ladders the tower stays worth feeding
function sweep() {
  const w = S.wins[wonRef()], p = goldChance(), win = Math.random() < p, k = (win ? 0.7 : 0.3) / w.n, rnd = x => Math.floor(x + Math.random());
  const r = { win, swept: true, chance: p, t: 0, kills: Math.round(w.kills * k), total: Math.round(w.kills * (0.7 / w.n)), gain: { green: Math.round(w.green * k), tails: rnd(w.tails * k), rum: rnd(w.rum * k) }, stam: win ? S.stamina : lossStamina(), seen: {} };
  S.autoLetzt = { stage: S.flood, win, p: Math.round(p * 100), green: r.gain.green };
  SPIEL.hinweis('🗼 The tower rode stage ' + S.flood + ' (' + Math.round(p * 100) + ' %): ' + (win ? 'won · +' + r.gain.green + ' 💚' : 'washed off · +' + r.gain.green + ' 💚, half stamina'));
  S.screen = 'combat'; S.kampf = true; S.combats++;
  setTimeout(() => endCombat(r, null), 600);
}
// tester field: a fight code from the island map (NEST-B1-14, ARMY-4-T-15-E)
function lossStamina() { return Math.max(1, Math.ceil(S.maxStamina / 2)); }   // v045: after a lost fight you wake with half your stamina (it was 1 — a loss spiral in the surf)
function startNestFight() {
  const raw = ($('nestCode').value || '').trim().toUpperCase();
  const m = /^NEST-(0|B1|B2)-(\d+)$/.exec(raw), a = /^ARMY-([1-9])-(T|0)-(\d+)(-E)?$/.exec(raw);
  if (!m && !a) { $('nestCode').style.borderColor = '#b0351c'; banner('Type the code from the island map — e.g. NEST-B1-14 or ARMY-4-T-15', 2600); return; }
  if (!inCollect() || S.busy || S.wake) { banner('Only at low tide', 1200); return; }
  if (a) S.nest = { boss: 0, army: +a[1], tower: a[2] === 'T', elite: !!a[4], L: Math.max(1, +a[3]), code: raw.slice(5) };
  else { const boss = m[1] === '0' ? 0 : +m[1].slice(1); S.nest = { boss, L: Math.max(1, +m[2]), code: m[1] + '-' + m[2] }; }
  el.panel.style.display = 'none'; if (S.screen === 'forest') { S.screen = 'beach'; S.cr.fx = .5; }
  S.stamina = S.maxStamina; tortoiseReset();
  banner(S.nest.army ? 'The Board\'s army…' : S.nest.boss ? 'Into his office…' : 'Into the nest…', 1500); SFX.swell(); setSurf(.2);
  setTimeout(startCombat, 1500);
}
$('nestGo').addEventListener('click', startNestFight);
function moveDir() {   // left / right from keys and held screen edges (the title uses it too)
  let d = 0;
  if (S.keys.a || S.keys.arrowleft) d -= 1;
  if (S.keys.d || S.keys.arrowright) d += 1;
  for (const p of S.pointers.values()) { if (p.x < W / 3) d -= 1; else if (p.x > W * 2 / 3) d += 1; }
  if (S.tapGo && S.time < S.tapGo.bis) d += S.tapGo.d;   // v070: a tap counts too — it carries on for a moment
  return clamp(d, -1, 1);
}
// tadpole (the raid cutscene before the stamp): a small wriggler with one green eye
function drawTadpole(x, y, s, o) {
  const f = o.face || -1, ph = o.ph || 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(f * s, s);
  ctx.strokeStyle = '#3e4a2c'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-2.5, -2.4);
  ctx.quadraticCurveTo(-5, -2.4 + Math.sin(ph * 2) * 1.6, -7.5, -2.4 - Math.sin(ph * 2 + 1) * 1.6); ctx.stroke();
  ell(0, -2.6, 3.2, 2.5, '#56633a');
  ell(-.6, -3.6, 1.6, .7, 'rgba(255,255,255,.18)');
  ell(1.2, -3.2, 1.25, 1.25, '#eaffd9'); ell(1.5, -3.2, .75, .85, '#39e639'); ell(1.7, -3.2, .3, .4, '#102010');
  ctx.restore();
}

// ############################ Zeichnen, Schleife, Eingabe ############################
// ================= drawing helpers =================
function ell(x, y, rx, ry, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }

function drawCrusoe(x, y, h, o) {
  const k = h / 100, f = o.face || 1, ph = o.ph || 0;
  ctx.save(); ctx.translate(x, y);
  if (o.fallen) { ctx.translate(0, -6 * k); ctx.rotate(-Math.PI / 2 * f * Math.min(1, o.fallen)); }
  if (o.prone) { ctx.translate(0, -6 * k); ctx.rotate(Math.PI / 2 * f * Math.min(1, o.prone)); }   // lying face-first, head towards where he crawls
  ctx.scale(f * k, k);
  if (o.hurt) ctx.globalAlpha = .6 + .4 * Math.sin(o.hurt * 60);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const sw = Math.sin(ph) * 7;
  ctx.strokeStyle = '#d9a27a'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-8, -74); ctx.lineTo(-12 - sw * .4, -52); ctx.stroke();
  ctx.strokeStyle = '#5d6470'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-5, -44); ctx.lineTo(-6 - sw, -16); ctx.moveTo(5, -44); ctx.lineTo(6 + sw, -16); ctx.stroke();
  ctx.strokeStyle = '#d9a27a'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-6 - sw, -16); ctx.lineTo(-6 - sw, -2); ctx.moveTo(6 + sw, -16); ctx.lineTo(6 + sw, -2); ctx.stroke();
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath(); ctx.moveTo(-13, -80); ctx.lineTo(13, -80); ctx.lineTo(14, -46); ctx.lineTo(9, -41); ctx.lineTo(4, -46); ctx.lineTo(-2, -40); ctx.lineTo(-7, -46); ctx.lineTo(-13, -42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8e2a2a';
  ctx.beginPath(); ctx.moveTo(1, -79); ctx.lineTo(5, -77); ctx.lineTo(4, -60); ctx.lineTo(1, -56); ctx.lineTo(-1, -60); ctx.closePath(); ctx.fill();
  ell(0, -90, 10, 10.5, '#d9a27a');
  ctx.fillStyle = '#4a3324'; ctx.beginPath(); ctx.ellipse(-1, -97, 11, 6, -.2, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-9, -99); ctx.lineTo(-13, -94); ctx.lineTo(-7, -96); ctx.fill();
  ctx.fillStyle = 'rgba(90,60,40,.45)'; ctx.beginPath(); ctx.ellipse(2, -84, 8, 5, 0, 0, Math.PI); ctx.fill();
  ctx.strokeStyle = '#2b1d12'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(5, -91, 3, 0, Math.PI * 2); ctx.moveTo(-1, -91); ctx.arc(-1.5, -91, 2.6, 0, Math.PI * 2); ctx.stroke();
  const ang = o.swing > 0 ? lerp(-2.7, .25, 1 - o.swing / .3) : (o.stamp ? -1.1 : .25);
  ctx.save(); ctx.translate(9, -74); ctx.rotate(ang);
  ctx.strokeStyle = '#d9a27a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.stroke();
  if (o.stamp) drawStampShape(0, 24, 1);
  ctx.restore();
  ctx.restore();
}
function drawStampShape(x, y, s) {
  ell(x, y, 4.5 * s, 4.5 * s, '#8b5e34');
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x - 1.8 * s, y, 3.6 * s, 10 * s);
  ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x - 8 * s, y + 9 * s, 16 * s, 5 * s);
  ctx.fillStyle = '#39e639'; ctx.fillRect(x - 8 * s, y + 14 * s, 16 * s, 2 * s);
}

function drawKitten(x, y, h, o) {
  const k = h / 30, f = o.face || 1, ph = o.ph || 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(f * k, k);
  const dash = o.dash, st = dash ? 1.5 : 1;
  ctx.strokeStyle = '#e07b2e'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-11 * st, -10);
  if (dash) ctx.quadraticCurveTo(-24, -12, -30, -8); else ctx.quadraticCurveTo(-22, -12 - Math.sin(ph) * 3, -19, -24 + Math.sin(ph * .7) * 3);
  ctx.stroke();
  ctx.strokeStyle = '#e07b2e'; ctx.lineWidth = 3;
  const lg = dash ? 6 : (o.dig ? Math.sin(ph * 8) * 4 : (o.sit ? 0 : Math.sin(ph * 2) * 2));
  ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(-8 - lg, 0); ctx.moveTo(7, -6); ctx.lineTo(8 + lg, 0); ctx.stroke();
  ell(0, -10, 12 * st, dash ? 5.5 : 7, '#f2994a');
  ctx.strokeStyle = '#d0702a'; ctx.lineWidth = 1.6;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 5 - 1, -16); ctx.lineTo(i * 5 + 1, -12); ctx.stroke(); }
  const hx = 12 * st, hy = dash ? -13 : (o.dig ? -12 : -18);
  ell(hx, hy, 6.5, 6, '#f2994a');
  ctx.fillStyle = '#f2994a';
  ctx.beginPath(); ctx.moveTo(hx - 5, hy - 3); ctx.lineTo(hx - 4, hy - 10); ctx.lineTo(hx, hy - 5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 1, hy - 5); ctx.lineTo(hx + 5, hy - 10); ctx.lineTo(hx + 6, hy - 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd1b0'; ctx.beginPath(); ctx.moveTo(hx + 2, hy - 5); ctx.lineTo(hx + 4.5, hy - 8.5); ctx.lineTo(hx + 5, hy - 4); ctx.fill();
  if (dash) { ctx.strokeStyle = '#2b1d12'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx + 1, hy - 1); ctx.lineTo(hx + 4, hy - .5); ctx.stroke(); }
  else ell(hx + 2.5, hy - 1, 1.3, o.scared ? 1.8 : 1.4, '#2b1d12');
  ell(hx + 6, hy + 1.5, 1, .8, '#e46a6a');
  ctx.restore();
}

// --- monsters ---
function drawTortoise(x, y, s, o) {
  ctx.save(); ctx.translate(x, y);
  if (o.rock) { ell(0, 1.5 * s, 10 * s, 3.5 * s, '#8c8a86'); ell(-1 * s, .8 * s, 8 * s, 2.6 * s, '#a3a19c'); }
  else ell(0, 1 * s, 7 * s, 1.6 * s, 'rgba(120,80,40,.2)');
  const asleep = o.asleep, bob = asleep ? 0 : Math.sin(S.time * .9) * .4 * s, step = o.walking ? Math.sin(S.time * 5) * .6 * s : 0;
  ctx.scale(o.face || 1, 1);
  ell(-4 * s + step, -2.5 * s, 1.6 * s, 1.4 * s, '#8f9a5c'); ell(4 * s - step, -2.5 * s, 1.6 * s, 1.4 * s, '#8f9a5c');
  const hy = asleep ? -2.4 * s : -4.5 * s + bob;
  ctx.fillStyle = '#9aa565'; ctx.beginPath(); ctx.ellipse(-8 * s, hy, 2.4 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-7.5 * s, hy, 3 * s, 2.2 * s);
  ctx.strokeStyle = '#3b2a1a'; ctx.lineWidth = .35 * s;
  ctx.beginPath(); ctx.moveTo(-9.4 * s, hy - .7 * s); ctx.lineTo(-8.2 * s, hy - .6 * s); ctx.stroke();
  ctx.fillStyle = '#6f7d3c'; ctx.beginPath(); ctx.ellipse(0, -3 * s, 7 * s, 5.4 * s, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#58652d'; ctx.fillRect(-7 * s, -3.2 * s, 14 * s, 1.1 * s);
  ctx.strokeStyle = '#4b5726'; ctx.lineWidth = .4 * s;
  ctx.beginPath(); ctx.moveTo(-3 * s, -3 * s); ctx.lineTo(-2 * s, -6.5 * s); ctx.lineTo(2 * s, -6.5 * s); ctx.lineTo(3 * s, -3 * s);
  ctx.moveTo(-2 * s, -6.5 * s); ctx.lineTo(-5.5 * s, -5 * s); ctx.moveTo(2 * s, -6.5 * s); ctx.lineTo(5.5 * s, -5 * s); ctx.stroke();
  ctx.restore();
  if (o.bar > 0 || o.asleep) {
    for (let i = 0; i < STATS.tortoise.barMax; i++) ell(x + (i - 1) * 2.4 * s, y - 9.5 * s, .8 * s, .8 * s, i < o.bar ? '#ffb347' : 'rgba(255,246,227,.6)');
  }
  if (asleep) {
    ctx.fillStyle = 'rgba(255,246,227,.9)'; ctx.font = '600 ' + (2.6 * s) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center';
    const z = (S.time * .8) % 1;
    ctx.globalAlpha = 1 - z; ctx.fillText('z', x - 9 * s, y - 6 * s - z * 5 * s);
    ctx.globalAlpha = 1 - ((z + .5) % 1); ctx.fillText('Z', x - 11 * s, y - 6 * s - ((z + .5) % 1) * 5 * s);
    ctx.globalAlpha = 1;
  }
}
function drawPalm(base, crown, nuts, t) {
  ctx.save(); ctx.lineCap = 'round';
  const mx = (base.x + crown.x) / 2 - 4 * U, my = (base.y + crown.y) / 2;
  ctx.strokeStyle = '#8b6a45'; ctx.lineWidth = 2.8 * U;
  ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.quadraticCurveTo(mx, my, crown.x, crown.y); ctx.stroke();
  ctx.strokeStyle = '#6f5233'; ctx.lineWidth = .35 * U;
  for (let i = 1; i < 12; i++) {
    const q = i / 12, x = (1 - q) * (1 - q) * base.x + 2 * (1 - q) * q * mx + q * q * crown.x, y = (1 - q) * (1 - q) * base.y + 2 * (1 - q) * q * my + q * q * crown.y;
    ctx.beginPath(); ctx.moveTo(x - 1.3 * U, y); ctx.lineTo(x + 1.3 * U, y + .4 * U); ctx.stroke();
  }
  ell(base.x + 1 * U, base.y + .5 * U, 5 * U, 1.3 * U, 'rgba(120,80,40,.18)');
  const spots = [[-1.8, 2.4], [1.9, 2.9], [0, 4.6], [-3.4, 4.2], [3.4, 4.6], [-1.6, 6.4], [1.8, 6.6], [0, 8.2]];
  for (let i = 0; i < Math.min(nuts, spots.length); i++) { const p = spots[i]; ell(crown.x + p[0] * U, crown.y + p[1] * U, 1.9 * U, 1.8 * U, '#6b4a2b'); ell(crown.x + p[0] * U - .5 * U, crown.y + p[1] * U - .5 * U, .6 * U, .5 * U, '#8b6a45'); }
  const angs = [-2.9, -2.3, -1.6, -.9, -.25, .4, 2.5];
  angs.forEach((a, i) => {
    const ang = a + Math.sin(t * .9 + i) * .06, L = (12 + (i % 2) * 3) * U;
    const ex = crown.x + Math.cos(ang) * L, ey = crown.y + Math.sin(ang) * L * .7 + 4 * U;
    const nx = -Math.sin(ang) * 2.2 * U, ny = Math.cos(ang) * 2.2 * U;
    const cx1 = crown.x + Math.cos(ang) * L * .5, cy1 = crown.y + Math.sin(ang) * L * .5 - 2.5 * U;
    ctx.fillStyle = i % 2 ? '#3f8f4f' : '#2f7a40';
    ctx.beginPath(); ctx.moveTo(crown.x, crown.y);
    ctx.quadraticCurveTo(cx1 + nx, cy1 + ny, ex, ey); ctx.quadraticCurveTo(cx1 - nx, cy1 - ny, crown.x, crown.y); ctx.fill();
  });
  ctx.restore();
}
function drawCrab(x, y, ph) {
  const s = U;
  ctx.save(); ctx.translate(x, y);
  ell(0, 1.2 * s, 3 * s, .8 * s, 'rgba(120,80,40,.2)');
  ctx.strokeStyle = '#b8401f'; ctx.lineWidth = .45 * s;
  for (let i = -1; i <= 1; i++) { const w = Math.sin(ph * 6 + i) * .4 * s; ctx.beginPath(); ctx.moveTo(-2 * s, i * .6 * s); ctx.lineTo(-3.6 * s, i * 1.1 * s + w); ctx.moveTo(2 * s, i * .6 * s); ctx.lineTo(3.6 * s, i * 1.1 * s - w); ctx.stroke(); }
  ell(0, 0, 2.6 * s, 1.7 * s, '#e4572e');
  ell(-2.6 * s, -1.9 * s, 1.1 * s, .9 * s, '#e4572e'); ell(2.6 * s, -1.9 * s, 1.1 * s, .9 * s, '#e4572e');
  ell(-.8 * s, -1.6 * s, .4 * s, .4 * s, '#2b1d12'); ell(.8 * s, -1.6 * s, .4 * s, .4 * s, '#2b1d12');
  ctx.restore();
}
function drawFlotsam(x, y, kind, t) {
  const glint = .5 + .5 * Math.sin(t * 3);
  ell(x, y + .8 * U, 3 * U, .8 * U, 'rgba(120,80,40,.2)');
  ctx.save(); ctx.translate(x, y); ctx.rotate(-.15);
  if (kind === 'cork') { ctx.fillStyle = '#c99a5b'; ctx.fillRect(-1 * U, -1.2 * U, 2 * U, 2 * U); ell(0, -1.2 * U, 1 * U, .4 * U, '#e3b97a'); }
  else if (kind === 'lanyard') { ctx.strokeStyle = '#2f6fb0'; ctx.lineWidth = .4 * U; ctx.beginPath(); ctx.arc(0, -2 * U, 1.8 * U, 0, Math.PI); ctx.stroke(); ctx.fillStyle = '#fff6e3'; ctx.fillRect(-1.2 * U, -.6 * U, 2.4 * U, 1.6 * U); ctx.fillStyle = '#2f6fb0'; ctx.fillRect(-1.2 * U, -.6 * U, 2.4 * U, .4 * U); }
  else if (kind === 'ledger') { ctx.fillStyle = '#5a3b22'; ctx.fillRect(-2 * U, -1.3 * U, 3.6 * U, 2.4 * U); ctx.fillStyle = '#efe2c2'; ctx.fillRect(-1.7 * U, -1.1 * U, 3 * U, 2 * U); ctx.strokeStyle = 'rgba(90,60,40,.5)'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-1.4 * U, (-.6 + i * .6) * U); ctx.lineTo(1 * U, (-.6 + i * .6) * U); ctx.stroke(); } }
  else if (kind === 'card') { ctx.fillStyle = '#f4f6fa'; ctx.fillRect(-2 * U, -1.3 * U, 4 * U, 2.6 * U); ctx.fillStyle = '#2f6fb0'; ctx.fillRect(-2 * U, -1.3 * U, 4 * U, .7 * U); ctx.fillStyle = '#c9b48a'; ctx.fillRect(-1.6 * U, -.2 * U, 1.2 * U, 1.2 * U); }
  else if (kind === 'fish') { ctx.fillStyle = 'rgba(80,255,120,.25)'; ctx.beginPath(); ctx.ellipse(0, -.4 * U, 3.4 * U, 1.8 * U, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#6f9a7a'; ctx.beginPath(); ctx.ellipse(0, -.4 * U, 2.2 * U, .9 * U, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(2 * U, -.4 * U); ctx.lineTo(3.2 * U, -1.3 * U); ctx.lineTo(3.2 * U, .5 * U); ctx.fill(); ctx.fillStyle = '#9dff7a'; ctx.fillRect(-1.6 * U, -.7 * U, .4 * U, .4 * U); }
  else if (kind === 'bizcard') { ctx.fillStyle = '#efe6cf'; ctx.fillRect(-1.8 * U, -1 * U, 3.6 * U, 2 * U); ctx.fillStyle = '#3b2a1a'; ctx.fillRect(-1.4 * U, -.5 * U, 2.2 * U, .3 * U); ctx.fillRect(-1.4 * U, .1 * U, 1.4 * U, .2 * U); }
  else if (kind === 'drawing') { ctx.fillStyle = 'rgba(220,235,245,.85)'; ctx.fillRect(-2 * U, -1.8 * U, 4 * U, 3.2 * U); ctx.fillStyle = '#fffaf0'; ctx.fillRect(-1.7 * U, -1.5 * U, 3.4 * U, 2.6 * U); ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.arc(1 * U, -.9 * U, .45 * U, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d94a3a'; ctx.fillRect(-1.3 * U, -.3 * U, 1.1 * U, .9 * U); ctx.fillStyle = '#39e639'; ctx.fillRect(.4 * U, 0, .5 * U, .5 * U); }
  else if (kind === 'stake') { ctx.fillStyle = '#7a5a3a'; ctx.fillRect(-.5 * U, -4 * U, 1 * U, 4.6 * U); ctx.strokeStyle = '#5a7a3a'; ctx.lineWidth = .4 * U; ctx.beginPath(); ctx.moveTo(-1.6 * U, .4 * U); ctx.quadraticCurveTo(-.2 * U, -1.6 * U, 1.4 * U, -2.6 * U); ctx.moveTo(1.6 * U, .4 * U); ctx.quadraticCurveTo(0, -1 * U, -1.2 * U, -3 * U); ctx.stroke(); }
  else if (kind === 'tin') { ctx.fillStyle = '#9a5a3a'; ctx.fillRect(-1.6 * U, -1.6 * U, 3.2 * U, 2 * U); ctx.fillStyle = '#c07a4a'; ctx.fillRect(-1.6 * U, -1.6 * U, 3.2 * U, .5 * U); }
  else if (kind === 'lump') { const p = 1 + .08 * Math.sin(t * 1.6); ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.ellipse(0, -.6 * U, 2.2 * U * p, 1.4 * U * p, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(120,255,90,' + (.25 + .2 * Math.sin(t * 1.6)) + ')'; ctx.beginPath(); ctx.arc(.4 * U, -.9 * U, .5 * U, 0, Math.PI * 2); ctx.fill(); }
  else if (kind === 'bark') { ctx.fillStyle = '#6a4a2e'; ctx.fillRect(-2.2 * U, -1.6 * U, 4.4 * U, 2.8 * U); ctx.strokeStyle = '#c9a874'; ctx.lineWidth = .25 * U; ctx.beginPath(); ctx.ellipse(0, -.2 * U, 1.4 * U, .9 * U, .2, 0, Math.PI * 2); ctx.stroke(); }
  else if (kind === 'briefcase') { ctx.rotate(-.12); ctx.fillStyle = '#6b4226'; ctx.fillRect(-3 * U, -2 * U, 6 * U, 3.6 * U); ctx.fillStyle = '#4e2f1a'; ctx.fillRect(-3 * U, -.4 * U, 6 * U, .5 * U); ctx.strokeStyle = '#4e2f1a'; ctx.lineWidth = .5 * U; ctx.beginPath(); ctx.arc(0, -2 * U, 1 * U, Math.PI, 0); ctx.stroke(); ctx.fillStyle = '#d4a017'; ctx.fillRect(-1.9 * U, -1 * U, .7 * U, .9 * U); ctx.fillRect(1.2 * U, -1 * U, .7 * U, .9 * U); }   // v030
  else if (kind === 'button') { ctx.fillStyle = '#c9a23a'; ctx.beginPath(); ctx.arc(0, -.5 * U, 1.1 * U, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8a6a1a'; ctx.beginPath(); ctx.arc(0, -.5 * U, .5 * U, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.fillStyle = '#fff6e3'; ctx.fillRect(-1.5 * U, -2 * U, 3 * U, 3.6 * U); ctx.strokeStyle = 'rgba(59,42,26,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -.2 * U, 1 * U, 1.3 * U, .3, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,' + glint + ')'; ctx.beginPath(); ctx.arc(x + 1.6 * U, y - 2.2 * U, .45 * U, 0, Math.PI * 2); ctx.fill();
}
function drawOpenNut(x, y) {
  ell(x, y + 1 * U, 3.2 * U, .9 * U, 'rgba(120,80,40,.25)');
  ell(x, y, 2.6 * U, 1.9 * U, '#6b4a2b');
  ell(x, y - .4 * U, 1.9 * U, 1.2 * U, '#fbf6ea');
  ell(x, y - .4 * U, 1.1 * U, .6 * U, '#cfeef2');
}

// static decoration (fractions), generated once
const DECO = { specks: [], coral: [], jungle: [], trunks: [], ferns: [] };
(function () {
  for (let i = 0; i < 90; i++) DECO.specks.push([Math.random(), .2 + Math.random() * .7, Math.random()]);
  for (let i = 0; i < 26; i++) DECO.coral.push([Math.random(), .9 + Math.random() * .07, .6 + Math.random() * .8, Math.random() < .5 ? '#ff7f6b' : (Math.random() < .5 ? '#ffb38a' : '#e86a9a')]);
  for (let i = 0; i < 34; i++) DECO.jungle.push([i / 33, .14 + Math.random() * .08, 4 + Math.random() * 4, Math.random() < .5 ? '#2f6b3a' : '#3d7e46']);
  for (let i = 0; i < 9; i++) DECO.trunks.push([i / 8 + rand(-.03, .03), rand(.8, 1.5), rand(-.04, .04)]);
  for (let i = 0; i < 22; i++) DECO.ferns.push([Math.random(), .74 + Math.random() * .22, 2 + Math.random() * 3, Math.random() < .5 ? '#2f7a40' : '#3f8f4f']);
})();

// ================= draw: beach =================
function drawBeach(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f2dcaa'); g.addColorStop(1, '#e6c48a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(150,110,60,.18)';
  DECO.specks.forEach(s => ctx.fillRect(s[0] * W, s[1] * H, 1.5 + s[2] * 2, 1.5 + s[2] * 2));
  ctx.fillStyle = '#1f4a32'; ctx.fillRect(0, 0, W, .16 * H);
  DECO.jungle.forEach(j => { if (!(S.forestOpen && Math.abs(j[0] - .5) < .05)) ell(j[0] * W, j[1] * H, j[2] * U * 1.6, j[2] * U, j[3]); });
  if (S.forestOpen) {
    ctx.fillStyle = '#d8bd86'; ctx.beginPath(); ctx.moveTo(.47 * W, .23 * H); ctx.lineTo(.53 * W, .23 * H); ctx.lineTo(.515 * W, .05 * H); ctx.lineTo(.485 * W, .05 * H); ctx.fill();
    ctx.fillStyle = 'rgba(255,246,227,' + (.55 + .3 * Math.sin(t * 3)) + ')'; ctx.font = '600 ' + (4 * U) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('▲', .5 * W, .2 * H);
  }
  const mist = ctx.createLinearGradient(0, 0, 0, .24 * H); mist.addColorStop(0, 'rgba(230,240,230,0)'); mist.addColorStop(.7, 'rgba(235,240,225,.28)'); mist.addColorStop(1, 'rgba(240,230,200,0)');
  ctx.fillStyle = mist; ctx.fillRect(0, 0, W, .24 * H);
  if (SPIEL.turm()) drawPortal(t);   // v034: the thorn tower stands over the path into the forest
  const rk = { x: BEACH_TORT.fx * W, y: BEACH_TORT.fy * H };
  ell(rk.x, rk.y + 1.5 * U, 10 * U, 3.5 * U, '#8c8a86'); ell(rk.x - U, rk.y + .8 * U, 8 * U, 2.6 * U, '#a3a19c');
  drawPalm(palmBase(), palmCrown(), S.palmNuts, t);
  if (!S.hasStamp) {
    const sx = STAMP_SPOT.fx * W, sy = STAMP_SPOT.fy * H, a = (S.hint && S.hint.type === 'stamp' ? .55 : .12) + .12 * Math.sin(t * 2.3);
    ctx.strokeStyle = 'rgba(120,255,110,' + Math.max(0, a) + ')'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx - 1.2 * U, sy); ctx.lineTo(sx + 1.2 * U, sy); ctx.moveTo(sx, sy - 1.2 * U); ctx.lineTo(sx, sy + 1.2 * U); ctx.stroke();
    ell(sx, sy + .4 * U, 2.2 * U, .6 * U, 'rgba(160,120,70,.25)');
  }
  if (S.openNut) drawOpenNut(S.openNut.fx * W, S.openNut.fy * H);
  S.crabs.forEach(c => {
    if (!c.buried) { drawCrab(c.fx * W + Math.sin(t * 1.3 + c.ph) * 1.2 * U, c.fy * H, t + c.ph); return; }
    const x = c.fx * W, y = c.fy * H;
    ell(x, y + .4 * U, 3.2 * U, 1.1 * U, '#d9b47a'); ell(x - .6 * U, y, 2 * U, .6 * U, 'rgba(255,240,210,.5)');
    if (Math.sin(t * .9 + c.ph) > .75) { ell(x - .7 * U, y - .9 * U, .35 * U, .55 * U, '#e4572e'); ell(x + .7 * U, y - .9 * U, .35 * U, .55 * U, '#e4572e'); ell(x - .7 * U, y - 1.3 * U, .25 * U, .25 * U, '#2b1d12'); ell(x + .7 * U, y - 1.3 * U, .25 * U, .25 * U, '#2b1d12'); }
  });
  if (S.flot && S.flot.fy * H < S.wl - U) drawFlotsam(S.flot.fx * W, S.flot.fy * H, S.flot.kind, t);
  const w = S.tort.walk, walking = !!(w && w.t >= 0 && !(w.t > 4 && w.t < 5.6));
  const tface = w && w.t > 5.6 ? -1 : 1;
  drawTortoise(S.tort.fx * W, S.tort.fy * H, U, { rock: !w, asleep: tortAsleep(), bar: S.tort.bar, walking, face: tface });
  const cut = S.cut, fy = crFy();
  if (cut && cut.t > .4) {
    const cr = palmCrown(); drawCrusoe(cr.x + 2 * U, cr.y + 12 * U, 15 * U, { face: -1, stamp: S.hasStamp });
    drawKitten(cr.x - 4 * U, cr.y + 2 * U, 4.5 * U, { face: 1, scared: true });
  } else {
    ell(crX(), fy * H, 4 * U, 1.1 * U, 'rgba(120,80,40,.22)');
    const lying = S.wake ? 1 - S.wake.rise : 0;
    drawCrusoe(crX(), fy * H + lying * 2 * U, 17 * U, { face: S.cr.face, ph: S.cr.ph, stamp: S.hasStamp, prone: lying });
    if (!S.katzeWeg) ell(S.kt.fx * W, S.kt.fy * H, 2.2 * U, .7 * U, 'rgba(120,80,40,.22)');
    if (S.kt.joy > 0) { const kx = S.kt.fx * W, ky = S.kt.fy * H; ctx.save(); ctx.translate(kx, ky - 2.4 * U); ctx.rotate(Math.PI + Math.sin(S.time * 14) * .18); drawKitten(0, -2.4 * U, 5 * U, { face: S.kt.face, ph: S.time * 6 }); ctx.restore(); }   /* belly up, paws going */
    else if (!S.katzeWeg) drawKitten(S.kt.fx * W, S.kt.fy * H, 5 * U, { face: S.kt.face, ph: S.kt.ph, scared: !!cut, dig: S.kt.dig > 0 });
  }
  if (cut) cut.mons.forEach(r => drawTadpole(r.fx * W, r.fy * H, U * 1.1, { face: -1, ph: r.ph }));
  const wl = S.wl;
  ctx.fillStyle = 'rgba(205,165,105,.55)';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 12; x += 12) ctx.lineTo(x, wl - 2.8 * U + Math.sin(x * .013 + t * .7) * .9 * U);
  ctx.lineTo(W, H); ctx.fill();
  const sg = ctx.createLinearGradient(0, wl, 0, H); sg.addColorStop(0, 'rgba(110,220,205,.85)'); sg.addColorStop(.4, '#2bb3b1'); sg.addColorStop(1, '#16708c');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(0, H);
  const ur = .35 + .65 * SOUND.strandUnruhe(), wave = x => wl + (Math.sin(x * .02 + t * (1 + .6 * ur)) * .8 * U + Math.sin(x * .007 - t * .9) * .6 * U) * (.5 + ur) + Math.max(0, Math.sin(x * .004 - t * .5)) * 1.4 * U * ur * ur;   // v062: calm at ebb start, wavier as the beach hours run out
  for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, wave(x));
  ctx.lineTo(W, H); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(2, .4 * U);
  ctx.beginPath(); for (let x = 0; x <= W + 10; x += 10) { const y = wave(x); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); for (let x = 0; x <= W + 10; x += 10) { const y = wave(x) + 2.5 * U + Math.sin(x * .03 + t) * .5 * U; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  ctx.globalAlpha = wl < .9 * H ? .55 : .9;
  DECO.coral.forEach(c => { if (c[1] * H > wl) ell(c[0] * W, c[1] * H, c[2] * 2.2 * U, c[2] * U, c[3]); });
  ctx.globalAlpha = 1;
  if (S.wake) { drawWakeDark(t); return; }
  drawHintRing(t);
  drawReach();
}
function drawWakeDark(t) {
  // only the immediate surroundings are visible
  const x = crX() + S.cr.face * 8 * U * (1 - S.wake.rise), y = crFy() * H, r = S.wake.r * U;
  if (r < Math.max(W, H)) {   // blur everything outside the light
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(x, y, r * .55, 0, Math.PI * 2, true); ctx.clip('evenodd');
    ctx.filter = 'blur(' + Math.round(1.6 * U) + 'px)'; ctx.drawImage(cv, 0, 0, W, H); ctx.filter = 'none';
    ctx.restore();
  }
  const open = S.wake.phase === 'open' ? clamp(S.wake.t / 1.4, 0, 1) : 0;
  const g = ctx.createRadialGradient(x, y, r * .4, x, y, r * .85);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + (.995 * (1 - open)) + ')');
  ctx.fillStyle = g; ctx.fillRect(0, -OY, W, HS);
  // the kitten's eyes catch the light
  if (S.wake.phase === 'dark') {
    const kx = S.kt.fx * W, ky = S.kt.fy * H, f = S.kt.face, blink = (t % 3.2) < .12;
    if (!blink) { ell(kx + f * 3.6 * U, ky - 5.4 * U, .5 * U, .55 * U, '#d6ff7a'); ell(kx + f * 4.6 * U, ky - 5.4 * U, .45 * U, .5 * U, '#d6ff7a'); }
    if (S.openNut) { const nx = S.openNut.fx * W, ny = S.openNut.fy * H, a = .25 + .2 * Math.sin(t * 2.5); ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(nx - U, ny - 3 * U); ctx.lineTo(nx + U, ny - 3 * U); ctx.moveTo(nx, ny - 4 * U); ctx.lineTo(nx, ny - 2 * U); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.font = '600 ' + (3.2 * U) + 'px Fredoka, sans-serif';
    ctx.font = '700 ' + (4.2 * U) + 'px Fredoka, sans-serif'; ctx.lineWidth = 1.2 * U; ctx.strokeStyle = 'rgba(0,0,0,.8)'; const hint = TOUCH ? 'Hold the left or right edge to crawl — to the eyes' : 'Crawl with A / D — to the eyes';   // v070: readable, and without key names on a phone
    ctx.strokeText(hint, W / 2, 93 * U); ctx.fillStyle = 'rgba(255,246,227,' + (.8 + .2 * Math.sin(t * 3)) + ')'; ctx.fillText(hint, W / 2, 93 * U);
    if (TOUCH) { const side = S.kt.fx < S.cr.fx ? -1 : 1; for (const sd of [-1, 1]) { const ax = sd < 0 ? 5 * U : W - 5 * U, ay = H * .5, a = (sd === side ? .7 + .3 * Math.sin(t * 5) : .25); ctx.fillStyle = 'rgba(255,246,227,' + a + ')'; ctx.beginPath(); ctx.moveTo(ax + sd * 3 * U, ay); ctx.lineTo(ax - sd * 2 * U, ay - 4 * U); ctx.lineTo(ax - sd * 2 * U, ay + 4 * U); ctx.closePath(); ctx.fill(); } }
  }
}
function drawHintRing(t) {
  if (!S.hint || S.busy) return;
  let hx, hy;
  if (S.hint.type === 'palm') { const cr = palmCrown(); hx = cr.x; hy = cr.y + 3 * U; }
  else if (S.hint.type === 'crab' && S.crabs[0]) { hx = S.crabs[0].fx * W; hy = S.crabs[0].fy * H; }
  else if (S.hint.type === 'stamp') { hx = STAMP_SPOT.fx * W; hy = STAMP_SPOT.fy * H; }
  else return;   // 'buried': the digging cat is the only hint
  const p = (Math.sin(t * 4) + 1) / 2;
  ctx.strokeStyle = 'rgba(255,255,255,' + (.5 + .4 * p) + ')'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(hx, hy, (5.5 + p * 1.5) * U, 0, Math.PI * 2); ctx.stroke();
}
function drawReach() {
  const x = crX(), y = crFy() * H + 1.5 * U;
  ctx.strokeStyle = 'rgba(255,246,227,.22)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.ellipse(x, y, STATS.crusoe.reach * U, 3 * U, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
}

// ================= draw: palm forest =================
function drawForest(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#173d2c'); g.addColorStop(.6, '#245a3a'); g.addColorStop(1, '#3d6b3a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) {
    const x = (.15 + i * .24) * W + Math.sin(t * .2 + i) * 2 * U;
    ctx.fillStyle = 'rgba(255,240,180,' + (.06 + .03 * Math.sin(t * .7 + i)) + ')';
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 6 * U, 0); ctx.lineTo(x + 18 * U, H); ctx.lineTo(x + 8 * U, H); ctx.fill();
  }
  DECO.trunks.forEach(tr => {
    const x = tr[0] * W, wdt = tr[1] * 2 * U;
    ctx.strokeStyle = '#4e3a26'; ctx.lineWidth = wdt; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, H * .82); ctx.quadraticCurveTo(x + tr[2] * W, H * .4, x + tr[2] * W * 1.6, -5); ctx.stroke();
  });
  for (let i = 0; i < 16; i++) ell((i / 15) * W, (4 + (i % 3) * 3) * U, 12 * U, 7 * U, i % 2 ? '#1d4a30' : '#2a5e3b');
  ctx.fillStyle = '#4a6a34'; ctx.beginPath(); ctx.moveTo(0, .8 * H);
  for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, .8 * H + Math.sin(x * .02) * U);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  const p = poolPos();
  ell(p.x, p.y + 1.5 * U, 15 * U, 4.6 * U, '#3a5a2c');
  ell(p.x, p.y, 13 * U, 3.8 * U, S.poolSips > 0 ? '#4fb8c9' : '#7a8a5a');
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5;
  const rr = (t * .5) % 1; ctx.beginPath(); ctx.ellipse(p.x + 3 * U, p.y, rr * 6 * U, rr * 1.6 * U, 0, 0, Math.PI * 2); ctx.globalAlpha = 1 - rr; ctx.stroke(); ctx.globalAlpha = 1;
  ell(p.x - 7 * U, p.y - .5 * U, 2.2 * U, .9 * U, '#3f8f4f'); ell(p.x + 8 * U, p.y + .8 * U, 1.8 * U, .7 * U, '#3f8f4f');
  for (let i = 0; i < STATS.ebb.poolSips; i++) ell(p.x + (i - 1) * 2.4 * U, p.y - 6 * U, .8 * U, 1 * U, i < S.poolSips ? '#7fe3ff' : 'rgba(255,255,255,.2)');
  DECO.ferns.forEach(f => { if (Math.abs(f[0] * W - p.x) > 16 * U) ell(f[0] * W, f[1] * H, f[2] * 2 * U, f[2] * U, f[3]); });
  if (SPIEL.turm()) drawTowerHome(t);   // v034: the tower's roots make the forest a home
  drawRumBar(t); if (S.katzeWeg) drawCatCorner(t);
  ell(crX(), crFy() * H, 4 * U, 1.1 * U, 'rgba(0,0,0,.18)');
  drawCrusoe(crX(), crFy() * H, 19 * U, { face: S.cr.face, ph: S.cr.ph, stamp: S.hasStamp });
  if (!S.katzeWeg) drawKitten(S.kt.fx * W, S.kt.fy * H, 5.5 * U, { face: S.kt.face, ph: S.kt.ph });
  ctx.fillStyle = 'rgba(255,246,227,' + (.5 + .3 * Math.sin(t * 3)) + ')'; ctx.font = '600 ' + (3.6 * U) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('▼ beach', .5 * W, .86 * H);
  if (S.ffind) drawFlotsam(S.ffind.fx * W, S.ffind.fy * H, S.ffind.kind, t);
  drawReach();
}

// v034: the beach tower — two twisted thorn-root pillars either side of the forest path, too tall to see the top
function rootStrand(x0, y0, x1, y1, bow, w0, w1, col) {
  const n = 18; for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n, P = u => [lerp(x0, x1, u) + Math.sin(u * Math.PI) * bow, lerp(y0, y1, u)];
    const [ax, ay] = P(a), [bx, by] = P(b); ctx.strokeStyle = col; ctx.lineWidth = lerp(w0, w1, a); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
}
function drawPortal(t) {
  const gy = .27 * H;
  const g = ctx.createRadialGradient(.5 * W, .14 * H, 0, .5 * W, .14 * H, .14 * W); g.addColorStop(0, 'rgba(190,255,140,' + (.22 + .08 * Math.sin(t * 1.3)) + ')'); g.addColorStop(1, 'rgba(190,255,140,0)');
  ctx.fillStyle = g; ctx.fillRect(.34 * W, 0, .32 * W, .3 * H);
  [-1, 1].forEach(sd => {
    const bx = .5 * W + sd * .085 * W;
    for (let k = 0; k < 5; k++) { const a = (k - 2) * .5; rootStrand(bx + sd * k * .4 * U, gy, bx + sd * (3 + k) * U + a * 6 * U, gy + (2 + k % 2) * U, 0, 1.6 * U, .6 * U, '#4a3220'); rootStrand(bx, gy, bx + sd * (8 + k * 4) * U, gy + (1 + k * .8) * U, -sd * U, 1.4 * U, .4 * U, '#5a3d22'); }   // feet on the sand
    [[-2.2, '#3d2816', 6.5], [0, '#5a3d22', 7.5], [2.2, '#6e4a2a', 5.5]].forEach(([o, col, w], i) => rootStrand(bx + o * U, gy, .5 * W + sd * (.04 * W + o * U * .4), -6 * U, sd * (5 + i * 3) * U * Math.sin(i + 1), w * U, (w - 2.5) * U, col));
    rootStrand(bx + sd * 1.4 * U, gy, .5 * W + sd * .045 * W, -6 * U, sd * 6 * U, 1.6 * U, .8 * U, 'rgba(214,170,110,.6)');   // light on the bark
    ctx.fillStyle = '#e8c88a'; for (let i = 0; i < 9; i++) { const u = i / 9, y = lerp(gy - 2 * U, -4 * U, u), x = lerp(bx, .5 * W + sd * .04 * W, u) + Math.sin(u * Math.PI) * sd * 6 * U + (i % 2 ? 3.2 : -3.2) * U * sd; const d = i % 2 ? sd : -sd;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * 1.8 * U, y - .6 * U); ctx.lineTo(x, y - 1.2 * U); ctx.fill(); }
    ctx.fillStyle = '#3f8f4f'; for (let i = 0; i < 4; i++) ell(bx + sd * (i % 2 ? 2.5 : -2) * U, gy - (5 + i * 7) * U, 1.8 * U, .9 * U, '#3f8f4f');
  });
  for (let i = 0; i < 6; i++) { const ph = t * .6 + i * 1.7, x = .5 * W + Math.sin(ph) * .05 * W, y = (.05 + ((i * .17 + t * .05) % 1) * .2) * H; ell(x, y, .6 * U, .6 * U, 'rgba(210,255,160,' + (.5 + .4 * Math.sin(ph * 3)) + ')'); }
}
// v034: in the forest the tower's roots come down: a root roof over a sleeping corner, a hammock, firefly lanterns
function drawTowerHome(t) {
  const xl = .22 * W, xr = .43 * W, gy = .8 * H, hy = .5 * H;
  [[xl, -1], [xr, 1]].forEach(([x, sd]) => { rootStrand(x + sd * 4 * U, -4 * U, x, gy, sd * 3 * U, 3.5 * U, 5 * U, '#4a3220'); rootStrand(x - sd * 2 * U, -4 * U, x + sd * 1.5 * U, gy, -sd * 2 * U, 2.4 * U, 3.6 * U, '#5a3d22');
    for (let k = 0; k < 4; k++) rootStrand(x, gy - 1 * U, x + (k - 1.5) * 4 * U, gy + 1.5 * U, 0, 1.4 * U, .5 * U, '#4a3220'); });
  for (let i = 0; i < 5; i++) rootStrand(xl, .18 * H + i * 1.6 * U, xr, .18 * H + i * 1.6 * U, -(10 + i * 2) * U, 2 * U, 2 * U, i % 2 ? '#4a3220' : '#5a3d22');   // the roof
  for (let i = 0; i < 9; i++) ell(lerp(xl, xr, i / 8), .15 * H - Math.sin(i / 8 * Math.PI) * 9 * U, 4 * U, 2.2 * U, i % 2 ? '#2f6a3a' : '#3f8f4f');
  // hammock between the two aerial roots
  ctx.strokeStyle = '#e8d6aa'; ctx.lineWidth = .8 * U; ctx.beginPath(); ctx.moveTo(xl, hy - 6 * U); ctx.lineTo(xl + 4 * U, hy); ctx.moveTo(xr, hy - 6 * U); ctx.lineTo(xr - 4 * U, hy); ctx.stroke();
  const ham = ['#f2e4c2', '#d6453a', '#f2e4c2', '#2c8c88'];
  for (let i = 0; i < 12; i++) { const u0 = i / 12, u1 = (i + 1) / 12, X = u => lerp(xl + 4 * U, xr - 4 * U, u), Y = u => hy + Math.sin(u * Math.PI) * 7 * U;
    ctx.fillStyle = ham[Math.floor(i / 2) % 4]; ctx.beginPath(); ctx.moveTo(X(u0), Y(u0)); ctx.lineTo(X(u1), Y(u1)); ctx.lineTo(X(u1), Y(u1) + 2.4 * U); ctx.lineTo(X(u0), Y(u0) + 2.4 * U); ctx.fill(); }
  // firefly lanterns hanging from the roots
  [[xl + 3 * U, .3 * H], [xr - 3 * U, .34 * H], [(xl + xr) / 2, .22 * H]].forEach(([x, y], i) => {
    ctx.strokeStyle = '#3b2a1a'; ctx.lineWidth = .6 * U; ctx.beginPath(); ctx.moveTo(x, y - 6 * U); ctx.lineTo(x, y - 1.5 * U); ctx.stroke();
    const a = .55 + .3 * Math.sin(t * 2 + i * 2), g = ctx.createRadialGradient(x, y, 0, x, y, 9 * U); g.addColorStop(0, 'rgba(220,255,150,' + a + ')'); g.addColorStop(1, 'rgba(220,255,150,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 9 * U, y - 9 * U, 18 * U, 18 * U); ctx.fillStyle = 'rgba(110,80,40,.9)'; ctx.fillRect(x - 1.4 * U, y - 1.8 * U, 2.8 * U, 3.6 * U); ell(x, y, .9 * U, 1.2 * U, '#f6ffd0');
  });
}
function demoEnde(onPlay) { S.pointers.clear(); if (window.titleOut && window.titleEnd) window.titleEnd(onPlay); else if (onPlay) onPlay(); }   // v033: end-of-demo screen (titel.js)
// v033: the rum store — a bar grown from roots and branches; it grows with the stock, every bottle its own
function drawRumBar(t) {
  const n = S.rum; if (n <= 0 && !S.forestOpen) return;
  const per = 6, rows = Math.max(1, Math.ceil(n / per)), x0 = .05 * W, gy = .8 * H, w = 30 * U, sh = 7.5 * U, top = gy - 5 * U - rows * sh;
  ctx.strokeStyle = '#5a3f24'; ctx.lineCap = 'round';
  ctx.lineWidth = 2.2 * U; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.bezierCurveTo(x0 - 2 * U, gy - 20 * U, x0 + 1 * U, top + 6 * U, x0 - 1 * U, top - 2 * U); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0 + w, gy); ctx.bezierCurveTo(x0 + w + 2 * U, gy - 18 * U, x0 + w - 1 * U, top + 8 * U, x0 + w + 1 * U, top - 3 * U); ctx.stroke();
  ctx.lineWidth = .7 * U; ctx.strokeStyle = '#6e5130';
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0 + k * 1.3 * U - 1 * U, gy); ctx.quadraticCurveTo(x0 - 3 * U - k * 2 * U, gy - 2 * U, x0 - 5 * U - k * 1.5 * U, gy + .5 * U); ctx.stroke(); }
  for (let r = 0; r <= rows; r++) { const y = gy - 5 * U - r * sh; ctx.strokeStyle = r % 2 ? '#6b4a2a' : '#7a5632'; ctx.lineWidth = 1.4 * U; ctx.beginPath(); ctx.moveTo(x0 - 1 * U, y + Math.sin(r * 2.1) * .4 * U); ctx.quadraticCurveTo(x0 + w / 2, y + 1.1 * U, x0 + w + 1 * U, y - Math.sin(r * 1.3) * .4 * U); ctx.stroke();
    if (r < rows) { ell(x0 + w * (.2 + .6 * ((r * 37) % 10) / 10), y + .3 * U, 1.3 * U, .6 * U, '#3f8f4f'); } }
  const COLS = ['#6b3a1e', '#8a4a20', '#3e5a2a', '#5a2a3a', '#7a6a2a', '#2f4a5a'];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / per), c = i % per, s = (i * 7919) % 97 / 97, x = x0 + 3 * U + c * (w - 6 * U) / (per - 1), y = gy - 5 * U - r * sh - .7 * U, h = (4.2 + 1.6 * s) * U, bw = (1.5 + .6 * ((i * 31) % 5) / 5) * U;
    ctx.fillStyle = COLS[(i * 5) % COLS.length]; ctx.beginPath(); ctx.roundRect(x - bw / 2, y - h, bw, h, .5 * U); ctx.fill();
    ctx.fillRect(x - bw * .2, y - h - 1.5 * U, bw * .4, 1.6 * U); ctx.fillStyle = '#c9a874'; ctx.fillRect(x - bw * .22, y - h - 2 * U, bw * .44, .6 * U);
    ctx.fillStyle = i % 3 ? '#efe2c2' : '#f4d27a'; ctx.fillRect(x - bw * .42, y - h * .62, bw * .84, h * .3);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - bw * .35, y - h * .95, bw * .15, h * .8);
  }
  ctx.fillStyle = 'rgba(255,246,227,.85)'; ctx.font = '600 ' + (2.6 * U) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n ? '🥃 ' + n + ' in store' : 'the rum bar · empty', x0 + w / 2, top - 4 * U);
}
// v033: while the cat is gone — a few photos on a stump, her bowls filled every day
function drawCatCorner(t) {
  const bx = .82 * W, gy = .8 * H;
  ell(bx, gy - 1 * U, 9 * U, 2.6 * U, '#5a3f24'); ctx.fillStyle = '#6b4a2a'; ctx.fillRect(bx - 8 * U, gy - 7 * U, 16 * U, 6 * U); ell(bx, gy - 7 * U, 8 * U, 2.2 * U, '#8a6a42'); ell(bx, gy - 7 * U, 5 * U, 1.3 * U, '#a07c4e');
  const photo = (x, y, rot, scene) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = '#fbf6ea'; ctx.fillRect(-4.6 * U, -6 * U, 9.2 * U, 9 * U); ctx.fillStyle = scene.bg; ctx.fillRect(-3.8 * U, -5.2 * U, 7.6 * U, 6.4 * U); scene.draw(); ctx.restore(); };
  photo(bx - 6 * U, gy - 12 * U, -.18, { bg: '#cfe6ea', draw: () => drawKitten(0, -.6 * U, 3.2 * U, { face: 1, ph: 0, sit: true }) });   // the kitten
  photo(bx + 1 * U, gy - 14 * U, .06, { bg: '#f1d9a0', draw: () => { drawCrusoe(-1.4 * U, .6 * U, 6 * U, { face: 1, ph: 0 }); drawKitten(2 * U, .6 * U, 2.4 * U, { face: -1, ph: 0 }); } });   // with Robinson
  photo(bx + 8 * U, gy - 12 * U, .2, { bg: '#e8c6c0', draw: () => { drawKitten(-1 * U, .6 * U, 2.8 * U, { face: 1, ph: 0, dash: true }); ctx.fillStyle = '#5a2a6a'; ell(2.4 * U, -1 * U, 1.4 * U, 1.6 * U, '#5a2a6a'); } });   // a big fight
  const bowl = (x, fillCol) => { ell(x, gy + 1.5 * U, 2.6 * U, .9 * U, '#c4483a'); ctx.fillStyle = '#d65a48'; ctx.fillRect(x - 2.6 * U, gy + .2 * U, 5.2 * U, 1.3 * U); ell(x, gy + .2 * U, 2.6 * U, .8 * U, '#a83a30'); ell(x, gy + .2 * U, 2 * U, .55 * U, fillCol); };
  bowl(bx - 4 * U, '#8a5a32'); bowl(bx + 4 * U, 'rgba(120,200,230,' + (.8 + .1 * Math.sin(t * 2)) + ')');
}

// ================= v043: upright screens — what is above and below the beach scene =================
const LBOX = []; for (let i = 0; i < 60; i++) LBOX.push([Math.random(), Math.random(), .6 + Math.random() * .9, Math.random() < .5 ? '#1d4a2e' : '#26583a']);
function drawLetterbox(t) {
  if (OY <= 0 && HS <= H) return;
  const bot = HS - OY - H, sea = S.screen === 'swim' || S.screen === 'start', forest = S.screen === 'forest';
  if (OY > 0) {   // above: the jungle canopy (or more sky / sea)
    const g = ctx.createLinearGradient(0, -OY, 0, 0);
    if (sea) { g.addColorStop(0, '#0a3242'); g.addColorStop(1, '#0d3f52'); } else { g.addColorStop(0, '#0b2216'); g.addColorStop(1, forest ? '#173d2c' : '#1f4a32'); }
    ctx.fillStyle = g; ctx.fillRect(0, -OY, W, OY + 1);
    if (!sea) LBOX.forEach(j => { const y = -OY * j[1]; ctx.globalAlpha = .45 + .5 * (1 - j[1]); ell(j[0] * W + Math.sin(t * .4 + j[0] * 9) * U * .4, y, j[2] * 6 * U, j[2] * 3.6 * U, j[3]); });
    ctx.globalAlpha = 1;
  }
  if (bot > 0) {   // below: the lagoon (beach), the forest floor, or the deep
    const g = ctx.createLinearGradient(0, H, 0, H + bot);
    if (forest) { g.addColorStop(0, '#3d6b3a'); g.addColorStop(1, '#22401f'); } else if (sea) { g.addColorStop(0, '#0d3f52'); g.addColorStop(1, '#072a38'); } else { g.addColorStop(0, '#16708c'); g.addColorStop(1, '#0b4258'); }
    ctx.fillStyle = g; ctx.fillRect(0, H - 1, W, bot + 2);
    if (!forest && !sea) { ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let i = 0; i < 7; i++) { const y = H + bot * (.15 + i * .12), x = ((i * 137 + t * (8 + i * 3)) % (W + 120)) - 60; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20, y - 3, x + 44, y); ctx.stroke(); } }
  }
}

// ================= floats & particles =================
function drawFX(dt) {
  S.parts.forEach(p => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * U * dt; ctx.globalAlpha = Math.max(0, 1 - p.t / p.life); ell(p.x, p.y, (p.r || .6) * U, (p.r || .6) * U, p.col); });
  ctx.globalAlpha = 1;
  S.parts = S.parts.filter(p => p.t < p.life);
  ctx.textAlign = 'center'; ctx.font = '600 ' + Math.max(14, 3.4 * U) + 'px Fredoka, sans-serif'; ctx.lineJoin = 'round';
  S.floats.forEach(f => {
    f.t += dt; const a = Math.max(0, 1 - f.t / f.life), y = f.y - f.t * 6 * U;
    ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(59,42,26,.75)'; ctx.lineWidth = 4; ctx.strokeText(f.txt, f.x, y); ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, y);
  });
  ctx.globalAlpha = 1; S.floats = S.floats.filter(f => f.t < f.life);
}

// ================= collect movement =================
function collectWalkDir() {
  let d = 0;
  if (S.keys.a || S.keys.arrowleft) d -= 1;
  if (S.keys.d || S.keys.arrowright) d += 1;
  for (const p of S.pointers.values()) { if (p.walk) { if (p.x < W / 3) d -= 1; else if (p.x > W * 2 / 3) d += 1; } }
  return clamp(d, -1, 1);
}
function updateCollect(dt) {
  if (S.screen === 'beach') {
    if (S.cut) updateCutscene(dt); else S.wl += (waterTarget() - S.wl) * Math.min(1, dt * 2.5);
    updateTortoise(dt);
    if (S.wake) updateWake(dt);
  }
  if (S.screen !== 'beach' && S.screen !== 'forest') return;
  const crawling = S.wake && S.wake.phase === 'dark', standingUp = S.wake && S.wake.phase === 'open';
  if ((!S.busy || S.spent) && !standingUp && el.panel.style.display !== 'flex' && !TRAUM.offen) {
    const d = collectWalkDir();
    const sp = crawling ? STATS.crusoe.crawl : STATS.crusoe.walk;
    if (d) { S.cr.fx = clamp(S.cr.fx + d * sp * U * dt / W, .06, .94); S.cr.face = d; S.cr.ph += dt * (crawling ? 4 : 10); }
  }
  if (S.tut >= 4 && !S.seen.waitTip && S.screen === 'beach' && !S.busy && !BQ.on && BQ.gap <= 0 && S.time - (S.lastAct || 0) > 8 && el.waitBtn.style.display === 'block') {
    S.seen.waitTip = true; say(LINES.waitTip); el.waitBtn.classList.add('hint'); }
  const k = S.kt;
  if (S.wake) { k.tfx = OPEN_NUT.fx - .035; k.tfy = OPEN_NUT.fy + .01; }
  else if (k.circle && !S.hint && S.screen === 'beach' && !S.busy) {   // weaving round his legs: pet me!
    k.tfx = S.cr.fx + .035 * Math.cos(S.time * 2.4); k.tfy = crFy() + .02 + .018 * Math.sin(S.time * 2.4);
    if (Math.random() < dt * .5) float(k.fx * W, k.fy * H - 7 * U, Math.random() < .5 ? '♥?' : 'mrrp?', '#ffc58a');
    if (!S.seen.petTip && !BQ.on && BQ.gap <= 0) { S.seen.petTip = true; say(LINES.petTip); }   /* v017: say it while she does it */
  }
  else if (!S.hint || S.screen === 'forest') { k.tfx = S.cr.fx - .06 * S.cr.face; k.tfy = crFy() + .02; }
  if (k.held || k.joy > 0) { k.tfx = k.fx; k.tfy = k.fy; }
  if (k.joy > 0) { k.joy -= dt; if (Math.random() < dt * 9) S.parts.push({ x: k.fx * W + rand(-3, 3) * U, y: k.fy * H - 4 * U, vx: rand(-6, 6) * U, vy: rand(-22, -12) * U, life: rand(.6, 1.1), t: 0, col: ['#ff7f6b', '#ffb3c1', '#ff4d6d'][Math.floor(rand(0, 3))], r: rand(.6, 1.1) }); }
  const dx = k.tfx - k.fx, dy = k.tfy - k.fy, dd = Math.hypot(dx, dy), sp = (S.wake ? .12 : .32) * dt;
  if (dd > .004) { const m = Math.min(1, sp / dd); k.fx += dx * m; k.fy += dy * m; k.ph += dt * 10; if (Math.abs(dx) > .002) k.face = dx > 0 ? 1 : -1; k.dig = 0; }
  else if (S.wake) { k.face = S.cr.fx > k.fx ? 1 : -1; }
  else if (S.hint && (S.hint.type === 'stamp' || S.hint.type === 'buried')) {
    k.face = 1; k.dig += dt; k.ph += dt * 3;
    if (Math.random() < dt * 6) S.parts.push({ x: k.fx * W + 3 * U, y: k.fy * H - .5 * U, vx: rand(-14, -4) * U, vy: rand(-12, -5) * U, life: .4, t: 0, col: '#d9b47a', r: .4 });
  }
}

// ================= main loop =================
let lastT = 0;
function frame(ms) {
  try { frameBody(ms); } catch (err) { console.error(err); }   // v018: an error can no longer stop the loop (that left a frozen, veiled picture)
  WELT.raf(frame);   // v030: one render loop for the game — only the visible world draws
}
function frameBody(ms) {
  const now = ms / 1000, dt = Math.min(.05, lastT ? now - lastT : .016); lastT = now;
  S.time += dt; S.katzeWeg = SPIEL.katzeWeg();   // v033: she can leave in the middle of an ebb
  if (findOpen()) {}   // the tortoise waits while a find is being read
  else if (BQ.gap > 0) { BQ.gap -= dt; if (BQ.gap <= 0) nextLine(); }
  else if (BQ.on) { BQ.t -= dt; if (BQ.t <= 0) { if (BQ.q.length) { BQ.gap = .5; el.bubble.style.display = 'none'; } else nextLine(); } }
  if (S.screen === 'swim' && S.swim) { updateSwim(dt); if (S.swim) drawSwim(S.time); }
  if (inCollect()) updateCollect(dt);
  if (S.screen === 'beach') drawBeach(S.time);
  else if (S.screen === 'forest') drawForest(S.time);
  else if (S.screen === 'combat') { drawBeach(S.time); ctx.fillStyle = 'rgba(8,40,52,.45)'; ctx.fillRect(0, -OY, W, HS); }   // v041: behind the result card
  else if (S.screen === 'start') { ctx.fillStyle = '#0d3f52'; ctx.fillRect(0, -OY, W, HS); }
  drawLetterbox(S.time);
  drawFX(dt);
  if (S.fade > 0) { S.fade = Math.max(0, S.fade - dt * (S.wake ? 1 : 2.5)); ctx.fillStyle = 'rgba(0,0,0,' + S.fade + ')'; ctx.fillRect(0, -OY, W, HS); }
  if (BQ.on) placeBubble();
}

// ================= input =================
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); S.lastAct = S.time;
  const x = e.clientX, y = e.clientY - OY;   // v043: scene coordinates (upright screens are letterboxed)
  if (S.screen === 'swim' && S.swim && S.swim.kitten && S.swim.kitten.sx !== undefined && dist(x, y, S.swim.kitten.sx, S.swim.kitten.sy) < Math.max(34, 7 * U)) { petHoldStart(() => openPet(), 1500); return; }   // v062: hold the kitten on her plank — the cat screen from the intro
  if ((S.screen === 'beach' || S.screen === 'forest') && !S.wake && !S.katzeWeg && dist(x, y, S.kt.fx * W, S.kt.fy * H - 2 * U) < Math.max(30, 5 * U)) { S.kt.held = true; petHoldStart(() => { S.kt.held = false; openPet(petBonus()); }); if (S.upg.lapcat) lapStroke(); }
  if (S.screen === 'beach' || S.screen === 'forest') {
    const hit = S.screen === 'beach' ? onBeachTap(x, y) : onForestTap(x, y);
    if (hit || (S.busy && !S.spent)) return;
    if (!S.wake && !S.spent) {
      if (S.screen === 'beach' && y < .24 * H) { goForest(); return; }
      if (S.screen === 'forest' && y > .84 * H) { goBeach(); return; }
    }
    if (x < W / 3 || x > W * 2 / 3) { S.tapGo = { d: x < W / 3 ? -1 : 1, bis: S.time + 0.45 }; S.pointers.set(e.pointerId, { x, walk: true }); try { cv.setPointerCapture(e.pointerId); } catch (_) {} }
  } else if (S.screen === 'swim') { if (x < W / 3 || x > W * 2 / 3) S.tapGo = { d: x < W / 3 ? -1 : 1, bis: S.time + 0.45 }; S.pointers.set(e.pointerId, { x }); try { cv.setPointerCapture(e.pointerId); } catch (_) {} }
});
cv.addEventListener('pointermove', e => { const p = S.pointers.get(e.pointerId); if (p) p.x = e.clientX; });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => cv.addEventListener(n, e => { S.pointers.delete(e.pointerId); petHoldCancel(); }));
window.addEventListener('keydown', e => {
  if (!WELT.aktiv()) return;   // v030: keys belong to the visible scene
  const k = e.key.toLowerCase(); S.keys[k] = true; S.lastAct = S.time;
  if (e.repeat || el.panel.style.display === 'flex' || TRAUM.offen) return;
  if (S.screen === 'combat') return;
  if ((k === 'w' || k === 'arrowup') && S.screen === 'beach') goForest();
  if ((k === 's' || k === 'arrowdown') && S.screen === 'forest') goBeach();
});
window.addEventListener('keyup', e => { S.keys[e.key.toLowerCase()] = false; });
window.addEventListener('blur', () => { S.keys = {}; S.pointers.clear(); });
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (!AU.ctx) return; try { if (AU.ctx.state === 'closed') { AU.ctx = null; return; } (document.hidden ? AU.ctx.suspend() : AU.ctx.resume()).catch(() => {}); } catch (e) {} lastT = 0; });
el.bubble.addEventListener('click', e => { e.stopPropagation(); if (BQ.on && BQ.gap <= 0) nextLine(); });   // v016: tap the bubble to read on
el.mute.addEventListener('click', () => {
  AU.muted = !AU.muted; el.mute.textContent = AU.muted ? '🔇' : '🔊';
  if (AU.master && AU.ctx) AU.master.gain.setTargetAtTime(AU.muted ? 0 : .8, AU.ctx.currentTime, .05);
});
el.waitBtn.addEventListener('click', () => { el.waitBtn.classList.remove('hint');
  if (SPIEL.inselBereit) { if (inCollect() && !S.wake && !S.cut) { if (S.round) S.round.tide_free = S.tide; SPIEL.endEbb(); } return; }   // v030: one End ebb for beach and island
  if (S.spent && inCollect() && !S.wake) { S.spent = false; startFlood(); return; }
  if (!inCollect() || S.busy || S.wake) return; if (S.round) S.round.tide_free = S.tide; S.leftTides = S.hasStamp ? S.tide : 0; S.tide = 0; S.spent = false; S.busy = true; S.pointers.clear(); el.panel.style.display = 'none'; updateHUD(); setTimeout(startFlood, 400); });
// v061: tutorials on/off — the island's scripted first steps and the surf's learning signs
function tutTaste() { const b = $('tlTut'); if (!b) return; let off = false; try { off = localStorage.getItem('robinson_tutorials') === 'off'; } catch (e) {} b.textContent = 'TUTORIALS: ' + (off ? 'OFF' : 'ON'); b.classList.toggle('off', off); }
tutTaste();
el.overlay.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('#tlTut')) { try { localStorage.setItem('robinson_tutorials', localStorage.getItem('robinson_tutorials') === 'off' ? 'on' : 'off'); } catch (_) {} tutTaste(); e.stopPropagation(); return; }
  if (S.screen === 'start' && e.target.closest && e.target.closest('#tlCont')) {   // v030: continue from the autosave
    audioInit(); if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume(); SPIEL.ladeAutosave(); return;
  }
  if (S.screen !== 'start' || !e.target.closest || !e.target.closest('#tlStart')) return;
  SPIEL.neuesSpiel();   // v030/v033: a new adventure starts a new save file
  audioInit(); if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume();
  try { S.gameN = (+localStorage.getItem(GAME_KEY) || 0) + 1; localStorage.setItem(GAME_KEY, S.gameN); } catch (e) { S.gameN = 1; }
  if (window.titleOut) window.titleOut(() => el.overlay.remove()); else { el.overlay.style.opacity = 0; setTimeout(() => el.overlay.remove(), 650); }
  startSwim(); setTimeout(resize, 0);
});


// ================= v017: sketches you find (survey page on the beach, bark map in the forest) =================
function showSketch(kind) {
  const c = $('skCv'), g = c.getContext('2d'), w = c.width, h = c.height; let seed = kind === 'survey' ? 7 : 11; const R = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const isle = (cx, cy, rx, ry, jag) => { g.beginPath(); for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, r = 1 + (R() - .5) * jag + .18 * Math.sin(a * 3 + 1) + .1 * Math.sin(a * 5); g.lineTo(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r); } g.closePath(); };
  g.setTransform(1, 0, 0, 1, 0, 0); g.setLineDash([]); g.globalAlpha = 1;
  if (kind === 'survey') {
    g.fillStyle = '#f3ead2'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(80,110,150,.18)'; g.lineWidth = 1; for (let x = 20; x < w; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 20; y < h; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = 'rgba(60,90,130,.45)'; g.setLineDash([4, 5]); isle(w * .5, h * .55, 200, 125, .12); g.stroke(); g.setLineDash([]);   // the reef
    g.fillStyle = '#e8dcb8'; g.strokeStyle = '#2a3a5a'; g.lineWidth = 2; seed = 7; isle(w * .5, h * .55, 160, 95, .1); g.fill(); g.stroke();
    g.lineWidth = 1.2; g.beginPath(); g.moveTo(w * .62, h * .44); g.lineTo(w * .67, h * .32); g.lineTo(w * .72, h * .44); g.stroke(); for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(w * .63 + i * 6, h * .43); g.lineTo(w * .65 + i * 6, h * .38); g.stroke(); }   // the mountain, hatched
    g.font = "600 18px 'Courier New', monospace"; g.fillStyle = '#2a3a5a'; g.textAlign = 'left'; g.fillText('SURVEY — LOT 7', 22, 34); g.font = "13px 'Courier New', monospace"; g.fillText('Ferrant Capital · Survey Dept. · not for distribution', 22, 54);
    g.textAlign = 'right'; g.fillText('scale 1 : 25 000', w - 22, h - 20); g.beginPath(); g.moveTo(w - 140, h - 34); g.lineTo(w - 22, h - 34); g.stroke();
    g.beginPath(); g.moveTo(w - 40, 90); g.lineTo(w - 40, 50); g.lineTo(w - 46, 62); g.moveTo(w - 40, 50); g.lineTo(w - 34, 62); g.stroke(); g.textAlign = 'center'; g.fillText('N', w - 40, 106);
    g.save(); g.translate(w * .3, h * .82); g.rotate(-.18); g.strokeStyle = '#39b839'; g.lineWidth = 2.5; g.strokeRect(-50, -16, 100, 32); g.fillStyle = '#39b839'; g.font = "700 20px 'Courier New', monospace"; g.fillText('NOTAX', 0, 7); g.restore();
  } else {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#6a4a2e'); gr.addColorStop(1, '#4e3420'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(30,18,10,.35)'; g.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = R() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 20, h * .3, x - 20, h * .7, x + 8, h); g.stroke(); }
    const ink = '#e8d2a0'; g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 2.2; g.lineCap = 'round'; seed = 11; isle(w * .5, h * .53, 175, 115, .14); g.stroke();
    g.font = "15px 'Patrick Hand', cursive"; g.textAlign = 'center';
    [[.4, .26], [.46, .24], [.52, .27]].forEach(([x, y]) => { g.beginPath(); g.moveTo(w * x - 8, h * y); g.quadraticCurveTo(w * x - 3, h * y - 6, w * x, h * y); g.quadraticCurveTo(w * x + 3, h * y - 6, w * x + 8, h * y); g.stroke(); }); g.fillText('boobies', w * .46, h * .2);
    g.beginPath(); g.moveTo(w * .66, h * .5); g.lineTo(w * .72, h * .34); g.lineTo(w * .78, h * .5); g.stroke(); g.beginPath(); g.moveTo(w * .7, h * .3); g.quadraticCurveTo(w * .72, h * .26, w * .74, h * .3); g.quadraticCurveTo(w * .76, h * .26, w * .78, h * .3); g.stroke(); g.fillText('bats', w * .74, h * .24);
    g.beginPath(); g.ellipse(w * .34, h * .76, 9, 5, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(w * .34 - 9, h * .76); g.lineTo(w * .34 - 15, h * .72); g.moveTo(w * .34 + 9, h * .76); g.lineTo(w * .34 + 15, h * .72); g.stroke(); g.fillText('crabs', w * .34, h * .86);
    g.beginPath(); g.moveTo(w * .56, h * .8); g.quadraticCurveTo(w * .6, h * .76, w * .63, h * .8); g.quadraticCurveTo(w * .6, h * .84, w * .56, h * .8); g.lineTo(w * .54, h * .77); g.moveTo(w * .56, h * .8); g.lineTo(w * .54, h * .83); g.stroke(); g.fillText('fish', w * .6, h * .9);
    [[.3, .55], [.38, .62], [.62, .64]].forEach(([x, y]) => { g.beginPath(); g.moveTo(w * x, h * y); g.lineTo(w * x + 2, h * y - 18); for (let a = -2.6; a <= -.5; a += .5) { g.moveTo(w * x + 2, h * y - 18); g.lineTo(w * x + 2 + Math.cos(a) * 11, h * y - 18 + Math.sin(a) * 7 + 4); } g.stroke(); });
    g.lineWidth = 3; g.beginPath(); g.moveTo(w * .5, h * .62); g.lineTo(w * .5, h * .48); g.stroke(); g.lineWidth = 2.2; g.beginPath(); g.arc(w * .5, h * .43, 16, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ff9a8a'; g.beginPath(); g.moveTo(w * .5, h * .46); g.bezierCurveTo(w * .5 - 9, h * .42, w * .5 - 5, h * .38, w * .5, h * .41); g.bezierCurveTo(w * .5 + 5, h * .38, w * .5 + 9, h * .42, w * .5, h * .46); g.fill();
    g.fillStyle = ink; g.font = "20px 'Patrick Hand', cursive"; g.textAlign = 'right'; g.fillText('— Crusoe', w - 24, h - 20);
  }
  $('skCv').style.display = 'block'; $('sketch').style.display = 'flex';
}
function showFind(who, lines, sketch) {   // v018: a find is its own card, independent of the tortoise
  $('fkWho').textContent = who; $('fkTxt').textContent = lines.join(' ');
  if (sketch) showSketch(sketch); else { $('skCv').style.display = 'none'; $('sketch').style.display = 'flex'; }
}
function findOpen() { return $('sketch').style.display === 'flex'; }
$('skBtn').addEventListener('click', e => { e.stopPropagation(); $('sketch').style.display = 'none'; });

// ================= hidden skip: pet the cat =================
const PET = { hold: null };   // the long press that opens her window
// v012 Lap Cat: four quick strokes on the beach → +1 stamina at the end (same once-per-tide cuddle as her screen)
function lapStroke() {
  const now = S.time, L = S.lap || (S.lap = { n: 0, t: -9 });
  if (now - L.t > 2.5) L.n = 0; L.n++; L.t = now;
  const cx = S.kt.fx * W, cy = S.kt.fy * H - 8 * U;
  if (L.n < 4) { float(cx, cy, '♥'.repeat(L.n), '#ff9a8a'); SFX.purr(); return; }
  L.n = 0; const r = petBonus();
  if (r === 'used') float(cx, cy, 'She had her cuddle this tide', '#e9dcc0');
  else if (r === 'full') float(cx, cy, 'Full of energy — she saves it', '#e9dcc0');
  else if (r === 'gained') { SFX.purr(); setTimeout(() => SFX.purr(), 350); setTimeout(() => SFX.cat('happy'), 600); }
}
function petHoldStart(fn, ms) { petHoldCancel(); PET.hold = setTimeout(() => { PET.hold = null; S.pointers.clear(); fn(); }, ms || 3000); }
function petHoldCancel() { S.kt.held = false; if (PET.hold) { clearTimeout(PET.hold); PET.hold = null; } }
function petBonus() {
  if (!S.hasStamp) return null;
  if (S.petToday) return 'used';
  if (S.stamina >= S.maxStamina) return 'full';
  S.petToday = true; S.kt.circle = false; S.stamina++; S.kt.joy = 2.4;   // v017: she rolls over, hearts fly
  float(S.kt.fx * W, S.kt.fy * H - 8 * U, '+1 Stamina', '#ffb347');
  const st = $('stats'); st.classList.remove('boost'); void st.offsetWidth; st.classList.add('boost');
  updateHUD(); return 'gained';
}
// v036: the cat window is one window for the whole game (spiel.js → SPIEL.katze); the beach only adds the once-per-tide purr
function openPet(bonus) {
  SPIEL.katze({ bonus, onClose: () => { if (bonus === 'gained' && !S.seen.petGain) { S.seen.petGain = true; setTimeout(() => chat(LINES.petGain), 400); } } });
}
function closePet() { SPIEL.katzeZu(); }
// v036: one layout for both scenes — scene switch and upgrades bottom left, End ebb (the compass, spiel.js) bottom right, 💚 first in the top bar
{ const bl = document.createElement('div'); bl.id = 'botLeft'; WELT.root.appendChild(bl); bl.appendChild($('mapBtn')); bl.appendChild(el.ledgerBtn); bl.appendChild($('rulesBtnB'));
  el.ledgerBtn.textContent = '☾ Dream';   // v056
  const ft = document.querySelector('#strand .logbox'); ft.classList.add('testonly'); ft.id = 'fightTest'; WELT.root.appendChild(ft);   // v056: the test fight code, no longer inside the Ledger
  Object.assign(ft.style, { position: 'fixed', left: '50%', bottom: '14px', transform: 'translateX(-50%)', zIndex: 4, display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(255,246,227,.9)', borderRadius: '12px', padding: '4px 8px', pointerEvents: 'auto' }); }
const ovCat = $('ovCat');
ovCat.addEventListener('pointerdown', e => { e.stopPropagation(); ovCat.classList.add('hold'); petHoldStart(() => { ovCat.classList.remove('hold'); openPet(); }); });
['pointerup', 'pointerleave', 'pointercancel'].forEach(n => ovCat.addEventListener(n, () => { ovCat.classList.remove('hold'); petHoldCancel(); }));
ovCat.addEventListener('click', e => { e.stopPropagation(); petHoldCancel(); ovCat.classList.remove('hold'); if (!SPIEL.katzeOffen) openPet(); });   // v062: a plain tap on her ears opens her screen too
function applyCheckpoint(key) {
  const cp = CHECKPOINTS[key];
  if (S.screen === 'start') {
    try { S.gameN = (+localStorage.getItem(GAME_KEY) || 0) + 1; localStorage.setItem(GAME_KEY, S.gameN); } catch (e) { S.gameN = 1; }
    el.overlay.style.opacity = 0; setTimeout(() => el.overlay.remove(), 650); setTimeout(resize, 0);
  }
  S.swim = null; S.wake = null; S.openNut = null; S.cut = null; S.kampf = false; S.busy = false;
  el.result.style.display = 'none'; el.panel.style.display = 'none';
  S.hasStamp = true; S.tut = 4; S.combats = Math.max(S.combats, 3); S.firstGreen = true; S.firstKill = true; S.toldWalk = true;
  UPGRADES.forEach(u => S.upg[u.id] = 0); Object.assign(S.upg, cp.upg);
  S.buyLog = []; Object.keys(cp.upg).forEach(k => { for (let i = 0; i < cp.upg[k]; i++) S.buyLog.push(k); });
  S.flood = cp.flood; grantGifts();
  S.green = cp.green; S.tails = cp.tails || 0; S.rum = cp.rum || 0; S.flood = cp.flood; S.day = cp.day - 1;
  S.maxStamina = cp.maxSt; S.stamina = cp.maxSt;
  Object.assign(S.seen, { tadpole: true, clam: cp.flood > 2, fish: cp.flood > 8, wasp: cp.flood > 9, bailiff: cp.flood > 10 });   // v041: what the surf stages showed so far
  for (let d = 1; d <= cp.day; d++) { S.storySeen[d] = 1; S.flotSeen[d] = 1; }
  S.forestOpen = !!cp.forest; S.ms = {}; if (cp.forest) S.ms[8] = '🌴';
  S.tort.sleep = 0; S.tort.bar = 0;
  if (cp.map) { S.mapUnlocked = true; S.mapAt = cp.day; S.ms[10] = '🗺'; S.mapHint = true; } else { S.mapUnlocked = false; S.mapAt = 0; }
  if (cp.koffer) S.kofferDa = true; if (cp.glideLater) S.giftLater = 'glide'; if (cp.palm) S.palmMax = cp.palm;   // v061
  S.day = cp.day; setupEbb(false);
  banner('Skipped to ' + PET_CODES[key].label, 2000);
}

// ================= v030: this world's API for SPIEL (the hub calls these) =================
function strandKannWechseln() { return inCollect() && !S.wake && !S.cut && !S.kampf && el.result.style.display !== 'flex' && (!S.busy || S.spent); }
WELT.api = {
  kannWechseln: strandKannWechseln,
  gezeigt() { lastT = 0; resize(); updateHUD(); },
  hud: () => updateHUD(),
  tag: () => S.day,
  welle: () => S.flood,
  gruen: () => S.green,
  geschenk(id) { giftNow(id); },   // v055: the island hands out the flamethrower when the first armies march
  rum: () => S.rum,
  rumSetzen(v) { S.rum = Math.max(0, Math.round(v)); updateHUD(); },   // v055: rum pays for fire — the island's Burn
  gruenSetzen(v) { S.green = Math.max(0, Math.round(v)); updateHUD(); },
  zustand: () => S._snap || beachState(false),
  zustandJetzt: () => { const st = beachState(S._snap ? S._snap.first : false); st.b._mid = { crabs: S.crabs.length, buried: !!(S.crabs[0] && S.crabs[0].buried), tide: S.tide, palmNuts: S.palmNuts, poolSips: S.poolSips }; return st; },   // v070: the ebb as it stands (crabs left, tides left) — a reload neither re-rolls the crabs nor runs the tower's chores again
  kofferDa: () => !!S.kofferDa,   // v061
  traumOffen: () => { S.seen.dreamOpen = true; updateHUD(); },
  grund: () => S_GRUND, upgListe: () => UPGRADES.map(u => ({ id: u.id, name: u.name, max: u.max || 1 })),   // v062: for the logbook
  laden: st => beachLoad(st),
  bilanz: () => bilanz(),
  sprung: k => applyCheckpoint(k),
  aufTitel: () => S.screen === 'start',
  titelVerlassen() {   // v059: an old island-only save loaded from the title — the beach steps out of the title into a plain ebb
    if (S.screen !== 'start') return;
    try { S.gameN = (+localStorage.getItem(GAME_KEY) || 0) + 1; localStorage.setItem(GAME_KEY, S.gameN); } catch (e) { S.gameN = 1; }
    el.overlay.style.opacity = 0; setTimeout(() => el.overlay.remove(), 650); setTimeout(resize, 0);
    S.swim = null; S.wake = null; S.cut = null; S.kampf = false; S.busy = false; S.hasStamp = true; S.tut = 4; S.firstGreen = true; S.firstKill = true; S.toldWalk = true; S.mapUnlocked = true;
    setupEbb(false);
  },
  schwaenze: () => S.tails,   // v058
  schwaenzeSetzen(v) { S.tails = Math.max(0, Math.round(v)); updateHUD(); },
  upgB: id => S.upg[id] || 0,
  ressB: () => ({ green: S.green, stamp: !!S.hasStamp, tails: S.tails, team: !!S.seen.fish, rum: S.rum, bar: S.tort.bar > 0, pet: !!S.petToday, catOn: !!(S.hasStamp && !S.wake && !S.katzeWeg) }),
  ausdauer: () => ({ n: Math.round(S.stamina), max: S.maxStamina }),   // v038: for the hub bottom left   // v036: a shortcut from the cat window
  tiden: () => ({ n: S.tide, max: S.tideMax }),   // v036: for the End-ebb compass
  modal: () => TRAUM.offen || el.panel.style.display === 'flex' || el.result.style.display === 'flex' || $('sketch').style.display === 'flex' || S.screen === 'combat',
  baum: () => beachNodes(),   // v034: the ledger as nodes for the elf tree
  traumGesehen: () => S.traumSeen || (S.traumSeen = {}),   // v056
  katzeWegB: () => !!S.katzeWeg,
  kaufe: id => { const n = beachNode(id); if (n.state !== 'buy' && n.next !== 'buy') return false; buyUpgrade(id); return true; },
  demoEnde: onPlay => demoEnde(onPlay),
  flutAlt() { if (!inCollect() || S.busy || S.wake) return; if (S.round) S.round.tide_free = S.tide; S.tide = 1; spendTide(); },   // the beach alone
  flut(info) {   // the wave fight of this flood; resolves after the result screen (the next beach ebb is already set up)
    return new Promise(res => { S.warte = { typ: 'flut', resolve: res }; S.flutBoss = info && info.boss !== undefined ? info.boss : null; el.panel.style.display = 'none'; S.busy = true; S.pointers.clear();
      if (sweepable() && S.hasStamp) { banner('🗼 The tower rides stage ' + S.flood + ' for you · ' + Math.round(goldChance() * 100) + ' %…', 1400); sweep(); return; }
      if (autoMode() === 'gold' && S.hasStamp && S.flutBoss === null && !bossWelle(S.flood)) banner('🗼 The tower rides at most 2 stages past your own last ride — this one is yours', 2400);
      startFlood(); });
  },
  kampf(n) {   // a nest/army fight from the island: n = { boss, army, tower, elite, L, code }
    return new Promise(res => {
      S.warte = { typ: 'kampf', resolve: res, busy: S.busy, spent: S.spent }; S.nest = n;
      el.panel.style.display = 'none'; if (S.screen === 'forest') { S.screen = 'beach'; S.cr.fx = .5; }
      S.stamina = S.maxStamina; tortoiseReset(); S.busy = true; S.pointers.clear();
      banner(n.army ? 'The Board\'s army…' : n.boss ? 'Into his office…' : 'Into the nest…', 1500); SFX.swell(); setSurf(.2);
      setTimeout(startCombat, 1500);
    });
  },
  imKampf: () => !!S.kampf,
  banner: (t, ms) => banner(t, ms),
  autoLetzt: () => { const a = S.autoLetzt; S.autoLetzt = null; return a; },
  auto: () => ({ mode: autoMode(), lvl: towerLvl(), chance: sweepable() ? Math.round(goldChance() * 100) : null }),
  goldFaehrt: info => S.hasStamp && sweepable() && !(info && info.boss !== undefined && info.boss !== null),   // v063: the tower rides — no need to show the beach
  surfStand: () => ({ flood: S.flood, jump: S.upg.jump, cycle: S.upg.cycle, void: S.upg.void, cat: S.upg.catDive, board: S.upg.catBoard, tower: towerLvl(), glide: S.upg.glide || 0, flame: S.upg.flame || 0, map: !!S.mapUnlocked }),   // v044: for the rules screen
  autoToggle: () => autoToggle(),
  tagOhneKampf(grund) { if (S.round) finishRound(grund || 'island', 0, 0, 0, 0, !!SPIEL.turm()); S.day++; setupEbb(false); },   // no beach fight this flood
  tagSetzen(t) { S.day = t; S.mapUnlocked = true; updateHUD(); },
};
{ const a = SPIEL.autosaveInfo(); if (a) { $('tlCont').style.display = ''; $('tlCont').textContent = 'CONTINUE · TIDE ' + a.tide; } $('tlVer').textContent = __VERSION__;
  if (!SPIEL.speicherTest()) { const w = document.createElement('div'); w.id = 'tlWarn'; w.textContent = '⚠ This browser will not keep your game here. Play it from its web address (https) — or copy the logbook in the cat window before you leave.'; $('tlMenu').appendChild(w); } }   // v070: said before the first step, not after the loss

// ================= resize / init =================
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; HS = window.innerHeight;
  H = HS > W ? Math.min(HS, Math.round(W / 1.15)) : HS;   // v043: upright — the scene stays a little wider than tall; jungle above, sea below
  OY = Math.round((HS - H) * .42); U = H / 100;
  cv.width = Math.round(W * DPR); cv.height = Math.round(HS * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, OY * DPR);
  if (S.screen === 'beach' && !S.cut) S.wl = waterTarget();
  placeBubble();
}
window.addEventListener('resize', () => { resize(); drawTree(); });
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();
updateHUD();
WELT.raf(frame);

