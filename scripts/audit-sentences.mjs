// How many blocks were under-split by markSentences? Compare the stored ns with the number of
// sentences that splitSentences finds in the block's plain text.
//   node scripts/audit-sentences.mjs [--list 20]
import fs from 'node:fs';
import path from 'node:path';
import { sentencesFromMarked, splitSentences, plainOf } from './lib/sentences.mjs';

const args = process.argv.slice(2);
const LIST = Number((() => { const i = args.indexOf('--list'); return i >= 0 ? args[i + 1] : 10; })());

const manifest = JSON.parse(fs.readFileSync('web/data/manifest.json', 'utf8'));
let blocks = 0, under = 0, over = 0, missingSentences = 0, artefactOnly = 0;
const perVol = new Map();
const examples = [];
let translatedAffected = 0, translatedTotal = 0;

for (const v of manifest.volumes) {
  for (const m of v.chunks) {
    const chunk = JSON.parse(fs.readFileSync(path.join('web/data/vol', v.id, `${m.i}.json`), 'utf8'));
    const tf = path.join('web/data/trans', v.id, `${m.i}.json`);
    const trans = fs.existsSync(tf) ? JSON.parse(fs.readFileSync(tf, 'utf8')) : null;
    chunk.blocks.forEach((b, bi) => {
      if (b.k !== 'p') return;
      blocks++;
      const marked = sentencesFromMarked(b.x).length;
      const ideal = splitSentences(plainOf(b.x)).length;
      const isTrans = !!(trans && trans.blocks[String(bi)]);
      if (isTrans) translatedTotal++;
      if (marked < ideal) {
        // a "missing" sentence that carries no letters at all is deliberately dropped by the
        // marker (page numbers, "1)." artefacts, bare dates) — that is not a defect
        const all = splitSentences(plainOf(b.x));
        const letterless = all.filter((s) => !/[A-Za-zÄÖÜäöüßÀ-ÿͰ-Ͽ]/.test(s.text)).length;
        const realMissing = ideal - marked - letterless;
        if (realMissing <= 0) {
          artefactOnly++;
        } else {
          under++;
          missingSentences += realMissing;
          perVol.set(v.id, (perVol.get(v.id) || 0) + 1);
          if (isTrans) translatedAffected++;
          if (examples.length < LIST) examples.push(`${v.id}/${m.i}#${bi} marked=${marked} ideal=${ideal} letterless=${letterless} ns=${b.ns} translated=${isTrans}`);
        }
      } else if (marked > ideal) over++;
    });
  }
}
console.log(`paragraph blocks: ${blocks}`);
console.log(`under-split (marked < ideal, real): ${under}  → ${missingSentences} sentences collapsed`);
console.log(`over-split  (marked > ideal): ${over}`);
console.log(`letterless-only mismatches (deliberate, not defects): ${artefactOnly}`);
console.log(`translated blocks: ${translatedTotal}, of which affected: ${translatedAffected}`);
console.log('per volume:', [...perVol.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join('  '));
console.log('\nexamples:');
for (const e of examples) console.log('  ' + e);
