// Independently recompute coverage from the raw data and compare it with the published index.
//   node scripts/verify-coverage.mjs
import fs from 'node:fs';
import path from 'node:path';
import { sentencesFromMarked } from './lib/sentences.mjs';

const manifest = JSON.parse(fs.readFileSync('web/data/manifest.json', 'utf8'));
let blocks = 0, blocksTr = 0, sent = 0, sentTr = 0, headings = 0, headingsTr = 0;
const perVol = [];

for (const v of manifest.volumes) {
  let vb = 0, vbt = 0, vs = 0, vst = 0;
  for (const m of v.chunks) {
    const chunk = JSON.parse(fs.readFileSync(path.join('web/data/vol', v.id, `${m.i}.json`), 'utf8'));
    const tf = path.join('web/data/trans', v.id, `${m.i}.json`);
    const tr = fs.existsSync(tf) ? JSON.parse(fs.readFileSync(tf, 'utf8')) : { blocks: {} };
    chunk.blocks.forEach((b, bi) => {
      const t = tr.blocks?.[String(bi)];
      const headingOk = !!(t && t.h === b.hash && typeof t.en === 'string' && t.en.trim() && typeof t.zh === 'string' && t.zh.trim());
      if (b.k === 'h') { headings++; if (headingOk) headingsTr++; return; }
      if (b.k !== 'p') return;
      const ok = !!(t && t.h === b.hash && Array.isArray(t.en) && Array.isArray(t.zh)
        && t.en.length === (b.ns || 0) && t.zh.length === (b.ns || 0));
      blocks++; vb++;
      const ns = b.ns || 0;
      sent += ns; vs += ns;
      if (ok) { blocksTr++; vbt++; sentTr += ns; vst += ns; }
    });
  }
  perVol.push({ id: v.id, blocks: vb, blocksTr: vbt, sent: vs, sentTr: vst });
}

console.log(`paragraphs : ${blocksTr} / ${blocks}  (${(blocksTr / blocks * 100).toFixed(2)}%)`);
console.log(`sentences  : ${sentTr} / ${sent}  (${(sentTr / sent * 100).toFixed(2)}%)`);
console.log(`headings   : ${headingsTr} / ${headings}`);
console.log('\nper volume:');
for (const v of perVol) {
  if (!v.blocksTr) continue;
  console.log(`  ${v.id}  ${String(v.blocksTr).padStart(5)}/${String(v.blocks).padEnd(6)} blocks   ${String(v.sentTr).padStart(6)}/${String(v.sent).padEnd(7)} sentences   ${(v.sentTr / v.sent * 100).toFixed(1)}%`);
}

// compare with the published index
const idx = JSON.parse(fs.readFileSync('web/data/trans/index.json', 'utf8'));
const idxText = JSON.stringify(idx);
const claims = [
  ['paragraphs', blocksTr],
  ['sentences', sentTr],
];
for (const [name, value] of claims) {
  const found = idxText.includes(String(value));
  console.log(`\npublished index contains ${name}=${value}? ${found ? 'yes' : 'NO — index is stale'}`);
}
console.log('\nindex keys:', Object.keys(idx).join(', ').slice(0, 200));
