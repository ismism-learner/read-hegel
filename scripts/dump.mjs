// Dump a chunk's blocks/sentences as readable text — used to translate and to sanity-check.
//   node scripts/dump.mjs --vol w3 --chunk 0 [--from 0] [--to 12] [--plain]
import fs from 'node:fs';
import { plainOf, sentencesFromMarked } from './lib/sentences.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const vol = opt('vol', 'w3');
const chunk = Number(opt('chunk', 0));
const from = Number(opt('from', 0));
const to = Number(opt('to', 9999));
const file = `web/data/vol/${vol}/${chunk}.json`;
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log(`# ${file}  t="${data.t}"  blocks=${data.blocks.length}  sentences=${data.blocks.reduce((a, b) => a + (b.ns || 0), 0)}`);

data.blocks.forEach((b, i) => {
  if (i < from || i > to) return;
  const plain = plainOf(b.x);
  const sents = sentencesFromMarked(b.x).map((text) => ({ text }));
  console.log(`\n[${i}] ${b.k}${b.l ? ' h' + b.l : ''}${b.ns !== undefined ? ' ns=' + b.ns : ''} hash=${b.hash} sid=${b.id || '-'}`);
  if (b.k === 'h' || b.k === 'fn') { console.log('    ' + plain.slice(0, 200)); return; }
  sents.forEach((s, si) => console.log(`  ${si}. ${s.text}`));
  if (!sents.length) console.log('    (no sentences) ' + plain.slice(0, 160));
});
