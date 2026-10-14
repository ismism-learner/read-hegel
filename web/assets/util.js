// Shared helpers: storage, theme, German text utilities, dictionary links.

const LS = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('hegel.' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('hegel.' + key, JSON.stringify(value)); } catch { /* ignore */ }
  },
  del(key) {
    try { localStorage.removeItem('hegel.' + key); } catch { /* ignore */ }
  },
};

export const store = LS;

/* ---------------- settings ---------------- */

export const settings = {
  data: {
    theme: LS.get('theme', 'light'),
    fontSize: LS.get('fontSize', 1.075),
    lineHeight: LS.get('lineHeight', 1.78),
    measure: LS.get('measure', 40),
    pageMarks: LS.get('pageMarks', 'on'),
    ...LS.get('settings', {}),
  },
  save() {
    LS.set('settings', settings.data);
    applySettings();
  },
};

export function applySettings() {
  const d = settings.data;
  document.documentElement.dataset.theme = d.theme;
  document.documentElement.style.setProperty('--text-size', d.fontSize + 'rem');
  document.documentElement.style.setProperty('--line-height', String(d.lineHeight));
  document.documentElement.style.setProperty('--measure', d.measure + 'rem');
  document.body.dataset.pagemarks = d.pageMarks;
}

/** Wire the standard settings controls present on a page. */
export function initSettingsControls(root = document) {
  const d = settings.data;
  const seg = root.querySelector('.js-theme');
  if (seg) {
    for (const b of seg.querySelectorAll('[data-theme]')) {
      b.setAttribute('aria-pressed', String(b.dataset.theme === d.theme));
      b.addEventListener('click', () => {
        settings.data.theme = b.dataset.theme;
        for (const o of seg.querySelectorAll('[data-theme]')) o.setAttribute('aria-pressed', String(o === b));
        settings.save();
      });
    }
  }
  const bind = (sel, key, step, min, max, fmt) => {
    const el = root.querySelector(sel);
    if (!el) return;
    const out = el.parentElement.querySelector('.js-val');
    const sync = () => { if (out) out.textContent = fmt(settings.data[key]); };
    el.addEventListener('click', () => {
      settings.data[key] = Math.min(max, Math.max(min, +(settings.data[key] + step).toFixed(3)));
      sync(); settings.save();
    });
    sync();
    el._resync = sync;
  };
  bind('.js-font-inc', 'fontSize', 0.05, 0.85, 1.6, (v) => Math.round(v / 1.075 * 100) + '%');
  bind('.js-font-dec', 'fontSize', -0.05, 0.85, 1.6, (v) => Math.round(v / 1.075 * 100) + '%');
  bind('.js-lh-inc', 'lineHeight', 0.06, 1.4, 2.2, (v) => v.toFixed(2));
  bind('.js-lh-dec', 'lineHeight', -0.06, 1.4, 2.2, (v) => v.toFixed(2));
  bind('.js-measure-inc', 'measure', 2, 30, 60, (v) => v + 'rem');
  bind('.js-measure-dec', 'measure', -2, 30, 60, (v) => v + 'rem');
  const pm = root.querySelector('.js-pagemarks');
  if (pm) {
    pm.setAttribute('aria-pressed', String(d.pageMarks === 'on'));
    pm.addEventListener('click', () => {
      settings.data.pageMarks = settings.data.pageMarks === 'on' ? 'off' : 'on';
      pm.setAttribute('aria-pressed', String(settings.data.pageMarks === 'on'));
      settings.save();
    });
  }
}

/* ---------------- german text ---------------- */

/** Fold to a search normal form: lower case, umlauts resolved, punctuation dropped. */
export function fold(s) {
  return s.toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

export function lookupLinks(word) {
  const w = word.trim().replace(/[^\wäöüßÄÖÜ\-]/g, '');
  if (!w) return [];
  const q = encodeURIComponent(w);
  return [
    ['DWDS', `https://www.dwds.de/wb/${q}`],
    ['Wiktionary', `https://de.wiktionary.org/wiki/${q}`],
    ['dict.cc', `https://www.dict.cc/?s=${q}`],
    ['Leo', `https://www.leo.org/german-english/${q}`],
  ];
}

/* ---------------- data ---------------- */

const cache = new Map();
export async function fetchJSON(url) {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  });
  cache.set(url, p);
  return p;
}

export const fmt = {
  band: (bands) => (bands.length > 1 ? `Bd. ${bands[0]}–${bands.at(-1)}` : `Bd. ${bands[0]}`),
  num: (n) => Number(n).toLocaleString('zh-CN'),
};

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('is-visible'), 1800);
}
