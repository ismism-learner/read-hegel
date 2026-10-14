// What editorial matter does the digitised corpus actually contain?
// (Hegel's own text is public domain; an edition's editorial layer is a separate question.)
import fs from 'node:fs';
import path from 'node:path';
import { plainOf } from './lib/sentences.mjs';

const manifest = JSON.parse(fs.readFileSync('web/data/manifest.json', 'utf8'));
const markers = ['Anmerkung', 'Nachwort', 'Editorische', 'Inhalt', 'Vorrede', 'Einleitung', 'Zusatz', 'Zusätze', 'Anhang', 'Register', 'Werkgeschichte'];
const counts = {};
const fnSamples = [];
const headSamples = [];
let fnBlocks = 0, pBlocks = 0;

for (const v of manifest.volumes) {
  for (const m of v.chunks) {
    const chunk = JSON.parse(fs.readFileSync(path.join('web/data/vol', v.id, `${m.i}.json`), 'utf8'));
    for (const b of chunk.blocks) {
      const t = plainOf(b.x);
      if (b.k === 'fn') {
        fnBlocks++;
        if (fnSamples.length < 6) fnSamples.push({ v: v.id, c: m.i, t: t.slice(0, 160) });
      }
      if (b.k === 'p') pBlocks++;
      if (b.k === 'h') {
        for (const mk of markers) {
          if (new RegExp(`\\b${mk}`, 'i').test(t)) {
            counts[mk] = (counts[mk] || 0) + 1;
            if (headSamples.length < 14 && /Anmerkung|Nachwort|Register|Anhang/i.test(t)) headSamples.push(`${v.id}/${m.i}: ${t.slice(0, 80)}`);
          }
        }
      }
    }
  }
}
console.log(`paragraph blocks: ${pBlocks}, footnote blocks: ${fnBlocks}`);
console.log('heading markers:', JSON.stringify(counts));
console.log('\nheadings that look editorial:');
for (const h of headSamples) console.log('  ' + h);
console.log('\nfootnote samples:');
for (const f of fnSamples) console.log(`  [${f.v}/${f.c}] ${f.t}`);
