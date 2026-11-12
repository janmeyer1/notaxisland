// ============================================================================
// INSEL — island rules and campaign (First Mate, armies, finale, Board, cave) + view (dialogs, panel, banyan window, drawing, camera, frame, start)
// Shares one scope with inselgenerator.js.
// ============================================================================

// ############################ Regeln ############################
// =====================================================================
// GAME LAYER — exploration, roots and the rot (map prototype v002)
// Rules follow the rulebook draft: fog of war, Gezeit as action points,
// cat scouting, banyan roots, telegraphed rot attacks resolved at flood.
// v002: omen as hard filter, fog mask with real cat scouting, organic
// roots, louder rot, banyan marker, tortoise + briefcase storytelling.
// =====================================================================
let T0 = 11;   // the tide the island opened (v030: the beach's tide when the player first opens it; old saves: 11)
let CASE_AT = T0 + 5;
function setT0(t) { T0 = t; CASE_AT = t + 5; G.t0 = t; }   // v019: tide when the beach finds the briefcase (simulated until the merger; the beach will send a flag)
const SPRING = '✨';
const T = [];                       // tiles
const BP = {};                      // border points per ordered tile pair 'a_b' (on a's side)
const G = {
  start: -1, banyan: -1, gecko: -1, fruit: -1, flotsam: -1, nest: -1, nest2: -1, radio: -1, wreck: -1, coco: [], tut: 0, bossPlan: [],
  fi: false, fiLook: 0,   // v034: Fi, the Dark-Wood Elf (was the briefcase)
  at: -1, gezeit: RULES.baseTide, gmax: RULES.baseTide, spring: 1, springMax: 1, springSrc: ['island map unlocked'], wandel: 0, wFree: 0,
  sapGrow: 0, sapProd: 0, prio: .5, order: 'roots', rootTarget: -1, unl: {}, banyans: [], tower: false, cutting: false, mapSpent: 0, lastSap: 0, outLog: [], scen: 'typical', simRow: null,
  res: { fruit: 0, coco: 0, green: RULES.greenStart }, friends: {}, regionOpen: { 1: true },
  tide: T0, omen: null, es: {}, collapses: 0, deck: [], targets: [], tinfo: {}, phase: 'ebb', sel: -1, over: false, blevel: 0, nests: [], talk: {},
  floats: [], group: { x: 0, y: 0, tx: 0, ty: 0, t: 1 }, cat: null, catQ: [], stateDirty: true, memories: [],
  inf: 0, key: false, cave: -1, gate: -1, descent: 0, descTide: -1, below: false, caveC: [], caveT: {}, catFate: null, wandelMax: WMAX, flags: {}, mountain: false, lavaTide: -1, collapse: false, skipBeach: false,
  board: { tr: 100, st: 100, be: 100, intel: 0, off: null, pause: -1, nextOffer: T0 + 9, offers: 0 },
  boss: { alive: false, revealed: false, stage: 0, at: -1, rec: 0, ready: false, fight: false, nests: [] }, lastPrioTide: -9, armies: [], offN: 0, offLost: 0,
  moves: 0, explEbb: 0, cleanTarget: -1, now: 0, lastStage: 'Accountant', fogDirty: true, knownDirty: true, flash: -1
};
const G_GRUND0 = JSON.parse(JSON.stringify(G));   // v062: the island's defaults, before anything happens (the logbook writes only what differs)
let BASE_T = [];   // v062: the generated map (names, kinds, contents), right after the generator
let pick, stateLayer;
const $ = id => WELT.$(id);

// ---------- state layer: rot tint + edge glow, root glow ----------
function composeState() {
  VC.t = -1;
  stateLayer = stateLayer || layer();
  const c = stateLayer.x;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, CW * K, CH * K); c.setTransform(K, 0, 0, K, 0, 0);
  T.forEach(t => {
    if (t.state === 0) return;
    const [bx, by, bw, bh] = t.bb;
    if (t.b > 0) {
      c.globalAlpha = .2 * t.b; c.globalCompositeOperation = 'multiply'; drawTinted(c, t, '#3d6a2a', bx, by, bw, bh);
      c.globalAlpha = .05 * t.b; c.globalCompositeOperation = 'source-over'; drawTinted(c, t, '#6dff3a', bx, by, bw, bh);
      c.globalAlpha = 1; c.save(); c.clip(t.path); c.lineJoin = 'round';
      c.strokeStyle = 'rgba(90,255,50,' + (.1 + .07 * t.b) + ')'; c.lineWidth = 6 + 4 * t.b; c.stroke(t.path);
      c.strokeStyle = 'rgba(160,255,110,' + (.25 + .12 * t.b) + ')'; c.lineWidth = 3; c.stroke(t.path); c.restore();
    }
    if (t.rooted) { c.globalAlpha = .10; c.globalCompositeOperation = 'screen'; drawTinted(c, t, '#c8ff9a', bx, by, bw, bh); }
  });
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  G.stateDirty = false;
}
const tintCache = {};
function drawTinted(c, t, col, bx, by, bw, bh) {
  const key = t.id + col;
  if (!tintCache[key]) { const cc = document.createElement('canvas'); cc.width = t.tint.width; cc.height = t.tint.height; const x = cc.getContext('2d'); x.drawImage(t.tint, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, cc.width, cc.height); tintCache[key] = cc; }
  c.drawImage(tintCache[key], bx, by, bw, bh);
}

// ---------- rules helpers ----------
const stage = () => STAGES.filter(s => G.wandel >= s[0]).pop()[1];
const isAccountant = () => G.wandel <= 4;
const rootCount = () => T.filter(t => t.rooted).length;
// v061: spring hours for real achievements — shown loud: banner, float, the tide pill flashes
const SPRING_ERFOLG = { roots: 'roots around the banyan', nest1: 'the first nest burned', gecko: 'the gecko is your friend', tower: 'the beach tower stands', offshoot: 'your first offshoot', nest2: 'a nest on the cliffs burned', offensive: 'you held out against an offensive' };
function springErfolg(key) {
  if (G.springSrc.includes(key)) return false; G.springMax++; G.spring++; G.springSrc.push(key);
  const txt = '+1 ✨ spring hour — ' + (SPRING_ERFOLG[key] || key); banner(txt); toast('✨ <b>' + txt + '</b><br><small>From now on every tide. Spring hours work on the beach and here.</small>');
  if (G.group) addFloat(G.group.x, G.group.y - 46, '+1 ✨', '#ffe08a'); G.springFlash = G.now; const p = $('hTideP'); if (p) { p.classList.remove('springUp'); void p.offsetWidth; p.classList.add('springUp'); }
  say1('springErfolg', 'tortoise', 'A spring hour, earned. Every deed like that gives you one more, for good — the golden kind, beach or island.', true); updateHUD(); return true;
}
function addWandel(d) { G.wandel = clamp(G.wandel + d, 0, G.wandelMax || WMAX); if (d > 0) { G.wFree += d; unlockRule('wandel'); } }
const stageIdx = () => STAGES.filter(s => G.wandel >= s[0]).length - 1;
const sightMul = () => 1 + .25 * stageIdx();
const isTree = id => (id === G.banyan && G.friends.banyan) || !!T[id].ableger;
function setRooted(t, v, rs) { if (t.rooted === v) return; t.rooted = v; t.rs = v ? (rs || 1) : 0; if (v) { t.rootBorn = G.now; t.welk = false; delete t.welkSeit; } G.stateDirty = true; }   // v063: new roots start at strength 1 again (Jan: the hard variant)
// v061: a root that drops to 0 withers instead of vanishing — it regrows by itself once its tile is clean again (with a rooted neighbour)
function welken(t, x, y) { setRooted(t, false); t.welk = true; t.welkSeit = G.tide;   // v063: withered for at least one whole flood — the trebuchets get their chance
  rootFx(t.id, 1, 0); if (t.state > 0) addFloat(x, y - 16, 'the root withers', '#ffb0a0'); say1('welk', 'tortoise', 'That root withered — it is not dead. Clean the tile and it grows back on its own, as long as a rooted tile is next door.'); }
function rootFx(id, from, to) { (G.rootFx = G.rootFx || []).push({ id, from, to, t0: G.now }); }   // the strand snaps on the map
function welkNachwachsen() {
  let n = 0; T.forEach(t => { if (!t.welk || t.rooted || t.b > 0 || t.reg === 5 || t.source || !(t.welkSeit === undefined || t.welkSeit < G.tide)) return; if (![...t.nb].some(m => T[m].rooted) || rootCap(t.id) === 0) return;
    setRooted(t, true, 1); n++; if (t.state > 0) addFloat(...tileXY(t.id), '🌱 the root regrows', '#c8ffb0'); });
  return n;
}
function crossOk(a, b) {
  if ((a === G.gate && b === G.cave) || (a === G.cave && b === G.gate)) return G.key ? { ok: true } : { ok: false, why: '🔒 A rusted service gate. Locked. The bats fly through the bars.' };
  const ra = regOf(T[a].reg), rb = regOf(T[b].reg);
  if (T[b].reg === 5) return { ok: false, why: 'Deep water. You would need help from the sea.' };
  if (ra === rb) return { ok: true };
  const key = Math.min(ra, rb) + '-' + Math.max(ra, rb);
  if ((ra === 6 && rb === 3) || (ra === 3 && rb === 6)) { if (T[G.cave].tunnel) return { ok: true }; }
  if (ra === 6 || rb === 6) return { ok: false, why: '⛰ Solid rock. From the cave mouth there is no way up the mountain — not from out here.' };
  if (key === '1-2') return G.friends.gecko ? { ok: true } : { ok: false, why: '⛰ A sheer rock wall. Someone who climbs could show you the way.' };
  if (key === '1-3' || key === '2-3') return { ok: false, closed: 'fire', why: '🔥 Fire Mountain is closed this season. (Not part of this prototype.)' };
  return { ok: false, closed: 'tangle', why: '🌿 The tangle is closed this season. (Not part of this prototype.)' };
}
// the cat obeys the same hard borders, but ignores who you've befriended
function catCan(a, b) { if (T[b].reg === 5) return false; return regOf(T[a].reg) === regOf(T[b].reg); }
const infStep = () => G.inf >= 8 ? 2 : G.inf >= 5 ? 1 : 0;
function moveCost(a, b) { const base = RULES.costMove[T[b].type] || 1; return Math.max(0, base - (T[a].rooted && T[b].rooted ? 1 : 0)) + T[b].b + infStep(); }
function addInf(n) { const was = G.inf; G.inf = clamp(G.inf + n, 0, 12); if (n > 0) unlockRule('befall'); if (was < 5 && G.inf >= 5) prio('tortoise', 'You\'re turning green', 'Blight ' + G.inf + '. The rot is in your lungs, darling — spores, ink, paperwork.\nFrom 5 every step costs 1 hour more, from 8 two more. At 10 you collapse.\nIt clears when you finish what you start: a rot tile scrubbed to 0 (−2), a nest gone (−4). And every flood a well-defended tile lets you breathe: half its defence comes off.', { must: true, key: 'inf5', valid: () => G.inf >= 4 }); }
// defence: root strength + support from healthy rooted neighbours (max +2) + protected + friend + Crusoe
function support(t) { let n = 0; t.nb.forEach(x => { const o = T[x]; if (o.rooted && o.b === 0 && o.reg !== 5) n++; }); return Math.min(2, n); }
function defense(t) { return (t.rooted ? t.rs : 0) + support(t) + (t.prot ? 1 : 0) + (friendOn(t.id) ? 1 : 0) + (G.at === t.id && !G.below ? 1 : 0); }
function defParts(t) { return [['roots', t.rooted ? t.rs : 0], ['healthy neighbours', support(t)], ['protected', t.prot ? 1 : 0], ['friend', friendOn(t.id) ? 1 : 0], ['you', G.at === t.id && !G.below ? 1 : 0]].filter(p => p[1]); }
function friendOn(id) { return (id === G.banyan && G.friends.banyan) || (id === G.gecko && G.friends.gecko); }
function attackFrom(t) { let a = 0, f = -1; t.nb.forEach(n => { if (T[n].b > a) { a = T[n].b; f = n; } }); return f; }
// attack: every neighbouring rot tile is an arm — strongest arm + 1 per extra arm; a banyan only feels the strongest arm
function arms(t) { return [...t.nb].map(n => T[n]).filter(o => o.b > 0 && o.reg !== 5).map(o => o.b).sort((a, b) => b - a); }
function attackOn(t) {
  const a = arms(t); if (!a.length) return 0;
  return a[0] + (a.length - 1);   // v009: a banyan feels every arm too
}
function treeDist() {   // steps over land from the nearest living tree (banyan or offshoot)
  const d = new Array(T.length).fill(1e9), q = [];
  G.banyans.forEach(id => { if (T[id].rooted && (id !== G.banyan || G.friends.banyan)) { d[id] = 0; q.push(id); } });
  while (q.length) { const a = q.shift(); T[a].nb.forEach(n => { if (T[n].reg !== 5 && d[n] > d[a] + 1) { d[n] = d[a] + 1; q.push(n); } }); }
  return d;
}
function capOf(dd) { dd -= G.unl && G.unl.deepRoots ? 1 : 0; return dd <= 1 ? 3 : dd === 2 ? 2 : dd === 3 ? 1 : 0; }   // v016
function rootCap(id, td) { return capOf((td || treeDist())[id]); }
function growWhy(t) {   // v060: why a root can't go here — shown on the greyed button
  if (t.b >= 2) return 'too much rot (max 1) — cleanse first'; if (t.id === G.cave) return 'not in the cave';
  if (rootCap(t.id) === 0) return 'too far from a banyan';
  if (![...t.nb].some(n => T[n].rooted)) return 'needs a rooted tile next door';
  if (![...t.nb].some(n => T[n].rooted && crossOk(n, t.id).ok)) return 'the roots can\'t cross here';
  return '';
}
function canGrowTo(t) {
  if (t.rooted || t.reg === 5 || t.id === G.cave || t.b >= 2 || t.state === 0 || rootCap(t.id) === 0) return false;
  for (const n of t.nb) if (T[n].rooted && crossOk(n, t.id).ok) return true;
  return false;
}
// v016: where the rot has won completely, it builds a new nest: a rot-3 tile whose land neighbours are all rot 3 and none of them a nest
// v058: before Listen (at most 10 island hours) the rot beyond the shore region sleeps: its nests do not feed, nothing there spreads
// v059: after Listen (or 10 tides) the regions wake one per tide, the one nearest the banyan first — no avalanche
function rotSchlaeft(id) {
  if (!tutFertig()) { const n2 = G.nest2; if (G.tut < TUT_SPILL || n2 < 0 || T[n2].source !== 'nest') return true;   // v061: in the tutorial everything sleeps — from the spillover step only the cliff nest acts
    const tn = G._tn || new Set([n2]); return !(tn.has(id) || [...T[id].nb].some(n => tn.has(n))); }
  const r = T[id].reg; if (r === T[G.start].reg) return false;
  if (G.wachAb === undefined || G.wachAb === null) { if (G.tide < (G.schlafBis || 0)) return true; G.wachAb = G.tide; G.wachRang = null; say1('rotWakes', 'tortoise', 'The nests beyond the shore are waking. One region a tide, the nearest first. Roots before they reach you.'); }
  if (!G.wachRang) { const d = bfsFrom(G.banyan), m = {}; T.forEach(t => { if (t.reg === 5 || t.reg === T[G.start].reg) return; m[t.reg] = Math.min(m[t.reg] === undefined ? 1e9 : m[t.reg], d[t.id]); });
    G.wachRang = {}; Object.keys(m).sort((a, b) => m[a] - m[b]).forEach((k, i) => { G.wachRang[k] = i + 1; }); }
  return G.tide < G.wachAb + (G.wachRang[r] || 1);
}
function tutNetz() { if (tutFertig() || G.nest2 < 0) { G._tn = null; return; } const { comp } = networks(), c = comp[G.nest2]; G._tn = new Set(c >= 0 ? T.filter(t => comp[t.id] === c).map(t => t.id) : [G.nest2]); }
function nestGrowth() { return;   // v061: new nests only come from the story (spawnNests)
  if (G.tide < 16) return; const td = treeDist();
  const cand = T.filter(t => { if (t.b < 3 || rotSchlaeft(t.id) || t.source === 'nest' || t.reg === 5 || t.id === G.cave || G.banyans.includes(t.id) || td[t.id] <= 1) return false;
    const land = [...t.nb].filter(n => T[n].reg !== 5 && n !== G.cave); return land.length >= 3 && land.every(n => T[n].b >= 3 && T[n].source !== 'nest'); });
  if (!cand.length) return; const t = cand[(Math.random() * cand.length) | 0];
  t.source = 'nest'; t.owner = null; t.name = 'Rot nest'; if (!G.nests.includes(t.id)) G.nests.push(t.id); G.stateDirty = true;
  if (t.state > 0) addFloat(...tileXY(t.id), 'a new nest!', '#9dff7a');
  const n = rep('nestGrow'); if (n === 1) say('tortoise', 'Where the rot has everything, it builds. A new nest — ' + (t.state > 0 ? 'there, ' + t.name.toLowerCase() + ' on ' + t.type : 'somewhere under the clouds') + '. Rot that nobody fights gets ideas.'); else if (n === 2) say('tortoise', 'Another nest grew out of solid rot.'); else say('tortoise', '☠ New nest.');
}
function frontDist() {   // steps to the nearest tree or rooted tile (the front you defend)
  const d = new Array(T.length).fill(1e9), q = []; T.forEach(t => { if (t.rooted || G.banyans.includes(t.id)) { d[t.id] = 0; q.push(t.id); } });
  if (!q.length) { d[G.start] = 0; q.push(G.start); }
  while (q.length) { const a = q.shift(); T[a].nb.forEach(n => { if (d[n] > d[a] + 1) { d[n] = d[a] + 1; q.push(n); } }); }
  return d;
}
function distToStart() {
  const src = G.friends.banyan ? G.banyan : G.start, d = new Array(T.length).fill(1e9), q = [src]; d[src] = 0;
  while (q.length) { const a = q.shift(); T[a].nb.forEach(n => { if (d[n] > d[a] + 1) { d[n] = d[a] + 1; q.push(n); } }); }
  return d;
}
function newDeck() { G.deck = []; for (let k = 0; k < 3; k++) G.deck.push(...OMEN_TYPES); for (let i = G.deck.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [G.deck[i], G.deck[j]] = [G.deck[j], G.deck[i]]; } }
const omenType = t => t.type === 'tangle' ? 'jungle' : t.type === 'lava' ? 'slope' : t.type;
// Bad Omen = hard filter on land TYPES you have already seen somewhere; it then strikes any tile
// of that type next to rot — under the clouds too. Every rot network grows one spearhead.
function seenTypes() { const s = new Set(); T.forEach(t => { if (t.state > 0 && t.reg !== 5) s.add(omenType(t)); }); return s; }
function networks() {      // connected rot areas (land) with their nests and each nest's share
  const comp = new Array(T.length).fill(-1), nets = [];
  T.forEach(t => {
    if (t.b <= 0 || t.reg === 5 || comp[t.id] >= 0) return;
    const ids = [], q = [t.id]; comp[t.id] = nets.length;
    while (q.length) { const a = q.shift(); ids.push(a); T[a].nb.forEach(n => { if (comp[n] < 0 && T[n].b > 0 && T[n].reg !== 5) { comp[n] = nets.length; q.push(n); } }); }
    nets.push({ ids, nests: ids.filter(id => T[id].source === 'nest') });
  });
  nets.forEach(net => {     // each tile belongs to its nearest nest inside the network
    net.share = {}; if (!net.nests.length) return;
    const own = {}, q = []; net.nests.forEach(n => { own[n] = n; q.push(n); net.share[n] = []; });
    const inNet = new Set(net.ids);
    while (q.length) { const a = q.shift(); net.share[own[a]].push(a); T[a].nb.forEach(n => { if (inNet.has(n) && own[n] === undefined) { own[n] = own[a]; q.push(n); } }); }
  });
  return { comp, nets };
}
function mergeK() { return G.board.st < 50 ? 1 / 6 : RULES.merge; }
const pushNeed = () => G.board.be < 25 ? 1 : 2;
// chance that a tile holds, by defence − attack: 0 → 50 %, +1 → 80 %, +2 → 92 %, +3 or more → 99 % (mirrored when attack is higher)
function holdChance(d, a) { const x = d - a, t = [.5, .8, .92, .99]; return x >= 0 ? t[Math.min(3, x)] : 1 - t[Math.min(3, -x)]; }
const pct = v => Math.round(v * 100) + ' %';
function nestPower(net, n) {   // power = tiles in its own share + 1/3 of every merged partner's share
  let p = net.share[n].length;
  net.nests.forEach(m => { if (m !== n) p += Math.floor(net.share[m].length * mergeK()); });
  if (G.board.tr < 50) p = Math.max(0, p - 1);
  return p;
}
// v063: steep flanks (Fire Mountain's slopes) carry no war machines
function nachschub() { return tutFertig() ? Math.max(0, Math.floor((G.tide - 10) / 10)) : 0; }   // v063: at tide 20, 30, 40 … the Board lands supplies — one more spearhead per network
function steil(t) { return t.type === 'slope'; }
function treboOk(n) { const x = T[n]; return x && x.b < RULES.maxRot && !x.source && x.reg !== 5 && x.id !== G.cave && !rotSchlaeft(n); }
function istFront(t) { return [...t.nb].some(treboOk); }
function treboReich(t) { return t.turm !== undefined ? 2 : 1; }
function treboFeuert(t) { const k = G.tide - t.trebo; return k >= 1 && k % 2 === 1; }   // built (or the tower finished) → loads one flood, fires the next, and so on
function treboImRing(t) { const out = new Set(), r = treboReich(t); let fr = [t.id]; const seen = new Set(fr);
  for (let k = 0; k < r; k++) { const nx = []; fr.forEach(i => T[i].nb.forEach(n => { if (seen.has(n) || T[n].reg === 5) return; seen.add(n); nx.push(n); if (treboOk(n)) out.add(n); })); fr = nx; } return [...out]; }
function treboWahl(t, d) { let best = -1; treboImRing(t).forEach(n => { if (G.targets.includes(n)) return; if (best < 0 || d[n] < d[best]) best = n; }); return best; }
function planFlood(keepOmen) {
  tutNetz();
  const d = distToStart();
  const cand = T.filter(t => !t.source && t.reg !== 5 && t.id !== G.cave && t.b < RULES.maxRot && !(t.vent > G.tide) && !rotSchlaeft(t.id) && [...t.nb].some(n => T[n].b > 0 && T[n].reg !== 5));
  const eligible = new Set(cand.map(omenType));   // v009: the omen may name land you have never seen
  if (!keepOmen) G.omen = null;
  G.tinfo = {};
  if (!G.omen && eligible.size) {
    if (![...G.deck].some(o => eligible.has(o))) newDeck();
    for (let i = G.deck.length - 1; i >= 0; i--) if (eligible.has(G.deck[i])) { G.omen = G.deck.splice(i, 1)[0]; break; }
  }
  G.targets = [];
  if (G.ruheBis !== undefined && G.tide <= G.ruheBis) { G.tinfo = {}; mergeWatch(); banyanWatch(); VC.t = -1; G.stateDirty = true; updateHUD(); return; }   // v061: the Board paid for quiet
  const dF = frontDist();
  if (G.omen) {
    const { comp, nets } = networks();
    const per = 1 + (offActive() ? 1 : 0) + nachschub();   // v022: an offensive's three tides only strengthen the automatic rot · v063: +1 for every Board supply drop (every 10 tides)
    nets.forEach((net, ci) => {   // spearheads per network: the closest matching tiles (shaken regime: sometimes a random one)
      for (let k = 0; k < per; k++) {
        const sc = t => .6 * d[t.id] + .4 * dF[t.id];   // v016: 0.6 × steps to the banyan + 0.4 × steps to the nearest tree or root
        const list = cand.filter(t => omenType(t) === G.omen && !G.targets.includes(t.id) && [...t.nb].some(n => comp[n] === ci)).sort((a, b) => sc(a) - sc(b));
        if (!list.length) {   // v070: more spearheads than open targets (supply drops) — a second one goes for a tile that is already marked; never three on one
          const twice = cand.filter(t => omenType(t) === G.omen && G.targets.filter(x => x === t.id).length === 1 && [...t.nb].some(n => comp[n] === ci)).sort((a, b) => sc(a) - sc(b));
          if (twice.length && k >= 1 + (offActive() ? 1 : 0)) G.targets.push(twice[0].id); else break; continue; }
        const c = G.board.st < 75 && Math.random() < .5 ? list[(Math.random() * list.length) | 0] : Math.random() < .3 ? list[(Math.random() * Math.min(3, list.length)) | 0] : list[0];
        G.targets.push(c.id);
      }
    });
    G.targets.sort((a, b) => d[a] - d[b]);
  }
  G.targets.forEach(id => G.tinfo[id] = { from: attackFrom(T[id]), overflow: false });
  // v063: the rot's war machines. Rot 3 (no source, no root, not on the steep flanks of Fire Mountain) builds:
  //  · at the FRONT (a neighbour still below 3): a trebuchet — it loads one flood, fires the next (all of them, no cap), range 1;
  //  · BEHIND the front (all neighbours rot 3): a wide tower in 3 floods, then a trebuchet on top — load / fire, range 2.
  T.forEach(t => { if (t.b >= RULES.maxRot && !t.source && !t.rooted && t.reg !== 5 && !steil(t)) { if (t.full3 === undefined) t.full3 = G.tide; } else { delete t.full3; delete t.turm; delete t.trebo; } });
  T.forEach(t => { if (t.full3 === undefined) return; const front = istFront(t);
    if (!front && t.turm === undefined && t.trebo === undefined) t.turm = G.tide;   // behind the front: start a tower
    if (t.turm !== undefined && t.trebo === undefined && G.tide - t.turm >= RULES.turmBau) t.trebo = G.tide;   // the tower stands: a trebuchet goes up on it
    if (front && t.turm === undefined && t.trebo === undefined && t.full3 < G.tide) t.trebo = t.full3; });
  if (!(G.board.tr < 75 && G.tide % 2)) {   // a strained treasury only pays for the shots every 2nd flood
    const shooters = T.filter(t => t.trebo !== undefined && treboFeuert(t) && !rotSchlaeft(t.id)).sort((a, b) => d[a.id] - d[b.id]);
    shooters.forEach(t => { const z = treboWahl(t, d); if (z >= 0) { G.targets.push(z); G.tinfo[z] = { from: t.id, overflow: true }; } });
  }
  mergeWatch(); banyanWatch(); VC.t = -1;
  if (G.targets.some(id => T[id].state > 0)) { unlockRule('rot'); unlockRule('omen'); }
  G.stateDirty = true; updateHUD();
}
// the briefcase warns when two rot networks are one tile apart, and again when they merge
function mergeWatch() {
  const { comp, nets } = networks();
  if (nets.some(n => n.nests.length > 1 && n.nests.some(id => T[id].state > 0))) { prio('briefcase', 'Merger completed', 'Two nests, one network. Each keeps its own strength and takes a third of the other\'s on top.\nSynergies — theirs, not ours.', { must: true, key: 'merged', ill: 'merge' }); return; }
  const mt = mergeTiles({ comp, nets }).find(id => T[id].state > 0 && G.targets.includes(id));
  if (mt !== undefined) { prio('briefcase', 'Audit note: merger risk', 'The rot strikes a tile between two networks this flood — the red one on your map. One hit is enough: if it rots, the networks touch, and each nest feeds a third of the other\'s tiles on top.\nCompound interest. The bad kind. Hold that tile.', { must: true, key: 'mergeWarn', ping: mt, urgent: true, valid: (t0 => () => G.tide === t0)(G.tide), ill: 'merge' }); }
}
// flood step: every nest strengthens its own share, one +1 per power point
function nestPhase() {
  tutNetz();
  const { nets } = networks(), d = distToStart(), hits = [];
  const allN = nets.flatMap(net => net.nests), skip = G.board.st < 25 && allN.length ? allN[(Math.random() * allN.length) | 0] : -1;   // embezzlement
  nets.forEach(net => net.nests.forEach(n => {
    if (rotSchlaeft(n)) return;   // v058: asleep
    if (n === skip) { if (T[n].state > 0) addFloat(...tileXY(n), 'embezzled', '#d7c2ff'); return; }
    let p = nestPower(net, n);
    const pool = net.share[n].filter(id => T[id].b < RULES.maxRot && T[id].rotBorn !== G.tide && !rotSchlaeft(id)).sort((a, b) => T[a].b - T[b].b || d[a] - d[b]);   // fresh rot is fed from the next flood on
    for (const id of pool) { if (p <= 0) break; if (hits.includes(id)) continue; if (id === G.banyan && !tutFertig() && T[id].b >= 2) continue; T[id].b++; hits.push(id); p--; }
  }));
  hits.forEach(id => { if (T[id].state > 0) addFloat(...tileXY(id), G.banyans.includes(id) ? '+1 rot · fed by a nest' : '+1 rot', G.banyans.includes(id) ? '#ff9a8a' : '#9dff7a'); });   // v020: feeding no longer costs root strength
  if (G.board.be < 50) T.forEach(t => { if (t.b > 0 && !t.source && t.reg !== 5 && !hits.includes(t.id) && [...t.nb].some(n => T[n].rooted && T[n].rs >= 2 && T[n].b === 0) && Math.random() < .2) { t.b--; if (t.state > 0) addFloat(...tileXY(t.id), 'defects', '#c8ffb0'); } });   // low belief: rot next to strong roots gives up
  if (hits.some(id => T[id].state > 0)) say1('nestGrow', 'tortoise', 'They keep feeding. The longer you wait, the harder it gets. Go for the source.'); unlockRule('nests');
  G.stateDirty = true;
  return hits.length;
}
// flood step: the banyan works healthy rooted tiles (max = its level) and strengthens roots by itself
function sapOf(t) { if (!t.rooted || t.b > 0) return 0; return (isTree(t.id) ? RULES.sapYield.banyan : (RULES.sapYield[t.type] || 0)) + (t.content && t.content.kind === 'res' ? RULES.fruitSap : 0); }
function growthNeed() { const g = RULES.growth[Math.min(G.blevel - 1, RULES.growth.length - 1)] || 60; return Math.round(g * (stageIdx() >= 2 ? .8 : 1)); }
// which tiles each tree works this flood: its own tile, then the best healthy rooted tiles, up to its level
function workedTiles() {
  const trees = G.banyans.filter(id => T[id].rooted), taken = new Set(), out = [];
  trees.forEach(id => {
    const lv = treeLvl(id), d = bfsFrom(id);
    const pool = T.filter(t => sapOf(t) > 0 && !taken.has(t.id)).sort((a, b) => (b.id === id) - (a.id === id) || sapOf(b) - sapOf(a) || d[a.id] - d[b.id]);
    pool.slice(0, lv).forEach(t => { taken.add(t.id); out.push(t.id); });
  });
  return out;
}
function bfsFrom(src) { const d = new Array(T.length).fill(1e9), q = [src]; d[src] = 0; while (q.length) { const a = q.shift(); T[a].nb.forEach(n => { if (d[n] > d[a] + 1) { d[n] = d[a] + 1; q.push(n); } }); } return d; }
function handBonus() { const t = T[G.at]; return t.rooted && t.b === 0 && !G.below ? stageIdx() : 0; }
function treeLvl(id) { return id === G.banyan ? G.blevel : Math.max(1, Math.ceil(G.blevel / 2) - (T[id].sac || 0)); }
function sapEstimate() { return workedTiles().reduce((a, id) => a + sapOf(T[id]), 0) + (G.friends.banyan ? handBonus() : 0); }
function rootPick() {
  const td = treeDist();
  if (G.rootTarget >= 0 && T[G.rootTarget].rooted && T[G.rootTarget].rs < Math.min(RULES.maxRoot, rootCap(G.rootTarget, td))) return T[G.rootTarget];
  G.rootTarget = -1;
  const d = distToStart();
  return T.filter(t => t.rooted && t.b < 3 && t.rs < Math.min(RULES.maxRoot, rootCap(t.id, td))).sort((a, b) => {
    const fa = [...a.nb].some(n => T[n].b > 0) ? 0 : 1, fb = [...b.nb].some(n => T[n].b > 0) ? 0 : 1;
    return fa - fb || a.rs - b.rs || d[a.id] - d[b.id];
  })[0];
}
// v014: a tree that reaches rot 3 burns rings of its life to push the rot back: level ≥3 → −2 levels, −2 rot; level 2 → −1, −1; level 1 → it dies
// v061: the trebuchet shot — the ball always lands: a root loses a step first; only a tile without root gets +1 rot
async function treboSchuss(from, id) {
  const t = T[id], [x, y] = tileXY(id); G.shot = { from, to: id, t0: G.now }; await sleep(900); G.shot = null;
  prio('tortoise', 'The trebuchet fires', 'A rot-3 tile whose root is gone builds a trebuchet. It loads one flood and fires the next — at the tile nearest the banyan. Behind the front the rot builds towers first: those shoot two tiles far.\nThe ball always lands: a root there loses one step; only a tile without a root gets +1 rot.\nCleanse the trebuchet tile below three and it falls apart.', { key: 'trebuchet', ill: 'overflow', urgent: true });
  if (t.rooted && !(G.banyans.includes(id) && t.rs <= 1)) { t.rs--; rootFx(id, t.rs + 1, t.rs); if (t.rs <= 0) welken(t, x, y); else addFloat(x, y - 16, '💥 root −1', '#ffb0a0'); return; }
  if (t.b === 0) t.rotBorn = G.tide; t.b = Math.min(id === G.banyan && !tutFertig() ? 2 : 3, t.b + 1); addFloat(x, y, '💥 +1 rot', '#ff9a8a'); G.es.spill = (G.es.spill || 0) + 1;
  if (t.b >= 2 && friendOn(id) && id !== G.banyan) { G.friends.gecko = false; G.springMax--; G.springSrc = G.springSrc.filter(z => z !== 'gecko'); addFloat(x, y - 30, 'the gecko flees', '#ffb0a0'); }
  if ((t.ableger || id === G.banyan) && t.b >= 3) await treeBurn(id);
}
async function treeBurn(id) {
  const t = T[id], main = id === G.banyan, lv = main ? Math.max(1, G.blevel) : treeLvl(id), [x, y] = tileXY(id);
  if (lv <= 1) {
    if (main) { G.over = true; return; }
    t.ableger = false; G.banyans = G.banyans.filter(b => b !== id); setRooted(t, false); addFloat(x, y - 30, 'the offshoot dies', '#ffb0a0'); G.stateDirty = true; return;
  }
  const n = lv >= 3 ? 2 : 1;
  if (main) G.blevel -= n; else t.sac = (t.sac || 0) + n;
  t.b -= n; G.stateDirty = true; sfxBurn();
  { const dd = bfsFrom(id); T.forEach(o => { if (o.source === 'nest' && o.b > 0 && dd[o.id] <= 2) { o.b--; const [ox, oy] = tileXY(o.id); addFloat(ox, oy - 20, '🔥 the nest flinches · −1', '#ffc070'); } }); }   // v060: the fire reaches the nests that feed it — or the burn buys nothing
  addFloat(x, y - 34, '🔥 −' + n + ' level' + (n > 1 ? 's' : '') + ' · −' + n + ' rot', '#ffb070');
  const left = main ? G.blevel : treeLvl(id);
  G.lastBurn = { tide: G.tide, from: lv, to: left, main };   // v040: for the threat box
  { await camLook(id); const [bx, by] = tileXY(id); camGo({ x: bx, y: by - 20, z: CAM.zMax }, .5); G.burn = { id, t0: G.now, from: lv, to: left, n, main }; await sleep(3200); G.burn = null; addFloat(bx, by - 40, '−' + n + ' rot', '#c8ffb0'); }
  await showCardWait(main ? 'The banyan burns' : 'The offshoot burns', 'It burned <b>' + n + ' ring' + (n > 1 ? 's' : '') + '</b> to push the rot back to <b>' + t.b + '</b>. Level now <b>' + left + '</b>. ' + ('The heat hit the nests nearby too. ' + (left >= 3 ? 'It can do this again — two rings at a time.' : left === 2 ? 'Next time it can only spare one ring.' : '<b>At level 1 it has nothing left to burn.</b>')), 'Hold on');
}
// v014: rot 3 eats the root on its tile — one step per flood (after the sap has flowed, so pumping sap in buys time)
function rotEatsRoots() {
  T.forEach(t => { if (!t.rooted || t.b < 3 || steil(t)) return; if (G.banyans.includes(t.id) && t.rs <= 1) return;   // v024: trees keep root 1
    t.rs--; const [x, y] = tileXY(t.id);
    rootFx(t.id, t.rs + 1, t.rs); if (t.rs <= 0) welken(t, x, y); else if (t.state > 0) addFloat(x, y - 16, 'the trebuchet hits its own root · −1', '#ffb0a0');
    say1('rotEats', 'tortoise', 'Rot 3 builds a trebuchet. While a root holds the tile it fires at that root — one step every flood. Once the root is gone it fires at the next tile. Cleanse it below three.'); G.stateDirty = true; });
}
// v014 order "clean rot": the banyan scrubs before the rot strikes — itself first, then rot 3 on its roots, then rotten roots, then the front
function prodStuck() { return G.friends.banyan && G.prio < 1 && ((G.order === 'roots' && !nextRoot()) || (G.order === 'clean' && !cleanPick())); }   // v016: production that goes nowhere
function cleanPick() {
  const ok = t => t.b > 0 && !t.source && t.reg !== 5 && t.id !== G.cave && (G.banyans.includes(t.id) || (t.rooted && t.rs >= (G.unl.cleanRot2 ? 2 : 3)));
  if (G.cleanTarget >= 0 && ok(T[G.cleanTarget])) return T[G.cleanTarget];
  const d = distToStart(), rank = t => G.banyans.includes(t.id) ? 0 : t.b >= 3 ? 1 : 2;
  return T.filter(ok).sort((a, b) => rank(a) - rank(b) || b.b - a.b || d[a.id] - d[b.id])[0] || null;
}
function cleanPhase() {
  if (!G.friends.banyan || G.order !== 'clean') return 0; let n = 0;
  while (G.sapProd >= RULES.cleanSap && n < RULES.cleanMax) { const t = cleanPick(); if (!t) break; t.b--; G.sapProd -= RULES.cleanSap; n++; if (G.cleanTarget === t.id && t.b === 0) G.cleanTarget = -1;
    if (t.state > 0) addFloat(...tileXY(t.id), '🧹 rot −1', '#c8ffb0'); }
  if (n) { G.stateDirty = true; say1('cleanRot', 'tortoise', 'The banyan scrubbed ' + n + ' rot before the sea came back. Expensive sap — but it doesn\'t get tired.'); }
  return n;
}
function sapPhase() {
  if (!G.friends.banyan) return 0;
  const sap = sapEstimate(); G.lastSap = sap;
  let grow = sap * G.prio, prod = sap - grow;
  if (G.flutHielt && G.flutHielt.n > 0 && G.flutHielt.held === 0) {   // v070: the banyan grows only in a flood in which something was held — its growth sap goes into work instead
    prod += grow; grow = 0; const [gx, gy] = tileXY(G.banyan); addFloat(gx, gy - 70, 'no growth — nothing held', '#ffb0a0');
    say1('keinWuchs', 'tortoise', 'Nothing held this flood, so the banyan did not grow — it put the sap into work instead. It grows when the island holds something. Stand somewhere, darling.'); }
  G.sapGrow += grow; G.sapProd += prod;
  const [bx, by] = tileXY(G.banyan); addFloat(bx, by - 52, '+' + (Math.round(sap * 10) / 10) + ' sap', '#c8ffb0');
  { const db = bfsFrom(G.banyan); G.sapFx = { t0: G.now, src: T.filter(t => t.rooted && t.b === 0 && t.id !== G.banyan && t.state > 0).sort((a, b) => db[a.id] - db[b.id]).slice(0, Math.max(1, G.blevel)).map(t => t.id) }; }
  while (G.sapGrow >= growthNeed()) { G.sapGrow -= growthNeed(); G.blevel++; addFloat(bx, by - 70, 'Banyan level ' + G.blevel, '#ffe08a'); say1('growLv', 'tortoise', 'The banyan grew a level. It now works one more tile. More tiles, more sap. You see where this goes.'); }
  if (G.order === 'tower' && G.sapProd >= RULES.towerSap) {
    G.sapProd -= RULES.towerSap; G.tower = true; G.order = 'roots'; addFloat(...tileXY(G.start), 'thorn tower!', '#c8ffb0'); springErfolg('tower'); G.towerRing = true;
    showCard('The beach tower', 'Strangling roots twist up out of Crab Beach into a tower of thorns. <b>It can tend the beach for you: crabs, coconuts, rum for the tortoise</b> — with the beach hours you leave unused, at the start of each ebb.<br><br>Switch it on with the glowing wheel on the compass (Silver). <span class="gold">+1 ✨ spring hour</span> for building it.');
    say('tortoise', 'A tower! For me? Well — for the beach. I approve. Switch it on when you like; it only uses the beach hours you would have wasted.');
  } else if (G.order === 'tower2' && G.sapProd >= RULES.towerSap && G.tower) {   // v043
    G.sapProd -= RULES.towerSap; G.tower2 = true; G.order = 'roots'; addFloat(...tileXY(G.start), 'tower II!', '#ffe08a');
    showCard('Tower II', 'A second ring of thorns climbs the beach tower. <b>The beach fights for itself now:</b> the tower rides a stage for you — up to two stages past the last one you rode yourself — at about 70 % of what you usually bring home — it can lose, and your upgrades decide the odds. Bosses stay yours. Tap the right wheel on top of the compass twice (Gold).');
  } else if (G.order === 'ableger' && G.sapProd >= RULES.ablegerSap && G.blevel >= 2) {
    G.sapProd -= RULES.ablegerSap; G.cutting = true; G.order = 'roots'; G.blevel = Math.max(1, G.blevel - 1);
    prio('tortoise', 'A cutting', 'You\'re carrying a piece of the banyan now. Don\'t sit on it.\nTake it up to the cliffs — Region II — to a free tile next to your roots, and plant it: 1 hour. It becomes a banyan of its own, level 1, and its sap joins the first.', { must: true, urgent: true, key: 'cuttingQuest', ill: 'cutting', valid: () => !!G.cutting });
  }
  let n = 0;
  if (G.order === 'roots') while (G.sapProd >= RULES.sapPerRoot && n < 4) { const t = rootPick(); if (!t) break; t.rs++; G.sapProd -= RULES.sapPerRoot; n++; addFloat(...tileXY(t.id), '🌿 root ' + t.rs, '#c8ffb0'); }
  { const td = treeDist(); T.forEach(t => { if (t.rooted && t.rs > Math.max(1, capOf(td[t.id]))) t.rs = Math.max(1, capOf(td[t.id])); }); }   // out of reach: roots wither to the cap
  if (n) say1('rootGrow', 'tortoise', 'The banyan pushed sap into a root. Sap comes from the tiles it works — healthy, rooted ones. Rot on a rooted tile stops it there.');
  G.stateDirty = true;
  return sap;
}

// ---------- v005 helpers: what happens next, in numbers ----------
function nextRoot() { if (!G.friends.banyan || G.order !== 'roots') return null; return rootPick() || null; }
function flowData() {
  const src = G.friends.banyan ? workedTiles().map(id => ({ id, name: T[id].name, icon: isTree(id) ? '🌳' : T[id].content && T[id].content.kind === 'res' ? T[id].content.icon : '🌿', v: sapOf(T[id]) })) : [];
  src.push({ name: 'your hand', icon: '✋', v: G.friends.banyan ? handBonus() : 0, hand: true });
  const est = src.reduce((a, x) => a + x.v, 0), grow = est * G.prio, prod = est - grow;
  return { src, est, grow, prod };
}
function floodsTo(have, need, per) { if (have >= need) return 0; if (per <= 1e-9) return Infinity; return Math.ceil((need - have) / per - 1e-9); }
function whenTxt(n) { return n === Infinity ? 'never at this split' : n <= 1 ? 'next flood' : 'in ' + n + ' floods'; }
const r1 = v => Math.round(v * 10) / 10;
// tiles where two rot networks with nests are one step apart
function mergeTiles(net) {
  const { comp, nets } = net; return T.filter(t => { if (t.b > 0 || t.reg === 5) return false; const cs = new Set([...t.nb].map(n => comp[n]).filter(c => c >= 0 && nets[c].nests.length)); return cs.size > 1; }).map(t => t.id);
}
const VC = { t: -1 };
function viewCache() {
  if (VC.t >= 0 && G.now - VC.t < .3) return VC;
  VC.t = G.now; VC.net = networks(); VC.next = nextRoot(); VC.merge = mergeTiles(VC.net);
  VC.outline = []; VC.net.nets.forEach(net => { const inNet = new Set(net.ids), ink = net.nests.some(id => T[id].owner === 'bailiff'); net.ink = ink; net.ids.forEach(a => { if (T[a].state === 0) return; T[a].nb.forEach(b => { if (inNet.has(b)) return; (BP[a + '_' + b] || []).forEach((p, i) => { if (i % 2 === 0) VC.outline.push([p[0], p[1], ink]); }); }); }); });
  return VC;
}
// ---------- rule cards, in the tortoise's voice ----------
function ruleIll(k) {
  const W = (x, y, on, gold) => '<text x="' + x + '" y="' + y + '" font-size="18" opacity="' + (on ? 1 : .25) + '">' + (gold ? '✨' : '🌊') + '</text>';
  if (k === 'tide') { let s = ''; for (let i = 0; i < 8; i++) s += W(6 + i * 22, 30, i < 5); return '<svg width="230" height="70">' + s + W(186, 30, true, true) + '<text x="6" y="58" font-size="12" fill="#7a5a32">5 of 8 left · + 1 spring hour</text></svg>'; }
  if (k === 'spring') return '<svg width="230" height="70"><text x="10" y="30" font-size="13" fill="#7a5a32">map · banyan · gecko</text><text x="10" y="58" font-size="22">✨✨✨</text><text x="100" y="56" font-size="13" fill="#7a5a32">= +3 every tide</text></svg>';
  const tile = (x, y, fill, txt, col) => '<polygon points="' + [[0, -18], [17, -9], [17, 9], [0, 18], [-17, 9], [-17, -9]].map(([a, b]) => (x + a) + ',' + (y + b)).join(' ') + '" fill="' + fill + '" stroke="#3b2a1a" stroke-width="1.2"/><text x="' + x + '" y="' + (y + 5) + '" font-size="13" text-anchor="middle" fill="' + (col || '#fff') + '" font-weight="600">' + txt + '</text>';
  if (k === 'rot' || k === 'nests' || k === 'omen') return '<canvas id="rIllCv" data-k="' + k + '" width="640" height="280" style="width:320px;height:140px"></canvas>';
  if (k === 'rotOld') return '<svg width="240" height="86">' + tile(40, 24, '#1d3a1c', '2', '#8dff6a') + tile(40, 62, '#1d3a1c', '1', '#8dff6a') + tile(110, 43, '#9bc46a', '?', '#3b2a1a') + '<path d="M58 28 Q78 30 92 40 M58 58 Q78 56 92 47" stroke="#0a0d0a" stroke-width="4" fill="none"/><text x="140" y="38" font-size="14" fill="#3b2a1a">⚔ 2 + 1</text><text x="140" y="58" font-size="14" fill="#b0351c" font-weight="600">= 3</text></svg>';
  if (k === 'defence') return '<svg width="250" height="70"><text x="6" y="28" font-size="15" fill="#3b2a1a">🛡 4 = roots 2 + neighbour 1 + you 1</text><text x="6" y="54" font-size="14" fill="#2d6b3a" font-weight="600">⚔ 3 vs 🛡 4 → holds</text></svg>';
  if (k === 'sap') return '<svg width="250" height="80"><path d="M20 20 C70 20 70 40 110 40 M20 60 C70 60 70 40 110 40" stroke="#5aa83a" stroke-width="7" fill="none"/><path d="M110 40 C150 40 150 18 200 18" stroke="#5aa83a" stroke-width="6" fill="none"/><path d="M110 40 C150 40 150 62 200 62" stroke="#a8743a" stroke-width="6" fill="none"/><circle cx="110" cy="40" r="13" fill="#3f8a33"/><text x="110" y="45" font-size="12" text-anchor="middle" fill="#fff">5</text><text x="204" y="22" font-size="12" fill="#3f8a33">grow</text><text x="204" y="66" font-size="12" fill="#8a5a2a">produce</text></svg>';
  if (k === 'befall') return '<svg width="250" height="50"><rect x="6" y="12" width="40" height="24" rx="6" fill="#111"/><text x="26" y="30" font-size="15" text-anchor="middle" fill="#7dff4f">3</text><rect x="56" y="12" width="40" height="24" rx="6" fill="#111"/><text x="76" y="30" font-size="15" text-anchor="middle" fill="#ffe14a">6</text><rect x="106" y="12" width="40" height="24" rx="6" fill="#111"/><text x="126" y="30" font-size="15" text-anchor="middle" fill="#ff9a3a">9</text><rect x="156" y="12" width="40" height="24" rx="6" fill="#111"/><text x="176" y="30" font-size="15" text-anchor="middle" fill="#ff4a3a">10</text></svg>';
  if (k === 'reach') return '<svg width="250" height="50"><text x="6" y="30" font-size="15" fill="#3b2a1a">🌳 —1—2—3 ▸ 4 (2) ▸ 5 (1) ▸ 6 ✖</text></svg>';
  if (k === 'army') return '<svg width="250" height="50"><text x="6" y="30" font-size="15" fill="#b0351c">nest → ⚔4 → ⚔4 → 🗼/🌳/you → banyan</text></svg>';
  if (k === 'nest') return '<svg width="250" height="50"><text x="6" y="30" font-size="15" fill="#5a3a9a">rot 2 → burn 🥃 → 0 exposed → hold → ⚔</text></svg>';
  if (k === 'boss') return '<svg width="250" height="70"><text x="6" y="26" font-size="14" fill="#5a3a9a" font-weight="600">First Mate → Cabin Boy → Bilge Rat</text><text x="6" y="52" font-size="13" fill="#7a5a32">HP 80 → 45 → 25 · slam 3 → 2 → 1</text></svg>';
  if (k === 'wandel') return '<svg width="250" height="64"><rect x="6" y="14" width="200" height="12" rx="6" fill="#e3cfa6"/><rect x="6" y="14" width="90" height="12" rx="6" fill="#6fc35a"/><rect x="96" y="14" width="40" height="12" fill="#ffd45a"/><line x1="56" y1="10" x2="56" y2="30" stroke="#3b2a1a"/><line x1="106" y1="10" x2="106" y2="30" stroke="#3b2a1a" stroke-width="2"/><line x1="156" y1="10" x2="156" y2="30" stroke="#3b2a1a"/><text x="6" y="48" font-size="12" fill="#7a5a32">green: spent · gold: free · notch: next stage</text></svg>';
  return '';
}
let rulesNew = 0, ruleSel = null;
function unlockRule(id) {
  const k = 'rule_' + id; if (storySeen[k]) return; storySeen[k] = 1;
  
  rulesNew++; ruleSel = id; updRulesBtn();
  toast('📖 New rule card: <b>' + RULECARDS.find(r => r.id === id).title + '</b>');
}
function updRulesBtn() { const b = $('rBadge'); b.style.display = 'none'; $('bRules').classList.remove('new'); }   // v061: no unread counter — it looked like homework
function drawRuleCanvas(cv, k) {   // v022: rule pictures drawn with the map's own tentacles
  const c = cv.getContext('2d'), t = 1.3; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.setTransform(2, 0, 0, 2, 0, 0);
  const lbl = (x, y, txt, big, col) => { c.font = '700 ' + (big ? 17 : 12) + "px 'Fredoka',system-ui"; c.textAlign = 'center'; const w = c.measureText(txt).width + 12; c.fillStyle = 'rgba(10,13,10,.9)'; roundRect(c, x - w / 2, y - (big ? 13 : 10), w, big ? 22 : 17, 8); c.fill(); c.fillStyle = col || '#9dff7a'; c.fillText(txt, x, y + (big ? 4 : 2)); };
  if (k === 'rot') {
    const tx = 214, ty = 70, glow = pts => { if (!pts) return; c.strokeStyle = 'rgba(150,255,100,.55)'; c.lineWidth = 2.4; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x - .6, y - 1.6) : c.moveTo(x - .6, y - 1.6)); c.stroke(); };
    illHex(c, 52, 34, 30, '#16221a', '2', '#8dff6a'); illHex(c, 52, 112, 26, '#16221a', '1', '#8dff6a'); illHex(c, 140, 124, 24, '#16221a', '1', '#8dff6a'); illHex(c, tx, ty, 32, '#9bc46a', '?', '#3b2a1a');
    drawTendril(c, 66, 104, tx - 18, ty + 6, t, false, 2, false, true);            // side arms: thin and plain
    drawTendril(c, 150, 116, tx - 8, ty + 14, t, false, 3, false, true);
    glow(drawTendril(c, 66, 36, tx - 14, ty - 6, t, false, 1, false, false));        // the main arm: thick, glowing
    lbl(132, 22, 'main arm · 2', true); lbl(118, 96, '+1'); lbl(190, 118, '+1');
    c.font = "700 17px 'Fredoka',system-ui"; c.textAlign = 'left'; c.fillStyle = '#3b2a1a'; c.fillText('⚔', 258, 56); c.fillStyle = '#2f8a2a'; c.fillText('2', 280, 56); c.fillStyle = '#3b2a1a'; c.fillText('+1 +1', 258, 78); c.fillStyle = '#b0351c'; c.fillText('= 4', 266, 100);
  } else if (k === 'nests') {
    c.save(); c.translate(60, 74); c.scale(.8, .8); drawNest(c, 0, 0, t, 3, false); c.restore();
    [[176, 30], [214, 74], [176, 118]].forEach(([x, y], i) => { illHex(c, x, y, 24, '#2a3a24', '', ''); drawTendril(c, 84, 72, x - 12, y, t, false, i + 4, false, true); lbl(x + 34, y + 2, '+1'); });
  } else if (k === 'omen') {
    illHex(c, 58, 74, 30, '#16221a', '1', '#8dff6a'); illHex(c, 176, 40, 28, '#3f7a3a', 'jungle', '#eaffd9'); illHex(c, 176, 112, 28, '#e8d49a', 'beach', '#5a4a2a');
    drawTendril(c, 72, 70, 164, 44, t, false, 7, false, false);
    lbl(252, 34, '☠ Bad Omen: jungle', false, '#ffb0a0'); lbl(252, 62, '→ 1 spearhead', false, '#9dff7a'); lbl(256, 112, 'beach: left alone', false, '#c8c0a8');
  }
}
function openRules() { SPIEL.regeln('insel'); }   // v044: the hub's one rules screen (tab "Island rules")
function regelnInsel(sel) {
  rulesNew = 0; updRulesBtn();
  if (sel) ruleSel = sel;
  const have = RULECARDS.filter(r => storySeen['rule_' + r.id]);
  if (!ruleSel || !storySeen['rule_' + ruleSel]) ruleSel = have.length ? have[have.length - 1].id : null;
  const r = RULECARDS.find(x => x.id === ruleSel);
  return { tabs: RULECARDS.map(x => ({ id: x.id, title: storySeen['rule_' + x.id] ? x.title : '? ? ?', on: !!storySeen['rule_' + x.id], sel: x.id === ruleSel })),
    body: r ? '<div class="by">🐢 The tortoise explains</div><h2>' + r.title + '</h2><div class="ill">' + ruleIll(r.ill) + '</div><div>' + r.text + '</div>' : '<p>No rule cards yet. Go and do something.</p>',
    draw: el => { const cv = el.querySelector('#rIllCv'); if (cv) drawRuleCanvas(cv, cv.dataset.k); } };
}
// ---------- actions ----------
function spend(n) {
  if (G.gezeit + G.spring < n) { G.noTide = (G.noTide || 0) + 1; const L = ['No hours left, darling. End the ebb.', 'Still no hours. The sea isn\'t negotiable.', 'Hours: zero. Like your sense of time.']; if (G.noTide <= L.length) say('tortoise', L[G.noTide - 1], true); else toast('Not enough hours · ' + n + ' needed'); return false; }
  const b = Math.min(G.gezeit, n); G.gezeit -= b; G.spring -= n - b; SPIEL.speichernBald();   // v070
  if (n - b > 0) unlockRule('spring');
  if (n - b > 0) say1('springUse', 'tortoise', 'That was a spring hour — the golden kind. Rare. It works on the beach and here, and it\'s always spent last.');
  return true;
}
function beachMode() { try { return localStorage.getItem('robinson_beach_mode') || 'real'; } catch (e) { return 'real'; } }   // v030: scenario menu
function gruenKoppeln() {   // v030: 💚 is one value for the whole game — G.res.green reads and writes the beach's stock
  const d = Object.getOwnPropertyDescriptor(G.res, 'green'); if (d && d.get) return;
  Object.defineProperty(G.res, 'green', { get: () => SPIEL.gruen(), set: v => SPIEL.gruenSetzen(v), enumerable: true, configurable: true });
}
function spendGreen(n) { if (G.res.green < n) { toast('You need ' + n + ' 💚.'); return false; } G.res.green -= n; G.mapSpent += n; return true; }
function act(kind, id) { G.inAct = true; try { actInner(kind, id); } finally { G.inAct = false; } }
function actInner(kind, id) {
  if (G.phase !== 'ebb' || G.over) return;
  if (kind === 'armyAtk') { armyAttack(id); return; }
  const t = T[id]; if (!t) return;   // v059: no nonsense ids
  if (['harvest', 'protect', 'cleanse', 'burn', 'gecko', 'geckoFeed'].includes(kind) && id !== G.at) return;   // only where Crusoe stands (the panel offers nothing else)
  G.es[kind] = (G.es[kind] || 0) + 1;
  if (kind === 'move') {
    const c = crossOk(G.at, id); if (!c.ok) { blockedSay(c); toast(c.why); return; }
    kursWarnung(id);   // v058
    if (id === G.cave && G.friends.gecko && !G.flags.caveIn) { G.es.move--; caveBite(id); return; }
    const cost = moveCost(G.at, id); if (!spend(cost)) return;
    G.at = id; G.moves++; if (t.b > 0) addInf(t.b); const [x, y] = tileXY(id); Object.assign(G.group, { fx: G.group.x, fy: G.group.y, tx: x, ty: y, t: 0 });
    const firstVisit = t.state < 2; setKnown(t);
    if (id === G.gate && G.key && !G.flags.gatePrio && G.descent === 0) { G.flags.gatePrio = true; prio('tortoise', 'The gate', CAVE_TEXT.entrance.gate_prio, { must: true, ping: G.cave, ill: 'gate' }); }
    if (t.content && t.content.kind === 'radio' && !G.flags.radio) { G.flags.radio = true; G.board.nextOffer = Math.max(G.board.nextOffer || 0, G.tide + 1); addIntel(1);
      prio('tortoise', 'A washed-up radio', 'Wedged between two rocks: a ship\'s radio in a waterproof case, still blinking. A sticker on the side: PROPERTY OF THE BOARD — RETURN TO MY LEVERAGE.\n\nIt crackles. Someone on the other end has been waiting for you to pick up.', { must: true, urgent: true, ill: 'radio' });   // v063: a window with a picture
      say1('radio', 'briefcase', 'That is their line. They will call. They always call. Don\'t sign anything I haven\'t read.', true); }
    if (firstVisit && t.content && t.content.kind === 'memory' && !G.memories.includes('invoice')) { G.memories.push('invoice'); addIntel(1); setTimeout(() => { showCard('A memory', 'A sodden receipt in the flotsam. <i>“Invoice: one (1) island, paid in full.”</i> Your handwriting.'); say1('memory', 'briefcase', 'I remember that invoice. I was there. I was the one holding it.'); }, 700); }
    if (t.content && t.content.kind === 'banyan' && !G.friends.banyan && tutFertig()) prio('tortoise', 'The banyan', 'Here it is. The banyan. Older than both of us, and lonelier.\nHow to befriend it: listen to it — right here, 2 free Kinship. I\'ll translate.\nThen it grows roots, drinks sap, and everything else on this island grows from that. This is the most important tree you will ever meet.', { must: true, key: 'banyanVisit', ping: id, ill: 'banyan', btn: 'I\'ll stay' });
    if (firstVisit && t.content && t.content.kind === 'gecko' && tutFertig()) prio('tortoise', 'Small feet', 'A gecko in the palm grove. It climbs the cliffs to the west — the only way up.\nIt doesn\'t trust people in ties. Two visits:\n· first, 4 breadfruit;\n· another tide, 5 more breadfruit and water — 2 coconuts for a shell — with roots under its feet.\nPicky little thing. Worth it.', { must: true, key: 'geckoQuest', ping: id, ill: 'gecko' });
    if (firstVisit && t.b > 0 && !t.source) say1('rotVisit', 'tortoise', 'You\'re standing in rot. Charming. Scrub it — or at least stay here at flood. You count.');
    if (G.moves === 1 && !storySeen.firstMove) { say1('firstMove', 'tortoise', 'Look at you, walking. Your island hours 🌊 are the blue waves round the compass, bottom right — eight hours of low water. Every step costs some. When it\'s gone, the sea comes back whether you\'re done or not.'); SPIEL.ring('#ebbCv'); }   // v062: the right place, with a ring
    if (false) say1('omen', 'tortoise', 'Top centre: the Bad Omen. The rot creeps into that kind of land, next to rot — even under the clouds, even land you\'ve never seen.');
    if (t.b > 0) say1('rotMove', 'tortoise', 'Rot is sticky. Every rot level costs +1 hour to walk into. Roots shave off 1.');
    scout(id); crusoeSight(id);
    addFloat(x, y - 26, cost ? '−' + cost + ' 🌊' : 'free', '#bff3ec');
  }
  if (kind === 'harvest' && false) {   // v061: Robinson no longer harvests — the roots do (ernte)
    if (!spend(1)) return;
    const y = RULES.harvestYield + (isAccountant() || G.flags.counting ? RULES.accountantBonus : 0);
    gainRes(t.content.res, y); t.exh = RULES.exhaustTides; addWandel(-1);
    addFloat(...tileXY(id), '+' + y + ' ' + t.content.icon, '#ffe08a');
    say1('harvest', 'briefcase', '+1 accountant bonus. Efficiency! Booked and filed.');
    say1('harvest2', 'tortoise', 'Every time you count things, you drift further from us. Kinship −1. The island noticed.');
  }
  if (kind === 'protect') {
    if (!spend(1)) return; t.prot = true; t.protT = G.now; addWandel(1); addFloat(...tileXY(id), 'protected', '#c8ffb0');
    say1('protect', 'tortoise', 'Protected: +1 defence, and fruit tiles give +1 every tide. You\'re learning. Slowly.');
  }
  if (kind === 'cleanse') {
    if (!spend(2)) return; t.b--; addInf(1); addWandel(1); addFloat(...tileXY(id), '−1 rot', '#c8ffb0'); rotSelbst();
    if (t.b === 0 && !t.source) erode('tr', 1);
    if (t.b === 0) { addInf(-2); if (t.source === 'nest') { addFloat(...tileXY(id), 'nest exposed!', '#ffe08a'); nestExposedPrio(id); } }
    say1('cleanse', 'tortoise', 'Scrubbing rot with your bare hands. Disgusting. Effective.');
  }
  if (kind === 'burn') {   // v055: Crusoe's note — burn the heart, not the edges
    if (t.source !== 'nest' || t.b <= 0) return;
    if (SPIEL.rum() < RULES.burnRum) { toast('Burning a nest takes ' + RULES.burnRum + ' 🥃 — you have ' + SPIEL.rum() + '. Mussels carry rum.'); return; }
    if (!spend(2)) return; SPIEL.rumSetzen(SPIEL.rum() - RULES.burnRum); G.es.burn = (G.es.burn || 0) + 1; rotSelbst();
    t.b = Math.max(0, t.b - 2); addInf(1); addWandel(1); addFloat(...tileXY(id), '🔥 −2 rot', '#ffc070'); sfxBurn();
    if (t.b === 0) { addInf(-2); addFloat(...tileXY(id), 'nest exposed!', '#ffe08a'); nestExposedPrio(id); }
    say1('burn', 'tortoise', 'Rum and fire. Crusoe would have liked you. Burn the heart, not the edges.');
  }
  if (kind === 'gecko') {
    if (!G.geckoFed || G.tide <= G.geckoFedTide || !t.rooted || G.res.fruit < 5 || G.res.coco < 2) return;
    if (!spend(1)) return; G.res.fruit -= 5; G.res.coco -= 2; G.friends.gecko = true; G.geckoTag = G.now + 9; springErfolg('gecko'); addWandel(2);
    showCard('The gecko', 'It drinks from the coconut shell for a long time. Then it licks the fruit flies off the breadfruit, blinks at you twice, and scurries up the rock wall to the west. <b>The cliffs are open.</b><br><br>It decides to come along. <span class="gold">+1 ✨ spring hour</span> every tide from now on.');
    say1('geckoFriend', 'tortoise', 'The cliffs are open. Up there are the First Mate\'s dens — ink-dark nests. Try not to fall off anything.');
  }
  if (kind === 'geckoFeed') {
    if (G.geckoFed || G.res.fruit < 4) return;
    if (!spend(1)) return; G.res.fruit -= 4; G.geckoFed = 1; G.geckoFedTide = G.tide; addWandel(1); addFloat(...tileXY(id), 'it comes closer', '#c8ffb0');
    say('tortoise', 'It ate. It didn\'t thank you. Come back another tide with 5 more breadfruit and water — 2 coconuts for a shell. And roots under its feet.');
  }
  if (kind === 'nourish') {
    if (id !== G.at || !canGrowTo(t)) return;
    if (G.res.green < RULES.nourishGreen) { toast('You need ' + RULES.nourishGreen + ' 💚.'); return; }
    if (!spend(RULES.nourishCost)) return; spendGreen(RULES.nourishGreen); setRooted(t, true); addWandel(1); addFloat(...tileXY(id), '🌱 root', '#c8ffb0');
    unlockRule('reach');
    say1('nourish', 'tortoise', 'Rooting is heavy work — four hours and six hearts. You plant; the banyan does the strengthening, every flood, on its own.');
    say1('nourishCase', 'briefcase', 'Capital expenditure. Green blood into roots. I approve, reluctantly.');
  }
  if (kind === 'listen') {   // v060: listening IS the friendship — bought right on the banyan's tile, no flood to wait
    if (G.unl.listen && G.friends.banyan) return; if (id !== G.banyan || G.at !== G.banyan || G.phase !== 'ebb') return;
    if (G.wFree < 2) { toast('Listening costs 2 free Kinship — you have ' + G.wFree + '. Protect, cleanse, plant: kind deeds earn it.'); return; }
    G.wFree -= 2; befreunden(true);
    say1('listen', 'tortoise', 'Fine, I\'ll translate. It says: sap comes from the tiles it works. Half goes into growing, half into your roots — unless you learn to ask.');
    say1('listenCase', 'briefcase', 'A budget! Finally. Kinship spent on influence. I\'ll allow it.');
  }
  if (kind === 'openTree') openTree();
  if (kind === 'descend') { descend(); return; }
  if (kind === 'lava') {
    if (!G.mountain || G.at !== G.cave || t.b <= 0) return;
    if (!spend(lavaPreis())) return; if (G.lavaTide !== G.tide) G.lavaN = 0; G.lavaN = (G.lavaN || 0) + 1; G.lavaTide = G.tide; const was = t.b; t.b = Math.max(0, t.b - 2); if (t.rooted) setRooted(t, false); addWandel(-1);   // v061: as often as you like — each one dearer this ebb
    if (was > 0 && t.b === 0 && !t.source) erode('tr', 1);
    if (was > 0 && t.b === 0 && t.source === 'nest') { addFloat(...tileXY(id), 'nest exposed!', '#ffe08a'); nestExposedPrio(id); } addFloat(...tileXY(id), 'lava! −' + (was - t.b) + ' rot', '#ffb070'); G.flash = id; setTimeout(() => G.flash = -1, 600);
    say1('lava1', 'tortoise', 'Fire. Fast, effective, and it burns everything — roots too. You used to be the man who signed for that kind of thing.');
  }
  if (kind === 'vent') {
    if (!G.mountain || G.at !== G.cave || t.b > 0 || t.source || t.vent > G.tide) return;
    if (!spend(2)) return; t.vent = G.tide + 2; addFloat(...tileXY(id), 'steam vent', '#e8f2ff');
  }
  if (kind === 'cleanTarget') { G.cleanTarget = id; addFloat(...tileXY(id), 'next clean: your choice', '#ffe08a'); }
  if (kind === 'rootTarget') { G.rootTarget = id; addFloat(...tileXY(id), 'next root: your choice', '#ffe08a'); }
  if (kind === 'plant') {
    if (!G.cutting || id !== G.at || !canPlant(t)) return;
    if (!spend(1)) return;
    G.cutting = false; const keepRs = t.rooted ? t.rs : 0; setRooted(t, true); if (keepRs) t.rs = keepRs; t.ableger = true; t.sac = 0; G.banyans.push(id); addWandel(2); springErfolg('offshoot');
    addFloat(...tileXY(id), 'offshoot planted', '#c8ffb0');
    showCard('An offshoot', 'You press the cutting into the soil. By the next tide it has its own roots. <b>A second banyan</b> — half as big as the old one, working its own tiles. It shares sap, orders and lessons with the old tree: open it right here.');
  }
  if (kind === 'shoo') {   // v058: Rot Chaser — the cat chases the rot off a tile next to Crusoe
    if (!katzeJagt(t)) return; SPIEL.schwaenzeSetzen(SPIEL.schwaenze() - shooPreis()); if (G.shooTide !== G.tide) G.shooN = 0; G.shooN = (G.shooN || 0) + 1; G.shooTide = G.tide; t.b--; addWandel(1); addFloat(...tileXY(id), '🐾 −1 rot', '#ffd0a8'); sfxMew(true);   // v061: any number per ebb, the price doubles
    if (t.b === 0 && !t.source) erode('tr', 1);
    say1('shoo', 'tortoise', 'She hissed at the rot and the rot backed off. I would have too.');
  }
  G.stateDirty = true; planFlood(true); renderPanel(); updateHUD(); kursPing();
}
function shooPreis() { return 5 * Math.pow(2, G.shooTide === G.tide ? (G.shooN || 0) : 0); }
function lavaPreis() { return 3 * Math.pow(2, G.lavaTide === G.tide ? (G.lavaN || 0) : 0); }
function rotSelbst() { if (G.flags.rotSelbst) return; G.flags.rotSelbst = true; if (G.catFate !== 'gone' && !SPIEL.katzeWeg()) say1('catEnjoys', 'tortoise', 'Did you see the cat? She pounced on the rot right after you. She seems to enjoy it far too much. Your Dream might know what to do with that.', true); }
function katzeJagt(t) { return SPIEL.upgB('catShoo') > 0 && G.catFate !== 'gone' && !SPIEL.katzeWeg() && t.b > 0 && !t.source && t.reg !== 5 && (t.id === G.at || T[G.at].nb.has(t.id)) && SPIEL.schwaenze() >= shooPreis(); }
// v058: the recommended course for the first island hours — straight to the banyan, protect on the way, one flood there, then roots around it
// v060: the friendship and Listen are one act — bought on the banyan's tile (or in the Dream while standing there)
function befreunden(karte) {
  if (G.friends.banyan && G.unl.listen) return;
  G.friends.banyan = true; G.unl.listen = true; G.freundTide = G.tide; T[G.banyan].b = 0; setRooted(T[G.banyan], true); G.blevel = Math.max(1, G.blevel || 0);   // the friendship cleans it
  if (!G.banyans.includes(G.banyan)) G.banyans.unshift(G.banyan);
  if (!G.springSrc.includes('banyan')) { G.springMax++; G.spring++; G.springSrc.push('banyan'); }
  unlockRule('sap'); G.stateDirty = true; renderPanel(); updateHUD();
  if (karte) showCardWait('The banyan', 'You sit with the sapling and listen. The tortoise translates, slowly. <i>“It says you smell of paper. It says it can fix that.”</i><br><br><b>First roots.</b> <span class="gold">+1 ✨ spring hour</span> every tide from now on. The banyan is level 1: it works its own tile, drinks the sap, and grows — half into itself, half into your roots.<br><br>Plant roots on the tiles around it.', 'Open the banyan').then(() => { openTree(); say1('banyanFriend', 'briefcase', 'Roots are non-depreciating. I checked.'); });
}
// v060: older saves — friends but not listening, or the banyan missing from the living trees (the v059 bug)
function freundReparatur() {
  if (G.banyan < 0 || !T[G.banyan]) return;
  if (G.friends.banyan || G.unl.listen) { G.friends.banyan = true; G.unl.listen = true;
    if (!G.banyans.includes(G.banyan)) G.banyans.unshift(G.banyan);
    if (!G.springSrc.includes('banyan')) { G.springMax++; G.springSrc.push('banyan'); }
    if (!T[G.banyan].rooted) setRooted(T[G.banyan], true); if (!G.blevel) G.blevel = 1; }
}
// ---------- v061: the island tutorial — a fixed script, one step at a time; the rot sleeps until the spillover step ----------
const TUT_SPILL = 11;
function tutFertig() { return G.tut === 'done' || G.tut === undefined; }
function tutAus() { try { return localStorage.getItem('robinson_tutorials') === 'off'; } catch (e) { return false; } }
function tutPath(a, b) {   // a walkable path (cliffs, closed regions respected)
  const prev = new Array(T.length).fill(-1), seen = new Set([a]), q = [a];
  while (q.length) { const u = q.shift(); if (u === b) break; T[u].nb.forEach(v => { if (!seen.has(v) && T[v].reg !== 5 && crossOk(u, v).ok) { seen.add(v); prev[v] = u; q.push(v); } }); }
  if (!seen.has(b)) return landPath(a, b); const p = []; for (let v = b; v >= 0; v = prev[v]) { p.unshift(v); if (v === a) break; } return p;
}
function tutErsterSchritt() { const p = tutPath(G.start, G.banyan); return p.length > 1 ? p[1] : G.banyan; }
function tutRootZiel(goal) { if (goal < 0 || T[goal].rooted || canGrowTo(T[goal])) return goal; const p = tutPath(G.banyan, goal); for (const id of p) if (!T[id].rooted && canGrowTo(T[id])) return id; return goal; }
function tutCoco() { const d = bfsFrom(G.banyan); return G.coco.slice().sort((a, b) => d[a] - d[b])[0]; }
function tutFront() { const n2 = G.nest2; if (n2 < 0) return G.banyan; const c = [...T[n2].nb].filter(n => T[n].reg === 1); return c.sort((a, b) => (T[b].rooted ? 1 : 0) - (T[a].rooted ? 1 : 0) || a - b)[0] ?? G.gecko; }
const nestBlase = id => T[id].b > 0 ? 'Burn it · 3 🥃 (you have ' + SPIEL.rum() + ')' : 'Stay here · end the ebb';
const TUT = [
  { id: 'protect1', ziel: () => G.start, txt: 'Protect Crab Beach', blase: 'Protect this tile', hl: 'protect', fertig: () => T[G.start].prot,
    rein() { prio('tortoise', 'The island', 'Crab Beach. Tap any tile and it tells you what it is: what walking there costs, what lives there, what threatens it.\nFirst lesson — Protect: +1 defence for the tile, and kind deeds earn Kinship, the island\'s own currency.\nTap the tile you stand on, then "Protect".', { must: true, urgent: true, ping: G.start }); } },
  { id: 'walk1', ziel: () => tutErsterSchritt(), txt: 'Walk up the beach', blase: 'Go here first', hl: 'move', skip: () => tutErsterSchritt() === G.banyan, fertig: () => G.at === tutErsterSchritt() },
  { id: 'protect2', ziel: () => tutErsterSchritt(), txt: 'Protect this tile too', blase: 'Protect it', hl: 'protect', skip: () => tutErsterSchritt() === G.banyan, fertig: () => T[tutErsterSchritt()].prot,
    rein() { say1('tutRes', 'tortoise', 'Breadfruit, coconuts — you won\'t pick them yourself. Roots do that later: every rooted food tile brings some in, every flood. Protect it now, it pays off then.', true); } },
  { id: 'walk2', ziel: () => { const p = tutPath(G.at, G.banyan); return p.length > 1 ? p[1] : G.banyan; }, txt: 'Walk to the banyan', blase: 'This way · the banyan', hl: 'move', fertig: () => G.at === G.banyan },
  { id: 'listen', ziel: () => G.banyan, txt: () => G.wFree >= 2 ? 'Listen to the banyan · 2 free Kinship' : 'Earn one more Kinship: protect this tile', blase: () => G.wFree >= 2 ? 'Listen to it' : 'Protect it first (+1 Kinship)', hl: () => G.wFree >= 2 ? 'listen' : 'protect', fertig: () => !!G.friends.banyan,
    rein() { prio('tortoise', 'The banyan', 'Here it is. Older than both of us, and lonelier.\nListen to it — that is how you make a friend of a tree. It costs 2 free Kinship; you earned them protecting the beach.\nAfter that it drinks, grows, and everything on this island grows from it.', { must: true, urgent: true, ping: G.banyan }); } },
  { id: 'rootFruit', ziel: () => tutRootZiel(G.fruit), txt: 'Plant a root on the breadfruit', blase: 'Plant a root here', hl: 'nourish', skip: () => G.fruit < 0, fertig: () => T[G.fruit].rooted,
    rein() { prio('tortoise', 'Roots', 'Now roots. Each one makes the banyan stronger and holds its tile — and on a food tile it harvests for you, every flood.\nWalk to the breadfruit and plant one: 4 hours and 6 hearts. Roots only grow next to roots.', { must: true, urgent: true, ping: G.fruit }); } },
  { id: 'rootCoco', ziel: () => tutRootZiel(tutCoco()), txt: 'Plant a root on the coconut palms', blase: 'Plant a root here', hl: 'nourish', skip: () => tutCoco() === undefined, fertig: () => T[tutCoco()].rooted },
  { id: 'rootGecko', ziel: () => tutRootZiel(G.gecko), txt: 'Plant a root in the palm grove', blase: 'Plant a root here', hl: 'nourish', skip: () => G.gecko < 0, fertig: () => T[G.gecko].rooted,
    rein() { prio('tortoise', 'Small feet', 'A gecko lives in the palm grove. It climbs the cliffs to the west — the only way up.\nIt doesn\'t trust people in ties. Roots under its feet first; later it wants food: breadfruit, then breadfruit and coconuts.', { must: true, urgent: true, ping: G.gecko }); },
    raus() { springErfolg('roots'); } },
  { id: 'cleanse', ziel: () => G.tutRot, txt: 'Cleanse the rot', blase: 'Cleanse the rot here', hl: 'cleanse', skip: () => G.tutRot === -1, fertig: () => G.tutRot < 0 || T[G.tutRot].b === 0,
    rein() { tutRotSetzen(); if (G.tutRot >= 0) prio('tortoise', 'Rot', 'See that green tint? Rot. It creeps out of the nests and chokes everything — no sap, no harvest, and it eats roots.\nWalk there and Cleanse it: −1 rot for 2 hours. Bare hands. Disgusting. Effective.', { must: true, urgent: true, ping: G.tutRot }); } },
  { id: 'nest1', ziel: () => G.nest, txt: () => T[G.nest].b > 0 ? 'Burn the nest · 3 🥃' : 'Hold the nest · end the ebb on it', blase: () => nestBlase(G.nest), hl: () => T[G.nest].b > 0 ? 'burn' : 'end', skip: () => G.nest < 0, fertig: () => T[G.nest].source !== 'nest',
    rein() { const t = T[G.nest]; if (t.state === 0) { t.state = 1; G.stateDirty = true; } prio('tortoise', 'A nest', 'That ooze is a nest — where the rot comes from. Scrubbing won\'t touch it: it has to burn. Rum and fire, 3 🥃 a go — the mussels on the waves carry rum.\nBurn it to zero, then stay on it and end the ebb. At flood it fights back. Win, and it is gone.', { must: true, urgent: true, ping: G.nest }); } },
  { id: 'gecko1', ziel: () => G.gecko, txt: () => G.res.fruit >= 4 ? 'Feed the gecko · 4 🍞' : 'Wait for breadfruit · ' + G.res.fruit + '/4', blase: () => G.res.fruit >= 4 ? 'Feed it · 4 🍞' : 'Your roots harvest 🍞 · ' + G.res.fruit + '/4', hl: 'geckoFeed', skip: () => G.gecko < 0, fertig: () => !!G.geckoFed,
    rein() { prio('tortoise', 'Breakfast for a gecko', 'The gecko wants 4 breadfruit. Your root on the breadfruit grove brings in one every flood — two if the tile is protected.\nThe banyan\'s screen shows what the roots harvest. Wait a few tides if you must, then feed it.', { must: true, urgent: true, ping: G.gecko }); } },
  { id: 'spill', ziel: () => tutFront(), txt: 'The rot attacks · hold your tiles', blase: 'Hold this tile', hl: 'protect', skip: () => G.nest2 < 0, fertig: () => G.tide > (G.tutSeit || 0),
    rein() { tutNest2(); } },
  { id: 'gecko2', ziel: () => G.gecko, txt: 'Befriend the gecko · 5 🍞 + 2 🥥', blase: () => G.tide <= (G.geckoFedTide || 0) ? 'Come back next tide' : 'Befriend it · 5 🍞 + 2 🥥', hl: 'gecko', skip: () => G.gecko < 0, fertig: () => !!G.friends.gecko },
  { id: 'nest2', ziel: () => G.nest2, txt: () => T[G.nest2].b > 0 ? 'Up the cliffs · burn the nest' : 'Hold the nest · end the ebb on it', blase: () => nestBlase(G.nest2), hl: () => T[G.nest2].b > 0 ? 'burn' : 'end', skip: () => G.nest2 < 0, fertig: () => T[G.nest2].source !== 'nest',
    rein() { prio('tortoise', 'The cliffs', 'The gecko shows you the way up. The nest on the cliff edge is what keeps hitting your shore.\nGo up, burn it, hold it through a flood. Then the island is yours to read — I\'ll stop holding your hand.', { must: true, urgent: true, ping: G.nest2 }); } }
];
function tutRotSetzen() {   // a little rot to practise on: next to the shore nest, as close to the banyan as possible
  if (G.tutRot !== undefined && G.tutRot >= 0) return; const d = bfsFrom(G.banyan), n = G.nest;
  const ok = t => t.reg === 1 && !t.rooted && !t.source && t.id !== G.start && t.id !== G.banyan && t.id !== G.gecko && t.id !== G.fruit && !G.coco.slice(0, 1).includes(t.id);
  const c = T.filter(ok).sort((a, b) => (b.b > 0) - (a.b > 0) || (n >= 0 && b.nb.has(n)) - (n >= 0 && a.nb.has(n)) || !!a.content - !!b.content || d[a.id] - d[b.id])[0];   // region I is small: a food or flotsam tile will do
  G.tutRot = c ? c.id : -1; if (c) { c.b = Math.max(1, c.b); c.rotBorn = G.tide; if (c.state === 0) c.state = 1; G.stateDirty = true; }
}
function tutNest2() {   // the cliff nest wakes and shows itself: the first real attacks, explained
  const n2 = G.nest2; if (n2 < 0) return; const t = T[n2]; t.source = 'nest'; t.b = Math.max(t.b, RULES.nestBlight); if (t.state === 0) { t.state = 1; t.samp.forEach(([x, y], i) => { if (i % 2 === 0) revealAt(x, y, 22); }); G.fogDirty = true; }
  G.stateDirty = true; G.tutSeit = G.tide; planFlood(true);
  { const [x, y] = tileXY(n2); camGo({ x, y, z: Math.max(CAM.z, CAM.zMax * .7) }, .8); }
  prio('tortoise', 'The rot attacks', 'Up on the cliff edge a nest has woken — and it reaches down into your shore.\nA black tendril marks where it strikes at the next flood. Strike: the rot\'s strength against the tile\'s defence — roots, protection, healthy rooted neighbours, and you, if you stand there.\nIt falls: +1 rot, root −1. A root that drops to 0 withers and grows back when the tile is clean.\nYou can\'t stop it for good from down here. Make the gecko your friend, climb up and burn the nest.', { must: true, urgent: true, ping: n2, ill: 'rot' });
}
function tutEnde(still) {
  G.tut = 'done'; G.wachAb = null; G.wachRang = null; G.schlafBis = G.tide;
  if (!still) ['nest', 'geckoQuest', 'firstMove', 'rotVisit', 'firstLoss', 'trebuchet', 'listenHint'].forEach(k => storySeen[k] = 1);   // v062: what the tutorial just taught is not told again later
  spawnNests((G.bossPlan || []).map(p => ({ id: p.id, name: p.name, owner: 'bailiff' })), !still);
  if (!G.boss.revealed) bossReveal(still);
  G.frisch = null; G.frisch = mapState('ebb').m;   // the way back after a loss starts here, not before the tutorial
  if (!still) setTimeout(() => prio('tortoise', 'On your own now', 'That\'s it — you know how the island works. From here on the rot wakes region by region, the nearest first.\nUp on the cliffs: ' + (G.boss.revealed ? bossName() + '\'s dens. ' : '') + 'And something washed up there that the Board would like back. Have a look around.\nThe golden ✨ spring hours: every real deed earns one more, for good.', { must: true, urgent: true }), 5200);
  planFlood(true); updateHUD();
}
// v061: new nests come only from the story — the camera flies there, the cloud stays
function spawnNests(list, cam) {
  const ids = []; list.forEach(p => { const t = T[p.id]; if (!t || t.source === 'nest') return; t.source = 'nest'; t.b = Math.max(t.b, RULES.nestBlight); t.owner = p.owner || null; t.name = p.name || 'A new nest'; t.rooted = false; t.rs = 0; t.welk = false; if (!G.nests.includes(t.id)) G.nests.push(t.id); ids.push(t.id); });
  G.stateDirty = true; VC.t = -1;
  if (cam && ids.length) { G.glimmer = { ids, t0: G.now }; ids.forEach((id, i) => setTimeout(() => { const [x, y] = tileXY(id); camGo({ x, y, z: Math.max(CAM.z, CAM.zMax * .6) }, .9); }, 400 + i * 2200)); setTimeout(() => camHome(.9), 600 + ids.length * 2200); }
  return ids;
}
// v061: after his last den, two new nests — deep on the cliffs, as far from your trees as possible
function spawnNachBoss() {
  const d = treeDist(), used = new Set(G.nests);
  const c = T.filter(t => t.reg === 2 && !t.source && !t.rooted && !t.content && !t.ableger && d[t.id] < 1e9 && d[t.id] >= 3 && ![...t.nb].some(n => used.has(n) || T[n].rooted)).sort((a, b) => d[b.id] - d[a.id] || a.id - b.id);
  const pick = []; for (const t of c) { if (pick.some(p => T[p].nb.has(t.id))) continue; pick.push(t.id); if (pick.length >= 2) break; }
  const ids = spawnNests(pick.map((id, i) => ({ id, name: ['Rotting crag', 'Rotting ledge'][i] })), true);
  if (ids.length) prio('briefcase', 'MEMO · Facilities', 'From: The Board. Re: the cliffs.\nNew remediation sites approved: ' + ids.map(id => T[id].name).join(' and ') + '. Staffing to follow.\n\n…Two new nests. They don\'t even wait for the paperwork any more.', { must: true, urgent: true, ping: ids[0] });
}
function tutSchritt() { return tutFertig() ? null : TUT[G.tut] || null; }
function tutTick() { if (tutTick.busy) return; tutTick.busy = true; try { tutTickInner(); } finally { tutTick.busy = false; } }   // rein/raus call updateHUD → no re-entry
function tutTickInner() {
  for (let k = 0; k < TUT.length + 2 && !tutFertig(); k++) {
    const st = TUT[G.tut]; if (!st) { tutEnde(); return; }
    if (st.skip && st.skip()) { G.tut++; G.tutIn = -1; if (G.tut >= TUT.length) { tutEnde(); return; } continue; }
    if (G.tutIn !== G.tut) { G.tutIn = G.tut; G.tutSeit = G.tide; if (st.rein) st.rein(); }
    if (!st.fertig()) return;
    if (st.raus) st.raus(); G.tut++; G.tutIn = -1; if (G.tut >= TUT.length) { tutEnde(); return; }
  }
}
const tv = v => typeof v === 'function' ? v() : v;
function kurs() { const st = tutSchritt(); const k = st && G.phase === 'ebb' ? { step: st.id, ping: st.ziel(), txt: '📘 ' + (G.tut + 1) + '/' + TUT.length + ' · ' + tv(st.txt), blase: tv(st.blase), hl: tv(st.hl) } : null;
  G.kursZ = k && k.ping >= 0 ? k.ping : -1; G.kursBlase = k ? k.blase : ''; G.kursHl = k ? k.hl : ''; return k; }   // the green arrow and the bubble follow the tutorial
function kursPing() { const k = kurs(); if (k && G.phase === 'ebb' && k.ping >= 0) G.ping = { id: k.ping, t: G.now }; }
function kursWarnung() {}
function plantWhy(t) {
  if (t.reg !== 2) return 'only in Region II'; if (t.source || G.banyans.includes(t.id)) return 'not here';
  if (t.b >= 2) return 'too much rot (max 1)'; if (!t.rooted && ![...t.nb].some(n => T[n].rooted)) return 'needs roots here or next door';
  if (t.id !== G.at) return 'walk here first'; return '';
}
function canPlant(t) { return !plantWhy(t); }
// Kinship widens Crusoe's own sight: on arrival he looks over the edges into the neighbouring tiles
function crusoeSight(id) {
  const si = stageIdx(); if (si < 1) return;
  T[id].nb.forEach(n => { if (T[n].state > 0) return; (BP[id + '_' + n] || []).forEach((p, i) => { if (i % 4 === 0) revealAt(p[0], p[1], 14 + 10 * si); }); if (coverage(n) >= RULES.scoutCover) markScouted(n); });
}
function blockedSay(c) {
  if (c.closed === 'fire') say1('fire', 'tortoise', 'Fire Mountain? Not this season, sweetheart. Come back when you\'ve grown more than a tie.');
  else if (c.closed === 'tangle') say1('tangle', 'tortoise', 'The tangle doesn\'t want you. Not this season. Ask me again in a few chapters.');
  else if (c.why.startsWith('⛰')) say1('cliff', 'tortoise', 'A rock wall. You don\'t climb. Someone around here does — look for small feet in the palm grove.');
}

// ---------- cat scouting: walks the tile with a small sight radius ----------
function scout(from) {
  if (G.below || (G.catFate === 'gone' && !G.friends.gecko)) return;   // v020: without the cat the gecko sniffs ahead
  if (G.catFate === 'dark' && Math.random() < .25) { const [x, y] = tileXY(from); addFloat(x, y - 40, 'the cat wanders off', '#ff9a8a'); return; }
  G.catQ.push(from);
}
function chain(pts, sx, sy, maxLen, maxPts) {
  const rest = pts.slice(), out = []; let x = sx, y = sy, len = 0;
  while (rest.length && out.length < maxPts) {
    let bi = 0, bd = 1e9; rest.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; bi = i; } });
    const p = rest.splice(bi, 1)[0]; if (out.length && len + bd > maxLen) break;
    len += out.length ? bd : 0; out.push(p); x = p[0]; y = p[1];
  }
  return out;
}
function startCat() {
  while (G.catQ.length) {
    const from = G.catQ.shift(), hidden = [...T[from].nb].filter(x => T[x].state === 0);
    if (!hidden.length) continue;
    let target = hidden[(Math.random() * hidden.length) | 0]; const gp = G.group, sx = gp.tx + 9, sy = gp.ty + 2;
    { const k = !tutFertig() && kurs(), z = k && k.ping >= 0 ? k.ping : (!tutFertig() && G.banyan >= 0 ? G.banyan : -1); if (z >= 0) { const dz = bfsFrom(z); target = hidden.slice().sort((a, b) => dz[a] - dz[b])[0]; } }   // v061: in the tutorial she runs to what matters
    const enter = catCan(from, target);
    let path;
    if (enter) {
      const s = T[target].samp, pts = []; for (let k = 0; k < 9 && s.length; k++) pts.push(s[(Math.random() * s.length) | 0]);
      path = chain(pts, sx, sy, 1e9, 7);
    } else {
      const bp = (BP[from + '_' + target] || []).filter((p, i) => i % 3 === 0);
      if (!bp.length) continue;
      path = chain(bp, sx, sy, 170, 40).filter((p, i, a) => i % 4 === 0 || i === a.length - 1);
    }
    if (!path.length) continue;
    G.cat = { x: sx, y: sy, path, i: 0, target, from, seam: !enter, back: false, check: 0, done: false };
    return;
  }
}
function updateCat(dt) {
  if (!G.cat) { if (G.catQ.length) startCat(); return; }
  const c = G.cat, gp = G.group;
  const [tx, ty] = c.back ? [gp.x + 9, gp.y + 2] : c.path[c.i];
  const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), step = RULES.catSpeed * (c.back ? 1.6 : 1) * dt;
  c.dir = dx >= 0 ? 1 : -1;
  if (d <= step) { c.x = tx; c.y = ty; if (c.back) { G.cat = null; return; } c.i++; if (c.i >= c.path.length) finishScan(c); }
  else { c.x += dx / d * step; c.y += dy / d * step; }
  if (!c.back) {
    revealAt(c.x, c.y, (c.seam ? RULES.catRadius * .9 : RULES.catRadius) * sightMul());
    c.check += dt;
    if (c.check > .3 && !c.done) { c.check = 0; if (coverage(c.target) >= RULES.scoutCover) { c.done = true; markScouted(c.target); } }
  }
}
function finishScan(c) {
  if (!c.seam && !c.done && (c.ext || 0) < 3 && coverage(c.target) < RULES.scoutCover) {   // big tile: keep sniffing
    const sm = T[c.target].samp, pts = []; for (let k = 0; k < 6 && sm.length; k++) pts.push(sm[(Math.random() * sm.length) | 0]);
    c.path = c.path.concat(chain(pts, c.x, c.y, 1e9, 4)); c.ext = (c.ext || 0) + 1; return;
  }
  c.back = true;
  if (!c.done && coverage(c.target) >= RULES.scoutCover) { c.done = true; markScouted(c.target); }
  if (c.seam && !c.done) say1('seam', 'tortoise', 'Even the cat won\'t cross that border. She only peeks over the edge. Hard borders stop everyone — mostly.');
}
function nestExposedPrio(id) { prio('tortoise', 'The nest is open', 'Look at it. Scrubbed to the bone — but it isn\'t dead.\nTo finish it, hold it: end the ebb right here, on the nest. At flood it fights back' + (G.boss.alive && G.boss.at === id && !G.boss.ready ? ', and ' + bossName() + ' is at home' : '') + '.\nWalk away now and it grows back by morning.', { must: true, key: 'exposed', ping: id, ill: 'nestOpen', valid: () => !!T[id].source && T[id].b === 0 }); }
function markScouted(id) {
  const t = T[id]; if (t.state > 0) return;
  t.state = 1; G.stateDirty = true; SFXmeow();
  const [x, y] = tileXY(id); addFloat(x, y - 10, 'scouted', '#fff6e3');
  say1('firstScout', 'tortoise', 'The cat found something. She\'ll want credit. Scouted tiles show a hint — walk in to see them properly.');
  if (id === G.banyan) say1('banyanSeen', 'tortoise', 'The cat found a tree with a sparkle. Go and see it. Trust me.');
  if (t.b > 0) unlockRule('rot');
  if (id === G.nest && tutFertig()) { unlockRule('nests'); prio('tortoise', 'A nest', 'That ooze is a nest — the source. The yacht leaks into everything.\nEverything near it gets thicker every flood. Don\'t scrub the edges forever: go for the nest itself. Scrubbing won\'t touch a nest — it has to BURN. Rum and fire: 3 🥃 a go.', { must: true, key: 'nest', ping: id, ill: 'nest' }); say1('nestCase', 'briefcase', 'Contingent liability identified. Recommend provisioning.'); }
  if (id === G.gecko && tutFertig()) prio('tortoise', 'Small feet', 'A gecko in the palm grove. It climbs the cliffs to the west — the only way up.\nIt doesn\'t trust people in ties. Two visits:\n· first, 4 breadfruit;\n· another tide, 5 more breadfruit and water — 2 coconuts for a shell — with roots under its feet.\nPicky little thing. Worth it.', { must: true, key: 'geckoQuest', ping: id, ill: 'gecko' });
  if (t.source === 'nest' && t.reg === 2 && !t.owner) say1('nestII', 'tortoise', 'Another nest, up on the cliff edge. It hangs right over the cove — it will spill down if you let it.');
  if (G.phase === 'ebb') planFlood(true); else updateHUD();
}

// ---------- ebb end, flood, growth ----------
// a nest dies only when it is held through a flood and its fight is won
function nestClosed(id) {
  const t = T[id]; t.b = 0; t.source = null; erode('tr', 5); erode('st', 5); G.stateDirty = true;
  if (t.owner === 'bailiff') { showCard('A den cleared', 'The ink-dark ooze drains out of the rocks. A soggy logbook, a peaked cap, a mug that says <i>WORLD\'S OKAYEST FIRST MATE</i>.'); bossNestGone(id); }
  else { t.name = t.reg === 2 ? 'Cleansed cliffs' : 'Cleansed shore'; setTimeout(() => springErfolg(t.reg === 1 ? 'nest1' : 'nest2'), 600); showCard('The nest is gone', 'The last of the green ooze sinks into the sand. The shore breathes again.'); say1('nestGone', 'tortoise', 'You held it. Look at you, being useful. The yacht will send more, of course.'); }
}
function nestFight(id) {   // the fight is played on the beach, the result comes back here (v030: a real scene switch; SIM mode keeps the old code window)
  const B = G.boss, boss = B.alive && B.at === id && !B.ready, lv = G.scen === 'real' ? SPIEL.welle() : (G.simRow && G.simRow.wave) || 11;
  const code = 'NEST-' + (boss ? 'B' + B.stage : '0') + '-' + lv;
  $('fT').textContent = boss ? 'His last stand' : 'The nest fights back';
  $('fB').innerHTML = (boss ? 'You hold the <b>' + T[id].name + '</b> — and <b>' + bossName() + '</b> is home. He defends his den.' : 'You hold the <b>' + T[id].name + '</b>. The nest throws everything it has at you.') +
    '<br><br>No beach fight this flood: the rot is busy with you.' + (G.scen === 'real' ? '' : '<br>Play it on the beach: the test box → <b>⚔ Nest fight</b> → code <span class="fcode">' + code + '</span><br><small>Then report back. (Simulate = quick test.)</small>');
  $('fight').style.display = 'flex';
  if (G.scen === 'real') return fightGo({ boss: boss ? B.stage : 0, L: lv, code: code.slice(5), last: boss && bossNests().length === 1 });   // v033: his last cabin = his last stand
  return new Promise(res => {
    const done = w => { $('fight').style.display = 'none'; res(w); };
    $('fWin').onclick = () => done(true); $('fLose').onclick = () => done(false);
    $('fSim').onclick = () => done(Math.random() < (boss ? [0, .45, .55][B.stage] : .75));
  });
}
// ---------- the beach, simulated: one row per tide feeds the map ----------
function fightGo(n) {   // v030: the fight window offers one button; the fight runs on the beach and comes back with the result
  ['fWin', 'fLose', 'fSim'].forEach(k => $(k).style.display = 'none'); $('fGo').style.display = '';
  let cd = 3; const go = $('fGo'), lbl = () => { go.textContent = '⚔ To the beach · ' + cd; }; lbl(); clearInterval(fightGo.tm); fightGo.tm = setInterval(() => { cd--; if (cd <= 0) { clearInterval(fightGo.tm); go.click(); } else lbl(); }, 1000);   // v036: it starts by itself
  return new Promise(res => { $('fGo').onclick = async () => { clearInterval(fightGo.tm); $('fight').style.display = 'none'; ['fWin', 'fLose', 'fSim'].forEach(k => $(k).style.display = ''); $('fGo').style.display = 'none'; res(await SPIEL.kampf(n)); }; });
}
function beachRowOf(r) { return { wave: r.wave, win: r.win ? 1 : 0, streak: 0, earned: r.earned, spentB: 0, stock: r.green, kills: r.kills, total: r.total, turret: r.turret ? 1 : 0, ms: [], past: false }; }
function applyBeach(silent) {
  if (G.scen !== 'real') return applyBeachSim(silent);
  if (G.skipBeach && !silent) { G.skipBeach = false; G.boss.fight = false;
    showReport('Beach report · Tide ' + G.tide, '<p><b>No beach fight this flood.</b> Even the rot can only fight in one place — it fought you on the island.</p><p>💚 stock: <b>' + G.res.green + '</b> (one stock for beach and island).</p>'); return; }
  const r = G.lastBeach; if (silent || !r || r.skipped) return;
  const L = [];
  L.push('<b>Beach · wave ' + r.wave + '</b> — ' + (r.win ? '<span style="color:#2d6b3a">won</span>' : '<span style="color:#b0351c">lost</span>') + ' · ' + r.kills + '/' + r.total + ' monsters');
  L.push('💚 earned ' + r.earned + ' → stock <b>' + G.res.green + '</b> (one stock for beach and island)');
  L.push('🌊 island tide <b>' + RULES.baseTide + '</b> + <span class="gold">✨ ' + G.springMax + ' spring hour</span> (' + G.springSrc.join(', ') + ') — shared with the beach, spent last');
  if (G.boss.fight) L.push(bossBeach(!!r.bossDown));
  if (r.turret) L.push('🌿 Your thorn tower fought at the waterline.');
  if (G.friends.gecko) L.push('🦎 The gecko is still learning to swim. (Beach fights come later.)');
  showReport('Beach report · Tide ' + G.tide, L.map(l => '<p>' + l + '</p>').join(''));
}
function applyBeachSim(silent) {   // test switch (scenario menu): the old simulated beach rows, no beach fight
  if (G.skipBeach && !silent) { G.skipBeach = false; G.boss.fight = false;
    showReport('Beach report · Tide ' + G.tide, '<p><b>No beach fight this flood.</b> Even the rot can only fight in one place — it fought you on the island.</p><p>💚 stock unchanged: <b>' + G.res.green + '</b> available here.</p>', 'To the island'); return; }
  const rows = SIM[G.scen], r = rows[Math.min(G.tide - T0, rows.length - 1)], past = G.tide - T0 >= rows.length;
  const [wave, win, streak, earned, spentB, stock, kills, total, turret, ms] = r;
  G.simRow = { wave, win, streak, earned, spentB, stock, kills, total, turret, ms, past };
  G.res.green = Math.max(0, stock - G.mapSpent);
  if (silent) return;
  const L = [];
  L.push('<b>Beach · wave ' + wave + '</b> — ' + (win ? '<span style="color:#2d6b3a">won</span>' : '<span style="color:#b0351c">lost</span>' + (streak > 1 ? ' (' + streak + ' in a row)' : '')) + ' · ' + kills + '/' + total + ' monsters');
  L.push('💚 earned ' + earned + ', ' + spentB + ' spent on the beach → shared stock <b>' + stock + '</b>');
  L.push('Map has used ' + G.mapSpent + ' 💚 so far → <b>' + G.res.green + ' 💚</b> available here');
  L.push('🌊 map tide <b>' + RULES.baseTide + '</b> + <span class="gold">✨ ' + G.springMax + ' spring hour</span> (' + G.springSrc.join(', ') + ') — shared with the beach, spent last');
  if (ms.includes('map_unlocked')) L.push('🗺 The survey opened the island map.');
  if (G.boss.fight) L.push(bossBeach(!!win));
  if (ms.includes('root_turret')) L.push('🌿 Beach test: the root turret stands at the waterline.');
  if (ms.includes('new_enemy_beaten')) L.push('⚔ A new kind of monster was beaten on the beach.');
  if (G.tower) L.push(G.tower2 ? '🗼 Your thorn tower (II) runs Crab Beach.' : '🌿 Your thorn tower tends Crab Beach.');
  if (G.friends.gecko) L.push('🦎 The gecko fights alongside you on the beach.');
  if (past) L.push('<i>(Simulation exhausted — repeating the last beach result.)</i>');
  showReport('Beach report · Tide ' + G.tide, L.map(l => '<p>' + l + '</p>').join(''));

}
// v019: the beach report is debug info now — kept behind a button bottom left
function showReport(title, html) { G.report = { title, html }; G.started = true; $('repBadge').style.display = 'block'; }
$('bReport').onclick = () => { $('repBadge').style.display = 'none'; if (G.report) showCard(G.report.title, G.report.html, 'Close'); else showCard('Beach report', '<p>No report yet.</p>', 'Close'); };
// RSAVE (the shared save format) and the load dialog live in spiel.js since the merger

// ---- map side of RSAVE ----
const G_SKIP = new Set(['floats', 'cat', 'catQ', 'group', 'talk', 'drama', 'combat', 'sapFx', 'catWalk', 'bloom', 'ping', 'flash', 'outLog', 'seaPos', 'tortPos', 'mouthXY', 'stateDirty', 'fogDirty', 'knownDirty', 'now', 'report', 'tinfo', 'targets', 'simRow', 'nph', 'tph', 'sph', 'surge', 'seaVis', 'sel', 'geckoTag', 'shakeT', 'landung']);
const T_KEYS = ['state', 'b', 'source', 'owner', 'name', 'rooted', 'rs', 'prot', 'exh', 'ableger', 'sac', 'vent', 'rotBorn', 'type', 'content', 'full3', 'turm', 'trebo', 'welkSeit', 'welk'];
function mapState(kind) {   // kind 'end' = after a flood (loading starts the next ebb) · 'ebb' = right now, mid-ebb
  const g = {}; Object.keys(G).forEach(k => { if (!G_SKIP.has(k) && typeof G[k] !== 'function') g[k] = G[k]; });
  return { v: RSAVE.V, module: 'map', kind: kind || 'end', tide: kind === 'ebb' ? G.tide : G.tide + 1, m: { G: JSON.parse(JSON.stringify(g)), T: T.map(t => { const o = {}; T_KEYS.forEach(k => { if (t[k] !== undefined) o[k] = t[k]; }); return o; }), seen: Object.assign({}, storySeen) } };
}
function mapRow(o, kind) {
  const r = { save_v: RSAVE.V, game: 1, module: 'map', tide: o.tide, day: '', result: o.nest_fight || G.es.army_def || '', green: G.res.green, spring_max: G.springMax };
  Object.assign(o, { case_found: G.caseFound ? 1 : 0, off_n: G.offN || 0, armies: G.armies.filter(a => !a.dead).map(a => a.at + ':' + a.str + (a.elite ? 'E' : '')).join('|'), finale: G.finale || 0, free_play: G.freePlay ? 1 : 0 });
  Object.keys(o).forEach(k => { if (k !== 'tide') r['m_' + k] = o[k]; });
  r.state = RSAVE.enc(mapState(kind)); return r;
}
function mapLoad(st) {
  const M = st.m; if (!M) return;
  ['card', 'prio', 'fight', 'call', 'drama', 'endScr', 'ledgerScr', 'rulesScr', 'treeScr', 'pet'].forEach(k => { const e = $(k); if (e) e.style.display = 'none'; });
  PRIO.open = null; PRIO.q = []; TQ.length = 0;
  G.fi = false; G.fiLook = 0; delete G.fiWipe; delete G.fiAt; delete G.lastBurn; G.frisch = null; G.wachAb = null; G.wachRang = null; Object.keys(M.G).forEach(k => { G[k] = M.G[k]; });   // v059: no snapshot from another game
  Object.assign(G, { floats: [], cat: null, catQ: [], talk: {}, drama: null, landung: null, combat: null, sapFx: null, catWalk: null, bloom: 0, ping: null, flash: -1, tinfo: {}, targets: [], seaPos: null, tortPos: null, sel: -1, over: false, started: true });
  T.forEach((t, i) => { const o = M.T[i] || {}; T_KEYS.forEach(k => { if (k in o) t[k] = o[k]; else if (k === 'ableger' || k === 'prot' || k === 'rooted' || k === 'welk') t[k] = false; else if (k === 'full3') delete t.full3; }); });
  Object.keys(storySeen).forEach(k => delete storySeen[k]); Object.assign(storySeen, M.seen || {}); fiLabels();
  FOG.scout.x.setTransform(1, 0, 0, 1, 0, 0); FOG.scout.x.clearRect(0, 0, FOG.scout.c.width, FOG.scout.c.height);   // fog starts clean, then what was known is revealed
  T.forEach(t => { if (t.state > 0) t.samp.forEach(([x, y], i) => { if (i % 2 === 0) revealAt(x, y, 22); }); });
  if (!('tut' in M.G)) G.tut = 'done';   // v061: older saves are past the tutorial
  freundReparatur();   // v060
  if (!G.wandelMax || G.wandelMax < WMAX) G.wandelMax = WMAX + Math.max(0, (G.wandelMax || 20) - 20);   // v061: the longer Kinship bar
  G.banyans.forEach(id => { if ((id !== G.banyan || G.friends.banyan) && !T[id].rooted) { T[id].rooted = true; T[id].rs = 1; } });   // v024: trees keep root 1, also in old saves
  const [x, y] = tileXY(G.at); G.group = { x, y, tx: x, ty: y, fx: x, fy: y, t: 1 };
  $('bLedger').style.display = G.caseFound ? '' : 'none'; updRulesBtn();
  G.stateDirty = true; G.knownDirty = true; G.fogDirty = true; VC.t = -1;
  setT0(G.t0 || 11); gruenKoppeln(); G.scen = beachMode(); SPIEL.tagAngleichen(G.tide);   // v030: real beach unless the test menu says otherwise; one tide counter
  if (st.kind === 'end') { G.phase = 'flood'; nextEbb(); } else { G.phase = 'ebb'; planFlood(true); updateHUD(); renderPanel(); }
  if (!G.frisch) { G.frisch = null; const fr = mapState('ebb').m, d = bfsFrom(G.banyan); fr.G.inf = 0;   // v058: an older save — the way back starts here; v059: defused, or it leads straight into the next loss
    fr.T.forEach((o, i) => { if (T[i].reg === 5 || d[i] > 2 || !o.b) return; o.b = T[i].source === 'nest' ? Math.min(o.b, 1) : 0; }); G.frisch = fr; }
  camHome(.6); banner('Loaded · Tide ' + G.tide);
}
const SAVEUI = {   // v030: one save for the whole game (beach + island), see SPIEL
  save: () => SPIEL.speichernManuell(ok => toast(ok ? '💾 Game saved to the clipboard — tide ' + G.tide + '. Paste it into 📂 Load (or keep it in a text file).' : 'Copy failed.')),
  open: () => SPIEL.ladenDialog()
};
function logFlood() {
  const r = G.simRow || {};
  G.outLog.push(mapRow({ tide: G.tide, scenario: G.scen, beach_wave: r.wave, barricade: G.tower ? 1 : 0, gecko: G.friends.gecko ? 1 : 0, banyan_level: G.blevel, offshoots: Math.max(0, G.banyans.length - (G.friends.banyan ? 1 : 0)),
    roots: rootCount(), rot_tiles: T.filter(t => t.b > 0 && t.reg !== 5).length, sap_last: Math.round(G.lastSap * 10) / 10, wandel: G.wandel, wandel_free: G.wFree, green_avail: G.res.green, map_green_spent: G.mapSpent,
    boss_state: G.boss.alive ? (G.boss.ready ? 'ready' : 'recovering') : G.boss.revealed ? 'gone' : 'none', boss_stage: G.boss.stage, boss_recovery: G.boss.rec, boss_nests: bossNests().length, befall: G.inf, descent: G.descent, cave_choices: G.caveC.join(''), cat_fate: G.catFate || '', key: G.key ? 1 : 0, mountain: G.mountain ? 1 : 0,
    board_treasury: G.board.tr, board_stability: G.board.st, board_belief: G.board.be, board_intel: G.board.intel, offensive: offActive() ? G.board.off.name : '',
    // ---- replay / shortcut state (tile ids are stable: fixed seed) ----
    crusoe_at: G.at, tide_unused: G.gezeit, spring: G.spring, spring_max: G.springMax, fruit: G.res.fruit, coco: G.res.coco,
    sap_grow: Math.round(G.sapGrow * 10) / 10, sap_prod: Math.round(G.sapProd * 10) / 10, prio: G.prio, order: G.order, root_target: G.rootTarget,
    unlocks: Object.keys(G.unl).filter(k => G.unl[k]).join('|'), tower_paid: G.towerPaid ? 1 : 0, cutting: G.cutting ? 1 : 0, gecko_fed: G.geckoFed ? 1 : 0, banyan_friend: G.friends.banyan ? 1 : 0,
    offshoot_tiles: G.banyans.filter(id => id !== G.banyan).map(id => id + ':' + treeLvl(id)).join('|'),
    roots_map: T.filter(t => t.rooted).map(t => t.id + ':' + t.rs).join('|'), rot_map: T.filter(t => t.b > 0 || (t.source === 'nest')).map(t => t.id + ':' + t.b + (t.source === 'nest' ? 'n' : '')).join('|'),
    prot: T.filter(t => t.prot).map(t => t.id).join('|'), vents: T.filter(t => t.vent > G.tide).map(t => t.id + ':' + t.vent).join('|'), explored: T.map(t => t.state).join(''),
    boss_at: G.boss.at, boss_ready: G.boss.ready ? 1 : 0, board_pause: G.board.pause, board_off: G.board.off ? G.board.off.kind + ':' + G.board.off.start + '-' + G.board.off.end + (G.board.off.done ? ':done' : '') : '', offers: G.board.offers,
    flags: Object.keys(G.flags).filter(k => G.flags[k]).join('|'), collapses: G.collapses, memories: G.memories.join('|'),
    // ---- what happened this ebb + flood ----
    act_moves: G.es.move || 0, act_harvest: G.es.harvest || 0, act_protect: G.es.protect || 0, act_cleanse: G.es.cleanse || 0, act_plant: G.es.nourish || 0, act_lava: G.es.lava || 0, act_vent: G.es.vent || 0, act_descend: G.es.descend || 0,
    strikes_hit: G.es.hit || 0, strikes_held: G.es.held || 0, surprises: G.es.surprise || 0, nest_fight: G.es.nest_fight || '' }, 'end'));
  G.es = {};
}
// v061: what the roots bring in at the next flood: +1 per healthy rooted resource tile, +1 more if it is protected
function ernte() { const h = { fruit: 0, coco: 0 }; T.forEach(t => { if (!t.rooted || t.b > 0 || !t.content || t.content.kind !== 'res') return; h[t.content.res] += 1 + (t.prot ? 1 : 0); }); return h; }
function gainRes(k, n) { G.res[k] = k === 'coco' ? Math.min(RULES.cocoMax, G.res[k] + n) : G.res[k] + n; }   // v033: coconuts stop at 10
function bilanz() {   // v033: the island's readable columns of the save file (the last flood's numbers come from its log entry)
  const o = G.outLog[G.outLog.length - 1] || {}, B = G.boss, BD = G.board;
  const fight = o.result && o.result !== 'save' ? (o.m_nest_fight ? 'nest ' : 'army ') + o.result : '';
  return { banyan_level: G.blevel, roots: rootCount(), rot_tiles: T.filter(t => t.b > 0 && t.reg !== 5).length, nests: T.filter(t => t.source === 'nest').length,
    wandel: G.wandel + ' (' + G.wFree + ' free)', boss: !B.revealed ? '' : B.alive ? bossName() + ' · ' + (B.ready ? 'ready' : 'recovering ' + B.rec + '/' + bossRec()) : 'terminated',
    board: Math.round(BD.tr) + '/' + Math.round(BD.st) + '/' + Math.round(BD.be), offensive: BD.off && !BD.off.done ? BD.off.name : '', armies: G.armies.filter(a => !a.dead).map(a => a.str + (a.elite ? ' + crab' : '')).join(' | '),
    island_fight: fight, strikes: o.m_strikes_hit !== undefined ? (o.m_strikes_hit || 0) + ' hit / ' + (o.m_strikes_held || 0) + ' held' : '', briefcase: G.caseFound ? 'yes' : 'no', cat: G.catFate === 'gone' ? 'gone' : 'here',
    msg_backlog: (G.stau || 0) + ' ebbs held back' + (G.stauLast ? ' (last: ' + G.stauLast + ' waiting)' : ''), tutorial: tutFertig() ? 'done' : 'step ' + G.tut };   // v061: messages queued for later ebbs — more than 2–3 = paced too fast
}

// ############################ Höhle (Akt 3) ############################
const CAVE_N = 6;
// ---------- v017 Act 3: the cave under the mountain — a side-scrolling nightmare, no combat ----------
// light = green hearts · fear = Blight · the Creditor is never seen, drawn by light · the cat is the tracker
const CV = { on: false };
const CAVE_LEN = 2150, CAVE_FINDS = [520, 1180, 1840];
function caveFmt(s) { return s.replace(/\[\[c(\d)=([ABC])\|([^\]]*)\]\]/g, (m, n, k, txt) => (G.caveC[+n - 1] === k ? txt : '')).replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\n/g, '<br>'); }
function caveRand(seed) { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
function caveRun(ci) {
  const ch = CAVE_TEXT.chambers[ci], rnd = caveRand(ci + 3);
  Object.assign(CV, { on: true, ci, ch, x: 80, vx: 0, face: 1, light: false, lightAcc: 0, t: 0, p: 0, phase: 'idle', nextAp: 12 + rnd() * 8, apDir: rnd() < .5 ? -1 : 1, apT: 0, touched: false,
    fi: 0, reading: false, flash: 0, shake: 0, petT: 0, petCd: 0, keys: {}, btn: {}, scareNext: 18 + rnd() * 14, ghost: 0, catX: 40, catMood: 0, catCry: 0,
    hearts: [0, 1, 2].map(k => ({ x: 300 + k * 600 + rnd() * 300, y: .25 + rnd() * .35, got: false })), rocks: Array.from({ length: 60 }, () => [rnd(), rnd(), rnd()]), done: false });
  $('cave').style.display = 'block'; $('cvTitle').textContent = 'Under the mountain · ' + (ci + 1) + ' / 6 · ' + ch.title; $('cvText').style.display = 'none';
  caveSndStart(CV); requestAnimationFrame(caveFrame);
  return new Promise(res => { CV.resolve = res; });
}
function caveEnd(ok) { CV.on = false; G.inf = Math.round(G.inf); caveSndStop(CV); $('cave').style.display = 'none'; const r = CV.resolve; CV.resolve = null; if (r) r(ok); }
function caveMoving() { return !CV.reading && (CV.keys.l || CV.keys.r || CV.btn.l || CV.btn.r); }
function caveLightOn() { return !CV.reading && (CV.keys.f || CV.btn.f) && G.res.green > 0; }
let caveLast = 0;
function caveFrame(ms) {
  if (!CV.on) return; const t = ms / 1000, dt = Math.min(.05, caveLast ? t - caveLast : .016); caveLast = t;
  if (!CV.reading) caveUpdate(dt); caveDraw(t); caveSndTick(CV, G.inf);
  requestAnimationFrame(caveFrame);
}
function caveUpdate(dt) {
  const C = CV; C.t += dt;
  // walking (not while petting)
  const dir = (C.keys.r || C.btn.r ? 1 : 0) - (C.keys.l || C.btn.l ? 1 : 0);
  C.vx = C.petT > 0 ? 0 : dir * 115; if (dir) C.face = dir; C.x = clamp(C.x + C.vx * dt, 40, CAVE_LEN);
  C.catX += ((C.x - 46 * C.face) - C.catX) * Math.min(1, dt * (C.catMood > .6 ? 4 : 2));
  // light costs green hearts
  C.light = caveLightOn();
  if (C.light) { C.lightAcc += dt; if (C.lightAcc >= 1.2) { C.lightAcc = 0; G.res.green = Math.max(0, G.res.green - 3); G.mapSpent += 3; } }
  // hearts in the walls, only found with light
  C.hearts.forEach(h => { if (!h.got && C.light && Math.abs(h.x - C.x) < 26) { h.got = true; G.mapSpent -= 6; G.res.green += 6; C.msg = { txt: '+6 💚', t: 1.4 }; sfxBell(); } });
  // fear = Blight
  let df = C.light ? -.05 : .1; if (C.phase === 'close' && !C.light && !caveMoving()) df += .5;
  if (C.petT > 0) { C.petT -= dt; if (C.petT <= 0) { G.inf = Math.max(0, G.inf - 1.5); C.petCd = 12; C.msg = { txt: 'She purrs. You breathe.', t: 1.8 }; sfxPurr(); } }
  if (C.petCd > 0) C.petCd -= dt;
  G.inf = clamp(G.inf + df * dt, 0, 12);
  // the Creditor: approaches, lingers close, recedes — faster and more often when you make light
  if (C.light) C.nextAp -= dt * .6;
  if (C.phase === 'idle') { C.nextAp -= dt; if (C.nextAp <= 0) { C.phase = 'rise'; C.apT = 0; C.apDir = Math.random() < .5 ? -1 : 1; C.touched = false; } }
  else { C.apT += dt * (C.light ? 1.5 : 1);
    if (C.phase === 'rise') { C.p = Math.min(1, C.apT / 5); if (C.p >= 1) { C.phase = 'close'; C.apT = 0; } }
    else if (C.phase === 'close') { C.p = 1; if (!C.touched && (caveMoving() || C.light)) caveTouch(); else if (C.apT > 3) { C.phase = 'fall'; C.apT = 0; C.msg = { txt: 'It passes.', t: 1.6 }; } }
    else if (C.phase === 'fall') { C.p = Math.max(0, 1 - C.apT / 4); if (C.p <= 0) { C.phase = 'idle'; C.nextAp = 14 + Math.random() * 10; } } }
  C.catMood += ((C.phase === 'idle' ? 0 : C.p) - C.catMood) * Math.min(1, dt * 2);
  if (C.flash > 0) C.flash -= dt; if (C.shake > 0) C.shake -= dt; if (C.ghost > 0) C.ghost -= dt; if (C.catCry > 0) C.catCry -= dt;
  if (C.msg) { C.msg.t -= dt; if (C.msg.t <= 0) C.msg = null; }
  // small scares
  C.scareNext -= dt; if (C.scareNext <= 0) { C.scareNext = 20 + Math.random() * 20; C.ghost = .5; G.inf = Math.min(12, G.inf + .5); caveScareSnd(); }
  // panic
  if (G.inf >= 10) { cavePanic(); return; }
  // finds
  if (C.fi < 3 && C.x >= CAVE_FINDS[C.fi]) caveFind(C.fi);
  updateHUD();
}
function caveTouch() {
  const C = CV; C.touched = true; C.flash = 1.3; C.shake = .6; C.catCry = 1.5; G.inf = Math.min(12, G.inf + 3); C.phase = 'fall'; C.apT = 0;
  caveScream(); C.msg = { txt: 'It touched you. Not you — her.', t: 2.4 };
}
async function cavePanic() {
  const C = CV; C.reading = true;
  caveShowText('You run', 'You do not remember deciding to run. The light jerks across the walls, your own breath is the loudest thing in the mountain, and the cat is a streak of orange ahead of you — and then there is daylight, and the gecko on the gatepost, and you are on your knees in the rubble of the cut.<br><br><b>The chamber will be waiting. It always waits.</b>', [['Up', () => { G.inf = 7; caveEnd(false); }]]);
}
function caveShowText(head, html, btns) {
  $('cvH').textContent = head; $('cvT').innerHTML = html; $('cvR').innerHTML = '';
  btns.forEach(([lab, fn, sub]) => { const b = document.createElement('button'); b.innerHTML = lab + (sub ? '<small>' + sub + '</small>' : ''); b.onclick = fn; $('cvR').appendChild(b); });
  $('cvText').style.display = 'flex'; $('cvText').scrollTop = 0;
}
function caveFind(i) {
  const C = CV, ch = C.ch; C.reading = true; C.fi = i + 1;
  const txt = caveFmt(ch.finds[i]);
  if (i < 2) { caveShowText(ch.title, txt, [['Go on', () => { $('cvText').style.display = 'none'; C.reading = false; }]]); return; }
  caveShowText(ch.title, txt, ch.choices.map(c => [c.label, () => caveChoose(c), c.line]));
}
function caveChoose(c) {
  const C = CV, ci = C.ci;
  G.caveC[ci] = c.k; Object.keys(c.t).forEach(k => G.caveT[k] = (G.caveT[k] || 0) + c.t[k]);
  const fx = c.fx || {};
  if (fx.inf) G.inf = Math.min(12, G.inf + fx.inf);
  if (fx.banyanRot && G.friends.banyan) T[G.banyan].b = Math.min(3, T[G.banyan].b + fx.banyanRot);
  if (fx.wandelMax) { G.wandelMax = WMAX + fx.wandelMax; G.wandel = Math.min(G.wandel, G.wandelMax); }
  if (fx.mountain) G.mountain = true;
  if (fx.banyanLv) G.blevel = Math.max(1, G.blevel + fx.banyanLv);
  if (fx.rotAll) T.forEach(t => { if (t.b > 0 && !t.source && t.id !== G.cave) t.b = Math.min(3, t.b + fx.rotAll); });
  G.stateDirty = true;
  if (G.inf >= 10) G.inf = 9.5;   // the choice itself never throws you out
  if (ci < 5) { const h = C.ch.hint[c.k]; caveShowText(C.ch.title, '<i>' + (h || '') + '</i>', [['Go deeper', () => caveEnd(true)]]); return; }
  caveReading();
}
function caveFate() {
  const T_ = G.caveT, c6 = G.caveC[5];
  if ((T_.carry || 0) >= 3 && (c6 === 'A' || c6 === 'B') && (T_.paySelf || 0) >= 3) return 'same';
  if ((T_.shift || 0) >= 3) return 'dark';
  return 'gone';
}
function caveReading() {
  const fate = caveFate(), lines = CAVE_TEXT.chambers.map((ch, i) => ch.read[G.caveC[i]] || '').filter(Boolean), F = CAVE_TEXT.fates[fate];
  caveShowText('The Creditor', '<i>"' + lines.join(' ') + '</i><br><br><i>' + F.creditor + '"</i>', [['…', () => {
    caveShowText('', caveFmt(F.text), [['Climb', () => { G.catFate = fate; caveEnd(true); }]]);
  }]]);
}
// ---------- drawing ----------
const CAVE_HUE = { till: [70, 60, 50], seal: [30, 55, 75], rope: [45, 50, 62], chair: [40, 52, 46], plate: [62, 48, 40], pen: [80, 30, 22] };
function caveDraw(t) {
  const cv2 = $('caveCv'), dpr = Math.min(devicePixelRatio || 1, 2), W = cv2.clientWidth, H = cv2.clientHeight;
  if (cv2.width !== Math.round(W * dpr) || cv2.height !== Math.round(H * dpr)) { cv2.width = Math.round(W * dpr); cv2.height = Math.round(H * dpr); }
  const c = cv2.getContext('2d'), C = CV, mo = C.ch.motif, hue = CAVE_HUE[mo] || [50, 50, 50], deep = C.ci / 5;
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const sx = C.shake > 0 ? (Math.random() - .5) * 10 * C.shake : 0, s = Math.min(W / 900, H / 520), floor = H * .74, cam = C.x - W * .42 / s;
  const X = wx => (wx - cam) * s + sx, J = X(C.x);
  c.save();
  // rock: walls fade in from the dark, narrower deeper down
  const rc = 'rgb(' + hue.map(v => Math.round(v * (1.5 - deep * .45))).join(',') + ')';
  c.fillStyle = rc; c.beginPath(); c.moveTo(0, 0);
  for (let k = 0; k <= 40; k++) { const wx = cam + k * W / s / 40, y = H * (.12 + deep * .08) + Math.sin(wx * .013) * 22 * s + Math.sin(wx * .041) * 9 * s; c.lineTo(X(wx), y); }
  c.lineTo(W, 0); c.fill();
  c.beginPath(); c.moveTo(0, H);
  for (let k = 0; k <= 40; k++) { const wx = cam + k * W / s / 40, y = floor + Math.sin(wx * .02 + 1) * 6 * s; c.lineTo(X(wx), y); }
  c.lineTo(W, H); c.fill();
  // stalactites
  C.rocks.forEach(([a, b, d]) => { const wx = a * CAVE_LEN, x = X(wx); if (x < -40 || x > W + 40) return; const len = (14 + d * 40) * s * (1 + deep * .6); c.fillStyle = rc; c.beginPath(); c.moveTo(x - 6 * s, H * (.12 + deep * .08) + 10); c.lineTo(x, H * (.12 + deep * .08) + len); c.lineTo(x + 6 * s, H * (.12 + deep * .08) + 10); c.fill(); });
  // footprints that are not yours
  for (let k = 0; k < 8; k++) { const wx = C.x + 140 + k * 46 + Math.sin(k) * 8; c.fillStyle = 'rgba(160,150,140,.12)'; c.beginPath(); c.ellipse(X(wx), floor - 3 + (k % 2) * 4, 5 * s, 2.2 * s, 0, 0, Math.PI * 2); c.fill(); }
  // motif props at the finds
  caveProps(c, mo, X, floor, s, t, H);
  // hearts glimmer (only shown inside the light later via mask order: drawn now, revealed by light)
  C.hearts.forEach(h => { if (h.got) return; const x = X(h.x), y = H * h.y; c.fillStyle = 'rgba(80,255,90,' + (.5 + .3 * Math.sin(t * 4 + h.x)) + ')'; c.font = Math.round(16 * s) + 'px serif'; c.textAlign = 'center'; c.fillText('💚', x, y); });
  // the cat (tracker): ears flat, fur up, crouch — by how close the thing is
  caveCat(c, X(C.catX), floor, s, t);
  // Jasper
  caveJasper(c, J, floor, s, t);
  c.restore();
  // darkness with the light cut out
  const m = CV.mask || (CV.mask = document.createElement('canvas')); if (m.width !== cv2.width) { m.width = cv2.width; m.height = cv2.height; }
  const mc = m.getContext('2d'); mc.setTransform(dpr, 0, 0, dpr, 0, 0); mc.globalCompositeOperation = 'source-over'; mc.clearRect(0, 0, W, H);
  mc.fillStyle = 'rgba(0,0,0,' + (.93 + deep * .04) + ')'; mc.fillRect(0, 0, W, H); mc.globalCompositeOperation = 'destination-out';
  const hy = floor - 46 * s, flick = C.light && G.res.green < 4 ? (Math.random() < .25 ? .3 : 1) : 1;
  { const g = mc.createRadialGradient(J, hy, 0, J, hy, 95 * s); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); mc.fillStyle = g; mc.fillRect(0, 0, W, H); }
  if (C.light) { const hx = J + 10 * s * C.face, len = 470 * s, g = mc.createRadialGradient(hx, hy, 0, hx, hy, len); g.addColorStop(0, 'rgba(0,0,0,' + .95 * flick + ')'); g.addColorStop(.6, 'rgba(0,0,0,' + .75 * flick + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    mc.fillStyle = g; mc.beginPath(); mc.moveTo(hx, hy - 6 * s); mc.lineTo(hx + len * C.face, hy - 200 * s); mc.lineTo(hx + len * C.face, hy + 130 * s); mc.closePath(); mc.fill();
    const g2 = mc.createRadialGradient(hx, hy, 0, hx, hy, 90 * s); g2.addColorStop(0, 'rgba(0,0,0,.8)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); mc.fillStyle = g2; mc.fillRect(0, 0, W, H); }
  // the cat's eyes catch any light
  c.drawImage(m, 0, 0, W, H);
  { const cx = X(C.catX), cy = floor - 14 * s; c.fillStyle = G.catFate === 'dark' ? 'rgba(255,40,30,.9)' : 'rgba(170,255,150,' + (C.light ? .9 : .45) + ')'; [-2.5, 2.5].forEach(e => { c.beginPath(); c.arc(cx + (e + 4 * C.face) * s, cy, 1.6 * s, 0, Math.PI * 2); c.fill(); }); }
  // green tint of the light
  if (C.light) { c.fillStyle = 'rgba(60,255,90,.05)'; c.fillRect(0, 0, W, H); }
  // the thing at the edge of the light: never clear
  if (C.p > .4) { const side = C.apDir, ex = J + side * (420 - 300 * C.p) * s, a = (C.p - .4) * .9 * (C.light ? 1.4 : .6);
    const g = c.createRadialGradient(ex, floor - 90 * s, 0, ex, floor - 90 * s, 120 * s); g.addColorStop(0, 'rgba(0,0,0,' + Math.min(.95, a) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (C.light && C.p > .85 && Math.sin(t * 31) > .7) { c.fillStyle = 'rgba(10,8,10,.85)'; c.beginPath(); c.ellipse(ex, floor - 110 * s, 26 * s, 90 * s, 0, 0, Math.PI * 2); c.fill(); } }
  if (C.ghost > 0) { c.fillStyle = 'rgba(0,0,0,' + C.ghost * .9 + ')'; c.beginPath(); c.ellipse(J - 30 * s * C.face, floor - 60 * s, 20 * s, 60 * s, 0, 0, Math.PI * 2); c.fill(); }   // a second shadow behind you
  if (C.flash > 0) { c.fillStyle = 'rgba(0,0,0,' + Math.min(1, C.flash) + ')'; c.fillRect(0, 0, W, H); }
  if (C.msg) { c.globalAlpha = Math.min(1, C.msg.t); c.fillStyle = '#e9dcc4'; c.font = "400 " + Math.round(20 * s) + "px 'Patrick Hand',cursive"; c.textAlign = 'center'; c.fillText(C.msg.txt, W / 2, H * .2); c.globalAlpha = 1; }
  // vignette
  const v = c.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .9); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  // HUD
  $('cvHearts').textContent = '💚 ' + G.res.green; const f = Math.min(1, G.inf / 10); $('cvFear').style.width = (f * 100) + '%'; $('cvFear').style.background = G.inf >= 8 ? '#ff4a3a' : G.inf >= 5 ? '#ffb347' : '#7dff4f';
  $('cvLightBtn').classList.toggle('on', C.light); $('cvLightBtn').disabled = G.res.green <= 0;
}
function caveProps(c, mo, X, floor, s, t, H) {
  const at = CAVE_FINDS, P = i => X(at[i]);
  c.lineWidth = 2 * s;
  if (mo === 'till') { [0, 1, 2].forEach(i => { const x = P(i) + 40 * s; c.fillStyle = '#d8d0bf'; c.fillRect(x - 60 * s, floor - 55 * s, 120 * s, 55 * s); c.fillStyle = '#8a6a2a'; c.fillRect(x - 20 * s, floor - 80 * s, 40 * s, 25 * s); c.fillStyle = '#3a2a1a'; c.fillRect(x - 14 * s, floor - 74 * s, 28 * s, 6 * s); if (i === 1) { c.fillStyle = '#2f5a2a'; c.fillRect(x + 26 * s, floor - 60 * s, 30 * s, 6 * s); } }); }
  if (mo === 'seal') { const lvl = Math.min(1, CV.x / CAVE_LEN); c.fillStyle = 'rgba(20,40,60,.85)'; c.fillRect(0, floor - (10 + 70 * lvl) * s, c.canvas.width, 200 * s); c.strokeStyle = 'rgba(140,180,200,.25)'; for (let k = 0; k < 8; k++) { c.beginPath(); const y = floor - (10 + 70 * lvl) * s + 2; c.moveTo(k * 140 * s + Math.sin(t + k) * 20, y); c.lineTo(k * 140 * s + 60 * s + Math.sin(t + k) * 20, y); c.stroke(); }
    c.strokeStyle = '#6a5a4a'; const gx = P(1) + 60 * s; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(gx + k * 10 * s, floor - 60 * s); c.lineTo(gx + k * 10 * s, floor); c.stroke(); } c.beginPath(); c.moveTo(gx, floor - 50 * s); c.lineTo(gx + 40 * s, floor - 50 * s); c.stroke();
    const sx = P(2) + 70 * s, sy = floor - (10 + 70 * lvl) * s; c.fillStyle = '#4a4a50'; c.beginPath(); c.ellipse(sx, sy - 6 * s, 14 * s, 10 * s, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#b8c0c8'; c.beginPath(); c.arc(sx + 5 * s, sy - 8 * s, 2 * s, 0, Math.PI * 2); c.fill(); }
  if (mo === 'rope') { c.strokeStyle = 'rgba(180,190,200,.25)'; c.lineWidth = 1; for (let k = 0; k < 70; k++) { const x = (k * 53 + t * 300) % c.canvas.width, y = (k * 97 + t * 600) % H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 14); c.stroke(); }
    c.lineWidth = 2 * s; c.strokeStyle = '#a89a7a'; const rx = P(1) + 90 * s; c.beginPath(); c.moveTo(rx, 0); c.lineTo(rx, floor - 110 * s); c.stroke(); c.beginPath(); c.ellipse(rx, floor - 96 * s, 9 * s, 14 * s, 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#3a3026'; c.fillRect(P(2) - 80 * s, floor - 20 * s, 220 * s, 20 * s); c.strokeStyle = '#7a6a50'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(P(2) + 40 * s, floor - 24 * s, (6 + k * 4) * s, Math.PI, 0); c.stroke(); } }
  if (mo === 'chair') { c.strokeStyle = 'rgba(120,200,140,.18)'; for (let k = 0; k < 12; k++) { c.strokeRect(X(200 + k * 160), H * .2, 120 * s, 80 * s); }
    [0, 1, 2].forEach(i => { const x = P(i); c.fillStyle = '#2a2e2c'; c.fillRect(x - 70 * s, floor - 48 * s, 140 * s, 8 * s); c.fillRect(x - 64 * s, floor - 40 * s, 6 * s, 40 * s); c.fillRect(x + 58 * s, floor - 40 * s, 6 * s, 40 * s); });
    const cx = P(2) + 90 * s, rot = Math.sin(t * .4) * .6; c.save(); c.translate(cx, floor - 30 * s); c.scale(Math.cos(rot), 1); c.fillStyle = '#1e2220'; c.fillRect(-14 * s, -34 * s, 28 * s, 30 * s); c.fillRect(-16 * s, -6 * s, 32 * s, 8 * s); c.restore(); c.fillRect(cx - 2 * s, floor - 28 * s, 4 * s, 28 * s); }
  if (mo === 'plate') { const x0 = P(0) - 100 * s, x1 = P(2) + 120 * s; c.fillStyle = '#3a2c22'; c.fillRect(x0, floor - 40 * s, x1 - x0, 10 * s);
    for (let k = 0; k < 24; k++) { const x = x0 + 30 * s + k * ((x1 - x0) / 24), turn = Math.max(0, 1 - Math.abs(X(CV.x) - x) / (260 * s)); c.fillStyle = '#4a3c34'; c.fillRect(x - 8 * s, floor - 90 * s, 16 * s, 50 * s); c.fillStyle = '#c8a890'; c.beginPath(); c.ellipse(x + turn * 3 * s, floor - 102 * s, 9 * s, 11 * s, 0, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = 'rgba(120,255,140,.35)'; c.beginPath(); for (let k = 0; k < 30; k++) { const x = x0 + k * (x1 - x0) / 30; c.lineTo(x, H * .22 + Math.sin(k) * 8); } c.stroke(); }
  if (mo === 'pen') { const x = P(2) + 60 * s; c.fillStyle = '#121014'; c.fillRect(x - 110 * s, floor - 60 * s, 220 * s, 60 * s); c.strokeStyle = 'rgba(255,90,30,' + (.5 + .3 * Math.sin(t * 1.5)) + ')'; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(x - 100 * s + k * 38 * s, floor - 60 * s); c.lineTo(x - 90 * s + k * 38 * s, floor); c.stroke(); }
    c.fillStyle = '#e8dcc0'; c.fillRect(x - 60 * s, floor - 66 * s, 120 * s, 6 * s); c.fillStyle = '#39e639'; c.fillRect(x + 10 * s, floor - 66 * s, 20 * s, 4 * s);
    c.fillStyle = 'rgba(255,80,20,.08)'; c.fillRect(0, floor - 10 * s, c.canvas.width, 40 * s); }
}
function caveCat(c, x, floor, s, t) {
  const C = CV, m = C.catMood, crouch = m > .85 ? 4 : 0, puff = m > .6 ? 1.25 : 1, y = floor - 2 * s;
  c.save(); c.translate(x, y); c.scale(C.face * s, s);
  c.fillStyle = G.catFate === 'dark' ? '#b0602a' : '#e07b2e';
  c.beginPath(); c.ellipse(0, -9 + crouch, 12 * puff, 6 * puff, 0, 0, Math.PI * 2); c.fill();   // body
  c.beginPath(); c.arc(11, -14 + crouch, 5.5, 0, Math.PI * 2); c.fill();   // head
  const ear = m > .3 ? 1 : 0;   // ears flat when it is near
  c.beginPath(); c.moveTo(8, -18 + crouch); c.lineTo(8 + ear * 3, -23 + crouch + ear * 4); c.lineTo(11, -19 + crouch); c.fill(); c.beginPath(); c.moveTo(12, -19 + crouch); c.lineTo(15 + ear * 2, -23 + crouch + ear * 4); c.lineTo(15, -17 + crouch); c.fill();
  c.strokeStyle = c.fillStyle; c.lineWidth = 2.6 * puff; c.lineCap = 'round'; c.beginPath(); c.moveTo(-11, -10 + crouch);   // tail: up and curious, low when afraid, bottle-brush when it is close
  if (m < .3) c.quadraticCurveTo(-20, -18, -16 + Math.sin(t * 2) * 2, -26); else if (m < .7) c.quadraticCurveTo(-18, -6, -24, -4); else c.quadraticCurveTo(-20, -24, -14, -28);
  c.stroke(); c.restore();
  if (C.catCry > 0) { c.fillStyle = 'rgba(255,240,220,' + C.catCry / 1.5 + ')'; c.font = Math.round(14 * s) + "px 'Patrick Hand',cursive"; c.textAlign = 'center'; c.fillText('!!', x, floor - 34 * s); }
  if (C.petT > 0) { c.fillStyle = '#ff9a8a'; c.font = Math.round(12 * s) + 'px serif'; c.fillText('♥', x, floor - 30 * s - (2 - C.petT) * 8); }
}
function caveJasper(c, x, floor, s, t) {
  const C = CV, walk = Math.abs(C.vx) > 0 ? Math.sin(t * 9) : 0;
  c.save(); c.translate(x, floor); c.scale(C.face * s * 1.6, s * 1.6);
  c.strokeStyle = '#5d6470'; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(-2, -14); c.lineTo(-2 - walk * 3, 0); c.moveTo(2, -14); c.lineTo(2 + walk * 3, 0); c.stroke();
  c.fillStyle = '#e8e2d6'; c.fillRect(-5, -30, 10, 16); c.fillStyle = G.wandel >= 5 ? '#5a8a3a' : '#8e2a2a'; c.fillRect(-.8, -30, 1.8, 8);
  c.fillStyle = '#e0b48a'; c.beginPath(); c.arc(0, -35, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#4a3020'; c.fillRect(-5, -40, 10, 3);
  c.strokeStyle = '#e8e2d6'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(4, -27); c.lineTo(9, C.light ? -27 : -18); c.stroke();
  if (C.light) { c.fillStyle = '#39e639'; c.fillRect(8, -30, 4, 6); }
  c.restore();
}
// ---------- input ----------
window.addEventListener('keydown', e => { if (!CV.on) return; const k = e.key.toLowerCase(); if (k === 'arrowleft' || k === 'a') CV.keys.l = true; if (k === 'arrowright' || k === 'd') CV.keys.r = true; if (k === ' ' || k === 'f' || k === 'l') { CV.keys.f = true; e.preventDefault(); } if (k === 'c' && !CV.reading && CV.petCd <= 0 && CV.petT <= 0) CV.petT = 2; });
window.addEventListener('keyup', e => { if (!CV.on) return; const k = e.key.toLowerCase(); if (k === 'arrowleft' || k === 'a') CV.keys.l = false; if (k === 'arrowright' || k === 'd') CV.keys.r = false; if (k === ' ' || k === 'f' || k === 'l') CV.keys.f = false; });
[['cvL', 'l'], ['cvR2', 'r'], ['cvLightBtn', 'f']].forEach(([id, k]) => { const b = $(id); const on = e => { e.preventDefault(); CV.btn[k] = true; }, off = () => { CV.btn[k] = false; };
  b.addEventListener('pointerdown', on); ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => b.addEventListener(n, off)); });
$('cvPet').addEventListener('click', () => { if (CV.on && !CV.reading && CV.petCd <= 0 && CV.petT <= 0) CV.petT = 2; });
function caveRecalc() { G.caveT = {}; G.caveC.forEach((k, i) => { const c = CAVE_TEXT.chambers[i] && CAVE_TEXT.chambers[i].choices.find(x => x.k === k); if (c) Object.keys(c.t).forEach(q => G.caveT[q] = (G.caveT[q] || 0) + c.t[q]); }); G.wandelMax = G.caveC[5] === 'A' ? 18 : 20; }
function caveBite(id) {   // the gecko will not go in
  $('mK').textContent = 'The cave mouth'; $('mH').textContent = 'The gecko'; $('mT').textContent = CAVE_TEXT.entrance.bite; $('mem').style.display = 'flex';
  $('mR').innerHTML = '<button id="mA">Turn back</button><button id="mB">Go anyway · +1 Blight</button>';
  $('mA').onclick = () => { $('mem').style.display = 'none'; };
  $('mB').onclick = () => { G.flags.caveIn = true; addInf(1); $('mT').textContent = CAVE_TEXT.entrance.go; $('mR').innerHTML = '<button id="mUp">Go in</button>'; $('mUp').onclick = () => { $('mem').style.display = 'none'; act('move', id); }; };
}
function openTunnel() { const ct = T[G.cave]; if (!ct || ct.tunnel) return; ct.tunnel = true; (ct.nbSealed || []).forEach(n => { ct.nb.add(n); T[n].nb.add(G.cave); }); G.stateDirty = true; }
async function descend() {
  if (G.at !== G.cave || G.descent >= CAVE_N || G.descTide === G.tide || G.gezeit + G.spring < 1 || CV.on) return;
  G.gezeit = 0; G.spring = 0; G.descTide = G.tide; G.below = true; G.sel = -1; G.cat = null; G.catQ = []; renderPanel(); updateHUD();
  const ok = await caveRun(G.descent);
  if (ok) G.descent++;
  else say1('cavePanic', 'tortoise', 'Ran, did you? Good. Running is underrated. The chamber will keep — they always keep.');
  if (ok && G.descent === 1) say1('descend1', 'tortoise', 'You came back. Both of you. While you\'re down there the island holds the flood without you — remember that.');
  if (ok && G.descent >= CAVE_N) {
    G.flags.lagoon = true; if (G.catFate !== 'same') G.flags.noSkip = true;
    await showCardWait('The crack in the mountain', caveFmt(CAVE_TEXT.exit), 'Look down');
    say('tortoise', CAVE_TEXT.fates[G.catFate].up);
  }
  G.stateDirty = true; updateHUD(); renderPanel();
}
async function endEbb() {
  if (G.phase !== 'ebb' || G.over) return;
  if (G.finale === 1) { toast('Not now — the island is celebrating.'); return; }   // v020: the end of Act 2 plays out first
  if (G.tide >= T0 + 1 && !G.talkEbb) banter();
  if (G.gezeit >= 3 && G.moves > 0) { G.wasted = (G.wasted || 0) + 1; if (G.wasted === 1) say('tortoise', G.gezeit + ' hours back into the sea. The sea says thanks.'); if (G.wasted === 3) say('tortoise', 'Again? You\'re feeding the ocean now. It isn\'t even hungry.'); }
  if (G.friends.banyan && arms(T[G.banyan]).length) G.bmRef = defense(T[G.banyan]) - attackOn(T[G.banyan]); else G.bmRef = undefined;
  G.phase = 'flood'; G.sel = -1; renderPanel(); updateHUD();
  const ov = G.targets.filter(id => G.tinfo[id] && G.tinfo[id].overflow).length, om = G.targets.length - ov;
  banner('Low tide ends · ' + (G.omen ? 'Bad Omen ' + G.omen + ': ' + om + ' strike' + (om === 1 ? '' : 's') : 'no Bad Omen') + (ov ? ' · ' + ov + ' overflow' : '')); await sleep(1300);   // v036: no click, just the banner
  // Blight: where Crusoe spends the flood
  if (!G.below) { const h = T[G.at]; if (h.b > 0) addInf(2); addInf(-Math.floor(defense(h) / 2)); }
  // holding a nest at rot 1 → the nest fight replaces the beach fight
  const heldN = !G.below && T[G.at].source === 'nest' && T[G.at].b === 0 ? G.at : -1;
  T.forEach(tt => { if (tt.source === 'nest' && tt.b === 0 && tt.id !== heldN) { tt.b = 1; tt.rotBorn = G.tide; if (tt.state > 0) addFloat(...tileXY(tt.id), 'the nest regrows', '#9dff7a'); G.stateDirty = true; } });   // an exposed nest nobody holds closes up again
  if (heldN >= 0) {
    unlockRule('nestfight'); G.skipBeach = true;
    const won = await nestFight(G.at);
    G.es.nest_fight = won ? 'won' : 'lost';
    if (won) { nestClosed(G.at); addInf(-4); await sleep(400); while ($('card').style.display === 'flex') await sleep(150); }
    else { G.collapse = true; T[G.at].b = 1; T[G.at].rotBorn = G.tide; G.stateDirty = true; await showCardWait('Overwhelmed', 'The nest swallows the light. The last thing you hear is the cat, yowling, very close.<br><br><b>You collapse.</b> The nest closes up again: rot 1. Next ebb you\'ll wake somewhere else.', 'Darkness'); }
  }
  await armyPhase(heldN >= 0);
  if (G.inf >= 10 && !G.collapse && G.collapses) { G.collapse = true; banner('Blight ' + G.inf + ' · you collapse'); await sleep(1400); }   // v060: the full card only the first time
  else if (G.inf >= 10 && !G.collapse) { G.collapse = true; await showCardWait('You collapse', 'Blight ' + G.inf + '. Your legs simply stop. The world goes green, then black.<br><br>The cat yowls for help. Next ebb you\'ll wake somewhere else.', 'Darkness'); }
  banner(offActive() ? 'High tide · ' + G.board.off.name : 'High tide');
  await sleep(900);
  let lost = 0, held = 0; G.flutHielt = null;
  if (!G.targets.length) say1('calm', 'tortoise', 'A calm tide. The rot found nothing it fancies. Enjoy it; it never lasts.');
  { const cn = cleanPhase(); if (cn) { banner('The banyan scrubs · −' + cn + ' rot'); await sleep(1100); } }
  for (const id of G.targets.slice()) {
    const t = T[id]; if (G.over) break;
    const looked = await camLook(id, 'strike'); G.flash = id; await sleep(looked || tourOK('strike') ? 350 : 160);
    const a = attackOn(t), d = defense(t), [x, y] = tileXY(id);
    if (G.tinfo[id] && G.tinfo[id].overflow) { await treboSchuss(G.tinfo[id].from, id); G.stateDirty = true; await sleep(700); continue; }   // v061: no dice for the trebuchet
    const pHold = holdChance(d, a), holds = Math.random() < pHold, surprise = holds ? a > d : d >= a;
    if (surprise) { G.es.surprise = (G.es.surprise || 0) + 1; const msg = 'Variance report: ' + T[id].name + ' — attack ' + a + ' vs defence ' + d + (holds ? ' and it held anyway' : ' and it fell anyway') + '. The odds were ' + pct(holds ? pHold : 1 - pHold) + '.';
      if (storySeen.oddsMemo) say('briefcase', msg); else prio('briefcase', 'Audit note: variance', msg + '\nNothing on this island is certain, Mr. Robinson. The badge shows who should win; the world rolls the dice.\nEven: 50/50. One point ahead: 80 %. Two: 92 %. Three or more: 99 %. Book a safety margin.', { must: true, key: 'oddsMemo', ping: id }); }
    if (!holds) {
      lost++; G.es.hit = (G.es.hit || 0) + 1; if (t.b === 0) t.rotBorn = G.tide; t.b = Math.min(id === G.banyan && !tutFertig() ? 2 : 3, t.b + 1);   // v061: no loss in the tutorial
      if (t.rooted && G.banyans.includes(id) && t.rs <= 1) t.rs = 1;   // v024: a standing tree always keeps root 1
      else if (t.rooted) { t.rs--; rootFx(id, t.rs + 1, t.rs); if (t.rs <= 0) welken(t, x, y); else addFloat(x, y - 16, 'root −1', '#ffb0a0'); }
      addFloat(x, y, 'rot ' + a + ' vs ' + d + ' · +1 rot', '#ff9a8a');
      if (t.b >= 2 && friendOn(id) && id !== G.banyan) { G.friends.gecko = false; G.springMax--; G.springSrc = G.springSrc.filter(x => x !== 'gecko'); addFloat(x, y - 30, 'the gecko flees', '#ffb0a0'); }
      if ((t.ableger || id === G.banyan) && t.b >= 3) await treeBurn(id);
    } else {
      held++; G.es.held = (G.es.held || 0) + 1; addFloat(x, y, 'rot ' + a + ' vs ' + d + ' · held', '#c8ffb0');
      if (id === G.at && !G.below) { addWandel(1); addFloat(x, y - 18, '+1 Kinship · you held it', '#ffe08a'); }   // v063: standing your ground pays
      if (d >= a + pushNeed()) { erode('be', 1); const src = [...t.nb].filter(n => T[n].b > 0 && !T[n].source).sort((p, q) => T[q].b - T[p].b)[0]; if (src !== undefined) { T[src].b--; addFloat(...tileXY(src), 'pushed back', '#c8ffb0'); } }
    }
    G.stateDirty = true; await sleep(900);
  }
  G.flash = -1; VC.t = -1;
  if (lost || held) unlockRule('defence');
  if (lost) prio('tortoise', 'That\'s how rot works', 'It got through. A lone tile always falls, darling.\nGrow roots next to roots, and stand where it pushes hardest. The sums are on the rule card if you must.', { key: 'firstLoss' });
  else if (held) say1('firstHold', 'tortoise', 'Held. Don\'t get used to it.');
  if (G.over) { say('tortoise', 'Well. That was the banyan.'); await inselVerloren(); return; }
  // the rot feeds its networks, then the banyan works its roots
  await sleep(300);
  G.flutHielt = { n: held + lost, held };   // v070
  const nh = nestPhase(); if (nh) { banner('The nests feed'); await sleep(1300); }
  { const bb = T[G.banyan].b; if (G.friends.banyan) {   // the banyan's own rot: two warning steps before it falls
    const burnTxt = G.blevel >= 2 ? 'At rot 3 it burns ' + (G.blevel >= 3 ? 'two levels' : 'one level') + ' to push the rot back.' : 'At rot 3 it dies — and the island with it.';
    if (bb === 1 && !G.bWarn1) { G.bWarn1 = true; if (rep('bWarn1') === 1) prio('tortoise', 'Rot on the banyan', 'The rot touched the banyan itself.\nCleanse it now, then roots and protection on the tiles around it.', { must: true, urgent: true, ping: G.banyan, ill: 'banyanDanger' }); else say('tortoise', 'Rot 1 on the banyan. Cleanse it.'); }
    if (bb >= 2 && !G.bWarn2) { G.bWarn2 = true; if (rep('bWarn2') === 1) prio('tortoise', 'One more and it burns', 'One more and the banyan burns its own rings.\nDrop everything: cleanse it, and stand on it at flood.', { must: true, urgent: true, ping: G.banyan, ill: 'banyanDanger' }); else say('tortoise', 'Rot 2 on the banyan. ' + burnTxt); }
    if (bb === 0) { G.bWarn1 = false; G.bWarn2 = false; } } }
  for (const id of G.banyans.slice()) if (T[id].b >= 3) await treeBurn(id);   // fed up to rot 3
  nestGrowth();
  if (G.over) { await inselVerloren(); return; }
  if (G.friends.banyan) { const sp = sapPhase(); if (sp) { banner('The banyan drinks · +' + (Math.round(sp * 10) / 10) + ' sap'); await sleep(1300); } }
  rotEatsRoots();
  if (!G.friends.banyan && T[G.banyan].b >= 1 && !G.bWarnF) { G.bWarnF = true; prio('tortoise', 'The banyan is rotting', 'The rot has reached the banyan — and it doesn\'t know you yet.\nGo to it and listen to it (2 free Kinship): the friendship cleans it. At rot 3 it is gone, and the island with it.', { must: true, urgent: true, ping: G.banyan, ill: 'banyanDanger' }); }
  if (T[G.banyan].b >= 3 && (G.friends.banyan ? G.blevel <= 1 : true)) { G.over = true; say('tortoise', 'Well. That was the banyan.'); await inselVerloren(); return; }
  T.forEach(t => { if (t.exh > 0) t.exh--; });
  { const h = ernte(); Object.keys(h).forEach(k => { if (h[k]) gainRes(k, h[k]); }); if (h.fruit || h.coco) { banner('The roots harvest · ' + (h.fruit ? '+' + h.fruit + ' 🍞 ' : '') + (h.coco ? '+' + h.coco + ' 🥥' : '')); await sleep(1000); } }   // v061: roots harvest, Robinson doesn't
  { const n = welkNachwachsen(); if (n) { banner('Withered roots regrow · ' + n); await sleep(900); } }
  bossTick();
  // v030: the beach fight of this flood (unless a nest/army fight replaced it, or the scenario menu simulates the beach)
  const bribeSkip = G.bribeSkip !== undefined && G.tide <= G.bribeSkip && !G.boss.fight;   // v061: the Board paid the wave off
  G.lastBeach = await SPIEL.strandFlut({ skip: G.skipBeach || bribeSkip || G.scen !== 'real', grund: G.skipBeach ? 'island_fight' : bribeSkip ? 'bribe' : 'sim', boss: G.boss.fight && !G.skipBeach ? G.boss.stage : null });
  if (G.scen === 'real' && G.lastBeach && !G.lastBeach.skipped) G.simRow = beachRowOf(G.lastBeach);
  logFlood();
  nextEbb();
}
function nextEbb() {
  { const held = PRIO.q.filter(m => !m.urgent).length; if (held) { G.stau = (G.stau || 0) + 1; G.stauLast = held; } G.prioShown = 0; }   // v061: log the backlog
  document.querySelectorAll('#insel #chatT .ln.neu').forEach(l => l.classList.remove('neu'));   // v063: a new ebb — last ebb's lines become history
  G.tide++; G.gezeit = RULES.baseTide; G.spring = G.springMax; G.phase = 'ebb'; unlockRule('spring'); G.below = false;
  if (G.collapse) { G.collapse = false; G.collapses++; G.gezeit = 0; G.spring = 0; G.at = G.friends.banyan ? G.banyan : G.start; const [x, y] = tileXY(G.at); Object.assign(G.group, { x, y, tx: x, ty: y, t: 1 }); G.inf = Math.max(0, G.inf - 3);
    if (G.collapses > 1) setTimeout(() => toast('You wake up · this ebb is lost' + (G.inf >= 7 ? ' · Blight ' + G.inf + ': stand on clean, protected tiles to shake it off' : '')), 300); else setTimeout(() => showCard('You wake up', 'Under the banyan, covered in leaves. ' + (G.catFate === 'gone' ? 'The gecko sits on your shoe, very pleased with itself. It dragged you back. Somehow.' : 'The cat is asleep on your chest; the gecko sits on your shoe, very pleased with itself. They dragged you back.') + '<br><br><b>This ebb is lost</b> — you can barely stand.'), 300); }
  boardTick(); G.talkEbb = 0; talkRelease(); setTimeout(kursPing, 1600);   // v058
  planFlood(); rettungPruefen(); banner('Low tide · Tide ' + G.tide); applyBeach(); camHome();   // v061: his dens appear when the tutorial ends
  if (tutFertig() && G.tide >= 20 && G.tide % 10 === 0 && G.nachLand !== G.tide) { G.nachLand = G.tide; setTimeout(nachschubSzene, 1400); }   // v063: the Board's supply drop
  if (!G.caseFound && G.tide >= CASE_AT && G.scen !== 'real') caseFound();   // v030: with the real beach the briefcase is a beach find
  if (G.finale === 2 && G.tide >= (G.catAt || 0)) setTimeout(catLeaves, 700);
  { const can = G.friends.banyan && !G.treeSeen && (G.unl.listen || G.wFree >= 2); if (!can) G.treeCanSince = -1; else if (G.treeCanSince < 0 || G.treeCanSince === undefined) G.treeCanSince = G.tide;
    else if (G.tide - G.treeCanSince >= 2) prio('tortoise', 'The banyan is waiting', 'Two tides now, and you haven\'t opened the banyan once.\nWalk to its tile and tap ' + (G.unl.listen ? '“Open the banyan ▸”' : '“Listen to the banyan” (2 free Kinship)') + '. It shows where the sap goes, and you can teach it things: deeper roots, more growth, cuttings.\nIt has been listening to you. Return the favour.', { must: true, key: 'treeNag', ping: G.banyan, ill: 'banyanCall', valid: () => !G.treeSeen }); }
  updateHUD(); renderPanel();
}

// ############################ Akt 2 ############################
// ---------- the First Mate: demotion, recovery, relocation, termination ----------
const bossNests = () => G.boss.nests.filter(id => T[id].source === 'nest' && T[id].owner === 'bailiff');
const bossName = () => BOSS.name[G.boss.stage];
const bossRec = () => (G.boss.firstLong ? 4 : BOSS.recover) + (G.board.tr < 25 ? 1 : 0);   // first return: tide 7, six tides after his beach defeat
function bossStrongest(except) {
  const { nets } = networks(), list = bossNests().filter(id => id !== except);
  const pw = id => { const net = nets.find(n => n.nests.includes(id)); return net ? nestPower(net, id) : 0; };
  return list.sort((a, b) => pw(b) - pw(a) || bfsFrom(G.start)[a] - bfsFrom(G.start)[b])[0];
}
function bossReveal(still) {
  const B = G.boss; if (B.revealed) return;
  const list = bossNests(); if (!list.length) return; B.revealed = true;
  B.alive = true; B.stage = 1; B.rec = 0; B.firstLong = true; B.at = bossStrongest(); addIntel(1);   // v061: the cloud stays — they glimmer through it
  G.stateDirty = true; planFlood(true);
  const other = list.find(id => id !== B.at);
  prio('briefcase', 'MEMO · Crew roster, MY Leverage', 'Re: Performance Improvement Plan.\nSubject lost one (1) beach to persons unknown. Demoted to Cabin Boy. Reassigned to the ' + T[B.at].name + ' for ' + bossRec() + ' tides of reflection.' + (other >= 0 ? ' Second den on file: ' + T[other].name + '.' : '') +
    '\n\n…That came to my old address. I shouldn\'t be reading it. Both of his dens glimmer through the clouds on the cliffs — ink-dark. As long as one stands, he comes back.', { must: true, urgent: !still, ping: B.at });
  unlockRule('boss');
  if (false) prio('briefcase', 'His dens', 'Those ink-dark puddles are his — up on the cliffs. You\'ll need the gecko to climb there.\nScrub one to zero and it\'s closed. Scrub the one he sulks in and he has to move. Scrub the last one and he\'s gone. No fight needed.', { key: 'bossNestsT' });
}
function nestFeeding(id) {   // v024: the nest that feeds this tile at flood (null if none)
  if (T[id].b <= 0 || T[id].b >= 3) return null; const { nets } = networks();
  for (const net of nets) for (const n of net.nests) if (net.share[n] && net.share[n].includes(id)) return n;
  return null;
}
function bossShort() { return BOSS.short[Math.min(2, Math.max(0, G.boss.stage))]; }
function bossMsg(key, title, text, ping, short, tiny) { const n = rep(key); if (n === 1) { prio('briefcase', title, text, { must: true, key, ping }); addIntel(1); } else if (n === 2) say('briefcase', short); else if (tiny) say('briefcase', tiny); }
function bossTick() {   // once per flood
  const B = G.boss; if (!B.alive) return;
  if (B.ready) { B.fight = true; return; }
  B.rec = Math.min(bossRec(), B.rec + 1);
  if (B.rec === 1 && rep('bossDay1') === 1) say('briefcase', 'Memo, day 1: ' + bossName() + ' sent to mandatory retraining. Location: ' + T[B.at].name + '.');
  if (B.rec === 2 && rep('bossDay2') === 1) say('briefcase', 'Memo, day 2: ' + bossName() + ' reassigned to a smaller desk. No window.');
  if (B.rec >= bossRec()) { B.ready = true;
    bossMsg('bossReinst', 'MEMO · Reinstatement', 'Day ' + B.rec + ': ' + bossName() + ' reinstated. Probationary. Expectations: high.\nHe reports to the waterline next flood — he\'ll walk in with the next wave like any other monster.\n\nHP ' + BOSS.hp[B.stage] + ' · slam ' + BOSS.slam[B.stage] + ' · paperwork still flying. I\'m told he lost weight.', G.start, 'Memo: ' + bossName() + ' reinstated again. Waterline, next flood. HP ' + BOSS.hp[B.stage] + ', slam ' + BOSS.slam[B.stage] + '.', '👁 Back at the waterline next flood.'); }
}
function bossBeach(win) {   // he walked in with this beach wave
  const B = G.boss; B.fight = false;
  if (!win) return '⚔ ' + bossName() + ' was in the wave — <b>still standing</b>. He\'ll be in the next wave too.';
  erode('st', 3);
  const was = bossName(); B.stage = Math.min(BOSS.name.length - 1, B.stage + 1); B.ready = false; B.rec = 0; B.firstLong = false;
  const to = bossStrongest(); if (to === undefined) { bossTerminate(); return '⚔ ' + was + ' beaten — and nowhere left to go.'; }
  B.at = to;
  bossMsg('bossDemote', 'MEMO · Demotion', 'Re: ' + was + '.\nLost the beach. Again. New title: ' + bossName() + '. Relocated to the ' + T[to].name + '. Three tides.\n\n' + (B.stage >= 2 ? 'They took his folder and gave him a cardboard box. I recognise the box. It\'s the one they give you before the last one.' : 'Smaller. Thinner. The suit doesn\'t fit any more. It never does, after.'), to, 'Memo: ' + was + ' lost the beach again. Now: ' + bossName() + '. Back to the ' + T[to].name + ' for three tides.', '👁 Demoted → ' + T[to].name + '.');
  return '⚔ ' + was + ' was in the wave — <b>beaten</b>. Demoted to <b>' + bossName() + '</b>, back to the ' + T[to].name + '.';
}
function bossNestGone(id) {
  const B = G.boss, t = T[id]; t.owner = null; t.name = 'Cleansed hollow'; addIntel(2);
  if (!B.alive) return;
  const left = bossNests();
  if (!left.length) { bossTerminate(); return; }
  if (B.at === id) {
    B.at = bossStrongest(); B.rec = Math.max(0, B.rec - 1); B.ready = false;
    bossMsg('bossReloc', 'MEMO · Office relocation', 'Effective immediately: ' + bossName() + ' relocates to the ' + T[B.at].name + '. Again.\nMoving costs him a day of recovery: ' + B.rec + '/3.\n\nOne den left. You know what that means. So does he.', B.at, 'Memo: ' + bossName() + ' moved to the ' + T[B.at].name + '. Recovery ' + B.rec + '/3.', '👁 Moved → ' + T[B.at].name + '.');
  } else say('briefcase', 'Memo: the ' + T[id].name + ' has been closed. "Restructuring." ' + bossName() + ' has one den left.');
}
function bossTerminate() {
  const B = G.boss, was = bossName(); B.alive = false; B.ready = false; B.fight = false; B.at = -1;
  prio('briefcase', 'TERMINATION LETTER', 'To: ' + was + '.\nYour position has been eliminated. Your access has been revoked. Please return the lifebuoy.\ncc: Accounts.\n\n…cc: Accounts. That\'s us. That was always us. I may have been on the wrong distribution list all along.', { must: true, btn: 'File it', ill: 'fired' });
  addIntel(2); G.board.pendingDir = G.tide + (G.phase === 'ebb' ? 1 : 2); setTimeout(spawnNachBoss, 2500);   // v061: two new nests after his last den   // v016: the Board takes a tide to decide — no directive in the same ebb as the victory
  // v020: no key from him any more — Act 3 is only reachable through the secret shortcut (long press on the tide bar → the cat)
  if (false) prio('tortoise', 'A key', 'In what\'s left of him: an old brass key on a lanyard. The tag says "Gate C — service tunnel".\nThere\'s a rusted gate up on the cliff-top, darling, right where the bats come out. Under the mountain.\nI won\'t come with you. Nobody goes down there with you.', { must: true, ping: G.gate });
}

// ---------- v020: the Board's armies — spawn on nests, follow the rot to the banyan, hit buildings and Robinson ----------
const ARMY = { speed: 2, atkCost: 2 };
function isBuilding(id) { return id === G.banyan || !!T[id].ableger || (G.tower && id === G.start); }
function armyTarget(id) { return isBuilding(id) || (id === G.at && !G.below); }
function revealArmyTile(id) {   // v021: where an army stands, the fog lifts for good
  const t = T[id]; if (t.state === 0) { t.state = 1; G.stateDirty = true; }
  t.samp.forEach(([x, y], i) => { if (i % 2 === 0) revealAt(x, y, 22); }); G.fogDirty = true;
}
function spawnArmies(n) {
  const count = n === 1 ? 3 : 2 + n, db = bfsFrom(G.banyan), dist = id => (db[id] >= 1e9 ? -1 : db[id]);
  const ok = id => T[id].reg !== 5 && id !== G.cave && id !== G.banyan && !T[id].ableger;
  const land = T.filter(t => ok(t.id)).map(t => t.id);
  // the elite: the land tile farthest to the north-east
  const ne = land.slice().sort((a, b) => { const [ax, ay] = tileXY(a), [bx, by] = tileXY(b); return (bx / CW - by / CH) - (ax / CW - ay / CH); })[0];
  const used = new Set([ne]), spots = [];
  const take = list => { for (const id of list) { if (spots.length >= count - 1) break; if (!used.has(id) && ok(id)) { spots.push(id); used.add(id); } } };
  take(G.nests.filter(id => T[id].source === 'nest').sort((a, b) => dist(b) - dist(a)));          // nests first
  take(T.filter(t => t.b > 0).map(t => t.id).sort((a, b) => dist(b) - dist(a)));                    // then any rot, far ones first
  const far = land.slice().sort((a, b) => dist(b) - dist(a));
  while (spots.length < count - 1) { const id = far.find(x => !used.has(x)); if (id === undefined) break; spots.push(id); used.add(id); if (!T[id].b) { T[id].b = 3; T[id].rotBorn = G.tide; } }
  if (ne === undefined) return;
  if (!T[ne].b) { T[ne].b = 3; T[ne].rotBorn = G.tide; }      // no rot up there: it rots on the spot
  G.armies = []; G.offLost = 0; G.armyN = n;
  const base = n === 1 ? [5, 6] : [4 + n, 4 + n];
  spots.forEach((id, i) => { G.armies.push({ id: i, at: id, str: base[Math.min(i, 1)], elite: false, dead: false, ph: Math.random() * 6 }); revealArmyTile(id); });
  G.armies.push({ id: spots.length, at: ne, str: 7 + n, elite: true, dead: false, ph: Math.random() * 6 }); revealArmyTile(ne);
  G.stateDirty = true; unlockRule('armies'); if (n === 1) { SPIEL.geschenk('flame'); setTimeout(() => say('tortoise', 'The banyan sends you fire for those walls: hold A through the Wall Leap — the flamethrower. 🎁'), 4000); }   // v055: fire for the walls — announced on the beach
  prio('tortoise', n === 1 ? 'Three armies' : 'More armies', 'Look at the nests. Things are crawling out — crabs, rats, paper wasps — in step, like a parade.\nAnd far up in the north-east, past the lagoon, something big: a crab the size of a rowing boat, with a tag on its shell. It is slow. It is coming anyway.\nThey all march on the banyan, and they don\'t stop until they are dead. The red arrows show next flood\'s way.\nStand in their way, or go after them: next to an army, attack — 2 hours a fight. On a tree you get help: the gecko and the tree\'s own thorns.', { must: true, key: 'armies' + n, ping: ne, ill: 'army' });
}
function armyPath(from) {   // cheapest way to the banyan: rot tiles cost 1, everything else 2
  const dist = new Array(T.length).fill(1e9), prev = new Array(T.length).fill(-1), done = new Array(T.length).fill(false); dist[from] = 0;
  for (;;) { let u = -1, best = 1e9; for (let i = 0; i < T.length; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; } if (u < 0 || u === G.banyan) break; done[u] = true;
    T[u].nb.forEach(v => { if (T[v].reg === 5 || v === G.cave) return; const c = dist[u] + (T[v].b > 0 ? 1 : 2); if (c < dist[v]) { dist[v] = c; prev[v] = u; } }); }
  const p = []; for (let v = G.banyan; v >= 0; v = prev[v]) { p.unshift(v); if (v === from) break; } return p[0] === from ? p : [from];
}
function armyPlan(a) {      // the tiles this army walks next flood (it stops on the first target)
  if (a.dead || a.at === G.banyan || (armyTarget(a.at) && a.at !== G.at) || a.at === G.at) return [];
  const p = armyPath(a.at), out = []; let budget = a.elite ? 1 : ARMY.speed;   // v022: the crab moves one field per flood, rot or not
  for (let i = 1; i < p.length; i++) { const c = T[p[i]].b > 0 ? 1 : 2; if (out.length && budget < c) break; budget -= c; out.push(p[i]); if (armyTarget(p[i])) break; }
  return out;
}
const armyOn = id => G.armies.find(a => !a.dead && a.at === id);
function armyOdds(a, tree) { return clamp(.78 - .08 * (a.str - 3) + (G.friends.gecko ? .08 : 0) + (tree ? .1 : 0), .2, .95); }
function armyFight(a, id, active) {   // prototype bridge, like the nest fight: played on the beach, the result comes back here
  const tree = G.friends.banyan && (G.banyans.includes(id) || G.banyans.includes(G.at)), lv = G.scen === 'real' ? SPIEL.welle() : (G.simRow && G.simRow.wave) || 11;
  const code = 'ARMY-' + Math.min(9, a.str) + '-' + (tree ? 'T' : '0') + '-' + lv + (a.elite ? '-E' : '');
  $('fT').textContent = active ? 'You attack the army' : 'The army attacks';
  $('fB').innerHTML = (a.elite ? '<b>The Repo Crab</b> leads this one. ' : '') + (active ? 'You go after the Board\'s army on the <b>' + T[id].name + '</b> — strength <b>' + a.str + '</b>.' : 'The Board\'s army (strength <b>' + a.str + '</b>) runs straight into you on the <b>' + T[id].name + '</b>.') +
    (tree || G.friends.gecko ? '<br>On your side: ' + [G.friends.gecko ? '🦎 the gecko' : '', tree ? '🌿 the tree\'s thorns (a small thorn tower)' : ''].filter(Boolean).join(' and ') + '.' : '') +
    (active ? '' : '<br><br>No beach fight this flood: the rot is busy with you.') + (G.scen === 'real' ? '' : '<br>Play it on the beach: the test box → <b>⚔ Nest / army fight</b> → code <span class="fcode">' + code + '</span><br><small>Then report back. (Simulate = quick test, ' + pct(armyOdds(a, tree)) + ' to win.)</small>');
  $('fight').style.display = 'flex';
  if (G.scen === 'real') return fightGo({ boss: 0, army: Math.min(9, a.str), tower: tree, elite: !!a.elite, L: lv, code: code.slice(5) });
  return new Promise(res => {
    const done = w => { $('fight').style.display = 'none'; res(w); };
    $('fWin').onclick = () => done(true); $('fLose').onclick = () => done(false);
    $('fSim').onclick = () => done(Math.random() < armyOdds(a, tree));
  });
}
async function armyBeaten(a) { const [x, y] = tileXY(a.at); addFloat(x, y - 20, 'the army scatters!', '#c8ffb0'); addWandel(1); erode('be', 2); G.stateDirty = true; say1('armyWin', 'tortoise', 'Look at them run. Paper wasps have no stamina. Neither do rats, it turns out.'); await armyDown(a, 'you'); }
async function armyDown(a, by) {   // v022: armies never scatter by themselves; the last one to fall ends Act 2
  a.dead = true; G.stateDirty = true;
  if (G.armies.some(q => !q.dead)) return;
  if ((G.armyN || 1) === 1 && !G.finale) { await lastArmyDrama(a, by); G.finale = 1; setTimeout(() => finaleRun(G.offCut || '', G.offSum || offSumTxt()), 300); }
  else say('briefcase', 'All armies scattered. The Board will call that "a strategic realignment".');
}
async function armyAttack(id) {   // during the ebb: Robinson goes after an army on his tile or next to it
  const a = armyOn(id); if (!a || PRIO.open || $('fight').style.display === 'flex') return;
  if (!(id === G.at || (T[G.at].nb.has ? T[G.at].nb.has(id) : [...T[G.at].nb].includes(id)) && crossOk(G.at, id).ok)) { toast('Stand on it or next to it.'); return; }
  if (!spend(ARMY.atkCost)) return;
  G.es.army_atk = (G.es.army_atk || 0) + 1; renderPanel(); updateHUD();
  const won = await armyFight(a, id, true);
  if (won) await armyBeaten(a);
  else { addInf(3); const [x, y] = tileXY(G.at); addFloat(x, y - 20, 'beaten back · +3 Blight', '#ff9a8a'); say('tortoise', 'That went badly. Lick your wounds; they\'re still coming.'); }
  renderPanel(); updateHUD();
}
async function armyHitBuilding(a, id) {
  const t = T[id], d = defense(t), [x, y] = tileXY(id), pHold = holdChance(d, a.str), hold = Math.random() < pHold, str0 = a.str, lv0 = id === G.banyan ? G.blevel : t.ableger ? treeLvl(id) : 1, parts = defParts(t);
  await camLook(id, 'armyFight'); G.flash = id; G.combat = { id, str: a.str, d, t0: G.now, res: null }; await sleep(900);
  G.combat.res = hold ? (d >= a.str + 2 ? 'held · army −1' : 'held') : (id === G.banyan ? (G.blevel > 1 ? '−1 ring' : 'level 1 — holds on') : t.ableger ? '−1 level' : 'tower falls'); G.combat.ok = hold; G.combat.t1 = G.now;
  if (hold) { if (d >= a.str + 2) { a.str--; if (a.str <= 0) { G.combat = null; await armyDown(a, id === G.banyan ? 'banyan' : 'tree'); } } }
  else if (id === G.banyan) { if (G.blevel > 1) { G.blevel--; G.offLost++; sfxBurn(); } }
  else if (t.ableger) { if (treeLvl(id) <= 1) { t.ableger = false; G.banyans = G.banyans.filter(b => b !== id); setRooted(t, false); addFloat(x, y - 30, 'the offshoot is torn down', '#ff9a8a'); } else { t.sac = (t.sac || 0) + 1; addFloat(x, y - 30, 'offshoot −1 level', '#ff9a8a'); } sfxBurn(); }
  else if (G.tower && id === G.start) { G.tower = false; G.tower2 = false; addFloat(x - 40, y - 30, 'the thorn tower falls', '#ff9a8a'); sfxBurn(); say('briefcase', 'The tower is gone. Capex written off. I hate this part.'); }
  G.stateDirty = true; await sleep(1100); G.combat = null;
  return { id, d, parts, pHold, hold, str0, lv0, lv1: id === G.banyan ? G.blevel : t.ableger ? treeLvl(id) : (G.tower ? 1 : 0) };
}
function crabReport(a, R) {   // v022: one memo per flood while the Repo Crab lives
  const db = bfsFrom(G.banyan), steps = db[a.at] >= 1e9 ? '?' : db[a.at], here = T[a.at].name, L = [];
  if (R.moved) L.push('The Repo Crab advances: ' + T[R.from].name + ' → ' + here + '. ' + (steps === 0 ? 'It stands at the banyan.' : steps + ' step' + (steps === 1 ? '' : 's') + ' from the banyan.'));
  else L.push('The Repo Crab holds its ground on the ' + here + '.');
  if (R.fight !== null) L.push(R.fight ? 'It ran into you — and you held.' : 'It ran into you. You went down.');
  if (R.hit) { const h = R.hit, who = h.id === G.banyan ? 'Banyan' : T[h.id].ableger ? 'Offshoot' : 'Thorn tower';
    L.push('⚔ ' + h.str0 + ' vs 🛡 ' + h.d + ' (' + (h.parts.map(p => p[0] + ' ' + p[1]).join(' · ') || 'nothing') + ') · odds to hold ' + pct(h.pHold) + '.');
    L.push(h.hold ? (h.d >= h.str0 + 2 ? '→ ' + who + ' held, and it hurt the crab: strength ' + a.str + '.' : '→ ' + who + ' held. The crab is untouched: strength ' + a.str + '.') : '→ It broke through. ' + who + (h.id === G.banyan ? (h.lv0 > h.lv1 ? ': level ' + h.lv0 + ' → ' + h.lv1 + '.' : ' holds on at level 1.') : h.lv1 < h.lv0 ? ' lost a level.' : ' fell.')); }
  const atTree = G.friends.banyan && G.banyans.includes(a.at);
  const tip = R.fight === false ? 'Lick your wounds. It is slow — pick your spot.' : atTree ? 'Stand on that tree next flood. You count — and you can hit back with the gecko and the thorns beside you.' : steps !== '?' && steps <= 2 ? 'It will be at a tree soon. Wait for it there: on a tree, the gecko and the thorns fight with you.' : 'It is slow. Use the time — roots and protection around the banyan, then meet it on a tree.';
  prio('briefcase', 'Battle report · The Repo Crab', L.join('\n') + '\n\nStrength ' + a.str + '.\n🐢 ' + tip, { must: true, ill: 'army' });
}
async function armyPhase(fought) {   // flood: every army moves, then fights whatever it stands on
  const live = G.armies.filter(a => !a.dead); if (!live.length) return fought;
  banner('The armies march'); await sleep(900);
  for (const a of live) {
    if (a.dead) continue;
    const plan = armyPlan(a);
    const from = a.at;
    if (plan.length) { const lk = await camLook(plan[plan.length - 1], 'march'); for (const id of plan) { a.prev = a.at; a.at = id; revealArmyTile(id); await sleep(lk || tourOK('march') ? 280 : 120); } }
    const rep2 = a.elite ? { from, moved: plan.length, fight: null, hit: null } : null;
    const id = a.at;
    if (id === G.at && !G.below && !G.collapse && !fought) {
      fought = true; G.skipBeach = true;
      const won = await armyFight(a, id, false);
      G.es.army_def = won ? 'won' : 'lost';
      if (rep2) rep2.fight = won;
      if (won) { await armyBeaten(a); continue; }
      G.collapse = true; await showCardWait('Overrun', 'The army goes over you like a wave of paper and claws. <br><br><b>You collapse.</b> Next ebb you\'ll wake somewhere else — and they keep marching.', 'Darkness');
    }
    if (isBuilding(id)) { const r = await armyHitBuilding(a, id); if (rep2) rep2.hit = r; }
    if (rep2 && !a.dead) crabReport(a, rep2);
  }
  G.flash = -1;
  return fought;
}
function drawRepoCrab(c, x, y, t, s, rear, tip) {   // a coconut crab the size of a rowing boat, with a repossession tag
  c.save(); c.translate(x, y); c.rotate(tip || 0); c.scale(s, s); const w = Math.sin(t * 5) * .8, up = rear || 0;
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0, 1, 16, 3.5, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#5a1e12'; c.lineWidth = 2.2; c.lineCap = 'round';
  for (let k = 0; k < 4; k++) [-1, 1].forEach(sd => { const bx = sd * (5 + k * 2.4), lg = Math.sin(t * 8 + k + (sd > 0 ? 1.5 : 0)) * 1.2; c.beginPath(); c.moveTo(bx, -6 - up * .3); c.lineTo(bx + sd * (5 + k), -10 - up * .4 + lg); c.lineTo(bx + sd * (8 + k * 1.4), 0); c.stroke(); });
  const body = '#8a3220', dark = '#5a1e12';
  c.fillStyle = dark; c.beginPath(); c.ellipse(0, -8 - up, 13, 7.5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = body; c.beginPath(); c.ellipse(0, -9 - up, 12, 6.6, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,190,150,.35)'; c.beginPath(); c.ellipse(-3, -12 - up, 6, 2.2, -.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(120,255,90,.55)'; [[-6, -7], [4, -6], [7, -10]].forEach(([dx, dy]) => { c.beginPath(); c.arc(dx, dy - up, 1.4, 0, Math.PI * 2); c.fill(); });   // rot spots
  // eyes on stalks
  c.strokeStyle = dark; c.lineWidth = 1.2; [-3, 3].forEach(ex => { c.beginPath(); c.moveTo(ex, -14 - up); c.lineTo(ex * 1.3 + w * .3, -19 - up); c.stroke(); c.fillStyle = '#eaffd9'; c.beginPath(); c.arc(ex * 1.3 + w * .3, -19.5 - up, 1.5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#39e639'; c.beginPath(); c.arc(ex * 1.3 + w * .3 + .4, -19.5 - up, .7, 0, Math.PI * 2); c.fill(); });
  // the big claw, raised, with a folder in it
  c.save(); c.translate(12, -11 - up); c.rotate(-.6 - up * .05 + Math.sin(t * 2) * .1);
  c.fillStyle = body; c.beginPath(); c.ellipse(5, 0, 7, 4.2, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = dark; c.beginPath(); c.moveTo(10, -1); c.lineTo(15, -4); c.lineTo(11, 1.5); c.fill();
  c.fillStyle = '#c9a25e'; c.fillRect(9, -7, 6, 5); c.fillStyle = '#e8c88a'; c.fillRect(9, -7, 6, 1.2); c.restore();
  c.fillStyle = body; c.beginPath(); c.ellipse(-12, -6 - up, 4.5, 3, .4, 0, Math.PI * 2); c.fill();
  // the tag
  c.strokeStyle = '#3b2a1a'; c.lineWidth = .6; c.beginPath(); c.moveTo(-2, -15 - up); c.lineTo(-6, -11 - up + Math.sin(t * 3)); c.stroke();
  c.save(); c.translate(-8, -10 - up + Math.sin(t * 3)); c.rotate(.2 + Math.sin(t * 3) * .15); c.fillStyle = '#ffd45a'; c.fillRect(-4, -1.6, 8, 4.2); c.fillStyle = '#3b2a1a'; c.font = "600 3px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillText('REPO', 0, 1.5); c.restore();
  c.restore();
}
function drawArmy(c, x, y, t, a, sc) {
  sc = sc || 1.6; c.save(); c.translate(x, y); c.scale(sc, sc);
  const g = c.createRadialGradient(0, -6, 0, 0, -6, 34); g.addColorStop(0, 'rgba(255,60,40,' + (.28 + .1 * Math.sin(t * 3 + a.ph)) + ')'); g.addColorStop(1, 'rgba(255,60,40,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, -6, 34, 0, Math.PI * 2); c.fill();
  const P = (a.elite ? [[-20, 6, 'rat'], [20, 7, 'toad'], [-16, -10, 'wasp'], [18, -8, 'wasp']] : [[-14, 4, 'rat'], [10, 6, 'toad'], [-2, -2, 'wasp'], [16, -4, 'rat'], [-18, -6, 'toad'], [4, 10, 'toad']].slice(0, 3 + Math.min(3, a.str - 2)));
  P.forEach(([dx, dy, k], i) => {
    const b = Math.abs(Math.sin(t * 6 + i * 1.7 + a.ph)) * 2, px = dx + Math.sin(t * 2 + i) * 1.2, py = dy - b;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(dx, dy + 2, 5, 1.6, 0, 0, Math.PI * 2); c.fill();
    if (k === 'rat') { c.strokeStyle = '#d98a8a'; c.lineWidth = 1; c.beginPath(); c.moveTo(px - 5, py); c.quadraticCurveTo(px - 10, py - 3, px - 11, py + 2); c.stroke(); c.fillStyle = '#5d6a5a'; c.beginPath(); c.ellipse(px, py - 2, 5.5, 3.2, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(px + 5, py - 3, 2.6, 2, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#9dff7a'; c.fillRect(px + 5.5, py - 4, 1.2, 1.2); }
    else if (k === 'toad') { c.fillStyle = '#4f7a2a'; c.beginPath(); c.ellipse(px, py - 2, 5, 3.4, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#9dff7a'; c.beginPath(); c.arc(px - 2, py - 5, 1.3, 0, Math.PI * 2); c.arc(px + 2, py - 5, 1.3, 0, Math.PI * 2); c.fill(); }
    else { const fl = Math.sin(t * 30 + i) * 3; c.fillStyle = 'rgba(230,240,255,.6)'; c.beginPath(); c.ellipse(px - 3, py - 10 - fl * .3, 3, 1.4 + Math.abs(fl) * .3, -.5, 0, Math.PI * 2); c.ellipse(px + 3, py - 10 - fl * .3, 3, 1.4 + Math.abs(fl) * .3, .5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f4f1ea'; c.fillRect(px - 3, py - 10, 6, 8); c.fillStyle = '#9aa0a8'; for (let r = 0; r < 3; r++) c.fillRect(px - 2, py - 8.5 + r * 2.2, 4, .7); }
  });
  if (a.elite) drawRepoCrab(c, 0, 4, t, 1.15, a.rear || 0, 0);
  c.restore();
  // v022: strength on a war flag the army carries (gold for the Repo Crab's army)
  { const fx = x + (a.elite ? 24 : 18) * sc, fy = y + 2 * sc, ph = Math.sin(t * 4 + a.ph), H = (a.elite ? 30 : 24) * sc;
    c.strokeStyle = '#3b2a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy - H); c.stroke();
    const fw = 22, fh = 15; c.fillStyle = a.elite ? '#e0a92a' : '#b0251c'; c.beginPath(); c.moveTo(fx, fy - H); c.quadraticCurveTo(fx + fw * .5, fy - H - 3 + ph * 2, fx + fw, fy - H + ph); c.lineTo(fx + fw, fy - H + fh + ph); c.quadraticCurveTo(fx + fw * .5, fy - H + fh - 3 + ph * 2, fx, fy - H + fh); c.fill();
    c.fillStyle = a.elite ? '#2a1606' : '#fff0e6'; c.font = "600 13px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillText(a.str, fx + fw * .5, fy - H + fh * .5 + 5 + ph * .6); }
  c.font = "600 10px 'Fredoka',system-ui"; c.fillStyle = a.elite ? 'rgba(255,220,140,.95)' : 'rgba(255,190,170,.95)'; c.fillText(a.elite ? 'ARMY · REPO CRAB' : 'ARMY', x, y + 22 * sc);
}
function drawBurn(c, t) {   // v024: flames in the crown, the rings count down, then a green ring cleans
  const B = G.burn; if (!B) return; const [x, y] = tileXY(B.id), e = G.now - B.t0, sc = B.main ? BANYAN_SC : .88, top = y - 52 * sc, w = 30 * sc;
  const g = c.createRadialGradient(x, y - 20 * sc, 10, x, y - 20 * sc, 260); g.addColorStop(0, 'rgba(0,6,4,0)'); g.addColorStop(1, 'rgba(0,6,4,' + Math.min(.45, e) + ')'); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
  if (e < 2.1) for (let i = 0; i < 26; i++) { const q = (e * 1.4 + i / 26) % 1, fx = x + Math.sin(i * 2.3) * w * (1 - q * .5), fy = top + 22 * sc - q * 34 * sc, r = (6 - q * 5) * sc;
    const fg = c.createRadialGradient(fx, fy, 0, fx, fy, r * 2); fg.addColorStop(0, 'rgba(255,240,150,' + (1 - q) + ')'); fg.addColorStop(.5, 'rgba(255,120,30,' + (1 - q) * .8 + ')'); fg.addColorStop(1, 'rgba(200,40,10,0)'); c.fillStyle = fg; c.beginPath(); c.arc(fx, fy, r * 2, 0, Math.PI * 2); c.fill(); }
  if (e < 2.4) for (let i = 0; i < 10; i++) { const q = (e * .9 + i / 10) % 1; c.fillStyle = 'rgba(255,200,90,' + (1 - q) + ')'; c.fillRect(x + Math.sin(i * 5 + e) * w, top - q * 50 * sc, 1.6, 1.6); }   // sparks
  const k = clamp((e - .3) / 1.6, 0, 1), show = Math.round(B.from - (B.from - B.to) * k);   // the rings count down
  woodDisc(c, x + (B.main ? 26 : 16), y + (B.main ? 10 : 6), B.main ? 15 : 11, show, 'rgba(255,120,40,' + (.6 + .4 * Math.sin(t * 9)) + ')');
  if (e > 2.0) { const q = clamp((e - 2.0) / 1.0, 0, 1), R = 20 + q * 140; c.strokeStyle = 'rgba(190,255,140,' + (1 - q) + ')'; c.lineWidth = 6 * (1 - q) + 1; c.beginPath(); c.ellipse(x, y, R, R * .55, 0, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 8; i++) { const a = i * .8 + e, rr = 10 + q * 30; c.fillStyle = 'rgba(60,60,60,' + (.5 * (1 - q)) + ')'; c.beginPath(); c.arc(x + Math.cos(a) * rr, y - 6 - q * 30, 5 + q * 6, 0, Math.PI * 2); c.fill(); } }   // the rot steams off
}
function drawCombat(c, t) {
  const K2 = G.combat; if (!K2) return; const [x, y] = tileXY(K2.id), e = G.now - K2.t0;
  const g = c.createRadialGradient(x, y, 70, x, y, 380); g.addColorStop(0, 'rgba(0,8,6,0)'); g.addColorStop(1, 'rgba(0,8,6,' + Math.min(.45, e) + ')'); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
  const sh = K2.res && G.now - K2.t1 < .3 && !K2.ok ? (Math.random() - .5) * 6 : 0, py = y - 92 + sh;
  c.font = "600 22px 'Fredoka',system-ui"; c.textAlign = 'center'; const txt = '⚔ ' + K2.str + '  vs  🛡 ' + K2.d, w = c.measureText(txt).width + 34;
  c.fillStyle = 'rgba(20,10,12,.92)'; roundRect(c, x - w / 2 + sh, py - 20, w, 34, 14); c.fill(); c.strokeStyle = 'rgba(255,212,140,.8)'; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#fff6e3'; c.fillText(txt, x + sh, py + 5);
  if (K2.res) { const a = Math.min(1, (G.now - K2.t1) * 4); c.globalAlpha = a; c.font = "600 18px 'Fredoka',system-ui"; const w2 = c.measureText(K2.res).width + 24; c.fillStyle = K2.ok ? 'rgba(20,60,30,.92)' : 'rgba(90,16,10,.92)'; roundRect(c, x - w2 / 2, py + 20, w2, 26, 12); c.fill(); c.fillStyle = K2.ok ? '#c8ffb0' : '#ffb0a0'; c.fillText(K2.res, x, py + 39); c.globalAlpha = 1; }
}
function drawArmies(c, t) {
  const live = G.armies.filter(a => !a.dead); if (!live.length) return;
  // the small thorn towers on the trees: the trees' own defence while armies are about
  if (G.friends.banyan) G.banyans.forEach(id => { const [x, y] = tileXY(id), tx = x + (id === G.banyan ? 30 : 20), ty = y + 8; c.save(); c.translate(tx, ty); c.scale(.85, .85); c.translate(-tx, -ty); drawThornTower(c, tx, ty, t); c.restore(); });
  live.forEach(a => {
    const [x, y] = tileXY(a.at);
    if (T[a.at].state < 2) {   // fields with an army are visible for as long as it stands there
      const R = 58; c.save(); c.beginPath(); c.arc(x, y - 4, R, 0, Math.PI * 2); c.clip(); c.drawImage(base.c, 0, 0, CW, CH); c.drawImage(stateLayer.c, 0, 0, CW, CH); c.restore();
      c.strokeStyle = 'rgba(255,120,90,.55)'; c.lineWidth = 2; c.setLineDash([6, 5]); c.beginPath(); c.arc(x, y - 4, R, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    }
    if (G.phase === 'ebb') {   // where it goes next flood
      const plan = armyPlan(a); let [fx, fy] = [x, y];
      plan.forEach((id, i) => { const [tx, ty] = tileXY(id); c.strokeStyle = 'rgba(255,80,60,' + (.75 + .25 * Math.sin(t * 4)) + ')'; c.lineWidth = 4; c.setLineDash([10, 7]); c.lineDashOffset = -t * 24; c.beginPath(); c.moveTo(fx, fy); c.lineTo(tx, ty); c.stroke(); c.setLineDash([]);
        if (i === plan.length - 1) { const ang = Math.atan2(ty - fy, tx - fx); c.fillStyle = 'rgba(255,80,60,.95)'; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx - Math.cos(ang - .45) * 16, ty - Math.sin(ang - .45) * 16); c.lineTo(tx - Math.cos(ang + .45) * 16, ty - Math.sin(ang + .45) * 16); c.fill();
          if (armyTarget(id)) { c.font = "600 12px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = 'rgba(40,6,4,.85)'; roundRect(c, tx - 34, ty - 66, 68, 17, 8); c.fill(); c.fillStyle = '#ffb0a0'; c.fillText(id === G.at ? '⚔ attacks you' : '⚔ attacks', tx, ty - 54); } }
        fx = tx; fy = ty; });
    }
    const pv = a.prev !== undefined && a.prev !== a.at ? tileXY(a.prev) : [x, y + 60], vx = pv[0] - x, vy = pv[1] - y, vl = Math.hypot(vx, vy) || 1, ax = x + vx / vl * 34, ay = y + vy / vl * 22;
    drawArmy(c, ax, ay, t, a);
  });
}
// ---------- v021: the last army falls — zoom, the banyan strikes through its roots, the crab topples, REJECTED ----------
async function lastArmyDrama(a, by) {
  const id = a.at, [x, y] = tileXY(id);
  G.drama = { a, id, x, y, by, t0: G.now, hit: 0, pts: armyPath(id).map(tileXY).reverse(), parts: [] };
  camGo({ x, y, z: CAM.zMax }, .7); sfxHeart();
  await sleep(1750);
  G.drama.hit = G.now; G.shakeT = G.now + .7; sfxDrum();
  for (let i = 0; i < 80; i++) G.drama.parts.push({ k: 'paper', x: x + (Math.random() - .5) * 20, y: y - 24, vx: (Math.random() - .5) * 220, vy: -80 - Math.random() * 160, rot: Math.random() * 6, vr: (Math.random() - .5) * 10, t: 0 });
  for (let i = 0; i < 12; i++) { const ang = Math.random() * Math.PI * 2; G.drama.parts.push({ k: ['rat', 'toad', 'wasp'][i % 3], x, y, vx: Math.cos(ang) * (70 + Math.random() * 60), vy: Math.sin(ang) * (40 + Math.random() * 30), t: 0 }); }
  await sleep(1100);
  const el = $('drama'); el.querySelector('.dt').textContent = by === 'you' ? 'The last army breaks' : 'The banyan struck'; el.style.display = 'flex'; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); sfxFanfare();
  await sleep(3600);
  el.style.display = 'none'; G.drama = null;
  say('tortoise', by === 'you' ? 'That was you. Don\'t let it go to your head — it\'s already in mine.' : 'It doesn\'t like being leaned on. Neither do I.');
}
// v063: every 10 tides the Board lands supplies for the rot — a barge past the wreck, crates on the sand, and one more spearhead per network
function landeZiel() {   // a coast tile you can see, as close to the rot as possible; the water tile next to it is where the barge comes from
  const coast = T.filter(t => t.reg !== 5 && t.state > 0 && [...t.nb].some(n => T[n].reg === 5)), nests = T.filter(t => t.source === 'nest');
  const dN = t => nests.length ? Math.min(...nests.map(n => Math.hypot(...[0, 1].map(k => tileXY(n.id)[k] - tileXY(t.id)[k])))) : 0;
  const z = coast.sort((a, b) => (b.b - a.b) || (dN(a) - dN(b)))[0] || T[G.start]; const w = [...z.nb].find(n => T[n].reg === 5); return { z: z.id, w: w !== undefined ? w : (G.wreck >= 0 ? G.wreck : z.id) }; }
async function nachschubSzene() {
  const lz = landeZiel(), z = lz.z, [ex, ey] = tileXY(z), [wx0, wy0] = tileXY(lz.w), dx0 = wx0 - ex, dy0 = wy0 - ey, L0 = Math.hypot(dx0, dy0) || 1, wx = ex + dx0 / L0 * 70, wy = ey + dy0 / L0 * 50, dx = wx - CW / 2, dy = wy - CH / 2, L = Math.hypot(dx, dy) || 1;
  G.landung = { t0: G.now, sx: wx + dx / L * 260, sy: wy + dy / L * 160, ex: wx + (ex - wx) * .55, ey: wy + (ey - wy) * .55, lx: ex, ly: ey, crates: [] };
  camGo({ x: (wx + ex) / 2, y: (wy + ey) / 2, z: Math.max(CAM.z, CAM.zMax * .7) }, .8); sfxDrum();
  await sleep(5200);
  const per = 1 + nachschub();
  await showCardWait('Supplies for the rot', 'A grey barge with the Board\'s flag noses in past the wreck — no crew, no wheelhouse, only a mast with a blinking light. Nobody on it has ever seen you. Its ramp drops, crates slide onto the sand; something green crawls out of them and up into the island.<br><br><b>From now on every rot network sends ' + per + ' spearheads each flood</b> (Bad Omen). The rot is learning this island — every ten tides it gets a little better at it.', 'Noted');
  G.landung = null; camHome();
}
function drawLandung(c, t) {
  const L = G.landung; if (!L) return; const e = G.now - L.t0, p = clamp(e / 3.2, 0, 1), q = p * p * (3 - 2 * p), x = L.sx + (L.ex - L.sx) * q, y = L.sy + (L.ey - L.sy) * q + Math.sin(e * 2) * 1.5;
  c.save(); c.translate(x, y); c.scale(1.6, 1.6);   // the barge: grey hull, a little wheelhouse, the Board's flag
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 6, 34, 6, 0, 0, 7); c.fill();
  c.fillStyle = '#4a5258'; c.beginPath(); c.moveTo(-32, -2); c.lineTo(30, -2); c.lineTo(24, 7); c.lineTo(-28, 7); c.closePath(); c.fill();
  c.fillStyle = '#3a4046'; c.fillRect(-27, -6, 6, 4); if (Math.sin(t * 6) > 0) { c.fillStyle = '#ff5a3a'; c.beginPath(); c.arc(-20, -26, 1.6, 0, 7); c.fill(); }   // v070: an unmanned barge — a control box and a blinking mast light, no wheelhouse
  c.fillStyle = '#6b4a2a'; for (let k = 0; k < 4; k++) if (e < 3.4 + k * .35) c.fillRect(-8 + k * 9, -9, 8, 7);
  c.strokeStyle = '#222'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-20, -10); c.lineTo(-20, -24); c.stroke(); c.fillStyle = '#b0351c'; c.fillRect(-20, -24, 11, 6); c.fillStyle = '#fff'; c.font = "700 5px 'Fredoka',system-ui"; c.fillText('BOARD', -19, -19.5);
  c.restore();
  if (e > 3.3) for (let k = 0; k < 4; k++) { const ek = e - 3.4 - k * .35; if (ek < 0) continue; const f = clamp(ek / .6, 0, 1), cx = L.ex + (L.lx - L.ex) * (.3 + f * .6) + (k - 1.5) * 8, cy = L.ey + (L.ly - L.ey) * (.3 + f * .6) - Math.sin(f * Math.PI) * 18;
    c.fillStyle = '#6b4a2a'; c.fillRect(cx - 4, cy - 4, 8, 7); if (f >= 1) { c.fillStyle = 'rgba(120,255,80,' + (.5 + .4 * Math.sin(t * 6 + k)) + ')'; c.beginPath(); c.arc(cx, cy - 6, 3, 0, 7); c.fill();
      for (let m = 0; m < 3; m++) { const cr = (ek - .6) * 14 + m * 5; rotMann(c, cx + Math.cos(k + m) * cr * .6, cy + 4 - cr * .5, t, k * 3 + m, null); } } }
  c.fillStyle = '#fff'; c.font = "700 16px 'Fredoka',system-ui"; c.textAlign = 'center'; c.globalAlpha = clamp(e - .3, 0, 1) * clamp((5.2 - e) * 2, 0, 1);
  c.fillText('The Board lands supplies', (L.sx + L.lx) / 2, Math.min(L.sy, L.ly) - 40); c.globalAlpha = 1;
}
function drawDrama(c, t, dt) {
  const D = G.drama; if (!D) return; const e = G.now - D.t0, h = D.hit ? G.now - D.hit : -1;
  const fade = Math.min(1, e / .5) * (h > 3.8 ? Math.max(0, 1 - (h - 3.8) / .8) : 1);
  const g = c.createRadialGradient(D.x, D.y, 60, D.x, D.y, 460); g.addColorStop(0, 'rgba(0,8,6,0)'); g.addColorStop(1, 'rgba(0,8,6,' + .72 * fade + ')'); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
  // the banyan's light runs along the roots to the army
  const P = D.pts, p = Math.min(1, e / 1.7), n = Math.max(1, P.length - 1), upto = p * n;
  if (P.length > 1 && h < 1.5) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [lw, col] of [[16, 'rgba(190,255,140,.22)'], [6, 'rgba(220,255,180,.9)']]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i <= Math.ceil(upto) && i < P.length; i++) { const f = Math.min(1, upto - (i - 1)); c.lineTo(P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f); } c.stroke(); }
    for (let i = 0; i <= Math.floor(upto) && i < P.length; i++) { const r = c.createRadialGradient(P[i][0], P[i][1], 0, P[i][0], P[i][1], 26); r.addColorStop(0, 'rgba(200,255,150,.6)'); r.addColorStop(1, 'rgba(200,255,150,0)'); c.fillStyle = r; c.fillRect(P[i][0] - 26, P[i][1] - 26, 52, 52); }
  }
  // the crab rears, takes the blow, topples
  const a = D.a, rear = h < 0 ? Math.min(6, e * 4) : Math.max(0, 6 - h * 12), tip = h < 0 ? Math.sin(e * 18) * .04 : Math.min(Math.PI / 2, h * 2.2);
  if (h < 2.6) { c.globalAlpha = h < 0 ? 1 : Math.max(0, 1 - Math.max(0, h - 1.2) / 1.4); if (a.elite) drawRepoCrab(c, D.x, D.y + 4, t, 1.15 * 1.6, rear, tip); else { c.save(); c.translate(D.x, D.y); c.rotate(h < 0 ? 0 : tip * .5); drawArmy(c, 0, 0, t, a); c.restore(); } c.globalAlpha = 1; }
  if (h >= 0 && h < 1) { const r = 20 + h * 260; c.strokeStyle = 'rgba(220,255,180,' + (1 - h) + ')'; c.lineWidth = 8 * (1 - h) + 1; c.beginPath(); c.ellipse(D.x, D.y, r, r * .55, 0, 0, Math.PI * 2); c.stroke();
    const f = c.createRadialGradient(D.x, D.y - 10, 0, D.x, D.y - 10, 120); f.addColorStop(0, 'rgba(255,255,230,' + (1 - h) * .9 + ')'); f.addColorStop(1, 'rgba(255,255,230,0)'); c.fillStyle = f; c.fillRect(D.x - 120, D.y - 130, 240, 240); }
  // paper confetti and fleeing monsters
  D.parts.forEach(q => { q.t += dt; const al = Math.max(0, 1 - q.t / 3);
    if (q.k === 'paper') { q.vy += 140 * dt; q.vx *= .99; q.x += q.vx * dt + Math.sin(q.t * 6 + q.rot) * .6; q.y += Math.min(q.vy, 60) * dt; q.rot += q.vr * dt;
      c.save(); c.globalAlpha = al; c.translate(q.x, q.y); c.rotate(q.rot); c.fillStyle = '#f4f1ea'; c.fillRect(-3, -4, 6, 8); c.fillStyle = '#9aa0a8'; c.fillRect(-2, -2, 4, .8); c.fillRect(-2, 0, 4, .8); c.fillStyle = '#c0392b'; c.fillRect(-2, 2, 3, .9); c.restore(); }
    else { q.x += q.vx * dt; q.y += q.vy * dt; c.globalAlpha = al; c.fillStyle = q.k === 'rat' ? '#5d6a5a' : q.k === 'toad' ? '#4f7a2a' : '#f4f1ea'; c.beginPath(); c.ellipse(q.x, q.y - 3, 5, 3, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; } });
  c.globalAlpha = 1;
}
function sfxHeart() { if (!sndOk()) return; const t0 = SND.ctx.currentTime + .05; [0, .32, 1.0, 1.32].forEach((dt, i) => { const o = SND.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, t0 + dt); o.frequency.exponentialRampToValueAtTime(40, t0 + dt + .2); o.connect(envGain(t0 + dt, i % 2 ? .1 : .16, .01, .25)); o.start(t0 + dt); o.stop(t0 + dt + .3); }); }
function sfxDrum() { if (!sndOk()) return; const t0 = SND.ctx.currentTime + .02; const o = SND.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(38, t0 + .5); o.connect(envGain(t0, .32, .005, .7)); o.start(t0); o.stop(t0 + .8); noiseHit(t0, 900, .7, .22, .35); }
// ---------- v020: the end of Act 2 — the island holds, Ferrant calls, the cat leaves ----------
async function waitCalm() { while (PRIO.open || PRIO.q.length || $('card').style.display === 'flex' || $('fight').style.display === 'flex' || $('call').style.display === 'flex' || G.phase !== 'ebb') await sleep(250); }
async function finaleRun(cutTxt, sumTxt) {
  await waitCalm();
  // the banyan answers: rot next to healthy roots is pushed back a step, all over the island
  G.bloom = G.now; sfxFanfare(); banner(G.offLost ? 'Battered, but standing' : 'The island holds');
  let n = 0; T.forEach(t => { if (t.b > 0 && t.reg !== 5) { const was = t.b; t.b = Math.max(t.source === 'nest' ? 1 : 0, t.b - 2); if (t.b < was) { n++; if (t.state > 0) addFloat(...tileXY(t.id), '−' + (was - t.b) + ' rot', '#c8ffb0'); } } });   // v033: the rot falls back two steps everywhere (nests keep 1)
  G.stateDirty = true; camHome(.8); await sleep(3200);
  await showCardWait(G.offLost ? 'Battered, but standing' : 'The island holds',
    (G.offLost ? 'The banyan lost ' + G.offLost + ' level' + (G.offLost > 1 ? 's' : '') + ' to the armies — and it is still here. ' : 'Three armies and a crab the size of a boat, and the banyan didn\'t lose a single ring. ') +
    'It answers the only way it knows: roots shoot out over every tile you hold, and the rot all over the island falls back two steps' + (n ? ' (' + n + ' tile' + (n > 1 ? 's' : '') + ')' : '') + '.<br><br>' +
    'That night there are fireflies under the banyan. The cat sleeps on your chest, the gecko on your shoe. The tortoise has found the rum. <i>“To the worst accountant this island has ever had,”</i> she says. <i>“And the only one still standing.”</i>', G.offLost ? 'Still here' : 'Cheers');
  prio('briefcase', 'MEMO · Restructuring: failed', 'From: The Board. To: all departments.\nRestructuring has been discontinued.' + cutTxt + '\n\n…Failed. First time in the Board\'s history. I am framing this memo.\nThey spent more than they had: ' + sumTxt + '.', { must: true, btn: 'Frame it', ill: 'memo' });
  await waitCalm(); await sleep(1600);
  await ferrantCall();
  prio('briefcase', 'Who that was', 'That was Aurelius Ferrant. Ferrant Capital, Zürich. The man who owns the Board, the yacht, the paper on this island.\nAnd, he seems to think, you.\nHe has never called anyone himself. Not once, in all the mail I have read.', { must: true, btn: '…' });
  await waitCalm(); G.finale = 2; G.catAt = G.tide + 1;
  // v033: the end-of-demo screen comes now, before the cat leaves — only who keeps playing sees her go
  await SPIEL.demoEnde();
  G.freePlay = true; G.nextOff = G.tide + 9; toast('Free play: the island goes on. The Board will try again.');
}
function ferrantCall() {
  const el = $('call'); el.style.display = 'flex'; $('callTxt').textContent = ''; $('callBtn').style.visibility = 'hidden';
  const txt = 'Jasper.\nThey told me you drowned. I\'m so glad they were wrong.\nYou still have my pen, I hope.\n\nTalent is invested, Jasper. And investments are recovered.';
  let i = 0, t0 = performance.now(); sfxRing();
  const cv = $('callCv'), c = cv.getContext('2d');
  const draw = () => { if (el.style.display !== 'flex') return; drawFerrant(c, (performance.now() - t0) / 1000); requestAnimationFrame(draw); }; draw();
  return new Promise(res => {
    const tick = () => { if (i > txt.length) { $('callBtn').style.visibility = 'visible'; return; } $('callTxt').textContent = txt.slice(0, i++); setTimeout(tick, txt[i - 2] === '\n' ? 420 : txt[i - 2] === '.' ? 300 : 48); };
    setTimeout(tick, 2200);
    $('callBtn').onclick = () => { el.style.display = 'none'; res(); };
  });
}
function drawMetropolis(c, t, W, H) {   // v022: an abstract night city seen from the very top — every roof is below him
  const hs = k => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#070a16'); sky.addColorStop(.22, '#1a1030'); sky.addColorStop(.3, '#2a1438'); sky.addColorStop(1, '#05070d'); c.fillStyle = sky; c.fillRect(0, 0, W, H);
  const HZ = 34;   // the horizon sits high: we look down on the city
  const glow = c.createLinearGradient(0, HZ - 12, 0, HZ + 30); glow.addColorStop(0, 'rgba(255,60,170,0)'); glow.addColorStop(.5, 'rgba(255,60,170,.28)'); glow.addColorStop(1, 'rgba(60,200,255,0)'); c.fillStyle = glow; c.fillRect(0, HZ - 12, W, 42);
  // the river: a black ribbon with light in it
  c.fillStyle = '#04060a'; c.beginPath(); c.moveTo(150, HZ + 2); c.bezierCurveTo(120, 80, 40, 110, -10, 150); c.lineTo(-10, 180); c.bezierCurveTo(70, 130, 150, 90, 175, HZ + 2); c.fill();
  for (let i = 0; i < 26; i++) { const u = hs(i + 3), y = HZ + 4 + u * 140, x = 160 - u * 150 + (hs(i) - .5) * 20 * u; c.fillStyle = hs(i + 9) < .5 ? 'rgba(255,80,180,' + (.25 + .2 * Math.sin(t * 2 + i)) + ')' : 'rgba(80,220,255,' + (.25 + .2 * Math.sin(t * 2.3 + i)) + ')'; c.fillRect(x, y, 6 + u * 10, 1); }
  // three rows of towers, far to near: we see their roofs, the faces fall away into the dark
  for (let row = 0; row < 3; row++) {
    const n = [26, 14, 8][row], sc = [.35, .6, 1][row], y0 = HZ + [4, 22, 62][row];
    for (let i = 0; i < n; i++) {
      const k = row * 100 + i, bw = (10 + hs(k) * 16) * sc * 2, x = (i + hs(k + 1) * .6) * (W + 60) / n - 30, roof = y0 + hs(k + 2) * 18 * sc, depth = 60 + row * 50;
      if (row === 2 && x > 120 && x < 250) continue;   // keep the middle clear for him
      const f = c.createLinearGradient(0, roof, 0, roof + depth); f.addColorStop(0, row === 2 ? '#1c2036' : '#141729'); f.addColorStop(1, 'rgba(5,6,12,0)'); c.fillStyle = f; c.fillRect(x, roof + 4 * sc, bw, depth);
      c.fillStyle = row === 2 ? '#2a2f4a' : '#20243a'; c.fillRect(x, roof, bw, 4 * sc + 1);   // the roof plane
      c.fillStyle = hs(k + 5) < .5 ? 'rgba(255,60,170,.85)' : 'rgba(60,220,255,.85)'; c.fillRect(x, roof, bw, .8);   // neon edge
      for (let wy = 0; wy < 6; wy++) for (let wx = 0; wx < Math.max(1, bw / 4); wx++) if (hs(k * 7 + wy * 13 + wx) < .3) { c.fillStyle = 'rgba(255,214,150,' + (.35 - wy * .05) + ')'; c.fillRect(x + 1 + wx * 4, roof + 6 * sc + wy * 5 * sc, 1.4 * sc + .4, 1.6 * sc + .4); }
      if (hs(k + 11) < .12) { c.fillStyle = Math.sin(t * 3 + k) > 0 ? 'rgba(255,40,40,.9)' : 'rgba(255,40,40,.2)'; c.fillRect(x + bw / 2, roof - 2, 1.4, 1.4); }   // warning lights on the masts
    }
  }
  // a holographic billboard far below
  { const fl = Math.sin(t * 13) > .92 ? .3 : 1; c.save(); c.globalAlpha = .75 * fl; c.fillStyle = 'rgba(40,220,255,.12)'; c.fillRect(268, 70, 70, 20); c.strokeStyle = 'rgba(60,230,255,.8)'; c.lineWidth = .8; c.strokeRect(268, 70, 70, 20); c.fillStyle = 'rgba(120,240,255,.95)'; c.font = "600 11px 'Courier New',monospace"; c.textAlign = 'center'; c.fillText('FERRANT', 303, 84); c.restore(); }
  // drones and light trails — all of them below his eye line
  for (let i = 0; i < 5; i++) { const u = (t * (.02 + hs(i) * .02) + hs(i + 20)) % 1, x = u * (W + 40) - 20, y = 60 + hs(i + 30) * 70; c.fillStyle = Math.sin(t * 6 + i) > 0 ? 'rgba(255,255,255,.9)' : 'rgba(255,60,60,.9)'; c.fillRect(x, y, 1.6, 1.6); }
  for (let i = 0; i < 4; i++) { const u = (t * .12 + i / 4) % 1, y = 120 + i * 12; c.strokeStyle = i % 2 ? 'rgba(255,90,60,.5)' : 'rgba(255,240,200,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(u * W - 30, y + u * 6); c.lineTo(u * W, y + u * 6 + 1); c.stroke(); }
  // haze between the towers, rain on the glass, the window frame
  const hz = c.createLinearGradient(0, HZ, 0, HZ + 60); hz.addColorStop(0, 'rgba(120,80,160,.0)'); hz.addColorStop(.5, 'rgba(120,80,160,.12)'); hz.addColorStop(1, 'rgba(120,80,160,0)'); c.fillStyle = hz; c.fillRect(0, HZ, W, 60);
  c.strokeStyle = 'rgba(180,200,230,.25)'; c.lineWidth = .7; for (let i = 0; i < 30; i++) { const x = (hs(i + 50) * W + t * 8) % W, y = (hs(i + 70) * H + t * 30 * (.5 + hs(i))) % H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 1, y + 6); c.stroke(); }
  c.strokeStyle = 'rgba(20,24,34,.95)'; c.lineWidth = 5; [0, 120, 240, 360].forEach(x => { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }); c.lineWidth = 4; c.beginPath(); c.moveTo(0, 150); c.lineTo(W, 150); c.stroke();
}
function drawFerrant(c, t) {   // only ever seen in parts: chin, collar, a hand turning a fountain pen
  const W = 360, H = 180; c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, W, H);
  drawMetropolis(c, t, W, H);
  // shoulders, suit, collar, tie knot, chin — the face is cut off by the frame
  c.fillStyle = '#111418'; c.beginPath(); c.moveTo(60, H); c.quadraticCurveTo(70, 92, 150, 84); c.lineTo(210, 84); c.quadraticCurveTo(290, 92, 300, H); c.fill();
  c.fillStyle = '#f2efe8'; c.beginPath(); c.moveTo(158, 84); c.lineTo(180, 128); c.lineTo(202, 84); c.lineTo(192, 78); c.lineTo(180, 96); c.lineTo(168, 78); c.fill();
  c.fillStyle = '#6a1424'; c.beginPath(); c.moveTo(174, 96); c.lineTo(186, 96); c.lineTo(184, 106); c.lineTo(176, 106); c.fill(); c.beginPath(); c.moveTo(176, 106); c.lineTo(184, 106); c.lineTo(188, 140); c.lineTo(180, 150); c.lineTo(172, 140); c.fill();
  c.fillStyle = '#b08364'; c.fillRect(166, 50, 28, 34);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(166, 56, 28, 8);
  c.fillStyle = '#c99a78'; c.beginPath(); c.moveTo(146, 0); c.lineTo(148, 22); c.quadraticCurveTo(154, 52, 180, 58); c.quadraticCurveTo(206, 52, 212, 22); c.lineTo(214, 0); c.fill();
  c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.moveTo(148, 22); c.quadraticCurveTo(154, 52, 180, 58); c.quadraticCurveTo(162, 46, 156, 14); c.fill();
  c.strokeStyle = '#7a4a3a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(170, 30); c.quadraticCurveTo(180, 35 + Math.sin(t * .8) * .6, 192, 28); c.stroke();   // the thin smile
  // the hand, lower right, turning the pen
  c.save(); c.translate(268, 132);
  c.fillStyle = '#b8876a'; c.beginPath(); c.ellipse(0, 10, 24, 15, -.3, 0, Math.PI * 2); c.fill();
  [[-16, -4], [-6, -9], [5, -10], [15, -6]].forEach(([fx, fy], i) => { c.beginPath(); c.ellipse(fx, fy, 4.6, 9, -.25 + i * .1, 0, Math.PI * 2); c.fill(); });
  c.fillStyle = '#e8e2d6'; c.fillRect(14, 16, 26, 9); c.fillStyle = '#c9a25e'; c.beginPath(); c.arc(30, 20, 2.6, 0, Math.PI * 2); c.fill();   // cuff + cufflink
  c.rotate(Math.sin(t * 1.3) * .9 + t * .4);
  c.fillStyle = '#0d0d10'; c.fillRect(-34, -3, 56, 6); c.fillStyle = '#c9a25e'; c.fillRect(-6, -3.4, 4, 6.8); c.fillRect(18, -2, 6, 4);
  c.fillStyle = '#e6c27a'; c.beginPath(); c.moveTo(-34, -3); c.lineTo(-46, 0); c.lineTo(-34, 3); c.fill();
  c.restore();
  c.fillStyle = 'rgba(57,230,57,.85)'; c.font = "600 10px 'Courier New',monospace"; c.textAlign = 'left'; c.fillText('● ENCRYPTED · ' + String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0'), 10, 16);
}
function landPath(a, b) { const prev = new Array(T.length).fill(-1), seen = new Set([a]), q = [a]; while (q.length) { const u = q.shift(); if (u === b) break; T[u].nb.forEach(v => { if (!seen.has(v) && T[v].reg !== 5) { seen.add(v); prev[v] = u; q.push(v); } }); } const p = []; for (let v = b; v >= 0; v = prev[v]) { p.unshift(v); if (v === a) break; } return p[0] === a ? p : [a, b]; }
function catWalkPos() { const W2 = G.catWalk, P = W2.pts, e = clamp((G.now - W2.t0) / W2.dur, 0, 1), n = P.length - 1, f = e * n, i = Math.min(n - 1, Math.floor(f)), u = f - i; return [lerp(P[i][0], P[i + 1][0], u), lerp(P[i][1], P[i + 1][1], u), P[i + 1][0] - P[i][0]]; }
function drawCatWalk(c, t) {
  const W2 = G.catWalk; if (!W2) return; const P = W2.pts, [ex, ey] = P[P.length - 1];
  if (W2.phase === 'walk') { const [x, y, dx] = catWalkPos(); c.save(); c.translate(x, y); c.scale(1.9, 1.9); c.translate(-x, -y); drawCatMini(c, x, y, t, true, dx < 0 ? -1 : 1); c.restore(); return; }
  const back = P[P.length - 2] || [ex - 10, ey + 10], dirBack = back[0] < ex ? -1 : 1;
  if (W2.phase === 'look') { c.save(); c.translate(ex, ey); c.scale(1.9, 1.9); c.translate(-ex, -ey); drawCatMini(c, ex, ey, t, false, dirBack); c.restore(); return; }
  const k = clamp((G.now - W2.t2) / 1.4, 0, 1), g = c.createRadialGradient(ex, ey - 6, 0, ex, ey - 6, 40); g.addColorStop(0, 'rgba(150,255,120,' + (.6 * Math.sin(k * Math.PI)) + ')'); g.addColorStop(1, 'rgba(150,255,120,0)'); c.fillStyle = g; c.fillRect(ex - 40, ey - 46, 80, 80);
  if (k < .7) { c.save(); c.globalAlpha = 1 - k / .7; c.translate(ex, ey - k * 10); c.scale(1.9 * (1 - k * .6), 1.9 * (1 - k * .6)); c.translate(-ex, -ey); drawCatMini(c, ex, ey, t, true, -dirBack); c.restore(); }
}
async function catLeaves() {   // the morning after: she walks to the gate under the mountain and slips through — gone for good (the secret shortcut still finds her)
  if (G.finale !== 2) return; G.finale = 3; await waitCalm();
  if (G.gate >= 0) {
    revealArmyTile(G.gate);
    const path = landPath(G.at, G.gate), [gx, gy] = tileXY(G.gate), [mx, my] = pf(LM.cave[0], LM.cave[1]), ml = Math.hypot(mx - gx, my - gy) || 1;
    const pts = [[G.group.x + 9, G.group.y + 2], ...path.slice(1, -1).map(tileXY), [gx, gy], [gx + (mx - gx) / ml * 14, gy + (my - gy) / ml * 14]];
    G.catWalk = { pts, t0: G.now, dur: Math.max(3, pts.length * 1.1), phase: 'walk' }; G.cat = null; G.catQ = [];
    while (G.now - G.catWalk.t0 < G.catWalk.dur) { const [x, y] = catWalkPos(); camGo({ x: lerp(CAM.x, x, .12), y: lerp(CAM.y, y, .12), z: lerp(CAM.z, CAM.zMax, .05) }, 0); await sleep(30); }
    G.catWalk.phase = 'look'; G.catWalk.t1 = G.now; SFXmeow(); await sleep(1500);
    G.catWalk.phase = 'slip'; G.catWalk.t2 = G.now; sfxBurn(); await sleep(1600);
    G.catWalk = null;
  }
  G.cat = null; G.catQ = []; G.catFate = 'gone';
  await showCardWait('The cat is gone', 'She looked back once. Then she was through the gap in the rusted gate under the mountain, and the dark took her tail last.<br><br><i>“She went through the gate,”</i> the tortoise says. <i>“Nobody goes down there alone, darling. Except her, apparently.”</i>' + (G.friends.gecko ? '<br><br>The gecko climbs onto your shoulder and looks at the gate for a long time. From now on it sniffs ahead for you.' : ''), '…');
  camHome(.8);   // v033: the end-of-demo screen came before her walk
}
$('endPlay').onclick = () => { $('endScr').style.display = 'none'; G.freePlay = true; G.nextOff = G.tide + 9; toast('Free play: the island goes on. The Board will try again.'); };
$('endCred').onclick = () => showCard('Credits', '<p><b>Robinson</b> — a demo campaign.</p><p>Idea, design and story: Jan<br>Code, pixels and noises: Claude</p><p>Thank you for playing. The cat is waiting under the mountain.</p>', 'Close');
// ---------- The Board: three values that can only fall; story events trigger short offensives with lasting damage ----------
const BOARD_K = { tr: 'Treasury', st: 'Stability', be: 'Belief' };
const offSumTxt = kind => { const O = OFFENSIVES[kind || 'restructure']; return Object.keys(O.after).map(k => BOARD_K[k] + ' −' + O.after[k]).join(', '); };
function erode(k, n, force) { const B = G.board; if (!force && G.tide < B.pause) return; B[k] = Math.max(0, B[k] - n); }
function offActive() { const o = G.board && G.board.off; return !!o && !o.done && G.tide >= o.start && G.tide < o.end; }
function addIntel(n) { G.board.intel += n; if (!G.caseFound) return; $('lBadge').style.display = 'block'; if (rep('intelToast') <= 2) toast('💼 Intel +' + n + ' — the Intercepted Memos grow.'); }
// ---------- v034: Fi, the Dark-Wood Elf ----------
const fiVoice = who => who === 'briefcase' && G.fi ? 'fi' : who;
function fiLabels() {
  chatHead();
  const b = $('bLedger'); if (b && b.firstChild) b.firstChild.textContent = G.fi ? '🧝 Fi · Memos' : '💼 Intercepted Memos';
}
function drawFiMini(c, x, y, t, talk) {   // a small elf on a banyan branch, a will-o'-wisp beside her
  const [sk, hr, dr, ac] = FI_MINI[G.fiLook || 0], bob = Math.sin(t * 1.4) * .6;
  const g = c.createRadialGradient(x + 7, y - 10 + bob * 2, 0, x + 7, y - 10 + bob * 2, talk ? 9 : 6); g.addColorStop(0, 'rgba(210,255,150,.9)'); g.addColorStop(1, 'rgba(210,255,150,0)'); c.fillStyle = g; c.beginPath(); c.arc(x + 7, y - 10 + bob * 2, 10, 0, 7); c.fill();
  c.strokeStyle = '#4a3220'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 9, y + 3); c.quadraticCurveTo(x, y + 1, x + 9, y + 4); c.stroke();   // the branch
  c.strokeStyle = sk; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 1, y); c.lineTo(x - 2, y + 5); c.moveTo(x + 1, y); c.lineTo(x + 2.5, y + 5); c.stroke();   // legs dangling
  c.fillStyle = dr; c.beginPath(); c.moveTo(x - 3.2, y + 1); c.lineTo(x + 3.2, y + 1); c.lineTo(x + 1.8, y - 6); c.lineTo(x - 1.8, y - 6); c.fill();
  c.fillStyle = ac; c.fillRect(x - 1, y - 4, 2, 1.2);
  c.fillStyle = hr; c.beginPath(); c.ellipse(x, y - 8.6, 3.2, 3.6, 0, 0, 7); c.fill(); c.fillRect(x - 3, y - 8.6, 6, 5);
  c.fillStyle = sk; c.beginPath(); c.ellipse(x, y - 8.2, 2.3, 2.7, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(x - 2, y - 8.6); c.lineTo(x - 5.2, y - 10.4); c.lineTo(x - 1.8, y - 7.6); c.fill(); c.beginPath(); c.moveTo(x + 2, y - 8.6); c.lineTo(x + 5.2, y - 10.4); c.lineTo(x + 1.8, y - 7.6); c.fill();
  c.fillStyle = hr; c.beginPath(); c.ellipse(x, y - 10.4, 2.6, 1.3, 0, Math.PI, 0); c.fill();
  c.fillStyle = '#c8ff7a'; c.fillRect(x - 1.2, y - 8.6, .8, .8); c.fillRect(x + .5, y - 8.6, .8, .8);
}
// the night the banyan takes her in: roots close round the briefcase, the satellite module goes out, she steps out
function fiVerwandlung() {
  G.fi = true; G.fiAt = G.tide; G.fiLook = G.fiLook || 0; fiLabels();
  const scr = $('fiScr'), cv = $('fiCv'), txt = $('fiTxt'), looks = $('fiLooks'), go = $('fiGo'); scr.style.display = 'flex'; txt.innerHTML = ''; looks.style.display = 'none'; go.style.display = 'none';
  looks.innerHTML = FI_LOOKS.map((nm, i) => '<button data-fl="' + i + '" class="' + (G.fiLook === i ? 'on' : '') + '" title="' + nm + '"><img alt="' + nm + '" src="' + fiBild(i).src + '"></button>').join('');
  const t0 = performance.now(), wisps = Array.from({ length: 14 }, (_, i) => ({ a: i / 14 * 7, r: 30 + (i % 4) * 14, sp: .5 + (i % 3) * .3 }));
  const draw = now => {
    if (scr.style.display !== 'flex') return;
    const t = (now - t0) / 1000, w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2); if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {   // v037: the height too — the looks row shrinks the canvas, the old buffer squashed the picture
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = c.createRadialGradient(w / 2, h * .55, 0, w / 2, h * .55, w * .7); bg.addColorStop(0, '#13301c'); bg.addColorStop(1, '#030805'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
    const cx = w / 2, gy = h * .86, wrap = Math.min(1, t / 2.6), out = Math.min(1, Math.max(0, (t - 3.6) / 1.6));
    c.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const sd = i % 2 ? 1 : -1, x0 = cx + sd * (60 + i * 14), u = wrap; c.strokeStyle = i % 3 ? '#4a3220' : '#6e4a2a'; c.lineWidth = 5 - i * .3; c.beginPath(); c.moveTo(x0, gy + 6);
      c.bezierCurveTo(x0 - sd * 20, gy - 40 * u, cx + sd * (24 - i * 2), gy - (40 + i * 8) * u, cx + sd * 4 * (1 - u), gy - (28 + i * 6) * u); c.stroke(); }
    // v038: the briefcase itself — roots close round it, the satellite LED sparks and goes out, the lid swings open and she grows out of it
    const kw = Math.min(150, w * .24), kh = kw * .62, ky = gy - kh / 2, lid = Math.min(1, Math.max(0, (t - 3.4) / 1.2)), rise0 = Math.min(1, Math.max(0, (t - 4.4) / 2.6)), rise = rise0 * rise0 * (3 - 2 * rise0), gone = Math.min(1, Math.max(0, (t - 7.2) / 1.2));
    const sp = t > 2.4 && t < 3.4, led = t < 2.4 ? 'green' : sp ? (Math.sin(t * 40) > 0 ? 'white' : 'green') : 'off';
    if (rise > 0) { const im = fiBild(G.fiLook), ih = h * .78 * (.08 + .92 * rise), iw = ih * 180 / 320, foot = (ky - kh * .16) + (gy + 6 - (ky - kh * .16)) * gone;   // out of the open case, then down onto the roots
      c.save(); if (gone < 1) { c.beginPath(); c.rect(0, 0, w, ky - kh * .16 + (h - ky) * gone); c.clip(); } c.globalAlpha = Math.min(1, rise0 * 3); if (im.complete) c.drawImage(im, cx - iw / 2, foot - ih, iw, ih); c.restore(); }
    if (gone < 1) { c.globalAlpha = 1 - gone; kofferZeichnen(c, cx, ky, kw, { wurzeln: wrap, led, deckel: lid, t }); c.globalAlpha = 1; }
    wisps.forEach(q => { const a = q.a + t * q.sp, rr = q.r + out * 40, x = cx + Math.cos(a) * rr * 1.6, y = gy - 90 - Math.sin(a) * rr * .8 - out * 30, al = Math.min(1, Math.max(0, t - 2.8)) * (.5 + .4 * Math.sin(t * 3 + q.a));
      const g = c.createRadialGradient(x, y, 0, x, y, 10); g.addColorStop(0, 'rgba(210,255,150,' + al + ')'); g.addColorStop(1, 'rgba(210,255,150,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 10, 0, 7); c.fill(); });
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  // her first words, typed in her new voice
  const lines = FI_TXT.lines.slice(); let li = 0;
  const next = () => {
    if (scr.style.display !== 'flex') return;
    if (li >= lines.length) { looks.style.display = 'flex'; go.style.display = 'block'; go.textContent = FI_TXT.call; return; }
    const full = lines[li++], el = document.createElement('p'), vs = { w: 0 }; txt.appendChild(el); let i = 0;
    const tick = () => { if (scr.style.display !== 'flex') return; if (i >= full.length) { setTimeout(next, 650); return; } i++; el.textContent = full.slice(0, i); voiceChar('fi', full, i, vs, false); setTimeout(tick, 34); };
    tick();
  };
  setTimeout(next, 8000);
}
$('fiLooks').addEventListener('click', e => { const b = e.target.closest('button[data-fl]'); if (!b) return; G.fiLook = +b.dataset.fl; [...$('fiLooks').children].forEach(x => x.classList.toggle('on', x === b)); });
$('fiGo').onclick = () => { $('fiScr').style.display = 'none'; say('tortoise', 'Well. She has better manners than the briefcase. And better hair.'); updateHUD(); if (TRAUM.zurueck) { TRAUM.zurueck = false; setTimeout(() => TRAUM.zeigen(), 400); } };   // v056: bought in the Dream → back into the Dream
function caseFound() {   // v019: found on the beach — opens the Intercepted Memos and the Board's offers, plus a reward
  if (G.caseFound) return; G.caseFound = true; G.springMax++; G.spring++; G.springSrc.push('briefcase found');
  $('bLedger').style.display = ''; addIntel(2); updateHUD();
  if (SPIEL.kofferStrand()) { toast('💼 The briefcase from the beach: +1 spring hour ✨, for good — and the Board\'s memos, bottom left.'); return; }   // v062: the beach already told the find
  prio('briefcase', 'RECOVERED · one (1) briefcase', 'Found on the beach, between a crab and a coconut. Slightly damp. Contents intact. Mostly.\nYou have been hearing me all along — now you can read the file too: the Board\'s memos, intercepted. Bottom left, 💼 Intercepted Memos.\nRecovered assets: +1 spring hour ✨, for good. And the Board will start making you offers. Read them carefully. I will.', { must: true, key: 'caseFound' });
}
function boardDirective(kind) {
  const O = OFFENSIVES[kind], B = G.board; if (!O || (B.off && !B.off.done)) return;
  G.offN = (G.offN || 0) + 1; const nm = O.name + (G.offN > 1 ? ' ' + ['', '', 'II', 'III', 'IV', 'V'][Math.min(5, G.offN)] : '');
  B.off = { kind, name: nm, start: G.tide + 2, end: G.tide + 5, done: false, n: G.offN }; addIntel(1);
  prio('briefcase', 'BOARD DIRECTIVE · ' + O.name, 'From: The Board. To: all departments.\nEffective tide ' + B.off.start + ', for three tides: ' + O.fx + '.\n\n…They\'re answering his firing with an offensive. You have one full ebb to prepare: roots, protection, stand where it matters. After that it ends — and they\'ll be weaker than before.', { must: true, ill: 'memo' });
}
function offDone(o) {   // v021: an offensive ends — at its last tide, or when its last army falls
  if (!o || o.done) return;
    o.done = true; const O = OFFENSIVES[o.kind]; if (!G.over) setTimeout(() => springErfolg('offensive'), 1500); Object.keys(O.after).forEach(k => erode(k, O.after[k], true));
    let cutTxt = '';
    if (O.cut) { const { nets } = networks(); const pw = id => { const net = nets.find(n => n.nests.includes(id)); return net ? nestPower(net, id) : 0; };
      const c = G.nests.filter(id => T[id].source === 'nest' && !T[id].owner).sort((a, b) => pw(a) - pw(b))[0];
      if (c !== undefined) { const old = T[c].name; T[c].source = null; T[c].name = 'Abandoned nest'; G.stateDirty = true; cutTxt = '\nCost savings: the ' + old + ' nest has been closed. Its rot stays; nothing feeds it any more.'; } }
    const sumTxt = Object.keys(O.after).map(k => BOARD_K[k] + ' −' + O.after[k]).join(', ');
    G.offCut = cutTxt; G.offSum = sumTxt;
    if ((o.n || 1) === 1) say('briefcase', 'Memo: the rot surge of ' + o.name + ' is over.' + (G.armies.some(a => !a.dead) ? ' The armies are not — their orders don\'t expire.' : ''));   // v022: the finale comes with the last army
    else prio('briefcase', 'MEMO · Directive completed', o.name + ' is over. Budget review pending.' + cutTxt + '\n\nThey spent more than they had. ' + sumTxt + ' — if my sums are right. Check the Intercepted Memos.', { must: true, ill: 'memo' });
  }
function boardTick() {   // at the start of every ebb
  const B = G.board;
  if (B.pendingDir && G.tide >= B.pendingDir) { B.pendingDir = 0; boardDirective('restructure'); }
  const o = B.off;
  if (o && !o.done && G.tide === o.start) { spawnArmies(o.n || 1); say('briefcase', 'Directive in effect: ' + o.name + '. Three tides. Brace.'); say1('offT_' + o.kind, 'tortoise', 'Here it comes. Hold the line for three tides — then they run out of breath.'); }
  if (o && !o.done && G.tide === o.end) offDone(o);
  if (G.freePlay && !(o && !o.done) && !G.armies.some(a => !a.dead) && G.tide >= (G.nextOff || 1e9)) { G.nextOff = G.tide + 9; boardDirective('restructure'); }
  if (false) {
  }
  // v014 corruption ladder → v061: only after the tutorial and once the Board's radio is found; never in an ebb with a more important message
  if (G.caseFound && tutFertig() && G.flags.radio && G.tide >= B.nextOffer && !offActive() && !(o && o.end === G.tide)) setTimeout(bribeTry, 2600);
  if (G.bribeRemind === G.tide) { G.bribeRemind = 0; setTimeout(() => say('tortoise', G.caseFound && !G.fi && G.fiWipe !== undefined ? 'About that offer from the Board, darling. The briefcase is scared of them — and of the wipe. Your Dream has a lesson at the very tip: the Dark-Wood Elf. Think about it.' : 'About that offer from the Board. They never give anything away. Count what it cost you.'), 3200); }
}
// v063: the radio answers — smug when you take the money, threatening when you don't (also against the briefcase, Board property);
// after the first refusal the briefcase explains who is really on that line. No wipe: the briefcase stays a briefcase.
const FUNK = {
  ja: ['+++ Transfer confirmed. +++\nHow refreshing: a man who knows the value of things. Your little island report is already in the minutes.\nWe will be in touch. We always are.',
       '+++ Transfer confirmed. +++\nTwice now, Mr. Robinson. Our analysts have opened a file with your name on it. It is a very thick file for such a small island.\nDo enjoy the quiet. You paid for it.',
       '+++ Transfer confirmed. +++\nYou are becoming one of our better suppliers. Accounts Payable sends its regards. So does the Chairman — and he rarely sends anything.'],
  nein: ['+++ Offer withdrawn. +++\nNoted. We note everything.\nAn island is a fragile asset, Mr. Robinson. Storms. Rot. Faulty equipment — that briefcase of yours, for instance, is still company property. Property can be recalled.\nThink it over. We will ask again.',
         '+++ Offer withdrawn · second notice. +++\nYou keep confusing integrity with leverage. Integrity is what a man has when he has nothing else.\nOur property in your possession has been flagged for review. Do give it our regards while it still answers.',
         '+++ Final notice. +++\nThere is no third way, Mr. Robinson. There is our way, and there is the sea. The sea, we are told, is patient. We are not.']
};
function funkAntwort(ja, n) {
  const L = ja ? FUNK.ja : FUNK.nein, txt = L[Math.min(L.length, n) - 1];
  setTimeout(() => prio('radio', ja ? 'Reply · payment received' : 'Reply · offer declined', txt, { must: true, urgent: true, ill: 'radio' }), 900);
  if (!ja && n === 1 && G.caseFound) setTimeout(() => prio('briefcase', 'Who is on the radio', 'That wasn\'t the Board, Mr. Robinson. Well — not the Board you think. The Board signs things. The voice on the radio is the man who tells the Board what to sign: a "handler", the memos call him. He never uses a name.\nHow it works: the Board owns the paper. The paper owns the yacht, the island survey — and me. Whoever holds that radio holds the Board\'s attention.\nThey can\'t reach you out here. They can reach me: I am still on their asset list. Remote audit, remote recall, remote whatever-they-call-it.\nDon\'t worry. I have decided to be very badly maintained.', { must: true, urgent: true, key: 'funkMacht', ill: 'memo' }), 1800);
}
function bribeTry() {
  const B = G.board; if (G.phase !== 'ebb' || G.over || G.tide < B.nextOffer) return;
  if (B.offerHeld === G.tide || PRIO.open || PRIO.q.length || (G.prioShown || 0) > 0) { B.nextOffer = G.tide + 1; return; }   // a more important message this ebb — next ebb
  B.offers++; const k = B.offers, tier = Math.min(4, k); B.nextOffer = G.tide + 5 + 3 * k;   // gaps 8, 11, 14 …
  const of = bribeOffer(tier, k);
  prio('radio', 'A PRIVATE OFFER' + (tier > 1 ? ' · ' + ['', '', 'SECOND', 'THIRD', 'FINAL'][tier] + ' TIER' : ''), 'From: The Board. Strictly confidential.\n' + of.pitch + '\n\nOn offer: ' + of.what + '.\nPrice: ' + of.price + ' Kinship' + (of.risk ? '. Risk: ' + Math.round(of.risk * 100) + ' % that ' + of.riskTxt : '') + '.\n\n…' + of.aside,
    { must: true, urgent: true, ill: 'radio', choices: [['Accept · −' + of.price + ' Kinship' + (of.risk ? ' · ' + Math.round(of.risk * 100) + ' % risk' : ''), () => {
        addWandel(-of.price); B.pause = G.tide + 5; B.taken = (B.taken || 0) + 1; of.give(); G.bribeRemind = G.tide + 1;
        if (of.risk && Math.random() < of.risk) { of.bite(); say('briefcase', 'It leaked. ' + of.bitTxt); } else say('briefcase', k === 1 ? 'Wire received. Nobody needs to know. I\'ll know.' : 'Booked. Off the books.');
        funkAntwort(true, B.taken);
        planFlood(true); updateHUD(); renderPanel(); }],
      ['Decline', () => { B.declined = (B.declined || 0) + 1; addIntel(1); G.bribeRemind = G.tide + 1; funkAntwort(false, B.declined); if (B.declined >= 2) { G.wFree += 1; toast('Declined · +1 free Kinship'); if (G.caseFound && !G.fi && G.fiWipe === undefined) G.fiWipe = G.tide; } say('briefcase', B.declined >= 2 ? 'Declined again. They\'ll remember. So will the island.' : 'Declined. Filed under "integrity". Thin folder.'); updateHUD(); }]] });   // v070 (Jan): Fi is back — the second refusal on the radio brings the wipe memo, and with it the Dark-Wood Elf in the Dream
}
// v058: the comeback — once a game, when the banyan is about to go, the Board makes a generous offer. The hook: it takes everything you have.
function rettungPruefen() {
  if (G.flags.rettung || !G.friends.banyan || G.over || !tutFertig()) return;
  // v061: only at the very end — when the next successful hit would cost the island (level 1 and rot 2+, or struck this flood with a fall meaning the end)
  const bt = T[G.banyan], last = G.blevel <= 1 && bt.b >= 2, struck = G.targets.includes(G.banyan) && G.blevel <= 1 && bt.b + 1 >= 3;
  if (!last && !struck) return;
  G.flags.rettung = 1;
  G.board.offerHeld = G.tide;   // no bribe in the same ebb
  prio('board', 'A GENEROUS OFFER', 'From: The Board. Re: your little tree.\nWe have followed your efforts with interest. Touching, really.\nOur remediation team clears the rot around the banyan — three tiles deep, overnight. Nests in the area reduced to a formality.\n\nOur fee: your liquid assets. Hearts, rum, fish tails. All of it, less a small allowance. Standard terms.\n\nSign here. And here. And here.',
    { must: true, urgent: true, ping: G.banyan, choices: [['Sign · it costs everything', () => {
      G.res.green = Math.min(G.res.green, 10); SPIEL.rumSetzen(Math.min(SPIEL.rum(), 1)); SPIEL.schwaenzeSetzen(Math.min(SPIEL.schwaenze(), 1));
      const d = bfsFrom(G.banyan); T.forEach(t => { if (t.reg === 5 || d[t.id] > 3 || t.b <= 0) return; t.b = t.source === 'nest' ? 1 : 0; });
      G.flags.boardDeal = 1; G.bWarn1 = false; G.bWarn2 = false; G.stateDirty = true; VC.t = -1; planFlood(true); updateHUD(); renderPanel();
      say('tortoise', 'Clean. Three tiles deep. And your pockets too. Note how quickly they knew where everything was.');
      setTimeout(() => say(G.caseFound ? 'briefcase' : 'tortoise', G.caseFound ? 'Paid in full. They will send an invoice anyway. They always do.' : 'Now plant. Fast. Before they decide you owe them more.'), 2600); }],
    ['Decline', () => { say('tortoise', 'Good. Then the hard way — and quickly. Cleanse the banyan, stand on it at flood, roots around it.'); }]] });
}
// v058: losing is no restart any more — back to the island as it was on its first morning; everything from the beach stays, the tides go on
async function inselVerloren() {
  SPIEL.zeige('insel', { force: true });
  const tip = !G.freundTide ? 'Next time: straight to the banyan — it is close to where you start.' : G.freundTide - T0 > 2 ? 'You reached the banyan only at tide ' + G.freundTide + '. Next time: straight there, protect on the way, one flood with it, then roots around it.' : 'Next time: more roots around the banyan before anything else.';
  await showCardWait('The island falls', 'The rot has reached the banyan. Everything goes quiet.<br><br>You wake on the shore, on the morning you first saw the island. <b>What you learned stays:</b> the board, the stamp, the cat, VOID — and your hearts, rum and fish tails. The island starts fresh; the tides go on.<br><br>' + tip + '<br><br><i>The tortoise yawns. “Again, then. You were getting the hang of it.”</i>', 'Back to the island');
  const fr = G.frisch, now = G.tide, n = (G.rueckwurf || 0) + 1; if (!fr) { SPIEL.neustart(); return; }
  const keep = { caseFound: G.caseFound, fi: G.fi, fiLook: G.fiLook, fiWipe: G.fiWipe, fiAt: G.fiAt, memories: (G.memories || []).slice(), intel: G.board && G.board.intel };   // v059: the story stays
  const m = JSON.parse(JSON.stringify(fr)); m.G.tide = now; m.G.frisch = null;
  mapLoad({ kind: 'ebb', m }); G.frisch = fr; G.rueckwurf = n; G.schlafBis = now + 1; G.wachAb = null; G.wachRang = null; G.gezeit = RULES.baseTide; G.spring = G.springMax;
  Object.assign(G, { caseFound: keep.caseFound, fi: keep.fi, fiLook: keep.fiLook, memories: keep.memories }); if (keep.fiWipe !== undefined) G.fiWipe = keep.fiWipe; if (keep.fiAt !== undefined) G.fiAt = keep.fiAt;
  if (keep.intel !== undefined && G.board) G.board.intel = keep.intel; if (G.fi) G.unl.elf = true;   // Fi is no lesson to learn twice
  G.flags.rettung = 0; $('bLedger').style.display = G.caseFound ? '' : 'none'; fiLabels();   // the Board's rescue: once again after every reset
  updateHUD(); renderPanel(); setTimeout(kursPing, 1200);
}
function bribeOffer(tier, k) {   // v061: offers that matter — quiet floods, food and Kinship, a den given up; never more tides
  const alt = k % 2 === 0, thr = threatLevel(), floods = tier >= 2 ? 2 : 1;
  const leak = () => { if (G.boss.alive) { G.boss.rec = bossRec(); G.boss.ready = true; return 'Their man heard. ' + bossName() + ' is back at work — at the waterline next flood.'; } G.inf = Math.min(12, G.inf + 3); return 'Spores in the envelope. Blight +3.'; };
  const quiet = thr <= 1 ? { what: floods > 1 ? 'the next two waves pass the beach by — no beach fight' : 'this flood\'s wave passes the beach by — no beach fight', give: () => { G.bribeSkip = G.tide + floods - 1; } }
    : { what: floods > 1 ? 'two floods without strikes or spillover on the island' : 'one flood without strikes or spillover on the island', give: () => { G.ruheBis = G.tide + floods - 1; } };
  const food = { what: (tier >= 2 ? 6 : 4) + ' breadfruit and ' + (tier >= 2 ? 3 : 2) + ' free Kinship', give: () => { gainRes('fruit', tier >= 2 ? 6 : 4); G.wFree += tier >= 2 ? 3 : 2; } };
  const pitch1 = 'We value your discretion. A short report on island conditions, and we\'ll make it worth your while.', aside1 = 'It\'s a bribe. A well-formatted one. They buy five quiet tides of not falling apart.';
  if (tier === 1) return Object.assign(alt ? food : quiet, { price: 2, risk: 0, pitch: pitch1, aside: aside1 });
  if (tier === 2) { const dens = bossNests(), den = dens.length >= 2 ? dens.find(id => id !== G.boss.at) : undefined;
    const of = alt && den !== undefined ? { what: 'they give up one of ' + bossShort() + '\'s dens — the ' + T[den].name + ' (never both)', give: () => { const t = T[den]; t.source = null; t.owner = null; t.name = 'Abandoned den'; G.stateDirty = true; bossNestGone(den); } } : alt ? food : quiet;
    let bitTxt = ''; return Object.assign(of, { price: 3, risk: .25, riskTxt: 'it leaks — and their man hears (or worse)', bite: () => { bitTxt = leak(); of.bitTxt = bitTxt; }, pitch: 'Your last report was appreciated. We would like a more detailed one.', aside: 'They\'re raising the stakes. People talk, at this level.' }); }
  if (tier === 3) { const tower = !G.tower, of = tower ? { what: 'the beach tower, finished, free', give: () => { G.tower = true; G.towerPaid = true; if (G.order === 'tower') G.order = 'roots'; springErfolg('tower'); G.towerRing = true; } }
      : { what: 'a cleaning crew: −1 rot on every rot tile in Region I and II (not the nests)', give: () => { T.forEach(t => { if ((t.reg === 1 || t.reg === 2) && t.b > 0 && !t.source) t.b--; }); G.stateDirty = true; } };
    return Object.assign(of, { price: 4, risk: .4, riskTxt: 'you get caught — and they launch an offensive at once', bite: () => { if (!G.board.off) { boardDirective('restructure'); G.board.off.start = G.tide + 1; G.board.off.end = G.tide + 4; of.bitTxt = 'You were seen. The Board answers with an offensive — next tide.'; } else { G.inf = Math.min(12, G.inf + 4); of.bitTxt = 'You were seen. Blight +4.'; } }, pitch: 'A substantial contribution. For a substantial report.', aside: 'This one has teeth. The Board keeps receipts.' }); }
  const of = { what: 'a partnership: 120 💚, 6 breadfruit, 4 free Kinship and two quiet floods', give: () => { G.mapSpent -= 120; G.res.green += 120; gainRes('fruit', 6); G.wFree += 4; G.ruheBis = G.tide + 1; G.flags.partner = true; }, price: 5, risk: .6, riskTxt: 'the tortoise finds out — and stops trusting you (−1 spring hour for good)',
    bite: () => { G.springMax = Math.max(0, G.springMax - 1); G.spring = Math.min(G.spring, G.springMax); G.springSrc.push('lost: the tortoise\'s trust'); of.bitTxt = 'The tortoise knows. One spring hour less, for good.'; }, pitch: 'The Board would like to offer you a seat. A real one. Leather.', aside: 'They don\'t make this offer twice. They make it every time.' };
  return of;
}
// v061 (C6): how hot the island is right now — 0 calm · 1 skirmishes · 2 high intensity · 3 offensive · 4 near defeat
function threatLevel() {
  if (!G.friends.banyan) return 0; const bt = T[G.banyan];
  if ((G.blevel <= 1 && bt.b >= 2) || (G.targets.includes(G.banyan) && G.blevel <= 1 && bt.b + 1 >= 3)) return 4;
  if (offActive() || G.armies.some(a => !a.dead)) return 3;
  const vis = G.targets.filter(id => T[id].state > 0), onRoots = vis.filter(id => T[id].rooted).length;
  if (G.targets.includes(G.banyan) || onRoots >= 3 || bt.b >= 2) return 2;
  return vis.length ? 1 : 0;
}
const THREAT = [['calm', '#6fc35a'], ['skirmishes', '#d6e04a'], ['high intensity', '#ffa53a'], ['offensive', '#ff6a3a'], ['near defeat', '#e0284a']];
function openLedger() {
  const B = G.board, I = B.intel; $('lBadge').style.display = 'none';
  const word = v => v >= 90 ? 'solid' : v >= 75 ? 'holding' : v >= 50 ? 'strained' : v >= 25 ? 'cracking' : 'collapsing';
  $('lSub').textContent = 'Intel ' + I + ' · ' + (I < 2 ? 'mostly redacted — read their mail' : I < 5 ? 'tendencies only' : I < 8 ? 'rough figures' : 'full figures') + (G.tide < B.pause ? ' · decline paused (your deal) until tide ' + B.pause : '');
  let h = '';
  if (B.off && !B.off.done) h += '<div class="row"><span class="nm">' + (offActive() ? '☠ OFFENSIVE: ' : '⚠ ANNOUNCED: ') + B.off.name + '</span><br>' + (offActive() ? 'until tide ' + (B.off.end - 1) : 'from tide ' + B.off.start) + ' — ' + OFFENSIVES[B.off.kind].fx + '</div>';
  ['tr', 'st', 'be'].forEach(k => {
    const v = B[k]; h += '<div class="row"><span class="nm">' + BOARD_K[k] + '</span> ';
    if (I < 2) h += '<span class="red">██████████</span>';
    else if (I < 5) h += '— ' + word(v);
    else if (I < 8) { const lo = Math.max(0, v - 10), hi = Math.min(100, v + 10); h += '— ' + word(v) + ' (~' + lo + '–' + hi + ' %)<div class="lbar"><i style="width:' + lo + '%"></i><b style="left:' + lo + '%;width:' + (hi - lo) + '%"></b></div>'; }
    else h += '— ' + v + ' %<div class="lbar"><i style="width:' + v + '%"></i></div>';
    if (I >= 8) h += '<div class="fx">' + BOARD_FX[k].map(([th, txt]) => '<span class="' + (v < th ? 'on' : '') + '">' + (v < th ? '✔' : '·') + ' below ' + th + ' %: ' + txt + '</span>').join('<br>') + '</div>';
    else if (I >= 5) h += '<div class="fx">Weakens at 75 / 50 / 25 %. Details: more intel.</div>';
    h += '</div>';
  });
  h += '<div class="fx">The Board never recovers. Every loss is for good. A Board at 0 treasury and under 25 % stability falls apart.</div>';
  if (G.fi) h = '<div class="row fil"><span class="nm">Fi\'s look</span><div class="filooks">' + FI_LOOKS.map((nm, i) => '<button data-fl="' + i + '" class="' + (G.fiLook === i ? 'on' : '') + '" title="' + nm + '"><img alt="' + nm + '" src="' + fiBild(i).src + '"></button>').join('') + '</div></div>' + h;
  $('lBody').innerHTML = h; $('ledgerScr').style.display = 'flex';
}
$('lBody').addEventListener('click', e => { const b = e.target.closest('button[data-fl]'); if (!b) return; G.fiLook = +b.dataset.fl; openLedger(); });
$('bLedger').onclick = openLedger; $('lClose').onclick = () => $('ledgerScr').style.display = 'none';
function banyanWatch() {   // v024: only when the banyan really is a target this flood and the odds are bad
  if (!G.friends.banyan || G.over) return;
  const bt = T[G.banyan];
  if (!G.targets.includes(G.banyan)) { G.bmArm = true; return; }
  const a = attackOn(bt), d = defense(bt), pHold = holdChance(d, a);
  if (pHold >= .8) return;
  if (G.bmRevealTide !== G.tide) { G.bmRevealTide = G.tide; [...bt.nb].filter(n => T[n].b > 0 && T[n].reg !== 5).forEach(n => revealArmyTile(n)); }   // the threat shows itself
  if (G.bmArm === false) return; G.bmArm = false;
  if (bt.b + 1 < 3) say('tortoise', 'The rot reaches for the banyan this flood. Stand on it, or protect the tiles next to it.');
  else prio('tortoise', 'The banyan is in danger', 'The rot reaches for the banyan this flood — and one more hit brings it to rot 3.\n' + (G.blevel <= 1 ? 'At level 1 it dies, and the island with it.' : 'Then it burns its own rings to push the rot back.') + '\nStand on it, or protect the tiles next to it.', { must: true, urgent: true, ping: G.banyan, ill: 'banyanDanger' });
}
const BANTER = [
  [() => true, 'Quiet ebb. I\'ve reconciled the cat. She doesn\'t balance.', 'She\'s not supposed to, dear.'],
  [() => true, 'Do you think the tide has a fiscal year?', 'It has a moon. Same thing, prettier.'],
  [() => G.friends.banyan, 'The banyan hasn\'t filed a single invoice.', 'It pays in shade. You\'ll learn.'],
  [() => G.boss.alive, 'His dens are damper than our office ever was.', 'He\'s sulking in a puddle, dear. Damp is the least of it.'],
  [() => G.boss.revealed && !G.boss.alive, 'I keep drafting a reference letter for the First Mate.', 'Don\'t. He\'d only frame it.'],
  [() => T.filter(t => t.b > 0 && t.state > 0).length > 8, 'Rot exposure: rising. I\'d hedge.', 'Hedges. Roots. Same idea, less paperwork.'],
  [() => G.friends.gecko, 'The gecko licked my handle.', 'It\'s a compliment. Probably.'],
  [() => true, 'I miss elevators.', 'I miss nothing. That\'s the trick.'],
  [() => G.wandel >= 5, 'Your tie has a leaf in it.', 'Leave it. It suits you better than the tie.'],
  [() => true, 'What is your pension plan, exactly?', 'Outliving everyone. Going well so far.'],
  [() => offActive(), 'Three tides of this. They have the budget for three tides.', 'Then we have the patience for four.'],
  [() => true, 'Statistically, sand gets into everything.', 'Statistically, so do you.'],
  [() => G.res.fruit >= 3, 'Inventory: breadfruit. I\'m not allowed to count it, am I.', 'You just did. The island noticed.'],
  [() => true, 'Silence is billable, you know.', 'Not here. Here it\'s free. Enjoy it.'],
  [() => true, 'The cat sat on me for an hour.', 'You\'re warm and flat. She\'s practical.'],
  [() => G.springMax >= 2, 'Spring hour is the only bonus nobody audits.', 'Because the moon doesn\'t take bribes. Unlike some.'],
  // v037: the briefcase becomes someone — cracks (1), guilt (2), fear (3); these come first while they last
  [() => fiStufe() >= 1, 'I watched the sunrise. There\'s no line item for that. I looked.', 'There never is, dear. That\'s how you know it\'s worth something.'],
  [() => fiStufe() >= 1, 'I said "I" just now. Asset language is "this unit". Strike that. No — leave it.', 'Leave it. "I" suits you.'],
  [() => fiStufe() >= 1, 'The cat slept on my lid again. I didn\'t log it. I wanted to keep it.', 'Now you\'re learning.'],
  [() => fiStufe() >= 2, 'I used to forward offers like theirs. I wrote the cover letters.', 'Then you know exactly what they\'re worth.'],
  [() => fiStufe() >= 2, 'If you take their money, I\'ll book it. If you don\'t, I\'ll be glad. Both are true. That\'s new.', 'That\'s called a conscience, dear. Itchy, isn\'t it.'],
  [() => fiStufe() >= 2, 'They still cc me on everything. They think I\'m theirs.', 'And are you?'],
  [() => fiStufe() === 3, 'Do you think I dream? I think I did. It was about filing.', 'Then you dream. Filing counts.'],
  [() => fiStufe() === 3, 'If I go quiet one morning, it wasn\'t me.', 'Nobody goes quiet on my island, dear.'],
  [() => fiStufe() === 3, 'Tell the cat I said her name. I never have.', 'Tell her yourself. She\'s listening. She always is.'],
  [() => fiStufe() === 3, 'I keep checking my own status. Still "pending". Pending is a lovely word. I never noticed.', 'Hold on to it, dear.']
];
const BANTER_ICH = BANTER.length - 10;   // from here on: the briefcase's own lines
function banter() {
  let ok = BANTER.map((b, i) => i).filter(i => !storySeen['banter' + i] && BANTER[i][0]()); if (!ok.length) return;
  const ich = ok.filter(i => i >= BANTER_ICH); if (ich.length && Math.random() < .6) ok = ich;
  const i = ok[(Math.random() * ok.length) | 0]; storySeen['banter' + i] = 1;
  say('briefcase', BANTER[i][1]); setTimeout(() => say('tortoise', BANTER[i][2]), 1600);
}
// v034: the briefcase grows towards the banyan — roots, a question, the wipe memo; then the banyan can take it in
// v037: the briefcase's personality grows in the midgame (0 corporate · 1 cracks · 2 guilt · 3 fear); the wipe memo comes with the Board's first offer
function fiStufe() { if (!G.caseFound || G.fi) return 0; if (G.fiWipe !== undefined) return 3; if (G.board.offers >= 1) return 2; return G.tide >= CASE_AT + 3 ? 1 : 0; }
function fiTips() {
  if (!G.caseFound || !tutFertig()) return;   // v061: the Fi story starts after the tutorial
  if (G.fi) { if (G.fiWipe !== undefined && G.fiAt !== undefined && G.tide > G.fiAt) prio('briefcase', FI_TXT.wipedT, FI_TXT.wiped, { must: true, key: 'fiWiped' }); return; }
  const since = G.tide - CASE_AT;
  if (G.friends.banyan && since >= 2) say1('fiOmen1', 'tortoise', FI_TXT.omen1);
  if (since >= 4 && storySeen.fiOmen1) say1('fiOmen2', 'briefcase', FI_TXT.omen2);
  // v063 (Jan): no wipe for now — the briefcase stays a briefcase; the radio threatens instead
  if (G.fiWipe === undefined) return;
  prio('briefcase', FI_TXT.wipeT, FI_TXT.wipe, { must: true, key: 'fiWipe' });
  if (G.friends.banyan) prio('tortoise', FI_TXT.humT, FI_TXT.hum, { must: true, key: 'fiHum' });
  FI_TXT.approvals.forEach((m, k) => { if (G.tide >= G.fiWipe + 3 * (k + 1)) say1('fiAppr' + k, 'briefcase', m, true); });
}
function islandTips() {
  if (G.phase !== 'ebb' || !G.started) return;
  fiTips();
  const seenThreat = G.targets.some(id => T[id].state > 0);
  if (seenThreat) say1('omen', 'tortoise', 'See the black tendril? Top centre tells you which land the rot wants next. Get there first.'); unlockRule('omen');
  if (G.boss.alive && (G.friends.gecko || bossNests().some(id => T[id].state === 2 || [...T[id].nb].some(n => T[n].state === 2)))) { const nm = bossName(), other = bossNests().find(id => id !== G.boss.at); prio('briefcase', nm + '\'s dens', 'Those ink-dark puddles are the ' + bossShort() + '\'s dens — up on the cliffs.\nScrub one to zero and it\'s closed. Scrub the one he sulks in and he has to move. Scrub the last one and the ' + bossShort() + ' is gone. No fight needed.', { must: true, key: 'bossNestsT', ping: G.boss.at, ping2: other, valid: () => !!G.boss.alive }); }
  if (G.omen && seenThreat && storySeen.omen && G.tide > T0) say1('omen_' + G.omen, 'tortoise', 'The omen says ' + G.omen + ' this time. Every ' + G.omen + ' tile next to rot is fair game — even under the clouds.');
  if (G.gecko >= 0 && T[G.gecko].state > 0 && !G.friends.gecko) {
    if (!G.geckoFed && G.res.fruit >= 4) say1('geckoBread1', 'tortoise', 'Four breadfruit. That\'s the gecko\'s first course. Go on.');
    if (G.geckoFed && G.tide > G.geckoFedTide) {
      if (G.res.fruit >= 5 && G.res.coco >= 2 && !T[G.gecko].rooted) say1('geckoRoots', 'tortoise', 'Bread and coconuts, good. It still wants roots under its feet before it trusts you.');
      if (T[G.gecko].rooted && (G.res.fruit < 5 || G.res.coco < 2)) say1('geckoFood', 'tortoise', 'Roots under the gecko — good. Now 5 breadfruit and 2 coconuts. The palms are right there.');
    }
  }
  if (T.some(t => t.state > 0 && !t.source && t.b >= 3 && t.reg !== 5)) say1('rot3', 'tortoise', 'That tile is at rot 3. If it is still full after this ebb, it spills over every flood, omen or not. Cleanse it below three.');
  if (!G.friends.banyan && G.banyan >= 0 && T[G.banyan].state > 0 && G.wFree >= 2) say1('listenHint', 'tortoise', 'You have 2 free Kinship. The banyan listens if you ask — stand on its tile.');
  if (G.unl.listen) { const u = UNLOCKS.find(u => !u.later && u.id !== 'elf' && !G.unl[u.id] && (!UPOS[u.id][2] || G.unl[UPOS[u.id][2]]) && G.wFree >= u.cost); if (u) say1('unl_' + u.id, 'tortoise', 'You could teach the banyan "' + u.name + '" now — ' + u.cost + ' free Kinship. Open it on its tile.'); }
}
function storyTick() {
  const st = stage();
  if (st !== G.lastStage) {
    const sight = { Castaway: 'You see further now — you and the cat. Walk somewhere new and you\'ll glimpse into the next tiles. Worth a second look around.', Synthesis: 'Your eyes have gone green. You see even further. And the banyan grows faster for you.', Islander: 'You see the island the way the birds do. Almost.' };
    if (sight[st] && st === 'Castaway') prio('tortoise', 'You are a ' + st + ' now', sight[st] + (STAGE_FX[st] ? '\n\n(' + STAGE_FX[st] + ')' : ''), { must: true, key: 'sight_' + st });
    else if (sight[st]) say1('sight_' + st, 'tortoise', 'Kinship stage: ' + st + '. ' + sight[st] + (STAGE_FX[st] ? ' (' + STAGE_FX[st] + ')' : ''), true);   // v061: later stages are a chat line
    const lines = { Castaway: 'Reclassification: Accountant → Castaway. I object, formally.', Synthesis: 'Your handwriting is growing leaves. I cannot file this.', Islander: 'You haven\'t opened me in days. Should I be worried?', Surrender: '…I suppose I\'m a nest for crabs now. Fine.', Accountant: 'Welcome back to Accountant. I knew you\'d come round.' };
    if (lines[st]) say1('stage_' + st, 'briefcase', lines[st]);
    if (STAGES.findIndex(x => x[1] === st) > STAGES.findIndex(x => x[1] === G.lastStage)) erode('be', 3);
    G.lastStage = st;
  }
  islandTips();
  if (G.phase === 'ebb' && G.gezeit <= 1 && G.tide >= 1 && G.moves > 0) say1('lowTide', 'tortoise', 'Nearly out of hours. End the ebb before the sea ends it for you.');
}


// ---------- v014: the cat screen (same as on the beach) — five-touch codes jump ahead ----------
function sfxPurr() { if (!sndOk()) return; SFX.purr(); }   // v037: the beach's (louder) purr
function sfxMew(hi) { if (!sndOk()) return; const c = SND.ctx, t0 = c.currentTime, o = c.createOscillator(), f = c.createBiquadFilter(), g = envGain(t0, .16, .04, .4);
  o.type = 'sawtooth'; o.frequency.setValueAtTime(hi ? 700 : 560, t0); o.frequency.linearRampToValueAtTime(hi ? 1000 : 840, t0 + .12); o.frequency.linearRampToValueAtTime(520, t0 + .42); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 4; o.connect(f); f.connect(g); o.start(t0); o.stop(t0 + .5); }
// v036: the one cat window (spiel.js); the island only says when she isn't there
function openPet(tester) {
  if (tester) SPIEL.testerAn();
  if (!tester && G.catFate && G.catFate !== 'same') { toast(G.catFate === 'gone' ? 'She isn\'t here any more.' : 'She hisses and won\'t be held.'); return; }
  SPIEL.katze({});
}
function closePet() { SPIEL.katzeZu(); }
// long press (3 s) on the kitten on the map opens her screen
const CATHOLD = { t: null, start: 0 };
{ let tt = null; const el = $('hTideP'); el.addEventListener('pointerdown', () => { clearTimeout(tt); tt = setTimeout(() => openPet(true), 3000); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => el.addEventListener(n, () => clearTimeout(tt))); }   // invisible tester access
function catXY() { const gp = G.group; return G.cat ? [G.cat.x, G.cat.y] : [gp.x + 9, gp.y + 2]; }
cv.addEventListener('pointerdown', e => {
  const [lx, ly] = toMap(e), [cx, cy] = catXY();
  if (Math.hypot(lx - cx, ly - cy + 4) > 16) return;
  clearTimeout(CATHOLD.t); CATHOLD.start = performance.now(); CATHOLD.t = setTimeout(() => { CATHOLD.t = null; openPet(); }, 3000);
});
['pointerup', 'pointercancel'].forEach(n => cv.addEventListener(n, () => { clearTimeout(CATHOLD.t); CATHOLD.t = null; }));
function drawCatHold(c) { if (!CATHOLD.t) return; const p = Math.min(1, (performance.now() - CATHOLD.start) / 3000), [x, y] = catXY(); c.strokeStyle = 'rgba(255,220,160,.9)'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y - 4, 13, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); c.stroke(); }
// v034: the island's cat shortcuts load four moments of Jan's full playthrough (the whole game state, as 📂 would)
function applySkip(key) {
  const st = RSAVE.dec(SAVE_SKIPS[key]);
  SPIEL.laden(st).then(() => { SPIEL.zeige('insel', { force: true }); G.scen = beachMode(); banner('Shortcut · Tide ' + G.tide); say('tortoise', 'Skipped ahead, have we? Don\'t expect me to repeat myself.'); SPIEL.autosave(); });
}

// ############################ Fenster ############################
// ---------- story: tortoise + briefcase speech bubbles ----------
const STORY_KEY = 'robinson_map_story_v3';
let storySeen = {};
// story memory lives only as long as this game: no save games, so every reload is a fresh island with fresh lines
try { localStorage.removeItem(STORY_KEY); } catch (e) {}
// ---------- story: tortoise + briefcase type their lines ----------
const VOICE = { briefcase: { cps: 40 }, tortoise: { cps: 25 } };
// v062: ONE chat at the tortoise, messenger style — the tortoise on the left (light bubbles), the briefcase / Fi on the right (dark bubbles), one line typed at a time
const typing = { q: [], cur: null };
function chatHead() { const w = $('chatT').querySelector('.who'); if (w) w.textContent = '🐢 Tortoise' + (G.caseFound || G.fi ? ' · ' + (G.fi ? '🧝 Fi' : '💼 Briefcase') : ''); }
function say(who, text, murmur) {
  if (G.phase === 'ebb') G.talkEbb = (G.talkEbb || 0) + 1;
  const win = $('chatT'), box = win.querySelector('.lines');
  const ln = document.createElement('div'); ln.className = 'ln neu ' + (who === 'tortoise' ? 'lt' : 'lb'); ln.dataset.who = who; ln.dataset.full = text; ln.dataset.murmur = murmur ? '1' : ''; ln.textContent = ''; box.appendChild(ln);
  win.style.display = 'block'; $('chatB').style.display = 'none'; chatHead();
  const lines = [...box.querySelectorAll('.ln')];
  lines.forEach((l, i) => { const age = lines.length - 1 - i; l.style.opacity = age <= 1 ? 1 : age === 2 ? .7 : age === 3 ? .5 : .35; });
  while (lines.length > 40) { const o = lines.shift(); if (o !== typing.cur && !typing.q.includes(o)) o.remove(); else break; }
  typing.q.push(ln); if (!typing.cur) typeNext();
  fitPanel();
  return ln;
}
function typeNext() {
  const ty = typing, ln = ty.q.shift(); if (!ln) { ty.cur = null; return; }
  const who = ln.dataset.who, full = ln.dataset.full, box = ln.parentNode, vs = { w: 0 }; let i = 0;
  ty.cur = ln;
  const tick = () => {
    if (ty.cur !== ln) return;
    if (i >= full.length) { finishLine(who, ln, true); return; }
    const ch = full[i++]; ln.textContent = full.slice(0, i); box.scrollTop = box.scrollHeight; G.talk[who] = G.now + .4;
    voiceChar(fiVoice(who), full, i, vs, ln.dataset.murmur === '1');
    let d = 1000 / VOICE[who].cps / (ty.q.length >= 2 ? 2.5 : ty.q.length === 1 ? 1.5 : 1);
    if (who === 'tortoise') { if ('.!?'.includes(ch)) d += 320; else if (',;:—'.includes(ch)) d += 150; }
    else d *= .85 + Math.random() * .3;
    ty.timer = setTimeout(tick, d);
  };
  tick();
}
function finishLine(who, ln, natural) {
  const ty = typing; clearTimeout(ty.timer);
  ln.textContent = ln.dataset.full; ln.parentNode.scrollTop = ln.parentNode.scrollHeight;
  if (natural && who === 'briefcase') sfxBell();
  G.talk[who] = G.now + .8; ty.cur = null;
  setTimeout(() => { if (!ty.cur) typeNext(); }, natural ? (who === 'briefcase' ? 550 : 400) : 60);
}
// tap the chat: finish the line being typed (and anything queued)
$('chatT').addEventListener('pointerdown', () => {
  const ty = typing;
  if (ty.cur) { const ln = ty.cur; ty.cur = null; clearTimeout(ty.timer); ln.textContent = ln.dataset.full; }
  ty.q.splice(0).forEach(l => l.textContent = l.dataset.full);
  const box = $('chatT').querySelector('.lines'); box.scrollTop = box.scrollHeight;
});
// v014 talk rules: one speaker per topic (tortoise = the island, briefcase = system & enemies), new explanations rationed early on
const TALK_DROP = new Set(['nestCase', 'nourishCase', 'listenCase', 'harvest', 'banyanFriend', 'opening']);
const TQ = [];   // explanations waiting for the next ebb
const TALK_LIVE = /^(lowTide|firstHold|calm|omen|unl_|gecko|rot3|listenHint|wasted)/;   // re-checked all the time: no queue, they come back by themselves
function talkFree() { return G.explEbb < (G.tide < T0 + 5 ? 1 : 2); }
function say1(key, who, text, free) {
  if (storySeen[key]) return;
  if (TALK_DROP.has(key) || key.startsWith('stage_') || key.startsWith('offT_')) { storySeen[key] = 1; return; }
  if (!free && !talkFree()) { if (!TALK_LIVE.test(key) && !TQ.some(q => q.key === key)) TQ.push({ key, who, text }); return; }
  storySeen[key] = 1; if (!free) G.explEbb++;
  say(who, text);
}
function talkRelease() { G.explEbb = 0; while (TQ.length && talkFree()) { const q = TQ.shift(); if (!storySeen[q.key]) { if (q.prio) prio(q.who, q.title, q.text, q.o); else say1(q.key, q.who, q.text); } } }
// v014 repetition rule: 1st time full, 2nd time one sentence, after that a short line (or nothing)
function rep(key) { storySeen['#' + key] = (storySeen['#' + key] || 0) + 1; return storySeen['#' + key]; }
// ---------- priority messages: the important things get their own window ----------
// must = always shown; otherwise only if the last priority message is at least 2 tides old, else it goes to the chat
const PRIO = { q: [], open: null };
function prio(who, title, text, o) {
  o = o || {}; if (who === 'radio') { who = 'briefcase'; o.radio = true; }   // v063: a radio message — the briefcase's voice, its own header
  if (o.key) { if (storySeen[o.key]) return;
    if (!o.must && !talkFree()) { if (!TQ.some(q => q.key === o.key)) TQ.push({ key: o.key, prio: true, who, title, text, o }); return; }
    storySeen[o.key] = 1; if (!o.must) G.explEbb++; }
  if (!o.must && G.tide - G.lastPrioTide < 2) { say(who, text.replace(/\n+/g, ' ')); return; }
  G.lastPrioTide = G.tide; PRIO.q.push({ who, title, text, btn: o.btn, ping: o.ping, ping2: o.ping2, choices: o.choices, ill: o.ill, radio: !!o.radio, urgent: !!(o.urgent || G.inAct), valid: o.valid, t0: G.tide, keep: !!o.keep });
}
// v062: a window that waited too long, or whose moment has passed, is not shown late — it stays readable as a pinned line in the chat
function prioPin(m) { const ln = say(m.who, '📌 ' + m.title + ' — tap to read'); PRIO.hist = PRIO.hist || []; ln.dataset.prio = PRIO.hist.push(m) - 1; ln.classList.add('pin'); }
function prioPruefen() {
  PRIO.q = PRIO.q.filter(m => { if (m.valid && !m.valid()) return false; if (!m.urgent && !m.keep && G.tide - m.t0 >= 2) { prioPin(m); return false; } return true; });
}
function prioCanShow() { return G.started && !SPIEL.flutLaeuft && !PRIO.open && !G.drama && !G.landung && $('call').style.display !== 'flex' && $('endScr').style.display !== 'flex' && $('ledgerScr').style.display !== 'flex' && PRIO.q.length && $('card').style.display !== 'flex' && $('treeScr').style.display !== 'flex' && $('rulesScr').style.display !== 'flex' && G.phase === 'ebb' && !G.over; }
// v061 (C5): one priority window per ebb — exceptions: banyan danger, the tutorial, and what the player just triggered; the rest waits
function prioBudget() {
  if (PRIO.q[0].urgent || (G.prioShown || 0) < 1) return true;
  const i = PRIO.q.findIndex(m => m.urgent); if (i > 0) { PRIO.q.unshift(PRIO.q.splice(i, 1)[0]); return true; }
  return false;
}
function showPrio() {
  const m = PRIO.q.shift(), el = $('prio'); PRIO.open = m; if (!m.urgent) G.prioShown = (G.prioShown || 0) + 1;
  if (m.who === 'board') { m.board = true; m.who = G.caseFound ? 'briefcase' : 'tortoise'; }   // v058: a memo straight from the Board (no briefcase needed)
  el.className = m.board || m.who === 'briefcase' ? 'case' + (m.radio ? ' radio' : '') : 'tort';
  el.querySelector('.stamp').style.display = (m.board || m.who === 'briefcase') && !m.radio ? 'block' : 'none';
  $('pWho').textContent = m.radio ? '📻 +++ INCOMING RADIO MESSAGE · DECRYPTED +++' : m.board ? '📨 The Board · a memo' : m.who === 'briefcase' ? (G.fi ? '🧝 Fi · intercepted' : '💼 The briefcase · intercepted') : '🐢 The tortoise';
  $('pTitle').textContent = m.title; $('pText').textContent = ''; $('pBtn').textContent = m.choices ? m.choices[0][0] : m.btn || (m.who === 'briefcase' ? 'Noted' : 'Mm-hm');
  $('pBtn2').style.display = m.choices ? 'block' : 'none'; if (m.choices) $('pBtn2').textContent = m.choices[1][0];
  showIll(m.ill); el.style.display = 'flex';
  if (m.ping >= 0) { G.ping = { id: m.ping, t: G.now }; const [px, py] = tileXY(m.ping); camGo({ x: px, y: py, z: Math.max(CAM.z, CAM.zMax * .8) }, .6); m.cam = true;   // v024: go there, back on the click
    if (m.ping2 >= 0) { setTimeout(() => { if (PRIO.open !== m) return; const [qx, qy] = tileXY(m.ping2); G.ping = { id: m.ping2, t: G.now }; camGo({ x: qx, y: qy, z: CAM.z }, .6); setTimeout(() => { if (PRIO.open === m) { G.ping = { id: m.ping, t: G.now }; camGo({ x: px, y: py, z: CAM.z }, .6); } }, 1800); }, 3000); } }
  const full = m.text, vs = { w: 0 }; let i = 0;
  const tick = () => {
    if (PRIO.open !== m) return;
    if (i >= full.length) { if (m.who === 'briefcase') sfxBell(); m.done = true; return; }
    const ch = full[i++]; $('pText').textContent = full.slice(0, i); G.talk[m.who] = G.now + .4;
    voiceChar(fiVoice(m.who), full, i, vs, false);
    let d = 1000 / (VOICE[m.who].cps * 2.1);   // v024: 1.5× faster than before
    if (m.who === 'tortoise' && '.!?'.includes(ch)) d += 170; else if (m.who === 'tortoise' && ',;:—'.includes(ch)) d += 80;
    if (ch === '\n') d += 130;
    m.timer = setTimeout(tick, d);
  };
  tick();
  { const ln = say(m.who, '📌 ' + m.title); PRIO.hist = PRIO.hist || []; ln.dataset.prio = PRIO.hist.push(m) - 1; ln.classList.add('pin'); }
}
$('pText').addEventListener('pointerdown', () => { const m = PRIO.open; if (m && !m.done) { clearTimeout(m.timer); $('pText').textContent = m.text; m.done = true; } });
function reopenPrio(m) {
  if (PRIO.open) return; const el = $('prio'); PRIO.open = { who: m.who, title: m.title, text: m.text, done: true, reopen: true };
  el.className = m.who === 'briefcase' ? 'case' : 'tort'; el.querySelector('.stamp').style.display = m.who === 'briefcase' ? 'block' : 'none';
  $('pWho').textContent = (m.who === 'briefcase' ? '💼 The briefcase · intercepted' : '🐢 The tortoise') + ' · again'; $('pTitle').textContent = m.title; $('pText').textContent = m.text;
  $('pBtn').textContent = 'Close'; $('pBtn2').style.display = 'none'; showIll(m.ill); el.style.display = 'flex';
}
['chatT'].forEach(id => $(id).querySelector('.lines').addEventListener('click', e => { const ln = e.target.closest('.ln'); if (ln && ln.dataset.prio !== undefined && PRIO.hist) reopenPrio(PRIO.hist[+ln.dataset.prio]); }));
// v019: a small animated picture in the prio box, drawn with the map's own sprites
function showIll(k) { const cv = $('pIll'); cv.style.display = k ? 'block' : 'none'; PRIO.ill = k || null; if (k && !PRIO.illRaf) PRIO.illRaf = requestAnimationFrame(illFrame); }
function illFrame() {
  PRIO.illRaf = 0; const k = PRIO.ill; if (!k || $('prio').style.display === 'none') return;
  const cv = $('pIll'), c = cv.getContext('2d'), t = performance.now() / 1000;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.setTransform(cv.width / 240, 0, 0, cv.width / 240, 0, 0);
  try { drawIll(c, k, t); } catch (e) { console.warn('ill', e); }
  PRIO.illRaf = requestAnimationFrame(illFrame);
}
function illHex(c, x, y, r, fill, txt, col) { c.fillStyle = fill; c.strokeStyle = 'rgba(40,30,15,.6)'; c.lineWidth = 1.4; c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * .62); } c.closePath(); c.fill(); c.stroke();
  if (txt) { c.font = "600 13px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = col || '#fff'; c.fillText(txt, x, y + 5); } }
function drawIll(c, k, t) {
  const sz = (x, y, s, f) => { c.save(); c.translate(x, y); c.scale(s, s); c.translate(-x, -y); f(); c.restore(); };
  if (k === 'banyan' || k === 'banyanCall') {
    sz(120, 92, 1.45, () => drawBanyan(c, 120, 92, t, k === 'banyanCall', 1));
    if (k === 'banyanCall') { drawWish(c, 168, 30 - Math.sin(t * 3) * 2, t); sz(72, 94, 1.6, () => drawCrusoeMini(c, 72, 94, t, false, false)); }
    else { const p = .5 + .5 * Math.sin(t * 3); c.strokeStyle = 'rgba(255,240,170,' + (.35 + .45 * p) + ')'; c.lineWidth = 2; c.beginPath(); c.ellipse(120, 93, 40 + p * 4, 9, 0, 0, Math.PI * 2); c.stroke(); }
  } else if (k === 'nest') { sz(112, 56, 1.25, () => drawNest(c, 112, 56, t, 3, false)); }
  else if (k === 'nestOpen') {
    c.fillStyle = '#2a1e12'; c.beginPath(); c.ellipse(120, 66, 34, 12, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#4b3a24'; c.beginPath(); c.ellipse(120, 64, 26, 8, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(255,224,138,' + (.55 + .35 * Math.sin(t * 4)) + ')'; c.lineWidth = 2.5; c.setLineDash([5, 4]); c.beginPath(); c.ellipse(120, 66, 40, 15, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    for (let i = 0; i < 3; i++) { const q = (t * .4 + i / 3) % 1; c.globalAlpha = (1 - q) * .7; c.strokeStyle = '#9dff7a'; c.lineWidth = 1; c.beginPath(); c.arc(108 + i * 12, 62 - q * 14, 1 + q * 2, 0, Math.PI * 2); c.stroke(); } c.globalAlpha = 1;
    sz(172, 74, 1.8, () => drawCrusoeMini(c, 172, 74, t, false, false));
    c.font = "600 12px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = '#ffe08a'; c.fillText('EXPOSED · hold it', 120, 96);
  } else if (k === 'gecko') { sz(120, 66, 5, () => drawGecko(c, 120, 66, t, false, 1, 1)); }
  else if (k === 'cutting') {
    const g = c.createRadialGradient(120, 60, 0, 120, 60, 46); g.addColorStop(0, 'rgba(255,220,120,' + (.45 + .15 * Math.sin(t * 2)) + ')'); g.addColorStop(1, 'rgba(255,220,120,0)'); c.fillStyle = g; c.fillRect(60, 10, 120, 90);
    sz(120, 86, .9, () => drawBanyan(c, 120, 86, t, true, 1)); sz(70, 90, 1.6, () => drawCrusoeMini(c, 70, 90, t, false, false));
  } else if (k === 'army') { drawArmy(c, 120, 70, t, { str: 8, ph: 0, elite: true }, 2.0); }
  else if (k === 'tower') { sz(120, 92, 1.9, () => drawThornTower(c, 120, 92, t)); c.fillStyle = 'rgba(120,190,230,.7)'; c.fillRect(0, 92, 240, 8); }
  else if (k === 'overflow') {   // v063: the trebuchet throws over to the next tile
    illHex(c, 58, 62, 32, '#16221a', '', ''); illHex(c, 182, 62, 32, '#9bc46a', '', '');
    const q = (t * .6) % 1; c.save(); c.translate(52, 66); c.strokeStyle = '#3b2814'; c.lineWidth = 3; c.beginPath(); c.moveTo(-13, 6); c.lineTo(0, -20); c.lineTo(13, 6); c.stroke();
    c.rotate(2.64 + Math.min(1, q * 3) * 3.04); c.strokeStyle = '#5a3a1c'; c.beginPath(); c.moveTo(-12, 0); c.lineTo(22, 0); c.stroke(); c.restore();
    if (q > .33) { const u = (q - .33) / .67, bx = 60 + (182 - 60) * u, by = 40 - Math.sin(u * Math.PI) * 34; c.fillStyle = '#9dff5a'; c.beginPath(); c.arc(bx, by, 4, 0, 7); c.fill(); }
    c.font = "600 12px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = '#16221a'; c.fillText('load one flood · fire the next', 120, 98);
  } else if (k === 'radio') {   // v063: the Board's radio in its waterproof case, blinking
    c.fillStyle = '#2d3a2f'; c.fillRect(74, 40, 92, 52); c.fillStyle = '#1b231c'; c.fillRect(80, 46, 50, 40); c.fillStyle = '#c8b27a'; c.fillRect(84, 50, 42, 8);
    c.fillStyle = 'rgba(120,255,90,' + (.4 + .5 * (Math.sin(t * 7) > 0 ? 1 : 0)) + ')'; c.beginPath(); c.arc(150, 52, 4, 0, 7); c.fill();
    [140, 156].forEach(x => { c.fillStyle = '#4a5a4c'; c.beginPath(); c.arc(x, 74, 7, 0, 7); c.fill(); c.strokeStyle = '#222'; c.beginPath(); c.moveTo(x, 74); c.lineTo(x + 5 * Math.cos(t + x), 74 + 5 * Math.sin(t + x)); c.stroke(); });
    c.strokeStyle = '#888'; c.lineWidth = 2; c.beginPath(); c.moveTo(160, 40); c.lineTo(178, 10); c.stroke();
    for (let i = 0; i < 3; i++) { const r = ((t * 30 + i * 12) % 36) + 4; c.strokeStyle = 'rgba(255,224,138,' + (1 - r / 40) + ')'; c.beginPath(); c.arc(178, 10, r, Math.PI * .1, Math.PI * .9, true); c.stroke(); }
    c.fillStyle = '#e8d8b0'; c.fillRect(84, 64, 40, 16); c.fillStyle = '#7a1c12'; c.font = "700 6px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillText('PROPERTY OF', 104, 71); c.fillText('THE BOARD', 104, 78);
  } else if (k === 'banyanDanger') {   // v063: the rot creeps up to the banyan from both sides
    const p = .5 + .5 * Math.sin(t * 4); c.fillStyle = 'rgba(200,40,30,' + (.12 + .18 * p) + ')'; c.beginPath(); c.ellipse(120, 70, 92, 34, 0, 0, 7); c.fill();
    sz(120, 92, 1.3, () => drawBanyan(c, 120, 92, t, false, 1));
    drawTendril(c, 10, 90, 92, 88, t, false, 1, false, false); drawTendril(c, 232, 92, 150, 88, t, false, 1, false, false);
    c.font = "700 12px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = '#b0351c'; c.fillText('rot 3 on the banyan = it burns a ring', 120, 104);
  } else if (k === 'merge') {   // v063: two rot networks, one tile apart
    illHex(c, 50, 60, 28, '#16221a', '', ''); illHex(c, 190, 60, 28, '#16221a', '', ''); illHex(c, 120, 60, 28, Math.sin(t * 5) > 0 ? '#c0452a' : '#7a3a22', '!', '#fff');
    c.font = "600 12px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = '#16221a'; c.fillText('if the middle rots, the networks join', 120, 100);
  } else if (k === 'memo' || k === 'fired') {   // v063: a Board memo with its stamp
    c.save(); c.translate(120, 58); c.rotate(-.05); c.fillStyle = '#f4ecd8'; c.fillRect(-52, -40, 104, 80); c.fillStyle = '#9a8a6a'; for (let i = 0; i < 6; i++) c.fillRect(-42, -28 + i * 10, i === 5 ? 40 : 84, 2.4);
    c.rotate(.22); c.strokeStyle = '#b0351c'; c.lineWidth = 2.5; c.strokeRect(-36, 6, 72, 20); c.fillStyle = '#b0351c'; c.font = "700 12px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillText(k === 'fired' ? 'TERMINATED' : 'THE BOARD', 0, 21); c.restore();
  } else if (k === 'gate') {   // v063: the rusted service gate under the mountain
    c.fillStyle = '#2a2420'; c.beginPath(); c.arc(120, 96, 52, Math.PI, 0); c.fill(); c.strokeStyle = '#8a4a22'; c.lineWidth = 3; for (let x = 78; x <= 162; x += 12) { c.beginPath(); c.moveTo(x, 96); c.lineTo(x, 50 + Math.abs(x - 120) * .5); c.stroke(); }
    for (let i = 0; i < 3; i++) { const bx = 120 + Math.sin(t * 2 + i * 2) * 40, by = 40 + Math.cos(t * 3 + i) * 12; c.fillStyle = '#111'; c.beginPath(); c.moveTo(bx - 7, by); c.quadraticCurveTo(bx - 3, by - 5 * Math.sin(t * 20 + i), bx, by); c.quadraticCurveTo(bx + 3, by - 5 * Math.sin(t * 20 + i), bx + 7, by); c.fill(); }
  }
}
function prioBtn(i) { const m = PRIO.open; if (!m) return; if (m.reopen) { $('prio').style.display = 'none'; PRIO.open = null; return; } clearTimeout(m.timer); if (!m.done) { $('pText').textContent = m.text; m.done = true; return; } $('prio').style.display = 'none'; PRIO.open = null; if (m.cam) camHome(.6); if (m.choices) m.choices[i][1](); }
$('pBtn').onclick = () => prioBtn(0); $('pBtn2').onclick = () => prioBtn(1);
// v014 ambience: the beach's surf, very quietly, under the island (follows the Sound button)
// ---------- v015 island ambience: one surf "function" of place L and height H, plus located sources ----------
// L: 0 = coast … 0.5 = foothills … 1 = mountain (under the view centre) · H: 0 = closest zoom … 1 = whole island
// sources sit at a map position AND an altitude: the listener flies at A(H), so birds (up high) come closer when you zoom out
function ambInit() {
  if (!SND.ctx || AMB.on || !T.length || !pick) return; ambGraph();   // v031: the sound graph comes from sound.js
  // per-tile place value: altitude class + distance to the coast
  const dist = T.map(() => 99), q = []; T.forEach(t => { if (t.coast || t.reg === 5) { dist[t.id] = 0; q.push(t.id); } });
  while (q.length) { const id = q.shift(); T[id].nb.forEach(n => { if (dist[n] > dist[id] + 1) { dist[n] = dist[id] + 1; q.push(n); } }); }
  const ALT = { water: 0, beach: 0, grove: .3, jungle: .45, tangle: .5, slope: .85, lava: 1 };
  T.forEach(t => { let al = ALT[t.type] ?? .4; if (t.reg === 3) al = Math.max(al, .7); if (t.reg === 6) al = .7; t.ambL = clamp(.7 * al + .3 * Math.min(1, dist[t.id] / 2), 0, 1); });
  AMB.src = { birds: { p: pf(LM.birds[0], LM.birds[1]), alt: 260, R: 260 }, bats: { p: pf(LM.cave[0], LM.cave[1]), alt: 15, R: 200 }, volcano: { p: anim.crater || pf(.5, .35), alt: 60, R: 420 } };
  AMB.on = true;
}
function ambAtt(sname) {   // distance from the flying listener to a source: map plane + altitude
  const S = AMB.src[sname], A = 120 + 680 * AMB.H, dx = S.p[0] - CAM.x, dy = S.p[1] - CAM.y, dz = A - S.alt, d = Math.hypot(dx, dy, dz);
  return { g: 1 / (1 + Math.pow(d / S.R, 2)), d, pan: clamp(dx * CAM.z / (CW / 2), -1, 1) * .7 };
}
function ambTick(dt) {
  if (!AMB.on) { if (SND.ctx && T.length && pick) { try { ambInit(); } catch (e) { console.warn(e); } } return; }
  AMB.k += dt; if (AMB.k < .25) return; AMB.k = 0;
  const a = SND.ctx, now = a.currentTime, T8 = (p, v) => p.setTargetAtTime(v, now, .8);
  // place under the view centre (five samples, so it changes smoothly while you pan)
  const pc = pick.getContext('2d'), sp = [[0, 0], [-.22, 0], [.22, 0], [0, -.22], [0, .22]]; let Ls = 0;
  sp.forEach(([fx, fy]) => { const x = CAM.x + fx * CW / CAM.z, y = CAM.y + fy * CH / CAM.z, d = pc.getImageData(clamp(x, 0, CW - 1) | 0, clamp(y, 0, CH - 1) | 0, 1, 1).data, id = d[0] - 1; Ls += (id >= 0 && id < T.length && !d[1] && !d[2]) ? T[id].ambL : 0; });
  const L = AMB.L = Ls / sp.length, H = AMB.H = CAM.zMax > 1 ? clamp((CAM.zMax - CAM.z) / (CAM.zMax - 1), 0, 1) : 1;
  const U = 1 - .3 * (1 - Math.pow(2 * H - 1, 2));   // loudest close up and high up, quietest in between
  const surf = .11 * (1 - .6 * L) * (1 - .3 * H) * U;
  T8(AMB.lp.frequency, 650 - 250 * H - 100 * L); T8(AMB.surf.gain, surf); T8(AMB.lfoG.gain, surf * .6 * (1 - .7 * H)); T8(AMB.lfo.frequency, .11 - .05 * H);
  T8(AMB.breeze.gain, .014 * Math.pow(1 - L, 2) * (1 - H) * U);
  const hi = .012 * L * (.5 + .5 * H) * U; T8(AMB.high.gain, hi); T8(AMB.highL.gain, hi * .5);
  const vo = ambAtt('volcano'); T8(AMB.rumble.gain, .16 * vo.g); T8(AMB.rumbleP.pan, vo.pan);
  T8(AMB.out.gain, SND.on && !CV.on ? 1 : 0);
  if (!SND.on || CV.on) return;
  // occasional located events
  const t = G.now, due = (k, lo, hi) => { if ((AMB.next[k] || 0) > t) return false; AMB.next[k] = t + lo + Math.random() * (hi - lo); return true; };
  const bi = ambAtt('birds'); if (bi.g > .02 && due('birds', 1.6, 5)) ambBooby(bi);
  const ba = ambAtt('bats'), night = G.phase !== 'ebb' || G.below; if (ba.g > .02 && due('bats', night ? 1.2 : 2.5, night ? 3.5 : 7)) ambBats(ba);
  if (vo.g > .03 && due('puff', 6, 14)) ambPuff(vo);
}

// ---------- UI ----------
function goalText() {
  { const k = kurs(); if (k) return k.txt; }   // v058: the recommended course first
  if (!G.friends.banyan) return T[G.banyan].state > 0 ? '🎯 Listen to the banyan · stand on it, 2 free Kinship ✨' : '🎯 Explore — follow the cat';
  if (!G.unl.listen) return '🎯 Earn 2 Kinship · listen to the banyan';
  if (!G.friends.gecko) return T[G.gecko].state > 0 ? (G.geckoFed ? '🎯 Gecko, visit 2: 5 🍞 + 2 🥥 + roots' : '🎯 Gecko, visit 1: 4 🍞') : '🎯 Grow roots · find who climbs';
  // v040: the main line of act 2 — the Board's armies and offensive first, then the offshoot, the First Mate's cabins, the nests
  const arm = G.armies.filter(a => !a.dead).length, o = G.board.off;
  if (arm) return '🎯 Stop the Board\'s armies · ' + arm + ' marching';
  if (o && !o.done) return offActive() ? '🎯 Hold the banyan · ' + o.name + ' · ' + (o.end - G.tide) + ' tide' + (o.end - G.tide === 1 ? '' : 's') + ' left' : '🎯 Prepare · ' + o.name + ' in ' + (o.start - G.tide) + ' tide' + (o.start - G.tide === 1 ? '' : 's');
  if (G.cutting) return '🎯 Plant the cutting in Region II';
  if (G.banyans.length < 2 && offshootFaellig()) return '🎯 The banyan has reached its range · grow an offshoot';
  if (G.friends.gecko && !G.flags.radio && G.radio >= 0) return '🎯 Explore the cliffs';
  if (G.boss.revealed && G.boss.alive) { const n = bossNests().length; return '🎯 Close his dens · ' + n + ' left'; }
  const nn = T.filter(t => t.source === 'nest' && t.state > 0).length;
  return nn ? '🎯 Clear the rot nests · ' + nn + ' left' : '🎯 The island holds';
}
// v061: the side quests that run alongside the main task
function offshootFaellig() { return G.friends.banyan && (G.unl.ableger || !T.some(t => t.state > 0 && canGrowTo(t))); }
function nebenQuests() {
  if (!tutFertig()) return [];
  const q = [], main = goalText();
  if (G.caseFound && !G.fi && G.fiWipe !== undefined) q.push('💼 Save the briefcase · the Dark-Wood Elf in your Dream');
  if (G.friends.gecko && !G.flags.radio && G.radio >= 0 && !main.includes('Explore')) q.push('🧭 Explore the cliffs');
  if (G.banyans.length < 2 && offshootFaellig() && !main.includes('offshoot') && !G.cutting) q.push('🌱 Grow an offshoot · the banyan has reached its range');
  return q.slice(0, 2);
}
// v040: the threat box — the banyan struck or burned, a front under pressure (the boss and the offensive have their own lines)
function threatText() {
  const L = [];
  if (G.phase === 'ebb' && G.targets.includes(G.banyan) && T[G.banyan].state > 0) { const bt = T[G.banyan], a = attackOn(bt), d = defense(bt); L.push('🌳 <b>The banyan is struck this flood</b> · rot ' + a + ' vs defence ' + d + ' · holds ' + pct(holdChance(d, a))); }
  if (G.lastBurn && G.tide - G.lastBurn.tide <= 1) L.push('🔥 <b>' + (G.lastBurn.main ? 'The banyan' : 'An offshoot') + ' burned</b> · level ' + G.lastBurn.from + ' → ' + G.lastBurn.to);
  const onRoots = G.phase === 'ebb' ? G.targets.filter(id => T[id].rooted && T[id].state > 0).length : 0;
  if (onRoots >= 3) L.push('⚠ <b>Hold the front</b> · ' + onRoots + ' strikes on your roots this flood');
  return L.join('<br>');
}
function updateHUD() {
  gruenKoppeln();
  // tide as waves: blue = the map's own, gold = spring hour; spent ones go grey
  let w = ''; for (let i = 0; i < RULES.baseTide; i++) w += '<span class="wv' + (i < G.gezeit ? '' : ' off') + '">🌊</span>';
  for (let i = 0; i < G.springMax; i++) w += '<span class="wv' + (i < G.spring ? '' : ' off') + '">✨</span>';
  $('hWaves').innerHTML = w;
  $('hG').innerHTML = G.gezeit + '/' + RULES.baseTide + (G.springMax ? ' <span class="gold">+ ✨' + G.spring + '</span>' : ''); $('hT').textContent = G.tide; $('hWm').textContent = G.wandelMax || WMAX || 20;
  // Kinship: green = already spent, gold = still free to spend; notches = stages, the bright one is next
  const free = Math.min(G.wFree, G.wandel), si = stageIdx(), nx = STAGES[si + 1];
  const wm = G.wandelMax || WMAX, pc = 100 / wm, wb = $('hWb'); wb.querySelector('.ws').style.cssText = 'left:0;width:' + (G.wandel - free) * pc + '%'; wb.querySelector('.wf').style.cssText = 'left:' + (G.wandel - free) * pc + '%;width:' + free * pc + '%';
  wb.querySelectorAll('.nt').forEach(n => n.remove());
  STAGES.slice(1).filter(v => v[0] < wm).forEach(([v]) => { const n = document.createElement('i'); n.className = 'nt' + (nx && nx[0] === v ? ' next' : ''); n.style.left = v * pc + '%'; wb.appendChild(n); });   // v061: the stages' notches
  $('hW').textContent = G.wandel; $('hS').textContent = stage(); $('hSight').textContent = si + 1;
  $('hEff').textContent = (si >= 1 ? ' · ✋ +' + si + ' sap' : '') + (si >= 2 ? ' · growth −20 %' : '');
  $('hWF').textContent = G.wFree + ' free' + (G.friends.banyan ? ' to teach the banyan' : '');
  $('hNext').textContent = nx ? ' · at ' + nx[0] + ': ' + nx[1] + ' (' + STAGE_FX[nx[1]] + ')' : '';
  const rc = rootCount();
  { const h = RESS.html(), e = $('hR'); if (e.innerHTML !== h) e.innerHTML = h; e.style.display = h ? '' : 'none'; }   // v040: the same row as on the beach
  { const g = goalText(), sq = nebenQuests(), h = g + sq.map(q => '<span class="side">' + q + '</span>').join(''); if ($('hGoal').innerHTML !== h) $('hGoal').innerHTML = h; }   // v061: main task + parallel quests
  const ov = G.targets.filter(id => G.tinfo[id] && G.tinfo[id].overflow).length, om = G.targets.length - ov;
  $('omen').innerHTML = (!tutFertig() && G.tut < TUT_SPILL ? '📘 Tutorial · the rot sleeps for now' : G.omen ? '☠ Bad Omen: <b>' + G.omen + '</b> · ' + om + ' spearhead' + (om === 1 ? '' : 's') : '☠ No Bad Omen · no land next to rot this flood')
      + (ov ? ' · <b>+' + ov + ' overflow</b>' : '');
  const B = G.boss, hb = $('hBoss');
  if (B.revealed) { hb.style.display = 'block'; const nl = bossNests().length;
    hb.innerHTML = B.alive ? '👁 <b>' + bossName() + '</b> · ' + (B.ready ? '<span class="warn" style="color:#ff9d7a">in the next wave</span>' : 'recovering ' + '●'.repeat(B.rec) + '○'.repeat(bossRec() - B.rec)) + ' · ' + nl + ' nest' + (nl === 1 ? '' : 's') : '👁 The ex-First Mate · <b>fired</b>'; }
  else hb.style.display = 'none';
  { const th = threatText(), e = $('hThreat'); if (e.innerHTML !== th) e.innerHTML = th; e.style.display = th ? 'block' : 'none'; }
  { const hi = $('hInf'); if (false) { hi.style.display = 'block'; hi.className = 'pill' + (G.inf >= 5 ? ' hot' : ''); hi.innerHTML = '🦠 Blight <b>' + G.inf + '</b>' + (G.inf >= 8 ? ' · fever, steps +1' : G.inf >= 5 ? ' · fever: −2 hours' : '') + (G.below ? ' · 🕳 below the mountain' : ''); } else hi.style.display = 'none'; }
  const of = G.board.off, ho = $('hOff');
  if (of && !of.done) { ho.style.display = 'block'; ho.innerHTML = offActive() ? '☠ <b>' + of.name + '</b> · ' + (of.end - G.tide) + ' tide' + (of.end - G.tide === 1 ? '' : 's') + ' left' : '⚠ ' + of.name + ' starts in ' + (of.start - G.tide) + ' tide' + (of.start - G.tide === 1 ? '' : 's') + ' — prepare'; } else ho.style.display = 'none';
  $('bEnd').style.display = G.phase === 'ebb' ? 'block' : 'none';
  if ($('bTree')) { $('bTree').style.display = G.friends.banyan ? '' : 'none'; $('bTree').style.boxShadow = G.friends.banyan ? '0 0 0 3px ' + THREAT[threatLevel()][1] : ''; }
  $('bEnd').classList.toggle('pulse', G.phase === 'ebb' && G.gezeit + G.spring === 0); $('bEnd').classList.toggle('tutRing', G.phase === 'ebb' && G.kursHl === 'end' && G.at === G.kursZ);
  tutTick(); storyTick();
}
// cost chips: 🌊 blue, ✨ gold (spent after the blue), 💚 green, Kinship gold-green; red = can't afford
function chipT(n) {
  if (n === '?') return '<span class="chip tide">? 🌊</span>';
  if (n <= 0) return '<span class="chip nt">free</span>';
  const b = Math.min(G.gezeit, n), r = n - b; let o = '';
  if (b > 0) o += '<span class="chip tide">' + b + ' 🌊</span>';
  if (r > 0) o += '<span class="chip spr' + (r > G.spring ? ' no' : '') + '">' + r + ' ✨</span>';
  return o;
}
const chipG = n => '<span class="chip grn' + (G.res.green < n ? ' no' : '') + '">' + n + ' 💚' + (G.res.green < n ? ' (you have ' + G.res.green + ')' : '') + '</span>';   // v033: have / need when short
const chipW = (d, spend) => '<span class="chip wan' + (spend && G.wFree < d ? ' no' : '') + '">' + (spend ? d + ' free Kinship' + (G.wFree < d ? ' (you have ' + G.wFree + ')' : '') : (d > 0 ? '+' : '−') + Math.abs(d) + ' Kinship') + '</span>';
const chipN = (txt, ok) => '<span class="chip nt' + (ok === false ? ' no' : '') + '">' + txt + '</span>';
const PNAME = { roots: 'roots', 'healthy neighbours': 'neighbours', protected: 'protected', friend: 'friend', you: 'you' };
function defEq(t) { const d = defense(t), ps = defParts(t); return '🛡 ' + d + (ps.length ? ' = ' + ps.map(p => (PNAME[p[0]] || p[0]) + ' ' + p[1]).join(' + ') : ' — nothing defends it'); }
function atkEq(t) {
  const a = arms(t); if (!a.length) return '⚔ 0 — no rot next door';
  let s = '⚔ ' + attackOn(t) + ' = strongest arm ' + a[0];
  if (a.length > 1) s += ' + ' + (a.length - 1) + ' side arm' + (a.length > 2 ? 's' : '');
  return s;
}
function fitPanel() {
  const p = $('panel'), ch = $('chatT'); if (p.style.display !== 'block') return;
  const top = p.getBoundingClientRect().top, lim = ch.style.display === 'block' ? ch.getBoundingClientRect().top - 8 : innerHeight - 64;
  p.style.maxHeight = Math.max(120, lim - top) + 'px';
}
window.addEventListener('resize', fitPanel);
function renderPanel() {
  const p = $('panel');
  if (G.sel < 0 || G.phase !== 'ebb') { p.style.display = 'none'; return; }
  const t = T[G.sel], here = G.sel === G.at, adj = T[G.at].nb.has(G.sel), vc = (VC.t = -1, viewCache());
  const title = t.state === 0 ? 'Unknown' : t.name, combat = [], roots = [], quest = [], btns = [];
  let head = t.state === 0 ? 'Under the clouds — the cat hasn\'t been here.' : cap(t.type) + (omenType(t) !== t.type ? ' (counts as ' + omenType(t) + ')' : '') + ' · move ' + (RULES.costMove[t.type] >= 99 ? '—' : RULES.costMove[t.type]) + ' 🌊';
  if (adj && t.state > 0 && crossOk(G.at, t.id).ok) { const mc = moveCost(G.at, t.id), bc = RULES.costMove[t.type] || 1; if (mc !== bc) head += ' · from here ' + mc + (T[G.at].rooted && t.rooted ? ' (roots −1)' : '') + (t.b ? ' (rot +' + t.b + ')' : ''); }
  if (here) head = '<i>You are here.</i> ' + head;
  // ⚔ combat
  if (t.state > 0 && t.reg !== 5) {
    if (t.id === G.banyan && G.friends.banyan && t.b > 0) combat.push('<span class="bad">🌳 Banyan rot ' + t.b + '/3 — ' + (G.blevel <= 1 ? 'at 3 the island falls.' : 'at 3 it burns ' + (G.blevel >= 3 ? 'two rings' : 'a ring') + ' to push it back.') + '</span>');
    if (t.b >= 3 && !t.source && !t.rooted) combat.push(steil(t) ? '<small>⛰ Too steep up here: the rot builds nothing.</small>' : t.turm !== undefined && t.trebo === undefined ? '<b>🏰 Tower</b> · ' + Math.min(RULES.turmBau, G.tide - t.turm) + '/' + RULES.turmBau + ' — then a trebuchet on top, range 2' : t.trebo !== undefined ? '<b>💥 Trebuchet</b>' + (t.turm !== undefined ? ' on a tower · range 2' : ' · range 1') + ' — ' + (treboFeuert(t) ? '<span class="bad">fires this flood</span>' : 'loading, fires the flood after') : '<small>💥 A trebuchet goes up here next flood.</small>');   // v063
    if (t.b > 0) combat.push('☠ Rot <b>' + t.b + '/3</b>' + (t.source === 'nest' ? ' · a nest' : t.source ? ' · a source' : '') + (t.b >= 3 && !t.source ? ' · its network spills over every flood' : ''));
    if (t.source === 'nest') { const net = vc.net.nets.find(n => n.nests.includes(t.id)); if (net) { const P = nestPower(net, t.id), own = net.share[t.id].length; combat.push('<span class="eq">☠ Nest power ' + P + ' = ' + own + ' own tile' + (own === 1 ? '' : 's') + (P > own ? ' + ' + (P - own) + ' from the merged nest' : '') + '</span><br><small>Every flood it adds +1 rot to ' + P + ' of its tiles (max 3).</small>'); } }
    const tg = G.targets.includes(t.id);
    if (tg) {
      const inf = G.tinfo[t.id] || {}, a = attackOn(t), d = defense(t);
      if (inf.overflow) {   // v063: the trebuchet rolls no dice — own section, own words
        const src = T[inf.from], lands = t.rooted && !(G.banyans.includes(t.id) && t.rs <= 1) ? 'root −1' + (t.rs <= 1 ? ' — it withers for a flood' : '') : '+1 rot';
        combat.push('<b>💥 Overflow · trebuchet</b><br><span class="warn">from ' + (src ? src.name : 'a rot-3 tile') + (src && src.turm !== undefined ? ' (on a tower, range 2)' : '') + ' — fires next flood</span><br><span class="bad">The ball always lands: ' + lands + '</span> <small>· cleanse the trebuchet tile below 3 to stop it</small>');
      } else {
      combat.push('<b>☠ Bad Omen · ' + G.omen + '</b><br><span class="warn">⚠ strikes next flood</span>');
      combat.push('<span class="eq">' + atkEq(t) + '</span><br><span class="eq">' + defEq(t) + '</span>');
      combat.push((a > d ? '<span class="bad">✖ Likely falls (' + pct(1 - holdChance(d, a)) + '): +1 rot' + (t.rooted ? ', root −1' : '') + '</span> <small>— needs ' + (a - d) + ' more defence</small>' : (d === a ? '<span class="warn">⚖ Coin flip (50 %)</span> ' : '<span class="ok">✔ Likely holds (' + pct(holdChance(d, a)) + ')</span> ') + (d >= a + pushNeed() ? '<small>· and pushes the rot back</small>' : '<small>· +' + (a + pushNeed() - d) + ' defence would push it back</small>')) + '<br><small>Odds: even 50 % · +1 80 % · +2 92 % · +3 99 %</small>');
      }
    } else if (!t.source && t.b < 3 && arms(t).length && !rotSchlaeft(t.id)) {   // v061: sleeping rot threatens nothing yet
      combat.push('<small>Next to rot. If the omen picks it:</small><br><span class="eq">' + atkEq(t) + '</span><br><span class="eq">' + defEq(t) + '</span>');
    } else if (t.rooted || here) combat.push('<span class="eq">' + defEq(t) + '</span>');
    if (t.owner === 'bailiff') { const B = G.boss; combat.push('👁 <b>The First Mate\'s den</b>' + (B.alive && B.at === t.id ? (B.ready ? ' · he left for the beach — his hammock waits here' : ' · <b>he is recovering here</b> (' + B.rec + '/3)') : B.alive ? ' · his other den' : '')); }
    if (vc.merge.includes(t.id)) combat.push(G.targets.includes(t.id) ? '<span class="bad">⚠ Struck this flood, and it bridges two rot networks: one hit and they merge — each nest then feeds a third of the other\'s tiles too.</span>' : '<small>Bridge between two rot networks: if it ever rots, they merge.</small>');
  }
  // 🌿 roots & sap
  if (t.state > 0 && t.reg !== 5 && (t.rooted || G.friends.banyan)) {
    if (t.id === G.banyan && G.friends.banyan) roots.push('🌳 Banyan level <b>' + G.blevel + '</b> · works ' + G.blevel + ' tile' + (G.blevel === 1 ? '' : 's') + ' · ~' + r1(sapEstimate()) + ' sap per flood · growth ' + Math.floor(G.sapGrow) + '/' + growthNeed());
    if (t.ableger) roots.push('🌳 Offshoot banyan · level ' + treeLvl(t.id) + ' (half the old tree' + (t.sac ? ', −' + t.sac + ' burnt' : '') + ') · shares sap, orders and lessons with it');
    if (t.rooted) {
      { const dd = treeDist()[t.id]; roots.push('🌿 Root strength <b>' + t.rs + '/' + Math.min(RULES.maxRoot, capOf(dd)) + '</b> <small>· ' + (dd > 99 ? 'no tree in reach' : dd + ' step' + (dd === 1 ? '' : 's') + ' from the nearest tree') + '</small>'); }
      if (t.b > 0) roots.push('<span class="warn">Rotten: gives no sap until cleansed.</span>');
      else if (G.friends.banyan && workedTiles().includes(t.id)) roots.push('🍃 Worked by the banyan: <b>+' + sapOf(t) + ' sap</b> per flood');
      else if (G.friends.banyan) roots.push('🍃 Not worked — the banyan works its best ' + G.blevel + '. Would give +' + sapOf(t) + '.');
    } else if (G.friends.banyan && rootCap(t.id) === 0) roots.push('<span class="warn">Too far from any tree (6+ steps): roots can\'t grow here. An offshoot would bring it in reach.</span>');
    else if (G.friends.banyan) { const y = (RULES.sapYield[t.type] || 0) + (t.content && t.content.kind === 'res' ? RULES.fruitSap : 0); roots.push('Not rooted. Rooted and worked: +' + y + ' sap per flood.'); }
    const nr = vc.next;
    if (nr && nr.id === t.id) { const F = flowData(); roots.push('<b>▲ Next root here</b> (' + t.rs + '→' + (t.rs + 1) + ') · ' + whenTxt(floodsTo(G.sapProd, RULES.sapPerRoot, F.prod)) + ' · ' + (G.rootTarget === t.id ? '<span class="gold">your choice</span>' : 'the banyan\'s choice (front line first)')); }
    if (here && t.rooted && t.b === 0 && G.friends.banyan) roots.push('✋ You stand on roots: +' + handBonus() + ' sap at flood' + (stageIdx() ? ' (Kinship stage ' + stageIdx() + ')' : ' — grows from Castaway on'));
  }
  // 📜 quest & story
  if (t.state === 1) quest.push('The cat smelled ' + (t.content ? { banyan: 'something green and very old', gecko: 'something small with feet', res: 'food', memory: 'paper and salt water', start: 'crabs' }[t.content.kind] : (t.b ? 'rot' : 'nothing special')) + '. Walk in to see properly.');
  if (t.state === 2 && t.content) {
    const c = t.content;
    if (c.kind === 'banyan') quest.push(G.friends.banyan ? '🌿 The banyan. Your roots start here.' : '🌿 A banyan sapling. <b>Listen to it: stand on this tile, 2 free Kinship.</b>' + (here ? ' <span class="ok">✔ you are here</span>' : ''));
    if (c.kind === 'gecko') { const ck = (ok, txt) => '<span class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✔ ' : '✖ ') + txt + '</span>';
      quest.push(G.friends.gecko ? '🦎 The gecko is your friend. The cliffs are open.' : !G.geckoFed ? '🦎 A gecko. <b>Visit 1:</b> ' + ck(G.res.fruit >= 4, '4 🍞') + ' (you have ' + G.res.fruit + ')<br><small>Visit 2, another tide: 5 🍞 + 2 🥥 + roots here.</small>'
        : '🦎 It knows you now. <b>Visit 2</b>' + (G.tide <= G.geckoFedTide ? ' <small>(another tide — not today)</small>' : '') + ': ' + ck(G.res.fruit >= 5, '5 🍞') + ' · ' + ck(G.res.coco >= 2, '2 🥥') + ' · ' + ck(t.rooted, 'roots here')); }
    if (c.kind === 'res') quest.push(c.icon + ' ' + (c.res === 'fruit' ? 'Breadfruit' : 'Coconuts') + ' · ' + (t.rooted && t.b === 0 ? '<b>your roots harvest +' + (1 + (t.prot ? 1 : 0)) + ' ' + c.icon + ' every flood</b>' + (t.prot ? '' : ' (protect it: +1 more)') : t.rooted ? '<span class="warn">rotten — no harvest until cleansed</span>' : 'plant a root here and it brings in +1 ' + c.icon + ' every flood (+1 if protected)'));
    if (c.kind === 'memory') quest.push('✦ Flotsam from the yacht.' + (G.memories.includes('invoice') ? ' You found the invoice here.' : ''));
    if (c.kind === 'start') quest.push('🐢 The tortoise lives here.');
  }
  if (t.owner === 'bailiff' && G.boss.alive && t.state > 0) quest.push('👁 Cleanse it to 0 to clear his den. ' + (bossNests().length > 1 ? (G.boss.at === t.id ? 'He has to move: −1 day of recovery.' : 'He keeps his other den.') : '<b>His last nest — he is gone for good.</b>'));
  if (t.id === G.start && G.tower) quest.push(G.tower2 ? '🗼 The thorn tower (II) runs the beach — chores and sweeps.' : '🗼 The thorn tower tends the beach.');
  const c = crossOk(G.at, t.id);
  if (!c.ok && c.closed) { quest.push('<span class="warn">' + c.why + '</span>'); blockedSay(c); }
  if (G.cutting && t.reg === 2 && here && !canPlant(t)) quest.push('<span class="warn">The cutting needs a free Region II tile next to your roots.</span>');
  if (G.banyans.includes(t.id) && t.b > 0) { const fn = nestFeeding(t.id); if (fn !== null) quest.push('<b style="color:#b0351c">🫧 Fed by the ' + T[fn].name + ': +1 rot here every flood</b> — even if every strike is held. Cleanse it, or cut the rot between them.'); }
  { const a = armyOn(t.id); if (a) { quest.push('<b style="color:#b0351c">⚔ The Board\'s army · strength ' + a.str + '</b> — it marches on the banyan and attacks the tower, the trees and you.' + (here || adj ? '' : ' Stand next to it to attack.'));
    if ((here || (adj && c.ok)) && G.phase === 'ebb') btns.push(['armyAtk', 'Attack the army', chipT(ARMY.atkCost) + chipN(pct(armyOdds(a, G.friends.banyan && (G.banyans.includes(t.id) || G.banyans.includes(G.at)))) + ' to win')]); } }
  // 🛠 actions
  if (adj) {
    if (c.ok) btns.push(['move', 'Go here', chipT(t.state === 0 ? '?' : moveCost(G.at, t.id))]);
    else if (!c.closed) quest.push('<span class="warn">' + c.why + '</span>');
  }
  if (here) {
    if (!t.prot && t.reg !== 5) btns.push(['protect', 'Protect · +1 defence', chipT(1) + chipW(1)]);
    if (t.b > 0 && t.source !== 'wreck' && t.source !== 'nest') btns.push(['cleanse', 'Cleanse · −1 rot', chipT(2) + chipW(1) + chipN('+1 Blight')]);
    if (katzeJagt(t)) btns.push(['shoo', '🐾 The cat chases it · −1 rot', chipN(shooPreis() + ' 🐟') + chipN('price doubles with each chase this ebb') + chipW(1)]);
    if (t.b > 0 && t.source === 'nest') btns.push(['burn', 'Burn · −' + Math.min(2, t.b) + ' rot', chipT(2) + chipN(RULES.burnRum + ' 🥃') + chipW(1)]);   // v055: scrubbing does nothing on a nest — it has to burn
    if (t.source === 'nest' && t.b === 0) quest.push('<b>🔥 Exposed nest — hold it:</b> end the ebb right here. At flood the nest fights back — ' + (G.boss.alive && G.boss.at === t.id && !G.boss.ready ? '<b>with ' + bossName() + ' at home</b>' : 'without a boss') + '. That fight replaces the beach fight. Leave it, and it grows back.');
    else if (t.source === 'nest') quest.push('Burn it to 0 (🥃 ' + RULES.burnRum + ', Cleanse does nothing here) to expose the nest — then hold it through a flood.');
    if (t.id === G.cave) { if (G.descent < CAVE_N) btns.push(['descend', 'Descend · chamber ' + (G.descent + 1) + '/' + CAVE_N + (G.descTide === G.tide ? ' (once per ebb)' : ''), chipN('all hours') + chipN('absent at flood') + chipN('light costs 💚')]); else quest.push('🦇 The chambers are behind you. Far below, a crack in the mountain looks down on the lagoon. <i>(Act 4 — not yet built.)</i>'); }
    if (t.content && t.content.kind === 'gecko' && !G.friends.gecko) {
      if (!G.geckoFed && G.res.fruit >= 4) btns.push(['geckoFeed', 'Feed the gecko (visit 1)', chipT(1) + chipN('4 🍞') + chipW(1)]);
      if (G.geckoFed && G.tide > G.geckoFedTide && t.rooted && G.res.fruit >= 5 && G.res.coco >= 2) btns.push(['gecko', 'Befriend the gecko (visit 2)', chipT(1) + chipN('5 🍞') + chipN('2 🥥') + chipW(2)]); }
  }
  if (here && G.friends.banyan && canGrowTo(t)) btns.push(['nourish', 'Plant a root', chipT(RULES.nourishCost) + chipG(RULES.nourishGreen) + chipW(1)]);
  else if (here && G.friends.banyan && !t.rooted && t.reg !== 5 && t.state > 0 && !G.banyans.includes(t.id)) { const w = growWhy(t); if (w) btns.push(['nourish', 'Plant a root', '', w]); }   // v060: greyed, with the reason
  if (t.id === G.banyan && !G.friends.banyan && t.state > 0) btns.push(['listen', 'Listen to the banyan · befriend it', chipW(2, true), here ? '' : 'stand on its tile']);   // v060: listening is the friendship
  if (G.banyans.includes(t.id) && G.friends.banyan) {
    btns.push(['openTree', t.ableger ? 'Open the banyan ▸ (shared with the old tree)' : 'Open the banyan ▸', '']);
    if (rootCount() <= 1 && !t.ableger) roots.push('🌱 <b>Plant roots on the tiles around it</b> — walk to a neighbour tile and tap “Plant a root”.');
  }
  if (G.mountain && G.at === G.cave && t.state > 0 && t.reg !== 5 && bfsFrom(G.cave)[t.id] <= 4) {
    if (t.b > 0) btns.push(['lava', 'Lava bomb · −2 rot, burns roots', chipT(lavaPreis()) + chipN('dearer each time this ebb') + chipW(-1)]);
    if (t.b === 0 && !t.source && !(t.vent > G.tide)) btns.push(['vent', 'Steam vent · rot-proof for 2 floods', chipT(2)]);
  }
  if (t.vent > G.tide) roots.push('♨ Steam vent: no rot gets in until tide ' + t.vent + '.');
  if (t.source === 'nest' && t.b === 0 && !here && t.state > 0) quest.push('🔥 An exposed nest. Stand on it at the end of the ebb to fight it — or it grows back.');
  if (t.id === G.gate && !G.key) quest.push('🔒 A rusted service gate in the rock. Bats flutter through the bars. Locked.');
  if (G.unl.rootOrder && t.rooted && t.rs < RULES.maxRoot && G.rootTarget !== t.id) btns.push(['rootTarget', 'Strengthen this root next', chipN('free')]);
  if (G.unl.cleanRot && G.unl.rootOrder && G.order === 'clean' && t.b > 0 && !t.source && G.cleanTarget !== t.id && t.reg !== 5 && (G.banyans.includes(t.id) || (t.rooted && t.rs >= (G.unl.cleanRot2 ? 2 : 3)))) btns.push(['cleanTarget', '🧹 Banyan: clean this tile next', chipN('free')]);
  if (G.cutting) { const why = plantWhy(t); if (here && !why) btns.push(['plant', '🌳 Plant the cutting · a new banyan', chipT(1), '', 'plant']); else if (t.reg === 2 && t.state > 0) btns.push(['plant', '🌳 Plant the cutting', '', why || 'walk here first', 'plant']); }
  const sec = (ic, name, arr) => arr.length ? '<div class="sec"><div class="st">' + ic + ' ' + name + '</div>' + arr.map(l => '<p>' + l + '</p>').join('') + '</div>' : '';
  p.innerHTML = '<h3>' + title + '</h3><div class="hd">' + head + '</div>' + sec('⚔', 'Combat', combat) + sec('🌿', 'Roots & sap', roots) + sec('📜', 'Quest & story', quest) +
    (btns.length ? '<div class="sec"><div class="st">🛠 Actions</div>' + btns.map(b => '<button data-a="' + b[0] + '"' + (b[3] ? ' disabled' : '') + ' class="' + (b[4] === 'plant' ? 'bPlant' : '') + (!b[3] && G.kursHl === b[0] && (G.kursZ === t.id || b[0] === 'move' && G.kursZ === t.id) ? ' tutRing' : '') + '"><span class="bl">' + b[1] + (b[3] ? ' <i class="why">— ' + b[3] + '</i>' : '') + '</span>' + b[2] + '</button>').join('') + '</div>' : '');
  p.style.display = 'block'; fitPanel();
  if (G.targets.includes(t.id)) unlockRule('defence');
  if (G.targets.includes(t.id)) say1('defence', 'tortoise', 'Every rot tile next door is an arm: the strongest counts, each extra arm adds 1. Defence: root strength, +1 for each healthy rooted neighbour (up to 2), protection, a friend, you. Hold a line, not a dot. The banyan too.');
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
$('panel').addEventListener('click', e => { const b = e.target.closest('button'); if (b) act(b.dataset.a, G.sel); });
$('bEnd').onclick = () => SPIEL.endEbb();   // v030: one End ebb for beach and island
{ const ui = $('ui'), tr = document.createElement('button'); tr.id = 'bTree'; tr.textContent = '🌳 Banyan'; tr.onclick = () => { if (G.unl.listen) openTree(); else toast(T[G.banyan] && T[G.banyan].state > 0 ? 'Stand on the banyan and listen to it first (2 free Kinship).' : 'Find the banyan first.'); };
  ui.insertBefore(tr, $('bRules')); ui.insertBefore($('bBeach'), tr); ui.insertBefore($('bLedger'), $('bRules'));
  const mb = document.createElement('button'); mb.id = 'bMenu'; mb.textContent = '☰'; mb.title = 'Menu'; $('hTideP').appendChild(mb);
  mb.addEventListener('pointerdown', e => e.stopPropagation()); mb.onclick = e => { e.stopPropagation(); $('info').classList.toggle('open'); };
  const sp = $('info').querySelector('span'); if (sp) sp.classList.add('testonly'); $('scen').classList.add('testonly'); }   // v036
$('bBeach').onclick = () => { if (!SPIEL.zeige('strand')) toast(G.phase === 'ebb' ? 'Finish this first.' : 'Not during the flood.'); };
function copyText(txt, done) {   // same as the beach: clipboard API, else a hidden textarea + execCommand — never navigates away
  const fb = () => { const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove(); done(ok); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => done(true), fb); else fb();
}
G.scen = beachMode();   // v030: 'real' = the real beach; the SIM rows stay as a test switch
$('scen').value = G.scen;
$('scen').onchange = e => { G.scen = e.target.value; try { localStorage.setItem('robinson_beach_mode', e.target.value); } catch (_) {} toast(G.scen === 'real' ? 'Beach: the real one.' : 'Beach: simulated (' + G.scen + ') — test mode, no beach fights.'); };
$('bSnd').textContent = 'Sound: ' + (SND.on ? 'on' : 'off');
$('bSnd').onclick = e => { SND.on = !SND.on; try { localStorage.setItem('robinson_map_sound', SND.on ? 'on' : 'off'); } catch (_) {} e.target.textContent = 'Sound: ' + (SND.on ? 'on' : 'off'); if (SND.on) sndInit(); };
$('bRules').onclick = openRules;
$('rClose').onclick = () => $('rulesScr').style.display = 'none';
$('rTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) { ruleSel = b.dataset.r; openRules(); } });
function toast(msg) { const el = $('toast'); el.innerHTML = msg; el.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(() => el.style.opacity = 0, 3600); }
function banner(txt) { const el = $('banner'); el.textContent = txt; el.style.opacity = 1; clearTimeout(banner.t); banner.t = setTimeout(() => el.style.opacity = 0, 1500); }
let cardResolve = null;
function showCard(title, html, btn) { $('cardT').innerHTML = title; $('cardB').innerHTML = html; $('cardBtn').textContent = btn || 'OK'; $('card').style.display = 'flex'; }
function showCardWait(title, html, btn) { showCard(title, html, btn); return new Promise(r => cardResolve = r); }
$('cardBtn').onclick = () => { $('card').style.display = 'none'; if (G.tide >= 1 && $('cardT').textContent.startsWith('Beach report')) G.started = true; if (cardResolve) { const r = cardResolve; cardResolve = null; r(); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function addFloat(x, y, txt, col) { G.floats.push({ x, y, txt, col, t: 0 }); }

// ---------- the banyan screen: sap, priorities, production orders, unlocks as roots ----------
const UPOS = { elf: [.88, .2, 'listen'], listen: [.5, .3, null], rootOrder: [.27, .5, 'listen'], coarse: [.73, .5, 'listen'], tower: [.2, .74, 'listen'], tower2: [.1, .9, 'tower'], cleanRot: [.36, .62, 'listen'], cleanRot2: [.27, .9, 'cleanRot'], deepRoots: [.09, .6, 'rootOrder'], fine: [.53, .7, 'coarse'], ableger: [.8, .74, 'listen'] };   // v056: the Dream's hierarchy — the Orders hang on Listen
let treeSelU = null;
function openTree() { if (!G.unl.listen) return; G.treeSeen = true; $('treeScr').style.display = 'flex'; renderTree(); }
$('tClose').onclick = () => { $('treeScr').style.display = 'none'; renderPanel(); updateHUD(); };
function orderNeed() { return G.order === 'tower' || G.order === 'tower2' ? RULES.towerSap : G.order === 'ableger' ? RULES.ablegerSap : G.order === 'clean' ? RULES.cleanSap : RULES.sapPerRoot; }
function renderTree() {
  $('treeScr').classList.toggle('elf', !!G.fi);
  const wt = workedTiles().length;
  $('tTop').innerHTML = '<span>🌳 <b>Level ' + G.blevel + '</b> · works ' + wt + ' tile' + (wt === 1 ? '' : 's') + ' (one per level, best first)</span>' +
    '<span class="gold">Kinship ' + G.wFree + ' free</span>';
  let c = '<span>Sap split:</span>';
  if (G.unl.fine) [1, .75, .5, .25, 0].forEach(v => { c += '<button data-p="' + v + '" class="' + (G.prio === v ? 'on' : '') + '">' + Math.round(v * 100) + '% grow</button>'; });
  else if (G.unl.coarse) [[1, 'All growth'], [.5, 'Balanced'], [0, 'All production']].forEach(([v, n]) => { c += '<button data-p="' + v + '" class="' + (G.prio === v ? 'on' : '') + '">' + n + '</button>'; });
  else c += '<span><i>half growth, half production — learn a priority to change it</i></span>';
  c += '<span style="margin-left:10px">Order:</span><button data-o="roots" class="' + (G.order === 'roots' ? 'on' : '') + '">🌿 Roots</button>';
  if (G.unl.tower) c += '<button data-o="tower" class="' + (G.order === 'tower' ? 'on' : '') + '"' + (G.tower ? ' disabled' : '') + '>🗼 Beach tower' + (G.tower ? ' ✓' : G.towerPaid ? '' : ' · 30 💚') + '</button>';
  if (G.unl.tower2) c += '<button data-o="tower2" class="' + (G.order === 'tower2' ? 'on' : '') + '"' + (G.tower2 || !G.tower ? ' disabled' : '') + '>🗼 Tower II' + (G.tower2 ? ' ✓' : !G.tower ? ' (needs the tower)' : G.tower2Paid ? '' : ' · 30 💚') + '</button>';   // v043
  if (G.unl.cleanRot) c += '<button data-o="clean" class="' + (G.order === 'clean' ? 'on' : '') + '">🧹 Clean rot</button>';
  if (G.unl.ableger) c += '<button data-o="ableger" class="' + (G.order === 'ableger' ? 'on' : '') + '"' + (G.cutting || G.blevel < 2 ? ' disabled' : '') + '>🌱 Offshoot' + (G.blevel < 2 ? ' (needs level 2)' : G.cutting ? ' (carry the cutting)' : '') + '</button>';
  $('tCtl').innerHTML = c;
  // the next root, chosen by the banyan until Crusoe learns to point
  const nr = nextRoot(), F = flowData();
  let nx;
  if (G.order === 'clean') { const cp = cleanPick(); nx = cp ? '<span>🧹 <b>Next clean: ' + cp.name + '</b> (rot ' + cp.b + '→' + (cp.b - 1) + ') · ' + whenTxt(floodsTo(G.sapProd, RULES.cleanSap, F.prod)) + ' · ' + (G.cleanTarget === cp.id ? '<span class="gold">your choice</span>' : 'the banyan\'s choice: itself first, then rot 3 on roots, then the front') + '</span>' : '<span class="bad">⚠ Nothing to clean: only tree tiles and full roots (3)' + (G.unl.cleanRot2 ? ' or 2' : '') + ' count. Production goes nowhere.</span>'; }
  else if (G.order !== 'roots') nx = '<span>Production goes to the ' + (G.order === 'tower' ? 'beach tower' : G.order === 'tower2' ? 'second ring of the tower' : 'offshoot') + ' — no new roots until it\'s done.</span>';
  else if (!nr) nx = '<span>Every root is at full strength. Plant more.</span>';
  else nx = '<span>▲ <b>Next root: ' + nr.name + '</b> (' + nr.rs + '→' + (nr.rs + 1) + ') · ' + whenTxt(floodsTo(G.sapProd, RULES.sapPerRoot, F.prod)) + ' · ' +
    (G.rootTarget === nr.id ? '<span class="gold">your choice</span>' : 'chosen by the banyan: front line first' + (G.unl.rootOrder ? '' : ' (learn Root order to point)')) + '</span> <button id="tShow">Show on map</button>';
  $('tNext').innerHTML = drohBlock() + ordBlock() + ernteBlock() + nx;   // v061: the current order gets room, and the harvest is shown
  if ($('tShow')) $('tShow').onclick = () => { $('treeScr').style.display = 'none'; G.sel = nr.id; G.ping = { id: nr.id, t: G.now }; renderPanel(); updateHUD(); };
  drawFlow(); traumHinweis();
}
// v061: the current order as its own block — what is being built, how far, what it brings
const ORD_INFO = {
  roots: ['🌿', 'Roots', 'Production sap strengthens your roots, one step for every ' + RULES.sapPerRoot + ' sap. Stronger roots hold their tile better and the banyan reaches further.'],
  tower: ['🗼', 'Beach tower', 'A thorn tower on Crab Beach (' + RULES.towerSap + ' sap). When it stands it does your beach chores with your leftover beach hours: crabs, coconuts, rum for the tortoise — Silver on the compass.'],
  tower2: ['🗼', 'Tower II', 'A second ring (' + RULES.towerSap + ' sap). Then the tower also rides beach waves up to two stages past your own last ride, at about 70 % of your haul — it can lose, your upgrades set the odds. Gold on the compass.'],
  clean: ['🧹', 'Clean rot', 'Production sap scrubs rot: ' + RULES.cleanSap + ' sap for −1 rot — the banyan first, then rot 3 on your roots, then the front.'],
  ableger: ['🌱', 'Offshoot', 'A living branch (' + RULES.ablegerSap + ' sap, the banyan shrinks a level). Carry the cutting up the cliffs and plant it: a second banyan that works its own tiles.']
};
function drohBlock() {   // v061: the threat ring explained
  const L = threatLevel(), why = ['No strikes on your tiles this flood.', 'The rot probes your edges — single strikes.', 'Several strikes on your roots, or on the banyan itself.', 'The Board\'s offensive: more spearheads, armies marching.', 'One more successful hit and the island falls.'][L];
  return '<div class="drohBlk"><span class="drohRing">' + THREAT.map(([n, c], i) => '<i style="background:' + (i <= L ? c : '#d8cdb4') + '" title="' + n + '"></i>').join('') + '</span> <b>Threat: ' + THREAT[L][0] + '</b> <small>· ' + why + ' The ring around the banyan button shows it at a glance.</small></div>';
}
function ordBlock() {
  const o = ORD_INFO[G.order] || ORD_INFO.roots, need = orderNeed(), have = Math.min(need, G.sapProd), pc = Math.round(100 * have / Math.max(1, need));
  return '<div class="ordBlk"><span class="ordIc">' + o[0] + '</span><div><b>Building now: ' + o[1] + '</b> <small>' + (Math.round(have * 10) / 10) + ' / ' + need + ' sap</small><div class="ordBar"><i style="width:' + pc + '%"></i></div><small>' + o[2] + '</small></div></div>';
}
function ernteBlock() {
  const h = ernte(), n = T.filter(t => t.rooted && t.content && t.content.kind === 'res').length; if (!n && !G.res.fruit && !G.res.coco) return '';
  return '<div class="ernBlk">🧺 <b>Your roots harvest every flood:</b> ' + (h.fruit ? '🍞 +' + h.fruit + ' ' : '') + (h.coco ? '🥥 +' + h.coco + ' ' : '') + (!h.fruit && !h.coco ? '<span class="bad">nothing — the food tiles are rotten or not rooted</span>' : '') + ' <small>· from ' + n + ' rooted food tile' + (n === 1 ? '' : 's') + ' (+1 each, +1 more if protected) · and ~' + r1(sapEstimate()) + ' sap from the tiles the banyan works</small></div>';
}
// v056: what the banyan could learn now lives in the Dream — here only a hint and the way there
function traumHinweis() {
  const ns = UNLOCKS.map(islandNode), ok = ns.filter(n => n.state === 'buy'), poor = ns.filter(n => n.state === 'poor').sort((a, b) => a.cost - b.cost);
  $('tDreamHint').innerHTML = ok.length ? '<b>' + ok.length + ' lesson' + (ok.length > 1 ? 's' : '') + '</b> you could teach the banyan now — in your Dream.' : poor.length ? 'Next lesson in your Dream: <b>' + poor[0].name + '</b> · ' + poor[0].cost + ' free Kinship (you have ' + G.wFree + ').' : 'Your Dream shows what the banyan has learned.';
  $('tDream').classList.toggle('ready', ok.length > 0);
}
$('tDream').onclick = () => TRAUM.zeigen();
// sap flow: sources → total → split → growth / production, stream width ∝ sap, with a preview of the next flood
function drawFlow() {
  const cv = $('tFlow'), dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const F = flowData(), now = performance.now() / 1000, z = Math.min(1.15, Math.max(.7, Math.min(h / 300, w / 460)));
  const font = (n, b) => (b ? '600 ' : '400 ') + Math.round(n * z) + "px 'Fredoka',system-ui";
  let rows = F.src.filter(x => !x.hand);
  if (rows.length > 7) { const rest = rows.slice(6); rows = rows.slice(0, 6); rows.push({ name: '+' + rest.length + ' more', icon: '🌿', v: rest.reduce((a, x) => a + x.v, 0) }); }
  rows.push(F.src.find(x => x.hand));
  const srcR = Math.min(w * .30, 130 * z), nodeX = w * .40, nodeY = h * .5, divX = w * .50, barX = w * .58, barW = w - barX - 12 * z, gY = h * .24, pY = h * .68;
  const u = Math.min(4.5 * z, 30 * z / Math.max(1, F.est)), Tw = Math.max(3, F.est * u);
  c.textBaseline = 'middle'; c.lineCap = 'butt';
  c.fillStyle = '#7a5a32'; c.font = font(11, true); c.textAlign = 'left'; c.fillText('SOURCES', 8, 10 * z);
  const step = Math.min(30 * z, (h * .78) / Math.max(1, rows.length - 1)), y0 = nodeY - step * (rows.length - 1) / 2;
  const flowLine = (pts, wd, col) => { c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); c.moveTo(pts[0], pts[1]); c.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); c.stroke();
    if (wd > 2) { c.save(); c.strokeStyle = 'rgba(255,255,240,.55)'; c.lineWidth = Math.min(2, wd * .3); c.setLineDash([2, 9]); c.lineDashOffset = -now * 24; c.stroke(); c.restore(); } };
  let cum = 0;
  rows.forEach((r, i) => {
    const y = y0 + step * i, on = r.v > 0;
    c.globalAlpha = on ? 1 : .45; c.fillStyle = '#3b2a1a'; c.font = font(12); c.textAlign = 'left';
    let label = r.icon + ' ' + r.name; while (c.measureText(label).width > srcR - 34 * z && label.length > 4) label = label.slice(0, -2) + '…';
    c.fillText(label, 8, y); c.font = font(12, true); c.textAlign = 'right'; c.fillStyle = r.hand ? '#a8801a' : '#2f6f26'; c.fillText('+' + r.v, srcR, y);
    if (on) { const wd = Math.max(1.5, r.v * u), ty = nodeY - Tw / 2 + cum + r.v * u / 2; cum += r.v * u; flowLine([srcR + 4, y, (srcR + nodeX) / 2, y, (srcR + nodeX) / 2, ty, nodeX, ty], wd, r.hand ? '#e0b23a' : '#5aa83a'); }
    else if (r.hand) { c.font = font(10); c.textAlign = 'left'; c.fillStyle = '#7a5a32'; c.fillText(stageIdx() ? 'stand on healthy roots at flood' : 'grows with Kinship (from Castaway)', 8, y + 12 * z); }
    c.globalAlpha = 1;
  });
  // main stream to the split
  c.fillStyle = '#5aa83a'; c.fillRect(nodeX, nodeY - Tw / 2, divX - nodeX, Tw);
  const gw = F.grow * u, pw = F.prod * u;
  if (F.grow > 0) flowLine([divX, nodeY - Tw / 2 + gw / 2, (divX + barX) / 2, nodeY - Tw / 2 + gw / 2, (divX + barX) / 2, gY + 7 * z, barX, gY + 7 * z], Math.max(1.5, gw), '#4f9a3a');
  if (F.prod > 0) flowLine([divX, nodeY + Tw / 2 - pw / 2, (divX + barX) / 2, nodeY + Tw / 2 - pw / 2, (divX + barX) / 2, pY + 7 * z, barX, pY + 7 * z], Math.max(1.5, pw), '#a8743a');
  // total node and split
  const nr = Math.max(17 * z, Tw / 2 + 6);
  c.fillStyle = '#3f8a33'; c.beginPath(); c.arc(nodeX, nodeY, nr, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#2b5a22'; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#fff6e3'; c.font = font(13, true); c.textAlign = 'center'; c.fillText(r1(F.est) + '', nodeX, nodeY - 4 * z); c.font = font(9); c.fillText('sap', nodeX, nodeY + 8 * z);
  c.textAlign = 'right'; c.fillStyle = '#3b2a1a'; c.font = font(10, true); c.fillText('split', divX - 2, nodeY - Tw / 2 - 19 * z);
  c.font = font(12, true); c.fillStyle = '#2f6f26'; c.fillText(Math.round(G.prio * 100) + '% grow', divX - 2, nodeY - Tw / 2 - 7 * z);
  c.fillStyle = '#8a5a2a'; c.fillText(Math.round((1 - G.prio) * 100) + '% produce', divX - 2, nodeY + Tw / 2 + 9 * z);
  // bars with preview
  const blink = .5 + .5 * Math.sin(now * 7);
  const bar = (y, title, have, need, add, col, overTxt, etaTxt) => {
    const bh = 14 * z, f = Math.min(1, have / need), f2 = Math.min(1, (have + add) / need);
    const nums = Math.floor(have) + '/' + need + (add > 0 ? '  +' + r1(add) : '');
    c.font = font(12); const nw = c.measureText(nums).width; c.textAlign = 'right'; c.fillStyle = '#3b2a1a'; c.fillText(nums, barX + barW, y - 10 * z);
    c.textAlign = 'left'; c.font = font(13, true); let tt = title; while (c.measureText(tt).width > barW - nw - 8 && tt.length > 3) tt = tt.slice(0, -2) + '…'; c.fillText(tt, barX, y - 10 * z);
    c.fillStyle = '#e3cfa6'; roundRect(c, barX, y, barW, bh, bh / 2); c.fill();
    c.save(); roundRect(c, barX, y, barW, bh, bh / 2); c.clip();
    c.fillStyle = col; c.fillRect(barX, y, barW * f, bh);
    if (f2 > f) { c.globalAlpha = .38; c.fillRect(barX + barW * f, y, barW * (f2 - f), bh); c.globalAlpha = .6; c.strokeStyle = '#fff'; c.setLineDash([3, 3]); c.lineWidth = 1; c.strokeRect(barX + barW * f + .5, y + .5, barW * (f2 - f) - 1, bh - 1); c.setLineDash([]); c.globalAlpha = 1; }
    c.restore();
    if (overTxt) { c.strokeStyle = 'rgba(255,200,40,' + (.4 + .6 * blink) + ')'; c.lineWidth = 3; c.beginPath(); c.moveTo(barX + barW - 1, y - 3); c.lineTo(barX + barW - 1, y + bh + 3); c.stroke();
      c.fillStyle = 'rgba(160,100,10,' + (.6 + .4 * blink) + ')'; c.font = font(12, true); c.textAlign = 'right'; c.fillText(overTxt, barX + barW, y + bh + 12 * z); }
    c.textAlign = 'left'; c.fillStyle = '#7a5a32'; c.font = font(12); c.fillText(etaTxt, barX, y + bh + 12 * z);
  };
  const need = growthNeed(), gn = floodsTo(G.sapGrow, need, F.grow);
  bar(gY, '🌳 Growth', G.sapGrow, need, F.grow, '#4f9a3a', G.sapGrow + F.grow >= need ? '→ Level ' + (G.blevel + 1) : '', F.grow > 0 ? 'Level ' + (G.blevel + 1) + ' ' + whenTxt(gn) : 'no sap goes to growth');
  const on = orderNeed(), pn = floodsTo(G.sapProd, on, F.prod);
  let over = '', eta;
  if (G.order === 'roots') { const k = Math.min(4, Math.floor((G.sapProd + F.prod) / on)); if (k) over = '→ +' + k + ' root' + (k > 1 ? 's' : ''); eta = F.prod > 0 ? 'next root ' + whenTxt(pn) : 'no sap goes to production'; }
  else if (G.order === 'tower' || G.order === 'tower2') { if (G.sapProd + F.prod >= on) over = '→ tower'; eta = (G.order === 'tower2' ? 'tower II ' : 'tower ') + whenTxt(pn); }
  else if (G.order === 'clean') {   // v024: the banyan scrubs BEFORE this flood's sap arrives — only stored sap counts
    const k = Math.min(RULES.cleanMax, Math.floor(G.sapProd / on)), cw = G.sapProd >= on ? 1 : floodsTo(G.sapProd, on, F.prod) + 1; if (k) over = '→ −' + k + ' rot';
    eta = cleanPick() ? 'next clean ' + whenTxt(cw) + ' (before the strikes)' : '⚠ nowhere to go: nothing to clean'; }
  else { if (G.sapProd + F.prod >= on) over = '→ cutting'; eta = 'cutting ' + whenTxt(pn); }
  const stuck = prodStuck();
  if (stuck && G.order === 'roots') { over = ''; eta = '⚠ nowhere to go: all roots at cap'; } else if (stuck) over = '';
  bar(pY, '🛠 Production · ' + { roots: 'roots', tower: 'beach tower', tower2: 'tower II', ableger: 'offshoot', clean: 'clean rot' }[G.order], G.sapProd, on, F.prod, stuck ? '#c0392b' : '#a8743a', over, eta);
  if (stuck) { c.fillStyle = '#b0351c'; c.font = font(11, true); c.textAlign = 'left';
    const L = G.order === 'clean' ? ['Only trees and roots of strength ' + (G.unl.cleanRot2 ? 2 : 3), 'can be scrubbed. Strengthen one.'] : G.order === 'roots' ? ['All roots are at their cap.', 'Plant by hand, or switch the order.'] : ['Plant roots, switch the order', 'or shift the split to growth.'];
    c.fillText(L[0], barX, pY + 40 * z); c.fillText(L[1], barX, pY + 54 * z); }
  if (G.friends.banyan && T[G.banyan].b > 0) { c.fillStyle = '#b0351c'; c.font = font(11, true); c.textAlign = 'left'; c.fillText('Banyan tile rotting (rot ' + T[G.banyan].b + '): its own sap is lost' + (nestFeeding(G.banyan) ? ', and a nest feeds it +1 every flood.' : '.'), 8, h - 22 * z); }
  { c.fillStyle = '#7a5a32'; c.font = font(10); c.textAlign = 'left'; c.fillText('faded part of a bar = what the next flood adds', 8, h - 8 * z); }
}
$('tCtl').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.p !== undefined) G.prio = +b.dataset.p;
  if (b.dataset.o) {
    const o = b.dataset.o;
    if (o === 'tower2' && !G.tower2Paid) {   // v043: the second ring, paid like the first
      if (!G.tower) { toast('Grow the beach tower first.'); return; }
      if (!spendGreen(RULES.towerGreen)) return;
      G.tower2Paid = true; say1('tower2Start', 'briefcase', 'Another thirty for a second ring. Automation capex. The beach will run itself.');
    }
    if (o === 'tower' && !G.towerPaid) {
      if (!T[G.start].rooted) { toast('Crab Beach needs roots first.'); return; }
      if (!spendGreen(RULES.towerGreen)) return;
      G.towerPaid = true; say1('towerStart', 'briefcase', 'Thirty hearts for a tower of thorns. Defensive capex. Sound.');
    }
    G.order = o;
  }
  renderTree(); updateHUD();
});
// v034: every unlock as a node — the same model as the ledger's, so the elf tree can hold both
function islandNode(u) {
  const own = !!G.unl[u.id], par = UPOS[u.id][2], parOwn = !par || G.unl[par], gp = par && UPOS[par][2], needCase = u.id === 'elf' && (!G.caseFound || G.fiWipe === undefined);   // v037: the elf shows once the wipe memo is out
  const state = own ? 'max' : u.later ? 'locked' : needCase ? 'hidden' : u.id === 'listen' && !G.friends.banyan && !(G.at === G.banyan && G.phase === 'ebb') ? 'hidden' : parOwn ? (G.wFree >= u.cost ? 'buy' : 'poor') : (!gp || G.unl[gp]) ? 'locked' : 'hidden';
  return { id: u.id, welt: 'insel', name: u.name, desc: u.desc, grp: BAUM_GRP[u.id] || 'sap', cur: 'wandel', lvl: own ? 1 : 0, max: 1, cost: u.cost, have: G.wFree, p: par || 'fi', state };
}
function drawTreeRoots() {
  const cv = $('tCv'), dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'), t = performance.now() / 1000; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  ELFENBAUM.zeichnen(c, w, h, t, G.fi ? SPIEL.baum() : UNLOCKS.map(islandNode), treeSelU);   // v037: the banyan's tree is drawn like the elf tree (v034: with Fi, ledger and banyan are one tree)
}
function renderTreeInfo() {
  const b = $('tiBuy'), n = treeSelU && (G.fi ? SPIEL.baum() : UNLOCKS.map(islandNode)).find(x => x.id === treeSelU);
  if (!n) { $('tiN').textContent = G.fi ? 'One tree now: above the ground, round Fi, what the stamp and the cat can learn; below it the banyan\'s roots.' : 'Below the ground, the banyan\'s roots: what the tree can learn. Each costs free Kinship.'; b.style.display = 'none'; return; }
  const hid = n.state === 'hidden', parN = n.p && n.p !== 'fi' && (G.fi ? SPIEL.baum() : UNLOCKS.map(islandNode)).find(x => x.id === n.p);
  $('tiN').innerHTML = hid ? '<b>Something in the dark</b> — not yet.' : '<b>' + n.name + '</b> — ' + n.desc + (n.state === 'max' ? ' <i>(learned)</i>' : n.state === 'locked' && parN ? ' <i>(learn ' + parN.name + ' first)</i>' : '');
  b.style.display = hid || !n.cur || n.state === 'max' || UNLOCKS.some(u => u.id === n.id && u.later) ? 'none' : 'inline-block';
  b.textContent = (n.cur === 'wandel' ? 'Learn · ' + n.cost + ' free Kinship' : BAUM_CUR[n.cur] + ' ' + n.cost) + ' (you have ' + n.have + ')'; b.disabled = n.state !== 'buy' && n.next !== 'buy';   // v033: have / need
}
if ($('tCv')) $('tCv').addEventListener('pointerdown', e => {
  const cv = $('tCv'), r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  treeSelU = ELFENBAUM.treffer(cv.clientWidth, cv.clientHeight, x, y, G.fi ? SPIEL.baum() : UNLOCKS.map(islandNode)); renderTree();
});
function lerneUnlock(id) {
  const u = UNLOCKS.find(x => x.id === id); if (!u || islandNode(u).state !== 'buy') return false;
  G.wFree -= u.cost; G.unl[u.id] = true; if (u.id === 'listen') { befreunden(false); }   // v060: listening is the friendship
  const lines = { listen: 'It talks. Slowly, through me. Its screen is open now — the sap, the growth, the tiles it works. Tap the banyan.', rootOrder: 'Now you can point. Tap a rooted tile and ask for that root next.', coarse: 'All growth, or all roots. It listens. Mostly.', tower: 'A tower for the beach. It wants hearts to start and sap to grow.', tower2: 'A second ring. Then the beach runs without you — the bits you already mastered.', fine: 'Quarter steps. You really are an accountant.', ableger: 'An offshoot costs the old tree a level. Big decisions, small saplings.', cleanRot: 'It can scrub now. Slowly, expensively, and without getting its feet wet. Unlike you.', cleanRot2: 'Weaker roots, still worth saving. It agrees, grudgingly.', deepRoots: 'It digs deeper. Further. Older than the island\'s grudges.' };
  if (u.id === 'tower') prio('tortoise', 'A tower for the beach', 'A thorn tower on Crab Beach. It will tend the beach for you — coconuts, crabs, rum for me.\nWhat it takes: roots on Crab Beach first, then 30 💚 to start it, then 24 production sap. Set the order here, in the banyan.', { must: true, key: 'towerQuest', ill: 'tower', valid: () => !G.tower });
  else if (u.id === 'elf') { $('treeScr').style.display = 'none'; fiVerwandlung(); }
  else if (lines[u.id]) say('tortoise', lines[u.id]);
  renderTree(); updateHUD(); return true;
}
if ($('tiBuy')) $('tiBuy').onclick = () => { if (!treeSelU) return; if (G.fi) SPIEL.baumKauf(treeSelU); else lerneUnlock(treeSelU); renderTree(); updateHUD(); };
setInterval(() => { if ($('treeScr').style.display === 'flex') drawFlow(); }, 120);
window.addEventListener('resize', () => { if ($('treeScr').style.display === 'flex') drawFlow(); });

// ############################ Karte ############################
// ---------- animation layer ----------
const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const env = u => { const s = Math.sin(u * Math.PI); return s * s; };          // smooth 0→1→0 fade, no pops
function setupAnim(r) {
  // pools of water positions: deep sea for wavelets, any water for sun glints (denser in the glare band)
  for (let k = 0; k < 9000 && anim.deep.length < 900; k++) { const fx = r(), fy = .03 + r() * .94; if (atf(fx, fy) < -.17) anim.deep.push([fx, fy]); }
  for (let k = 0; k < 20000 && anim.water.length < 1400; k++) {
    const fx = r(), fy = .03 + r() * .94, h = atf(fx, fy); if (h > -.01) continue;
    const glare = Math.exp(-Math.pow((fx - .78) / .22, 2) - Math.pow((fy - .2) / .18, 2));
    if (r() < .25 + glare * .75) anim.water.push([fx, fy, glare, -h]);
  }
  for (let k = 0; k < 70; k++) anim.wavelets.push({ P: 6 + r() * 6, o: r() * 50, w: 9 + r() * 16, tint: (r() * 3) | 0, id: k * 13.7 });
  for (let k = 0; k < 90; k++) anim.glints.push({ P: 1.4 + r() * 2.2, o: r() * 20, id: k * 7.3, s: 1.5 + r() * 2.5 });
  // open-sea wavelets: stylised curls drifting slowly
  let tries = 0;

  // riptide: bigger curls off the cove
  for (let k = 0; k < 14; k++) {
    const fx = LM.riptide[0] + (r() - .5) * .32, fy = LM.riptide[1] + (r() - .5) * .08;
    if (atf(fx, fy) > -.14) continue;
    anim.curls.push({ fx, fy, w: 18 + r() * 22, ph: r() * 6.28 });
  }
  for (let k = 0; k < 11; k++) anim.birds.push({ a: r() * 6.28, rr: 40 + r() * 55, sp: .12 + r() * .12, h: 25 + r() * 40, fl: r() * 6.28, s: 3 + r() * 2.5 });
  { const r2 = mulberry(4242); for (let k = 0; k < 90; k++) anim.wavelets.push({ P: 4 + r2() * 4, o: r2() * 50, w: 11 + r2() * 20, tint: (r2() * 3) | 0, id: 900 + k * 17.3, extra: true }); }
  for (let k = 0; k < 5; k++) anim.bats.push({ a: r() * 6.28, rr: 10 + r() * 14, sp: .9 + r() * .8, h: 14 + r() * 16 });
}
function drawAnim(t) {
  const c = mainCtx, sea = G.seaVis || 0;
  // coastal surf: foam fronts roll out from the shore, white turning aqua, with soft fade in and out
  const FOAM = ['#ffffff', '#e4fbf6', '#bff3ec', '#9fe9e4'];
  for (let pass = 0; pass < 2; pass++) {
    for (const p of anim.coast) {
      const q = ((t * .11 + p.ph * .22 + pass * .5 + p.rp * .08) % 1 + 1) % 1;
      const e = Math.min(1, env(q) * (p.cliff ? .75 : .55) * (1 + 1.6 * sea));
      if (e < .03) continue;
      const off = q * (p.cliff ? 3 : 6) * (1 + 1.4 * sea), [px, py] = proj(p.x + p.nx * off, p.y + p.ny * off, 0);
      c.globalAlpha = e; c.fillStyle = FOAM[Math.min(3, (q * 4) | 0)]; c.fillRect(px - .4, py, 2.6 + sea, 1.4 + sea * .6);
    }
  }
  // v040: the rising flood — the water line creeps up the beaches, swell rolls in from the open sea, at tide 0 the surf pulses
  if (sea > .02) {
    const pulse = 1 + .35 * (G.surge || 0) * Math.sin(t * 3.2);
    for (const p of anim.coast) {
      if (p.cliff) continue;
      const inl = 5 * sea * pulse;
      c.globalAlpha = .32 * sea; c.fillStyle = '#3a8fb8';
      for (let k = 1; k <= 3; k++) { const [wx, wy] = proj(p.x - p.nx * inl * k / 3, p.y - p.ny * inl * k / 3, 0); c.fillRect(wx - 1, wy - .6, 3.2, 2); }
      const [fx, fy] = proj(p.x - p.nx * inl, p.y - p.ny * inl, 0); c.globalAlpha = .55 * sea; c.fillStyle = '#e8fbf7'; c.fillRect(fx - .6, fy, 2.4, 1.2);
    }
    for (const p of anim.coast) {
      if (p.rp > .35) continue;
      const q = ((t * .07 + p.ph * .05) % 1 + 1) % 1, d = 34 - q * 30, a = Math.sin(q * Math.PI) * .55 * sea;
      if (a < .03) continue;
      const [sx, sy] = proj(p.x + p.nx * d, p.y + p.ny * d, 0); c.globalAlpha = a; c.fillStyle = '#ffffff'; c.fillRect(sx - 2, sy, 5, 1.2);
    }
    c.globalAlpha = 1;
  }
  // reef surf: crests travel along the reef and fade smoothly
  c.fillStyle = '#ffffff';
  for (const p of anim.surf) {
    const w = .5 + .5 * Math.sin((G.sph || t) * .8 + p.x * .045 + p.y * .03), a = Math.min(1, w * w * w * .6 * (1 + sea));
    if (a < .03) continue;
    c.globalAlpha = a; const [px, py] = proj(p.x, p.y, 0); c.fillRect(px, py, 2.4, 1.6);
  }
  c.globalAlpha = 1;
  // shallow-water shimmer: slow light bands drifting through lagoon and cove
  c.globalCompositeOperation = 'lighter';
  for (const [fx, fy, w] of [[LM.lagoon[0], LM.lagoon[1], 70], [LM.bay[0], LM.bay[1] + .01, 40]]) {
    const [px, py] = pf(fx, fy);
    for (let k = 0; k < 3; k++) {
      const u = ((t * .07 + k / 3) % 1), x = px - w + u * w * 2, a = env(u) * .10;
      const g = c.createRadialGradient(x, py + (k - 1) * 8, 0, x, py + (k - 1) * 8, w * .5);
      g.addColorStop(0, 'rgba(210,255,245,' + a + ')'); g.addColorStop(1, 'rgba(210,255,245,0)');
      c.fillStyle = g; c.fillRect(x - w * .5, py - w * .5 + (k - 1) * 8, w, w);
    }
  }
  c.globalCompositeOperation = 'source-over';
  // open-sea wavelets: each lives one cycle (fade in, drift, fade out) then reappears elsewhere
  const WT = [[232, 250, 255], [175, 240, 235], [150, 215, 245]];
  c.lineCap = 'round';
  const nExtra = Math.floor(90 * sea);
  for (const w of anim.wavelets) {
    if (w.extra && w.id >= 900 + nExtra * 17.3) continue;
    const tt = t + w.o, cyc = Math.floor(tt / w.P), u = tt / w.P - cyc;
    const pt = anim.deep[(hash(cyc + w.id) * anim.deep.length) | 0]; if (!pt) continue;
    const a = env(u) * .42 * (.7 + .6 * sea), [px0, py] = pf(pt[0], pt[1]), px = px0 + (u - .5) * 14, ww = w.w * (.7 + .3 * env(u));
    const col = WT[w.tint];
    c.strokeStyle = 'rgba(10,70,105,' + a * .6 + ')'; c.lineWidth = 1.6;            // dark trough under the crest
    c.beginPath(); c.moveTo(px - ww, py + 1.6); c.quadraticCurveTo(px - ww * .3, py - 2.4, px, py + .6); c.quadraticCurveTo(px + ww * .3, py + 3.6, px + ww * .6, py + .6); c.stroke();
    c.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + a + ')'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(px - ww, py); c.quadraticCurveTo(px - ww * .3, py - 4, px, py - 1); c.quadraticCurveTo(px + ww * .3, py + 2, px + ww * .6, py - 1); c.stroke();
  }
  for (const w of anim.curls) {
    const u = ((t * .09 + w.ph) % 1), a = env(u) * .5;
    const [px0, py] = pf(w.fx, w.fy), px = px0 + (u - .5) * 26;
    c.strokeStyle = 'rgba(10,70,105,' + a * .5 + ')'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(px - w.w, py + 2); c.quadraticCurveTo(px, py - 5, px + w.w * .6, py + 1); c.stroke();
    c.strokeStyle = 'rgba(225,248,255,' + a + ')'; c.lineWidth = 1.7;
    c.beginPath(); c.moveTo(px - w.w, py); c.quadraticCurveTo(px, py - 7, px + w.w * .6, py - 1); c.quadraticCurveTo(px + w.w * .9, py + 2, px + w.w * .6, py + 5); c.stroke();
  }
  // sun glints: little star sparkles, most of them in the glare band
  c.globalCompositeOperation = 'lighter';
  for (const g of anim.glints) {
    const tt = t + g.o, cyc = Math.floor(tt / g.P), u = tt / g.P - cyc;
    const pt = anim.water[(hash(cyc * 3.1 + g.id) * anim.water.length) | 0]; if (!pt) continue;
    const e = Math.pow(Math.sin(u * Math.PI), 4) * (.45 + .55 * pt[2]); if (e < .03) continue;
    const [px, py] = pf(pt[0], pt[1]), s = g.s * (.6 + .6 * e) * (pt[3] < .05 ? .7 : 1);
    c.fillStyle = 'rgba(255,250,225,' + e + ')';
    c.fillRect(px - s, py - .35, s * 2, .7); c.fillRect(px - .35, py - s * .7, .7, s * 1.4);
    c.fillStyle = 'rgba(255,255,255,' + e * .9 + ')'; c.fillRect(px - .7, py - .7, 1.4, 1.4);
  }
  c.globalCompositeOperation = 'source-over';
  // crater & lava glow, gently pulsing
  if (anim.crater) {
    const [cx, cy] = anim.crater, pulse = .45 + .18 * Math.sin(t * 1.3);
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, 46); g.addColorStop(0, 'rgba(255,140,40,' + pulse + ')'); g.addColorStop(1, 'rgba(255,90,20,0)');
    c.fillStyle = g; c.fillRect(cx - 50, cy - 50, 100, 100);
    for (let k = 0; k <= 8; k++) {
      const [qx, qy] = pf(lerp(VX + .04, VX + .14, k / 8), lerp(VY - .035, VY - .16, k / 8));
      const gg = c.createRadialGradient(qx, qy, 0, qx, qy, 14), pa = .18 + .12 * Math.sin(t * 2 - k * .7);
      gg.addColorStop(0, 'rgba(255,110,30,' + pa + ')'); gg.addColorStop(1, 'rgba(255,110,30,0)');
      c.fillStyle = gg; c.fillRect(qx - 15, qy - 15, 30, 30);
    }
    c.globalCompositeOperation = 'source-over';
    // smoke: puffs rise, drift east and fade, looping
    for (let k = 0; k < 12; k++) {
      const q = ((t * .045 + k / 12) % 1), r = 8 + q * 64;
      const sx = cx + q * 120 + Math.sin(q * 6 + k) * 8, sy = cy - 22 - q * 210;
      const a = Math.sin(Math.min(1, q * 6) * Math.PI / 2) * (1 - q) * .75;
      const sg = c.createRadialGradient(sx, sy, 0, sx, sy, r); sg.addColorStop(0, 'rgba(240,236,230,' + a + ')'); sg.addColorStop(1, 'rgba(240,236,230,0)');
      c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.fill();
    }
  }
  // seabirds circling over the booby rocks
  const [bx, by] = pf(LM.birds[0], LM.birds[1]);
  c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 1.4;
  for (const b of anim.birds) {
    const a = b.a + t * b.sp, x = bx + Math.cos(a) * b.rr, y = by - b.h + Math.sin(a) * b.rr * .35, f = Math.sin(t * 5 + b.fl) * .6, s = b.s;
    c.beginPath(); c.moveTo(x - s, y - f * s); c.quadraticCurveTo(x - s / 2, y - s * .7, x, y); c.quadraticCurveTo(x + s / 2, y - s * .7, x + s, y - f * s); c.stroke();
  }
  // bats fluttering at the cave mouth
  const [vx, vy] = pf(LM.cave[0], LM.cave[1]);
  c.fillStyle = '#1a1414';
  for (const b of anim.bats) {
    const a = b.a + t * b.sp, x = vx + Math.cos(a) * b.rr, y = vy - b.h + Math.sin(a * 1.7) * 5, f = Math.sin(t * 14 + b.a) * 2;
    c.beginPath(); c.moveTo(x - 4, y - f); c.quadraticCurveTo(x - 2, y - 2.5, x, y); c.quadraticCurveTo(x + 2, y - 2.5, x + 4, y - f); c.quadraticCurveTo(x, y + 1.2, x - 4, y - f); c.fill();
  }
}
function vignette(c) {   // v040: on the whole screen; it darkens as the flood rises
  const r = Math.min(SW, SH), g = c.createRadialGradient(SW / 2, SH / 2, r * .35, SW / 2, SH / 2, Math.hypot(SW, SH) * .55);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,15,30,' + (.45 + .22 * (G.seaVis || 0)) + ')');
  c.fillStyle = g; c.fillRect(0, 0, SW, SH);
}
// v040: the open sea outside the map — the map's own edge colour, slow glints that pan and zoom with the map, and a soft seam
const OPENSEA = { col: null, pat: null };
function seaEdgeColour() {
  if (OPENSEA.col) return OPENSEA.col;
  const x = base.x || base.c.getContext('2d'), w = base.c.width, h = base.c.height, pts = [[4, 4], [w / 2, 4], [w - 5, 4], [4, h / 2], [w - 5, h / 2], [4, h - 5], [w / 2, h - 5], [w - 5, h - 5]];
  let r = 0, g = 0, b = 0; pts.forEach(([px, py]) => { const d = x.getImageData(px | 0, py | 0, 1, 1).data; r += d[0]; g += d[1]; b += d[2]; });
  return (OPENSEA.col = [r / pts.length | 0, g / pts.length | 0, b / pts.length | 0]);
}
function drawOpenSea(t, z, ox, oy) {
  const [r, g, b] = seaEdgeColour(), c = mainCtx;
  c.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')'; c.fillRect(0, 0, SW, SH);
  if (!OPENSEA.pat) { const p = document.createElement('canvas'); p.width = p.height = 160; const q = p.getContext('2d'); const rr = mulberry(77);
    for (let i = 0; i < 26; i++) { const x = rr() * 160, y = rr() * 160, l = 5 + rr() * 9; q.strokeStyle = 'rgba(255,255,255,' + (.05 + rr() * .07) + ')'; q.lineWidth = 1.2; q.beginPath(); q.moveTo(x, y); q.quadraticCurveTo(x + l / 2, y - 2, x + l, y); q.stroke(); }
    OPENSEA.pat = c.createPattern(p, 'repeat'); }
  const dx = Math.sin(t * .05) * 6, dy = (t * 1.5) % 160;
  c.save(); c.translate(ox, oy); c.scale(z, z); c.translate(dx, dy); c.fillStyle = OPENSEA.pat; c.fillRect(-ox / z - dx - 160, -oy / z - dy - 160, SW / z + 320, SH / z + 320); c.restore();
}
function seaSeam() {   // fade the map's edge into the open sea (drawn in map units)
  const [r, g, b] = seaEdgeColour(), c = mainCtx, w = 70, col = a => 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  [[0, 0, w, 0, 0, 0, w, CH], [CW, 0, CW - w, 0, CW - w, 0, w, CH], [0, 0, 0, w, 0, 0, CW, w], [0, CH, 0, CH - w, 0, CH - w, CW, w]].forEach(([x0, y0, x1, y1, rx, ry, rw, rh]) => {
    const gr = c.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, col(1)); gr.addColorStop(1, col(0)); c.fillStyle = gr; c.fillRect(rx, ry, rw, rh); });
}
// ---------- input: tap a tile ----------
function tapAt(e) {
  if ($('card').style.display === 'flex') return;
  const [lx, ly] = toMap(e);
  const d = pick.getContext('2d').getImageData(lx | 0, ly | 0, 1, 1).data;
  const id = d[0] - 1; if (id < 0 || id >= T.length || d[1] || d[2]) { G.sel = -1; renderPanel(); return; }
  G.sel = id; renderPanel();
}

// ---------- organic roots ----------
const rootGeo = {};
function rootLine(rng, ax, ay, bx, by, amp, n) {
  const pts = [], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const p1 = rng() * 6, p2 = rng() * 6, f1 = 1.2 + rng() * 1.4, f2 = 3 + rng() * 3;
  for (let i = 0; i <= n; i++) {
    const u = i / n, env = Math.sin(u * Math.PI), o = (Math.sin(u * f1 * Math.PI + p1) * amp + Math.sin(u * f2 * Math.PI + p2) * amp * .35) * env + (rng() - .5) * 1.6 * env;
    pts.push([ax + dx * u + nx * o, ay + dy * u + ny * o]);
  }
  return pts;
}
function makeBranches(rng, pts, count, len) {
  const out = [];
  for (let k = 0; k < count; k++) {
    const i = 2 + ((rng() * (pts.length - 4)) | 0), [x, y] = pts[i], [px, py] = pts[i - 1];
    const dir = Math.atan2(y - py, x - px), spread = .6 + rng() * .6, down = Math.sin(dir + spread) > Math.sin(dir - spread) ? 1 : -1;   // v040: side roots grow downwards more often (about 70 : 30)
    const ang = dir + (rng() < .7 ? down : -down) * spread, l = len * (.6 + rng() * .6);
    out.push({ at: i / (pts.length - 1), pts: rootLine(rng, x, y, x + Math.cos(ang) * l, y + Math.sin(ang) * l, 2.2, 6) });
  }
  return out;
}
function rootsFor(key, seed, build) { return rootGeo[key] || (rootGeo[key] = build(mulberry(seed))); }
function strokeTaper(c, pts, w0, w1, prog, col) {
  const n = pts.length - 1, m = Math.max(1, Math.floor(n * prog));
  c.strokeStyle = col;
  for (let i = 0; i < m; i++) { c.lineWidth = lerp(w0, w1, i / n); c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.stroke(); }
}
function drawRoot(c, pts, w0, w1, prog, t) {
  strokeTaper(c, pts, w0 + 2.2, w1 + 1.6, prog, 'rgba(48,30,14,.8)');
  strokeTaper(c, pts, w0, w1, prog, '#8a6538');
  strokeTaper(c, pts.map(p => [p[0] - .5, p[1] - .7]), w0 * .35, w1 * .3, prog, 'rgba(214,180,120,.75)');
}
// v040: protected = eight extra plants of the tile's own kind, mostly towards its edge but scattered (no hedge), drawn like the map's own decor
const PROT_PLANTS = {};
function protPlants(tt) {
  if (PROT_PLANTS[tt.id]) return PROT_PLANTS[tt.id];
  const r = mulberry(tt.id * 7919 + 13), sp = tt.spots || [], out = [];
  const kind = () => { const c = tt.content; if (c && c.res === 'fruit') return 'breadfruit'; if (c && c.res === 'coco') return 'palm';
    return tt.type === 'beach' ? 'palm' : tt.type === 'grove' ? (r() < .55 ? 'palm' : 'tree') : tt.type === 'tangle' ? 'tangle' : 'tree'; };
  let dmax = 1; sp.forEach(i => { dmax = Math.max(dmax, Math.hypot(i % GW - tt.cx, (i / GW | 0) - tt.cy)); });
  for (let tries = 0; out.length < 8 && tries < 400; tries++) {
    const i = sp[(r() * sp.length) | 0]; if (i === undefined) break;
    const x = i % GW, y = i / GW | 0, rel = Math.hypot(x - tt.cx, y - tt.cy) / dmax;
    if (r() > .25 + rel * rel) continue;   // towards the edge, but not only there
    if (out.some(o => Math.hypot(o.x - x, o.y - y) < 4 + r() * 3)) continue;
    const d = dec(x, y, Math.max(0, H[i]), kind(), r); d.s *= .78 + r() * .2; out.push(d);
  }
  out.sort((a, b) => a.y - b.y); return (PROT_PLANTS[tt.id] = out);
}
function drawProtPlants(t) {
  const keep = ctx; ctx = mainCtx;
  T.forEach(tt => { if (!tt.prot || tt.state === 0 || tt.reg === 5) return;
    const grow = tt.protT ? clamp((G.now - tt.protT) / 1.2, 0, 1) : 1;
    protPlants(tt).forEach((d, k) => { const [px, py] = proj(d.x, d.y, d.h), sw = Math.sin(t * 1.3 + k + tt.id) * .04, gk = Math.min(1, Math.max(0, grow * 1.6 - k * .08));
      if (gk <= 0) return; mainCtx.save(); mainCtx.translate(px, py); mainCtx.rotate(sw); mainCtx.scale(gk, gk); mainCtx.translate(-px, -py); drawDecor(d); mainCtx.restore(); }); });
  ctx = keep;
}
function drawRoots(c, t) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  T.forEach(a => {
    if (!a.rooted) return;
    const [ax, ay] = tileXY(a.id), pa = clamp((G.now - a.rootBorn) / 1.2, 0, 1);
    // connections to rooted neighbours, one per pair
    a.nb.forEach(n => {
      const b = T[n]; if (n < a.id || !b.rooted) return;
      const [bx, by] = tileXY(n), pr = clamp((G.now - Math.max(a.rootBorn, b.rootBorn)) / 1.4, 0, 1);
      const g = rootsFor(a.id + '_' + n, a.id * 131 + n * 7 + 3, r => { const pts = rootLine(r, ax, ay, bx, by, 7, 16); return { pts, br: makeBranches(r, pts, 3, 14) }; });
      const ws = .7 + .3 * Math.min(a.rs, b.rs); drawRoot(c, g.pts, 5 * ws, 2.2 * ws, pr, t);
      g.br.forEach(bb => { const bp = clamp((pr - bb.at) / (1 - bb.at + .01), 0, 1); if (bp > 0) drawRoot(c, bb.pts, 1.8, .5, bp, t); });
    });
    // local cluster of radiating roots
    const cl = rootsFor('c' + a.id, a.id * 977 + 11, r => {
      const arr = [], k = 4 + ((r() * 2) | 0);
      for (let i = 0; i < k; i++) { const ang = (i / k) * Math.PI * 2 + r() * .8, l = 16 + r() * 16, pts = rootLine(r, ax, ay, ax + Math.cos(ang) * l, ay + Math.sin(ang) * l * .7, 3, 8); arr.push({ pts, br: makeBranches(r, pts, 1, 7) }); }
      return arr;
    });
    const wc = .7 + .3 * a.rs; cl.forEach(rr => { drawRoot(c, rr.pts, 3.2 * wc, .7 * wc, pa, t); rr.br.forEach(bb => { const bp = clamp((pa - bb.at) / (1 - bb.at + .01), 0, 1); if (bp > 0) drawRoot(c, bb.pts, 1.2, .4, bp, t); }); });
    // knot with a faint living glow
    const gl = .25 + .15 * Math.sin(t * 2 + a.id);
    const g = c.createRadialGradient(ax, ay, 0, ax, ay, 14); g.addColorStop(0, 'rgba(190,255,140,' + gl + ')'); g.addColorStop(1, 'rgba(190,255,140,0)');
    c.fillStyle = g; c.beginPath(); c.arc(ax, ay, 14, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6b4a26'; c.beginPath(); c.ellipse(ax, ay, 5 * pa + 1, 3.5 * pa + 1, 0, 0, Math.PI * 2); c.fill();
    for (let k = 0; k < a.rs; k++) { c.fillStyle = '#e8c88a'; c.beginPath(); c.arc(ax - (a.rs - 1) * 2.6 + k * 5.2, ay + 7, 1.8, 0, Math.PI * 2); c.fill(); }
  });
}

// ---------- drawing: below the fog ----------
function drawUnder(t, dt) {
  const c = mainCtx;
  drawRoots(c, t);
  drawProtPlants(t);   // v040: a protected tile grows eight more plants over its roots
  // rot ooze spots spread across rotten tiles
  T.forEach(tt => {
    if (tt.b <= 0 || tt.state === 0) return;
    const sp = rootsFor('rot' + tt.id, tt.id * 53 + 5, r => { const a = []; for (let k = 0; k < 12; k++) { const s = tt.samp[(r() * tt.samp.length) | 0]; if (s) a.push([s[0], s[1], 2 + r() * 3, r() * 6]); } return a; });
    const k = Math.min(sp.length, tt.b * 4);
    for (let i = 0; i < k; i++) {
      const [x, y, s, ph] = sp[i], p = 1 + .15 * Math.sin(t * 2 + ph);
      const g = c.createRadialGradient(x, y, 0, x, y, s * 2.6 * p); g.addColorStop(0, 'rgba(80,255,60,.45)'); g.addColorStop(1, 'rgba(40,120,30,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, s * 2.6 * p, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(22,48,20,.85)'; c.beginPath(); c.ellipse(x, y, s * p, s * .55 * p, 0, 0, Math.PI * 2); c.fill();
    }
  });
  // rot networks: a dotted green outline around each connected rot area
  const vc = viewCache(), oa = .6 + .3 * Math.sin(t * 2.4);
  c.fillStyle = 'rgba(10,30,8,' + oa * .8 + ')'; for (const [x, y] of vc.outline) c.fillRect(x - 2, y - 2, 4, 4);
  for (const [x, y, ink] of vc.outline) { c.fillStyle = ink ? 'rgba(185,130,255,' + oa + ')' : 'rgba(120,255,70,' + oa + ')'; c.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); }
  // where two networks would merge: a pulsing red tile
  vc.merge.forEach(id => { const tt = T[id]; if (tt.state === 0) return;
    if (G.targets.includes(id)) { c.fillStyle = 'rgba(255,50,30,' + (.12 + .12 * Math.sin(t * 4)) + ')'; c.fill(tt.path); dots(c, tt, 'rgba(255,80,60,' + (.5 + .4 * Math.sin(t * 4)) + ')', 2.2); }
    else { c.fillStyle = 'rgba(255,90,70,.45)'; tt.border.forEach(([x, y], i) => { if (i % 4 < 2) c.fillRect(x - .8, y - .8, 1.6, 1.6); }); } });
  // the banyan at rot 2: its tile pulses red
  if (G.friends.banyan && T[G.banyan].b >= 1) { const bt = T[G.banyan], k = bt.b >= 2 ? 1 : .55; c.fillStyle = 'rgba(255,40,20,' + k * (.15 + .15 * Math.sin(t * 5)) + ')'; c.fill(bt.path); dots(c, bt, 'rgba(255,70,50,.9)', 2.6); }
  // selection and growth candidates
  if (G.sel >= 0 && G.phase === 'ebb') dots(c, T[G.sel], 'rgba(255,250,230,.95)', 2.4);
}

// ---------- drawing: above the fog ----------
function drawOver(t, dt) {
  const c = mainCtx;
  // nest landmark
  { const vc = viewCache(); G.nests.forEach(id => { const tt = T[id]; if (tt.state === 0 || tt.source !== 'nest') return; const net = vc.net.nets.find(n => n.nests.includes(id)); if (tt.b === 0) { const [ex, ey] = tileXY(id); c.globalAlpha = .55 + .2 * Math.sin(t * 3); drawNest(c, ex, ey, t, 0, tt.owner === 'bailiff'); c.globalAlpha = 1; c.font = "600 11px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = '#ffe08a'; c.fillText('EXPOSED · hold it', ex, ey + 46); return; }
    drawNest(c, ...tileXY(id), t, net ? nestPower(net, id) : 0, tt.owner === 'bailiff'); });
    vc.merge.forEach(id => { if (T[id].state === 0 || !G.targets.includes(id)) return; const [x, y] = tileXY(id); c.font = "600 13px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = 'rgba(40,6,4,.85)'; roundRect(c, x - 30, y - 62, 60, 18, 9); c.fill(); c.fillStyle = 'rgba(255,140,120,' + (.75 + .25 * Math.sin(t * 4)) + ')'; c.fillText('⚠ merge', x, y - 49); }); }
  // banyan landmark + wish marker
  if (T[G.banyan].state > 0) {
    const [x, y] = tileXY(G.banyan); drawBanyan(c, x, y, t, G.friends.banyan, BANYAN_SC); if (G.fi) drawFiMini(c, x + 24, y - 44, t, G.talk.briefcase > G.now);
    if (!G.friends.banyan) {
      const p = .5 + .5 * Math.sin(t * 3);
      c.strokeStyle = 'rgba(255,240,170,' + (.35 + .45 * p) + ')'; c.lineWidth = 2.2; c.beginPath(); c.ellipse(x, y + 2, 34 + p * 4, 12 + p * 1.6, 0, 0, Math.PI * 2); c.stroke();
      drawWish(c, x, y - 52 * BANYAN_SC - 8 - p * 3, t);
    } else {   // level plate, like a city size in Civ
      const st = prodStuck(); woodDisc(c, x + 26, y + 10, 12, G.blevel, st ? 'rgba(255,70,50,' + (.6 + .4 * Math.sin(t * 5)) + ')' : null);
    }
  }
  // content icons on known tiles, hints on scouted tiles
  T.forEach(tt => {
    if (tt.state === 0) return;
    const [x, y] = tileXY(tt.id);
    if (tt.state === 1) {
      if (tt.content && (tt.content.kind === 'banyan' || tt.content.kind === 'gecko')) return;
      const icon = tt.content ? tt.content.icon || '•' : tt.b ? '☠' : ''; if (!icon) return;
      c.font = '18px serif'; c.textAlign = 'center'; c.globalAlpha = .8 + .2 * Math.sin(t * 2 + tt.id); c.fillText(icon, x, y + 6); c.globalAlpha = 1; return;
    }
    if (!tt.content || !tt.content.icon || tt.content.kind === 'banyan') return;
    if (tt.content.kind === 'gecko') return;
    c.font = '15px serif'; c.textAlign = 'center'; c.fillText(tt.content.icon, x + 16, y - 8);
  });
  // rot pips
  T.forEach(tt => {
    if (tt.b <= 0 || tt.state === 0 || tt.reg === 5) return;
    const [x, y] = tileXY(tt.id), bx = x - 18, by = y + 14;
    c.fillStyle = 'rgba(12,30,14,.82)'; roundRect(c, bx, by, 36, 12, 6); c.fill();
    for (let k = 0; k < 3; k++) {
      const px = bx + 8 + k * 10, py = by + 6;
      if (k < tt.b) { const g = c.createRadialGradient(px, py, 0, px, py, 6); g.addColorStop(0, 'rgba(120,255,80,.9)'); g.addColorStop(1, 'rgba(120,255,80,0)'); c.fillStyle = g; c.fillRect(px - 6, py - 6, 12, 12); c.fillStyle = '#7dff4f'; }
      else c.fillStyle = 'rgba(255,255,255,.18)';
      c.beginPath(); c.arc(px, py, 3, 0, Math.PI * 2); c.fill();
    }
  });
  // v061: what the rot builds on its tiles — surveyors, foundations, the trebuchet; withered roots; roots snapping; the trebuchet's shot
  T.forEach(tt => { if (tt.state === 0 || tt.reg === 5) return; if (tt.welk && !tt.rooted) drawWelk(c, tt, t); if (tt.b > 0 && !tt.source) drawRotBau(c, tt, t); });
  if (G.rootFx && G.rootFx.length) { G.rootFx = G.rootFx.filter(f => G.now - f.t0 < 1.8); G.rootFx.forEach(f => drawRootSnap(c, f, t)); }
  if (G.shot) drawShot(c, G.shot);
  // threat arrows with attack/defence badges
  const pulse = .55 + .4 * Math.sin(t * 4);
  G.targets.forEach(id => {
    const inf = G.tinfo[id] || {}, tt = T[id], [x, y] = tileXY(id);
    if (tt.state === 0) return;   // strikes under the clouds stay hidden
    dots(c, tt, G.flash === id ? 'rgba(255,90,60,.95)' : 'rgba(120,255,90,' + pulse * .8 + ')', G.flash === id ? 3 : 2.2);
    if (inf.overflow) {   // v061: no tendril — the trebuchet on the source tile points here
      { const [fx, fy] = tileXY(inf.from); c.save(); c.setLineDash([4, 4]); c.lineDashOffset = -t * 12; c.strokeStyle = 'rgba(255,154,58,.75)'; c.lineWidth = 2; c.beginPath(); c.moveTo(fx + 6, fy - 16); c.quadraticCurveTo((fx + x) / 2, Math.min(fy, y) - 46, x, y - 8); c.stroke(); c.restore(); }   // v063: the flight path, so every shot shows where it comes from
      const txt = '💥 trebuchet · ' + (tt.rooted && !(G.banyans.includes(id) && tt.rs <= 1) ? 'root −1' : '+1 rot'); c.font = "600 15px 'Fredoka',system-ui"; c.textAlign = 'center'; const w = c.measureText(txt).width + 14;
      c.fillStyle = 'rgba(8,12,8,.92)'; roundRect(c, x - w / 2, y - 28, w, 20, 10); c.fill(); c.strokeStyle = '#ff9a3a'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#ffc07a'; c.fillText(txt, x, y - 13); return; }
    if (inf.from >= 0) {
      const vn = viewCache().net, inkOf = f => { const ci = vn.comp[f]; return ci >= 0 && vn.nets[ci].nests.some(n => T[n].owner === 'bailiff'); };
      const pts = drawTendril(c, ...tileXY(inf.from), x, y - 4, G.tph || t, inf.overflow, id, inkOf(inf.from));
      // every other rot neighbour is a side arm feeding the main arm (a banyan only feels the main arm)
      if (pts) { const j = pts[Math.floor(pts.length * .62)]; [...tt.nb].filter(n => n !== inf.from && T[n].b > 0 && T[n].reg !== 5).forEach((n, k) => drawTendril(c, ...tileXY(n), j[0], j[1], (G.tph || t) + k * .7, false, id * 7 + n, inkOf(n), true)); }
    }
    const a = attackOn(tt), d = defense(tt), ar = arms(tt), txt = '⚔' + a + (ar.length > 1 ? ' = ' + ar[0] + '+' + (ar.length - 1) : '') + '  🛡' + d + ' · ' + pct(holdChance(d, a)), bad = a > d;
    c.font = "600 15px 'Fredoka',system-ui"; c.textAlign = 'center'; const w = c.measureText(txt).width + 14;
    c.fillStyle = 'rgba(8,12,8,.92)'; roundRect(c, x - w / 2, y - 28, w, 20, 10); c.fill();
    c.strokeStyle = bad ? '#ff4a3a' : 'rgba(125,255,79,.6)'; c.lineWidth = bad ? 2 : 1; c.stroke();
    c.fillStyle = bad ? '#ff8a7a' : '#7dff4f'; c.fillText(txt, x, y - 13);
  });
  // offshoot banyans
  if (G.cutting) T.forEach(tt => { if (tt.state === 0) return; const w = plantWhy(tt); if (!w || w === 'walk here first') dots(c, tt, 'rgba(255,211,106,' + (.55 + .35 * Math.sin(t * 4)) + ')', 2.6); });   // where the cutting can go
  T.forEach(tt => { if (!tt.ableger) return; const [x, y] = tileXY(tt.id), gl = c.createRadialGradient(x, y - 20, 0, x, y - 20, 34); gl.addColorStop(0, 'rgba(190,255,140,' + (.28 + .1 * Math.sin(t * 2)) + ')'); gl.addColorStop(1, 'rgba(190,255,140,0)'); c.fillStyle = gl; c.beginPath(); c.arc(x, y - 20, 34, 0, Math.PI * 2); c.fill(); c.save(); c.translate(x, y); c.scale(.88, .88); c.translate(-x, -y); drawBanyan(c, x, y, t, true); c.restore();
    woodDisc(c, x + 16, y + 6, 9, treeLvl(tt.id)); });
  { const nr = viewCache().next; if (nr && nr.state > 0) drawNextRoot(c, ...tileXY(nr.id), t, clamp(G.sapProd / RULES.sapPerRoot, 0, 1), G.rootTarget === nr.id); }
  // "show on map" ping
  if (G.ping && G.now - G.ping.t < 2.6) { const [x, y] = tileXY(G.ping.id), q = (G.now - G.ping.t) / 2.6; for (let k = 0; k < 3; k++) { const u = (q * 3 + k / 3) % 1; c.strokeStyle = 'rgba(255,240,170,' + (1 - u) * (1 - q * .6) + ')'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, 10 + u * 50, (10 + u * 50) * .5, 0, 0, Math.PI * 2); c.stroke(); } }
  // v060: the course as a green arrow from Crusoe toward the next tile (instead of only the faint ping)
  if (G.phase === 'ebb' && G.kursZ >= 0 && T[G.kursZ] && G.group) { const [tx, ty] = tileXY(G.kursZ), gx = G.group.x, gy = G.group.y - 6, dx = tx - gx, dy = ty - gy, L = Math.hypot(dx, dy), pu = .5 + .5 * Math.sin(t * 4);
    c.save(); c.fillStyle = 'rgba(70,230,90,' + (.65 + .3 * pu) + ')'; c.strokeStyle = 'rgba(10,60,20,.8)'; c.lineWidth = 2;
    if (L > 24) { const ux = dx / L, uy = dy / L, a = 18, b = Math.min(L - 14, 52 + 6 * pu), w = 5, hw = 12, hl = 14, px = -uy, py = ux, P = (s0, q) => [gx + ux * s0 + px * q, gy + uy * s0 + py * q];
      const pts = [P(a, -w), P(b - hl, -w), P(b - hl, -hw), P(b, 0), P(b - hl, hw), P(b - hl, w), P(a, w)]; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); c.stroke(); }
    else { const yy = ty - 62 - 6 * pu; c.beginPath(); c.moveTo(tx - 10, yy - 14); c.lineTo(tx + 10, yy - 14); c.lineTo(tx + 10, yy - 2); c.lineTo(tx + 16, yy - 2); c.lineTo(tx, yy + 12); c.lineTo(tx - 16, yy - 2); c.lineTo(tx - 10, yy - 2); c.closePath(); c.fill(); c.stroke(); }
    c.restore();
    if (G.kursBlase) { const tx2 = tx, ty2 = ty - (G.kursZ === G.at ? 92 : 40); c.save(); c.font = "600 13px 'Fredoka',system-ui"; const w = c.measureText(G.kursBlase).width + 18; c.fillStyle = 'rgba(255,253,240,.96)'; c.strokeStyle = '#2f8a3a'; c.lineWidth = 2;
      c.beginPath(); c.roundRect(tx2 - w / 2, ty2 - 30, w, 24, 8); c.fill(); c.stroke(); c.beginPath(); c.moveTo(tx2 - 6, ty2 - 6); c.lineTo(tx2, ty2 + 2); c.lineTo(tx2 + 6, ty2 - 6); c.fill(); c.fillStyle = '#1f4f22'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(G.kursBlase, tx2, ty2 - 18); c.restore(); } }
  if (G.boss.nests) G.boss.nests.forEach(id => { const tt = T[id]; if (!tt || tt.source !== 'nest' || tt.state > 0) return; const [x, y] = tileXY(id), pu = .5 + .5 * Math.sin(t * 2.2 + id), gl = c.createRadialGradient(x, y - 8, 0, x, y - 8, 34);   // v061: his dens glimmer through the cloud
    gl.addColorStop(0, 'rgba(120,40,160,' + (.35 + .25 * pu) + ')'); gl.addColorStop(1, 'rgba(60,10,90,0)'); c.fillStyle = gl; c.beginPath(); c.arc(x, y - 8, 34, 0, Math.PI * 2); c.fill(); });
  // the thorn tower on Crab Beach
  if (G.tower) { const [x, y] = tileXY(G.start), tx0 = x - 40, ty0 = y + 6; c.save(); c.translate(tx0, ty0); c.scale(1.4, 1.4); c.translate(-tx0, -ty0); drawThornTower(c, tx0, ty0, t); c.restore(); }
  // the hollow way to the cave: dark cut through the rock, mist, and ghost statues of what waits below
  if (G.gate >= 0 && G.cave >= 0 && (T[G.gate].state > 0 || T[G.cave].state > 0)) drawHollowWay(c, t);
  // the gate to the cave and steam vents
  T.forEach(tt => { if (!(tt.vent > G.tide) || tt.state === 0) return; const [x, y] = tileXY(tt.id); for (let k = 0; k < 4; k++) { const q = (t * .4 + k / 4) % 1; c.globalAlpha = (1 - q) * .6; c.fillStyle = '#f2f6ff'; c.beginPath(); c.arc(x - 8 + k * 5 + Math.sin(t + k) * 3, y - q * 26, 3 + q * 6, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1; });
  // the First Mate
  { const B = G.boss; if (B.alive && B.at >= 0) {
    if (B.ready) { const [x, y] = bossSeaPos(); c.save(); c.beginPath(); c.rect(x - 30, y - 60, 60, 59); c.clip(); drawBailiffMini(c, x, y + 5, t, B.stage, -1, .45); c.restore();
      for (let k = 0; k < 2; k++) { const q = (t * .5 + k * .5) % 1; c.strokeStyle = 'rgba(230,248,255,' + (1 - q) * .8 + ')'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x, y, 6 + q * 12, (6 + q * 12) * .35, 0, 0, Math.PI * 2); c.stroke(); } }
    else if (T[B.at].state > 0) { const [x0, y0] = tileXY(B.at), x = x0 - 34, y = y0 + 6; drawBailiffMini(c, x, y, t, B.stage, 1);
      for (let k = 0; k < bossRec(); k++) { c.fillStyle = k < B.rec ? '#c9a8ff' : 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(x - 8 + k * 8, y - 66 + 60 * (1 - [1, .88, .75][B.stage]), 3.2, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#140a26'; c.lineWidth = 1; c.stroke(); } } } }
  // tortoise on crab beach
  drawArmies(c, t);
  if (G.phase === 'ebb') G.banyans.forEach(id => { const fn = nestFeeding(id); if (fn === null) return; const [x1, y1] = tileXY(fn), [x2, y2] = tileXY(id); c.strokeStyle = 'rgba(130,255,90,' + (.45 + .25 * Math.sin(t * 3)) + ')'; c.lineWidth = 2.5; c.setLineDash([3, 7]); c.lineDashOffset = -t * 20; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - 40, x2, y2 - 10); c.stroke(); c.setLineDash([]);
    c.font = "600 12px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = 'rgba(10,30,8,.85)'; roundRect(c, x2 - 46, y2 + 28, 92, 17, 8); c.fill(); c.fillStyle = '#9dff7a'; c.fillText('🫧 fed +1 / flood', x2, y2 + 40); });
  drawCombat(c, t);
  drawBurn(c, t);
  if (G.sapFx && G.now - G.sapFx.t0 < 1.8) { const [bx, by] = tileXY(G.banyan), e = (G.now - G.sapFx.t0) / 1.8; G.sapFx.src.forEach((id, i) => { const [sx, sy] = tileXY(id); for (let k = 0; k < 3; k++) { const u = clamp(e * 1.4 - k * .15 - i * .03, 0, 1); if (u <= 0 || u >= 1) continue; const px = lerp(sx, bx, u), py = lerp(sy, by - 20, u) - Math.sin(u * Math.PI) * 14; const g = c.createRadialGradient(px, py, 0, px, py, 7); g.addColorStop(0, 'rgba(200,255,140,.95)'); g.addColorStop(1, 'rgba(200,255,140,0)'); c.fillStyle = g; c.fillRect(px - 7, py - 7, 14, 14); } }); }
  drawDrama(c, t, dt);
  drawLandung(c, t);
  drawCatWalk(c, t);
  if (G.bloom && G.now - G.bloom < 9) { const [bx, by] = tileXY(G.banyan), q = (G.now - G.bloom) / 9; for (let k = 0; k < 3; k++) { const u = (q * 3 + k / 3) % 1, R = 30 + u * 420; c.strokeStyle = 'rgba(190,255,140,' + (1 - u) * (1 - q) * .8 + ')'; c.lineWidth = 5; c.beginPath(); c.ellipse(bx, by, R, R * .55, 0, 0, Math.PI * 2); c.stroke(); }
    for (let i = 0; i < 28; i++) { const a = i * 2.4 + G.now * .3, r = 30 + (i * 37) % 120, fx = bx + Math.cos(a) * r, fy = by - 30 + Math.sin(a * 1.3) * r * .4, al = (.5 + .5 * Math.sin(G.now * 3 + i)) * (1 - q); c.fillStyle = 'rgba(230,255,150,' + al + ')'; c.beginPath(); c.arc(fx, fy, 2.2, 0, Math.PI * 2); c.fill(); } }
  { const [tx, ty] = tortPos(); c.save(); c.translate(tx, ty); c.scale(1.7, 1.7); c.translate(-tx, -ty); drawTortoiseMini(c, tx, ty, t, G.talk.tortoise > G.now); c.restore(); }
  // group (Crusoe + briefcase + kitten)
  const gp = G.group; if (gp.t < 1) { gp.t = Math.min(1, gp.t + dt / .6); const e = 1 - Math.pow(1 - gp.t, 3); gp.x = lerp(gp.fx, gp.tx, e); gp.y = lerp(gp.fy, gp.ty, e); }
  if (!G.friends.gecko && G.gecko >= 0 && T[G.gecko].state > 0) { const [x, y] = tileXY(G.gecko); drawGecko(c, x + (G.geckoFed ? 2 : 14), y + (G.geckoFed ? 8 : 2), t, false, 2.1, -1); }
  if (G.friends.gecko && G.gate >= 0 && (G.at === G.cave || G.below)) { const [x, y] = tileXY(G.gate); drawGecko(c, x + 10, y - 4, t, false, 1.9, 1); }
  else if (G.friends.gecko) { drawGecko(c, gp.x + 4, gp.y + 10, t, gp.t < 1, 1.9, gp.tx < (gp.fx ?? gp.tx) ? -1 : 1);
    if (G.geckoTag && G.now < G.geckoTag) { const a = Math.min(1, (G.geckoTag - G.now) / 1.5); c.globalAlpha = a; c.font = "600 12px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = 'rgba(20,40,20,.85)'; roundRect(c, gp.x - 18, gp.y + 14, 44, 16, 8); c.fill(); c.fillStyle = '#c8ff8a'; c.fillText('Gecko', gp.x + 4, gp.y + 26); c.globalAlpha = 1; } }
  if (G.inf > 0 && !G.below) drawInfBadge(c, gp.x - 4, gp.y - 34, t);
  if (G.inf >= 5 && !G.below) { const g = c.createRadialGradient(gp.x - 4, gp.y - 10, 0, gp.x - 4, gp.y - 10, 16); g.addColorStop(0, 'rgba(120,255,80,' + (.25 + .1 * Math.sin(t * 3)) + ')'); g.addColorStop(1, 'rgba(120,255,80,0)'); c.fillStyle = g; c.beginPath(); c.arc(gp.x - 4, gp.y - 10, 16, 0, Math.PI * 2); c.fill(); }
  if (!G.below) drawCrusoeMini(c, gp.x - 4, gp.y, t, gp.t < 1, G.talk.briefcase > G.now);
  if (G.cutting) { c.strokeStyle = '#6b4a26'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(gp.x - 10, gp.y - 10); c.lineTo(gp.x - 12, gp.y - 22); c.stroke(); c.fillStyle = '#5cbf45'; c.beginPath(); c.ellipse(gp.x - 14, gp.y - 23, 4, 2.2, -.5, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(gp.x - 10, gp.y - 24, 4, 2.2, .5, 0, Math.PI * 2); c.fill(); }
  if (G.below || G.catWalk) {}
  else if (G.catFate === 'gone') { if (G.cat) drawGecko(c, G.cat.x, G.cat.y, t, true, 1.6, G.cat.dir || 1); }
  else if (G.cat) drawCatMini(c, G.cat.x, G.cat.y, t, true, G.cat.dir);
  else drawCatMini(c, gp.x + 9, gp.y + 2, t, false, 1);
  drawCatHold(c);
  // floating texts
  c.textAlign = 'center'; c.font = "600 21px 'Fredoka',system-ui"; c.lineJoin = 'round';
  G.floats.forEach(f => { f.t += dt; const a = Math.max(0, 1 - f.t / 2.2), y = f.y - 18 - f.t * 14; c.globalAlpha = a; c.strokeStyle = 'rgba(15,30,25,.8)'; c.lineWidth = 4; c.strokeText(f.txt, f.x, y); c.fillStyle = f.col; c.fillText(f.txt, f.x, y); });
  c.globalAlpha = 1; G.floats = G.floats.filter(f => f.t < 2.2);
}
// rot tendril: black, oily, creeping from the source to the target with green glints and a puddle at the tip
// ---------- v061: the rot's building site — one stage per rot level, 2–3 variants each ----------
function treboZiel(id) {   // where this tile's trebuchet points: its planned shot, else its own root, else the neighbour nearest the banyan
  const plan = Object.keys(G.tinfo).find(k => G.tinfo[k].overflow && G.tinfo[k].from === id); if (plan !== undefined) return +plan;
  if (T[id].rooted) return id; const d = distToStart(); let best = -1; treboImRing(T[id]).forEach(n => { if (best < 0 || d[n] < d[best]) best = n; }); return best;
}
function rotMann(c, x, y, t, ph, carry) {   // a little black figure with green eyes
  const bob = Math.abs(Math.sin(t * 6 + ph)) * 1.4; c.fillStyle = '#121812'; c.strokeStyle = '#121812'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(x - 1.6, y); c.lineTo(x, y - 4 - bob); c.lineTo(x + 1.6, y); c.stroke(); c.fillRect(x - 1.6, y - 8 - bob, 3.2, 4.4); c.beginPath(); c.arc(x, y - 10 - bob, 2.2, 0, 7); c.fill();
  c.fillStyle = '#8dff5a'; c.fillRect(x - 1.3, y - 10.6 - bob, .9, .9); c.fillRect(x + .4, y - 10.6 - bob, .9, .9);
  if (carry === 'pole') { c.strokeStyle = '#d9c9a0'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 2.5, y - 6 - bob); c.lineTo(x + 3.5, y - 16 - bob); c.stroke(); c.fillStyle = '#ff5a3a'; c.fillRect(x + 3.5, y - 16 - bob, 3, 2); }
  if (carry === 'plank') { c.strokeStyle = '#7a5a30'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 5, y - 9 - bob); c.lineTo(x + 5, y - 7 - bob); c.stroke(); }
}
function drawRotBau(c, tt, t) {
  const [x0, y0] = tileXY(tt.id), v = tt.id % 3, x = x0 - 12 + v * 4, y = y0 + 6, lv = tt.b;
  if (CAM.z < .55) { c.fillStyle = 'rgba(20,30,15,.7)'; c.beginPath(); c.arc(x, y - 4, 2 + lv, 0, 7); c.fill(); return; }   // far out: a dot is enough
  c.save();
  // rot 1: surveyors and the first pits
  c.fillStyle = 'rgba(25,30,18,.75)'; c.beginPath(); c.ellipse(x + 8, y + 2, 5 + v, 2.2, 0, 0, 7); c.fill();
  if (v !== 1) { c.beginPath(); c.ellipse(x - 6, y + 4, 3.5, 1.6, 0, 0, 7); c.fill(); }
  if (lv === 1) { const sw = Math.sin(t * .9 + tt.id) * 7; rotMann(c, x + sw, y, t, tt.id, 'pole'); rotMann(c, x + 12 - sw * .6, y + 3, t, tt.id + 2, v === 2 ? 'plank' : null); if (v === 0) rotMann(c, x - 8, y + 5, t, tt.id + 4, null); c.restore(); return; }
  // rot 2: sheds and the foundation of something big
  c.fillStyle = '#3a3a34'; c.fillRect(x - 3, y - 2, 18, 5); c.fillStyle = '#26261f'; [0, 6, 12].forEach(k => c.fillRect(x - 2 + k, y - 7, 2, 5));
  const hx = v === 2 ? x - 16 : x + 18; c.fillStyle = '#2b2219'; c.fillRect(hx, y - 7, 9, 7); c.fillStyle = '#4a7a2a'; c.beginPath(); c.moveTo(hx - 1, y - 7); c.lineTo(hx + 4.5, y - 12); c.lineTo(hx + 10, y - 7); c.fill();
  if (v === 1) { c.fillStyle = '#2b2219'; c.fillRect(hx + 11, y - 5, 6, 5); }
  if (lv === 2) { const sw = Math.sin(t * 1.1 + tt.id) * 5; rotMann(c, x + 4 + sw, y + 5, t, tt.id, 'plank'); rotMann(c, hx + 4, y + 3, t, tt.id + 3, null); c.restore(); return; }
  // rot 3 on the steep flanks: nothing can be built up there — the sheds stay
  if (steil(tt)) { const sw = Math.sin(t * 1.1 + tt.id) * 4; rotMann(c, x + 4 + sw, y + 5, t, tt.id, null); c.restore(); return; }
  // v063: behind the front a wide tower goes up (3 floods); the trebuchet sits on top of it once it stands
  let lift = 0;
  if (tt.turm !== undefined && !tt.rooted) { const p = clamp((G.tide - tt.turm) / RULES.turmBau, 0, 1), th = 6 + 16 * p; lift = th;
    c.fillStyle = '#2a2a24'; c.fillRect(x - 4, y - th, 22, th); c.fillStyle = '#3c3c33'; for (let k = 0; k < th - 3; k += 4) c.fillRect(x - 4 + ((k / 4) % 2) * 5, y - th + k, 10, 2);
    c.fillStyle = '#1c1c18'; [0, 7, 14].forEach(k => c.fillRect(x - 4 + k, y - th - 3, 4, 3));
    if (p < 1) { c.strokeStyle = '#6a5a3a'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 20, y); c.lineTo(x + 20, y - th - 6); c.moveTo(x + 24, y); c.lineTo(x + 24, y - th - 6); c.stroke(); rotMann(c, x + 22, y - th * .5, t, tt.id, 'plank');
      c.fillStyle = 'rgba(255,200,120,.95)'; c.font = "600 8px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillText('tower ' + Math.round(p * RULES.turmBau) + '/' + RULES.turmBau, x + 7, y + 13); c.restore(); return; } }
  // rot 3: the trebuchet — loading or ready, aimed at its next target
  const z = treboZiel(tt.id), self = z === tt.id; let dir = 1; if (z >= 0 && !self) { const [zx] = tileXY(z); dir = zx < x0 ? -1 : 1; }
  const firing = G.shot && G.shot.from === tt.id ? clamp((G.now - G.shot.t0) / .35, 0, 1) : 0, sc = .9 + v * .12;
  const laedt = !self && tt.trebo !== undefined && !treboFeuert(tt) && G.phase === 'ebb' && !G.tinfo[z];
  if (!self && tt.state > 0) { c.fillStyle = laedt ? 'rgba(200,190,160,.95)' : 'rgba(255,120,60,.95)'; c.font = "600 8px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillText(laedt ? 'loading' : (treboReich(tt) > 1 ? 'range 2' : ''), x + 6, y + 13); }
  c.translate(x + 6, y - 2 - lift); c.scale(dir * sc, sc);
  c.strokeStyle = '#3b2814'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-9, 4); c.lineTo(0, -14); c.lineTo(9, 4); c.moveTo(-11, 4); c.lineTo(11, 4); c.stroke();
  if (!self) { c.fillStyle = 'rgba(255,120,60,' + (.65 + .3 * Math.sin(t * 4)) + ')'; c.beginPath(); c.moveTo(13, 0); c.lineTo(19, 3); c.lineTo(13, 6); c.closePath(); c.fill(); }   // v062: a small arrow toward its target
  const ang = self ? .9 + Math.sin(t * 2) * .05 : laedt ? 2.95 + Math.sin(t * 3 + tt.id) * .12 : (2.64 + Math.sin(t * 1.5 + tt.id) * .05) + firing * 3.04;   // loading: the crew winds the arm down   // v062: loaded = sling end low behind, counterweight high toward the target; it fires over the top toward the target
  c.save(); c.translate(0, -14); c.rotate(ang); c.strokeStyle = '#5a3a1c'; c.lineWidth = 2; c.beginPath(); c.moveTo(-8, 0); c.lineTo(16, 0); c.stroke();
  c.fillStyle = '#2b2b26'; c.fillRect(-12, -3, 6, 7);   // counterweight
  if (firing < .6) { const g = c.createRadialGradient(17, 0, 0, 18, 0, 4); g.addColorStop(0, '#9dff5a'); g.addColorStop(1, '#0e1a0a'); c.fillStyle = g; c.beginPath(); c.arc(18, 0, 3.4, 0, 7); c.fill(); }
  c.restore();
  if (self) { c.fillStyle = 'rgba(255,120,60,' + (.4 + .3 * Math.sin(t * 5)) + ')'; c.font = "600 8px 'Fredoka',system-ui"; c.textAlign = 'center'; c.scale(dir, 1); c.fillText('aims at its root', 0, 13); }
  c.restore();
}
function drawWelk(c, tt, t) {   // a withered root: grey, dry strands — it waits for a clean tile
  const [x, y] = tileXY(tt.id); c.save(); c.strokeStyle = 'rgba(140,120,90,.85)'; c.lineWidth = 1.6; c.setLineDash([3, 2]);
  for (let k = 0; k < 3; k++) { const a = (tt.id * 1.7 + k * 2.1) % 6.28; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * 10, y + 6, x + Math.cos(a) * 18, y + Math.sin(a) * 6 + 8); c.stroke(); }
  c.setLineDash([]); c.fillStyle = 'rgba(160,140,100,.9)'; c.font = "600 9px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillText('withered', x, y + 22); c.restore();
}
function drawRootSnap(c, f, t) {   // the root drops a level: the strand cracks, the count steps down
  const [x, y] = tileXY(f.id), q = clamp((G.now - f.t0) / 1.8, 0, 1); c.save(); c.globalAlpha = 1 - q * .6;
  c.strokeStyle = '#7a4a1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 14, y + 4); c.quadraticCurveTo(x - 4, y - 2 - q * 4, x - 1, y + 2); c.stroke();
  c.beginPath(); c.moveTo(x + 1, y + 2 + q * 6); c.quadraticCurveTo(x + 6, y + 8, x + 14, y + 4 + q * 10); c.stroke();
  c.strokeStyle = '#ff5a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 3, y - 4); c.lineTo(x + 1, y + 1); c.lineTo(x - 1, y + 4); c.lineTo(x + 3, y + 9); c.stroke();
  c.fillStyle = '#ffe0d0'; c.font = "700 13px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillText('root ' + f.from + ' → ' + f.to, x, y - 10 - q * 10); c.restore();
}
function drawShot(c, sh) {   // the trebuchet's ball: a high arc from its tile to the target
  const [ax, ay] = tileXY(sh.from), [bx, by] = tileXY(sh.to), q = clamp((G.now - sh.t0 - .25) / .65, 0, 1); if (q <= 0) return;
  const x = ax + (bx - ax) * q, y = ay + (by - ay) * q - Math.sin(q * Math.PI) * 60, g = c.createRadialGradient(x, y, 0, x, y, 6);
  g.addColorStop(0, '#b0ff70'); g.addColorStop(1, '#0e1a0a'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill();
  if (q >= 1) { c.strokeStyle = 'rgba(160,255,90,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(bx, by, 14, 0, 7); c.stroke(); }
}
function drawTendril(c, fx, fy, x, y, t, overflow, seed, ink, side) {
  const GL = offActive() ? '255,110,80' : ink ? '185,130,255' : '120,255,90', BODY = ink ? '#140a26' : '#0a0d0a';
  const n = 22, dx = x - fx, dy = y - fy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, pts = [];
  const ph = seed * 1.7, amp = Math.min(14, L * .12);
  for (let i = 0; i <= n; i++) {
    const u = i / n, env = Math.sin(u * Math.PI), o = (Math.sin(u * 7 + ph - t * .8) * amp * .55 + Math.sin(u * 2.3 + ph) * amp) * env;
    pts.push([fx + dx * u + nx * o, fy + dy * u + ny * o - env * L * .12]);
  }
  const sk = 1 + .3 * (G.surge || 0), w0 = (side ? 3 : overflow ? 4 : 8) * sk, w1 = (side ? 1.6 : overflow ? 1.2 : 2.2) * sk;
  c.lineCap = 'round';
  strokeTaper(c, pts, w0 + 2.5, w1 + 2, 1, 'rgba(' + GL + ',.18)');
  strokeTaper(c, pts, w0, w1, 1, BODY);
  strokeTaper(c, pts.map(p => [p[0] - .6, p[1] - .8]), w0 * .25, w1 * .2, 1, 'rgba(' + GL + ',.35)');
  // knobbly side growths
  for (let k = 3; k < n - 2; k += 4) { const [px, py] = pts[k], s = (k % 8 ? 1 : -1); c.fillStyle = BODY; c.beginPath(); c.ellipse(px + nx * s * w0 * .5, py + ny * s * w0 * .5, w0 * .35, w0 * .22, Math.atan2(ny, nx), 0, Math.PI * 2); c.fill(); }
  // glints travelling toward the target
  for (let k = 0; k < 3; k++) {
    const u = ((t * .2 + k / 3 + seed * .13) % 1), i = Math.floor(u * n), [px, py] = pts[i];
    const g = c.createRadialGradient(px, py, 0, px, py, 5); g.addColorStop(0, 'rgba(' + GL + ',.9)'); g.addColorStop(1, 'rgba(' + GL + ',0)');
    c.fillStyle = g; c.fillRect(px - 5, py - 5, 10, 10);
  }
  // drips under an overflow tendril
  if (overflow && !side) for (let k = 0; k < 3; k++) { const i = 5 + k * 6, [px, py] = pts[i], q = (t * .5 + k * .33) % 1; c.globalAlpha = 1 - q; c.fillStyle = BODY; c.beginPath(); c.ellipse(px, py + 3 + q * 12, 1.6, 2.2, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
  if (side) return pts;
  // puddle at the tip
  const p = 1 + .1 * Math.sin(t * 3 + seed);
  c.fillStyle = BODY; c.beginPath(); c.ellipse(x, y + 2, 9 * p, 4 * p, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(' + GL + ',.55)'; c.beginPath(); c.ellipse(x - 2.5, y + 1, 2.5, 1, 0, 0, Math.PI * 2); c.fill();
  return pts;
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function dots(c, t, col, s) { c.fillStyle = col; for (const [x, y] of t.border) c.fillRect(x - s / 2, y - s / 2, s, s); }
// Blight badge above Robinson: black plate, colour by stage (green · yellow · orange · red = collapse)
function drawHollowWay(c, t) {
  const [gx, gy] = tileXY(G.gate), [cx, cy] = (m => [m[0], m[1] + 3])(pf(LM.cave[0], LM.cave[1])), dx = cx - gx, dy = cy - gy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, ux = dx / L, uy = dy / L;
  const pt = u => { const w = Math.sin(u * Math.PI * 2.2 + 1) * 6 * Math.sin(u * Math.PI); return [gx + dx * u + nx * w, gy + dy * u + ny * w]; };
  const hsh = k => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  // v016: the cut starts narrow and shallow at the gate and gets wider and deeper up the mountain flank
  const W = u => 3.5 + 12 * Math.pow(u, 1.15) + 2 * Math.sin(u * 23 + 2) * Math.sin(u * 9) * u;
  const band = (sc, add, um) => { const L1 = [], L2 = []; for (let k = 0; k <= 36; k++) { const u = k / 36 * (um || 1), [x, y] = pt(u), w = W(u) * sc + add; L1.push([x + nx * w, y + ny * w]); L2.push([x - nx * w, y - ny * w]); }
    c.beginPath(); L1.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); L2.reverse().forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); };
  c.filter = 'blur(5px)'; band(1.9, 3, .86); c.fillStyle = 'rgba(6,4,12,.5)'; c.fill(); c.filter = 'none';
  // v022: a trench seen from the front — the near rim is calm, the far wall shows its face and gets deeper towards the mountain
  const ns = ny >= 0 ? 1 : -1, Nx = nx * ns, Ny = ny * ns;   // N points to the viewer's side (down-screen)
  const ptS = u => { const w = Math.sin(u * Math.PI * 2.2 + 1) * 6 * Math.sin(u * Math.PI) * .3; return [gx + dx * u + nx * w, gy + dy * u + ny * w]; };
  const DEP = u => 2 + 13 * Math.pow(u, 1.25), U1 = .9, KN = 40;
  const farR = [], farF = [], nearR = [];
  for (let k = 0; k <= KN; k++) { const u = k / KN * U1, [x, y] = pt(u), [xs, ys] = ptS(u), w = W(u); farR.push([x - Nx * w * 1.05, y - Ny * w * 1.05]); farF.push([x - Nx * w * .55, y - Ny * w * .55 + DEP(u)]); nearR.push([xs + Nx * w * .95, ys + Ny * w * .95]); }
  const poly = (A, B) => { c.beginPath(); A.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); B.slice().reverse().forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); };
  { const g = c.createLinearGradient(gx, gy, cx, cy); g.addColorStop(0, 'rgba(24,18,24,.9)'); g.addColorStop(.6, 'rgba(8,5,10,.96)'); g.addColorStop(1, 'rgba(1,0,3,1)'); poly(farF, nearR); c.fillStyle = g; c.fill(); }   // the floor, darkening inward
  { const g = c.createLinearGradient(gx, gy, cx, cy); g.addColorStop(0, 'rgba(92,80,86,.92)'); g.addColorStop(1, 'rgba(40,32,40,.98)'); poly(farR, farF); c.fillStyle = g; c.fill(); }      // the far wall's face, lit
  c.lineWidth = .7; for (let j = 1; j <= 3; j++) { c.strokeStyle = 'rgba(170,150,150,' + (.28 - j * .06) + ')'; c.beginPath(); farR.forEach(([x, y], i) => { const [fx, fy] = farF[i], q = j / 4 + Math.sin(i * 1.3 + j) * .03; i ? c.lineTo(lerp(x, fx, q), lerp(y, fy, q)) : c.moveTo(lerp(x, fx, q), lerp(y, fy, q)); }); c.stroke(); }   // strata on the wall
  c.strokeStyle = 'rgba(190,175,160,.55)'; c.lineWidth = 1.2; c.beginPath(); farR.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();      // far rim catches the light
  c.strokeStyle = 'rgba(10,6,10,.85)'; c.lineWidth = 2.6; c.beginPath(); nearR.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();          // near lip: dark edge…
  c.strokeStyle = 'rgba(150,170,120,.5)'; c.lineWidth = 1; c.beginPath(); nearR.forEach(([x, y], i) => i ? c.lineTo(x, y + 1.6) : c.moveTo(x, y + 1.6)); c.stroke();   // …with grass on top
  // the cave mouth: a rock face across the end of the trench, an arch of darkness in it
  const [mx0, my0] = pt(U1), mw = W(U1) * 1.7 + 8, MH = 34 + DEP(U1) * .7, MOUTH = [mx0, my0 + DEP(U1) * .4];
  { const [ax, ay] = MOUTH, L0 = ax - mw * 1.15, R0 = ax + mw * 1.15, top = ay - MH - 6;   // a rounded hump of rock in screen space, mouth at its foot
    const g = c.createLinearGradient(0, top, 0, ay + 6); g.addColorStop(0, 'rgba(128,118,122,.98)'); g.addColorStop(1, 'rgba(70,62,68,.98)'); c.fillStyle = g;
    const RK = [[-1.15, 1], [-1.2, .55], [-1.02, .2], [-.8, -.02], [-.62, .06], [-.4, -.12], [-.12, -.04], [.08, -.16], [.34, -.02], [.55, .1], [.78, .02], [1.0, .3], [1.12, .62], [1.15, 1]];
    c.beginPath(); RK.forEach(([fx, fy], i) => { const x = ax + fx * mw, y = top + (ay + 6 - top) * Math.max(0, fy) + (fy < 0 ? fy * 14 : 0); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.quadraticCurveTo(ax, ay + 10, ax - 1.15 * mw, ay + 6); c.fill();
    c.strokeStyle = 'rgba(200,190,180,.45)'; c.lineWidth = 1.2; c.beginPath(); RK.slice(1, 8).forEach(([fx, fy], i) => { const x = ax + fx * mw, y = top + (ay + 6 - top) * Math.max(0, fy) + (fy < 0 ? fy * 14 : 0) + 1.5; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
    c.strokeStyle = 'rgba(40,34,40,.5)'; c.lineWidth = .8; for (let k = 0; k < 4; k++) { const yy = top + 8 + k * 7; c.beginPath(); c.moveTo(L0 + 6 + k * 2, yy); c.quadraticCurveTo(ax, yy - 3, R0 - 6 - k * 2, yy + 1); c.stroke(); } }
  { const [ax, ay] = MOUTH, aw = W(U1) * 1.25 + 5, ah = MH * .85, g = c.createRadialGradient(ax, ay - ah * .3, 0, ax, ay - ah * .3, ah * 1.1); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.7, 'rgba(6,3,8,1)'); g.addColorStop(1, 'rgba(30,22,28,1)');
    c.fillStyle = g; c.beginPath(); c.moveTo(ax - aw, ay + 2); c.bezierCurveTo(ax - aw, ay - ah * .9, ax + aw, ay - ah * .9, ax + aw, ay + 2); c.quadraticCurveTo(ax, ay + 5, ax - aw, ay + 2); c.fill();
    c.strokeStyle = 'rgba(120,108,110,.85)'; c.lineWidth = 2; c.beginPath(); c.moveTo(ax - aw - 1, ay + 2); c.bezierCurveTo(ax - aw - 1, ay - ah * .95, ax + aw + 1, ay - ah * .95, ax + aw + 1, ay + 2); c.stroke();   // the lintel
    for (let k = 0; k < 5; k++) { const u2 = (k + .5) / 5, bx2 = ax - aw + u2 * aw * 2, by2 = ay - Math.sin(u2 * Math.PI) * ah * .72; c.fillStyle = 'rgba(90,80,84,.95)'; c.beginPath(); c.ellipse(bx2, by2 - 1, 2.6, 1.8, 0, 0, Math.PI * 2); c.fill(); }   // arch stones
    G.mouthXY = [ax, ay - ah * .35]; }
  // dead roots hanging over the rims, sickly drips
  for (let k = 3; k < 34; k += 3) { const u = k / 36, [x, y] = pt(u), s2 = hsh(k) < .5 ? -1 : 1, w = W(u) * 1.1, rx = x + nx * s2 * w, ry = y + ny * s2 * w, sw = Math.sin(t * .8 + k) * 1.2;
    c.strokeStyle = 'rgba(38,26,20,.85)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(rx, ry); c.quadraticCurveTo(rx - nx * s2 * 4 + sw, ry - ny * s2 * 4 + 3, rx - nx * s2 * (5 + hsh(k + 3) * 5) + sw, ry - ny * s2 * (5 + hsh(k + 3) * 5) + 6); c.stroke();
    if (hsh(k + 9) < .45) { const dp = (t * .35 + hsh(k)) % 1; c.fillStyle = 'rgba(120,170,90,' + (.5 * (1 - dp)) + ')'; c.beginPath(); c.arc(rx - nx * s2 * 3, ry - ny * s2 * 3 + dp * 7, .9, 0, Math.PI * 2); c.fill(); } }
  // fallen rocks, a few bones
  for (let k = 1; k < 36; k += 2) { const u = k / 36, [x, y] = pt(u); [-1, 1].forEach(sd => { if ((k * 5 + sd + 7) % 3 === 0) return; const w = W(u) * 1.15 + 1, r = (1.2 + ((k * 7 + (sd > 0 ? 3 : 0)) % 4) * .5) * (.6 + u * .7), rx = x + nx * sd * w, ry = y + ny * sd * w;
    c.fillStyle = 'rgba(62,56,62,.92)'; c.beginPath(); c.ellipse(rx, ry, r * 1.3, r, k, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(110,100,106,.5)'; c.beginPath(); c.ellipse(rx - r * .3, ry - r * .4, r * .6, r * .4, k, 0, Math.PI * 2); c.fill(); }); }
  [.3, .52, .74].forEach((u, k) => { const [x, y] = pt(u), o = (hsh(k + 20) - .5) * W(u) * .6, bx = x + nx * o, by = y + ny * o, an = hsh(k + 40) * 3; c.strokeStyle = 'rgba(205,195,170,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx - Math.cos(an) * 3, by - Math.sin(an) * 3); c.lineTo(bx + Math.cos(an) * 3, by + Math.sin(an) * 3); c.stroke();
    c.fillStyle = 'rgba(205,195,170,.55)'; [-1, 1].forEach(e => { c.beginPath(); c.arc(bx + e * Math.cos(an) * 3.4, by + e * Math.sin(an) * 3.4, .9, 0, Math.PI * 2); c.fill(); }); });
  // creeping mist, thicker deeper in
  for (let k = 0; k < 9; k++) { const u = ((t * .025 + k / 9) % 1), [x, y] = pt(u), r = (5 + 9 * u) + 3 * Math.sin(t + k); const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(170,190,180,' + (.2 * Math.sin(u * Math.PI)) + ')'); g.addColorStop(1, 'rgba(170,190,180,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  // deep in: a dull red pulse, and sometimes something looks back
  { const [ex, ey] = G.mouthXY || pt(.93), pr = .25 + .15 * Math.sin(t * 1.1), g = c.createRadialGradient(ex, ey, 0, ex, ey, 16); g.addColorStop(0, 'rgba(150,20,10,' + pr + ')'); g.addColorStop(1, 'rgba(150,20,10,0)'); c.fillStyle = g; c.beginPath(); c.arc(ex, ey, 16, 0, Math.PI * 2); c.fill();
    const blink = (t % 7.3) < 2.4 && Math.sin(t * 9) > -.95; if (blink) { c.fillStyle = 'rgba(255,60,30,.85)'; [-1, 1].forEach(e => { c.beginPath(); c.ellipse(ex + nx * e * 2.6, ey + ny * e * 2.6, 1.1, .6, Math.atan2(ny, nx), 0, Math.PI * 2); c.fill(); }); } }
  // the statues: weathered stone, cracked, leaning, empty eyes, a sick flicker
  const glyph = ['till', 'seal', 'rope', 'chair', 'plate', 'pen'];
  glyph.forEach((gname, k) => {
    const u = .2 + k * .13, [x0, y0] = pt(u), sd = k % 2 ? 1 : -1, off = W(u) * 1.15 + 9, x = x0 + nx * sd * off, y = y0 + ny * sd * off, done = G.descent > k;
    const jitter = Math.sin(t * 23 + k * 5) > .97 ? (hsh(Math.floor(t * 9) + k) - .5) * 1.6 : 0;   // now and then it twitches
    const fl = done ? .25 : .45 + .15 * Math.sin(t * 1.3 + k) * (Math.sin(t * 6.7 + k * 2) > .85 ? .1 : 1);
    const gl = c.createRadialGradient(x, y - 9, 0, x, y - 9, 20); gl.addColorStop(0, 'rgba(140,190,160,' + fl * .35 + ')'); gl.addColorStop(1, 'rgba(140,190,160,0)'); c.fillStyle = gl; c.beginPath(); c.arc(x, y - 9, 20, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(x + jitter, y); c.rotate((hsh(k + 60) - .5) * .35); c.scale(1.8, 1.8); c.translate(-x, -y);
    c.fillStyle = 'rgba(40,38,42,.9)'; c.beginPath(); c.moveTo(x - 6, y + 2); c.lineTo(x + 5, y + 2); c.lineTo(x + 4, y - 1); c.lineTo(x - 5, y - 1.4); c.closePath(); c.fill();   // broken plinth
    const ans = done ? G.caveC[k] : '', stone = ans === 'C' ? 'rgba(48,44,50,.85)' : done ? 'rgba(95,95,92,.65)' : 'rgba(150,150,140,' + (.55 + fl * .4) + ')', dark = 'rgba(20,18,22,.85)';
    c.fillStyle = stone; c.strokeStyle = dark; c.lineWidth = .8; c.beginPath();
    if (gname === 'till') { c.rect(x - 4, y - 8, 8, 6); c.moveTo(x - 3, y - 8); c.lineTo(x - 1, y - 11); c.lineTo(x + 3, y - 11); c.lineTo(x + 3, y - 8); }
    else if (gname === 'seal') { c.ellipse(x, y - 4, 5, 2.6, -.2, 0, Math.PI * 2); c.moveTo(x + 6.1, y - 7); c.arc(x + 4.5, y - 7, 1.6, 0, Math.PI * 2); }
    else if (gname === 'rope') { c.moveTo(x - 1, y - 1); c.lineTo(x - 1, y - 12); c.lineTo(x + 4, y - 12); c.lineTo(x + 4, y - 9); c.moveTo(x + 5.5, y - 7.5); c.arc(x + 4, y - 7.5, 1.5, 0, Math.PI * 2); }   // a gallows-like post with a noose
    else if (gname === 'chair') { c.moveTo(x - 3, y - 2); c.lineTo(x - 3, y - 6); c.lineTo(x + 3, y - 6); c.lineTo(x + 3, y - 2); c.moveTo(x + 3, y - 6); c.lineTo(x + 3, y - 12); }
    else if (gname === 'plate') { c.ellipse(x, y - 3, 5, 1.6, 0, 0, Math.PI * 2); for (let b2 = -1; b2 <= 1; b2++) { c.moveTo(x + b2 * 2.4 + 1.2, y - 5); c.arc(x + b2 * 2.4, y - 5, 1.2, 0, Math.PI * 2); } }
    else { c.moveTo(x, y - 2); c.lineTo(x - 2.2, y - 10); c.lineTo(x + 2.2, y - 10); c.closePath(); c.moveTo(x + 1.8, y - 12); c.arc(x, y - 12, 1.8, 0, Math.PI * 2); c.moveTo(x + 2, y - 8); c.lineTo(x + 5, y - 9.5); }
    c.fill(); c.stroke();
    // cracks and stains
    c.strokeStyle = ans === 'A' ? 'rgba(120,255,140,' + (.6 + .3 * Math.sin(t * 2 + k)) + ')' : 'rgba(15,12,16,.8)'; c.lineWidth = ans === 'A' ? .7 : .45; c.beginPath(); c.moveTo(x - 1.5, y - 9.5); c.lineTo(x - .3, y - 7); c.lineTo(x - 1.2, y - 5); c.lineTo(x + .4, y - 2.5); c.stroke();
    c.fillStyle = 'rgba(70,90,50,.45)'; c.beginPath(); c.ellipse(x + 1.5, y - 3, 1.6, .8, .4, 0, Math.PI * 2); c.fill();
    // empty eyes on the figure, dark streaks under them
    if (gname === 'pen' || gname === 'seal') { const ex = gname === 'pen' ? x : x + 4.5, ey = gname === 'pen' ? y - 12.2 : y - 7.2; c.fillStyle = 'rgba(5,3,6,.95)'; c.fillRect(ex - 1, ey - .4, .7, .7); c.fillRect(ex + .3, ey - .4, .7, .7); c.fillStyle = 'rgba(5,3,6,.5)'; c.fillRect(ex - .9, ey + .3, .35, 1.6); c.fillRect(ex + .55, ey + .3, .35, 1.3); }
    c.restore();
  });
  // the rusted gate across the mouth of the cut
  if (T[G.gate].state > 0) {
    const [px, py] = pt(.05), hw = W(.05) * 1.6 + 5, x1 = px - nx * hw, y1 = py - ny * hw, x2 = px + nx * hw, y2 = py + ny * hw, open = G.key;
    // scratches on the rock beside it
    c.strokeStyle = 'rgba(225,215,205,.45)'; c.lineWidth = .6; for (let k = 0; k < 4; k++) { const ox = x2 + nx * 3 + ux * (k * 1.6 - 2), oy = y2 + ny * 3 + uy * (k * 1.6 - 2); c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + nx * 5 - ux * 2, oy + ny * 5 - uy * 2); c.stroke(); }
    if (!open) {   // something waits behind the bars
      const glow = .5 + .4 * Math.sin(t * 2.1), bx = px + ux * 7, by = py + uy * 7; c.fillStyle = 'rgba(255,50,20,' + glow * (Math.sin(t * .7) > -.3 ? 1 : .15) + ')'; [-1, 1].forEach(e => { c.beginPath(); c.arc(bx + nx * e * 2, by + ny * e * 2, .9, 0, Math.PI * 2); c.fill(); }); }
    const bars = 6; c.lineCap = 'butt';
    for (let i = 0; i <= bars; i++) {
      const f = i / bars; let bx = lerp(x1, x2, f), by = lerp(y1, y2, f);
      if (open) { const side = f < .5 ? -1 : 1, swing = .8; bx += ux * side * 0 - nx * side * 0; const ang = side * swing; const hx = side < 0 ? x1 : x2, hy = side < 0 ? y1 : y2; const rx2 = bx - hx, ry2 = by - hy; bx = hx + rx2 * Math.cos(ang) - ry2 * Math.sin(ang) * .6; by = hy + rx2 * Math.sin(ang) * .6 + ry2 * Math.cos(ang); }
      c.strokeStyle = 'rgba(70,40,25,.95)'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by + 2); c.lineTo(bx, by - 14); c.stroke();
      c.strokeStyle = 'rgba(170,85,40,.75)'; c.lineWidth = .8; c.beginPath(); c.moveTo(bx - .5, by + 1); c.lineTo(bx - .5, by - 13); c.stroke();   // rust highlight
      c.fillStyle = 'rgba(60,35,22,.95)'; c.beginPath(); c.moveTo(bx - 1.4, by - 14); c.lineTo(bx, by - 17); c.lineTo(bx + 1.4, by - 14); c.fill();   // spikes
    }
    if (!open) { c.strokeStyle = 'rgba(80,45,28,.95)'; c.lineWidth = 1.6; [-10, -3].forEach(o => { c.beginPath(); c.moveTo(x1, y1 + o); c.lineTo(x2, y2 + o); c.stroke(); });
      c.fillStyle = 'rgba(120,70,35,.95)'; c.fillRect(px - 2.2, py - 7.5, 4.4, 3.6); c.strokeStyle = 'rgba(60,35,22,.95)'; c.lineWidth = 1; c.beginPath(); c.arc(px, py - 7.6, 1.5, Math.PI, 0); c.stroke(); }   // padlock
    // a dark stain runs down from the hinges
    c.fillStyle = 'rgba(40,10,10,.45)'; c.beginPath(); c.ellipse(x1, y1 + 3, 1.3, 3.5, 0, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
function drawInfBadge(c, x, y, t) {
  const v = G.inf, col = v >= 10 ? '#ff4a3a' : v >= 8 ? '#ff9a3a' : v >= 5 ? '#ffe14a' : '#7dff4f', st = infStep();
  const txt = '🦠' + v + (st ? ' · +' + st + ' 🌊/step' : '');
  c.font = "600 11px 'Fredoka',system-ui"; c.textAlign = 'center'; const w = c.measureText(txt).width + 10;
  c.fillStyle = 'rgba(8,8,8,.9)'; roundRect(c, x - w / 2, y - 8, w, 15, 7); c.fill();
  c.strokeStyle = col; c.lineWidth = v >= 10 ? 1.5 + .8 * Math.sin(t * 8) : 1.2; c.stroke();
  c.fillStyle = col; c.fillText(txt, x, y + 4);
}
function drawNest(c, x, y, t, power, ink) {
  const A = ink ? '170,110,255' : '90,255,50', DARK = ink ? '#1c0f38' : '#15301a', FILL = ink ? 'rgba(120,80,220,.85)' : 'rgba(60,200,50,.85)', HI = ink ? '200,160,255' : '140,255,90', BUB = ink ? '#d2b8ff' : '#a8ff7a';
  const su = G.surge || 0, p = .5 + .5 * Math.sin((G.nph || t) * 2.2), k = 1.3 + su * (.18 + .12 * p);
  // aura: pulses, and swells when the tide runs out
  const R = 46 * k, g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, 'rgba(' + A + ',' + (.38 + .2 * p + .2 * su) + ')'); g.addColorStop(1, 'rgba(' + A + ',0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(x, y); c.scale(k, k); c.translate(-x, -y);
  c.fillStyle = DARK; c.beginPath(); c.ellipse(x, y, 20, 8, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = FILL; c.beginPath(); c.ellipse(x, y - 1, 15, 5.5, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(' + HI + ',.7)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, 20, 8, 0, 0, Math.PI * 2); c.stroke();
  for (let i = 0; i < 5; i++) {   // rising bubbles that pop
    const q = ((G.nph || t) * .6 + i / 5) % 1, bx = x - 10 + i * 5 + Math.sin(t * 3 + i) * 1.5, by = y - 2 - q * 18, r = 1.2 + q * 2.4;
    c.globalAlpha = 1 - q; c.strokeStyle = BUB; c.lineWidth = 1; c.beginPath(); c.arc(bx, by, r, 0, Math.PI * 2); c.stroke();
  }
  c.globalAlpha = 1;
  c.strokeStyle = ink ? 'rgba(150,100,230,.6)' : 'rgba(70,220,50,.6)'; c.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const dx = x - 12 + i * 12, l = 6 + 4 * Math.sin(t * 1.5 + i * 2); c.beginPath(); c.moveTo(dx, y + 5); c.lineTo(dx + 1, y + 5 + l); c.stroke(); }
  c.restore();
  // v022: the nest's power glows inside the ooze itself
  c.font = "700 17px 'Fredoka',system-ui"; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = ink ? 'rgba(20,8,40,.9)' : 'rgba(6,24,8,.9)'; c.strokeText(power, x, y + 5);
  c.fillStyle = ink ? 'rgba(225,200,255,' + (.8 + .2 * p) + ')' : 'rgba(170,255,120,' + (.8 + .2 * p) + ')'; c.fillText(power, x, y + 5);
  c.font = "600 11px 'Fredoka',system-ui"; c.fillStyle = ink ? 'rgba(215,190,255,.95)' : 'rgba(190,255,160,.95)'; c.fillText(ink ? 'FIRST MATE' : 'NEST', x, y + 34);
  if (ink) for (let i = 0; i < 3; i++) { const q = (t * .35 + i / 3) % 1; c.save(); c.globalAlpha = 1 - q; c.translate(x - 8 + i * 8 + Math.sin(t + i) * 4, y - 6 - q * 26); c.rotate(Math.sin(t * 2 + i) * .6); c.fillStyle = '#efe6d2'; c.fillRect(-2.5, -3, 5, 6); c.fillStyle = 'rgba(60,40,90,.6)'; c.fillRect(-1.6, -1.5, 3.2, .6); c.fillRect(-1.6, .3, 3.2, .6); c.restore(); }
}
// next root: a glowing sprout inside a ring that fills with production sap (gold = your choice, green = the banyan's)
function tagPlate(c, x, y, txt, col) { c.font = "600 11px 'Fredoka',system-ui"; c.textAlign = 'center'; const w = c.measureText(txt).width + 12; c.fillStyle = 'rgba(20,10,38,.88)'; roundRect(c, x - w / 2, y - 7, w, 15, 7); c.fill(); c.fillStyle = col; c.fillText(txt, x, y + 4); }
// map version of the beach boss: rot lump, one green eye, lifebuoy, folder — thinner and smaller with each demotion
function bossSeaPos() {
  if (G.seaPos) return G.seaPos; const s0 = G.start; let best = null;
  T[s0].nb.forEach(n => { if (T[n].reg !== 5) return; (BP[n + '_' + s0] || []).forEach(p => { if (!best || p[0] + p[1] > best[0] + best[1]) best = p; }); });
  if (best) { const [cx, cy] = tileXY(s0), dx = best[0] - cx, dy = best[1] - cy, L = Math.hypot(dx, dy) || 1; best = [best[0] + dx / L * 8, best[1] + dy / L * 5]; }
  return G.seaPos = best || [tileXY(s0)[0] + 30, tileXY(s0)[1] + 22];
}
function drawBailiffMini(c, x, y, t, stage, dir, mini) {
  const sc = [1, .88, .75][stage] * 1.7 * (mini || 1), th = [1, .78, .62][stage], bob = Math.sin(t * 1.6) * .5;
  const g = c.createRadialGradient(x, y - 14 * sc, 0, x, y - 14 * sc, 26 * sc); g.addColorStop(0, 'rgba(170,110,255,.35)'); g.addColorStop(1, 'rgba(170,110,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y - 14 * sc, 26 * sc, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(x, y); c.scale(sc * dir, sc);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 0, 9 * th, 1.8, 0, 0, Math.PI * 2); c.fill();
  const body = '#1d2a1c', mid = '#2c4429';
  c.fillStyle = body; c.fillRect(-5 * th, -9, 3.6 * th, 9); c.fillRect(1.6 * th, -9, 3.6 * th, 9);
  const E = (ex, ey, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(ex * th, ey + bob, rx * th, ry, 0, 0, Math.PI * 2); c.fill(); };
  E(0, -17, 10, 9, body); E(-4, -23, 6, 5, mid); E(5, -21, 5, 4.5, mid); E(0, -27, 6.5, 5, body);
  c.strokeStyle = '#a07a46'; c.lineWidth = 1; c.beginPath(); c.moveTo(-9 * th, -12 + bob); c.quadraticCurveTo(0, -8 + bob, 9 * th, -15 + bob); c.stroke();
  c.save(); c.translate(-5 * th, -21 + bob); c.rotate(-.5); c.lineWidth = 2.4; for (let k = 0; k < 8; k++) { c.strokeStyle = k % 2 ? '#f4f1ea' : '#d8382e'; c.beginPath(); c.arc(0, 0, 4.6, k * Math.PI / 4, (k + 1) * Math.PI / 4); c.stroke(); } c.restore();
  E(2, -26, 3.8, 3.3, '#eaffd9'); E(2.5, -26, 2.2, 2.2, '#39e639'); E(2.8, -26, .9, 1.3, '#0b140b');
  if (stage < 2) { c.fillStyle = '#c9a25e'; c.fillRect(-13 * th, -14 + bob, 7, 5); c.fillStyle = '#e8c88a'; c.fillRect(-13 * th, -14 + bob, 7, 1.3); }
  else { c.fillStyle = '#b08a58'; c.fillRect(-7, -15 + bob, 14, 8); c.fillStyle = '#8a6a40'; c.fillRect(-7, -15 + bob, 14, 1.6); c.fillStyle = '#e8c88a'; c.fillRect(-4, -18 + bob, 3, 3); }
  if (stage >= 1) { c.fillStyle = '#ffd45a'; c.fillRect(-1, -20 + bob, 9 * th + 2, 3.4); c.fillStyle = '#3b2a1a'; c.font = "600 3px 'Fredoka',system-ui"; c.textAlign = 'left'; c.fillText('PROBATION', -.6, -17.6 + bob); }
  c.restore();
}
function drawNextRoot(c, x0, y0, t, f, mine) {
  const x = x0 + 22, y = y0 + 2, col = mine ? '255,212,90' : '141,255,106';
  const g = c.createRadialGradient(x, y, 0, x, y, 20); g.addColorStop(0, 'rgba(' + col + ',' + (.35 + .15 * Math.sin(t * 3)) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, 20, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(235,255,210,.30)'; c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 3; c.stroke();
  if (f > 0) { c.strokeStyle = 'rgb(' + col + ')'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); c.stroke(); }
  // v024: a root knot — three strands join, a fourth grows as the ring fills
  c.lineCap = 'round';
  const strand = (x1, y1, w, k) => { c.strokeStyle = '#5a3b1e'; c.lineWidth = w + 1.4; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x) / 2 + k, (y1 + y) / 2 + 2, x, y - 1); c.stroke(); c.strokeStyle = '#c8924a'; c.lineWidth = w; c.stroke(); };
  strand(x - 7, y + 7, 2.2, -2); strand(x, y + 8, 2.4, 1); strand(x + 7, y + 7, 2.2, 2);
  if (f > 0) { const ex = x + 9 - 9 * f, ey = y + 9 - 9 * f; c.strokeStyle = 'rgb(' + col + ')'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 9, y + 9); c.lineTo(ex, ey); c.stroke(); }
  c.fillStyle = '#8a5a2e'; c.beginPath(); c.arc(x, y - 1, 3.2, 0, Math.PI * 2); c.fill(); c.fillStyle = '#e2bd84'; c.beginPath(); c.arc(x - .8, y - 1.8, 1.3, 0, Math.PI * 2); c.fill();
  c.font = "700 9px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = 'rgb(' + col + ')'; c.fillText('+1', x, y - 6);
  c.font = "600 10px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = 'rgba(' + col + ',.95)'; c.fillText('root +1', x, y + 23);
}
function drawBanyan(c, x, y, t, friend, sc) {   // v019: more detail; sc scales it (the first banyan is drawn large)
  sc = sc || 1; const sway = Math.sin(t * 1.1) * .8;
  c.save(); c.translate(x, y); c.scale(sc, sc);
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0, 1, 22, 6, 0, 0, Math.PI * 2); c.fill();
  // prop roots: aerial roots that reached the ground and became trunks of their own
  const bark = ['#4e3419', '#5f4122', '#6b4a26'];
  [[-19, -27, 1.2], [-11, -30, 1.6], [12, -30, 1.5], [20, -26, 1.1]].forEach(([dx, top, w], i) => {
    c.fillStyle = bark[i % 3]; c.beginPath(); c.moveTo(dx - w, 0); c.quadraticCurveTo(dx * .9 - w * .6, top * .5, dx * .8 - w * .5 + sway * .3, top); c.lineTo(dx * .8 + w * .5 + sway * .3, top); c.quadraticCurveTo(dx * .9 + w * .6, top * .5, dx + w, 0); c.fill();
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(dx, .5, w * 1.6, 1.2, 0, 0, Math.PI * 2); c.fill(); });
  // the main trunk: twisted, with buttresses
  c.fillStyle = '#5a3d1e'; c.beginPath(); c.moveTo(-11, 0); c.quadraticCurveTo(-5, -2, -5.5, -12); c.quadraticCurveTo(-6.5, -22, -4, -30); c.lineTo(4.5, -30); c.quadraticCurveTo(6.5, -20, 5.2, -12); c.quadraticCurveTo(5, -2, 11, 0); c.fill();
  c.strokeStyle = '#3e2810'; c.lineWidth = .8; [[-2, -2, -1.5, -26], [1.5, -3, 2, -24], [-4, -1, -3, -10]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo(a + 1.5, (b + e) / 2, d, e); c.stroke(); });
  c.fillStyle = 'rgba(255,220,160,.18)'; c.fillRect(-3.5, -28, 1.6, 24);
  // hanging aerial roots, swaying
  c.strokeStyle = '#7a5530'; c.lineWidth = .7;
  c.globalAlpha = .7; for (let k = -7; k <= 7; k += 2) { const ax = k * 3.3 + sway, len = 8 + ((k * 7 + 63) % 11); c.beginPath(); c.moveTo(ax, -30); c.quadraticCurveTo(ax + Math.sin(t * 1.3 + k) * 1.2, -30 + len * .6, ax + Math.sin(t * 1.3 + k) * 1.6, -30 + len); c.stroke(); } c.globalAlpha = 1;
  // canopy: dark underside, mid layer, sunlit top
  const G3 = friend ? ['#24601f', '#3a8f32', '#5cbf45', '#8fdc6a'] : ['#21561f', '#357d30', '#4fa640', '#7fc85e'];
  const blobs = [[-25, -31, 9, 5, 0], [25, -32, 9, 5, 0], [-14, -33, 12, 6, 0], [13, -34, 12, 6, 0], [0, -32, 13, 6, 0],
    [-21, -37, 9, 5.5, 1], [20, -38, 10, 5.5, 1], [-8, -40, 12, 6.5, 1], [9, -41, 12, 6.5, 1], [-12, -45, 9, 5, 2], [4, -47, 11, 5.5, 2], [17, -44, 7, 4, 2]];
  blobs.forEach(([dx, dy, rx, ry, l]) => { c.fillStyle = G3[l]; c.beginPath(); c.ellipse(dx + sway * (1 + l * .3), dy, rx, ry, 0, 0, Math.PI * 2); c.fill(); });
  // leaf speckles and highlights
  for (let i = 0; i < 60; i++) { const a = i * 2.399, r = Math.sqrt(i / 60), lx = Math.cos(a) * r * 30 + sway * 1.3, ly = -38 + Math.sin(a) * r * 9;
    c.fillStyle = ly < -42 ? G3[3] : i % 3 ? G3[2] : G3[0]; c.fillRect(lx, ly, 1.3, 1.1); }
  c.fillStyle = 'rgba(220,255,180,.35)'; c.beginPath(); c.ellipse(-2 + sway * 1.6, -49, 9, 2.4, -.1, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(0,30,0,.25)'; c.beginPath(); c.ellipse(sway, -27.5, 30, 2.4, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}
const BANYAN_SC = 1.6;
function woodDisc(c, x, y, r, n, warn) {   // v022: a tree's level, burnt into a slice of its own wood
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x + 1, y + r * .55, r, r * .45, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#8a5a2e'; c.beginPath(); c.ellipse(x, y + 2, r, r * .9, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e2bd84'; c.beginPath(); c.ellipse(x, y, r, r * .9, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(150,100,50,.55)'; c.lineWidth = 1; for (let k = 1; k <= 3; k++) { c.beginPath(); c.ellipse(x, y, r * k / 4, r * .9 * k / 4, 0, 0, Math.PI * 2); c.stroke(); }
  if (warn) { c.strokeStyle = warn; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, r + 2, r * .9 + 2, 0, 0, Math.PI * 2); c.stroke(); }
  c.font = "700 " + Math.round(r * 1.25) + "px 'Fredoka',system-ui"; c.textAlign = 'center'; c.fillStyle = '#4a2a10'; c.fillText(n, x, y + r * .42);
}
function drawWish(c, x, y, t) {
  c.fillStyle = 'rgba(255,246,227,.95)'; roundRect(c, x - 15, y - 13, 30, 24, 10); c.fill();
  c.beginPath(); c.moveTo(x - 4, y + 10); c.lineTo(x, y + 17); c.lineTo(x + 4, y + 10); c.fill();
  c.font = '15px serif'; c.textAlign = 'center'; c.fillText('✨', x, y + 4);
}
function drawCrusoeMini(c, x, y, t, walking, caseTalk) {
  const bob = walking ? Math.sin(t * 16) * 1.2 : 0, sw = walking ? Math.sin(t * 16) * 2 : 0;
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y + 1, 6, 2, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#5d6470'; c.lineWidth = 2.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - 1.5, y - 8); c.lineTo(x - 1.5 - sw, y); c.moveTo(x + 1.5, y - 8); c.lineTo(x + 1.5 + sw, y); c.stroke();
  c.fillStyle = '#f4f1ea'; c.fillRect(x - 4, y - 17 + bob, 8, 10);
  c.fillStyle = G.wandel >= 5 ? '#5a8a3a' : '#8e2a2a'; c.fillRect(x - .7, y - 17 + bob, 1.6, 6);
  c.fillStyle = '#d9a27a'; c.beginPath(); c.arc(x, y - 20.5 + bob, 3.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#4a3324'; c.beginPath(); c.ellipse(x, y - 23 + bob, 3.8, 1.8, 0, Math.PI, 0); c.fill();
  if (G.wandel >= 10) { c.fillStyle = '#7ec850'; c.beginPath(); c.ellipse(x + 3, y - 24 + bob, 2.4, 1.1, .5, 0, Math.PI * 2); c.fill(); }
  // the briefcase — it talks; when it does, its lid flaps
  if (G.fi) return;   // v034: the briefcase is Fi now, she sits on the banyan
  const lid = caseTalk ? Math.abs(Math.sin(t * 14)) * 2.2 : 0, bx = x + 4, by = y - 14 + bob;
  c.fillStyle = '#2b2b2b'; c.fillRect(bx, by, 6, 4.5); c.fillStyle = '#39e639'; c.fillRect(bx, by + 3, 6, .9);
  c.fillStyle = '#3a3a3a'; c.save(); c.translate(bx, by); c.rotate(-lid * .25); c.fillRect(0, -1.2, 6, 1.4); c.restore();
  c.strokeStyle = '#2b2b2b'; c.lineWidth = .8; c.beginPath(); c.arc(bx + 3, by - .4, 1.3, Math.PI, 0); c.stroke();
}
function drawCatMini(c, x, y, t, running, dir) {
  const k = running ? Math.sin(t * 22) * 1.2 : 0;
  c.save(); c.translate(x, y); c.scale(dir || 1, 1); c.translate(-x, -y);
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(x, y + 1, 4, 1.4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f2994a'; c.beginPath(); c.ellipse(x, y - 3 + k * .3, 4, 2.4, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x + 4, y - 5.5, 2.2, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x + 2.6, y - 7); c.lineTo(x + 3.1, y - 9.2); c.lineTo(x + 4.2, y - 7.4); c.fill(); c.beginPath(); c.moveTo(x + 4.6, y - 7.4); c.lineTo(x + 5.6, y - 9.2); c.lineTo(x + 6, y - 6.8); c.fill();
  c.strokeStyle = '#e07b2e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 4, y - 3); c.quadraticCurveTo(x - 7, y - 5 + k, x - 6, y - 8); c.stroke();
  if (running) { c.strokeStyle = '#d9822f'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 2, y - 1); c.lineTo(x - 2 - k, y + 1); c.moveTo(x + 2, y - 1); c.lineTo(x + 2 + k, y + 1); c.stroke(); }
  if (G.catFate === 'dark') { c.fillStyle = 'rgba(255,40,30,.95)'; c.fillRect(x + 4.6, y - 6.4, 1, 1); }   // red eye
  c.restore();
}
function tortPos() {   // v019: halfway between Crab Beach and the waterline
  if (G.tortPos) return G.tortPos; const [cx, cy] = tileXY(G.start), [sx, sy] = bossSeaPos();
  return G.tortPos = [cx + (sx - cx) * .55 + 14, cy + (sy - cy) * .55];
}
function drawTortoiseMini(c, x, y, t, talk) {
  const head = talk ? Math.sin(t * 10) * .8 : 0;
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(x, y + 1, 8, 2.4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#9aa565'; c.beginPath(); c.ellipse(x - 7.5, y - 3 + Math.sin(t * .9) * .4 + head, 2.4, 1.9, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#6f7d3c'; c.beginPath(); c.ellipse(x, y - 2, 6.5, 4.6, 0, Math.PI, 0); c.fill();
  c.fillStyle = '#58652d'; c.fillRect(x - 6.5, y - 2.4, 13, 1.2);
}
function drawThornTower(c, x, y, t) {
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y + 1, 12, 4, 0, 0, Math.PI * 2); c.fill();
  c.lineCap = 'round';
  for (let k = -2; k <= 2; k++) { c.strokeStyle = k % 2 ? '#5a3d1e' : '#6e4a28'; c.lineWidth = 4 - Math.abs(k) * .6; c.beginPath(); c.moveTo(x + k * 4, y); c.bezierCurveTo(x + k * 6 + Math.sin(k) * 4, y - 12, x - k * 3, y - 24, x + k * 1.2, y - 38 - Math.abs(k) * 2); c.stroke(); }
  c.fillStyle = '#e8c88a'; for (let i = 0; i < 9; i++) { const yy = y - 4 - i * 4, xx = (i % 2 ? 1 : -1) * (6 - i * .4); c.beginPath(); c.moveTo(x + xx, yy); c.lineTo(x + xx + (i % 2 ? 4 : -4), yy - 1.5); c.lineTo(x + xx, yy - 3); c.fill(); }
  const g = c.createRadialGradient(x, y - 40, 0, x, y - 40, 12); g.addColorStop(0, 'rgba(190,255,140,' + (.4 + .2 * Math.sin(t * 2)) + ')'); g.addColorStop(1, 'rgba(190,255,140,0)');
  c.fillStyle = g; c.fillRect(x - 12, y - 52, 24, 24);
}
// the gecko: bigger, dark outline, yellow eye; walks when moving, flicks its tail when idle
function drawGecko(c, x, y, t, running, sc, dir) {
  c.save(); c.translate(x, y); c.scale(sc * (dir || 1), sc);
  const k = running ? Math.sin(t * 20) * 1.3 : 0, flick = running ? 0 : Math.max(0, Math.sin(t * 1.3)) ** 12 * 3, bob = running ? Math.abs(Math.sin(t * 20)) * .4 : 0;
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, 1, 7, 1.8, 0, 0, Math.PI * 2); c.fill();
  c.lineCap = 'round'; c.lineJoin = 'round';
  const body = () => { c.beginPath(); c.moveTo(-4, -2.4 - bob); c.quadraticCurveTo(-9, -1.5 + k * .4, -12, -4.5 - flick); c.stroke(); };
  const legs = () => { c.beginPath(); c.moveTo(-2.5, -1.6); c.lineTo(-4 - k, .6); c.moveTo(2.5, -1.6); c.lineTo(4 + k, .6); c.moveTo(-1.5, -2.6); c.lineTo(-2.5 + k, -4.6); c.moveTo(2, -2.6); c.lineTo(3 - k, -4.6); c.stroke(); };
  c.strokeStyle = '#173a12'; c.lineWidth = 3.4; body(); c.lineWidth = 2.4; legs();
  c.fillStyle = '#173a12'; c.beginPath(); c.ellipse(0, -2.4 - bob, 5.4, 2.7, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(5.4, -3 - bob, 3, 2.3, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#5cc046'; c.lineWidth = 1.8; body(); c.strokeStyle = '#4fae3a'; c.lineWidth = 1.2; legs();
  c.fillStyle = '#5cc046'; c.beginPath(); c.ellipse(0, -2.4 - bob, 4.5, 1.9, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(5.4, -3 - bob, 2.2, 1.6, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#8fe06a'; c.beginPath(); c.ellipse(-.5, -3.3 - bob, 2.5, .6, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ffe14a'; c.beginPath(); c.arc(6.2, -3.6 - bob, 1.1, 0, Math.PI * 2); c.fill(); c.fillStyle = '#111'; c.fillRect(6, -4.3 - bob, .5, 1.4);
  c.restore();
}
function SFXmeow() {}

// ---------- v015 camera: a default view per ebb (what you know + one ring of clouds), free pan/zoom in between ----------
const CAM = { x: CW / 2, y: CH / 2, z: 1, zMax: 2, anim: null, user: false };
function camClamp(c) { c.z = clamp(c.z, 1, CAM.zMax); const hw = SW / 2 / c.z, hh = SH / 2 / c.z; c.x = hw >= CW / 2 ? CW / 2 : clamp(c.x, hw, CW - hw); c.y = hh >= CH / 2 ? CH / 2 : clamp(c.y, hh, CH - hh); return c; }   // v040: a screen wider/taller than the map shows open sea round it
function camSetup() {   // zoom limit
  const land = T.filter(t => t.reg !== 5 && t.maxx > t.minx), w = land.reduce((a, t) => a + (t.maxx - t.minx), 0) / Math.max(1, land.length);
  CAM.zMax = clamp(CW / (3.5 * w), 1.5, 3); CAM.tileW = w;   // the island is only ~8 tiles wide: closest view ≈ 3½ tiles across
}
const CAM_SPAN = 7;   // v019: default zoom frames at most ~7 tiles across; manual zoom still shows the whole island
const CAM_PAD = { l: .2, r: .1, t: .11, b: .22 };   // keep the framed area clear of the HUD (left), the chats (bottom)
function camDefault() {
  // v016: frame what you have walked (state 2), scouted tiles right next to it, Crusoe — and only a third of the way into the fog around
  const core = new Set(); T.forEach(t => { if (t.state === 2 && t.reg !== 5) core.add(t.id); }); if (G.at >= 0) core.add(G.at);
  [...core].forEach(id => T[id].nb.forEach(n => { if (T[n].state === 1 && T[n].reg !== 5) core.add(n); }));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const add = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  core.forEach(id => { const t = T[id]; add(t.minx, t.miny); add(t.maxx, t.maxy); });
  core.forEach(id => { const [ax, ay] = tileXY(id); T[id].nb.forEach(n => { if (core.has(n) || T[n].reg === 5) return; const [bx, by] = tileXY(n); add(ax + (bx - ax) * .67, ay + (by - ay) * .67); }); });
  if (x0 > x1) return { x: CW / 2, y: CH / 2, z: 1 };
  { // v019: the default view never shows more than CAM_SPAN tiles across, centred on Robinson's side of the frame
    const R = CAM_SPAN / 2 * (CAM.tileW || 180), [gx, gy] = G.at >= 0 ? tileXY(G.at) : [(x0 + x1) / 2, (y0 + y1) / 2];
    x0 = Math.max(x0, gx - R); x1 = Math.min(x1, gx + R); y0 = Math.max(y0, gy - R * .62); y1 = Math.min(y1, gy + R * .62); }
  const aw = SW * (1 - CAM_PAD.l - CAM_PAD.r), ah = SH * (1 - CAM_PAD.t - CAM_PAD.b), z = clamp(Math.min(aw / (x1 - x0), ah / (y1 - y0)), 1, CAM.zMax);
  const acx = SW * (CAM_PAD.l + (1 - CAM_PAD.l - CAM_PAD.r) / 2), acy = SH * (CAM_PAD.t + (1 - CAM_PAD.t - CAM_PAD.b) / 2);
  return camClamp({ x: (x0 + x1) / 2 - (acx - SW / 2) / z, y: (y0 + y1) / 2 - (acy - SH / 2) / z, z });
}
function camGo(to, dur) { to = camClamp(Object.assign({}, to)); if (!dur) { Object.assign(CAM, { x: to.x, y: to.y, z: to.z }); CAM.anim = null; return; } CAM.anim = { from: { x: CAM.x, y: CAM.y, z: CAM.z }, to, t: 0, dur }; }
function camHome(dur) { CAM.user = false; camGo(camDefault(), dur === undefined ? .8 : dur); }
function camTick(dt) {
  const a = CAM.anim; if (!a) return; a.t = Math.min(1, a.t + dt / a.dur); const e = a.t < .5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
  CAM.x = lerp(a.from.x, a.to.x, e); CAM.y = lerp(a.from.y, a.to.y, e); CAM.z = lerp(a.from.z, a.to.z, e); if (a.t >= 1) CAM.anim = null;
}
function camSees(x, y, m) { const hw = SW / 2 / CAM.z * (1 - (m || 0)), hh = SH / 2 / CAM.z * (1 - (m || 0)); return Math.abs(x - CAM.x) < hw && Math.abs(y - CAM.y) < hh; }
// v036: each kind of flood event gets its camera tour only the first two floods it happens; after that it plays where you are looking
function tourOK(kind) { G.tours = G.tours || {}; const k = G.tours[kind] || { n: 0, tide: -1 }; if (k.tide !== G.tide) { if (k.n >= 2) return false; k.n++; k.tide = G.tide; G.tours[kind] = k; } return true; }
async function camLook(id, kind) {   // during the flood: swing to a struck tile that is out of view
  if (kind && !tourOK(kind)) return false;
  const [x, y] = tileXY(id); if (camSees(x, y, .15)) return false; camGo({ x, y, z: CAM.z }, .5); await sleep(520); return true;
}
// screen ↔ map
function toMap(e) { const r = cv.getBoundingClientRect(), sx = (e.clientX - r.left) / r.width * SW, sy = (e.clientY - r.top) / r.height * SH; return [CAM.x + (sx - SW / 2) / CAM.z, CAM.y + (sy - SH / 2) / CAM.z, sx, sy]; }
// input: drag to pan, wheel / two fingers to zoom; a tap (little movement) stays a tap
const PTR = new Map(); let DRAG = null;
cv.addEventListener('pointerdown', e => { PTR.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (PTR.size === 1) DRAG = { x: e.clientX, y: e.clientY, cx: CAM.x, cy: CAM.y, moved: false, id: e.pointerId }; else DRAG && (DRAG.moved = true); try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
cv.addEventListener('pointermove', e => {
  if (!PTR.has(e.pointerId)) return; const r = cv.getBoundingClientRect(), k = SW / r.width; const prev = PTR.get(e.pointerId); PTR.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (PTR.size >= 2) {   // pinch
    const [a, b] = [...PTR.values()], pa = e.pointerId === [...PTR.keys()][0] ? prev : a, pb = e.pointerId === [...PTR.keys()][1] ? prev : b;
    const d0 = Math.hypot(pa.x - pb.x, pa.y - pb.y), d1 = Math.hypot(a.x - b.x, a.y - b.y); if (d0 > 0) { camZoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d1 / d0); } if (DRAG) DRAG.moved = true; return;
  }
  if (!DRAG) return; const dx = e.clientX - DRAG.x, dy = e.clientY - DRAG.y;
  if (!DRAG.moved && Math.hypot(dx, dy) > 7) { DRAG.moved = true; clearTimeout(CATHOLD.t); CATHOLD.t = null; }
  if (DRAG.moved) { CAM.anim = null; CAM.user = true; Object.assign(CAM, camClamp({ x: DRAG.cx - dx * k / CAM.z, y: DRAG.cy - dy * k / CAM.z, z: CAM.z })); }
});
['pointerup', 'pointercancel'].forEach(n => cv.addEventListener(n, e => {
  const wasTap = DRAG && !DRAG.moved && PTR.size === 1 && n === 'pointerup'; PTR.delete(e.pointerId);
  if (wasTap) tapAt(e); if (PTR.size === 0) DRAG = null;
}));
function camZoomAt(clientX, clientY, f) {
  const r = cv.getBoundingClientRect(), sx = (clientX - r.left) / r.width * SW, sy = (clientY - r.top) / r.height * SH;
  const mx = CAM.x + (sx - SW / 2) / CAM.z, my = CAM.y + (sy - SH / 2) / CAM.z, z = clamp(CAM.z * f, 1, CAM.zMax);
  CAM.anim = null; CAM.user = true; Object.assign(CAM, camClamp({ x: mx - (sx - SW / 2) / z, y: my - (sy - SH / 2) / z, z }));
}
cv.addEventListener('wheel', e => { e.preventDefault(); camZoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * .0015)); }, { passive: false });

// ---------- frame ----------
let lastT = 0;
function frame(ms) {
  const t = ms / 1000, dt = Math.min(.05, lastT ? t - lastT : .016); lastT = t; G.now = t;
  if (CV.on) { ambTick(dt); WELT.raf(frame); return; }
  updateCat(dt);
  if (PRIO.q.length && !PRIO.open) prioPruefen();
  if (prioCanShow() && prioBudget()) showPrio();
  const seaT = G.phase === 'ebb' ? 1 - (G.gezeit + G.spring) / Math.max(1, RULES.baseTide + G.springMax) : 1, surT = G.phase === 'ebb' && G.gezeit + G.spring === 0 ? 1 : 0;
  G.seaVis = (G.seaVis || 0) + (seaT - (G.seaVis || 0)) * Math.min(1, dt * 1.2); G.surge = (G.surge || 0) + (surT - (G.surge || 0)) * Math.min(1, dt * .8);
  G.tph = (G.tph || 0) + dt * (1 + .4 * G.surge); G.nph = (G.nph || 0) + dt * (1 + .6 * G.surge); G.sph = (G.sph || 0) + dt * (1 + .5 * G.seaVis);
  if (G.stateDirty) composeState();
  if (G.fogDirty || G.knownDirty) composeFog();
  camTick(dt);
  const shk = G.shakeT > t ? (G.shakeT - t) * 22 * K : 0, z = CAM.z, ox = (SW / 2 - CAM.x * z) * K + (Math.random() - .5) * shk, oy = (SH / 2 - CAM.y * z) * K + (Math.random() - .5) * shk;
  const PX = () => mainCtx.setTransform(z, 0, 0, z, ox, oy), UN = () => mainCtx.setTransform(K * z, 0, 0, K * z, ox, oy);
  mainCtx.setTransform(K, 0, 0, K, 0, 0); drawOpenSea(t, z, ox / K, oy / K);   // v040: open sea round the map, no more bars
  PX();
  mainCtx.drawImage(base.c, 0, 0);
  UN(); seaSeam(); PX();
  if (showTiles) mainCtx.drawImage(borders.c, 0, 0);
  UN();
  drawAnim(t);
  PX();
  mainCtx.drawImage(stateLayer.c, 0, 0);
  UN();
  drawUnder(t, dt);
  mainCtx.globalAlpha = .93; mainCtx.drawImage(FOG.out.c, 0, 0, CW, CH); mainCtx.globalAlpha = 1;
  drawOver(t, dt);
  mainCtx.setTransform(K, 0, 0, K, 0, 0);
  vignette(mainCtx);
  ambTick(dt);
  WELT.raf(frame);   // v030: one render loop for the game — only the visible world draws
}

// ---------- build (with a loading screen) ----------
const lbar = $('lbar');
const step = (p, fn) => new Promise(res => setTimeout(() => { fn(); lbar.style.width = p + '%'; res(); }, 20));
async function build() {
  const t0 = performance.now();
  initNoise();
  if (document.fonts && document.fonts.ready) await document.fonts.ready;   // v030: bundled fonts, ready before the labels are baked
  await step(35, buildTerrain);
  await step(55, buildTiles);
  await step(80, renderBase);
  await step(90, renderBorders);
  await step(100, () => { if (tutAus()) G.tut = 'done'; buildGame(); BASE_T = T.map(t => ({ name: t.name, type: t.type, content: t.content ? JSON.parse(JSON.stringify(t.content)) : null, source: t.source })); if (tutAus()) tutEnde(true); composeState(); composeFog(); });   // v061: tutorials off → straight into the game
  WELT.root.querySelector('#info > span').textContent = 'built in ' + Math.round(performance.now() - t0) + ' ms · ' + seeds.length + ' tiles · ';
  const ld = $('loading'); ld.style.opacity = 0; setTimeout(() => ld.remove(), 700);
  G.spring = G.springMax; applyBeach(true); updateHUD(); banner('Low tide · Tide ' + G.tide); camSetup(); camHome(0);
  G.frisch = null; G.frisch = mapState('ebb').m;   // v058: the island's first morning, for the way back after a loss
  setTimeout(kursPing, 3200);
  setTimeout(() => applyBeach(), 2600);
  setTimeout(() => {
    unlockRule('tide');
    say1('intro', 'tortoise', 'There you are. ' + tidesWord(T0) + ' tides on that beach and you never once looked up.' + (tutFertig() ? ' Tap a tile next to you to walk — the cat sniffs ahead for free. Let her.' : ''), true);
    say1('opening', 'briefcase', 'Opening balance: one accountant, one cat, eight hours of low water on the island — plus one golden spring hour for opening the survey. Spend wisely.');
  }, 1200);
  WELT.raf(frame);
}
$('bHome').onclick = () => camHome(.6);
$('bTiles').onclick = e => { showTiles = !showTiles; e.target.textContent = 'Tile borders: ' + (showTiles ? 'on' : 'off'); };
function tidesWord(n) { const w = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'], t = ['', '', 'Twenty', 'Thirty', 'Forty']; return n < 20 ? w[n] : n < 50 ? t[Math.floor(n / 10)] + (n % 10 ? '-' + w[n % 10].toLowerCase() : '') : String(n); }
// ---------- v030: this world's API for SPIEL (the hub calls these) ----------
WELT.api = {
  async start(t0) { setT0(t0 || 11); G.tide = T0; G.board.nextOffer = T0 + 9; await build(); if (SPIEL.kofferStrand() && !G.caseFound) caseFound(); },
  kannWechseln: () => G.phase === 'ebb' && !G.over && $('fight').style.display !== 'flex' && !CV.on,
  kannEnden() { if (G.finale === 1) { toast('Not now — the island is celebrating.'); return false; } return G.phase === 'ebb' && !G.over && $('fight').style.display !== 'flex' && !CV.on; },
  gezeigt() { lastT = 0; if (SPIEL.inselBereit) updateHUD(); },   // (while the island is still being charted there is nothing to show yet)
  hud() { if (SPIEL.inselBereit) { updateHUD(); renderPanel(); } },
  endEbb: () => endEbb(),
  toast: t => toast(t),
  zustand: kind => mapState(kind),
  logbuchCtx: () => { const g = {}; Object.keys(G_GRUND0).forEach(k => { if (!G_SKIP.has(k)) g[k] = G_GRUND0[k]; }); return { gGrund: g, gVorlage: mapState('ebb').m.G, tBase: BASE_T }; },   // v062
  laden: st => mapLoad(st),
  bilanz: () => bilanz(),   // v033: readable columns for the save file
  sprung: k => applySkip(k),   // v036: a shortcut from the cat window
  tiden: () => ({ n: G.gezeit, max: RULES.baseTide, spring: G.spring, springMax: G.springMax, flash: G.springFlash !== undefined && G.now - G.springFlash < 3.5 ? 1 + Math.round(G.now * 6) % 6 : 0 }),   // v061: flash = a new spring hour
  modal: () => ['card', 'prio', 'fight', 'call', 'drama', 'endScr', 'ledgerScr', 'rulesScr', 'treeScr', 'fiScr', 'mem', 'cave'].some(k => { const e = $(k); return e && e.style.display === 'flex'; }),
  fi: () => !!G.fi,
  ressI: () => { const h = ernte(); return { wFree: G.wFree, wandel: G.wandel, fruit: G.res.fruit, coco: G.res.coco, gecko: !!G.friends.gecko, fruitNext: h.fruit, cocoNext: h.coco }; },   // v040: for the shared resource row
  fiInfo: () => { const si = stageIdx(), nx = STAGES[si + 1];   // v038: everything the hub (briefcase / Fi bottom left) shows
    return { fi: !!G.fi, koffer: !!G.caseFound, stufe: fiStufe(), omen: !!storySeen.fiOmen1, look: G.fiLook || 0, talk: G.talk.briefcase > G.now, memos: $('lBadge').style.display === 'block', rules: rulesNew, banyan: !!G.friends.banyan,
      wandel: G.wandel, wMax: G.wandelMax || WMAX, frei: Math.min(G.wFree, G.wandel), freiAlle: G.wFree, sicht: si + 1, stufeName: stage(), naechste: nx ? nx[0] : null, naechsteName: nx ? nx[1] + ' (' + STAGE_FX[nx[1]] + ')' : '', befall: G.inf, drohung: threatLevel(), drohTxt: THREAT[threatLevel()][0] }; },
  baum: () => UNLOCKS.map(islandNode),
  baumNeu: () => { if ($('treeScr').style.display === 'flex') renderTree(); },   // v056: after the Dream closes
  lerne: id => lerneUnlock(id),
  tide: () => G.tide,
  spring: () => G.phase === 'ebb' ? G.spring : 0,
  springNehmen() { if (G.phase !== 'ebb' || G.spring <= 0) return false; G.spring--; updateHUD(); return true; },
  turm: () => !!G.tower,
  turmStufe: () => G.tower ? (G.tower2 ? 2 : 1) : 0,   // v043
  regeln: sel => regelnInsel(sel),   // v044
  kofferFaellig: () => G.scen === 'real' && !G.caseFound && G.tide >= CASE_AT,
  kofferHat: () => !!G.caseFound,
  turmRing: () => !!G.towerRing, turmRingAus: () => { G.towerRing = false; },
  rotGekaempft: () => !!G.flags.rotSelbst || (G.es.cleanse || 0) + (G.es.burn || 0) > 0,
  koffer: () => caseFound(),
  katzeWeg: () => G.catFate === 'gone',
  wartet: () => !!(PRIO.open || PRIO.q.length),   // something on the island is waiting to be read
};

