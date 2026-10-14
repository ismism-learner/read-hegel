import fs from 'node:fs';
import path from 'node:path';
import { splitSentences, plainOf } from './lib/sentences.mjs';

const DIR = 'data/_raw/gh/HEGEL/2';
const NEEDLE = 'Es ist die Ansicht der Freiheit';
let para = '';
for (const f of fs.readdirSync(DIR).filter((x) => /\.html$/.test(x))) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const i = raw.indexOf(NEEDLE);
  if (i < 0) continue;
  para = raw.slice(raw.lastIndexOf('<p', i), raw.indexOf('</p>', i) + 4);
  console.log('file', f);
  break;
}

// replicate markSentences' wrapper strip
const outer = /^\s*<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>([\s\S]*)<\/\1>\s*$/.exec(para);
let html = outer ? outer[2] : para;
console.log('stripped wrapper:', !!outer, '| inner length', html.length);

const tokens = html.match(/<\/?[a-zA-Z][^>]*>|[^<]+/g) || [];
const plain = plainOf(html);
console.log('tokens:', tokens.length, '| plain:', plain.length);
let pos = 0;
tokens.forEach((t, i) => {
  if (t[0] === '<') console.log(`  tok[${i}] @plain=${pos}: ${t.slice(0, 40)}`);
  else pos += t.length;
});
const raw = splitSentences(plain);
console.log('boundaries:', raw.map((s) => s.start).join(', '));
console.log('\nhtml around boundary 290:');
console.log(JSON.stringify(html.slice(html.indexOf('wäre.') - 200, html.indexOf('wäre.') + 120)));
