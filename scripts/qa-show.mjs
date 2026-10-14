import fs from 'node:fs';
import { sentencesFromMarked } from './lib/sentences.mjs';

const r = JSON.parse(fs.readFileSync('data/_qa/report.json', 'utf8'));
const want = process.argv[2] || 'identical to German';
const shown = new Set();
for (const issue of r.issues.filter((i) => i.msg.includes(want)).slice(0, 8)) {
  const [chunkKey, bi] = issue.where.split('#');
  const [v, c] = chunkKey.split('/');
  if (shown.has(chunkKey + bi)) continue;
  shown.add(chunkKey + bi);
  const chunk = JSON.parse(fs.readFileSync(`web/data/vol/${v}/${c}.json`, 'utf8'));
  const tr = JSON.parse(fs.readFileSync(`web/data/trans/${v}/${c}.json`, 'utf8'));
  const b = chunk.blocks[Number(bi)];
  const t = tr.blocks[bi];
  const i = Number((issue.msg.match(/sentence (\d+)/) || [])[1] || 0);
  const de = sentencesFromMarked(b.x)[i];
  console.log(`\n--- ${chunkKey}#${bi} sentence ${i} ---`);
  console.log('DE: ' + (de || '').slice(0, 160));
  console.log('EN: ' + (t.en[i] || '').slice(0, 160));
  console.log('ZH: ' + (t.zh[i] || '').slice(0, 160));
}
