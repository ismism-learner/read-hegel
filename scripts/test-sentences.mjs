import fs from 'node:fs';
import { splitSentences, plainOf } from './lib/sentences.mjs';

const d = JSON.parse(fs.readFileSync('web/data/vol/w3/0.json', 'utf8'));
const b = d.blocks[4];
console.log('--- fresh split of block 4 ---');
splitSentences(plainOf(b.x)).forEach((s, i) => console.log(i + ': ' + s.text.slice(0, 150)));
console.log('\n--- span count in stored markup:', (b.x.match(/<span class="s"/g) || []).length, ' ns=', b.ns, ' ---');
