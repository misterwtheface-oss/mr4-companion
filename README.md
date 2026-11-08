# MR4 Companion

Encyclopedia for **Monster Rancher 4** (PS2, Tecmo 2003): monsters, techniques, items and tournaments.

## Architecture
- Vanilla JS, no framework, no build step for the app: `index.html` + `styles.css` + `app.js`.
- `data/data.js` sets `window.MR4_DATA` (a global script, not fetched JSON, so it runs on `file://` and GitHub Pages).
- Event delegation on `document`; scroll position kept on re-render; detail views are a stacked overlay with Back.
- `localStorage` key `mr4c.state` = current tab, search text, filters.
- GitHub Pages from `main` at `/`; `.nojekyll` must stay at the root.
- Cache busting (rule A-cache-bust): every local script / stylesheet in `index.html` carries `?v=<content hash>`,
  stamped by the shared `../tools/app/stamp_cache.py` from `tools/build_data.py` and from `.githooks/pre-commit` on
  every commit; every image path comes from data.js with its own `?v=` (`ver()` in build_data.py), so app.js never
  hand-writes an image path. Once per clone: `git config core.hooksPath .githooks`. Never commit with `--no-verify`.

## Data
`python tools/build_data.py --strict` regenerates `data/data.js` and `assets/mon/` from the local-only datamine
(`../_mr4_extract`, never committed here). Monster images are our own Blender renders of the game's 3D models
(MR4 has no 2D monster portraits). Each species has an `img` provenance tag (`render:<file>` or `none:<reason>`);
`--strict` fails on missing renders, render/name mismatches, dangling ids, or image paths not on disk.
Image resizing uses Lanczos (no AI upscalers). The full image pass took ~20 min on 2026-11-08 (PC busy): run it
through Task Scheduler; `--no-images` rebuilds data.js alone in seconds.

Icons and item pictures come from the extract's code-backed icon map (`_mr4_extract/tools/icon_map.py`, extract
APP.md § Icon map): technique pictograms (breed set + slot; the three Ape variants use their own set), element,
category and monster type icons, range names. Items are 3D models in the game, so item pictures are our renders
(`_mr4_extract/tools/item_renders.py`, task MR4_item_renders); the 2 Envelopes and the "(NONE)" fillers have no model.
Every shipped icon / picture path is checked on disk (`--strict`).

Field notes: lifespan is in the game's life points (10-15 lost per week); stat grades are the raw species values;
technique categories have no name text in the game, so only their icon is shown.
