// ============================================================================
// SOUND — every sound of the game: one AudioContext, one bus per world, the beach sounds, the island voices and ambience voices, the cave
// Worlds only trigger sounds; what they need from the game they hand over (SOUND.strandSzene, the cave state as a parameter).
// The island's "listener on the map" (which sounds how loud where the camera is: ambInit/ambTick) stays in insel.js — it reads the map.
// ============================================================================
export const SOUND = {
  _ctx: null, _bus: {}, _aktiv: 'strand', strandSzene: () => 'start',
  ctx() {
    if (this._ctx && this._ctx.state === 'closed') { this._ctx = null; this._bus = {}; }
    if (!this._ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { this._ctx = new AC(); } catch (e) { return null; }
    }
    return this._ctx;
  },
  bus(welt) {
    const a = this.ctx(); if (!a) return null;
    if (!this._bus[welt]) { const g = a.createGain(); g.gain.value = welt === this._aktiv ? 1 : 0; g.connect(a.destination); this._bus[welt] = g; }
    return this._bus[welt];
  },
  szene(welt) {
    if (welt === 'kampf') welt = 'strand';   // v041: the surf fight plays through the beach's sound bus
    this._aktiv = welt; const a = this._ctx; if (!a) return;
    Object.keys(this._bus).forEach(k => this._bus[k].gain.setTargetAtTime(k === welt ? 1 : 0, a.currentTime, .25));
    if (a.state === 'suspended') a.resume().catch(() => {});
  },
};

// ############################ BEACH ############################
// ================= audio (Web Audio, all synthesized) =================
export const AU = { ctx: null, master: null, muted: false, surf: null, noise: null };
export function audioInit() {
  if (AU.ctx) return;
  try {
    const a = AU.ctx = SOUND.ctx(); if (!a) return;   // v030: the game's one AudioContext
    AU.master = a.createGain(); AU.master.gain.value = .8; AU.master.connect(SOUND.bus('strand'));
    const len = a.sampleRate * 4, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.5; }
    AU.noise = buf;
    const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; AU.surfLP = lp;
    const g = a.createGain(); g.gain.value = .2;
    src.connect(lp); lp.connect(g); g.connect(AU.master); src.start();
    const lfo = a.createOscillator(); lfo.frequency.value = .11; const lg = a.createGain(); lg.gain.value = .13;
    lfo.connect(lg); lg.connect(g.gain); lfo.start(); AU.surfLfo = lg;
    AU.surf = g;
    const wb = a.createBuffer(1, len, a.sampleRate), wd = wb.getChannelData(0);
    for (let i = 0; i < len; i++) wd[i] = Math.random() * 2 - 1;
    const ws = a.createBufferSource(); ws.buffer = wb; ws.loop = true;
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .6;
    const wg = a.createGain(); wg.gain.value = .025;
    ws.connect(bp); bp.connect(wg); wg.connect(AU.master); ws.start();
    const wl = a.createOscillator(); wl.frequency.value = .05; const wlg = a.createGain(); wlg.gain.value = 400;
    wl.connect(wlg); wlg.connect(bp.frequency); wl.start();
    // v013: the island's located sources, heard from the beach — a low rumble from Fire Mountain (continuous)
    const rb = a.createBufferSource(); rb.buffer = buf; rb.loop = true; const rl = a.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 95;
    AU.rumble = a.createGain(); AU.rumble.gain.value = 0; rb.connect(rl); rl.connect(AU.rumble); AU.rumble.connect(AU.master); rb.start();
    setInterval(beachAmb, 250);
  } catch (e) { AU.ctx = null; }
}
// v013 beach ambience (sound effects, follow the 🔊 button): same sources as on the island map, placed where they are seen from here —
// the booby cliffs far up north (left), Fire Mountain behind the trees. In the forest the sea gets duller and the mountain closer.
export const BAMB = { next: {} };
export function beachAmb() {
  if (!AU.ctx || AU.muted) return; const now = AU.ctx.currentTime, t = performance.now() / 1000, scr = SOUND.strandSzene();
  const out = scr === 'beach' || scr === 'forest', forest = scr === 'forest';
  const ur = SOUND.strandUnruhe ? SOUND.strandUnruhe() : 1;   // v062: the sea grows from calm (ebb start) to today's roar (beach tides spent)
  AU.surfLP.frequency.setTargetAtTime(forest ? 400 : 380 + 270 * ur, now, .8);
  if (out) { const base = .07 + .13 * ur; AU.surf.gain.setTargetAtTime(base, now, 1.2); AU.surfLfo.gain.setTargetAtTime(base * .62, now, 1.2); }
  AU.rumble.gain.setTargetAtTime(!out ? 0 : forest ? .07 : .035, now, 1);
  if (!out) return;
  const due = (k, lo, hi) => { if ((BAMB.next[k] || 0) > t) return false; BAMB.next[k] = t + lo + Math.random() * (hi - lo); return true; };
  if (due('birds', 3.5, 9)) beachBooby(forest ? .045 : .03, forest ? 3200 : 2400, -.45);
  if (due('puff', 9, 20)) beachPuff(forest ? .16 : .08, forest ? .25 : .1);
}
export function beachSrc(cut, pan) { const a = AU.ctx, g = a.createGain(), lp = a.createBiquadFilter(), p = a.createStereoPanner(); lp.type = 'lowpass'; lp.frequency.value = cut; p.pan.value = pan; g.connect(lp); lp.connect(p); p.connect(AU.master); return g; }
export function beachBooby(vol, cut, pan) {
  const a = AU.ctx, out = beachSrc(cut, pan), n = 1 + (Math.random() * 3 | 0);
  for (let i = 0; i < n; i++) { const t0 = a.currentTime + .05 + i * (.14 + Math.random() * .08), f0 = 750 + Math.random() * 300, o = a.createOscillator(), bp = a.createBiquadFilter(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * .62, t0 + .13); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 2.5;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .015); g.gain.exponentialRampToValueAtTime(.0001, t0 + .16); o.connect(bp); bp.connect(g); g.connect(out); o.start(t0); o.stop(t0 + .2); }
}
export function beachPuff(vol, pan) {
  const a = AU.ctx, out = beachSrc(900, pan), t0 = a.currentTime + .05, sr = a.createBufferSource(); sr.buffer = AU.noise; const lp = a.createBiquadFilter(), g = a.createGain();
  lp.type = 'lowpass'; lp.frequency.value = 320; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .08); g.gain.exponentialRampToValueAtTime(.0001, t0 + 1.1); sr.connect(lp); lp.connect(g); g.connect(out); sr.start(t0, Math.random() * 2); sr.stop(t0 + 1.2);
  const o = a.createOscillator(), og = a.createGain(); o.frequency.setValueAtTime(58, t0); o.frequency.exponentialRampToValueAtTime(34, t0 + .5); og.gain.setValueAtTime(.0001, t0); og.gain.exponentialRampToValueAtTime(vol * .7, t0 + .03); og.gain.exponentialRampToValueAtTime(.0001, t0 + .6); o.connect(og); og.connect(out); o.start(t0); o.stop(t0 + .7);
}
export function tone(f0, f1, dur, type, vol, delay) {
  if (!AU.ctx || AU.muted || AU.ctx.state === 'closed') return;
  const a = AU.ctx, t = a.currentTime + (delay || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + .05);
}
export function noiseBurst(dur, ftype, freq, vol, delay) {
  if (!AU.ctx || AU.muted || !AU.noise) return;
  const a = AU.ctx, t = a.currentTime + (delay || 0);
  const s = a.createBufferSource(); s.buffer = AU.noise;
  const f = a.createBiquadFilter(); f.type = ftype; f.frequency.value = freq;
  const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t, Math.random() * 3); s.stop(t + dur + .05);
}
export const GRANDPA = { f0: 115, mel: .6, fry: .15, fryHz: 26, bright: 1700, dur: 1, fall: .8, vib: 1.5, gain: .15 };
export const VOW5 = { a: [760, 1150, 2500], e: [480, 1650, 2400], i: [330, 1950, 2600], o: [460, 820, 2500], u: [340, 720, 2300] };
export const MELODY = [1, 1.12, 1.26, 1.12, 1, .94, 1.06, 1.18];
export function hashStr(w) { let h = 7; for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) >>> 0; return h; }
export function speakSyll(word, idx, last, delay) {
  const ctx = AU.ctx, t0 = ctx.currentTime + delay, p = GRANDPA, h = hashStr(word.toLowerCase()), jit = 1 + ((h >> 3) % 7 - 3) * .012;
  const vm = word.toLowerCase().match(/[aeiou]/), F = VOW5[vm ? vm[0] : 'o'];
  const dur = Math.min(.32, (.1 + word.length * .017) * p.dur) * (last ? 1.5 : 1), f0 = p.f0 * (1 + p.mel * (MELODY[idx % MELODY.length] - 1)) * (last ? p.fall : 1) * jit;
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * (last ? .85 : .97), t0 + dur);
  const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5; lg.gain.value = f0 * p.vib / 100; l.connect(lg); lg.connect(o.frequency);
  const am = ctx.createGain(); am.gain.value = 1 - p.fry; const fr = ctx.createOscillator(); fr.frequency.value = p.fryHz * (1 + ((h >> 5) % 5 - 2) * .05); const fg = ctx.createGain(); fg.gain.value = p.fry; fr.connect(fg); fg.connect(am.gain); o.connect(am);
  const out = ctx.createGain(); out.gain.setValueAtTime(.0001, t0); out.gain.linearRampToValueAtTime(p.gain, t0 + .04); out.gain.setTargetAtTime(.0001, t0 + dur * .7, dur * .22); out.connect(AU.master);
  const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = p.bright; soft.connect(out);
  F.forEach((f, k) => { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = [6.5, 9.5, 11][k]; const g = ctx.createGain(); g.gain.value = [1, .42, .12][k]; am.connect(bp); bp.connect(g); g.connect(soft); });
  [o, l, fr].forEach(n => { n.start(t0); n.stop(t0 + dur + .25); });
}
export const SFX = {
  knock() { tone(330, 140, .09, 'triangle', .35); tone(190, 90, .12, 'sine', .25, .02); [0, .07, .13].forEach((d, i) => tone(380 + i * 120, 620 + i * 140, .06, 'sine', .12, .12 + d)); },
  sip() { [0, .08, .16].forEach((d, i) => tone(420 + i * 90, 700 + i * 120, .07, 'sine', .14, d)); },
  crab() { noiseBurst(.03, 'highpass', 3000, .5); noiseBurst(.03, 'highpass', 3500, .4, .06); tone(900, 700, .05, 'square', .04, .02); },
  meow() {
    if (!AU.ctx || AU.muted) return;
    const a = AU.ctx, t = a.currentTime, o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(560, t); o.frequency.linearRampToValueAtTime(880, t + .12); o.frequency.linearRampToValueAtTime(520, t + .42);
    f.type = 'bandpass'; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1600, t + .15); f.frequency.linearRampToValueAtTime(800, t + .42); f.Q.value = 4;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .04); g.gain.exponentialRampToValueAtTime(.0001, t + .45);
    o.connect(f); f.connect(g); g.connect(AU.master); o.start(t); o.stop(t + .5);
  },
  hm() { tone(118, 96, .22, 'sine', .22); tone(236, 190, .18, 'triangle', .05); },
  speak(line) {   // v011: the tortoise's "Warm grandpa" voice (same as on the island map): one soft syllable per word, first words only
    if (!AU.ctx || AU.muted) return;
    const words = line.split(/\s+/).filter(w => /[A-Za-z]/.test(w)), n = Math.min(words.length, line.length < 40 ? 4 : 8);
    if (!n) { SFX.hm(); return; }
    for (let i = 0; i < n; i++) { const w = words[i], last = i === n - 1 && (/[.!?]$/.test(w) || n === words.length); speakSyll(w.replace(/[^A-Za-z']/g, '') || 'mm', i, last, i * .19); }
  },
  cat(kind) {
    if (!AU.ctx || AU.muted) return;
    if (kind === 'hiss') { noiseBurst(.35, 'highpass', 3800, .45); return; }
    if (kind === 'mi') {   // v018
      const a = AU.ctx, t = a.currentTime, d = .36, o = a.createOscillator(), vib = a.createOscillator(), vg = a.createGain(), out = a.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(820, t); o.frequency.linearRampToValueAtTime(1180, t + .12); o.frequency.linearRampToValueAtTime(1050, t + .24); o.frequency.exponentialRampToValueAtTime(760, t + d);
      vib.frequency.value = 9; vg.gain.value = 22; vib.connect(vg); vg.connect(o.frequency);
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(5200, t + .07);   /* the m opens into the vowel */
      const f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(), g1 = a.createGain(), g2 = a.createGain(); f1.type = f2.type = 'bandpass'; f1.Q.value = 5; f2.Q.value = 7;
      f1.frequency.setValueAtTime(420, t); f1.frequency.linearRampToValueAtTime(900, t + .16); f1.frequency.linearRampToValueAtTime(760, t + d);   /* i → a */
      f2.frequency.setValueAtTime(2600, t); f2.frequency.linearRampToValueAtTime(1600, t + .2); f2.frequency.linearRampToValueAtTime(1400, t + d);
      g1.gain.value = 1; g2.gain.value = .7; o.connect(lp); lp.connect(f1); lp.connect(f2); f1.connect(g1); f2.connect(g2); g1.connect(out); g2.connect(out);
      out.gain.setValueAtTime(.0001, t); out.gain.exponentialRampToValueAtTime(.5, t + .05); out.gain.setValueAtTime(.45, t + .2); out.gain.exponentialRampToValueAtTime(.0001, t + d);
      out.connect(AU.master); o.start(t); vib.start(t); o.stop(t + d + .05); vib.stop(t + d + .05); return;
    }
    const P = { mi: [950, 1350, 1000, .16, 6], mrrp: [480, 640, 430, .32, 3], mau: [400, 620, 340, .42, 4], yowl: [520, 980, 420, 1.0, 5], happy: [640, 1050, 560, .55, 4] }[kind] || [560, 880, 520, .45, 4];
    const a = AU.ctx, t = a.currentTime, o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(), d = P[3];
    o.type = 'sawtooth'; o.frequency.setValueAtTime(P[0], t); o.frequency.linearRampToValueAtTime(P[1], t + d * .3); o.frequency.linearRampToValueAtTime(P[2], t + d);
    f.type = 'bandpass'; f.frequency.setValueAtTime(P[0] * 1.6, t); f.frequency.linearRampToValueAtTime(P[1] * 1.8, t + d * .35); f.frequency.linearRampToValueAtTime(P[2] * 1.5, t + d); f.Q.value = P[4];
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'mi' ? .18 : .24, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    if (kind === 'mrrp') { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 28; lg.gain.value = .12; l.connect(lg); lg.connect(g.gain); l.start(t); l.stop(t + d); }
    o.connect(f); f.connect(g); g.connect(AU.master); o.start(t); o.stop(t + d + .05);
  },
  purr() { for (let i = 0; i < 8; i++) { const d = i * .09; noiseBurst(.07, 'bandpass', 240, .9, d); tone(96, 84, .07, 'triangle', .3, d); tone(48, 42, .07, 'sine', .25, d); } },   // v037: louder — the low hum alone was inaudible on small speakers
  find() { tone(523, 523, .5, 'sine', .2); tone(784, 784, .5, 'sine', .14, .1); tone(1046, 1046, .6, 'sine', .1, .2); },
  buy() { tone(660, 660, .5, 'sine', .18); tone(990, 990, .5, 'sine', .1, .07); },
  stamp() { tone(210, 70, .1, 'square', .12); noiseBurst(.07, 'lowpass', 700, .7); },
  splat() { noiseBurst(.18, 'bandpass', 600, .7); tone(160, 60, .2, 'sine', .25); },
  hurt() { tone(230, 150, .15, 'square', .07); },
  growl() { tone(110, 70, .9, 'sawtooth', .07); noiseBurst(.8, 'lowpass', 300, .25); },
  boom() { tone(90, 30, .5, 'sine', .35); noiseBurst(.4, 'lowpass', 500, .6); },
  dash() { noiseBurst(.1, 'highpass', 4500, .5); tone(1500, 2100, .06, 'sine', .08); },
  squelch() { noiseBurst(.12, 'lowpass', 400, .6); tone(300, 90, .12, 'sawtooth', .05); },
  clink() { tone(2400, 2200, .12, 'sine', .08); tone(3100, 3000, .1, 'sine', .05, .05); },
  whoosh() { noiseBurst(.25, 'bandpass', 1800, .35); },
  catch() { tone(500, 300, .06, 'triangle', .15); },
  voidHit(n) { const k = Math.pow(1.19, n || 0); tone(70 * k, 30 * k, .5, 'sawtooth', .22); noiseBurst(.35, 'lowpass', 420, 1); tone(55, 35, .6, 'sine', .35); tone(880 * k, 1320 * k, .14, 'square', .06, .05); },
  gulp() { [0, .18, .36].forEach(d => tone(180, 120, .12, 'sine', .25, d)); },
  pee() { noiseBurst(1.3, 'highpass', 2500, .12); },
  wave() { noiseBurst(1.1, 'lowpass', 500, 1); tone(70, 45, .9, 'sine', .25); },
  swell() { noiseBurst(1.4, 'lowpass', 300, .9); tone(82, 60, 1.3, 'sine', .22); },
  lose() { tone(392, 330, .35, 'triangle', .18); tone(330, 262, .5, 'triangle', .18, .3); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .35, 'triangle', .16, i * .11)); },
  fanfare(big) {
    tone(210, 60, .25, 'square', .16); noiseBurst(.2, 'lowpass', 600, .9);
    const seq = big ? [523, 659, 784, 1047, 784, 1047, 1319] : [523, 659, 784, 1047, 1319];
    seq.forEach((f, i) => { tone(f, f, .32, 'triangle', .16, .15 + i * .1); tone(f / 2, f / 2, .3, 'sine', .08, .15 + i * .1); });
    tone(1047, 1047, .9, 'sine', .1, .15 + seq.length * .1);
  }
};
export function setSurf(v) { if (AU.surf && AU.ctx) AU.surf.gain.setTargetAtTime(v, AU.ctx.currentTime, .6); }

// ############################ ISLAND · voices ############################
// ---------- ambient voices: WebAudio, started on the first tap ----------
export const SND = { ctx: null, on: true, master: null, noise: null };
try { SND.on = localStorage.getItem('robinson_map_sound') !== 'off'; } catch (e) {}
export function sndInit() {
  if (SND.ctx || !SND.on) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try {
    SND.ctx = SOUND.ctx(); if (!SND.ctx) return; SND.master = SND.ctx.createGain(); SND.master.gain.value = .55; SND.master.connect(SOUND.bus('insel'));   // v030: the game's one AudioContext
    const len = SND.ctx.sampleRate * .25, buf = SND.ctx.createBuffer(1, len, SND.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    SND.noise = buf;
  } catch (e) { SND.ctx = null; }
}
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { sndInit(); if (SND.ctx && SND.ctx.state === 'suspended') SND.ctx.resume(); }, { capture: true }));
export function sndOk() { return SND.on && SND.ctx && SND.ctx.state === 'running'; }
export function envGain(t0, peak, att, dec) { const g = SND.ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + att); g.gain.exponentialRampToValueAtTime(.0001, t0 + att + dec); g.connect(SND.master); return g; }
export function noiseHit(t0, freq, q, peak, dur, freq2) {
  const src = SND.ctx.createBufferSource(); src.buffer = SND.noise;
  const f = SND.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t0); if (freq2) f.frequency.linearRampToValueAtTime(freq2, t0 + dur); f.Q.value = q;
  src.connect(f); f.connect(envGain(t0, peak, .002, dur)); src.start(t0, Math.random() * .1, dur + .05);
}
// briefcase: soft typewriter keys, a little uneven
export function sfxKey() {
  if (!sndOk()) return; const t0 = SND.ctx.currentTime + Math.random() * .012;
  noiseHit(t0, 2600 + Math.random() * 1400, 3.5, .05 + Math.random() * .025, .028 + Math.random() * .012);
  if (Math.random() < .5) noiseHit(t0 + .004, 380 + Math.random() * 120, 2, .03, .03);   // the thunk of the type bar
}
export function sfxRing() {   // v020: an old-fashioned double ring, twice
  if (!sndOk()) return; const t0 = SND.ctx.currentTime + .05;
  [0, .5, 2.2, 2.7].forEach(dt => [480, 620].forEach(fr => { const o = SND.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr; o.connect(envGain(t0 + dt, .022, .01, .38)); o.start(t0 + dt); o.stop(t0 + dt + .42); }));
}
export function sfxFanfare() {
  if (!sndOk()) return; const t0 = SND.ctx.currentTime + .05;
  [[523, 0], [659, .18], [784, .36], [1047, .6], [784, .9], [1047, 1.08]].forEach(([fr, dt]) => { const o = SND.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = fr; o.connect(envGain(t0 + dt, .05, .01, .7)); o.start(t0 + dt); o.stop(t0 + dt + .8); });
}
export function sfxBell() {
  if (!sndOk()) return; const t0 = SND.ctx.currentTime + .03;
  [[2093, .028], [3140, .01]].forEach(([fr, pk]) => { const o = SND.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr; o.connect(envGain(t0, pk, .003, .7)); o.start(t0); o.stop(t0 + .8); });
  for (let k = 0; k < 6; k++) noiseHit(t0 + .18 + k * .028, 1200 + k * 90, 4, .018, .02);   // carriage return ratchet
  noiseHit(t0 + .36, 500, 1.5, .02, .09, 900);
}
// tortoise: a soft, low murmur — one syllable every few letters
export function sfxMurmur() {
  if (!sndOk()) return; const t0 = SND.ctx.currentTime, dur = .1 + Math.random() * .08, f0 = 170 + Math.random() * 120;
  const o = SND.ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f0, t0); o.frequency.linearRampToValueAtTime(f0 * (.86 + Math.random() * .2), t0 + dur);
  const bp = SND.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600 + Math.random() * 350; bp.Q.value = 2;   // a vowel-ish formant
  const lp = SND.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300;
  const body = SND.ctx.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 400;
  const g = envGain(t0, .16, .03, dur), g2 = envGain(t0, .05, .03, dur);
  o.connect(bp); bp.connect(lp); lp.connect(g); o.connect(body); body.connect(g2); o.start(t0); o.stop(t0 + dur + .12);
}
// tortoise: a made-up sing-song language — one syllable per word, two vowel formants, a little melody that falls at the end of a sentence
export const VOWELS = [[700, 1150], [480, 850], [360, 760], [520, 1450], [620, 1000]];   // a, o, u, e(soft), aw
// tortoise voice "Warm grandpa": soft vowel syllables, a gentle tune, a touch of creak
export function sfxBurn() { if (!sndOk()) return; const ctx = SND.ctx, t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + 1.4); lp.type = 'lowpass'; lp.frequency.value = 500;
  g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(.18, t0 + .08); g.gain.setTargetAtTime(.0001, t0 + .6, .35); o.connect(lp); lp.connect(g); g.connect(SND.master); o.start(t0); o.stop(t0 + 2); }
export function sfxSyll(word, idx, last) {
  if (!sndOk()) return; const ctx = SND.ctx, t0 = ctx.currentTime, p = GRANDPA, h = hashStr(word.toLowerCase()), jit = 1 + ((h >> 3) % 7 - 3) * .012;
  const vm = word.toLowerCase().match(/[aeiou]/), F = VOW5[vm ? vm[0] : 'o'];
  const dur = Math.min(.32, (.1 + word.length * .017) * p.dur) * (last ? 1.5 : 1), f0 = p.f0 * (1 + p.mel * (MELODY[idx % MELODY.length] - 1)) * (last ? p.fall : 1) * jit;
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * (last ? .85 : .97), t0 + dur);
  const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5; lg.gain.value = f0 * p.vib / 100; l.connect(lg); lg.connect(o.frequency);
  const am = ctx.createGain(); am.gain.value = 1 - p.fry; const fr = ctx.createOscillator(); fr.frequency.value = p.fryHz * (1 + ((h >> 5) % 5 - 2) * .05); const fg = ctx.createGain(); fg.gain.value = p.fry; fr.connect(fg); fg.connect(am.gain); o.connect(am);
  const out = ctx.createGain(); out.gain.setValueAtTime(.0001, t0); out.gain.linearRampToValueAtTime(p.gain, t0 + .04); out.gain.setTargetAtTime(.0001, t0 + dur * .7, dur * .22); out.connect(SND.master);
  const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = p.bright; soft.connect(out);
  F.forEach((f, k) => { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = [6.5, 9.5, 11][k]; const g = ctx.createGain(); g.gain.value = [1, .42, .12][k]; am.connect(bp); bp.connect(g); g.connect(soft); });
  [o, l, fr].forEach(n => { n.start(t0); n.stop(t0 + dur + .25); });
}
// v034: Fi — a soft female voice with a touch of magic: higher, rounder vowels, a little bell shimmer and a short echo
let FI_ECHO = null;
function fiEcho() {
  if (FI_ECHO && FI_ECHO.ctx === SND.ctx) return FI_ECHO.in; const ctx = SND.ctx, d = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), inp = ctx.createGain(), wet = ctx.createGain();
  d.delayTime.value = .16; fb.gain.value = .38; lp.type = 'lowpass'; lp.frequency.value = 2600; wet.gain.value = .45; inp.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(SND.master); inp.connect(SND.master);
  FI_ECHO = { ctx, in: inp }; return inp;
}
export function sfxFi(word, idx, last) {
  if (!sndOk()) return; const ctx = SND.ctx, t0 = ctx.currentTime, h = hashStr((word || 'mm').toLowerCase()), jit = 1 + ((h >> 3) % 7 - 3) * .015;
  const vm = (word || '').toLowerCase().match(/[aeiou]/), F = VOW5[vm ? vm[0] : 'a'];
  const dur = Math.min(.26, .08 + (word || 'mm').length * .016) * (last ? 1.5 : 1), f0 = 290 * (1 + .18 * (MELODY[idx % MELODY.length] - 1)) * (last ? .88 : 1) * jit;
  const out = ctx.createGain(); out.gain.setValueAtTime(.0001, t0); out.gain.linearRampToValueAtTime(.16, t0 + .03); out.gain.setTargetAtTime(.0001, t0 + dur * .7, dur * .25); out.connect(fiEcho());
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * (last ? .86 : 1.02), t0 + dur);
  const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 5.5; vg.gain.value = f0 * .012; v.connect(vg); vg.connect(o.frequency);
  F.forEach((f, k) => { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 1.2; bp.Q.value = [5, 8, 10][k]; const g = ctx.createGain(); g.gain.value = [1.2, .5, .18][k]; o.connect(bp); bp.connect(g); g.connect(out); });
  const b = ctx.createOscillator(), bg = ctx.createGain(); b.type = 'sine'; b.frequency.value = f0 * 6 * (1 + (h % 3) * .25); bg.gain.setValueAtTime(.05, t0); bg.gain.exponentialRampToValueAtTime(.0001, t0 + .35); b.connect(bg); bg.connect(out);   // the shimmer
  [o, v, b].forEach(n => { n.start(t0); n.stop(t0 + Math.max(dur, .35) + .2); });
}
// voices per typed character: briefcase keys; tortoise sings the first words of a line (or only murmurs for short/repeat lines)
export function voiceChar(who, full, i, st, murmur) {
  const ch = full[i - 1], prev = i > 1 ? full[i - 2] : ' ';
  if (ch === ' ' || ch === '\n') return;
  if (who === 'briefcase') { sfxKey(); return; }
  if (!/\s/.test(prev) && i > 1) return;   // only at word starts
  const word = full.slice(i - 1).split(/\s/)[0].replace(/[^A-Za-z']/g, '') || 'mm', last = /[.!?]$/.test(full.slice(i - 1).split(/\s/)[0]);
  if (who === 'fi') { if (st.w < 10) sfxFi(word, st.w, last); st.w++; return; }   // v034
  if (murmur || full.length < 46) { if (st.w++ < 4) sfxMurmur(); return; }
  if (st.w < 9) sfxSyll(word, st.w, last); st.w++;
}

// ############################ ISLAND · ambience voices ############################
export const AMB = { on: false, k: 0, L: 0, H: 1, next: {}, src: null };
export function ambNoise(a, kind, sec) { const len = a.sampleRate * sec, b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0); let l = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { l = (l + .02 * w) / 1.02; d[i] = l * 3.5; } else if (kind === 'pink') { b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * .2; } else d[i] = w; } return b; }

export function ambGraph() {   // v031: the node graph of the island ambience (the map part lives in insel.js · ambInit)
  const a = SND.ctx, mk = (t, f, q) => { const x = a.createBiquadFilter(); x.type = t; x.frequency.value = f; if (q) x.Q.value = q; return x; }, gn = v => { const g = a.createGain(); g.gain.value = v; return g; };
  const loopSrc = buf => { const s = a.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
  AMB.out = gn(0); AMB.out.connect(SND.master);
  AMB.brown = ambNoise(a, 'brown', 4); AMB.white = ambNoise(a, 'white', 3); const pink = ambNoise(a, 'pink', 5);
  // surf bed with its breathing
  AMB.lp = mk('lowpass', 650); AMB.surf = gn(0); loopSrc(AMB.brown).connect(AMB.lp); AMB.lp.connect(AMB.surf); AMB.surf.connect(AMB.out);
  AMB.lfo = a.createOscillator(); AMB.lfo.frequency.value = .11; AMB.lfoG = gn(0); AMB.lfo.connect(AMB.lfoG); AMB.lfoG.connect(AMB.surf.gain); AMB.lfo.start();
  // beach breeze: a wandering band of air
  const bp = mk('bandpass', 900, .6); AMB.breeze = gn(0); loopSrc(AMB.white).connect(bp); bp.connect(AMB.breeze); AMB.breeze.connect(AMB.out);
  const wl = a.createOscillator(); wl.frequency.value = .05; const wlg = gn(400); wl.connect(wlg); wlg.connect(bp.frequency); wl.start();
  // high wind: soft pink air, very slow
  const hl = mk('lowpass', 900); AMB.high = gn(0); loopSrc(pink).connect(hl); hl.connect(AMB.high); AMB.high.connect(AMB.out);
  const hlo = a.createOscillator(); hlo.frequency.value = .035; AMB.highL = gn(0); hlo.connect(AMB.highL); AMB.highL.connect(AMB.high.gain); hlo.start();
  // volcano: a low continuous rumble (a located source)
  const rl = mk('lowpass', 95); AMB.rumble = gn(0); AMB.rumbleP = a.createStereoPanner(); loopSrc(AMB.brown).connect(rl); rl.connect(AMB.rumble); AMB.rumble.connect(AMB.rumbleP); AMB.rumbleP.connect(AMB.out);
}
export function ambVoice(att, cut) { const a = SND.ctx, g = a.createGain(), p = a.createStereoPanner(), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(500, cut * (1 / (1 + att.d / 900))); p.pan.value = att.pan; g.connect(lp); lp.connect(p); p.connect(AMB.out); return g; }
export function ambBooby(att) {   // gannets / boobies: a few harsh, nasal calls
  const a = SND.ctx, n = 1 + (Math.random() * 3 | 0), out = ambVoice(att, 7000);
  for (let i = 0; i < n; i++) { const t0 = a.currentTime + .05 + i * (.14 + Math.random() * .08), f0 = 750 + Math.random() * 300;
    const o = a.createOscillator(), bp = a.createBiquadFilter(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * .62, t0 + .13);
    bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 2.5; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.09 * att.g, t0 + .015); g.gain.exponentialRampToValueAtTime(.0001, t0 + .16);
    o.connect(bp); bp.connect(g); g.connect(out); o.start(t0); o.stop(t0 + .2); }
}
export function ambBats(att) {   // a flurry of high chirps and a soft wing flutter
  const a = SND.ctx, out = ambVoice(att, 12000), n = 3 + (Math.random() * 4 | 0);
  for (let i = 0; i < n; i++) { const t0 = a.currentTime + .05 + i * (.05 + Math.random() * .06), o = a.createOscillator(), g = a.createGain(), f = 6200 + Math.random() * 2500;
    o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * .8, t0 + .02); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.035 * att.g, t0 + .003); g.gain.exponentialRampToValueAtTime(.0001, t0 + .025);
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + .04); }
  const t1 = a.currentTime + .1, s = a.createBufferSource(); s.buffer = AMB.white; const bp = a.createBiquadFilter(), g = a.createGain(), am = a.createOscillator(), amg = a.createGain();
  bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.2; g.gain.value = 0; am.frequency.value = 17; amg.gain.value = .02 * att.g; am.connect(amg); amg.connect(g.gain);
  s.connect(bp); bp.connect(g); g.connect(out); s.start(t1, Math.random() * 2, .4); am.start(t1); am.stop(t1 + .45);
}
export function ambPuff(att) {   // the mountain clears its throat: a soft whoomp
  const a = SND.ctx, out = ambVoice(att, 1200), t0 = a.currentTime + .05, s = a.createBufferSource(); s.buffer = AMB.brown; const lp = a.createBiquadFilter(), g = a.createGain();
  lp.type = 'lowpass'; lp.frequency.value = 320; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.22 * att.g, t0 + .08); g.gain.exponentialRampToValueAtTime(.0001, t0 + 1.1);
  s.connect(lp); lp.connect(g); g.connect(out); s.start(t0, Math.random() * 2); s.stop(t0 + 1.2);
  const o = a.createOscillator(), og = a.createGain(); o.frequency.setValueAtTime(58, t0); o.frequency.exponentialRampToValueAtTime(34, t0 + .5); og.gain.setValueAtTime(.0001, t0); og.gain.exponentialRampToValueAtTime(.16 * att.g, t0 + .03); og.gain.exponentialRampToValueAtTime(.0001, t0 + .6);
  o.connect(og); og.connect(out); o.start(t0); o.stop(t0 + .7);
}

// ############################ ISLAND · cave ############################
// ---------- sound: breathing that moves, drips, a heartbeat when the fear is high ----------
export function caveSndStart(CV) {
  if (!sndOk()) return; const a = SND.ctx; if (CV.snd) return;
  const src = a.createBufferSource(); src.buffer = (AMB.brown || ambNoise(a, 'brown', 4)); src.loop = true;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = .9; const g = a.createGain(); g.gain.value = 0; const p = a.createStereoPanner();
  src.connect(bp); bp.connect(g); g.connect(p); p.connect(SND.master); src.start();
  CV.snd = { src, g, p, nextDrip: 0, nextBeat: 0 };
}
export function caveSndStop(CV) { if (CV.snd) { try { CV.snd.src.stop(); } catch (e) {} CV.snd = null; } }
export function caveSndTick(CV, inf) {
  const S = CV.snd; if (!S || !sndOk()) return; const a = SND.ctx, now = a.currentTime, C = CV;
  const br = C.reading ? 0 : C.p * (.35 + .35 * Math.max(0, Math.sin(now * 1.7)));   // slow in-out breathing
  S.g.gain.setTargetAtTime(br * .28, now, .08); S.p.pan.setTargetAtTime(C.apDir * (1 - C.p * .6), now, .3);
  if (now > S.nextDrip) { S.nextDrip = now + 1.5 + Math.random() * 4; const o = a.createOscillator(), g = envGain(now, .05, .003, .25); o.frequency.setValueAtTime(1800 + Math.random() * 900, now); o.frequency.exponentialRampToValueAtTime(700, now + .08); o.connect(g); o.start(now); o.stop(now + .3); }
  if (inf >= 7 && !C.reading && now > S.nextBeat) { S.nextBeat = now + .85 - (inf - 7) * .08; [0, .16].forEach((d, k) => { const o = a.createOscillator(), g = envGain(now + d, k ? .12 : .18, .01, .18); o.frequency.value = 52; o.connect(g); o.start(now + d); o.stop(now + d + .25); }); }
}
export function caveScareSnd() { if (!sndOk()) return; const a = SND.ctx, now = a.currentTime, kind = Math.random();
  if (kind < .4) { [0, .12].forEach(d => { const o = a.createOscillator(), g = envGain(now + d, .06, .004, .5); o.type = 'triangle'; o.frequency.value = 2100; o.connect(g); o.start(now + d); o.stop(now + d + .6); }); }   // a till bell
  else if (kind < .7) noiseHit(now, 900, 6, .08, .9, 300);   // a whisper of paper
  else { const o = a.createOscillator(), g = envGain(now, .05, .3, 1.2); o.frequency.setValueAtTime(140, now); o.frequency.linearRampToValueAtTime(110, now + 1.3); o.connect(g); o.start(now); o.stop(now + 1.6); } }
export function caveScream() { if (!sndOk()) return; const a = SND.ctx, now = a.currentTime, o = a.createOscillator(), f = a.createBiquadFilter(), g = envGain(now, .22, .02, .9);
  o.type = 'sawtooth'; o.frequency.setValueAtTime(900, now); o.frequency.linearRampToValueAtTime(1400, now + .15); o.frequency.linearRampToValueAtTime(500, now + .8); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 3; o.connect(f); f.connect(g); o.start(now); o.stop(now + 1); }
