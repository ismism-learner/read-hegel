import { fetchJSON, settings, applySettings, initSettingsControls, fmt, store, escapeHtml, copyText, toast, lookupLinks, fold } from './util.js';
import { Corpus } from './search.js';

applySettings();
initSettingsControls();

const el = (id) => document.getElementById(id);
const manifest = await fetchJSON('data/manifest.json');
const corpus = new Corpus(manifest);
const byId = new Map(manifest.volumes.map((v) => [v.id, v]));

const state = {
  vol: null,
  chunk: 0,
  terms: [],
  nav: null,
  transIndex: {},
};

/* ---------------- helpers ---------------- */

const urlFor = ({ v, c, a, p, q }) => {
  const sp = new URLSearchParams({ v, c: String(c) });
  if (a) sp.set('a', a);
  if (p !== undefined && p !== null && p !== '') sp.set('p', String(p));
  if (q) sp.set('q', q);
  return `reader.html?${sp}`;
};

function pushUrl(opts) {
  const u = urlFor(opts);
  if (location.search !== '?' + u.split('?')[1]) history.pushState(opts, '', u);
}

function layoutMode() {
  return settings.data.layout || 'tri';
}
function colsActive() {
  const mode = layoutMode();
  if (mode === 'mono') return ['de'];
  if (mode === 'bi') return ['de', 'zh'];
  return settings.data.showEn === false ? ['de', 'zh'] : ['de', 'en', 'zh'];
}

/* ---------------- german-aware highlighting ---------------- */

function foldWithMap(s) {
  const out = [];
  const map = [];
  for (let i = 0; i < s.length; i++) {
    const low = s[i].toLowerCase();
    let f;
    if (low === 'ä' || low === 'a') f = 'a';
    else if (low === 'ö' || low === 'o') f = 'o';
    else if (low === 'ü' || low === 'u') f = 'u';
    else if (low === 'ß') f = 'ss';
    else if (/[a-z0-9]/.test(low)) f = low;
    else f = ' ';
    for (const c of f) { out.push(c); map.push(i); }
  }
  return { folded: out.join(''), map };
}

function highlight(root, terms) {
  if (!terms?.length) return 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement.closest('mark, .footnotes a, .cell--zh, .cell--en') || !/[a-zA-ZäöüÄÖÜß]/.test(n.nodeValue))
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  let count = 0;
  for (const node of nodes) {
    const text = node.nodeValue;
    const { folded, map } = foldWithMap(text);
    const hits = [];
    for (const t of terms) {
      let idx = folded.indexOf(t);
      while (idx >= 0) {
        hits.push([map[idx], map[Math.min(idx + t.length - 1, map.length - 1)] + 1]);
        idx = folded.indexOf(t, idx + 1);
      }
    }
    if (!hits.length) continue;
    hits.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const h of hits) {
      const last = merged.at(-1);
      if (last && h[0] <= last[1]) last[1] = Math.max(last[1], h[1]);
      else merged.push([...h]);
    }
    let current = node;
    let offset = 0;
    for (const [s, e] of merged) {
      if (e - offset <= 0) continue;
      const target = current.splitText(Math.max(0, s - offset));
      const after = target.splitText(e - s);
      const mk = document.createElement('mark');
      mk.className = 'hl';
      target.parentNode.insertBefore(mk, target);
      mk.appendChild(target);
      current = after;
      offset = e;
      count++;
    }
  }
  return count;
}

/* ---------------- translation data ---------------- */

const transCache = new Map();
async function loadTrans(v, c) {
  const key = `${v}/${c}`;
  if (transCache.has(key)) return transCache.get(key);
  // only ask the server for translations the coverage index knows about (avoids 404 noise)
  const known = state.transIndex?.volumes?.[v]?.[c];
  if (!known) { transCache.set(key, null); return null; }
  let data = null;
  try {
    const r = await fetch(`data/trans/${v}/${c}.json`);
    if (r.ok) data = await r.json();
  } catch { /* untranslated */ }
  transCache.set(key, data);
  return data;
}

async function loadTransIndex() {
  try { state.transIndex = await fetchJSON('data/trans/index.json'); } catch { state.transIndex = {}; }
}

/* ---------------- rendering ---------------- */

function sentenceCell(sentences, bi, lang) {
  const parts = sentences.map((s, i) => `<span class="s" data-sid="b${bi}s${i}" data-lang="${lang}">${escapeHtml(s)}</span>`);
  return `<p class="tr">${parts.join(' ')}</p>`;
}

function renderText(chunk, trans) {
  const text = el('text');
  const cols = colsActive();
  text.dataset.cols = cols.join('-');
  document.body.dataset.layout = layoutMode();
  const showTr = cols.length > 1;

  text.innerHTML = chunk.blocks.map((b, bi) => {
    const t = trans?.blocks?.[bi];
    const fresh = t && t.h === b.hash;

    if (b.k === 'fn') {
      return `<div class="pair pair--full" data-bi="${bi}">${b.x}</div>`;
    }
    if (!showTr) return `<div class="pair pair--mono" data-bi="${bi}">${b.x}</div>`;

    if (b.k === 'h') {
      const cells = cols.map((c) => {
        if (c === 'de') return `<div class="cell cell--de">${b.x}</div>`;
        const label = fresh && t[c] ? escapeHtml(t[c]) : '';
        return `<div class="cell cell--${c}">${label ? `<h${b.l || 3} class="tr">${label}</h${b.l || 3}>` : ''}</div>`;
      }).join('');
      return `<div class="pair pair--head" data-bi="${bi}">${cells}</div>`;
    }

    const cells = cols.map((c) => {
      if (c === 'de') return `<div class="cell cell--de">${b.x}</div>`;
      const arr = fresh ? t[c] : null;
      if (!arr || !arr.length) return `<div class="cell cell--${c} is-missing" data-bi="${bi}"></div>`;
      const mismatch = b.ns !== undefined && arr.length !== b.ns;
      return `<div class="cell cell--${c}${mismatch ? ' is-mismatch' : ''}" data-bi="${bi}">${sentenceCell(arr, bi, c)}</div>`;
    }).join('');
    return `<div class="pair" data-bi="${bi}">${cells}</div>`;
  }).join('\n');
}

function coverageOf(chunk, trans) {
  const paras = chunk.blocks.filter((b) => b.k === 'p');
  let done = 0, sentDone = 0, sentTotal = 0;
  paras.forEach((b, i) => {
    const bi = chunk.blocks.indexOf(b);
    const t = trans?.blocks?.[bi];
    const fresh = t && t.h === b.hash;
    sentTotal += b.ns || 0;
    if (fresh) { done++; sentDone += b.ns || 0; }
  });
  return { done, total: paras.length, sentDone, sentTotal };
}

function updateTransStat(chunk, trans) {
  const cov = coverageOf(chunk, trans);
  const g = state.transIndex?.totals;
  const bits = [];
  if (cov.done) bits.push(`本节 <b>${cov.done}/${cov.total}</b> 段已译 · ${cov.sentDone}/${cov.sentTotal} 句`);
  else bits.push(`本节尚无译文（共 ${cov.total} 段 / ${cov.sentTotal} 句）`);
  if (g && g.blocks) bits.push(`全书已译 <b>${g.blocks}</b> 段 / ${fmt.num(g.sentences)} 句（共 ${fmt.num(g.sentencesTotal)} 句）`);
  el('trans-stat').innerHTML = bits.join(' · ') +
    (cov.done && cov.done < cov.total ? ' · <span class="warn">未译段落右栏留空</span>' : '');
}

/* ---------------- sidebar ---------------- */

function fillVolSelect() {
  const sel = el('vol-select');
  sel.innerHTML = manifest.volumes.map((v) =>
    `<option value="${v.id}">${fmt.band(v.bands)} · ${escapeHtml(v.zh)}</option>`).join('');
  sel.addEventListener('change', () => loadVolume(sel.value, { c: 0 }));
}

function renderSidebar() {
  const body = el('sidebar-body');
  const tab = body.dataset.tab || 'toc';
  body.dataset.tab = tab;
  if (tab === 'toc') renderTocPanel(body);
  else if (tab === 'search') renderSearchPanel(body);
  else renderMarksPanel(body);
}

function renderTocPanel(body) {
  if (!state.nav) {
    body.innerHTML = '<div class="loadhint" style="padding:12px"><span class="spinner"></span> 载入目录…</div>';
    return;
  }
  const filter = (el('toc-filter').value || '').trim().toLowerCase();
  const curAnchor = byId.get(state.vol).chunks[state.chunk]?.a || '';
  const subMatch = (n) => n.k.some((k) => k.t.toLowerCase().includes(filter) || subMatch(k));
  const build = (nodes, depth) => {
    const shown = nodes.filter((n) => !filter || n.t.toLowerCase().includes(filter) || subMatch(n));
    if (!shown.length) return '';
    return `<ol>${shown.map((n) => {
      const kids = n.k.length ? build(n.k, depth + 1) : '';
      return `<li class="lvl-${Math.min(depth + 1, 6)}" data-c="${n.c}" data-a="${n.a}">
        <div class="row">
          <button class="caret" type="button" ${n.k.length ? '' : 'hidden'}>▸</button>
          <a class="node" href="${urlFor({ v: state.vol, c: n.c, a: n.a })}" data-c="${n.c}" data-a="${n.a}">${escapeHtml(n.t)}</a>
        </div>${kids}</li>`;
    }).join('')}</ol>`;
  };
  body.innerHTML = build(state.nav, 0) || '<p style="color:var(--muted);font-size:.84rem;padding:10px">没有匹配的标题。</p>';

  const setOpen = (li, open) => {
    li.classList.toggle('open', open);
    const c = li.querySelector(':scope > .row > .caret');
    if (c) c.textContent = open ? '▾' : '▸';
  };
  const cur = body.querySelector(`a.node[data-a="${CSS.escape(curAnchor)}"]`) ||
              body.querySelector(`li[data-c="${state.chunk}"] > .row > a.node`) ||
              body.querySelector(`li[data-c="${state.chunk}"] a.node`);
  if (cur) {
    cur.classList.add('current');
    for (let p = cur.closest('li')?.parentElement?.closest('li'); p; p = p.parentElement?.closest('li')) setOpen(p, true);
    const own = cur.closest('li');
    if (own && own.querySelector(':scope > ol')) setOpen(own, true);
    const top = cur.getBoundingClientRect().top - body.getBoundingClientRect().top;
    if (top < 0 || top > body.clientHeight - 60) body.scrollTop += top - body.clientHeight / 3;
  }
  if (filter) for (const li of body.querySelectorAll('li')) setOpen(li, true);

  body.querySelectorAll('.caret').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const li = b.closest('li');
    setOpen(li, !li.classList.contains('open'));
  }));
  body.querySelectorAll('a.node').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    loadChunk(+a.dataset.c, { anchor: a.dataset.a, push: true, q: state.terms.join(' ') });
    if (window.innerWidth < 900) document.body.classList.remove('nav-open');
  }));
}

function renderSearchPanel(body) {
  body.innerHTML = `
    <div style="padding:4px 8px 0">
      <label class="filter-field">
        <span aria-hidden="true">⌕</span>
        <input id="vol-q" type="search" placeholder="在本卷中检索…" value="${escapeHtml(state.terms.join(' '))}">
      </label>
      <div id="vol-hits" class="hits"></div>
    </div>`;
  const input = body.querySelector('#vol-q');
  input.focus();
  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => volSearch(input.value), 220); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') volSearch(input.value); });
  if (state.terms.length) volSearch(state.terms.join(' '));
}

async function volSearch(q) {
  const host = document.getElementById('vol-hits');
  if (!host) return;
  const query = (q || '').trim();
  if (query.length < 2) { host.innerHTML = ''; return; }
  host.innerHTML = '<div class="loadhint"><span class="spinner"></span> 检索…</div>';
  await corpus.index(state.vol);
  const { hits, terms } = corpus.search(query, { volume: state.vol, limit: 200 });
  const rich = await corpus.snippets(hits, terms, { maxHits: 40, perHit: 1, context: 90 });
  host.innerHTML = rich.length
    ? rich.map((h) => `<div class="hit" data-c="${h.c}" data-p="${h.parts[0]?.bi ?? 0}">
        <b>${escapeHtml(h.t || '')}</b>
        <p>${h.parts[0]?.snippet || ''}</p>
      </div>`).join('')
    : '<p style="color:var(--muted);font-size:.84rem;padding:8px">没有命中。</p>';
  host.querySelectorAll('.hit').forEach((h) => h.addEventListener('click', () => {
    state.terms = terms;
    loadChunk(+h.dataset.c, { block: +h.dataset.p, q: query, push: true });
    if (window.innerWidth < 900) document.body.classList.remove('nav-open');
  }));
}

function renderMarksPanel(body) {
  const marks = store.get('marks', []);
  const mine = marks.filter((m) => m.v === state.vol);
  body.innerHTML = `
    <div class="bookmarks">
      <h4>本卷书签</h4>
      ${mine.length ? mine.map((m) => `<div class="bm">
          <a href="${urlFor({ v: m.v, c: m.c })}" data-c="${m.c}">${escapeHtml(m.t || '第 ' + (m.c + 1) + ' 节')}</a>
          <button data-del="${m.c}" title="删除">✕</button></div>`).join('')
        : '<p style="color:var(--muted);font-size:.84rem">还没有书签。按 <kbd>b</kbd> 收藏当前一节。</p>'}
    </div>`;
  body.querySelectorAll('a[data-c]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); loadChunk(+a.dataset.c, { push: true });
  }));
  body.querySelectorAll('button[data-del]').forEach((b) => b.addEventListener('click', () => {
    store.set('marks', store.get('marks', []).filter((m) => !(m.v === state.vol && m.c === +b.dataset.del)));
    syncMarkButton();
    renderSidebar();
  }));
}

function syncMarkButton() {
  const has = store.get('marks', []).some((m) => m.v === state.vol && m.c === state.chunk);
  const b = el('btn-mark');
  b.textContent = has ? '★' : '☆';
  b.classList.toggle('is-active', has);
}

function renderPager() {
  const v = byId.get(state.vol);
  const prev = state.chunk > 0 ? state.chunk - 1 : null;
  const next = state.chunk < v.chunks.length - 1 ? state.chunk + 1 : null;
  el('pager').innerHTML = [
    prev !== null ? `<a class="prev" href="${urlFor({ v: state.vol, c: prev })}"><span>‹ 上一节</span><b>${escapeHtml(v.chunks[prev].t || '')}</b></a>` : '<span></span>',
    next !== null ? `<a class="next" href="${urlFor({ v: state.vol, c: next })}"><span>下一节 ›</span><b>${escapeHtml(v.chunks[next].t || '')}</b></a>` : '<span></span>',
  ].join('');
  for (const a of el('pager').querySelectorAll('a')) {
    a.addEventListener('click', (e) => { e.preventDefault(); loadChunk(+new URL(a.href, location).searchParams.get('c'), { push: true }); });
  }
  el('prev-chunk').disabled = prev === null;
  el('next-chunk').disabled = next === null;
}

/* ---------------- sentence linking ---------------- */

function setActive(sid) {
  const text = el('text');
  for (const n of text.querySelectorAll('.s.on')) n.classList.remove('on');
  if (!sid) return;
  for (const n of text.querySelectorAll(`.s[data-sid="${CSS.escape(sid)}"]`)) n.classList.add('on');
}

function wireSentenceHover() {
  const text = el('text');
  text.addEventListener('mouseover', (e) => {
    const s = e.target instanceof Element ? e.target.closest('.s') : null;
    setActive(s ? s.dataset.sid : null);
  });
  text.addEventListener('mouseleave', () => setActive(null));
  text.addEventListener('click', (e) => {
    const s = e.target instanceof Element ? e.target.closest('.s') : null;
    if (!s) return;
    if (s.classList.contains('on') && text.querySelectorAll('.s.on').length <= 1) setActive(null);
    else setActive(s.dataset.sid);
  });
}

/* ---------------- chunk loading ---------------- */

let loadSeq = 0;

async function loadChunk(c, { anchor, block, q, push = true, scroll = true } = {}) {
  const v = byId.get(state.vol);
  c = Math.max(0, Math.min(v.chunks.length - 1, c));
  const seq = ++loadSeq;
  state.chunk = c;
  if (q !== undefined) state.terms = q ? [...new Set(fold(q).split(' ').filter((t) => t.length >= 2))] : [];

  const [chunk, trans] = await Promise.all([corpus.chunk(state.vol, c), loadTrans(state.vol, c)]);
  if (seq !== loadSeq) return;

  el('doc-bands').textContent = v.bands.length > 1 ? `Bd. ${v.bands[0]}–${v.bands.at(-1)}` : `Bd. ${v.bands[0]}`;
  el('doc-title').textContent = v.de;
  el('doc-zh').textContent = `${v.zh} · ${v.years}`;
  el('doc-crumbs').innerHTML = (chunk.cr || []).map((t) => `<span>${escapeHtml(t)}</span>`).join('');
  el('crumb-now').textContent = chunk.t || '';

  renderText(chunk, trans);
  updateTransStat(chunk, trans);
  renderPager();
  syncMarkButton();
  el('progress-i').style.width = (((c + 1) / v.chunks.length) * 100) + '%';
  el('vol-select').value = state.vol;

  highlight(el('text'), state.terms);

  if (push) pushUrl({ v: state.vol, c, a: anchor, p: block, q: state.terms.join(' ') });
  if (scroll) {
    requestAnimationFrame(() => {
      const text = el('text');
      let target = null;
      if (anchor) target = text.querySelector(`#${CSS.escape(anchor)}`);
      if (!target && block !== undefined && block !== null && !Number.isNaN(+block)) target = text.querySelector(`[data-bi="${block}"]`);
      if (!target) target = text.querySelector('mark.hl');
      if (target) {
        target.scrollIntoView({ block: 'center', behavior: 'auto' });
        if (target.matches?.('mark.hl')) target.classList.add('is-current');
      } else {
        el('doc').scrollTop = 0;
      }
    });
  }

  store.set('pos.' + state.vol, { c, t: chunk.t, at: Date.now() });
  renderSidebar();
  prefetch(c + 1);
}

function prefetch(c) {
  const v = byId.get(state.vol);
  if (c >= v.chunks.length) return;
  setTimeout(() => { corpus.chunk(state.vol, c).catch(() => {}); }, 400);
}

function loadVolume(id, { c = 0, anchor, block, q } = {}) {
  state.vol = id;
  state.nav = null;
  corpus.nav(id).then((nav) => {
    state.nav = nav;
    renderTocPanel(el('sidebar-body'));
  });
  return loadChunk(c, { anchor, block, q, push: true });
}

/* ---------------- selection popover ---------------- */

const pop = el('sel-pop');
let selWord = '';
const targetEl = (e) => (e.target instanceof Element ? e.target : null);

document.addEventListener('mouseup', (e) => {
  if (targetEl(e)?.closest('.sel-pop')) return;
  setTimeout(() => {
    const sel = window.getSelection();
    const txt = sel?.toString().trim() || '';
    if (!txt || txt.length > 80 || !sel.rangeCount || !el('text').contains(sel.anchorNode)) { pop.classList.remove('is-open'); return; }
    selWord = txt;
    const word = txt.split(/\s+/)[0];
    const links = lookupLinks(word.length > 1 ? word : txt);
    pop.innerHTML = [
      `<button class="btn" data-act="copy">复制</button>`,
      `<span class="sep"></span>`,
      ...links.map(([name, url]) => `<a class="btn" href="${url}" target="_blank" rel="noopener">${name}</a>`),
    ].join('');
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    pop.classList.add('is-open');
    pop.style.top = Math.max(4, rect.top + window.scrollY - pop.offsetHeight - 8) + 'px';
    pop.style.left = Math.max(8, Math.min(window.innerWidth - pop.offsetWidth - 8, rect.left + rect.width / 2 - pop.offsetWidth / 2)) + 'px';
  }, 10);
});

document.addEventListener('mousedown', (e) => { if (!targetEl(e)?.closest('.sel-pop')) pop.classList.remove('is-open'); });
pop.addEventListener('click', async (e) => {
  if (e.target.closest('[data-act="copy"]')) {
    const ok = await copyText(selWord);
    toast(ok ? '已复制：' + selWord : '复制失败：浏览器拒绝了剪贴板访问');
    pop.classList.remove('is-open');
  }
});

/* ---------------- citation ---------------- */

function nearestPage() {
  const marks = [...el('text').querySelectorAll('.pg')];
  if (!marks.length) return null;
  const top = el('doc').getBoundingClientRect().top + 8;
  let best = null;
  for (const m of marks) {
    if (m.getBoundingClientRect().top <= top + 40) best = m; else break;
  }
  return (best || marks[0]).dataset;
}

async function copyCitation() {
  const v = byId.get(state.vol);
  const chunk = await corpus.chunk(state.vol, state.chunk);
  const pg = nearestPage();
  const bits = [
    'G. W. F. Hegel: Werke in 20 Bänden. Hrsg. von Eva Moldenhauer und Karl Markus Michel. Frankfurt a. M.: Suhrkamp.',
    fmt.band(v.bands),
    pg ? `S. ${pg.p}` : null,
    chunk.cr?.length ? chunk.cr.join(' › ') : chunk.t,
    location.href,
  ].filter(Boolean);
  const ok = await copyText(bits.join(' · '));
  toast(ok ? (pg ? `已复制引用（Bd. ${pg.b}，S. ${pg.p}）` : '已复制引用') : '复制失败：浏览器拒绝了剪贴板访问');
}

/* ---------------- wiring ---------------- */

fillVolSelect();

document.querySelector('.sidebar').addEventListener('click', (e) => {
  const tabBtn = e.target.closest('[data-tab]');
  if (!tabBtn) return;
  for (const b of document.querySelectorAll('[data-tab]')) b.classList.toggle('is-active', b === tabBtn);
  el('sidebar-body').dataset.tab = tabBtn.dataset.tab;
  el('toc-filter-wrap').style.display = tabBtn.dataset.tab === 'toc' ? '' : 'none';
  renderSidebar();
});

el('toc-filter').addEventListener('input', () => {
  clearTimeout(el('toc-filter')._t);
  el('toc-filter')._t = setTimeout(() => renderTocPanel(el('sidebar-body')), 140);
});

el('prev-chunk').addEventListener('click', () => loadChunk(state.chunk - 1, { push: true }));
el('next-chunk').addEventListener('click', () => loadChunk(state.chunk + 1, { push: true }));

el('btn-mark').addEventListener('click', () => {
  const marks = store.get('marks', []);
  const i = marks.findIndex((m) => m.v === state.vol && m.c === state.chunk);
  const chunkTitle = byId.get(state.vol).chunks[state.chunk].t || '';
  if (i >= 0) marks.splice(i, 1); else marks.push({ v: state.vol, c: state.chunk, t: chunkTitle, at: Date.now() });
  store.set('marks', marks);
  syncMarkButton();
  toast(i >= 0 ? '已移除书签' : '已加入书签');
  if (el('sidebar-body').dataset.tab === 'marks') renderSidebar();
});

el('btn-cite').addEventListener('click', copyCitation);
el('nav-toggle').addEventListener('click', () => document.body.classList.toggle('nav-open'));
el('scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));

function syncLayoutButtons() {
  const mode = layoutMode();
  for (const b of document.querySelectorAll('[data-layout]')) b.setAttribute('aria-pressed', String(b.dataset.layout === mode));
  document.body.dataset.layout = mode;
  el('en-toggle').setAttribute('aria-pressed', String(settings.data.showEn !== false));
  el('en-toggle').style.display = mode === 'tri' ? '' : 'none';
}

for (const b of document.querySelectorAll('[data-layout]')) {
  b.addEventListener('click', () => {
    settings.data.layout = b.dataset.layout;
    settings.save();
    syncLayoutButtons();
    rerender();
  });
}

el('en-toggle').addEventListener('click', () => {
  settings.data.showEn = settings.data.showEn === false;
  settings.save();
  syncLayoutButtons();
  rerender();
});

async function rerender() {
  if (!state.vol) return;
  const [chunk, trans] = await Promise.all([corpus.chunk(state.vol, state.chunk), loadTrans(state.vol, state.chunk)]);
  renderText(chunk, trans);
  updateTransStat(chunk, trans);
  highlight(el('text'), state.terms);
}

document.addEventListener('keydown', (e) => {
  if (targetEl(e)?.matches('input, select, textarea') || e.metaKey || e.ctrlKey) return;
  const doc = el('doc');
  switch (e.key) {
    case 'ArrowLeft': case 'p': loadChunk(state.chunk - 1, { push: true }); break;
    case 'ArrowRight': case 'n': loadChunk(state.chunk + 1, { push: true }); break;
    case 'j': doc.scrollBy({ top: 260, behavior: 'smooth' }); break;
    case 'k': doc.scrollBy({ top: -260, behavior: 'smooth' }); break;
    case ' ': e.preventDefault(); doc.scrollBy({ top: doc.clientHeight * 0.9, behavior: 'smooth' }); break;
    case 'b': el('btn-mark').click(); break;
    case 'c': copyCitation(); break;
    case 'm': document.body.classList.toggle('nav-open'); break;
    case 'e': el('en-toggle').click(); break;
    case 'Escape': document.body.classList.remove('nav-open'); pop.classList.remove('is-open'); setActive(null); break;
    default: break;
  }
});

window.addEventListener('popstate', () => {
  const p = new URLSearchParams(location.search);
  const v = p.get('v');
  if (!v) return;
  if (v !== state.vol) loadVolume(v, { c: +(p.get('c') || 0), anchor: p.get('a'), block: p.get('p'), q: p.get('q') });
  else loadChunk(+(p.get('c') || 0), { anchor: p.get('a'), block: p.get('p'), q: p.get('q'), push: false });
});

/* ---------------- boot ---------------- */

await loadTransIndex();
wireSentenceHover();

const params = new URLSearchParams(location.search);
if (params.get('lay')) {
  settings.data.layout = params.get('lay');
  settings.data.showEn = params.get('en') !== '0';
  settings.save();
}
if (params.get('en') === '0') settings.data.showEn = false;
syncLayoutButtons();
const startVol = byId.has(params.get('v')) ? params.get('v') : (store.get('lastVol', manifest.volumes[0].id));
const lastPos = store.get('pos.' + startVol, null);
const startChunk = params.has('c') ? +params.get('c') : (lastPos?.c ?? 0);
await loadVolume(startVol, { c: startChunk, anchor: params.get('a'), block: params.get('p'), q: params.get('q') });
store.set('lastVol', startVol);
