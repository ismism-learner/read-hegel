// Rebuild the translation coverage index and validate sentence alignment.
//   node scripts/trans-index.mjs
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'web/data';
const MANIFEST = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
const TRANS = path.join(OUT, 'trans');

const problems = [];
const volumes = {};
let totBlocks = 0, totSent = 0, totSegments = 0, totSentAll = 0, totHeads = 0;

for (const v of MANIFEST.volumes) {
  const dir = path.join(TRANS, v.id);
  const chunks = {};
  for (const meta of v.chunks) {
    const file = path.join(dir, `${meta.i}.json`);
    const chunk = JSON.parse(fs.readFileSync(path.join(OUT, 'vol', v.id, `${meta.i}.json`), 'utf8'));
    const paraIdx = chunk.blocks.map((b, i) => (b.k === 'p' ? i : -1)).filter((i) => i >= 0);
    totSegments += paraIdx.length;
    totSentAll += paraIdx.reduce((a, i) => a + (chunk.blocks[i].ns || 0), 0);

    if (!fs.existsSync(file)) continue;
    const tr = JSON.parse(fs.readFileSync(file, 'utf8'));
    let blocks = 0, sent = 0, heads = 0;
    for (const [key, val] of Object.entries(tr.blocks || {})) {
      const bi = Number(key);
      const b = chunk.blocks[bi];
      if (!b) { problems.push(`${v.id}/${meta.i}: translation for missing block ${key}`); continue; }
      if (val.h !== b.hash) { problems.push(`${v.id}/${meta.i} block ${bi}: hash drift (translation may be stale)`); continue; }
      if (b.k === 'h') { heads++; continue; }
      const ns = b.ns || 0;
      for (const lang of ['en', 'zh']) {
        if (!Array.isArray(val[lang])) { problems.push(`${v.id}/${meta.i} block ${bi}: missing "${lang}"`); continue; }
        if (val[lang].length !== ns) problems.push(`${v.id}/${meta.i} block ${bi}: ${lang} has ${val[lang].length} sentences, German has ${ns}`);
      }
      blocks++;
      sent += ns;
    }
    chunks[meta.i] = { blocks, sentences: sent, headings: heads };
    totBlocks += blocks;
    totSent += sent;
    totHeads += heads;
  }
  if (Object.keys(chunks).length) volumes[v.id] = chunks;
}

const index = {
  generated: new Date().toISOString(),
  pipeline: 'DE → EN → ZH, produced by this agent (no published translation used)',
  style: '平实白话中文，贴近原文语气',
  volumes,
  totals: { blocks: totBlocks, sentences: totSent, headings: totHeads, segmentsTotal: totSegments, sentencesTotal: totSentAll },
};

fs.mkdirSync(TRANS, { recursive: true });
fs.writeFileSync(path.join(TRANS, 'index.json'), JSON.stringify(index, null, 1), 'utf8');

console.log(`translated: ${totBlocks} paragraphs (+${totHeads} headings) / ${totSent} sentences`);
console.log(`corpus    : ${totSegments} blocks / ${totSentAll} sentences  (${(totSent / totSentAll * 100).toFixed(2)}%)`);
for (const [id, chunks] of Object.entries(volumes)) {
  const b = Object.values(chunks).reduce((a, c) => a + c.blocks, 0);
  const s = Object.values(chunks).reduce((a, c) => a + c.sentences, 0);
  console.log(`  ${id}: ${Object.keys(chunks).length} chunk(s), ${b} blocks, ${s} sentences`);
}
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  for (const p of problems.slice(0, 40)) console.log('  • ' + p);
  process.exit(1);
}
console.log('\nALIGNMENT: OK');
