// ============================================================================
// LOGBUCH (v062) — the save file is the tortoise's logbook: one paragraph per tide, in plain English.
// The story paragraphs carry no data (they are written fresh from the game every time). The last paragraph,
// "the reckoning", carries the state: numbers written out (edit them and you cheat — allowed), a place report
// in fixed words per tile, the upgrades by name, and the rest packed into the cat's shell box (two bytes per
// shell: an adjective and a shell name). Her gift word at the end is a check over the shell box only.
// No invisible characters anywhere. The CSV test log stays a separate export.
// ============================================================================

export const LOGBUCH = (() => {
  // NEVER reorder or edit these lists: every saved shell is an index into them
  const ADJ = 'amber ashen azure beige black blond blue blush bone brass bright brindled bronze brown buff burnt calm chalky cherry chipped chrome cinder clay clear cloudy coal cobalt cocoa copper coral cream crimson curled cyan damp dappled dark dawn deep dented dewy dim dotted dove drab dry dull dun dusky dusty ebony emerald faded fawn fern fiery flat flecked foamy fresh frosted gilded ginger glassy gleaming glossy gold golden granite grape grassy green grey gritty hazel hazy hollow honey icy indigo inky ivory jade jet khaki knobbly lace lean lemon light lilac lime linen loamy lucky lumpy maple marbled matte mauve mellow milky mint misty molten mossy mottled muddy murky musky navy neat nutmeg oaken ocean ochre odd olive onyx opal orange orchid pale pastel peach pearl pebbly pepper pewter pink pitted plain plum polished poppy powder prim proud puce purple quartz quiet rainy rare raw red ridged ripe roan rose rosy rough round ruby rugged russet rust rusty sable saffron sage salty sandy satin scarlet scuffed sepia shady sheer shiny silken silver silty sleek slim small smoky smooth snowy soft sooty speckled spiral spotted starry steel stony storm striped sugar sunny swirled tan tawny teal tidal tiny topaz tough twisted umber velvet violet vivid warm washed watery wavy waxen wet wheat white wild willow windy wine wiry wise worn woven young zesty blotched briny burly chunky crusty fluted frilled gnarled grained hairy horned humped jagged keeled knotted lanky lofty lustrous mighty nimble notched patched petite plucky ragged ribbed ruffled scalloped shaggy spiny stout sunlit moonlit glinting'.split(' ');
  const NOUN = 'abalone anchor auger barnacle bead bell bottle buoy button cable clam clasp cockle cone conch cork cowrie crab crown cup cuttle disc dolphin drum ear egg feather fig fin flask float flute fossil frond gem glove goby gull hat helmet hook horn jar jewel jingle kelp key kite knot lamp lantern latch leaf limpet lobster locket marble medal mitre mussel nautilus needle net nugget nut oar otter oyster paddle pail pebble pen periwinkle pin pipe plank plume pod pony prawn pumice quill rattle reed ribbon ring rope sail scallop scarab scroll seal seed sequin shard shrimp skate slipper snail sponge spoon sprat star stone sundial tellin thimble thread tooth top torch trumpet tulip tun turban turtle urchin vase wedge whelk whistle wing worm abacus acorn arrow badge basket beacon berry blade bobbin bolt bonnet bowl box brooch brush bucket buckle cameo candle cap carafe chain charm chime clock coin comb compass cradle crate crescent crystal dagger dial dice dome ember fan flag flint fork frame gear goblet gourd grail harp heart hinge hive horseshoe idol ink inkwell jug kettle ladle ladder lens lily locust lute mallet map mask mast mirror mitten moon mortar nail nib oak orb owl pan parcel petal pine plate pouch prism puffin quoin raft rake raven reel rib rivet rudder saddle salt sash satchel saucer scale scythe shell shield shoe sickle sieve spade spindle spire spur stamp stool sun swan sword tack tally teacup thistle tile tin token tower trowel tusk twig umbrella vane veil violin wand weight wheel wick wreath yarn'.split(' ');
  const AI = new Map(ADJ.map((w, i) => [w, i])), NI = new Map(NOUN.map((w, i) => [w, i]));
  const HEAD = "THE TORTOISE'S LOGBOOK";
  const crc8 = u8 => { let c = 0; for (const x of u8) { c ^= x; for (let k = 0; k < 8; k++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff; } return c; };
  const J = x => JSON.stringify(x), gleich = (a, b) => J(a) === J(b), leer = v => v === false || v === null || v === undefined || v === 0 || v === '' || (Array.isArray(v) && !v.length) || (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  const rund = v => typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v;
  const tief = v => Array.isArray(v) ? v.map(tief) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, tief(x)])) : rund(v);
  // {a:1,b:1,c:true,d:7} → {'^1':['a','b'],'^t':['c'],d:7} — the many "already told" flags, packed (and back)
  const packSet = o => { if (!o || typeof o !== 'object' || Array.isArray(o)) return o; const r = {}, one = [], tru = []; Object.keys(o).forEach(k => { if (o[k] === 1) one.push(k); else if (o[k] === true) tru.push(k); else r[k] = o[k]; }); if (one.length) r['^1'] = one; if (tru.length) r['^t'] = tru; return r; };
  const unpackSet = o => { if (!o || typeof o !== 'object' || Array.isArray(o)) return o; const r = {}; Object.keys(o).forEach(k => { if (k === '^1') o[k].forEach(x => r[x] = 1); else if (k === '^t') o[k].forEach(x => r[x] = true); else r[k] = o[k]; }); return r; };
  const SETS_B = ['seen', 'tideUps'], SETS_G = ['friends', 'unl', 'flags', 'regionOpen'];
  async function zip(str) {
    const u = new TextEncoder().encode(str); if (typeof CompressionStream === 'undefined') return { u8: u, z: false };
    const cs = new CompressionStream('deflate-raw'), w = cs.writable.getWriter(); w.write(u); w.close(); return { u8: new Uint8Array(await new Response(cs.readable).arrayBuffer()), z: true };
  }
  async function unzip(u8, z) {
    if (!z) return new TextDecoder().decode(u8);
    const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(u8); w.close(); return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
  }
  // ---------------- the story: one paragraph per tide (no data — written fresh every time) ----------------
  const STORY = {
    1: 'The sea spat out a man in a tie this morning, and a kitten on a plank right after him. He coughed up half the lagoon, looked at me and asked — I swear on my shell — whether this was a private beach. The kitten found the stamp before he did: green ink, NO TAX. I have watched castaways wash up for a hundred and ninety years. None of them ever brought stationery.',
    2: 'The first flood came, and he rode it. On a plank, stamping everything that crawled out of the water, with the kitten on his head pretending to steer. He did not drown, which already puts him ahead of most of my visitors. The monsters bleed green hearts, and he keeps them, he says, in a dream. Accountants.',
    3: 'He has started counting the tides. Out loud. The kitten has started ignoring him, which is the beginning of a friendship.',
    4: 'He jumps off mussels now. Badly, then less badly. The yacht brought those mussels, and the glow on their shells. The island did not glow before.',
    5: 'Rot minnows under his board today. The cat watched them the way I watch a bottle of rum.',
    6: 'He asked me about the spring up past the palms. I told him: something old drinks there. Older than me. He wrote that down.',
    7: 'Wake lice. Glassy little things off the yacht\'s hull, riding behind him. He looked offended. That is his face for everything.',
    8: 'The palms let him in today. The forest is thick, the spring is real, and he came back with wet shoes and the first good idea he has had on this island.',
    9: 'Walls of them now — monsters stacked like files. He learned to leap them. I pretended not to be impressed.',
    10: 'The First Mate of the yacht came in on the flood, what the rot had left of him. He threw paperwork. Jasper stamped back. When it was over there was a folder on the sand: a survey of THIS island, signed — by him.',
    11: 'He has a map now. He stares at it the way other men stare at the sea.',
    12: 'Up the beach, over the dunes, into the island. The banyan was waiting. It had been waiting a long time.'
  };
  const MS = { '🌴': 'The palm forest opened to him today.', '🗺': 'Today he found the map.', '👁': 'A boss went down today. I saw it from the rocks.' };
  const POOL_B = ['Another flood, another plank. He rode it. The cat rode him.', 'Low tide: crabs, coconuts, a sip from the spring. He calls it "the routine". I call it surviving.', 'He talked to the crabs today. They did not answer. He took that personally.', 'The sea came back angry. So did he, in his quiet way.', 'Rum for me, hearts for him, fish tails for the cat. Everyone paid. Nobody signed.'];
  const POOL_I = ['The rot pushed, the roots held. Mostly.', 'He walked the island before the flood, tile by tile, the cat a step ahead of him.', 'The banyan drank. He watched it drink. They understand each other now.', 'A long tide. Roots on one side, rot on the other, and him in the middle with a stamp.', 'He counted the island today: what is clean, what is green, what is lost. Then he counted it again.', 'The surf was rough. He came back with salt in his ears and hearts in his pockets.', 'The Board sent memos. The briefcase read them out in its office voice. The cat slept through it.', 'Clouds over the cliffs tonight. He said they looked like ledgers. I said they looked like rain.'];
  function geschichte(tag, b, insel) {
    const out = [];
    for (let d = 1; d <= tag; d++) {
      let t = STORY[d];
      if (!t) { const pool = insel && d >= (b.mapAt || 13) ? POOL_I : POOL_B; t = pool[(d * 7 + 3) % pool.length]; }
      const m = b.ms && b.ms[d] && MS[b.ms[d]]; if (m && !STORY[d]) t = m + ' ' + t;
      out.push('Tide ' + d + '. ' + t);
    }
    return out;
  }
  // ---------------- place report: fixed words per tile ----------------
  const VISIT = ['unseen', 'glimpsed', 'walked'], ROT = ['clean', 'tinged', 'rotting', 'black'];
  function labels(tBase) {
    const n = {}, k = {}; tBase.forEach(t => { const nm = String(t.name || 'a nameless tile'); n[nm] = (n[nm] || 0) + 1; });
    return tBase.map((t, i) => { let nm = String(t.name || 'a nameless tile'); if (/[.]| — |[,;]/.test(nm)) nm = 'tile ' + i; else if (n[nm] > 1) { k[nm] = (k[nm] || 0) + 1; nm += ' (' + k[nm] + ')'; } return nm; });
  }
  const DYN = ['state', 'b', 'rooted', 'rs', 'prot', 'welk', 'ableger'];
  const T_REST = ['owner', 'sac', 'vent', 'rotBorn', 'full3', 'exh', 'turm', 'trebo', 'welkSeit'];   // v063: towers, trebuchets, withered since
  function kachelSatz(lab, t) {
    const p = [VISIT[t.state | 0] || 'unseen', ROT[t.b | 0] || 'clean'];
    if (t.rooted) p.push('root ' + (t.rs | 0)); if (t.prot) p.push('guarded'); if (t.welk) p.push('withered'); if (t.source === 'nest') p.push('a nest'); if (t.ableger) p.push('an offshoot');
    return lab + ' — ' + p.join(', ') + '.';
  }
  const kachelLeer = t => !(t.state | 0) && !(t.b | 0) && !t.rooted && !t.prot && !t.welk && t.source !== 'nest' && !t.ableger;
  // ---------------- encode ----------------
  const B_SICHT = ['day', 'flood', 'green', 'tails', 'rum', 'stamina', 'maxStamina', 'palmMax', 'upg'];
  const B_WEG = ['kt', 'cr', 'lap', 'autoTxt', 'autoLast', 'lastRound', 'buyLog', 'storySeen', 'flotSeen', 'traumSeen', 'tort'];
  const G_SICHT = ['tide', 'blevel', 'sapGrow', 'sapProd', 'wandel', 'wFree', 'spring', 'springMax', 'gezeit', 'unl'];
  const G_WEG = ['frisch', 'lastBeach', 'springFlash', 'glimmer', 'es', 'outLog', 'simRow'];
  const num = v => { const x = +v || 0; return Number.isInteger(x) ? String(x) : String(Math.round(x * 10) / 10); };
  async function enc(st, ctx) {
    const b = tief(st.b || {}), G = st.m ? tief(st.m.G) : null, T = st.m ? st.m.T : null;
    const rest = { v: 1, k: st.kind || 'ebb', f: st.first ? 1 : 0, b: {} };
    Object.keys(b).forEach(k => { if (B_SICHT.includes(k) || B_WEG.includes(k)) return; if (!gleich(b[k], ctx.bGrund[k]) && !(leer(b[k]) && ctx.bGrund[k] === undefined)) rest.b[k] = SETS_B.includes(k) ? packSet(b[k]) : b[k]; });
    if (rest.b.wins) { const ks = Object.keys(rest.b.wins).map(Number).sort((x, y) => y - x).slice(0, 3), w = {}; ks.forEach(k => w[k] = rest.b.wins[k]); rest.b.wins = w; }   // the tower's Gold needs only the last stages you rode
    rest.b.tort = { bar: (b.tort || {}).bar || 0, sleep: (b.tort || {}).sleep || 0 };
    if (b.flotSeen && b.flotSeen.case) rest.b.fc = 1;
    if (G) {
      rest.g = {}; Object.keys(G).forEach(k => { if (G_SICHT.includes(k) || G_WEG.includes(k)) return; let v = G[k];
        if (k === 'res') v = Object.assign({}, v, { fruit: undefined, coco: undefined });
        if (k === 'board') v = Object.assign({}, v, { tr: undefined, st: undefined, be: undefined, intel: undefined });
        v = JSON.parse(J(v === undefined ? null : v)); if (!gleich(v, ctx.gGrund[k]) && !(leer(v) && ctx.gGrund[k] === undefined)) rest.g[k] = SETS_G.includes(k) ? packSet(v) : v; });
      rest.s = packSet(st.m.seen || {});
      rest.t = {}; T.forEach((t, i) => { const bs = ctx.tBase[i] || {}, d = {};
        ['name', 'type', 'content'].forEach(k => { if (!gleich(t[k] === undefined ? null : t[k], bs[k] === undefined ? null : bs[k])) d[k] = t[k] === undefined ? null : t[k]; });
        T_REST.forEach(k => { if (!leer(t[k])) d[k] = t[k]; });
        if (t.source && t.source !== 'nest' && t.source !== bs.source) d.source = t.source; if (!t.source && bs.source === 'wreck') d.source = null;
        if (t.rs && !t.rooted) d.rs = t.rs;
        if (Object.keys(d).length) rest.t[i] = d; });
    }
    const { u8, z } = await zip(J(rest));
    // the text
    const P = [], tag = b.day || st.tide || 1;
    P.push(HEAD + ' · Jasper Robinson, castaway · written up to tide ' + tag);
    geschichte(tag - 1, b, !!G).forEach(x => P.push(x));
    const up = ctx.upg.filter(u => (b.upg || {})[u.id] > 0), multi = up.filter(u => u.max > 1), single = up.filter(u => u.max <= 1);
    const R = ['Tide ' + tag + ' — the reckoning.',
      'In his pockets: ' + num(b.green) + ' green hearts, ' + num(b.tails) + ' fish tails, ' + num(b.rum) + ' bottles of rum.',
      'He rides stage ' + num(b.flood) + ' with ' + num(b.stamina) + ' of ' + num(b.maxStamina) + ' stamina, and the palm keeps ' + num(b.palmMax) + ' coconuts for him.',
      multi.length ? 'His craft: ' + multi.map(u => u.name + ' ' + b.upg[u.id]).join(', ') + '.' : 'His craft: nothing yet.',
      single.length ? 'He carries: ' + single.map(u => u.name).join('; ') + '.' : 'He carries nothing special.'];
    if (G) {
      const ul = ctx.unl.filter(u => G.unl && G.unl[u.id]);
      R.push('On the island it is tide ' + num(G.tide) + '. The banyan stands at level ' + num(G.blevel) + ' with ' + num(G.sapGrow) + ' sap for growing and ' + num(G.sapProd) + ' for work; Wandel ' + num(G.wandel) + ', ' + num(G.wFree) + ' of it free; ' + num(G.spring) + ' of ' + num(G.springMax) + ' golden spring tides; ' + num(G.gezeit) + ' island tide left.');
      R.push('In store: ' + num((G.res || {}).fruit) + ' breadfruit, ' + num((G.res || {}).coco) + ' coconuts.');
      R.push("The Board's nerve: trust " + num((G.board || {}).tr) + ', staff ' + num((G.board || {}).st) + ', belief ' + num((G.board || {}).be) + '; intel ' + num((G.board || {}).intel) + '.');
      R.push(ul.length ? 'The banyan has learned: ' + ul.map(u => u.name).join('; ') + '.' : 'The banyan has learned nothing yet.');
      const lab = labels(ctx.tBase), rep = []; T.forEach((t, i) => { if (!kachelLeer(t)) rep.push(kachelSatz(lab[i], t)); });
      R.push('What I saw of the island:'); rep.forEach(x => R.push(x));
    }
    const shells = []; for (let i = 0; i < u8.length; i += 2) shells.push(i + 1 < u8.length ? ADJ[u8[i]] + ' ' + NOUN[u8[i + 1]] : ADJ[u8[i]] + ' driftwood');
    const S8 = []; for (let i = 0; i < shells.length; i += 8) S8.push((i ? 'Then: ' : '') + shells.slice(i, i + 8).join(', ') + '.');
    R.push('In her shell box, in this ' + (z ? 'exact ' : '') + 'order: ' + S8.join(' '));
    R.push('She left me a gift: a ' + NOUN[crc8(u8)] + '.');
    return P.join('\n\n') + '\n\n' + R.join('\n');
  }
  // ---------------- decode ----------------
  const ist = text => String(text || '').indexOf(HEAD) >= 0;
  const leerWie = v => typeof v === 'boolean' ? false : typeof v === 'number' ? 0 : typeof v === 'string' ? '' : Array.isArray(v) ? [] : v && typeof v === 'object' ? {} : null;
  function fehler(m) { const e = new Error(m); e.logbuch = true; throw e; }
  function zahl(re, txt, what) { const m = re.exec(txt); if (!m) fehler('The logbook is missing ' + what + '.'); return m.slice(1).map(x => +x); }
  async function dec(text, ctx) {
    text = String(text).replace(/\r/g, '').replace(/[ \t]+/g, ' ');
    const iR = text.search(/Tide \d+ — the reckoning\./); if (iR < 0) fehler('The logbook has no reckoning.');
    const R = text.slice(iR), N = '(-?\\d+(?:\\.\\d+)?)';
    const shellAt = R.indexOf('In her shell box'), giftM = /She left me a gift: an? ([a-z]+)\./.exec(R);
    if (shellAt < 0 || !giftM) fehler('The cat\'s shell box is missing.');
    const z = /In her shell box, in this exact order:/.test(R), body = R.slice(R.indexOf(':', shellAt) + 1, R.indexOf('She left me a gift'));
    const items = body.replace(/Then:/g, ',').split(/[,.]/).map(x => x.trim().toLowerCase()).filter(Boolean), bytes = [];
    for (const it of items) { const [a, n] = it.split(/\s+/); if (!AI.has(a)) fehler('The shell box was disturbed ("' + it + '").'); bytes.push(AI.get(a)); if (n !== 'driftwood') { if (!NI.has(n)) fehler('The shell box was disturbed ("' + it + '").'); bytes.push(NI.get(n)); } }
    const u8 = new Uint8Array(bytes); if (NOUN[crc8(u8)] !== giftM[1]) fehler('Her gift does not match the shells — the box was disturbed.');
    let rest; try { rest = JSON.parse(await unzip(u8, z)); } catch (e) { fehler('The shell box cannot be read.'); }
    // the beach
    const b = JSON.parse(J(ctx.bGrund)); Object.keys(ctx.bVorlage || {}).forEach(k => { if (!(k in b)) b[k] = leerWie(ctx.bVorlage[k]); });
    Object.keys(rest.b || {}).forEach(k => { b[k] = SETS_B.includes(k) ? unpackSet(rest.b[k]) : rest.b[k]; }); delete b.fc;
    const [day] = zahl(/Tide (\d+) — the reckoning\./, R, 'the tide');
    const [green, tails, rum] = zahl(new RegExp('In his pockets: ' + N + ' green hearts, ' + N + ' fish tails, ' + N + ' bottles of rum\\.'), R, 'his pockets');
    const [flood, stamina, maxSt, palm] = zahl(new RegExp('He rides stage ' + N + ' with ' + N + ' of ' + N + ' stamina, and the palm keeps ' + N + ' coconuts for him\\.'), R, 'his ride');
    Object.assign(b, { day, flood, green, tails, rum, stamina, maxStamina: maxSt, palmMax: palm });
    b.upg = {}; ctx.upg.forEach(u => b.upg[u.id] = 0);
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const craft = /His craft: ([^\n]*)/.exec(R); if (craft) ctx.upg.filter(u => u.max > 1).forEach(u => { const m = new RegExp('(?:^|, )' + esc(u.name) + ' (\\d+)').exec(craft[1]); if (m) b.upg[u.id] = Math.min(u.max, +m[1]); });
    const carry = /He carries: ([^\n]*)/.exec(R); if (carry) { const have = carry[1].replace(/\.\s*$/, '').split(';').map(x => x.trim()); ctx.upg.filter(u => u.max <= 1).forEach(u => { if (have.includes(u.name)) b.upg[u.id] = 1; }); }
    b.storySeen = {}; b.flotSeen = {}; for (let d = 1; d <= day; d++) { b.storySeen[d] = 1; b.flotSeen[d] = 1; } if ((rest.b || {}).fc) b.flotSeen.case = 1;
    b.buyLog = []; ctx.upg.forEach(u => { for (let i = 0; i < b.upg[u.id]; i++) b.buyLog.push(u.id); });
    b.tort = Object.assign({}, ctx.bGrund.tort || {}, (rest.b || {}).tort || {}); b.traumSeen = {};
    const st = { v: 1, module: 'game', kind: rest.k || 'ebb', tide: day, first: !!rest.f, b, logbuch: true };
    if (rest.g) {
      const ic = await ctx.inselCtx(rest.g.t0 || 11); Object.assign(ctx, ic);   // the island must exist before its part can be read (its base map and defaults)
      const G = JSON.parse(J(ctx.gGrund)); Object.keys(ctx.gVorlage || {}).forEach(k => { if (!(k in G)) G[k] = leerWie(ctx.gVorlage[k]); });
      Object.keys(rest.g).forEach(k => { G[k] = SETS_G.includes(k) ? unpackSet(rest.g[k]) : rest.g[k]; });
      const [tide, blevel, sapG, sapP, wandel, wFree, spring, springMax, gezeit] = zahl(new RegExp('On the island it is tide ' + N + '\\. The banyan stands at level ' + N + ' with ' + N + ' sap for growing and ' + N + ' for work; Wandel ' + N + ', ' + N + ' of it free; ' + N + ' of ' + N + ' golden spring tides; ' + N + ' island tide left\\.'), R, 'the island');
      Object.assign(G, { tide, blevel, sapGrow: sapG, sapProd: sapP, wandel, wFree, spring, springMax, gezeit });
      const [fruit, coco] = zahl(new RegExp('In store: ' + N + ' breadfruit, ' + N + ' coconuts\\.'), R, 'the store');
      G.res = Object.assign({}, ctx.gGrund.res, rest.g.res || {}, { fruit, coco }); delete G.res.undefined;
      const [tr, sta, be, intel] = zahl(new RegExp("The Board's nerve: trust " + N + ', staff ' + N + ', belief ' + N + '; intel ' + N + '\\.'), R, "the Board's nerve");
      G.board = Object.assign({}, ctx.gGrund.board, rest.g.board || {}, { tr, st: sta, be, intel });
      G.unl = {}; const lr = /The banyan has learned: ([^\n]*)/.exec(R); if (lr) { const have = lr[1].replace(/\.\s*$/, '').split(';').map(x => x.trim()); ctx.unl.forEach(u => { if (have.includes(u.name)) G.unl[u.id] = true; }); }
      G.frisch = null;
      const lab = labels(ctx.tBase), byLab = new Map(lab.map((l, i) => [l, i]));
      const T = ctx.tBase.map(bs => ({ state: 0, b: 0, source: bs.source === 'wreck' ? 'wreck' : undefined, owner: undefined, name: bs.name, rooted: false, rs: 0, prot: false, exh: 0, ableger: false, sac: undefined, vent: undefined, rotBorn: undefined, type: bs.type, content: bs.content === undefined ? null : JSON.parse(J(bs.content)), full3: undefined, turm: undefined, trebo: undefined, welkSeit: undefined, welk: false }));
      const rep = R.slice(R.indexOf('What I saw of the island:'), shellAt), re = /^(.+?) — (unseen|glimpsed|walked), (clean|tinged|rotting|black)((?:, [a-z0-9 ]+)*)\.$/gm; let m;
      while ((m = re.exec(rep))) { const i = byLab.get(m[1].trim()); if (i === undefined) fehler('Unknown place in the report: ' + m[1]); const t = T[i], ex = m[4] ? m[4].split(', ').map(x => x.trim()).filter(Boolean) : [];
        t.state = VISIT.indexOf(m[2]); t.b = ROT.indexOf(m[3]);
        ex.forEach(x => { const r = /^root (\d)$/.exec(x); if (r) { t.rooted = true; t.rs = +r[1]; } else if (x === 'guarded') t.prot = true; else if (x === 'withered') t.welk = true; else if (x === 'a nest') t.source = 'nest'; else if (x === 'an offshoot') t.ableger = true; }); }
      Object.keys(rest.t || {}).forEach(i => Object.assign(T[+i], rest.t[i]));
      st.m = { G, T, seen: unpackSet(rest.s || {}) }; st.tide = tide;
    }
    return st;
  }
  return { enc, dec, ist, ADJ, NOUN };
})();
