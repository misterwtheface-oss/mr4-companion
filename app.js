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
  const TECH_TYPE = { 0: 'Power', 1: 'Intelligence', 6: 'Intelligence, all', 3: 'Team special', 2: 'Action', 4: 'Action', 5: 'Action' };
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
  const typeBadge = (s) => MTYPE[s.type] ? `<span class="iv">${ico(MTYPE[s.type].icon, 'badge', MTYPE[s.type].name)}${esc(MTYPE[s.type].name)}</span>` : '';

  // ---- main page: breed emblems ----
  function renderHome() {
    const keys = [...D.breeds.map((b) => b.id), ...(members[SPECIAL] ? [SPECIAL] : [])];
    $('#view').innerHTML = `<div class="emblems">${keys.map((k) =>
      `<button class="emblem" data-breed="${k}"><span class="disc">${ico(k === SPECIAL ? D.meta.specialIcon : BR[k].icon, 'face', breedName(k))}</span>` +
      `<b>${esc(breedName(k))}</b></button>`).join('')}</div>`;
  }

  // ---- breed overlay ----
  const monRow = (s, k) => {
    const sub = s.sub === s.main ? 'Pure' : (BR[s.sub]?.name ?? '');
    return `<div class="mrow"><div class="mrow-id">${monImg(s, true)}<div class="mrow-n"><b>${esc(s.name)}</b>` +
      (k === SPECIAL ? '' : `<small>${esc(sub)}</small>`) + '</div></div><div class="mstats">' +
      STATS.map((x) => `<div class="ms"><i>${x}</i><b>${s.base[x]}</b><span class="g g${s.grade[x]}">${s.grade[x]}</span></div>`).join('') +
      '</div></div>';
  };
  const techRow = (t) =>
    `<div class="trow">${ico(t.icon, 'waza') || '<span class="waza"></span>'}<div class="trow-m"><div class="row-h"><b>${esc(t.name)}</b>` +
    `<span class="row-r">${ico(ELEM[t.element]?.icon, 'ico', ELEM[t.element]?.name)}${ico(CAT[t.category]?.icon, 'ico')}` +
    `<span class="tag t${t.type}">${TECH_TYPE[t.type] ?? t.type}</span></span></div>` +
    `<div class="row-s">${t.range != null ? esc(D.meta.ranges[t.range]) + ' · ' : ''}${t.guts} guts · hit ${t.hit} · dmg ${t.damage} · wither ${t.withering}` +
    `${t.heal ? ` · heal ${t.heal}%` : ''}</div></div></div>`;

  const BREED_VIEWS = {
    mons: { label: 'Monsters', body: (k) => `<div class="mlist">${members[k].map((s) => monRow(s, k)).join('')}</div>` },
    breed: {
      label: 'Breed',
      body(k) {
        const pure = pureOf(k), techs = techsOf(k);
        return `<div class="sec"><h3>Type</h3>${typeBadge(pure)}</div>` +
          `<div class="sec"><h3>Techniques</h3><div class="list">${techs.map(techRow).join('')}</div></div>`;
      },
    },
  };

  const open = { breed: null, scroll: {} };
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
