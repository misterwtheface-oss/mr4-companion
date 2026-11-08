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

## Open
- [ ] Per-monster extras (user decides what to show): traits, favourite items, likes / dislikes by food and item
      category (species.json food_cat / item_cat, not yet in data.js), like levels (battles, rest), personality odds
      (mix of main and sub breed tables). Personality names and food-category names still need decoding.
- [ ] Breed face draw site not traced (extract REQUESTS); faces are art-matched to breed ids.
- [x] Item pictures: 498 item renders (item id -> model file 0x247 + id) in lists and detail; Envelopes / "(NONE)"
      have no model. Re-render: `_mr4_extract/tools/item_renders.py all` (task MR4_item_renders).
- [x] Icons: technique pictograms (lists, detail, monster technique chips; Ape variants use their own set), element
      icon + name, category icon, range, monster type badge. Rank icons are mapped (icon_map.json) but not used yet.
- [ ] Stat grade scale and growth type meaning: shown as raw numbers.
- [ ] Book routes: real album titles for discs; "From Book" stat generation (extract REQUESTS / 05_summon Q5).
- [ ] Planner features (raising, combining) after the encyclopedia.
- [ ] Data status in the extract is "raw extract, not yet verified in game".

## Session log
- 2026-11-08 [mr4.app] Icon map decoded from game code (extract `tools/icon_map.py`, APP.md § Icon map): technique
  pictograms (breed set + slot), item models (file 0x247 + id), element / category / type / rank icons, range and
  element names.
- 2026-11-08 [mr4.app] Icons and item pictures live in the app: 498 item renders (Task Scheduler; the shared
  Blender framing gained `trim_outliers: false` because it clipped long items like tablets), technique pictograms,
  element / category / type icons, range names. Full build = task MR4_app_build (tools/build_data_task.cmd).
- 2026-11-08 [mr4.app] What changed and why: v1 encyclopedia built and published (user: encyclopedia first, repo
  mr4-companion); kit gained tools/app/shot.py for phone-width checks. Open after this session: item pictures,
  technique icon lookup, element/category names (list above).
