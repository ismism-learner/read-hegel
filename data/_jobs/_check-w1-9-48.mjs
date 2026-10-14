import fs from 'node:fs';
import { sentencesFromMarked } from '../../scripts/lib/sentences.mjs';

const c = JSON.parse(fs.readFileSync('web/data/vol/w1/9.json', 'utf8'));
const job = JSON.parse(fs.readFileSync('data/_jobs/w1-9-48.in.json', 'utf8'));
for (const blk of job.blocks) {
  const b = c.blocks[blk.bi];
  const src = sentencesFromMarked(b.x);
  const same = src.length === blk.sents.length && src.every((s, i) => s === blk.sents[i]);
  console.log(blk.bi, 'src=' + src.length, 'job=' + blk.sents.length, 'identical=' + same, 'hash=' + (b.hash === blk.hash));
  if (!same) src.forEach((s, i) => { if (s !== blk.sents[i]) console.log('  DIFF', i, JSON.stringify(s).slice(0, 200), '||', JSON.stringify(blk.sents[i]).slice(0, 200)); });
}
