import fs from 'node:fs';
import { splitSentences, plainOf, markSentences, sentencesFromMarked } from './lib/sentences.mjs';

const vol = process.argv[2] || 'w2';
const chunk = process.argv[3] || '10';
const bi = Number(process.argv[4] || 45);
const c = JSON.parse(fs.readFileSync(`web/data/vol/${vol}/${chunk}.json`, 'utf8'));
const b = c.blocks[bi];
const x = b.x;
console.log(`block ${vol}/${chunk}#${bi} kind=${b.k} ns=${b.ns} html=${x.length}`);

const tags = [...x.matchAll(/<[^>]+>/g)].map((m) => m[0]);
const kinds = new Map();
for (const t of tags) {
  const key = t.replace(/="[^"]*"/g, '="…"');
  kinds.set(key, (kinds.get(key) || 0) + 1);
}
console.log('tags:', [...kinds.entries()].map(([k, n]) => `${k}×${n}`).join('  '));

const plain = plainOf(x);
console.log('splitSentences(plain) =', splitSentences(plain).length);
console.log('sentencesFromMarked(x) =', sentencesFromMarked(x).length);

const i = plain.indexOf('wäre.');
console.log('\n--- plain around the missed boundary ---');
console.log(JSON.stringify(plain.slice(Math.max(0, i - 90), i + 120)));

const j = x.indexOf('wäre.');
console.log('\n--- html around it ---');
console.log(JSON.stringify(x.slice(Math.max(0, j - 160), j + 200)));

// where do the marked spans actually lie?
const marks = [...x.matchAll(/<span class="s" data-sid="([^"]+)"/g)].map((m) => m[1]);
console.log('\nmarked sids:', marks.join(', '));
