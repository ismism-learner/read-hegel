import { fetchJSON, settings, applySettings, initSettingsControls, fmt, escapeHtml, store, toast } from './util.js';
import { Corpus } from './search.js';

applySettings();
initSettingsControls();

const el = (id) => document.getElementById(id);
const manifest = await fetchJSON('data/manifest.json');
const corpus = new Corpus(manifest);

const readerUrl = (vol, chunk, opts = {}) => {
  const p = new URLSearchParams({ v: vol, c: chunk });
  if (opts.a) p.set('a', opts.a);
  if (opts.q) p.set('q', opts.q);
  if (opts.p !== undefined && opts.p !== null) p.set('p', opts.p);
  if (opts.lay) p.set('lay', opts.lay);
  return `reader.html?${p}`;
};

/* translation coverage (produced by scripts/trans-index.mjs) */
let transIndex = null;
try { transIndex = await fetchJSON('data/trans/index.json'); } catch { transIndex = null; }
const coverageOf = (volId) => {
  const c = transIndex?.volumes?.[volId];
  if (!c) return null;
  const blocks = Object.values(c).reduce((a, x) => a + x.blocks, 0);
  if (!blocks) return null;
  const first = Math.min(...Object.keys(c).map(Number));
  const sentences = Object.values(c).reduce((a, x) => a + x.sentences, 0);
  return { blocks, first, sentences };
};

/* ---------- header stats ---------- */
const totalPlain = manifest.volumes.reduce((a, v) => a + (v.plain || v.chars), 0);
el('stat-vols').textContent = manifest.volumes.length;
el('stat-vols2').textContent = manifest.volumes.length;
el('stat-chars').textContent = Math.round(totalPlain / 10000) + ' 万';

/* ---------- reading progress ---------- */
function progressOf(v) {
  const saved = store.get('pos.' + v.id, null);
  if (!saved || typeof saved.c !== 'number') return null;
  return { ...saved, pct: Math.min(100, Math.round(((saved.c + 1) / v.chunks.length) * 100)) };
}

/* public-domain first editions in the Deutsches Textarchiv, for cross-checking */
const DTA = {
  w3: [['Phänomenologie 1807', 'https://www.deutschestextarchiv.de/book/view/hegel_phaenomenologie_1807']],
  w5: [
    ['Logik 1812 (Bd. 1/1)', 'https://www.deutschestextarchiv.de/book/view/hegel_logik0101_1812'],
    ['Logik 1813 (Bd. 1/2)', 'https://www.deutschestextarchiv.de/book/view/hegel_logik0102_1813'],
    ['Logik 1816 (Bd. 2)', 'https://www.deutschestextarchiv.de/book/view/hegel_logik02_1816'],
  ],
};

/* ---------- library grid ---------- */
function renderLibrary() {
  const grid = el('grid');
  grid.innerHTML = '';
  for (const v of manifest.volumes) {
    const prog = progressOf(v);
    const cov = coverageOf(v.id);
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card__band">Bd. ${v.bands.length > 1 ? `${v.bands[0]}–${v.bands.at(-1)}` : v.bands[0]}</div>
      <h3 class="card__title"><a href="${readerUrl(v.id, prog ? prog.c : 0)}">${escapeHtml(v.de)}</a></h3>
      <p class="card__zh">${escapeHtml(v.zh)}</p>
      <p class="card__years">${escapeHtml(v.years)} · ${v.chunks.length} 节 · ${v.navRoots} 个主章</p>
      <div class="card__stats">
        <span><b>${((v.plain || v.chars) / 10000).toFixed(1)}</b> 万字符</span>
        <span><b>${fmt.num(v.terms)}</b> 词条</span>
        ${cov ? `<span><b>${cov.blocks}</b> 段已译</span>` : ''}
        ${prog ? `<span>读到 <b>${prog.pct}%</b></span>` : ''}
      </div>
      <div class="card__actions">
        <a class="btn btn--solid" href="${readerUrl(v.id, prog ? prog.c : 0)}">${prog ? '继续阅读' : '开始阅读'}</a>
        ${cov ? `<a class="btn btn--ghost" href="${readerUrl(v.id, cov.first, { lay: 'tri' })}" title="德文 · 英文 · 中文三栏对照，鼠标悬停整句联动">双语对照</a>` : ''}
        <button class="btn btn--ghost js-toc" type="button" data-vol="${v.id}">目录</button>
        ${DTA[v.id] ? DTA[v.id].map(([label, url]) => `<a class="btn btn--ghost" href="${url}" target="_blank" rel="noopener" title="公共领域初版（Deutsches Textarchiv）">${label} ↗</a>`).join('') : ''}
      </div>
      <div class="toc-panel" data-panel="${v.id}"></div>
      ${prog ? `<div class="progress"><i style="width:${prog.pct}%"></i></div>` : ''}
    `;
    grid.appendChild(card);
  }

  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('.js-toc');
    if (!btn) return;
    const panel = grid.querySelector(`[data-panel="${btn.dataset.vol}"]`);
    if (panel.classList.contains('open')) { panel.classList.remove('open'); btn.textContent = '目录'; return; }
    btn.textContent = '收起';
    if (!panel.dataset.ready) {
      panel.innerHTML = '<div class="loadhint"><span class="spinner"></span> 载入目录…</div>';
      const nav = await corpus.nav(btn.dataset.vol);
      panel.innerHTML = renderToc(nav, btn.dataset.vol);
      panel.dataset.ready = '1';
    }
    panel.classList.add('open');
  });
}

function renderToc(nodes, vol, depth = 1) {
  const items = nodes.map((n) => {
    const kids = depth < 3 && n.k.length ? renderToc(n.k, vol, depth + 1) : '';
    return `<li class="lvl-${Math.min(depth + 1, 6)}"><a href="${readerUrl(vol, n.c, { a: n.a })}">${escapeHtml(n.t)}</a>${kids}</li>`;
  }).join('');
  return `<ol>${items}</ol>`;
}

renderLibrary();

/* ---------- search ---------- */
const resultsEl = el('results');
const libraryEl = el('library-section');
const qInput = el('q');
let indexesReady = false;
let searchToken = 0;

async function ensureIndexes() {
  if (indexesReady) return;
  const host = document.createElement('div');
  host.className = 'loadhint';
  host.innerHTML = '<span class="spinner"></span> <span class="msg">正在载入全文索引…</span><div class="bar"><i style="width:0%"></i></div>';
  resultsEl.hidden = false;
  resultsEl.prepend(host);
  await corpus.allIndexes((done, total) => {
    host.querySelector('.bar i').style.width = Math.round((done / total) * 100) + '%';
    host.querySelector('.msg').textContent = `正在载入全文索引… ${done}/${total} 卷`;
  });
  host.remove();
  indexesReady = true;
}

async function runSearch(query) {
  const token = ++searchToken;
  const q = query.trim();
  if (q.length < 2) { resultsEl.hidden = true; libraryEl.hidden = false; return; }
  libraryEl.hidden = true;
  resultsEl.hidden = false;
  resultsEl.innerHTML = '<div class="loadhint"><span class="spinner"></span> 检索中…</div>';
  await ensureIndexes();
  if (token !== searchToken) return;

  const t0 = performance.now();
  const { hits, all, terms } = corpus.search(q);
  const toc = await corpus.tocMatches(q);
  if (token !== searchToken) return;
  const rich = await corpus.snippets(hits, terms, { maxHits: 30, perHit: 2 });
  if (token !== searchToken) return;
  const ms = Math.round(performance.now() - t0);

  const parts = [];
  parts.push(`<div class="result-head">
      <h2>„${escapeHtml(q)}“</h2>
      <span class="count">${hits.length} 处命中 · ${rich.length} 段摘录 · ${ms} ms${all ? '' : ' · 未找到同时包含全部词的位置，已列出部分匹配'}</span>
      <span class="spacer"></span>
      <button class="btn btn--ghost" type="button" id="clear-search">清除检索</button>
    </div>`);

  if (toc.length) {
    const shown = toc.slice(0, 12);
    parts.push('<div class="result-head"><h2>章节标题命中</h2><span class="count">' + toc.length + (toc.length > shown.length ? '，显示前 ' + shown.length : '') + '</span></div>');
    parts.push('<div class="result__toc">' + shown.map((t) => {
      const v = corpus.volume(t.vol);
      return `<div class="result result--toc"><div class="result__where"><b>${fmt.band(v.bands)}</b><span class="vol">${escapeHtml(v.zh)}</span></div>
        <div class="result__body"><p><a href="${readerUrl(t.vol, t.c, { a: t.a, q })}">${escapeHtml(t.t)}</a></p></div></div>`;
    }).join('') + '</div>');
  }

  if (!rich.length) {
    parts.push('<div class="result-head"><h2>正文命中</h2></div><p class="result__more">没有找到正文结果。</p>');
  } else {
    parts.push('<div class="result-head"><h2>正文命中</h2><span class="count">按相关度排序，显示前 ' + rich.length + ' 节</span></div>');
    for (const h of rich) {
      const v = corpus.volume(h.vol);
      parts.push(`<div class="result">
        <div class="result__where">
          <b>${fmt.band(v.bands)}</b>
          <a class="vol" href="${readerUrl(h.vol, h.c, { q })}">${escapeHtml(v.zh)}</a>
          <span class="cr">${escapeHtml(h.t || '')}</span>
        </div>
        <div class="result__body">
          ${h.parts.map((p) => `<p><a href="${readerUrl(h.vol, h.c, { q, p: p.bi })}">${p.snippet}</a></p>`).join('')}
        </div>
      </div>`);
    }
  }

  resultsEl.innerHTML = parts.join('');
  resultsEl.querySelector('#clear-search')?.addEventListener('click', clearSearch);
}

function clearSearch() {
  qInput.value = '';
  resultsEl.hidden = true;
  resultsEl.innerHTML = '';
  libraryEl.hidden = false;
  history.replaceState(null, '', 'index.html');
}

let debounce;
qInput.addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    const q = qInput.value;
    if (q.trim().length < 2) { clearSearch(); return; }
    history.replaceState(null, '', `index.html?q=${encodeURIComponent(q)}`);
    runSearch(q);
  }, 260);
});
el('search-form').addEventListener('submit', (e) => { e.preventDefault(); runSearch(qInput.value); });

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== qInput) { e.preventDefault(); qInput.focus(); qInput.select(); }
  if (e.key === 'Escape' && document.activeElement === qInput) { clearSearch(); qInput.blur(); }
});

const initialQ = new URLSearchParams(location.search).get('q');
if (initialQ) { qInput.value = initialQ; runSearch(initialQ); }
