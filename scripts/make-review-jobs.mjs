// Build conservative-review jobs for an already translated chunk.
//   node scripts/make-review-jobs.mjs --vol w3 --chunk 2 [--size 30]
// item = { vol, chunk, bi, si, de, en, zh }; the agent returns corrected zh only.
import fs from 'node:fs';
import path from 'node:path';
import { sentencesFromMarked } from './lib/sentences.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const VOL = opt('vol', 'w3');
const CHUNK = opt('chunk', '2');
const SIZE = Number(opt('size', 30));

const chunk = JSON.parse(fs.readFileSync(`web/data/vol/${VOL}/${CHUNK}.json`, 'utf8'));
const trans = JSON.parse(fs.readFileSync(`web/data/trans/${VOL}/${CHUNK}.json`, 'utf8'));

const items = [];
chunk.blocks.forEach((b, bi) => {
  const t = trans.blocks?.[String(bi)];
  if (!t || b.k !== 'p') return;
  const de = sentencesFromMarked(b.x);
  de.forEach((s, si) => {
    items.push({ vol: VOL, chunk: CHUNK, bi, si, de: s, en: (t.en || [])[si] || '', zh: (t.zh || [])[si] || '' });
  });
});

fs.mkdirSync('data/_jobs', { recursive: true });
let k = 0;
const ids = [];
for (let i = 0; i < items.length; i += SIZE) {
  const id = `rev-${VOL}-${CHUNK}-${String(++k).padStart(2, '0')}`;
  fs.writeFileSync(`data/_jobs/${id}.in.json`, JSON.stringify({
    id, kind: 'conservative-review', vol: VOL, chunk: CHUNK,
    instruction: 'Fix ONLY clear defects (mistranslation, omission, addition, untranslated German, terminology/forbidden violations, unreadable machine style). Return the corrected Chinese; return the current one unchanged when there is no clear defect. Never retranslate for style.',
    items: items.slice(i, i + SIZE),
  }, null, 1), 'utf8');
  ids.push(id);
}
console.log(`review jobs: ${ids.length} batches, ${items.length} sentences (${VOL}/${CHUNK})`);
console.log(ids.join(' '));
