// One-off: emit data/_jobs/w1-4-0.in.json exactly the way scripts/make-jobs.mjs would,
// but scoped to the single unit w1-4-0 (vol w1, chunk 4, starting block 0, size 25).
import fs from 'node:fs';
import path from 'node:path';
import { plainOf, sentencesFromMarked } from '../../scripts/lib/sentences.mjs';

const OUTD = 'web/data';
const JOBD = 'data/_jobs';
const SIZE = 25;
const V = 'w1';
const C = 4;

const manifest = JSON.parse(fs.readFileSync(path.join(OUTD, 'manifest.json'), 'utf8'));
const v = manifest.volumes.find((x) => x.id === V);
const meta = v.chunks.find((m) => m.i === C);
const chunk = JSON.parse(fs.readFileSync(path.join(OUTD, 'vol', V, `${C}.json`), 'utf8'));
const tf = path.join(OUTD, 'trans', V, `${C}.json`);
const tr = fs.existsSync(tf) ? JSON.parse(fs.readFileSync(tf, 'utf8')) : { blocks: {} };

const units = [];
let buf = [];
let sent = 0;
const flush = () => {
  if (!buf.length) return;
  const id = `${V}-${C}-${buf[0].bi}`;
  units.push({ id, from: buf[0].bi, to: buf.at(-1).bi, sentences: sent });
  buf = []; sent = 0;
};

chunk.blocks.forEach((b, bi) => {
  if (b.k !== 'p' && b.k !== 'h') return;
  const t = tr.blocks?.[bi];
  if (t && t.h === b.hash) return;
  const sents = b.k === 'p' ? sentencesFromMarked(b.x) : [];
  if (b.k === 'p' && !sents.length) return;
  buf.push({ bi, k: b.k, hash: b.hash, l: b.l || 0, text: b.k === 'h' ? plainOf(b.x).trim() : '', sents });
  sent += sents.length;
  if (sent >= SIZE) flush();
});
flush();

const unit = units[0];
if (!unit || unit.id !== 'w1-4-0') {
  console.error('unexpected first unit:', unit && unit.id, 'units:', units.map((u) => u.id).join(','));
  process.exit(1);
}

const blocks = [];
for (let bi = unit.from; bi <= unit.to; bi++) {
  const b = chunk.blocks[bi];
  if (!b || (b.k !== 'p' && b.k !== 'h')) continue;
  const t = tr.blocks?.[bi];
  if (t && t.h === b.hash) continue;
  blocks.push(b.k === 'h'
    ? { bi, k: 'h', hash: b.hash, text: plainOf(b.x).trim() }
    : { bi, k: 'p', hash: b.hash, sents: sentencesFromMarked(b.x) });
}

const payload = {
  id: unit.id,
  volume: { id: v.id, bands: v.bands, de: v.de, zh: v.zh },
  chunk: C,
  chunkTitle: meta?.t || chunk.t,
  heading: blocks.find((b) => b.k === 'h')?.text || '',
  blocks,
  outFile: `web/data/trans/${V}/${C}.p${unit.from}.json`,
};
fs.writeFileSync(path.join(JOBD, `${unit.id}.in.json`), JSON.stringify(payload, null, 1), 'utf8');
console.log(`wrote ${unit.id}: blocks=${blocks.length} sentences=${unit.sentences} bi=${unit.from}..${unit.to} out=${payload.outFile}`);
console.log(`next unit after this one would start at bi=${unit.to + 1}`);
