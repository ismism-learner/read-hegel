import fs from 'node:fs';
import { sentencesFromMarked } from './lib/sentences.mjs';

const pairs = [[17, 0], [38, 0], [21, 0]];
const c = JSON.parse(fs.readFileSync('web/data/vol/w3/4.json', 'utf8'));
const t = JSON.parse(fs.readFileSync('web/data/trans/w3/4.json', 'utf8'));
for (const [bi, si] of pairs) {
  const de = sentencesFromMarked(c.blocks[bi].x)[si];
  console.log(`\n=== w3/4#${bi}.${si} ===`);
  console.log('DE: ' + de);
  console.log('ZH: ' + t.blocks[String(bi)].zh[si]);
}
// what does the termbase say about these German terms?
const ctx = JSON.parse(fs.readFileSync('data/_jobs/context-w3.json', 'utf8'));
for (const term of ['Ansichsein', 'sinnlich', 'Sinnliches', 'Wahrheit', 'Empfindung']) {
  const e = (ctx.entries || []).find((x) => x.source === term);
  console.log(`termbase ${term}: ${e ? e.zh : '(absent)'}`);
}
