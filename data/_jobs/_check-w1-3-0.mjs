// One-off: validate a part file against the chunk data (hashes, sentence counts, structure).
import fs from 'node:fs';
import { sentencesFromMarked } from '../../scripts/lib/sentences.mjs';

const vol = 'w1', chunkNo = 3, part = 'web/data/trans/w1/3.p0.json';
const src = JSON.parse(fs.readFileSync(`web/data/vol/${vol}/${chunkNo}.json`, 'utf8'));
const out = JSON.parse(fs.readFileSync(part, 'utf8'));
let bad = [], sents = 0, heads = 0, paras = 0;
for (const [key, val] of Object.entries(out.blocks)) {
  const bi = Number(key);
  const b = src.blocks[bi];
  if (!b) { bad.push(`block ${key}: no such block`); continue; }
  if (val.h !== b.hash) { bad.push(`block ${key}: hash ${val.h} != ${b.hash}`); continue; }
  if (b.k === 'h') {
    heads++;
    if (typeof val.en !== 'string' || typeof val.zh !== 'string') bad.push(`block ${key}: heading not strings`);
  } else {
    paras++;
    const want = sentencesFromMarked(b.x).length;
    sents += want;
    if (!Array.isArray(val.en) || val.en.length !== want) bad.push(`block ${key}: en ${val.en && val.en.length} vs ${want}`);
    if (!Array.isArray(val.zh) || val.zh.length !== want) bad.push(`block ${key}: zh ${val.zh && val.zh.length} vs ${want}`);
  }
}
const srcBlocks = src.blocks.filter((b) => b.k === 'p' || b.k === 'h').length;
console.log(`unit=${out.unit} pipeline=${out.pipeline}`);
console.log(`blocks in file=${Object.keys(out.blocks).length}/${srcBlocks} heads=${heads} paras=${paras} sentences=${sents}`);
console.log(bad.length ? 'PROBLEMS:\n  ' + bad.join('\n  ') : 'VALIDATION: OK');
process.exit(bad.length ? 1 : 0);
