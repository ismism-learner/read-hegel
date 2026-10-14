// Build the reading site data from the raw Hegel "Werke" HTML corpus.
//
// Input : data/_raw/gh/HEGEL/<band>/*.html
// Output: web/data/manifest.json
//         web/data/vol/<id>/nav.json     (heading tree)
//         web/data/vol/<id>/<n>.json     (text chunks)
//         web/data/vol/<id>/idx.json     (term -> chunk postings)
//         web/data/img/<dir>/*.gif|jpg   (figures)
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { markSentences, hashText } from './lib/sentences.mjs';

const RAW = 'data/_raw/gh/HEGEL';
const OUT = 'web/data';

const VOLUMES = [
  { id: 'w1', dir: '1', bands: [1], de: 'Frühe Schriften', zh: '早期著作', years: '1793–1800' },
  { id: 'w2', dir: '2', bands: [2], de: 'Jenaer Schriften 1801–1807', zh: '耶拿时期著作', years: '1801–1807' },
  { id: 'w3', dir: '3', bands: [3], de: 'Phänomenologie des Geistes', zh: '精神现象学', years: '1807' },
  { id: 'w4', dir: '4', bands: [4], de: 'Nürnberger und Heidelberger Schriften 1808–1817', zh: '纽伦堡与海德堡时期著作', years: '1808–1817' },
  { id: 'w5', dir: '5', bands: [5, 6], de: 'Wissenschaft der Logik', zh: '逻辑学（大逻辑）', years: '1812–1816' },
  { id: 'w7', dir: '7', bands: [7], de: 'Grundlinien der Philosophie des Rechts', zh: '法哲学原理', years: '1821' },
  { id: 'w10', dir: '10', bands: [8, 9, 10], de: 'Enzyklopädie der philosophischen Wissenschaften im Grundrisse', zh: '哲学科学全书纲要', years: '1830' },
  { id: 'w11', dir: '11', bands: [11], de: 'Berliner Schriften 1818–1831', zh: '柏林时期著作', years: '1818–1831' },
  { id: 'w12', dir: '12', bands: [12], de: 'Vorlesungen über die Philosophie der Geschichte', zh: '历史哲学讲演录', years: '1822–1831' },
  { id: 'w13', dir: '13', bands: [13, 14, 15], de: 'Vorlesungen über die Ästhetik', zh: '美学讲演录', years: '1820–1829' },
  { id: 'w16', dir: '16', bands: [16, 17], de: 'Vorlesungen über die Philosophie der Religion', zh: '宗教哲学讲演录', years: '1821–1831' },
  { id: 'w18', dir: '18', bands: [18, 19, 20], de: 'Vorlesungen über die Geschichte der Philosophie', zh: '哲学史讲演录', years: '1805–1831' },
];

const KEEP_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'i', 'b', 'em', 'strong', 'sup', 'sub', 'br', 'a', 'span', 'blockquote', 'ol', 'ul', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'img', 'hr', 'center', 'dl', 'dt', 'dd', 'pre', 'code', 'aside', 'figure', 'figcaption', 'small']);
const KEEP_ATTRS = new Set(['id', 'class', 'href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'data-b', 'data-p']);
const VOID_TAGS = new Set(['br', 'img', 'hr']);

const stripBom = (s) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);

/** Extract the inner HTML of the <div class="prose" id="content"> container (built pages) or <body>. */
function contentRegion(html) {
  const m = html.match(/<div class="prose" id="content">/i);
  if (m) {
    const inner = innerOfDiv(html, m.index + m[0].length);
    if (inner) return inner;
  }
  const b = html.match(/<body[^>]*>/i);
  const e = html.lastIndexOf('</body>');
  if (b && e > b.index) return html.slice(b.index + b[0].length, e);
  return html;
}

/** Return the substring inside a div whose content starts at `from`, by counting nesting. */
function innerOfDiv(html, from) {
  let depth = 1;
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = from;
  let m;
  while ((m = re.exec(html))) {
    if (m[0][1] === '/') {
      depth--;
      if (depth === 0) return html.slice(from, m.index);
    } else depth++;
  }
  return null;
}

/** Find the index just past the matching close tag of `tag` starting at `from`. */
function afterClose(html, tag, from) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    if (m[1] === '/') { depth--; if (depth === 0) return re.lastIndex; }
    else depth++;
  }
  return -1;
}

function splitBlocks(inner) {
  const blocks = [];
  const re = /<(h[1-6]|p|aside|ol|ul|table|blockquote|div|pre|center|hr)\b([^>]*?)(\/?)>/gi;
  let m;
  while ((m = re.exec(inner))) {
    const tag = m[1].toLowerCase();
    const start = m.index;
    if (tag === 'hr' || m[3] === '/') {
      blocks.push({ tag, attrs: m[2], html: m[0] });
      continue;
    }
    const end = afterClose(inner, tag, re.lastIndex);
    if (end < 0) { re.lastIndex = re.lastIndex; continue; }
    blocks.push({ tag, attrs: m[2], html: inner.slice(start, end) });
    re.lastIndex = end;
  }
  return blocks;
}

/** Sanitise markup, rewrite ids/page anchors/images/formulas for the reader. */
function clean(html, ctx) {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<\?[\s\S]*?\?>/g, '');

  // print-page anchors: <a id="S8-192"></a>  ->  marker element
  s = s.replace(/<a\s+id="S(\d+)-(\d+)"><\/a>/gi, (_x, b, p) => `<span class="pg" data-b="${b}" data-p="${p}" title="Werke ${b}, S. ${p}"></span>`);

  // OCR/zeno oddities
  s = s.replace(/<em class="hidden">([\s\S]*?)<\/em>/gi, (_x, t) => `<span class="malt" title="Formel als Text">${t}</span>`);
  s = s.replace(/<em class="seite">([\s\S]*?)<\/em>/gi, (_x, t) => `<span class="seite">${t}</span>`);

  // figures
  s = s.replace(/<img([^>]*?)src="(HE\d+-img\d+\.(?:gif|jpg|jpeg|png))"/gi,
    (_x, pre, file) => `<img${pre}src="data/img/${ctx.dir}/${file}"`);

  // tag / attribute filtering
  s = s.replace(/<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*?)?)(\/?)>/g, (full, name, attrs, selfClose) => {
    const tag = name.toLowerCase();
    if (!KEEP_TAGS.has(tag)) return '';
    const kept = [];
    for (const a of attrs.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g)) {
      const k = a[1].toLowerCase();
      if (!KEEP_ATTRS.has(k) && !k.startsWith('data-')) continue;
      let v = a[2];
      if (k === 'id') v = ctx.prefix + v;
      if (k === 'href' && v.startsWith('#')) v = '#' + ctx.prefix + v.slice(1);
      kept.push(`${k}="${v.replace(/"/g, '&quot;')}"`);
    }
    return `<${tag}${kept.length ? ' ' + kept.join(' ') : ''}${VOID_TAGS.has(tag) ? ' /' : ''}>`;
  });
  s = s.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)\s*>/g, (full, name) => (KEEP_TAGS.has(name.toLowerCase()) ? `</${name.toLowerCase()}>` : ''));
  return s;
}

const textOf = (html) => html
  .replace(/<span class="pg"[^>]*><\/span>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const fold = (s) => s.toLowerCase()
  .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const STOP = new Set(('der die das des dem den ein eine einen einem eines einer und oder aber als also auf aus bei bis durch fuer für gegen ist sind war waren wird werden wurde wurden ' +
  'ich du er sie es wir ihr nicht nur noch schon auch dass dasz sich selbst nach von vom vor zum zur mit im in an am so wie wenn dann denn doch hier dort diese dieser dieses diesen ' +
  'hat habe haben hatte hatten sein seine seinen seinem seiner kann koennen können muss muessen müssen soll sollen will wollen mag moegen mögen ware wäre waere gewesen').split(/\s+/));

async function buildVolume(vol) {
  const dir = path.join(RAW, vol.dir);
  const files = fs.readdirSync(dir).filter((f) => /^HE\d+-\d+\.html$/.test(f)).sort();
  const blocks = [];
  const fns = [];
  const postings = new Map();

  files.forEach((file, fi) => {
    const raw = stripBom(fs.readFileSync(path.join(dir, file), 'utf8'));
    const prefix = `f${fi}-`;
    const region = contentRegion(raw);
    for (const b of splitBlocks(region)) {
      if (b.tag === 'aside' && /class="fn"/.test(b.attrs)) {
        for (const m of b.html.matchAll(/<p class="fni">([\s\S]*?)<\/p>/gi)) {
          const item = clean(m[1], { prefix, dir: vol.dir });
          const idm = item.match(/id="([^"]+)"/);
          fns.push({ id: idm ? idm[1] : '', html: item });
        }
        continue;
      }
      const html = clean(b.html, { prefix, dir: vol.dir });
      if (!html.trim()) continue;
      if (/^h[1-6]$/.test(b.tag)) {
        const idm = html.match(/id="([^"]+)"/);
        blocks.push({ kind: 'h', level: +b.tag[1], html, id: idm ? idm[1] : '', text: textOf(html) });
      } else {
        blocks.push({ kind: 'b', tag: b.tag, html, text: textOf(html) });
      }
    }
  });

  // chunking: cut at headings once a chunk holds enough text, with a hard cap
  const SOFT = 45 * 1024, HARD = 150 * 1024;
  const chunks = [];
  let cur = { size: 0, blocks: [], title: '', anchor: '', crumbs: [] };
  const crumbs = [];
  const flush = () => {
    if (!cur.blocks.length) return;
    chunks.push({ blocks: cur.blocks.slice(), title: cur.title, anchor: cur.anchor, crumbs: cur.crumbs.slice() });
    cur = { size: 0, blocks: [], title: '', anchor: '', crumbs: crumbs.slice() };
  };
  for (const b of blocks) {
    if (b.kind === 'h') {
      const lvl = b.level;
      while (crumbs.length && crumbs.at(-1).l >= lvl) crumbs.pop();
      if (cur.size >= SOFT) flush();
      crumbs.push({ l: lvl, t: b.text, a: b.id });
      if (!cur.title) { cur.title = b.text; cur.anchor = b.id; }
    }
    cur.blocks.push(b);
    cur.size += b.html.length;
    if (cur.size >= HARD) flush();
  }
  flush();

  // footnotes referenced inside a chunk become its trailing block.
  // --drop-editorial omits them: they are the *editors'* apparatus (source references, textual notes)
  // and are a different copyright layer from Hegel's own text, which is public domain.
  const DROP_EDITORIAL = process.argv.includes('--drop-editorial');
  chunks.forEach((c) => {
    const html = c.blocks.map((b) => b.html).join('\n');
    const footnotes = fns.filter((f) => f.id && html.includes(`href="#${f.id}"`));
    if (footnotes.length && !DROP_EDITORIAL) {
      const x = `<section class="footnotes"><h3 class="fnhead">Anmerkungen</h3>${footnotes.map((f) => `<p class="fni">${f.html}</p>`).join('\n')}</section>`;
      c.blocks.push({ kind: 'fn', html: x, text: textOf(x) });
    }
  });
  if (DROP_EDITORIAL) console.log('  --drop-editorial: editors\' apparatus (fn blocks) omitted');

  // navigation tree
  const nav = [];
  const stack = [];
  chunks.forEach((c, ci) => {
    for (const b of c.blocks) {
      if (b.kind !== 'h') continue;
      const node = { t: b.text, l: b.level, a: b.id, c: ci, k: [] };
      while (stack.length && stack.at(-1).l >= b.level) stack.pop();
      if (stack.length) stack.at(-1).k.push(node); else nav.push(node);
      stack.push(node);
    }
  });

  // term index: term -> chunk ordinals
  chunks.forEach((c, ci) => {
    const seen = new Set();
    const text = c.blocks.map((b) => b.text).join(' ');
    for (const w of fold(text).split(' ')) {
      if (w.length < 2 || STOP.has(w) || seen.has(w)) continue;
      seen.add(w);
      let arr = postings.get(w);
      if (!arr) { arr = []; postings.set(w, arr); }
      if (arr.at(-1) !== ci) arr.push(ci);
    }
  });

  const outDir = path.join(OUT, 'vol', vol.id);
  await fsp.mkdir(outDir, { recursive: true });
  const metas = [];
  let sentenceTotal = 0;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const outBlocks = c.blocks.map((b, bi) => {
      const plain = b.text || textOf(b.html);
      const isPara = b.kind === 'b' || b.kind === 'p';
      const rec = { k: b.kind === 'h' ? 'h' : b.kind === 'fn' ? 'fn' : 'p', x: b.html, hash: hashText(plain) };
      if (b.kind === 'h') { rec.l = b.level; rec.id = b.id; }
      if (isPara) {
        const marked = markSentences(b.html, `b${bi}`);
        rec.x = marked.html;
        rec.ns = marked.sentences.length;
        sentenceTotal += marked.sentences.length;
      }
      return rec;
    });
    const payload = { v: vol.id, i, t: c.title, cr: c.crumbs.map((x) => x.t), blocks: outBlocks };
    await fsp.writeFile(path.join(outDir, `${i}.json`), JSON.stringify(payload), 'utf8');
    metas.push({ i, t: c.title, a: c.anchor, sent: outBlocks.reduce((a, b) => a + (b.ns || 0), 0) });
  }
  await fsp.writeFile(path.join(outDir, 'nav.json'), JSON.stringify(nav), 'utf8');
  const idx = {};
  for (const [t, arr] of [...postings.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) idx[t] = arr;
  await fsp.writeFile(path.join(outDir, 'idx.json'), JSON.stringify(idx), 'utf8');

  const copyImgs = async () => {
    const imgDir = path.join(OUT, 'img', vol.dir);
    const imgs = fs.readdirSync(dir).filter((f) => /^HE\d+-img\d+\.(gif|jpg|jpeg|png)$/i.test(f));
    if (!imgs.length) return;
    await fsp.mkdir(imgDir, { recursive: true });
    for (const f of imgs) await fsp.copyFile(path.join(dir, f), path.join(imgDir, f));
  };
  await copyImgs();

  const chars = chunks.reduce((a, c) => a + c.blocks.reduce((s, b) => s + b.html.length, 0), 0);
  const plain = blocks.reduce((a, b) => a + (b.text ? b.text.length : 0), 0);
  console.log(`${vol.id}  dir=${vol.dir}  files=${files.length}  chunks=${chunks.length}  headings=${nav.length} roots  terms=${postings.size}  MB=${(chars / 1048576).toFixed(2)}  plain=${(plain / 10000).toFixed(1)}万  sentences=${sentenceTotal}`);
  return { ...vol, chunks: metas, chars, plain, sentences: sentenceTotal, navRoots: nav.length, terms: postings.size };
}

await fsp.rm(path.join(OUT, 'vol'), { recursive: true, force: true });
await fsp.mkdir(OUT, { recursive: true });
const vols = [];
for (const v of VOLUMES) vols.push(await buildVolume(v));

const manifest = {
  title: 'Hegel — Werke in zwanzig Bänden',
  subtitle: '德文《黑格尔全集》在线阅读',
  source: {
    edition: 'G. W. F. Hegel: Werke in 20 Bänden. Hrsg. von Eva Moldenhauer und Karl Markus Michel. Frankfurt am Main: Suhrkamp, 1969 ff.',
    digital: 'Digitalisierung: Hegel-Institut Berlin / Talpa-Verlag; Textkorpus über das MLCLASSIC-Archiv (marx-ebooks.github.io).',
    publicDomain: 'Ergänzend: Deutsches Textarchiv (Erstausgaben von Phänomenologie 1807 und Wissenschaft der Logik 1812/13/16).',
  },
  volumes: vols,
};
await fsp.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
console.log(`\nmanifest written: ${vols.length} volumes, ${vols.reduce((a, v) => a + v.chunks.length, 0)} chunks, ${(vols.reduce((a, v) => a + v.plain, 0) / 1048576).toFixed(1)} MB plain text`);
