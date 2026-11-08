# Robinson — Rulebook & Design State (as of v032, 2026-10-17)

Living design memory for the "Robinson" incremental game. Supersedes the older Claude Doc rulebook (which still contains the rejected beach↔rot coupling). German design talk, game text in English.

## 0. Working agreement (Jan)
- No coding without an explicit "coden"/"Coden!". Ask all clarifying questions first, end with a numbered list of open questions. Numbered lists preferred.
- Every delivery: `node --check` on the extracted script + Playwright runtime test; per-item risk assessment when several changes ship.
- Versioned files: since v030 **one file** `robinson_vNNN.html` (beach + island). Last separate files: beach v023, island v025.
- **Workflow (v031):** a flat source folder with 17 files, no subfolders: 8 code files (`robinson.html`, `spiel.js`, `sound.js`, `titel.js`, `strand.js`, `kampf.js`, `inselgenerator.js`, `insel.js`), plus `build.mjs`, 4 × `doku_*.md`, `test_schnittstelle.py` and 3 × `test_save_*.csv` (see interface doc §9). `node build.mjs` bundles everything into one `robinson_vNNN.html`. `python3 -u test_schnittstelle.py` runs after every build. Changes are targeted file edits.

**Platform principle (Jan, 2026-10-15): PC-first, mobile retrofittable.** The map's overview is the point and works on PC; on phones the UI is too much. Keep: no hover-only info, landscape scaling, HUD/panel/chats as a separate layout layer. A phone layout (icon HUD, bottom-sheet panel, one chat button) is a later 1–2-day job.

## 1. Premise & tone
- Accountant of an evil billionaire washes up with a kitten; weapon: the green NOTAX rubber stamp. Arc: Buchhaltung → Synthese → Selbstaufgabe (becoming one with the island).
- Sarcastic tortoise (loves rum, pees on the palm for an extra coconut, gives tips, tells backstory in small doses). Crusoe never speaks — his **briefcase** speaks (typewriter voice, ledger humour).
- Enemies: pool 1 = invasive species from the yacht gone green with rot (cane-toad tadpoles, zebra mussels, ship rats); pool 2 = paperwork monsters from wave 10 (invoice wasps); bosses = rot itself (The First Mate). Native fauna = friends. No humans yet.

## 2. Overall cycle (one "tide")
1. Ebb: spend tide on beach (collect) and on the island map.
2. Flood part 1: beach combat (active, side view).
3. Flood part 2: island flood (passive animation): Bad Omen strikes, nests feed, banyan drinks sap.
- **Tide budgets**: beach has its own base (8, azure), map its own base (8, deep blue). Leftover base does NOT carry over.
- **Spring Tide** ✨ (gold): shared, spent last, usable on both screens; cannot be harvested; only from main-story milestones, each source +1 permanently per tide. Current sources: island map unlocked (boss), banyan befriended, gecko befriended (lost if gecko flees).
- **Green blood 💚**: earned on the beach (monster drops), one shared stock; beach upgrades and map actions both draw from it.
- Map comes after the first boss (wave 10).

## 3. Beach module (robinson_v017)
- Ebb: tide 8 (6 first). Palm coconuts / pool sips = +1 stamina, 1 tide. Crabs = +1 max stamina: 3 first ebb, 2 until tide 4, 1 until tide 9, later 40 % chance of one **buried** crab the cat digs at.
- Cat cuddle: long-press the kitten 3 s → +1 stamina once per tide (HUD 🐈♥/🐈✓, banner in pet screen). From tide 7 she circles Crusoe's legs as a prompt; tortoise tip.
- Hidden skips (pet-screen codes, last four touches, belly resets; renamed in v046): T5 ears-back-ears-chin; T9 tail-tail-head-back; T12 chin-ears-tail-head; T14 back-chin-back-ears. Later a quest should reveal them. Skip start values: W10 maxSt 20, dmg 5…; MAP maxSt 24, dmg 6, speed 5, VOID+cd1, courage 2, 20 💚.
- Combat: Crusoe auto-stamps nearest; splash every 3rd stamp: main target full, others 50 %. S = boomerang, W = VOID (3×, chain on kill within 2 s). Turn delay 150 ms (stands, turns, then walks).
- Cat: watches until Courage (rat tails); comments every kill type (mi / mrrp / mau / hiss / MIAAAU); fetches dropped rat tails with a dash and a happy Miau.
- Waves: 1–3 tadpoles 8/12/16; 4–6 + mussels (hp 14) 3/5/6; 7–9 + rats 2/3/5; 10 boss The First Mate (hp 80 base, ranged pages 1 dmg, telegraphed slam 3) + 4 wasps; 11–13 with wasps (15/18/21 monsters); +8 % hp per wave. Wasps hp 5, drop 3 💚.
- **Boss pacing (v010)**: `BOSS_PLAN` — boss at wave 10, second at 30, then 45, 60, 75 … (every 15). Later boss waves = boss + half the usual wave (rounded up). Placeholder: all later bosses are the beach First Mate with normal +8 %/wave hp scaling; own boss types and fine-tuning later. **Waves after 13 (v011)**: `postWave(n)` with n = wave − 13: tadpoles max(2, 6 − ⌊n/4⌋), clams 6 + ⌊n/4⌋, rats 4 + ⌊n/2⌋, wasps 5 + ⌊n/3⌋ (wave 30 ≈ 34 monsters), plus +8 % hp per wave. Fine-tuning later.
- **v013 sound**: beach surf stays surf variant 1 (the beach original), a sound effect on 🔊. The island's located sources are heard from here too: booby calls from the cliffs far up north (left, dull, every 3.5–9 s), Fire Mountain's low rumble and an occasional whoomp (every 9–20 s). In the forest the sea gets duller (lowpass 650 → 400 Hz) and the mountain louder. Silent in combat.
- **v012**: upgrade **Cat: Lap Cat** (2 rat tails): stroke the cat on the beach 4× in a row (within 2.5 s gaps) → +1 stamina at the end, once per tide (shared with the cat screen). **VOID [W]** marked as ★ key upgrade (gold glow, gold card text, longer description); the tortoise explains it right after buying. Nest code field pre-filled `NEST-0-12`, wrong code → clear banner. Map unlock after the first boss: tortoise names the 🗺 Map button, which pulses gold until tapped.
- **Tortoise voice (v011)**: beach bubbles speak with the island's "Warm grandpa" voice (one syllable per word, first 4–8 words).
- Boss win → survey folder → 🗺 map unlocked (+1 spring tide). Root turret test stand-in 6 tides later (1 dmg + 2 s root every 3 s).
- Story: tortoise beats tides 2–9 + flotsam memories (see v017 below).
- Ledger = skill tree from the NOTAX stamp (Ink: dmg/speed/splash; Throw: boomerang→quick catch; VOID: void→cooldown | seek→wider seek; Cat: courage→teamwork, linked to VOID). Style morphs from ledger book to living tree with purchases (24 = full tree).
- Test log CSV (Ledger footer): game, round, wave, tide_*, green_*, result, kills, seconds, max_stamina, turret, map.

### Beach v014–v017 (2026-10-14)
- **Title screen** (v014): pixel still life drawn in code (dawn bay, Robinson in a hammock with a coconut cocktail, tie on the rope, striped sock with a tortoise, cat-ear tips and black tentacle tips at the bottom edge). Teaser "Paradise. Population: you. For now." Only START ADVENTURE starts; holding the cat-ear tips opens the cat screen (skip codes). Upright phones see the title; "turn sideways" comes after START.
- **START** (v016): lightning splits the picture, both halves sink into the storm sea of the swim scene (crack + thunder, synthesized). Swim captions "Before the hammock…" / "…there was the storm."; first breaker later.
- **Swim** (v015): A/D hint stays; horizon reef removed; sky reaches below the troughs; breakers clipped at the water line.
- **Dialogue** (v016): line time 2 s + 13 chars/s, 0.5 s gap, tap the bubble to read on. Waking: quiet first, the cat comes over, then "Hm." / "Well. The sea spat one out." / "Yes, I talk. You wear a tie. We all have our flaws."; "Follow the cat…" only if the player idles. Crab and stamp lines shortened.
- **v017**: "Wait for the tide" tip + golden pulse once (stamp found, 8 s idle). Result card: more room above the round preview. Mussel tip after the first mussel fight (story keyed by day was too early); the "nothing green" line fixed; no second VOID line. Petting tip the moment she circles; a successful cuddle makes her roll belly-up with hearts.
- **Rum**: mussels drop rum (30 %), rats only tails. Three rum → the tortoise opens the palm forest (now typically around waves 5–6).
- **Finds on the beach** (what Jasper had on the yacht): day 3 guest card · 4 glowing dead fish (rot, early) · 5 Ferrant's business card · 7 Ben's daughter's drawing · 9 the survey page, shown as a sketch map (first rough map) · 11 the adjusted ledger.
- **Finds in the palm forest** (notes of a predecessor, **Crusoe** — signed in full since v055, one per visit): stake grown into by roots ("Rot doesn't cross a living root") · tin note (rot comes with every flood, goes for the oldest tree) · pulsing black lump ("Burn the heart, not the edges") · bark map of flora and fauna from day 8 (sketch) · First Mate's brass button from wave 9.

## 4. Island map (island_map_play_v017)
### Board
- Seeded volcanic island, oblique projection, 45 Voronoi tiles in regions: I cove, II Booby cliffs (needs gecko), III Fire Mountain (closed this season), IV lagoon/tangle (closed), water.
- Fog of war: only Crab Beach visible at start. Cat scouts one random hidden neighbour per move (walks with a sight radius; ≥60 % coverage = scouted; hard borders = only a seam). Visiting = known.
- Movement cost: base (beach/grove 1, jungle/slope/tangle/lava 2) −1 between two rooted tiles (min 0) +1 per rot level of the target.
### Actions (ebb)
- Move, Harvest (1 tide, +2 food, +1 while Accountant, Wandel −1), Protect (1 tide, +1 def, fruit +1/tide, Wandel +1), Cleanse (2 tide, −1 rot, Wandel +1; nest removed at 0), Befriend gecko in two visits on different tides: visit 1 = 1 tide + 4 🍞 (Wandel +1); visit 2 = 1 tide + 5 🍞 + 2 🥥 (water in a coconut shell) + roots on its tile (Wandel +2). The gecko sits closer after visit 1.
- Plant a root: only where Crusoe stands, adjacent to roots, 4 tide + 2 💚, Wandel +1. First root: listen to the banyan on its tile (2 free Wandel) → banyan friend (+1 spring tide) — v060.
- Inventory removed. Offering removed.
### Rot
- Nests in regions I (east coast), II (cliff edge next to the cove), III, IV — active under fog.
- **Bad Omen** (v009): drawn from all four land types, seen or not; every rot network gets one spearhead (≤2 total at 10+ roots); targets may be under fog (hidden strikes not drawn).
- Overflow: each network with a rot-3 tile spills once per flood. Nest feeding: power = tiles in its share (+⅓ of a merged partner's share), +1 rot per point, max rot 3. Briefcase warns before/at merges.
- **Combat (one round per flood)**: attack = main arm (strongest neighbouring rot) + 1 per side arm; since v009 the banyan feels all arms too; the old brakes (max 2 targets at 10+ roots, −1 attack at 20+ roots) are gone. Defence = root strength (0–3) + 1 per healthy rooted neighbour (max +2) + protected + friend + Crusoe. Hit: +1 rot, root strength −1. Defence ≥ attack+2 pushes a neighbour back.
- Loss (v010): rot 3 on the main banyan tile → "The island falls" (reload). Warnings: rot 1 = tortoise chat line, rot 2 = tortoise priority window + banyan tile pulses red. Offshoot dies at rot 3; gecko still flees at rot 2.
- Feeding delay (v010): a tile that turned rotten this flood is fed by its nest only from the next flood on.
### Banyan & sap (Civ food/production analogue)
- Banyan works `level` healthy rooted tiles (own tile first). Sap: banyan/offshoot tile 3, grove/jungle 2, beach/slope/tangle 1, lava 0, fruit +1, rotten 0. Crusoe's hand: tile where Crusoe ends the ebb +1 sap per Wandel stage index.
- Sap split (default 50/50) into Growth (thresholds 6,10,15,21,28,36…; −20 % from Synthesis) and Production. Production order: Roots (3 sap = +1 strength, auto front or chosen target), Beach tower (30 💚 to start + 12 sap; thorn-root tower on Crab Beach; output barricade=1), Offshoot (15 sap, banyan level −1 → cutting; plant on a free Region II tile next to roots, 1 tide → new banyan level 1, its sap joins).
- **Wandel = science**: total Wandel (0–20) sets the stage (Accountant 0, Castaway 5, Synthesis 10, Islander 15, Surrender 20) and sight (cat radius ×(1+0.25·stage); from Castaway Crusoe glimpses over the edges into neighbours). Free Wandel (all gains) is spent on banyan unlocks (rendered as roots under the tree):
  Listen 2 (opens banyan screen) → Root order 3 → Beach tower 6; Listen → Coarse priority 4 (all grow / balanced / all produce) → Fine priority 8 (25 % steps) and → Offshoot 10; Choose tiles 13 (later). Without unlocks the tree runs automatically 50/50 + front roots.
### Explanation UI (v005, map only)
- Narrators type their lines: briefcase ~40 cps, even, soft synthesized typewriter clicks + bell/carriage return at line end; tortoise ~25 cps, pauses at punctuation, low murmur syllables. Tap a chat window = finish line. WebAudio starts on first tap; "Sound" toggle in the footer. Queue speeds up when lines back up.
- HUD tide = wave icons (8 blue + gold ✨ per spring tide), spent ones grey. The sea on the map gets busier as tide runs out; at 0 tide nests swell/pulse, rot tendrils move faster, End ebb pulses.
- HUD Wandel: "Wandel n/20", bar (green = spent, gold = free), stage notches (next one bright), consequences on the right (stage · sight · hand · growth −20 %), next stage preview below.
- Tile panel: header (type, move cost, cost from here) + sections shown only with content: ⚔ Combat (rot, nest power equation, threat, attack and defence equations, holds/falls verdict, merge warning), 🌿 Roots & sap, 📜 Quest & story (wish checklists), 🛠 Actions with cost chips (🌊 blue, ✨ gold, 💚 green, Wandel gold-green, red = unaffordable).
- Banyan screen: sap flow diagram (sources incl. Crusoe's hand → total → split → growth/production, width ∝ sap), bars with semi-transparent next-flood preview, blinking edge + "→ Level n" / "→ +k roots" on overflow, ETAs; priority buttons update instantly. Line "Next root: tile (a→b), when, chosen by banyan/you" + "Show on map".
- Next root on the map: glowing sprout with a ring filling with production sap (green = banyan's auto pick, front line first; gold = player's Root-order pick).
- Rot: bigger nests with power plate, dotted green outline per rot network, pulsing red tile + "⚠ merge" label where two nest networks are one tile apart.
- Gecko: larger sprite, visible at the palm grove once seen; follows Crusoe after befriending with a "Gecko" name tag.
- Rule cards ("📖 Rules", badge on new): Tide, Spring tide, Rot & arms, Defence, Sap, Wandel — unlocked when the mechanic first appears, tortoise voice, small illustration. Reset with Story ↺.
### Bosses on the map (v006, map only; beach copy still to build)
- Every boss owns nests (First Mate 2, next boss 3, then balancing). Existing 4 nests stay neutral black until the next boss.
- The First Mate and his nests appear on the map at tide 3 (spreads out the early messages); his first return is exceptionally 6 tides after his beach defeat (fights in flood 7, recovery 4 instead of 3); later bosses use the normal 3. Originally: the first boss win (survey folder) reveals his nests in his tint (First Mate: ink-violet nest, tendrils, network outline, flying paper). First Mate nests sit on the cliffs (Region II; the cove has no free tile) → gecko needed to reach them.
- Beaten boss retreats to his strongest nest and recovers for 3 floods (points belong to the boss, not the nest). Then he walks in with the next beach wave as a normal enemy. Lost wave → he stays in the following waves until beaten.
- Demotion ladder per defeat (floor at stage 2, returns unlimited while nests exist): The First Mate 80 HP/slam 3 → on probation ~45/2 (thinner, smaller, PROBATION badge, pages less often) → Acting Junior First Mate ~25/1 (cardboard box instead of folder). Both attacks kept.
- Cleansing the nest he sits in = relocation, −1 recovery. Cleansing his last nest = gone immediately (no final fight).
- The map decides the copy's beach result from the simulated wave result (win flag). Log columns: boss_state, boss_stage, boss_recovery, boss_nests.
- Briefcase intercepts his internal memos (PIP, day 1–3, reinstatement, demotion, relocation, termination letter "cc: Accounts — that's us") → narrative loyalty conflict only, no mechanic. No spring tide reward.
### Priority messages (v006)
- Important events for briefcase/tortoise open a central window (briefcase: intercepted memo on ruled paper with CONFIDENTIAL stamp; tortoise: parchment card), typed with voice, tap = finish, button closes; a 📌 line stays in the chat.
- must = always (boss memos, merger risk/merged, Wandel stage changes); others only if the last priority message is ≥2 tides old, else they go to the chat (banyan sighted, gecko, first nest, first tile lost, overflow). Target: about one every 2–3 tides. Cards (event cards) stay above priority windows; priority waits.
### v007 changes
- Layout: briefcase side (left) = technical: Tile borders, Map log, Story, Sound, scenario, info line. Tortoise side (right) = island: tile panel, Rules, End ebb.
- Quests are explained by tortoise priority windows (must): banyan wish (how to befriend), gecko (two visits), cutting, beach tower; First Mate offices from the tortoise's view (throttled).
- Banyan danger: tortoise priority window when defence − attack at the banyan ≤ 1 or worsens by ≥ 2 versus the start of the flood; re-armed once the margin recovers (≥ 3 and +2 above the trigger).
- Boss memos: only the first reinstatement / demotion / relocation is a priority window; later ones are briefcase chat lines. Termination always priority. While "in the next wave" the First Mate is drawn tiny, half submerged, in the coastal water bottom-right of Crab Beach.
- Attack display: main tendril from the strongest arm, thin side tendrils from every other rot neighbour feeding into it; badge "⚔ 4 = 3+1". Merge: potential bridge = thin dashed red contour only; acute (bridge struck this flood) = red pulse + "⚠ merge" + briefcase warning. Rule card "Rot & arms" split into Attack / Merge. Rule: one hit on a bridge tile is enough to merge.
- Animations: tendril/nest/surf phases accumulate per frame (fixes speed jumps at tide end); tendrils ~half as fast; surge capped ~1.4×.
- Tortoise: audible murmur (formant-filtered, higher), "not enough tide" only 3 escalating lines then toast; game-relevant once-only tips (new omen type, gecko progress, rot-3 overflow risk, cliff nest, listen/unlock affordable, wasted tide 1st/3rd time).
### The Board (v009) — the evil billionaire's system
- Three hidden values, 100 % = today's rules, they can only fall: Treasury, Stability, Belief.
- Slow erosion (paused 5 tides after an accepted bribe): tile cleansed to 0 → Treasury −1; nest closed → Treasury −5, Stability −5; boss beaten on the beach → Stability −3; rot pushed back → Belief −1; Crusoe reaches a new Wandel stage → Belief −3.
- Lasting thresholds: Treasury <75 overflow only every 2nd flood, <50 nests −1 power, <25 bosses +1 tide to recover. Stability <75 spearheads sometimes stray, <50 mergers ⅙ instead of ⅓, <25 embezzlement (one nest skips feeding). Belief <50 rot next to strong roots (rs ≥2) may defect (20 %), <25 pushback at defence ≥ attack+1.
- Story escalation = offensive: a directive is announced (one full ebb to prepare), then 3 tides much stronger, then it ends and lasting damage remains. Implemented: First Mate terminated → Restructuring (+1 spearhead per network, mergers ⅔) → afterwards Stability −20, Belief −10, weakest neutral nest abandoned (rot stays, nothing feeds it). Planned: Boss 2 General mobilisation, Boss 3 Total war, Boss 4 Selling the gold reserves. Victory later: Treasury 0 and Stability <25 → the Board falls apart.
- Briefcase ledger (left toolbar): redacted file, revealed by intel (memos, boss nests, termination, directive, flotsam, first offer): <2 redacted, 2–4 tendencies, 5–7 ranges, ≥8 exact values + active thresholds.
- Corruption: from tide 5, every ~6 tides (not during or right after an offensive) a private offer (10 💚 or +2 tide) — accept = Wandel −2 and the Board's slow decline pauses 5 tides.
- Talk: concept lines only once the concept is visible (omen at first visible threat, First Mate offices once the cliffs are reached); if neither narrator spoke during a whole ebb, a short briefcase–tortoise banter at ebb end. Tortoise voice: sing-song fantasy language (one formant syllable per word, falling at sentence end, first ~9 words); short/repeat lines only murmur.
### v011 — reach, Befall, nest fights, the key and the cave
- **Root reach**: steps over land from the nearest living tree (banyan/offshoot): 1–3 → max root strength 3, 4 → 2, 5 → 1, 6+ → no planting; roots out of reach wither to the cap. The First Mate's cliff nests sit ~5 steps from the banyan → an offshoot is practically required.
- **Befall** (Crusoe's rot exposure, 0–12): +rot level per rot tile entered, +1 per scrub, +2 for ending the ebb on rot; −2 for ending on healthy roots within 3 steps of a tree, −4 on a tree. ≥5 fever: −2 tide next ebb; ≥8 also every step +1 tide. HUD pill, green aura on Crusoe, tortoise priority window at 5.
- **Holding a nest**: scrubbing stops at rot 1. Ending the ebb on a nest at rot 1 = **nest fight instead of the beach fight** (beach report: no fight, 💚 unchanged). Boss at home (not "ready") → boss fight. Map stats don't change the fight; they only decide whether you get there. Win: nest gone for good (First Mate: relocation or termination). Lose: collapse — next ebb lost (0 tide), wake at the banyan, Befall −3, nest stays at 1. Prototype bridge: map shows a code (NEST-0-L / NEST-B1-L / NEST-B2-L, L = beach wave), the beach plays it, the player reports Won/Lost (or Simulate).
- **Beach nest fight (v009)**: Ledger footer → code field + "⚔ Nest fight" (only at low tide). Dark violet arena, full stamina, no turret. No boss: 4 tadpoles, 2 mussels, 3 rats, 1 wasp. Boss: bailiff1 (68 hp, slam 2, pages every 3.2 s, size .88) or bailiff2 (38 hp, slam 1, pages every 4 s, size .75), hp × (1 + 4 % per wave level), plus 2 rats, 2 wasps, 2 mussels. Counts as that flood (day +1, wave not advanced); log result nest_win / nest_lose.
- **The key**: the terminated First Mate drops "Gate C — service tunnel". The rusted gate (Region II tile next to the cave mouth) opens the only passage into the Region III cave mouth.
- **Descending (Act 2 core)**: at the cave mouth, "Descend" costs all remaining tide, once per ebb; Crusoe is absent at flood (no "you" defence, no hand sap; cat stays above). Six memory chambers in fixed order, each one dark memory window with one choice:
  1 The till — keep counting (Wandel −1, harvest always +1) / close the book (+1)
  2 The sandbank — answer the Seehund (Jana thread) / stay silent
  3 Landunter — hold the rope (Opa's knife, beach later) / let go (+2, mountain whispers)
  4 The 40th floor — listen to Mum's message (+1) / leave it
  5 Ben's laugh — send the evidence via the wreck antenna (Board treasury −15, Board knows the location) / keep it hidden (evidence kept)
  6 The man with the good shoes — accept Ferrant's deal (flag, nothing stops) / refuse → **the mountain speaks**
  After chamber 6 the passage to the lagoon is buried ("Act 2 continues here").
- **Mountain powers** (after refusing Ferrant; used while standing at the cave mouth on tiles ≤4 steps away): Lava bomb 3 tide, −2 rot (nests not below 1), burns roots, Wandel −1, once per ebb. Steam vent 2 tide on a healthy non-nest tile: no rot strikes it for 2 floods.
- New rule cards: Befall, Root reach, Holding a nest. CSV adds befall, descent, key, mountain.
### v012 changes (supersede v011 where they differ)
- **Befall (slim)**: rises as before (+rot level per rot tile entered, +1 per scrub, +2 for ending the ebb on rot). Falls: rot tile scrubbed to 0 → −2; nest gone (fight won) → −4; at every ebb end → −⌊defence of Crusoe's tile / 2⌋ (also on rot tiles). Effect only on movement: ≥5 → +1 tide per step, ≥8 → +2; ≥10 → collapse at flood (next ebb lost, wake at the banyan, Befall −3). No more tide loss, no more rest rule. Shown as a black badge above Robinson, colour by stage: green <5, yellow 5–7, orange 8–9, red ≥10.
- **Exposed nests**: nests can be scrubbed to 0 → "exposed" (still a nest, feeds nothing, drawn dim with "EXPOSED · hold it"). Ending the ebb on it = nest fight (instead of the beach). Win: nest gone, Befall −4. Lose: nest back to rot 1 + collapse. Exposed nests nobody holds grow back to rot 1 at the next flood (fresh rot, not fed that flood). Lava bomb can expose nests.
- **Costs**: beach tower 30 💚 + 24 production sap (was 12); offshoot 45 production sap (was 15).
- **Banyan screen**: production bar turns red with "nowhere to go: all roots at cap" when the order is roots and no root can grow (sap is still banked, no cap).
- **Pinned 📌 lines** in both chats reopen the priority message (text instantly, "Close"; offers show text only).
### v013 changes
- **Start round**: the map starts at tide 11 (`T0 = 11`, the beach boss is wave 10). Sim rows are indexed `tide − T0`; First Mate revealed from tide 13, first Board offer at tide 15.
- **Combat randomness**: hold chance by defence − attack: 0 → 50 %, ±1 → 80/20, ±2 → 92/8, ±3+ → 99/1. Badge shows the hold %, panel says "Likely holds/falls (x %)" plus an odds line. A result against the odds → briefcase priority window "Audit note: variance" the first time, a chat line afterwards.
- **Tortoise voice "Warm grandpa"**: sawtooth f0 115 Hz, vibrato 1.5, vocal fry 26 Hz at 15 %, 3 formants, lowpass 1700, falling melody (.6/.8), gain .15. Prototypes: tortoise_voices_v001/v002.html.
- **Hollow way**: dark, soft-edged cut from the gate to the cave mouth with fallen rocks and drifting mist; six pale, flickering ghost statues alongside (till, seal, rope, chair, plate, figure with a pen), dimmed once that memory is visited. Visible once gate or cave is seen.
- **Map log CSV = full replay/snapshot state** (one row per flood, 69 columns). Beyond the basics: crusoe_at, tide_unused, spring, spring_max, fruit, coco, sap_grow, sap_prod, prio, order, root_target, unlocks, tower_paid, cutting, gecko_fed, banyan_friend, offshoot_tiles, roots_map (`id:strength|…`), rot_map (`id:level[n=nest]|…`), prot, vents, explored (one state digit per tile id 0–44), boss_at/boss_ready/boss_stage/boss_recovery/boss_nests, board_* and board_pause/board_off/offers, flags, collapses, memories, descent/key/mountain, befall, plus per-ebb action counts (act_move/harvest/protect/cleanse/plant/lava/vent/descend), strikes_hit/held, surprises, nest_fight. Tile ids are stable (SEED 7).
- **Shortcuts (planned, like the beach skips)**: a round-20/30 start would set exactly these fields: tide, roots_map, rot_map (incl. nests), explored, banyan level/sap_grow/sap_prod/order/prio/unlocks, offshoot_tiles, tower, gecko/banyan friends, wandel + wandel_free, green spent, boss state, board values + offensive state, flags/memories, befall, crusoe_at. Values will be taken from Jan's playthrough logs at those rounds.
### v014 changes
- **Talk rules**: one speaker per topic — tortoise = the island (moving, tide, cat, banyan, roots, sap, rot, nests, Befall, gecko, quests, mountain, cave, memories, Wandel); briefcase = system & enemies (First Mate, Board, offers, intel, ledger, odds, costs). Duplicate second-speaker lines removed. **Repetition rule**: 1st time full (priority window if important), 2nd time one sentence, then a short line (e.g. "👁 Moved → …") or nothing; intel toasts only twice. **Early pacing**: max 1 new explanation per ebb until tide 15, then 2; the rest waits in a queue for the next ebb (continuously re-checked tips aren't queued).
- **Rot 3 eats roots**: a root on a rot-3 tile loses 1 strength per flood, after the sap phase (so pumping sap in by targeting the tile buys time). The banyan's automatic root choice skips rot-3 tiles.
- **Trees burn instead of dying**: a tree at rot 3 → level ≥3: −2 levels, −2 rot; level 2: −1 level, −1 rot; level 1: it dies (main banyan = defeat). Card + sound. Offshoots: level = ⌈main level / 2⌉ minus their own burnt levels.
- **Banyan warning from rot 1** (priority window first time, red pulse from rot 1). Dice stay.
- **Order "Clean rot"** (unlock 8 Wandel, after Root order): 6 production sap per rot point, max 4 per flood, applied **before** the strikes. Range = root reach of any tree. Never nests, never the cave. Pick: trees first, then rot 3 on roots, then rotten roots, then the front. Root order lets you point ("Banyan: clean this tile next").
- **Offshoots**: bigger graphic with glow, level badge; "Open the banyan" on the offshoot opens the shared screen (shared sap, orders, unlocks).
- **Planting the cutting**: Region II, rot ≤1, rooted itself or rooted neighbour, Crusoe on the tile. An existing root is taken over. With a cutting, every Region II tile shows the button greyed with the reason; plantable tiles glow gold; distinct gold-brown button.
- **Bat Cave = Region III** (internally region 6): only the gate leads in; no rot, no roots there; mountain = IV, lagoon = V. After the last memory a tunnel opens from the cave mouth onto Fire Mountain.
- **Bribe ladder**: first offer at tide 20, gaps 8, 11, 14, 17 …; tier 1: 15 💚 / +2 tide for −2 Wandel; tier 2: 30 💚 / +4 tide, −3 Wandel, 25 % leak (First Mate recovers at once; else Befall +3); tier 3: free tower or −1 rot on all non-nest rot in Region I+II, −4 Wandel, 40 % caught (offensive next tide; else Befall +4); tier 4+: partnership +6 tide & 40 💚, −5 Wandel, 60 % the tortoise loses trust (−1 spring tide for good). Accepting still buys 5 quiet tides. Declining: +1 intel, from the 2nd decline +1 free Wandel.
- **Fix**: nest feeding sorts again by lowest rot first (the sort had slipped into a comment in v010).
- **Shortcuts**: long press (3 s) on the kitten on the map opens the cat screen (progress ring). Five-touch codes with one tap into the blue background in the middle: **T20** head-chin-bg-head-tail, **T30** ears-back-bg-ears-chin, **CAVE** tail-tail-bg-head-back. They load Jan's playthrough-1 log rows (tides 19 / 29 / 50 → start at tide 20 / 30 / 51); Befall reset to 0; all explanations up to there count as seen; offer count follows the v014 ladder.
- **Ambience**: the beach's surf as a quiet bed under the island (follows the Sound button). Neither module has real music yet.
### v015 changes
- **Camera**: at every ebb start (and game start / shortcut) it glides (0.8 s) to the default view: all known/scouted tiles + Crusoe + one ring of cloud tiles, framed in the free centre (padding left 20 %, right 10 %, top 11 %, bottom 22 % for HUD and chats). Closest zoom ≈ 3½ tiles across (the island is only ~8 tiles wide), farthest = whole island; can't pan off the map. Drag pans (a tap with < 7 px movement stays a tile tap), mouse wheel / two fingers zoom around the pointer, "⌖ View" returns to the default view. During the flood the camera swings to a struck tile that is out of view. Map layers baked at ≥1.5× so zooming stays sharp.
- **Island ambience** (a sound effect on the Sound button, replaces the v014 bed): one surf function of place L (0 coast … 0.5 foothills … 1 mountain; per tile 0.7 × altitude class + 0.3 × coast distance, sampled at 5 points around the view centre) and height H (0 closest zoom … 1 whole island). Lowpass 650 − 250H − 100L Hz; surf .11·(1−.6L)·(1−.3H); breathing .11−.05H Hz, depth ×(1−.7H); beach breeze .014·(1−L)²·(1−H); high wind .012·L·(.5+.5H). Overall volume U-curve over H: 1 close, ≈0.7 middle, 1 high. Updated 4×/s, glides with ~0.8 s.
- **Located sources** (map position + altitude; listener flies at 120 + 680·H map units; gain 1/(1+(d/R)²), farther = duller, panned left/right): booby colony on the cliffs (altitude 260, harsh calls every 1.6–5 s — up high, so relatively closer when zoomed out), bats at the cave mouth (chirps + wing flutter, more often during the flood or while below), volcano crater (continuous low rumble + an occasional "whoomp" every 6–14 s).
- Breakers and lagoon surf are reserved for later side views.
### v016 changes
- **Camera fix**: the default view frames walked tiles (state 2), scouted tiles right next to them, Crusoe, and reaches only ⅓ into the neighbouring fog tiles. Far scouted tiles (e.g. the First Mate's offices) no longer blow it up to the whole island.
- **Root reach (new)**: tree tile and 1 step → max 3, 2 steps → 2, 3 steps → 1, 4+ → 0. Upgrade **Deep Roots** (12 Wandel) shifts everything one step out.
- **Clean rot (new rule)**: only tree tiles and tiles with root strength 3; upgrade **Clean rot II** (10 Wandel) adds strength 2. Nothing to clean → red warning in the banyan screen. Whenever production goes nowhere (roots all at cap or nothing to clean, with some sap going to production) the banyan's level ring on the map pulses red.
- **Targeting**: each rot network scores matching tiles on its edge with 0.6 × steps to the main banyan + 0.4 × steps to the nearest tree or rooted tile; lowest wins, 30 % of the time one of the best three. Banyan still first, but offshoots and the root front draw attacks too.
- **Nests grow**: from tide 16, after each flood, a rot-3 tile whose land neighbours (≥3, water doesn't count) are all rot 3 and none a nest becomes a new nest (max one per flood, never right next to a tree, never the cave). Tortoise: first time full, then shorter. First Mate nests are ordinary nests for feeding/attacks.
- **Board after the boss**: the directive comes one ebb after the victory (two tides if he fell during a flood).
- **Offshoot**: the cutting only completes while the banyan is at level ≥2 (sap waits otherwise).
- **Forecast badge** drawn ~14 px lower (no overlap with Crusoe's Befall badge).
- **Gate & hollow way**: rusted spiked bars with a padlock (swing open with the key), scratch marks, a stain, two red eyes behind the bars; the cut starts narrow/shallow at the gate and gets wider and darker up the flank, with rock strata, dead hanging roots, sickly drips, bones, mist and a red pulse with eyes deep inside. Statues: cracked weathered stone, leaning, mossy stains, empty eyes, sick flicker, an occasional twitch; the rope is now a noose post.
### v017 changes — Act 3, the cave
- **Gate**: first step onto the gate tile with the key → tortoise priority message (the gecko is shaking; "it collects"). **Cave mouth**: first move into the cave tile → the gecko bites (modal): *Turn back* or *Go anyway* (+1 Befall). The gecko then waits on the gatepost while Jasper is in or below the cave.
- **Descend** (cave tile, once per ebb, uses all tide, absent at flood): opens a full-screen **side view** (the map pauses, surface ambience is muted). ◀ ▶ / A D to walk, hold 💚 light / Space F L, 🐈 pet / C. Six chambers (till, seal/Landunter, rope, chair, plate, pen), each ~2150 px with three finds; finds 1–2 are prose (*Go on*), find 3 ends in a choice (A/B/C) followed by a hint (*Go deeper*).
- **Light** costs 1 💚 per 1.2 s (shared with the beach stock via map spend); 3 hidden hearts per chamber give +2 💚 each when lit. The light flickers below 4 💚.
- **Fear = Befall** (shared, rounded when you climb back up): +0.1/s in the dark, −0.05/s in light, +0.5/s if you stand still in the dark while the Creditor is close. Petting (2 s, 12 s cooldown) −1.5. Small scares every 20–40 s (+0.5). At 10 → **panic**: Jasper flees, Befall = 7, the chamber does not count (descent stays) — the tide is spent anyway.
- **The Creditor** (never seen): approaches every 14–24 s (sooner with light) — rise 5 s → close 3 s → fall 4 s. The cat shows it: ears flat, tail low, then bottle-brush and crouch; breathing moves left/right in stereo. Moving or making light while it is close = "touched": black flash, the cat screams, +3 Befall. Standing still in the dark lets it pass.
- **Choices** write hidden threads (carry/shift, hold/let, paySelf/payOthers) and effects: till A +2 Befall · seal A +2 Befall, C banyan rot +1 · plate C +2 Befall · pen A Wandel max 18 and the mountain's fire (G.mountain), B banyan −2 levels and all rot +1. A choice can never trigger panic (capped at 9.5).
- **After chamber 6**: the Creditor reads the six sentences, then the fate: **same** if carry ≥ 3 and pen = A or B and paySelf ≥ 3; else **dark** if shift ≥ 3; else **gone**. Exit card (crack above the lagoon, Act 4 not built), tortoise line by fate. Flag `lagoon`. The v014 tunnel to Fire Mountain is gone.
- **Cat fate on the map**: gone → no cat drawn, no scouting, cat screen closed; dark → red eye, ~25 % of scouting attempts "the cat wanders off", cat screen closed (hisses). Skip codes only stay for **same**. **Tester access**: hold the tide pill (top left, "Tide N") for 3 s → cat screen regardless.
- **Statues** in the hollow way remember the answers: A = glowing green crack, C = darkened stone, B = weathered grey.
- Region labels: III Bat Cave, IV Lagoon, V Fire Mountain. Wandel max shown in the HUD (20, or 18 after pen A).
- Map log: new columns `cave_choices` (e.g. ABCCAB) and `cat_fate`; shortcut rows restore them.
- Test patterns: AAAAAA → same, CCCCCC → dark, BBBBBB → gone, ABABCB → gone, CBCCAA → dark. Distribution vs. the 60/30/10 target to be checked with real playthroughs.
### v019 changes (map, 2026-10-15)
- **Beach report** is debug info now: no longer pops up at each ebb, sits behind "📋 Beach report" bottom left (badge when new).
- **Default camera** frames at most ~7 tiles across (`CAM_SPAN`), centred on Robinson's side; manual zoom still shows the whole island. (The island is ~6.5 tiles wide, so a lower value like 5 may feel better — tunable constant.)
- **Tortoise and start flag** larger and moved towards the waterline of Crab Beach. First tortoise line fits tide 11: "There you are. Eleven tides on that beach and you never once looked up…"
- **Rule card "Rot & arms" rewritten** with bold sections: *Rot levels* (any rot = no sap; every rot gain costs the root 1; no planting from rot 2; rot 3 eats −1 root per flood and spills), *Arms* (every rot neighbour of any level is an arm, level = strength, attack = strongest + 1 per other arm, worked example 2+1+1 = 4), *Nests* (can't be struck, feed +1 to each owned tile every flood), *Merge* (worked example 6/3 → 7/5), *Bad Omen* (one spearhead per network into the nearest tile of the named land type; rot-3 spill on top).
- **Prio pictures:** small animated canvas in the prio box drawn with the map sprites — banyan, nest, exposed nest, gecko, banyan reminder, cutting, beach tower, overflow. Status and briefcase prios stay without picture.
- **Banyan prio** now fires as a must-prio on first *entering* the banyan tile (button "I'll stay"); scouting only gives a short line. Cause of the old miss: non-must prios within 2 tides were downgraded to chat; nest, overflow and the new ones are musts now.
- **New tortoise prios:** first exposed nest ("The nest is open" — hold it or it grows back); "The banyan is waiting" when the banyan could be opened/listened to for 2 tides and nobody did.
- **Briefcase found** (simulated at tide `CASE_AT` = T0 + 5 until the merger; later a flag from the beach): reward +1 spring tide for good and +2 intel; unlocks **💼 Intercepted Memos** (renamed from "Ledger", hidden before) and the Board's private offers. The important early memos still come before the find.
- **First banyan** drawn 1.6× and more detailed: prop roots, buttressed trunk, hanging roots, three-layer canopy with speckles.
### v020 changes (map + beach, 2026-10-15) — end of Act 2, armies
- **No key from the boss any more.** Act 3 (v017 cave) stays in the code but is reachable only through the secret shortcut (long press on the tide bar → cat screen → CAVE).
- **Root fix:** nests feeding rot onto a rooted tile no longer cost root strength. Roots now lose −1 only when a rot *strike* takes the tile, and −1 per flood at rot 3. Rule card updated.
- **The Board's armies** (replace the offensive's extra spearheads and ⅔ merger):
  - Spawn on the nests when an offensive starts; the first offensive spawns **exactly three** (strength 4, 3, 3). Later offensives: 2 + n armies, strength +n−1.
  - March every flood towards the banyan along the cheapest path (rot tiles cost 1, others 2; budget 2 → 2 steps on rot, 1 elsewhere). Roots don't stop them. Next flood's route is drawn as a red dashed arrow; a field with an army is temporarily visible through the fog.
  - Targets: beach tower, offshoots, the banyan, Robinson. They stop on the first target.
  - Against buildings: strength vs the tile's defence, same odds table as rot. Fall → building loses a level (tower falls; offshoot −1 level, dies at 1; banyan −1 level, **never below 1**). Hold → army −1 strength.
  - Robinson on the tile: the army fights him first (replaces the beach fight; one such fight per flood). Win → army gone (+1 Wandel). Lose → collapse, then the army still hits the building.
  - **Active attack:** on or next to an army, "Attack the army", 2 tide per fight, as often as tide lasts. Lose → +3 Befall.
  - Help: gecko (+8 %) and, on a tree tile, a small thorn tower (+10 %; drawn next to every tree while armies are about). Simulate odds 78 % − 8 % per strength above 3.
  - Beach code `ARMY-<strength>-<T|0>-<level>`: mix grows with strength; `T` adds a 72 %-size turret with the beach turret's power.
  - Offensive ends after 3 tides or as soon as all armies are gone.
- **End of Act 2 (finale):** when the first offensive ends → "The island holds" (or "Battered, but standing" if the banyan lost levels): rot next to healthy roots is pushed back one step everywhere, bloom rings and fireflies, celebration card → memo "Restructuring: failed" → **Ferrant's call** (first time he appears: chin, collar, hand turning the pen) → briefcase explains who he is. Next ebb: **the cat is gone** for good (paw prints to the open gate) → end screen "End of the demo campaign · To be continued: Act 3 — The Cave" with *Keep playing (free play)* and *Credits*. End ebb is blocked while the finale plays.
- **Free play:** story stops; a new offensive every 9 tides with more and stronger armies; offers continue. Without the cat the **gecko scouts** (if befriended).
- Beach v020: map codes `NEST-…` and `ARMY-…` in one field ("⚔ Nest / army fight"); small turret in tree fights.
- **Interface contract** for the merger: see `robinson_interface.md` (shared state, tide loop, duplicate systems, 25 name collisions, merger order, easy-to-overlook list).
### v021 changes (map + beach, 2026-10-15) — stronger armies, the Repo Crab, the last army's moment
- First offensive: armies **5, 6 and 8**; later offensives 4+n each, elite 7+n.
- **Holding no longer wears armies down automatically:** an army loses 1 strength only when the defence beats it by 2 or more; a narrow hold just stops it for a flood. The banyan alone can no longer grind them away.
- Spawn: always distinct tiles — nests first, then other rot (far ones first); if nothing is left, the farthest land tile gets rot 3 and an army. The army starting farthest from the banyan is the **elite**, led by the **Repo Crab** (coconut crab the size of a rowing boat, REPO tag, folder in its claw).
- Every tile an army stands on is **revealed for good**.
- **The last army's moment** (first offensive): zoom in, the map darkens, heartbeat; the banyan's light runs along the path to the tile; impact flash + drum + screen shake; the crab rears and topples, invoices fly, monsters flee; banner "The last army breaks" (Robinson) or "The banyan struck" (buildings) in Pacifico, with the Board directive stamped REJECTED; then the finale starts at once (no waiting for the offensive's last tide).
- Beach v021: code `ARMY-<str>-<T|0>-<lv>-E` adds the Repo Crab (42 hp, slow, dodgeable heavy claw slam like the First Mate, health bar, "REPOSSESSION CANCELLED" burst on death).
### v022 changes (map, 2026-10-16)
- **Offensive rule:** its three tides only strengthen the automatic rot (+1 spearhead per network). **Armies fight to the death** — they never scatter; the finale starts when the last army falls (always with the big moment). Morale via Belief: later idea.
- **Repo Crab** spawns on the farthest north-east land tile (rot 3 if clean) and moves **1 field per flood**, rot or not. The two other armies: nests first, then rot.
- **Battle report** (memo prio with picture) every flood while the crab lives: move, fight with Robinson, ⚔ vs 🛡 with defence parts and odds, result, and a tortoise tip.
- **Combat plate:** during an army's attack on a building the map dims around the tile and shows "⚔ 8 vs 🛡 6" plus the result ("held", "−1 ring" …) instead of floats.
- **Graphics clean-up:** tree levels on a wooden disc with rings at the trunk's foot; army strength on a war flag (gold for the crab); nest power glows inside the ooze; next-root sprout without a dark plate; armies stand at the edge they came from; sap flows as light from the worked tiles into the trunk. (Zoom-dependent hiding of numbers: test later.)
- **Rule cards** split into three short ones: *Rot & arms* (tentacle picture: thick glowing main arm vs thin side arms, ⚔ 2 + 1 + 1 = 4), *Nests & merge*, *Bad Omen*.
- **Tortoise rot lines** are now tips (what to do), mechanics stay on the rule cards.
- **The cut to the cave** is drawn as a trench: calm near rim, lit far wall with strata getting deeper towards the mountain, ending in a rock face with an arched cave mouth (eyes inside) — no straight cap any more.
- **Ferrant's call** in front of an abstract night metropolis seen from the very top (roofs, neon edges, black river, FERRANT hologram, drones below his eye line, rain on the glass).
- **The cat leaves on screen:** the morning after the finale she walks from Robinson to the gate (camera follows), looks back once, slips through the gap; then the card and the end screen.
- **Cat-cheat shortcuts** now reset all state added since v019 (finale, offensive count, free play, armies, briefcase found, banyan reminder).
### v023 map / v022 beach (2026-10-16) — shared save format
- RSAVE v1: one CSV format for both modules (readable log + full save per row), 💾 Save / 📂 Load in both. Details: `robinson_interface.md` §8.
- Next: Jan plays the map once without shortcuts and sends the log; new shortcut points (tide 15, last cabin, offensive announced, only the crab left, free play, cave) are then cut from it.
### v033 — save = log, last stand, armies, cat corner (2026-10-17)
- **Save = log.** One file per game, one readable row per flood (tide, wave, result, 💚, ✨, stamina, kills, banyan, roots, rot, nests, Wandel, boss, Board, offensive, armies, island fight, strikes, briefcase, cat), `state` last. Only the last 50 rows keep their state. The old beach test log and the island log are gone. New game = new file. Details: `robinson_interface.md` §8.
- **💾 Save / 📂 Load** sit in the cat's big window, in both worlds. With the cat gone there is no manual save, except through the secret access. Autosave after every flood continues.
- **Buy buttons show have/need:** "(you have X)" on the ledger, the banyan and the 💚/Wandel chips.
- **Coconuts stop at 10** on the island.
- **Splash on every stamp:** the target takes the full stamp, everything within the splash range takes 20 % of it. VOID splashes too, at 20 % of the *stamp* (not of VOID); the VOID chain counts only the target. The old every-third-stamp splash is gone. Tortoise tip: "every stamp splashes".
- **Armies = the current beach wave.** Same kinds and size as the wave the beach is on; strength 5 = 100 %, each step above +15 % (below: down to 80 %). Elite adds the Repo Crab.
- **His last stand** (the fight in his last cabin, `LAST_STAND` in Inhalte): dark sky, banner "HIS LAST STAND", tortoise line; hp ×1.6; every 8 s (first after 5 s) **Severance Package**: a red ground shadow under Robinson for 2 s, then 3 damage unless he moved out or is in VOID; at 50 % hp **rage** ("I have TENURE!", red tint, ×1.3 speed, attacks every 0.7×, the special every 6 s); at 2/3 and 1/3 hp three invoice wasps. Victory: slow motion, his cap flies, a red **TERMINATED** stamp instead of "BOSS DEFEATED", then the termination letter.
- **Rum bar** in the back forest: a bar grown from roots and branches, one bottle per rum in store, more shelves as the stock grows.
- **Finale:** at the end of the offensive the rot falls by 2 on every tile (nests keep at least 1).
- **Cat gone = gone at once, everywhere:** the beach checks every frame (no cat in fights, no shadow). While she is gone, a **cat corner** in the back forest: three photos on a stump (as a kitten, with Robinson, at a big fight) and her food and water bowls.
- **End-of-demo screen** right after Ferrant's call, before the cat leaves: the title picture with all new friends (banyan, briefcase, gecko, cat on the hammock, tortoise with rum), "KEEP PLAYING" and "CREDITS". Only who keeps playing sees her leave next morning.
### v032 — build without outside packages (2026-10-17)
- No gameplay change. `build.mjs` needs only Node; esbuild, acorn and the font package are gone. The fonts (Fredoka, Patrick Hand, Pixelify Sans, VT323, Pacifico) sit as an embedded block at the end of `robinson.html`. The built game file keeps comments and formatting. Checked against v031 with a seeded random: identical.
- Decided: we keep these fonts. An all-pixel-font look was tried as a mockup and rejected.
- Later: a horde/bullet-heaven direction for combat. It needs pre-rendered monster sprites, a collision grid and object pools; run a stress test first.

### v031 — flat source layout (2026-10-16)
- No gameplay change. The code now sits in 7 modules plus `robinson.html` in one flat folder: Spiel and Inhalte are one file, Insellogik and Inselansicht are one file. All sound lives in `sound.js`. The fonts come in during the build. Checked against v030 with a seeded random: identical.

### v030 — the merger (one game, 2026-10-16)
- **One file, two scenes.** 🗺 Island / 🏖 Beach switch at any time during the ebb (not during fights or floods). The island starts the first time the player opens it after the first boss; its first tide = the beach tide then (intro says e.g. "Twenty tides on that beach").
- **One tide counter.** Beach "Tide" = island "Tide". The beach wave (difficulty) still rises only on a win.
- **One End ebb** (both scenes): island flood first (nest/army fight, armies, strikes, nests, sap, boss tick), then the beach wave fight — unless an island fight replaced it — then the next ebb on both sides, then autosave.
- **Tide pools separate, ✨ shared:** the beach spends spring tide only when its own tide is gone; with the island running the beach waits for End ebb instead of flooding by itself.
- **💚 one stock** (island spending comes straight off the beach stock).
- **Real beach data** replace the SIM rows (SIM stays as test switch in the island's scenario menu: simulated beach, no beach fights).
- **Hand-overs:** the island's First Mate walks in with the beach wave when ready (stage → bailiff / bailiff1 / bailiff2, island hp 80/45/25; the beach's own boss waves after wave 10 are off once the island runs) · nest and army fights are played on the beach through "⚔ To the beach" and come back automatically · beach thorn turret exists exactly while the island tower stands · the briefcase washes up on the beach at T0+5 (picking it up opens the memos) · after the cat leaves (Act 2) the beach has no cat (no petting, no fighting cat, no cat upgrades).
- **Save:** one save row for the whole game, autosave after every flood, title shows CONTINUE · TIDE n; START begins a new game. "The island falls" restarts without the autosave.
- **Under the hood:** one render loop (only the visible scene draws), one AudioContext (beach and island sound fade on switch), fonts bundled (no Google Fonts).
- Not yet unified: dialog layer (bubbles vs prio windows), the two sound systems' code, the two logs, the two pet screens. Gecko on the beach later.

### Phase 1 — module split (beach v023 / map v025, 2026-10-16)
- No gameplay change. Both programs are split into modules and bundled back (see interface doc §9).
- Proof of equal behaviour: same seed + same actions → identical map state over 6 floods and identical beach checkpoint states (old v024/v022 vs new); all regression tests (camera/burn, beach tower/void, save/load both sides, armies/crab, fights from codes) pass without page errors.
- One latent bug surfaced and fixed: the map had two functions named `roundRect`; the second silently replaced the first, so the locked-area labels on the base map would have crashed if drawn. The first is now `roundRectBase`.
- Built files are no longer hand-readable sources (comments stripped, code re-formatted); the source is `src/` (zip delivered with each phase).

### v024 changes (map, 2026-10-16)
- **Trees keep root 1** while they stand (strikes and rot 3 can't take it lower); old saves with a root-less tree are repaired on load. (A root-less banyan worked no tiles → production 0 → unwinnable.)
- **Nests feeding a tree are shown** (option b): panel line "🫧 Fed by <nest>: +1 rot every flood", dotted line nest → tree with "fed +1 / flood" during the ebb, "+1 rot · fed by a nest" float at flood, and a line in the banyan window.
- **Banyan danger** only when it is really targeted and hold odds < 80 %; its rot neighbours are revealed; chat line if a hit gives rot 1–2, prio window only if it would reach rot 3.
- **Clean ETA** counts only sap stored before the flood (the banyan scrubs before this flood's sap); bold reason in the banyan window when there is nothing to clean or all roots are capped.
- **Tree burn scene** (flames, wood disc counts down, green cleansing ring), then a short card.
- **Prio camera:** every prio with a place moves the camera there and back on the click; "<current title>'s cabins" with a pan to the second cabin.
- **Prio typing** 1.5× faster. **Next-root icon** = root knot "+1" ("root +1").
- Panel: 50 % odds read "⚖ Coin flip" instead of "Likely holds"; banyan rot line says "burns rings" above level 1.
- **Cat shortcut "tide 20"** = Jan's save after clearing Region I (RSAVE state embedded).
### v068 — the tunnel view, faster, more white water, the take-off (2026-11-08)
- **Barrel look: from behind** (now the game's view). The tube **fills the screen** (no sky or sea round it); its three layers are **three arms wound as tightly as the side spiral** (2½ turns from the eye to the edge).
- **Spin much faster**, and faster with the stage: 2.2 + 0.08 per stage above 27, × 1.4 because inside the barrel **the boost is always on** (the boost bar is full).
- **The eye** is smaller (15 % of the short side), sits on the **horizon** (half sky, half sea, the wreck now and then) and **wanders** slowly; deep in the tube the walls bend towards it, and what comes out of the eye comes out where the eye is.
- **Mussels** in the barrel the right way round (the ramp faces him).
- **More white water:** three times the spray flecks, white water along the edges of the three arms, and the lip's curtain up top across the whole tube.
- **Take-off on SPIT:** no more jump-cut — he crouches on the wake, then flies in an arc across the opening into the sky (0.6 s, spray trail), and the flight goes on from exactly there over the unrolling wave (`exitDrum('spit', at)`); the tube is drawn under him while it rolls up or out.
- Workbench: unchanged controls; the side view stays selectable there.

### v067 — the barrel rolls up out of the wave; the barrel workbench (2026-11-08)
- **New look, two views to choose from** (`BRL.view`, in the game for now **side**):
  - **Side (spiral):** the same wave, seen from the side, rolled into a long spiral — its three blue layers (light surface, middle, deep) wind round a **clear eye** through which the real background shows (sky, sea, horizon, the wreck when it drifts by; the background keeps drifting). Robinson rides the inside of the curl at the bottom of the eye; monsters and hearts spiral out of the middle of the eye.
  - **From behind (tunnel):** looking down the tube — the three layers as three spiral arms round a small clear eye far ahead; Robinson rides the wall near the bottom.
  - Both: about a quarter of the screen stays background; spray mostly up top where the lip falls (thick whitewater along the top of the eye, drips across it), some of it dragged round with the spin; the eye's rim is ragged on top. Turning clockwise.
- **Roll-in (1.0 s):** no more cut and white flash — the curl at the crest grows and winds up into the tube while it moves to the middle of the screen; Robinson is carried along into his place. **Way out:** the tube opens top right (the background shows through), and after the exit it **unrolls back** into the wave towards the crest (0.6 s).
- **Barrel workbench** `builds/barrel_lab.html` (always the newest build; linked on the builds page): runs only the chain from PULL IN (held A assumed) to the way out, again and again. Panel (bottom left, ▾ folds it): **view** side / behind · **way out** SPIT / let go early / hold too long / A before the sky / play yourself · **start at** roll-in / inside / opening / way out · **speed** ¼ ½ 1× · pause · monsters on/off · loop · again. In "play yourself": A = left half or A key, D = right half or D key.
- New test: `test_barrel_lab.py`; `test_kampf_v065.py` follows the longer roll-in.

### v066 — the barrel from stage 27, no slow motion for the cloud (2026-11-06)
- **The barrel** starts at **stage 27** (was 25), lesson cards at **27 and 28** — so the first surf after Jan's cat jump T40 (stage 27) brings the introduction. Rules card "The barrel" from stage 27.
- **Poison cloud lesson** (stage 20/21): the big pulsing **TAP A** stays, the **slow motion is gone** (it broke the flow). The only other slow motions in the surf are the old ones: a short one when the thrown followers land on the first wall stages (8–9) and the TERMINATED finish of the last stand.

### v065 — the poison rain, the shield, the flamethrower, the barrel (2026-11-06)
- **Poison clouds:** when the cloud flashes **A!** it stops and rains on a **fixed stretch of the wave** round the spot where Robinson rides when he does nothing (`G.restU`): 14 behind, 40 ahead. Warning 0.75 s, then **five pulses** over 2.45 s, each 0.4 × the stage factor (in total the old dose: 6 from stage 8). Only the stretch counts — no more dodge by being in any part of the A cycle.
  - **A as it flashes** (from about 1 s before to 0.6 s after): the climb takes him back out of the rain, the leap and dive cover the rest — dry. **Much too early** (≥ ~1.5 s): he is back in the rain for the last pulses. **Too late**: the first pulse gets him. **D hop**: he stays in the rain.
  - Lesson cards at stage **20 and 21**; the first cloud of each of these stages shows a big pulsing **TAP A — climb back, leap out of the rain**. The place where it will land is marked on the water during the warning.
- **Shield:** in the **A leap and the dive** (cycle phase `dash`) Robinson cannot be hurt by anything (as before, except crevasses), and now it shows: a thin **white-turquoise outline** round his body, board and cat. Boomerang and climb stay vulnerable.
- **Flamethrower:** burns with A held through boomerang, climb **and the whole leap**, until he dives into the water; in the air it aims down at the wall below. Damage 12 + 6 per Hotter Flames level per second (was 14 + 7 — it burns longer now). New look: tongues of fire in three layers (red, orange, white-yellow core) drawn as light, a warm glow, an ignition burst with a jolt and a roar, embers on the wind, dark smoke, steam where it hits the water, a crackle while it burns; caught monsters burn and die charred black. Lite mode: fewer tongues, no glow.
- **The barrel (from stage 25, once a stage, in the second half; lesson cards at 25 and 26 — v066: from 27, cards at 27 and 28):**
  - **Herald (~3.3 s):** the curl swells, falls back, swells again, then goes over; spray off the crest and a rumble; the camera moves back to show the curl. The lip is thrown over him as a curtain into the water ahead.
  - **PULL IN — HOLD A** (window 0.8 s): A held ≥ 0.25 s pulls him in. A quick tap is an ordinary A leap; missed → **CLAMPED**: the lip lands on him (2 × stage factor, no leap or shield helps), then on as normal. Nothing new spawns during the barrel.
  - **Inside (10 s):** a full-screen spinning drum, the light of the eye in the middle. Tadpoles, lice, tentacles, wasps, mussels and hearts spiral out of the eye to the wall he rides on and run round towards him. The stamp fires as usual. **A**: boomerang (once round the drum), climb, a short leap across and dive (≈1.1 s; leap and dive untouchable with shield; the flame works too). **D**: a jump; **off a mussel a big jump** (combo). Running into a mussel without D: 1 stamina. Kill hearts fly to him. The wave outside stands still.
  - **Way out:** the drum opens top right (1.4 s). A tapped before the sky shows = an ordinary leap and the exit goes by. Once the sky shows: **HOLD A** — he rides up the wall to **the wake** top left (golden mark); **let go there → SPIT!**: a giant leap into the sky (≈ 240 units high), hearts and a stamina crystal on the way down, a short safety time; let go **too early** → the wave backs off (no damage, no leap); **hold too long** → into the wake (1.5 × stage factor). No A at all → the wave backs off.
- Rules screen: new cards **Poison clouds** (stage 20) and **The barrel** (stage 25); the flamethrower card says "until you dive".
- Builds index: `builds/index.html` lists every build with the heading of its rulebook section, date, lines and size (written by `build.mjs`). Correction: the repository is **public**.
- New test: `test_kampf_v065.py` (surf: clouds, shield, flame, barrel).

### v064 — ears and a softer tower loss (2026-11-04)
- Title screen: the invisible touch area for the cat's ears now scales with the screen (at least 56×44 px, otherwise 26×16 art units) and covers both ear tips. Before, it was a fixed 56 px and sat between the ears on large screens.
- Tower ride (auto flood) lost: the result now carries half stamina straight away (`lossStamina()`), the same as a lost manual flood. Before, it showed 0 for a moment until the button reset it to half.
- Pages: `index.html` in the repo root forwards to the newest build in `builds/`; `.nojekyll` switches off GitHub's Jekyll processing.

### v063 — the rot's war machines, supply drops, the radio talks back (2026-11-04)
- **Sources recovered** from `robinson_v062.html` (byte-identical rebuild) and moved to GitHub: `janmeyer1/notaxisland` (private). Docs live in `docs/` in the repo and as copies in the project.
- **Roots start at strength 1** again. A withered root stays withered for at least **one whole flood** (`t.welkSeit`); only then it regrows on a clean tile next to a rooted one — so a trebuchet can hit the bare tile in between (+1 rot).
- **Trebuchets (rot 3, no root, no source):** at the **front** (a neighbour still below 3) every one of them **loads one flood and fires the next** — no cap per network any more (was 2). **Behind the front** (all neighbours rot 3) the rot builds a **wide tower in 3 floods** (`RULES.turmBau`), then a trebuchet on top: load / fire, **range 2**. The ball always lands (a root loses a step, a bare tile +1 rot). **Nothing is built on the steep flanks** (tile type `slope`: Fire Mountain). Own root first, as before. Map: tower stages ("tower 1/3"), "loading", "range 2", a dashed flight arc from the machine to its target. Tile screen: own status block for towers and trebuchets.
- **Supply drops:** at tide 20, 30, 40 … (after the tutorial) the Board lands supplies: a barge sails in past the wreck, crates hit the sand, rot crawls inland; a card explains it. **Every rot network sends one more Bad Omen spearhead per drop** (`nachschub()`: 1 at 20, 2 at 30, 3 at 40).
- **+1 Wandel** for every strike that is held with Robinson standing on the tile.
- **The radio:** the washed-up radio is a window with a picture now. Board offers come as **"📻 +++ INCOMING RADIO MESSAGE · DECRYPTED +++"** (own dark terminal look). After **accepting**, a smug confirmation (escalating with each deal); after **declining**, a threat — also against the briefcase, still Board property — and after the first refusal the briefcase explains who is on that line (the handler behind the Board). **No wipe any more** (Jan: the briefcase stays a briefcase for now); old saves' pending wipes are withdrawn.
- **Gold can lose:** odds = 72 % + 3 % per upgrade level above 2 × stage − 12 % per stage past your own last ride ± stamina (clamped 10–95 %). Shown on the wheel's tooltip and in the banner; a lost ride brings 30 % of the haul and half stamina. **A tower ride does not switch to the beach**: a short note where you are, and a line in the flood report.
- **Pictures for the important windows:** banyan in danger (all four), merger risk / merged, Board memos (directive, directive completed, restructuring failed, who is on the radio), termination letter (TERMINATED stamp), the gate, the radio; the overflow picture shows a trebuchet now.
- **Tile screen:** a strike's block is split into **☠ Bad Omen · <land>** (with attack/defence and odds) and **💥 Overflow · trebuchet** (no dice: "the ball always lands").
- **Compass:** the spring tides have **12 fixed places** in two rows from the start (gold = ready, outline = spent, a faint dot = not earned yet); only the newest one glows briefly. No growing, no blinking bar.
- **Banyan screen:** the old buttons and the old Wandel bar no longer show behind it (`body.fiUI` stays while the hub is covered).
- **Chat:** briefcase left, tortoise right; this ebb's lines tinted (briefcase dark brown, tortoise light green), older ones neutral.
- Rot Chaser label: "price doubles with each chase this ebb".
- **Cat jump T40** (Jan's v062 run, before his last den) replaces the old T46; island codes T20 · T30 · T40 · T51.
- Logbook: tiles keep `turm`, `trebo`, `welkSeit`.
- New test: `test_insel_v063.py`; v058/v060/v061/v062 tests updated to the new rules.

### v062 — the logbook save, Jan's playtest of tides 1–30 (2026-11-02)
- **Save = the tortoise's logbook** (💾 in the cat window): plain English, one paragraph per tide (story only, written fresh each time), then **"Tide N — the reckoning"**: the numbers written out (hearts, tails, rum, stage, stamina, palm, upgrade levels, banyan, sap, Wandel, spring tides, island tide, store, the Board's trust/staff/belief/intel — editing them is a cheat, and allowed), the one-level upgrades and the banyan's lessons as "He carries: …" / "The banyan has learned: …", a **place report** (one line per tile: unseen/glimpsed/walked · clean/tinged/rotting/black · root N · guarded · withered · a nest · an offshoot), and the rest in **the cat's shell box** (two bytes per shell: adjective + shell, deflated JSON of everything else, only what differs from a fresh game). **Her gift word** checks the shell box only (CRC-8 → one of 256 shells); a disturbed box is refused. No invisible characters. Story flags (beach story/flotsam, the Dream's "seen") are rebuilt from progress; positions and log fields are dropped. The **CSV test log** stays: 📊 Test log button; 📂 reads both.
- **Gold (Tower II)** rides a stage only up to **2 stages past your own last ride** (it never fired before: it needed the current stage already won by hand); bosses always yours; a banner says when a stage is yours.
- **Beach tide 1–2:** the sea is calm at ebb start and grows (waves and sound) as the beach tides are spent. The tides explanation names the compass (bottom right) with a **10 s ring** on it; the first three low tides repeat "N tides this low tide", and tides left on the sand are mentioned (twice at most). The Dream is told at the first ebb with hearts (together with the tides explanation if both come), with a ring on the hub's moon until opened once. Rules: "Riding the wave" from stage 2, the beach tower card only once the tower stands. The yacht on the horizon is a **wreck**. The first surf has drifting signs: "Just watch and enjoy", on a tap "Just relax now — time to act will come". All "up there" texts fixed (island tide: the blue waves round the compass).
- **Briefcase found on the beach** shows in the hub at once (with a ring); the find card says where it sits; the island only adds the spring tide (toast), no second window.
- **Island messages:** a window that waited 2+ tides is not shown late — it becomes a pinned chat line ("tap to read"); windows whose moment has passed are dropped (cutting, tower, nest open, merger risk only this flood, banyan nag, befall, his nests); the cutting window comes at once (no extra card); after the tutorial its taught topics are not told again (nest, gecko, first move, rot visit, first loss, trebuchet). **One chat**, at the tortoise, messenger style: tortoise left (light), briefcase / Fi right (dark).
- **Surf harder:** hits ×1 (stages 1–3), ×1.5 (4–7), ×3 (8+; was ×2); walls 25 % bigger from stage 10; one more, denser tadpole wave per phrase pair (11+); nests +30 % hp. **Eels** bite (2 × stage factor; before they never hurt), 9 hp, in schools of 3–6 (pairs in the riding stretches). **Poison cloud:** bigger, thick visible rain and green splashes, a hit costs 2 × stage factor (6), dodge with A. The **herald** in front of a wall swims ever closer to it (from stage 10, down to 20 % of the lead by ~22).
- **Trebuchet** drawn the right way round (sling end low behind, counterweight toward the target, it throws over the top).
- **Cat screen:** a plain tap on her ears on the title; in the intro hold the kitten on her plank 1.5 s (the sea waits). **Codes: 4 + 4** — beach T5, T12, T13, T14; island T20, T30 (Jan's v061 run), T46, T51 (older run, until 40/50 come); each island code = its beach constellation + the sky. Constellations a little lower, with faint lines in her order.
- New test: `test_insel_v062.py`.

### v061 — the island tutorial, roots that wither, the trebuchet, spring tides for deeds (2026-10-28)
- **Island tutorial (fixed script, 14 steps, `G.tut`):** protect Crab Beach → walk up → protect → to the banyan → listen (befriend) → roots on breadfruit, coconut palms, palm grove (+1 ✨ "roots") → cleanse a practice rot tile → burn and hold the shore nest → feed the gecko (4 🍞 from the roots' harvest) → **the cliff nest wakes: first strikes, explained** → befriend the gecko → burn and hold the cliff nest → done. A green arrow plus a speech bubble at the target tile; the action button to tap gets a white ring; the cat scouts toward the target. Until the spillover step **nothing on the island attacks, feeds or wakes**; the banyan can't be lost in the tutorial. At the end: his two dens spawn (camera flight, they glimmer through the cloud), the boss memo, the rot wakes region by region, and **the way back after a loss starts here** (snapshot). Old saves count as past the tutorial.
- **Title screen: TUTORIALS ON/OFF** (`localStorage robinson_tutorials`): off = straight into the game after the tutorial (dens there, no arrow), and no lesson banners in the surf.
- **Robinson no longer harvests.** Roots harvest: every healthy rooted food tile +1 🍞/🥥 per flood, +1 more if protected. The resource row shows the next harvest as a small "+X"; the banyan screen has a harvest block.
- **Roots:** new roots start at **strength 2** (within reach). A root that drops to 0 **withers** (grey strands on the map) and regrows by itself at strength 1 once its tile is clean and a rooted tile is next door. On a hit the strand visibly snaps ("root 2 → 1").
- **Trebuchet (rot 3, replaces overflow):** it fires at its own root first (−1 per flood); only once the tile has no root it fires at its neighbour (nearest the start) the next flood. The shot always lands: a root there loses a step, only a rootless tile gets +1 rot. Tendrils only for the Bad Omen's spearheads now; the trebuchet aims where it will shoot. **The rot builds on its tiles:** rot 1 surveyors with green eyes and pits, rot 2 sheds and a foundation, rot 3 the loaded trebuchet (3 variants each; a dot when zoomed far out).
- **New nests only from the story:** spontaneous nest growth is off. His dens at the end of the tutorial, two new nests deep on the cliffs after his last den.
- **Spring tides for deeds** (banner + toast + the compass flashes): roots around the banyan, first shore nest, gecko, beach tower, first offshoot, a cliff nest, an offensive survived (plus map, banyan, briefcase as before). The tortoise explains them on the beach after the map.
- **Wandel:** stages at 15 / 30 / 45 / 60 (bar 60); only the first stage is a priority window. Notches on the island bar and the hub bar follow STAGES.
- **The Board's rescue only at the very end** (level 1 with rot 2+, or struck this flood with a fall meaning the end), after the tutorial, again after every reset.
- **Offers (bribes)** only after the tutorial and once the **washed-up radio** (a fixed story tile on the cliffs) is found; never in an ebb with a more important message; the tortoise comes back to it a flood later (with the Dark-Wood Elf tip). Tier 1: no beach fight this flood (low threat) or one flood without strikes/spillover (high threat), or 4 🍞 + 2 free Wandel; tier 2: the same for two floods, 6 🍞 + 3 Wandel, or one of his dens given up (never both); tier 3 as before; tier 4 partnership without tides. No more "more tides".
- **One priority window per ebb** (exceptions: banyan danger, the tutorial, what the player just triggered). Held-back messages are logged (save column `msg_backlog`): more than 2–3 = paced too fast.
- **Threat ring (5 segments: calm · skirmishes · high intensity · offensive · near defeat)** around the banyan button on the hub (and the island's 🌳 button); explained on the banyan screen.
- **Island UI:** the main task on gold, larger, with up to two side quests (save the briefcase, explore the cliffs, grow an offshoot — only once the banyan has reached its range). Banyan screen: the current order as a block (what, how far, what it brings), the harvest, the threat. Rot Chaser appears only after Robinson has fought rot himself (the cat seems to enjoy it); any number of chases per ebb, 5 🐟 doubling each time; the lava bomb likewise (3 tide doubling). Rule cards rewritten (effect first, story after).
- **Beach:** the **beach tower works at the start of the ebb and pays every chore with a beach tide** (never spring); its report in the banner and the flood report; a white ring on the compass wheel when it is new, +1 ✨ and a success line when it stands. **The briefcase washes up on the beach from tide 8** (before the island). New cat jump **T13**: right after the first boss, from Jan's log (map open, briefcase found, glider explained at the next fight).
- **Dream:** one-level upgrades get a circle too (gifted/bought = full); no "Your Dream" lettering; a big gold Wake up button; texts as "effect — story" (effect bold); mini pictures for Deep Roots and the beach tower.
- **Surf:** the A sign 0.3 s sooner after the last mussel; mussels 0.3 s later after a wall; the dive's hearts start where a good dive goes in; every 3rd good dive a big heart or a **stamina crystal** (+1); rewards in the sky over good free waves (from stage 12 with the glider also ones only a glide reaches); free waves with sky rewards between the phrases from stage 11; **HOLD signs 1.7× with "HOLD D"**. **New monsters every 5 stages:** black **eels** from stage 15 (from below, faster than the water, 4 HP, maybe a fish tail) — new cat upgrade **Eel Catcher** (15 🐟, after Her Own Board: a caught eel = 2 🐟); **poison clouds** from stage 20 (drift in above Robinson, flash "A!", rain — the A leap dodges).
- **Save:** the island snapshot only in the newest row (older rows lost ~half their size). New log columns `msg_backlog`, `tutorial`.
- **Build guard** widened: a trailing comment followed by statements now fails the build too (it caught three of my own slips in this round).
- New test: `test_insel_v061.py` (tutorial played through from T13, then the new rules).

### v060 — Listen is the friendship, Jan's playtest of tides 2–13 (2026-10-25)
- **Bug v059 fixed:** a trailing comment had swallowed the rest of the friendship line — the banyan was never a living tree (no "Open the banyan", no sap, no planting, no spring tide, no Wandel). Loading repairs such saves (friend or Listen → both; banyan back among the trees; its spring tide). The build now **fails on code inside a trailing comment** (it also found a v054 one in the surf: the leap over a crevasse is stretched again).
- **Listen = the friendship:** no flood on the banyan any more. On the banyan's tile: "Listen to the banyan · befriend it" for **2 free Wandel** (the price of Listen). One tap: friend + Listen, the banyan cleaned to rot 0, living tree level 1, +1 ✨ spring tide, card "The banyan" → its screen. Also buyable in the Dream while standing on it. No +2 Wandel bonus any more (Listen costs what it costs). Since Listen wakes the rot, the friendship starts the regions waking (one per tide).
- **Tile panel:** the banyan always offers "Open the banyan ▸"; while only it is rooted: "Plant roots on the tiles around it". Where a root can't go, a **greyed Plant button with the reason** (too much rot — cleanse first · needs a rooted tile next door · too far from a banyan · the roots can't cross here).
- **Course:** a **green arrow** from Crusoe to the next tile (a down arrow over the tile when you are on it); tortoise line at the start ("the cat already ran ahead"), another when the roots step begins; when the course times out (10 tides) she says so.
- **A banyan burn hits the nests within two steps** (−1 each) — otherwise a burn fed by a nest bought nothing.
- **Collapse:** the full "You collapse" / "You wake up" cards only the first time, later a banner and a short note.
- **Beach:** one tortoise message per tide — the most important (unlocks, the tide explanation, tutorial, story) waits in a queue for the next tide, chatter (waking up, green, VOID / Lap Cat bought, pet gain) only after 14 s of quiet and at most once per ebb. With the tides spent he can still walk (actions stay locked). The glider is explained at the start of the next beach fight, not at the map's ebb; the map line points to the compass bottom right. Rot Chaser says it only works on the island. **Lap Cat bug:** spending the last fish tail hid the cat's upgrades until fish were seen — fixed.
- **Balance:** start with 2 coconuts (was 3); one crab every tide up to tide 7, then every other up to 11. Her Own Board 13 🐟 (was 5), VOID 8 🥃 (was 5). A lost beach flood with no rum left: the tortoise gives one bottle.
- **Surf:** stage time grows 1.5 s per stage (was 3; stage 11 = 75 s), the filler can shrink further, stage 8 has five walls (was six). A mussel never surfaces within 6.5 s of tempo after a wall (it came during the dive); after a mussel chain the A sign follows quickly.
- **Save:** the state column is readable JSON (always the last column, commas kept); old base64 saves still load.
- New test: `test_insel_v060.py` (real flow: walk, protect, listen, plant, a flood).

### v059 — fixes from the playtest scenarios (2026-10-25)
- **No dead end before the friendship:** the wish (ending an ebb on the banyan) cleans it to rot 0; at rot 1 on a banyan that does not know you yet the tortoise warns ("sit with it at flood: your wish cleans it"); at rot 3 it is lost too → back to the fresh island.
- **The Board's rescue** also at banyan level 2 (a burn at level 2 bought almost nothing), and **once again after every reset** of the island.
- **Waking, not an avalanche:** after Listen (or 10 tides) the regions beyond the shore wake one per tide, the one nearest the banyan first.
- **The way back keeps the story:** briefcase, Fi (the elf counts as learned), memos and intel stay; banyan lessons, Wandel and the island go back.
- **Saves:** loading a save without a snapshot clears the old game's snapshot; a snapshot made at load time is defused (rot 0 within two steps of the banyan, nests there at most 1, befall 0). An old island-only save loaded from the title takes the beach out of the title (was: stuck in the first flood).
- **Small:** planting text says six hearts (as it costs); after every lost wave the result line names an upgrade you can afford ("Open your Dream. Dream harder."); island actions only on Crusoe's tile, nonsense ids ignored.

### v058 — a gentler first island, the course, the Board's rescue, no restart after a loss (2026-10-25)
- **Sleeping rot:** before "Listen" (at most 10 island tides) the rot beyond the shore region sleeps — its nests do not feed, nothing there is struck or spills over. After Listen it runs normally.
- **The course (🧭 in the goal box, the next tile pinged every ebb):** straight to the banyan, protecting the tiles you stand on → protect it and end the ebb there (the wish) → plant roots around it (4 of its neighbours). Then the tortoise hands over. Leaving the course is allowed: once per ebb "Off the course — at your own risk." The course runs for the first 10 island tides.
- **The Board's rescue (once a game):** when the banyan stands at rot 2 (or three of its neighbours at rot 2+) and is still level 1, a memo from the Board: their team clears the rot three tiles deep around the banyan, nests in that area drop to rot 1. The fee: all hearts, rum and fish tails down to 10 💚 / 1 🥃 / 1 🐟. Decline → the hard way.
- **Losing:** a card says what stays, with a tip from the run; then **back to the island's first morning** (snapshot taken when the map opened, or when an older save was loaded). Board, stamp, cat, VOID and every hearts / rum / fish tail stay; banyan lessons and Wandel go; the tide counter goes on; course and sleeping rot start again for 10 tides.
- **Rot Chaser** (new cat upgrade, 6 🐟, after Lap Cat): on the island the cat chases the rot off Crusoe's tile or a neighbour — −1 rot for 5 🐟, once per ebb, not on nests.
- **Surf:** from stage 8 every hit costs 2 stamina (also in island fights). Max stamina slower: 2 crabs on the first ebb, one a day only up to tide 2, then every other day up to tide 11, buried crabs 20 %.
- **Cat codes (the jumps behind the cat screen):** the beach checkpoints T5–T14 are from v055 and still fit (a bit leaner than Jan's real run); the island checkpoints come from the old full log and do not know the new first tides — to be replaced from Jan's next log (straight to the banyan).
- New test: `test_insel_v058.py`.

### v057 — tutorial softlock fixed (2026-10-25)
- First ebb **4** tides (was 3); before the stamp is found, coconuts, crabs and digging cost **no tide** — the tutorial can no longer run dry.
- The first crab of every ebb sits high on the sand (fy .555–.58): it stays above the water even at the highest tide.

### v056 — the Dream replaces the Ledger and the banyan's tree (2026-10-25)
- **The Dream** (`traum.js`, picture in `traumbild.js`): one full-screen upgrade screen for beach and island. The picture is a floating isle (earth cone, hanging roots) over a mirror lake, sickle moon, the tortoise drawn in stars; the cat has her own islet with a rope bridge. The upgrades lie on it as a separate layer. Opened from the beach button **☾ Dream** (was "Ledger"), from the moon button in the hub (bottom left) and from the banyan screen; closing lands where you were. Esc closes.
- **What shows:** only owned and buyable upgrades. Names only on what you can buy now; **red** when the price is not yet there; affordable ones pulse. One dot per level under multi-level upgrades. The camera fits what shows (the four old stages are the anchors): island top → steps back for the cat and VOID → the clouds part when Listen shows → the full mirror and the red glow at the cone's tip with the Dark-Wood Elf (green once she is bound).
- **Detail column** (right, ~20 %; bottom on upright screens): the icon again, group, name and key, level, price and what you have, Buy, a short text; with Fi a line of hers. The tortoise explains the Dream on the first visit.
- **New things:** the Dream button glows when something is new or affordable. On opening, the camera starts on the last visit's framing and flies to the new one; new upgrades fade in one by one; a gift (Jump, Wall Leap, Glider, Flamethrower) comes as a streak of light from the tortoise in the stars and is selected ("A gift from the island"). What was shown is kept in the beach save (`S.traumSeen`).
- **Colours:** board blue, stamp green, cat orange-red, VOID dark pink, Listen and Roots lilac, Sap orange-yellow, Orders darker violet, the Dark-Wood Elf lava red.
- **Hierarchy = the picture:** Long Boost, Heart Magnet, Wall Leap and the Flamethrower hang directly on the board; Jump → Glider → Long Glide; Wall Leap → Heavy Boomerang / Deep Dive; Fishing Dive → Her Own Board → Deeper Dives. Banyan: Listen → Sap (Coarse → Fine), Roots (Root order → Deep Roots), Orders (Beach tower → Tower II, Clean rot → Clean rot II, Offshoot); the Elf hangs on Listen and needs the briefcase. Listen shows once the banyan is a friend.
- **Caps and names:** Heavier Stamp, Faster Stamping and Wider Splash end at level 6. "Wave Cycle" is now **Wall Leap** everywhere; no "Cat:" / "VOID:" / "Order:" prefixes. **Choose tiles** is gone (it was a placeholder).
- **Banyan screen:** sap flow and production forecast first and big, then the next root and the controls (split, orders), at the bottom a hint ("2 lessons you could teach the banyan now — in your Dream") and the Dream button. The old unlock tree is gone from it.
- **Sound in the Dream:** one cricket on the cat's islet, the lake breathing, Fire Mountain rumbling once the secret shows, a soft swell (wind through the palm) when something is new. No bells.
- **Story:** after the first green the tortoise sends him to dream ("Dreaming is work too. Out here it's the only planning that counts."); the wet ledger find ends with "You don't keep books out here, accountant. You dream."; all "Ledger" hints now say "your Dream". Fi walks the Dream and reads the banyan to him.
- **Test fight code:** a small tester box at the bottom of the beach (was inside the Ledger). Rum for the tortoise: tap her, as before.
- New test: `test_traum.py` (both screen shapes, visibility, buying, red names, banyan, cat gone, banyan screen).

### v055 — economy, tides as action points, harder surf, new hub, gifts announced (2026-10-24)
- **Prices:** Faster Stamping and Wider Splash 💚 20 (×1.9 a level) — the lost first try (≈ 27–33 💚) buys exactly one. Heavier Stamp 80, Long Boost and Heart Magnet 280, Heavy Boomerang and Deep Dive 400, Long Glide 300, all ×1.8 a level.
- **Rum = fire and explosions:** VOID 5 🥃, Quick Charge 4 🥃 ×1.6, Second Wind 5 🥃 ×1.6, Hotter Flames 6 🥃 ×1.7. Mussels drop rum in 8 % of kills up to stage 5, 15 % from stage 6. Island: **Burn** (2 tide + 3 🥃, −2 rot, Wandel +1) is the only action that works on a nest tile; Cleanse no longer works there. Rule card and nest texts say so.
- **Max stamina** grows only every other tide (crabs: 1 per ebb up to day 3, then every second day up to day 11, then 25 % buried).
- **Tides as action points:** first ebb **3** tides; +1 each for the stamp, the palm forest, Crusoe's first note, his bark map and the island (max 8), derived from the story flags (old saves fit). The stamp costs no tide. When the tides are spent nothing starts by itself — "Wait for the tide ⏭" pulses. The tortoise explains it once in the second ebb (forced, even asleep); every new tide gets a line. New rules card "Tides — your time".
- **Heart arcs:** when the real jump flies higher or lower than the forecast (boost, combo), the arc's hearts glide onto the real path in ~0.2 s. Bot catch rate on arcs ~90 % (was ~50 %), so income rose — prices above account for it.
- **Harder stages 3–7:** +5 % tempo from stage 3, denser rides in 3–7, tadpole groups 2 (stage 3) / 3 (4–5) / 4 (6+), fliers from stage 5, a tadpole pair just past chain landings from stage 4. Boss attacks every 1.6 s (1.1 s below half health), shockwave hit width 9.
- **Stages 11+:** phrases are added until the stage is as long as its time (~84–93 s, was ~60 s).
- **A cycle:** climbing stays vulnerable, the dash forward (with the dive) invulnerable and all weapon. The leap is sized for a good tap (an early one comes down in the wall). Measured: early taps cost no extra hits — the dive kills what it lands in; early only loses PERFECT, combo and boost. The wall log now has the tap time (ms, + = early).
- **Followers:** a passing wall and hit monsters keep their height and glide into the cloud (knock-back instead of a 22-px teleport; max jump per frame 36 → 12 px).
- **Island gifts:** the glider is given the moment the island opens (with a window on the beach), the flamethrower when the first armies march (window on the beach + tortoise line on the island). Gifts show "🎁 a gift" in the Ledger. Nest and den start with a practice crevasse and a "HOLD D" lesson that stays until you have glided; the amber sign says JUMP / MUSSEL / HOLD. Armies get a "HOLD A" lesson. The glider holds him above a crevasse's edge line.
- **First boss win:** the result box says where the island is ("Tap 🗺 Island — the blue button under the compass"), and the tortoise's map line is forced even if she sleeps ("Hic— what? A map?").
- **Names:** Aurelius Ferrant, Jasper Robinson and Crusoe instead of initials.
- **Hub (bottom left):** no ring any more. A silhouette of its own — an empty sandy outline with "?" before the briefcase, then the briefcase with its roots, then Fi from the navel up, edges fading. Ledger and Banyan above, Rules and Memos beside it, at fixed places from tide 1 (empty sockets until unlocked). The sight is a small eye above the silhouette. Below: three thick bars — stamina, Wandel (green spent, gold free, notches), befall (dark until the island opens). The beach's own stamina bar and buttons give way to it.

### v054 — A window on contact, glider and crevasses, flamethrower, camera on Robinson, heart curve (2026-10-24)
- **A window:** it opens the moment the A sign visibly touches Robinson and lasts at least ~0.35 s (measured 0.45–0.9 s, stages 8–17). The tower is on screen at least ~1.1 s before; the window opens ~0.15 s after it appears; the climb time adapts per wall (0.25–1.2 s). Sign and herald distance scale with the tempo; the herald swims just behind the sign.
- **A leap:** as high as the tower is tall (apex above its top), and long enough to clear it. The whole leap is the combo: **nothing can hurt him, all of him is a weapon** (no bounce). It is also stretched over a crevasse if he would come down in or just before one.
- **Boss fight:** a good A lands right on the boss — **BOSS SLAM**, 10× stamp damage × (1 + dash power), once per leap (First Mate at stage 10: about six slams).
- **Camera:** fixed on Robinson — 30 % from the left, centred in height (faster vertical follow). The camera choice is gone from the tester.
- **Hearts:** missed hearts and diamonds drift out of the screen behind him and can no longer be collected; a soft "blubb" on pickup. Kill hearts as before (wake lice: one heart per five kills). **Giant heart (25)** at the top of a real Backflip arc from stage 5 (60 %, at most 1 per run in stages 5–7, 2 in 8–10, …). Heart rows: none in stage 1, then 3 + ½ stage (max 8) per row; rows around walls 2 + ½ stage. **Heart fields** (an extra row above the arc) over good jumps from stage 8, on both sides from stage 10. Teaser hearts are logged.
- **Measured income (bot, nearly perfect):** 62 · 93 · 130 · 151 · 245 · 295 · 344 · 257 (stage 8, A only) · 390 · … 492 (11) · 558 (13) 💚 — about +25 % a stage.
- **Ledger:** Faster Stamping and Wider Splash now start at **30** (Heavier Stamp 40): the lost first try at stage 1 (≈ 23–40 💚 at 3–8 stamina) buys exactly one of them, and with it stage 1 is won.
- **Tadpole groups** of 2–5 from stage 3 (more from stage 6), spaced wider than the splash, timed so the middle sits on the flank of a ripple crest as he arrives; a heart arc over the free jump.
- **Phrases from stage 10:** chain + wall in four patterns, never the same three times in a row; big jumps steer him back to his riding spot high on the face, so Backflips come in chains.
- **No tower in the first 3 s** of a stage.
- **Glider (hold D in the air):** palm-leaf canopy, up to 2 s (+0.5 s per Long Glide), sinks slowly; the cat glides along. Gift with the first island fight (nest or den). Works on the beach too.
- **Crevasses** in the scree of nest and den (amber sign "D · GAP"): up to stage 11 a free jump clears them, stages 12–13 the jump from the mussel in front, from stage 14 only the glider. Falling in costs **all stamina**; a charged VOID saves him (he climbs out on the far side). Walls and tadpole groups wait until he is across a crevasse.
- **Flamethrower (hold A during boomerang + climb):** a colourful cone aimed at the wall in front, damage (14 + 7 × Hotter Flames) × stamp damage per second, as long as A is held. Gift with the first army fight. Armies: 6 walls × 15 × strength, monsters ×5 hit points. Works on beach walls too.
- **Follow-ups (paid):** Long Glide (💚 90 × 1.7^lv, max 4), Hotter Flames (💚 120 × 1.7^lv, max 5). Core skills the level demands are gifts (D, A, glider, flamethrower); their improvements are bought.
- **Island fights** run at the beach stage + offset: nest +1, den +2, army +2 (+ strength above 5), last stand +3.
- **Main game:** "cabin" is now "**Den**" in all player texts; no pause button or P/Esc pause in the main game (only in the tester; leaving the window still pauses); first-loss hint "Open the Ledger — Faster Stamping or Wider Splash."; the surf run is written into the save log (column `surf`).
- **Cat:** Fishing Dive keeps looking every 0.05 s; the minnow she leaps for is hers (the stamp and splash leave it alone).
- **Cat jumps recalibrated:** T5 💚 30 (Heavier, Faster, Wider 1), T9 💚 60 (Heavier 2, Faster 3, Wider 2, Long Boost, Magnet, VOID), T12 💚 60 (+ Heavier 3, Wider 3, Quick Charge, Fishing Dive), T14 💚 80 (+ Faster 4, Long Boost 2, Heavy Boomerang).
- **Rules screen:** new cards Glider, Crevasses, Flamethrower; ride/jump/tricks/cycle/VOID/boss cards rewritten (board as weapon, kill hearts, drifting hearts, giant heart, magnet, herald, window on contact, invulnerable leap, boss slam, VOID out of a crevasse).

### v053 — board as weapon, tentacle towers with a herald, kill hearts, camera modes (2026-10-24)
- **In the air:** the board's underside is the weapon — it kills and bounces him up (50 % of a free hop, the jump goes on); his body can be hit. Nosegrab: the raised board also covers the front. Backflip: all of him is a weapon. Same rules for the A leap. Flying over something does nothing any more (no free kills; a mussel he flies over just drifts away).
- **Hits:** no hit-stop and no braking stumble any more; monster i-frames 0.05 s, every monster hits once.
- **Auto-stamp without exceptions** (towers, lice, thrown ones can all be stamped; under water stays out). It aims at what comes at him first, then at the ones behind. One exception stays: mussels are ramps, the stamp leaves them (otherwise it shot every ramp away right at contact). More monsters instead: towers 1.6×, lice faster and up to 1.5× as many, riding stretches 10 % denser.
- **Tower monster:** round, black, tentacles all round, green glowing rim (3× hit points). A single one, the **herald**, swims just behind the A sign — one stamp kills it; if the stamp is busy it costs 1 stamina (Faster Stamping helps).
- **A sign:** its centre reaches Robinson's front edge as the window opens; the window is a little longer (take-off up to 95 before the tower).
- **Ramp:** a tap up to 0.1 s past the lip still counts (he glides at lip height meanwhile); then the hop and the damage. Ramp log: tap time vs contact in ms, ride-over time, frame rate.
- **A tower waits until he has been down for 0.7 s** after a jump or chain.
- **Boss fight:** towers keep coming (every ~9 s), the boss pauses while one runs.
- **Small waves:** period twice as long in all stages (≈210–420), height from 2.2 at stage 1 to about 8 at stage 8/9 (max 10), each wave's height scaled with its own length.
- **Free hop** +10 % (stays below the mussel jump).
- **Stamp feedback:** a hit squelches and puffs a small dense green cloud; a kill has its own sound and clouds sized by the monster; **every kill throws a green heart** up and to the right, which lands on the wave and rides it. Green Ledger prices doubled to match (stage 1: the lost first try still buys exactly one stamp upgrade).
- **Rot minnows** sit under chain landing mussels from stage 5; the landing splash takes them (fish tails for the cat earlier).
- **Looks:** the curl is bigger and grows with the stage, foam boils round the crest, spray flies off forward and dissolves; surface swimmers sit a quarter under the waterline; thrown monsters get little glide fins.
- **Camera modes** (tester): middle (default), wave (old), on Robinson — now also in height.
- **Surf test page:** starts at stage 1 again; tidied (campaign, stage, start, god mode, **sound off**, camera, log on top; everything else under "Advanced"; new sliders bounce and postRamp).

### v052 — every collision counts, a cloud behind him, faster stages, a log that survives (2026-10-23)
- **Hits:** the global invulnerability after a hit is 0.1 s (was 0.5); every monster still hits only once, so a horde costs one stamina per monster. A hit is now unmistakable: a hard thud and crack, a 60 ms hit-stop, a red flash at the screen edges, Robinson stumbles, a big red "−1", the lost piece of the stamina bar breaks off.
- **No neutral collisions:** followers sit in a **wide cloud** 30–100 behind him at several heights and never reach him by themselves; touching them (climbing into them at the wrong time) costs stamina — wake lice included (they no longer slip under the board). The dive takes whatever it touches. Thrown followers that land on him cost stamina again (logged as a bug if it happens on a good cycle).
- **The "despawning" swarm** was the boomerang killing the thrown followers in mid-air; the boomerang and the stamp now leave thrown ones alone, and on a good cycle they fall straight into his dive. They are aimed 10–55 ahead of his landing point.
- **A sign:** it swims at him ahead of the wall and reaches him exactly when the window opens; tap A as you pass it. The climb is set per wall so the window opens when the wall's front comes into the screen on the right (measured: front at 86–91 % of the screen width).
- **Sprites** of followers, sucked and thrown monsters face his way (no more swimming backwards).
- **The lip:** an overhanging curl with spray, and a foam front with puffs spilling forward down the face instead of the vertical bar.
- **Heart Magnet** is now an item: with the upgrade bought, a magnet hangs in a jump arc about every 40 s; caught, it pulls hearts in for 20 s, shown as a red ring with a countdown. Without it Robinson collects only with his hitbox (measured; the wide pick-ups came from magnet levels the campaign had bought).
- **Hearts over good small waves:** up to 3 per stage, an arc laid for the free jump at the best kicker of a calm stretch, never just before a mussel or a wall.
- **Tempo:** 115 at stage 1, +10 % of that per stage to 218 at stage 9, then degressive without a cap (218 × (1 + 0.12 ln(n − 8)): 236 at 10, 247 at 11, 254 at 12 …). **Boost ×1.5** everywhere. Fast landings on chain mussels fixed (the landing band grows with the fall speed).
- **Stage 11+:** tighter and mixed — wall, mussel, chain, sometimes a second wall and mussel, short gaps.
- **Tortoise:** in the surf only tips, after the same mistake twice (early/late D, early/late A, falls, swarm), at most one every 30 s and only when the water is quiet.
- **Log:** kept in the browser across reloads; "📋 Copy log" with a fallback and a text box to select, "💾 Download" (.json), "🗑 Clear log". New fields: per wall the climb, the wall's screen position at the window and at your tap, the fate of every thrown follower (landed where, died on the way of what), plus bug events (landOnR, swarmOverR).

### v051 — the wall holds, the run log (2026-10-23)
- **The wall no longer melts under the auto-stamp** (with Wider Splash 1 a stage-8 wall of 10 arrived with 3): its tadpoles have 3× the hit points, the splash runs off the heap, and the stamp goes for the small fry first and the heap last. Measured with the T9 state: every wall arrives complete.
- **The wall is spread out more** (columns 14 apart instead of 9, layers 8 apart).
- **Run log** on the surf test page ("📋 Copy log"): a summary (runs, walls by tap timing, ramps, chain landings, hits by cause) plus per run every event — wall (size, window open/close, tap time and verdict ok/early/late/none, forecast take-off distance, throw time and trigger, thrown count, alive at contact, kills, hits), ramp (jumped / early / speed / boost), chain landing (tier, landing error), hit (cause, during a wall or a cycle phase).
- The main game gets the same changes.

### v050 — the throw waits for the window, a wall you would not ride into, tester at the first dash (2026-10-23)
- **The followers are thrown when the A window opens** (or when you tap A, or at the latest when the wall is 110 ahead) — no longer when the wall shows up. Their flight is timed from the cycle forecast so they come down **together with his leap, at its landing point**; the hearts lie there too. On a good cycle they fall into his dive (no fall damage), on a miss they hit as before.
- **The wall is a towering heap:** big tadpoles (×1.6, bigger hitbox, same hit points), black with a green glowing rim and eye, 2 layers in front and up to 5 behind. Riding into it is plainly a bad idea; his leap clears it.
- **Surf test page starts at the first dash:** the campaign begins at stage 8 with the T9 cat-jump state (max stamina 17, Heavier Stamp 1, Faster Stamping 2, Wider Splash 1, Long Boost 1, VOID, Wave Cycle, 20 💚); "New campaign" goes back there.
- Measured: window about 0.3 s at stage 8, cycles 6/6 good without a hit (bot), 4/4 at stages 10 and 12.

### v049 — A just before the wall, leap over it, cat as feedback (2026-10-23)
- **Small waves:** the period now drifts between about 105 and 210 (1.5–3× the old 70) through two slow modulations; fixed per stage, height as in v048.
- **The wall swims at you:** faster than the water, +25 % at stage 8 up to +45 % from stage 11. Its tadpoles are signal green; the wake lice are black now.
- **The wave cycle keeps its order** (boomerang back 0.15 s → climb 0.35 s → dash), but the **dash leaves the face**: a leap up over the wall and down into the water behind it, then the dive. In the air: no damage, every touch is a kill.
- **The window is a forecast:** every few frames the game simulates "tap A now". Good = the leap starts at most ~75 units (stage 8: ~90) before the wall front and the whole wall has passed under him when he lands. Measured: the window opens with the wall about 155–190 ahead and lasts about 0.25 s. Too early = he would land in the wall; too late = it reaches him during the climb.
- **The A sign rides on the wall's front**, its ring closing as the wall comes, TAP in the window (like the D on the mussel).
- **The thrown followers land ahead** (where the leap comes down), not behind or on him; on a good cycle those that land during it are doomed too, and the hearts lie at the computed landing point.
- **The cat comments your timing:** too early (D before the ramp, A before the window) "mrrp?", too late (over the mussel without D, the wall hits you) "MAU!", a combo of 4, 8, 12 … "MIAAU!". The kill comments are gone (only the boss still gets a yowl).
- Lice stop surfacing while a wall is on. Banners are smaller and more see-through. Surf test page: sliders climbT, wallXm, spillAhead instead of the old window distances; sound runs there as in the game (it starts with the first Start / tap).
- Rules → Surf controls and the stage-8 banner describe the new timing.

### v048 — water layers, ripples that kick, no sticky ramp, chain fix, wake lice (2026-10-23)
- **Dwell time rises slightly:** each stage aims at 60 s + 3 s per stage (90 s at 11, then +2 s); the calm and riding stretches stretch or shrink to fit, ramps, walls and the stage-1 burst keep their length. Measured with the bot: 60 · 66 · 69 · 73 · 75 · 72 · 77 · 87 · 90 · (10 with the boss) · 93 · 91 s.
- **Metres always on the result:** "560 m ridden · 2 monsters" when washed off (the NaN % is gone), metres also on a win and on the beach card (10 world units = 1 m).
- **Hearts by his hitbox:** 5 to each side, feet to head; Heart Magnet widens it by 3 per level (it used to be 7 + 3 in every direction).
- **Ramp without sticking:** he rides over the mussel at full tempo (it no longer stays under the board); the mussel ramp is 15 % longer. The tap window is now the ride-over itself (about 0.15–0.2 s) plus 0.1 s before.
- **Chain jumps — logged and fixed:** the log showed every miss on the first jump of a chain, 20–43 units too far, never too short. Cause: the aim assist pulled towards the mussel itself, i.e. always forwards. It now corrects the forecast landing point. Bot: 46/58 hits → 88/88. The surf test page has "📋 Copy chain log" (predicted vs real landing per chain jump).
- **Small in-between waves no longer damped:** height 2.2 units at stage 1 up to 4.5, period 70 (was 43, damped to about a third down the face). They kick: a free D jump now scales with the slope (130 → 165, no combo, no boost).
- **Wave cycle:** the A window is closer to the wall (110–260 ahead, was 170–360); the climb is 0.6 s (was 0.85).
- **Wake lice (new, from stage 7):** glassy little crabs surface in the wake behind Robinson and pile up as followers (stage 7 up to 14, a teaser; from stage 8 up to 16 + 2 per stage). The stamp slips off them and they slip under the board; only the wave's throw brings them down, and the dash takes them. The bigger the thrown group, the more hearts on the dive (8 + the doomed ones). Bot: thrown groups of 12–25.
- **Two layers in the water** (looks only): a middle one with the small waves half a period shifted, a deep blue one running ahead of the big swings; they never cross the surface or each other.
- **Texts longer:** a lesson banner stays until you have done what it teaches (first jump, a combo of 2, the first Nosegrab / Backflip, the first good cycle), at least 8 s, at most 25 s; banners queue. Tortoise lines 4 s + length/9; floats 1.8 s.

### v047 — no chance, tap on the ramp, campaign tester (2026-10-23)
- **No seeds, no luck:** every stage is a fixed script, and the gameplay chance (spawn offsets, volleys, glides, rum and fish-tail drops) runs on a fixed sequence per stage. The same stage plays the same every time.
- **Stage 1 is a fixed pattern:** a long calm ride with heart rows (36 💚), then a burst of singles and tight pairs at 2.25 tadpoles/s. Without an upgrade Robinson dies at about 80 % of the way (with any stamina from 5 to 10); with Faster Stamping 1 or Wider Splash 1 he wins without a hit; Heavier Stamp does not help.
- **Faster Stamping:** the first level is the big one (interval 0.5 s → 0.4 s), then × 0.9 per level; level 5 is as before.
- **Tap ON the ramp:** at the mussel's front edge Robinson rides up the ramp (0.42 s, the mussel stays under the board, nose up). A D tap on the way up (or at most 0.1 s before) = the big jump from the lip, shown with a ✓ on the D sign. No tap = a small hop off the lip, the mussel dies, −1 stamina. Tapping well before the ramp does nothing.
- **Landing on a mussel has a window:** D up to 0.25 s before or 0.28 s after touching down starts the next big jump.
- **Heart arcs and landing mussels** are computed for the jump from the lip (same ride-up in the forward simulation).
- **Surf test page — campaign by default:** start plays stage 1, 2, 3 … in a row; a death throws you back to the start of the same stage. After every run the hearts go to a bank and realistic purchases are made (best value first: Faster Stamping and Wider Splash before Heavier Stamp, VOID as soon as it shows from stage 6). Max stamina follows the cat-jump curve (8 at stage 1 … 20 from stage 11). The panel shows bank and log; "New campaign" resets. Untick Campaign for the old free mode.

### v046 — two taps, flow, a written level script (2026-10-22)
Full design: **robinson_surf_concept.md** (German). In short:
- **Controls are two taps.** **D** (right half) = jump over a mussel: a big jump, the mussel dies, no stamina lost; riding onto a mussel without D = a small auto hop, the mussel dies, −1 stamina; D with no mussel near = a little hop. **A** (left half) = the wave cycle: boomerang back into the followers → Robinson climbs under the lip by himself → dash down and dive. Fixed animation, no cooldown. No holding, no braking. S and W are gone.
- **Tempo:** every stage has a base tempo (115 at stage 1 … 198 at stage 10, +3 per stage after). Every combo (each mussel jump, each well-timed A) gives a **boost ×1.35 for 1600 units**; a new combo inside that distance resets it — flawless = flow. Damage ends boost and combo.
- **Tricks** follow from tempo and the wave's slope at take-off: Jump · **Nosegrab** (boost *or* steep spot, from stage 4) · **Backflip** (boost *and* steep spot, from stage 5). From Nosegrab on, the next mussel surfaces exactly where you land (forward simulation of the same physics, a light invisible steering assist). Heart arcs are laid along the computed flight.
- **Monster wall + follower throw** (from stage 8) are one level event: tap A while the green **A** sign's ring is full (wall 170–360 ahead). The boomerang hits the followers, the dash kills the dazed ones and dives, the wall passes under you and becomes the new swarm. Missed: hits from the front and from above. A good cycle guarantees the hearts.
- **VOID is a life-saver:** charges from hearts (40 hearts, ×0.85 per Quick Charge), fires when stamina would hit 0: back to 30 % (+10 % per Second Wind), root lightning and flood as before. Buyable from stage 6.
- **The level is written, not rolled:** each stage is a script on the water distance (calm ride, mussels, chains, walls, boss). Before a ramp the way is clear; ramps and walls never overlap; warning signs (red D, green A) up to stage 11.
- **Progression:** 1 no input (the first try is lost near the end, the hearts buy Faster Stamping or Wider Splash, the second try wins) · 2 D gifted, long tutorial · 3 boost · 4 Nosegrab + landing mussels · 5 Backflip · 6 more monsters, VOID in the Ledger · 7 the swarm forms (teaser) · 8 A gifted, walls only · 9 walls + mussels, fliers · 10 + the First Mate · 11+ longer, faster, denser.
- **Ledger:** Jump [D] and Wave Cycle [A] are gifted key nodes (stage 2 / 8). Buyable: Long Boost, Heart Magnet, Heavy Boomerang, Deep Dive, VOID, Quick Charge, Second Wind (old Boomerang/VOID levels are carried over). **Heart is heart:** every green heart = 1 💚; prices inflated instead (cost = base × mult^level, no ×2).
- **Cat jumps are named after their tide:** T5 (stage 4, Nosegrab) ears-back-ears-chin · T9 (stage 8, Wave Cycle) tail-tail-head-back · T12 (stage 10, the first boss) chin-ears-tail-head · T14 (the island map) back-chin-back-ears; island: T24, T47, T46, T51 (same strokes as M24/M40/M46/M51). Every jump sets the matching surf stage (island ones ≥ 11).
- Island fights use the stage-10 repertoire in their look: nest = short, cabin = boss at the end, army = 5 walls (+15 % per strength above 5, Repo Crab with elite), last stand as before.
- **Surf test page:** `node build.mjs surf` → `robinson_surf_test_v046.html` (stage, kind, boss, stamina, Ledger levels, god mode, tuning sliders; R restarts; the panel folds away while riding).
- Tutorial banners now sit low over the deep water, out of the jump airspace.

### v045 — catching the volley is learnable, signs, no loss spiral, cat jumps on Jan's curve (2026-10-22)
- **The wave's volley (stages up to 5/8):** the monsters land further ahead (+90 at stage 2, −15 per stage, gone from stage 6); when they land, time runs at half speed for 1.5 s (up to stage 5); they stay dazed 5 s at stage 2, −0.5 s per stage, 2 s from stage 8. (In practice the dazed ones drift towards you with the water — the landing distance and the slow motion are what give you time.)
- **Dash prompt** (up to stage 6): while monsters are dazed, "hold ← · tap →" shows over Robinson; holding left and the dash would hit, a golden pulsing **TAP →**.
- **Floating warning signs** on little buoys (up to stage 5): a green **← A** "CLIMB · it pulls" rides along when the wave pulls (it replaces the old text line); a red **D →** "SPEED · ramp ahead" floats about 2 s before each of the first three mussel ramps of a run.
- **After a lost fight you wake with half your stamina** (rounded up; it was 1). Applies to wave runs and island fights.
- **Cat jumps recalibrated on Jan's first surf runs** (stage 5 at tide 5, about one purchase per tide, max stamina +2 a tide early on):

  | Jump | Tide | Stage | 💚 | Max stamina | Ledger |
  |---|---|---|---|---|---|
  | W6 | 8 | 6 | 6 | 16 | Stamp, Speed, Splash 1 each, Boomerang, Fishing Dive (🐟 1) |
  | W9 | 12 | 9 | 10 | 19 | Stamp 2, Speed 2, Splash 2, Boomerang, Quick Catch 1, Fishing Dive (🐟 2), forest open |
  | W10 | 14 | 10 | 12 | 20 | as W9, Stamp 3, VOID |
  | MAP | 16 | 11 | 20 | 21 | Stamp 3, Speed 3, Splash 2, Boomerang, Quick Catch 2, VOID, VOID charge 1, Fishing Dive (🐟 3), map open |

  The island jumps (M24 / M40 / M46 / M51) keep their embedded saves; all eight were run once with a surf fight each, and Jan's tide-7 save loads.
- Rules → Surf controls mention the signs and the TAP prompt.

### v044 — control run, one rules screen, nicer S/W, pause with controls (2026-10-22)
- **Control run over the whole game** (both formats, beach → Ledger → surf stages → result → island → back). Fixed:
  - **The Ledger did not open since v041** (a left-over CSS selector from the old combat buttons broke its panel style). Works again.
  - The tide box no longer shows behind the surf result card.
  - The surf on upright phones is drawn closer (at least 330 instead of 400 world units wide).
  - The breaking lip has a foaming edge instead of a straight line.
  - No debug or log panels in the surf (the prototype's panel was never carried over); the beach's fight-code field stays tester-only.
- **One rules screen for the whole game**, two tabs:
  - **🏄 Surf controls** — riding, the stamp and hearts, Dash, Jump, the wave's pull, S, W, the First Mate, the cat, the beach tower. Each card shows when it starts (stage) and, for the inputs, a little phone with which half to hold and which to tap. Cards for stages not reached yet stay "? ? ?".
  - **🗺 Island rules** — the island's rule cards as before (opens once the island exists).
  - Opens from the beach (new **📖 Rules** button next to the Ledger), from the island's Rules button, and from the hub's Rules spot (on the tab of the scene you are in). The compass hides while it is open.
- **S and W are proper buttons now:** a pill at the bottom (BOOMERANG, amber) and at the top (VOID, green) with an icon, the key letter, a charge fill and a glow when ready. The tap areas around them stay large.
- **Pause in the surf:** a ⏸ button top right. The pause screen lists the controls you have so far (Dash and Jump once their stages are reached, S/W once bought) and points to 📖 Rules on the beach.

### v043 — the beach upright, the tower runs the beach (2026-10-22)
- **Upright phones:** the beach plays in both formats. "Turn your phone sideways" is gone.
  - The beach scene keeps a shape a little wider than tall (height at most width ÷ 1.15) and sits in a full-screen canvas.
  - Above it the jungle canopy continues, below it the lagoon (forest floor in the palm forest, deep sea in the intro).
  - Taps, walking (hold the left or right third) and the tortoise's bubble work as before. Hub and compass stay as in v040.
  - The surf fight already fits upright screens: at least 400 world units wide, more sky above.
- **Beach tower, two levels** (island costs unchanged):
  - **Level 1 = the tower** as before: banyan unlock "Order: beach tower", 30 💚 to start, then 24 production sap. It no longer fights; it tends the beach.
  - **Level 2 = "Order: tower II"**, a new banyan unlock (10 Wandel) after the tower, paid the same way: 30 💚 to start, then 24 production sap, only while the tower stands. If the tower falls, both levels are gone.
- **The right wheel on the compass** (beach automation), one tap each: **off → Silver → Gold → off**. Silver needs level 1, Gold needs level 2; states you can't have yet are skipped. Without a tower the wheel stays grey and a tap says what is missing. The left wheel (island) stays grey.
  - **Silver (beach chores):** at the start of each flood the tower catches every crab on the beach (+max stamina each), drinks the coconuts (and the pool, once the forest is open) up to full stamina, and gives the tortoise one bottle if she can take one (her bar, +1 coconut tomorrow, the forest opens at 3). It costs no tide. A banner says what it did.
  - **Gold (sweep):** Silver, and a stage you have already won by hand is not played: it counts as won at about **70 % of your average haul** at that stage (💚, fish tails, rum), with no stamina lost and no risk. The result card reads "Swept" and moves on by itself. Never with a boss (the First Mate is always yours), never for nests, cabins or armies. Stages you haven't beaten are played as usual.
  - The beach remembers what each stage brought home when you won it by hand (`S.wins`).

### v042 — one combat screen dressed per situation, the cat goes fishing (2026-10-22)
- **Looks** (same screen, same rules, different dress):

  | Fight | Look | Rule |
  |---|---|---|
  | Wave of a flood | day, turquoise | the stage as it comes |
  | Nest | dusk, rot-green water | half a run (~45 s), 10 % more monsters |
  | His cabin | dusk, ink-violet water, pages in the air | the boss first, the reef only after him |
  | The Board's army | grey sky, wind, rain | short (7000), very dense (×1.6, +15 % per strength above 5); with "elite" the Repo Crab |
  | His last stand | night, lightning | no reef — it ends when he falls; the Severance wave |

- **The Repo Crab** is a colourful surf monster now (orange coconut crab, rot spots, a folder in the big claw, the yellow REPO tag). It keeps ahead of you like the boss, slams a shockwave every second attack (2 damage), and is open for double damage after a miss. 150 hp × the stage factor, 12 💚.
- **His last stand:** 1.6 × his hp. Rage at half health (faster attacks, faster shockwaves). His last loyal clerks (3 invoice wasps) at 66 % and 33 %. Every 8 s (6 s in rage) "SEVERANCE PACKAGE!": a 2-second warning, then a violet wall sweeps the **whole face** — jump or dive, or it costs 3 stamina. When he falls: slow motion and the red TERMINATED stamp, then the island's termination letter as before.
- **The cat, new job: fishing under the board.** She rides on Robinson's head as the warning system (ears flat = the lip or a mussel ahead, green eyes = prey, looking back = wasps behind).
  - **Cat: Fishing Dive** (2 🐟, once): once a fight she leaps off his head after a rot minnow — a sure kill and a sure fish tail. Then she clings to the back of the board, soaked, for the rest of the fight (no more warnings). There is no magic way back.
  - **Cat: Her Own Board** (5 🐟, once, after the dive): she surfs in his wake on her own little board and dives again and again (every 12 s); every catch is a fish tail.
  - **Cat: Deeper Dives** (3 🐟 × 1.7 per level, up to 5): she dives more often (× 0.85 per level), reaches further (+12) and deeper.
  - **Lap Cat** stays (beach). **Courage** and **Teamwork** are gone; old saves get Fishing Dive for Courage, Her Own Board for Teamwork, Deeper Dives for Courage levels above 2.
  - VOID no longer has anything to do with the cat.

### v041 — the surf fight replaces the beach fight (2026-10-22)
- **One combat screen for every fight:** Robinson rides a giant wave (the surf prototype v006). The old wading fight, its turret and its wave/nest formulas are gone. All fights from the island (nests, cabins, armies, his last stand) are surf runs too.
- **Controls:** hold the right half (D): down the face and fast · hold the left half (A): up to the pocket · let go: slow down. The stamp fires by itself at the nearest monster. **Dash** = hold left, tap right (from stage 2). **Jump** = hold right, tap left (from stage 3; a timed jump off a mussel ramp kills it for free). **S** (bottom of the screen) = Stamp Boomerang, **W** (top) = VOID, once bought.
- **Stages:** each prototype stage is its own flood. A win = the next stage; a loss = the same stage again next flood (stamina to 1, as before).
  - Stage 1 ride · 2 dash and the wave's volleys · 3 jump and mussel ramps · 4 rot minnows under the board · 5 bigger swell (the Boomerang appears in the Ledger) · 6 steeper · 7 invoice wasps · 8 full face (VOID appears in the Ledger) · 9 full wave · 10 near the reef.
  - Beyond 10 the stages are extrapolated: +4 % spawns per stage, the run gets longer up to 22000, monster hp +8 % per stage throughout.
  - Before the island the First Mate rides in at stage 10, 30, 45, then every 15 (as before); once the island runs, the island decides (his rank: First Mate 260 hp, Cabin Boy 215, Bilge Rat 170, × the stage factor). With a boss the reef only comes after he is down.
- **The Ledger drives the surf:**

  | Ledger | Surf |
  |---|---|
  | Heavier Stamp | stamp damage = 1 + level |
  | Faster Stamping | stamp interval = 0.5 s × 0.88^level |
  | Wider Splash | splash radius = 16 + 4 × level (30 % of the damage) |
  | Stamp Boomerang [S] | bought; shown from stage 5; recharge 6 s |
  | Quick Catch | Boomerang recharge × 0.85 per level |
  | VOID [W] | bought; shown from stage 8; root lightning jumps from kill to kill through everything it can finish (≤ 3 × stamp damage), plus a luminous flood that washes your followers off; charges in 30 s, faster at speed |
  | VOID: Faster Charge | × 0.85 per level |
  | VOID: Seek / Wider Seek | the lightning's reach from one kill to the next: 140, +40 with Seek, +12 per Wider Seek level |

  Dash and jump are not bought: the stages teach them.
- **Stamina** comes from the ebb (coconuts, crabs, pool, purr). Nest, cabin and army fights start full, as before. A gold diamond gives +1 stamina for this run (capped at the maximum afterwards).
- **💚 = the green hearts on the wave.** Arcs over the mussel ramps, chains under the water, the chains under each volley's landing zone, and (stages without ramps) low rows you can ride through. A heart is worth **0.35 💚 at stage 1, +0.065 per stage** (1.0 at stage 11, 2.0 at stage 27): few early, many later. The First Mate pays 25 / 20 / 15 💚 by rank, the Repo Crab 12. Monsters themselves pay nothing.
- **Ledger prices ×2** (💚 only; fish-tail prices and every island price unchanged), because the surf pays roughly two to three times what the old fight paid. To be tuned with real runs.
- **Rat tails are now fish tails 🐟**, for good. They drop from the rot minnows under the board (25 % per kill; the cat's catches always). The rot minnows swim with a visible tail fin. There are no rats in the surf.
- **Rum 🥃:** 30 % per mussel kill.
- **Story hooks:** the tortoise speaks in a bubble at the top of the surf (first fights, the first time a kind shows up — mussels, rot minnows, wasps, the First Mate); the cat mews at the first kill of each kind per fight, then at most every 5 s; the last stand has its lines; TERMINATED leads to the termination letter.
- **Look:** everything is drawn as vectors at the screen's own resolution — Robinson in the beach style (white shirt, red tie, grey trousers rolled to the knee, round glasses) on a driftwood board, the cat in her orange, the island on the horizon. The monsters keep the prototype's designs and colours, smooth.
- **Result card** (on the beach, as before): time, kills, 💚 / 🐟 / 🥃, hearts caught of all on the way. A win moves on by itself after 3 s.

### v040 — open sea, rising flood, tidy HUD, act-2 goals, threats, overflow after a full ebb (2026-10-18)
- **Open sea instead of bars:**
  - The island map now fills the screen. Outside the 1600 × 1000 map it draws open sea in the map's own edge colour, with slow glints that pan and zoom with the map, and a soft seam.
  - Fully zoomed out, landscape shows sea left and right; portrait shows the island across the full width with sea above and below.
  - Nothing is stored for this; the file grows only by code.
- **Upright phones:** hub and compass shrink to fit side by side, the chats sit above them, and Bad Omen moves under the menu. While the beach asks you to turn the phone, hub and compass hide.
- **Rising flood, much more visible:**
  - On beaches the water line creeps inland, up to about 10 map units at tide 0.
  - Swell crests roll in from the open sea.
  - The coastal foam is stronger and the screen edges darken.
  - At tide 0 the surf pulses.
- **Protected tiles** grow 8 extra small plants of their own kind (palms, trees, breadfruit, thicket), drawn like the map's own decor. They sit mostly towards the tile's edge but scattered, so it never looks like a hedge, and they sway a little. They grow in when you protect a tile. There is no badge icon.
- **Side roots** of the banyan's roots grow downwards about 70 % of the time.
- **Compass:**
  - The two automation wheels moved on top, outside the orbit, left and right of the spring sparks, as big as the scene buttons (easy to hit on a phone).
  - The tide number sits on a small brass plate between Island and Beach.
- **Top bar:**
  - One resource row, the same in both scenes: 💚 green blood · 〰 rat tails · 🥃 rum · 🌀 free Wandel (gold) · 🍞 breadfruit and 🥥 coconuts (only until the gecko is a friend) · the cat's once-per-tide cuddle.
  - Only what exists so far is shown.
  - Each item explains itself on hover; on a phone a tap shows the text.
  - Banyan level, growth to the next level and the number of rooted tiles are gone from the bar.
- **Top right:** only the settings (☰ on the island, 🔊 on the beach), layered under everything else. The tide number moved into the compass.
- **Chats** sit on the bottom edge. The briefcase stays above the old buttons until the hub takes their place.
- **🎯 Goal, the act-2 main line:**
  - Stop the Board's armies, or the offensive: prepare, then hold the banyan.
  - Before those: explore → wish on the banyan → listen → gecko → plant the cutting / grow an offshoot.
  - After them: close the First Mate's cabins (n left) → clear the rot nests (n left) → the island holds.
  - "Two banyans · hold the front" is gone.
- **Threat box** under the boss line, each entry only while true:
  - 🌳 The banyan is struck this flood (rot vs defence, chance to hold).
  - 🔥 The banyan / an offshoot burned, level from → to (for the ebb after).
  - ⚠ Hold the front (3 or more strikes on rooted tiles this flood).
- **Overflow, rule A:**
  - Every tile that has been at rot 3 for a whole ebb spills into its neighbour nearest the banyan, omen or not, at most two per network.
  - Defence applies as usual.
  - The treasury rule (overflow only every 2nd flood below 75) stays.
  - Texts and the Bad Omen rule card are updated.
, the tree grows both ways, the briefcase opens (2026-10-18)
- **The hub bottom left** (both scenes), from the moment the briefcase is found until the end:
  - It replaces the buttons Ledger, Banyan, Memos and Rules. Four round spots sit around it, the same size as the compass's scene buttons. Ledger switches to the beach; the other three switch to the island.
  - In the middle sits the briefcase at first, later Fi's face.
  - Around it runs the **Wandel band**, like the compass rim. It shimmers. Green is spent Wandel, gold is free, and the notches are the stages, with the next one lit. Hover over the middle for the details in words.
  - The **sight** is an eye at the lower right of the band, with one ray per step of sight. It is a status, not a button.
  - Below it are **stamina** (orange) and **befall** (spores, turning yellow at 5 and red at 8), shown as small bars with numbers. The top bars drop their Wandel line and the beach's stamina bar while the hub shows. In fights the beach stamina bar is back up top.
  - On the island, Robinson keeps his own befall badge.
  - Its centre sits at the same height as the End-ebb compass.
- **It grows with the story:**
  - It starts as a brass ring with brass spots.
  - Roots creep over the ring and the spots with each personality stage of the briefcase (omen, cracks, guilt, fear), and leaves appear from halfway on.
  - The briefcase LED blinks while it talks and blinks red once the wipe is pending.
  - With Fi, everything is dark wood.
- **Compass:** the scene buttons moved up and out, close to the compass (they may overlap the last waves slightly). The two greyed automation wheels sit between them, under the compass.
- **Night scene:**
  - It starts from a real briefcase (leather, brass clasps, satellite module) instead of a dark slab.
  - Roots close round it, the LED sparks and goes out, and the lid swings open with light inside.
  - Fi grows out of it, small at first, then steps down onto the roots while the case fades.
  - Her first words start after that, at 8 s.
- **The tree (banyan screen, ledger and elf tree):**
  - No more dark jungle: light parchment above the ground, earth below.
  - Robinson's upgrades grow up like a crown in leaf, blossom and fig colours (green, orange, magenta, red).
  - The banyan's grow down like roots (amber, deep blue, dark violet).
  - Fi sits on the trunk above the ground and the banyan's Listen below it; the double root is now the trunk.
  - Before Fi, the Dark-Wood Elf waits above the ground where she will sit.
 with the sky from the title screen (2026-10-18)
- **Fix:** the cat on the title screen only knew the four beach codes, because the island codes were offered only once the island had been opened. Now all eight codes work everywhere.
- An island code chosen on the title screen first starts a game (as with MAP), then loads that island moment.
### v037 — save fix, Fi earlier and in the UI, banyan split, compass scene buttons (2026-10-18)
- **Save fix:** loading never autosaves, and a row with the island is never replaced by one without it. CONTINUE twice keeps the island.
- **Cat shortcut M40** (same strokes as before) now loads Jan's tide 47 from his own game, with 40 free Wandel. That is just before the Dark-Wood Elf and the Bilge Rat's last cabin. The wipe memo arrives in the first ebb, and the elf can be learned right away. The other shortcuts are unchanged: W6, W9, W10, MAP, M24, M46, M51.
- **Fi's arc, earlier and more personal:**
  - The wipe memo arrives with the Board's first private offer, independent of the boss. Before that, the "Dark-Wood Elf" node stays dark.
  - The memo now voices her fear of being wiped and what she would lose: the ledger, the invoice, the cat's name, the voicemail.
  - An approval chain follows, one step every 3 tides: IT, then Compliance, then the Board ("next full moon"). It never completes.
  - One tide after the change: *"Remote wipe executed. Target not found."*
  - Midgame personality in the normal banter:
    - Stage 1 (3 tides after the find): cracks.
    - Stage 2 (after the first offer): guilt.
    - Stage 3 (after the wipe memo): fear.
    - Her own lines come first while there are any left (60 %).
  - The tortoise's hum message no longer names a price; the banyan shows it.
- **Fi's bust** sits bottom left in both scenes once she exists:
  - It shows her face in a ring of dark roots, cut from the look you chose, and glows while she talks.
  - Four spots around it replace the buttons Ledger, Banyan, Fi · Memos and Rules. Ledger switches to the beach; the other three switch to the island.
  - The Ledger spot glows when something is affordable, the Memos spot when there is new intel, and Rules shows a count of new cards.
- **Night scene fix:** the picture was squashed vertically once the row of looks appeared. The canvas now follows its height too.
- **Banyan screen split horizontally:**
  - Top half (parchment): level, sap split, orders, next root, and the sap flow.
  - Bottom half: the tree drawn exactly like the elf tree (dark jungle, will-o'-wisps, roots, dark text box).
  - Before Fi, the "Dark-Wood Elf" node waits where Fi will stand. Afterwards it is the full elf tree.
  - The tree fit now uses pixel margins, so edge nodes no longer clip on small canvases.
- **Compass scene buttons:**
  - Island sits below-left (blue), Beach below-right (cyan). Both are round brass buttons with drawn icons. The current scene is lit, and the island button pulses when the island is waiting.
  - In the gap above each scene button sits a greyed ship's wheel: automatic floods for island and beach separately, coming later.
  - The old 🗺/🏖 buttons are gone; bottom left holds only the upgrades.
- **Cat in fights:**
  - She comments on the first kill of each monster kind per fight, then at most every 5 s. The boss still gets a comment on every kill.
  - Sounds: tadpole and mussel "mau!", rat "mrrp". No "mi!" any more.
- **Purr louder:** the beach and the island now share one purr, with an audible rumble instead of a 46 Hz hum.
### v036 — fixes, one cat window, one layout, smoother floods (2026-10-18)
- **Fix:** since v033 every stamp hit its target twice (a left-over `else` of the old splash). Now one stamp = one hit, plus the 20 % splash.
- **Nest fights** = the current beach wave + 10 % monsters (`NEST_WAVE`). In his cabin the First Mate walks in early; his last cabin stays the last stand.
- **One cat window** for the whole game (built by the hub). It knows all eight codes; the sky tap counts everywhere. A beach code jumps on the beach, an island code (only once the island has been opened) on the island. Without a jump you return where you were. The once-per-tide purr, 💾/📂 and the gone-cat rule stay. The secret access (hold the tide number on the island for 3 s) also shows the test controls.
- **End-ebb compass**, bottom right in both scenes:
  - a brass rim with degree marks and four golden points; the face is split island blue / beach cyan, with END EBB written large;
  - the tides orbit it as drawn waves: island left (blue), beach right (cyan, mirrored); spent tides stay as outlines;
  - the shared spring tide shows as gold sparks on top, room for 7, then "+n";
  - it pulses when everything is spent; a dashed ship's-wheel ring beside it is kept free for a later automatic flood.
- **Layout:**
  - bottom left: scene switch, then upgrades (beach: Ledger; island: 🌳 Banyan, Fi · Memos, Rules);
  - top left: the resource bar with 💚 first in both scenes, both bars dark;
  - island top right: tide number + ☰ menu (beach report, view, tile borders, sound); the beach's tide box now only shows in combat;
  - test controls (fight code, beach mode, build time) only for testers.
- **Flow:**
  - End ebb brings you back where you pressed it, with a short flood report (fights, rot strikes, rot tiles/nests, 💚);
  - "Low tide ends" is a banner, no click;
  - a won fight moves on after 3 s;
  - nest/army fights start after a 3-second countdown;
  - priority windows wait until the flood is over;
  - each kind of flood event (rot strikes, army march, army fight) gets its camera tour only the first two floods it happens;
  - scene switches fade (0.3 s).
- **Not done:** the island part of the flood still plays on the island (with the shortened camera tours). A flood fully in the background behind the beach would need the flood code split up; that is for later.
### v035 (2026-10-17)
- No gameplay change. "Bailiff" is gone from every text, comment and doc: the boss is The First Mate (demoted: Cabin Boy, Bilge Rat). Only internal code names (`bailiff`, `drawBailiff`) keep the old word, because saves store them.
### v034 — graphics round (2026-10-17), coded as agreed below; notes on how:
- The cat picture is one shared piece of code (`titel.js`, reached via `SPIEL.katzenSzene()`), used by both cat windows. The constellations are drawn from the beach codes, so stars and codes cannot drift apart.
- Island shortcuts load the whole game state like 📂 and autosave from there. The old T20/T30/CAVE rows are gone.
- Tower vines hit for max(1, 50 % of a stamp). In nest/army fights on a tree the tower is the same, drawn smaller.
- Fi: hints from tide CASE_AT+2 (roots) and +4 (the briefcase's question). The wipe memo and the tortoise's explanation come as priority messages once she can be afforded.
- Learning her opens a night scene: roots close round the briefcase, wisps, she steps out, four lines in her voice, then the look picker. The look can be changed later in her memos window.
- On the map Robinson no longer carries the briefcase; Fi sits on the first banyan. Chat and priority windows say "Fi".
- With Fi, the elf tree replaces the tree in both the ledger panel (beach) and the banyan screen (island). Both show all nodes and buy across worlds through the hub (`SPIEL.baum()` / `SPIEL.baumKauf(id)`). The sap controls and the rum row stay where they were.
- Owned upgrades with further levels keep their price badge and pulse when the next level is affordable.
#### The agreement (2026-10-17, graphics round)
- **Cat screen:** built from the title-screen code (sky, clouds, lagoon with corals, palm fronds, trunk texture). The view goes from the forest edge out to sea, with no volcano. The cat (in-game design) balances on a flat palm, and Robinson is not shown. 💾/📂 sit small in a corner.
- **Constellations = secret codes:**
  - Four constellations of up to 4 stars. Each star sits where that petting spot is on her body. A spot used twice = a big star. No lines and no order hint.
  - Beach codes: W6, W9, W10, MAP (W3 is dropped).
  - The island uses the same four with a "blue" click (background) in the middle.
  - Island checkpoints, all cut from Jan's full log (tides 18–50): W6+blue = tide 23 (briefcase found, First Mate ready) · W9+blue = tide 39 (before his last cabin) · W10+blue = tide 45 (offensive announced) · MAP+blue = tide 50 (cat gone, gate key set). They replace T20/T30/CAVE.
  - The gate key does not exist in normal play since v020; for the last checkpoint it is set directly.
- **Beach tower:**
  - On the beach it becomes an impressive portal between beach and forest (too tall to see its top).
  - In the forest it makes the place homelier: a root roof over a sleeping corner, a hammock between aerial roots, firefly lanterns, the rum bar grown into its roots.
  - In combat it stands at the far left edge and grows in along the top of the screen; its vines fire from there.
  - Vine damage = 50 % of stamp damage (today: 1 per hit), the 2 s root stays.
- **Fi, the Dark-Wood Elf** (story: storybook §4.2):
  - A late banyan upgrade "The Dark-Wood Elf" costing **40 free Wandel**; the briefcase must be found. It is a priority message once affordable.
  - The briefcase becomes an elf. **Gameplay stays the same for now** (memos as before); effects are still open.
  - Six looks (Leather Dryad 1a–1c, Shadow Sorceress 4a–4c), all selectable by the player, cosmetic for now.
  - On the map an elf on a banyan branch replaces the briefcase icon. Voice: the same murmur synth as the others, but higher, with vowel filters and a soft bell shimmer with reverb.
- **One upgrade screen after the elf (layout A "two hearts"):**
  - The elf (ledger) and the banyan's Listen sit side by side, the same size, joined by a double root with sap flowing both ways; ledger branches radiate left, banyan branches right.
  - Near-black jungle with will-o'-wisps, vivid icons, dark roots as lines; text only in a box at the bottom.
  - States: hidden (wisp "?") / locked (dark) / too expensive (dimmed, red price) / buyable (pulsing ring) / owned (colour, level dots, sap flowing) / maxed (gold rim).
  - Colour = branch; shape = currency (round 💚, rounded square 🐀, hexagon Wandel).
  - Before the elf, ledger and banyan screen already use this icon language on their light backgrounds, so the change is only the background darkening and the two trees joining.
  - Prototype: artifact "Robinson Elfenbaum".
- Fix: the ledger text of "Wider Splash" still says "every third stamp".
### Agreed earlier (as of 2026-10-15)
- ✅ **Boss rename (Jan, 2026-10-15):** Ferrant still thinks the island is his and Jasper lost, so nobody is sent yet. Beach boss 1 = **The First Mate** of the *Leverage*, taken over by the rot (kept a hand in the owner's finances, throws pages from his folder). On the island he returns and is demoted by the Board each time he fails: **First Mate → Cabin Boy → Bilge Rat → fired**. His rot nests are now 'cabins' (memos, cards, labels). **Coded in beach v019 / map v018** (display names only; internal ids stay 'bailiff').
- **Act 3 rests (Jan, 2026-10-14). Focus: polish acts 1 and 2.** The memory-chamber version (hidden threads → cat fate) is dropped. New direction, not yet designed: a classic run in the side view built on the beach combat engine; one cave run must be finished within a single flood; split into levels; some levels only the cat can enter (a small hole) — she fights alone as an autobattler and hits a switch that opens the way for Robinson. Consequence: the cat as a fighter grows in importance in acts 1–2. The v017 cave code (side view, light/fear, Creditor, chambers) is parked; since v020 the boss drops no key, so the cave is only reachable via the secret shortcut.
- ✅ Map root fix coded in v020. Still optional: half sap at rot 1; Clean Rot checks root strength before the strike.
- *(Parked with Act 3)* Cave voice in 1st person, intro pass and cat-collateral thread — see storybook appendix A.
- Beach UI: left/right layout of the beach should mirror the island map; the beach button "Ledger" gets renamed step by step as Robinson becomes more natural (no change needed otherwise).
- ✅ Feedback round 2026-10-16 coded in map v024 (see above).
- **Protect simplified (Jan, 2026-10-15):** Protect = only +1 defence (permanent, 1 tide, +1 Wandel), harvesting stays possible everywhere; the passive +1 fruit per tide on protected resource tiles is dropped. Automatic harvesting comes back later as a late-game upgrade. Harvest button: show it greyed with the reason ("rests 2 more tides") instead of hiding it.
- Later ideas: army morale via the Board's Belief value; an upgrade to move the "capital" (the main banyan) — losing condition stays: main banyan dies.
- Balancing: growth slider 25–75 %, steeper growth ladder from level 8, a sink for free Wandel, overall resource tuning.
### Beach ↔ map interface (codebases separate)
- Input: `map_input_sim_v1.csv` (embedded), scenarios typical/tough/smooth, 30 tides after the boss: beach wave, result, loss streak, green earned/spent/stock, kills, turret, milestones. Map 💚 available = beach stock − map spend. Beach report behind a button (v019).
- Output: Map log CSV per tide (copied to the clipboard), 69 columns — see v013 changes.
- Gecko: on the map follows Crusoe; on the beach later a party member like the cat — melee with big area damage, dives into the crowd, decent but not tank HP (creates VOID targets).
### Key data findings (Jan's CSVs)
- Pre-boss: win rate ~35 %, walls at waves 5, 8/9, boss; net 💚 +1.8/flood; free beach tide ~2.5 (0 in grinds). Post-boss: green earned ~20/flood, stock 35–90 → map has blood, tide is the bottleneck (hence separate bases + spring tide).

## 5. Open / later
- Strategic defender bonus refinements and rot buffs (separate talk).
- Blood sinks: beach slots (forest support, gate companion, waterline defence), more map projects.
- Coconut/food uses; companions beyond gecko; Region III/IV access (bats/lava tunnel idea); quests revealing cat codes; prestige ("Crusoe forgets", cat keeps levels) on banyan fall.
- Wandel stage abilities beyond sight; progression for player and enemy on the map; chapter goals/victory conditions.
- v041 surf economy to tune with real runs: heart value per stage (0.35 + 0.065/stage), Ledger price factor ×2, fish-tail drop 25 %, Gold sweep 70 %.
- The island map still draws the Board's armies with rat figures; the surf has no rats.
- Island automation (the left wheel) is still grey.

## 6. Story bible → moved
The canon story now lives in the project doc **claude/robinson_storybook.md** (Geschichtsbuch v4, 2026-10-14): principles, cast, prequel, acts 1–5 + finale (act order: 1 beach · 2 island/First Mate · 3 cave · 4 lagoon · 5 mountain · finale), Act 3 fully written (six chambers, three finds each, ambivalent choices, hidden threads, the Creditor's reading, cat fates), flags for code, endings × cat fate.
