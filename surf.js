// ============================================================================
// KAMPF — the surf fight (v041): Robinson rides a giant wave, the stamp fires by itself.
// One combat screen for every fight: wave fights of a flood, nests, his cabin, the Board's army, his last stand.
// The beach calls SPIEL.surf(cfg) → this world's api.start(cfg) → Promise of the result; the beach shows the result card.
// Built from the surf prototype v006 (robinson_surf_v006.html); world units = 480 × 270 at least, drawn as vectors at native resolution.
// Shares nothing with the beach except sound.js / spiel.js.
// ============================================================================
'use strict';
const WELT = SPIEL.welt('kampf');
const $ = id => WELT.$(id);
const cv = $('kcv'); let ctx = cv.getContext('2d');   // v064: let — the shield draws him once more into its own canvas
let W = 480, H = 270, SC = 2, DPR = 1;   // SC = device pixels per world unit
const RES = 8;                            // sprite prerender: pixels per world unit

// ---------- tunables (prototype values; stamp numbers come from the Ledger) ----------
const P = {
  thrust: 130, gSlope: 55, vMin: 35, vCruise: 95, vMax: 300,
  g: 560, jMin: 45, jMax: 215, dashMax: 230, climb: 60, steepBase: 1,
  stampRate: 0.5, stampRange: 90, stampSpeed: 520, splashR: 16, splash: 0.3,
  chainR: 170, trough: 1, stamina: 5, geom: 0.33, ripple: 1, bounce: 0.5, cam: 'rider', postRamp: 0.1, heraldOn: 1, climbT: 0.35, boomT: 0.15, wallXm: 1, spillAhead: 80, takeMax: 95, s1len: 2600, s1rate: 2.25, boostLen: 1600, tempoMul: 1, density: 1, godMode: false,
  vIdle: 90, idleDecay: 0.6, vA0: 120, vA1: 90, lipCost: 2, iframe: 0.05, lite: false,
};
const HPB = { t: 1, u: 2, f: 3, l: 1, w: 2, e: 9 };   // v061: e = the black eel (v062: 4 → 9, and it bites)
const BOSS_BASE = [260, 215, 170];          // First Mate · Cabin Boy · Bilge Rat (× stage hp)
const BOSS_BOUNTY = [25, 20, 15], CRAB_BOUNTY = 12;
const RANK_NAME = ['THE FIRST MATE', 'THE CABIN BOY', 'THE BILGE RAT'];
const KIND_OF = { w: 'tentacle', l: 'louse', t: 'tadpole', m: 'clam', u: 'fish', f: 'wasp', B: 'bailiff', c: 'repocrab', e: 'eel' };

// ---------- v046: stages are written, not rolled (robinson_surf_concept.md §8) ----------
// base tempo, wave height and steepness per stage; a combo boosts the tempo ×BOOST for a fixed stretch
const STAGE_BASE = [null,
  { v: 115, amp: 0.55, steep: 0.75 }, { v: 125, amp: 0.62, steep: 0.80 }, { v: 135, amp: 0.70, steep: 0.85 }, { v: 145, amp: 0.78, steep: 0.90 }, { v: 155, amp: 0.85, steep: 0.95 },
  { v: 165, amp: 0.90, steep: 1.00 }, { v: 172, amp: 0.95, steep: 1.00 }, { v: 180, amp: 1.00, steep: 1.05 }, { v: 190, amp: 1.00, steep: 1.10 }, { v: 198, amp: 1.00, steep: 1.10 }];
const BOOST = 1.5;   // v052
function stageV(n) { return n <= 9 ? 115 * (1 + 0.1 * (n - 1)) * (n >= 3 ? 1.05 : 1) : 218.5 * (1 + 0.12 * Math.log(n - 8)); }   // v052: 115 … 218 at stage 9, then slower growth, no cap
const TRICK = ['JUMP', 'NOSEGRAB!', 'BACKFLIP!'];
const MSG = {
  1: ['Stage 1 — ride the wave', 'Robinson surfs by himself. The stamp fires by itself.', 'Every green heart is 💚 for your Dream.'],
  2: ['NEW: JUMP — tap D (or the right half)', 'Tap as you ride up a mussel: a big jump — the mussel dies, you lose nothing.', 'No tap: a small hop — the mussel still dies, but it costs 1 stamina.'],
  '2b': ['Jump the tadpoles', 'Tadpoles wait behind these mussels. Fly over them.', ''],
  '2c': ['Too high?', 'Those hearts need a Nosegrab. That comes later.', ''],
  3: ['NEW: BOOST', 'Every jump off a mussel gives a boost: faster for a while.', 'Jump again before it runs out and the boost goes on — that is the flow.'],
  4: ['NEW: NOSEGRAB', 'Boost + jump = Nosegrab: higher and further.', 'Where you land, the next mussel surfaces — tap D again on it!'],
  '4b': ['Even higher?', 'Those need a Backflip. Next stage.', ''],
  5: ['NEW: BACKFLIP', 'Boost + a steep spot on the wave = Backflip.', 'The steeper the face where you take off, the better.'],
  6: ['More of them', 'No new tricks — just more tadpoles. Keep the flow.', 'Your Dream has VOID now: it saves you when your stamina runs out.'],
  7: ['They pile up', 'Wake lice swim up out of your wake and follow you. The stamp slips off them.', 'They cannot catch you — but the wave will throw them. Next stage: A.'],
  8: ['NEW: WAVE CYCLE — tap A (or the left half)', 'A green A sign swims at you ahead of a wall: tap A the moment you pass it.', 'Boomerang back · climb · leap over the wall · dive where they came down.'],
  9: ['Walls and mussels', 'The walls bring fliers now. Between them: mussels.', ''],
  10: ['The reef — and him', 'Walls and mussels — and at the end the First Mate.', 'Jump (D) or dash-dive (A) under his shockwave.'],
  glide: ['NEW: GLIDER — hold D in the air', 'Jump (D), then keep D held: the palm-leaf glider opens and carries you.', 'Try it on the small crevasse ahead (sign HOLD). Up to 2 s per jump.'],
  nestNo: ['No glider!', 'Without the glider the wide crevasses are deadly.', 'Jump the small ones (D) — and hope.'],
  flame: ['NEW: FLAMETHROWER — hold A', 'Tap A at the sign as always — then keep A held while you climb.', 'The flame burns into the wall as long as you hold.'],
};
function stageDef(cfg) {
  const n = Math.max(1, cfg.stage | 0), b = STAGE_BASE[Math.min(n, 10)], st = Object.assign({}, b);
  st.n = n; st.hpMul = 1 + 0.08 * (n - 1);
  st.v = stageV(n);
  st.kind = cfg.kind || 'wave'; st.boss = cfg.boss === null || cfg.boss === undefined ? -1 : cfg.boss;
  st.glide = !!(cfg.upg && cfg.upg.glide); st.flame = !!(cfg.upg && cfg.upg.flame);   // v055: the island fights teach what you carry
  st.elite = !!cfg.elite; st.look = { nest: 'nest', cabin: 'cabin', army: 'storm', last: 'night' }[st.kind] || 'day';
  if (st.kind !== 'wave') { const k = Math.max(10, n); st.n = k; st.hpMul = 1 + 0.08 * (k - 1); st.v = stageV(k); if (st.kind === 'nest') st.hpMul *= 1.3; }   // island fights: the repertoire of stage 10 (v062: nests +30 % hp)
  st.jump = st.n >= 2; st.cycle = st.n >= 8;
  st.trickCap = st.n <= 3 ? 0 : st.n === 4 ? 1 : 2;
  st.signs = st.n <= 11;
  st.army = cfg.army || 5;
  return st;
}
// the script of a stage: spawn events (at the screen edge) and messages (when Robinson gets there), all on the water distance
const STAGE_CAL = { 2: 1.34, 3: 1.3, 4: 0.95, 5: 1.05, 6: 1.15, 7: 1.15, 8: 1.2, 9: 1.28, 11: 1, 12: 1 };   // boost, slow motion and cycles change the real pace — measured with the bot
function stageTime(n) { return 60 + 1.5 * (Math.min(n, 11) - 1) + 1 * Math.max(0, n - 11); }   // v048: seconds per stage — a little longer every stage; v060: half the growth (late stages ran ~90 s)
function buildLevel(st, rng, fl) {
  if (fl === undefined) { fl = 1; if (st.kind === 'wave') { const m = buildLevel(st, mulberry32(7), 1); fl = Math.max(0.25, Math.min(2.5, (stageTime(st.n) * st.v * (STAGE_CAL[Math.min(st.n, 12)] || 1) - m.fixed) / Math.max(1, m.fill))); } }
  const ev = [], msgs = []; let w = 260, fill = 0;   // fill = the calm and riding stretches, stretched by fl; ramps, walls and the stage-1 burst stay as they are
  const add = (k, at, o) => ev.push(Object.assign({ k, w: at }, o || {}));
  const tutAus = (() => { try { return localStorage.getItem('robinson_tutorials') === 'off'; } catch (e) { return false; } })();   // v061: tutorials off → no lesson banners
  const msg = key => { if (!tutAus) msgs.push({ w: w, key, lines: typeof key === 'string' || typeof key === 'number' ? MSG[key] : key }); };
  const ride = (len, rate, pair, rows) => {   // tadpoles (rate per second at base tempo) and low heart rows you ride through
    fill += len; len *= fl; if (rows) rows *= fl; kick(w + len * 0.45, len);
    rate *= n >= 2 ? 1.1 : 1;   // v053: denser riding stretches from stage 2 (the stamp has no exceptions any more)
    const sp = st.v / Math.max(0.01, rate); let x = w + sp * (0.4 + rng() * 0.6);
    while (rate > 0 && x < w + len) { if (st.n >= 15 && st.kind === 'wave' && rng() < 0.12) { add('e', x); add('e', x + 26); } else add('t', x); if (rng() < pair) add('t', x + 16 + rng() * 18); if (n >= 5 && st.kind === 'wave' && rng() < (n >= 6 ? 0.08 : 0.1)) add('f', x + 60); x += sp * (0.6 + rng() * 0.8); }   // v055: fliers from stage 5
    if (rows && st.n > 1) for (let y = w + 260; y < w + len - 150; y += rows) add('hrow', y, { n: 3 + Math.min(5, Math.floor(st.n / 2)) });   // v054: more hearts per row as the stages climb; stage 1 only the kills
    w += len;
  };
  const burst1 = (len, rate) => {   // v047 stage 1: a fixed pattern, no chance — singles (Faster Stamping helps) and tight pairs (Wider Splash helps; Heavier Stamp does not)
    const sp = st.v / rate; let x = w + sp, i = 0;
    while (x < w + len) { if (i % 3 === 2) { add('t', x); add('t', x + 5); x += 2 * sp; } else { add('t', x); x += sp; } i++; }
    w += len;
  };
  let kicks = 0, grps = 0; const kick = (at, len) => { if (st.jump && st.kind === 'wave' && kicks < 3 && len >= 700) { kicks++; add('kick', at); }
    if (st.n >= 3 && st.kind === 'wave' && len >= 900 && grps < (st.n >= 6 ? 4 : st.n >= 4 ? 3 : 2)) { grps++; add('grp', at + len * 0.3, { n: Math.min(5, 2 + Math.floor((st.n - 3) / 2)) }); } };   // v054: tadpole groups on kickers   // v052: hearts over a good small wave, no mussel
  const calm = len => { fill += len; len *= fl; kick(w + len * 0.45, len); for (let y = w + 200; y < w + len - 150; y += 450 * fl) add('hrow', y, { n: 3 + Math.min(5, Math.floor(st.n / 2)) }); w += len; };
  let lastWall = -1e9; const MUS_AFTER_WALL = 6.8 * st.v;   // v060: a mussel never surfaces while he is still diving out of a wall leap
  const mus = o => { if (w - lastWall < MUS_AFTER_WALL - 380) w = lastWall + MUS_AFTER_WALL - 380; w += 380; add('mus', w, o); w += 560 + (o && o.chain ? o.chain * 430 : 0); };   // 380 free run-up, the ramp, flight and landing
  const chain = k => { mus({}); w -= 220; mus({ chain: k }); };   // a plain jump first (for the boost), then the chain
  const wall = o => { lastWall = w; add('wall', w, o); for (let y = w + 500; y < w + 1100; y += 300) add('hrow', y, { n: 2 + Math.floor(st.n / 2) }); w += 1100; calm(400); };
  const boss = () => { add('boss', w); w += 400; };
  const n = st.n, K = st.kind;
  const wallT = o => { lastWall = w; add('wall', w, o); for (let y = w + 450; y < w + 900; y += 300) add('hrow', y, { n: 2 + Math.floor(st.n / 2) }); w += Math.max(650, 900 - 40 * Math.max(0, n - 10)); };   // v052: tighter, mixed A and D
  // v054: phrases of chain and quick wall, varied — never the same three times in a row
  const phrase = (i, k, o) => { const t = [0, 0, 1, 2, 0, 3, 1, 2][i % 8];
    if (t === 0) { chain(k); w -= 260 + 0.3 * st.v; wallT(o); } else if (t === 1) { chain(Math.max(1, k - 2)); wallT(o); mus({}); } else if (t === 2) { wallT(o); chain(k); } else { chain(k); w -= 260 + 0.3 * st.v; wallT(o); wallT(Object.assign({}, o, { n: Math.max(6, o.n - 3) })); } };   // v060: the A sign right after the last mussel — quick
  // v054: crevasses: a free jump early on, a mussel jump later, the glider in high stages (widths in seconds of his tempo)
  const gapT = () => n <= 11 ? 'hop' : n <= 13 ? 'mus' : 'glide';
  const crevasse = tp => { tp = tp || gapT(); calm(300); if (tp === 'mus') { w += 380; add('mus', w, {}); w += 30; } else w += 200;
    const len = Math.round(st.v * (tp === 'practice' ? 0.3 : tp === 'hop' ? 0.42 : tp === 'mus' ? 0.8 : 1.3)); add('gap', w, { len, type: tp }); w += len; calm(400); };
  if (K === 'cabin') { msg(['His den', 'He is at home here. Crevasses in the scree: jump them (D) — hold D to glide.', 'A good A lands you right on top of him.']); calm(500); if (st.glide) { msg('glide'); calm(600); crevasse('practice'); calm(300); } else msg('nestNo'); crevasse(); wall({ n: 9, u: 2, f: 1 }); crevasse(); calm(300); boss(); return { ev, msgs, end: 1e9 }; }
  if (K === 'cabin' || K === 'last') { msg(K === 'last' ? ['HIS LAST STAND', 'Jump (D) or dash-dive (A) the Severance wave — it sweeps the whole face.', 'No reef this time — only him.'] : ['His cabin', 'He is at home here. Jump or dive his shockwave; after a miss he is open.', 'Dash into him — or stamp him from high up.']); calm(500); boss(); return { ev, msgs, end: 1e9 }; }
  if (K === 'nest') { msg(st.glide ? 'glide' : 'nestNo'); calm(900); if (st.glide) { crevasse('practice'); calm(400); }   // v055: a longer start with a practice crevasse
    msg(['Into the nest', 'Rotten scree with crevasses. The amber sign says how to cross: JUMP (D), MUSSEL (jump from the mussel), HOLD (glide).', 'Falling in costs all your stamina — only a charged VOID saves you.']); calm(500); crevasse('hop'); wall({ n: 9, u: 3, f: 1 }); chain(3); crevasse(); wall({ n: 10, u: 3, f: 2 }); crevasse(); wall({ n: 10, u: 4, f: 2 }); return { ev, msgs, end: w + 400 }; }
  if (K === 'army') {
    const s = Math.max(0.8, 1 + 0.15 * (st.army - 5));
    msg([(st.elite ? 'The Repo Crab leads the army' : 'The Board\'s army') + ' · strength ' + st.army, 'Wall after wall. Hold A while you climb: the flamethrower.', 'Bigger walls, tougher monsters.']); calm(400); if (st.flame) { msg('flame'); calm(300); }
    for (let i = 0; i < 6; i++) wall({ n: Math.round(15 * s), u: 3, f: Math.round(3 * s), army: true });   // v054: more, bigger, tougher
    if (st.elite) { add('elite', w); return { ev, msgs, end: 1e9 }; }
    return { ev, msgs, end: w + 400 };
  }
  switch (Math.min(n, 11)) {
    case 1: msg(1); ride(4600, 0.32, 0.1, 700); ride(2100, 0.6, 0.25, 700); burst1(P.s1len, P.s1rate); break;   // the end is too much without a stamp upgrade
    case 2: msg(2); calm(700); for (let i = 0; i < 3; i++) mus({}); msg('2b'); calm(300); for (let i = 0; i < 3; i++) mus({ over: 2 }); ride(1000, 0.3, 0.05, 700); msg('2c'); mus({ tease: 1 }); mus({ tease: 1 }); ride(800, 0.3, 0, 700); break;
    case 3: msg(3); calm(600); for (let i = 0; i < 4; i++) mus({ over: i % 2 }); ride(700, 0.6, 0.25, 700); for (let i = 0; i < 4; i++) mus({ over: 1 + (i % 2) }); ride(800, 0.65, 0.25, 700); break;   // v055: harder
    case 4: msg(4); calm(600); chain(2); ride(900, 0.68, 0.28, 700); chain(3); ride(900, 0.7, 0.28, 700); chain(3); msg('4b'); mus({ tease: 2 }); chain(1); w -= 200; mus({ tease: 2 }); ride(700, 0.3, 0.1, 700); break;
    case 5: msg(5); calm(500); chain(3); ride(800, 0.72, 0.3, 700); chain(4); ride(800, 0.75, 0.3, 700); chain(5); ride(800, 0.78, 0.3, 700); chain(3); break;
    case 6: msg(6); ride(1400, 0.58, 0.2, 700); chain(3); ride(1400, 0.62, 0.2, 700); chain(4); ride(1400, 0.66, 0.25, 700); chain(3); ride(1000, 0.62, 0.2, 700); break;
    case 7: msg(7); ride(1700, 0.7, 0.28, 700); chain(3); ride(1700, 0.74, 0.28, 700); chain(4); ride(1700, 0.78, 0.3, 700); chain(3); ride(1100, 0.7, 0.28, 700); break;
    case 8: msg(8); calm(900); for (let i = 0; i < 5; i++) { wall({ n: 6 + i, u: i > 1 ? 2 : 0, f: 0 }); calm(500); } break;
    case 9: msg(9); calm(600); wall({ n: 8, u: 3, f: 1 }); chain(3); wall({ n: 9, u: 3, f: 2 }); chain(4); wall({ n: 10, u: 3, f: 2 }); chain(3); wall({ n: 10, u: 4, f: 2 }); break;
    case 10: msg(10); calm(600); [3, 5, 4, 4].forEach((k, i) => phrase(i, k, { n: 9 + i, u: 3 + (i >> 1), f: 2 })); break;   // v054: varied phrases
    default: {   // 11+: like 10 without the boss — longer, faster, more
      const k = n - 10; msg(n === 15 ? ['NEW: BLACK EELS', 'They come up from below and swim faster than the water.', 'Stamp them a few times — or let the cat have them (Eel Catcher).'] : n === 20 ? ['NEW: POISON CLOUDS', 'A black cloud stops over you and rains poison where you ride.', 'When it flashes A!, tap A: climb back and leap out of the rain.'] : n === 21 ? ['POISON CLOUDS', 'It rains on the stretch where you ride. Tap A when it flashes A!', 'Tap much too early and you come down in the rain again.'] : ['Stage ' + n, 'Longer, faster, more of everything.', '']); calm(500);   // v061: a new monster every 5 stages
      const goal = stageTime(n) * st.v * 1.35;   // v055: phrases until the stage is as long as its time (it ran ~60 s instead of ~90)
      let brl = false;   // v064: one barrel per stage, in the second half (v066: from stage 27 — the first ride after Jan's T40)
      for (let i = 0; i < 40 && (i < 3 || w < goal - 900); i++) {
        if (n >= 27 && !brl && w > goal * 0.5) { brl = true; if (n <= 28) msg(['THE BARREL', 'The wave stands up and curls over you. Under the curtain: PULL IN — HOLD A.', 'Inside: A leaps, D jumps. On the way out HOLD A — let go at the wake.']); w += 450; add('barrel', w); w += st.v * 5.4; } phrase(i + k, Math.min(6, 4 + (i % 3)), { n: Math.min(10 + k + i, 18 + k), u: 3 + (i % 3), f: 2 + Math.floor(k / 2) });
        if (n >= 20 && i % 3 === 1) add('cloud', w + 100);   // v061: poison clouds from stage 20
        if (n >= 15 && i % 2 === 0) for (let q = 0, g = Math.min(6, 3 + Math.floor((n - 15) / 4)); q < g; q++) add('e', w + 60 + q * 26);   // v062: a school of eels between the phrases from stage 15 (3, growing to 6)
        if (i % 2 === 1) { add('kick', w + 140); calm(700); } else ride(700, 0.62 + 0.02 * Math.min(10, k), 0.28, 700); }   // v062: one more, denser wave of tadpoles per phrase pair   // v061: a good free wave between the phrases — with something in the sky
    }
  }
  if (n === 10 || (st.boss >= 0 && K === 'wave')) { calm(300); const fixed = w - fill; boss(); return { ev, msgs, end: 1e9, fill, fixed, fl }; }
  return { ev, msgs, end: w + 300, fill, fixed: w + 300 - fill, fl };
}

// ---------- wave surface (analytic, prototype) ----------
const Y_TOP = 38, S0 = 0.06;
const KK = [2 * Math.PI / 300, 2 * Math.PI / 220, 2 * Math.PI / 43];
const AA = [0.25, 0.45, 0.22];
const PH = [1.3, 0.7, 2.1], TPH = [0, 1];
let L = 150, AMP = 200, RIP = 2.2;   // v048: RIP = height of the small in-between waves (no longer damped down the face)
// v049: the small waves' period drifts between ~105 and ~210 (two slow modulations, phases fixed per stage)
const RK0 = 0.02245, RKA = 0.0045, RKB = 0.003, RLA = 460, RLB = 1220; let RPA = 0, RPB = 0;   // v053: twice as long, fixed for all stages
function ripPh(x) { return RK0 * x - RKA * RLA * Math.cos(x / RLA + RPA) - RKB * RLB * Math.cos(x / RLB + RPB) + PH[2]; }
function ripA(x) { return RIP * RK0 / ripK(x); }   // v053: a wave's height goes with its length — steepness stays in bounds
function ripAd(x) { const k = ripK(x), kd = RKA / RLA * Math.cos(x / RLA + RPA) + RKB / RLB * Math.cos(x / RLB + RPB); return -RIP * RK0 * kd / (k * k); }
function ripK(x) { return RK0 + RKA * Math.sin(x / RLA + RPA) + RKB * Math.sin(x / RLB + RPB); }
function F(u, S) {
  const al = -1 / L, e = Math.exp(al * u), c = AMP / L;
  let y = -AMP * e + S0 * u;
  for (let i = 0; i < 2; i++) {
    const k = KK[i], a = AA[i], p = k * (u + S) + PH[i], sn = Math.sin(p), cs = Math.cos(p);
    y += c * a * e * (al * sn - k * cs) / (al * al + k * k) - S0 * a * cs / k;
  }
  return y + ripA(u + S) * Math.sin(ripPh(u + S));
}
function ysAt(u, S) { return Y_TOP + AMP + F(u, S); }
function slopeAt(u, S) {
  let m = 1;
  for (let i = 0; i < 2; i++) m += AA[i] * Math.sin(KK[i] * (u + S) + PH[i]);
  return (AMP / L * Math.exp(-u / L) + S0) * m + ripA(u + S) * ripK(u + S) * Math.cos(ripPh(u + S)) + ripAd(u + S) * Math.sin(ripPh(u + S));
}

// ---------- looks: one screen, dressed per situation ----------
const LOOKS = {
  day:   { sky: ['#5aa9d6', '#a9dbe9', '#e3f3ee'], sun: '#fff6c8', sea: ['#7fb6cf', '#4d8fb4', '#2a5f86'], isl: ['#6f9d97', '#5d8a86', '#4c6f6b'],
           deep: '#12407a', face: ['#9af2d6', '#45cdb6', '#1f9a9a', '#0f5f68'], line: '#f4fffd', glow: '170,255,220', streak: '220,250,250', lip: '#d6eef0', foam: '#f4fbfb', curl: '#5fd3cf', cloud: 'rgba(255,255,255,.85)' },
  // v042: a nest — dusk, the water gone rot-green
  nest:  { sky: ['#3d2b4f', '#b0656a', '#f0b080'], sun: '#ffcf8a', sunY: 70, sea: ['#6e7a4a', '#46592f', '#22321c'], isl: ['#3b3448', '#2f2a3a', '#2a2533'],
           deep: '#2a2219', face: ['#c9b89a', '#9c8a6c', '#6f604b', '#3b322a'], line: '#f0e6d2', glow: '240,220,180', streak: '120,100,80', lip: '#ddd0b8', foam: '#efe6d6', curl: '#9c8a6c', cloud: 'rgba(255,190,170,.55)', gravel: true },   // v054: a gravel slope
  // his den — dusk, dark scree, pages in the air
  cabin: { sky: ['#2a1f45', '#7a4f8a', '#d89aa0'], sun: '#ffd0a0', sunY: 76, sea: ['#6a5a8a', '#3a2e5e', '#1e1838'], isl: ['#2e2440', '#261e36', '#211a30'],
           deep: '#221a26', face: ['#b9aab0', '#8a7a86', '#5e5060', '#30283a'], line: '#f2e8f0', glow: '230,210,230', streak: '110,90,110', lip: '#dccfd8', foam: '#f2eaf0', curl: '#8a7a86', cloud: 'rgba(240,200,230,.5)', pages: true, gravel: true },   // v054: his den — dark scree, pages in the air
  // the Board's army — grey, wind, rain
  storm: { sky: ['#4a5560', '#7a8690', '#a8b2b8'], sun: null, sea: ['#6a7a84', '#4a5a66', '#2a3640'], isl: ['#56626a', '#4c575e', '#434d54'],
           deep: '#1e3446', face: ['#b8d0d0', '#7aa0a4', '#4a7076', '#22404a'], line: '#f0f6f6', glow: '210,230,230', streak: '220,230,235', lip: '#dfe8ea', foam: '#f4f8f8', curl: '#8ab0b4', cloud: 'rgba(84,94,104,.85)', rain: true },
  // his last stand — night, lightning
  night: { sky: ['#05070f', '#141a33', '#2a2450'], sun: null, moon: true, sea: ['#1e2840', '#10172a', '#060a14'], isl: ['#121626', '#0e1220', '#0b0f1a'],
           deep: '#06142a', face: ['#5a8aaa', '#2a5070', '#173350', '#081828'], line: '#cfe8ff', glow: '150,200,255', streak: '160,190,230', lip: '#9ab8d0', foam: '#c8dcf0', curl: '#3a6a90', cloud: 'rgba(36,38,66,.9)', storm: true },
};
let LOOK = LOOKS.day;

// ---------- the level (seeded, bound to water distance w = u + S) ----------
let RND = Math.random;   // v047: gameplay chance runs on a fixed sequence per stage — no luck, every run of a stage is the same
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let LV;
function levelInit(seed) {
  const rng = mulberry32(seed * 7919 + 13);
  for (let i = 0; i < 3; i++) PH[i] = rng() * Math.PI * 2;
  TPH[0] = rng() * Math.PI * 2; TPH[1] = rng() * Math.PI * 2;
  const L0 = buildLevel(ST, rng);
  RPA = rng() * Math.PI * 2; RPB = rng() * Math.PI * 2;
  L0.ev.sort((a, b) => a.w - b.w);
  LV = { rng, ev: L0.ev, msgs: L0.msgs, end: L0.end, ei: 0, mi: 0 };
}
// v048: wake lice swim up out of the wake behind him (from stage 7) and pile up as followers — only the wave's throw brings them down on him
function wakeLice(dt) {
  if (ST.n < 7 || G.boss || G.wallEv) return;
  const cap = ST.n === 7 ? 14 : Math.min(30, 16 + 2 * (ST.n - 8)); let n = 0;
  for (const m of G.mons) if (m.type === 'l' && m.mode !== 'dead') n++;
  if (n >= cap * 1.5 || (G.liceT -= dt) > 0) return;
  G.liceT = n < 6 ? 0.35 : ST.n === 7 ? 1.5 : 0.55;   // v053: more of them (the stamp takes them now)   // a small group gathers quickly, then it grows
  const u = Math.max(16, G.u - 75 - RND() * 20), m = newMon('l', u, 'swarm'); m.vu = 60; G.mons.push(m); G.spawned++; firstSight('l');   // it surfaces in the wake
  if (!PRED_SIM) burst(u, ysAt(u, G.S), 5, 0, 30, -40);
}
function levelSpawn() {
  if (G.barrel && G.barrel.ph !== 'out') return;   // v064: nothing new while the barrel is on
  const edge = G.S + G.camU + W + 40;
  while (LV.ei < LV.ev.length && LV.ev[LV.ei].w < edge) {
    const e = LV.ev[LV.ei];
    if (e.k === 'wall' && (G.air || G.ramp || G.T - G.lastLandT < 0.7 || G.T < 3)) { e.w = edge + 1; break; }   // v053: no wall while a jump or chain is on — 0.7 s after the landing
    if (e.k === 'wall' || e.k === 'grp') {   // v054: monsters keep clear of crevasses — a wall that would meet him at a crevasse waits until he is across
      const r = G.S + G.u, near = g => g.w1 > r - 30 && g.w0 - 450 < r + G.v * 4;
      let end = -1; for (const g of (G.gaps || [])) if (near(g)) end = Math.max(end, g.w1);
      for (let j = LV.ei + 1; j < LV.ev.length && LV.ev[j].w < r + G.v * 4 + 450; j++) { const q = LV.ev[j]; if (q.k === 'gap' && near({ w0: q.w, w1: q.w + q.len })) end = Math.max(end, q.w + q.len); }
      if (end > 0) { e.w = Math.max(edge + 1, end + G.v * 0.6); const rest = LV.ev.slice(LV.ei).sort((x, y) => x.w - y.w); LV.ev.splice(LV.ei, rest.length, ...rest); continue; }
    }
    spawnEvent(LV.ev[LV.ei++]);
  }
  while (LV.mi < LV.msgs.length && LV.msgs[LV.mi].w <= G.S + G.u) { const m = LV.msgs[LV.mi++]; if (m.lines) G.bq.push({ lines: m.lines, key: m.key, age: 0, out: 0 }); }
}
function spawnEvent(e) {
  const uEdge = G.camU + W + 24;
  switch (e.k) {
    case 't': spawn('t'); break;
    case 'e': { const m = newMon('e', G.camU + W + 24); m.rise = 0.6; G.mons.push(m); G.spawned++; firstSight('e'); break; }   // v061: it comes up from below
    case 'barrel': startBarrel(); break;
    case 'cloud': G.clouds.push({ x: W + 40, y: (G.y || 120) - 80, t: 0, ph: 'in', hit: false }); firstSight('cloud'); break;
    case 'f': spawn('f'); break;
    case 'hrow': for (let i = 0; i < e.n; i++) G.HL.push({ w: e.w + i * 15, h: 4 + Math.sin(i * 0.9) * 1.5, got: false, ph: i }); break;
    case 'mus': { const m = newMon('m', e.w - G.S); m.chain = e.chain || 0; m.tease = e.tease || 0; G.mons.push(m); G.spawned++; firstSight('m'); planRamp(m, e); break; }
    case 'wall': spawnWall(e); break;
    case 'boss': { const b = newMon('B', uEdge + 30); b.mode = 'boss'; b.rank = Math.max(0, ST.boss); G.mons.push(b); G.boss = b; G.spawned++; firstSight('B'); SFX.growl(); break; }
    case 'gap': G.gaps.push({ w0: e.w, w1: e.w + e.len, type: e.type }); break;
    case 'grp': {   // v054: a little group timed so its middle sits on the flank of a good small wave just when he gets there — jump it from the crest
      let T = 0; const best = simulate(() => { let bw = null, bs = -9, bt = 0; for (let i = 0; i < 1400 && G.u + G.S < e.w + 140; i++) { stepRider(1 / 120); const w = G.u + G.S; if (w > e.w - 60) { const sn = sinTheta(); if (sn > bs) { bs = sn; bw = w; bt = i / 120; } } } T = bt; return bw; });
      if (best === null) break;
      const n = e.n, gap = P.splashR * 1.15 + 8, mid = best + 26 + MON.t.swim * T;
      for (let i = 0; i < n; i++) { const m = newMon('t', mid - G.S + (i - (n - 1) / 2) * gap); m.grp = true; G.mons.push(m); G.spawned++; }
      const f = simulate(() => { for (let i = 0; i < 1400 && G.u + G.S < best; i++) stepRider(1 / 120); if (G.air) return null;
        G.air = true; G.airT = 0; G.airTop = G.y; G.vy -= 1.1 * (130 + 35 * Math.max(0, Math.min(1, (sinTheta() - 0.1) / 0.4))); G.qAir = G.q * 0.5; const pts = []; flyToLanding(pts); return pts; });
      if (f) f.forEach((pt, i) => { if (i % 3 === 1 && pt.h > 7) G.HL.push({ w: pt.w, h: pt.h - 1, got: false, ph: i }); });
      break;
    }
    case 'kick': {   // ride to the stretch, find the best kicker in it, take the free jump there (same physics) and lay hearts on it
      const best = simulate(() => { let bw = null, bs = -9; for (let i = 0; i < 1400 && G.u + G.S < e.w + 140; i++) { stepRider(1 / 120); const w = G.u + G.S; if (w > e.w - 60) { const sn = sinTheta(); if (sn > bs) { bs = sn; bw = w; } } } return bw; });
      if (best === null) break;
      const f = simulate(() => { for (let i = 0; i < 1400 && G.u + G.S < best; i++) stepRider(1 / 120); if (G.air) return null;
        G.air = true; G.airT = 0; G.airTop = G.y; G.vy -= 1.1 * (130 + 35 * Math.max(0, Math.min(1, (sinTheta() - 0.1) / 0.4))); G.qAir = G.q * 0.5; const pts = []; flyToLanding(pts); return pts; });
      if (f) { f.forEach((pt, i) => { if (i % 3 === 1 && pt.h > 7) G.HL.push({ w: pt.w, h: pt.h - 1, got: false, ph: i, kick: true }); });
        if (f.length && ST.n >= 6) { const top = f.reduce((a, b) => b.h > a.h ? b : a, f[0]); G.C.kicksR = (G.C.kicksR || 0) + 1;   // v061: something hangs in the sky over a good free wave
          if (G.U.glide && ST.n >= 12 && G.C.kicksR % 2 === 0) G.HL.push({ w: top.w + 70, h: top.h + 10, got: false, ph: 0, big: 12, sky: true });   // only a glide reaches it
          else G.HL.push(G.C.kicksR % 4 === 0 ? { w: top.w + 8, h: top.h + 8, got: false, ph: 0, crystal: true, sky: true } : { w: top.w + 8, h: top.h + 8, got: false, ph: 0, big: 6, sky: true }); }
        if (G.up.magOwned && G.T - (G.magItemT || -99) > 40 && f.length) { G.magItemT = G.T; const top = f.reduce((a, b) => b.h > a.h ? b : a, f[0]); G.DL.push({ w: top.w + 12, h: top.h + 4, mag: true }); } }
      break;
    }
    case 'elite': { const b = newMon('c', uEdge + 30); b.mode = 'boss'; G.mons.push(b); G.elite = b; G.spawned++; SFX.growl(); break; }
  }
}
// a ramp coming into view: ride the approach and the jump in advance (same physics) and lay the hearts on that flight
function planRamp(m, e) {
  if (!ST.jump) return;
  const f = simJump(m.u + G.S, null);
  if (!f) return;
  const lift = e.tease ? 34 + 16 * e.tease : 0;
  f.pts.forEach((p, i) => { if (i % 3 === 1 && p.h > 6) { G.HL.push({ w: p.w, h: p.h + lift - 2, got: false, ph: i, tease: !!e.tease, mus: e.tease ? null : m, dh: -2 });
    if (!e.tease && ST.n >= 8 && f.tier >= 1 && i % 6 === 1) for (const dh of (ST.n >= 10 ? [-9, 9] : [9])) G.HL.push({ w: p.w + 4, h: p.h + dh - 2, got: false, ph: i + 0.5, mus: m, dh: dh - 2 }); } });   // v054: heart fields over good jumps
  if (G.up.magOwned && !e.tease && G.T - (G.magItemT || -99) > 40) { G.magItemT = G.T; const top = f.pts.reduce((a, b) => b.h > a.h ? b : a, f.pts[0]); G.DL.push({ w: top.w + 20, h: top.h + 6, mag: true }); }
  if (!e.tease && f.tier >= 1 && RND() < 0.5) { const top = f.pts.reduce((a, b) => b.h > a.h ? b : a, f.pts[0]); G.DL.push({ w: top.w, h: top.h + 10 }); }
  if (e.over) for (let i = 0; i < e.over; i++) { const p = f.pts[Math.floor(f.pts.length * (0.35 + 0.22 * i))]; if (p) { const t = newMon('t', p.w - G.S); t.still = true; G.mons.push(t); G.spawned++; } }
}

// ---------- sprites: vector drawings, prerendered at RES px per unit (smooth) ----------
function sprite(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * RES); c.height = Math.ceil(h * RES);
  const x = c.getContext('2d');
  x.scale(RES, RES); x.lineCap = 'round'; x.lineJoin = 'round';
  fn(x);
  return c;
}
function whiteOf(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function makeSet(w, h, ox, oy, frames) {
  const img = frames.map(f => sprite(w, h, f));
  return { img, flash: img.map(whiteOf), w, h, ox, oy };
}
const el2 = (c, x, y, rx, ry, col, rot) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); c.fill(); };
const SPR = {
  // tadpole: black blob, one green eye, wriggling tail
  t: makeSet(12, 8, 5.5, 6.5, [0, 1].map(fr => c => {
    const d = '#0a0d0a', t = fr ? 0.7 : -0.7;
    c.fillStyle = d; c.beginPath(); c.moveTo(6.6, 2.6); c.quadraticCurveTo(9, 2.8 + t, 11.4, 3.6 + t * 1.4); c.quadraticCurveTo(9, 4.6 + t, 6.6, 5.2); c.fill();
    el2(c, 4.3, 4, 3.3, 2.7, d);
    el2(c, 3.4, 2.9, 1.4, 0.6, 'rgba(255,255,255,.16)');
    el2(c, 2.6, 3.6, 0.95, 0.95, '#5d9a2e'); el2(c, 2.4, 3.7, 0.42, 0.5, '#050705');
    el2(c, 4.9, 5.1, 0.45, 0.3, '#8a2424');
  })),
  // mussel ramp: low edge towards Robinson (left), glowing ribs, an eye at the high end
  m: makeSet(23, 13, 11.5, 12.5, [0, 1].map(fr => c => {
    c.fillStyle = '#c9303a'; c.strokeStyle = '#120608'; c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(0.6, 12.4); c.lineTo(0.6, 10.6); c.quadraticCurveTo(10, 7, 21.6, 1.3); c.quadraticCurveTo(22.4, 1.2, 22.4, 2.2); c.lineTo(22.4, 12.4); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#ff8a3d'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(1.2, 10.2); c.quadraticCurveTo(10, 6.8, 21.4, 1.8); c.stroke();
    c.strokeStyle = '#ffc070'; c.lineWidth = 0.35; c.beginPath(); c.moveTo(1.6, 10.7); c.quadraticCurveTo(10, 7.4, 21.2, 2.5); c.stroke();
    c.strokeStyle = fr ? '#9dff5a' : '#4fbf2e'; c.lineWidth = 0.7;
    for (const x of [6, 11, 16]) { const top = 10.6 - (x / 22) * 9.3 + 1.2; c.beginPath(); c.moveTo(x, top); c.quadraticCurveTo(x + 0.8, (top + 11.6) / 2, x, 11.6); c.stroke(); }
    el2(c, 19.8, 4.4, 1.05, 1.05, '#ffd23d'); el2(c, 19.6, 4.5, 0.45, 0.5, '#120608');
    c.fillStyle = 'rgba(18,6,8,.5)'; c.fillRect(1, 11.6, 21, 0.8);
  })),
  // rot minnows: three small fish, each pushed by a flapping tail fin (they drop fish tails)
  u: makeSet(18, 7, 8.5, 3.5, [0, 1].map(fr => c => {
    for (const [x, y, s] of [[2.2, 2.4, 1], [7.6, 4.4, 1.1], [12, 2, 0.95]]) {
      const fl = (fr ? 1 : -1) * 0.7 * s;
      c.fillStyle = '#0d3b3f'; c.beginPath(); c.moveTo(x + 1.7 * s, y); c.quadraticCurveTo(x + 2.6 * s, y + fl * 0.4, x + 3.9 * s, y - 1.3 * s + fl); c.lineTo(x + 3.4 * s, y + fl * 0.3); c.lineTo(x + 3.9 * s, y + 1.3 * s + fl); c.quadraticCurveTo(x + 2.6 * s, y + fl * 0.4, x + 1.7 * s, y); c.fill();
      el2(c, x, y, 2.1 * s, 1.15 * s, '#051416');
      c.strokeStyle = '#2f6f6a'; c.lineWidth = 0.25; c.beginPath(); c.moveTo(x - 1.2 * s, y - 0.5 * s); c.quadraticCurveTo(x, y - 1 * s, x + 1.4 * s, y - 0.4 * s); c.stroke();
      el2(c, x - 1.1 * s, y - 0.2 * s, 0.38 * s, 0.38 * s, '#5fd36a');
    }
  })),
  // invoice wasp: dark paper body with stripes, red sting, green eye, glassy wings
  f: makeSet(13, 9, 6.5, 5.5, [0, 1].map(fr => c => {
    const wy = fr ? 0 : 1.4;
    el2(c, 4.6, 2.4 + wy, 2.4, 1.3, 'rgba(40,46,40,.65)', -0.4); el2(c, 7.6, 2 + wy, 2.4, 1.3, 'rgba(52,58,50,.65)', 0.3);
    el2(c, 5.8, 5.8, 4.2, 1.8, '#0b0a07');
    c.strokeStyle = '#4a3f1c'; c.lineWidth = 0.55; for (const x of [4.4, 6.2, 8]) { c.beginPath(); c.moveTo(x, 4.2); c.lineTo(x - 0.4, 7.4); c.stroke(); }
    c.fillStyle = '#7a1e1e'; c.beginPath(); c.moveTo(9.8, 5.3); c.lineTo(12.6, 6); c.lineTo(9.8, 6.6); c.fill();
    el2(c, 2.1, 5.4, 0.55, 0.55, '#6ea832');
  })),
  // v048: wake louse — a little glassy crab from the yacht's wake, green gut, black dot eyes, scuttling legs
  l: makeSet(10, 7, 5, 6, [0, 1].map(fr => c => {
    const k = fr ? 0.6 : -0.6;
    c.strokeStyle = '#0a0d0a'; c.lineWidth = 0.55;
    for (const x of [2.6, 4.6, 6.6]) { c.beginPath(); c.moveTo(x, 4.4); c.lineTo(x - 1 + k, 6.6); c.stroke(); c.beginPath(); c.moveTo(x + 0.8, 4.4); c.lineTo(x + 1.8 - k, 6.6); c.stroke(); }
    el2(c, 5, 3.8, 3.9, 2.3, '#0a0d0a'); el2(c, 5, 3.9, 2.2, 1.1, 'rgba(60,90,50,.9)');
    c.strokeStyle = 'rgba(200,230,220,.55)'; c.lineWidth = 0.45; c.beginPath(); c.ellipse(5, 3.8, 3.9, 2.3, 0, Math.PI * 1.1, Math.PI * 1.7); c.stroke();
    el2(c, 2.4, 2.2, 0.5, 0.5, '#9fe27a'); el2(c, 3.6, 1.9, 0.5, 0.5, '#9fe27a');
  })),
};
SPR.m.w *= 1.15; SPR.m.ox *= 1.15;
// v049: tadpoles of a wall in signal green (they ask for a reaction, like the red mussel)
SPR.e = makeSet(28, 9, 5, 6.5, [0, 1].map(fr => c => {   // v061: a long black eel, green rim, one green eye at the front
  const k = fr ? 1 : -1; c.lineCap = 'round';
  c.strokeStyle = 'rgba(70,255,120,.45)'; c.lineWidth = 5.4; c.beginPath(); c.moveTo(3, 4.5); c.bezierCurveTo(9, 4.5 - 2.6 * k, 15, 4.5 + 2.6 * k, 26, 4.5 - 1.5 * k); c.stroke();
  c.strokeStyle = '#070907'; c.lineWidth = 4.2; c.beginPath(); c.moveTo(3, 4.5); c.bezierCurveTo(9, 4.5 - 2.6 * k, 15, 4.5 + 2.6 * k, 26, 4.5 - 1.5 * k); c.stroke();
  el2(c, 3.6, 4.4, 3, 2.3, '#070907'); el2(c, 2.8, 3.6, 0.9, 0.9, '#5dff7a'); el2(c, 2.6, 3.7, 0.4, 0.45, '#050705');
}));
SPR.w = makeSet(15 * 1.2, 13 * 1.2, 7.5 * 1.2, 11.5 * 1.2, [0, 1].map(fr => c => {   // v053: round body, tentacles all round, green glowing rim and eye
  c.scale(1.2, 1.2); const k = fr ? 0.5 : -0.5;
  c.strokeStyle = 'rgba(70,255,120,.55)'; c.lineWidth = 1.5; c.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.2, w = Math.sin(i * 1.7) * k; c.beginPath(); c.moveTo(7.5 + Math.cos(a) * 3.5, 6.5 + Math.sin(a) * 3.5); c.quadraticCurveTo(7.5 + Math.cos(a + w) * 6, 6.5 + Math.sin(a + w) * 5.5, 7.5 + Math.cos(a - w * 0.6) * 7.3, 6.5 + Math.sin(a - w * 0.6) * 6.3); c.stroke(); }
  c.strokeStyle = '#070907'; c.lineWidth = 0.9;
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.2, w = Math.sin(i * 1.7) * k; c.beginPath(); c.moveTo(7.5 + Math.cos(a) * 3.5, 6.5 + Math.sin(a) * 3.5); c.quadraticCurveTo(7.5 + Math.cos(a + w) * 6, 6.5 + Math.sin(a + w) * 5.5, 7.5 + Math.cos(a - w * 0.6) * 7.3, 6.5 + Math.sin(a - w * 0.6) * 6.3); c.stroke(); }
  el2(c, 7.5, 6.5, 4.6, 4.3, 'rgba(70,255,120,.5)'); el2(c, 7.5, 6.5, 4, 3.7, '#070907');
  el2(c, 6.2, 5.3, 1.4, 1.4, '#5dff7a'); el2(c, 6, 5.4, 0.55, 0.7, '#050705'); el2(c, 8.4, 4.9, 1.3, 0.5, 'rgba(160,255,190,.25)');
}));
SPR.tw = makeSet(12 * 1.6, 8 * 1.6, 5.5 * 1.6, 6.5 * 1.6, [0, 1].map(fr => c => {   // v050: big, black, a green glowing rim and eye
  c.scale(1.6, 1.6);
  const d = '#070907', t = fr ? 0.7 : -0.7;
  el2(c, 4.3, 4, 4, 3.3, 'rgba(70,255,120,.45)');
  c.fillStyle = 'rgba(70,255,120,.45)'; c.beginPath(); c.moveTo(6.4, 2.1); c.quadraticCurveTo(9, 2.3 + t, 11.9, 3.6 + t * 1.4); c.quadraticCurveTo(9, 5.1 + t, 6.4, 5.7); c.fill();
  c.fillStyle = d; c.beginPath(); c.moveTo(6.6, 2.6); c.quadraticCurveTo(9, 2.8 + t, 11.4, 3.6 + t * 1.4); c.quadraticCurveTo(9, 4.6 + t, 6.6, 5.2); c.fill();
  el2(c, 4.3, 4, 3.3, 2.7, d);
  el2(c, 3.4, 2.9, 1.4, 0.6, 'rgba(160,255,190,.25)');
  el2(c, 2.6, 3.6, 1.05, 1.05, '#5dff7a'); el2(c, 2.4, 3.7, 0.42, 0.5, '#050705');
  el2(c, 4.9, 5.1, 0.5, 0.35, '#8a2424');
}));   // v048: the mussel ramp 15 % longer
// the First Mate on his driftwood board; rank 1/2 = demoted (cap / bandana, shabbier)
function bossSprite(rank, fr) {
  return sprite(22, 28, c => {
    c.translate(1, 1.5);
    const coat = ['#3b2470', '#2f3a6a', '#4a4a58'][rank], coat2 = ['#5a3aa0', '#4a5a96', '#6a6a78'][rank], blk = '#0d0612', skin = '#9aa88a', rot = '#4fbf2e', eye = fr ? '#ff3a3a' : '#c9303a';
    c.fillStyle = '#5a3a1e'; c.beginPath(); c.roundRect(0, 23, 20, 2.2, 1.1); c.fill(); c.fillStyle = '#8a6438'; c.fillRect(1.5, 23.1, 17, 0.5);
    c.strokeStyle = blk; c.lineWidth = 2.6; c.beginPath(); c.moveTo(7.2, 16); c.lineTo(6.6, 22.8); c.moveTo(12.8, 16); c.lineTo(13.4, 22.8); c.stroke();
    c.fillStyle = coat; c.beginPath(); c.moveTo(4, 8); c.quadraticCurveTo(10, 6, 16, 8); c.lineTo(16.6, 17); c.lineTo(3.4, 17); c.closePath(); c.fill();
    c.strokeStyle = coat2; c.lineWidth = 0.8; c.beginPath(); c.moveTo(5.2, 9); c.lineTo(4.8, 16); c.moveTo(14.8, 9); c.lineTo(15.2, 16); c.stroke();
    c.strokeStyle = '#c9303a'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(10, 7.2); c.lineTo(10, 16.6); c.stroke();
    el2(c, 7, 11, 1.3, 1.1, rot); el2(c, 12.8, 13, 0.9, 0.8, rot);
    if (rank === 2) { c.strokeStyle = '#2a2a33'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(4, 15); c.lineTo(5.5, 17); c.moveTo(15, 14.5); c.lineTo(14, 17); c.stroke(); }
    c.fillStyle = skin; c.beginPath(); c.roundRect(6, 1, 8, 6.6, 2.4); c.fill(); c.fillStyle = '#7d8a6e'; c.beginPath(); c.roundRect(6, 5, 8, 2.6, 1.2); c.fill();
    el2(c, 8.2, 3.6, 0.85, 0.85, eye); el2(c, 11.8, 3.6, 0.85, 0.85, eye);
    c.fillStyle = blk;
    if (rank === 0) { c.beginPath(); c.moveTo(3.4, 1.2); c.quadraticCurveTo(10, -3.4, 16.6, 1.2); c.quadraticCurveTo(10, -0.4, 3.4, 1.2); c.fill(); c.beginPath(); c.ellipse(10, -0.2, 4, 1.8, 0, Math.PI, 0); c.fill(); el2(c, 10, -0.6, 0.6, 0.6, '#d4a017'); }
    else if (rank === 1) { c.fillStyle = '#1f2a4a'; c.beginPath(); c.ellipse(10, 0.8, 4.4, 1.9, 0, Math.PI, 0); c.fill(); c.fillRect(9.5, 0.2, 6.5, 0.9); el2(c, 10, -0.4, 0.5, 0.5, '#d4a017'); }
    else { c.fillStyle = '#8e2a2a'; c.beginPath(); c.ellipse(10, 1.2, 4.4, 2, 0, Math.PI, 0); c.fill(); c.beginPath(); c.moveTo(5.6, 1); c.lineTo(3.6, 2.6); c.lineTo(5.2, 2.8); c.fill(); }
    c.fillStyle = '#e8e2cc'; c.beginPath(); c.roundRect(16, 9, 4.4, 6, 0.4); c.fill(); c.fillStyle = '#7a6a4a'; c.fillRect(16, 9, 4.4, 0.7);
    c.strokeStyle = coat2; c.lineWidth = 0.4; c.beginPath(); c.moveTo(16.8, 11.3); c.lineTo(19.4, 11.3); c.moveTo(16.8, 12.8); c.lineTo(19.8, 12.8); c.stroke();
    c.strokeStyle = coat; c.lineWidth = 1.8; c.beginPath(); c.moveTo(4.4, 9.4); c.lineTo(2.8, 13.4); c.stroke(); el2(c, 2.7, 14, 1, 0.9, skin);
  });
}
const BOSS_SPR = [0, 1, 2].map(r => [0, 1].map(fr => bossSprite(r, fr)));
const BOSS_FLASH = BOSS_SPR.map(a => a.map(whiteOf));
// the Repo Crab: a coconut crab the size of a rowing boat, rot spots, a folder in the big claw, a yellow REPO tag
function crabSprite(fr) {
  return sprite(28, 20, c => {
    const sh = '#d2552c', dk = '#7a2a14', lt = '#f08a52', cl = fr ? 0.5 : -0.5;
    c.strokeStyle = dk; c.lineWidth = 1.1;
    for (const [x, d] of [[9, -1], [12, -1], [16, 1], [19, 1]]) { c.beginPath(); c.moveTo(x, 13); c.quadraticCurveTo(x + d * 3, 15 + cl * d, x + d * 4.5, 18.4); c.stroke(); }
    c.fillStyle = sh; c.beginPath(); c.ellipse(15, 11, 8.6, 5.4, 0, 0, Math.PI * 2); c.fill(); c.lineWidth = 0.6; c.stroke();
    el2(c, 13.4, 9, 4.6, 2, lt);
    el2(c, 11.2, 12.2, 1.2, 1, '#4fbf2e'); el2(c, 18.6, 9.4, 0.9, 0.8, '#4fbf2e'); el2(c, 16.4, 13.6, 0.7, 0.6, '#4fbf2e');
    c.fillStyle = '#ffd23d'; c.beginPath(); c.roundRect(17.4, 11.2, 5.6, 2.6, 0.5); c.fill(); c.fillStyle = '#3b2a1a'; c.font = '700 2px sans-serif'; c.fillText('REPO', 17.9, 13.2);
    c.strokeStyle = dk; c.lineWidth = 0.6; c.beginPath(); c.moveTo(10, 7); c.lineTo(9, 3.6); c.moveTo(12.4, 6.4); c.lineTo(12.6, 3); c.stroke();
    el2(c, 9, 3.4, 0.9, 0.9, '#111'); el2(c, 12.6, 2.8, 0.9, 0.9, '#111'); el2(c, 8.8, 3.1, 0.3, 0.3, '#fff'); el2(c, 12.4, 2.5, 0.3, 0.3, '#fff');
    c.fillStyle = sh; c.strokeStyle = dk; c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(7.6, 10.4); c.quadraticCurveTo(3, 8.6 + cl, 1.2, 10.8); c.quadraticCurveTo(0.6, 13.6, 4.4, 13.4); c.quadraticCurveTo(6.4, 13, 7.8, 12.4); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e8e2cc'; c.save(); c.translate(2.2, 9.2 + cl); c.rotate(-0.3); c.fillRect(-1.6, -3.4, 3.4, 4.4); c.fillStyle = '#5a3aa0'; c.fillRect(-1.2, -2.4, 2.6, 0.35); c.fillRect(-1.2, -1.4, 2, 0.35); c.restore();
    el2(c, 22.6, 10.4, 2.4, 1.6, sh); c.stroke();
  });
}
const CRAB_SPR = [0, 1].map(crabSprite), CRAB_FLASH = CRAB_SPR.map(whiteOf);
const HEART_SPR = sprite(7, 6.4, c => {
  c.fillStyle = '#2bd66a'; c.strokeStyle = '#0d4d27'; c.lineWidth = 0.4;
  c.beginPath(); c.moveTo(3.5, 5.9); c.bezierCurveTo(-0.6, 3.4, 0.2, -0.4, 3.5, 1.6); c.bezierCurveTo(6.8, -0.4, 7.6, 3.4, 3.5, 5.9); c.fill(); c.stroke();
  el2(c, 2, 2, 0.8, 0.55, '#c8ffd9', -0.5);
});
const DIA_SPR = sprite(9, 10, c => {
  c.fillStyle = '#ffc21a'; c.strokeStyle = '#6b3f00'; c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(2, 0.6); c.lineTo(7, 0.6); c.lineTo(8.6, 3); c.lineTo(4.5, 9.4); c.lineTo(0.4, 3); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#ffe680'; c.beginPath(); c.moveTo(2.3, 1); c.lineTo(6.7, 1); c.lineTo(5.6, 3); c.lineTo(3.4, 3); c.closePath(); c.fill();
  c.fillStyle = '#e8a000'; c.beginPath(); c.moveTo(3.4, 3); c.lineTo(5.6, 3); c.lineTo(4.5, 9); c.closePath(); c.fill();
  el2(c, 3, 1.8, 0.7, 0.4, '#fffbe6');
});
// the NOTAX stamp, like on the beach: wooden knob, black pad, green ink
const STAMP_SPR = sprite(6, 7, c => {
  el2(c, 3, 1.3, 1.2, 1.2, '#8b5e34'); c.fillStyle = '#6b4a2b'; c.fillRect(2.5, 1.6, 1, 2.4);
  c.fillStyle = '#2b2b2b'; c.beginPath(); c.roundRect(0.6, 3.8, 4.8, 1.6, 0.4); c.fill();
  c.fillStyle = '#39e639'; c.fillRect(0.6, 5.3, 4.8, 0.7);
});

// ---------- state ----------
let G = null, ST = null, CFG = null, DONE = null;
function reset(cfg) {
  CFG = cfg; ST = stageDef(cfg);
  const st = ST, up = cfg.upg || {};
  LOOK = LOOKS[st.look] || LOOKS.day; gradCache = {};
  P.vMax = st.v * BOOST * 1.12 * P.tempoMul; P.vCruise = st.v * P.tempoMul; P.steepBase = st.steep;
  P.stampRate = 0.5 * (up.speed ? 0.8 * Math.pow(0.9, up.speed - 1) : 1);   // v047: the first level is the big one (stage 1 lesson); level 5 as before
  P.splashR = 16 + 4 * (up.splash || 0); P.splash = Math.min(1, 0.3 + 0.7 * (up.splash || 0));   // v046: Wider Splash also splashes harder (level 1 = a full stamp onto the ones around)
  P.stamina = Math.max(1, cfg.stamMax || 5);
  G = {
    T: 0, S: 0, v: P.vCruise, steep: 1,
    u: 120, y: 0, vy: 0, q: 0, air: false, airT: 0, qAir: 0,
    dashT: 0, dashDur: 0, dashU: 0, dashPow: 0, dashFlag: false, diveT: 0, diveDur: 0.4, diveK: 0, jumpBusy: false, airTop: 0,
    dmg: 1 + (up.dmg || 0), U: { jump: st.jump, cycle: st.cycle, void: !!up.void, glide: !!up.glide, flame: !!up.flame },
    up: { boostLen: P.boostLen * (1 + 0.25 * (up.boostLen || 0)), magnet: 3 * (up.magnet || 0), magOwned: (up.magnet || 0) > 0, glideMax: 2 + 0.5 * (up.glideLen || 0), flameDps: (12 + 6 * (up.flamePow || 0)), boom: 1 + 0.5 * (up.cycleBoom || 0), dive: 1 + 0.3 * (up.cycleDive || 0),
      voidNeed: Math.round(40 * Math.pow(0.85, up.voidCharge || 0)), voidHeal: 0.3 + 0.1 * (up.voidHeal || 0) },
    catEel: !!up.catEel, clouds: [], barrel: null, riderOv: null,   // v061 · v064: the barrel
    won: false, wonT: 0, endS: 1e9, boss: null, elite: null, pages: [], shocks: [], boom: null, chainN: 0, chainT: 0, DL: [], banner: null,
    stam: Math.max(1, Math.round(cfg.stam || 1)), hurtT: 0, ifr: 0, over: false, overT: 0, HL: [],
    wipe: 0, lipWarn: 0, lipU: 7, volC: 0, volN: 0, volWarn: 0,
    stumble: 0, lipCd: 0, aHeldT: 0, inv: 0, kickT: 0,
    camU: 0, camY: 0, shake: 0, dim: 0,
    mons: [], shots: [], fx: [], bolts: [], flood: null, voidQ: null, floats: [],
    trail: [], trailT: 0, stampT: 0, spawned: 0,
    farX: 0, midX: 0, nearX: 0, cat: 'calm',
    boostM: 0, combo: 0, comboMax: 0, armT: -9, cyc: null, wallEv: null, trick: null, aimW: null, voidC: 0, saved: 0, ramp: null, lift: 0, lateJ: null, KH: [], spray: [], gaps: [], gapSkip: null, glideT: 0, gliding: false, bounces: 0, flameT: 0, lastLandT: -9, evlog: [], bq: [], banner: null, chainP: null, liceT: 2, chainLog: [],
    K: { stamp: 0, splash: 0, dash: 0, jump: 0, dive: 0, s: 0, void: 0, cat: 0 },
    Hc: { t: 0, m: 0, fall: 0, f: 0, lip: 0, swarm: 0, boss: 0 },
    C: { jumps: 0, bigJumps: 0, tricks: [0, 0, 0], dashes: 0, dives: 0, s: 0, w: 0, spills: 0, washed: 0, hearts: 0, heartsMissed: 0, cycles: 0, cyclesGood: 0, volleys: 0, dia: 0, diaMissed: 0 },
    gain: { green: 0, tails: 0, rum: 0 }, greenF: 0, kills: 0, bossDown: false, eliteDown: false,
    bt: 0, flash: 0, kat: { mode: !cfg.cat ? 'away' : up.catBoard ? 'board' : 'head', t: 0, x: 0, y: 0, u: undefined, cd: 3, dives: 0, max: up.catBoard ? 99 : up.catDive ? 1 : 0,
      reach: 60 + 12 * (up.catFish || 0), every: 12 * Math.pow(0.85, up.catFish || 0), deep: 1 + 0.25 * (up.catFish || 0), wet: 0 },
    seen: Object.assign({}, cfg.seen || {}), mewed: {}, lastMew: -9, say: [], tips: {}, tipT: -99, sayT: 0, sayLine: null, catKill: false, final: null, slow: 0,
  };
  RND = mulberry32(4242 + st.n * 31 + ['wave', 'nest', 'cabin', 'army', 'last'].indexOf(st.kind));
  levelInit(1000 + st.n * 7 + (st.kind === 'wave' ? 0 : 31));   // v047: no seed — the stage is the script
  G.endS = LV.end;
  RIP = P.ripple * Math.min(10, 2.2 + 0.75 * (st.n - 1));   // v053: about twice the old height at stage 8/9
  L = 150 / G.steep; AMP = troughAmp(0) * st.amp;
  G.y = ysAt(G.u, G.S);
  G.camU = G.u - 0.3 * W;
  PT.n = 0;
  if (st.kind === 'last') G.final = { sev: 5, warn: 0, rage: false, adds: [0.66, 0.33], term: null };
  G.tafeln = st.n === 1 && st.kind === 'wave' ? [{ u: G.u + 0.55 * W, s: G.S, txt: 'Just watch and enjoy' }] : null; G.tafelB = -9;   // v062: wooden signs drift through the very first surf
}

// ---------- particles (pooled) ----------
const PMAX = 3000;
const PT = {
  n: 0, x: new Float32Array(PMAX), y: new Float32Array(PMAX), vx: new Float32Array(PMAX), vy: new Float32Array(PMAX),
  t: new Float32Array(PMAX), life: new Float32Array(PMAX), sz: new Float32Array(PMAX), g: new Float32Array(PMAX),
  c: new Uint8Array(PMAX), add: new Uint8Array(PMAX),
};
const PCOL = ['#ffffff', '#e9fbff', '#b8f05a', '#141a12', '#c9303a', '#7dffb0', '#2cff9a', '#c6ff63', '#0e3b2a', '#9de7ff', '#2e9e4f', '#ff4a4a', '#ff8a3d', '#2bd66a', '#5ab8ff', '#e0f6ff', '#ffc21a', '#9a6cff', '#e07b2e', '#a9c4d8'];
function budget() { return P.lite ? 900 : PMAX; }
function part(x, y, vx, vy, life, ci, sz, grav, add) {
  if (PT.n >= budget()) return;
  const i = PT.n++;
  PT.x[i] = x; PT.y[i] = y; PT.vx[i] = vx; PT.vy[i] = vy; PT.t[i] = 0; PT.life[i] = life;
  PT.c[i] = ci; PT.sz[i] = sz; PT.g[i] = grav; PT.add[i] = add ? 1 : 0;
}
function burst(x, y, n, ci, sp, up, add) {
  if (P.lite) n = Math.ceil(n * 0.4);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = sp * (0.3 + Math.random() * 0.7);
    part(x, y, Math.cos(a) * s, Math.sin(a) * s + up, 0.4 + Math.random() * 0.4, ci, Math.random() < 0.3 ? 1 : 0.6, P.g * 0.6, add);
  }
}
function updParts(dt) {
  let j = 0;
  for (let i = 0; i < PT.n; i++) {
    const t = PT.t[i] + dt;
    if (t >= PT.life[i]) continue;
    PT.t[j] = t; PT.life[j] = PT.life[i];
    PT.vy[j] = PT.vy[i] + PT.g[i] * dt; PT.vx[j] = PT.vx[i];
    PT.x[j] = PT.x[i] + PT.vx[i] * dt; PT.y[j] = PT.y[i] + PT.vy[j] * dt;
    PT.c[j] = PT.c[i]; PT.sz[j] = PT.sz[i]; PT.g[j] = PT.g[i]; PT.add[j] = PT.add[i];
    j++;
  }
  PT.n = j;
}
function ring(x, y, r0, r1, life, col, add, lw) { G.fx.push({ x, y, r0, r1, t: 0, life, col, add, lw: lw || 0.5 }); }
function float(x, y, s, col, sz) { G.floats.push({ x, y, s, col: col || '#ffffff', t: 0, sz: sz || 8 }); }

// ---------- input (v046): only two taps — D = jump over the mussel, A = the wave cycle ----------
const IN = { a: false, d: false };
let clock = 0, running = false, paused = false;
function tap(k) { if (!G || G.over || G.won) return; if (G.tafeln && G.T - G.tafelB > 6) { G.tafelB = G.T; G.tafeln.push({ u: G.camU + W + 30, s: G.S, txt: 'Just relax now — time to act will come' }); }   // v062: tapping in stage 1 sends a gentle sign
  if (G.barrel && barrelTap(k)) return;
  if (k === 'd') tapD(); else tapA(); }
function resume() { paused = false; try { cv.focus({ preventScroll: true }); } catch (_) {} }
addEventListener('keydown', e => {
  if (!WELT.aktiv() || !running || e.repeat) return;
  const k = e.key.toLowerCase();
  if (paused) { if (['a', 'd', ' ', 'enter', 'escape', 'p'].includes(k) || e.key.startsWith('Arrow')) { resume(); e.preventDefault(); } return; }
  if ((k === 'p' || k === 'escape') && window.SURF_TEST) { paused = true; e.preventDefault(); return; }   // v054: no pause in the main game
  if (k === 'a' || e.key === 'ArrowLeft') { IN.a = true; tap('a'); e.preventDefault(); }
  if (k === 'd' || e.key === 'ArrowRight' || k === ' ') { IN.d = true; tap('d'); e.preventDefault(); }
});
addEventListener('keyup', e => {   // v054: holding D (glider) and A (flamethrower)
  const k = e.key.toLowerCase();
  if (k === 'a' || e.key === 'ArrowLeft') IN.a = false;
  if (k === 'd' || e.key === 'ArrowRight' || k === ' ') IN.d = false;
});
const PTR = new Map();
function ptrUp(e) { const s = PTR.get(e.pointerId); if (s) { IN[s] = false; PTR.delete(e.pointerId); } }
addEventListener('pointerup', ptrUp); addEventListener('pointercancel', ptrUp);
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  try { cv.focus({ preventScroll: true }); } catch (_) {}
  if (!running) return;
  if (paused) { resume(); return; }
  const r = cv.getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
  { const px = W - 16, py = (G.boss || G.elite) ? 34 : 26, lx = fx * W, ly = fy * H; if (window.SURF_TEST && (lx - px) ** 2 + (ly - py) ** 2 < 15 * 15) { paused = true; return; } }   // pause + controls
  const side = fx < 0.5 ? 'a' : 'd'; PTR.set(e.pointerId, side); IN[side] = true;
  tap(side);
});
cv.addEventListener('contextmenu', e => e.preventDefault());
function lostFocus() { if (running && G && !G.over && !G.won) paused = true; }
addEventListener('blur', lostFocus);
document.addEventListener('visibilitychange', () => { if (document.hidden) lostFocus(); });

let PRED_SIM = false;
function inputState() { return G.cyc && G.cyc.ph === 'climb' ? 'brake' : 'none'; }   // v046: only the cycle climbs; otherwise he rides at the stage's tempo

// ---------- derived values ----------
function vNorm() { return Math.max(0, Math.min(1, (G.v - P.vMin) / (P.vMax - P.vMin))); }
function heightNorm() { return Math.max(0, Math.min(1, 1 - (ysAt(G.u, G.S) - Y_TOP) / AMP)); }
function sinTheta() { const s = slopeAt(G.u, G.S); return s / Math.hypot(1, s); }
function dashPower() {
  const vn = vNorm();
  const p = 0.5 * heightNorm() + 0.25 * Math.min(1, sinTheta() / 0.85) + 0.25 * vn;
  return Math.max(0, Math.min(1, p * (1 - 0.1 * Math.max(0, (vn - 0.6) / 0.4))));
}
function onGround() { return !G.air || (ysAt(G.u, G.S) - G.y) < 2; }
function underwater() { return G.diveT > 0 && diveDepth() > 3; }
function diveDepth() { return G.diveT > 0 ? (8 + 6 * G.diveK) * Math.sin(Math.PI * (1 - G.diveT / G.diveDur)) : 0; }
function troughAmp(S) {
  const lt = S / 150, g = 0.6 + 0.9 * Math.min(1, lt / 300);
  return Math.max(130, Math.min(340, 200 + P.trough * g * (55 * Math.sin(lt * 0.183 + TPH[0]) + 35 * Math.sin(lt * 0.0617 + TPH[1]))));
}

// ---------- actions ----------
function applyDash(p) {
  G.dashPow = p; G.dashFlag = true;
  G.dashDur = G.dashT = 0.15 + 0.45 * p;
  G.dashU = 20 + 150 * p;
  G.v = Math.min(P.vMax * 1.15, G.v + 25 + P.dashMax * p);
}
function startDive(k) {
  G.dashFlag = false; G.diveK = k; G.diveDur = G.diveT = 0.4 + 0.5 * k;
  if (PRED_SIM) return;
  G.C.dives++;
  const x = G.u, y = ysAt(G.u, G.S), r = (12 + 14 * k) * G.up.dive, dmg = (1 + 3 * k) * G.dmg;
  ring(x, y, 2, r, 0.4, '#e9fbff', false, 1);
  ring(x, y, 1, r * 1.3, 0.5, '#7dffb0', true, 0.5);
  burst(x, y, 10 + 16 * k, 0, 70 + 70 * k, -80 - 60 * k);
  burst(x, y, 4 + 8 * k, 6, 60, -40, true);
  if (k > 0.5) { G.shake = Math.max(G.shake, 0.15); SFX.splat(); }
  for (const m of G.mons) {
    if (m.mode !== 'come' && m.mode !== 'swarm' && m.mode !== 'boss') continue;
    if (m.type === 'f' && !(m.stun > 0)) continue;
    const [mx, my] = mPos(m);
    if ((mx - x) ** 2 + (my - y) ** 2 < r * r) damage(m, dmg, 'dive');
  }
}

// ---------- v046: D = the jump over the mussel · tricks · chains · boost ----------
const JUMP_J = [175, 245, 315], JUMP_Q = [45, 70, 95];
const RAMP_END = 9.5, RAMP_H = 9, PRE_RAMP = 0.1, PRE_LAND = 0.25, POST_LAND = 0.28;   // v047: tap ON the ramp; landing has a window before and after
function armedFor(s) { return clock - G.armT < s; }
function armed() { return armedFor(PRE_LAND); }
function geomGood() { return sinTheta() > P.geom; }
function tierNow() { const b = G.boostM > 0, g = geomGood(); return Math.min(ST.trickCap, b && g ? 2 : b || g ? 1 : 0); }
function jumpPhys(tier) { G.air = true; G.airT = 0; G.airTop = G.y; G.jumpBusy = true; G.vy = Math.min(0, G.vy) - JUMP_J[tier]; G.bounces = 0;
  const tA = 2 * -G.vy / P.g, home = 40 + 175 * vNorm() + 10; G.qAir = Math.max(-60, Math.min(JUMP_Q[tier], (home - G.u) / Math.max(0.3, tA))); }   // v054: he lands back at his riding spot — the steep part of the face, where Backflips live
function simulate(fn) { const snap = Object.assign({}, G), sL = L, sA = AMP; PRED_SIM = true; let r = null; try { r = fn(); } finally { PRED_SIM = false; Object.assign(G, snap); L = sL; AMP = sA; } return r; }
function flyToLanding(pts) {
  for (let i = 0; i < 480; i++) { stepRider(1 / 120); if (i % 2 === 0) pts.push({ w: G.u + G.S, h: ysAt(Math.max(3, G.u), G.S) - G.y }); if (!G.air && i > 4) return G.u + G.S; }
  return null;
}
function simJump(muW) {   // ride to the ramp at the stage's tempo, up the ramp, take the jump he would get at its lip, fly to the landing
  return simulate(() => {
    for (let i = 0; i < 900 && G.u + G.S < muW - 16; i++) stepRider(1 / 120);
    if (G.air) return null;
    for (let i = 0; i < 300 && G.u + G.S < muW + RAMP_END; i++) stepRider(1 / 120);   // over the ramp to its lip
    G.y -= RAMP_H;
    const tier = tierNow(); jumpPhys(tier);
    const pts = [], land = flyToLanding(pts);
    return { pts, tier, land };
  });
}
function combo() {
  G.combo++; G.comboMax = Math.max(G.comboMax, G.combo); G.boostM = G.up.boostLen;
  if (G.combo >= 4 && G.combo % 4 === 0) catSays('combo');
  const k = Math.min(G.combo, 14); tone(523 * Math.pow(1.06, k), 784 * Math.pow(1.06, k), 0.14, 'triangle', 0.16);
}
function tapD() {
  if (!G.U.jump) return;
  G.armT = clock;
  G.lastDTap = clock;
  if (G.ramp) { if (!G.ramp.hit) { G.ramp.hit = true; G.ramp.tapAt = clock; float(G.u, G.y - RAMP_H - 24, '✓', '#ffe36a'); tone(660, 990, 0.08, 'triangle', 0.12); } return; }
  if (G.lateJ && clock - G.lateJ.t < POST_LAND && G.air) { const c = G.lateJ.chain; G.lateJ = null; G.vy = 0; jumpOff(c); return; }   // a late tap just after landing on a mussel still counts
  const ramp = (G.air && G.aimW !== null) || G.mons.some(m => m.type === 'm' && m.mode === 'come' && m.u - G.u > -4 && m.u - G.u < 75);
  if (!G.air && G.mons.some(m => m.type === 'm' && m.mode === 'come' && !m.ramped && m.u - G.u > 0 && m.u - G.u < 110)) G.earlyD = clock;   // before the ramp: does nothing
  if (!ramp && !G.air && G.dashT <= 0 && G.diveT <= 0 && !G.cyc) { G.air = true; G.airT = 0; G.airTop = G.y; G.vy -= 1.1 * (130 + 35 * Math.max(0, Math.min(1, (sinTheta() - 0.1) / 0.4))); G.qAir = G.q * 0.5; G.jumpBusy = true; G.C.jumps++; burst(G.u, G.y, 5, 0, 40, -50); }   // a little hop: feedback, nothing more
}
function rampHit(m) {   // v047: riding onto a mussel ramp — he rides UP it; a D tap on the way up (or just before) = the big jump at its lip
  if (m.ramped || G.ramp) return; m.ramped = true;
  G.ramp = { m, t: 0, k: 0, t0: clock, d0: m.u - G.u, hit: G.U.jump && armedFor(PRE_RAMP) };
  if (G.ramp.hit) G.armT = -9;
  else if (G.earlyD && clock - G.earlyD < 0.9) { G.earlyD = null; G.ramp.early = true; catSays('early'); }
}
function updRamp(dt) {
  const r = G.ramp; if (!r) return;
  if (r.m.mode !== 'come' || G.air || G.dashT > 0 || G.diveT > 0) { G.ramp = null; G.lift = 0; return; }
  r.t += dt; const k = r.k = Math.max(0, Math.min(1, (r.d0 - (r.m.u - G.u)) / (r.d0 + RAMP_END)));   // v048: he rides over it at full tempo — nothing sticks
  G.lift = RAMP_H * k;
  if (k < 1) return;
  if (!r.hit) { r.coast = (r.coast || 0) + dt; G.lift = RAMP_H; if (r.coast < P.postRamp) return; }   // v053: a late tap just past the lip still counts
  G.ramp = null; G.lift = 0; G.y -= RAMP_H;
  const lt = r.tapAt || (G.lastDTap && Math.abs(G.lastDTap - r.t0) < 1 ? G.lastDTap : null);
  logE({ k: 'ramp', hit: !!r.hit, early: !!r.early, chain: r.m.chain || 0, v: Math.round(G.v), boost: G.boostM > 0, tapMs: lt ? Math.round((lt - r.t0) * 1000) : null, overMs: Math.round(r.t * 1000), fps: Math.round(1 / Math.max(0.001, G.dtAvg || 0.016)) });   // v053: tap time vs ramp contact (negative = before)
  if (r.hit) { bigJump(r.m); return; }
  if (!r.early) catSays('late');
  kill(r.m, 'jump'); hurt('m', 1);   // no tap: a small hop off the lip, the mussel dies, 1 stamina
  G.air = true; G.airT = 0; G.airTop = G.y; G.vy = Math.min(0, G.vy) - 110; G.qAir = Math.max(0, G.q) * 0.4; G.jumpBusy = true;
}
function bigJump(m) { kill(m, 'jump'); jumpOff(m.chain || 0); resnapHearts(m); }
function resnapHearts(m) {   // v055: the arc was laid when the mussel came into view — if the real jump flies higher or lower (boost, combo), its hearts glide onto the real path
  if (PRED_SIM || !m) return; const hs = G.HL.filter(h => h.mus === m && !h.got && !h.missed); if (!hs.length) return;
  const pts = simulate(() => { const p = []; flyToLanding(p); return p; }); if (!pts || pts.length < 3) return;
  for (const h of hs) { const w = h.w; let k = pts.findIndex(p => p.w >= w);
    if (k < 0) { h.th = Math.max(4, pts[pts.length - 1].h + h.dh); continue; } if (k === 0) k = 1;
    const a = pts[k - 1], b = pts[k], t = b.w === a.w ? 0 : (w - a.w) / (b.w - a.w); h.th = Math.max(4, a.h + (b.h - a.h) * t + h.dh); }
}
function jumpOff(chain) {
  const tier = tierNow();
  jumpPhys(tier); G.C.bigJumps++; G.C.tricks[tier]++; G.C.jumps++;
  G.trick = { tier, t: 0, dur: 2 * JUMP_J[tier] / P.g };
  float(G.u, G.y - 32, TRICK[tier], tier === 2 ? '#ffb0ff' : tier ? '#ffe36a' : '#ffffff');
  combo();
  burst(G.u, G.y, 10 + tier * 6, 13, 60, -70, true); SFX.whoosh();
  if (chain > 0 && tier >= 1) chainNext(chain - 1);
  if (tier === 2 && ST.n >= 5 && !PRED_SIM && (G.C.giants || 0) < 1 + Math.floor((ST.n - 5) / 3) && RND() < 0.6) { G.C.giants = (G.C.giants || 0) + 1;   // v054: a giant heart (25) at the top of a Backflip arc
    const pts = simulate(() => { const p = []; flyToLanding(p); return p; });
    if (pts && pts.length > 6) { const top = pts.reduce((a, b) => b.h > a.h ? b : a, pts[0]); G.HL.push({ w: top.w + 6, h: top.h - 2, got: false, ph: 0, big: 25 }); }
  }
}
// v051: the run log — walls, ramps, hits, chain landings — for analysing timings, difficulty and level faults
function logE(o) { if (!PRED_SIM && G.evlog) G.evlog.push(Object.assign({ t: +G.T.toFixed(2), m: Math.round((G.S + G.u) / 10) }, o)); }
function sumK(ks) { return ks.reduce((a, k) => a + (G.K[k] || 0), 0); }
function sumH() { let a = 0; for (const k in G.Hc) a += G.Hc[k]; return a; }
function logChain(hit, m) {   // v048: where a chain jump really came down, against the forecast
  const c = G.chainP; G.chainP = null; const act = Math.round(G.u + G.S);
  logE({ k: 'chain', tier: c.tier, dx: act - c.pred, hit, boost: c.boost });
  G.chainLog.push({ stage: ST.n, tier: c.tier, v: c.v, boost: c.boost, pred: c.pred, act, dx: act - c.pred, hit, onMussel: m ? Math.round(m.u + G.S - c.pred) : null, armed: hit && armedFor(PRE_LAND), left: c.left });
}
function chainNext(left) {   // the next mussel surfaces exactly where he will land; its hearts lie on the jump he will get from there
  const r = simulate(() => {
    const land = flyToLanding([]); if (land === null) return null;
    const t2 = tierNow(); jumpPhys(t2); const pts = []; flyToLanding(pts);
    return { land, pts, t2 };
  });
  if (!r) return;
  const m = newMon('m', r.land - G.S); m.chain = left; m.rise = 0.6; G.mons.push(m); G.spawned++;
  if (ST.n >= 5 && ST.kind === 'wave' && RND() < 0.5) { const f = newMon('u', r.land - G.S + 6); f.still = true; G.mons.push(f); G.spawned++; }   // v053: a rot minnow under the landing mussel
  if (ST.n >= 4 && ST.kind === 'wave' && left > 0 && RND() < 0.4) for (const d of [58, 74]) { const t = newMon('t', r.land - G.S + d); G.mons.push(t); G.spawned++; }   // v055: a pair just past the landing — jump on, or ride into them
  G.aimW = r.land;
  if (!PRED_SIM) G.chainP = { pred: Math.round(r.land), tier: G.trick ? G.trick.tier : -1, v: Math.round(G.v), boost: G.boostM > 0, t2: r.t2, left };
  if (r.t2 >= 1) r.pts.forEach((p, i) => { if (i % 3 === 1 && p.h > 6) G.HL.push({ w: p.w, h: p.h - 2, got: false, ph: i, mus: m, dh: -2 }); });
}

// ---------- v046: A = the wave cycle — boomerang back, climb, dash down (timed on the wall of monsters) ----------
function takeMax() { const close = G.v * (1 + wallX()) + 22; return Math.max(P.takeMax + 50, 14 + 0.38 * close); }   // v054: wider — taps when the sign touches him count, ≥ ~0.35 s at any tempo
function climbT() { return G.wallEv && G.wallEv.climbT ? G.wallEv.climbT : P.climbT; }
function wallX() { return G.wallEv && G.wallEv.wx !== undefined ? G.wallEv.wx : P.wallXm * Math.min(0.45, 0.25 + 0.05 * Math.max(0, ST.n - 8)); }   // v049: +25 % at stage 8 … +45 %
function wallFront(e) { let f = 1e9; for (const m of e.mons) if (m.mode === 'come' && m.u > G.u - 10 && m.u < f) f = m.u; return f; }
function wallRear(e) { let r = -1e9; for (const m of e.mons) if (m.mode === 'come' && m.u > G.u - 10 && m.u > r) r = m.u; return r; }
// v049: "tap A now" forecast — boomerang, climb, leap: does the whole wall pass under him (ok), would he land before/into it (early), or does it reach him first (late)?
function cyclePlan() {
  const e = G.wallEv; if (!e || G.cyc || G.air || G.dashT > 0 || G.diveT > 0) return null;
  const f0 = wallFront(e); if (f0 > 1e8 || f0 < G.u) return null;
  const len = wallRear(e) - f0, X = wallX();
  return simulate(() => {
    let f = f0, t = 0; const dt = 1 / 120, cl = () => (G.v * (1 + X) + 22) * dt;
    G.cyc = { ph: 'boom', t: 0 };
    for (let i = 0; i < 400; i++) {
      if (G.cyc.ph === 'boom' && t >= P.boomT) G.cyc.ph = 'climb';
      if (G.cyc.ph === 'climb' && t >= P.boomT + climbT()) break;
      stepRider(dt); f -= cl(); t += dt;
      if (f - G.u < 13) return { late: true, d: f - G.u, t };
    }
    const dTake = f - G.u; G.cyc.ph = 'dash'; startLeap();
    for (let i = 0; i < 400 && G.air; i++) { stepRider(dt); f -= cl(); t += dt; }
    const rearAt = f + len - G.u, uLand = G.u;   // where the wall's last monster is when he comes down
    const ok = rearAt < -4 && dTake >= 14 && dTake < takeMax();   // a little more room on the first wall stages   // the leap starts just before the wall arrives and the whole wall passes under him
    return { ok, early: !ok, d: dTake, rearAt, t, uLand };
  });
}
function cycleWindow() { return !!(G.plan && G.plan.ok); }
function startLeap() {   // v049: the dash leaves the face — up over the wall, down into the water behind it; v054: as high and long as the tower needs, onto the boss in a boss fight
  const p = Math.max(0.8, dashPower());
  applyDash(p);
  let vy = 190 + 50 * p;
  const e = G.wallEv;
  if (e) { let top = 0, f = 1e9, r = -1e9; for (const m of e.mons) if (m.mode === 'come') { top = Math.max(top, m.off + MON[m.type].h); f = Math.min(f, m.u); r = Math.max(r, m.u); }
    if (f < 1e8) { const close = G.v * (1 + wallX()) + 22; const df = Math.min(f - G.u, takeMax() + 10);   // v055: the leap is sized for a good tap — tap early and it comes down in the wall
      vy = Math.max(vy, Math.sqrt(2 * P.g * (top + 18)), Math.min(430, P.g * (df + (r - f) + 30) / close / 2)); } }
  const uRest = 40 + 175 * vNorm(), tA = 2 * vy / P.g, tgt = (G.boss || G.elite) ? (G.boss || G.elite).u : uRest + 30;
  G.air = true; G.airT = 0; G.airTop = G.y; G.jumpBusy = true; G.vy = Math.min(0, G.vy) - vy; G.bounces = 0;
  G.qAir = Math.max((G.boss || G.elite) ? -40 : 60, (tgt - G.u) / tA);
  for (const g of gapsAhead()) {   // v054: never come down into a crevasse — stretch the leap over it
    let T = 2 * Math.abs(G.vy) / P.g; const a = g.w0 - G.S - G.v * T, b = g.w1 - G.S - G.v * T, land = G.u + G.qAir * T;
    if (land > a - 12 - G.v * 0.9 && land < b + 12) {   // also when he would come down just before it, still in the dive (v060: this line had swallowed the code since v054)
      const need = b + 22; G.vy = -Math.max(Math.abs(G.vy), Math.sqrt(Math.max(0, (need - G.u)) * P.g / 2)); T = 2 * Math.abs(G.vy) / P.g;
      G.qAir = (g.w1 - G.S - G.v * T + 22 - G.u) / T; }
  }
}
function tapA() {
  if (!G.U.cycle || G.cyc || G.air || G.dashT > 0 || G.diveT > 0) return;
  if (!G.plan && G.wallEv) G.plan = cyclePlan();
  G.tapPlan = G.plan;
  const good = cycleWindow();
  if (G.wallEv && !good && G.plan) catSays(G.plan.late ? 'late' : 'early');
  if (G.wallEv && G.wallEv.L.tap === 'none') { const L = G.wallEv.L; const fw = wallFront(G.wallEv); L.wallXAtTap = fw < 1e8 ? +(sx(fw) / W).toFixed(2) : null; L.tap = good ? 'ok' : !G.plan ? 'noplan' : G.plan.late ? 'late' : 'early'; L.tapT = +G.T.toFixed(2); if (G.plan) { L.tapD = Math.round(G.plan.d); L.tapRear = Math.round(G.plan.rearAt || 0); L.earlyMs = Math.round((G.plan.d - takeMax()) / (G.v * (1 + wallX()) + 22) * 1000); } }   // v055: + = ms before the window would close at the front, for the log
  G.cyc = { ph: 'boom', t: 0, good, climbT: climbT() }; G.C.cycles++;
  G.boom = { t: 0, dir: -1, R: 115, d: 2 * G.dmg * G.up.boom, out: new Set(), back: new Set(), x: G.u, y: G.y - 9, ang: 0 }; SFX.whoosh();
  if (good) { G.C.cyclesGood++; G.wallEv.good = true; combo(); float(G.u, G.y - 34, 'PERFECT', '#c8ffd9'); }
}
function flameAct() { return G.U.flame && IN.a && G.cyc && (G.cyc.ph === 'boom' || G.cyc.ph === 'climb' || (G.cyc.ph === 'dash' && G.air)); }   // v064: it burns until he dives into the water
function updFlame(dt) {   // v054: a colourful flamethrower forward while A is held during the boomerang and the climb; v064: through the leap, aimed down at the wall below
  for (const m of G.mons) if (m.burn > 0) m.burn -= dt;
  const was = G.flameOn; G.flameOn = !!flameAct();
  if (!G.flameOn) return;
  G.flameT += dt; const ox = G.u + 6, oy = G.y - 10, air = G.air;
  let ay = 0, an = 0;
  if (air) { for (const m of G.mons) { if (m.mode !== 'come' || m.type === 'm' || m.type === 'u') continue; const [x, y] = mPos(m); if (x > ox - 30 && x < ox + 130 && y > oy - 4) { ay += Math.atan2(y - oy, x - ox); an++; } } }
  else { const e = G.wallEv; if (e) for (const m of e.mons) { if (m.mode !== 'come') continue; const [x, y] = mPos(m); if (x > ox && x < ox + 130) { ay += Math.atan2(y - oy, x - ox); an++; } } }   // aim at the middle of the wall in front of him (it usually sits lower on the face than his chest)
  const want = an ? ay / an : (air ? 0.85 : 0.15);
  G.flameDir = was && G.flameDir !== undefined ? G.flameDir + (want - G.flameDir) * Math.min(1, dt * 10) : want;
  G.flameX = ox; G.flameY = oy;
  flameWork(ox, oy, G.flameDir, G.mons, dt, !was);
}
// the burning itself, outside and in the barrel: damage in the cone, the ignition, embers, smoke, steam, the crackle
function flameWork(ox, oy, dir, list, dt, start) {
  const dmg = G.up.flameDps * G.dmg * dt;
  for (const m of list) { if (m.mode === 'dead' || m.type === 'm' || m.type === 'u') continue; const [x, y] = mPos(m), dx = x - ox, dy = y - oy, d = Math.hypot(dx, dy);
    if (d > 125) continue; const da = Math.atan2(Math.sin(Math.atan2(dy, dx) - dir), Math.cos(Math.atan2(dy, dx) - dir));
    if (Math.abs(da) < 0.45 || d < 14) { m.burn = 0.5; if (G.barrel && G.barrel.scene) { const n0 = G.KH.length; damage(m, dmg, 'flame'); drumHearts(n0); } else damage(m, dmg, 'flame'); } }
  if (start) {   // the ignition: a fireball, a jolt, a roar
    G.flameT0 = G.T;
    ring(ox, oy, 2, 22, 0.35, '#ffc21a', true, 1.4); burst(ox, oy, P.lite ? 8 : 22, 12, 140, -40, true); burst(ox, oy, P.lite ? 4 : 10, 16, 90, -30, true);
    G.shake = Math.max(G.shake, 0.12); if (!PRED_SIM) { noiseBurst(0.45, 'lowpass', 700, 0.32); tone(140, 60, 0.3, 'sawtooth', 0.1); }
  }
  if (PRED_SIM) return;
  if ((G.flameSnd = (G.flameSnd || 0) - dt) <= 0) { G.flameSnd = 0.06 + Math.random() * 0.05; noiseBurst(0.07, 'bandpass', 1300 + Math.random() * 2600, 0.05 + Math.random() * 0.04); }
  const n = P.lite ? 1 : 4, c = Math.cos(dir), s = Math.sin(dir);
  for (let i = 0; i < n; i++) { const a = dir + (Math.random() - 0.5) * 0.7, sp = 190 + Math.random() * 90; part(ox, oy, Math.cos(a) * sp, Math.sin(a) * sp - 10, 0.4, [11, 12, 16, 17, 14][Math.floor(Math.random() * 5)], 1.4, -40, true); }
  if (!P.lite) {
    { const r = 40 + Math.random() * 70; part(ox + c * r, oy + s * r, -40 - Math.random() * 60, -30 - Math.random() * 50, 0.7 + Math.random() * 0.5, Math.random() < 0.5 ? 12 : 16, 0.8, -60, true); }   // embers on the wind
    if (Math.random() < 0.5) { const r = 60 + Math.random() * 50; part(ox + c * r, oy + s * r - 4, -30 - Math.random() * 30, -25 - Math.random() * 20, 1.0 + Math.random() * 0.6, 3, 2.6, -30, false); }   // dark smoke
    if (!(G.barrel && G.barrel.scene)) for (let r = 30; r <= 110; r += 20) { const x = ox + c * r, y = oy + s * r, w = ysAt(Math.max(3, x), G.S); if (y > w - 1) { if (Math.random() < 0.5) part(x, w - 1, (Math.random() - 0.5) * 50, -50 - Math.random() * 50, 0.6, 0, 1.6, -60, false); break; } }   // steam where it hits the water
  }
}
function drawFlame(x, y, dir, t0) {   // v064: tongues of fire in three layers (red, orange, a white-yellow core), drawn as light, with a warm glow around him
  const lite = P.lite, t = G.T, n = lite ? 3 : 7, ig = Math.min(1, Math.max(0.15, (G.T - (t0 || 0)) / 0.12));
  ctx.save(); ctx.translate(x, y); ctx.rotate(dir); ctx.globalCompositeOperation = 'lighter';
  if (!lite) { const g = ctx.createRadialGradient(30, 0, 2, 30, 0, 100); g.addColorStop(0, 'rgba(255,170,60,.3)'); g.addColorStop(1, 'rgba(255,80,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(30, 0, 100, 0, 7); ctx.fill(); }
  for (const [lk, col, al, wd] of [[1, '255,50,110', 0.42, 13], [0.78, '255,130,30', 0.55, 9], [0.48, '255,240,170', 0.85, 4.5]]) for (let i = 0; i < n; i++) {
    const ph = i * 1.7 + t * (11 + i), len = (85 + 22 * Math.sin(ph) + 14 * Math.sin(t * 23 + i * 3)) * lk * ig, w = wd * (0.75 + 0.3 * Math.sin(ph * 1.3)), bend = Math.sin(t * 9 + i) * w * 0.5;
    ctx.save(); ctx.rotate(Math.sin(t * 17 + i * 2.3) * 0.16 + (i - (n - 1) / 2) * 0.07);
    const g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, 'rgba(' + col + ',' + al + ')'); g.addColorStop(0.55, 'rgba(' + col + ',' + (al * 0.65) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -1.4); ctx.quadraticCurveTo(len * 0.45, -w + bend, len, bend * 0.4); ctx.quadraticCurveTo(len * 0.45, w + bend, 0, 1.4); ctx.closePath(); ctx.fill(); ctx.restore(); }
  ctx.restore();
}
function burnFlames(x, y, k) {   // little flames on a monster the flamethrower has caught
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) { const h = (5 + 3 * Math.sin(G.T * 20 + i * 2)) * k, dx = (i - 1) * 3 * k; ctx.fillStyle = i === 1 ? 'rgba(255,220,120,.85)' : 'rgba(255,110,40,.75)'; ctx.beginPath(); ctx.moveTo(x + dx - 2 * k, y); ctx.quadraticCurveTo(x + dx, y - h * 1.2, x + dx + 0.5 * k, y - h); ctx.quadraticCurveTo(x + dx + 1 * k, y - h * 0.4, x + dx + 2 * k, y); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function updCycle(dt) {
  updFlame(dt);
  const c = G.cyc; if (!c) return; c.t += dt;
  if (c.ph === 'boom' && c.t > P.boomT) { c.ph = 'climb'; c.t = 0; }
  else if (c.ph === 'climb' && c.t > (c.climbT || P.climbT)) {
    c.ph = 'dash'; c.t = 0; startLeap(); G.C.dashes++; SFX.dash(); burst(G.u, G.y, 14, 1, 50, -30);
    if (c.good) {   // the right timing always pays: the thrown ones go down with the dash, and hearts lie on the dive
      for (const m of G.mons) if (m.mode === 'come' && m.stun > 0 && m.u > G.u - 30 && m.u < G.u + 220) m.doom = true;
      let nd = 0; for (const m of G.mons) if (m.doom) nd++;
      const wl = simulate(() => flyToLanding([])) || (G.S + G.u + G.v * 0.5), w0 = wl + 18, nh = 8 + Math.min(16, nd); for (let i = 0; i < nh; i++) G.HL.push({ w: w0 + i * 13, h: -7, got: false, ph: i });   // v061: they start where the dive goes in, not before
      G.C.goodDives = (G.C.goodDives || 0) + 1; if (G.C.goodDives % 3 === 0) G.HL.push(G.C.goodDives % 6 === 0 ? { w: w0 + nh * 13 + 16, h: -9, got: false, ph: 0, crystal: true } : { w: w0 + nh * 13 + 16, h: -9, got: false, ph: 0, big: 10 });   // a reward for the A
    }
  } else if (c.ph === 'dash' && c.t > 0.3 && G.dashT <= 0 && G.diveT <= 0 && !G.air) G.cyc = null;
}
// a wall of monsters from the front — and at the same moment the wave throws the followers ahead
function wallTiming(e) {   // v054: the wall swims only so fast that it is on screen ≥ 1.1 s, and the window opens ~0.15 s after it shows
  const dVis = (G.camU + W) - G.u, base = P.wallXm * Math.min(0.45, 0.25 + 0.05 * Math.max(0, ST.n - 8));
  let close = G.v * (1 + base) + 22; const tm = Math.max(P.takeMax + 50, 14 + 0.38 * close);
  const cMax = Math.min(dVis / 1.1, (dVis - tm) / (0.15 + P.boomT + 0.25));
  if (close > cMax) close = Math.max(G.v * 0.6 + 22, cMax);
  const wx = (close - 22) / G.v - 1, ct = Math.max(0.25, Math.min(1.2, (dVis - 0.15 * close - Math.max(P.takeMax + 50, 14 + 0.38 * close)) / close - P.boomT));
  return { wx, ct, close, dOpen: dVis - 0.15 * close };
}
function spawnWall(e) {
  const tw = wallTiming(e), u0 = G.camU + W + 40 + Math.max(0, tw.dOpen - 25), mons = [], r = LV.rng, n = Math.max(1, Math.round(e.n * 1.6 * P.density * (ST.n >= 10 ? 1.25 : 1)));   // v062: bigger walls from stage 10   // v053: 1.6× — the stamp takes some now
  for (let i = 0, c = 0; i < n; c++) {   // v050: a towering heap — big black ones, 2 layers in front, up to 5 behind
    const layers = Math.min(5, 2 + c);
    for (let l = 0; l < layers && i < n; l++, i++) { const m = newMon('w', u0 + c * 15 + r() * 4); m.hp = m.max = m.hp * (e.army ? 5 : 3); m.off = l * 9 + (c % 2) * 2; mons.push(m); }   // v053: the tentacled ones, 3× tougher
  }
  for (let i = 0; i < (e.u || 0); i++) mons.push(newMon('u', u0 + 8 + i * 13));
  for (let i = 0; i < (e.f || 0); i++) mons.push(newMon('f', u0 + 14 + i * 16));
  mons.forEach(m => { m.wall = true; m.wx = tw.wx; G.mons.push(m); G.spawned++; firstSight(m.type); });
  // v052: the climb is set so the window opens when the wall's front comes into the screen on the right
  if (P.heraldOn) { const lead = Math.max(0, tw.dOpen - 25) * Math.max(0.2, Math.min(1, 1 - 0.065 * (ST.n - 10))), h = newMon('w', u0 - lead); h.wx = tw.wx; h.hp = h.max = 0.5; h.wall = true; h.herald = true; G.mons.push(h); G.spawned++; }   // v053: a single one swims just behind the A sign — the stamp's job   // v062: the herald swims ever closer in front of the wall as the stages climb
  G.wallEv = { climbT: tw.ct, wx: tw.wx, mons, t: 0, good: false, thrown: false, L: { k: 'wall', n: mons.length, t0: +G.T.toFixed(2), m0: Math.round((G.S + G.u) / 10), kills0: sumK(['dive', 'dash', 's', 'jump']), hits0: sumH(), tap: 'none' } };   // v050: the followers are thrown when the A window opens, not now
}
// the throw: timed so they come down together with his leap, where it lands
function throwFollowers() {
  const pl = G.plan || G.tapPlan;
  const landT = pl && !pl.late && pl.uLand !== undefined ? pl.t : 1.2, landU = pl && !pl.late && pl.uLand !== undefined ? pl.uLand : G.u + 80;
  G.volLandT = G.T + landT + 0.05; G.volLandU = landU + 25; G.volLandW = G.S + G.v * landT + landU;
  if (G.wallEv) { G.wallEv.L.throwT = +G.T.toFixed(2); G.wallEv.L.thrown = G.mons.filter(m => m.mode === 'swarm' || m.mode === 'hover').length; G.wallEv.L.throwBy = (G.plan && G.plan.ok) ? 'window' : G.cyc ? 'tap' : 'distance'; }
  launchVolley();
}
function launchVolley() {
  const sw = G.mons.filter(m => m.mode === 'swarm' || m.mode === 'hover');
  if (!sw.length) return;
  for (const m of sw) { if (m.mode === 'hover') m.off = 0; m.mode = 'suck'; m.t = 0; m.slot = null; m.thr = { u0: Math.round(m.u - G.u), sin: +sinTheta().toFixed(2) }; }
  G.thrown = sw;
  G.volC = G.u + 110; G.volN = sw.length; G.C.volleys++;
  const wLand = G.volLandW || (G.volC + G.S + G.v * 1.6);
  for (let i = 0; i < 10; i++) G.HL.push({ w: wLand - 30 + i * 12, h: -7, got: false, ph: i });
  G.volWarn = 0.7; SFX.swell();
}

// ---------- monsters ----------
const MON = { B: { w: 16, h: 22, swim: 0 }, c: { w: 22, h: 14, swim: 0 }, t: { w: 9, h: 5, swim: 22 }, m: { w: 23, h: 10, swim: 0 }, u: { w: 14, h: 4, swim: 30 }, l: { w: 8, h: 5, swim: 0 }, f: { w: 10, h: 6, swim: 15 }, w: { w: 15, h: 12, swim: 22 }, e: { w: 26, h: 6, swim: 34 } };   // v061: the eel swims a little faster than the water   // v053: w = the tentacled tower monster
function bossHp(type) { return type === 'B' ? BOSS_BASE[Math.max(0, ST.boss)] * ST.hpMul * (ST.kind === 'last' ? 1.6 : 1) : 150 * ST.hpMul; }
function newMon(type, u, mode) {
  const hp = type === 'm' ? 2.5 * G.dmg * ST.hpMul : (type === 'B' || type === 'c') ? bossHp(type) : Math.max(1, Math.round(HPB[type] * ST.hpMul));
  return { type, u, off: 0, vu: 0, voff: 0, mode: mode || 'come', hp, max: hp, open: 0, atkT: 3, nAtk: 0, tele: 0, over: false, ph: RND() * 6,
    flash: 0, t: 0, x: 0, y: 0, vx: 0, vy: 0, T: 0, landU: 0, glideT: 2 + RND() * 4, hitV: false, rot: 0, ramped: false, hitDone: false };
}
function spawn(type, extra) {
  G.mons.push(newMon(type, G.camU + W + 24 + (extra || 0))); G.spawned++;
  firstSight(type);
}
function firstSight(type) {   // the beach keeps the flags; v052: no background lines in the surf any more — the tortoise only gives tips
  const k = KIND_OF[type]; if (!k || G.seen[k]) return;
  G.seen[k] = true;
}
// v052: a tip after the same mistake twice, at most one every 30 s, and only when the water is quiet
const TIPS = { earlyD: 'Tip: tap D when you are ON the mussel — not before.', lateD: 'Tip: tap D while you ride over the mussel.', earlyA: 'Tip: wait for the A sign to reach you — then tap A.',
  lateA: 'Tip: tap A the moment you pass the A sign. The wall is right behind it.', fall: 'Tip: a good Wall Leap (A) throws them far ahead of you.', swarm: 'Tip: do not climb back into your followers.' };
function tipCount(k) { const n = G.tips[k] = (G.tips[k] || 0) + 1; if (n % 2 === 0 && G.T - G.tipT > 30 && !G.say.length) { G.say.push(TIPS[k]); G.tipT = G.T; } }
function quiet() { return !G.wallEv && !G.air && !G.cyc && !G.boss && !G.mons.some(m => m.mode === 'come' && m.u > G.u - 10 && m.u < G.u + W * 0.6); }
function sayLines(lines) { G.say.push(...(Array.isArray(lines) ? lines : [lines])); }
function mPos(m) {
  if (m.mode === 'spill' || m.mode === 'wash' || m.mode === 'glide') return [m.x, m.y];
  const s = ysAt(Math.max(3, m.u), G.S);
  if (m.type === 'u') return [m.u, s + 6 - m.off];
  if (m.type === 'f') return [m.u, s - 13 - m.off + Math.sin(m.ph) * 1.5];
  return [m.u, s - m.off];
}
function damage(m, dmg, how) {
  if (m.mode === 'dead' || m.mode === 'wash') return false;
  if ((m.type === 'B' || m.type === 'c') && m.open > 0) dmg *= 2;
  m.hp -= dmg; m.flash = 0.12;
  if (m.hp <= 0.001) { kill(m, how); return true; }
  return false;
}
function kill(m, how) {
  if (m.mode === 'dead') return;
  const [x, y] = mPos(m);
  if (m.thr && !m.thr.landed && !m.thr.died) m.thr.died = m.mode + ':' + how;   // v052: a thrown follower that dies on the way
  m.mode = 'dead'; m.t = 0;
  G.K[how] = (G.K[how] || 0) + 1; G.kills++;
  const ci = m.type === 'm' ? 4 : m.type === 'u' ? 8 : 3;
  const sz = Math.max(0.6, ((MON[m.type] || { w: 9 }).w) / 9);   // v053: clouds by the monster's size, a heart per kill
  burst(x, y - 3, Math.round(12 * sz), ci, 90 * Math.sqrt(sz), -70);
  burst(x, y - 3, Math.round(6 * sz), 7, 70 * Math.sqrt(sz), -50, true); burst(x, y - 3, Math.round(6 * sz), 13, 35, -25);
  if (how === 'flame') { burst(x, y - 3, 10, 3, 60, -50); burst(x, y - 6, 8, 19, 30, -40); }   // v064: charred black, a puff of smoke
  if (!PRED_SIM) { SFX.squelch(); if (m.type !== 'B' && m.type !== 'c' && m.type !== 'm' && (m.type !== 'l' || (G.liceK = (G.liceK || 0) + 1) % 5 === 0)) G.KH.push({ u: x, y: y - 6, vu: 60, vy: -130 }); }
  if (how === 'void') { burst(x, y - 3, 10, 14, 70, -30, true); burst(x, y - 3, 6, 15, 40, -20, true); G.bolts.push({ pts: boltPath(x - 6, y - 8, x + 6, y + 2), t: 0, life: 0.18, blue: true }); G.chainN++; G.chainT = 1.6; }
  // drops: rum from mussels, fish tails from the minnows (the cat's currency)
  if (m.type === 'm' && RND() < (ST.n >= 6 ? 0.15 : 0.08)) { G.gain.rum++; float(x, y - 10, '+1 🥃', '#ffd27a'); }
  if (m.type === 'u' && (how === 'cat' || RND() < 0.25)) { G.gain.tails++; float(x, y - 8, '+1 🐟', '#ffc9b0'); }
  if (m.type === 'e') { const tl = how === 'cat' ? 2 : RND() < 0.3 ? 1 : 0; if (tl) { G.gain.tails += tl; float(x, y - 8, '+' + tl + ' 🐟', '#ffc9b0'); } }   // v061: the eel
  if (m.type === 'B') {
    G.boss = null; G.bossDown = true; G.shake = 0.6; SFX.boom();
    const b = BOSS_BOUNTY[Math.max(0, m.rank || 0)]; G.gain.green += b; float(x, y - 30, '+' + b + ' 💚', '#7dff6b');
    burst(x, y - 10, 60, 4, 140, -90); burst(x, y - 10, 40, 7, 120, -60, true);
    if (G.final) { G.final.term = { t: 0, x, y: y - 20 }; G.slow = 1.4; G.endS = G.S + 600; }
    else G.endS = G.S + 1500;
  }
  if (m.type === 'c') {
    G.elite = null; G.eliteDown = true; G.shake = 0.5; SFX.boom();
    G.gain.green += CRAB_BOUNTY; float(x, y - 24, '+' + CRAB_BOUNTY + ' 💚', '#7dff6b');
    burst(x, y - 8, 50, 12, 130, -80); burst(x, y - 8, 30, 0, 110, -60, true);
    if (!G.boss) G.endS = G.S + 1500;
  }
  catVoice(m);
}
// v049: the cat comments YOUR timing — too early (questioning), too late (cross), a real combo (delighted); no more kill comments
const CAT_FB = { early: { k: 'mrrp', txt: 'mrrp?' }, late: { k: 'mau', txt: 'MAU!' }, combo: { k: 'yowl', txt: 'MIAAU!' } };
function catSays(what) {
  if (!CFG.cat || PRED_SIM || G.kat.mode === 'away' || G.T - (G.lastFb || -9) < 0.6) return;
  const v = CAT_FB[what]; G.lastFb = G.T; SFX.cat(v.k); G.mew = { s: v.txt, t: 0 };
  if (what !== 'combo') tipCount((what === 'early' ? 'early' : 'late') + (G.wallEv ? 'A' : 'D'));
}
function catVoice(m) {   // only the boss still gets a yowl when he goes down
  if (!CFG.cat || PRED_SIM || m.type !== 'B') return;
  const k = KIND_OF[m.type], v = CAT_VOICE[k]; if (!v) return;
  if (m.type === 'B' || !G.mewed[k] || G.T - G.lastMew > 5) {
    G.mewed[k] = 1; G.lastMew = G.T; SFX.cat(v.k);
    G.mew = { s: v.txt, t: 0 };
  }
}
function hurt(cause, n) {
  if (P.godMode || G.inv > 0 || G.over || G.won || (G.ifr > 0 && cause !== 'lip')) return;
  if (G.cyc && G.cyc.ph === 'dash' && cause !== 'gap') return;   // v054: the whole A leap is untouchable
  const mul = ST.n >= 8 ? 3 : ST.n >= 4 ? 1.5 : 1;   // v062: +50 % — stage 1–3 ×1, 4–7 ×1.5, from 8 ×3 (it was ×2: Jan rarely got hurt)
  G.dmgAcc = (G.dmgAcc || 0) + (n || 1) * mul; let d = Math.max(1, Math.floor(G.dmgAcc + 1e-6)); G.dmgAcc = Math.max(0, G.dmgAcc - d);
  G.boostM = 0; G.combo = 0;
  if (G.stam - d <= 0 && G.U.void && G.voidC >= 1) {   // VOID saves him: 30 % (+Second Wind) back
    G.voidC = 0; G.saved++; G.stam = Math.max(1, Math.ceil(P.stamina * G.up.voidHeal)); G.Hc[cause] = (G.Hc[cause] || 0) + 1;
    fireVoid(); float(G.u, G.y - 34, 'VOID! +' + G.stam, '#7dffb0'); return;
  }
  G.stam = Math.max(0, G.stam - d);
  if (cause === 'fall' || cause === 'swarm') tipCount(cause);
  logE({ k: 'hurt', cause, stam: G.stam, wall: !!G.wallEv, cyc: G.cyc ? G.cyc.ph : null });
  G.Hc[cause] = (G.Hc[cause] || 0) + 1; G.hurtT = 0.45; G.ifr = P.iframe;
  burst(G.u, G.y - 8, 12, 11, 80, -50); SFX.hurt(); if (!PRED_SIM) { tone(190, 55, 0.2, 'square', 0.3); tone(900, 300, 0.07, 'sawtooth', 0.12); }   // v052: a hard thud and a crack
  G.hurtFx = 0.5; G.barChip = { t: 0, f0: (G.stam + d) / P.stamina, f1: G.stam / P.stamina }; G.shake = Math.max(G.shake, 0.35);   // v053: no hit-stop, no braking
  float(G.u, G.y - 28, '-' + d, '#ff4040', 15);
  if (G.stam <= 0) { G.over = true; G.overT = 0; SFX.lose(); }
}

// v053: in the air the board's underside kills (and bounces him up), his body takes hits; Nosegrab: the raised board covers the front; Backflip: all of him is a weapon
function airContact(m, d, my) {
  const top = my - d.h, x0 = m.u - d.w / 2, x1 = m.u + d.w / 2, feet = G.y, tr = G.trick ? G.trick.tier : -1;
  const ov = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;
  const leap = G.cyc && G.cyc.ph === 'dash';   // v054: the A leap is the combo animation — all of him is a weapon, nothing hurts
  const wpn = (tr === 2 || leap) ? [G.u - 9, G.u + 9, feet - 24, feet + 3] : [G.u - 8, G.u + 8, feet - 2, feet + 3];
  const front = tr === 1 ? [G.u, G.u + 12, feet - 17, feet + 3] : null;
  if (ov(x0, x1, wpn[0], wpn[1]) && ov(top, my, wpn[2], wpn[3])) return 'board';
  if (front && ov(x0, x1, front[0], front[1]) && ov(top, my, front[2], front[3])) return 'board';
  if (tr === 2 || leap) return null;
  const body = tr === 1 ? [G.u - 5, G.u + 1, feet - 22, feet - 2] : [G.u - 5, G.u + 5, feet - 22, feet - 2];
  if (ov(x0, x1, body[0], body[1]) && ov(top, my, body[2], body[3])) return 'body';
  return null;
}
function boardKill(m, my) {
  kill(m, 'jump');
  G.bounces = (G.bounces || 0) + 1;
  if (!(G.cyc && G.cyc.ph === 'dash') && my - MON[m.type].h > G.y - 6) { const hop = 143 * P.bounce; G.vy = Math.min(G.vy > 0 ? -G.vy * 0.25 : G.vy, 0) - hop; G.airTop = Math.min(G.airTop, G.y); }   // a bounce off its head: the jump goes on
}
function bodyHit(m) {
  if (m.hitDone || (m.hitCd > G.T)) return;
  m.hitDone = true; m.hitCd = G.T + 1.5; if (m.type === 'e') { hurt('eel', 2); return; } hurt(m.type === 'f' ? 'f' : m.mode === 'swarm' ? 'swarm' : 't');
}
function collide() {
  const feet = G.y, under = underwater(), inv = G.inv > 0;
  for (const m of G.mons) {
    if (m.mode === 'swarm') {
      const d = MON[m.type];
      if (Math.abs(m.u - G.u) >= 5 + d.w / 2) continue;
      const my = mPos(m)[1], top = my - d.h;
      if (!(feet + 1 > top && feet - 22 < my)) {
        if (m.type === 'u' && under) kill(m, 'dive');
        continue;
      }
      if (G.air) { const c = airContact(m, d, my); if (c === 'board') boardKill(m, my); else if (c === 'body') bodyHit(m); continue; }
      if (under) continue;
      if (G.dashT > 0) { kill(m, 'dash'); continue; }
      if (!(G.cyc && G.cyc.ph === 'climb')) logE({ k: 'bug', what: 'swarmOverR', type: m.type, du: Math.round(m.u - G.u), off: Math.round(m.off) });   // v052: should not happen
      if (!inv && !(m.hitCd > G.T)) { hurt('swarm'); m.hitCd = G.T + 1.5; m.vu = -160; }
      continue;
    }
    if (m.mode !== 'come') continue;
    const d = MON[m.type];
    if (m.stun > 0 && (G.dashT > 0 || G.diveT > 0) && Math.abs(m.u - G.u) < 8 + d.w / 2) { kill(m, G.diveT > 0 ? 'dive' : 'dash'); continue; }
    const dx = m.u - G.u;
    if (Math.abs(dx) >= 6 + d.w / 2) {
      if (m.over && dx < 0) m.over = false;   // v053: flying over something does nothing — no free kills
      continue;
    }
    if (m.type === 'u') { if (under) kill(m, 'dive'); continue; }
    if (under) { if (m.type !== 'B' && m.type !== 'c') kill(m, 'dive'); continue; }   // v052: the dive takes whatever it touches
    const my = mPos(m)[1], top = my - d.h;
    const vOverlap = feet + 1 > top && feet - 22 < my;
    if (G.air) {
      if (m.ramped) continue;
      if (vOverlap) {
        if (m.type === 'm' && G.vy > 0 && feet < top + 6 + G.vy / 45) {   // v052: at high tempo he falls further per frame   // landing on a mussel: it dies; with D the next big jump
          if (G.chainP) { logChain(true, m); }
          for (const o of G.mons) if (o.type === 'u' && o.mode === 'come' && Math.abs(o.u - m.u) < 30) kill(o, 'dive');   // v053: the landing splash takes the minnow under it
          G.aimW = null; m.ramped = true;
          if (G.U.jump && armedFor(PRE_LAND)) { G.armT = -9; bigJump(m); }
          else { kill(m, 'jump'); G.vy = -120; G.jumpBusy = true; burst(G.u, G.y, 10, 13, 60, -60, true); if (G.U.jump) G.lateJ = { t: clock, chain: m.chain || 0 }; }
        } else if (m.type !== 'm') { const c = airContact(m, d, my); if (c === 'board') boardKill(m, my); else if (c === 'body') bodyHit(m); }
        else kill(m, 'jump');
      } else if (feet < top && m.type === 'm') m.over = true;
      continue;
    }
    if (m.type === 'm') { if (!m.rise && !m.ramped) rampHit(m); continue; }
    if (m.type === 't' || m.type === 'w' || m.type === 'l') {
      if (G.dashT > 0) kill(m, 'dash');
      else if (vOverlap && !m.hitDone) { m.hitDone = true; if (m.wall && G.wallEv && !G.wallEv.fb && !G.cyc) { G.wallEv.fb = true; catSays('late'); } if (!inv) hurt('t'); m.mode = 'swarm'; m.hitCd = G.T + 1.5; m.vu = -160; m.voff = 0; m.joinT = 0.45; /* v055: knocked back, not teleported */ }
      continue;
    }
    if (m.type === 'e') {   // v062: the eel bites (it slipped through before) — 2, and it swims on
      if (G.dashT > 0) { kill(m, 'dash'); continue; }
      if (vOverlap && !m.hitDone) { m.hitDone = true; if (!inv) hurt('eel', 2); }
      continue;
    }
    if (m.type === 'f') {
      if (G.dashT > 0) { kill(m, 'dash'); continue; }
      if (vOverlap) { if (!inv) hurt('f'); m.mode = 'hover'; m.off = 25 + RND() * 20; }
    }
  }
}

// swarm: separation on a grid, piles up behind Robinson, spills over the lip
const CELL = 8;
const grid = new Map();
function updMonsters(dt) {
  const tgt = G.u - 40;   // v046: the followers keep their distance — only climbing (the cycle) takes you back into them
  grid.clear();
  for (const m of G.mons) {
    if (m.mode !== 'swarm') continue;
    const [x, y] = mPos(m); m.x = x; m.y = y;
    const key = (Math.floor(x / CELL) + 500) * 2000 + (Math.floor(y / CELL) + 500);
    let a = grid.get(key); if (!a) grid.set(key, a = []); a.push(m);
  }
  const r = 6.5, r2 = r * r;
  let gliders = 0; for (const m of G.mons) if (m.mode === 'glide') gliders++;
  for (const m of G.mons) {
    m.ph += dt * 6;
    if (m.flash > 0) m.flash -= dt;
    switch (m.mode) {
      case 'come': {
        if (m.stun > 0) m.stun -= dt;
        m.u -= (m.stun > 0 ? G.v * 0.35 : G.v * (1 + (m.wall ? (m.wx !== undefined ? m.wx : wallX()) : 0)) + (m.still ? 0 : MON[m.type].swim)) * dt;   // v046: dazed ones ride along slowly; v049: a wall swims at him, faster than the water
        if (m.rise > 0) m.rise = Math.max(0, m.rise - dt);
        if (m.doom && (G.dashT > 0 || G.diveT > 0) && Math.abs(m.u - G.u) < 40) { kill(m, G.diveT > 0 ? 'dive' : 'dash'); break; }
        if (m.u < G.u - 18) {
          if (m.type === 'm') { if (!(G.ramp && G.ramp.m === m)) { m.mode = 'dead'; m.t = 1; } break; }   // a mussel he flew over just drifts away (not the one he is riding)
          if (m.type === 'f') { m.mode = 'hover'; m.off = 25 + RND() * 20; }
          else { m.mode = 'swarm'; m.vu = -G.v * 0.15; m.voff = 0; m.joinT = 0.45; }   // v055: keep its height — it glides into its place in the cloud (no jump)
        }
        break;
      }
      case 'swarm': {   // v052: everybody has a place in a wide cloud 30–100 behind him, at several heights
        if (!m.slot) { const h = (m.ph * 7.31) % 1, h2 = (m.ph * 3.17) % 1; m.slot = { du: -(30 + 70 * h), off: 2 + 26 * h2 }; }
        const sd = m.slot.du + 4 * Math.sin(G.T * 1.3 + m.ph), so = m.slot.off + 3 * Math.sin(G.T * 2.1 + m.ph * 2);
        let fu = (G.u + sd - m.u) * 3 - m.vu * 2.2, fo = (so - m.off) * 6 - m.voff * 2.5;
        if (m.joinT > 0) { m.joinT -= dt; const jk = 0.2 + 0.8 * (1 - Math.max(0, m.joinT) / 0.45); fu *= jk; fo *= jk; }
        const cx = Math.floor(m.x / CELL), cy = Math.floor(m.y / CELL);
        for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iy = cy - 1; iy <= cy + 1; iy++) {
          const a = grid.get((ix + 500) * 2000 + (iy + 500)); if (!a) continue;
          for (const o of a) {
            if (o === m) continue;
            const dx = m.x - o.x, dy = m.y - o.y, d2 = dx * dx + dy * dy;
            if (d2 < r2 && d2 > 0.0001) { const d = Math.sqrt(d2), k = (r - d) / r * 260; fu += dx / d * k; fo += -dy / d * k; }
          }
        }
        fu -= 20;
        if (m.u > G.u + 2) fu -= 300;
        m.vu += fu * dt; m.voff += fo * dt;
        m.vu = Math.max(-140, Math.min(140, m.vu)); m.voff = Math.max(-80, Math.min(120, m.voff));
        m.u += m.vu * dt; m.off += m.voff * dt;
        if (!(G.cyc && G.cyc.ph === 'climb') && m.u > G.u - 22) { m.u = G.u - 22; if (m.vu > 0) m.vu = 0; }   // they keep behind you unless you climb back into them
        if (m.off < 0) { m.off = 0; if (m.voff < 0) m.voff = 0; }
        const yAbs = ysAt(Math.max(3, m.u), G.S) - m.off;
        if (m.u < 6 || yAbs < Y_TOP + 2) startSpill(m);
        break;
      }
      case 'boss': bossAI(m, dt); break;
      case 'suck': {
        m.u -= 260 * dt; m.off = Math.min(14, m.off + 50 * dt);
        if (m.u < 6) startSpill(m);
        break;
      }
      case 'spill': {
        m.t += dt; m.rot += dt * 9;
        if (m.t < 0.3) { m.x += -35 * dt; m.y += -90 * dt; if (m.t + dt >= 0.3) aimSpill(m); }
        else { m.x += m.vx * dt; m.vy += 300 * dt; m.y += m.vy * dt; if (m.t >= 0.3 + m.T) landSpill(m); }
        break;
      }
      case 'hover': {
        const hu = G.u - 55 - (m.ph % 3) * 4;
        m.u += Math.max(-150, Math.min(150, (hu - m.u) * 2)) * dt;
        m.glideT -= dt;
        if (m.glideT <= 0) {
          if (gliders < 3) { gliders++; [m.x, m.y] = mPos(m); m.mode = 'glide'; m.vx = 60; m.vy = 10; m.t = 0; }
          else m.glideT = 0.4 + RND() * 0.6;
        }
        break;
      }
      case 'glide': {
        m.t += dt;
        const tx = G.u, ty = G.y - 8;
        const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
        const sp = 150, ax = dx / d * sp - m.vx, ay = dy / d * sp - m.vy;
        m.vx += ax * 2.2 * dt; m.vy += ay * 2.2 * dt;
        m.x += m.vx * dt; m.y += m.vy * dt;
        if (d < 8 && !m.hitV) {
          m.hitV = true;
          if (G.air) { kill(m, 'jump'); break; }
          if (G.dashT <= 0 && !underwater()) hurt('f');
        }
        if (m.x > G.u + 20 || m.t > 2.5) { m.mode = 'come'; m.u = m.x; m.off = 0; m.hitV = false; m.glideT = 2 + RND() * 4; }
        break;
      }
      case 'wash': { m.t += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vy += 40 * dt; m.rot += dt * 6; break; }
      case 'dead': m.t += dt; break;
    }
  }
  G.mons = G.mons.filter(m => !(m.mode === 'dead' && m.t > 0.3) && !(m.mode === 'wash' && (m.t > 1.6 || m.x < G.camU - 80)) && !(m.mode === 'come' && m.u < G.camU - 80));
}
// the First Mate (and the Repo Crab): keeps ahead of Robinson, throws pages, every third attack a telegraphed slam
function bossAI(b, dt) {
  const crab = b.type === 'c', half = b.hp < 0.5 * b.max, rage = G.final && G.final.rage;
  const tgtU = G.u + (crab ? 80 : 95) + 25 * Math.sin(G.T * 0.6);
  b.u += Math.max(-70, Math.min(70, (tgtU - b.u) * 1.2)) * dt;
  if (b.open > 0) b.open -= dt;
  if (b.tele > 0) {
    b.tele -= dt;
    if (b.tele <= 0) {
      G.shocks.push({ x: b.u - 6, sp: (half ? 190 : 160) * (rage ? 1.15 : 1), hit: false, dmg: crab ? 2 : 3, own: b });
      burst(b.u, ysAt(b.u, G.S), 20, 17, 90, -60); SFX.boom();
    }
  } else {
    if (G.wallEv) return;   // v053: while a tower runs he waits
    b.atkT -= dt;
    if (b.atkT <= 0) {
      b.nAtk++;
      if (b.nAtk % 3 === 0 || crab && b.nAtk % 2 === 0) { b.tele = crab ? 0.75 : 0.7; SFX.growl(); }
      else if (!crab) {
        const by = ysAt(b.u, G.S) - 16, tx = G.u + G.q * 0.6, ty = G.y - 8, T = 0.9;
        G.pages.push({ x: b.u, y: by, vx: (tx - b.u) / T, vy: (ty - by - 0.5 * 300 * T * T) / T, t: 0, ang: 0 }); SFX.whoosh();
      }
      b.atkT = (half ? 1.1 : 1.6) * (rage ? 0.7 : 1);   // v055: he attacks more often
    }
  }
}
function updBossShots(dt) {
  for (const p of G.pages) {
    p.t += dt; p.ang += dt * 10; p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (Math.abs(p.x - G.u) < 6 && Math.abs(p.y - (G.y - 8)) < 9 && !underwater()) { p.dead = true; hurt('boss', 1); }
    if (p.y > ysAt(Math.max(3, p.x), G.S) + 2 || p.t > 3) p.dead = true;
  }
  G.pages = G.pages.filter(p => !p.dead);
  for (const s of G.shocks) {
    s.x -= s.sp * dt;
    if (!s.hit && Math.abs(s.x - G.u) < 9 && !G.air && !underwater()) { s.hit = true; hurt('boss', s.dmg || 3); }   // v055: a wider shockwave
    if (s.x < G.u - 12 && !s.done) { s.done = true; if (!s.hit && s.own && s.own.mode === 'boss') s.own.open = 1.2; }
    if (s.x < G.camU - 20) s.dead = true;
  }
  G.shocks = G.shocks.filter(s => !s.dead);
  for (const b of [G.boss, G.elite]) {
    if (!b || b.mode !== 'boss' || Math.abs(b.u - G.u) >= 14) continue;
    const by = ysAt(b.u, G.S);
    if (G.y > by - 26) {
      if (G.dashT > 0 || G.air || underwater()) { if (!b.hitCd || b.hitCd < G.T) { const lp = G.cyc && G.cyc.ph === 'dash' && !(G.cyc.bossHit > 0); if (lp) G.cyc.bossHit = 1; damage(b, (lp ? 10 : 3) * G.dmg * (1 + G.dashPow), G.air ? 'jump' : 'dash'); b.hitCd = G.T + 0.6; if (lp) { float(b.u, by - 40, 'BOSS SLAM!', '#ffe08a'); SFX.boom(); } b.u += 40; burst(b.u, by - 10, 16, 17, 100, -60, true); } }
      else { hurt('boss', b.type === 'c' ? 2 : 3); b.u += 25; }
    }
  }
}
// his last stand: rage at half health, loyal clerks, and the Severance wave that sweeps the whole face
function lastStand(dt) {
  const f = G.final; if (!f) return;
  if (f.term) { f.term.t += dt; return; }
  const b = G.boss; if (!b || b.mode !== 'boss') return;
  if (!f.rage && b.hp <= b.max * 0.5) { f.rage = true; G.shake = 0.5; SFX.growl(); float(b.u, ysAt(b.u, G.S) - 34, 'I have TENURE!', '#ff6a5a'); }
  while (f.adds.length && b.hp <= b.max * f.adds[0]) { f.adds.shift(); for (let i = 0; i < 3; i++) spawn('f', i * 30); float(b.u, ysAt(b.u, G.S) - 40, 'his last loyal clerks!', '#ffcf5a'); }
  if (f.warn > 0) {
    f.warn -= dt;
    if (f.warn <= 0) { G.sev = { x: G.camU + W + 30, hit: false }; G.shake = 0.6; SFX.boom(); SFX.splat(); f.sev = 8 * (f.rage ? 0.75 : 1); }
  } else if (!G.sev) {
    f.sev -= dt;
    if (f.sev <= 0) { f.warn = 2; SFX.growl(); float(b.u, ysAt(b.u, G.S) - 30, 'SEVERANCE PACKAGE!', '#ff9a8a'); }
  }
  if (G.sev) {
    const s = G.sev; s.x -= 420 * dt;
    if (!s.hit && Math.abs(s.x - G.u) < 8) { s.hit = true; if (!G.air && !underwater()) hurt('boss', 3); else float(G.u, G.y - 26, 'dodged!', '#c8ffb0'); }
    if (s.x < G.camU - 40) G.sev = null;
  }
}
function stunTime() { return 3; }
   // v045: 5 s on stage 2 → 2 s from stage 8
function startSpill(m) { m.mode = 'spill'; m.t = 0; m.x = Math.max(m.u, 2); m.y = ysAt(Math.max(3, m.u), G.S) - m.off; m.rot = 0; G.C.spills++; }
function aimSpill(m) {
  const timed = G.volLandT && G.volLandT > G.T;   // v050: land with his leap, at its landing point
  const aim = timed ? G.volLandU + 10 + RND() * 45 : G.u + P.spillAhead + (RND() - 0.5) * 50;   // v052: always ahead of where he comes down
  m.landU = aim; m.T = timed ? Math.max(0.35, G.volLandT - G.T + (RND() - 0.5) * 0.15) : 1.0 + RND() * 0.3;
  const yl = ysAt(Math.max(3, aim), G.S) - (m.type === 'u' ? -4 : 0);
  m.vx = (aim - m.x) / m.T;
  m.vy = (yl - m.y - 0.5 * 300 * m.T * m.T) / m.T;
}
function landSpill(m) {
  const surf = ysAt(Math.max(3, m.landU), G.S);
  for (let i = 0; i < (P.lite ? 3 : 8); i++) part(m.landU + (Math.random() - 0.5) * 8, surf, (Math.random() - 0.5) * 60, -40 - Math.random() * 80, 0.5, 0, 1, P.g * 0.6);
  if (m.thr) { m.thr.du = Math.round(m.landU - G.u); m.thr.dt = +(G.T - (G.volLandT || G.T)).toFixed(2); m.thr.landed = true; }
  if (Math.abs(G.u - m.landU) < 9 && Math.abs(G.y - surf) < 12 && !underwater()) { if (G.cyc && G.cyc.good) logE({ k: 'bug', what: 'landOnR', du: Math.round(m.landU - G.u), dt: m.thr ? m.thr.dt : null }); hurt('fall'); }
  m.u = m.landU; m.off = 0; m.ramped = false; m.hitDone = false; m.mode = 'come'; m.stun = stunTime();
  if (G.cyc && G.cyc.good) { m.doom = true; if (m.thr) m.thr.landed = true; kill(m, 'dive'); return; }   // v052: on a good cycle they fall straight into his dive
  if (ST.n <= 9 && G.U.cycle && !PRED_SIM) G.bt = Math.max(G.bt, 1.0);   // time slows a moment when they land (first wall stages)
  if (m.landU <= G.u + 10) m.mode = 'swarm';
  m.vu = 0; m.voff = 0;
}

// ---------- v042: the cat — warning system on his head, and a fisher of rot minnows ----------
// Fishing Dive: once a fight she leaps after a minnow (a sure fish tail), then clings to the back of the board — no magic way back.
// Her Own Board: she surfs in his wake and dives again and again; Deeper Dives: more often, further, deeper.
function catHead() { return [G.u - 3, G.y - 21]; }
function catPrey(fromU, lo, hi) {
  let best = null, bd = 1e9;
  for (const m of G.mons) {
    if (!(m.type === 'u' || (m.type === 'e' && G.catEel)) || !(m.mode === 'come' || (m.mode === 'swarm' && m.off < 3))) continue;   // v061: Eel Catcher
    const d = m.u - fromU; if (d < lo || d > hi) continue;
    if (Math.abs(d) < bd) { bd = Math.abs(d); best = m; }
  }
  return best;
}
// v064: the rain falls on the stretch where he rides — out of it by the A climb and leap, not by an invisible shield.
// The column is fixed on the water (in wave units) once the cloud flashes A!, round the spot where he rides when he does nothing: a little behind it, a good way ahead.
// Five pulses: a good tap (from ~1 s before A! to ~0.6 s after) has him climbing out, in the leap or in the dive for all of them; a much too early one has him back in the rain for the last.
const CLOUD = { warn: 0.75, rain: 2.45, pulses: [0.3, 0.8, 1.3, 1.8, 2.3], back: 14, fwd: 40 };
function inRain(c) { return G.u > c.cu - CLOUD.back && G.u < c.cu + CLOUD.fwd; }
function updClouds(dt) {
  for (const c of G.clouds) {
    c.t += dt; const rx = sx(G.u);
    if (c.ph === 'in') { c.y += ((G.y || 120) - 74 - c.y) * Math.min(1, dt * 1.5); c.x -= 70 * dt;
      if (Math.abs(c.x - rx) < 12 && !G.barrel) { c.ph = 'warn'; c.t = 0; c.cu = (G.restU || G.u) + 6; c.pi = 0;
        if ((ST.n === 20 || ST.n === 21) && ST.kind === 'wave' && !G.cloudTeach) { G.cloudTeach = true; c.teach = true; } } }   // the first cloud of stage 20 and 21: a big TAP A (v066: no slow motion — the flow stays)
    else if (c.ph === 'warn' || c.ph === 'rain') {
      c.x += (sx(c.cu + (CLOUD.fwd - CLOUD.back) / 2) - c.x) * Math.min(1, dt * 6); c.y += (ysAt(Math.max(3, c.cu), G.S) - 74 - c.y) * Math.min(1, dt * 3);
      if (c.ph === 'warn' && c.t > CLOUD.warn) { c.ph = 'rain'; c.t = 0; }
      else if (c.ph === 'rain') {
        if (c.pi < CLOUD.pulses.length && c.t >= CLOUD.pulses[c.pi]) { c.pi++;
          const wet = inRain(c), safe = G.cyc && G.cyc.ph === 'dash';
          if (wet && !safe) { c.hits = (c.hits || 0) + 1; hurt('cloud', 0.4); burst(G.u, G.y - 10, 10, 7, 60, -30); float(G.u, G.y - 40, 'POISON', '#9dff5a', 11); }   // v064: 5 pulses × (0.4 × the stage factor) = the old full dose
          else if (wet) { for (let k = 0; k < 6; k++) part(G.u + (Math.random() - 0.5) * 16, G.y - 18 - Math.random() * 6, (Math.random() - 0.5) * 60, -30 - Math.random() * 30, 0.35, 15, 0.8, 200); }   // it splashes off his shield
          if (c.pi === CLOUD.pulses.length && !c.hits) { float(G.u, G.y - 24, 'dry!', '#c8ffb0', 11); G.C.cloudDodge = (G.C.cloudDodge || 0) + 1; } }
        if (c.t > CLOUD.rain) { c.ph = 'out'; c.t = 0; }
      }
    }
    else { c.x -= 90 * dt; c.y -= 18 * dt; }
  }
  G.clouds = G.clouds.filter(c => c.x > -80 && c.y > G.camY - VOFF() - 60);
}
function drawClouds() {   // v062: a bigger, darker cloud, a thick curtain of poison and green splashes where it lands; v064: the curtain covers the fixed column
  for (const c of G.clouds) {
    const x = c.x, y = c.y, dark = c.ph === 'warn' ? 0.6 + 0.4 * Math.sin(G.T * 20) : 1, K = 1.5;
    if (c.ph === 'rain' || c.ph === 'warn') { const xa = sx(c.cu - CLOUD.back), xb = sx(c.cu + CLOUD.fwd), wd = xb - xa, gy = ysAt(Math.max(3, c.cu + 13), G.S) + 2, len = Math.max(30, gy - y), N = c.ph === 'rain' ? 60 : 10;
      ctx.strokeStyle = c.ph === 'rain' ? 'rgba(130,255,70,.85)' : 'rgba(130,255,70,.35)'; ctx.lineWidth = 1.6;
      for (let i = 0; i < N; i++) { const rx = xa + ((i * 7.3 + c.t * 90) % wd), ry = y + 8 + ((i * 13 + c.t * 300) % len); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 2, ry + 8); ctx.stroke(); }
      if (c.ph === 'warn') { ctx.fillStyle = 'rgba(120,255,60,.16)'; ctx.fillRect(xa, gy - 3, wd, 4); }   // where it will land
      if (c.ph === 'rain') { ctx.fillStyle = 'rgba(120,255,60,' + (0.35 + 0.2 * Math.sin(G.T * 12)) + ')'; ctx.beginPath(); ctx.ellipse((xa + xb) / 2, gy, wd / 2 + 2, 4, 0, 0, 7); ctx.fill();
        for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI + c.t * 3, r = 6 + ((c.t * 40 + i * 9) % 16); ctx.fillStyle = 'rgba(160,255,90,.8)'; ctx.fillRect(xa + ((i * 11.7) % wd) + Math.cos(a) * r * 0.6, gy - Math.abs(Math.sin(a)) * r * .6, 1.6, 1.6); } } }
    ctx.fillStyle = 'rgba(12,16,10,' + (0.9 * dark) + ')'; [[0, 0, 12], [-11, 3, 9], [11, 3, 10], [-4, -6, 9], [6, -5, 8], [-18, 5, 7], [18, 5, 7], [26, 4, 7]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * K, y + dy * K, r * K, 0, 7); ctx.fill(); });
    ctx.fillStyle = 'rgba(110,255,80,.85)'; ctx.fillRect(x - 9, y - 1, 2.4, 2.4); ctx.fillRect(x + 5, y - 1, 2.4, 2.4);
    if (c.ph === 'warn') {
      if (c.teach) { const k = 1 + 0.18 * Math.sin(G.T * 14); ctx.save(); ctx.translate(x, y - 34); ctx.scale(k, k); ctx.font = '700 16px ' + FONT; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#0d2a10'; ctx.strokeText('TAP A', 0, 0); ctx.fillStyle = '#d4ff9a'; ctx.fillText('TAP A', 0, 0);
        ctx.font = '600 6.5px ' + FONT; ctx.lineWidth = 2; ctx.strokeText('climb back — leap out of the rain', 0, 10); ctx.fillStyle = '#ffffff'; ctx.fillText('climb back — leap out of the rain', 0, 10); ctx.restore(); }
      else { ctx.fillStyle = '#fff'; ctx.font = '700 9px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('A!', x, y - 22); } }
  }
}
// ---------- v064: the BARREL — the wave stands up, throws its lip over him, and he rides inside the tube ----------
// herald: the curl swells and falls back twice, the third time it goes over (K = the curl's size) · window: PULL IN — HOLD A ≥ 0.25 s
// inside: a full-screen spinning drum; monsters, mussels and hearts spiral out of the eye; A = boomerang, climb, dash, dive (short), D = jump / big jump off a mussel
// exit: the drum opens top right; once the sky shows, HOLD A — he climbs the wall to the wake top left; let go there = SPIT! (a giant leap), too early = the wave backs off, too late = into the wake
const BRL = { herald: [[0, 1], [0.8, 1.75], [1.4, 1.15], [2.2, 2.05], [2.7, 1.3], [3.3, 3.0]], winA: 3.25, winB: 4.05, hold: 0.25, inT: 10, clearT: 1.4, skyT: 1.8, climbW: 1.55, wakeA: Math.PI * 1.25, early: 0.25, late: 0.12, spin: 2.4, ringW: 0.85, view: 'side', enterT: 1.0, outT: 0.6 };
const LAB = { on: !!window.BARREL_LAB, speed: 1, pause: false, mons: true, mode: 'spit', from: 'roll', loop: true, t: 0, did: {} };   // v067: the barrel workbench (builds/barrel_lab.html)
function brlK(t) { const h = BRL.herald; for (let i = 1; i < h.length; i++) if (t < h[i][0]) { const [t0, k0] = h[i - 1], [t1, k1] = h[i], k = (t - t0) / (t1 - t0); return k0 + (k1 - k0) * (0.5 - 0.5 * Math.cos(Math.PI * k)); } return h[h.length - 1][1]; }
function brlLipK() { const B = G.barrel; return B && !B.scene ? B.K : 1; }
function startBarrel() {
  if (G.barrel || G.boss || G.elite || ST.kind !== 'wave') return;
  G.barrel = { ph: 'herald', t: 0, K: 1, rum: 0 }; G.C.barrels = (G.C.barrels || 0) + 1;
  logE({ k: 'barrel', what: 'herald' });
}
function barrelTap(k) {
  const B = G.barrel;
  if (B.scene) { drumTap(k); return true; }
  if (B.ph === 'enter') return true;
  if (B.ph === 'herald' && k === 'a' && B.t >= BRL.winA && B.t < BRL.winB && !G.cyc && !G.air && G.dashT <= 0 && G.diveT <= 0 && B.hold === undefined) { B.hold = 0; return true; }
  return false;
}
function updBarrel(dt) {
  const B = G.barrel; if (!B || B.scene) return; B.t += dt;
  if (B.ph === 'herald') {
    B.K = brlK(B.t);
    if ((B.rum -= dt) <= 0) { B.rum = 0.9; noiseBurst(0.8, 'lowpass', 140 + 40 * B.K, 0.18 + 0.08 * B.K); }
    if (B.K > 1.6 && !P.lite && Math.random() < dt * 30) part(G.u - 60 + Math.random() * 40, Y_TOP + 4 - 10 * B.K, 40 + Math.random() * 90, -40 - Math.random() * 50, 0.6, 0, 1, 120);
    if (B.hold !== undefined) {
      if (IN.a) { B.hold += dt; if (B.hold >= BRL.hold) { B.ph = 'enter'; B.t = 0; G.cyc = null; SFX.whoosh(); noiseBurst(0.7, 'bandpass', 900, 0.3); float(G.u, G.y - 36, 'PULL IN!', '#bff8ff', 13); logE({ k: 'barrel', what: 'in' }); } }
      else { B.hold = undefined; B.tapped = true; tapA(); }   // let go too soon: an ordinary A tap
    }
    if (B.ph === 'herald' && B.t >= BRL.winB) barrelClamp();
  }
  else if (B.ph === 'enter') {   // v067: he is carried along as the curl rolls up round him
    B.K = Math.max(1, B.K - dt * 3); const D = drum(), k = Math.min(1, B.t / BRL.enterT), e = k * k * (3 - 2 * k); if (!B.e0) B.e0 = [sx(G.u), G.y];
    const [tx, ty] = dpos(D, Math.PI / 2, D.R); G.riderOv = { x: B.e0[0] + (sx(tx) - B.e0[0]) * e, y: B.e0[1] + (ty - B.e0[1]) * e, ang: 0, pose: 'brake', shield: false };
    if (B.t >= BRL.enterT) enterDrum(); }
  else if (B.ph === 'crash') { B.K = Math.max(1, B.K - dt * 5); if (B.t > 0.8) G.barrel = null; }
  else if (B.ph === 'out') { B.K = Math.max(1, B.K - dt * 2); if (B.t > BRL.outT) G.barrel = null; }
}
function barrelClamp() {   // the lip lands on him — no leap saves him from that
  const B = G.barrel; B.ph = 'crash'; B.t = 0;
  const c = G.cyc; G.cyc = null; G.ifr = 0; hurt('lip', 2); G.cyc = c;
  burst(G.u, G.y - 20, 40, 0, 140, -60); burst(G.u, G.y - 10, 20, 1, 90, -30); G.shake = Math.max(G.shake, 0.5); G.stumble = Math.max(G.stumble, 0.5);
  noiseBurst(0.7, 'lowpass', 500, 0.5); float(G.u, G.y - 44, 'CLAMPED!', '#ffffff', 13); logE({ k: 'barrel', what: 'clamp', tapped: !!B.tapped });
}
// the drum lives in world units, centred on the frozen camera: what goes on there uses the normal particles, floats and hurt()
function dpos(D, th, r) { return [D.cx + Math.cos(th) * r, D.cy + Math.sin(th) * r]; }
function enterDrum() {
  const B = G.barrel;
  Object.assign(B, { scene: true, ph: 'in', t: 0, flash: 0, saveU: G.u, th: Math.PI / 2, h: 0, act: null, mons: [], hearts: [], shots: [], fly: [], spawnT: 0.6, musT: 1.8, heartT: 0.3, stampT: 0.3, open: 0, climb: null, missed: false });
  G.cyc = null; G.air = false; G.dashT = G.diveT = 0; G.ramp = null; G.lift = 0; G.flameOn = false; G.boom = null; G.shots = [];
  SFX.swell && SFX.swell();
}
function drumTap(k) {
  const B = G.barrel; if (B.climb || B.ph === 'done') return;
  if (B.ph === 'sky' && k === 'a' && !B.act) { B.climb = { t: 0 }; return; }
  if (B.act) return;
  if (k === 'a') {
    if (!G.U.cycle) return;
    if (B.ph === 'clear') B.missed = true;   // too early for the sky: an ordinary leap, and the exit goes by
    B.act = { k: 'boom', t: 0 }; B.boom = { t: 0, a: B.th, hit: new Set() }; SFX.whoosh(); G.C.cycles++;
  } else {
    if (!G.U.jump) return;
    const mu = B.mons.find(m => m.type === 'm' && m.dr.ring && m.mode !== 'dead' && B.th - m.dr.th > -0.06 && B.th - m.dr.th < 0.4);
    if (mu) { const n0 = G.KH.length; kill(mu, 'jump'); drumHearts(n0); B.act = { k: 'jump', t: 0, dur: 0.9, H: drum().R * 0.62, big: true }; combo(); G.C.bigJumps++; float(G.u, G.y - 30, 'BIG JUMP!', '#ffe36a', 12); tone(660, 990, 0.08, 'triangle', 0.12); }
    else { B.act = { k: 'jump', t: 0, dur: 0.55, H: 40 }; G.C.jumps++; }
  }
}
function drumHearts(n0) {   // the hearts a kill drops fly to him in the drum
  for (const h of G.KH.splice(n0)) G.barrel.fly.push({ x: h.u, y: h.y, t: 0 });
}
function drumMon(type, thA, T) {
  const m = newMon(type, 0, 'glide'); m.dr = { th0: thA - BRL.spin * T, th: thA - BRL.spin * T, t: 0, T, r: 0, ring: false, w: type === 'f' ? 1.15 : BRL.ringW }; m.vx = 1; m.vy = 0; return m;
}
function drumArrive(o, D, dt) {   // out of the eye along the spiral, then round the wall
  const d = o.dr; d.t += dt;
  if (!d.ring) { const k = Math.max(0, Math.min(1, d.t / d.T)); d.r = D.rs + (D.R - D.rs) * Math.pow(k, 1.7); d.th = d.th0 + BRL.spin * d.t; if (k >= 1) d.ring = true; }
  else { d.r = D.R; d.th += d.w * dt; }
  const [x, y] = dpos(D, d.th, d.r); o.x = x; o.y = y;
}
function updDrum(dt) {
  const B = G.barrel, D = drum(), mk = () => (B.ph === 'in' && B.t < BRL.inT - 2.2 && !(LAB.on && !LAB.mons));
  G.farX += 8 * dt; G.midX += 30 * dt;   // v067: the world behind the eye drifts on
  B.t += dt; if (B.flash > 0) B.flash -= dt;
  if (B.ph === 'in' && B.t >= BRL.inT) { B.ph = 'clear'; B.t = 0; }
  else if (B.ph === 'clear') { B.open = Math.min(1, B.t / BRL.clearT); if (B.t >= BRL.clearT) { B.ph = 'sky'; B.t = 0; B.open = 1; } }
  if ((B.ph === 'clear' || B.ph === 'sky') && B.missed && !B.act) return exitDrum('fat');
  if (B.ph === 'sky' && !B.climb && !B.act && B.t > BRL.skyT) return exitDrum('fat');
  // what comes out of the eye
  if (mk()) {
    if ((B.spawnT -= dt) <= 0) { B.spawnT = Math.max(0.34, 0.55 - 0.01 * (ST.n - 25)); const r = RND(), tp = r < 0.55 ? 't' : r < 0.72 ? 'l' : r < 0.88 ? 'w' : 'f';
      B.mons.push(drumMon(tp, -0.5 + RND() * 1.9, 1.5 + RND() * 0.5)); G.spawned++; }
    if ((B.musT -= dt) <= 0) { B.musT = 2.1; B.mons.push(drumMon('m', 0.1 + RND() * 0.35, 1.7)); }
    if ((B.heartT -= dt) <= 0) { B.heartT = 0.65; const a = -0.3 + RND() * 1.6; for (let i = 0; i < 3; i++) B.hearts.push({ dr: { th0: a - BRL.spin * 1.6 - i * 0.12, th: 0, t: -i * 0.08, T: 1.6, r: 0, ring: false, w: BRL.ringW }, x: 0, y: 0, hi: RND() < 0.4 }); }
  }
  // his moves
  const A = B.act, ease = k => k * k * (3 - 2 * k);
  if (A) { A.t += dt;
    if (A.k === 'boom' && A.t >= 0.12) { A.k = 'climb'; A.t = 0; A.th0 = B.th; }
    else if (A.k === 'climb') { B.th = A.th0 + 0.55 * ease(Math.min(1, A.t / 0.22)); if (A.t >= 0.22) { A.k = 'dash'; A.t = 0; A.th0 = B.th; SFX.dash(); burst(G.u, G.y, 14, 1, 50, -30); G.C.dashes++; } }
    else if (A.k === 'dash') { const k = Math.min(1, A.t / 0.45); B.th = A.th0 + (Math.PI / 2 - 0.7 - A.th0) * k; B.h = D.R * 0.55 * Math.sin(Math.PI * k);
      if (k >= 1) { A.k = 'dive'; A.t = 0; A.th0 = B.th; B.h = 0; G.C.dives++; const [x, y] = dpos(D, B.th, D.R), rr = 26 * G.up.dive;
        ring(x, y, 2, rr, 0.4, '#e9fbff', false, 1); ring(x, y, 1, rr * 1.3, 0.5, '#7dffb0', true, 0.5); burst(x, y, 20, 0, 100, -60); SFX.splat();
        for (const m of B.mons) if (m.mode !== 'dead' && Math.hypot(m.x - x, m.y - y) < rr) { const n0 = G.KH.length; damage(m, 3 * G.dmg, 'dive'); drumHearts(n0); } } }
    else if (A.k === 'dive') { const k = Math.min(1, A.t / 0.3); B.th = A.th0 + (Math.PI / 2 - A.th0) * ease(k); if (k >= 1) B.act = null; }
    else if (A.k === 'jump') { const k = Math.min(1, A.t / A.dur); B.h = A.H * Math.sin(Math.PI * k); if (k >= 1) { B.act = null; B.h = 0; } }
  }
  if (B.climb) {   // the way out: up the wall while A is held
    B.climb.t += dt;
    if (IN.a) { B.th += BRL.climbW * (0.85 + 0.3 * Math.min(1, B.climb.t)) * dt; if (B.th > BRL.wakeA + BRL.late) { const c = G.cyc; G.cyc = null; G.ifr = 0; hurt('lip', 1.5); G.cyc = c; return exitDrum('wake'); } }
    else return exitDrum(B.th < BRL.wakeA - BRL.early ? 'fat' : 'spit');
  }
  const [px, py] = dpos(D, B.th, D.R - B.h); G.u = px; G.y = py;
  const safe = A && (A.k === 'dash' || A.k === 'dive'), air = A && A.k === 'jump' && B.h > 6;
  // the boomerang: once round the drum against the stream
  if (B.boom) { const b = B.boom; b.t += dt; const a = b.a - (Math.PI * 2) * Math.min(1, b.t / 0.7), [bx, by] = dpos(D, a, D.R * 0.9);
    G.boom = { x: bx, y: by, ang: b.t * 18 };
    for (const m of B.mons) if (m.mode !== 'dead' && !b.hit.has(m) && Math.hypot(m.x - bx, m.y - by) < 14) { b.hit.add(m); const n0 = G.KH.length; damage(m, 2 * G.dmg * G.up.boom, 'dash'); drumHearts(n0); }
    if (b.t >= 0.7) { B.boom = null; G.boom = null; } }
  // the flamethrower: held A through the boomerang, the climb and the dash
  const fo = G.flameOn; G.flameOn = !!(G.U.flame && IN.a && A && (A.k === 'boom' || A.k === 'climb' || A.k === 'dash'));
  if (G.flameOn) { const ox = px + Math.cos(B.th - Math.PI / 2) * 6, oy = py + Math.sin(B.th - Math.PI / 2) * 6 - 4; let t = null, bd = 140;
    for (const m of B.mons) if (m.mode !== 'dead' && m.dr.r > D.R * 0.4) { const d = Math.hypot(m.x - ox, m.y - oy); if (d < bd) { bd = d; t = m; } }
    const want = t ? Math.atan2(t.y - oy, t.x - ox) : B.th - Math.PI; G.flameDir = fo && G.flameDir !== undefined ? G.flameDir + Math.atan2(Math.sin(want - G.flameDir), Math.cos(want - G.flameDir)) * Math.min(1, dt * 10) : want;
    G.flameX = ox; G.flameY = oy; flameWork(ox, oy, G.flameDir, B.mons, dt, !fo); }
  // monsters, mussels, hearts
  for (const m of B.mons) {
    if (m.mode === 'dead') { m.t += dt; continue; }
    if (m.flash > 0) m.flash -= dt; m.ph += dt * 8; drumArrive(m, D, dt);
    if (m.dr.ring && m.dr.th > Math.PI + 1.3) { m.mode = 'dead'; m.t = 9; continue; }
    const near = m.dr.r > D.R - 20, dd = Math.hypot(m.x - px, m.y - py), reach = 7 + MON[m.type].w * 0.35;
    if (dd > reach) continue;
    if (safe) { const n0 = G.KH.length; kill(m, 'dash'); drumHearts(n0); continue; }
    if (air) { const n0 = G.KH.length; kill(m, 'jump'); drumHearts(n0); continue; }
    if (!near || m.hitDone) continue;
    m.hitDone = true;
    if (m.type === 'm') { const n0 = G.KH.length; kill(m, 'jump'); drumHearts(n0); hurt('m', 1); catSays('late'); }   // ran into the mussel without D
    else hurt(m.type === 'f' ? 'f' : 't');
  }
  B.mons = B.mons.filter(m => m.mode !== 'dead' || m.t < 0.2);
  for (const h of B.hearts) {
    drumArrive(h, D, dt); if (h.got) continue;
    const hy = h.hi ? -D.R * 0.12 : 0, [hx, hy2] = dpos(D, h.dr.th, h.dr.r + hy);
    h.x = hx; h.y = hy2;
    if (h.dr.t > 0 && Math.hypot(hx - px, hy2 - (py - 8)) < 11 + (G.magT > 0 ? G.up.magnet * 1.4 : 0)) { h.got = true; G.C.hearts++; G.greenF += 1; if (G.U.void) G.voidC = Math.min(1, G.voidC + 1 / G.up.voidNeed); if (G.T - (G.blubT || 0) > 0.04) { G.blubT = G.T; tone(520 + Math.random() * 120, 1100, 0.05, 'sine', 0.05); } for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28; part(hx, hy2, Math.cos(a) * 40, Math.sin(a) * 40, 0.4, i % 2 ? 13 : 7, 0.6, 0, true); } }
    else if (h.dr.ring && h.dr.th > Math.PI + 1.3) { h.got = true; G.C.heartsMissed++; }
  }
  B.hearts = B.hearts.filter(h => !h.got);
  for (const f of B.fly) { f.t += dt; const k = Math.min(1, f.t / 0.5); f.x += (px - f.x) * k * 0.3; f.y += (py - 10 - f.y) * k * 0.3; if (f.t >= 0.5) { f.done = true; G.C.hearts++; G.greenF += 1; } }
  B.fly = B.fly.filter(f => !f.done);
  // the stamp: the same rhythm as outside, at what has come out of the eye
  if ((B.stampT -= dt) <= 0) { let t = null, bd = 150; for (const m of B.mons) if (m.mode !== 'dead' && m.type !== 'm' && m.dr.r > D.R * 0.45) { const d = Math.hypot(m.x - px, m.y - (py - 12)); if (d < bd) { bd = d; t = m; } }
    if (t) { B.shots.push({ x: px, y: py - 12, tgt: t, ang: 0 }); B.stampT = P.stampRate; } else B.stampT = 0.05; }
  for (const s of B.shots) { const t = s.tgt; if (!t || t.mode === 'dead') { s.dead = true; continue; }
    const dx = t.x - s.x, dy = t.y - 3 - s.y, d = Math.hypot(dx, dy) || 1, st = P.stampSpeed * dt; s.ang += dt * 14;
    if (d < 6 + st) { s.dead = true; const n0 = G.KH.length; damage(t, G.dmg, 'stamp'); for (const o of B.mons) if (o !== t && o.mode !== 'dead' && Math.hypot(o.x - t.x, o.y - t.y) < P.splashR * 1.2) damage(o, G.dmg * P.splash, 'splash'); drumHearts(n0); SFX.splat(); burst(t.x, t.y, 6, 2, 50, -20); }
    else { s.x += dx / d * st; s.y += dy / d * st; } }
  B.shots = B.shots.filter(s => !s.dead);
  if (G.inv > 0) G.inv -= dt; if (G.hurtT > 0) G.hurtT -= dt; if (G.ifr > 0) G.ifr -= dt; if (G.shake > 0) G.shake -= dt; if (G.magT > 0) G.magT -= dt;
  G.riderOv = { x: sx(px), y: py, ang: B.th - Math.PI / 2, pose: B.climb ? 'brake' : A ? (A.k === 'climb' ? 'brake' : A.k === 'dash' ? 'dash' : A.k === 'dive' ? 'dive' : A.k === 'jump' ? 'air' : 'ride') : 'ride', shield: safe };
  updParts(dt);
  for (const f of G.fx) f.t += dt; G.fx = G.fx.filter(f => f.t < f.life);
}
function exitDrum(kind) {
  const B = G.barrel; B.scene = false; B.ph = 'out'; B.t = 0; B.kind = kind; B.flash = 0; B.K = 1.8;
  G.riderOv = null; G.flameOn = false; G.boom = null; B.mons = []; B.hearts = []; B.shots = []; for (const f of B.fly) { G.C.hearts++; G.greenF += 1; } B.fly = [];
  G.u = B.saveU; G.y = ysAt(G.u, G.S); G.cyc = null; G.dashT = G.diveT = 0; G.air = false; G.ramp = null; G.vy = 0;
  logE({ k: 'barrel', what: kind });
  if (kind === 'spit') {   // the barrel spits him out: a giant leap into the sky, then he falls (or glides) back onto a normal wave
    G.air = true; G.airT = 0; G.airTop = G.y; G.jumpBusy = true; G.vy = -520; G.qAir = 25; G.inv = Math.max(G.inv, 1.6); G.C.spits = (G.C.spits || 0) + 1; combo();
    for (let i = 0; i < 10; i++) G.KH.push({ u: G.u + i * 6, y: G.y - 20, vu: 50 + i * 12, vy: -260 - i * 10 });
    G.HL.push({ w: G.S + G.u + 240, h: -9, got: false, ph: 0, crystal: true });
    burst(G.u, G.y, 50, 0, 180, -160); burst(G.u, G.y, 24, 9, 120, -120, true); G.shake = Math.max(G.shake, 0.35);
    float(G.u + 20, G.y - 110, 'SPIT!', '#bff8ff', 16); tone(330, 990, 0.35, 'triangle', 0.18); noiseBurst(0.6, 'highpass', 1200, 0.35);
  } else { G.inv = Math.max(G.inv, 0.8); float(G.u, G.y - 34, kind === 'wake' ? 'into the wake!' : 'the wave backs off', kind === 'wake' ? '#ff9a9a' : '#e9fbff', 11); burst(G.u, G.y - 6, 20, 0, 90, -60); }
}
// ---- drawing: the barrel in the world (the herald, the curtain, PULL IN) and the drum itself ----
// v067: the tube is the same wave, rolled up. Two looks to choose from (BRL.view):
//   'side'   — the wave seen from the side, rolled into a long spiral: its three blue layers (light surface, middle, deep) wind round a clear eye;
//              Robinson rides the inside of the curl at the bottom of the eye, and through the eye you see the sky, the sea, the wreck.
//   'behind' — looking down the tube from behind him: the three layers as three spiral arms round a small clear eye far ahead.
// Both: spray mostly up top where the lip falls, some of it dragged round with the spin; about a quarter of the screen stays background.
function drum() {
  const vo = VOFF(), m = Math.min(W, H), cy = G.camY - vo + H * 0.44, side = BRL.view === 'side';
  const re = side ? m * 0.4 : m * 0.24, R = side ? re : Math.min(W * 0.42, H * 0.46), rs = side ? m * 0.06 : re;
  const Ro = side ? Math.hypot(W, H) * 0.75 : Math.max(R + 24, Math.sqrt(0.75 * W * H / Math.PI + re * re));
  return { cx: G.camU + W / 2, cy, R, re, rs, Ro, side };
}
function tubeCols() { const lk = LOOK; return [lk.face[1], lk.face[2], lk.deep || lk.face[3]]; }
function drawTube(x, y, s, k, open, t) {   // x: screen, y: world; s: scale; k: 0..1 how far it has rolled up (fades in, the spiral winds up); open: 0..1 the top right gone
  const D = drum(), re = D.re * s, Ro = D.Ro * s, cols = tubeCols(), al = Math.max(0, Math.min(1, k * 1.5)), wind = 0.35 + 0.65 * k, rot = t * 0.9, lite = P.lite;
  if (al <= 0) return;
  const top = G.camY - VOFF();
  ctx.save(); ctx.globalAlpha = al;
  ctx.beginPath(); ctx.arc(x, y, Ro, 0, Math.PI * 2); ctx.moveTo(x + re, y); ctx.arc(x, y, re, 0, Math.PI * 2, true); ctx.clip('evenodd');   // the ring between the eye and the outside
  if (open > 0) { const a0 = -Math.PI / 4, hw = 1.15 * open, big = Math.hypot(W, H); ctx.beginPath(); ctx.rect(-40, top - 40, W + 80, H + 80); ctx.moveTo(x, y);
    for (let i = 0; i <= 24; i++) { const a = a0 + hw - 2 * hw * i / 24, wob = 1 + 0.06 * Math.sin(i * 1.7 + t * 4); ctx.lineTo(x + Math.cos(a) * big * wob, y + Math.sin(a) * big * wob); } ctx.closePath(); ctx.clip('evenodd'); }
  const P2 = Math.PI * 2, pt = (a, r) => [x + Math.cos(a) * r, y + Math.sin(a) * r];
  if (D.side) {   // one rolled sheet: every turn of it is the three layers, light on the inside (the water surface faces the hollow), deep outside
    const turns = 3, b = Math.log(Ro / re) / (P2 * (turns - 1)) * (1 / wind), C = th => re * Math.exp(b * th), st = lite ? 0.22 : 0.12;
    for (let j = 0; j < 3; j++) { ctx.fillStyle = cols[j]; ctx.beginPath(); let first = true;
      for (let th = -P2; th <= P2 * turns; th += st) { const [px, py] = pt(th + rot, C(th + j * P2 / 3)); first ? ctx.moveTo(px, py) : ctx.lineTo(px, py); first = false; }
      for (let th = P2 * turns; th >= -P2; th -= st) { const [px, py] = pt(th + rot, C(th + (j + 1) * P2 / 3)); ctx.lineTo(px, py); }
      ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = LOOK.line; ctx.lineWidth = 1.1; ctx.globalAlpha = al * 0.85; ctx.beginPath();   // the surface line, as on the open wave
    for (let th = -P2; th <= P2 * turns; th += st) { const [px, py] = pt(th + rot, C(th)); th === -P2 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke(); ctx.globalAlpha = al;
    if (!lite) { ctx.fillStyle = 'rgba(' + LOOK.streak + ',.5)'; for (let i = 0; i < 90; i++) { const th = (i / 90) * P2 * (turns + 1) - P2, f = (i * 0.37) % 1, r = C(th + f * P2 * 0.95), a = th + rot; const [px, py] = pt(a, r);
      ctx.save(); ctx.translate(px, py); ctx.rotate(a + Math.PI / 2); ctx.fillRect(-2 - r * 0.02, -0.3, 4 + r * 0.04, 0.6); ctx.restore(); } }   // streaks in the water, along the spin
  } else {   // looking down the tube: three spiral arms, one per layer
    const sw = 1.5 / wind, st = lite ? 10 : 18;
    for (let j = 0; j < 3; j++) { ctx.fillStyle = cols[j]; ctx.beginPath();
      for (let i = 0; i <= st; i++) { const r = re * Math.pow(Ro / re, i / st), a = rot + j * P2 / 3 + sw * Math.log(r / re); const [px, py] = pt(a, r); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      const aO = rot + sw * Math.log(Ro / re), aI = rot; for (let q = 1; q < 12; q++) { const [px, py] = pt(aO + (j + q / 12) * P2 / 3, Ro); ctx.lineTo(px, py); }   // along the outer edge, not a chord across it
      for (let i = st; i >= 0; i--) { const r = re * Math.pow(Ro / re, i / st), a = rot + (j + 1) * P2 / 3 + sw * Math.log(r / re) + 0.02; const [px, py] = pt(a, r); ctx.lineTo(px, py); }
      for (let q = 11; q > 0; q--) { const [px, py] = pt(aI + (j + q / 12) * P2 / 3, re); ctx.lineTo(px, py); }
      ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = LOOK.line; ctx.lineWidth = 1; ctx.globalAlpha = al * 0.7;
    for (let j = 0; j < 3; j++) { ctx.beginPath(); for (let i = 0; i <= st; i++) { const r = re * Math.pow(Ro / re, i / st), a = rot + j * P2 / 3 + sw * Math.log(r / re); const [px, py] = pt(a, r); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
    ctx.globalAlpha = al;
    if (!lite) { ctx.strokeStyle = 'rgba(' + LOOK.streak + ',.35)'; ctx.lineWidth = 0.6; for (let n = 0; n < 15; n++) { ctx.beginPath(); for (let i = 0; i <= 10; i++) { const r = re * Math.pow(Ro / re, i / 10), a = rot + n * P2 / 15 + 0.2 + sw * Math.log(r / re); const [px, py] = pt(a, r); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); } }
  }
  { const g = ctx.createRadialGradient(x, y, re, x, y, re * (D.side ? 1.35 : 1.9)); g.addColorStop(0, 'rgba(255,255,255,' + (D.side ? 0.3 : 0.5) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - Ro, y - Ro, Ro * 2, Ro * 2); }   // light from the eye
  { const g = ctx.createRadialGradient(x, y, Math.min(Ro * 0.7, re * 2.2), x, y, Math.min(Ro, re * 3.2)); g.addColorStop(0, 'rgba(0,16,30,0)'); g.addColorStop(1, 'rgba(0,16,30,.35)'); ctx.fillStyle = g; ctx.fillRect(x - Ro, y - Ro, Ro * 2, Ro * 2); }   // darker away from it
  // spray: most of it up top where the lip falls, some dragged round with the spin
  const NF = lite ? 40 : 120;
  for (let i = 0; i < NF; i++) { const L = hash(i + 1) < 0.25 ? 4 + 3 * hash(i + 2) : 0.8 + 1.6 * hash(i + 3), age = (t * 0.9 + hash(i + 4) * L) % L, th = -Math.PI / 2 + (hash(i + 5) - 0.5) * 1.5 + 1.1 * age,
      rr = re * (1.02 + (D.side ? 0.5 : 1.4) * Math.pow(hash(i + 6), 1.5)), sz = (1 + 2.6 * hash(i + 7)) * (D.side ? 1 : 0.6 + rr / re * 0.5), a = (1 - age / L) * 0.85;
    const [px, py] = pt(th + rot * 0.15, rr); ctx.globalAlpha = al * a; ctx.save(); ctx.translate(px, py); ctx.rotate(th); E(0, 0, sz * 0.7, sz * 1.6, i % 4 ? '#ffffff' : LOOK.foam); ctx.restore(); }
  ctx.globalAlpha = al;
  if (!lite) for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + (i / 25 - 0.5) * 2.2, w = Math.cos((i / 25 - 0.5) * 2.2), r = re * (1.04 + 0.12 * Math.sin(i * 2.1 + t * 6)), z = (2 + 3.5 * w) * (1 + 0.25 * Math.sin(i * 3 + t * 8));   // the lip's whitewater, thick on top
    const [px, py] = pt(a, r); E(px, py, z, z * 0.8, '#ffffff'); }
  ctx.restore();
  // the eye's rim, thin below, ragged up top, and drips falling across its top
  ctx.save(); ctx.globalAlpha = al;
  for (let i = 0; i < 48; i++) { const a = (i / 48) * P2, up = Math.max(0, -Math.sin(a)), r = re * (1 + 0.015 * Math.sin(i * 5 + t * 7)); const [px, py] = pt(a, r); E(px, py, 1 + 2.4 * up, 0.8 + 1.6 * up, 'rgba(255,255,255,' + (0.45 + 0.5 * up) + ')'); }
  if (!lite) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.7; for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (hash(i + 30) - 0.5) * 1.6, f = (t * 1.6 + hash(i + 31)) % 1, r0 = re * (1 - 0.05 - f * 0.35); const [px, py] = pt(a, r0); ctx.globalAlpha = al * (1 - f); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 1, py + 4 + 4 * f); ctx.stroke(); } }
  if (!D.side) for (let i = 0; i < 40; i++) { const a = (i / 40) * P2 + t * 0.4, r = Ro * (0.97 + 0.03 * Math.sin(i * 3 + t * 5)); const [px, py] = pt(a, r); ctx.globalAlpha = al * 0.8; E(px, py, 4, 3, i % 2 ? '#ffffff' : LOOK.foam); }   // ragged spray at the outer edge
  if (open > 0) { const a0 = -Math.PI / 4, hw = 1.15 * open; for (const a of [a0 - hw, a0 + hw]) for (let i = 0; i < 12; i++) { const r = re + (Math.min(Ro, Math.hypot(W, H)) - re) * (i / 12), z = 2 + 3 * hash(i + a * 10); const [px, py] = pt(a + 0.03 * Math.sin(i + t * 6), r); ctx.globalAlpha = al * 0.9; E(px, py, z, z * 0.7, '#ffffff'); } }
  ctx.restore();
}
function drawBarrelWorld() {
  const B = G.barrel; if (!B || B.scene) return;
  const x = sx(G.u), y = G.y;
  if (B.ph === 'herald' && B.t > 2.9) {   // the curtain: the lip thrown over him, down into the water ahead
    const k = Math.min(1, (B.t - 2.9) / 0.35), xl = Math.max(-20, sx(0)), x2 = sx(G.u + 50), yT = Y_TOP - 6;
    ctx.globalAlpha = 0.25 * k; ctx.fillStyle = '#02121a'; ctx.beginPath(); ctx.moveTo(xl, yT + 20); ctx.quadraticCurveTo((xl + x2) / 2, yT - 30, x2, ysAt(G.u + 50, G.S)); ctx.lineTo(xl, ysAt(Math.max(3, G.u - 40), G.S) + 10); ctx.closePath(); ctx.fill();   // the dark pocket under it
    ctx.globalAlpha = 0.9 * k; const g = ctx.createLinearGradient(xl, yT, x2, y); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, LOOK.lip); g.addColorStop(1, LOOK.curl);
    ctx.strokeStyle = g; ctx.lineWidth = 7 + 3 * Math.sin(G.T * 9); ctx.beginPath(); ctx.moveTo(xl, yT + 12); ctx.quadraticCurveTo((xl + x2) / 2, yT - 34, x2, ysAt(G.u + 50, G.S) - 2); ctx.stroke();
    ctx.globalAlpha = 1;
    if (!P.lite && Math.random() < 0.6) part(G.u + 50 + (Math.random() - 0.5) * 10, ysAt(G.u + 50, G.S), (Math.random() - 0.5) * 80, -60 - Math.random() * 60, 0.5, 0, 1, 300);
  }
  if (B.ph === 'herald' && B.t >= BRL.winA && B.t < BRL.winB) {   // the sign: PULL IN · HOLD A
    const k = (B.t - BRL.winA) / (BRL.winB - BRL.winA), held = B.hold !== undefined ? Math.min(1, B.hold / BRL.hold) : 0, sc = 1 + 0.12 * Math.sin(G.T * 14);
    ctx.save(); ctx.translate(x, y - 58); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(4,30,40,.82)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-34, -17, 68, 30, 7) : ctx.rect(-34, -17, 68, 30); ctx.fill();
    ctx.strokeStyle = '#bff8ff'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, 10); ctx.lineTo(-30 + 60 * (1 - k), 10); ctx.stroke();
    if (held > 0) { ctx.strokeStyle = '#7dffb0'; ctx.beginPath(); ctx.moveTo(-30, 7); ctx.lineTo(-30 + 60 * held, 7); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#bff8ff'; ctx.font = '700 11px ' + FONT; ctx.fillText('PULL IN', 0, -4);
    ctx.fillStyle = '#fff2a0'; ctx.font = '700 8px ' + FONT; ctx.fillText('HOLD A', 0, 5);
    ctx.restore();
  }
  if (B.ph === 'enter' || B.ph === 'out') {   // v067: the curl rolls up into the tube (and back out into the wave)
    const D = drum(), e = k => k * k * (3 - 2 * k), k = B.ph === 'enter' ? e(Math.min(1, B.t / BRL.enterT)) : 1 - e(Math.min(1, B.t / BRL.outT));
    const lx = Math.max(10, sx(0) + 30), ly = Y_TOP + 6, cx = lx + (sx(D.cx) - lx) * k, cy = ly + (D.cy - ly) * k;
    drawTube(cx, cy, 0.25 + 0.75 * k, k, B.ph === 'out' ? 1 : 0, G.T);
  }
}
function drawDrum() {
  const B = G.barrel, D = drum(), t = G.T, cx = sx(D.cx), cy = D.cy, Rr = D.R, top = G.camY - VOFF();
  drawTube(cx, cy, 1, 1, B.open, t);
  // the wake top left, the target of the way out
  if (B.ph === 'sky' || B.climb) { const a = BRL.wakeA, pulse = 0.6 + 0.4 * Math.sin(t * 10);
    ctx.strokeStyle = 'rgba(255,226,106,' + pulse + ')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, Rr + 2, a - BRL.early, a + BRL.late); ctx.stroke();
    for (let i = 0; i < 7; i++) { const aa = a - 0.15 + i * 0.05, r = Rr + 6 + 3 * Math.sin(i + t * 9); E(cx + Math.cos(aa) * r, cy + Math.sin(aa) * r, 3.5, 2.5, '#ffffff'); }
    const [wx, wy] = [cx + Math.cos(a) * (Rr - 20), cy + Math.sin(a) * (Rr - 20)]; ctx.textAlign = 'center'; ctx.font = '700 7px ' + FONT; ctx.lineWidth = 2; ctx.strokeStyle = '#3a2000'; ctx.strokeText('THE WAKE', wx, wy); ctx.fillStyle = '#fff2a0'; ctx.fillText('THE WAKE', wx, wy); }
  // hearts, monsters, shots
  for (const h of B.hearts) { if (h.dr.t < 0) continue; const k = 0.35 + 0.65 * Math.pow(h.dr.r / Rr, 1.3); ctx.drawImage(HEART_SPR, sx(h.x) - 3.5 * k, h.y - 3.2 * k, 7 * k, 6.4 * k); }
  for (const f of B.fly) ctx.drawImage(HEART_SPR, sx(f.x) - 3.5, f.y - 3.2, 7, 6.4);
  for (const m of B.mons) {
    const s = SPR[m.type]; if (!s) continue; const fr = (Math.floor(m.ph / 3) & 1), img = m.flash > 0 ? s.flash[fr] : s.img[fr], k = (0.3 + 0.7 * Math.pow(Math.min(1, m.dr.r / Rr), 1.4)) * (m.type === 'm' ? 1.15 : 1);
    ctx.save(); ctx.translate(sx(m.x), m.y); ctx.rotate(m.dr.ring ? m.dr.th - Math.PI / 2 : m.dr.th + Math.PI / 2 - 0.5); ctx.scale(-k, k);
    if (m.mode === 'dead') ctx.globalAlpha = Math.max(0, 1 - m.t * 5);
    ctx.drawImage(img, -s.ox, -s.oy, s.w, s.h); ctx.restore(); ctx.globalAlpha = 1;
    if (m.burn > 0 && m.mode !== 'dead') burnFlames(sx(m.x), m.y - 4 * k, k);
  }
  for (const s of B.shots) { ctx.save(); ctx.translate(sx(s.x), s.y); ctx.rotate(s.ang); ctx.drawImage(STAMP_SPR, -3, -3.5, 6, 7); ctx.restore(); }
  drawBoom();
  drawRider();
  if (B.ph === 'sky' && !B.climb) { const [x, y] = [G.riderOv ? G.riderOv.x : cx, G.y - 40], sc = 1 + 0.12 * Math.sin(t * 14); ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.textAlign = 'center'; ctx.font = '700 14px ' + FONT; ctx.lineWidth = 3; ctx.strokeStyle = '#0a2630'; ctx.strokeText('HOLD A', 0, 0); ctx.fillStyle = '#fff2a0'; ctx.fillText('HOLD A', 0, 0); ctx.font = '600 6.5px ' + FONT; ctx.lineWidth = 2; ctx.strokeText('let go at the wake', 0, 10); ctx.fillStyle = '#ffffff'; ctx.fillText('let go at the wake', 0, 10); ctx.restore(); }
  if (B.ph === 'in' && B.t < 2.2) { ctx.globalAlpha = Math.min(1, (2.2 - B.t) * 1.5); ctx.textAlign = 'center'; ctx.font = '700 15px ' + FONT; ctx.lineWidth = 3; ctx.strokeStyle = '#06303a'; ctx.strokeText('BARRELED!', cx, top + 34); ctx.fillStyle = '#bff8ff'; ctx.fillText('BARRELED!', cx, top + 34); ctx.font = '600 7px ' + FONT; ctx.lineWidth = 2; ctx.strokeText('A — leap and dive · D — jump (off a mussel: big jump)', cx, top + 46); ctx.fillStyle = '#ffffff'; ctx.fillText('A — leap and dive · D — jump (off a mussel: big jump)', cx, top + 46); ctx.globalAlpha = 1; }
}
function updCat(dt) {
  const k = G.kat; if (k.mode === 'away') return;
  k.t += dt; if (k.wet > 0) { k.wet -= dt; if (Math.random() < dt * 6) part(k.mode === 'back' ? G.u - 9 : k.x, (k.mode === 'back' ? G.y : k.y) - 2, (Math.random() - 0.5) * 10, 10, 0.5, 9, 0.6, P.g * 0.4); }
  if (k.mode === 'board') {
    const want = G.u - 26 - 4 * Math.sin(G.T * 1.3);
    k.u = k.u === undefined ? want : k.u + (want - k.u) * Math.min(1, 3 * dt);
    k.u = Math.max(16, k.u); k.x = k.u; k.y = ysAt(k.u, G.S);
    if (!G.air && Math.random() < dt * 14) part(k.u - 4, k.y - 0.5, -G.v * 0.2, -20 - Math.random() * 20, 0.3, 0, 0.6, P.g * 0.6);
  }
  if ((k.mode === 'head' || k.mode === 'board') && k.dives < k.max && !G.over && !G.won) {
    k.cd -= dt;
    if (k.cd <= 0) {
      const from = k.mode === 'head' ? G.u : k.u, prey = k.mode === 'head' ? catPrey(from, 12, k.reach) : catPrey(from, -12, k.reach);
      if (prey) { const [hx, hy] = k.mode === 'head' ? catHead() : [k.x, k.y - 3]; Object.assign(k, { home: k.mode, mode: 'leap', t: 0, x0: hx, y0: hy, tgt: prey }); prey.catT = true; SFX.cat('mi'); }
      else k.cd = 0.05;   // v054: look again soon — at high tempo a minnow passes in a fifth of a second
    }
  }
  if (k.mode === 'leap') {
    const dur = 0.5, p = Math.min(1, k.t / dur), [tx, ty] = mPos(k.tgt);
    k.x = k.x0 + (tx - k.x0) * p; k.y = k.y0 + (ty + 2 * k.deep - k.y0) * p - 26 * Math.sin(Math.PI * p);
    k.ang = Math.atan2(ty - k.y0, tx - k.x0) * p;
    if (p >= 1) {
      if (k.tgt.mode !== 'dead') { kill(k.tgt, 'cat'); G.catKill = true; }
      const sy = ysAt(Math.max(3, k.x), G.S); burst(k.x, sy, 14, 0, 70, -70); ring(k.x, sy, 1, 10, 0.4, '#e9fbff', false, 0.8);
      k.dives++; Object.assign(k, { mode: 'swim', t: 0, x0: k.x, y0: k.y });
    }
  } else if (k.mode === 'swim') {
    const dur = 0.8, p = Math.min(1, k.t / dur), home = k.home === 'board';
    const tx = home ? (k.u === undefined ? G.u - 26 : k.u) : G.u - 9, ty = home ? ysAt(Math.max(3, tx), G.S) - 2 : G.y - 2;
    k.x = k.x0 + (tx - k.x0) * p; k.y = k.y0 + (ty - k.y0) * p + 4 * Math.sin(Math.PI * p);
    if (p >= 1) { k.mode = home ? 'board' : 'back'; k.wet = 4; k.cd = k.every; if (!home) float(G.u - 9, G.y - 10, 'mrrrw.', '#ffc58a'); }
  }
}

// ---------- the stamp: auto attack ----------
function targetable(m) { return m.type !== 'm' && !m.catT && (m.type !== 'u' || (m.mode !== 'come' && m.off > 2)) && m.mode !== 'dead' && m.mode !== 'wash'; }
function nearestFrom(x, y, range, filt) {
  let best = null, bd = range * range;
  for (const m of G.mons) {
    if (!filt(m)) continue;
    const [mx, my] = mPos(m), d = (mx - x) ** 2 + (my - y) ** 2;
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}
function updShots(dt) {
  G.stampT -= dt;
  if (G.stampT <= 0) {
    const R = P.stampRange * (1 + 0.6 * heightNorm()), t = nearestFrom(G.u, G.y - 10, R, m => targetable(m) && m.u >= G.u - 4) || nearestFrom(G.u, G.y - 10, R, targetable);   // v053: no exceptions — but what comes at him first, then the ones behind
    if (t) {
      const [tx, ty] = mPos(t), dx = tx - G.u, dy = ty - (G.y - 14), dd = Math.hypot(dx, dy) || 1;
      G.shots.push({ x: G.u, y: G.y - 14, vx: dx / dd * P.stampSpeed, vy: dy / dd * P.stampSpeed, tgt: t, ang: 0 });
      G.stampT = P.stampRate;
    } else G.stampT = 0;
  }
  for (const s of G.shots) {
    if (s.tgt && !targetable(s.tgt)) s.tgt = nearestFrom(s.x, s.y, 120, targetable);
    if (s.tgt) {
      const [tx, ty] = mPos(s.tgt), dx = tx - s.x, dy = ty - 3 - s.y, d = Math.hypot(dx, dy) || 1;
      s.vx += (dx / d * P.stampSpeed - s.vx) * Math.min(1, 10 * dt);
      s.vy += (dy / d * P.stampSpeed - s.vy) * Math.min(1, 10 * dt);
      if (d < 6) { stampHit(s, s.tgt); s.dead = true; }
    }
    s.x += s.vx * dt; s.y += s.vy * dt; s.ang += dt * 14;
    if (s.x < G.camU - 20 || s.x > G.camU + W + 20 || s.y < G.camY - 30 || s.y > G.camY + H + 20) s.dead = true;
  }
  G.shots = G.shots.filter(s => !s.dead);
}
function stampHit(s, m) {
  const [x, y] = mPos(m);
  const died = damage(m, G.dmg, 'stamp');
  if (!died && !PRED_SIM) { SFX.splat(); burst(x, y - 3, 7, 13, 30, -20); burst(x, y - 3, 5, 6, 18, -10, true); }   // v053: a small dense green puff and a squelch for a hit
  ring(x, y - 3, 1, 4, 0.25, '#2e9e4f', false, 1);
  ring(x, y - 3, 3, P.splashR, 0.35, '#7dffb0', true, 0.5);
  for (let i = 0; i < (P.lite ? 4 : 12); i++) { const a = Math.random() * 6.28, sp = 40 + Math.random() * 70; part(x, y - 3, Math.cos(a) * sp, Math.sin(a) * sp - 20, 0.35, i % 2 ? 10 : 6, 0.6, 200, i % 2 === 0); }
  for (const o of G.mons) {
    if (o === m || !targetable(o) || o.type === 'm') continue;
    const [ox, oy] = mPos(o);
    if ((ox - x) ** 2 + (oy - y) ** 2 < P.splashR * P.splashR) { o.flash = 0.12; damage(o, P.splash * G.dmg, 'splash'); }
  }
}

// ---------- S: the stamp boomerang ----------
function updBoom(dt) {
  const b = G.boom; if (!b) return;
  b.t += dt; b.ang += dt * 22;
  const T1 = 0.4, T2 = 0.95;
  let x, set;
  const dir = b.dir || 1;
  if (b.t < T1) { const k = b.t / T1; x = G.u + dir * b.R * (1 - (1 - k) * (1 - k)); set = b.out; }
  else { const k = Math.min(1, (b.t - T1) / (T2 - T1)); x = G.u + dir * (b.R - b.R * k * k * (3 - 2 * k)); set = b.back; }
  const y = ysAt(Math.max(3, x), G.S) - 9;
  b.x = x; b.y = y;
  for (const m of G.mons) {
    if (set.has(m) || !targetable(m) || m.mode === 'suck' || m.mode === 'spill') continue;   // v052: the thrown ones fly on and land ahead
    const [mx, my] = mPos(m);
    if (Math.abs(mx - x) < 9 && Math.abs(my - 3 - y) < 14) { set.add(m); damage(m, b.d, 's'); ring(mx, my - 3, 1, 10, 0.3, '#c6ff63', true, 0.75); }
  }
  if (!P.lite || Math.random() < 0.4) part(x, y, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 0.3, Math.random() < 0.5 ? 6 : 10, 0.6, 0, true);
  if (b.t > T2) { G.boom = null; SFX.catch(); }
}

// ---------- W: VOID — root lightning from kill to kill + a luminous flood ----------
function fireVoid() {   // v046: VOID is the life-saver — fired by the game when the stamina would hit 0
  SFX.voidHit(); G.C.w++;
  G.inv = 1.5; G.dim = 0.7; G.shake = 0.4;
  G.voidQ = { x: G.u, y: G.y - 8, hit: new Set(), next: 0, hops: 0 }; G.chainN = 0; G.chainT = 1.6;
  G.flood = { t: 0, x: G.u, y: G.y, hit: new Set() };
}
function weak(m) { return m.type !== 'B' && m.type !== 'c' && m.mode !== 'dead' && m.mode !== 'wash' && m.hp <= 3 * G.dmg + 0.001; }
function updVoid(dt) {
  const q = G.voidQ;
  if (q) {
    q.next -= dt;
    if (q.next <= 0) {
      const t = nearestFrom(q.x, q.y, P.chainR, m => weak(m) && !q.hit.has(m));
      if (!t || q.hops > 80) G.voidQ = null;
      else {
        q.hit.add(t); q.hops++;
        const [tx, ty] = mPos(t);
        G.bolts.push({ pts: boltPath(q.x, q.y, tx, ty - 3), t: 0, life: 0.32 });
        burst(tx, ty - 3, 10, 6, 80, -40, true);
        const died = damage(t, 3 * G.dmg, 'void');
        q.x = tx; q.y = ty - 3; q.next = 0.05;
        if (!died) G.voidQ = null;
      }
    }
  }
  for (const b of G.bolts) b.t += dt;
  G.bolts = G.bolts.filter(b => b.t < b.life);
  const f = G.flood;
  if (f) {
    f.t += dt;
    const RM = 170, R = RM * Math.min(1, f.t / 0.8);
    const n = P.lite ? 10 : 34;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      part(f.x + Math.cos(a) * R, f.y + Math.sin(a) * R * 0.6, Math.cos(a) * 20, Math.sin(a) * 12 - 6, 0.7 + Math.random() * 0.6, i % 4 === 0 ? 0 : i % 2 ? 5 : 9, 0.6, -10, true);
    }
    for (const m of G.mons) {
      if (f.hit.has(m) || m.mode === 'dead' || m.mode === 'wash') continue;
      const [x, y] = mPos(m);
      if ((x - f.x) ** 2 + ((y - f.y) / 0.6) ** 2 < R * R) {
        f.hit.add(m);
        const dist = Math.sqrt((x - f.x) ** 2 + ((y - f.y) / 0.6) ** 2);
        const died = damage(m, 2 * G.dmg * (1 - 0.7 * Math.min(1, dist / RM)), 'void');
        if (!died && (m.mode === 'swarm' || m.mode === 'suck' || m.mode === 'spill' || m.mode === 'hover' || m.mode === 'glide') && x < G.u) {
          m.mode = 'wash'; m.x = x; m.y = y; m.vx = -230 - RND() * 120; m.vy = -60 - RND() * 80; m.t = 0; G.C.washed++;
        }
      }
    }
    if (f.t > 0.9) G.flood = null;
  }
}
function boltPath(x0, y0, x1, y1) {
  const pts = [[x0, y0]], n = 6;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  for (let i = 1; i < n; i++) { const k = i / n, j = (Math.random() - 0.5) * Math.min(16, len * 0.25); pts.push([x0 + dx * k + nx * j, y0 + dy * k + ny * j]); }
  pts.push([x1, y1]);
  const br = [];
  for (let i = 1; i < n; i += 2) {
    const [bx, by] = pts[i], a = Math.atan2(dy, dx) + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.6), l = 6 + Math.random() * 10;
    br.push([[bx, by], [bx + Math.cos(a) * l * 0.5 + (Math.random() - 0.5) * 3, by + Math.sin(a) * l * 0.5], [bx + Math.cos(a) * l, by + Math.sin(a) * l]]);
  }
  return { main: pts, br };
}

// ---------- predictions (jump arc, dash path) ----------

// ---------- rider physics step (120 Hz) ----------
// v054: crevasses in the gravel (nest / den): gaps in the surface, in water coordinates
function gapsAhead() { const o = (G.gaps || []).slice(); for (let j = LV.ei; j < LV.ev.length && LV.ev[j].w < G.S + G.u + 3000; j++) { const q = LV.ev[j]; if (q.k === 'gap') o.push({ w0: q.w, w1: q.w + q.len }); } return o; }
function inGap(x) { if (!G.gaps) return false; for (const g of G.gaps) if (x > g.w0 && x < g.w1 && g !== G.gapSkip) return true; return false; }
function crevasseFall() {
  const g = G.gaps.find(g => G.u + G.S > g.w0 - 10 && G.u + G.S < g.w1 + 10); G.gapSkip = g || null;
  logE({ k: 'crevasse', w: g ? Math.round(g.w1 - g.w0) : null, glide: +(G.glideT || 0).toFixed(2) });
  burst(G.u, G.y, 16, 3, 60, -60); SFX.boom();
  hurt('gap', Math.max(1, G.stam));   // the full stamina — only a charged VOID saves him
  G.gapFall = false; G.air = false; G.vy = 0; G.y = ysAt(G.u, G.S); G.inv = Math.max(G.inv, 1.0);   // he climbs out on the far side
}
function stepRider(dt) {
  const st = G.wipe > 0 ? 'none' : inputState(), vn = vNorm(), sn = sinTheta();
  if (G.boostM > 0) G.boostM = Math.max(0, G.boostM - G.v * dt);
  let dv = P.gSlope * (sn - 0.3);
  if (G.dashT > 0 || G.diveT > 0) dv -= 0.2 * (G.v - P.vCruise);
  else if (st === 'brake') { const vA = P.vA0 + P.vA1 * heightNorm(); dv = G.v < vA ? 0.9 * (vA - G.v) : -0.25 * (G.v - vA); }
  else if (st === 'accel') dv += P.thrust * (1 - G.v / P.vMax);
  else { const vT = P.vCruise * (G.boostM > 0 ? BOOST : 1); dv = 0.3 * dv + 2.4 * (vT - G.v); }   // v046: the stage's tempo, boosted by combos
  if (G.stumble > 0) dv -= 70;
  G.v = Math.max(P.vMin * 0.8, Math.min(P.vMax * 1.15, G.v + dv * dt));
  G.aHeldT = st === 'brake' ? G.aHeldT + dt : 0;
  const sT = P.steepBase * (0.85 + 0.45 * vn);
  G.steep += (sT - G.steep) * 0.25 * dt;
  L = 150 / G.steep;
  AMP = troughAmp(G.S) * ST.amp;
  if (G.wipe > 0) G.wipe = Math.max(0, G.wipe - dt);
  const S1 = G.S + G.v * dt;
  if (!G.air) {
    const uRest = 40 + 175 * vn;
    let q;
    if (st === 'brake' && G.dashT <= 0 && G.diveT <= 0) q = -P.climb * 1.4 * Math.max(0, Math.min(1, (G.u - 26) / 25));   // the cycle climbs to just below the lip, never into it
    else q = Math.max(-120, Math.min(120, (uRest - G.u) * 1.5));
    if (G.dashT > 0) q += G.dashU * (G.dashT / G.dashDur);
    if (G.stumble > 0) q += 25;
    if (G.wipe > 0.35) q = 160;
    G.q = q;
  }
  if (G.dashT > 0) {
    G.dashT = Math.max(0, G.dashT - dt);
    if (G.dashT === 0 && !G.air) startDive(0.3 * G.dashPow);
  } else if (G.diveT > 0) {
    G.diveT = Math.max(0, G.diveT - dt);
    if (G.diveT === 0 && !PRED_SIM) burst(G.u, ysAt(G.u, G.S), P.lite ? 6 : 16, 0, 80, -90);
  }
  if (G.stumble > 0) G.stumble = Math.max(0, G.stumble - dt);
  if (G.lipCd > 0) G.lipCd -= dt;
  if (!G.air && inGap(G.u + S1) && G.diveT <= 0) { G.air = true; G.airT = 0; G.qAir = G.q; G.airTop = G.y; G.gapFall = true; }   // v054: riding into a crevasse
  if (!G.air) {
    const u1 = Math.max(2, G.u + G.q * dt);
    const y1 = ysAt(u1, S1) + diveDepth();
    const vNeed = (y1 - G.y) / dt;
    const yBall = G.y + G.vy * dt + 0.5 * P.g * dt * dt;
    if (G.diveT <= 0 && yBall < y1 - 0.25) { G.air = true; G.airT = 0; G.qAir = G.q; G.y = yBall; G.vy += P.g * dt; G.airTop = G.y; }
    else { G.y = y1; G.vy = G.diveT > 0 ? 0 : vNeed; }
    G.u = u1;
  } else {
    G.airT += dt;
    G.u = Math.max(2, G.u + G.qAir * dt);
    if (G.aimW !== null && G.vy > 0) {   // v048: a gentle hand towards the landing mussel — it corrects the FORECAST landing point (v047 pulled towards the mussel itself and overshot)
      let tl = 0.3, wp = 0;
      for (let k = 0; k < 4; k++) { const uP = G.u + G.qAir * tl, sP = S1 + G.v * tl, h = Math.max(0, ysAt(Math.max(3, uP), sP) - G.y); tl = Math.max(0.02, (-G.vy + Math.sqrt(G.vy * G.vy + 2 * P.g * h)) / P.g); wp = uP + sP; }
      G.qAir += Math.max(-200, Math.min(200, (G.aimW - wp) / Math.max(0.15, tl) * 3)) * dt;
    }
    const glide = !PRED_SIM && G.U.glide && IN.d && G.airT > 0.12 && (G.glideT || 0) < G.up.glideMax && !G.gapFall && !(G.cyc && G.cyc.ph === 'dash');
    if (glide && !G.gliding && (G.glideT || 0) === 0) G.C.glides = (G.C.glides || 0) + 1;
    G.gliding = glide;
    if (glide) { G.glideT = (G.glideT || 0) + dt; G.vy = Math.min(G.vy + P.g * 0.2 * dt, 42); G.qAir = Math.min(G.qAir + 25 * dt, 160);
      const sg = ysAt(Math.max(3, G.u), G.S) - 9; if (G.y > sg && inGap(G.u + G.S)) { G.y = sg; G.vy = Math.min(G.vy, 0); } }   // v055: over a crevasse the canopy holds him above the edge line   // v054: palm-leaf glider — slow fall, drifting on
    else G.vy += P.g * dt;
    G.y += G.vy * dt;
    if (G.y < G.airTop) G.airTop = G.y;
    const surf = ysAt(G.u, S1);
    if (G.y >= surf && inGap(G.u + S1)) { G.gapFall = true; if (G.y > surf + 28 && !PRED_SIM) crevasseFall(); }   // over a crevasse there is nothing to land on
    else if (G.y >= surf) {
      const fall = surf - G.airTop;
      G.y = surf; G.air = false;
      G.vy = (ysAt(G.u, S1 + G.v * dt) - surf) / dt;
      if (!PRED_SIM && G.airT > 0.12) burst(G.u, G.y, 4 + Math.min(10, G.airT * 14), 0, 45, -40);
      if (!PRED_SIM) G.lastLandT = G.T;
      if (!PRED_SIM && G.chainP) logChain(false, null);
      G.jumpBusy = false; G.aimW = null; G.glideT = 0; G.gliding = false; G.gapFall = false; if (!PRED_SIM) G.trick = null;
      if (G.dashFlag) { G.dashT = 0; G.S = S1; startDive(Math.min(1, fall / 40)); }
    }
  }
  G.S = S1;
  G.lipU = 7;   // v046: no random surges of the lip
  if (!G.air && G.u < G.lipU && G.lipCd <= 0) {
    G.v = P.vIdle; G.u = 14; G.wipe = 0.8; G.lipCd = 1.5; G.dashT = 0; G.dashFlag = false;
    G.y = ysAt(G.u, G.S); G.vy = 0;
    if (!PRED_SIM) { hurt('lip', P.lipCost); burst(G.u, G.y - 4, 26, 0, 120, -80); G.shake = Math.max(G.shake, 0.2); }
  }
}

// ---------- frame update ----------
// v048: a lesson banner stays until you have done what it teaches (at least 8 s, at most 25 s); the next one waits its turn
const LESSON = { glide: b => (G.C.glides || 0) > b.gl, flame: b => (G.flameT || 0) > b.fl + 0.3, 2: b => G.C.bigJumps > b.big, 3: () => G.combo >= 2, 4: b => G.C.tricks[1] > b.t1, 5: b => G.C.tricks[2] > b.t2, 8: b => G.C.cyclesGood > b.cy };
function updBanner(dt) {
  if (!G.banner && G.bq.length) { G.banner = G.bq.shift(); G.banner.base = { big: G.C.bigJumps, t1: G.C.tricks[1], t2: G.C.tricks[2], cy: G.C.cyclesGood, gl: G.C.glides || 0, fl: G.flameT || 0 }; }
  const b = G.banner; if (!b) return;
  b.age += dt;
  if (!b.out) { const need = LESSON[b.key]; if (b.age >= ((b.key === 'glide' || b.key === 'flame') ? 45 : 25) || (b.age >= 8 && (!need || need(b.base)) && (need || G.bq.length || b.age >= 12))) b.out = 1e-6; }
  else { b.out += dt; if (b.out > 0.7) G.banner = null; }
}
function update(dt) {
  G.dtAvg = (G.dtAvg || dt) * 0.95 + dt * 0.05;
  for (const f of G.floats) f.t += dt;
  G.floats = G.floats.filter(f => f.t < 1.8);
  if (G.mew) { G.mew.t += dt; if (G.mew.t > 1.2) G.mew = null; }
  speech(dt);
  if (G.over) { G.overT += dt; updParts(dt); if (G.overT > 1.8) finish(false); return; }
  if (G.won) { G.wonT += dt; updParts(dt); if (G.wonT > (G.final ? 2.6 : 2.0)) finish(true); return; }
  if (LAB.on) labTick(dt);
  if (G.hitStop > 0) { G.hitStop -= dt; updParts(dt); return; }   // v052: a short hit-stop makes every stamina hit felt
  if (G.hurtFx > 0) G.hurtFx -= dt;
  if (G.barChip) { G.barChip.t += dt; if (G.barChip.t > 0.7) G.barChip = null; }
  if (G.slow > 0) { G.slow -= dt; dt *= 0.35; }
  else if (G.bt > 0) { G.bt -= dt; dt *= 0.5; }
  updBanner(dt);
  if (G.trick) G.trick.t += dt;
  if (G.S >= G.endS) { G.won = true; G.wonT = 0; SFX.fanfare(G.bossDown || G.eliteDown); celebrate(); return; }
  G.T += dt;
  if (G.barrel && G.barrel.scene) { updDrum(dt); return; }   // v064: inside the barrel the wave outside stands still
  const n = Math.ceil(dt / (1 / 120));
  for (let i = 0; i < n; i++) stepRider(dt / n);
  if (!G.cyc && !G.air && G.dashT <= 0 && G.diveT <= 0 && !G.ramp) G.restU = G.restU === undefined ? G.u : G.restU + (G.u - G.restU) * Math.min(1, dt * 1.5);   // v064: where he rides when he does nothing — the poison cloud rains there
  const vn = vNorm();
  for (const h of G.KH) {   // v053: the kill hearts fly up and to the right, then land on the wave and ride it
    h.vy += P.g * 0.55 * dt; h.u += h.vu * dt; h.y += h.vy * dt;
    const sy = ysAt(Math.max(3, h.u), G.S) - 4; if (h.vy > 0 && h.y >= sy) { h.done = true; G.HL.push({ w: h.u + G.S, h: 4, got: false, ph: h.u }); }
  }
  G.KH = G.KH.filter(h => !h.done);
  if (G.inv > 0) G.inv -= dt;
  if (G.magT > 0) G.magT -= dt;
  if (G.dim > 0) G.dim -= dt;
  if (G.shake > 0) G.shake -= dt;
  if (G.kickT > 0) G.kickT -= dt;
  if (G.chainT > 0) G.chainT -= dt;
  if (G.hurtT > 0) G.hurtT -= dt;
  if (G.volWarn > 0) G.volWarn -= dt;
  if (G.ifr > 0) G.ifr -= dt;
  G.lipWarn = G.air ? 0 : Math.max(0, Math.min(1, (G.lipU + 22 - G.u) / 22));
  if (G.lipWarn > 0.3 && Math.random() < G.lipWarn * dt * 40) part(G.u - 14 - Math.random() * 10, G.y - 10 - Math.random() * 14, 60 + Math.random() * 60, -10 + Math.random() * 20, 0.3, 0, 0.6, 0);
  levelSpawn();
  wakeLice(dt);
  if ((G.boss || G.elite) && G.U.cycle && !G.wallEv && G.T - (G.towerT || G.T) > 9) { G.towerT = G.T; spawnWall({ n: 8 + Math.min(8, ST.n - 8), u: 0, f: 0 }); }   // v053: towers in the boss fight
  if ((G.boss || G.elite) && G.towerT === undefined) G.towerT = G.T - 4;
  if (G.wallEv && G.U.cycle && !G.cyc) { if ((G.planN = (G.planN || 0) + 1) % 3 === 0 || !G.plan) G.plan = cyclePlan(); } else G.plan = null;
  if (G.wallEv && !G.wallEv.thrown) { const f = wallFront(G.wallEv); if ((G.plan && G.plan.ok) || G.cyc || (f < 1e8 && f - G.u < 110)) { G.wallEv.thrown = true; throwFollowers(); } }
  updCycle(dt);
  updBarrel(dt);
  if (G.wallEv) {
    const e = G.wallEv, L = e.L; e.t += dt;
    if (L.winOpen === undefined && !G.cyc) { const tw = wallTiming(e); e.climbT = tw.ct; }   // keep the climb in step with his tempo until the window opens
    if (G.plan && G.plan.ok && L.winOpen === undefined) { L.winOpen = +G.T.toFixed(2); L.climbT = +e.climbT.toFixed(2); const f = wallFront(e); L.wallXAtOpen = +(sx(f) / W).toFixed(2); L.distOpen = Math.round(f - G.u); }
    if (L.winOpen !== undefined && L.winClose === undefined && !G.cyc && G.plan && !G.plan.ok) L.winClose = +G.T.toFixed(2);
    if (L.alive === undefined) { const al = e.mons.filter(m => m.mode === 'come'); const f = al.length ? Math.min(...al.map(m => m.u)) : -1e9; if (!al.length || f - G.u < 20) { L.alive = al.length; L.contactT = +G.T.toFixed(2); } }
    if (e.mons.every(m => m.mode === 'dead' || m.mode !== 'come' || m.u < G.u - 30)) {
      G.pendL = { L, T: G.thrown, at: G.T }; G.thrown = null;
      L.good = e.good; L.kills = sumK(['dive', 'dash', 's', 'jump']) - L.kills0; L.hits = sumH() - L.hits0; delete L.kills0; delete L.hits0; G.wallEv = null;
    }
  }
  if (G.pendL && (G.T - G.pendL.at > 2.5 || !G.pendL.T || G.pendL.T.every(m => m.thr && (m.thr.landed || m.thr.died)))) {   // v052: log the wall once its thrown followers have come down
    const { L, T } = G.pendL; G.pendL = null;
    { if (T) { const died = {}; T.forEach(m => { if (m.thr && m.thr.died) died[m.thr.died] = (died[m.thr.died] || 0) + 1; }); const du = T.filter(m => m.thr && m.thr.landed).map(m => m.thr.du);
        L.fol = { n: T.length, landed: du.length, died, duMin: du.length ? Math.min(...du) : null, duMax: du.length ? Math.max(...du) : null, sin: T[0] && T[0].thr ? T[0].thr.sin : null, notBack: T.filter(m => m.thr && !m.thr.landed && !m.thr.died).length }; }
      logE(L); }
  }
  updMonsters(dt);
  updRamp(dt);
  updCat(dt); updClouds(dt);
  collide();
  updHearts(dt);
  updShots(dt);
  updBossShots(dt);
  lastStand(dt);
  updBoom(dt);
  updVoid(dt);
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter(f => f.t < f.life);
  if (LOOK.storm) {   // v042: lightning at his last stand
    if (G.flash > 0) G.flash -= dt;
    G.boltT = (G.boltT === undefined ? 2 : G.boltT) - dt;
    if (G.boltT <= 0) { G.boltT = 3 + Math.random() * 4; G.flash = 0.35; const x0 = 40 + Math.random() * (W - 80); G.bolt = [[x0, -5]]; let x = x0, y = -5; while (y < HZ) { y += 8 + Math.random() * 10; x += (Math.random() - 0.5) * 16; G.bolt.push([x, Math.min(HZ, y)]); } if (Math.random() < 0.6) setTimeout(() => SFX.boom(), 300); }
  }
  const plume = G.boostM > 0 && !G.air && G.diveT <= 0;
  const rate = (G.v / 60) * (plume ? 3 : 1) * (G.dashT > 0 ? 2 : 1) * (P.lite ? 0.5 : 1);
  if (!G.air && G.diveT <= 0 && Math.random() < rate * dt * 12) {
    const k = plume ? 3 : 1;
    for (let i = 0; i < k; i++) part(G.u - 8, G.y - 1, -G.v * (0.15 + Math.random() * 0.25), -(plume ? 70 + Math.random() * 90 : 20 + Math.random() * 35) * (G.v / 150), 0.35 + Math.random() * 0.35, 0, plume && Math.random() < 0.5 ? 1 : 0.6, P.g * 0.6);
  }
  updParts(dt);
  if (!P.lite && !PRED_SIM) {   // v053: spray blown off the curl, dissolving in the wind or on the water
    const ls = 1.15 + Math.min(0.6, 0.06 * (ST.n - 1)), n = Math.random() < dt * (8 + 2 * ST.n) ? 1 : 0;
    for (let i = 0; i < n; i++) G.spray.push({ u: 22 * ls + Math.random() * 6, y: Y_TOP + 10 * ls + Math.random() * 4, vu: 50 + Math.random() * 90, vy: -30 - Math.random() * 40, t: 0, life: 0.8 + Math.random() * 0.8, r: 0.6 + Math.random() * 1.1 });
    for (const p of G.spray) { p.t += dt; p.vy += 60 * dt; p.u += p.vu * dt; p.y += p.vy * dt; if (p.y > ysAt(Math.max(3, p.u), G.S)) p.t = p.life; }
    G.spray = G.spray.filter(p => p.t < p.life);
  }
  G.trailT -= dt;
  if (!G.air && G.diveT <= 0 && G.trailT <= 0) { G.trail.push({ w: G.u - 8 + G.S, t: 0 }); G.trailT = 0.03; }
  for (const p of G.trail) p.t += dt;
  G.trail = G.trail.filter(p => p.t < 0.8);
  const wT = G.u - (0.46 - 0.24 * heightNorm() + 0.04 * vn) * 480 - (W - 480) * 0.3, yT = Math.max(0, Math.min(34, G.y - 190));
  const wR = G.u - 0.3 * W, yR = G.y - (G.lift || 0) - 12 - H / 2, cm = P.cam === 'today' ? 0 : P.cam === 'mid' ? 0.5 : 1;   // v054: on Robinson — 30 % from the left (look-ahead), centred in height   // v053: three camera modes
  const brlCam = G.barrel && !G.barrel.scene && G.barrel.ph !== 'out';   // v064: the barrel's herald — the camera shows the curl
  const want = brlCam ? Math.min(wT + (wR - wT) * cm, -30) : wT + (wR - wT) * cm;
  G.camU += (want - G.camU) * Math.min(1, 3 * dt);
  const wantY = brlCam ? Math.min(yT + (yR - yT) * cm, Y_TOP - 70) : yT + (yR - yT) * cm;
  G.camY += (wantY - G.camY) * Math.min(1, 4.5 * dt);
  const abs = 60 + G.v;
  G.farX += abs * 0.035 * dt; G.midX += abs * 0.22 * dt; G.nearX += abs * 0.9 * dt;
  let near = null, behind = false;
  for (const m of G.mons) {
    if (m.mode === 'glide' || (m.mode === 'hover' && m.glideT < 0.8)) behind = true;
    if (m.mode === 'come' && m.type !== 'u' && m.u > G.u && m.u - G.u < 150 && (!near || m.u < near.u)) near = m;
  }
  G.cat = G.lipWarn > 0.5 ? 'fear' : behind ? 'back' : near ? (near.type === 'm' || near.type === 'f' ? 'fear' : 'greedy') : 'calm';
}
function celebrate() {
  for (let i = 0; i < 70; i++) { const left = i % 2 === 0, a = left ? -1 + Math.random() * 0.5 : -2.6 + Math.random() * 0.5, v = 120 + Math.random() * 140; part(G.camU + (left ? 0 : W), G.camY + H * 0.9, Math.cos(a) * v, Math.sin(a) * v * 1.3, 1 + Math.random() * 0.8, [13, 0, 16, 5][i % 4], 1, 160, i % 3 === 0); }
}
function updHearts(dt) {
  const bx = G.u, by = G.y - 3;
  for (const d of G.DL) {
    const u = d.w - G.S; if (d.got) continue;
    const y = ysAt(Math.max(3, u), G.S) - d.h;
    if (!d.missed && Math.abs(u - bx) < 9 && Math.abs(y - by) < 10) {
      d.got = true; if (d.mag) { G.magT = 20; G.C.mags = (G.C.mags || 0) + 1; SFX.clink(); float(u, y - 8, 'MAGNET 20 s', '#ff8a8a'); logE({ k: 'magnet' }); continue; }
      G.C.dia++; G.stam++; SFX.clink(); float(u, y - 8, '+1 stamina', '#ffe36a');
      for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28; part(u, y, Math.cos(a) * 60, Math.sin(a) * 60 - 20, 0.6, 16, 1, 0, true); }
      ring(u, y, 2, 18, 0.5, '#ffc21a', true, 1);
    } else if (!d.missed && u < bx - 14) { d.missed = true; G.C.diaMissed++; }
    if (d.missed && u < G.camU - 20) d.got = true;
  }
  G.DL = G.DL.filter(d => !d.got);
  for (const h of G.HL) {
    const u = h.w - G.S;
    if (h.got) continue;
    if (h.th !== undefined) { h.h += (h.th - h.h) * Math.min(1, dt * 14); if (Math.abs(h.th - h.h) < 0.3) { h.h = h.th; h.th = undefined; } }
    const y = ysAt(Math.max(3, u), G.S) - h.h;
    const R = G.magT > 0 ? 10 + G.up.magnet * 1.4 : 0, yb = G.y - (G.lift || 0);   // v052: the magnet works only after catching its item   // v048: his hitbox (5 wide each side, feet to head), Heart Magnet widens it
    if (!h.missed && Math.abs(u - bx) < 5 + R && y > yb - 21 - R && y < yb + 2 + R) {
      h.got = true; G.C.hearts++; G.greenF += (h.big || 1); if (!PRED_SIM && G.T - (G.blubT || 0) > 0.04) { G.blubT = G.T; tone(520 + Math.random() * 120, 1100, 0.05, 'sine', 0.05); }   // v054: a soft blubb
      if (h.crystal) { G.greenF -= 1; G.stam = Math.min(P.stamina, G.stam + 1); float(u, y - 10, '+1 stamina', '#8ff0ff', 13); SFX.find(); }
      else if (h.big) { float(u, y - 10, '+' + h.big + ' 💚', '#7dff6b', 13); SFX.find(); }
      if (h.tease) logE({ k: 'tease', h: Math.round(h.h), tier: G.trick ? G.trick.tier : null, bounces: G.bounces || 0 }); if (G.U.void) G.voidC = Math.min(1, G.voidC + 1 / G.up.voidNeed);   // v046: a heart is a heart
      for (let i = 0; i < (P.lite ? 3 : 8); i++) { const a = Math.random() * 6.28; part(u, y, Math.cos(a) * 40, Math.sin(a) * 40 - 20, 0.4, i % 2 ? 13 : 7, 0.6, 0, true); }
    } else if (!h.missed && u < bx - 14) { h.missed = true; G.C.heartsMissed++; }   // v054: they drift on out of the screen
    if (h.missed && u < G.camU - 20) h.got = true;
  }
  G.HL = G.HL.filter(h => !h.got);
}
// the tortoise's lines during the fight: one bubble at the top of the screen
function speech(dt) {
  if (G.sayLine) { G.sayT -= dt; if (G.sayT <= 0) G.sayLine = null; return; }
  if (G.say.length && G.T > 0.6 && (!G.banner || G.banner.age > 8) && quiet()) { G.sayLine = G.say.shift(); G.sayT = 4 + G.sayLine.length / 9; if (!G.over) SFX.speak(G.sayLine); }
}

// ---------- drawing ----------
function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function E(x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function sx(u) { return u - G.camU; }
function drawTafeln() {   // v062: a driftwood sign on a post, bobbing on the face
  if (!G.tafeln) return; const at = t => t.u - (G.S - t.s) * 0.45; G.tafeln = G.tafeln.filter(t => sx(at(t)) > -160);   // it drifts past him, slower than the water, so it can be read
  for (const t of G.tafeln) { const u = at(t), x = sx(u), y = ysAt(u, G.S) + Math.sin(G.T * 2 + t.s) * 1.2; if (x > W + 160) continue;
    ctx.font = "600 7px 'Fredoka',system-ui"; const w = ctx.measureText(t.txt).width + 10;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(G.T * 1.3 + t.s) * .05);
    ctx.fillStyle = '#6a4a26'; ctx.fillRect(-1, -20, 2, 21);
    ctx.fillStyle = '#a77a43'; ctx.fillRect(-w / 2, -32, w, 13); ctx.fillStyle = '#80592c'; ctx.fillRect(-w / 2, -21, w, 2);
    ctx.fillStyle = '#fff3d6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t.txt, 0, -25.5); ctx.restore(); }
}
const HZ = 122;
let gradCache = {};
function grad(key, make) { return gradCache[key] || (gradCache[key] = make()); }
function drawBack() {
  const oy = -G.camY * 0.4, lk = LOOK;
  ctx.fillStyle = grad('sky', () => { const g = ctx.createLinearGradient(0, 0, 0, 140); g.addColorStop(0, lk.sky[0]); g.addColorStop(0.65, lk.sky[1]); g.addColorStop(1, lk.sky[2]); return g; });
  ctx.save(); ctx.translate(0, oy); ctx.fillRect(0, -40, W, 180);
  const sunX = 395 + (W - 480) * 0.5, sunY = lk.sunY || 33;
  if (lk.sun) {
    const sg = grad('sun', () => { const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34); g.addColorStop(0, 'rgba(255,250,215,.9)'); g.addColorStop(1, 'rgba(255,250,215,0)'); return g; });
    ctx.save(); ctx.translate(sunX, sunY); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill(); ctx.restore();
    E(sunX, sunY, lk.sunY ? 11 : 8, lk.sunY ? 11 : 8, lk.sun);
  }
  if (lk.moon) {   // stars and a thin moon
    ctx.fillStyle = 'rgba(220,230,255,.8)'; for (let i = 0; i < 60; i++) { const x = hash(i + 3) * W, y = hash(i + 91) * 110; if (Math.sin(G.T * 2 + i) > -0.6) ctx.fillRect(x, y, 0.7, 0.7); }
    E(sunX, 34, 9, 9, '#e8ecff'); E(sunX + 3.5, 32, 8, 8, lk.sky[0]);
  }
  if (G.flash > 0 && G.bolt) {   // lightning over the sea
    ctx.globalAlpha = Math.min(1, G.flash * 4); ctx.strokeStyle = '#e8f0ff'; ctx.lineWidth = 1.2; ctx.beginPath();
    G.bolt.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.globalAlpha = 1;
  }
  for (let i = 0; i < 6; i++) {   // soft round clouds
    const per = 620, x = ((i * 113 - G.farX * 0.6) % per + per) % per - 70, y = 18 + hash(i) * 50;
    ctx.fillStyle = lk.cloud; ctx.beginPath(); ctx.ellipse(x + 16, y, 17, 4.2, 0, 0, 7); ctx.ellipse(x + 13, y - 3, 8, 4.4, 0, 0, 7); ctx.ellipse(x + 24, y - 1.6, 6, 3.4, 0, 0, 7); ctx.fill();
  }
  islands(oy);
  if (lk.pages) { for (let i = 0; i < 9; i++) { const per = W + 80, x = ((i * 131 - G.T * (22 + i * 4) - G.farX * 0.8) % per + per) % per - 40, y = 20 + hash(i + 50) * 90 + Math.sin(G.T * 1.3 + i) * 6;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(G.T * 2 + i) * 0.8); ctx.globalAlpha = 0.75; R(-2.4, -3, 4.8, 6, '#f2ecd8'); R(-1.8, -1.8, 3.6, 0.45, '#5a3aa0'); R(-1.8, -0.4, 2.6, 0.45, '#5a3aa0'); ctx.restore(); ctx.globalAlpha = 1; } }
  ctx.restore();
  ctx.fillStyle = grad('sea', () => { const g = ctx.createLinearGradient(0, HZ, 0, HZ + 200); g.addColorStop(0, lk.sea[0]); g.addColorStop(0.2, lk.sea[1]); g.addColorStop(1, lk.sea[2]); return g; });
  ctx.save(); ctx.translate(0, oy); ctx.fillRect(0, HZ, W, Math.max(200, H - HZ + 60));
  { const sp = 2200, x = ((520 - G.farX * 0.7) % sp + sp) % sp - 200, y = HZ + 1; ship(x, y); }   // v062: the wreck
  if (!P.lite && lk.sun) { ctx.fillStyle = '#fffbe0'; for (let i = 0; i < 40; i++) { const gx = sunX + Math.sin(i * 7.1) * 20 * (1 + i / 20), gy = HZ + 3 + i * 1.6; if (Math.sin(G.T * 3 + i * 1.7) > 0.55) ctx.fillRect(gx, gy, 2 + (i % 3), 0.5); } }
  ctx.strokeStyle = '#33424a'; ctx.lineWidth = 0.5;
  for (let i = 0; i < 6; i++) {
    const per = W + 200, gx = ((i * 97 + G.T * (14 + i * 3) + G.midX * 0.2) % per) - 100, gy = 40 + hash(i + 7) * 50 + Math.sin(G.T * 0.8 + i) * 6;
    const f = Math.sin(G.T * 8 + i * 1.3) > 0 ? -1.4 : 0.6;
    ctx.beginPath(); ctx.moveTo(gx - 3, gy + f); ctx.quadraticCurveTo(gx - 1.5, gy - 0.8, gx, gy); ctx.quadraticCurveTo(gx + 1.5, gy - 0.8, gx + 3, gy + f); ctx.stroke();
  }
  const p2 = 90; ctx.lineCap = 'round';
  for (let i = -1; i < W / p2 + 2; i++) {
    const x = i * p2 - (G.midX % p2);
    ctx.strokeStyle = '#3b7fa0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, HZ + 7); ctx.lineTo(x + 50, HZ + 7); ctx.stroke();
    ctx.strokeStyle = '#e9fbff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 8, HZ + 5); ctx.quadraticCurveTo(x + 19, HZ + 3, x + 30, HZ + 5); ctx.stroke();
  }
  if (!P.lite) { ctx.fillStyle = 'rgba(143,208,220,.4)'; for (let i = 0; i < 30; i++) { const y = 150 + (i * 23) % Math.max(115, H - 155), len = 6 + (i * 7) % 14; const x = ((i * 61 - G.nearX * (0.6 + 0.4 * (y - 150) / 115)) % (W + 40) + W + 40) % (W + 40) - 20; ctx.fillRect(x, y, len, 0.5); } }
  ctx.restore();
}
function islands(oy) {
  const lk = LOOK, per = 900;
  for (let k = -1; k < 2; k++) {
    const x0 = ((-G.farX) % per + per) % per - 200 + k * per;
    ctx.globalAlpha = 0.45; isleShape(((-G.farX * 0.5) % 1400 + 1400) % 1400 - 300 + k * 1400, HZ, 0.6, lk.isl[0]); ctx.globalAlpha = 1;
    isleShape(x0, HZ, 1, lk.isl[0]);
  }
}
function isleShape(x, y, s, col) {   // the island on the horizon: Fire Mountain, a long green back, three palms
  const lk = LOOK;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 20 * s, y - 10 * s, x + 30 * s, y - 23 * s); ctx.lineTo(x + 37 * s, y - 24 * s); ctx.quadraticCurveTo(x + 50 * s, y - 10 * s, x + 70 * s, y - 6 * s);
  ctx.bezierCurveTo(x + 110 * s, y - 12 * s, x + 140 * s, y - 2 * s, x + 165 * s, y - 7 * s); ctx.quadraticCurveTo(x + 175 * s, y - 2 * s, x + 182 * s, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(150,140,130,.5)'; E(x + 34 * s, y - 29 * s, 3 * s, 2.2 * s, 'rgba(160,150,140,.45)'); E(x + 37 * s, y - 34 * s, 4 * s, 2.6 * s, 'rgba(170,160,150,.35)');
  ctx.strokeStyle = lk.isl[2]; ctx.lineWidth = 0.9 * s; ctx.lineCap = 'round';
  for (const px of [72, 98, 128]) {
    const bx = x + px * s, by = y - 8 * s, tx = bx + 1.5 * s, ty = by - 9 * s;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 0.4 * s, by - 5 * s, tx, ty); ctx.stroke();
    ctx.beginPath(); for (const a of [-2.8, -2.2, -1.2, -0.4]) { ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * 3 * s, ty + Math.sin(a) * 2 * s - 1 * s, tx + Math.cos(a) * 5 * s, ty + Math.sin(a) * 2 * s + 1.5 * s); } ctx.stroke();
  }
}
function ship(x, y) {   // v062: the wrecked yacht on the horizon — listing, half sunk, a snapped mast and a torn sail (Jasper came from it)
  ctx.save(); ctx.beginPath(); ctx.rect(x - 10, y - 30, 44, 30.6); ctx.clip(); ctx.translate(x + 9, y + 3); ctx.rotate(-.5);
  ctx.fillStyle = '#3c4f5a'; ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(9, -2); ctx.lineTo(6, 1); ctx.lineTo(-6.5, 1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3c4f5a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-2, -9); ctx.lineTo(3.5, -12.5); ctx.moveTo(3.5, -2); ctx.lineTo(3.5, -6.5); ctx.stroke();
  ctx.fillStyle = 'rgba(190,196,190,.75)'; ctx.beginPath(); ctx.moveTo(-2.4, -8.6); ctx.lineTo(-2.4, -3); ctx.lineTo(-5.5, -3.4); ctx.lineTo(-4.2, -5.6); ctx.lineTo(-6, -6.4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-1.6, -8.4); ctx.lineTo(1.4, -6.2); ctx.lineTo(.4, -5); ctx.lineTo(1.8, -3.4); ctx.lineTo(-1.6, -3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(232,236,234,.7)'; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(3.5, -12.5); ctx.quadraticCurveTo(5.5, -9, 4.2, -6.5); ctx.stroke();   // a rag of sail on the snapped top
  ctx.restore();
  ctx.fillStyle = 'rgba(240,248,248,.55)'; ctx.fillRect(x - 1, y + .4, 22, .8);   // the sea breaking on her
  ctx.fillStyle = '#4a3a2a'; ctx.fillRect(x + 24, y + .2, 4, .9); ctx.fillRect(x - 7, y + .5, 3, .8);   // planks drifting off
}
function drawWave() {
  const lk = LOOK;
  ctx.fillStyle = grad('face', () => { const g = ctx.createLinearGradient(0, Y_TOP, 0, H + 60); g.addColorStop(0, lk.face[0]); g.addColorStop(0.2, lk.face[1]); g.addColorStop(0.55, lk.face[2]); g.addColorStop(1, lk.face[3]); return g; });
  const x0 = Math.max(0, sx(0)), step = 2;
  ctx.beginPath(); ctx.moveTo(x0, H + G.camY + 40);
  for (let x = x0; x <= W + step; x += step) ctx.lineTo(x, ysAt(x + G.camU, G.S));
  ctx.lineTo(W + step, H + G.camY + 40); ctx.closePath(); ctx.fill();
  // v048: two layers in the water — the middle one carries the small waves half a period shifted, the deep blue one runs ahead of the big swings; they never cross
  const rip = u => ripA(u + G.S) * Math.sin(ripPh(u + G.S)), yb = H + G.camY + 40, ymid = [], ydeep = [];
  for (let x = x0; x <= W + step; x += step) { const u = x + G.camU, ys = ysAt(u, G.S), ym = ys + 2 * ripA(u + G.S) + 14 - 2 * rip(u); ymid.push(ym); ydeep.push(Math.max(ysAt(u + 70, G.S) - rip(u + 70) + 95, ym + 18)); }
  for (const [ys, col, al] of [[ymid, lk.face[2], 0.55], [ydeep, lk.deep || '#12407a', 0.55]]) {
    ctx.globalAlpha = al; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, yb);
    ys.forEach((y, i) => ctx.lineTo(x0 + i * step, y)); ctx.lineTo(W + step, yb); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // shine near the crest: a band under the surface that fades down the face
  const xs = sx(0), band = ctx.createLinearGradient(xs, 0, xs + 220, 0); band.addColorStop(0, 'rgba(' + lk.glow + ',.24)'); band.addColorStop(1, 'rgba(' + lk.glow + ',0)');
  ctx.fillStyle = band; ctx.beginPath();
  for (let x = x0; x <= Math.min(W, xs + 230); x += step) ctx.lineTo(x, ysAt(x + G.camU, G.S) + 1);
  for (let x = Math.min(W, xs + 230); x >= x0; x -= step) { const u = x + G.camU; ctx.lineTo(x, ysAt(u, G.S) + 2 + 20 * Math.exp(-u / 70)); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = lk.line; ctx.lineWidth = 0.9; ctx.beginPath();
  for (let x = x0; x <= W + step; x += step) { const y = ysAt(x + G.camU, G.S); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  if (!P.lite) {
    const sp = 7, a = Math.floor((G.camU + G.S - 20) / sp), b = Math.ceil((G.camU + G.S + W + 20) / sp);
    const len = Math.min(16, 2 + G.v * 0.045);
    for (let k = a; k <= b; k++) {
      const w = k * sp + hash(k) * sp, u = w - G.S;
      if (u < 2) continue;
      const d = 2 + Math.pow(hash(k + 0.37), 1.6) * 120, y = ysAt(u, G.S) + d;
      if (y > H + G.camY) continue;
      const al = Math.max(0.12, 0.6 - d / 200);
      if (d < 6) R(sx(u), y, len * 0.5 + 1, 0.5, 'rgba(255,255,255,0.85)');
      else R(sx(u), y, len * (0.4 + hash(k + 1.7) * 0.6), 0.5, 'rgba(' + lk.streak + ',' + al.toFixed(3) + ')');
    }
  }
}
function drawLip() {   // v052: a rolling, foaming lip — whitewater spilling down, an overhanging curl with spray
  const xl = sx(0), lk = LOOK;
  if (xl < -140) return;
  if (G.lipWarn > 0) { ctx.globalAlpha = 0.25 * G.lipWarn + 0.1 * G.lipWarn * Math.sin(G.T * 20); E(xl + 14, Y_TOP + 1, 24, 9, '#ffffff'); ctx.globalAlpha = 1; }
  const t = G.T, x1 = Math.max(-2, xl - 320), step = 2, bot = H + G.camY + 40;
  const top = x => { const k = x + G.camU, dist = xl - x; return Y_TOP + 6 + Math.min(40, dist * 0.12) + 5 * Math.sin(k * 0.21 + t * 6) + 3 * Math.sin(k * 0.07 - t * 3.3); };
  const edge = y => xl + Math.min(26, Math.max(0, y - Y_TOP - 4) * 0.13) + 3 * Math.sin(y * 0.09 + t * 4.5) + 1.8 * Math.sin(y * 0.033 - t * 2.2);   // the foam front spills forward down the face
  { const lg = ctx.createLinearGradient(0, Y_TOP, 0, H + G.camY); lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.3, lk.lip); lg.addColorStop(1, lk.curl); ctx.fillStyle = lg; }
  ctx.beginPath(); ctx.moveTo(x1, bot);
  for (let x = x1; x <= xl; x += step) ctx.lineTo(x, top(x));
  for (let y = top(xl); y <= bot; y += 4) ctx.lineTo(edge(y), y);
  ctx.lineTo(x1, bot); ctx.closePath(); ctx.fill();
  if (!P.lite) {   // puffs along the foam front and in the whitewater
    for (let y = Y_TOP + 8, i = 0; y < bot; y += 7, i++) { const r = (3.2 + 2.2 * Math.sin(i * 1.7 + t * 3)) * (1 + Math.min(0.5, 0.05 * (ST.n - 1))), x = edge(y) - 1 + Math.sin(i * 2.3 + t * 5) * 1.5;
      ctx.globalAlpha = 0.85; E(x, y, r, r * 0.8, '#ffffff'); ctx.globalAlpha = 0.35; E(x + r * 0.7, y + r * 0.4, r * 0.7, r * 0.5, lk.foam); }
    ctx.globalAlpha = 0.55; ctx.fillStyle = lk.foam;
    for (let j = 0; j < 46; j++) { const a = (j * 53.7) % 1, b = (j * 31.3 + t * 0.35) % 1, x = xl - 8 - a * 300, y = top(Math.max(x1, x)) + 4 + b * (bot - Y_TOP); if (x > x1) { ctx.beginPath(); ctx.arc(x, y, 0.8 + (j % 3) * 0.5, 0, 7); ctx.fill(); } }
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.3; ctx.beginPath();
  for (let x = x1; x <= xl; x += step) x === x1 ? ctx.moveTo(x, top(x) - 0.4) : ctx.lineTo(x, top(x) - 0.4);
  ctx.stroke();
  // the curl: thick at the crest, thrown forward over the face, thin at the tip, with spray — v053: a bit bigger, growing with the stage
  const ls = (1.15 + Math.min(0.6, 0.06 * (ST.n - 1))) * brlLipK(); ctx.save(); ctx.translate(xl, Y_TOP); ctx.scale(ls, ls); ctx.translate(-xl, -Y_TOP);
  const ph = Math.sin(t * 2.6), tipX = xl + 24 + 2 * ph, tipY = Y_TOP + 15 + 1.5 * ph;
  { const cg = ctx.createLinearGradient(xl - 10, Y_TOP - 10, tipX, tipY); cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.45, lk.lip); cg.addColorStop(1, lk.curl); ctx.fillStyle = cg; }
  ctx.beginPath(); ctx.moveTo(xl - 16, Y_TOP + 4);
  ctx.bezierCurveTo(xl - 10, Y_TOP - 13, xl + 14, Y_TOP - 12, tipX, tipY);
  ctx.bezierCurveTo(xl + 15, Y_TOP + 1, xl + 6, Y_TOP + 0.5, xl + 1, Y_TOP + 9);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.35; ctx.fillStyle = lk.curl; ctx.beginPath(); ctx.moveTo(xl + 1, Y_TOP + 9); ctx.bezierCurveTo(xl + 7, Y_TOP + 2, xl + 15, Y_TOP + 3, tipX - 2, tipY + 1); ctx.lineTo(xl + 6, Y_TOP + 14); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(xl - 12, Y_TOP - 1); ctx.bezierCurveTo(xl - 4, Y_TOP - 11, xl + 14, Y_TOP - 9, tipX - 1, tipY - 1.5); ctx.stroke();
  if (!P.lite) { ctx.fillStyle = '#ffffff'; for (let j = 0; j < 9; j++) { const k = ((t * 1.7 + j * 0.37) % 1), x = tipX + k * 10 + Math.sin(j * 3.1) * 3, y = tipY + k * 9 - 4 * Math.sin(k * Math.PI); ctx.globalAlpha = 0.8 * (1 - k); ctx.beginPath(); ctx.arc(x, y, 0.9 * (1 - k * 0.5), 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  ctx.restore();
  ctx.fillStyle = '#ffffff';   // v053: spray blown forward off the curl
  for (const p of G.spray) { ctx.globalAlpha = 0.85 * (1 - p.t / p.life); ctx.beginPath(); ctx.arc(sx(p.u), p.y, p.r * (1 + p.t), 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (!P.lite) { const ls2 = (1.15 + Math.min(0.6, 0.06 * (ST.n - 1))) * brlLipK(); for (let j = 0; j < 6 + ST.n; j++) { const a = (j * 0.61 + t * 0.9) % 1, x = xl - 6 + Math.sin(j * 2.1 + t * 3) * 10 * ls2, y = Y_TOP - 4 * ls2 + a * 20 * ls2; ctx.globalAlpha = 0.6 * (1 - a); E(x, y, (2 + (j % 3)) * ls2 * (1 - a * 0.5), (1.6 + (j % 2)) * ls2, '#ffffff'); } ctx.globalAlpha = 1; }   // foam boiling round the crest
}
function drawTrail() {
  ctx.fillStyle = '#ffffff';
  for (const p of G.trail) { const u = p.w - G.S; if (u < 2) continue; ctx.globalAlpha = 0.8 * (1 - p.t / 0.8); ctx.fillRect(sx(u), ysAt(u, G.S) + 0.5, 3, 0.6); }
  ctx.globalAlpha = 1;
}
function drawMon(m) {
  const fr = (Math.floor(m.ph / 3) & 1); let [x, y] = mPos(m);
  let img, s;
  if (m.type === 'B') { img = (m.flash > 0 ? BOSS_FLASH : BOSS_SPR)[m.rank || 0][Math.floor(G.T * 4) & 1]; s = { w: 22, h: 28, ox: 11, oy: 26.5 }; }
  else if (m.type === 'c') { img = m.flash > 0 ? CRAB_FLASH[fr] : CRAB_SPR[fr]; s = { w: 28, h: 20, ox: 14, oy: 18.5 }; }
  else { s = SPR[m.type]; img = m.flash > 0 ? s.flash[fr] : s.img[fr]; }
  if (m.rise > 0) { const k = m.rise / 0.6; ctx.save(); ctx.globalAlpha = 1 - k * 0.7; ctx.drawImage(img, sx(x) - s.ox, y - s.oy + 12 * k, s.w, s.h); ctx.restore(); if (Math.random() < 0.4) part(x + (Math.random() - 0.5) * 16, y, (Math.random() - 0.5) * 30, -40 - Math.random() * 30, 0.4, 0, 0.6, P.g * 0.6); return; }   // the next mussel surfaces
  if ((m.type === 't' || m.type === 'l' || m.type === 'w') && m.off < 2 && (m.mode === 'come' || m.mode === 'swarm')) y += s.h * 0.25;   // v053: a quarter under water, three quarters up
  const flip = m.mode === 'swarm' || m.mode === 'suck' || m.mode === 'spill' || m.mode === 'hover' || m.mode === 'glide';   // v052: followers swim his way
  if ((m.mode === 'spill' || m.mode === 'suck') && m.type !== 'f') {   // v053: little glide fins while they fly
    const fl = Math.sin(G.T * 18 + m.ph) * 2, X = sx(x), Y = y - s.h * 0.45;
    ctx.fillStyle = 'rgba(20,30,24,.75)'; ctx.strokeStyle = 'rgba(120,255,160,.6)'; ctx.lineWidth = 0.4;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + sd * (s.w * 0.55), Y - 3 - fl * sd * 0.3); ctx.lineTo(X + sd * (s.w * 0.35), Y + 2.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  if (m.mode === 'spill' || m.mode === 'wash' || m.mode === 'glide') {
    ctx.save(); ctx.translate(sx(x), y); ctx.rotate(m.mode === 'glide' ? Math.atan2(m.vy, m.vx) * 0.4 : m.rot); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -s.ox, -s.oy, s.w, s.h); ctx.restore();
  } else if (flip) { ctx.save(); ctx.translate(sx(x), y); ctx.scale(-1, 1); ctx.drawImage(img, -s.ox, -s.oy, s.w, s.h); ctx.restore(); }
  else ctx.drawImage(img, sx(x) - s.ox, y - s.oy, s.w, s.h);
}
function drawMonsters() {
  ctx.globalAlpha = 0.55;
  for (const m of G.mons) if (m.type === 'u' && (m.mode === 'come' || (m.mode === 'swarm' && m.off < 3))) drawMon(m);
  ctx.globalAlpha = 1;
  for (const m of G.mons) if (m.mode === 'spill' && m.t > 0.3) {
    const k = Math.min(1, (m.t - 0.3) / m.T), x = sx(m.landU), y = ysAt(Math.max(3, m.landU), G.S);
    ctx.globalAlpha = 0.15 + 0.45 * k; E(x, y, 3 + 4 * k, 1, '#08202a'); ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = 0.85;
  for (const m of G.mons) if ((m.mode === 'swarm' || m.mode === 'suck') && !(m.type === 'u' && m.off < 3)) drawMon(m);
  ctx.globalAlpha = 1;
  for (const m of G.mons) if ((m.mode === 'come' || (m.mode === 'dead' && m.t < 0.15)) && m.type !== 'u' && m.type !== 'f' && m.type !== 'B' && m.type !== 'c') { ctx.globalAlpha = m.ramped && m.mode === 'come' ? 0.6 : 1; drawMon(m); }
  ctx.globalAlpha = 1;
  for (const m of G.mons) if (m.burn > 0 && m.mode !== 'dead') { const [x, y] = mPos(m); burnFlames(sx(x), y - 4, 1); }   // v064: what the flame has caught
}
function drawFlyers() {
  for (const m of G.mons) if (m.type === 'f' && (m.mode === 'come' || m.mode === 'hover' || m.mode === 'glide')) drawMon(m);
  for (const m of G.mons) if (m.mode === 'spill' || m.mode === 'wash') { ctx.globalAlpha = m.mode === 'wash' ? Math.max(0, 1 - m.t / 1.6) : 1; drawMon(m); }
  ctx.globalAlpha = 1;
}

// Robinson in the beach style: white shirt, red tie, grey trousers rolled to the knee, round glasses
const ROB = { skin: '#d9a27a', shirt: '#f4f1ea', shade: '#d8d2c4', pants: '#5d6470', tie: '#8e2a2a', hair: '#4a3324', ink: '#2b1d12' };
function drawMagnet() {   // v052: the magnet's reach around him while it works
  if (!(G.magT > 0)) return;
  const R = 10 + G.up.magnet * 1.4, x = sx(G.u), y = G.y - (G.lift || 0) - 9;
  ctx.globalAlpha = Math.min(1, G.magT) * (0.6 + 0.2 * Math.sin(G.T * 5)); ctx.strokeStyle = '#ff6a6a'; ctx.lineWidth = 1.2; ctx.setLineDash([2, 2]);
  ctx.beginPath(); ctx.ellipse(x, y, R + 5, R + 12, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  txt('🧲 ' + Math.ceil(G.magT) + 's', x, y - R - 15, '#ffb0b0', 'center', 6.5);
}
const SH = { a: document.createElement('canvas'), b: document.createElement('canvas') };
function drawShield(body, x, y) {   // v064: a thin white-turquoise outline round his body (board and cat included) while the A leap and the dive make him untouchable
  const S = 76, px = Math.ceil(S * SC); if (SH.a.width !== px) { SH.a.width = SH.a.height = SH.b.width = SH.b.height = px; }
  const a = SH.a.getContext('2d'), b = SH.b.getContext('2d');
  a.setTransform(1, 0, 0, 1, 0, 0); a.globalAlpha = 1; a.clearRect(0, 0, px, px); a.setTransform(SC, 0, 0, SC, px / 2, px / 2);
  const keep = ctx; ctx = a; try { body(0, 0); } finally { ctx = keep; }
  b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, px, px); b.drawImage(SH.a, 0, 0); b.globalCompositeOperation = 'source-in'; b.fillStyle = '#b4fff2'; b.fillRect(0, 0, px, px); b.globalCompositeOperation = 'source-over';
  const pulse = 0.5 + 0.5 * Math.sin(G.T * 12), x0 = x - S / 2, y0 = y - S / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [r, al] of [[3.4, 0.18 + 0.08 * pulse], [2.2, 0.3 + 0.1 * pulse], [1.2, 0.55 + 0.15 * pulse]]) { ctx.globalAlpha = al; for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; ctx.drawImage(SH.b, x0 + Math.cos(an) * r, y0 + Math.sin(an) * r, S, S); } }
  ctx.restore();
}
function drawRider() {
  drawMagnet(); drawGlider();
  if (G.flameOn) drawFlame(sx(G.flameX), G.flameY, G.flameDir || 0, G.flameT0);   // v064: the new fire
  const ov = G.riderOv, x = ov ? ov.x : sx(G.u), y = ov ? ov.y : G.y - (G.lift || 0);   // v064: in the barrel the drum places him
  let ang = Math.atan(slopeAt(G.u, G.S)) - (G.ramp ? 0.35 : 0);
  if (G.air) ang = Math.atan2(G.vy, Math.max(60, G.v * 0.6)) * 0.6;
  if (ov) ang = ov.ang;
  const st = inputState();
  const tr = G.air && G.trick ? G.trick.tier : -1;
  const pose = ov ? ov.pose : (G.stumble > 0 || G.wipe > 0) ? 'stumble' : G.diveT > 0 ? 'dive' : G.dashT > 0 ? 'dash' : tr === 1 ? 'grab' : G.air ? 'air' : st === 'brake' ? 'brake' : G.boostM > 0 ? 'fast' : 'ride';
  const shield = ov ? ov.shield : !!(G.cyc && G.cyc.ph === 'dash');   // v064: the A leap and dive: untouchable, and now you can see it
  const body = (bx, by) => {
    ctx.save();
    ctx.translate(bx, by); ctx.scale(1.2, 1.2);
    ctx.rotate(ang + (pose === 'stumble' ? Math.sin(G.T * 30) * 0.15 + (G.wipe > 0 ? 0.6 : 0) : 0));
    if (tr === 2) { const k = Math.min(1, G.trick.t / (G.trick.dur * 0.85)), e = k * k * (3 - 2 * k); ctx.translate(0, -9); ctx.rotate(-Math.PI * 2 * e); ctx.translate(0, 9); }   // backflip
    if (G.inv > 0) ctx.globalAlpha = 0.5 + 0.5 * Math.sin(G.T * 40);
    if (G.hurtT > 0 && Math.sin(G.T * 60) > 0) ctx.globalAlpha *= 0.4;
    if (pose === 'dive') ctx.globalAlpha *= 0.55;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // the board: a plank of driftwood with a red stripe
    ctx.fillStyle = '#e3c590'; ctx.strokeStyle = '#a8834f'; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(-9.5, -1); ctx.quadraticCurveTo(-9.5, -2.3, -7.5, -2.3); ctx.lineTo(8, -2.3); ctx.quadraticCurveTo(10.6, -2.1, 10.2, -1); ctx.quadraticCurveTo(9.6, 0, 7.5, 0); ctx.lineTo(-8, 0); ctx.quadraticCurveTo(-9.5, 0, -9.5, -1); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = ROB.tie; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(-7.5, -1.1); ctx.lineTo(8.6, -1.1); ctx.stroke();
    if (CFG.cat && G.kat.mode === 'back') { ctx.save(); ctx.scale(0.85, 0.85); catShape(-12.6, -4.4, 1, 'fear', G.kat.wet > 0); ctx.restore(); }   // soaked, claws in the back of the board
    if (pose !== 'dash' && pose !== 'dive') ctx.rotate(-ang * 0.45);
    if (pose === 'dash' || pose === 'dive') {
      stroke(ROB.pants, 2.2, [[-7.5, -3.4], [-3, -3.8]]);
      ctx.fillStyle = ROB.shirt; ctx.beginPath(); ctx.ellipse(1, -4, 4.2, 1.9, -0.05, 0, 7); ctx.fill();
      stroke(ROB.tie, 0.8, [[2.2, -3], [4, -2.6]]);
      stroke(ROB.skin, 1.3, [[4, -4.2], [8.4, -2.8]]);
      head(6.6, -5.6, 0.9); drawCat(-1.6, -7.2, 0.85);
    } else {
      const crouch = pose === 'fast' ? 3 : pose === 'air' ? 4 : pose === 'grab' ? 5.5 : pose === 'brake' ? 1 : 2;
      const lean = pose === 'fast' ? 2 : pose === 'brake' ? -2 : pose === 'grab' ? 2.5 : 0;
      const legH = 7.5 - crouch, hip = -2.2 - legH, ty = hip - 7;
      for (const s of [-1, 1]) {   // legs: grey trousers to the knee, bare shins
        const kx = s * 2.6 + lean * 0.35, ky = hip + legH * 0.5;
        stroke(ROB.pants, 2.3, [[s * 1.3 + lean * 0.7, hip], [kx, ky]]);
        stroke(ROB.skin, 1.5, [[kx, ky], [s * 3.2, -2.3]]);
      }
      ctx.fillStyle = ROB.shirt; ctx.beginPath();
      ctx.moveTo(-3 + lean, ty); ctx.lineTo(3 + lean, ty); ctx.lineTo(3.3 + lean * 0.8, hip + 0.6); ctx.lineTo(1.4 + lean * 0.8, hip + 1.1); ctx.lineTo(-0.2 + lean * 0.8, hip + 0.5); ctx.lineTo(-3.3 + lean * 0.8, hip + 0.9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ROB.shade; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(-2.6 + lean * 0.9, hip - 0.4); ctx.lineTo(2.7 + lean * 0.9, hip - 0.6); ctx.stroke();
      ctx.fillStyle = ROB.tie; ctx.beginPath(); ctx.moveTo(lean + 0.1, ty + 0.4); ctx.lineTo(lean + 0.9, ty + 0.9); ctx.lineTo(lean + 0.7, ty + 5); ctx.lineTo(lean + 0.2, ty + 5.7); ctx.lineTo(lean - 0.3, ty + 5); ctx.lineTo(lean - 0.5, ty + 0.9); ctx.closePath(); ctx.fill();
      const hands = pose === 'grab' ? [[-6.4, ty - 1], [8.6, -2.8]] : pose === 'brake' ? [[-6, ty - 2], [5.6, ty - 3]] : pose === 'air' ? [[-6.2, ty + 1], [5.8, ty - 1.4]] : pose === 'fast' ? [[-5.4, ty + 4], [6.6, ty + 2.2]] : [[-6, ty + 3], [5.8, ty + 2]];
      stroke(ROB.skin, 1.35, [[-2.6 + lean, ty + 1], hands[0]]);
      stroke(ROB.skin, 1.35, [[2.6 + lean, ty + 1], hands[1]]);
      const hx = 0.4 + lean + (pose === 'fast' ? 1 : 0);
      head(hx, ty - 2.8, 1);
      drawCat(hx - 2.4, ty - 6.6, 1);
    }
    ctx.restore();
  };
  if (shield) drawShield(body, x, y);
  body(x, y);
  ctx.globalAlpha = 1;
}
function stroke(col, w, pts) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
function head(x, y, s) {
  E(x, y, 2.6 * s, 2.75 * s, ROB.skin);
  ctx.fillStyle = ROB.hair; ctx.beginPath(); ctx.ellipse(x - 0.3 * s, y - 1 * s, 2.85 * s, 1.75 * s, -0.2, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 2.6 * s, y - 1.4 * s); ctx.lineTo(x - 3.4 * s, y + 0.1 * s); ctx.lineTo(x - 2 * s, y - 0.6 * s); ctx.fill();
  ctx.strokeStyle = ROB.ink; ctx.lineWidth = 0.32 * s;
  ctx.beginPath(); ctx.arc(x + 1.5 * s, y + 0.1 * s, 0.75 * s, 0, 7); ctx.moveTo(x + 0.15 * s, y + 0.1 * s); ctx.arc(x - 0.1 * s, y + 0.1 * s, 0.6 * s, 0, 7); ctx.stroke();
  E(x + 0.6 * s, y + 1.9 * s, 1.3 * s, 0.5 * s, 'rgba(90,60,40,.35)');
}
// the cat: orange, beach-style, perched on his head as an early warning (her mood = what is coming)
function drawCat(x, y, s) {
  if (!CFG.cat || G.kat.mode !== 'head') return;
  catShape(x, y, s, G.cat, false);
}
function catShape(x, y, s, mood, wet) {
  const o = wet ? '#b8611f' : '#e07b2e', d = '#8f4a12';
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const wag = mood === 'greedy' ? Math.sin(G.T * 18) * 0.8 : Math.sin(G.T * 2) * 0.4;
  ctx.strokeStyle = o; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0.4, 2.2); ctx.quadraticCurveTo(-1.8, 1.6 + wag, -2.2, mood === 'fear' ? 3 : -0.4 + wag); ctx.stroke();
  E(2.6, 2.4, 2.6, 1.3, o);
  ctx.strokeStyle = d; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(1.8, 1.3); ctx.lineTo(1.6, 2.4); ctx.moveTo(2.8, 1.2); ctx.lineTo(2.7, 2.3); ctx.stroke();
  const hx = mood === 'back' ? 3.6 : 4.6, hy = mood === 'fear' ? 2 : 1.2;
  E(hx, hy, 1.45, 1.3, o);
  ctx.fillStyle = o; const ears = mood === 'fear' ? 0.6 : 0;
  ctx.beginPath(); ctx.moveTo(hx - 1.2, hy - 0.5); ctx.lineTo(hx - 1.1 - ears, hy - 1.9 + ears); ctx.lineTo(hx - 0.2, hy - 1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 0.2, hy - 1); ctx.lineTo(hx + 1.1 + ears, hy - 1.9 + ears); ctx.lineTo(hx + 1.2, hy - 0.5); ctx.fill();
  if (mood === 'back') { E(hx - 0.7, hy - 0.1, 0.32, 0.36, '#c6ff63'); }
  else if (mood === 'greedy') { E(hx - 0.3, hy - 0.1, 0.3, 0.45, '#c6ff63'); E(hx + 0.7, hy - 0.1, 0.3, 0.45, '#c6ff63'); }
  else { const ey = mood === 'fear' ? 0.45 : 0.3; E(hx - 0.3, hy - 0.1, 0.28, ey, '#2b1d12'); E(hx + 0.7, hy - 0.1, 0.28, ey, '#2b1d12'); }
  E(hx + 0.25, hy + 0.55, 0.22, 0.15, '#ff9fb0');
  ctx.restore();
}
function drawCatWorld() {   // the cat off his head: leaping, swimming back, or on her own board in his wake
  const k = G.kat; if (k.mode === 'head' || k.mode === 'away' || k.mode === 'back') return;
  const x = sx(k.x);
  if (k.mode === 'board') {
    const y = k.y, a = Math.atan(slopeAt(Math.max(3, k.u), G.S));
    ctx.globalAlpha = 0.35; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 4, y + 0.6); ctx.lineTo(x - 18, y + 1.5); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = '#8a6438'; ctx.beginPath(); ctx.roundRect(-5, -1.2, 10, 1.4, 0.7); ctx.fill();
    catShape(-3.4, -4.6, 0.95, G.cat, k.wet > 0); ctx.restore();
    return;
  }
  ctx.save(); ctx.translate(x, k.y); ctx.rotate(k.mode === 'leap' ? (k.ang || 0) : 0);
  if (k.mode === 'swim') { ctx.globalAlpha = 0.7; catShape(-3, -2.2, 0.9, 'fear', true); }
  else { ctx.scale(1.15, 0.85); catShape(-3, -2.4, 1, 'greedy', false); }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawShots() {
  for (const s of G.shots) { ctx.save(); ctx.translate(sx(s.x), s.y); ctx.rotate(s.ang); ctx.drawImage(STAMP_SPR, -3, -3.5, 6, 7); ctx.restore(); }
}
function drawParts(add) {
  let last = -1;
  for (let i = 0; i < PT.n; i++) {
    if (PT.add[i] !== add) continue;
    const a = 1 - PT.t[i] / PT.life[i];
    ctx.globalAlpha = a > 0 ? a : 0;
    if (PT.c[i] !== last) { last = PT.c[i]; ctx.fillStyle = PCOL[last]; }
    const z = PT.sz[i]; ctx.fillRect(sx(PT.x[i]) - z / 2, PT.y[i] - z / 2, z, z);
  }
  ctx.globalAlpha = 1;
}
function drawFx(add) {
  for (const f of G.fx) {
    if (!!f.add !== add) continue;
    const k = f.t / f.life;
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = f.lw;
    ctx.beginPath(); ctx.arc(sx(f.x), f.y, f.r0 + (f.r1 - f.r0) * k, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawBolts() {
  for (const b of G.bolts) {
    const a = 1 - b.t / b.life;
    const pal = b.blue ? [['#3aa8ff', 1.5, 0.5 * a], ['#bfe8ff', 0.75, 0.9 * a], ['#ffffff', 0.4, a]] : [['#2cff9a', 2, 0.35 * a], ['#c6ff63', 1, 0.8 * a], ['#ffffff', 0.5, a]];
    for (const [col, lw, al] of pal) {
      ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath();
      b.pts.main.forEach((p, i) => i ? ctx.lineTo(sx(p[0]), p[1]) : ctx.moveTo(sx(p[0]), p[1]));
      for (const br of b.pts.br) { ctx.moveTo(sx(br[0][0]), br[0][1]); for (let i = 1; i < br.length; i++) ctx.lineTo(sx(br[i][0]), br[i][1]); }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
function drawFlood() {
  const f = G.flood; if (!f) return;
  const R2 = 170 * Math.min(1, f.t / 0.8), a = Math.max(0, 1 - f.t / 0.9);
  for (const [lw, col, al] of [[10, '#2cff9a', 0.06 * a], [4, '#7dffb0', 0.08 * a]]) {
    ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.ellipse(sx(f.x), f.y, R2, R2 * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawBossStuff() {
  for (const b of [G.boss, G.elite]) {
    if (!b || b.mode !== 'boss') continue;
    const x = sx(b.u), y = ysAt(b.u, G.S);
    if (b.tele > 0) { ctx.globalAlpha = 0.5 + 0.4 * Math.sin(G.T * 40); ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 12, 16, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; txt('!', x, y - 30, '#ff3a3a', 'center', 12); }
    if (b.open > 0) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(G.T * 20); E(x, y - 13, 13, 15, '#ffe36a'); ctx.globalAlpha = 1; }
    drawMon(b);
  }
  for (const s of G.shocks) {
    const x = sx(s.x), y = ysAt(Math.max(3, s.x), G.S);
    ctx.fillStyle = '#9a6cff'; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.quadraticCurveTo(x, y - 12, x + 7, y); ctx.fill();
    ctx.strokeStyle = '#e8dcff'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 4.6, y - 4); ctx.quadraticCurveTo(x, y - 8, x + 4.6, y - 4); ctx.stroke();
  }
  for (const p of G.pages) {
    ctx.save(); ctx.translate(sx(p.x), p.y); ctx.rotate(p.ang); R(-2.5, -3, 5, 6, '#f2ecd8'); R(-2, -2, 4, 0.5, '#5a3aa0'); R(-2, -0.5, 3, 0.5, '#5a3aa0'); R(-2, 1, 3.5, 0.5, '#c9303a'); ctx.restore();
  }
  if (G.sev) {   // the Severance wave: a violet wall over the whole face
    const x = sx(G.sev.x);
    const g = ctx.createLinearGradient(x - 14, 0, x + 10, 0); g.addColorStop(0, 'rgba(154,108,255,0)'); g.addColorStop(0.6, 'rgba(154,108,255,.75)'); g.addColorStop(1, 'rgba(232,220,255,.95)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 14, Y_TOP - 10);
    for (let yy = Y_TOP - 10; yy < H + G.camY + 40; yy += 6) ctx.lineTo(x + 8 + Math.sin(yy * 0.2 + G.T * 20) * 2, yy);
    ctx.lineTo(x - 14, H + G.camY + 40); ctx.closePath(); ctx.fill();
  }
  if (G.final && G.final.warn > 0) {
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(G.T * 22); ctx.fillStyle = '#ff5a46';
    ctx.fillRect(G.camU * 0 + W - 6, G.camY, 6, H); ctx.globalAlpha = 1;
    txt('⚠ SEVERANCE — jump or dive!', W / 2, G.camY + 70, '#ffb0a0', 'center', 11);
  }
}
function sign(x, y, label, col, k, glow, cap) {   // a floating sign on a little buoy; k = the window ring (0..1)
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(G.T * 2.2 + x) * 0.06); if (cap === 'HOLD') ctx.scale(1.7, 1.7);   // v061: HOLD must be seen
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = col[1]; ctx.beginPath(); ctx.ellipse(0, -0.4, 4.5, 1.1, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, -11); ctx.stroke();
  const r = 9.5, cy = -21;
  if (glow) { ctx.globalAlpha = 0.45 + 0.3 * Math.sin(G.T * 14); E(0, cy, r + 5, r + 5, col[0]); ctx.globalAlpha = 1; }
  E(0, cy + 1.2, r, r, 'rgba(0,0,0,.25)');
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, cy, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
  if (k > 0) { ctx.strokeStyle = glow ? '#ffffff' : 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, cy, r + 2.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, k)); ctx.stroke(); }
  ctx.fillStyle = '#ffffff'; ctx.font = '700 11px ' + FONT; ctx.textAlign = 'center'; ctx.fillText(label, 0, cy + 4);
  if (cap === 'HOLD') { ctx.font = '700 7px ' + FONT; ctx.lineWidth = 2; ctx.strokeStyle = '#3a2000'; ctx.strokeText('HOLD D', 0, cy + r + 8); ctx.fillStyle = '#fff2a0'; ctx.fillText('HOLD D', 0, cy + r + 8); }
  else if (cap) { ctx.font = '600 5.5px ' + FONT; ctx.fillText(cap, 0, cy + r + 7); }
  ctx.restore();
}
function drawGaps() {   // v054: crevasses — a dark crack in the slope with ragged edges
  for (const g of G.gaps) {
    const x0 = sx(g.w0 - G.S), x1 = sx(g.w1 - G.S); if (x1 < -5 || x0 > W + 5) continue;
    const bot = H + G.camY + 40, gr = ctx.createLinearGradient(0, Y_TOP, 0, bot); gr.addColorStop(0, '#1a130e'); gr.addColorStop(1, '#000000');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0, bot);
    for (let x = x0; x <= x1; x += 3) { const u = x + G.camU; ctx.lineTo(x, ysAt(Math.max(3, u), G.S) - 1 + ((x - x0 < 6 || x1 - x < 6) ? 0 : 2 * Math.sin(u * 0.9))); }
    ctx.lineTo(x1, bot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(240,220,190,.5)'; ctx.lineWidth = 0.8;
    for (const xe of [x0, x1]) { ctx.beginPath(); const u = xe + G.camU, y0 = ysAt(Math.max(3, u), G.S); ctx.moveTo(xe, y0); for (let k = 1; k < 8; k++) ctx.lineTo(xe + (xe === x0 ? 1 : -1) * 2 * Math.sin(k * 1.7), y0 + k * 6); ctx.stroke(); }
  }
}
function drawGlider() {   // v054: a palm-leaf glider over him while D is held in the air
  if (!G.gliding) return;
  const x = sx(G.u), y = G.y - (G.lift || 0) - 34, sw = Math.sin(G.T * 6) * 1.5;
  ctx.strokeStyle = 'rgba(60,40,20,.7)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(x - 12, y + 4); ctx.lineTo(x - 2, y + 22); ctx.moveTo(x + 12, y + 4); ctx.lineTo(x + 2, y + 22); ctx.stroke();
  for (let i = -3; i <= 3; i++) { const a = i * 0.32 - Math.PI / 2; ctx.fillStyle = i % 2 ? '#3f9a3a' : '#57b847'; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 9, y + 6 + Math.sin(a) * 6 + sw * (i % 2), 7, 2.4, a + Math.PI / 2, 0, 7); ctx.fill(); }
  ctx.strokeStyle = '#2c6e28'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(x, y + 6, 12, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
}
function drawVolleyCue() {
  for (const g of G.gaps) {   // v054: an amber sign before each crevasse: D (jump) or HOLD (glide)
    const u = g.w0 - G.S - 6, d = u - G.u; if (d < -4 || d > 260) continue;
    sign(sx(u), ysAt(Math.max(3, u), G.S) - 14, 'D', ['#ffb43a', '#b66a00'], 1 - Math.max(0, d - 20) / 240, d < 40, g.type === 'glide' || g.type === 'practice' ? 'HOLD' : g.type === 'mus' ? 'MUSSEL' : 'JUMP');   // v055: the sign says how to cross
  }
  if (ST.signs && G.U.jump) for (const m of G.mons) {   // red "D" over every mussel ahead, the ring closes as you come; it glows in the window
    if (m.type !== 'm' || m.mode !== 'come' || m.rise > 0) continue;
    const d = m.u - G.u; if (d < -6 || d > 260) continue;
    const onIt = G.ramp && G.ramp.m === m, inWin = onIt || (d < 18 && d > -4);   // v047: TAP shows while he is on the ramp
    sign(sx(m.u) + 6, mPos(m)[1] - 12 - (onIt ? 6 : 0), 'D', ['#ff6a55', '#b8261c'], onIt ? 1 - G.ramp.k : 1 - Math.max(0, d - 18) / 242, inWin, onIt && G.ramp.hit ? '✓' : inWin ? 'TAP' : 'JUMP');
  }
  if (ST.signs && G.U.cycle && G.wallEv && !G.cyc) {   // green "A" rides along while a wall comes; ring = how close, glow = now
    const pl = G.plan, win = cycleWindow();   // v052: the sign rides ahead of the wall and reaches him exactly when the window opens
    if (pl && !pl.late) { const su = G.u + Math.max(0, pl.d - takeMax()) + 7, k = Math.max(0, Math.min(1, 1 - (su - G.u) / (W * 0.6)));
      if (sx(su) < W - 6) sign(sx(su), ysAt(Math.max(3, su), G.S) - 14, 'A', ['#3ee07a', '#138a45'], win ? 1 : k, win, win ? 'TAP' : 'WALL'); }
  }
  ctx.fillStyle = '#fff6a0';
  for (const m of G.mons) if (m.stun > 0 && m.mode === 'come') { const [x, y] = mPos(m); for (let i = 0; i < 3; i++) { const a = G.T * 6 + i * 2.1; ctx.beginPath(); ctx.arc(sx(x) + Math.cos(a) * 5, y - 9 + Math.sin(a) * 1.5, 0.6, 0, 7); ctx.fill(); } }
}
function drawDiamonds() {
  for (const d of G.DL) {
    const u = d.w - G.S;
    if (u < G.camU - 10 || u > G.camU + W + 10) continue;
    const y = ysAt(Math.max(3, u), G.S) - d.h + Math.sin(G.T * 4 + d.w) * 1.5;
    if (d.mag) {   // v052: the heart magnet as an item to catch
      const x = sx(u); ctx.globalAlpha = 0.3 + 0.15 * Math.sin(G.T * 6); E(x, y, 8, 8, '#ff6a6a'); ctx.globalAlpha = 1;
      ctx.lineWidth = 2.6; ctx.lineCap = 'butt'; ctx.strokeStyle = '#d8262c'; ctx.beginPath(); ctx.arc(x, y - 1, 3.6, Math.PI, 0, true); ctx.stroke();
      ctx.strokeStyle = '#e8eef0'; ctx.beginPath(); ctx.moveTo(x - 3.6, y - 1); ctx.lineTo(x - 3.6, y + 2.6); ctx.moveTo(x + 3.6, y - 1); ctx.lineTo(x + 3.6, y + 2.6); ctx.stroke(); ctx.lineCap = 'round';
      continue;
    }
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(G.T * 6); E(sx(u), y, 8, 8, '#ffc21a'); ctx.globalAlpha = 1;
    ctx.drawImage(DIA_SPR, sx(u) - 4.5, y - 5, 9, 10);
  }
}
function drawBoom() { const b = G.boom; if (!b) return; ctx.save(); ctx.translate(sx(b.x), b.y); ctx.rotate(b.ang); ctx.drawImage(STAMP_SPR, -5, -5.8, 10, 11.6); ctx.restore(); }
function drawHearts() {
  for (const h of G.HL) if (h.crystal && !h.got) { const u = h.w - G.S; if (u < G.camU - 20 || u > G.camU + W + 20) continue; const y = ysAt(Math.max(3, u), G.S) - h.h + Math.sin(G.T * 3) * 2, X = sx(u);   // v061: the stamina crystal
    ctx.fillStyle = '#8ff0ff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(X, y - 7); ctx.lineTo(X + 4.5, y - 1); ctx.lineTo(X, y + 6); ctx.lineTo(X - 4.5, y - 1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(X - 1, y - 4, 1.6, 4); }
  for (const h of G.HL) if (h.big && !h.got) { const u = h.w - G.S; if (u < G.camU - 20 || u > G.camU + W + 20) continue; const y = ysAt(Math.max(3, u), G.S) - h.h + Math.sin(G.T * 3) * 2; ctx.globalAlpha = 0.35 + 0.2 * Math.sin(G.T * 5); E(sx(u), y, 16, 15, '#7dff6b'); ctx.globalAlpha = 1; ctx.drawImage(HEART_SPR, sx(u) - 10, y - 9, 20, 18.3); txt('25', sx(u), y + 3, '#0b3a14', 'center', 7); }
  for (const h of G.KH) ctx.drawImage(HEART_SPR, sx(h.u) - 3.5, h.y - 3.2, 7, 6.4);
  for (const h of G.HL) {
    const u = h.w - G.S; if (h.crystal) continue;   // v061: the crystal draws itself
    if (u < G.camU - 10 || u > G.camU + W + 10) continue;
    const bob = h.h > 0 ? Math.sin(G.T * 3 + h.ph) : 0;
    const y = ysAt(Math.max(3, u), G.S) - h.h + bob;
    ctx.globalAlpha = h.h < 0 ? 0.5 : 1;
    if (!h.big) ctx.drawImage(HEART_SPR, sx(u) - 3.5, y - 3.2, 7, 6.4);
  }
  ctx.globalAlpha = 1;
}
function drawFloats() {
  for (const f of G.floats) { ctx.globalAlpha = Math.max(0, 1 - f.t / 1.8); txt(f.s, sx(f.x), f.y - f.t * 10, f.col, 'center', f.sz || 8); }
  ctx.globalAlpha = 1;
  if (G.mew) { const [hx, hy] = [sx(G.u) - 4, G.y - 34]; ctx.globalAlpha = Math.max(0, 1 - G.mew.t / 1.2); txt(G.mew.s, hx, hy - G.mew.t * 8, '#ffc58a', 'center', 8); ctx.globalAlpha = 1; }
}
const FONT = "Fredoka, 'Trebuchet MS', sans-serif";
function txt(s, x, y, c, al, sz, wt) {
  ctx.font = (wt || 600) + ' ' + (sz || 8) + 'px ' + FONT;
  ctx.textAlign = al || 'left';
  ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(10,30,40,.55)'; ctx.lineWidth = Math.max(1, (sz || 8) * 0.22); ctx.strokeText(s, x, y);
  ctx.fillStyle = c; ctx.fillText(s, x, y);
}
function drawZones() {   // v046: only the pause button (S and W are gone: A and D are taps on the halves)
  if (!window.SURF_TEST) return;   // v054: the main game has no pause
  const px = W - 16, py = (G.boss || G.elite) ? 34 : 26;
  ctx.fillStyle = 'rgba(8,30,40,.45)'; ctx.beginPath(); ctx.arc(px, py, 8, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(px - 3, py - 3.5, 2, 7); ctx.fillRect(px + 1, py - 3.5, 2, 7);
}
function drawHurtFx() {   // v052: a red flash at the edges of the screen
  if (!(G.hurtFx > 0)) return;
  const k = G.hurtFx / 0.5, g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
  g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,30,30,' + (0.55 * k).toFixed(3) + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function drawHUD() {
  drawHurtFx();
  const hs = G.barChip ? (1 - G.barChip.t / 0.7) * 2 : 0; ctx.save(); ctx.translate(hs * Math.sin(G.T * 90), 0);
  ctx.globalAlpha = 0.32; ctx.fillStyle = '#04161c'; ctx.beginPath(); ctx.roundRect(4, 3, 150, 46, 8); ctx.fill(); ctx.globalAlpha = 1;
  const sf = Math.min(1, G.stam / P.stamina);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.roundRect(9, 8, 92, 7, 3.5); ctx.fill();
  ctx.fillStyle = G.hurtT > 0 ? '#ff4a4a' : sf > 0.3 ? '#3fd17a' : '#e8a03a'; ctx.beginPath(); ctx.roundRect(10, 9, Math.max(0.1, 90 * sf), 5, 2.5); ctx.fill();
  if (G.barChip) { const c = G.barChip, k = c.t / 0.7; ctx.globalAlpha = 1 - k; ctx.fillStyle = k < 0.15 ? '#ffffff' : '#ff3030'; ctx.fillRect(10 + 90 * c.f1, 9 + k * 14, Math.max(1.5, 90 * (c.f0 - c.f1)), 5); ctx.globalAlpha = 1; }   // v052: the lost piece breaks off
  if (P.stamina <= 40) { ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 1; i < P.stamina; i++) ctx.fillRect(10 + 90 * i / P.stamina, 9, 0.4, 5); }
  txt(G.stam + ' / ' + P.stamina, 105, 14.5, G.barChip ? '#ff6060' : '#ffffff', 'left', 8);
  ctx.restore();
  { const bf = G.boostM / G.up.boostLen; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(9, 18, 60, 3); ctx.fillStyle = bf > 0 ? '#ffe36a' : 'rgba(233,251,255,.5)'; ctx.fillRect(9, 18, 60 * (bf > 0 ? bf : 0.02), 3);
    txt(bf > 0 ? 'BOOST' + (G.combo > 1 ? ' ×' + G.combo : '') : 'boost', 72, 21.5, bf > 0 ? '#ffe36a' : '#e9fbff', 'left', 6.5, bf > 0 ? 700 : 500); }
  ctx.drawImage(HEART_SPR, 9, 25, 7, 6.4);
  txt('+' + (Math.floor(G.greenF) + G.gain.green), 19, 31, '#c8ffd9', 'left', 8);
  let x2 = 52;
  if (G.U.void) { const c = G.voidC, cx = x2 + 5; ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, 28, 4.2, 0, 7); ctx.stroke(); ctx.strokeStyle = c >= 1 ? '#7dffb0' : '#bfe8ff'; ctx.beginPath(); ctx.arc(cx, 28, 4.2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c); ctx.stroke(); if (c >= 1) { ctx.globalAlpha = 0.4 + 0.3 * Math.sin(G.T * 6); E(cx, 28, 2.4, 2.4, '#7dffb0'); ctx.globalAlpha = 1; } x2 += 14; }   // VOID: charged by hearts
  if (G.gain.tails) { txt('🐟 +' + G.gain.tails, x2, 31, '#ffc9b0', 'left', 8); x2 += 34; }
  if (G.gain.rum) { txt('🥃 +' + G.gain.rum, x2, 31, '#ffd27a', 'left', 8); }
  txt((ST.kind === 'wave' ? 'STAGE ' + ST.n : ST.kind === 'nest' ? 'NEST · stage ' + ST.n : ST.kind === 'army' ? 'ARMY · stage ' + ST.n : ST.kind === 'last' ? 'LAST STAND' : 'HIS CABIN · stage ' + ST.n) + '   ✕ ' + G.kills + (G.C.dia ? '   ◆ ' + G.C.dia : ''), 9, 43, '#ffe36a', 'left', 7.5);
  const bw = Math.min(160, W * 0.3), bx = W - bw - 14;
  const b = G.boss || G.elite;
  if (b) {
    const f = Math.max(0, b.hp / b.max);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.roundRect(bx, 6, bw, 6, 3); ctx.fill();
    ctx.fillStyle = b.open > 0 ? '#ffe36a' : b.type === 'c' ? '#ff8a3d' : '#9a6cff'; ctx.beginPath(); ctx.roundRect(bx + 1, 7, Math.max(0.1, (bw - 2) * f), 4, 2); ctx.fill();
    txt(b.type === 'c' ? 'THE REPO CRAB' : RANK_NAME[b.rank || 0], bx + bw / 2, 21, '#e8dcff', 'center', 8);
  } else if (G.endS < 1e8) {
    const f = Math.min(1, G.S / G.endS);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(bx, 8, bw, 3); ctx.fillStyle = '#e9fbff'; ctx.fillRect(bx, 8, bw * f, 3);
    txt('REEF', bx - 4, 12, '#e9fbff', 'right', 7.5);
  }
  if (G.combo > 1 && G.boostM > 0) txt('COMBO ×' + G.combo, W / 2, 50, '#ffe36a', 'center', 10 + Math.min(4, G.combo * 0.3), 700);
  if (G.chainT > 0 && G.chainN > 1) { ctx.globalAlpha = Math.min(1, G.chainT); txt('CHAIN ×' + G.chainN, W / 2, 64, '#bfe8ff', 'center', 11); ctx.globalAlpha = 1; }
  if (G.sayLine) {   // the tortoise, in a paper bubble at the top
    ctx.font = '500 8px ' + FONT; const tw = Math.min(W - 40, ctx.measureText(G.sayLine).width + 18), x = W / 2 - tw / 2, y = 54;
    ctx.globalAlpha = Math.min(1, G.sayT * 2) * 0.94; ctx.fillStyle = '#fff6e3'; ctx.beginPath(); ctx.roundRect(x, y, tw, 18, 7); ctx.fill();
    ctx.globalAlpha = Math.min(1, G.sayT * 2); ctx.fillStyle = '#7a5a2a'; ctx.font = '600 6px ' + FONT; ctx.textAlign = 'left'; ctx.fillText('Tortoise', x + 7, y + 6.5);
    ctx.fillStyle = '#3b2a1a'; ctx.font = '500 8px ' + FONT; ctx.textAlign = 'center'; ctx.fillText(G.sayLine, W / 2, y + 14.5, tw - 12); ctx.globalAlpha = 1;
  }
}
function meters() { return Math.max(0, Math.round((G.S + G.u) / 10)); }   // 10 world units = 1 m
function drawOverlay() {
  const cy = H / 2;
  if (G.over) {
    ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.6, G.overT * 0.6) + ')'; ctx.fillRect(0, 0, W, H);
    txt('Washed off the board', W / 2, cy - 10, '#ffffff', 'center', 16);
    txt(meters().toLocaleString('en') + ' m ridden · ' + G.kills + ' monsters', W / 2, cy + 8, '#e9fbff', 'center', 9);
    return;
  }
  if (G.won) {
    ctx.globalAlpha = Math.min(1, G.wonT * 3);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, cy - 34, W, 52);
    txt(G.final ? 'TERMINATED' : G.bossDown ? RANK_NAME[Math.max(0, ST.boss)] + ' IS DOWN' : G.eliteDown ? 'The Repo Crab is down!' : ST.kind === 'nest' ? 'Through the nest' : ST.kind === 'army' ? 'Through the army' : 'The reef — stage ' + ST.n + ' cleared', W / 2, cy - 10, G.final ? '#ff6a5a' : '#ffe36a', 'center', 15);
    txt('💚 +' + (Math.round(G.greenF) + G.gain.green) + (G.gain.tails ? '   🐟 +' + G.gain.tails : '') + (G.gain.rum ? '   🥃 +' + G.gain.rum : '') + '   stamina ' + G.stam + '   ' + meters().toLocaleString('en') + ' m', W / 2, cy + 8, '#e9fbff', 'center', 9);
    ctx.globalAlpha = 1;
    return;
  }
  if (paused) {   // v044: the pause shows the controls you have so far
    ctx.fillStyle = 'rgba(0,12,20,.62)'; ctx.fillRect(0, 0, W, H);
    const L = [['nothing', 'Robinson surfs, the stamp fires by itself']];
    if (G.U.jump) L.push(['tap D / right half', 'JUMP — as you ride up a mussel']), L.push(['jump again on landing', 'chains · every jump = boost']);
    if (G.U.cycle) L.push(['tap A / left half', 'WAVE CYCLE — when a wall comes']);
    if (G.U.glide) L.push(['hold D in the air', 'GLIDER — over crevasses']);
    if (G.U.flame) L.push(['hold A while climbing', 'FLAMETHROWER']);
    if (G.U.void) L.push(['VOID (charged by hearts)', 'saves you at 0 stamina']);
    const top = Math.max(30, cy - 14 - L.length * 7.5);
    txt('Paused', W / 2, top, '#ffffff', 'center', 15);
    L.forEach((l, i) => { const y = top + 20 + i * 14; txt(l[0], W / 2 - 6, y, '#ffe36a', 'right', 8.5); txt(l[1], W / 2 + 6, y, '#e9fbff', 'left', 8.5, 500); });
    txt('tap to ride on · all controls: 📖 Rules on the beach', W / 2, top + 30 + L.length * 14, '#c8ffd9', 'center', 8, 500);
    return;
  }
  if (G.banner) {
    const m = G.banner.lines;
    ctx.globalAlpha = Math.max(0, Math.min(1, G.banner.age * 3, 1 - G.banner.out / 0.7));
    const by = H - (m[2] ? 40 : 31);   // v049: compact and see-through, low over the deep water
    ctx.fillStyle = 'rgba(0,30,40,.28)'; ctx.fillRect(0, by, W, H - by);
    txt(m[0], W / 2, by + 11, '#ffe36a', 'center', 9.5);
    txt(m[1], W / 2, by + 21, '#ffffff', 'center', 7, 500);
    if (m[2]) txt(m[2], W / 2, by + 30.5, '#c8ffd9', 'center', 6.5, 500);
    ctx.globalAlpha = 1;
  }
}
function drawTerminated() {
  const f = G.final; if (!f || !f.term || f.term.t < 0.5) return;
  const k = Math.min(1, (f.term.t - 0.5) / 0.25), sc = 2.2 - 1.2 * k;
  ctx.save(); ctx.translate(W / 2, H * 0.36); ctx.rotate(-0.12); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, k * 1.4);
  ctx.font = "700 18px 'Courier New', monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText('TERMINATED').width + 12;
  ctx.strokeStyle = '#c0281e'; ctx.lineWidth = 2.2; ctx.strokeRect(-w / 2, -12, w, 24); ctx.fillStyle = '#c0281e'; ctx.fillText('TERMINATED', 0, 1);
  ctx.restore(); ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
}

function weather() {
  const lk = LOOK;
  if (lk.rain || lk.storm) {   // rain, slanted by the wind
    ctx.strokeStyle = lk.storm ? 'rgba(170,190,230,.35)' : 'rgba(220,230,240,.4)'; ctx.lineWidth = 0.5; ctx.beginPath();
    for (let i = 0; i < 90; i++) { const x = ((hash(i) * (W + 60) - G.T * 160 - G.nearX * 0.3) % (W + 60) + W + 60) % (W + 60) - 30, y = ((hash(i + 7) * H + G.T * 420) % (H + 20)) - 10; ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 11); }
    ctx.stroke();
  }
  if (lk.rain) { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 0.6; for (let i = 0; i < 6; i++) { const x = ((i * 157 - G.T * 260) % (W + 200) + W + 200) % (W + 200) - 100, y = 40 + hash(i + 33) * (H - 80); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 30, y - 3, x + 60, y); ctx.stroke(); } }
  if (G.flash > 0) { ctx.fillStyle = 'rgba(230,240,255,' + Math.min(0.55, G.flash * 1.6) + ')'; ctx.fillRect(0, 0, W, H); }
  if (LOOK === LOOKS.nest || LOOK === LOOKS.cabin || LOOK === LOOKS.night) {   // a darker frame at dusk and at night
    const g = grad('vign', () => { const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, LOOK === LOOKS.night ? 'rgba(0,0,10,.55)' : 'rgba(20,0,30,.35)'); return v; });
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}
const VOFF = () => Math.max(0, (H - 270) * 0.45);   // tall screens: the wave sits in the middle, more sky above
function draw() {
  const T0 = (a, b, c, d, e, f) => ctx.setTransform(a * SC, b, c, d * SC, e * SC, f * SC);
  T0(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = LOOK.sky[0]; ctx.fillRect(0, 0, W, H);
  if (!G) return;
  let shx = 0, shy = 0;
  if (G.shake > 0) { shx = (Math.random() - 0.5) * 4 * G.shake; shy = (Math.random() - 0.5) * 4 * G.shake; }
  const vo = VOFF();
  T0(1, 0, 0, 1, 0, vo);
  drawBack();
  T0(1, 0, 0, 1, shx, vo + shy - G.camY);
  if (G.barrel && G.barrel.scene) {   // v064: inside the barrel
    drawDrum(); drawParts(0); drawFx(false); drawFloats();
    ctx.globalCompositeOperation = 'lighter'; drawParts(1); drawFx(true); ctx.globalCompositeOperation = 'source-over';
    T0(1, 0, 0, 1, 0, 0); drawZones(); drawHUD(); drawOverlay(); return;
  }
  drawWave();
  drawTafeln();
  drawGaps();
  drawMonsters(); drawClouds();
  drawTrail();
  drawHearts();
  drawDiamonds();
  drawCatWorld();
  drawRider();
  drawFlyers();
  drawShots();
  drawVolleyCue();
  drawBoom();
  drawBossStuff();
  drawParts(0);
  drawFx(false);
  drawLip();
  drawBarrelWorld();
  drawFloats();
  if (G.dim > 0) { ctx.globalAlpha = Math.min(0.45, G.dim * 0.7); R(-10, G.camY - 10, W + 20, H + 20, '#02121a'); ctx.globalAlpha = 1; }
  ctx.globalCompositeOperation = 'lighter';
  drawFlood(); drawBolts(); drawParts(1); drawFx(true);
  ctx.globalCompositeOperation = 'source-over';
  T0(1, 0, 0, 1, 0, 0);
  weather();
  drawZones();
  drawHUD();
  drawTerminated();
  drawOverlay();
}

// ---------- loop ----------
let last = 0, predT = 0;
function frame(now) {
  try {
    const raw = last ? (now - last) / 1000 : 0.016; last = now;
    const dt = Math.min(0.05, raw) * (LAB.on ? LAB.speed : 1);
    clock += dt;
    if (running && !paused && !(LAB.on && LAB.pause) && G) {
      update(dt);
    }
    draw();
  } catch (err) { console.error(err); }
  WELT.raf(frame);
}
function fit() {
  const iw = innerWidth || 800, ih = innerHeight || 450;
  const minW = ih > iw ? 330 : 480;   // v044: upright a little closer
  const s = Math.min(iw / minW, ih / 270);
  W = Math.ceil(iw / s); H = Math.ceil(ih / s);
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(iw * DPR); cv.height = Math.round(ih * DPR);
  cv.style.width = iw + 'px'; cv.style.height = ih + 'px';
  SC = s * DPR;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  gradCache = {};
}
addEventListener('resize', () => { if (WELT.aktiv()) fit(); });

// ---------- end of a fight → the result for the beach ----------
function finish(win) {
  if (!running || !DONE) return;
  running = false;
  const green = Math.round(G.greenF) + G.gain.green;
  const res = { win, t: +G.T.toFixed(1), kills: G.kills, total: Math.max(G.kills, G.spawned), gain: { green, tails: G.gain.tails, rum: G.gain.rum },
    bossDown: G.bossDown, eliteDown: G.eliteDown, stam: G.stam, comboMax: G.comboMax, meters: meters(), chainLog: G.chainLog, evlog: G.evlog, bigJumps: G.C.bigJumps, tricks: G.C.tricks, cycles: G.C.cycles, cyclesGood: G.C.cyclesGood, saved: G.saved, hearts: G.C.hearts, heartsAll: G.C.hearts + G.C.heartsMissed, dia: G.C.dia, seen: G.seen, catKill: G.catKill, stage: ST.n, kind: ST.kind };
  const d = DONE; DONE = null; IN.a = IN.d = false;
  d(res);
}
// test hooks (window.KAMPF): end the current fight as won / lost
function testEnde(win) {
  if (!G || !running) return false;
  if (win) { for (const b of [G.boss, G.elite]) if (b) kill(b, 'stamp'); G.endS = G.S; G.slow = 0; if (G.final && G.final.term) G.final.term.t = 2; }
  else { G.inv = 0; G.ifr = 0; G.stam = 1; G.voidC = 0; const g = P.godMode; P.godMode = false; hurt('t', 1); P.godMode = g; }
  return true;
}
WELT.api = {
  kannWechseln: () => !running,
  gezeigt() { fit(); last = 0; try { cv.focus({ preventScroll: true }); } catch (_) {} },
  start(cfg) {
    return new Promise(res => {
      fit(); reset(cfg); DONE = res; running = true; paused = false; last = 0; IN.a = IN.d = false;
      try { cv.focus({ preventScroll: true }); } catch (_) {}
    });
  },
  laeuft: () => running,
  modal: () => running,
};
fit();
WELT.raf(frame);

// ---------- v046: the surf test page (node build.mjs surf → robinson_surf_test_vNNN.html sets window.SURF_TEST) ----------
function surfTestPage() {
  const UP = ['dmg', 'speed', 'splash', 'boostLen', 'magnet', 'cycleBoom', 'cycleDive', 'void', 'voidCharge', 'voidHeal', 'glide', 'glideLen', 'flame', 'flamePow', 'catDive', 'catBoard', 'catFish'];
  const box = document.createElement('div'); box.id = 'stp';
  box.innerHTML = '<style>#stp{position:fixed;left:8px;bottom:8px;z-index:90;display:flex;flex-direction:column-reverse;align-items:flex-start;font:13px Fredoka,system-ui,sans-serif;color:#13303a}#stp .t{background:#fff6e3;border:0;border-radius:10px;padding:6px 10px;font:600 13px Fredoka;cursor:pointer;box-shadow:0 2px 0 #c9b48a}' +
    '#stp .p{display:none;margin-bottom:6px;background:rgba(255,246,227,.97);border-radius:12px;padding:10px;width:300px;max-height:86vh;overflow:auto;box-shadow:0 6px 24px rgba(0,0,0,.3)}#stp.on .p{display:block}' +
    '#stp label{display:flex;justify-content:space-between;align-items:center;gap:6px;margin:3px 0}#stp input[type=number]{width:54px}#stp input[type=range]{width:110px}#stp h4{margin:8px 0 2px;font:600 13px Fredoka}#stp button.b{margin:6px 4px 0 0;border:0;border-radius:8px;padding:6px 10px;background:#2f7f6f;color:#fff;font:600 12px Fredoka;cursor:pointer}#stp .r{margin-top:6px;font-size:12px;white-space:pre-wrap}#stp details{margin-top:8px;border-top:1px solid #e3d3b0;padding-top:4px}#stp summary{cursor:pointer;font-weight:600}</style>' +
    '<button class="t">⚙ Surf test</button><div class="p">' +
    '<label><b>Campaign</b> (die = this stage again, after realistic buys) <input type="checkbox" id="sCamp" checked></label><div class="r" id="sBank"></div>' +
    '<label>Stage <input type="number" id="sStage" min="1" max="30" value="1"></label>' +
    '<button class="b" id="sGo">▶ Start (R)</button><button class="b" id="sNew">↺ New campaign</button>' +
    '<label>God mode (no damage) <input type="checkbox" id="sGod"></label><label>Sound off <input type="checkbox" id="sMute"></label>' +
    '<h4>Log</h4><button class="b" id="sLog">📋 Copy log</button><button class="b" id="sDl">💾 Download</button><button class="b" id="sClr">🗑 Clear</button><textarea id="sTxt" readonly style="display:none;width:100%;height:110px;margin-top:6px;font:10px monospace"></textarea>' +
    '<div class="r" id="sRes">Keys: D = jump · A = Wall Leap · P = pause · R = restart</div>' +
    '<details><summary>Advanced</summary>' +
    '<label>Fight <select id="sKind"><option>wave</option><option>nest</option><option>cabin</option><option>army</option><option>last</option></select></label>' +
    '<label>Boss rank (wave/cabin) <select id="sBoss"><option value="">–</option><option value="0">First Mate</option><option value="1">Cabin Boy</option><option value="2">Bilge Rat</option></select></label>' +
    '<label>Army strength <input type="number" id="sArmy" value="5" min="1" max="9"> elite <input type="checkbox" id="sElite"></label>' +
    '<label>Stamina / max <span><input type="number" id="sSt" value="8"> / <input type="number" id="sMax" value="8"></span></label>' +
    '<label>Cat along <input type="checkbox" id="sCat" checked></label><label>Restart automatically (no campaign) <input type="checkbox" id="sAuto"></label>' +
    '<h4>Ledger</h4>' + UP.map(k => '<label>' + k + ' <input type="number" min="0" max="9" value="0" data-u="' + k + '"></label>').join('') +
    '<h4>Tuning</h4>' + [['tempoMul', 0.6, 1.5, 0.05], ['density', 0.3, 2.5, 0.1], ['bounce', 0, 1.5, 0.05], ['postRamp', 0, 0.3, 0.02], ['wallXm', 0, 2, 0.1], ['spillAhead', 0, 200, 10]].map(([k, a, b, st]) => '<label>' + k + ' <span id="v_' + k + '">' + P[k] + '</span> <input type="range" min="' + a + '" max="' + b + '" step="' + st + '" value="' + P[k] + '" data-p="' + k + '"></label>').join('') +
    '</details></div>';
  document.body.appendChild(box);
  box.querySelector('.t').onclick = () => box.classList.toggle('on');
  box.addEventListener('pointerdown', e => e.stopPropagation());
  box.querySelectorAll('[data-p]').forEach(i => i.oninput = () => { P[i.dataset.p] = +i.value; box.querySelector('#v_' + i.dataset.p).textContent = i.value; });
  const v = id => box.querySelector('#' + id);
  // v047: campaign — stage by stage like the real game: hearts banked, realistic purchases after every run, max stamina on the tide curve of the cat jumps
  const MAXST = [8, 9, 10, 11, 11, 12, 12, 13, 13, 14, 14];   // v055: max stamina every other tide
  const WEIGHT = { speed: 0.8, splash: 0.85, dmg: 1.4, void: 0.6, boostLen: 1.1, magnet: 1.2, cycleBoom: 1.1, cycleDive: 1.2, voidCharge: 1.3, voidHeal: 1.3 };
  const START = () => ({ stage: 1, green: 0, rum: 0, upg: {}, log: ['start: a new game (stage 1)'] });   // v053: back to stage 1
  const CAMP = START();
  const UPS = () => (window.STRAND && STRAND.UPGRADES || []).filter(u => (u.cur === 'green' || u.cur === 'rum') && !u.gift);
  const price = (u, lv) => Math.round(u.base * Math.pow(u.mult, lv));
  const avail = u => { const lv = CAMP.upg[u.id] || 0; if (u.max && lv >= u.max) return false;
    if (['boostLen', 'magnet'].includes(u.id)) return CAMP.stage >= 2; if (['cycleBoom', 'cycleDive'].includes(u.id)) return CAMP.stage >= 8;
    if (u.id === 'void') return CAMP.stage >= 6; if (['voidCharge', 'voidHeal'].includes(u.id)) return (CAMP.upg.void || 0) > 0; return true; };
  function autoBuy() {   // what a sensible player does: buy the best value he can afford, again and again
    const got = [];
    for (;;) {
      const c = UPS().filter(avail).map(u => ({ u, p: price(u, CAMP.upg[u.id] || 0) })).filter(x => x.p <= CAMP[x.u.cur]).sort((a, b) => a.p * (WEIGHT[a.u.id] || 1) - b.p * (WEIGHT[b.u.id] || 1))[0];
      if (!c) break; CAMP[c.u.cur] -= c.p; CAMP.upg[c.u.id] = (CAMP.upg[c.u.id] || 0) + 1; got.push(c.u.name + ' ' + CAMP.upg[c.u.id]);
    }
    return got;
  }
  function campToPanel() {
    const mx = MAXST[Math.min(MAXST.length - 1, CAMP.stage - 1)];
    v('sStage').value = CAMP.stage; v('sKind').value = 'wave'; v('sBoss').value = ''; v('sSt').value = mx; v('sMax').value = mx; v('sGod').checked = false;
    box.querySelectorAll('[data-u]').forEach(i => i.value = CAMP.upg[i.dataset.u] || 0);
    v('sBank').textContent = 'Stage ' + CAMP.stage + ' · bank 💚 ' + CAMP.green + '\n' + CAMP.log.slice(-6).join('\n');
  }
  function campResult(r) {
    CAMP.green += r.gain.green; CAMP.rum += r.gain.rum || 0;
    const got = autoBuy();
    CAMP.log.push((r.win ? '✔' : '✘') + ' stage ' + r.stage + ' · 💚 +' + r.gain.green + (got.length ? ' · bought ' + got.join(', ') : ''));
    if (r.win) CAMP.stage++;
    campToPanel();
  }
  v('sNew').onclick = () => { Object.assign(CAMP, START()); campToPanel(); };
  function go() {
    try { audioInit(); if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume(); } catch (_) {}
    if (running && DONE) { const d = DONE; DONE = null; running = false; d(null); }
    const upg = {}; box.querySelectorAll('[data-u]').forEach(i => upg[i.dataset.u] = +i.value);
    P.godMode = v('sGod').checked; setMute(v('sMute').checked); box.classList.remove('on');   // fold the panel away while riding
    const cfg = { kind: v('sKind').value, stage: +v('sStage').value, boss: v('sBoss').value === '' ? null : +v('sBoss').value, army: +v('sArmy').value, elite: v('sElite').checked,
      stam: +v('sSt').value, stamMax: +v('sMax').value, upg, cat: v('sCat').checked, seen: {}, lines: [], seed: 0 };
    SPIEL.zeige('kampf', { force: true });
    const camp = v('sCamp').checked;
    WELT.api.start(cfg).then(r => {
      if (!r) return;
      (window.SURF_LOG = window.SURF_LOG || loadLog()).push({ stage: r.stage, kind: r.kind, win: r.win, t: r.t, m: r.meters, stam: r.stam, hearts: r.hearts + '/' + r.heartsAll, combo: r.comboMax, tricks: r.tricks, cycles: (r.cyclesGood || 0) + '/' + (r.cycles || 0), upg, ev: r.evlog || [] });
      saveLog();
      if (camp) { campResult(r); setTimeout(go, 1500); }
      v('sRes').textContent = (r.win ? 'WON' : 'lost') + ' · stage ' + r.stage + ' · ' + r.t + ' s · 💚 ' + r.gain.green + ' (' + r.hearts + '/' + r.heartsAll + ' hearts) · kills ' + r.kills + ' · stamina ' + r.stam + '\ncombo max ' + (r.comboMax || 0) + ' · big jumps ' + (r.bigJumps || 0) + ' · tricks ' + (r.tricks || []).join('/') + ' · cycles ' + (r.cyclesGood || 0) + '/' + (r.cycles || 0) + ' good · VOID saves ' + (r.saved || 0);
      if (!camp && v('sAuto').checked) setTimeout(go, 800);
    });
  }
  function setMute(on) { AU.muted = on; try { if (AU.master && AU.ctx) AU.master.gain.setTargetAtTime(on ? 0 : 0.8, AU.ctx.currentTime, 0.05); } catch (_) {} }
  v('sMute').onchange = () => setMute(v('sMute').checked);
  v('sGo').onclick = go;
  function loadLog() { try { return JSON.parse(localStorage.getItem('robinsonSurfLog') || '[]'); } catch (_) { return []; } }
  function saveLog() { try { localStorage.setItem('robinsonSurfLog', JSON.stringify(window.SURF_LOG || [])); } catch (_) {} }
  window.SURF_LOG = loadLog();
  function logText() { const R = window.SURF_LOG || [], ev = R.flatMap(r => r.ev), W = ev.filter(e => e.k === 'wall'), ch = ev.filter(e => e.k === 'chain'), rp = ev.filter(e => e.k === 'ramp');
    const cnt = (a, f) => a.filter(f).length;
    const head = 'SURF LOG · runs ' + R.length + ' (won ' + cnt(R, r => r.win) + ')\n' +
      'walls ' + W.length + ': tap ok ' + cnt(W, e => e.tap === 'ok') + ', early ' + cnt(W, e => e.tap === 'early') + ', late ' + cnt(W, e => e.tap === 'late') + ', none ' + cnt(W, e => e.tap === 'none') + ' · hits at walls ' + W.reduce((a, e) => a + (e.hits || 0), 0) + '\n' +
      'ramps ' + rp.length + ': jumped ' + cnt(rp, e => e.hit) + ', early ' + cnt(rp, e => e.early) + ' · chain landings ' + ch.length + ', on the mussel ' + cnt(ch, e => e.hit) + '\n' +
      'hits ' + cnt(ev, e => e.k === 'hurt') + ' by cause ' + JSON.stringify(ev.filter(e => e.k === 'hurt').reduce((a, e) => (a[e.cause] = (a[e.cause] || 0) + 1, a), {}));
    return head + '\n' + JSON.stringify(R); }
  v('sLog').onclick = () => { const t = logText(), kb = Math.round(t.length / 1024); v('sTxt').style.display = 'block'; v('sTxt').value = t; v('sTxt').select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => { v('sRes').textContent = '✓ copied (' + kb + ' KB) — or select the text below'; }, () => { v('sRes').textContent = (ok ? '✓ copied (' : 'Copy blocked — select the text below (') + kb + ' KB)'; });
    else v('sRes').textContent = (ok ? '✓ copied (' : 'select the text below (') + kb + ' KB)'; };
  v('sDl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([logText()], { type: 'application/json' })); a.download = 'robinson_surf_log.json'; document.body.appendChild(a); a.click(); a.remove(); v('sRes').textContent = '💾 downloaded robinson_surf_log.json'; };
  v('sClr').onclick = () => { window.SURF_LOG = []; saveLog(); v('sTxt').value = ''; v('sRes').textContent = 'log cleared'; };
  campToPanel();
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'r' && !e.repeat) go(); });
  setTimeout(() => { box.classList.add('on'); const ov = document.getElementById('overlay'); if (ov) ov.style.display = 'none'; SPIEL.zeige('kampf', { force: true }); }, 300);
}
if (window.SURF_TEST) surfTestPage();

// ---------- v067: the barrel workbench (builds/barrel_lab.html sets window.BARREL_LAB) — the chain from PULL IN to the way out, on its own ----------
function labGo() {
  const cfg = { stage: 27, kind: 'wave', upg: { dmg: 4, speed: 3, splash: 2, flame: 1, glide: 1, cycleBoom: 1 }, stam: 60, stamMax: 60, cat: true, seen: {} };
  fit(); reset(cfg); DONE = () => {}; running = true; paused = false; IN.a = IN.d = false;
  LV.ei = LV.ev.length; LV.mi = LV.msgs.length; G.bq = []; G.banner = null; G.T = 3;
  LAB.t = 0; LAB.did = {}; LAB.started = false; LAB.after = 0; G.tipT = 1e9;   // no tortoise tips on the workbench
}
function labTick(dt) {
  const L = LAB; L.t += dt; G.stam = Math.max(G.stam, 30); if (!G.barrel) G.mons = [];
  if (!L.started && L.t > 0.7) { L.started = true; startBarrel(); const B = G.barrel;
    if (L.from === 'roll') B.t = 2.0;
    else { B.ph = 'enter'; B.t = BRL.enterT; enterDrum(); const B2 = G.barrel; if (L.from === 'open') B2.t = BRL.inT - 0.6; else if (L.from === 'exit') { B2.ph = 'sky'; B2.t = 0; B2.open = 1; } } }
  const B = G.barrel;
  if (!B) { if (L.started && (L.after += dt) > 2.8 && L.loop) labGo(); return; }
  if (L.mode === 'manual') return;
  if (B.ph === 'herald' && B.t >= BRL.winA + 0.15 && B.hold === undefined) { IN.a = true; barrelTap('a'); }
  if (B.ph === 'enter') IN.a = false;
  if (!B.scene) return;
  if (B.ph === 'in') for (const [at, k] of [[2.6, 'd'], [4.6, 'a'], [7.2, 'd']]) if (B.t >= at && !L.did[at]) { L.did[at] = 1; drumTap(k); }
  if (B.ph === 'clear' && L.mode === 'asky' && B.t > 0.5 && !L.did.asky) { L.did.asky = 1; drumTap('a'); }
  if (B.ph === 'sky' && L.mode !== 'asky' && B.t > 0.35 && !B.climb && !L.did.climb) { L.did.climb = 1; IN.a = true; drumTap('a'); }
  if (B.climb) { const stop = L.mode === 'spit' ? BRL.wakeA - 0.04 : L.mode === 'early' ? BRL.wakeA - 0.7 : 99; if (B.th >= stop) IN.a = false; }
}
function barrelLab() {
  const box = document.createElement('div'); box.id = 'blab';
  const row = (lab, key, opts) => '<div class="r"><b>' + lab + '</b>' + opts.map(([v, t]) => '<button data-k="' + key + '" data-v="' + v + '">' + t + '</button>').join('') + '</div>';
  box.innerHTML = '<style>#blab{position:fixed;left:8px;bottom:8px;z-index:95;font:12px Fredoka,system-ui,sans-serif;color:#13303a;background:rgba(255,246,227,.94);border-radius:12px;padding:8px 10px;max-width:min(94vw,560px);box-shadow:0 4px 18px rgba(0,0,0,.3)}' +
    '#blab .r{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:3px 0}#blab b{min-width:64px;font-weight:600}#blab button{font:600 12px Fredoka,system-ui,sans-serif;border:0;border-radius:8px;padding:5px 8px;background:#e8dcc2;color:#13303a;cursor:pointer}' +
    '#blab button.on{background:#1f7a6a;color:#fff}#blab .st{font-size:11px;opacity:.75;margin-top:3px}#blab.min .r,#blab.min .st{display:none}#blab .x{float:right;background:none;padding:0 2px}</style>' +
    '<button class="x" id="blabX">▾ barrel lab</button>' +
    row('View', 'view', [['side', 'Side (spiral)'], ['behind', 'From behind (tunnel)']]) +
    row('Way out', 'mode', [['spit', 'SPIT'], ['early', 'let go early'], ['late', 'hold too long'], ['asky', 'A before the sky'], ['manual', 'play yourself']]) +
    row('Start at', 'from', [['roll', 'roll-in'], ['ride', 'inside'], ['open', 'opening'], ['exit', 'way out']]) +
    row('Speed', 'speed', [['0.25', '¼'], ['0.5', '½'], ['1', '1×']]) +
    row('', 'misc', [['pause', '⏸ pause'], ['mons', 'monsters'], ['loop', 'loop'], ['go', '↻ again']]) +
    '<div class="st" id="blabSt"></div>';
  document.body.appendChild(box);
  const mark = () => box.querySelectorAll('button[data-k]').forEach(b => { const k = b.dataset.k, v = b.dataset.v;
    b.classList.toggle('on', k === 'view' ? BRL.view === v : k === 'mode' ? LAB.mode === v : k === 'from' ? LAB.from === v : k === 'speed' ? LAB.speed === +v : v === 'pause' ? LAB.pause : v === 'mons' ? LAB.mons : v === 'loop' ? LAB.loop : false); });
  box.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'blabX') { box.classList.toggle('min'); return; }
    const k = b.dataset.k, v = b.dataset.v;
    if (k === 'view') BRL.view = v; else if (k === 'mode') { LAB.mode = v; labGo(); } else if (k === 'from') { LAB.from = v; labGo(); } else if (k === 'speed') LAB.speed = +v;
    else if (v === 'pause') LAB.pause = !LAB.pause; else if (v === 'mons') LAB.mons = !LAB.mons; else if (v === 'loop') LAB.loop = !LAB.loop; else if (v === 'go') labGo();
    mark(); try { cv.focus({ preventScroll: true }); } catch (_) {} });
  mark();
  setInterval(() => { const B = G && G.barrel, st = document.getElementById('blabSt'); if (st) st.textContent = 'A = left half / A key · D = right half / D key — ' + (B ? B.ph + ' ' + B.t.toFixed(1) + ' s' + (B.kind ? ' · ' + B.kind : '') : 'on the open wave') + (LAB.pause ? ' · paused' : ''); }, 200);
  setTimeout(() => { const ov = document.getElementById('overlay'); if (ov) ov.style.display = 'none'; SPIEL.zeige('kampf', { force: true }); labGo(); }, 300);
}
if (window.BARREL_LAB) barrelLab();
