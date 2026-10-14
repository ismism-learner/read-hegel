// Count occurrences of candidate w2 terms across all German blocks of the volume.
import fs from 'node:fs';

const dir = 'web/data/vol/w2';
const files = fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f));

const strip = (s) =>
  String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/g, ' ');

let corpus = '';
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
  for (const b of j.blocks || []) corpus += '\n' + strip(b.x);
}

const cands = process.argv.slice(2);
for (const c of cands) {
  const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![A-Za-zÄÖÜäöüß])${esc}`, 'g');
  const n = (corpus.match(re) || []).length;
  console.log(String(n).padStart(5), c);
}
console.error('\n[survey] corpus chars =', corpus.length, 'files =', files.length);
