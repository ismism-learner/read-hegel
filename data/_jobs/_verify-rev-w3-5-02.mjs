import fs from 'node:fs';
const p = 'E:/文字稿优化/读黑学/data/_jobs/rev-w3-5-02.out.json';
const buf = fs.readFileSync(p);
console.log('BOM:', buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF);
console.log('first bytes:', [...buf.slice(0, 4)].map(b => b.toString(16)).join(' '));
const out = JSON.parse(buf.toString('utf8'));
const inp = JSON.parse(fs.readFileSync('E:/文字稿优化/读黑学/data/_jobs/rev-w3-5-02.in.json', 'utf8'));
console.log('id:', out.id, 'items:', out.items.length, 'inItems:', inp.items.length);
const m = new Map(out.items.map(o => [o.bi + '.' + o.si, o]));
let changed = 0, badKeys = 0;
for (const it of inp.items) {
  const k = it.bi + '.' + it.si;
  const o = m.get(k);
  if (!o) { console.log('MISSING ' + k); badKeys++; continue; }
  if (o.vol !== it.vol || o.chunk !== it.chunk) console.log('KEY-MISMATCH ' + k);
  if (o.zh !== it.zh) { changed++; console.log('CHANGED ' + k + '\n  OLD ' + it.zh + '\n  NEW ' + o.zh); }
}
// stray extra items
const inKeys = new Set(inp.items.map(i => i.bi + '.' + i.si));
for (const o of out.items) if (!inKeys.has(o.bi + '.' + o.si)) console.log('EXTRA ' + o.bi + '.' + o.si);
// field shape
const allowed = ['vol', 'chunk', 'bi', 'si', 'zh'];
for (const o of out.items) { const extra = Object.keys(o).filter(x => !allowed.includes(x)); if (extra.length) console.log('EXTRA-FIELD ' + o.bi + '.' + o.si + ' ' + extra); }
// german leaked into zh
for (const o of out.items) { const lat = o.zh.match(/[A-Za-zÄÖÜäöüß]{2,}/g); if (lat) console.log('LATIN ' + o.bi + '.' + o.si + ' ' + lat); }
console.log('changed=' + changed + ' itemCount=' + out.items.length + ' missingKeys=' + badKeys);
