// Validate built data: chunk sizes, markup balance, chrome leakage, nav integrity.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'web/data';
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
const CHROME = /MLCLASSIC|navbar|doc-wrapper|doc-content|sidebar|font-btn|theme-toggle|crumb|pagination/;

const VOIDT = new Set(['br', 'img', 'hr', 'input', 'meta', 'link']);
/** Verify every block's tags are properly nested; a mis-nested sentence span hides text on hover. */
const nestingErrors = (html) => {
  const stack = [];
  const bad = [];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g)) {
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    if (VOIDT.has(name) || m[3] === '/') continue;
    if (!closing) stack.push(name);
    else {
      if (stack.at(-1) === name) stack.pop();
      else bad.push(`</${name}> while <${stack.at(-1) || '-'}> open`);
    }
  }
  if (stack.length) bad.push(`unclosed: ${stack.join(',')}`);
  return bad;
};

let totalChunks = 0, badChrome = [], bigChunks = [], emptyChunks = [], misnested = [], spanMismatch = [];
const openClose = (html) => {
  const counts = {};
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi)) {
    if (m[2] === '/') continue;
    const t = m[1].toLowerCase();
    if (['br', 'img', 'hr'].includes(t)) continue;
    counts[t] = (counts[t] || 0) + 1;
  }
  for (const m of html.matchAll(/<\/([a-z][a-z0-9]*)\s*>/gi)) {
    const t = m[1].toLowerCase();
    counts[t] = (counts[t] || 0) - 1;
  }
  return Object.entries(counts).filter(([, v]) => v !== 0);
};

for (const v of manifest.volumes) {
  const dir = path.join(OUT, 'vol', v.id);
  const nav = JSON.parse(fs.readFileSync(path.join(dir, 'nav.json'), 'utf8'));
  const idx = JSON.parse(fs.readFileSync(path.join(dir, 'idx.json'), 'utf8'));
  let chars = 0;
  const walk = (nodes, depth) => nodes.forEach((n) => { if (n.c >= v.chunks.length) console.log(`  BAD NAV ${v.id} ${n.t} -> chunk ${n.c}`); walk(n.k, depth + 1); });
  walk(nav, 0);
  for (let i = 0; i < v.chunks.length; i++) {
    const p = path.join(dir, `${i}.json`);
    if (!fs.existsSync(p)) { console.log(`  MISSING ${v.id}/${i}.json`); continue; }
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    const html = c.blocks ? c.blocks.map((b) => b.x).join('\n') : (c.html || '');
    totalChunks++;
    chars += html.length;
    if (html.length > 200 * 1024) bigChunks.push(`${v.id}/${i} ${(html.length / 1024) | 0}KB`);
    if (html.replace(/<[^>]+>/g, '').trim().length < 40) emptyChunks.push(`${v.id}/${i}`);
    if (CHROME.test(html)) badChrome.push(`${v.id}/${i}`);
    for (const b of c.blocks || []) {
      if (b.k !== 'p') continue;
      const spans = (b.x.match(/<span class="s"/g) || []).length;
      if (b.ns && spans !== b.ns) spanMismatch.push(`${v.id}/${i} b${c.blocks.indexOf(b)}: ${spans} spans vs ns=${b.ns}`);
      const errs = nestingErrors(b.x);
      if (errs.length && misnested.length < 20) misnested.push(`${v.id}/${i} b${c.blocks.indexOf(b)}: ${errs[0]}`);
    }
    const un = openClose(html);
    if (un.length && i < 3) console.log(`  UNBALANCED ${v.id}/${i}: ${JSON.stringify(un.slice(0, 6))}`);
  }
  console.log(`${v.id.padEnd(4)} chunks=${String(v.chunks.length).padStart(3)} navRoots=${nav.length} terms=${Object.keys(idx).length} chars=${chars}`);
}
console.log(`\ntotal chunks=${totalChunks} chrome-leak=${badChrome.length} oversized=${bigChunks.length} near-empty=${emptyChunks.length} misnested=${misnested.length} span-count-mismatch=${spanMismatch.length}`);
if (misnested.length) console.log('misnested: ' + misnested.slice(0, 8).join(' | '));
if (spanMismatch.length) console.log('span mismatch: ' + spanMismatch.slice(0, 8).join(' | '));
if (badChrome.length) console.log('chrome: ' + badChrome.slice(0, 10).join(', '));
if (bigChunks.length) console.log('oversized: ' + bigChunks.slice(0, 10).join(', '));
if (emptyChunks.length) console.log('empty: ' + emptyChunks.slice(0, 10).join(', '));
