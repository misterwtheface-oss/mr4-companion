(() => {
  'use strict';
  const D = window.MR4_DATA;
  const FEATURES = {};
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const by = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));

  const BR = by(D.breeds);
  const STATS = D.meta.stats;
  const ELEM = by(D.meta.elements), CAT = by(D.meta.categories), MTYPE = by(D.meta.monTypes);
  const SPECIAL = 'x';   // the 5 event monsters with no main breed
  const breedName = (k) => (k === SPECIAL ? 'Special' : BR[k]?.name ?? '');

  // monsters per main breed: pure breed first, then by sub breed
  const members = {};
  D.species.forEach((s) => (members[s.main ?? SPECIAL] ||= []).push(s));
  Object.values(members).forEach((l) => l.sort((a, b) =>
    (b.sub === b.main) - (a.sub === a.main) || (a.sub ?? 99) - (b.sub ?? 99) || a.id - b.id));
  const pureOf = (k) => members[k].find((s) => s.sub === s.main);
  const techsOf = (k) => D.techniques.filter((t) => t.genus === +k).sort((a, b) => a.slot - b.slot);

  // ---- state (localStorage mr4c.state) ----
  const KEY = 'mr4c.state';
  const st = Object.assign({ view: 'mons' }, JSON.parse(localStorage.getItem(KEY) || '{}'));
  const save = () => localStorage.setItem(KEY, JSON.stringify({ view: st.view }));

  // ---- shared pieces ----
  const monImg = (s, small) => s?.img.startsWith('render:')
    ? `<img src="${s.pic[small ? 1 : 0]}" alt="" loading="lazy">`
    : '<div class="noimg">?</div>';
  const ico = (src, cls = 'ico', title = '') => src ? `<img class="${cls}" src="${src}" alt="${esc(title)}" title="${esc(title)}">` : '';
  // ---- game panels: backgrounds composed from MR4's own layout parts (extract tools/layouts.py), content placed in
  // the boxes where the game draws it; sizes are panel pixels, so everything scales with the panel width ----
  const PN = D.meta.panels, PT = D.meta.panelTex, TX = D.meta.texts;
  const pc = (v, t) => `${(v / t * 100).toFixed(3)}%`;
  const panel = (name, inner, cls = '') => `<div class="pnl pnl-${name} ${cls}" style="--pw:${PN[name].w};aspect-ratio:${PN[name].w}/${PN[name].h}">` +
    `<img class="pnl-bg" src="${PN[name].img}" alt="">${inner}</div>`;
  const at = (name, [x, y, w, h], html, cls = '', tag = 'div', attrs = '') => {
    const p = PN[name];
    return `<${tag} class="at ${cls}" ${attrs} style="left:${pc(x, p.w)};top:${pc(y, p.h)};width:${pc(w, p.w)};height:${pc(h, p.h)}">${html}</${tag}>`;
  };
  // game text: two-colour vertical gradient (Text_Draw colour pairs, PS2 0x80 = full); --fs in panel pixels
  const gt = (txt, fs, c1 = '#fff', c2 = '#808080', cls = '') =>
    `<span class="gt ${cls}" style="--fs:${fs};--c1:${c1};--c2:${c2}">${esc(txt)}</span>`;
  const shift = (box, i, pitch) => [box[0] + (i % 4) * pitch[0], box[1] + Math.floor(i / 4) * pitch[1], box[2], box[3]];

  // breed emblem on the Mon info name plate: face on the gold bar, name in the blue band
  const plate = (k) => panel('plate',
    at('plate', PN.plate.slots.face, ico(k === SPECIAL ? D.meta.specialIcon : BR[k].icon, 'face', breedName(k))) +
    at('plate', PN.plate.slots.name, gt(breedName(k), 12), 'mid'));
  // Mon info breed row: main face x sub face, monster name in the dark bar
  const breedRow = (s) => {
    const S = PN.breedrow.slots;   // faces: FUN_00296a30 picks (Ape variants, special mains, "?" subs), data build
    return panel('breedrow', at('breedrow', S.main, ico(s.faces[0], 'face', breedName(s.main ?? SPECIAL))) +
      at('breedrow', S.sub, ico(s.faces[1], 'face', BR[s.sub]?.name ?? '')) +
      at('breedrow', S.name, gt(s.name, 15), 'mid'));
  };

  const typeBadge = (s) => MTYPE[s.type] ? `<span class="iv">${ico(MTYPE[s.type].icon, 'badge', MTYPE[s.type].name)}${esc(MTYPE[s.type].name)}</span>` : '';

  // ---- main page: breed emblems ----
  function renderHome() {
    const keys = [...D.breeds.map((b) => b.id), ...(members[SPECIAL] ? [SPECIAL] : [])];
    $('#view').innerHTML = `<div class="emblems">${keys.map((k) =>
      `<button class="emblem" data-breed="${k}" aria-label="${esc(breedName(k))}">${plate(k)}</button>`).join('')}</div>`;
  }

  // ---- breed overlay ----
  const monRow = (s, k) => {
    return `<div class="mrow">${breedRow(s)}<div class="mrow-b"><div class="mrow-pic">${monImg(s)}</div><div class="mrow-m"><div class="mstats">` +
      STATS.map((x) => `<i>${x}</i><b>${s.base[x]}</b><div class="bar"><i style="width:${Math.min(100, s.base[x] / 3)}%"></i></div>` +
        `<span class="g g${s.grade[x]}">${s.grade[x]}</span>`).join('') +
      '</div></div></div></div>';
  };
  // Mon info technique page: "Skills" grid (layout 20; slot n = tile n, picture = MON_WZP set + slot) and the detail
  // box under it (layout 21, FUN_0011c998). Slots 12-15 (Counter, finisher, tag skills) have no tile in the game.
  const skillsPanel = (techs, sel) => {
    const S = PN.skills.slots;
    return panel('skills', at('skills', S.title, gt(TX.skills, 13, '#462800', '#462800', 'flat')) +
      techs.filter((t) => t.slot < 12).map((t) =>
        at('skills', shift(S.pic0, t.slot, S.pitch), ico(t.icon, 'waza', t.name)) +
        at('skills', shift(S.tile0, t.slot, S.pitch), '', 'hit', 'button', `data-tech="${t.id}" aria-label="${esc(t.name)}"`)).join('') +
      at('skills', shift(S.cursor0, sel?.slot ?? 0, S.pitch), `<img src="${PT.cursor}" alt="">`, `cursor${sel && sel.slot < 12 ? '' : ' off'}`));
  };
  // range text colours: entries r / r+1 of the table at 0x4f6e10 (top / bottom of the gradient)
  const RANGE_C = ['#f47468', '#f47468', '#f4dc64', '#f4dc64', '#78ec80', '#78ec80', '#78ec80', '#78ec80', '#78ec80'];
  const RANK_KEYS = ['damage', 'withering', 'sharpness', 'hit'];
  const techDetail = (t) => {
    const I = PN.techinfo.slots, R = PN.techranks.slots, e = ELEM[t.element], c = CAT[t.category];
    const type = t.type === 0 ? gt(TX.pow, 12, '#f0d840', '#40d450') : t.type === 1 ? gt(TX.int, 12, '#40d450', '#78ec80') : '';
    return panel('techinfo',
      at('techinfo', I.pic, ico(t.icon, 'waza', t.name)) + at('techinfo', I.name, gt(t.name, 15)) +
      at('techinfo', I.type, type) +
      at('techinfo', I.range, t.range != null ? gt(D.meta.ranges[t.range], 12, RANGE_C[t.range], RANGE_C[t.range + 1]) : '') +
      at('techinfo', I.gutsLabel, gt(TX.guts, 12)) + at('techinfo', I.guts, gt(t.guts, 12), 'end') +
      at('techinfo', I.effLabel, gt(TX.effects, 12, '#fc8034', '#fc8034')) +
      at('techinfo', I.eff, t.effect ? gt(t.effect, 12) : '') +
      at('techinfo', I.category, ico(c?.icon, 'ico')) + at('techinfo', I.element, ico(e?.icon, 'ico', e?.name))) +
      panel('techranks', RANK_KEYS.map((k) => at('techranks', R[k], `<img src="${PT['rank_' + 'EDCBAS'[t.rank[k]]]}" alt="${'EDCBAS'[t.rank[k]]}">`) +
        at('techranks', [R[k][0] - 92, R[k][1] + 7, 60, 16], gt(t[k], 11, '#9aa', '#566'))).join(''));
  };
  const extraTechs = (techs, sel) => techs.filter((t) => t.slot >= 12).map((t) =>
    `<button class="xtech${t === sel ? ' on' : ''}" data-tech="${t.id}">${esc(t.name)}</button>`).join('');

  const BREED_VIEWS = {
    mons: { label: 'Monsters', body: (k) => `<div class="mlist">${members[k].map((s) => monRow(s, k)).join('')}</div>` },
    breed: {
      label: 'Breed',
      body(k) {
        const pure = pureOf(k), techs = techsOf(k), sel = techs.find((t) => t.id === open.tech[k]) || techs[0];
        return `<div class="sec"><h3>Type</h3>${typeBadge(pure)}</div>` +
          `<div class="sec waza-page" data-k="${k}"><div class="skills">${skillsPanel(techs, sel)}</div>` +
          `<div class="xtechs">${extraTechs(techs, sel)}</div><div class="tdetail">${sel ? techDetail(sel) : ''}</div></div>`;
      },
    },
  };

  const open = { breed: null, scroll: {}, tech: {} };
  // select a technique in place (no re-render of the sheet: keeps the scroll position)
  function pickTech(id) {
    const t = D.techniques.find((x) => x.id === id), page = $('.waza-page');
    if (!t || !page) return;
    const k = page.dataset.k, techs = techsOf(k);
    open.tech[k] = id;
    page.querySelector('.skills').innerHTML = skillsPanel(techs, t);
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
    const m = location.hash.match(/^#b\/(\d+|x)$/);
    if (open.breed != null) open.scroll[open.breed + st.view] = $('#sheet-body').scrollTop;
    open.breed = m && (m[1] === SPECIAL || BR[m[1]]) ? (m[1] === SPECIAL ? SPECIAL : +m[1]) : null;
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
