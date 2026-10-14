// Build repair jobs for sentences whose Chinese lost a German word-family root.
//   node scripts/make-family-jobs.mjs [--size 30]
// Writes data/_jobs/family-<k>.in.json : { id, kind:"family", items:[{vol,chunk,bi,si,de,zh,en,family,root,member}] }
import fs from 'node:fs';
import path from 'node:path';
import { sentencesFromMarked } from './lib/sentences.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const SIZE = Number(opt('size', 30));
const OUTD = 'web/data';

const lines = fs.readFileSync('glossary/hegel_families.csv', 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
const head = lines.shift().split(',');
const ix = (n) => head.indexOf(n);
const fam = [];
for (const l of lines) {
  const c = l.split(',');
  if ((c[ix('sense')] || '') !== 'systematic') continue;
  fam.push({ family: c[ix('family')], root: c[ix('root_zh')], de: c[ix('member_de')], zh: c[ix('member_zh')] });
}

const items = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!/^\d+\.json$/.test(e.name)) continue;
    const vol = path.basename(path.dirname(p));
    const chunkNo = e.name.replace('.json', '');
    const chunk = JSON.parse(fs.readFileSync(path.join(OUTD, 'vol', vol, `${chunkNo}.json`), 'utf8'));
    const tr = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const [key, val] of Object.entries(tr.blocks || {})) {
      const b = chunk.blocks[Number(key)];
      if (!b || b.k !== 'p' || !Array.isArray(val.zh)) continue;
      const de = sentencesFromMarked(b.x);
      de.forEach((src, i) => {
        const zh = val.zh[i] || '';
        for (const f of fam) {
          const esc = f.de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (!new RegExp(`(?<![A-Za-zÄÖÜäöüß])${esc}[a-zäöüß]{0,3}(?![A-Za-zÄÖÜäöüß])`).test(src)) continue;
          if (zh.includes(f.root) || zh.includes(f.zh)) continue;
          items.push({ vol, chunk: chunkNo, bi: Number(key), si: i, de: src, en: (val.en || [])[i] || '', zh, family: f.family, root: f.root, member: f.de });
        }
      });
    }
  }
};
walk(path.join(OUTD, 'trans'));

fs.mkdirSync('data/_jobs', { recursive: true });
let k = 0;
for (let i = 0; i < items.length; i += SIZE) {
  const batch = items.slice(i, i + SIZE);
  const id = `family-${String(++k).padStart(2, '0')}`;
  const outFile = `data/_jobs/${id}.in.json`;
  fs.writeFileSync(outFile, JSON.stringify({
    id, kind: 'family-repair',
    instruction: 'Fix ONLY the word-family rendering in the Chinese. Keep everything else identical; do not retranslate the sentence, do not polish it. Return the corrected Chinese sentence.',
    items: batch,
  }, null, 1), 'utf8');
}
console.log(`family-repair jobs: ${k} batches, ${items.length} sentences`);
const byFam = new Map();
for (const i of items) byFam.set(i.family, (byFam.get(i.family) || 0) + 1);
for (const [f, n] of [...byFam.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${f}`);
