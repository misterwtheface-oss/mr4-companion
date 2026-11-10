# MR4 Companion: progress

## State
- 2026-11-08: v1 scaffold (encyclopedia first, user's choice; repo name mr4-companion). Tabs Monsters / Techniques /
  Items / Tournaments; detail overlays cross-link monster, breed, technique, item, tournament. 335 monster renders
  (3/4 view); the 5 special monsters (King Shiden, Don Mudleone, Garp, Zevion x2) have no model set and show
  "no render". Live 2026-11-08: https://misterwtheface-oss.github.io/mr4-companion/ (Pages from main, auto-deploys on
  push; Cloudflare beacon not added until public release).

- 2026-11-08 (later): layout rebuilt to the user's spec: the main page is a grid of the game's breed faces (res 0x8A,
  33 breeds + "?" for Special); tapping one opens the breed overlay (URL #b/<id>, phone Back closes it) with a
  Monsters / Breed toggle. Monsters = one row each (base stat + growth grade per stat); Breed = what all members
  share (monster type, technique list). The old Techniques / Items / Tournaments tabs are gone from the layout (the data
  stays in data.js for later features).

- 2026-11-08 (game panels): emblems and techniques are drawn the way the game draws them, from the game's own UI
  layouts (extract APP_UI.md § UI layouts / § Icon map). Main page = one Mon info name plate per breed (gold bar, emblem,
  name in the blue band). Monster rows start with the Mon info breed row (main emblem x sub emblem, name). Breed view =
  the Mon info technique page: "Skills" grid (slot n = tile n, tap to select, cursor arrow) + the detail box (type,
  range, name, guts, Added Effects, category / element sockets) + four rank boxes (E..S letters from the game's
  cmn_waza_rank table, raw value beside). Slots 12-15 (Counter, finisher, tag skills; no tile in the game) are chips
  under the grid. Emblem = res 0x8B blue disc + gold ring + face (frame-matched); faces code-backed per monster (Ape
  variants, special monsters, "?" subs). Technique pictograms are now the full-colour art (the game draws them opaque).
- 2026-11-08 (user trim): only chosen game parts stay. Main page = bare emblems (disc + ring + face) + name; monster
  rows = main emblem, CSS gold "x", sub emblem, name; stat bars in the Monster Data label colours (POW red, LIF orange,
  INT green, SKI = ACC magenta, DEF blue, SPD cyan). Techniques = pictogram grid by slot (selection glow) + a CSS card:
  type / range in the game's gradients, guts, Added Effects (when not NONE), category + element icons, and the four
  rates as rows in the game's label colours (Life Damage red, Guts Damage cyan, Critical yellow, Accuracy magenta) with
  a magnitude bar (share of that stat's largest value), the raw value and the game's E..S letter. Panel backgrounds
  are no longer shipped (the extract export keeps them).
  Colours softened (user: game colours too bold): styles.css keeps the game value per class (--g) and mixes it with a
  muted steel (--soft 68%, --mute) in one place; rank letters slightly desaturated.
  Emblem container is CSS now (user: the game's ring art looked off at app sizes): blue radial disc + gold gradient
  ring scaled from one --e diameter, bare face on top (styles.css .emb); the composed emblem PNGs stay in the extract.
  Palette rebuilt around the emblem (user): darker, calmer disc + muted brass ring; UI = navy-charcoal surfaces, one
  brass accent (--gold: active tab, selection, headings, high grades; replaces teal), ivory text (styles.css :root).
  Monster pictures sit on a lit neutral-slate stage with a CSS ground shadow + drop shadow (the renders are Blender
  Workbench, studio light, no shadows).
- 2026-11-08 (user review of renders): lit re-render (Cycles, cast + ground shadow) with per-breed pose / angle /
  framing fixes and the untextured-part fix (extract APP.md § 3D monster renders); app crops to the model, keeps the
  shadow inside that box (CSS shadows removed). Apes get their own "Ape" entry after Garu (Ape technique names and
  pictures, Garu's technique stats; code-backed). The 5 special-main monsters are bosses: hidden (FEATURES.bosses).
- 2026-11-08 (NPCs): 7 normal-breed monsters the player cannot get (flat 100 base stats: Dodon, Ceralino, Ayatea,
  Millielle, Balbalo, JackInTheCho, Spartacus; all on the extract's never-from-a-disc list, 05_summon § 1.5) are
  hidden by FEATURES.npcs (app.js); still in data.js.

- 2026-11-08 (bars + flags): magnitude bars follow rule A-magnitude-bars (share of the largest shown value per field;
  helper magMax / magBar); technique card adds a Guts Cost bar. Hidden by FEATURES: bosses, npcs (7 flat-100 monsters),
  groupSkills (4 picture-less techniques per breed); all kept in data.js.
- 2026-11-08 (resists + facing): monster renders mirrored in CSS (face right). Tapping a monster box swaps its stats
  panel for its battle resists (8 element affinities in two columns + the 3 category resists, -10..10, magnitude bar
  per element / category over the shown monsters); both panels share one cell so the box keeps its height. Data =
  species vars 0x4A-0x54 (extract 01_monster), shipped as species.resist {el[8] by element id 1..8, cat[3]};
  build_data.py errors if the element / category order changes.
- 2026-11-09: stat order leads with Life (LIF, POW, INT, SKI, SPD, DEF; STATS in build_data.py, user). Raising-advisor
  groundwork done on the extract side (not in the app yet): rules in _mr4_extract/RAISING_ADVICE.md (praise / scold by
  the training panel's "Success Rate N %" vs the personality group 40/50, 50/60, 60/70; fair week = praise by default;
  rest when the Status word reads Tired; lifespan / health charged on end-of-week values; fatigue gain ranges per drill),
  60 in-game condition screenshots (_mr4_extract/assets/advisor/), data files listed in _mr4_extract/APP.md § Data.
- 2026-11-10 (user): the "Breed" tab is now "Techniques" (view key `techs`; an old saved `breed` falls back to Monsters).
  No selector any more: one box per technique in slot order, in the monster rows' gold box (shared `.box` / `.box-hl` /
  `.box-hr` / `.box-l` in styles.css; list = `.mlist`): header = pictogram | name in the gold title gradient; body =
  category + element icons, type, range, Added Effects | guts cost, the four rates (every box the same height).
  Monster type badge moved from the Techniques screen into each monster's name band, right-aligned.

- 2026-11-10 (Evo imports): the 93 Monster Rancher Evo monsters MR4 lacks are in the app (FEATURES.evo), on their MR4
  main's page with an "Evo" tag; Maya / Piroro are two new breed tiles (app ids 48 / 49, emblem = pure render thumbnail,
  techniques without pictograms). Numbers = extract tools/evo_records.py proposals (src per monster); grades that are a
  stat->grade proposal have a dashed outline (decision open: copy a base's growth spread or set a custom one per new
  base). Monster box tap now cycles stats -> resists -> info (Book description, starting trait, starting techniques).
## Open
- Group skills (Counter, the breed's unique group attack, Tag Skill 1 / 2; slots 12+, no pictogram): user to decide
  where they go; hidden by FEATURES.groupSkills; turning it on puts them back on the core scale, so their new home needs its own scale.
Backlog (user, 2026-11-08):
- [ ] How traits work: decode res 0xF1 (kind + 4 x (effect, value)) and the battle / training consumers into plain
      words per trait (extract 01_monster § 4.4, 03_battle).
- [x] Technique panels drawn like the game's: layouts 20 / 21 rebuilt from their parts (State, 2026-11-08 game panels).
- [x] Breed emblems inside the game's UI container: res 0x8B backdrop + Mon info name plate / breed row.
- [x] Per-stat modifier: not shown (user 2026-11-08): always 2 x (grade - 5) on every shown breed, Growth says it all.
- [ ] Per-monster extras (user decides what to show): traits, favourite items, likes / dislikes by food and item
      category (species.json food_cat / item_cat, not yet in data.js), like levels (battles, rest), personality odds
      (mix of main and sub breed tables).
      User 2026-11-09: wants ALL food data + likes / dislikes, Book descriptions, trait learning. Extract side DONE
      2026-11-09, not yet in data.js / the app: Book descriptions (data/monster/book_desc.json, 335; specials have none;
      tools/dec_book.py), Library topics (6 breed topics in breed_lore.json, all 40 in data/core/library_topics.json),
      trait learning (data/monster/trait_learning.json: expedition levels only; fixed Ride/Search trait per main breed
      at a set level, else weighted random pools by level band; 01_monster.md § 4.8), food + likes + personality
      names / odds (data/monster/food.json, likes.json; tools/dec_advisor.py). All code-cited, nothing checked in play.
- [ ] Raising advisor module (user 2026-11-09): per monster, what to feed and when, when to rest, when to praise vs
      scold, etc. Rules spec ready: _mr4_extract/RAISING_ADVICE.md (gaps listed there). UI not started.
- [x] Breed face draw site traced (`FUN_00296a30`); faces code-backed.
- [x] In-game check of the technique page (route `_mr4_extract/tools/route_data_pages.txt`, page 2 Customizing): grid,
      opaque pictograms, detail box and rank boxes match. Not yet seen in a frame: a selected technique (name / rank
      letter positions are code-derived only).
- [x] Item pictures: 498 item renders (item id -> model file 0x247 + id) in lists and detail; Envelopes / "(NONE)"
      have no model. Re-render: `_mr4_extract/tools/item_renders.py all` (task MR4_item_renders).
- [x] Icons: technique pictograms (lists, detail, monster technique chips; Ape variants use their own set), element
      icon + name, category icon, range, monster type badge. Rank icons are mapped (icon_map.json) but not used yet.
- [x] Grade shown with its training-gain % (growthPct, breed grade only: traits are swappable); growth type named by the peak of its age curve
      (Early / Early-mid / Normal / Mid-late / Late / Steady; names are ours, the game shows none) + lifespan.
- [ ] Book routes: real album titles for discs; "From Book" stat generation (extract REQUESTS / 05_summon Q5).
- [ ] Planner features (raising, combining) after the encyclopedia.
- [ ] Data status in the extract is "raw extract, not yet verified in game".
- [ ] Monster render shadows (user 2026-11-09, picked look "D"; parked while the user tests performance, run it when
      the PC is free): no shadow toward the viewer. Look D = jobs_lit settings `"rim_shadow": false, "fill": "suns"`
      (rim light casts no forward shadow; grey world fill replaced by 6 shadowless suns, so no dark halo round the
      feet; key light unchanged, its shadow falls back and to the side). Options live in
      tools/render/blender_batch.py; samples + sheet in _mr4_extract/scratch/noshadow/ (D/, shadow_E.png row D).
      To do: (1) add both keys in `_mr4_extract/tools/xgame_renders.py jobs_lit`; (2) re-render all 335 via Task
      Scheduler (task MR4_rerender_lit, ~1 h incl. app image pass); (3) app crop `build_data.crop_model`: it counts
      only alpha >= 250 as the monster, so see-through Jells lose head + hand (333 Jell) and shadows get cut at the
      square's edge; crop to the full visible outline (model + kept shadow) instead; (4) phone screenshot to the user
      before pushing. Optional, user to choose: wider picture slot in the monster rows (the tall narrow slot leaves
      wide monsters small).
- [ ] Ape renders (user to judge): faint red haze above the head (helmet light bound to its dimmest texanm frame; drop
      it or pick another frame); the sub emblem on Ape rows is "?" (subs 0x23..0x25 are not breeds; could show the
      Ape's own face).

## Session log
- 2026-11-10 [mr4.app] What changed and why: user asked for the technique section in the monster-box style; the Breed tab
  became Techniques, the pictogram selector went away for one gold box per technique (shared .box styles with monster rows),
  Added Effects moved into the left column, the monster type moved into each monster's name band, and the overlay body got
  top padding. Open after this session: nothing new.
- 2026-11-09 [mr4.app] changed 292 files (CONTEXT_MAP.md, PLAYTEST.md, PORT_LOG_2026-11.md, RAISING_ADVICE.md…). What changed
  and why: user disliked the shadow falling toward the viewer in the monster renders; traced it to the rim light and the
  grey world fill (halo round the feet), added render options and sample looks A-E; user picked D. Open after this
  session: D re-render + app crop fix parked in § Open (user is testing performance).
- 2026-11-08 [mr4.app] 35 renders re-done with their feet (user: Pixies missing feet): the lit renders' shadow-catcher ground sat at the
  trimmed lowest point, hiding toes / bases (Pixies, Ryoku, Jells, Ducks, Gitans, Fish); fix in tools/render/blender_batch.py, task
  MR4_rerender_feet (extract tools/feet_rerender.py, old renders kept in assets/renders/mr4_feet_old/).
- 2026-11-08 [mr4.app] Monster renders centred vertically in their box (were bottom-aligned; user).
- 2026-11-08 [mr4.app] All bars relative (user): lowest shown value = 6 % sliver, highest = full, linear between (magMax -> {lo, hi}).
- 2026-11-08 [mr4.app] Monster rows (user previews): one gold box per monster (2 px outer border), header band = emblems | name
  (gold .tt gradient), body = render | stats; Base / Growth labels dropped; lifespan = magnitude bar with the growth type.
- 2026-11-08 [mr4.app] Monster rows: emblems + render in one two-part box (emblem header, gold borders), name heads the stats column (user).
- 2026-11-08 [mr4.app] Monster render box bordered (not the row); emblem pair centred over the picture column, name aligned with the stats column (user).
- 2026-11-08 [mr4.app] Mod column removed (user): modifier = 2 x (grade - 5) on all shown breeds.
- 2026-11-08 [mr4.app] growthPct no longer includes trait grade lifts (user: traits are swappable, show the breed value).
- 2026-11-08 [mr4.app] Monster rows: per stat Base / bar / Growth grade + gain % / Mod, plus Lifespan and growth type
  (user ask). growthPct built in tools/build_data.py from res 0x49 + 0x08 and trait effects 10-16. Open: nothing new.
- 2026-11-08 [mr4.app] Group skills hidden (FEATURES.groupSkills): the 4 picture-less techniques per breed (slots 12+)
  are group / special attacks, not comparable with the core 12; bar scale now from the core 12 only (Life Damage top 66 -> 62,
  Accuracy 100 -> 63). Data kept.
- 2026-11-08 [mr4.app] Technique card: Guts Cost is its own magnitude bar (first rate row, blue, no letter: the game
  has none for it), replacing the "GUTS n" text; effect line only when the technique has one.
- 2026-11-08 [mr4.app] Technique rate bars now scale from the shown breeds' techniques only; monster and technique
  bars share one helper (magMax / magBar). New app rule A-magnitude-bars (rules.json). tools/app/shot.py clicks now
  wait for their selector (hash-routed overlays). Checked: Gigaload card = full Life / Guts / Accuracy, crit 22%.
- 2026-11-08 [mr4.app] Monster stat bars: were a fixed 0..300 scale (base/3, undocumented, never full); now share of
  that stat's largest base among shown monsters (user pick; matches the technique rate bars and the State note).
- 2026-11-08 [mr4.app] NPC filter: flat-100 normal-breed monsters hidden behind FEATURES.npcs (user request; data kept).
  Checked by page dump: Pixie / Golem / Hare / Durahan / Pancho / Ripper lists lose exactly those 7.
- 2026-11-08 [mr4.app] Lit renders shipped (live 070ebe1). What changed and why: task MR4_rerender_lit rendered all
  335, but its app build died on one transient WebP encode error (item 290, memory right after Blender), so nothing was
  committed; re-ran MR4_app_build (0 errors), checked at phone width, pushed; fixed rerender_lit.cmd (lost its folder
  after the app build call, so no done marker); extract APP.md split, icon map + UI layouts -> APP_UI.md (budget).
  Open after this session: the two Ape render questions (Open list).
- 2026-11-08 [mr4.app] User trim of the game panels (State, "user trim"): emblems, CSS x pair, pictograms, rate rows
  with game colours. What changed and why: the user wanted only chosen parts of the high-fidelity panels.
- 2026-11-08 [mr4.app] Game panels: extract `tools/layouts.py` (LAYOUTS format decoded, panel export), `icon_map.py`
  (emblems from res 0x8B, opaque pictograms, code-backed faces), APP.md § UI layouts, REQUESTS face item closed; app
  build copies panels + emblems, adds technique `effect` / `rank` and per-monster `faces`; app.js panels. What changed
  and why: user asked for emblems and techniques drawn as in game, with their surrounding UI.
- 2026-11-08 [mr4.app] changed app.js, styles.css, index.html, tools/build_data.py, data.js, assets/icon/breed (new);
  extract tools/icon_map.py, APP.md § Icon map, REQUESTS.md. What changed and why: user's layout spec: breed face grid
  (game's res 0x8A faces found in the ELF), breed overlay with Monsters / Breed toggle, monster rows with picture + stat
  bars + growth grade; live. Open after this session: backlog in Progress.md § Open (traits, in-game technique panels,
  emblem UI container, stat modifier) and the per-monster detail choice.
- 2026-11-08 [mr4.app] Icon map decoded from game code (extract `tools/icon_map.py`, APP.md § Icon map): technique
  pictograms (breed set + slot), item models (file 0x247 + id), element / category / type / rank icons, range and
  element names.
- 2026-11-08 [mr4.app] Icons and item pictures live in the app: 498 item renders (Task Scheduler; the shared
  Blender framing gained `trim_outliers: false` because it clipped long items like tablets), technique pictograms,
  element / category / type icons, range names. Full build = task MR4_app_build (tools/build_data_task.cmd).
- 2026-11-08 [mr4.app] What changed and why: v1 encyclopedia built and published (user: encyclopedia first, repo
  mr4-companion); kit gained tools/app/shot.py for phone-width checks. Open after this session: item pictures,
  technique icon lookup, element/category names (list above).
