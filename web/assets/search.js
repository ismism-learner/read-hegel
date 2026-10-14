// Corpus access + full-text search over the built data.
import { fetchJSON, fold, escapeHtml, stripTags } from './util.js';

const VOL_BASE = 'data/vol/';

/** Split a chunk's HTML into top-level blocks with plain text, for snippet building. */
export function splitBlocks(html) {
  const blocks = [];
  const re = /<(h[1-6]|p|div|table|ol|ul|blockquote|aside|section)\b([^>]*?)(\/?)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    const start = m.index;
    if (m[3] === '/') { blocks.push({ tag, html: m[0] }); continue; }
    const re2 = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
    re2.lastIndex = re.lastIndex;
    let depth = 1, m2, end = -1;
    while ((m2 = re2.exec(html))) {
      if (m2[1] === '/') { depth--; if (depth === 0) { end = re2.lastIndex; break; } }
      else depth++;
    }
    if (end < 0) continue;
    const inner = html.slice(start, end);
    blocks.push({ tag, html: inner });
    re.lastIndex = end;
  }
  return blocks;
}

/** Locate the paragraph index of a block inside the chunk payload that the reader renders. */
export function blockIndexOf(blocks, needle) {
  return blocks.findIndex((b) => b.html === needle);
}

export class Corpus {
  constructor(manifest) {
    this.manifest = manifest;
    this.byId = new Map(manifest.volumes.map((v) => [v.id, v]));
    this.indexes = new Map();
    this.navs = new Map();
  }

  volume(id) { return this.byId.get(id); }

  async nav(id) {
    if (!this.navs.has(id)) this.navs.set(id, await fetchJSON(`${VOL_BASE}${id}/nav.json`));
    return this.navs.get(id);
  }

  chunk(id, n) { return fetchJSON(`${VOL_BASE}${id}/${n}.json`); }

  async index(id) {
    if (!this.indexes.has(id)) this.indexes.set(id, await fetchJSON(`${VOL_BASE}${id}/idx.json`));
    return this.indexes.get(id);
  }

  /** Load every volume index (≈4 MB) with progress reporting. */
  async allIndexes(onProgress) {
    const ids = this.manifest.volumes.map((v) => v.id);
    let done = 0;
    await Promise.all(ids.map(async (id) => {
      await this.index(id);
      done++;
      onProgress?.(done, ids.length);
    }));
  }

  get loaded() { return this.indexes.size; }

  /**
   * Search the term index. All query terms must occur in a chunk when possible;
   * otherwise chunks matching any term are returned.
   * @returns {{hits: {vol:string,c:number,score:number,terms:string[]}[], all:boolean}}
   */
  search(query, { volume = null, limit = 400 } = {}) {
    const terms = [...new Set(fold(query).split(' ').filter((t) => t.length >= 2))];
    const volumes = volume ? [this.byId.get(volume)] : this.manifest.volumes;
    const hits = new Map();
    let matchedAll = true;

    for (const v of volumes) {
      const idx = this.indexes.get(v.id);
      if (!idx) continue;
      const lists = terms.map((t) => ({ t, c: idx[t] }));
      for (const { t, c } of lists) {
        if (!c) continue;
        const weight = 1 / Math.log(2 + c.length);
        for (const ci of c) {
          const k = v.id + '/' + ci;
          const h = hits.get(k) || { vol: v.id, c: ci, score: 0, terms: new Set() };
          h.score += weight;
          h.terms.add(t);
          hits.set(k, h);
        }
      }
    }

    let out = [...hits.values()];
    const full = out.filter((h) => h.terms.size === terms.length);
    if (terms.length > 1 && full.length) out = full;
    else if (terms.length > 1 && !full.length) matchedAll = false;

    out.sort((a, b) => b.score - a.score || (b.terms.size - a.terms.size));
    for (const h of out) h.terms = [...h.terms];
    return { hits: out.slice(0, limit), all: matchedAll, terms };
  }

  /** Build readable snippets for the given hits by loading their chunks. */
  async snippets(hits, terms, { maxHits = 40, perHit = 2, context = 130 } = {}) {
    const out = [];
    for (const h of hits.slice(0, maxHits)) {
      let chunk;
      try { chunk = await this.chunk(h.vol, h.c); } catch { continue; }
      const blocks = (chunk.blocks || []).map((b, i) => ({ kind: b.k, html: b.x || '', bi: i }));
      const found = [];
      for (const b of blocks) {
        if (found.length >= perHit) break;
        if (b.kind !== 'p') continue;
        const text = stripTags(b.html);
        if (text.length < 24) continue;
        const f = fold(text);
        const t = terms.find((x) => f.includes(x));
        if (!t) continue;
        found.push({ bi: b.bi, snippet: makeSnippet(text, terms, context), tag: 'p' });
      }
      const fallback = stripTags(blocks.map((b) => b.html).join(' '));
      out.push({
        ...h,
        title: chunk.t,
        cr: chunk.cr,
        parts: found.length ? found : [{ bi: 0, snippet: makeSnippet(fallback, terms, context), tag: 'p' }],
      });
    }
    return out;
  }

  /** Heading-level matches in the table of contents. */
  async tocMatches(query, limit = 30) {
    const f = fold(query);
    if (f.length < 2) return [];
    const flat = [];
    for (const v of this.manifest.volumes) {
      const nav = await this.nav(v.id);
      const walk = (nodes) => {
        for (const n of nodes) {
          if (fold(n.t).includes(f)) flat.push({ vol: v.id, t: n.t, a: n.a, c: n.c });
          walk(n.k);
        }
      };
      walk(nav);
    }
    return flat.slice(0, limit);
  }
}

function makeSnippet(text, terms, context) {
  const f = fold(text);
  let at = -1;
  for (const t of terms) {
    const i = f.indexOf(t);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) at = 0;
  let start = Math.max(0, at - Math.floor(context / 2));
  let end = Math.min(text.length, start + context * 2);
  if (start > 0) {
    const sp = text.indexOf(' ', start);
    if (sp > 0 && sp < start + 25) start = sp + 1;
  }
  let s = escapeHtml(text.slice(start, end).trim());
  // highlight every term occurrence in the escaped snippet
  for (const t of terms) {
    const rx = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    s = s.replace(rx, (m) => `<mark>${m}</mark>`);
  }
  return (start > 0 ? '… ' : '') + s + (end < text.length ? ' …' : '');
}

/** Wrap term occurrences in an already-rendered HTML string, skipping tags. */
export function highlightHtml(html, terms) {
  if (!terms?.length) return html;
  const rx = new RegExp(terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
  // map folded letters back: match on a per-character basis using a folded view
  return html.replace(/>([^<]+)</g, (full, text) => {
    if (!/[a-zA-ZäöüÄÖÜß]/.test(text)) return full;
    const folded = fold(text);
    if (!rx.test(folded)) return full;
    // simple case-insensitive replace on the raw text where folding is identity
    const parts = text.replace(new RegExp(terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi'), (m) => `\u0001${m}\u0002`);
    return '>' + parts + '<';
  }).replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>');
}
