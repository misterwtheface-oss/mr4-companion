(() => {
  'use strict';
  const D = window.MR4_DATA;
  // bosses: the 5 special-main monsters (King Shiden, Don Mudleone, Garp, Zevion x2) are not obtainable by the player
  // (never from a disc, no Book route, pure only, boss-like records; extract 05_summon § 1.7)
  // npcs: 7 normal-breed monsters the player cannot get, marked by flat 100 base stats (Dodon, Ceralino, Ayatea,
  // Millielle, Balbalo, JackInTheCho, Spartacus; all on the never-from-a-disc list, extract 05_summon § 1.5); kept in data
  // groupSkills: the 4 picture-less techniques per breed (slots 12+: Counter, a unique one, Tag Skill 1 / 2) are group /
  // special attacks, not comparable with the 12 core ones; hidden until they get a home, and left out of the bar scale
  const FEATURES = { bosses: false, npcs: false, groupSkills: false };
  const isNpc = (s) => STATS.every((x) => s.base[x] === 100);
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const by = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));

  const BR = by(D.breeds);
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
  D.species.filter((s) => FEATURES.npcs || !isNpc(s)).forEach((s) => (members[groupOf(s)] ||= []).push(s));
  Object.values(members).forEach((l) => l.sort((a, b) =>
    (b.sub === b.main) - (a.sub === a.main) || (a.sub ?? 99) - (b.sub ?? 99) || a.id - b.id));
  const pureOf = (k) => (k === APE ? members[APE][0] : members[k].find((s) => s.sub === s.main));
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
  const emblem = (src, title = '', cls = 'emb') => src
    ? `<span class="${cls}" title="${esc(title)}"><img src="${src}" alt="${esc(title)}"></span>` : '';
  // main x sub emblems (faces per monster from the game's rule: Ape variants, special mains, "?" subs)
  const pair = (s) => `<span class="pair">${emblem(s.faces[0], breedName(s.main ?? SPECIAL), 'emb sm')}` +
    `<i class="x" aria-hidden="true"></i>${emblem(s.faces[1], BR[s.sub]?.name ?? '', 'emb sm')}</span>`;

  const typeBadge = (s) => MTYPE[s.type] ? `<span class="iv">${ico(MTYPE[s.type].icon, 'badge', MTYPE[s.type].name)}${esc(MTYPE[s.type].name)}</span>` : '';

  // ---- main page: breed emblems ----
  function renderHome() {
    const keys = D.breeds.flatMap((b) => (b.id === GARU && members[APE] ? [b.id, APE] : [b.id]))
      .concat(FEATURES.bosses && members[SPECIAL] ? [SPECIAL] : []);
    $('#view').innerHTML = `<div class="emblems">${keys.map((k) =>
      `<button class="emblem" data-breed="${k}">${emblem(groupIcon(k), breedName(k))}` +
      `<b>${esc(breedName(k))}</b></button>`).join('')}</div>`;
  }

  // ---- breed overlay ----
  // magnitude bars (rule A-magnitude-bars): each value as a share of the largest value of that same field among the
  // entries the app shows (hidden NPCs / bosses excluded), so one entry alone reads as its standing on that field
  const magMax = (items, keys, get) => Object.fromEntries(keys.map((k) => [k, Math.max(...items.map((it) => get(it, k)))]));
  const magBar = (v, max, cls) => `<div class="bar ${cls}"><i style="width:${Math.round(v / max * 100)}%"></i></div>`;
  const shownGroups = Object.keys(members).filter((k) => k !== SPECIAL || FEATURES.bosses);
  const statMax = magMax(shownGroups.flatMap((k) => members[k]), STATS, (s, x) => s.base[x]);
  // stat colours = the Mon info stat labels (POW red, LIF orange, INT green, ACC = SKI magenta, DEF blue, SPD cyan)
  const monRow = (s) =>
    `<div class="mrow"><div class="mrow-h">${pair(s)}<b>${esc(s.name)}</b></div>` +
    `<div class="mrow-b"><div class="mrow-pic">${monImg(s)}</div><div class="mrow-m"><div class="mstats">` +
    STATS.map((x) => `<i class="s-${x}">${x}</i><b>${s.base[x]}</b>${magBar(s.base[x], statMax[x], `s-${x}`)}` +
      `<span class="g g${s.grade[x]}">${s.grade[x]}</span>`).join('') +
    '</div></div></div></div>';

  // techniques: pictogram grid by slot (as the game's Skills page), detail card for the selected one
  const RANGE_C = ['#f47468', '#f47468', '#f4dc64', '#f4dc64', '#78ec80', '#78ec80', '#78ec80', '#78ec80', '#78ec80'];
  // the four rate boxes of the game's technique page, in its label colours; letters = cmn_waza_rank (E..S)
  const RATES = [['damage', 'Life Damage', 'r-life'], ['withering', 'Guts Damage', 'r-guts'],
    ['sharpness', 'Critical Hit Rate', 'r-crit'], ['hit', 'Accuracy Rate', 'r-acc']];
  // techniques shown = the shown groups' sets (Ape shares Garu's numbers)
  const rateMax = magMax(shownGroups.filter((k) => k !== APE).flatMap((k) => techsOf(k)), ['guts', ...RATES.map(([k]) => k)], (t, k) => t[k]);
  const skillGrid = (techs, sel) => `<div class="wgrid">${techs.filter((t) => t.slot < 12).map((t) =>
    `<button class="wcell${t === sel ? ' on' : ''}" data-tech="${t.id}" style="grid-area:${Math.floor(t.slot / 4) + 1}/${t.slot % 4 + 1}">` +
    `${ico(t.icon, 'waza', t.name)}</button>`).join('')}</div>`;
  const extraTechs = (techs, sel) => techs.filter((t) => t.slot >= 12).map((t) =>
    `<button class="xtech${t === sel ? ' on' : ''}" data-tech="${t.id}">${esc(t.name)}</button>`).join('');
  const techDetail = (t) => {
    const e = ELEM[t.element], c = CAT[t.category];
    const type = t.type === 0 ? `<span class="tt t-pow">${esc(TX.pow)}</span>` : t.type === 1 ? `<span class="tt t-int">${esc(TX.int)}</span>` : '';
    const range = t.range != null ? `<span class="tt" style="--c1:${RANGE_C[t.range]};--c2:${RANGE_C[t.range + 1]}">${esc(D.meta.ranges[t.range])}</span>` : '';
    return `<div class="tcard"><div class="tc-h">${ico(t.icon, 'waza', t.name)}<div class="tc-n"><b>${esc(t.name)}</b>` +
      `<div class="tc-m">${type}${range}</div></div><span class="tc-i">${ico(c?.icon, 'ico')}${ico(e?.icon, 'ico', e?.name)}</span></div>` +
      (t.effect && t.effect !== 'NONE' ? `<div class="tc-s"><span>${esc(TX.effects)} <b>${esc(t.effect)}</b></span></div>` : '') +
      // guts cost: own bar, no E..S letter in the game
      `<div class="rates"><i class="r-cost">Guts Cost</i>${magBar(t.guts, rateMax.guts, 'r-cost')}<b>${t.guts}</b><span></span>${RATES.map(([k, label, cls]) => `<i class="${cls}">${label}</i>` +
        magBar(t[k], rateMax[k], cls) +
        `<b>${t[k]}</b><img src="${RANK_IMG['EDCBAS'[t.rank[k]]]}" alt="${'EDCBAS'[t.rank[k]]}">`).join('')}</div></div>`;
  };

  const BREED_VIEWS = {
    mons: { label: 'Monsters', body: (k) => `<div class="mlist">${members[k].map(monRow).join('')}</div>` },
    breed: {
      label: 'Breed',
      body(k) {
        const pure = pureOf(k), techs = techsOf(k), sel = techs.find((t) => t.id === open.tech[k]) || techs[0];
        return `<div class="sec"><h3>Type</h3>${typeBadge(pure)}</div>` +
          `<div class="sec waza-page" data-k="${k}"><h3>${esc(TX.skills)}</h3><div class="skills">${skillGrid(techs, sel)}</div>` +
          `<div class="xtechs">${extraTechs(techs, sel)}</div><div class="tdetail">${sel ? techDetail(sel) : ''}</div></div>`;
      },
    },
  };

  const open = { breed: null, scroll: {}, tech: {} };
  // select a technique in place (no re-render of the sheet: keeps the scroll position)
  function pickTech(id) {
    const page = $('.waza-page');
    if (!page) return;
    const k = page.dataset.k === APE ? APE : +page.dataset.k, techs = techsOf(k), t = techs.find((x) => x.id === id);
    if (!t) return;
    open.tech[k] = id;
    page.querySelector('.skills').innerHTML = skillGrid(techs, t);
    page.querySelector('.xtechs').innerHTML = extraTechs(techs, t);
    page.querySelector('.tdetail').innerHTML = techDetail(t);
  }
  function showBreed() {
    const k = open.breed;
    if (k == null) { $('#overlay').hidden = true; document.body.style.overflow = ''; return; }
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

  // ---- routing: #b/<breed> so the phone's Back button closes the overlay ----
  let pushed = false;
  function route() {
    const m = location.hash.match(/^#b\/(\d+|x|ape)$/);
    if (open.breed != null) open.scroll[open.breed + st.view] = $('#sheet-body').scrollTop;
    const g = m && m[1];
    open.breed = g === APE && members[APE] ? APE : g === SPECIAL && FEATURES.bosses ? SPECIAL : g && BR[g] ? +g : null;
    if (open.breed == null) pushed = false;
    showBreed();
  }
  const close = () => {
    if (pushed) return history.back();   // hashchange -> route()
    history.replaceState(null, '', location.pathname + location.search);
    route();
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-breed]');
    if (b) { pushed = true; location.hash = 'b/' + b.dataset.breed; return; }
    const tb = e.target.closest('[data-tech]');
    if (tb) { pickTech(+tb.dataset.tech); return; }
    const v = e.target.closest('[data-view]');
    if (v) {
      open.scroll[open.breed + st.view] = $('#sheet-body').scrollTop;
      st.view = v.dataset.view; save(); showBreed(); return;
    }
    if (e.target.closest('[data-act="close"]') || e.target.id === 'overlay') close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open.breed != null) close(); });
  window.addEventListener('hashchange', route);

  renderHome();
  route();
})();
