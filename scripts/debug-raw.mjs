import fs from 'node:fs';
import path from 'node:path';
import { markSentences, plainOf, splitSentences } from './lib/sentences.mjs';

const DIR = 'data/_raw/gh/HEGEL/2';
const NEEDLE = 'Es ist die Ansicht der Freiheit';
let found = 0;
for (const f of fs.readdirSync(DIR).filter((x) => /\.html$/.test(x))) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const i = raw.indexOf(NEEDLE);
  if (i < 0) continue;
  found++;
  // take the enclosing <p> ... </p>
  const start = raw.lastIndexOf('<p', i);
  const end = raw.indexOf('</p>', i) + 4;
  const para = raw.slice(start, end);
  console.log(`\n=== ${f} ===`);
  console.log('raw paragraph length:', para.length);
  console.log('tags in raw paragraph:', [...new Set((para.match(/<\/?[a-zA-Z][^>]*>/g) || []).map((t) => t.replace(/="[^"]*"/g, '="…"').replace(/\s+/g, ' ')))].join('  '));
  const plain = plainOf(para);
  console.log('plain splitSentences:', splitSentences(plain).length);
  const marked = markSentences(para, 'test');
  console.log('markSentences:', marked.sentences.length);
  marked.sentences.forEach((s, k) => console.log(`   [${k}] ${s.slice(0, 70)}`));
  if (found >= 2) break;
}
if (!found) console.log('needle not found in raw sources');
