(() => {
  'use strict';
  const D = window.MR4_DATA;
  const FEATURES = {};
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const by = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));

  const SP = by(D.species), TE = by(D.techniques), IT = by(D.items), TR = by(D.traits),
        TO = by(D.tournaments), EN = by(D.enemies), BR = by(D.breeds);
  const STATS = D.meta.stats;
  const ELEM = by(D.meta.elements), CAT = by(D.meta.categories), MTYPE = by(D.meta.monTypes);
  const APE_SUBS = [35, 36, 37];   // Garu-main Ape variants draw the extra pictogram set (extract APP.md § Icon map)
  const TECH_TYPE = { 0: 'Power', 1: 'Intelligence', 6: 'Intelligence, all', 3: 'Team special', 2: 'Action', 4: 'Action', 5: 'Action' };
  const ITEM_CAT = { consumable: 'Consumables', goods: 'Goods', facility_plan: 'Facility plans',
                     breed_catalyst: 'Catalysts', breed_stone: 'Stones' };
  const FORMAT = { league: 'League', knockout: 'Knockout', team: 'Team', team_winner_stays: 'Team, winner stays' };
  const RANKS = ['S', 'A', 'B', 'C', 'D', 'E'];
  const breedName = (i) => (i == null ? null : BR[i]?.name ?? null);
  const techsOf = (main) => D.techniques.filter((t) => t.genus === main).sort((a, b) => a.slot - b.slot);
  const likedBy = {};
  D.species.forEach((s) => (s.favItems || []).forEach((i) => (likedBy[i] ||= []).push(s.id)));
  const datesOf = {};
  D.calendar.forEach((c) => (datesOf[c.tournament] ||= []).push(c));
  const prizeOf = {};
  D.tournaments.forEach((t) => t.prizeItem != null && (prizeOf[t.prizeItem] ||= []).push(t.id));

  // ---- state (localStorage mr4c.state) ----
  const KEY = 'mr4c.state';
  const st = Object.assign({ tab: 'monsters', q: {}, f: {} }, JSON.parse(localStorage.getItem(KEY) || '{}'));
  const save = () => localStorage.setItem(KEY, JSON.stringify(st));

  // ---- shared pieces ----
  const monImg = (s, small) => s.img.startsWith('render:')
    ? `<img src="${s.pic[small ? 1 : 0]}" alt="" loading="lazy">`
    : `<div class="noimg">no render</div>`;
  const link = (kind, id, label, cls = 'chip', pre = '') =>
    `<button class="${cls}" data-open="${kind}:${id}">${pre}${esc(label)}</button>`;
  const row = (kind, id, title, right, sub, pic) =>
    `<div class="row${pic ? ' pic' : ''}" data-open="${kind}:${id}">${pic || ''}<div class="row-m"><div class="row-h"><b>${esc(title)}</b>${right || ''}</div>` +
    (sub ? `<div class="row-s">${sub}</div>` : '') + '</div></div>';
  const ico = (src, cls = 'ico', title = '') => src ? `<img class="${cls}" src="${src}" alt="${esc(title)}" title="${esc(title)}">` : '';
  const waza = (t, s) => ico(s && t.iconApe && s.main === t.genus && APE_SUBS.includes(s.sub) ? t.iconApe : t.icon, 'waza');
  const elemIco = (t) => ico(ELEM[t.element]?.icon, 'ico', ELEM[t.element]?.name);
  const itemImg = (i, small) => i.img.startsWith('render:')
    ? `<img class="${small ? 'ithumb' : ''}" src="${i.pic[small ? 1 : 0]}" alt="" loading="lazy">`
    : (small ? '<span class="ithumb"></span>' : '');
  const typeTag = (t) => `<span class="tag t${t.type}">${TECH_TYPE[t.type] ?? t.type}</span>`;
  const techLine = (t) => (t.range != null ? `${esc(D.meta.ranges[t.range])} · ` : '') + `${t.guts} guts · hit ${t.hit} · dmg ${t.damage} · wither ${t.withering}` +
    (t.heal ? ` · heal ${t.heal}%` : '');
  const section = (title, body) => body ? `<div class="sec"><h3>${title}</h3>${body}</div>` : '';
  const kv = (pairs) => `<div class="kv">${pairs.filter((p) => p[1] != null && p[1] !== '')
    .map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join('')}</div>`;
  const select = (name, opts, cur) => `<select data-f="${name}">` + opts.map(([v, l]) =>
    `<option value="${v}"${String(v) === String(cur ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('') + '</select>';
  const match = (q, ...fields) => !q || fields.some((f) => String(f ?? '').toLowerCase().includes(q.toLowerCase()));
  const groups = (list, keyOf, labelOf, render, wrap) => {
    const g = new Map();
    list.forEach((x) => { const k = keyOf(x); g.has(k) || g.set(k, []); g.get(k).push(x); });
    if (!g.size) return '<div class="empty">No matches</div>';
    return [...g].map(([k, xs]) => `<div class="group-h">${esc(labelOf(k))}</div>${wrap(xs.map(render).join(''))}`).join('');
  };

  // ---- tabs ----
  const breedOpts = [['', 'All breeds'], ...D.breeds.map((b) => [b.id, b.name]), ['x', 'Special']];
  const TABS = {
    monsters: {
      filters: () => select('breed', breedOpts, st.f.breed),
      render(q) {
        const f = st.f.breed ?? '';
        const list = D.species.filter((s) => (f === '' || (f === 'x' ? s.main == null : s.main === +f)) &&
          match(q, s.name, breedName(s.main), breedName(s.sub)))
          .sort((a, b) => (a.main ?? 99) - (b.main ?? 99) || (a.sub === a.main ? -1 : b.sub === b.main ? 1 : a.id - b.id));
        return groups(list, (s) => s.main ?? 'x', (k) => (k === 'x' ? 'Special' : breedName(k)),
          (s) => `<div class="card" data-open="mon:${s.id}">${monImg(s, true)}<b>${esc(s.name)}</b>` +
                 `<small>${esc([breedName(s.main), breedName(s.sub)].filter(Boolean).join(' / '))}</small></div>`,
          (h) => `<div class="grid">${h}</div>`);
      },
    },
    techniques: {
      filters: () => select('breed', breedOpts.slice(0, -1), st.f.breed) +
        select('type', [['', 'All types'], ['0', 'Power'], ['1', 'Intelligence'], ['x', 'Other']], st.f.type),
      render(q) {
        const f = st.f.breed ?? '', ty = st.f.type ?? '';
        const list = D.techniques.filter((t) => (f === '' || t.genus === +f) &&
          (ty === '' || (ty === 'x' ? t.type > 1 : t.type === +ty)) && match(q, t.name, breedName(t.genus)));
        return groups(list, (t) => t.genus, (k) => breedName(k) ?? `Genus ${k}`,
          (t) => row('tech', t.id, t.name, `<span class="row-r">${elemIco(t)}${typeTag(t)}</span>`, techLine(t), waza(t)),
          (h) => `<div class="list">${h}</div>`);
      },
    },
    items: {
      filters: () => select('cat', [['', 'All items'], ...Object.entries(ITEM_CAT)], st.f.cat),
      render(q) {
        const c = st.f.cat ?? '';
        const list = D.items.filter((i) => i.name && (c === '' || i.category === c) && match(q, i.name, i.desc));
        return groups(list, (i) => i.category, (k) => ITEM_CAT[k] ?? k,
          (i) => row('item', i.id, i.name, i.price ? `<span class="tag">${i.price} G</span>` : '', esc(i.desc), itemImg(i, true)),
          (h) => `<div class="list">${h}</div>`);
      },
    },
    tournaments: {
      filters: () => select('rank', [['', 'All ranks'], ...RANKS.map((r) => [r, 'Rank ' + r])], st.f.rank),
      render(q) {
        const r = st.f.rank ?? '';
        const list = D.tournaments.filter((t) => (r === '' || t.rank === r) && match(q, t.name))
          .sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) || a.id - b.id);
        return groups(list, (t) => t.rank, (k) => 'Rank ' + k,
          (t) => row('tour', t.id, t.name, `<span class="tag">${FORMAT[t.format] ?? t.format}</span>`,
            `${t.entrants} entrants · ${t.prizeMoney[0]} G` + (dates(t.id) ? ' · ' + dates(t.id) : '')),
          (h) => `<div class="list">${h}</div>`);
      },
    },
  };
  const dates = (id) => (datesOf[id] || []).map((c) => `M${c.month} W${c.week}`).join(', ');

  // ---- detail sheets ----
  const DETAIL = {
    mon(s) {
      const stats = `<table class="stats"><thead><tr><th></th><th>Base</th><th></th><th>Grade</th><th>Growth</th></tr></thead><tbody>` +
        STATS.map((k) => `<tr><td>${D.meta.statNames[k]}</td><td>${s.base[k]}</td>` +
          `<td><div class="bar"><i style="width:${Math.min(100, s.base[k] / 3)}%"></i></div></td>` +
          `<td>${s.grade[k]}</td><td class="${s.growthMod[k] < 0 ? 'neg' : s.growthMod[k] > 0 ? 'pos' : ''}">` +
          `${s.growthMod[k] > 0 ? '+' : ''}${s.growthMod[k]}</td></tr>`).join('') + '</tbody></table>';
      const techs = s.main == null ? '' : techsOf(s.main).map((t) =>
        link('tech', t.id, t.name, (s.startTechs || []).includes(t.id) ? 'chip start' : 'chip', waza(t, s))).join('');
      return {
        title: s.name,
        body: `<div class="hero">${monImg(s)}<div><h2>${esc(s.name)}</h2><div class="sub">` +
          `${s.main != null ? link('breed', s.main, breedName(s.main), 'chip') : ''}` +
          `${s.sub !== s.main && breedName(s.sub) ? ' / ' + esc(breedName(s.sub)) : ''}</div>` +
          kv([['Type', MTYPE[s.type] ? `<span class="iv">${ico(MTYPE[s.type].icon, 'badge', MTYPE[s.type].name)}${esc(MTYPE[s.type].name)}</span>` : null],
              ['Life points', s.lifespan], ['Growth type', s.growthType]]) + '</div></div>' +
          section('Stats', stats) +
          section('Traits', (s.traits || []).map((i) => `<div><b>${esc(TR[i].name)}</b> <span class="desc">${esc(TR[i].desc)}</span></div>`).join('')) +
          section('Favourite items', `<div class="chips">${(s.favItems || []).map((i) => link('item', i, IT[i].name)).join('')}</div>`) +
          section('Techniques', techs && `<div class="chips">${techs}</div>`) +
          section('Shrine (Book)', s.book && `<div class="chips">${s.book.map((r) => `<span class="tag">${esc(r)}</span>`).join('')}</div>`),
      };
    },
    breed(id) {
      const list = D.species.filter((s) => s.main === id);
      return { title: breedName(id), body: `<div class="grid">${list.map((s) =>
        `<div class="card" data-open="mon:${s.id}">${monImg(s, true)}<b>${esc(s.name)}</b><small>${esc(breedName(s.sub) ?? '')}</small></div>`).join('')}</div>` };
    },
    tech(t) {
      const users = D.species.filter((s) => s.main === t.genus);
      const start = users.filter((s) => (s.startTechs || []).includes(t.id));
      return {
        title: t.name,
        body: `<div class="row-h"><h2 style="margin:0">${waza(t)}${esc(t.name)}</h2>${typeTag(t)}</div>` +
          kv([['Breed', link('breed', t.genus, breedName(t.genus), 'chip')],
              ['Element', ELEM[t.element] ? `<span class="iv">${elemIco(t)}${esc(ELEM[t.element].name)}</span>` : null],
              ['Category', CAT[t.category]?.icon ? ico(CAT[t.category].icon) : null],
              ['Range', t.range != null ? esc(D.meta.ranges[t.range]) : null], ['Guts', t.guts], ['Hit', t.hit + '%'],
              ['Damage', t.damage], ['Withering', t.withering], ['Sharpness', t.sharpness],
              ['Heal', t.heal ? t.heal + '% life' : null], ['Follow-up', t.followup ? 'partner joins' : null]]) +
          section('Known from birth by', start.length && `<div class="chips">${start.map((s) =>
            link('mon', s.id, s.name, 'chip', s.img.startsWith('render:') ? `<img class="mini" src="${s.pic[1]}" alt="">` : '')).join('')}</div>`),
      };
    },
    item(i) {
      return {
        title: i.name,
        body: `<div class="hero">${itemImg(i)}<div><h2>${esc(i.name)}</h2><p class="desc">${esc(i.desc)}</p></div></div>` +
          kv([['Type', ITEM_CAT[i.category] ?? i.category], ['Price', i.price ? i.price + ' G' : null]]) +
          section('Favourite of', (likedBy[i.id] || []).length && `<div class="chips">${likedBy[i.id].map((s) =>
            link('mon', s, SP[s].name, 'chip', SP[s].img.startsWith('render:') ? `<img class="mini" src="${SP[s].pic[1]}" alt="">` : '')).join('')}</div>`) +
          section('Tournament prize', (prizeOf[i.id] || []).length && `<div class="chips">${prizeOf[i.id].map((t) => link('tour', t, TO[t].name)).join('')}</div>`),
      };
    },
    tour(t) {
      const opp = t.opponents.map((e) => EN[e]).filter(Boolean);
      return {
        title: t.name,
        body: `<h2 style="margin:0">${esc(t.name)}</h2>` +
          kv([['Rank', t.rank], ['Format', FORMAT[t.format] ?? t.format], ['Entrants', t.entrants],
              ['Monsters', t.monstersNeeded], ['Official', t.official ? 'Yes' : 'No'],
              ['Prize', t.prizeMoney.map((m) => m + ' G').join(' / ')],
              ['Prize item', t.prizeItem != null ? link('item', t.prizeItem, IT[t.prizeItem].name) : null],
              ['When', dates(t.id) || null]]) +
          section('Opponent pool', `<div class="list">${opp.map((e) => row('mon', e.species, e.name,
            `<span class="tag">${esc(SP[e.species]?.name ?? '?')}</span>`,
            STATS.map((k) => `${k} ${e.stats[k]}`).join(' · '))).join('')}</div>`),
      };
    },
  };
  const LOOKUP = { mon: SP, tech: TE, item: IT, tour: TO, breed: null };

  // ---- overlay stack (in-overlay Back) ----
  const stack = [];
  function show() {
    const top = stack[stack.length - 1];
    if (!top) { $('#overlay').hidden = true; document.body.style.overflow = ''; return; }
    const [kind, id] = top.split(':');
    const obj = LOOKUP[kind] ? LOOKUP[kind][id] : +id;
    if (obj == null) { stack.pop(); return show(); }
    const { title, body } = DETAIL[kind](obj);
    $('#sheet-title').textContent = title;
    $('#sheet-body').innerHTML = body;
    $('#sheet-body').scrollTop = 0;
    $('#back').disabled = stack.length < 2;
    $('#overlay').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  // ---- main render (scroll preserved) ----
  function renderFilters() {
    const t = TABS[st.tab];
    $('#filters').innerHTML = `<input type="search" data-q placeholder="Search" value="${esc(st.q[st.tab] || '')}">` + t.filters();
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === st.tab));
  }
  function renderView() {
    const y = window.scrollY;
    $('#view').innerHTML = TABS[st.tab].render(st.q[st.tab] || '');
    window.scrollTo(0, y);
  }

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { st.tab = tab.dataset.tab; st.f = {}; save(); renderFilters(); renderView(); return; }
    const open = e.target.closest('[data-open]');
    if (open) { stack.push(open.dataset.open); show(); return; }
    const act = e.target.closest('[data-act]');
    if (act?.dataset.act === 'back') { stack.pop(); show(); return; }
    if (act?.dataset.act === 'close' || e.target.id === 'overlay') { stack.length = 0; show(); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.matches('[data-q]')) { st.q[st.tab] = e.target.value; save(); renderView(); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-f]')) { st.f[e.target.dataset.f] = e.target.value; save(); renderView(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) { stack.length = 0; show(); } });

  if (!TABS[st.tab]) st.tab = 'monsters';
  renderFilters();
  renderView();
})();
