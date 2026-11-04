// ============================================================================
// TITEL — shipwreck intro (shared beach scope) + title screen (own scope, talks via window.titleOut / window.gameTime)
// Shares one scope with strand.js and kampf.js.
// ============================================================================
// ================= intro: the shipwreck =================
function startSwim() {
  S.screen = 'swim'; S.stamina = SWIM.stamina; S.maxStamina = 5;
  S.swim = { t: 0, x: WU() * .3, waves: [], hits: SWIM.hits1.concat(SWIM.hits2), kitten: null, hoped: false, reef: 0, black: 0, moved: false, ph: 0, dark: 0 };
  S.pointers.clear(); setSurf(.45); updateHUD();
}
function updateSwim(dt) {
  if (SPIEL.katzeOffen) return;   // v062: the sea waits while you are with her
  const s = S.swim, wu = WU(); s.t += dt; s.ph += dt;
  if (s.black <= 0) {
    const d = moveDir();
    if (d) { s.x = clamp(s.x + d * 14 * dt, 8, wu - 8); s.moved = true; s.face = d; }
  }
  // big breaking waves are scheduled; each one that rolls over Crusoe costs stamina
  while (s.hits.length && s.t >= s.hits[0] - 1.1) { s.hits.shift(); s.waves.push({ x: -40, hit: false }); }
  s.waves.forEach(w => {
    w.x += 62 * dt;
    if (!w.hit && w.x >= s.x) {
      w.hit = true; S.stamina = Math.max(0, S.stamina - 1); s.dark = 1; SFX.wave(); updateHUD();
      float(s.x * U, 46 * U, '-1', '#ff8a7a');
      for (let i = 0; i < 18; i++) S.parts.push({ x: s.x * U + rand(-6, 6) * U, y: 56 * U, vx: rand(-10, 20) * U, vy: rand(-40, -15) * U, life: rand(.4, .8), t: 0, col: '#d6f3f7', r: rand(.5, 1) });
      s.x = clamp(s.x + 3, 8, wu - 8);
    }
  });
  s.waves = s.waves.filter(w => w.x < wu + 50);
  s.dark = Math.max(0, s.dark - dt * 1.4);
  // a kitten on a plank
  if (s.t >= SWIM.kittenAt && !s.kitten) s.kitten = { x: wu + 8 };
  if (s.kitten) {
    s.kitten.x += (wu * .66 - s.kitten.x) * Math.min(1, dt * .9);
    if (!s.hoped && s.kitten.x < wu - 6) {
      s.hoped = true; S.stamina = SWIM.hope; SFX.meow(); updateHUD();
      float(s.kitten.x * U, 44 * U, 'A kitten?!', '#ffd27a'); float(s.x * U, 40 * U, 'Stamina!', '#ffb347');
    }
  }
  if (s.t > 8) s.reef = Math.min(1, s.reef + dt * .4);
  if (S.stamina <= 0 && s.hoped) {
    s.black += dt / 1.6;
    if (s.black >= 1.9) startWake();
  }
}
function drawSwim(t) {
  const s = S.swim, wu = WU(), sea = 58 * U;
  const sky = ctx.createLinearGradient(0, 0, 0, sea);
  sky.addColorStop(0, '#0b1426'); sky.addColorStop(1, '#2a3d5c');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, sea + 4 * U);   // v015: reach below the deepest trough, or old frames show through
  // lightning flicker
  if (Math.sin(t * 1.7) > .995 || (t % 7 > 6.9)) { ctx.fillStyle = 'rgba(220,230,255,.25)'; ctx.fillRect(0, 0, W, H); }
  // rain
  ctx.strokeStyle = 'rgba(200,215,240,.25)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 70; i++) { const x = ((i * 137.5 + t * 420) % (W + 60)) - 30, y = ((i * 71.3 + t * 900) % (H + 40)) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 16); }
  ctx.stroke();
  // sea body
  const sg = ctx.createLinearGradient(0, sea, 0, H); sg.addColorStop(0, '#1d4a66'); sg.addColorStop(1, '#0b2236');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, sea + Math.sin(x * .015 + t * 2.2) * 2 * U + Math.sin(x * .04 - t * 3) * .8 * U);
  ctx.lineTo(W, H); ctx.fill();
  // the plank with the kitten
  if (s.kitten) {
    const kx = s.kitten.x * U, ky = sea + Math.sin(t * 2.2 + s.kitten.x * .15) * 2 * U;
    ctx.save(); ctx.translate(kx, ky); ctx.rotate(Math.sin(t * 1.8) * .12);
    ctx.fillStyle = '#8b6a45'; ctx.fillRect(-8 * U, -.6 * U, 16 * U, 2.2 * U);
    ctx.restore();
    drawKitten(kx, ky - .5 * U, 6 * U, { face: -1, ph: t * 2, scared: true });
    s.kitten.sx = kx; s.kitten.sy = ky - 3 * U;   // v062: where to hold her (the cat screen from the intro)
  }
  // crusoe, head and shoulders above the water
  const cx = s.x * U, cy = sea + 17 * U + Math.sin(t * 2.6) * 1.5 * U;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, sea + Math.sin(cx * .015 + t * 2.2) * 2 * U + 1.5 * U); ctx.clip();
  drawCrusoe(cx, cy, 24 * U, { face: s.face || 1, swing: (t % .9) < .3 ? .3 - (t % .9) : 0 });
  ctx.restore();
  ctx.strokeStyle = 'rgba(220,240,250,.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(cx, sea + Math.sin(cx * .015 + t * 2.2) * 2 * U + 1.5 * U, 6 * U, 1.2 * U, 0, 0, Math.PI * 2); ctx.stroke();
  // breaking waves rolling over him (v015: only above the water line, no flat light base)
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, -10); for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, sea + Math.sin(x * .015 + t * 2.2) * 2 * U + Math.sin(x * .04 - t * 3) * .8 * U + 1); ctx.lineTo(W + 10, -10); ctx.closePath(); ctx.clip();
  s.waves.forEach(w => {
    const wx = w.x * U;
    ctx.save(); ctx.translate(wx, sea + 6 * U); ctx.scale(1.8, 1.8); ctx.translate(-wx, -(sea + 6 * U));
    const g = ctx.createLinearGradient(wx - 30 * U, 0, wx + 6 * U, 0); g.addColorStop(0, 'rgba(20,60,85,.0)'); g.addColorStop(.6, 'rgba(25,75,105,.92)'); g.addColorStop(1, 'rgba(40,100,130,.95)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(wx - 34 * U, sea + 4 * U);
    ctx.quadraticCurveTo(wx - 14 * U, sea - 6 * U, wx - 4 * U, sea - 22 * U);
    ctx.quadraticCurveTo(wx + 6 * U, sea - 28 * U, wx + 9 * U, sea - 16 * U);
    ctx.quadraticCurveTo(wx + 3 * U, sea - 19 * U, wx + 1 * U, sea - 10 * U);
    ctx.quadraticCurveTo(wx + 4 * U, sea, wx + 8 * U, sea + 4 * U); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(235,248,252,.85)'; ctx.lineWidth = .9 * U; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(wx - 6 * U, sea - 21 * U); ctx.quadraticCurveTo(wx + 5 * U, sea - 28 * U, wx + 9 * U, sea - 16 * U); ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
  if (s.dark > 0) { ctx.fillStyle = 'rgba(5,15,25,' + s.dark * .65 + ')'; ctx.fillRect(0, 0, W, H); }
  // captions
  ctx.textAlign = 'center'; ctx.font = '400 ' + (3.8 * U) + "px 'Patrick Hand', cursive";
  { const cap = (a, b, txt) => { if (s.t > a && s.t < b) { ctx.fillStyle = 'rgba(255,246,227,' + clamp(Math.min(s.t - a, b - s.t), 0, 1) + ')'; ctx.fillText(txt, W / 2, 18 * U); } };
    cap(2.2, 4.9, 'Before the hammock…'); cap(4.9, 7.8, '…there was the storm.'); }
  if (s.t > 2.6) { ctx.fillStyle = 'rgba(255,246,227,' + (s.moved ? .55 : .5 + .3 * Math.sin(t * 3)) + ')'; /* v015: the hint stays for the whole swim */ ctx.font = '600 ' + (3.2 * U) + 'px Fredoka, sans-serif'; ctx.fillText('A / D — or hold the edges of the screen — to swim', W / 2, 92 * U); }
  if (s.black > 0) {
    ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, s.black) + ')'; ctx.fillRect(0, 0, W, H);
    if (s.black > 1.1) { ctx.fillStyle = 'rgba(255,246,227,' + Math.min(1, (s.black - 1.1) * 2) + ')'; ctx.font = '400 ' + (5 * U) + "px 'Patrick Hand', cursive"; ctx.fillText('…', W / 2, 50 * U); }
  }
}
function startWake() {
  setupEbb(true);
  S.stamina = 0; S.swim = null;
  S.wake = { phase: 'dark', t: 0, r: 22, rise: 0 };
  S.openNut = { fx: OPEN_NUT.fx, fy: OPEN_NUT.fy };
  S.cr.fx = .66; S.cr.face = -1;
  Object.assign(S.kt, { fx: .58, fy: .6, tfx: OPEN_NUT.fx - .035, tfy: OPEN_NUT.fy + .01 });
  S.fade = 1; S.wl = waterTarget();
  setTimeout(() => { if (S.wake) SFX.meow(); }, 900);
  setTimeout(() => { if (S.wake && S.wake.phase === 'dark') SFX.meow(); }, 4500);
  updateHUD();
}
function drinkOpenNut() {
  if (!S.wake || S.wake.phase !== 'dark') return;
  S.stamina = 1; S.openNut = null; SFX.sip(); updateHUD();
  float(crX(), crFy() * H - 10 * U, '+1 Water', '#7fe3ff');
  S.wake.phase = 'open'; S.wake.t = 0;
}
function updateWake(dt) {
  const w = S.wake; w.t += dt;
  if (w.phase === 'dark') {
    if (S.openNut && Math.abs(crX() + S.cr.face * 13 * U - S.openNut.fx * W) < 4 * U) drinkOpenNut();   // his head reaches the coconut
    return;
  }
  w.r = lerp(22, 180, easeOut(clamp(w.t / 1.4, 0, 1)));
  w.rise = clamp((w.t - .6) / .6, 0, 1);
  if (w.t > 1.6) {
    S.wake = null; updateHUD();
    S.kt.tfx = clamp(S.cr.fx - .05, .08, .9); S.kt.tfy = .6;   // the cat comes over first
    setTimeout(() => SFX.meow(), 1200);
    setTimeout(() => say(LINES.wake, () => setTimeout(() => { if (S.tut === 0) { say(LINES.follow); setHint('palm'); } }, 2500)), 2600);
  }
}

// ================= v014 title screen (pixel still life, drawn in code) =================
(function () {


const $ = id => document.getElementById(id);
const TEASERS = [
  'Washed up in a tie. One cat, one tortoise, one island — and something is eating it.',
  'Paradise. Population: you. For now.',
  'Somewhere past the last shipping lane, an accountant learns to live.',
  'The sea took everything except the cat. The cat has opinions.',
];

// ---------- palettes ----------
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BASE = {
  sky: ['#140f33', '#24195a', '#3d2578', '#5f3190', '#8a3c97', '#b84a92', '#e0668c', '#f68c78', '#fbb36a', '#ffd88a'],
  sea: ['#8a6aa6', '#5f5a9e', '#3f4f92', '#283f80'], lagoon: ['#1d8597', '#29a8ab', '#3fc6b5', '#78e2c8'],
  sand: '#f4dca2', sandShade: '#d6b07a', wet: '#bfa07a', foam: '#fff6e8',
  jungle: ['#0f2219', '#183424', '#25482c', '#3f6b3a'], rim: '#f0a060',
  cloud: ['#3c2766', '#6a4794', '#9a64aa', '#f3a69a', '#ffd590'],
  sun: '#fff3c0', sunEdge: '#ffc874', venus: '#ffffff', mars: '#ff6a4a', star: '#cdbfff',
  trunk: ['#2a1d18', '#45302a', '#6b4834', '#b07548'], frond: ['#0c1d15', '#163222', '#26502e', '#4b8a48'],
  ham: ['#f2e4c2', '#d6453a', '#f2e4c2', '#2c8c88'], hamIn: '#a0705a', rope: '#e8d6aa',
  skin: '#e6a97c', skinD: '#b47650', hair: '#3a2418', shirt: '#f4f0e6', shirtD: '#c4bcae', pants: '#c8a874', pantsD: '#9a7c50',
  nut: '#6a4428', nutD: '#4a2c18', nutIn: '#f6f0e0', drink: '#ff9a62', straw: '#ff4a5a', umb: '#ff7ab0', tie: '#c4232c',
  cat: '#f08a2a', catIn: '#ffb4a8', tent: '#0b0910', tentS: '#4c3a70', ink: '#2a1840',
  coral: ['#ff6b6b', '#c86bd8', '#ffcf5a', '#ff9a3c', '#ff8ac8'],
};
let P; const S = { res: 270, dith: 1, crt: 0, omen: 2, anim: 1, teaser: 1 };   // the chosen standard look
function pal() { const o = BASE; const c = {}; for (const k in o) { const v = o[k]; c[k] = Array.isArray(v) ? v.map(x => typeof x === 'string' ? hex(x) : x) : (typeof v === 'string' && v[0] === '#') ? hex(v) : v; } return c; }
const css = c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
function grad(stops, t, x, y) {   // dithered (or banded) pick from a list of colours
  t = Math.max(0, Math.min(.9999, t)) * (stops.length - 1); const i = Math.floor(t), f = t - i;
  const th = (S.dith && !P.flat) ? bay(x, y) : .5; return stops[f > th ? i + 1 : i];
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- canvas + layout ----------
const cv = $('tlCv'), ctx = cv.getContext('2d'), OV = $('overlay');   // OV: kept for the end-of-demo screen (v033)
let endMode = false;
const BG = document.createElement('canvas'), bg = BG.getContext('2d');
const LY = document.createElement('canvas'), ly = LY.getContext('2d', { willReadFrequently: true });
let W, H, U, L = {};
function layout() {
  const st = $('overlay'), dpr = Math.min(window.devicePixelRatio || 1, 3); if (!st) return false;
  const cw = (st.clientWidth || innerWidth) * dpr, ch = (st.clientHeight || innerHeight) * dpr, short = Math.min(cw, ch);
  if (!(cw > 0 && ch > 0)) return false;
  const s = Math.max(1, Math.floor(short / S.res));
  W = Math.ceil(cw / s); H = Math.ceil(ch / s);
  cv.width = BG.width = LY.width = W; cv.height = BG.height = LY.height = H;
  cv.style.width = (W * s / dpr) + 'px'; cv.style.height = (H * s / dpr) + 'px';
  U = Math.min(W, H) / 270; const port = H > W * 1.05;
  L.port = port; L.hz = Math.round(H * (port ? .36 : .45));
  L.bay = Math.round(H * (port ? .29 : .21)); L.beach = L.hz + L.bay; L.reef = L.hz + Math.round(L.bay * .30);
  L.sunX = Math.round(W * (port ? .62 : .64)); L.sunR = Math.round(24 * U);
  const span = Math.min(W * (port ? .88 : .8), 330 * U); L.xl = Math.round(W / 2 - span / 2); L.xr = Math.round(W / 2 + span / 2);
  L.ya = Math.round(H * (port ? .70 : .74)); L.sag = Math.round(30 * U);
  // crt lines: one dark line per art pixel row
  const c = $('tlCrt'); c.style.display = S.crt ? 'block' : 'none'; const px = s / dpr;
  c.style.background = 'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) ' + (px * .6) + 'px, rgba(40,20,60,.35) ' + (px * .6) + 'px, rgba(40,20,60,.35) ' + px + 'px)';
  // menu under the title
  $('tlMenu').style.top = (port ? 22 : 25) + '%';
  return true;
}
const LX = f => W * (L.port ? f * .45 : f), RX = f => W * (L.port ? 1 - (1 - f) * .45 : f);
function beachTop(x) { const u = (x / W) * 2 - 1; return L.beach - Math.round(L.bay * .28 * u * u); }

// draw shapes into a scratch layer, then snap alpha to 0/255 so every edge stays a hard pixel edge
function layer(target, fn) { ly.setTransform(1, 0, 0, 1, 0, 0); ly.clearRect(0, 0, W, H); ly.lineCap = 'round'; ly.lineJoin = 'round'; fn(ly);
  const d = ly.getImageData(0, 0, W, H), a = d.data; for (let i = 3; i < a.length; i += 4) a[i] = a[i] >= 110 ? 255 : 0; ly.putImageData(d, 0, 0); target.drawImage(LY, 0, 0); }
const fill = (c, col) => { c.fillStyle = css(col); };
const ell = (c, x, y, rx, ry, rot) => { c.beginPath(); c.ellipse(x, y, Math.max(.5, rx), Math.max(.5, ry), rot || 0, 0, Math.PI * 2); c.fill(); };
const line = (c, col, w, pts) => { c.strokeStyle = css(col); c.lineWidth = w; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke(); };

// ---------- the still life ----------
function paintBackground() {
  const img = bg.createImageData(W, H), d = img.data, R = rng(7);
  const corals = []; for (let k = 0; k < 26; k++) { const x = LX(.26) + R() * (RX(.74) - LX(.26)), y0 = L.reef + 3 * U, y1 = beachTop(x) - 5 * U; corals.push({ x, y: y0 + Math.pow(R(), 2.2) * (y1 - y0), lx: (7 + R() * 16) * U, hy: (2 + R() * 3) * U, ph: R() * 9, fr: .25 + R() * .35, c: P.coral[k % P.coral.length], c2: P.coral[(k + 2) % P.coral.length] }); }
  const stars = []; for (let k = 0; k < 70; k++) stars.push([R() * W, Math.pow(R(), 1.8) * L.hz * .75, R()]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c; const i = (y * W + x) * 4;
    if (y < L.hz) {
      // sky + halo around the rising sun
      const dx = x - L.sunX, dy = y - L.hz, dist = Math.hypot(dx, dy * 1.6);
      let t = y / L.hz; t = t + Math.max(0, 1 - dist / (L.sunR * 7)) * .22;
      c = grad(P.sky, t, x, y);
      if (Math.hypot(dx, dy) < L.sunR) {   // sun with retro stripes in its lower half
        const up = L.hz - y, gap = up < L.sunR * .55 && (up % Math.max(3, Math.round(4 * U))) < Math.max(1, Math.round((1 - up / (L.sunR * .55)) * 2.4 * U));
        c = gap ? c : (Math.hypot(dx, dy) > L.sunR - 2 * U ? P.sunEdge : P.sun);
      }
    } else {
      const bt = beachTop(x);
      if (y < L.reef) { c = grad(P.sea, (y - L.hz) / (L.reef - L.hz), x, y);
        if (Math.abs(x - L.sunX) < L.sunR * (.5 + (y - L.hz) / (L.reef - L.hz) * 1.1) && ((x * 7 + y * 13) % 11 === 0 || (y % 3 === 0 && bay(x, y) > .82))) c = P.sunEdge; }   // sun path
      else if (y < bt) {
        const t = (y - L.reef) / Math.max(1, bt - L.reef); c = grad(P.lagoon, t, x, y);
        for (const k of corals) { const dx = (x - k.x) / k.lx; if (dx <= -1 || dx >= 1) continue;
          const sk = .18 * (k.x - W / 2) / (W / 2), dxs = Math.max(-1, Math.min(1, dx - sk * (1 - dx * dx)));   // the middle drifts a touch outward
          const top = k.y - k.hy * (1 - dxs * dxs) * (.75 + .25 * Math.sin(dx * 7 + k.ph)) - Math.max(0, Math.sin(x * k.fr + k.ph)) * 1.4 * U;   // a low, bumpy arch
          const bot = k.y + U - k.hy * .4 * (1 - dxs * dxs);   // the underside bows towards the sea too, more gently
          if (y >= top && y <= bot) { const e = (y - top) / Math.max(1, bot - top); if (bay(x, y) < .78 - e * .25) c = bay(x + 1, y) < .5 ? k.c : k.c2; break; } }
      } else if (y < bt + 2 * U) c = P.foam;
      else if (y < bt + 4 * U) c = P.wet;
      else if (y < bt + 12 * U) c = (y > bt + 9 * U && bay(x, y) > .5) ? P.sandShade : P.sand;
      else c = grad(P.jungle, .1 + .3 * ((y - bt) / (H - bt)), x, y);
    }
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  stars.forEach(([x, y, b]) => { const i = ((y | 0) * W + (x | 0)) * 4; if (b > .3) { const k = b > .85 ? 1 : .6; d[i] = P.star[0] * k + d[i] * (1 - k); d[i + 1] = P.star[1] * k + d[i + 1] * (1 - k); d[i + 2] = P.star[2] * k + d[i + 2] * (1 - k); } });
  { const vx = Math.round(W * (L.port ? .84 : .25)), vy = Math.round(L.hz - H * (L.port ? .155 : .105)), i0 = (vy * W + vx) * 4; L.venus = [vx, vy];
    for (const [dx, dy, k] of [[0, 0, 1], [1, 0, .55], [-1, 0, .55], [0, 1, .55], [0, -1, .55]]) { const i = ((vy + dy) * W + vx + dx) * 4; for (let q = 0; q < 3; q++) d[i + q] = P.venus[q] * k + d[i + q] * (1 - k); } }
  bg.putImageData(img, 0, 0);
  // reef foam line
  layer(bg, c => { fill(c, P.foam); for (let x = LX(.23); x < RX(.77); x += 3 * U) { const y = L.reef + Math.sin(x * .05) * 1.5 * U; if (Math.sin(x * .31) > -.2) c.fillRect(x, y, 2 * U, Math.max(1, U)); } });
  L.sky0 = bg.getImageData(0, 0, W, H).data;
  clouds(); headlands(); canopy();
  // Mars and Venus
  layer(bg, c => { fill(c, P.mars); c.fillRect(Math.round(W * (L.port ? .2 : .2)), Math.round(L.hz * (L.port ? .3 : .42)), Math.max(1, Math.round(1.5 * U)), Math.max(1, Math.round(1.5 * U))); });
  if (P.grain) { const g = bg.getImageData(0, 0, W, H), a = g.data, R2 = rng(3); for (let i = 0; i < a.length; i += 4) { const n = (R2() - .5) * 26; a[i] += n; a[i + 1] += n; a[i + 2] += n; } bg.putImageData(g, 0, 0); }
}
function clouds() {
  const R = rng(11), list = L.port
    ? [[.28, -.035, .55, 1], [.78, -.07, .5, .9], [.45, -.13, .45, .8], [.15, -.2, .4, .7], [.75, -.24, .35, .6]]
    : [[.3, -.05, .36, 1], [.8, -.1, .32, .9], [.52, -.2, .28, .75], [.12, -.16, .26, .7], [.68, -.3, .2, .6]];
  list.forEach(([cx, cy, len, k]) => {
    const parts = []; const n = 7; for (let i = 0; i < n; i++) parts.push([W * cx + (i / (n - 1) - .5) * W * len, H * cy + L.hz + (R() - .5) * 3 * U, (10 + R() * 18) * U * k, (2.5 + R() * 3.5) * U * k]);
    layer(bg, c => {
      fill(c, P.cloud[0]); parts.forEach(([x, y, rx, ry]) => ell(c, x, y - 1.5 * U, rx, ry));    // shadowed top
      fill(c, P.cloud[4]); parts.forEach(([x, y, rx, ry]) => ell(c, x + .3 * rx * (x > L.sunX ? -1 : 1) * .2, y + 1.6 * U, rx * .92, ry));   // gold underside
      fill(c, P.cloud[3]); parts.forEach(([x, y, rx, ry]) => ell(c, x, y + .8 * U, rx * .96, ry));
      fill(c, P.cloud[2]); parts.forEach(([x, y, rx, ry]) => ell(c, x, y, rx * .94, ry * .9));
      fill(c, P.cloud[1]); parts.forEach(([x, y, rx, ry]) => ell(c, x - .1 * rx, y - .6 * U, rx * .8, ry * .7));
    });
  });
}
function hillPaths() {
  const Lp = new Path2D(); Lp.moveTo(0, L.hz - 14 * U); Lp.quadraticCurveTo(LX(.08), L.hz - 30 * U, LX(.16), L.hz - 6 * U); Lp.quadraticCurveTo(LX(.2), L.hz + 4 * U, LX(.24), L.reef + 2 * U);
  Lp.lineTo(LX(.3), beachTop(LX(.3)) + 6 * U); Lp.lineTo(0, H); Lp.closePath();
  const Rp = new Path2D(); Rp.moveTo(W, L.hz - 4 * U); Rp.quadraticCurveTo(RX(.9), L.hz - 10 * U, RX(.8), L.hz + 2 * U); Rp.quadraticCurveTo(RX(.76), L.reef - 2 * U, RX(.74), L.reef + 4 * U);
  Rp.lineTo(RX(.7), beachTop(RX(.7)) + 6 * U); Rp.lineTo(W, H); Rp.closePath();
  const q = (p0, p1, p2, n) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = 1 - t; return [a * a * p0[0] + 2 * a * t * p1[0] + t * t * p2[0], a * a * p0[1] + 2 * a * t * p1[1] + t * t * p2[1]]; });
  const n = Math.max(6, Math.round(30 * U));
  const Le = q([0, L.hz - 14 * U], [LX(.08), L.hz - 30 * U], [LX(.16), L.hz - 6 * U], n).concat(q([LX(.16), L.hz - 6 * U], [LX(.2), L.hz + 4 * U], [LX(.24), L.reef + 2 * U], n / 2 | 0));
  const Re = q([W, L.hz - 4 * U], [RX(.9), L.hz - 10 * U], [RX(.8), L.hz + 2 * U], n).concat(q([RX(.8), L.hz + 2 * U], [RX(.76), L.reef - 2 * U], [RX(.74), L.reef + 4 * U], n / 2 | 0));
  return { Lp, Rp, Le, Re };
}
function treePalm(c, x, y, h, lean, col) {   // a small jungle palm standing on a hill edge
  const tx = x + lean * h * .3, ty = y - h; line(c, col, Math.max(1, U), [x, y, x + lean * h * .15, y - h * .5, tx, ty]);
  [-2.8, -2.2, -1.6, -1, -.4].forEach(a => line(c, col, Math.max(1, U), [tx, ty, tx + Math.cos(a) * h * .55, ty + Math.sin(a) * h * .3 + h * .18]));
}
function headlands() {
  const HP = hillPaths(), R = rng(21);
  layer(bg, c => {
    // the far volcano behind the right point
    fill(c, P.jungle[0]); c.beginPath(); const px = RX(.86), top = L.hz - 46 * U;
    c.moveTo(RX(.62), L.hz + 1); c.lineTo(px - 10 * U, top + 2 * U); c.lineTo(px - 4 * U, top); c.lineTo(px + 4 * U, top); c.lineTo(px + 10 * U, top + 2 * U); c.lineTo(W, L.hz - 10 * U); c.lineTo(W, L.hz + 2); c.fill();
    fill(c, P.jungle[1]); c.fill(HP.Lp); c.fill(HP.Rp);
  });
  // texture inside the hills: low-contrast crowns and shadows
  layer(bg, c => { c.save(); c.clip(HP.Lp); c.clip; for (let k = 0; k < 2; k++) { if (k) { c.restore(); c.save(); c.clip(HP.Rp); }
      for (let i = 0; i < 70 * U; i++) { const x = k ? RX(.7) + R() * (W - RX(.7)) : R() * LX(.3), y = L.hz - 30 * U + R() * (H - L.hz + 30 * U), r = (3 + R() * 5) * U;
        fill(c, P.jungle[0]); ell(c, x + r * .3, y + r * .35, r, r * .55); fill(c, P.jungle[2]); ell(c, x, y, r * .8, r * .45); fill(c, P.jungle[1]); ell(c, x + r * .15, y + r * .12, r * .55, r * .3); } }
    c.restore(); });
  // a bumpy tree line and little palms along both edges
  layer(bg, c => { [HP.Le, HP.Re].forEach((E, side) => E.forEach(([x, y], i) => {
      const r = (2 + R() * 2.5) * U; fill(c, P.jungle[1]); ell(c, x, y + r * .3, r, r * .75); fill(c, P.jungle[2]); ell(c, x - r * .2, y - r * .1, r * .55, r * .35);
      if (i % 5 === 2 && R() < .8) treePalm(c, x, y + 1 * U, (7 + R() * 7) * U, (side ? -1 : 1) * (R() - .3), R() < .5 ? P.jungle[2] : P.jungle[0]); })); });
  // rim light from the sun and a thread of smoke
  layer(bg, c => { const px = RX(.86), top = L.hz - 46 * U;
    line(c, P.rim, Math.max(1, U), [px - 4 * U, top, px + 4 * U, top, px + 10 * U, top + 2 * U]);
    c.strokeStyle = 'rgba(200,180,220,.9)'; c.lineWidth = Math.max(1, U); c.beginPath(); c.moveTo(px, top - 1); c.bezierCurveTo(px - 6 * U, top - 12 * U, px + 8 * U, top - 18 * U, px - 2 * U, top - 30 * U); c.stroke(); });
  // two tiny palms on the beach
  layer(bg, c => [[.33, 1], [.62, -1]].forEach(([fx, dir]) => { const x = W * fx, y = beachTop(x) + 3 * U; line(c, P.trunk[1], Math.max(1, U), [x, y, x + dir * 2 * U, y - 6 * U, x + dir * 3 * U, y - 11 * U]);
    const tx = x + dir * 3 * U, ty = y - 11 * U; [-2.4, -1.6, -.8, 0, .8].forEach(a => line(c, P.jungle[2], Math.max(1, U), [tx, ty, tx + Math.cos(a) * 6 * U, ty + Math.sin(a) * 6 * U * .5 + 2 * U])); }));
}
function canopy() {
  const R = rng(5);
  layer(bg, c => { for (let row = 0; beachTop(0) + (12 + row * 14) * U < H + 20 * U; row++) for (let x = -10; x < W + 10; x += (12 + R() * 10) * U) {
      const y = beachTop(x) + (12 + row * 14 + R() * 6) * U, r = (8 + R() * 8) * U;
      fill(c, P.jungle[row === 0 ? 2 : row < 3 ? 1 : 0]); ell(c, x, y, r, r * .7); if (row >= 3) { fill(c, P.jungle[1]); ell(c, x - r * .2, y - r * .25, r * .6, r * .35); } fill(c, P.jungle[0]); ell(c, x + r * .2, y + r * .35, r * .8, r * .5); } });
}
function trunk(c, x0, dir, lean, bow, wb) {   // a palm trunk from the bottom edge up to its crown above the frame
  const top = (L.port ? 26 : 16) * U, xt = x0 + dir * lean * U, n = Math.ceil((H - top - 6 * U) / (6 * U));
  for (let i = 0; i <= n; i++) { const t = i / n, y = H - t * (H - top - 6 * U), x = x0 + (xt - x0) * t * t + bow * U * Math.sin(Math.PI * t), w = (wb - 5 * t) * U;
    fill(c, P.trunk[1]); c.fillRect(x - w / 2, y - 6 * U, w, 6.5 * U);
    fill(c, P.trunk[0]); c.fillRect(x - w / 2, y - 1.2 * U, w, 1.2 * U);
    fill(c, P.trunk[2]); c.fillRect(x + (dir > 0 ? -w / 2 : w / 2 - 2.5 * U), y - 5.5 * U, 2.5 * U, 4 * U);
    fill(c, P.trunk[3]); c.fillRect(x + (dir > 0 ? -w / 2 : w / 2 - 1 * U), y - 5 * U, Math.max(1, U), 3 * U); }
  return [xt, top];
}
function frond(c, x, y, ang, len, droop, col, lit) {
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len + droop, mx = x + Math.cos(ang) * len * .5, my = y + Math.sin(ang) * len * .5 - droop * .35;
  const N = Math.ceil(len / (1.6 * U));
  for (let i = 2; i <= N; i++) { const t = i / N, a = 1 - t, px = a * a * x + 2 * a * t * mx + t * t * ex, py = a * a * y + 2 * a * t * my + t * t * ey;
    const tx = 2 * a * (mx - x) + 2 * t * (ex - mx), ty = 2 * a * (my - y) + 2 * t * (ey - my), tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
    const ll = (1 - Math.pow(t, 1.3)) * 15 * U * Math.sin(Math.PI * Math.min(1, t * 1.3) * .9 + .25) + 2 * U;
    [1, -1].forEach(s => { const sx = nx * s, sy = ny * s, dx = sx * .6 + tx / tl * .35, dy = Math.abs(sy) * .6 + .55; line(c, (i % 3 === 0) ? lit : col, Math.max(1, U), [px, py, px + dx * ll, py + dy * ll]); }); }
  line(c, lit, Math.max(1, 1.2 * U), [x, y, mx, my + droop * .2, ex, ey]);
}
function palms() {
  let cl, cr;
  layer(bg, c => { cl = trunk(c, L.xl, -1, 24, 7, 16); cr = trunk(c, L.xr, 1, 11, -9, 15); });
  const crown = (cx, cy, side) => {
    const reach = Math.min(W * (L.port ? .55 : .36), 160 * U);
    layer(bg, c => { [[.3, 1], [.6, .9], [.9, .8], [1.2, .7], [1.55, .55], [1.9, .5], [2.3, .6], [2.8, .7]].forEach(([a, k], i) => {
      const ang = side > 0 ? a : Math.PI - a; frond(c, cx, cy, ang, reach * k, 26 * U * k, i % 2 ? P.frond[0] : P.frond[1], P.frond[2]); }); });
  };
  crown(cl[0], cl[1] + 1 * U, 1); crown(cr[0], cr[1] + 1 * U, -1);
  const reach = Math.min(W * (L.port ? .55 : .36), 160 * U);
  [[cl[0], cl[1] + 2 * U, 1], [cr[0], cr[1] + 2 * U, -1]].forEach(([cx, cy, side]) => {
    layer(bg, c => { [[-5, 6], [3, 8], [-1, 12], [7, 4], [-8, 10]].forEach(([dx, dy]) => { const r = 5.2 * U; fill(c, P.nutD); ell(c, cx + dx * U * side, cy + dy * U, r, r); fill(c, P.nut); ell(c, cx + (dx - .8) * U * side, cy + (dy - .8) * U, r * .8, r * .8); fill(c, [140, 96, 60]); ell(c, cx + (dx - 1.8) * U * side, cy + (dy - 2) * U, r * .25, r * .25); }); });
    layer(bg, c => { [[-.2, .8], [.2, .9], [2.9, .75], [3.35, .7]].forEach(([a, k], i) => { const ang = side > 0 ? a : Math.PI - a; frond(c, cx, cy + 4 * U, ang, reach * k, 22 * U * k, i % 2 ? P.frond[1] : P.frond[0], P.frond[3]); }); });   // the top layer, over the nuts
  });
}
// hammock: far rim, Robinson, near rim
const bump = (u, c, w) => Math.exp(-(((u - c) / w) ** 2));
function hamY(u, which) { const s = 4 * u * (1 - u), sn = Math.sin(Math.PI * u);
  if (which === 'far') return L.ya + L.sag * .55 * s + 2.5 * U * bump(u, .73, .05);   // the feet pull the rim down a little
  if (which === 'near') return L.ya + L.sag * .78 * s + 1 * U * sn;
  return L.ya + L.sag * s + 15 * U * sn + 6 * U * bump(u, .34, .055) + 7 * U * bump(u, .5, .06) + 2 * U * bump(u, .62, .04);   // shoulders and seat show through the fabric
}
function hammock() {
  const xa = u => L.xl + 8 * U + (L.xr - L.xl - 16 * U) * u, E0 = .06, E1 = .94;
  layer(bg, c => {   // ropes
    [[-2, 0], [0, 0], [2, 1]].forEach(([d]) => { line(c, P.rope, Math.max(1, .8 * U), [L.xl + 4 * U, L.ya - 4 * U, xa(E0), hamY(E0, 'far') + d * U]); line(c, P.rope, Math.max(1, .8 * U), [L.xr - 4 * U, L.ya - 4 * U, xa(E1), hamY(E1, 'far') + d * U]); });
    fill(c, P.rope); c.fillRect(L.xl, L.ya - 6 * U, 8 * U, 3 * U); c.fillRect(L.xr - 8 * U, L.ya - 6 * U, 8 * U, 3 * U);
  });
  layer(bg, c => {   // the tie, hung on the rope to dry
    const tx = L.xl + 16 * U, ty = L.ya - 1 * U; fill(c, P.tie); c.beginPath(); c.moveTo(tx - 2 * U, ty); c.lineTo(tx + 2 * U, ty); c.lineTo(tx + 1.4 * U, ty + 3 * U); c.lineTo(tx + 3 * U, ty + 18 * U); c.lineTo(tx + .5 * U, ty + 21 * U); c.lineTo(tx - 1.8 * U, ty + 18 * U); c.lineTo(tx - 1.4 * U, ty + 3 * U); c.fill();
    fill(c, [140, 20, 30]); c.fillRect(tx - .4 * U, ty + 6 * U, Math.max(1, U), 10 * U); });
  layer(bg, c => {   // inside of the fabric
    fill(c, P.hamIn); c.beginPath(); for (let i = 0; i <= 40; i++) { const u = E0 + (E1 - E0) * i / 40; c.lineTo(xa(u), hamY(u, 'far')); } for (let i = 40; i >= 0; i--) { const u = E0 + (E1 - E0) * i / 40; c.lineTo(xa(u), hamY(u, 'low')); } c.fill(); });
  robinson(xa);
  layer(bg, c => {   // near rim with stripes
    for (let i = 0; i < 48; i++) { const u0 = E0 + (E1 - E0) * i / 48, u1 = E0 + (E1 - E0) * (i + 1) / 48; fill(c, P.ham[Math.floor(i / 3) % 4]);
      c.beginPath(); c.moveTo(xa(u0), hamY(u0, 'near')); c.lineTo(xa(u1), hamY(u1, 'near')); c.lineTo(xa(u1), hamY(u1, 'low')); c.lineTo(xa(u0), hamY(u0, 'low')); c.fill(); }
  });
  layer(bg, c => { c.globalAlpha = 1; for (let i = 0; i <= 48; i++) { const u = E0 + (E1 - E0) * i / 48; fill(c, P.ink); c.fillRect(xa(u), hamY(u, 'low') - Math.max(1, U), Math.max(1, U * 1.2), Math.max(1, U)); } });
}
function robinson(xa) {
  const k = L.port ? 1.25 : 1.5, Q = U * k, uh = .34, hx = xa(uh), rimY = hamY(uh, 'near'), hr = 7 * Q, hy = rimY - hr * .85;
  const clipIn = c => { c.beginPath(); c.moveTo(xa(0), -H); for (let i = 0; i <= 40; i++) { const u = i / 40; c.lineTo(xa(u), hamY(u, 'low') - 1); } c.lineTo(xa(1), -H); c.closePath(); c.clip(); };
  layer(bg, c => { c.save(); clipIn(c);
    // the body lies in the fabric: shoulders → torso → hips → raised knees → shins → crossed feet
    const hip = [xa(.5), hamY(.5, 'near') - 1 * Q], knee = [xa(.61), hamY(.61, 'near') - 11 * Q], ank = [xa(.72), hamY(.72, 'near') - 4 * Q];
    line(c, P.shirtD, 10 * Q, [hx + 2 * Q, rimY + 2 * Q, hip[0] - 3 * Q, hip[1] + 1 * Q]);
    line(c, P.shirt, 8 * Q, [hx + 2 * Q, rimY + 1 * Q, hip[0] - 3 * Q, hip[1]]);
    const taper = (p0, p1, r0, r1, col) => { fill(c, col); const n = Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / Math.max(1, U * .6)); for (let i = 0; i <= n; i++) { const t = i / n; ell(c, p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t, r0 + (r1 - r0) * t, r0 + (r1 - r0) * t); } };
    const leg = (h, kn, an, rh, dark, lite) => { taper(h, kn, rh + .7 * Q, 2 * Q, dark); taper(kn, an, 2 * Q, 1.7 * Q, dark); taper(h, kn, rh, 1.4 * Q, lite); taper(kn, an, 1.4 * Q, 1.1 * Q, lite); };
    const hF = [hip[0] - 3 * Q, hip[1] - 1.5 * Q], kF = [knee[0] + 2 * Q, knee[1] - 2.5 * Q], aF = [ank[0] + 2.5 * Q, ank[1] + 1.5 * Q];
    const hN = [hip[0] - 4 * Q, hip[1] + 1.5 * Q], kN = [knee[0] - 1.5 * Q, knee[1] + 2 * Q], aN = [ank[0] - .5 * Q, ank[1] - 2 * Q];
    const DARK = [78, 60, 38], DLITE = [132, 106, 66];
    leg(hF, kF, aF, 3 * Q, DARK, DLITE);   // his left leg, behind and a shade darker
    leg(hN, kN, aN, 4.2 * Q, P.pantsD, P.pants);   // the right thigh fills out into the seat
    fill(c, P.pantsD); c.fillRect(hip[0] - 5 * Q, hip[1] - 2.5 * Q, 2 * Q, 5 * Q);   // belt line
    // shoulders
    fill(c, P.shirtD); ell(c, hx, rimY + 2 * Q, 12 * Q, 6.5 * Q); fill(c, P.shirt); ell(c, hx - 1 * Q, rimY + 1 * Q, 11 * Q, 5.5 * Q);
    c.restore();
    // where they cross, the left ankle lies over the right one and catches the light
    { const m0 = [kF[0] + (aF[0] - kF[0]) * .45, kF[1] + (aF[1] - kF[1]) * .45]; const n = 8; for (let i = 0; i <= n; i++) { const t = i / n, x = m0[0] + (aF[0] - m0[0]) * t, y = m0[1] + (aF[1] - m0[1]) * t; fill(c, DARK); ell(c, x, y, 1.8 * Q, 1.8 * Q); } for (let i = 0; i <= n; i++) { const t = i / n, x = m0[0] + (aF[0] - m0[0]) * t, y = m0[1] + (aF[1] - m0[1]) * t; fill(c, DLITE); ell(c, x, y, 1.15 * Q, 1.15 * Q); }
      fill(c, [214, 188, 136]); const g0 = [m0[0] + (aF[0] - m0[0]) * .55, m0[1] + (aF[1] - m0[1]) * .55]; ell(c, g0[0], g0[1] - .7 * Q, 1.6 * Q, .55 * Q, Math.atan2(aF[1] - m0[1], aF[0] - m0[0])); }
    // crossed bare feet: the far (left) foot leans right, the near foot leans left over it
    const fA = [aF[0] + 2 * Q, aF[1] - 5 * Q], fB = [aN[0] - .5 * Q, aN[1] - 4.5 * Q];
    fill(c, P.ink); ell(c, fA[0], fA[1], 3.2 * Q, 6.2 * Q, .45);
    c.save(); c.beginPath(); c.ellipse(fA[0], fA[1], 2.5 * Q, 5.4 * Q, .45, 0, Math.PI * 2); c.clip(); c.translate(fA[0], fA[1]); c.rotate(.45);   /* a striped sock with a little turtle on it */
    ['#ff5c8a', '#ffd84a', '#3fc6b5', '#8a5cff'].forEach((col, i) => { fill(c, hex(col)); for (let y = -6 + i * 1.4; y < 6; y += 5.6) c.fillRect(-3 * Q, y * Q, 6 * Q, 1.4 * Q); });
    fill(c, [40, 110, 60]); ell(c, 0, .6 * Q, 1.2 * Q, .9 * Q); fill(c, [90, 170, 90]); ell(c, 0, -.6 * Q, .45 * Q, .45 * Q); c.fillRect(-1.5 * Q, -.1 * Q, .5 * Q, .5 * Q); c.fillRect(1 * Q, -.1 * Q, .5 * Q, .5 * Q); c.fillRect(-1.5 * Q, 1.2 * Q, .5 * Q, .5 * Q); c.fillRect(1 * Q, 1.2 * Q, .5 * Q, .5 * Q);
    c.restore();
    fill(c, P.ink); ell(c, fB[0], fB[1], 3.2 * Q, 6.2 * Q, -.45); fill(c, P.skin); ell(c, fB[0], fB[1], 2.5 * Q, 5.4 * Q, -.45);
    fill(c, [250, 214, 186]); ell(c, fB[0] - .3 * Q, fB[1] + .6 * Q, 1.5 * Q, 3 * Q, -.45);   // heel and sole
    { const rot = -.45, cs = Math.cos(rot), sn = Math.sin(rot);   // toes in a clockwise arc over the top of the foot, big toe low on the left
      [[-2.75, 1.15], [-2.25, .85], [-1.85, .75], [-1.45, .65], [-1.1, .55]].forEach(([a, r]) => { const lx = 2.6 * Q * Math.cos(a), ly = 5.6 * Q * Math.sin(a), x = fB[0] + lx * cs - ly * sn, y = fB[1] + lx * sn + ly * cs;
        fill(c, P.ink); ell(c, x, y, r * Q + .6 * U, r * Q + .6 * U); fill(c, P.skin); ell(c, x, y, r * Q, r * Q); }); }
    // arm raised with the coconut
    const sx = hx + 8 * Q, sy = rimY - 1 * Q, ex = hx + 13 * Q, ey = hy - 3 * Q, hx2 = hx + 11 * Q, hy2 = hy - 12 * Q;
    line(c, P.shirtD, 4.4 * Q, [sx, sy + .5 * Q, ex, ey + .5 * Q]); line(c, P.shirt, 3.6 * Q, [sx, sy, ex, ey]); line(c, P.skin, 2.6 * Q, [ex, ey, hx2, hy2]); fill(c, P.skin); ell(c, hx2, hy2, 2 * Q, 1.8 * Q);
    // head from behind
    fill(c, P.skin); ell(c, hx - hr * .95, hy + 1 * Q, 1.5 * Q, 2.2 * Q); ell(c, hx + hr * .95, hy + 1 * Q, 1.5 * Q, 2.2 * Q);
    fill(c, P.skin); c.fillRect(hx - 2.6 * Q, hy + hr * .6, 5.2 * Q, 3 * Q);
    fill(c, P.hair); ell(c, hx, hy, hr, hr * 1.05); fill(c, [96, 60, 38]); ell(c, hx + hr * .3, hy - hr * .45, hr * .45, hr * .3, -.4);
    fill(c, P.rim); c.fillRect(hx + hr * .55, hy - hr * .55, Math.max(1, U), hr * .5);
  });
  layer(bg, c => {   // the half coconut cocktail
    const cx = hx + 11 * Q, cy = hy - 15 * Q, r = 4.6 * Q;
    line(c, P.straw, Math.max(1, Q), [cx - 1 * Q, cy, cx - 4.5 * Q, cy - 8 * Q]); line(c, [255, 255, 255], Math.max(1, Q), [cx - 2 * Q, cy - 2.2 * Q, cx - 2.8 * Q, cy - 3.8 * Q]);
    line(c, P.nutIn, Math.max(1, .7 * Q), [cx + 2 * Q, cy, cx + 3.6 * Q, cy - 7 * Q]); fill(c, P.umb); c.beginPath(); c.moveTo(cx - .2 * Q, cy - 6.4 * Q); c.lineTo(cx + 3.6 * Q, cy - 10 * Q); c.lineTo(cx + 7.4 * Q, cy - 6.4 * Q); c.fill();
    fill(c, P.nutD); c.beginPath(); c.ellipse(cx, cy, r, r * .8, 0, 0, Math.PI); c.fill(); fill(c, P.nut); c.beginPath(); c.ellipse(cx - .5 * Q, cy, r * .85, r * .65, 0, 0, Math.PI); c.fill();
    fill(c, P.nutIn); ell(c, cx, cy, r, 1.5 * Q); fill(c, P.drink); ell(c, cx, cy, r - 1.1 * Q, .8 * Q);
  });
}
// ---------- v033: the end-of-demo picture — everyone Robinson found on the island joins the still life ----------
function friends() {
  const xa = u => L.xl + 8 * U + (L.xr - L.xl - 16 * U) * u, ink = [40, 26, 30];
  layer(bg, c => {   // the banyan on the far headland: a wide crown on many trunks
    const bx = RX(.86), by = L.hz + 1 * U;
    fill(c, [70, 52, 34]); for (let k = -3; k <= 3; k++) c.fillRect(bx + k * 3.2 * U, by - 18 * U + Math.abs(k) * 2 * U, Math.max(1, (k ? .8 : 2.4) * U), 18 * U - Math.abs(k) * 2 * U);
    fill(c, [38, 82, 46]); ell(c, bx, by - 22 * U, 20 * U, 8 * U); fill(c, [56, 112, 58]); ell(c, bx - 7 * U, by - 25 * U, 11 * U, 5 * U); ell(c, bx + 8 * U, by - 24 * U, 10 * U, 4.5 * U); fill(c, [92, 156, 76]); ell(c, bx - 2 * U, by - 27 * U, 6 * U, 2.6 * U);
  });
  layer(bg, c => {   // the briefcase, hung on the rope next to the tie
    const x = L.xr - 26 * U, y = L.ya - 3 * U; line(c, [90, 64, 40], Math.max(1, U), [x, y - 3 * U, x, y + 1 * U]);
    fill(c, ink); c.fillRect(x - 7.6 * U, y + .4 * U, 15.2 * U, 11.2 * U); fill(c, [120, 74, 40]); c.fillRect(x - 7 * U, y + 1 * U, 14 * U, 10 * U); fill(c, [92, 54, 28]); c.fillRect(x - 7 * U, y + 5 * U, 14 * U, 1.2 * U);
    fill(c, [230, 180, 60]); c.fillRect(x - 4.5 * U, y + 3.4 * U, 1.6 * U, 2 * U); c.fillRect(x + 3 * U, y + 3.4 * U, 1.6 * U, 2 * U);
    fill(c, [255, 246, 227]); c.fillRect(x + 1 * U, y + 7.4 * U, 4.5 * U, 2.6 * U);   // a memo sticking out
  });
  layer(bg, c => {   // the gecko on the rope, near the left post
    const x = L.xl + 30 * U, y = L.ya - 1.6 * U; fill(c, [60, 140, 70]); ell(c, x, y, 4.2 * U, 1.3 * U); ell(c, x + 4.4 * U, y - .4 * U, 1.8 * U, 1.2 * U); line(c, [60, 140, 70], Math.max(1, .9 * U), [x - 4 * U, y, x - 8 * U, y - 2 * U, x - 9 * U, y - 4 * U]);
    [[-2, 1], [2, 1], [-2, -1], [2, -1]].forEach(([dx, dy]) => line(c, [60, 140, 70], Math.max(1, .7 * U), [x + dx * U, y, x + dx * 1.6 * U, y + dy * 2 * U]));
    fill(c, [255, 230, 120]); c.fillRect(x + 5 * U, y - 1 * U, Math.max(1, .7 * U), Math.max(1, .7 * U));
  });
  layer(bg, c => {   // the cat, sitting on the hammock rim by his feet
    const x = xa(.84), y = hamY(.84, 'near') - 1 * U, cat = [232, 128, 52], dark = [196, 92, 34];
    line(c, cat, 2 * U, [x + 4 * U, y - 1 * U, x + 8 * U, y - 4 * U, x + 7 * U, y - 9 * U]);
    fill(c, cat); ell(c, x, y - 5 * U, 4.4 * U, 5.4 * U); ell(c, x - .4 * U, y - 12 * U, 3.8 * U, 3.4 * U);
    c.beginPath(); c.moveTo(x - 3.8 * U, y - 13 * U); c.lineTo(x - 3 * U, y - 17.5 * U); c.lineTo(x - .8 * U, y - 14.5 * U); c.fill(); c.beginPath(); c.moveTo(x + 3 * U, y - 13 * U); c.lineTo(x + 2.4 * U, y - 17.5 * U); c.lineTo(x, y - 14.5 * U); c.fill();
    fill(c, dark); c.fillRect(x - 3 * U, y - 7 * U, 6 * U, Math.max(1, U)); c.fillRect(x - 2.6 * U, y - 4 * U, 5.2 * U, Math.max(1, U));
    fill(c, ink); c.fillRect(x - 2 * U, y - 12.6 * U, Math.max(1, U), Math.max(1, U)); c.fillRect(x + 1 * U, y - 12.6 * U, Math.max(1, U), Math.max(1, U));
  });
  layer(bg, c => {   // the tortoise in the foreground, a rum bottle at her side
    const x = W * .14, y = H - 12 * U; fill(c, ink); ell(c, x, y, 17 * U, 9.4 * U); fill(c, [70, 112, 56]); ell(c, x, y, 16 * U, 8.6 * U); fill(c, [98, 146, 70]); ell(c, x - 2 * U, y - 2.4 * U, 9 * U, 4 * U);
    line(c, [52, 86, 42], Math.max(1, .8 * U), [x - 8 * U, y - 2 * U, x + 8 * U, y - 2 * U]); line(c, [52, 86, 42], Math.max(1, .8 * U), [x - 3 * U, y - 8 * U, x - 5 * U, y + 4 * U]); line(c, [52, 86, 42], Math.max(1, .8 * U), [x + 4 * U, y - 8 * U, x + 5 * U, y + 4 * U]);
    fill(c, [134, 160, 96]); ell(c, x + 17 * U, y - 2 * U, 5 * U, 3.6 * U); fill(c, ink); c.fillRect(x + 19 * U, y - 3.4 * U, Math.max(1, U), Math.max(1, U));
    fill(c, [110, 60, 30]); c.fillRect(x + 25 * U, y - 6 * U, 3 * U, 7 * U); c.fillRect(x + 25.8 * U, y - 8.4 * U, 1.4 * U, 2.6 * U); fill(c, [240, 210, 130]); c.fillRect(x + 25 * U, y - 4 * U, 3 * U, 2 * U);
  });
}
// ---------- moving bits ----------
function omens(c, t) {
  if (S.omen === 1 || S.omen === 2) {   // cat ear tips at the bottom edge
    const x = W * .3, tw = (Math.sin(t * .7) > .985) ? 1.5 * U : 0;
    layer(c, g => { [[-6, 0], [6, tw]].forEach(([dx, tt]) => { const bx = x + dx * U, h = 10 * U; fill(g, P.cat); g.beginPath(); g.moveTo(bx - 4 * U, H + 1); g.lineTo(bx + (dx < 0 ? -1 : 1) * U + tt, H - h); g.lineTo(bx + 4 * U, H + 1); g.fill();
      fill(g, P.catIn); g.beginPath(); g.moveTo(bx - 2 * U, H + 1); g.lineTo(bx + (dx < 0 ? -1 : 1) * .6 * U + tt * .6, H - h * .6); g.lineTo(bx + 2 * U, H + 1); g.fill(); }); });
  }
  if (S.omen === 2 || S.omen === 3) {   // two black tentacle tips, curling
    const x = W * .8, wig = Math.sin(t * .9) * 1.2 * U;
    layer(c, g => { [[0, 1, 16], [10, -1, 11]].forEach(([dx, dir, h], k) => { const bx = x + dx * U, top = H - h * U, w2 = wig * (k ? -1 : 1);
      g.strokeStyle = css(P.tent); g.lineWidth = 3.4 * U; g.beginPath(); g.moveTo(bx, H + 2); g.quadraticCurveTo(bx - dir * 2 * U, H - h * .5 * U, bx + w2, top); g.quadraticCurveTo(bx + dir * 4 * U + w2, top - 4 * U, bx + dir * 5 * U + w2, top + 1 * U); g.stroke();
      g.lineWidth = 1.6 * U; g.beginPath(); g.moveTo(bx + dir * 5 * U + w2, top + 1 * U); g.quadraticCurveTo(bx + dir * 5 * U + w2, top + 3 * U, bx + dir * 3 * U + w2, top + 2.5 * U); g.stroke();
      g.strokeStyle = css(P.tentS); g.lineWidth = Math.max(1, .7 * U); g.beginPath(); g.moveTo(bx + 1 * U, H); g.quadraticCurveTo(bx - dir * 1 * U + 1 * U, H - h * .5 * U, bx + w2 + 1 * U, top + 2 * U); g.stroke(); }); });
  }
}
function sparkle(c, t) {
  const R = rng(Math.floor(t * 6)), free = (x, y) => { x |= 0; y |= 0; if (!L.bgd || x < 0 || y < 0 || x >= W || y >= H) return false; const i = (y * W + x) * 4; return L.bgd[i] === L.sky0[i] && L.bgd[i + 1] === L.sky0[i + 1] && L.bgd[i + 2] === L.sky0[i + 2]; };
  const dash = (g, x, y, w, h) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (free(x + xx, y + yy)) g.fillRect((x + xx) | 0, (y + yy) | 0, 1, 1); };
  layer(c, g => {
    fill(g, P.sun); for (let k = 0; k < 10; k++) { const y = L.hz + 2 + R() * (L.reef - L.hz - 4), sp = L.sunR * (.4 + (y - L.hz) / (L.reef - L.hz) * 1.1); dash(g, L.sunX + (R() - .5) * 2 * sp, y, Math.round((1 + R() * 3) * U), Math.max(1, Math.round(U * .8))); }
    fill(g, P.foam); for (let k = 0; k < 6; k++) { const x = LX(.24) + R() * (RX(.76) - LX(.24)), y = L.reef + Math.sin(x * .05) * 1.5 * U; dash(g, x, y - U, Math.round((2 + R() * 3) * U), Math.max(1, Math.round(U))); }
    // Venus twinkles only where nothing stands in front of it
    if (L.bgd && Math.sin(t * 2.3) > .2) { const [vx, vy] = L.venus; fill(g, P.venus);
      for (const [dx, dy] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) { const x = vx + dx, y = vy + dy, i = (y * W + x) * 4; if (x < 0 || y < 0 || x >= W || y >= H) continue; if (free(x, y)) g.fillRect(x, y, 1, 1); } }
  });
}
// ---------- title in art pixels ----------
function title() {
  const size = Math.round((L.port ? 30 : 34) * U), y = Math.round(H * (L.port ? .11 : .13)), txt = 'ROBINSON';
  ly.setTransform(1, 0, 0, 1, 0, 0); ly.clearRect(0, 0, W, H); ly.font = '700 ' + size + "px 'Pixelify Sans', monospace"; ly.textAlign = 'center'; ly.textBaseline = 'middle';
  let s2 = size; while (ly.measureText(txt).width > W * .86 && s2 > 8) { s2--; ly.font = '700 ' + s2 + "px 'Pixelify Sans', monospace"; }
  ly.fillStyle = '#fff'; ly.fillText(txt, W / 2, y);
  const m = ly.getImageData(0, 0, W, H), a = m.data, mask = new Uint8Array(W * H); let y0 = H, y1 = 0;
  for (let i = 0; i < W * H; i++) if (a[i * 4 + 3] >= 110) { mask[i] = 1; const yy = (i / W) | 0; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
  const out = bg.getImageData(0, 0, W, H), o = out.data, put = (x, yy, c) => { if (x < 0 || yy < 0 || x >= W || yy >= H) return; const i = (yy * W + x) * 4; o[i] = c[0]; o[i + 1] = c[1]; o[i + 2] = c[2]; };
  const sh = Math.max(1, Math.round(2 * U)), ol = Math.max(1, Math.round(U));
  const FILL = [hex('#fff4d0'), hex('#ffe08a'), hex('#ffc060'), hex('#ff9a4a'), hex('#e8663a')];
  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) if (mask[yy * W + x]) { for (let k = 1; k <= sh + ol; k++) put(x + Math.round(k * .5), yy + k, P.ink); }
  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) if (mask[yy * W + x]) for (let dy = -ol; dy <= ol; dy++) for (let dx = -ol; dx <= ol; dx++) put(x + dx, yy + dy, P.ink);
  for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) if (mask[yy * W + x]) { const t = (yy - y0) / Math.max(1, y1 - y0); put(x, yy, grad(FILL, t, x, yy)); if (t < .12 && bay(x, yy) > .3) put(x, yy, [255, 255, 255]); }
  bg.putImageData(out, 0, 0);
  // the menu sits below the title
  const st = $('overlay'), k = st.clientHeight / H; $('tlMenu').style.top = Math.round((L.port ? hamY(.5, 'low') + 6 * U : y1 + sh + ol + 10 * U) * k + 6) + 'px';
}
// ---------- render loop ----------
let raf = 0, last = 0, ready = false;
function render() {
  P = pal(); if (!layout()) { ready = false; return; } ready = true;
  paintBackground(); palms(); hammock(); if (endMode) friends(); title(); L.bgd = bg.getImageData(0, 0, W, H).data;
  { const st = $('overlay'), k = st.clientWidth / W, oc = $('ovCat'); if (oc) { oc.style.left = Math.round(W * .3 * k - 28) + 'px'; oc.style.top = (st.clientHeight - 44) + 'px'; } }
  if (!endMode) $('tlTeaser').textContent = TEASERS[S.teaser];
  frame(performance.now(), true);
}
function frame(ms, force) {
  if (!document.body.contains(cv)) return;
  if (!ready || !$('overlay') || leaving) return;
  if (!force && (!S.anim || ms - last < 140)) { raf = requestAnimationFrame(frame); return; } last = ms;
  const t = ms / 1000; ctx.drawImage(BG, 0, 0);
  sparkle(ctx, S.anim ? t : 0); omens(ctx, S.anim ? t : 0);
  cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
}

// ---------- v016: START — lightning splits the picture, the halves sink into the storm sea ----------
let leaving = false;
function thunder() {
  const a = (typeof AU !== 'undefined' && AU.ctx) ? AU.ctx : null; if (!a) return; const out = AU.master || a.destination, now = a.currentTime;
  const nb = (sec, brown) => { const len = Math.round(a.sampleRate * sec), b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { l = (l + .02 * w) / 1.02; d[i] = l * 3.5; } else d[i] = w; } return b; };
  // the crack: bright, short, a little ragged
  { const src = a.createBufferSource(); src.buffer = nb(.5, false); const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400; const g = a.createGain();
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(.9, now + .006); g.gain.exponentialRampToValueAtTime(.25, now + .07); g.gain.linearRampToValueAtTime(.5, now + .09); g.gain.exponentialRampToValueAtTime(.001, now + .45);
    src.connect(hp); hp.connect(g); g.connect(out); src.start(now); src.stop(now + .5); }
  // the thunder: a low roll that comes a moment later and takes its time
  [[.18, 1.1, 3.6, 260], [.9, .55, 2.6, 180]].forEach(([dl, pk, dur, f]) => { const t0 = now + dl, src = a.createBufferSource(); src.buffer = nb(dur + .2, true); const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 2.2, t0); lp.frequency.exponentialRampToValueAtTime(f * .45, t0 + dur); const g = a.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(pk, t0 + .12); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); src.connect(lp); lp.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur + .2); });
}
window.titleOut = function (done) {
  const ov = $('overlay'); if (!ov || leaving) { if (done) done(); return; } leaving = true;
  const w = ov.clientWidth, h = ov.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2), o = ov.getBoundingClientRect(), r = cv.getBoundingClientRect();
  const snap = document.createElement('canvas'); snap.width = Math.round(w * dpr); snap.height = Math.round(h * dpr); const sc = snap.getContext('2d'); sc.imageSmoothingEnabled = false;
  sc.drawImage(cv, (r.left - o.left) * dpr, (r.top - o.top) * dpr, r.width * dpr, r.height * dpr);
  const tc = document.createElement('canvas'); tc.width = snap.width; tc.height = snap.height; tc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'; const g = tc.getContext('2d');
  ['tlCv', 'tlMenu', 'tlCrt', 'ovCat', 'tlVer'].forEach(id => { const e = $(id); if (e) e.style.display = 'none'; });
  ov.style.background = 'transparent'; ov.style.transition = 'none'; ov.style.pointerEvents = 'none'; ov.appendChild(tc);
  // a jagged bolt from top to bottom, a little off centre
  const R = Math.random, pts = [[w * (.44 + R() * .12), -4]]; while (pts[pts.length - 1][1] < h) { const [x, y] = pts[pts.length - 1]; pts.push([Math.max(w * .25, Math.min(w * .75, x + (R() - .5) * w * .09)), Math.min(h + 4, y + h * (.05 + R() * .06))]); }
  const forks = [1, 2].map(() => { const i = 1 + Math.floor(R() * (pts.length - 3)), [x, y] = pts[i], d = R() < .5 ? -1 : 1, f = [[x, y]]; for (let k = 0; k < 4; k++) { const [px, py] = f[f.length - 1]; f.push([px + d * w * (.02 + R() * .03), py + h * (.03 + R() * .03)]); } return f; });
  const half = (side) => { g.beginPath(); g.moveTo(side < 0 ? -w : 2 * w, -h); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(side < 0 ? -w : 2 * w, 2 * h); g.closePath(); };
  const sea = () => { const t = window.gameTime ? window.gameTime() : 0; return (x) => h * .58 + Math.sin(x * .015 + t * 2.2) * 2 * h / 100 + Math.sin(x * .04 - t * 3) * .8 * h / 100; };
  const boltPath = (p) => { g.beginPath(); g.moveTo(p[0][0], p[0][1]); p.forEach(([x, y]) => g.lineTo(x, y)); };
  thunder();
  const t0 = performance.now(), T = 2.6;
  (function step() {
    const t = (performance.now() - t0) / 1000; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    if (t < .5) {   // flash, then the bolt over the still picture
      g.drawImage(snap, 0, 0, w, h);
      const fl = t < .08 ? 1 : t < .16 ? .15 : t < .22 ? .7 : Math.max(0, .35 - (t - .22));
      if (fl > 0) { g.fillStyle = 'rgba(235,240,255,' + fl + ')'; g.fillRect(0, 0, w, h); }
      if (t > .06 && !(t > .16 && t < .2)) { g.lineJoin = 'round'; g.lineCap = 'round';
        [[14, 'rgba(140,170,255,.35)'], [6, 'rgba(200,215,255,.85)'], [2.2, '#ffffff']].forEach(([lw, col]) => { g.strokeStyle = col; g.lineWidth = lw; boltPath(pts); g.stroke(); forks.forEach(f => { g.lineWidth = lw * .5; boltPath(f); g.stroke(); }); }); }
    } else {   // the two halves break apart and go under
      const k = Math.min(1, (t - .5) / (T - .5)), e = k * k * (3 - 2 * k), sl = sea(), dark = .55 * e;
      g.save(); g.beginPath(); g.moveTo(-10, -10); for (let x = -10; x <= w + 10; x += 8) g.lineTo(x, sl(x)); g.lineTo(w + 10, -10); g.closePath(); g.clip();   // nothing shows below the water line
      [-1, 1].forEach(side => { g.save(); const px = side < 0 ? w * .25 : w * .75;
        g.translate(px + side * e * w * .07, h + e * h * .95); g.rotate(side * e * .16); g.translate(-px, -h);
        half(side); g.clip(); g.drawImage(snap, 0, 0, w, h); g.fillStyle = 'rgba(8,18,32,' + dark + ')'; g.fillRect(-w, -h, 3 * w, 3 * h);
        if (k < .35) { g.strokeStyle = 'rgba(220,230,255,' + (1 - k / .35) + ')'; g.lineWidth = 3; boltPath(pts); g.stroke(); }   // the glowing break edge
        g.restore(); });
      g.restore();
      g.strokeStyle = 'rgba(235,248,252,' + (.55 * (1 - k)) + ')'; g.lineWidth = 1.6; g.beginPath();   // a thin line of foam where they go under
      for (let x = 0; x <= w; x += 6) g.lineTo(x, sl(x)); g.stroke();
    }
    if (t < T) requestAnimationFrame(step); else if (done) done();
  })();
};
// v033: the end-of-demo screen — the title's still life again, now with everyone Robinson found
window.titleEnd = function (onPlay) {
  const root = WELT.root; if (!OV.parentNode) root.appendChild(OV);
  [...OV.querySelectorAll('canvas')].forEach(x => { if (x !== cv) x.remove(); });
  Object.assign(OV.style, { opacity: '1', background: '', transition: '', pointerEvents: '', display: '' });
  ['tlCv', 'tlMenu', 'tlVer'].forEach(id => { const e = $(id); if (e) e.style.display = ''; });
  ['ovCat', 'tlCont'].forEach(id => { const e = $(id); if (e) e.style.display = 'none'; });
  const st = $('tlStart'), cr = $('tlCont'); st.textContent = 'KEEP PLAYING'; cr.textContent = 'CREDITS'; cr.style.display = '';
  const ending = '<b>END OF THE DEMO CAMPAIGN</b><br>To be continued: Act 3 — The Cave.<br><small>The island goes on without the story: the Board keeps sending armies and offers.</small>';
  endMode = true; leaving = false; render(); $('tlTeaser').innerHTML = ending;
  const click = e => {
    if (e.target.closest('#tlCont')) { const t = $('tlTeaser'); t.innerHTML = t.dataset.c === '1' ? ending : 'Idea, design and story: Jan<br>Code, pixels and noises: Claude<br><small>Thank you for playing. The cat is waiting under the mountain.</small>'; t.dataset.c = t.dataset.c === '1' ? '0' : '1'; return; }
    if (!e.target.closest('#tlStart')) return;
    OV.removeEventListener('click', click, true); e.stopPropagation(); OV.style.opacity = '0';
    setTimeout(() => { endMode = false; OV.remove(); if (onPlay) onPlay(); }, 650);
  };
  OV.addEventListener('click', click, true);
};
// ---------- v034: the cat's picture — the title's pixel world seen from the tree line: she balances on a flat palm, the sky holds
// her four shortcuts as constellations (every star sits where that spot is on HER; a spot used twice is a big star). Both worlds use it.
const PETSCENE = (() => {
  let W = 0, H = 0, U = 1, s = 1, key = '', Q, L = {};
  const BGc = document.createElement('canvas'), bgx = BGc.getContext('2d');
  const LYc = document.createElement('canvas'), lyx = LYc.getContext('2d', { willReadFrequently: true });
  const CTc = document.createElement('canvas'), ctx2 = CTc.getContext('2d', { willReadFrequently: true });
  const lay = (c, fn) => { const lc = c === bgx ? lyx : c; lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, lc.canvas.width, lc.canvas.height); lc.lineCap = 'round'; lc.lineJoin = 'round'; fn(lc);
    const d = lc.getImageData(0, 0, lc.canvas.width, lc.canvas.height), a = d.data; for (let i = 3; i < a.length; i += 4) a[i] = a[i] >= 110 ? 255 : 0; lc.putImageData(d, 0, 0); if (c === bgx) bgx.drawImage(LYc, 0, 0); };
  const F = (c, col) => { c.fillStyle = css(col); }, E = (c, x, y, rx, ry, rot) => { c.beginPath(); c.ellipse(x, y, Math.max(.5, rx), Math.max(.5, ry), rot || 0, 0, Math.PI * 2); c.fill(); };
  const LN = (c, col, w, pts) => { c.strokeStyle = css(col); c.lineWidth = w; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke(); };
  function frondP(c, x, y, ang, len, droop, col, lit) {
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len + droop, mx = x + Math.cos(ang) * len * .5, my = y + Math.sin(ang) * len * .5 - droop * .35, N = Math.ceil(len / (1.6 * U));
    for (let i = 2; i <= N; i++) { const t = i / N, a = 1 - t, px = a * a * x + 2 * a * t * mx + t * t * ex, py = a * a * y + 2 * a * t * my + t * t * ey;
      const tx = 2 * a * (mx - x) + 2 * t * (ex - mx), ty = 2 * a * (my - y) + 2 * t * (ey - my), tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl, ll = (1 - Math.pow(t, 1.3)) * 15 * U * Math.sin(Math.PI * Math.min(1, t * 1.3) * .9 + .25) + 2 * U;
      [1, -1].forEach(sg => { const sx = nx * sg, sy = ny * sg, dx = sx * .6 + tx / tl * .35, dy = Math.abs(sy) * .6 + .55; LN(c, (i % 3 === 0) ? lit : col, Math.max(1, U), [px, py, px + dx * ll, py + dy * ll]); }); }
    LN(c, lit, Math.max(1, 1.2 * U), [x, y, mx, my + droop * .2, ex, ey]);
  }
  const beachTop = x => { const u = (x / W) * 2 - 1; return L.beach - Math.round(L.bay * .12 * u * u); };
  const flat = t => ({ x: W * (.08 + .6 * t), y: H * (.9 - .22 * t) - Math.sin(Math.PI * t) * 14 * U });
  // her spots in kitten units (the in-game cat is 30 units high); r = how far a touch still counts
  const ZONES = { head: [13, -17, 5.5], ears: [15, -26, 4], chin: [17, -12, 3.4], back: [-2, -16, 7], tail: [-15, -30, 5], belly: [1, -7, 4] };
  const CAT = { body: [242, 153, 74], dark: [224, 123, 46], stripe: [208, 112, 42], inner: [255, 209, 176], eye: [43, 29, 18], nose: [228, 106, 106], far: [196, 104, 40], belly: [255, 200, 150] };
  function build(cw, ch) {
    if (!P) P = pal(); Q = pal();
    s = Math.max(1, Math.floor(Math.min(cw, ch) / 270)); W = Math.ceil(cw / s); H = Math.ceil(ch / s); U = H / 270;
    BGc.width = LYc.width = W; BGc.height = LYc.height = H;
    L.hz = Math.round(H * .47); L.bay = Math.round(H * .2); L.beach = L.hz + L.bay; L.reef = L.hz + Math.round(L.bay * .32); L.sunX = Math.round(W * .66); L.sunR = Math.round(22 * U);
    const img = bgx.createImageData(W, H), d = img.data, R = rng(7);
    const corals = []; for (let k = 0; k < 34; k++) { const x = R() * W, y0 = L.reef + 3 * U, y1 = beachTop(x) - 4 * U; corals.push({ x, y: y0 + Math.pow(R(), 1.6) * (y1 - y0), lx: (8 + R() * 18) * U, hy: (2 + R() * 3) * U, ph: R() * 9, fr: .25 + R() * .35, c: Q.coral[k % Q.coral.length], c2: Q.coral[(k + 2) % Q.coral.length] }); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let c; const i = (y * W + x) * 4;
      if (y < L.hz) { const dx = x - L.sunX, dy = y - L.hz, dist = Math.hypot(dx, dy * 1.6); let t = y / L.hz; t = t + Math.max(0, 1 - dist / (L.sunR * 7)) * .22; c = grad(Q.sky, t, x, y);
        if (Math.hypot(dx, dy) < L.sunR) { const up = L.hz - y, gap = up < L.sunR * .55 && (up % Math.max(3, Math.round(4 * U))) < Math.max(1, Math.round((1 - up / (L.sunR * .55)) * 2.4 * U)); c = gap ? c : (Math.hypot(dx, dy) > L.sunR - 2 * U ? Q.sunEdge : Q.sun); } }
      else { const bt = beachTop(x);
        if (y < L.reef) { c = grad(Q.sea, (y - L.hz) / (L.reef - L.hz), x, y); if (Math.abs(x - L.sunX) < L.sunR * (.5 + (y - L.hz) / (L.reef - L.hz) * 1.1) && ((x * 7 + y * 13) % 11 === 0 || (y % 3 === 0 && bay(x, y) > .82))) c = Q.sunEdge; }
        else if (y < bt) { const t = (y - L.reef) / Math.max(1, bt - L.reef); c = grad(Q.lagoon, t, x, y);
          for (const k of corals) { const dx = (x - k.x) / k.lx; if (dx <= -1 || dx >= 1) continue; const top = k.y - k.hy * (1 - dx * dx) * (.75 + .25 * Math.sin(dx * 7 + k.ph)) - Math.max(0, Math.sin(x * k.fr + k.ph)) * 1.4 * U, bot = k.y + U - k.hy * .4 * (1 - dx * dx);
            if (y >= top && y <= bot) { const e = (y - top) / Math.max(1, bot - top); if (bay(x, y) < .78 - e * .25) c = bay(x + 1, y) < .5 ? k.c : k.c2; break; } } }
        else if (y < bt + 2 * U) c = Q.foam; else if (y < bt + 4 * U) c = Q.wet;
        else { const t = (y - bt) / (H - bt); c = (bay(x, y) < t * .5) ? Q.sandShade : Q.sand; } }
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
    for (let k = 0; k < 80; k++) { const x = R() * W | 0, y = Math.pow(R(), 1.6) * L.hz * .7 | 0, i = (y * W + x) * 4, b = .35 + R() * .25; for (let q = 0; q < 3; q++) d[i + q] = Q.star[q] * b + d[i + q] * (1 - b); }
    bgx.putImageData(img, 0, 0);
    lay(bgx, c => { F(c, Q.foam); for (let x = 0; x < W; x += 3 * U) { const y = L.reef + Math.sin(x * .05) * 1.5 * U; if (Math.sin(x * .31) > -.2) c.fillRect(x, y, 2 * U, Math.max(1, U)); } });
    { const R2 = rng(11); [[.3, -.05, .36, 1], [.8, -.1, .32, .9], [.52, -.2, .28, .75], [.12, -.16, .26, .7], [.68, -.3, .2, .6]].forEach(([cx, cy, len, k]) => {
      const parts = []; for (let i = 0; i < 7; i++) parts.push([W * cx + (i / 6 - .5) * W * len, H * cy + L.hz + (R2() - .5) * 3 * U, (10 + R2() * 18) * U * k, (2.5 + R2() * 3.5) * U * k]);
      lay(bgx, c => { F(c, Q.cloud[0]); parts.forEach(([x, y, rx, ry]) => E(c, x, y - 1.5 * U, rx, ry)); F(c, Q.cloud[4]); parts.forEach(([x, y, rx, ry]) => E(c, x, y + 1.6 * U, rx * .92, ry)); F(c, Q.cloud[3]); parts.forEach(([x, y, rx, ry]) => E(c, x, y + .8 * U, rx * .96, ry));
        F(c, Q.cloud[2]); parts.forEach(([x, y, rx, ry]) => E(c, x, y, rx * .94, ry * .9)); F(c, Q.cloud[1]); parts.forEach(([x, y, rx, ry]) => E(c, x - .1 * rx, y - .6 * U, rx * .8, ry * .7)); }); }); }
    lay(bgx, c => { const R3 = rng(4); F(c, Q.sandShade); for (let k = 0; k < 60; k++) c.fillRect(R3() * W, L.beach + 8 * U + R3() * (H - L.beach), (3 + R3() * 6) * U, Math.max(1, U * .7));
      for (let k = 0; k < 6; k++) { F(c, [255, 214, 200]); E(c, W * (.25 + R3() * .5), L.beach + 14 * U + R3() * 40 * U, 1.6 * U, 1.1 * U); } });
    [0, 1].forEach(side => { const R4 = rng(side ? 31 : 17); lay(bgx, c => { for (let row = 0; row < 7; row++) for (let k = 0; k < 9; k++) {
      const fx = side ? 1 - (R4() * (.22 - row * .012)) : R4() * (.22 - row * .012), x = W * fx, y = H * (.34 + row * .11) + R4() * 8 * U, r = (10 + R4() * 12) * U;
      F(c, Q.jungle[0]); E(c, x + r * .2, y + r * .35, r, r * .7); F(c, Q.jungle[row < 2 ? 2 : 1]); E(c, x, y, r * .85, r * .55); F(c, Q.jungle[row < 2 ? 3 : 2]); E(c, x - r * .25, y - r * .2, r * .45, r * .25); } }); });
    const trunkUp = (c, x0, dir, lean, bow, wb) => { const top = -10 * U, xt = x0 + dir * lean * U, n = Math.ceil((H - top) / (6 * U));
      for (let i = 0; i <= n; i++) { const t = i / n, y = H - t * (H - top), x = x0 + (xt - x0) * t * t + bow * U * Math.sin(Math.PI * t), w = (wb - 5 * t) * U;
        F(c, Q.trunk[1]); c.fillRect(x - w / 2, y - 6 * U, w, 6.5 * U); F(c, Q.trunk[0]); c.fillRect(x - w / 2, y - 1.2 * U, w, 1.2 * U);
        F(c, Q.trunk[2]); c.fillRect(x + (dir > 0 ? -w / 2 : w / 2 - 2.5 * U), y - 5.5 * U, 2.5 * U, 4 * U); F(c, Q.trunk[3]); c.fillRect(x + (dir > 0 ? -w / 2 : w / 2 - 1 * U), y - 5 * U, Math.max(1, U), 3 * U); } };
    lay(bgx, c => { trunkUp(c, W * .05, 1, 30, 6, 15); trunkUp(c, W * .95, -1, 22, -8, 14); });
    lay(bgx, c => { [[W * .05 + 30 * U, -4 * U, 1], [W * .95 - 22 * U, -4 * U, -1]].forEach(([cx, cy, side]) => { [[.25, .9], [.6, .85], [1.0, .7], [1.4, .55], [2.0, .5], [2.6, .6]].forEach(([a, k], i) => frondP(c, cx, cy, side > 0 ? a : Math.PI - a, 150 * U * k, 30 * U * k, i % 2 ? Q.frond[0] : Q.frond[1], Q.frond[2])); }); });
    lay(bgx, c => { const n = 46; for (let i = 0; i <= n; i++) { const t = i / n, p = flat(t), q = flat(Math.min(1, t + 1 / n)), a = Math.atan2(q.y - p.y, q.x - p.x), w = (15 - 7 * t) * U;
      c.save(); c.translate(p.x, p.y); c.rotate(a); F(c, Q.trunk[1]); c.fillRect(-4 * U, -w / 2, 8.5 * U, w); F(c, Q.trunk[0]); c.fillRect(3.2 * U, -w / 2, 1.2 * U, w);
      F(c, Q.trunk[2]); c.fillRect(-4 * U, -w / 2, 7 * U, w * .35); F(c, Q.trunk[3]); c.fillRect(-3.5 * U, -w / 2, 5 * U, Math.max(1, U)); F(c, Q.trunk[0]); c.fillRect(-4 * U, w / 2 - 2 * U, 8.5 * U, 2 * U); c.restore(); } });
    lay(bgx, c => { F(c, Q.sandShade); for (let t = 0; t <= 1; t += .01) { const p = flat(t); c.fillRect(p.x, p.y + (18 - 6 * t) * U + t * 10 * U, 3 * U, 2 * U); } });
    { const e = flat(1); lay(bgx, c => { [[-.3, .8], [.2, .9], [.7, .85], [1.2, .7], [-.9, .75], [-1.6, .6], [-2.3, .65], [2.0, .5]].forEach(([a, k], i) => frondP(c, e.x, e.y, a, 95 * U * k, 22 * U * k, i % 2 ? Q.frond[0] : Q.frond[1], Q.frond[2]));
      [[-3, 4], [3, 6], [0, 9]].forEach(([dx, dy]) => { F(c, Q.nutD); E(c, e.x + dx * U, e.y + dy * U, 4.4 * U, 4.4 * U); F(c, Q.nut); E(c, e.x + (dx - .7) * U, e.y + (dy - .7) * U, 3.5 * U, 3.5 * U); }); }); }
    // the constellations, from her codes
    const codes = Object.keys(PET_CODES).map(k => PET_CODES[k].seq), at = [[.15, .25], [.38, .21], [.62, .27], [.85, .2]];   // v062: a little lower, clear of the header text
    const starXY = (ci, z) => [Math.round(W * at[ci][0] + ZONES[z][0] * 2.2 * U), Math.round(H * at[ci][1] + (ZONES[z][1] + 22) * 2.2 * U)];
    lay(bgx, c => { c.strokeStyle = 'rgba(150,146,210,.55)'; c.lineWidth = Math.max(1, Math.round(U * .6)); codes.slice(0, 4).forEach((seq, ci) => { c.beginPath(); seq.forEach((z, i) => { const [x, y] = starXY(ci, z); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); }); });   // v062: faint lines in her order, so every star belongs to its picture
    lay(bgx, c => { codes.slice(0, 4).forEach((seq, ci) => { const n = {}; seq.forEach(z => n[z] = (n[z] || 0) + 1);
      Object.keys(n).forEach(z => { const x = Math.round(W * at[ci][0] + ZONES[z][0] * 2.2 * U), y = Math.round(H * at[ci][1] + (ZONES[z][1] + 22) * 2.2 * U), big = n[z] > 1, r = Math.max(1, Math.round(U));
        if (big) { F(c, [138, 136, 200]); c.fillRect(x - 5 * r, y, 11 * r, r); c.fillRect(x, y - 5 * r, r, 11 * r); F(c, [255, 246, 192]); c.fillRect(x - 3 * r, y, 7 * r, r); c.fillRect(x, y - 3 * r, r, 7 * r); c.fillRect(x - r, y - r, 3 * r, 3 * r); F(c, [255, 255, 255]); c.fillRect(x, y, r, r); }
        else { F(c, [120, 116, 190]); c.fillRect(x - 3 * r, y, 7 * r, r); c.fillRect(x, y - 3 * r, r, 7 * r); F(c, [236, 232, 255]); c.fillRect(x - r, y, 3 * r, r); c.fillRect(x, y - r, r, 3 * r); } }); }); });
    // where she stands: on the trunk, tilted with it
    const p = flat(.52), q = flat(.54); L.ca = Math.atan2(q.y - p.y, q.x - p.x); L.cx = p.x; L.cy = p.y - (15 - 7 * .52) * U / 2 + 1; L.k = 3.0 * U;
    CTc.width = Math.ceil(70 * L.k); CTc.height = Math.ceil(60 * L.k);
  }
  // her, every frame (breathing, tail, eyes; happy = eyes closed, angry = ears flat and a fast tail)
  function drawCat(t, mood) {
    const c = ctx2, k = L.k, angry = mood === 'angry', happy = mood === 'happy';
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, CTc.width, CTc.height); c.lineCap = 'round'; c.lineJoin = 'round';
    c.translate(CTc.width / 2, CTc.height * .78); c.scale(k, k);
    const leg = (x0, y0, x1, y1, x2, y2, col, w) => { c.strokeStyle = css(col); c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x2, y2); c.stroke(); F(c, col); E(c, x2 + .6, y2 - .3, 1.5, .9); };
    leg(-8, -8, -10.5, -3, -9, 0, CAT.far, 2.4); leg(6, -7, 6.5, -3, 6, 0, CAT.far, 2.2);
    const tw = Math.sin(t * (angry ? 9 : 1.6)) * (angry ? 3 : 1.6);
    c.strokeStyle = css(CAT.dark); c.lineWidth = 3.2; c.beginPath(); c.moveTo(-11, -11); c.bezierCurveTo(-20, -14, -21 + tw * .5, -24, -16 + tw, -30); c.quadraticCurveTo(-13 + tw, -33, -12 + tw, -30); c.stroke();
    const br = 1 + .03 * Math.sin(t * 2.2);
    F(c, CAT.body); E(c, 0, -10, 12, 6.5 * br); E(c, -8, -9, 5, 5.5); E(c, 8, -11, 4.5, 5 * br);
    F(c, CAT.belly); E(c, 1, -6.5, 8, 2.2);
    c.strokeStyle = css(CAT.stripe); c.lineWidth = 1.6; for (let i = -2; i <= 1; i++) { c.beginPath(); c.moveTo(i * 4.6 - 1, -16.2); c.lineTo(i * 4.6 + 1.2, -12); c.stroke(); }
    leg(-7, -7, -9.5, -2.5, -7.5, 0, CAT.body, 2.6); leg(8, -7, 8.3, -2.5, 8, 0, CAT.body, 2.4);
    const hx = 13, hy = -17 + (angry ? 1 : 0), ea = angry ? 2.2 : 0; F(c, CAT.body); E(c, hx, hy, 6.5, 6);
    c.beginPath(); c.moveTo(hx - 5.5, hy - 2); c.lineTo(hx - 4.5 - ea, hy - 10 + ea); c.lineTo(hx - .5, hy - 5); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(hx + .5, hy - 5); c.lineTo(hx + 5 + ea, hy - 10 + ea); c.lineTo(hx + 6.4, hy - 1.5); c.closePath(); c.fill();
    F(c, CAT.inner); c.beginPath(); c.moveTo(hx + 2, hy - 5); c.lineTo(hx + 4.6 + ea * .6, hy - 8.4 + ea * .6); c.lineTo(hx + 5.2, hy - 3.6); c.fill();
    F(c, CAT.inner); E(c, hx + 4.2, hy + 2.6, 2.6, 1.8);
    if (happy) { c.strokeStyle = css(CAT.eye); c.lineWidth = .7; c.beginPath(); c.arc(hx + 2.6, hy - .4, 1.3, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    else { F(c, CAT.eye); E(c, hx + 2.6, hy - 1, 1.3, angry ? .6 : 1.5); if (!angry) { F(c, [255, 255, 255]); c.fillRect(hx + 2.7, hy - 2, .6, .6); } }
    F(c, CAT.nose); c.beginPath(); c.moveTo(hx + 5.6, hy + 1); c.lineTo(hx + 7, hy + 1); c.lineTo(hx + 6.3, hy + 2.1); c.fill();
    c.strokeStyle = css(CAT.eye); c.lineWidth = .5; c.beginPath(); c.moveTo(hx + 6.3, hy + 2.1); c.lineTo(hx + 6.3, hy + 3); c.moveTo(hx + 5, hy + 3.4); c.quadraticCurveTo(hx + 6.3, hy + 3.4, hx + 6.3, hy + 3); c.quadraticCurveTo(hx + 6.3, hy + 3.4, hx + 7.4, hy + 3.2); c.stroke();
    const d = c.getImageData(0, 0, CTc.width, CTc.height), a = d.data; for (let i = 3; i < a.length; i += 4) a[i] = a[i] >= 110 ? 255 : 0; c.putImageData(d, 0, 0);
  }
  const toArt = (x, y) => [x / s, y / s];
  const zoneArt = z => { const [zx, zy] = ZONES[z], co = Math.cos(L.ca), si = Math.sin(L.ca); return [L.cx + (zx * co - zy * si) * L.k, L.cy + (zx * si + zy * co) * L.k]; };
  return {
    ZONES,
    // c: the screen canvas context (CSS pixels), cw/ch: its size; st: { t, mood, ring: { zone, ok, age } }
    draw(c, cw, ch, st) {
      const kk = Math.round(cw) + 'x' + Math.round(ch); if (kk !== key) { key = kk; build(cw, ch); }
      c.imageSmoothingEnabled = false; c.drawImage(BGc, 0, 0, W * s, H * s);
      drawCat(st.t, st.mood);
      c.save(); c.scale(s, s); c.translate(L.cx, L.cy); c.rotate(L.ca); c.drawImage(CTc, -CTc.width / 2, -CTc.height * .78); c.restore();
      if (st.ring && st.ring.zone !== 'bg' && ZONES[st.ring.zone] && st.ring.age < .5) { const [ax, ay] = zoneArt(st.ring.zone), r = ZONES[st.ring.zone][2] * L.k * s * (1 + st.ring.age);
        c.strokeStyle = st.ring.ok ? 'rgba(255,255,255,' + (1 - st.ring.age * 2) + ')' : 'rgba(255,90,70,.9)'; c.lineWidth = 2; c.beginPath(); c.arc(ax * s, ay * s, r, 0, Math.PI * 2); c.stroke(); }
    },
    // which spot a touch at (x, y) hits: a zone name, 'bg' for the open sky/sea well away from her, or null
    hit(cw, ch, x, y) {
      if (!W) return null; const [ax, ay] = toArt(x, y), dx = ax - L.cx, dy = ay - L.cy, co = Math.cos(-L.ca), si = Math.sin(-L.ca), ux = (dx * co - dy * si) / L.k, uy = (dx * si + dy * co) / L.k;
      let best = null, bd = 1e9; for (const z in ZONES) { const [zx, zy, zr] = ZONES[z], d = Math.hypot(ux - zx, uy - zy) / zr; if (d < 1.5 && d < bd) { bd = d; best = z; } }
      if (!best && Math.pow(ux / 34, 2) + Math.pow((uy + 14) / 26, 2) > 1) best = 'bg';
      return best;
    }
  };
})();
WELT.api.katzenSzene = PETSCENE;
let rt; const later = () => { clearTimeout(rt); rt = setTimeout(render, 120); }; addEventListener('resize', later);
if (window.ResizeObserver) new ResizeObserver(later).observe($('overlay'));
render(); if (document.fonts) document.fonts.ready.then(render);

})();

