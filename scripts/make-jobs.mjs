// Slice the untranslated corpus into self-contained translation units, in chronological order.
//   node scripts/make-jobs.mjs [--size 25] [--limit 40] [--prefix wave1]
// Writes data/_jobs/jobs-<prefix>.json (unit ids) and data/_jobs/<id>.in.json (payload).
import fs from 'node:fs';
import path from 'node:path';
import { plainOf, sentencesFromMarked } from './lib/sentences.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const SIZE = Number(opt('size', 25));         // target sentences per unit
const LIMIT = Number(opt('limit', 40));       // max units to emit
const PREFIX = opt('prefix', 'wave1');
const VOL = opt('vol', '');                       // optional: restrict to one volume (e.g. --vol w3)

const OUTD = 'web/data';
const JOBD = 'data/_jobs';
fs.mkdirSync(JOBD, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(path.join(OUTD, 'manifest.json'), 'utf8'));
const units = [];

for (const v of manifest.volumes) {
  if (VOL && v.id !== VOL) continue;
  for (const meta of v.chunks) {
    if (units.length >= LIMIT) break;
    const chunk = JSON.parse(fs.readFileSync(path.join(OUTD, 'vol', v.id, `${meta.i}.json`), 'utf8'));
    const tf = path.join(OUTD, 'trans', v.id, `${meta.i}.json`);
    const tr = fs.existsSync(tf) ? JSON.parse(fs.readFileSync(tf, 'utf8')) : { blocks: {} };

    let heading = '';
    let buf = [];
    let sent = 0;
    const flush = () => {
      if (!buf.length) return;
      const id = `${v.id}-${meta.i}-${buf[0].bi}`;
      units.push({ id, v: v.id, c: meta.i, from: buf[0].bi, to: buf.at(-1).bi, n: buf.length, sentences: sent });
      buf = []; sent = 0;
    };

    chunk.blocks.forEach((b, bi) => {
      if (b.k === 'h') { heading = plainOf(b.x).trim(); }
      if (b.k !== 'p' && b.k !== 'h') return;
      const t = tr.blocks?.[bi];
      if (t && t.h === b.hash) return;                       // already translated
      const sents = b.k === 'p' ? sentencesFromMarked(b.x) : [];
      if (b.k === 'p' && !sents.length) return;
      buf.push({ bi, k: b.k, hash: b.hash, l: b.l || 0, text: b.k === 'h' ? plainOf(b.x).trim() : '', sents, heading });
      sent += sents.length;
      if (sent >= SIZE) flush();
    });
    flush();
    if (units.length >= LIMIT) break;
  }
  if (units.length >= LIMIT) break;
}

// write payloads
const ids = [];
for (const u of units) {
  const id = u.id;
  ids.push(id);
  const unit = units.find((x) => x.id === id);
  const v = manifest.volumes.find((x) => x.id === unit.v);
  const chunk = JSON.parse(fs.readFileSync(path.join(OUTD, 'vol', unit.v, `${unit.c}.json`), 'utf8'));
  const tf = path.join(OUTD, 'trans', unit.v, `${unit.c}.json`);
  const tr = fs.existsSync(tf) ? JSON.parse(fs.readFileSync(tf, 'utf8')) : { blocks: {} };
  const blocks = [];
  const meta = v.chunks.find((m) => m.i === unit.c);
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
    id,
    volume: { id: v.id, bands: v.bands, de: v.de, zh: v.zh },
    chunk: unit.c,
    chunkTitle: meta?.t || chunk.t,
    heading: blocks.find((b) => b.k === 'h')?.text || (chunk.blocks.find((b) => b.k === 'h') ? plainOf(chunk.blocks.find((b) => b.k === 'h').x).trim() : ''),
    blocks,
    outFile: `web/data/trans/${unit.v}/${unit.c}.p${unit.from}.json`,
  };
  fs.writeFileSync(path.join(JOBD, `${id}.in.json`), JSON.stringify(payload, null, 1), 'utf8');
}

fs.writeFileSync(path.join(JOBD, `jobs-${PREFIX}.json`), JSON.stringify(ids, null, 1), 'utf8');
const totalSent = units.reduce((a, u) => a + u.sentences, 0);
console.log(`units=${units.length} sentences=${totalSent} avg=${(totalSent / Math.max(1, units.length)).toFixed(1)}`);
console.log(`first=${ids[0]} last=${ids.at(-1)}`);
console.log(`job list: ${JOBD}/jobs-${PREFIX}.json`);
