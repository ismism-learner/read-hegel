import fs from 'node:fs';
import { markSentences, sentencesFromMarked, plainOf } from './lib/sentences.mjs';

const vol = process.argv[2] || 'w2', chunk = process.argv[3] || '10', bi = Number(process.argv[4] || 45);
const c = JSON.parse(fs.readFileSync(`web/data/vol/${vol}/${chunk}.json`, 'utf8'));
const x = c.blocks[bi].x;

// strip the existing sentence spans, keeping their inner content -> candidate raw html
const raw = x.replace(/<span class="s" data-sid="[^"]*">/g, '').replace(/<\/span>(?=[^<]*$)/g, '__KEEP__');
// the span close tags are ambiguous; rebuild by removing exactly the spans we can see
const stripped = x.replace(/<span class="s" data-sid="[^"]*">([\s\S]*?)<\/span>/g, '$1');
console.log('original ns:', c.blocks[bi].ns, '| stripped == original?', stripped === x);
console.log('remaining sid spans after strip:', (stripped.match(/data-sid=/g) || []).length);
console.log('plain len:', plainOf(stripped).length);

const re = markSentences(stripped, 'test');
console.log('re-marked sentences:', re.sentences.length);
re.sentences.forEach((s, i) => console.log(`  [${i}] ${s.slice(0, 80)}`));

const re2 = markSentences(raw.replace(/__KEEP__/g, ''), 'test2');
console.log('alt strip -> sentences:', re2.sentences.length);
