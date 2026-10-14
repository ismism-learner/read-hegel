// Show the corrections applied from review jobs, restricted to one chapter.
//   node scripts/show-review-diff.mjs --vol w3 --chunk 3
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const VOL = opt('vol', '');
const CHUNK = opt('chunk', '');

const dirs = ['data/_jobs', 'data/_jobs/_applied'];
let n = 0;
for (const d of dirs) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => /^rev-.*\.in\.json$/.test(x))) {
    const j = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
    for (const it of j.items || []) {
      if (VOL && it.vol !== VOL) continue;
      if (CHUNK && String(it.chunk) !== String(CHUNK)) continue;
      const tr = JSON.parse(fs.readFileSync(`web/data/trans/${it.vol}/${it.chunk}.json`, 'utf8'));
      const cur = tr.blocks[String(it.bi)]?.zh?.[it.si];
      if (cur === undefined || cur === it.zh) continue;
      n++;
      console.log(`\n--- ${it.vol}/${it.chunk}#${it.bi}.${it.si} ---`);
      console.log('DE : ' + String(it.de).slice(0, 130));
      console.log('OLD: ' + String(it.zh).slice(0, 130));
      console.log('NEW: ' + String(cur).slice(0, 130));
    }
  }
}
console.log(`\nchanges shown: ${n}`);
