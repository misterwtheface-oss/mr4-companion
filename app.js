(() => {
  'use strict';
  const D = window.MR4_DATA;
  // bosses: the 5 special-main monsters (King Shiden, Don Mudleone, Garp, Zevion x2) are not obtainable by the player
  // (never from a disc, no Book route, pure only, boss-like records; extract 05_summon § 1.7)
  // npcs: 7 normal-breed monsters the player cannot get, marked by flat 100 base stats (Dodon, Ceralino, Ayatea,
  // Millielle, Balbalo, JackInTheCho, Spartacus; all on the never-from-a-disc list, extract 05_summon § 1.5); kept in data
  // groupSkills: the 4 picture-less techniques per breed (slots 12+: Counter, a unique one, Tag Skill 1 / 2) are group /
  // special attacks, not comparable with the 12 core ones; hidden until they get a home, and left out of the bar scale
  // evo: the 93 Monster Rancher Evo imports (content mods, extract MONSTER_IMPORT.md § 6) incl. the new mains Maya / Piroro;
  // their numbers are converted proposals (src per monster), not game data yet
  const FEATURES = { bosses: false, npcs: false, groupSkills: false, evo: true };
  const isNpc = (s) => STATS.every((x) => s.base[x] === 100);
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const by = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));

  const isEvo = (x) => x.origin === 'evo';
  const BREEDS = D.breeds.filter((b) => FEATURES.evo || !isEvo(b));
  const BR = by(BREEDS);
  const TR = by(D.traits), TECH = by(D.techniques);
  const STATS = D.meta.stats;
  const ELEM = by(D.meta.elements), CAT = by(D.meta.categories), MTYPE = by(D.meta.monTypes);
  const SPECIAL = 'x';   // the 5 event monsters with no main breed
  // Apes: main breed Garu (0x1A) with sub 0x23..0x25 in the game; their own faces, technique names and pictures, Garu's
  // technique stats (Mon_SkillRecord by main) -> their own group here
  const APE = 'ape', GARU = 26, isApe = (s) => s.main === GARU && s.sub >= 35 && s.sub <= 37;
  const breedName = (k) => (k === SPECIAL ? 'Special' : k === APE ? 'Ape' : BR[k]?.name ?? '');
  const groupOf = (s) => (s.main == null ? SPECIAL : isApe(s) ? APE : s.main);

  // monsters per main breed: pure breed first, then by sub breed
  const members = {};
  D.species.filter((s) => (FEATURES.npcs || !isNpc(s)) && (FEATURES.evo || !isEvo(s))).forEach((s) => (members[groupOf(s)] ||= []).push(s));
  Object.values(members).forEach((l) => l.sort((a, b) =>
    (b.sub === b.main) - (a.sub === a.main) || (a.sub ?? 99) - (b.sub ?? 99) || a.id - b.id));
  const techsOf = (k) => (k === APE
    ? techsOf(GARU).map((t) => ({ ...t, name: t.nameApe ?? t.name, icon: t.iconApe ?? t.icon }))
    : D.techniques.filter((t) => t.genus === +k && (FEATURES.groupSkills || t.slot < 12)).sort((a, b) => a.slot - b.slot));
  const groupIcon = (k) => (k === SPECIAL ? D.meta.specialIcon : k === APE ? members[APE][0].faces[0] : BR[k].icon);

  // ---- state (localStorage mr4c.state) ----
  const KEY = 'mr4c.state';
  const st = Object.assign({ view: 'mons' }, JSON.parse(localStorage.getItem(KEY) || '{}'));
  const save = () => localStorage.setItem(KEY, JSON.stringify({ view: st.view }));

  // ---- shared pieces ----
  const monImg = (s, small) => s?.img.startsWith('render:')
    ? `<img src="${s.pic[small ? 1 : 0]}" alt="" loading="lazy">`
    : '<div class="noimg">?</div>';
  const ico = (src, cls = 'ico', title = '') => src ? `<img class="${cls}" src="${src}" alt="${esc(title)}" title="${esc(title)}">` : '';
  const TX = D.meta.texts, RANK_IMG = D.meta.rankIcons;
  // breed emblem: the game's face on a CSS disc + ring (after the game's res 0x8B blue disc and gold ring)
  // Evo emblems (Maya, Piroro) carry their own disc + ring: class evo drops the CSS ones
  const emblem = (src, title = '', cls = 'emb') => src
    ? `<span class="${cls}${src.includes('icon/evo/') ? ' evo' : ''}" title="${esc(title)}"><img src="${src}" alt="${esc(title)}"></span>` : '';
  // main x sub emblems (faces per monster from the game's rule: Ape variants, special mains, "?" subs)
  const pair = (s) => `<span class="pair">${emblem(s.faces[0], breedName(s.main ?? SPECIAL), 'emb sm')}` +
    `<i class="x" aria-hidden="true"></i>${emblem(s.faces[1], BR[s.sub]?.name ?? '', 'emb sm')}</span>`;

  const typeBadge = (s) => MTYPE[s.type] ? `<span class="iv">${ico(MTYPE[s.type].icon, 'badge', MTYPE[s.type].name)}${esc(MTYPE[s.type].name)}</span>` : '';

  // ---- main page: breed emblems ----
  function renderHome() {
    const keys = BREEDS.flatMap((b) => (b.id === GARU && members[APE] ? [b.id, APE] : [b.id]))
      .concat(FEATURES.bosses && members[SPECIAL] ? [SPECIAL] : []);
    $('#view').innerHTML = `<div class="emblems">${keys.map((k) =>
      `<button class="emblem" data-breed="${k}">${emblem(groupIcon(k), breedName(k))}` +
      `<b>${esc(breedName(k))}</b></button>`).join('')}</div>`;
  }

  // ---- breed overlay ----
  // magnitude bars (rule A-magnitude-bars, relative form: user 2026-11-08): each value placed between the lowest and the
  // highest value of that same field among the entries the app shows (hidden NPCs / bosses excluded); the lowest keeps
  // a sliver (BAR_FLOOR %) so it reads as "lowest", not empty; the highest is full
  const BAR_FLOOR = 6;
  const magMax = (items, keys, get) => Object.fromEntries(keys.map((k) => {
    const v = items.map((it) => get(it, k));
    return [k, { lo: Math.min(...v), hi: Math.max(...v) }];
  }));
  const magBar = (v, r, cls) => {
    const w = r.hi > r.lo ? BAR_FLOOR + (100 - BAR_FLOOR) * (v - r.lo) / (r.hi - r.lo) : 100;
    return `<div class="bar ${cls}"><i style="width:${Math.round(w)}%"></i></div>`;
  };
  const shownGroups = Object.keys(members).filter((k) => k !== SPECIAL || FEATURES.bosses);
  const statMax = magMax(shownGroups.flatMap((k) => members[k]), [...STATS, 'lifespan'], (s, x) => (x === 'lifespan' ? s.lifespan : s.base[x]));
  // stat colours = the Mon info stat labels (POW red, LIF orange, INT green, ACC = SKI magenta, DEF blue, SPD cyan)
  // per stat: base, growth grade 1..9 with its training-gain % (growthPct, breed grade only, traits left out; extract MONSTER_DATA.md
  // § Growth); the modifier is not shown (always 2 x (grade - 5) on shown breeds); growth type = peak of the age curve (cmn_glow_number column)
  const GROWTH_TYPE = ['Early', 'Early-mid', 'Normal', 'Mid-late', 'Late', 'Steady'];
  const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
  // battle resists: 8 element affinities + 3 category resists, -10..10 (extract MONSTER_DATA.md § Elements); one bar
  // scale per element / category over the shown monsters
  const resMax = magMax(shownGroups.flatMap((k) => members[k]), ['e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'c0', 'c1', 'c2'],
    (s, x) => s.resist[x[0] === 'e' ? 'el' : 'cat'][+x[1]]);
  const resCell = (src, title, v, key, cls) => `${ico(src, 'ico', title)}<b>${signed(v)}</b>${magBar(v, resMax[key], cls)}`;
  const resists = (s) => `<div class="mres"><div class="rgrid">` +
    s.resist.el.map((v, i) => resCell(ELEM[i + 1].icon, ELEM[i + 1].name, v, 'e' + i, `el-${i + 1}`)).join('') +
    `</div><div class="rgrid rcat">${s.resist.cat.map((v, i) => resCell(CAT[i + 1].icon, '', v, 'c' + i, 'cat')).join('')}</div></div>`;
  // stats panel (monster rows and the monster page): per stat label, base, bar, growth grade, gain %; then lifespan + growth type
  const stats = (s) => `<div class="mstats">` +
    STATS.map((x) => `<i class="s-${x}">${x}</i><b>${s.base[x]}</b>${magBar(s.base[x], statMax[x], `s-${x}`)}` +
      `<span class="g g${s.grade[x]}${s.src?.grade === 'proposal' ? ' prop' : ''}">${s.grade[x]}</span>` +
      `<span class="gp${s.growthPct[x] > 0 ? ' up' : s.growthPct[x] < 0 ? ' dn' : ''}">${signed(s.growthPct[x])}%</span>`).join('') +
    `<div class="mlife"><i>Lifespan</i><b>${s.lifespan}</b>${magBar(s.lifespan, statMax.lifespan, 'life')}` +
    `<span>${GROWTH_TYPE[s.growthType] ?? s.growthType}</span></div></div>`;
  const nameBand = (s) => `<b class="box-hr"><span class="tt bname">${esc(s.name)}</span>${isEvo(s) ? '<span class="evo">Evo</span>' : ''}${typeBadge(s)}</b>`;
  // one box: header band (emblems | name, monster type at the right) over the body (render | stats); a tap opens the monster page
  const monRow = (s) =>
    `<div class="box mrow" data-mon="${s.id}"><div class="box-hl">${pair(s)}</div>${nameBand(s)}` +
    `<div class="box-l mrow-pic">${monImg(s)}</div><div class="mrow-m">${stats(s)}</div></div>`;

  // techniques: one box per technique, in slot order
  const RANGE_C = ['#f47468', '#f47468', '#f4dc64', '#f4dc64', '#78ec80', '#78ec80', '#78ec80', '#78ec80', '#78ec80'];
  // the four rate boxes of the game's technique page, in its label colours; letters = cmn_waza_rank (E..S)
  const RATES = [['damage', 'Life Damage', 'r-life'], ['withering', 'Guts Damage', 'r-guts'],
    ['sharpness', 'Critical Hit Rate', 'r-crit'], ['hit', 'Accuracy Rate', 'r-acc']];
  // techniques shown = the shown groups' sets (Ape shares Garu's numbers)
  const rateMax = magMax(shownGroups.filter((k) => k !== APE).flatMap((k) => techsOf(k)), ['guts', ...RATES.map(([k]) => k)], (t, k) => t[k]);
  const techRow = (t) => {
    const e = ELEM[t.element], c = CAT[t.category];
    const type = t.type === 0 ? `<span class="tt t-pow">${esc(TX.pow)}</span>` : t.type === 1 ? `<span class="tt t-int">${esc(TX.int)}</span>` : '';
    const range = t.range != null ? `<span class="tt" style="--c1:${RANGE_C[t.range]};--c2:${RANGE_C[t.range + 1]}">${esc(D.meta.ranges[t.range])}</span>` : '';
    // same box as a monster row: header band (pictogram | name) over the body (category + element, type, range,
    // Added Effects | guts cost, the four rates)
    return `<div class="box tcard"><div class="box-hl">${ico(t.icon, 'waza', t.name)}</div><b class="box-hr"><span class="tt bname">${esc(t.name)}</span></b>` +
      `<div class="box-l tc-l"><span class="tc-i">${ico(c?.icon, 'ico')}${ico(e?.icon, 'ico', e?.name)}</span>${type}${range}` +
      (t.effect && t.effect !== 'NONE' ? `<span class="tc-s">${esc(TX.effects)}<b>${esc(t.effect)}</b></span>` : '') + '</div>' +
      // guts cost: own bar, no E..S letter in the game
      `<div class="tc-r"><div class="rates"><i class="r-cost">Guts Cost</i>${magBar(t.guts, rateMax.guts, 'r-cost')}<b>${t.guts}</b><span></span>${RATES.map(([k, label, cls]) => `<i class="${cls}">${label}</i>` +
        magBar(t[k], rateMax[k], cls) +
        `<b>${t[k]}</b><img src="${RANK_IMG['EDCBAS'[t.rank[k]]]}" alt="${'EDCBAS'[t.rank[k]]}">`).join('')}</div></div></div>`;
  };

  // monster page (#b/<breed>/m/<id>, user 2026-11-10): hero box (emblems | name, big render, Book description), then
  // Stats, Resists, Traits (the game's effect text) and the full Starting Techniques boxes
  const sec = (title, body) => `<h3 class="mp-h">${title}</h3>${body}`;
  const monPage = (s) =>
    `<div class="box mp-hero"><div class="box-hl">${pair(s)}</div>${nameBand(s)}` +
    `<div class="mp-pic mrow-pic">${monImg(s)}</div>${s.desc ? `<p class="mp-desc">${esc(s.desc)}</p>` : ''}</div>` +
    sec('Stats', `<div class="box mp-one"><div class="mrow-m">${stats(s)}</div></div>`) +
    sec('Resists', `<div class="box mp-one"><div class="mrow-m">${resists(s)}</div></div>`) +
    (s.traits.length ? sec('Traits', `<div class="mlist">${s.traits.map((t) =>
      `<div class="box mp-one mp-trait"><div class="box-h"><span class="tt bname">${esc(TR[t]?.name)}</span></div>` +
      `<p>${esc(TR[t]?.desc)}</p></div>`).join('')}</div>`) : '') +
    (s.startTechs.length ? sec('Starting Techniques', `<div class="mlist">${s.startTechs.map((t) => techRow(TECH[t])).join('')}</div>`) : '');

  const BREED_VIEWS = {
    mons: { label: 'Monsters', body: (k) => `<div class="mlist">${members[k].map(monRow).join('')}</div>` },
    techs: {
      label: 'Techniques',
      // one box per technique
      body(k) {
        return `<div class="mlist">${techsOf(k).map(techRow).join('')}</div>`;
      },
    },
  };

  const open = { breed: null, mon: null, scroll: {} };
  function showBreed() {
    const k = open.breed;
    if (k == null) { $('#overlay').hidden = true; document.body.style.overflow = ''; return; }
    if (open.mon != null) {   // monster page: title = back to the breed, opens at the top
      $('#sheet-title').innerHTML = `<button class="mp-back" data-act="back">${esc(breedName(k))}</button>`;
      $('#seg').innerHTML = '';
      $('#sheet-body').innerHTML = monPage(open.mon);
      $('#sheet-body').scrollTop = 0;
      $('#overlay').hidden = false;
      document.body.style.overflow = 'hidden';
      return;
    }
    const views = k === SPECIAL ? ['mons'] : Object.keys(BREED_VIEWS);
    const v = views.includes(st.view) ? st.view : 'mons';
    $('#sheet-title').textContent = breedName(k);
    $('#seg').innerHTML = views.length < 2 ? '' : views.map((x) =>
      `<button data-view="${x}" class="${x === v ? 'on' : ''}">${BREED_VIEWS[x].label}</button>`).join('');
    $('#sheet-body').innerHTML = BREED_VIEWS[v].body(k);
    $('#sheet-body').scrollTop = open.scroll[k + v] || 0;
    $('#overlay').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  // ---- routing: #b/<breed>[/m/<monster>] so the phone's Back button steps back (monster page -> breed -> main page) ----
  let depth = 0;   // history entries this app pushed (0..2)
  function route() {
    const m = location.hash.match(/^#b\/(\d+|x|ape)(?:\/m\/(\d+))?$/);
    if (open.breed != null && open.mon == null) open.scroll[open.breed + st.view] = $('#sheet-body').scrollTop;
    const g = m && m[1];
    open.breed = g === APE && members[APE] ? APE : g === SPECIAL && FEATURES.bosses ? SPECIAL : g && BR[g] ? +g : null;
    open.mon = (open.breed != null && m[2] && members[open.breed].find((s) => s.id === +m[2])) || null;
    depth = Math.min(depth, open.mon ? 2 : open.breed != null ? 1 : 0);
    showBreed();
  }
  const go = (hash) => {   // to a shallower level: Back through our own entries, else replace
    const up = depth - (hash ? (hash.includes('/m/') ? 2 : 1) : 0);
    if (up > 0 && depth >= up) return history.go(-up);   // hashchange -> route()
    history.replaceState(null, '', hash ? '#' + hash : location.pathname + location.search);
    route();
  };
  const close = () => go('');
  const back = () => go('b/' + open.breed);

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-breed]');
    if (b) { depth = 1; location.hash = 'b/' + b.dataset.breed; return; }
    const mr = e.target.closest('[data-mon]');
    if (mr) { depth++; location.hash = `b/${open.breed}/m/${mr.dataset.mon}`; return; }
    if (e.target.closest('[data-act="back"]')) return back();
    const v = e.target.closest('[data-view]');
    if (v) {
      open.scroll[open.breed + st.view] = $('#sheet-body').scrollTop;
      st.view = v.dataset.view; save(); showBreed(); return;
    }
    if (e.target.closest('[data-act="close"]') || e.target.id === 'overlay') close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open.breed != null) (open.mon ? back() : close()); });
  window.addEventListener('hashchange', route);

  renderHome();
  route();
})();
