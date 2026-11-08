# MR4 Companion

Encyclopedia for **Monster Rancher 4** (PS2, Tecmo 2003): monsters, techniques, items and tournaments.

## Architecture
- Vanilla JS, no framework, no build step for the app: `index.html` + `styles.css` + `app.js`.
- `data/data.js` sets `window.MR4_DATA` (a global script, not fetched JSON, so it runs on `file://` and GitHub Pages).
- Event delegation on `document`; scroll position kept on re-render; detail views are a stacked overlay with Back.
- `localStorage` key `mr4c.state` = current tab, search text, filters.
- GitHub Pages from `main` at `/`; `.nojekyll` must stay at the root.

## Data
`python tools/build_data.py --strict` regenerates `data/data.js` and `assets/mon/` from the local-only datamine
(`../_mr4_extract`, never committed here). Monster images are our own Blender renders of the game's 3D models
(MR4 has no 2D monster portraits). Each species has an `img` provenance tag (`render:<file>` or `none:<reason>`);
`--strict` fails on missing renders, render/name mismatches, dangling ids, or image paths not on disk.
Image resizing uses Lanczos (no AI upscalers).

Field notes: lifespan is in the game's life points (10-15 lost per week); stat grades are the raw species values;
technique element and category are not shown because their player-facing names are not decoded yet.
