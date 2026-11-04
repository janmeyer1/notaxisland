// ============================================================================
// INSELGENERATOR — noise, terrain, regions, tiles, colours, projection, base layer, sprites, borders, tile graph, fog
// Shares one scope with insel.js (build.mjs puts both into one block).
// ============================================================================
'use strict';
// =====================================================================
// Island world map — baked terrain layer + live animation layer.
// Terrain is computed once (fine 2px grid), cached as an image; only
// waves, surf, smoke, birds, bats and glows are redrawn every frame.
// Positions are fractions of the grid (0..1), so detail can change freely.
// =====================================================================
const CW = 1600, CH = 1000, GW = 800, GH = 600, S = CW / GW, SC = 400 / GW;   // SC: noise scale vs. the old 400-wide grid
const TILT = .74, ELEV = 210, SEED = 7;
const K = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1));   // v015: ≥1.5 so the map stays sharp when the camera zooms in
const VX = .5, VY = .43;
const ESCARP = [[.435, .50], [.375, .80]];
const THICKET = [[.585, .12], [.635, .82]];
const WELT = SPIEL.welt('insel');   // v030: this world's handle in the game hub (root element, scoped $, render loop, API)
const cv = WELT.$('cv');
// v040: the map canvas fills the screen; SW × SH = the screen in map units at zoom 1 (the 1600 × 1000 map fits inside, the rest is open sea)
let SW = CW, SH = CH;
function viewFit() { const w = innerWidth || CW, h = innerHeight || CH, f = Math.min(w / CW, h / CH); SW = w / f; SH = h / f; cv.width = Math.round(SW * K); cv.height = Math.round(SH * K); }
viewFit(); window.addEventListener('resize', () => { viewFit(); if (typeof camGo === 'function') camGo(CAM, 0); });
const mainCtx = cv.getContext('2d');
let ctx = mainCtx;                                      // drawing helpers draw into whatever layer ctx points to
function layer() { const c = document.createElement('canvas'); c.width = CW * K; c.height = CH * K; const x = c.getContext('2d'); x.setTransform(K, 0, 0, K, 0, 0); return { c, x }; }
let showLabels = true, showTiles = true;

// ---------- noise ----------
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rnd, perm;
function initNoise() { rnd = mulberry(SEED * 9973 + 1); perm = new Float32Array(256 * 256); for (let i = 0; i < perm.length; i++) perm[i] = rnd(); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const g = (a, b) => perm[((a & 255) * 256) + (b & 255)];
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return (g(xi, yi) * (1 - u) + g(xi + 1, yi) * u) * (1 - v) + (g(xi, yi + 1) * (1 - u) + g(xi + 1, yi + 1) * u) * v;
}
function fbm(x, y, o) { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < (o || 5); i++) { s += a * vnoise(x * f, y * f); n += a; a *= .5; f *= 2.03; } return s / n; }
function ridged(x, y, o) { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < (o || 4); i++) { const r = 1 - Math.abs(vnoise(x * f, y * f) * 2 - 1); s += a * r * r; n += a; a *= .5; f *= 2.1; } return s / n; }
// cellular noise: distance to nearest and second-nearest feature point → plates and cracks
function worley(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y); let f1 = 9, f2 = 9;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = xi + dx, cy = yi + dy;
    const px = cx + perm[((cx & 255) * 256) + (cy & 255)], py = cy + perm[(((cx + 37) & 255) * 256) + ((cy + 91) & 255)];
    const d = Math.hypot(px - x, py - y);
    if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
  }
  return [f1, f2];
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }
function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / L, 0, 1);
  const qx = a[0] + t * dx, qy = a[1] + t * dy;
  return { d: Math.hypot(px - qx, py - qy), side: Math.sign(dx * (py - a[1]) - dy * (px - a[0])), t };
}

// ---------- terrain ----------
let H, moist, feat, region, seeds, lavaAmt, tangleAmt, plat, caveAmt, cellReg;
const F_LAVAFIELD = 1, F_THICKET = 2, F_STREAM = 4, F_GUANO = 8, F_LAVA = 16, F_RIM = 32, F_ESC = 64, F_CAVERIM = 128;
function volR(nx, ny) { return Math.hypot((nx - VX) / .13, (ny - VY) / .115); }
function volRW(nx, ny) { return volR(nx, ny) + (fbm(nx * 7 + 13, ny * 7 + 2, 3) - .5) * .7; }
function escSigned(nx, ny) {
  const wx = nx - Math.sin(ny * 21 + 1) * .01 - (fbm(ny * 8, 9, 3) - .5) * .03;
  const a = ESCARP[0], b = ESCARP[1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  return (dx * (ny - a[1]) - dy * (wx - a[0])) / L;
}
function plateauMask(nx, ny) { return smooth(-.004, .007, escSigned(nx, ny)) * smooth(1.45, 1.75, volRW(nx, ny)); }
function thicketSigned(nx, ny) {
  const wx = nx - Math.sin(ny * 26) * .012 - (fbm(ny * 9, 5, 3) - .5) * .03;
  const a = THICKET[0], b = THICKET[1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  return -(dx * (ny - a[1]) - dy * (wx - a[0])) / L;
}
function buildTerrain() {
  const N = GW * GH;
  H = new Float32Array(N); moist = new Float32Array(N); feat = new Uint8Array(N);
  lavaAmt = new Float32Array(N); tangleAmt = new Float32Array(N); plat = new Float32Array(N); caveAmt = new Float32Array(N);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const nx = x / GW, ny = y / GH, i = y * GW + x;
    const wx = (fbm(nx * 3 + 11, ny * 3 + 3, 4) - .5) * .22, wy = (fbm(nx * 3 + 41, ny * 3 + 17, 4) - .5) * .22;
    const dx = (nx - .5 + wx) / .40, dy = (ny - .48 + wy) / .36;
    const d = Math.sqrt(dx * dx + dy * dy);
    let h = (1 - Math.pow(d, 1.9)) * .30 + (fbm(nx * 6, ny * 6, 5) - .5) * .24;
    // volcano: cone, rim, crater, radial erosion gullies with sharp ribs
    const vr = volR(nx, ny), ang = Math.atan2(ny - VY, nx - VX);
    h += Math.exp(-vr * 2.0) * 1.15;
    const rimNoise = .85 + .3 * fbm(Math.cos(ang) * 2 + 50, Math.sin(ang) * 2 + 50, 2);
    h += Math.exp(-Math.pow((vr - .12) / .04, 2)) * .10 * rimNoise;
    h -= Math.exp(-Math.pow(vr / .10, 2)) * .42;
    if (Math.abs(vr - .12) < .03) feat[i] |= F_RIM;
    const gully = Math.abs(Math.sin(ang * 13 + fbm(nx * 5, ny * 5, 3) * 5));
    h += (Math.pow(gully, .6) - .62) * .075 * smooth(.12, .3, vr) * smooth(1.7, .8, vr);
    h += (ridged(nx * 22, ny * 22, 3) - .45) * .05 * smooth(.2, .5, vr) * smooth(1.6, 1.0, vr);
    // the start bay
    const br = Math.hypot((nx - LM.bay[0]) / .055, (ny - LM.bay[1]) / .04);
    h -= Math.exp(-br * br) * .14;
    // lagoon
    const lr = Math.hypot((nx - LM.lagoon[0]) / .08, (ny - LM.lagoon[1]) / .10);
    h -= Math.exp(-lr * lr) * .22;
    // Booby Cliffs plateau, with rough rocky edges
    const pm = plateauMask(nx, ny); plat[i] = pm;
    if (h > -.03) {
      h += pm * .12 + pm * (1 - pm) * 4 * (ridged(nx * 40, ny * 40, 3) - .5) * .05;
      if (pm > .12 && pm < .88 && h > .02) feat[i] |= F_ESC;
    }
    // bird rocks
    const bc = Math.hypot((nx - LM.birds[0]) / .07, (ny - LM.birds[1]) / .05);
    if (bc < 1.4) { h += Math.exp(-bc * bc) * .16 + (ridged(nx * 50, ny * 50, 3) - .5) * .04 * Math.exp(-bc * bc); if (h > .05 && bc < 1.1) feat[i] |= F_GUANO; }
    // bat cave: an outcrop on the mountain's south-west flank with a dark mouth under it
    const cr = Math.hypot((nx - LM.cave[0]) / .014, (ny - LM.cave[1]) / .010);
    const crTop = Math.hypot((nx - LM.cave[0]) / .022, (ny - (LM.cave[1] - .012)) / .013);
    h += Math.exp(-crTop * crTop) * .06;
    if (cr < 1) caveAmt[i] = smooth(1, .25, cr);
    else if (crTop < 1.5) feat[i] |= F_CAVERIM;
    // old lava field
    {
      const vrw = volRW(nx, ny);
      const band = smooth(.95, 1.2, vrw) * smooth(1.85, 1.45, vrw);
      const south = smooth(.25, .6, Math.sin(ang)) * smooth(.75, .45, Math.abs(Math.cos(ang)));
      const amt = band * south * (.55 + .9 * fbm(nx * 10 + 3, ny * 10, 3)) - .45;
      if (amt > 0 && h > .06) { lavaAmt[i] = clamp(amt * 2.2, 0, 1); if (lavaAmt[i] > .3) feat[i] |= F_LAVAFIELD; h += lavaAmt[i] * (ridged(nx * 60, ny * 60, 2) - .5) * .015; }
    }
    // fresh lava flow
    const lf = segDist(nx, ny, [VX + .04, VY - .035], [VX + .14, VY - .16]);
    if (lf.d < .006 + .004 * fbm(nx * 30, ny * 30, 2) && h > .02) feat[i] |= F_LAVA;
    // the tangle
    const th = segDist(nx - Math.sin(ny * 26) * .012 - (fbm(ny * 9, 5, 3) - .5) * .03, ny, THICKET[0], THICKET[1]);
    {
      const amt = (1 - th.d / (.03 + .02 * fbm(nx * 14 + 8, ny * 14, 3))) * smooth(0, .03, th.t) * smooth(1, .97, th.t) * smooth(.9, 1.3, vr);
      if (amt > 0 && h > .03) { tangleAmt[i] = clamp(amt * 1.6, 0, 1); if (tangleAmt[i] > .35) feat[i] |= F_THICKET; }
    }
    // stream
    const wig = (fbm(ny * 25, 3, 2) - .5) * .012;
    const st2 = segDist(nx - wig, ny, LM.spring, [LM.bay[0] + .01, LM.bay[1] - .03]);
    if ((st2.d < .0035 || Math.hypot((nx - LM.spring[0]) / .014, (ny - LM.spring[1]) / .011) < 1) && h > 0) feat[i] |= F_STREAM;
    h -= .06;
    // the plateau meets the sea as a sheer cliff: no sand, deeper water at its foot
    if (pm > .35) { if (h >= 0 && h < .12) h = .12 + h * .5; else if (h < 0 && h > -.05) h = -.05 + h * .3; }
    H[i] = h;
    moist[i] = fbm(nx * 4 + 70, ny * 4 + 70, 4) + (ny - .5) * .3 - Math.max(0, (nx - .5)) * .2;
  }
}
const at = (x, y) => H[clamp(y, 0, GH - 1) * GW + clamp(x, 0, GW - 1)];
const atf = (fx, fy) => at((fx * GW) | 0, (fy * GH) | 0);

// ---------- regions & tiles ----------
const TILE_MIN_H = -.135, TILE_AREA = 1650 * (GW / 400) * (GH / 300);
function cellRegion(x, y) {
  const i = y * GW + x, h = H[i], nx = x / GW, ny = y / GH;
  if (h < TILE_MIN_H) return 0;
  if (h < -.02) return 5;
  if (plat[i] > .5) return 2;
  const vr = volRW(nx, ny), east = thicketSigned(nx, ny) > -.012;
  if (vr < 1.7) return 3;
  if (east) return 4;
  if (ny < VY + .02) return 3;
  return 1;
}
let REG_C = {}, BORDER_C = {};
const regOf = r => r === 5 ? 4 : r;
function buildTiles() {
  cellReg = new Int8Array(GW * GH);
  const cells = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const r = cellRegion(x, y); cellReg[y * GW + x] = r; if (r) cells[r].push(y * GW + x); }
  seeds = [];
  [1, 2, 3, 4, 5].forEach(r => {
    const list = cells[r]; if (!list.length) return;
    const n = Math.max(2, Math.round(list.length / (TILE_AREA * { 1: .42, 2: 1, 3: .85, 4: .85, 5: 2.4 }[r])));   // the start region gets small, many tiles
    const minD = Math.sqrt(list.length / n) * .75;
    let placed = 0, tries = 0;
    while (placed < n && tries < 20000) {
      tries++;
      const c = list[(rnd() * list.length) | 0], x = c % GW, y = (c / GW) | 0;
      if (seeds.some(s => s.reg === r && Math.hypot(s.x - x, s.y - y) < minD)) continue;
      seeds.push({ x, y, reg: r, water: r === 5 }); placed++;
    }
  });
  const byReg = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  seeds.forEach((s, k) => byReg[s.reg].push(k));
  region = new Int16Array(GW * GH).fill(-1);
  for (let it = 0; it < 4; it++) {
    const sx = new Float64Array(seeds.length), sy = new Float64Array(seeds.length), sn = new Float64Array(seeds.length);
    for (let i = 0; i < GW * GH; i++) {
      const r = cellReg[i]; if (!r) continue;
      const x = i % GW, y = (i / GW) | 0, ks = byReg[r];
      let best = -1, bd = 1e12;
      for (let j = 0; j < ks.length; j++) { const s = seeds[ks[j]], dx = s.x - x, dy = s.y - y, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = ks[j]; } }
      region[i] = best;
      sx[best] += x; sy[best] += y; sn[best]++;
    }
    if (it < 3) seeds.forEach((s, k) => { if (sn[k]) { s.x = sx[k] / sn[k]; s.y = sy[k] / sn[k]; } });
  }
  REG_C = {}; BORDER_C = {};
  for (let i = 0; i < GW * GH; i++) {
    const r = cellReg[i]; if (!r || r === 5) continue;
    const x = i % GW, y = (i / GW) | 0;
    (REG_C[r] = REG_C[r] || [0, 0, 0]); REG_C[r][0] += x; REG_C[r][1] += y; REG_C[r][2]++;
    if (x < GW - 1 && y < GH - 1) for (const o of [cellReg[i + 1], cellReg[i + GW]]) {
      if (o && o !== 5 && o !== r) { const key = Math.min(r, o) + '-' + Math.max(r, o); (BORDER_C[key] = BORDER_C[key] || [0, 0, 0]); BORDER_C[key][0] += x; BORDER_C[key][1] += y; BORDER_C[key][2]++; }
    }
  }
}

// ---------- colours ----------
const COL = {
  deep: hex('#0a3e5e'), sand: hex('#f2dcaa'), sandWet: hex('#d8bb80'),
  lowland: hex('#8cc152'), grass: hex('#6fae45'), jungle: hex('#2f7a40'), jungleDeep: hex('#215a30'),
  high: hex('#5f7a3c'), rock: hex('#8a7058'), rockDark: hex('#5a4840'), ash: hex('#4a403c'), crater: hex('#2b211e'),
  basalt: hex('#353133'), tangle: hex('#1d3f26')
};
const WATER = [[0, '#d3f7e8'], [.012, '#a6f0de'], [.035, '#5fdccb'], [.06, '#2cc3c6'], [.09, '#1aa6c2'], [.13, '#1484ad'], [.19, '#0f5f8a'], [.28, '#0a3e5e']].map(([d, c]) => [d, hex(c)]);
function waterColor(h, x, y) {
  const d = -h;
  let c = WATER[WATER.length - 1][1];
  for (let k = 0; k < WATER.length - 1; k++) if (d < WATER[k + 1][0]) { c = mix(WATER[k][1], WATER[k + 1][1], (d - WATER[k][0]) / (WATER[k + 1][0] - WATER[k][0])); break; }
  if (d < .10) {
    const sandPatch = fbm(x * .06 + 5, y * .06, 3);
    if (sandPatch > .6) c = mix(c, hex('#c8f3e2'), clamp((sandPatch - .6) * 4, 0, .45) * (1 - d / .1));
    const grass = fbm(x * .08 + 20, y * .08 + 9, 3);
    if (grass > .6 && d > .015) c = mix(c, hex('#2f9e8a'), clamp((grass - .6) * 3, 0, .4));
    const ca = (fbm(x * .05, y * .05 + 3, 3) * 18) % 1;
    if (ca < .07) c = mix(c, [255, 255, 255], .14 * (1 - d / .1));
  }
  if (d > .08 && d < .14) {
    const n = fbm(x * .12, y * .12, 3), chan = fbm(x * .03 + 40, y * .03, 2);
    if (chan > .36) {
      if (n > .48) c = mix(hex('#38c9c4'), hex('#8fe8d6'), clamp((n - .48) * 5, 0, 1));
      if (n > .58) {
        const pick = vnoise(x * .8 + 3, y * .8);
        const coral = pick > .7 ? hex('#ff7f8f') : pick > .45 ? hex('#ffb07a') : pick > .25 ? hex('#c58cff') : hex('#ffe09a');
        c = mix(c, coral, .6 * clamp((n - .58) * 6, 0, 1));
      }
    }
  }
  return c;
}
// rock texture: plates (worley) with darker cracks and fine grit
function rockTex(c, x, y, strength, freq) {
  const [f1, f2] = worley(x * freq, y * freq), edge = f2 - f1;
  let k = 1 + (.5 - f1) * .25 * strength;
  if (edge < .09) k *= 1 - (1 - edge / .09) * .35 * strength;
  k *= 1 + (vnoise(x * 1.3, y * 1.3) - .5) * .18 * strength;
  return [c[0] * k, c[1] * k, c[2] * k];
}
function landColor(h, m, slope, f, x, y, i) {
  let c;
  if (h < .025) c = mix(COL.sandWet, COL.sand, h / .025);
  else if (h < .05) c = mix(COL.sand, COL.lowland, (h - .025) / .025);
  else if (h < .34) {
    const j = clamp((m - .42) * 3.2 + (h - .05) * 2.2, 0, 1);
    c = mix(mix(COL.lowland, COL.grass, (h - .05) / .29), mix(COL.jungle, COL.jungleDeep, (h - .05) / .29), j);
  }
  else if (h < .48) c = mix(COL.jungleDeep, COL.high, (h - .34) / .14);
  else if (h < .66) c = mix(COL.high, COL.rock, (h - .48) / .18);
  else c = mix(COL.rock, COL.ash, clamp((h - .66) / .2, 0, 1));
  let rocky = 0;
  if (h > .06 && slope > .028) { const r = clamp((slope - .028) * 30, 0, .85); c = mix(c, h > .4 ? COL.rockDark : COL.rock, r); rocky = Math.max(rocky, r); }
  if (h > .5) rocky = Math.max(rocky, smooth(.5, .7, h));
  if (lavaAmt[i] > 0) {
    // cracked basalt plates with faintly glowing seams
    const [f1, f2] = worley(x * .22, y * .26), edge = f2 - f1;
    let b = mix(COL.basalt, hex('#4a3b36'), clamp(f1 * 1.3, 0, 1));
    if (edge < .07) b = mix(b, hex('#c2461c'), (1 - edge / .07) * .55);
    c = mix(c, b, lavaAmt[i] * .92);
  }
  if (tangleAmt[i] > 0) c = mix(c, COL.tangle, tangleAmt[i] * .7);
  if (f & F_ESC) { c = mix(c, mix(hex('#5d4c40'), hex('#80705c'), vnoise(x * .8, y * .8)), .65); rocky = 1; }
  if (f & F_CAVERIM) { c = mix(c, hex('#6b5a4c'), .7); rocky = 1; }
  if (f & F_GUANO) { c = mix(c, mix(COL.rock, hex('#9b9284'), .5), .55); rocky = 1; if (vnoise(x * 1.7, y * 1.7) > .78) c = mix(c, [248, 246, 238], .7); }
  if (rocky > 0) c = rockTex(c, x, y, rocky, h > .5 ? .35 : .45);
  if (caveAmt[i] > 0) c = mix(c, hex('#0b0706'), caveAmt[i] * .95);
  return c;
}

// ---------- projection ----------
function proj(x, y, h) { return [x * S, 40 + (y * S - 48) * TILT - Math.max(h, 0) * ELEV]; }
function pf(fx, fy) { return proj(fx * GW, fy * GH, Math.max(0, atf(fx, fy))); }
function rgbs(c, k) { return 'rgb(' + (clamp(c[0] * k, 0, 255) | 0) + ',' + (clamp(c[1] * k, 0, 255) | 0) + ',' + (clamp(c[2] * k, 0, 255) | 0) + ')'; }

// ---------- baked base layer ----------
let base, borders, labels;
const anim = { coast: [], surf: [], wavelets: [], curls: [], birds: [], bats: [], deep: [], water: [], glints: [] };
function renderBase() {
  base = layer(); ctx = base.x;
  const r2 = mulberry(4242);
  ctx.fillStyle = rgbs(COL.deep, 1); ctx.fillRect(0, 0, CW, CH);
  const decor = [];
  const cellH = S * TILT + .8;
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x, h = H[i], f = feat[i], xs = x * SC, ys = y * SC;
      const dx = (at(x + 1, y) - at(x - 1, y)) / (SC * 2), dy = (at(x, y + 1) - at(x, y - 1)) / (SC * 2);
      const slope = Math.hypot(dx, dy) / 2;
      let shade = clamp(1 + (-dx * 1.1 - dy * 1.8) * 11, .42, 1.5), c;
      const [px, py] = proj(x, y, h);
      if (h < 0) {
        c = waterColor(h, xs, ys);
        ctx.fillStyle = rgbs(c, 1); ctx.fillRect(px, py, S + .5, cellH);
        if (h > -.03 && (at(x + 1, y) >= 0 || at(x - 1, y) >= 0 || at(x, y + 1) >= 0 || at(x, y - 1) >= 0)) {
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(px, py, S + .5, cellH);
          if ((x + y) % 2 === 0) {     // coast point for the animated surf, with a normal pointing out to sea
            let gx = at(x + 2, y) - at(x - 2, y), gy = at(x, y + 2) - at(x, y - 2); const L = Math.hypot(gx, gy) || 1;
            anim.coast.push({ x, y, nx: -gx / L, ny: -gy / L, ph: (fbm(xs * .05, ys * .05, 2) * 6), rp: Math.random(), cliff: plat[i] > .35 });
          }
        }
        if (h < -.103 && h > -.12 && fbm(xs * .1 + 9, ys * .1, 2) > .47 && fbm(xs * .03 + 40, ys * .03, 2) > .36 && (x + y) % 2 === 0) anim.surf.push({ x, y });
        continue;
      }
      if (f & F_STREAM) { c = hex('#4fc8e0'); shade = 1.05; }
      else c = landColor(h, moist[i], slope, f, xs, ys, i);
      const vr = volR(x / GW, y / GH);
      if (vr < .1) { c = mix(COL.crater, hex('#ff4a12'), clamp(1 - vr / .085, 0, 1)); shade = 1 + clamp(1 - vr / .085, 0, 1) * .3; }
      if (f & F_RIM) shade *= 1.12;
      if (f & F_LAVA) { c = mix(hex('#ff5a1a'), hex('#ffcf4a'), vnoise(xs * .5, ys * .5)); shade = 1.15; }
      if (caveAmt[i] > 0) shade = lerp(shade, 1, caveAmt[i]);
      ctx.fillStyle = rgbs(c, shade); ctx.fillRect(px, py, S + .5, cellH);
      const drop = (h - Math.max(0, at(x, y + 1))) * ELEV;
      if (drop > 0) {
        const cliff = clamp((drop - 9) / 10, 0, 1);
        let wc = mix(c, (f & F_GUANO) ? hex('#b3a896') : hex('#6e5646'), cliff * .75);
        if (cliff > 0) wc = rockTex(wc, xs * 1.6, ys, cliff, .9);     // vertical-ish rock streaks on walls
        ctx.fillStyle = rgbs(wc, shade * (1 - cliff * .2)); ctx.fillRect(px, py + S * TILT - .4, S + .5, drop + 1.2);
        if (cliff > .5) { ctx.fillStyle = 'rgba(30,20,15,' + (.25 * cliff) + ')'; ctx.fillRect(px, py + S * TILT + drop * .55, S + .5, drop * .45 + 1); }
      }
      // decoration (densities are per old-size cell, so scale down)
      const q = SC * SC * 1.3;
      if (!(f & (F_LAVA | F_STREAM)) && caveAmt[i] === 0 && vr > 1.0) {
        const nx = x / GW, ny = y / GH;
        const rockyCell = (f & (F_ESC | F_GUANO | F_CAVERIM | F_LAVAFIELD)) || (h > .45 && slope > .03);
        if (rockyCell) { if (r2() < .028 * q * (lavaAmt[i] > .3 ? 1.6 : 1)) decor.push(dec(x, y, h, 'rock', r2)); }
        else if (tangleAmt[i] > .15) { if (r2() < .14 * q * tangleAmt[i]) decor.push(dec(x, y, h, 'tangle', r2)); }
        else {
          const dens = fbm(xs * .05 + 31, ys * .05 + 7, 3);
          const inPalms = Math.hypot((nx - LM.palms[0]) / .06, (ny - LM.palms[1]) / .05) < 1;
          const inFruit = Math.hypot((nx - LM.breadfruit[0]) / .035, (ny - LM.breadfruit[1]) / .03) < 1;
          if (inFruit && h > .03) { if (r2() < .07 * q) decor.push(dec(x, y, h, 'breadfruit', r2)); }
          else if (inPalms && h > .02) { if (r2() < .08 * q) decor.push(dec(x, y, h, 'palm', r2)); }
          else if (h > .05 && h < .32 && r2() < .045 * q * dens * dens * 3) decor.push(dec(x, y, h, moist[i] > .47 || h > .16 ? 'tree' : 'palm', r2));
          else if (h >= .012 && h < .05 && r2() < .03 * q) decor.push(dec(x, y, h, 'palm', r2));
        }
      }
    }
    for (let k = decor.length - 1; k >= 0; k--) if (decor[k].y === y) { drawDecor(decor[k]); decor.splice(k, 1); }
  }
  drawCrabs(r2); drawFlotsam(); drawBoobies(r2); drawSpringGlint(); drawCaveLip();
  drawWreck(); drawCrater(); drawStartMarker();
  setupAnim(r2);
}

// ---------- sprites ----------
function dec(x, y, h, t, r) { return { x: x + (r() - .5) * 2, y, h, t, v: (r() * 4) | 0, s: .82 + r() * .4, k: r() }; }
function shadow(px, py, w) { ctx.fillStyle = 'rgba(20,50,25,.33)'; ctx.beginPath(); ctx.ellipse(px + 3, py + 4, w, w * .42, 0, 0, Math.PI * 2); ctx.fill(); }
function blob(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function poly(pts, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]); ctx.closePath(); ctx.fill(); }
const TREE_COLS = [['#2b7039', '#3c8a46'], ['#1f5a2e', '#2f7038'], ['#346f2c', '#4a8a3a'], ['#245e3a', '#2f7a4c']];
const ROCK_COLS = [['#7c6a5a', '#9a8670', '#4e4238'], ['#6a6260', '#8c8480', '#403a38'], ['#806c58', '#a08a72', '#54463a'], ['#5c5450', '#7a726c', '#36302e']];
function drawDecor(d) {
  const [px, py] = proj(d.x, d.y, d.h), s = d.s;
  ctx.save(); ctx.translate(px, py); ctx.scale(s, s);
  if (d.t === 'tree') {
    const [c1, c2] = TREE_COLS[(d.v + (d.h > .2 ? 1 : 0)) % 4];
    if (d.v === 0) { shadow(0, 0, 7); blob(0, -3, 6, c1); blob(-2, -5, 3, 'rgba(255,255,255,.12)'); }
    else if (d.v === 1) { shadow(0, 0, 9); blob(-4, -2, 4.5, c1); blob(4, -2, 4.5, c1); blob(0, -6, 5, c2); blob(-1, -8, 2.2, 'rgba(255,255,255,.12)'); }
    else if (d.v === 2) { shadow(0, 0, 6); ctx.fillStyle = '#5a4128'; ctx.fillRect(-.8, -7, 1.6, 7); blob(0, -10, 5, c1); blob(-3, -8, 3.5, c1); blob(3, -8, 3.5, c2); blob(-1, -12, 2, 'rgba(255,255,255,.14)'); }
    else { shadow(0, 0, 9); ctx.fillStyle = '#5a4128'; ctx.fillRect(-.7, -4, 1.4, 4); ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(0, -6, 9, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(-1, -7.5, 6, 2.4, 0, 0, Math.PI * 2); ctx.fill(); }
  } else if (d.t === 'rock') {
    const [mid, lit, dark] = ROCK_COLS[(d.v + ((d.k * 10) | 0)) % 4];
    ctx.fillStyle = 'rgba(15,10,8,.35)'; ctx.beginPath(); ctx.ellipse(2, 1.5, 6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    if (d.v === 0) { poly([-5, 0, -4, -4, 0, -6, 4, -4, 5, 0], mid); poly([-4, -4, 0, -6, 1, -3, -3, -1], lit); poly([1, -3, 4, -4, 5, 0, 0, 0], dark); }
    else if (d.v === 1) { poly([-6, 0, -5, -3, -1, -4, 1, 0], mid); poly([0, 0, 1, -5, 4, -7, 6, -4, 5, 0], mid); poly([1, -5, 4, -7, 4, -4, 2, -3], lit); poly([-5, -3, -1, -4, -2, -2], lit); poly([4, -4, 6, -4, 5, 0, 3, 0], dark); }
    else if (d.v === 2) { poly([-7, 0, -6, -2, 6, -3, 7, 0], mid); poly([-6, -2, 6, -3, 4, -1.5, -5, -1], lit); poly([4, -1.5, 6, -3, 7, 0, 4, 0], dark); }
    else { poly([-4, 0, -2, -8, 1, -3, 3, -6, 5, 0], mid); poly([-2, -8, 1, -3, -1, -1, -3, -2], lit); poly([3, -6, 5, 0, 2, 0], dark); }
  } else if (d.t === 'breadfruit') {
    shadow(0, 1, 9); blob(0, -4, 8 - d.v * .6, '#4f9a3a'); blob(-2, -6, 4.5, '#6dbb4a'); if (d.v % 2) blob(4, -6, 3.5, '#5aa83f');
    [[-3, -1], [3, -3], [1, 1], [-1, -6]].slice(0, 2 + d.v % 3).forEach(([a, b]) => blob(a, -4 + b, 1.5, '#c7e06a'));
  } else if (d.t === 'tangle') {
    blob(0, -2, 5.5, ['#163521', '#1a3d26', '#14301e', '#1d4229'][d.v]);
    ctx.strokeStyle = '#2c5a2c'; ctx.lineWidth = 1.2; ctx.beginPath();
    if (d.v < 2) { ctx.moveTo(-6, -1); ctx.quadraticCurveTo(-2, -9, 5, -3); ctx.moveTo(-4, -5); ctx.quadraticCurveTo(1, 1, 6, -6); }
    else { ctx.moveTo(-6, -4); ctx.quadraticCurveTo(0, -10, 6, -1); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(-1, -6, 4, -8); }
    ctx.stroke(); if (d.v === 3) blob(2, -6, 1.2, '#c0467a');
  } else {
    const lean = [0, -4, 4, 2][d.v], tall = 10 + d.k * 3;
    const palm = (bx, lx, hgt, fronds) => {
      ctx.strokeStyle = '#7a5a38'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, 2); ctx.quadraticCurveTo(bx + lx * .2, -hgt * .5, bx + lx, -hgt); ctx.stroke();
      ctx.strokeStyle = d.k > .5 ? '#3f8f3f' : '#4a9a40'; ctx.lineWidth = 2;
      for (let a = 0; a < fronds; a++) { const an = -Math.PI + a * (Math.PI * 1.1 / (fronds - 1)) - .05; ctx.beginPath(); ctx.moveTo(bx + lx, -hgt); ctx.quadraticCurveTo(bx + lx + Math.cos(an) * 4, -hgt - 3 + Math.sin(an) * 2, bx + lx + Math.cos(an) * 8, -hgt + 2 + Math.sin(an) * 3); ctx.stroke(); }
      if (d.k > .6) { blob(bx + lx - 1, -hgt + 1.5, 1.1, '#6b4a2b'); blob(bx + lx + 1, -hgt + 1.8, 1.1, '#6b4a2b'); }
    };
    if (d.v === 3) { palm(-2, -3, tall * .85, 5); palm(2, lean, tall, 6); } else palm(0, lean, tall, 5 + (d.v % 2));
  }
  ctx.restore();
}
function drawCaveLip() {
  // a soft inner shadow and a lit lip so the mouth sits *in* the rock
  const [px, py] = pf(LM.cave[0], LM.cave[1] + .004);
  const g = ctx.createRadialGradient(px, py - 4, 1, px, py - 2, 16); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py - 3, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(190,165,135,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(px, py - 1, 11, 4, 0, .1, Math.PI - .1); ctx.stroke();
}
function drawCrater() {
  let best = null;
  const r = Math.round(12 / SC);
  for (let y = (VY * GH - r) | 0; y < VY * GH + r; y++) for (let x = (VX * GW - r) | 0; x < VX * GW + r; x++) { const q = proj(x, y, at(x, y)); if (!best || q[1] < best[1]) best = q; }
  const px = VX * GW * S, py = best[1] + 4;
  ctx.save(); ctx.translate(px, py + 6);
  const rg = ctx.createRadialGradient(0, 0, 10, 0, 0, 30); rg.addColorStop(0, '#5a463c'); rg.addColorStop(1, 'rgba(74,64,60,0)');
  ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(0, 0, 32, 12, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(0, 1, 0, 0, 1, 18); g.addColorStop(0, '#2a1a14'); g.addColorStop(1, '#120b09');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 1, 19, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  const lg = ctx.createRadialGradient(2, 2, 0, 2, 2, 11); lg.addColorStop(0, '#fff2a0'); lg.addColorStop(.35, '#ffb02e'); lg.addColorStop(1, 'rgba(255,70,20,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(2, 2, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,150,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 24, 9, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,20,18,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 24, 9, 0, Math.PI * .05, Math.PI * .95); ctx.stroke();
  ctx.restore();
  anim.crater = [px, py + 8];
}
function drawCrabs(r) {
  for (let k = 0; k < 10; k++) {
    const fx = LM.crabs[0] + (r() - .5) * .05, fy = LM.crabs[1] + (r() - .5) * .02;
    const h = atf(fx, fy); if (h < 0 || h > .05) continue;
    const [px, py] = proj(fx * GW, fy * GH, h);
    ctx.fillStyle = '#e4572e'; ctx.beginPath(); ctx.ellipse(px, py, 2.4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(px - 3.5, py - 1.5, 1.4, 1.4); ctx.fillRect(px + 2.1, py - 1.5, 1.4, 1.4);
  }
}
function drawFlotsam() {
  const [px, py] = pf(LM.flotsam[0], LM.flotsam[1]);
  ctx.save(); ctx.translate(px, py);
  ctx.fillStyle = '#a07850'; ctx.save(); ctx.rotate(.4); ctx.fillRect(-12, -2, 16, 3.5); ctx.restore();
  ctx.save(); ctx.rotate(-.3); ctx.fillRect(2, 3, 14, 3); ctx.restore();
  ctx.fillStyle = '#8b5e34'; ctx.fillRect(-4, -9, 9, 7); ctx.strokeStyle = '#5a3b22'; ctx.lineWidth = 1; ctx.strokeRect(-4, -9, 9, 7);
  ctx.fillStyle = '#2b2b2b'; ctx.fillRect(8, -6, 9, 6); ctx.fillStyle = '#c9a24a'; ctx.fillRect(11.5, -7, 2, 1.4);
  ctx.restore();
}
function drawBoobies(r) {
  const [px, py] = pf(LM.birds[0], LM.birds[1]);
  for (let k = 0; k < 6; k++) {
    const x = px + (r() - .5) * 40, y = py + (r() - .5) * 14;
    ctx.fillStyle = '#f5f2ea'; ctx.beginPath(); ctx.ellipse(x, y - 3, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3fb4e8'; ctx.fillRect(x - 2, y, 1.5, 1.2); ctx.fillRect(x + .5, y, 1.5, 1.2);
  }
}
function drawSpringGlint() {
  const [px, py] = pf(LM.spring[0], LM.spring[1]);
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(px, py + 1, 6, 2.2, 0, 0, Math.PI * 2); ctx.stroke();
}
function drawWreck() {
  let best = null;
  for (let y = 0; y < GH; y += 2) for (let x = (GW * .78) | 0; x < GW; x += 2) { const h = at(x, y); if (h < -.10 && h > -.12 && Math.abs(y - GH * .5) < GH * .25) { if (!best || x > best.x) best = { x, y }; } }
  if (!best) return;
  const [px, py] = proj(best.x, best.y, 0);
  LM.wreck = [best.x / GW, best.y / GH];
  ctx.save(); ctx.translate(px, py); ctx.rotate(-.35);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(2, 6, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ece8f2'; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(24, 0); ctx.lineTo(18, 7); ctx.lineTo(-22, 7); ctx.closePath(); ctx.fill();
  ctx.fillRect(-14, -6, 22, 6); ctx.fillRect(-7, -10, 12, 4);
  ctx.fillStyle = '#39e639'; ctx.fillRect(-12, -3, 18, 1.6);
  ctx.fillStyle = '#5b6b7a'; ctx.fillRect(-12, -5, 3, 2); ctx.fillRect(-6, -5, 3, 2); ctx.fillRect(0, -5, 3, 2);
  ctx.restore();
}
function drawStartMarker() {
  let best = null, bd = 1e9;
  seeds.forEach(s => { if (s.reg !== 1) return; const d = Math.hypot(s.x / GW - LM.crabs[0], s.y / GH - LM.crabs[1]); if (d < bd) { bd = d; best = s; } });
  // v019: the flag stands lower on the crab beach, close to the waterline, and is larger
  let fx = LM.crabs[0] - .012, fy = LM.crabs[1] - .006;
  { const cx = .5, cy = .5, dx = fx - cx, dy = fy - cy, L = Math.hypot(dx, dy) || 1; for (let k = 0; k < 12; k++) { const nx = fx + dx / L * .006, ny = fy + dy / L * .006; if (atf(nx, ny) < .012) break; fx = nx; fy = ny; } }
  const [px, py] = proj(fx * GW, fy * GH, Math.max(0, atf(fx, fy)));
  ctx.strokeStyle = 'rgba(255,246,227,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(px, py, 26, 14, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(px + 2, py + 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a3b22'; ctx.fillRect(px - 1.5, py - 38, 3, 38);
  ctx.fillStyle = '#39e639'; ctx.beginPath(); ctx.moveTo(px + 1.5, py - 38); ctx.quadraticCurveTo(px + 12, py - 36, px + 22, py - 31); ctx.quadraticCurveTo(px + 12, py - 28, px + 1.5, py - 24); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(px + 1.5, py - 38); ctx.quadraticCurveTo(px + 12, py - 36, px + 22, py - 31); ctx.lineTo(px + 1.5, py - 33); ctx.fill();
}

// ---------- borders & labels (cached layers) ----------
function renderBorders() {
  borders = layer(); ctx = borders.x;
  for (let y = 0; y < GH - 1; y++) for (let x = 0; x < GW - 1; x++) {
    const i = y * GW + x, r = region[i]; if (r < 0) continue;
    const rr = region[i + 1], rb = region[i + GW];
    const diffR = rr !== r && rr >= 0, diffB = rb !== r && rb >= 0;
    if (!diffR && !diffB) continue;
    const other = diffR ? rr : rb, regBorder = regOf(seeds[r].reg) !== regOf(seeds[other].reg);
    const [px, py] = proj(x + .5, y + .5, H[i]);
    if (regBorder) { if ((x + y) % 2 === 0) { ctx.fillStyle = 'rgba(255,224,140,.8)'; ctx.fillRect(px - 1.1, py - 1.1, 2.4, 2.4); } }
    else if ((x + y) % 4 === 0) { ctx.fillStyle = H[i] < 0 ? 'rgba(255,255,255,.25)' : 'rgba(255,250,220,.4)'; ctx.fillRect(px - 1, py - 1, 2, 2); }
  }
}
function roundRectBase(x, y, w, h, r) {   // Phase 1: renamed — the later roundRect(c, …) in inselansicht/karte.js used to silently replace this one
 ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function label(fx, fy, txt, o) {
  o = o || {}; const [px, py] = pf(fx, fy);
  ctx.font = o.big ? "600 22px 'Fredoka'" : o.lock ? "600 12px 'Fredoka'" : "400 17px 'Patrick Hand'";
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (o.lock) { const w = ctx.measureText(txt).width + 16; ctx.fillStyle = 'rgba(30,25,20,.62)'; roundRectBase(px - w / 2, py - 10, w, 20, 10); ctx.fill(); ctx.fillStyle = '#ffe08a'; ctx.fillText(txt, px, py + .5); }
  else { ctx.strokeStyle = 'rgba(20,30,25,.65)'; ctx.lineWidth = o.big ? 5 : 4; ctx.strokeText(txt, px, py); ctx.fillStyle = o.big ? 'rgba(' + o.col + ',1)' : '#fff6e3'; ctx.fillText(txt, px, py); }
  ctx.textBaseline = 'alphabetic';
}
function cpos(c) { return [c[0] / c[2] / GW, c[1] / c[2] / GH]; }
function renderLabels() {
  labels = layer(); ctx = labels.x;
  const off = { 1: [0, .02], 2: [-.02, 0], 3: [.12, -.13], 4: [.03, .08] };
  [1, 2, 3, 4].forEach(r => { if (!REG_C[r]) return; const [fx, fy] = cpos(REG_C[r]); label(fx + off[r][0], fy + off[r][1], ['', 'I', 'II', 'V', 'IV'][r] + ' · ' + REGIONS[r].name, { big: true, col: REGIONS[r].col }); });
  label(LM.cave[0] - .05, LM.cave[1] + .03, 'III · Bat Cave', { big: true, col: '200,190,230' });
  label(LM.bay[0], LM.bay[1] + .035, 'the cove');
  label(LM.palms[0] - .025, LM.palms[1] - .015, 'palm grove');
  label(LM.spring[0] + .03, LM.spring[1] - .01, 'spring');
  label(LM.breadfruit[0] + .005, LM.breadfruit[1] - .03, 'breadfruit');
  label(LM.crabs[0] + .03, LM.crabs[1] + .02, 'crab beach');
  label(LM.flotsam[0] - .02, LM.flotsam[1] + .02, 'flotsam');
  label(LM.birds[0], LM.birds[1] + .06, 'booby rocks');
  label(LM.cave[0] - .035, LM.cave[1] + .025, 'bat cave');
  label(LM.lagoon[0], LM.lagoon[1] + .02, 'lagoon');
  label(LM.riptide[0], LM.riptide[1] + .02, 'riptide');
  if (LM.wreck) label(LM.wreck[0] - .02, LM.wreck[1] + .05, 'the wreck');
  const sign = (key, txt, dx, dy) => { if (BORDER_C[key]) { const [fx, fy] = cpos(BORDER_C[key]); label(fx + (dx || 0), fy + (dy || 0), txt, { lock: true }); } };
  sign('1-2', '⛰ climb · gecko');
  sign('1-3', '🔥 lava fields · too hot', 0, .01);
  sign('1-4', '🌿 the tangle · talk to plants', .015, .03);
  sign('3-4', '🌿 the tangle', .01, -.02);
  label(LM.cave[0] + .01, LM.cave[1] + .05, '🦇 dark · bats', { lock: true });
  label(LM.lagoon[0] + .02, LM.lagoon[1] - .05, '🐙 dive · octopus', { lock: true });
  if (LM.wreck) label(LM.wreck[0] - .03, LM.wreck[1] - .045, '🐋 open sea · manta', { lock: true });
}

// ---------- tile graph from the voronoi regions ----------
function buildGame() {
  const n = seeds.length;
  for (let k = 0; k < n; k++) T.push({ id: k, reg: seeds[k].reg, sx: 0, sy: 0, cnt: 0, hs: 0, lava: 0, tangle: 0, nb: new Set(), border: [], samp: [], state: 0, b: 0, prot: false, exh: 0, rooted: false, rs: 0, rootBorn: 0, content: null, name: '', coast: false, minx: 1e9, miny: 1e9, maxx: -1e9, maxy: -1e9 });
  const paths = T.map(() => new Path2D());
  const cellH = S * TILT + .8;
  pick = document.createElement('canvas'); pick.width = CW; pick.height = CH;
  const pc = pick.getContext('2d', { willReadFrequently: true });
  const bpPush = (a, b, p) => { const k = a + '_' + b; (BP[k] || (BP[k] = [])).push(p); };
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x, r = region[i]; if (r < 0) continue;
    const t = T[r], h = H[i];
    t.sx += x; t.sy += y; t.cnt++; t.hs += Math.max(0, h);
    if (lavaAmt[i] > .3) t.lava++; if (tangleAmt[i] > .3) t.tangle++;
    const rr = x < GW - 1 ? region[i + 1] : -1, rb = y < GH - 1 ? region[i + GW] : -1;
    if (rr >= 0 && rr !== r) { t.nb.add(rr); T[rr].nb.add(r); }
    if (rb >= 0 && rb !== r) { t.nb.add(rb); T[rb].nb.add(r); }
    if (h >= 0 && ((x < GW - 1 && H[i + 1] < 0) || (y < GH - 1 && H[i + GW] < 0))) t.coast = true;
    const [px, py] = proj(x, y, h), drop = h > 0 ? Math.max(0, (h - Math.max(0, at(x, y + 1))) * ELEV) : 0, ext = h >= 0 ? 6 : 0;
    paths[r].rect(px, py - ext, S + .6, cellH + drop + ext);
    t.minx = Math.min(t.minx, px); t.maxx = Math.max(t.maxx, px + S); t.miny = Math.min(t.miny, py - ext); t.maxy = Math.max(t.maxy, py + cellH + drop);
    pc.fillStyle = 'rgb(' + (r + 1) + ',0,0)'; pc.fillRect(Math.floor(px), Math.floor(py), Math.ceil(S) + 1, Math.ceil(cellH + drop) + 1);
    if ((rr !== r || rb !== r) && (x + y) % 3 === 0) t.border.push([px + 1, py + 1]);
    if (x % 5 === 0 && y % 5 === 0) t.samp.push([px + 1, py + 1]);
    if (x % 3 === 0 && y % 3 === 0 && h > .012 && !(lavaAmt[i] > .3) && !(feat[i] & F_STREAM)) (t.spots = t.spots || []).push(i);   // v040: where extra plants may grow when the tile is protected
    if ((x + y) % 2 === 0) {
      if (rr >= 0 && rr !== r) { bpPush(r, rr, [px + 1, py + 1]); const [qx, qy] = proj(x + 1, y, H[i + 1]); bpPush(rr, r, [qx + 1, qy + 1]); }
      if (rb >= 0 && rb !== r) { bpPush(r, rb, [px + 1, py + 1]); const [qx, qy] = proj(x, y + 1, H[i + GW]); bpPush(rb, r, [qx + 1, qy + 1]); }
    }
  }
  T.forEach(t => {
    t.cx = t.sx / t.cnt; t.cy = t.sy / t.cnt; const mh = t.hs / t.cnt;
    t.type = t.reg === 5 ? 'water' : t.lava > t.cnt * .3 ? 'lava' : t.tangle > t.cnt * .3 ? 'tangle' : mh < .06 ? 'beach' : mh < .2 ? 'grove' : mh < .4 ? 'jungle' : 'slope';
    t.path = paths[t.id];
    t.name = { beach: 'Beach', grove: 'Grove', jungle: 'Jungle', slope: 'Mountain slope', tangle: 'The tangle', lava: 'Lava fields', water: 'Reef waters' }[t.type];
    if (t.reg === 2) t.name = t.type === 'beach' ? 'Cliff edge' : 'Cliff-top ' + t.name.toLowerCase();
  });
  // landmarks → tiles
  const used = new Set();
  const tileAtF = (fx, fy, want) => {
    let r = region[(fy * GH | 0) * GW + (fx * GW | 0)];
    if (r < 0 || T[r].reg !== want || used.has(r)) {
      let best = -1, bd = 1e9;
      T.forEach(t => { if (t.reg !== want || used.has(t.id)) return; const d = Math.hypot(t.cx / GW - fx, t.cy / GH - fy); if (d < bd) { bd = d; best = t.id; } });
      r = best;
    }
    used.add(r); return r;
  };
  G.start = tileAtF(LM.crabs[0], LM.crabs[1], 1);
  G.banyan = tileAtF(LM.spring[0], LM.spring[1], 1);
  G.gecko = tileAtF(LM.palms[0], LM.palms[1], 1);
  G.fruit = tileAtF(LM.breadfruit[0], LM.breadfruit[1], 1);
  G.flotsam = tileAtF(LM.flotsam[0], LM.flotsam[1], 1);
  const st = T[G.start]; st.name = 'Crab Beach'; st.content = { kind: 'start' }; st.state = 2;
  T[G.banyan].name = 'The spring'; T[G.banyan].content = { kind: 'banyan', icon: '🌿' };
  T[G.gecko].name = 'Palm grove'; T[G.gecko].content = { kind: 'gecko', icon: '🦎' };
  T[G.fruit].name = 'Breadfruit grove'; T[G.fruit].content = { kind: 'res', res: 'fruit', icon: '🍞' };
  T[G.flotsam].name = 'Flotsam cove'; T[G.flotsam].content = { kind: 'memory', icon: '✦' };
  T.filter(t => t.reg === 1 && !used.has(t.id) && (t.type === 'beach' || t.type === 'grove')).slice(0, 2).forEach(t => { t.name = 'Coconut palms'; t.content = { kind: 'res', res: 'coco', icon: '🥥' }; used.add(t.id); G.coco.push(t.id); });
  let nest = -1;
  T.forEach(t => { if (t.reg !== 1 || used.has(t.id) || !t.coast) return; if (nest < 0 || t.cx > T[nest].cx) nest = t.id; });
  const mkNest = (id, name) => { if (id < 0) return; T[id].b = RULES.nestBlight; T[id].source = 'nest'; T[id].name = name; used.add(id); G.nests.push(id); };
  if (nest >= 0) { const left = [...T[nest].nb].filter(n => T[n].reg === 1 && T[n].coast && !used.has(n) && T[n].cx < T[nest].cx).sort((a, b) => T[a].cx - T[b].cx)[0]; if (left !== undefined) nest = left; }   // v061: one tile further left — no tendril in sight at the start
  if (nest >= 0) { G.nest = nest; mkNest(nest, 'Rotting shore'); }
  // region II: on the cliff edge right next to the cove, nearest the palm grove — it will spill over
  { let best = -1, bd = 1e9; T.forEach(t => { if (t.reg !== 2 || used.has(t.id) || ![...t.nb].some(n => T[n].reg === 1)) return; const d = Math.hypot(t.cx - T[G.gecko].cx, t.cy - T[G.gecko].cy); if (d < bd) { bd = d; best = t.id; } }); mkNest(best, 'Rotting cliffs'); G.nest2 = best; }
  // region III and IV: deep inside, under the clouds
  for (const [reg, lm, name] of [[3, [VX, VY], 'Rotting slope'], [4, LM.lagoon, 'Rotting lagoon shore']]) {
    let best = -1, bd = 1e9; T.forEach(t => { if (t.reg !== reg || used.has(t.id)) return; const d = Math.hypot(t.cx / GW - lm[0], t.cy / GH - lm[1]); if (d < bd) { bd = d; best = t.id; } }); mkNest(best, name);
  }
  if (LM.wreck) { const r = region[(LM.wreck[1] * GH | 0) * GW + (LM.wreck[0] * GW | 0)]; if (r >= 0) { G.wreck = r; T[r].b = RULES.wreckBlight; T[r].source = 'wreck'; T[r].name = 'The wreck'; } }
  const br = region[(LM.birds[1] * GH | 0) * GW + (LM.birds[0] * GW | 0)]; if (br >= 0 && T[br].reg === 2) T[br].name = 'Booby rocks';
  // the First Mate's two nests, both up on the cliffs (the cove is full): one near the edge, one deep — not touching each other
  { const d0 = bfsFrom(G.banyan);
    const pickB = (reg, score) => {
      const near2 = t => [...t.nb].some(n => T[n].b > 0 || [...T[n].nb].some(m => T[m].b > 0 && m !== t.id));
      for (const strict of [2, 1, 0]) {
        const c = T.filter(t => t.reg === reg && !used.has(t.id) && t.b === 0 && !t.content && t.id !== G.banyan && t.id !== G.start && !(strict === 2 && near2(t)) && ![...t.nb].some(n => n === G.banyan || n === G.start || G.boss.nests.includes(n) || (strict >= 1 && T[n].b > 0)));
        if (c.length) return c.sort((a, b) => score(b) - score(a))[0];
      }
      return null;
    };
    const mk = (t, name) => { if (!t) return; used.add(t.id); G.boss.nests.push(t.id); (G.bossPlan = G.bossPlan || []).push({ id: t.id, name }); };   // v061: his dens appear only when the tutorial ends (spawnNests)
    mk(pickB(2, t => -Math.abs(d0[t.id] - 3) + (t.coast ? .3 : 0)), 'Ink-rot hollow'); mk(pickB(2, t => d0[t.id] + (t.coast ? .3 : 0)), 'Ink-rot ledge'); }
  T.forEach(t => { if (t.reg === 3 && t.type !== 'lava' && !t.source) t.name = t.type === 'slope' ? 'Fire Mountain' : t.name; });
  { const d1 = bfsFrom(G.gecko), dens = new Set(G.boss.nests);   // v061: a fixed story tile on the cliffs — the Board's washed-up radio (the offers start when you find it)
    const c = T.filter(t => t.reg === 2 && !used.has(t.id) && !t.content && !t.source && t.b === 0 && ![...t.nb].some(n => dens.has(n) || T[n].source) && d1[t.id] >= 2 && d1[t.id] < 1e9).sort((a, b) => Math.abs(d1[a.id] - 3) - Math.abs(d1[b.id] - 3) || a.id - b.id)[0];
    if (c) { used.add(c.id); G.radio = c.id; c.name = 'Washed-up radio'; c.content = { kind: 'radio', icon: '📻' }; } }
  buildSprites(); buildFog();
  { const cr = region[(LM.cave[1] * GH | 0) * GW + (LM.cave[0] * GW | 0)];
    if (cr >= 0) { G.cave = cr; T[cr].name = 'Cave mouth'; T[cr].content = { kind: 'cave', icon: '🦇' };
      const g = [...T[cr].nb].filter(n => T[n].reg === 2).sort((a, b) => (T[a].source ? 1 : 0) - (T[b].source ? 1 : 0) || T[a].b - T[b].b)[0];
      if (g !== undefined) { G.gate = g; if (!T[g].source) T[g].name = 'The rusted gate'; }
      const ct = T[cr]; ct.reg = 6; ct.b = 0; ct.source = null; ct.nbSealed = [...ct.nb].filter(n => n !== G.gate);   // v014: region III, the Bat Cave
      ct.nbSealed.forEach(n => { T[n].nb.delete(cr); ct.nb.delete(n); }); } }
  G.at = G.start; const [gx, gy] = tileXY(G.start); Object.assign(G.group, { x: gx, y: gy, tx: gx, ty: gy, t: 1 });
  newDeck(); planFlood();
}
function tileXY(id) { const t = T[id]; const i = (t.cy | 0) * GW + (t.cx | 0); return proj(t.cx, t.cy, Math.max(0, H[i] || 0)); }

// ---------- tint sprites + fog mask ----------
function makeCloudPattern() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), r = mulberry(99);
  x.fillStyle = '#e9f1f3'; x.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 70; k++) {
    const cx = r() * 256, cy = r() * 256, rad = 18 + r() * 46, g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    const tone = r() < .5 ? '255,255,255' : '205,220,228';
    g.addColorStop(0, 'rgba(' + tone + ',.75)'); g.addColorStop(1, 'rgba(' + tone + ',0)');
    for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { x.save(); x.translate(ox, oy); x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); x.restore(); }
  }
  return c;
}
function buildSprites() {
  T.forEach(t => {
    const pad = 4, bx = Math.floor(t.minx - pad), by = Math.floor(t.miny - pad), bw = Math.ceil(t.maxx - bx + pad), bh = Math.ceil(t.maxy - by + pad);
    t.bb = [bx, by, bw, bh];
    const c = document.createElement('canvas'); c.width = Math.max(1, bw * K); c.height = Math.max(1, bh * K); const x = c.getContext('2d'); x.setTransform(K, 0, 0, K, -bx * K, -by * K); x.fillStyle = '#ffffff'; x.fill(t.path);
    t.tint = c;
  });
}
// Fog = cloud texture minus (known tiles) minus (cat trails at 62 %). Low-res masks, recomposed only when dirty.
const FS = .5, MS = .25;
const FOG = {};
function cvs(w, h, rf) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { c, x: c.getContext('2d', rf ? { willReadFrequently: true } : undefined) }; }
function buildFog() {
  const fw = CW * FS | 0, fh = CH * FS | 0, mw = CW * MS | 0, mh = CH * MS | 0;
  FOG.cloud = cvs(fw, fh); FOG.out = cvs(fw, fh); FOG.known = cvs(mw, mh); FOG.scout = cvs(mw, mh, true);
  const union = cvs(fw, fh);
  union.x.setTransform(FS, 0, 0, FS, 0, 0); union.x.filter = 'blur(1.5px)';
  T.forEach(t => { const [bx, by, bw, bh] = t.bb; union.x.drawImage(t.tint, bx, by, bw, bh); });
  const c = FOG.cloud.x; c.setTransform(FS, 0, 0, FS, 0, 0);
  c.fillStyle = c.createPattern(makeCloudPattern(), 'repeat'); c.fillRect(0, 0, CW, CH);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-in'; c.drawImage(union.c, 0, 0); c.globalCompositeOperation = 'source-over';
}
function composeKnown() {
  const c = FOG.known.x; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, FOG.known.c.width, FOG.known.c.height);
  c.setTransform(MS, 0, 0, MS, 0, 0); c.filter = 'blur(2px)';
  T.forEach(t => { if (t.state < 2) return; const [bx, by, bw, bh] = t.bb; c.drawImage(t.tint, bx, by, bw, bh); });
  c.filter = 'none'; G.knownDirty = false; G.fogDirty = true;
}
function composeFog() {
  if (G.knownDirty) composeKnown();
  const c = FOG.out.x, w = FOG.out.c.width, h = FOG.out.c.height;
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, w, h); c.drawImage(FOG.cloud.c, 0, 0);
  c.globalCompositeOperation = 'destination-out'; c.drawImage(FOG.known.c, 0, 0, w, h);
  c.globalAlpha = .62; c.drawImage(FOG.scout.c, 0, 0, w, h);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; G.fogDirty = false;
}
function revealAt(x, y, r) {
  const c = FOG.scout.x, sx = x * MS, sy = y * MS, sr = r * MS, g = c.createRadialGradient(sx, sy, 0, sx, sy, sr);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.55, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(sx - sr, sy - sr, sr * 2, sr * 2); G.fogDirty = true;
}
function coverage(id) {
  const t = T[id], w = FOG.scout.c.width, d = FOG.scout.x.getImageData(0, 0, w, FOG.scout.c.height).data;
  let hit = 0;
  for (const [x, y] of t.samp) { const i = ((y * MS | 0) * w + (x * MS | 0)) * 4 + 3; if (d[i] > 128) hit++; }
  return t.samp.length ? hit / t.samp.length : 0;
}
function setKnown(t) { if (t.state < 2) { t.state = 2; G.knownDirty = true; G.stateDirty = true; } }

