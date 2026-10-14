// Add a missing termbase entry and normalise its rendering across the translated corpus.
//   node scripts/fix-term.mjs --de Tun --zh 行动 [--apply]
// Only rewrites a sentence when the German really contains the term and the German does NOT
// contain a competing word that legitimately renders as the same Chinese string.
import fs from 'node:fs';
import path from 'node:path';
import { sentencesFromMarked } from './lib/sentences.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const DE = opt('de', '');
const ZH = opt('zh', '');
const FROM = opt('from', '');          // the wrong rendering currently used
const GUARD = opt('guard', '');        // if the German matches this, skip the sentence
const APPLY = args.includes('--apply');
if (!DE || !ZH || !FROM) { console.error('usage: --de Tun --zh 行动 --from 作为 [--guard "\\bals\\b"] [--apply]'); process.exit(2); }

const deRe = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${DE}(?![A-Za-zÄÖÜäöüß])`);
const guardRe = GUARD ? new RegExp(GUARD) : null;

let scanned = 0, candidates = 0, skippedGuard = 0, changed = 0;
const perChunk = new Map();

const manifest = JSON.parse(fs.readFileSync('web/data/manifest.json', 'utf8'));
for (const v of manifest.volumes) {
  for (const m of v.chunks) {
    const tf = path.join('web/data/trans', v.id, `${m.i}.json`);
    if (!fs.existsSync(tf)) continue;
    const tr = JSON.parse(fs.readFileSync(tf, 'utf8'));
    const chunk = JSON.parse(fs.readFileSync(path.join('web/data/vol', v.id, `${m.i}.json`), 'utf8'));
    let dirty = false;
    for (const [key, val] of Object.entries(tr.blocks || {})) {
      const b = chunk.blocks[Number(key)];
      if (!b || b.k !== 'p' || !Array.isArray(val.zh)) continue;
      const de = sentencesFromMarked(b.x);
      de.forEach((s, i) => {
        scanned++;
        if (!deRe.test(s)) return;
        const zh = val.zh[i] || '';
        if (!zh.includes(FROM)) return;
        candidates++;
        if (guardRe && guardRe.test(s)) { skippedGuard++; return; }
        const next = zh.split(FROM).join(ZH);
        if (next === zh) return;
        val.zh[i] = next;
        changed++; dirty = true;
        perChunk.set(`${v.id}/${m.i}`, (perChunk.get(`${v.id}/${m.i}`) || 0) + 1);
      });
    }
    if (dirty && APPLY) fs.writeFileSync(tf, JSON.stringify(tr), 'utf8');
  }
}
console.log(`sentences scanned: ${scanned}`);
console.log(`sentences with “${DE}” + “${FROM}”: ${candidates}`);
if (GUARD) console.log(`skipped because the German matches the guard (${GUARD}): ${skippedGuard}`);
console.log(`${APPLY ? 'rewritten' : 'to rewrite'}: ${changed}`);
console.log('per chunk:', [...perChunk.entries()].map(([k, n]) => `${k}:${n}`).join('  ') || 'none');
if (!APPLY) console.log('(dry run — pass --apply to write)');
