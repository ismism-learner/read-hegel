// temp: check that every entry/forbidden/doNotTranslate source is attested in w1
import fs from 'node:fs';
import { plainOf } from '../../scripts/lib/sentences.mjs';
const dir = 'web/data/vol/w1';
let all = '';
for (const f of fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f))) {
  const d = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
  for (const b of d.blocks) all += plainOf(b.x) + '\n';
}
const pkg = JSON.parse(fs.readFileSync('data/_jobs/context-w1.json', 'utf8'));
const count = (s) => {
  let n = 0, i = 0;
  while ((i = all.indexOf(s, i)) >= 0) { n++; i += s.length; }
  return n;
};
const zero = [];
for (const e of pkg.entries) {
  // nouns appear inflected too: also test a stripped stem for multi-word/phrase entries
  const n = count(e.source);
  const stem = e.source.replace(/(ung|heit|keit|schaft|en|es|s|e)$/, '');
  const ns = stem.length > 3 ? count(stem) : 0;
  if (!n && !ns) zero.push(`${e.source} [${e.type}]`);
}
console.log('entries with no verbatim/stem hit in w1: ' + (zero.length ? '\n  ' + zero.join('\n  ') : 'none'));
const dz = pkg.doNotTranslate.filter((s) => count(s) === 0);
console.log('doNotTranslate not found verbatim: ' + (dz.length ? dz.join(' | ') : 'none'));
