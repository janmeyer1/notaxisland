// ============================================================================
// TRAUM — v056: the Dream. One full-screen upgrade screen for both worlds: it replaces the Ledger on the beach and the banyan's
// unlock tree on the island. The picture (traumbild.js) is the floating isle over the mirror lake; the upgrades lie on it as a
// layer. Only what is owned or buyable now shows; the camera fits what shows. Names only on what you can buy now (red: too dear).
// Data, prices and buying come from the worlds through the hub (SPIEL.traumKnoten / traumKauf) — nothing is duplicated here.
// ============================================================================
export const TRAUM = (() => {
  const B = TRAUMBILD, W = B.W, H = B.H, L = B.L, R = 25;
  const COL = { c: '#5aa8ff', g: '#7ae07e', r: '#ff8a7a', p: '#ff8ad0', y: '#ffb35a', b: '#b088ff', v: '#8a62d6', e: '#ff4a1a' };
  const TXT = { c: '#a8d0ff', g: '#a6eea8', r: '#ffa596', p: '#f6aedc', y: '#ffc98a', b: '#cdb0ff', v: '#b89aee', e: '#ff8a6a' };
  // where every upgrade sits in the picture: [x, y, colour, the line it hangs on (node or H:header), short name, key, icon, group]
  const BX = 570, BY = 302, SX = 930, SY = 338, CX = 1125, CY = 424, VX = 980, VY = 165;
  const POS = {
    jump: [BX, BY - 82, 'c', 'H:board', 'Jump', 'D', 'jump', 'board'],
    boostLen: [BX - 205, BY - 30, 'c', 'H:board', 'Long Boost', '', 'boost', 'board'],
    magnet: [BX + 190, BY - 26, 'c', 'H:board', 'Heart Magnet', '', 'magnet', 'board'],
    cycle: [BX - 118, BY - 78, 'c', 'H:board', 'Wall Leap', 'A', 'wall', 'board'],
    cycleBoom: [BX - 205, BY - 150, 'c', 'cycle', 'Heavy Boomerang', '', 'boom', 'board'],
    cycleDive: [BX - 110, BY - 160, 'c', 'cycle', 'Deep Dive', '', 'dive', 'board'],
    glide: [BX, BY - 152, 'c', 'jump', 'Glider', 'hold D', 'glide', 'board'],
    glideLen: [BX, BY - 222, 'c', 'glide', 'Long Glide', '', 'glideLen', 'board'],
    flame: [BX + 118, BY - 78, 'c', 'H:board', 'Flamethrower', 'hold A', 'flame', 'board'],
    flamePow: [BX + 140, BY - 150, 'c', 'flame', 'Hotter Flames', '', 'flamePow', 'board'],
    dmg: [SX - 96, SY - 40, 'g', 'H:stamp', 'Heavier Stamp', '', 'dmg', 'stamp'],
    speed: [SX, SY - 70, 'g', 'H:stamp', 'Faster Stamping', '', 'speed', 'stamp'],
    splash: [SX + 96, SY - 40, 'g', 'H:stamp', 'Wider Splash', '', 'splash', 'stamp'],
    catDive: [CX, CY + 62, 'r', 'H:cat', 'Fishing Dive', '', 'catDive', 'cat'],
    lapcat: [CX + 96, CY + 40, 'r', 'H:cat', 'Lap Cat', '', 'lap', 'cat'],
    catBoard: [CX, CY + 134, 'r', 'catDive', 'Her Own Board', '', 'catBoard', 'cat'],
    catFish: [CX + 96, CY + 150, 'r', 'catBoard', 'Deeper Dives', '', 'catFish', 'cat'],
    catShoo: [CX - 92, CY + 112, 'r', 'H:cat', 'Rot Chaser', '', 'catShoo', 'cat'],   // v058
    catEel: [CX - 96, CY + 190, 'r', 'catBoard', 'Eel Catcher', '', 'catEel', 'cat'],   // v061
    void: [VX, VY, 'p', '', 'VOID', 'life-saver', 'void', 'void'],
    voidCharge: [VX - 100, VY + 46, 'p', 'void', 'Quick Charge', '', 'voidCharge', 'void'],
    voidHeal: [VX + 100, VY + 46, 'p', 'void', 'Second Wind', '', 'voidHeal', 'void'],
    listen: [700, 366, 'b', '', 'Listen', '', 'listen', 'listen'],
    coarse: [520, 454, 'y', 'H:sap', 'Coarse priority', '', 'coarse', 'sap'],
    fine: [520, 518, 'y', 'coarse', 'Fine priority', '', 'fine', 'sap'],
    rootOrder: [612, 454, 'b', 'H:roots', 'Root order', '', 'rootOrder', 'roots'],
    deepRoots: [612, 518, 'b', 'rootOrder', 'Deep Roots', '', 'deepRoots', 'roots'],
    tower: [720, 454, 'v', 'H:orders', 'Beach tower', '', 'tower', 'orders'],
    tower2: [720, 518, 'v', 'tower', 'Tower II', '', 'tower2', 'orders'],
    cleanRot: [820, 454, 'v', 'H:orders', 'Clean rot', '', 'clean', 'orders'],
    cleanRot2: [820, 518, 'v', 'cleanRot', 'Clean rot II', '', 'clean2', 'orders'],
    ableger: [920, 454, 'v', 'H:orders', 'Offshoot', '', 'offshoot', 'orders'],
    elf: [700, 594, 'e', 'listen', 'The Dark-Wood Elf', '', 'elf', 'elf'],
  };
  const HEADS = { board: ['The board', 'c', BX, BY, 22], stamp: ['The stamp', 'g', SX, SY, 22], cat: ['The cat', 'r', CX, CY, -12], sap: ['Sap', 'y', 520, 410, -12], roots: ['Roots', 'b', 612, 410, -12], orders: ['Orders', 'v', 820, 410, -12] };
  const GROUP = { board: 'The board', stamp: 'The stamp', cat: 'The cat', void: 'VOID', listen: 'The banyan', sap: 'The banyan · Sap', roots: 'The banyan · Roots', orders: 'The banyan · Orders', elf: 'The banyan · the secret' };
  const CUR = { green: ['💚', 'hearts'], tails: ['🐟', 'fish tails'], rum: ['🥃', 'rum'], wandel: ['🌀', 'free Wandel'] };
  const FI = { board: 'The board learns what your feet already know.', stamp: 'NO TAX. Still the best thing you ever signed.', cat: 'She pretends not to care. She keeps a list of everything you buy her.', void: 'Rum for a life-saver. I won\'t put that in the books.', listen: 'It hears you better now. So do I.', sap: 'Sap is cash flow with leaves.', roots: 'Roots are covenants. Keep them strong.', orders: 'Orders. Finally something you know how to give.', elf: 'That was me. Thank you for dreaming me out.' };
  const TORT = ['You dream, accountant. Good. Out here it\'s the only planning that counts.', 'Up here you see what you\'ve learned — and what you could. Tap something.', 'Even a castaway has to dream now and then. Especially a castaway.'];
  let root, sz, welt, layer, panel, built = false, offen = false, sel = null, cam = null, box = [1400, 900], bgKey = '', bgN = 0, anim = null, snd = null;
  const knoten = () => { const k = {}; SPIEL.traumKnoten().forEach(n => { if (POS[n.id]) k[n.id] = n; }); return k; };
  const gesehen = () => SPIEL.traumGesehen();
  const fmt = v => (Math.round(v * 10) / 10).toString();
  function sichtbar(n) {
    if (!n) return false;
    if (POS[n.id][7] === 'cat' && SPIEL.traumKatzeWeg()) return false;   // the cat has left: her islet stays empty
    return n.lvl > 0 || n.state === 'buy' || n.state === 'poor';
  }
  const kaufbar = n => (n.lvl === 0 && (n.state === 'buy' || n.state === 'poor')) || (n.lvl > 0 && (n.next === 'buy' || n.next === 'poor'));
  const leistbar = n => n.state === 'buy' || n.next === 'buy';
  const geschenk = n => n.welt === 'strand' && n.key && n.max === 1 && !n.cost;   // Jump, Wall Leap, Glider, Flamethrower: never for sale
  const maxed = n => n.max !== undefined && n.lvl >= n.max;
  function zustand(K) {
    const vis = Object.values(K).filter(sichtbar), ids = new Set(vis.map(n => n.id));
    return { vis, ids, banyan: ids.has('listen'), elf: ids.has('elf'), elfOwn: !!(K.elf && K.elf.lvl > 0), cat: !SPIEL.traumKatzeWeg() };
  }
  // ---------- build once ----------
  function bau() {
    if (built) return; built = true;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'traum';
    root.innerHTML = '<div class="tsz"><div class="twelt"><svg class="tlayer" viewBox="0 0 ' + W + ' ' + H + '" aria-label="The upgrades of your Dream"><defs>' + B.glows +
      '<clipPath id="tbc' + R + '"><circle r="' + (R - 3) + '"/></clipPath><clipPath id="tbc' + (R + 4) + '"><circle r="' + (R + 1) + '"/></clipPath><clipPath id="tbcD"><circle r="27"/></clipPath>' + B.syms + '</defs><g class="tl0"></g></svg></div>' +
      '<button class="tzu" aria-label="Wake up">☀ Wake up</button></div><div class="tpanel"></div>';
    document.body.appendChild(root);
    sz = root.querySelector('.tsz'); welt = root.querySelector('.twelt'); layer = root.querySelector('.tl0'); panel = root.querySelector('.tpanel');
    root.querySelector('.tzu').addEventListener('click', zu);
    layer.addEventListener('click', e => { const g = e.target.closest('[data-id]'); if (g) { sel = g.dataset.id; gesehen()['t_' + sel] = 1; zeichne(false); } });
    panel.addEventListener('click', e => { const b = e.target.closest('button[data-kauf]'); if (b && !b.disabled) kaufe(b.dataset.kauf); });
    window.addEventListener('resize', () => { if (offen) { messen(); zeichne(false); } });
    window.addEventListener('keydown', e => { if (offen && e.key === 'Escape') zu(); });
  }
  function messen() { box = [Math.max(1, sz.clientWidth), Math.max(1, sz.clientHeight)]; }
  // ---------- the camera: fit what shows into the scene's real window ----------
  function kamera(vis) {
    const bx = [[470, 60, 980, 380]];
    vis.forEach(n => { const p = POS[n.id]; bx.push([p[0] - 75, p[1] - 40, p[0] + 75, p[1] + 56]); });
    if (vis.some(n => POS[n.id][7] === 'cat')) bx.push([1030, 330, 1250, 560]);
    if (vis.some(n => POS[n.id][7] === 'void')) bx.push([840, 50, 1130, 270]);
    if (vis.some(n => n.id === 'listen')) bx.push([440, 340, 990, 650]);
    if (vis.some(n => n.id === 'elf')) bx.push([430, 330, 1000, 700]);   // the secret at the tip and its glow in the mirror
    let x0 = Math.min(...bx.map(b => b[0])), y0 = Math.min(...bx.map(b => b[1])), x1 = Math.max(...bx.map(b => b[2])), y1 = Math.max(...bx.map(b => b[3]));
    const [cw, ch] = box, a = cw / ch; let bw = x1 - x0, bh = y1 - y0;
    if (bw / bh < a) { const nw = bh * a; x0 -= (nw - bw) / 2; bw = nw; } else { const nh = bw / a; y0 -= (nh - bh) / 2; bh = nh; }
    const cover = Math.max(cw / W, ch / H), smin = cw >= ch ? cover : cw / W;   // upright: the whole width may show, sky and lake fill the rest
    let s = Math.max(smin, Math.min(cover * 2.2, cw / bw));
    let tx = cw / 2 - s * (x0 + bw / 2), ty = ch / 2 - s * (y0 + bh / 2);
    tx = s * W <= cw ? (cw - s * W) / 2 : Math.min(0, Math.max(cw - s * W, tx));
    ty = s * H <= ch ? (ch - s * H) * .4 : Math.min(0, Math.max(ch - s * H, ty));
    return { s, tx, ty };
  }
  function setzeKamera(c, fahrt) {
    welt.classList.toggle('fahrt', !!fahrt);
    welt.style.transform = 'translate(' + c.tx.toFixed(1) + 'px,' + c.ty.toFixed(1) + 'px) scale(' + c.s.toFixed(4) + ')'; cam = c;
  }
  // ---------- the picture: one bitmap per state, cross-faded ----------
  function bildSvg(z, q) {
    const mirror = z.elf ? .55 : z.banyan ? .16 : 0, ember = z.elf ? (z.elfOwn ? B.emberGreen : B.emberRed) : '';
    const s = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + Math.round(W * q) + '" height="' + Math.round(H * q) + '" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<defs>' + B.defs + '<g id="refl">' + B.refl + (z.cat ? B.cat : '') + '</g></defs>' + B.sky + '<use href="#refl"/>' +
      (mirror ? '<g clip-path="url(#waterClip)"><g opacity="' + mirror + '" filter="url(#ripple)"><use href="#refl" transform="translate(0 ' + 2 * L + ') scale(1 -1)"/></g></g>' : '') +
      ember + B.lake + (z.banyan ? '' : B.mist) + '</svg>';
    return s.replace(/ href="#/g, ' xlink:href="#');
  }
  function bild(z) {
    const key = [z.banyan, z.elf, z.elfOwn, z.cat].join(); if (key === bgKey) return; bgKey = key;
    const q = Math.min(2, Math.max(1.2, (window.devicePixelRatio || 1) * 1.1)), id = ++bgN;
    const im = new Image(), url = URL.createObjectURL(new Blob([bildSvg(z, q)], { type: 'image/svg+xml' }));
    im.onload = () => {
      URL.revokeObjectURL(url); if (id !== bgN) return;
      const cv = document.createElement('canvas'); cv.width = Math.round(W * q); cv.height = Math.round(H * q); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      cv.style.opacity = 0; welt.insertBefore(cv, welt.querySelector('svg'));
      requestAnimationFrame(() => { cv.style.opacity = 1; });
      setTimeout(() => { welt.querySelectorAll('canvas').forEach(c => { if (c !== cv) c.remove(); }); }, 1800);
    };
    im.onerror = () => URL.revokeObjectURL(url);
    im.src = url;
  }
  // ---------- the layer ----------
  function iconTf(icon, r) { const [x0, y0, x1, y1] = B.bb[icon], s = Math.min(1, 2 * (r - 7) / Math.max(x1 - x0, y1 - y0)); return 'scale(' + s.toFixed(3) + ') translate(' + fmt(-(x0 + x1) / 2) + ' ' + fmt(-(y0 + y1) / 2) + ')'; }
  function badge(n, neu) {
    const p = POS[n.id], c = p[2], r = n.id === 'void' ? R + 4 : R, buy = kaufbar(n), ok = leistbar(n), multi = n.max > 1, single = !multi;
    const hit = Math.max(r + 8, 24 / (cam ? cam.s : 1));
    let pips = '';
    if (single) pips = '<circle cx="0" cy="' + (r + 8) + '" r="3" fill="' + (n.lvl > 0 ? COL[c] : 'none') + '" stroke="' + COL[c] + '" stroke-width="1.3"/>';   // v061: one level, one circle — bought or gifted = full
    if (multi) { const k = n.max, sp = Math.min(9, 54 / k); for (let i = 0; i < k; i++) { const x = (i - (k - 1) / 2) * sp; pips += '<circle cx="' + fmt(x) + '" cy="' + (r + 8) + '" r="2.6" fill="' + (i < n.lvl ? COL[c] : 'none') + '" stroke="' + COL[c] + '" stroke-width="1.2"/>'; } }
    const ly = r + 26;
    return '<g class="tb' + (neu ? ' neu' : '') + '" data-id="' + n.id + '" transform="translate(' + p[0] + ' ' + p[1] + ')"' + (neu ? ' style="animation-delay:' + neu + 'ms"' : '') + '>' +
      '<circle r="' + fmt(hit) + '" fill="transparent"/>' +
      (ok ? '<circle class="pulse" r="' + (r + 9) + '" fill="none" stroke="' + COL[c] + '" stroke-width="2"/>' : '') +
      (sel === n.id ? '<circle r="' + (r + 6) + '" fill="none" stroke="#fff" stroke-width="2.4"/>' : '') +
      '<circle r="' + (r + 7) + '" fill="' + COL[c] + '" opacity=".14"/><circle r="' + r + '" fill="#0a0f22" fill-opacity=".86" stroke="' + COL[c] + '" stroke-width="1.8"/>' +
      '<g clip-path="url(#tbc' + r + ')" opacity="' + (n.lvl > 0 ? 1 : .5) + '"><g transform="' + iconTf(p[6], r) + '"><use href="#b-' + p[6] + '"/></g></g>' + pips +
      (buy ? '<text y="' + ly + '" class="ttl" text-anchor="middle" fill="' + (ok ? TXT[c] : '#ff5a5a') + '">' + p[4] + '</text>' : '') + '</g>';
  }
  function linie(n, K) {
    const p = POS[n.id], vp = p[3]; if (!vp) return '';
    let px, py;
    if (vp.startsWith('H:')) { const h = HEADS[vp.slice(2)]; px = h[2]; py = h[3]; } else { if (!sichtbar(K[vp])) return ''; px = POS[vp][0]; py = POS[vp][1]; }
    const d = n.id === 'elf' ? 'M' + px + ' ' + (py + 25) + ' C666 420 666 520 ' + (p[0] - 10) + ' ' + (p[1] - 24) : 'M' + px + ' ' + py + ' L' + p[0] + ' ' + p[1];
    return '<path d="' + d + '" stroke="' + COL[p[2]] + '"/>';
  }
  function zeichneLayer(K, z, neuIds) {
    let lines = '', heads = '', nodes = '', streaks = '', i = 0;
    const hv = {}; z.vis.forEach(n => { hv[POS[n.id][7]] = 1; });
    Object.entries(HEADS).forEach(([k, h]) => { if (!hv[k]) return; heads += '<g transform="translate(' + h[2] + ' ' + h[3] + ')"><path d="M0 -7 L7 0 L0 7 L-7 0 Z" fill="' + COL[h[1]] + '"/><text y="' + h[4] + '" class="tth" fill="' + TXT[h[1]] + '" text-anchor="middle">' + h[0].toUpperCase() + '</text></g>';
      if (['sap', 'roots', 'orders'].includes(k)) lines += '<path d="M700 366 L' + h[2] + ' ' + h[3] + '" stroke="' + COL.b + '"/>'; });
    z.vis.forEach(n => {
      lines += linie(n, K);
      const neu = neuIds && neuIds.has(n.id) ? 700 + 260 * i++ : 0;
      if (neu && geschenk(n)) { const p = POS[n.id]; streaks += '<path class="tstreak" style="animation-delay:' + (neu - 600) + 'ms" d="M' + VX + ' ' + VY + ' Q' + ((VX + p[0]) / 2) + ' ' + (Math.min(VY, p[1]) - 120) + ' ' + p[0] + ' ' + p[1] + '" stroke="#ffe8a8" stroke-width="2.4" fill="none" pathLength="100"/>'; }
      nodes += badge(n, neu);
    });
    layer.innerHTML = '<g class="tlines">' + lines + '</g>' + heads + streaks + nodes;
  }
  // ---------- the detail column ----------
  function zeichnePanel(K) {
    const n = sel && K[sel], fi = SPIEL.fi();
    if (!n || !sichtbar(n)) {
      const g = gesehen(), first = !g._intro;
      panel.innerHTML = '<div class="tp"><div class="tph">Your Dream</div><p class="tpt">' + (first ? TORT.join(' ') : 'Tap an upgrade. Names show only on what you can buy now — red when you can\'t afford it yet.') + '</p>' +
        (first ? '<p class="tpw">— the tortoise</p>' : '') + '</div>';
      return;
    }
    const p = POS[n.id], c = p[2], cur = CUR[n.cur] || ['', ''], gift = geschenk(n), mx = maxed(n), ok = leistbar(n), buy = kaufbar(n);
    const lv = n.max === 1 ? (n.lvl ? 'Owned' : 'Not owned') : 'Level ' + n.lvl + (n.max ? ' / ' + n.max : '');
    let status = '';
    if (gift) status = gesehen()['g_' + n.id] === 2 ? 'A gift — never for sale.' : 'A gift from the island: ' + p[4] + (p[5] ? ' [' + p[5] + ']' : '') + '.';
    else if (buy && !ok) status = 'Not enough ' + cur[1] + ' yet.';
    const price = gift ? 'free' : mx ? '—' : cur[0] + ' ' + n.cost, have = cur[0] + ' ' + (n.have !== undefined ? n.have : '');
    const label = gift ? 'A gift' : mx ? 'Fully grown' : n.lvl ? 'Buy level ' + (n.lvl + 1) : n.cur === 'wandel' ? 'Teach it' : 'Buy';
    panel.innerHTML = '<div class="tp"><div class="tpk"><svg width="84" height="84" viewBox="-42 -42 84 84" aria-hidden="true"><circle r="38" fill="' + COL[c] + '" opacity=".16"/><circle r="31" fill="#0a0f22" stroke="' + COL[c] + '" stroke-width="2"/><g clip-path="url(#tbcD)"><g transform="' + iconTf(p[6], 30) + '"><use href="#b-' + p[6] + '"/></g></g></svg>' +
      '<div><div class="tpg" style="color:' + TXT[c] + '">' + GROUP[p[7]] + '</div><div class="tpn">' + p[4] + (p[5] ? ' <span>[' + p[5] + ']</span>' : '') + '</div><div class="tpl">' + lv + '</div></div></div>' +
      '<div class="tpp"><div><span>Price</span><b style="color:' + (gift || mx ? '#9aa4c8' : ok ? '#e8dcc0' : '#ff5a5a') + '">' + price + '</b></div><div><span>You have</span><b>' + have + '</b></div></div>' +
      '<button class="tbuy" data-kauf="' + n.id + '"' + (ok && !gift && !mx ? '' : ' disabled') + ' style="background:' + (ok && !gift && !mx ? COL[c] : 'rgba(255,255,255,.08)') + ';color:' + (ok && !gift && !mx ? '#0a0f22' : '#7a84a8') + '">' + label + '</button>' +
      (status ? '<p class="tps">' + status + '</p>' : '') + (fi && FI[p[7]] ? '<p class="tpf">Fi: “' + FI[p[7]] + '”</p>' : '') + '<p class="tpt">' + beschreibung(n.desc) + '</p>' + (MINI[n.id] ? '<div class="tpmini">' + MINI[n.id] + '</div>' : '') + '</div>';
  }
  // v061: effect first (bold), the story after the dash; a small picture where a picture says it faster
  function beschreibung(d) { const i = d.indexOf(' — '); return i > 0 ? '<b>' + d.slice(0, i) + '</b><br><i>' + d.slice(i + 3) + '</i>' : d; }
  const ring = (r, col, w, dash) => '<circle r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="3 3"' : '') + '/>';
  const MINI = {
    deepRoots: '<svg width="210" height="74" viewBox="-105 -37 210 74"><g transform="translate(-55 0)">' + ring(12, '#6ad06a', 5) + ring(22, '#4ea0e0', 4) + ring(32, '#2f6fe8', 3, 1) + '<circle r="4" fill="#ffd45a"/><text y="34" fill="#c8c0a8" font-size="9" text-anchor="middle">before</text></g>' +
      '<text x="0" y="4" fill="#ffd28a" font-size="16" text-anchor="middle">→</text><g transform="translate(55 0)">' + ring(14, '#6ad06a', 5) + ring(24, '#6ad06a', 5) + ring(31, '#4ea0e0', 4) + ring(36, '#2f6fe8', 3, 1) + '<circle r="4" fill="#ffd45a"/><text y="34" fill="#c8c0a8" font-size="9" text-anchor="middle">Deep Roots: +1 ring</text></g></svg>',
    tower: '<svg width="210" height="54" viewBox="0 0 210 54"><text x="6" y="20" font-size="18">🌊🌊</text><text x="62" y="20" fill="#ffd28a" font-size="14">→</text><text x="84" y="22" font-size="20">🗼</text><text x="114" y="20" fill="#ffd28a" font-size="14">→</text><text x="134" y="22" font-size="18">🦀🥥🥃</text><text x="6" y="46" fill="#c8c0a8" font-size="10">unused beach tides become beach chores</text></svg>'
  };
  function zeichne(fahrt, neuIds) {
    const K = knoten(), z = zustand(K);
    bild(z); const c = kamera(z.vis); setzeKamera(c, fahrt); zeichneLayer(K, z, neuIds); zeichnePanel(K);
  }
  function kaufe(id) {
    const K = knoten(), n = K[id]; if (!n || !leistbar(n)) return;
    if (id === 'elf') { zu(); SPIEL.zeige('insel', { force: true }); TRAUM.zurueck = true; SPIEL.traumKauf(id); return; }   // her transformation plays on the island, then back into the Dream
    SPIEL.traumKauf(id); zeichne(true);
  }
  // ---------- sound: one cricket, the lake, Fire Mountain once the secret shows; a soft swell when something is new ----------
  function tonAn(z, neu) {
    if (AU.muted) return; const a = SOUND.ctx(); if (!a) return; if (a.state === 'suspended') a.resume().catch(() => {});
    const out = SOUND.bus('traum'); SOUND.szene('traum');
    const len = a.sampleRate * 4, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0); let l = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; l = (l + .02 * w) / 1.02; d[i] = l * 3.5; }
    const g = a.createGain(); g.gain.value = .045; g.connect(out);
    const src = a.createBufferSource(); src.buffer = buf; src.loop = true; const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; src.connect(lp); lp.connect(g); src.start();
    const lfo = a.createOscillator(); lfo.frequency.value = .07; const lg = a.createGain(); lg.gain.value = .03; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    snd = { a, out, src, lfo, buf, timers: [] };
    const loop = (fn, first, lo, hi) => { const go = () => { if (!snd) return; fn(); snd.timers.push(setTimeout(go, (lo + Math.random() * (hi - lo)) * 1000)); }; snd.timers.push(setTimeout(go, first * 1000)); };
    loop(grille, 2, 4, 10); if (z.elf) loop(grollen, 18, 45, 90);
    if (neu) schwellen();
  }
  function grille() {
    const { a, out } = snd, p = a.createStereoPanner(); p.pan.value = .55; p.connect(out);
    const trill = (t0, n, f0, v) => { for (let i = 0; i < n; i++) { const t = t0 + i * .048, o = a.createOscillator(), g = a.createGain(); o.frequency.value = f0;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .004); g.gain.setValueAtTime(v, t + .016); g.gain.exponentialRampToValueAtTime(.0001, t + .038); o.connect(g); g.connect(p); o.start(t); o.stop(t + .05); } };
    const f0 = 4300 + Math.random() * 250, t0 = a.currentTime + .05; trill(t0, 3 + (Math.random() * 2 | 0), f0, .035); if (Math.random() < .3) trill(t0 + .55, 3, f0, .028);
  }
  function grollen() {
    const { a, out, buf } = snd, t = a.currentTime + .05, s = a.createBufferSource(), lp = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 85; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.22, t + 1.4); g.gain.exponentialRampToValueAtTime(.0001, t + 5);
    s.connect(lp); lp.connect(g); g.connect(out); s.start(t); s.stop(t + 5.2);
  }
  function schwellen() {   // wind through the palm: a soft swell instead of a bell
    const { a, out, buf } = snd, t = a.currentTime + .3, s = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; bp.type = 'bandpass'; bp.Q.value = .8; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(1400, t + 1.6); bp.frequency.exponentialRampToValueAtTime(500, t + 3.2);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.5, t + 1.4); g.gain.exponentialRampToValueAtTime(.0001, t + 3.4); s.connect(bp); bp.connect(g); g.connect(out); s.start(t); s.stop(t + 3.6);
  }
  function tonAus() {
    if (!snd) return; snd.timers.forEach(clearTimeout); try { snd.src.stop(); snd.lfo.stop(); } catch (e) {} snd = null;
    SOUND.szene(SPIEL.aktiv);
  }
  // ---------- open / close ----------
  function zeigen() {
    if (!SPIEL.traumDarf()) return false;
    bau(); offen = true; TRAUM.zurueck = false; root.classList.add('an'); messen();
    const K = knoten(), z = zustand(K), g = gesehen(), neu = new Set(z.vis.filter(n => !g[n.id]).map(n => n.id));
    // start where the last visit ended (what was already seen), then fly to what shows now
    const alt = z.vis.filter(n => !neu.has(n.id));
    bild(z); setzeKamera(kamera(alt.length ? alt : z.vis.slice(0, 0)), false);
    zeichneLayer(K, z, neu);
    const gift = z.vis.find(n => neu.has(n.id) && geschenk(n)); if (gift) sel = gift.id; else if (sel && !sichtbar(K[sel])) sel = null;
    zeichnePanel(K);
    requestAnimationFrame(() => requestAnimationFrame(() => { if (offen) setzeKamera(kamera(z.vis), true); }));
    z.vis.forEach(n => { g[n.id] = 1; if (geschenk(n) && g['g_' + n.id] !== 2) g['g_' + n.id] = gift && gift.id === n.id ? 1 : 2; });
    clearTimeout(anim); anim = setTimeout(() => { if (!offen) return; g._intro = 1; Object.keys(g).forEach(k => { if (k.startsWith('g_')) g[k] = 2; }); const K2 = knoten(); zeichneLayer(K2, zustand(K2), null); }, 900 + 260 * neu.size + 1800);
    tonAn(z, neu.size > 0);
    return true;
  }
  function zu() {
    if (!offen) return; offen = false; root.classList.remove('an'); tonAus(); clearTimeout(anim);
    const g = gesehen(); g._intro = 1; Object.keys(g).forEach(k => { if (k.startsWith('g_')) g[k] = 2; });
    SPIEL.traumZu();
  }
  function neu() { try { const K = knoten(), z = zustand(K), g = gesehen(); return z.vis.some(n => !g[n.id]); } catch (e) { return false; } }
  const CSS = `
#traum{position:fixed;inset:0;z-index:60;display:none;background:#030614;color:#f3ead6;font-family:'Fredoka',system-ui,sans-serif;user-select:none;-webkit-user-select:none}
#traum.an{display:flex}
#traum .tsz{position:relative;flex:1 1 auto;min-width:0;min-height:0;overflow:hidden;background:linear-gradient(#030614 50%,#02040c 50%)}
#traum .twelt{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#traum .twelt.fahrt{transition:transform 1.9s cubic-bezier(.45,0,.2,1)}
#traum .twelt canvas{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transition:opacity 1.6s ease}
#traum .tlayer{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:visible}
#traum .tlines path{stroke-width:1.4;stroke-dasharray:3 4;opacity:.75;fill:none}
#traum .tb{cursor:pointer}
#traum .ttl{font-family:'Patrick Hand','Comic Sans MS',cursive;font-size:15px;paint-order:stroke;stroke:#050814;stroke-width:3.5px;stroke-linejoin:round}
#traum .tth{font-family:'Fredoka',sans-serif;font-size:11px;letter-spacing:.16em;font-weight:600;paint-order:stroke;stroke:#050814;stroke-width:3.5px}
#traum .pulse{transform-box:fill-box;transform-origin:center;animation:tpulse 2.2s ease-out infinite}
@keyframes tpulse{0%{transform:scale(.9);opacity:0}35%{opacity:.9}100%{transform:scale(1.18);opacity:0}}
#traum .tb.neu{transform-box:fill-box;animation:tneu .9s cubic-bezier(.3,1.6,.5,1) both}
@keyframes tneu{0%{opacity:0}40%{opacity:1}100%{opacity:1}}
#traum .tstreak{stroke-dasharray:100;stroke-dashoffset:100;animation:tstreak 1.1s ease-in both;filter:drop-shadow(0 0 4px #ffe8a8)}
@keyframes tstreak{0%{stroke-dashoffset:100;opacity:1}75%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}
#traum .ttitel{position:absolute;left:16px;top:12px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#ffd28a;pointer-events:none}
#traum .tpmini{margin-top:8px;background:rgba(255,255,255,.04);border-radius:8px;padding:4px;text-align:center}
#traum .tzu{position:absolute;right:12px;top:10px;font:600 19px 'Fredoka',sans-serif;color:#2a1a08;background:linear-gradient(180deg,#ffe28a,#f0b84a);border:2px solid #fff3c0;border-radius:999px;padding:11px 22px;min-height:50px;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.4)}   /* v061: bigger */
#traum .tpanel{flex:0 0 20%;min-width:270px;max-width:400px;overflow-y:auto;background:#0a0f22;border-left:1px solid rgba(255,210,138,.18);box-sizing:border-box}
#traum .tp{display:flex;flex-direction:column;gap:10px;padding:20px 18px 24px}
#traum .tph{font-size:18px;font-weight:600;color:#ffd28a}
#traum .tpt{font-family:'Patrick Hand',cursive;font-size:17px;line-height:1.3;color:#d8d0b8;margin:0}
#traum .tpw{font-size:12px;color:#9aa4c8;margin:-4px 0 0}
#traum .tpk{display:flex;align-items:center;gap:14px}#traum .tpk svg{flex:0 0 auto}
#traum .tpg{font-size:11px;letter-spacing:.14em;text-transform:uppercase}
#traum .tpn{font-size:20px;font-weight:600;line-height:1.15}#traum .tpn span{font-size:13px;font-weight:400;color:#9aa4c8}
#traum .tpl{font-size:13px;color:#9aa4c8}
#traum .tpp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#traum .tpp div{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.05)}
#traum .tpp span{font-size:11px;color:#9aa4c8;letter-spacing:.08em;text-transform:uppercase}#traum .tpp b{font-size:18px}
#traum .tbuy{font:600 15px 'Fredoka',sans-serif;min-height:46px;border-radius:999px;border:1px solid rgba(255,210,138,.4);cursor:pointer}#traum .tbuy:disabled{cursor:default}
#traum .tps{font-size:13px;color:#ffb08a;margin:0}
#traum .tpf{font-family:'Patrick Hand',cursive;font-size:16px;color:#b8f0a8;margin:0}
@media (orientation:portrait){#traum{flex-direction:column}#traum .tpanel{flex:0 0 40%;max-width:none;min-width:0;border-left:0;border-top:1px solid rgba(255,210,138,.18)}}
`;
  function allesGesehen() { try { const K = knoten(), z = zustand(K), g = gesehen(); g._intro = 1; z.vis.forEach(n => { g[n.id] = 1; g['t_' + n.id] = 1; if (geschenk(n)) g['g_' + n.id] = 2; }); } catch (e) {} }   // v062: after a logbook load, what shows counts as seen
  return { zeigen, zu, neu, allesGesehen, zurueck: false, get offen() { return offen; } };
})();
