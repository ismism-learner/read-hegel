import fs from 'node:fs';
import { sentencesFromMarked } from './lib/sentences.mjs';

const [vol, chunk, ...bis] = [process.argv[2] || 'w3', process.argv[3] || '0', ...process.argv.slice(4)];
const c = JSON.parse(fs.readFileSync(`web/data/vol/${vol}/${chunk}.json`, 'utf8'));
const t = JSON.parse(fs.readFileSync(`web/data/trans/${vol}/${chunk}.json`, 'utf8'));
const list = bis.length ? bis.map(Number) : [1, 2, 3];
for (const bi of list) {
  const b = c.blocks[bi];
  const tr = t.blocks[String(bi)];
  console.log(`\n===== ${vol}/${chunk}#${bi} (${b.k}) ${tr ? '' : '— UNTRANSLATED'} =====`);
  if (!tr) continue;
  const de = sentencesFromMarked(b.x);
  de.forEach((s, i) => {
    console.log(`DE[${i}] ${s}`);
    console.log(`ZH[${i}] ${tr.zh[i] || ''}`);
    console.log('');
  });
}
