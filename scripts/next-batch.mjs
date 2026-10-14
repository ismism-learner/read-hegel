// Walk the corpus in chronological (volume → chunk → block) order and print the next
// untranslated paragraph blocks, ready to be translated.
//   node scripts/next-batch.mjs [--count 12] [--from w1/0/0] [--out batch.txt]
import fs from 'node:fs';
import path from 'node:path';
import { plainOf, sentencesFromMarked } from './lib/sentences.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const COUNT = Number(opt('count', 12));
const FROM = opt('from', '');
const OUT = opt('out', '');

const OUTD = 'web/data';
const manifest = JSON.parse(fs.readFileSync(path.join(OUTD, 'manifest.json'), 'utf8'));

const sentencesOf = (html) => sentencesFromMarked(html).map((text) => ({ text }));

const batches = [];
let started = !FROM;
let done = 0;

for (const v of manifest.volumes) {
  if (done >= COUNT) break;
  for (const meta of v.chunks) {
    if (done >= COUNT) break;
    const key = `${v.id}/${meta.i}`;
    if (!started) { started = key === FROM.split('/').slice(0, 2).join('/'); if (!started) continue; }
    const chunk = JSON.parse(fs.readFileSync(path.join(OUTD, 'vol', v.id, `${meta.i}.json`), 'utf8'));
    const tf = path.join(OUTD, 'trans', v.id, `${meta.i}.json`);
    const tr = fs.existsSync(tf) ? JSON.parse(fs.readFileSync(tf, 'utf8')) : { blocks: {} };

    let heading = '';
    chunk.blocks.forEach((b, bi) => {
      if (b.k === 'h') heading = plainOf(b.x).trim();
      if (b.k !== 'p' || done >= COUNT) return;
      const t = tr.blocks?.[bi];
      if (t && t.h === b.hash) return;                       // already translated
      const sents = sentencesOf(b.x);
      if (!sents.length) return;
      batches.push({
        vol: v.id, band: v.bands.join('-'), volDe: v.de, volZh: v.zh, chunk: meta.i,
        chunkTitle: chunk.t, heading, bi, hash: b.hash, sents,
      });
      done++;
    });
  }
}

const lines = [];
lines.push(`# next ${batches.length} blocks in chronological order`);
for (const b of batches) {
  lines.push('');
  lines.push(`## ${b.vol} (Bd. ${b.band}) · chunk ${b.chunk} · block ${b.bi} · hash ${b.hash}`);
  lines.push(`## ${b.volZh} / ${b.volDe} — ${b.chunkTitle}${b.heading && b.heading !== b.chunkTitle ? ' › ' + b.heading : ''}`);
  b.sents.forEach((s, i) => lines.push(`${i}. ${s.text}`));
}
const text = lines.join('\n');
console.log(text);
if (OUT) { fs.writeFileSync(OUT, text, 'utf8'); console.log(`\n[written to ${OUT}]`); }
