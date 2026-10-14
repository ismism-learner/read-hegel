// One-off: rebuild the missing input payload for unit w1-3-0 (vol w1, chunk 3, block 0)
// with the same logic as scripts/make-jobs.mjs, but covering the whole remaining chunk.
import fs from 'node:fs';
import { plainOf, sentencesFromMarked } from '../../scripts/lib/sentences.mjs';

const m = JSON.parse(fs.readFileSync('web/data/manifest.json', 'utf8'));
const v = m.volumes.find((x) => x.id === 'w1');
const C = 3;
const chunk = JSON.parse(fs.readFileSync(`web/data/vol/w1/${C}.json`, 'utf8'));
const meta = v.chunks.find((x) => x.i === C);
const blocks = [];
chunk.blocks.forEach((b, bi) => {
  if (b.k !== 'p' && b.k !== 'h') return;
  blocks.push(b.k === 'h'
    ? { bi, k: 'h', hash: b.hash, text: plainOf(b.x).trim() }
    : { bi, k: 'p', hash: b.hash, sents: sentencesFromMarked(b.x) });
});
const payload = {
  id: `w1-${C}-0`,
  volume: { id: v.id, bands: v.bands, de: v.de, zh: v.zh },
  chunk: C,
  chunkTitle: (meta && meta.t) || chunk.t,
  heading: (blocks.find((b) => b.k === 'h') || {}).text || '',
  blocks,
  outFile: `web/data/trans/w1/${C}.p0.json`,
};
fs.writeFileSync(`data/_jobs/w1-${C}-0.in.json`, JSON.stringify(payload, null, 1), 'utf8');
console.log('blocks', blocks.length,
  'heads', blocks.filter((b) => b.k === 'h').length,
  'paras', blocks.filter((b) => b.k === 'p').length,
  'sents', blocks.reduce((a, b) => a + (b.sents ? b.sents.length : 0), 0));
